import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'

import { Button, Input, Label } from '@/shared/ui'
import { loginSchema, type LoginFormValues } from '../schemas/login.schema'

interface LoginFormProps {
  onSubmit: (values: LoginFormValues) => Promise<void>
}

const fieldClassName =
  'h-[52px] rounded-xl border-border bg-field px-4 text-base md:text-base placeholder:text-muted-foreground/80 dark:bg-field'

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="username" className="text-[15px] font-semibold text-heading">
            Usuario
          </Label>
          <a href="#" className="text-sm font-medium text-link hover:underline">
            ¿Olvidaste tu usuario?
          </a>
        </div>
        <Input
          id="username"
          autoComplete="username"
          placeholder="Ingresa tu usuario"
          aria-invalid={!!errors.username}
          aria-describedby={errors.username ? 'username-error' : undefined}
          className={fieldClassName}
          {...register('username')}
        />
        {errors.username && (
          <p id="username-error" className="text-sm text-destructive">
            {errors.username.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password" className="text-[15px] font-semibold text-heading">
            Contraseña
          </Label>
          <a href="#" className="text-sm font-medium text-link hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Ingresa tu contraseña"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className={`${fieldClassName} pr-12`}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 h-[52px] rounded-xl text-base font-semibold hover:bg-primary/90 disabled:opacity-80"
      >
        {isSubmitting ? 'Verificando…' : 'Ingresar'}
      </Button>
    </form>
  )
}
