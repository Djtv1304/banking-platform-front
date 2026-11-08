import { useState, type DragEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileUp, Loader2, Paperclip, Upload, X } from 'lucide-react'

import { cn } from '@/shared/lib'
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui'
import { useSubirDocumento } from '@/features/clientes/hooks/useClientes'
import { a11y } from '@/features/clientes/lib/a11y'
import { ARCHIVO_TIPOS_PERMITIDOS, CATEGORIAS_DOCUMENTO, formatearTamano } from '@/features/clientes/lib/documentos'
import {
  subirDocumentoSchema,
  type SubirDocumentoData,
  type SubirDocumentoInput,
} from '@/features/clientes/schemas/subir-documento.schema'

const DEFAULT_VALUES: Partial<SubirDocumentoInput> = { nombre: '', referencia: '' }

export function SubirDocumentoDialog({ idCliente }: { idCliente: number }) {
  const [open, setOpen] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const mutation = useSubirDocumento(idCliente)
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubirDocumentoInput, unknown, SubirDocumentoData>({
    resolver: zodResolver(subirDocumentoSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const cambiarVisibilidad = (abierto: boolean) => {
    setOpen(abierto)
    if (!abierto) {
      reset(DEFAULT_VALUES)
      mutation.reset()
    }
  }

  const onSubmit = (datos: SubirDocumentoData) =>
    mutation.mutate(datos, { onSuccess: () => cambiarVisibilidad(false) })

  return (
    <Dialog open={open} onOpenChange={cambiarVisibilidad}>
      <DialogTrigger asChild>
        <Button className="h-10 rounded-xl px-4 font-semibold hover:bg-primary/90">
          <Upload />
          Subir documento
        </Button>
      </DialogTrigger>

      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-5 p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-heading">Subir documento</DialogTitle>
              <DialogDescription>
                Clasifícalo en su categoría para que el cliente y el equipo lo encuentren fácilmente.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Label htmlFor="categoria" className="font-semibold text-heading">
                Categoría
              </Label>
              <Controller
                control={control}
                name="categoria"
                render={({ field, fieldState }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="categoria"
                      onBlur={field.onBlur}
                      className="w-full rounded-lg data-[size=default]:h-11"
                      {...a11y('categoria', fieldState.error?.message)}
                    >
                      <SelectValue placeholder="Selecciona la categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_DOCUMENTO.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoria && (
                <p id="categoria-error" className="text-destructive">
                  {errors.categoria.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nombre" className="font-semibold text-heading">
                Nombre del documento
              </Label>
              <Input
                id="nombre"
                placeholder="Contrato de cuenta de ahorros"
                className="h-11 rounded-lg"
                {...a11y('nombre', errors.nombre?.message)}
                {...register('nombre')}
              />
              {errors.nombre && (
                <p id="nombre-error" className="text-destructive">
                  {errors.nombre.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="referencia" className="font-semibold text-heading">
                Producto relacionado <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="referencia"
                placeholder="Cuenta 2201004521"
                className="h-11 rounded-lg"
                {...a11y('referencia', errors.referencia?.message)}
                {...register('referencia')}
              />
              {errors.referencia && (
                <p id="referencia-error" className="text-destructive">
                  {errors.referencia.message}
                </p>
              )}
            </div>

            <Controller
              control={control}
              name="archivo"
              render={({ field, fieldState }) => {
                const archivo = field.value as File | undefined
                const soltar = (event: DragEvent<HTMLLabelElement>) => {
                  event.preventDefault()
                  setArrastrando(false)
                  const soltado = event.dataTransfer.files[0]
                  if (soltado) field.onChange(soltado)
                }

                return (
                  <div className="flex flex-col gap-2">
                    <span className="font-semibold text-heading">Archivo</span>
                    {archivo ? (
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-panel p-3">
                        <Paperclip className="size-5 shrink-0 text-muted-foreground" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-heading">{archivo.name}</span>
                          <span className="text-xs text-muted-foreground">{formatearTamano(archivo.size)}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Quitar archivo"
                          onClick={() => field.onChange(undefined)}
                        >
                          <X />
                        </Button>
                      </div>
                    ) : (
                      <label
                        onDragOver={(event) => {
                          event.preventDefault()
                          setArrastrando(true)
                        }}
                        onDragLeave={() => setArrastrando(false)}
                        onDrop={soltar}
                        className={cn(
                          'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
                          arrastrando ? 'border-primary bg-primary/8' : 'border-border hover:border-primary/60',
                          fieldState.error && 'border-destructive',
                        )}
                      >
                        <FileUp className="size-7 text-muted-foreground" />
                        <span className="font-medium text-heading">
                          Arrastra el archivo o <span className="text-link underline-offset-4">selecciónalo</span>
                        </span>
                        <span className="text-xs text-muted-foreground">PDF, JPG o PNG · máximo 10 MB</span>
                        <input
                          ref={field.ref}
                          type="file"
                          accept={ARCHIVO_TIPOS_PERMITIDOS.join(',')}
                          className="sr-only"
                          onChange={(event) => field.onChange(event.target.files?.[0])}
                          {...a11y('archivo', fieldState.error?.message)}
                        />
                      </label>
                    )}
                    {fieldState.error && (
                      <p id="archivo-error" className="text-destructive">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )
              }}
            />

            {mutation.isError && (
              <p role="alert" className="text-destructive">
                {mutation.error.message}
              </p>
            )}
          </div>

          <DialogFooter className="mx-0 mb-0 px-6 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-10 rounded-lg px-4">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={mutation.isPending} className="h-10 rounded-lg px-4 font-semibold">
              {mutation.isPending && <Loader2 className="animate-spin" />}
              {mutation.isPending ? 'Subiendo…' : 'Subir documento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
