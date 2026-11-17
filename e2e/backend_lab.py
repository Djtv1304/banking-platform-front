"""FastAPI real para E2E local: datos ficticios, sin SQL ni WorkOS externos.

Solo se ejecuta con E302_LOCAL_E2E=1. No instala rutas ni bypasses en produccion.
"""

import os
import sys
from copy import deepcopy
from datetime import date, datetime
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock

if os.environ.get("E302_LOCAL_E2E") != "1":
    raise SystemExit("Requiere E302_LOCAL_E2E=1; usar solo para pruebas locales.")

backend = Path(os.environ["BANKING_BACKEND_ROOT"]).resolve()
if not (backend / "app/main.py").is_file():
    raise SystemExit("BANKING_BACKEND_ROOT debe contener app/main.py")
sys.path.insert(0, str(backend))

import pytest
import uvicorn
from app.core.config import settings
from app.core.database import db


def sql_prohibido(*args: Any, **kwargs: Any) -> Any:
    raise AssertionError("E3-02 E2E: ninguna conexion SQL real esta permitida")


patch = pytest.MonkeyPatch()
config = settings.Settings(
    _env_file=None,  # pyright: ignore[reportCallIssue]  # BaseSettings admite este argumento en runtime.
    app_env="development",
    frontend_url="http://127.0.0.1:5174",
    cooperativa_db_server="",
    seguridad_db_server="",
    proxy_exigido=False,
)
patch.setattr(settings, "get_settings", lambda: config)
patch.setattr(db, "get_engine", sql_prohibido)

from app.core.security import audit
from app.main import app
from app.modules.catalogos import repository as catalogos
from app.modules.catalogos import service as catalogos_service
from app.modules.clientes import repository as clientes
from app.modules.productos import repository as productos
from app.modules.productos import vinculos
from tests.sesion import simular_sesion, usuario_con_roles
from tests.unit.test_productos import BdFalsa

almacen = BdFalsa()
eventos: list[audit.EventoAuditoria] = []
patch.setattr(audit, "_persistir", eventos.append)
simular_sesion(app, usuario_con_roles("ADMIN"))
app.dependency_overrides[db.cooperativa] = lambda: MagicMock()

TIPOS = [
    (1, "CUENTA_AHORRO", "Cuenta de ahorro", "Cuenta", "Ahorro"),
    (2, "CUENTA_CORRIENTE", "Cuenta corriente", "Cuenta", "Corriente"),
    (3, "CERTIFICADO_APORTACION", "Certificados de aportacion", "Cuenta", "Ahorro"),
    (4, "CREDITO", "Credito", "Credito", None),
    (5, "TARJETA", "Tarjeta", "Tarjeta", None),
]
tipos = [
    dict(
        zip(
            ("id_tipo_producto", "codigo", "nombre", "tipo_producto", "tipo_cuenta"),
            t,
            strict=True,
        )
    )
    for t in TIPOS
]


def insertar(conn: Any, datos: dict[str, Any]) -> int:
    id_ = almacen.insertar(conn, datos)
    almacen.productos[id_]["id_tipo_producto"] = datos["id_tipo_producto"]
    return id_


for nombre, funcion in {
    "listar_tipos": lambda _c: deepcopy(tipos),
    "obtener_producto": almacen.obtener,
    "listar_productos": almacen.listar,
    "listar_subproductos": almacen.listar_subs,
    "obtener_subproducto": almacen.obtener_sub,
    "insertar_producto": insertar,
    "actualizar_producto": almacen.actualizar,
    "insertar_subproducto": almacen.insertar_sub,
    "actualizar_subproducto": almacen.actualizar_sub,
    "existe_red_activa": lambda _c, i: i == 2,
    "existe_tipo_credito_activo": lambda _c, i: i == 1,
    "producto_en_uso": lambda _c, i: i in almacen.en_uso,
    "eliminar_producto": lambda _c, i: almacen.productos.pop(i),
    "cuentas_cliente_para_elegibilidad": lambda *_a: [],
    "tarjetas_cliente_para_elegibilidad": lambda *_a: [],
}.items():
    patch.setattr(productos, nombre, funcion)

base = {
    "codigo_producto": "AHO001",
    "nombre_producto": "Ahorro local",
    "descripcion": "Solo datos ficticios de E3-02",
    "tipo_producto": "Cuenta",
    "tipo_cuenta": "Ahorro",
    "monto_apertura_minimo": 10,
    "id_tipo_credito": None,
    "id_red": None,
    "permite_operaciones_presenciales": True,
    "id_tipo_producto": 1,
}
padre = insertar(None, base)
almacen.productos[padre].update(estado="A", estado_catalogo="Activo")
menores = almacen.insertar_sub(None, padre, "AHO001-MN", "Ahorro para menores", 0, 17)
adultos = almacen.insertar_sub(
    None, padre, "AHO001-AD", "Ahorro para adultos", 18, None
)
for id_ in (menores, adultos):
    almacen.subs[id_].update(
        estado="A",
        estado_catalogo="Activo",
        tipo_cliente_permitido="Natural",
        requiere_tutor=False,
        id_sub_producto_requerido=None,
        maximo_por_cliente=None,
    )
borrador = insertar(
    None, {**base, "codigo_producto": "BOR001", "nombre_producto": "Producto borrador"}
)
almacen.insertar_sub(None, borrador, "BOR001-MN", "Subproducto borrador", 0, 17)

