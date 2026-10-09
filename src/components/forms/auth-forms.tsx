"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldError, FieldHint, Label } from "@/components/ui/label";
import {
  requestPasswordReset, signIn, signUp, updatePassword, type AuthState,
} from "@/app/(auth)/actions";

function FormAlert({ state }: { state: AuthState }) {
  if (!state?.error) return null;
  return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{state.error}</div>;
}

function SuccessPanel({ title, message }: { title: string; message: string }) {
  return (
    <div role="status" className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm">
      <CheckCircle2 className="size-5 text-primary" />
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

function PasswordInput({ id, name, autoComplete, invalid, describedBy }: { id: string; name: string; autoComplete: string; invalid?: boolean; describedBy?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={8}
        aria-invalid={invalid || undefined} aria-describedby={describedBy} className="pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      {linkError && !state && (
        <div role="alert" className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-sm text-warning">
          El enlace no es válido o ha caducado. Inicia sesión o solicita uno nuevo.
        </div>
      )}
      <FormAlert state={state} />
      <input type="hidden" name="next" value={next ?? "/panel"} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <Link href="/recuperar" className="text-xs text-muted-foreground hover:text-primary">¿Has olvidado tu contraseña?</Link>
        </div>
        <PasswordInput id="password" name="password" autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Entrar</Button>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState(signUp, undefined);
  if (state?.message) return <SuccessPanel title="Revisa tu correo" message={state.message} />;
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state?.email}
          aria-invalid={!!fe.email || undefined} aria-describedby="email-error" />
        <FieldError id="email-error">{fe.email}</FieldError>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!fe.password} describedBy="password-error" />
        {fe.password ? <FieldError id="password-error">{fe.password}</FieldError> : <FieldHint>Mínimo 8 caracteres, con letras y números.</FieldHint>}
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-background/40 p-3">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="age_ok" className="mt-0.5 size-4 accent-[#c6f432]" />
          <span>Tengo 14 años o más.</span>
        </label>
        <FieldError>{fe.age_ok}</FieldError>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="privacy" className="mt-0.5 size-4 accent-[#c6f432]" />
          <span className="text-muted-foreground">
            He leído y acepto la <Link href="/privacidad" target="_blank" className="text-foreground underline underline-offset-2">política de privacidad</Link> y los{" "}
            <Link href="/terminos" target="_blank" className="text-foreground underline underline-offset-2">términos</Link>.
          </span>
        </label>
        <FieldError>{fe.privacy}</FieldError>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Crear cuenta gratis</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.message) return <SuccessPanel title="Revisa tu correo" message={state.message} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-describedby="email-error" />
        <FieldError id="email-error">{state?.fieldErrors?.email}</FieldError>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Enviar enlace</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" invalid={!!fe.password} describedBy="password-error" />
        {fe.password ? <FieldError id="password-error">{fe.password}</FieldError> : <FieldHint>Mínimo 8 caracteres, con letras y números.</FieldHint>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Repite la contraseña</Label>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" invalid={!!fe.confirm} describedBy="confirm-error" />
        <FieldError id="confirm-error">{fe.confirm}</FieldError>
      </div>
      <Button type="submit" className="w-full" size="lg" loading={pending}>Guardar contraseña</Button>
    </form>
  );
}
