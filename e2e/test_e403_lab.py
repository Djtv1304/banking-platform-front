"""Smoke de las rutas E4-03 y E0-08 con el laboratorio SQL del backend."""

from dataclasses import replace
from datetime import datetime
from pathlib import Path

from app.core.database import db
from app.core.security.auth import id_usuario_auditoria
from app.modules.aprobaciones import router as aprobaciones
from app.modules.aprobaciones.identidad import Actor
from app.modules.aprobaciones.manejadores import registro_inicial
from app.modules.aprobaciones.servicio import Servicio
from app.modules.contabilidad import plantillas, service
from app.modules.seguridad import funciones
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import text
from tests.integration import boveda_sql_lab
from tests.integration.test_boveda_sqlserver import motor, pytestmark  # noqa: F401
from tests.sesion import simular_sesion, usuario_con_roles


def test_catalogo_simulacion_y_aprobacion_http(request, monkeypatch):
    engine = request.getfixturevalue("motor")
    with engine.begin() as conn:
        conn.exec_driver_sql("""
            ALTER TABLE Contabilidad.ConceptoContable
                ADD CodigoConcepto varchar(30), ConceptoDetalle nvarchar(100), Estado varchar(10);
            CREATE TABLE Auditoria.TipoEvento (
                CodigoEvento varchar(100) PRIMARY KEY, Modulo varchar(30) NOT NULL,
                Severidad varchar(12) NOT NULL, EnTransaccion bit NOT NULL,
                Estado char(1) NOT NULL DEFAULT 'A'
            );
        """)
        conn.exec_driver_sql("""
            INSERT Contabilidad.ConceptoContable VALUES (1, 'LAB', 'Concepto de ensayo', 'Activo');
            UPDATE Contabilidad.CuentasContables SET CodigoCuenta='19080505'
                WHERE IdCuentaContable=2;
            INSERT Contabilidad.PlantillaAsiento
                (CodigoPlantilla, IdConceptoContable, Origen, IdTipoAsiento, Nombre,
                 Estado, Version, VigenciaDesde)
            VALUES ('DOT_CAJA',1,'CAJA',1,'Dotación QA',1,1,'20261101');
        """)
        conn.execute(
            text(
                "EXEC sys.sp_set_session_context @key=N'migration_database', @value=:base"
            ),
            {"base": conn.scalar(text("SELECT DB_NAME()"))},
        )
        migraciones = Path(boveda_sql_lab.BACKEND) / "migrations" / "seguridad"
        for archivo in (
            "202611180800_aprobaciones_catalogo.up.sql",
            "202611180801_aprobaciones_solicitudes.up.sql",
            "202611191500_plantillas_aprobacion.up.sql",
        ):
            conn.exec_driver_sql(
                (migraciones / archivo).read_text(encoding="utf-8-sig")
            )

    crear = Actor(
        "qa-contador",
        "qa-e403",
        "Contador QA",
        7,
        ("CONTADOR",),
        frozenset({"con-plantilla-editar", "con-plantilla-aprobar"}),
        ("001",),
    )
    aprobar = Actor(
        "qa-aprobador",
        "qa-e403",
        "Aprobador QA",
        9,
        ("SUPERVISOR",),
        frozenset({"con-plantilla-aprobar"}),
        ("001",),
    )
    actores = {actor.sujeto: actor for actor in (crear, aprobar)}
    cola = Servicio(
        engine, engine, registro_inicial(), lambda sujeto, _: actores[sujeto]
    )
    app = FastAPI()
    app.include_router(plantillas.router, prefix="/api/v1/contabilidad")
    app.include_router(aprobaciones.router, prefix="/api/v1")

    def conexion():
        with engine.connect() as conn:
            yield conn

    def impedir_otras_conexiones(*_args, **_kwargs):
        raise AssertionError("Solo se permite la base SQL temporal del laboratorio")

    monkeypatch.setattr(db, "get_engine", impedir_otras_conexiones)
    app.dependency_overrides[db.cooperativa] = conexion
    app.dependency_overrides[aprobaciones.actual] = lambda: actor
    app.dependency_overrides[aprobaciones.servicio] = lambda: cola
    monkeypatch.setattr(
        aprobaciones, "actual", lambda usuario: actores[usuario.id_usuario]
    )
    monkeypatch.setattr(aprobaciones, "servicio", lambda: cola)
    monkeypatch.setattr(funciones, "activa", lambda: True)
    monkeypatch.setattr(funciones, "efectivos", lambda u: funciones.resolver({}, u))
    monkeypatch.setattr(service, "ahora_ecuador", lambda: datetime(2026, 11, 16, 10))

    def sesion(elegido):
        nonlocal actor
        actor = elegido
        simular_sesion(
            app,
            replace(
                usuario_con_roles(*actor.roles),
                id_usuario=actor.sujeto,
                id_organizacion=actor.organizacion,
                id_interno=actor.id_interno,
                permisos=tuple(actor.permisos),
            ),
        )
        app.dependency_overrides[id_usuario_auditoria] = lambda: actor.id_interno

    actor = crear
    sesion(crear)
    cliente = TestClient(app)
    contabilidad = "/api/v1/contabilidad"
    catalogo = f"{contabilidad}/reglas-contables"
    versiones = f"{contabilidad}/plantillas"
    alta = f"{contabilidad}/tipos-asiento/1/plantillas"
    fecha = "2026-11-17"
    lineas = [
        {"lado": "DEBITO", "base": "PRINCIPAL", "origen": "FIJA", "cuenta": 2},
        {"lado": "CREDITO", "base": "PRINCIPAL", "origen": "FIJA", "cuenta": 1},
    ]
    borrador = {
        "codigoPlantilla": "BOV_001_TRASLADO_E",
        "nombre": "Salida QA",
        "idConceptoContable": 1,
        "soloPrimeraVersion": True,
        "vigenciaDesde": fecha,
        "lineas": lineas,
    }

    def obtener_reglas():
        respuesta = cliente.get(catalogo, params={"fecha": fecha, "agencia": "001"})
        assert respuesta.status_code == 200, respuesta.text
        datos = respuesta.json()
        assert datos["fechaContable"] == fecha and datos["matrizBovedaDisponible"]
        reglas = {r["idRegla"]: r for r in datos["reglas"]}
        assert len(reglas) == len(datos["reglas"])
        return reglas

    matriz = obtener_reglas()["boveda:001:Traslado:E"]
    assert (matriz["EstadoTipo"], matriz["desde"], matriz["hacia"]) == (
        "A",
        "BOVEDA",
        "EFECTIVO_EN_TRANSITO",
    )
    assert (matriz["Debe"], matriz["Haber"], matriz["vigente"]) == (
        "19080505",
        "11010505",
        None,
    )
    assert cliente.get(catalogo, params={"agencia": "002"}).status_code == 403
    simulacion = cliente.post(
        f"{versiones}/simulaciones",
        json={"lineas": lineas, "montos": {"PRINCIPAL": "10.50"}},
    )
    assert simulacion.status_code == 200, simulacion.text
    assert float(simulacion.json()["total"]) == 10.5
    respuesta = cliente.post(alta, json=borrador)
    assert respuesta.status_code == 202, respuesta.text
    id_version = respuesta.json()["idPlantillaAsiento"]
    solicitud = f"/api/v1/aprobaciones/{respuesta.json()['idSolicitud']}"
    assert cliente.get(f"{versiones}/{id_version}").status_code == 200
    assert (
        cliente.get(versiones, params={"codigo": borrador["codigoPlantilla"]}).json()[
            0
        ]["IdPlantillaAsiento"]
        == id_version
    )
    assert obtener_reglas()[f"plantilla:{id_version}"]["vigente"] is False
    assert cliente.get(solicitud).json()["puedeAprobar"] is False
    assert cliente.post(f"{solicitud}/aprobar", json={}).status_code == 403

    sesion(aprobar)
    assert cliente.post(alta, json=borrador).status_code == 403
    assert cliente.get(solicitud).json()["puedeAprobar"] is True
    respuesta = cliente.post(
        f"{solicitud}/aprobar", json={"comentario": "Revisado en laboratorio"}
    )
    assert respuesta.status_code == 200 and respuesta.json()["estado"] == "Ejecutada", (
        respuesta.text
    )
    reglas = obtener_reglas()
    version = reglas[f"plantilla:{id_version}"]
    assert (
        version["IdAgencia"] == "001" and version["configurada"] and version["vigente"]
    )
    assert version["integracion"] == "CONECTADA" and version["Usada"] is False
    assert reglas[matriz["idRegla"]] == matriz