HOY = date(2026, 11, 16)
nacimientos = {1: date(2010, 1, 1), 2: date(1990, 1, 1)}
patch.setattr(catalogos_service, "hoy", lambda: HOY)
patch.setattr(
    catalogos,
    "fecha_nacimiento_cliente",
    lambda _c, i: (i in nacimientos, nacimientos.get(i)),
)


def elegibilidad(_c: Any, cliente: int, sub: int) -> dict[str, Any] | None:
    s = almacen.subs.get(sub)
    if s is None or cliente not in nacimientos:
        return None
    p = almacen.productos[s["id_producto"]]
    return {
        "tipo_cliente": "Natural",
        "fecha_nacimiento": nacimientos[cliente],
        "estado_cliente": "Activo",
        "id_subproducto": sub,
        "tipo_permitido": s.get("tipo_cliente_permitido", "Ambos"),
        "edad_minima": s["edad_minima"],
        "edad_maxima": s["edad_maxima"],
        "requiere_tutor": s.get("requiere_tutor", False),
        "id_requerido": s.get("id_sub_producto_requerido"),
        "maximo_por_cliente": s.get("maximo_por_cliente"),
        "estado_subproducto": s["estado"],
        "estado_subproducto_nuevo": s["estado_catalogo"],
        "estado_producto": p["estado"],
        "estado_producto_nuevo": p["estado_catalogo"],
        "tipo_producto": p["tipo_producto"],
    }


def seleccion(
    _c: Any, tipo: str | None, _tarjeta: str | None = None, edad: int | None = None
) -> list[dict[str, Any]]:
    # Dobles de persistencia; las reglas completas se ejecutan en cliente_elegible.
    resultado = []
    for p in almacen.productos.values():
        if (
            p["estado"] != "A"
            or p["estado_catalogo"] != "Activo"
            or tipo not in (None, p["tipo_producto"])
        ):
            continue
        subs = [
            deepcopy(s)
            for s in almacen.subs.values()
            if s["id_producto"] == p["id_producto"]
            and s["estado"] == "A"
            and s["estado_catalogo"] == "Activo"
            and (
                edad is None
                or (
                    (s["edad_minima"] is None or edad >= s["edad_minima"])
                    and (s["edad_maxima"] is None or edad <= s["edad_maxima"])
                )
            )
        ]
        resultado.append({**deepcopy(p), "subproductos": subs})
    return resultado


patch.setattr(productos, "datos_elegibilidad", elegibilidad)
patch.setattr(catalogos, "listar_productos", seleccion)
patch.setattr(
    productos,
    "condiciones_vigentes",
    lambda *_a: {
        "monto_apertura_minimo": 10,
        "saldo_minimo": 0,
        "tasa_interes_anual": 0,
        "costo_mantenimiento": 0,
        "vigencia_desde": date(2026, 1, 1),
    },
)
patch.setattr(
    productos,
    "listar_cupos",
    lambda *_a: [
        {
            "id_canal": 1,
            "codigo_canal": "VENT",
            "nombre_canal": "Ventanilla",
            "habilitado": True,
            "cupo_diario_maximo": 500,
            "cupo_mensual_maximo": 5000,
            "monto_max_transaccion": 300,
            "max_transacciones_dia": 5,
        }
    ],
)
patch.setattr(
    productos,
    "obtener_restricciones",
    lambda *_a: {"saldo_minimo": 0, "dias_sin_retiros": None},
)
patch.setattr(
    catalogos,
    "reglas_edad",
    lambda _c, i: {
        "efectiva": almacen.subs[i]["edad_minima"],
        "maxima": almacen.subs[i]["edad_maxima"],
        "subproducto": almacen.subs[i]["edad_minima"],
    },
)
patch.setattr(
    vinculos,
    "leer",
    lambda *_a: {
        "tasas_interes": [],
        "comisiones": [],
        "seguros": [],
        "sistemas_amortizacion": [],
    },
)
for nombre in (
    "listar_tasas_interes",
    "listar_comisiones",
    "listar_seguros",
    "listar_redes",
    "listar_tipos_credito",
    "listar_sistemas_amortizacion",
):
    patch.setattr(catalogos, nombre, lambda *_a: [])
patch.setattr(
    catalogos,
    "listar_agencias",
    lambda *_a: [
        {
            "id_agencia": "001",
            "codigo": "LAB",
            "nombre": "Agencia local ficticia",
            "tipo_agencia": "Matriz",
            "provincia": "Prueba",
            "ciudad": "Prueba",
            "estado": "A",
        }
    ],
)


def consultar_clientes(_c: Any, **filtros: Any) -> tuple[list[dict[str, Any]], int]:
    filas = []
    for id_, nacimiento in nacimientos.items():
        identificacion = "100000000" + str(id_)
        if filtros.get("identificacion") not in (None, identificacion):
            continue
        filas.append(
            {
                "id_cliente": id_,
                "identificacion": identificacion,
                "tipo_documento": "C",
                "tipo_cliente": "Natural",
                "nombres": "Cliente ficticio",
                "apellidos": "Menor" if id_ == 1 else "Adulto",
                "fecha_nacimiento": nacimiento,
                "codigo_pais_nacionalidad": "ECU",
                "telefono_celular": "0990000000",
                "email": "e2e@example.invalid",
                "consentimiento_datos": True,
                "fecha_consentimiento": datetime(2026, 1, 1),
                "estado": "Activo",
                "fecha_registro": datetime(2026, 1, 1),
                "creado_por": 1,
                "direcciones": [],
            }
        )
    return filas, len(filas)


patch.setattr(clientes, "consultar_clientes", consultar_clientes)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=18471, server_header=False)
