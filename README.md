# FOOTLAB

Plataforma SaaS de rendimiento para futbolistas amateurs, juveniles y semiprofesionales: planificación semanal, registro de entrenamientos, biblioteca de ejercicios, seguimiento del progreso y de la recuperación, con modelo freemium (Gratis / Pro 7,99 €/mes orientativo).

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Actions) + TypeScript + React 19 |
| UI | Tailwind CSS 4 + componentes estilo shadcn/ui sobre Radix UI, iconos Lucide, fuente Geist |
| Datos y auth | Supabase (PostgreSQL, Auth, Row Level Security) con `@supabase/ssr` |
| Gráficos | Recharts 3 |
| Pagos | Stripe Checkout + Billing Portal + webhooks |

> Next.js 15.5 en lugar de 16: es la rama estable con más recorrido y compatible con todo el stack; migrar a 16 es sencillo más adelante.
> Los componentes shadcn/ui están escritos a mano en `src/components/ui` (el registro de shadcn no era accesible desde el entorno de desarrollo); siguen su mismo patrón (Radix + CVA + Tailwind).

## Estructura

```
src/
  app/
    page.tsx                 Landing (hero, funciones, 3 pasos, precios, FAQ, CTA)
    (auth)/                  entrar · registro · recuperar · restablecer + server actions
    auth/callback/route.ts   Confirmación de email y recuperación de contraseña
    onboarding/              Cuestionario en 5 pasos + plan inicial sugerido
    panel/                   Zona privada
      page.tsx               Dashboard
      plan/                  Planificador semanal
      biblioteca/            Biblioteca filtrable y ficha de ejercicio
      progreso/              Estadísticas e historial
      recuperacion/          Hábitos y recuperación
      perfil/                Perfil, objetivos, récords, exportación, borrado de cuenta
      suscripcion/           Plan Pro (Checkout / Portal de Stripe)
      actions.ts             Server actions (validación con Zod + RLS)
    api/export/              Exportación CSV
    api/stripe/webhook/      Webhook de Stripe (firma verificada)
    configuracion/           Estado de la configuración (qué variables faltan)
  lib/
    planning.ts              Lógica de semana sugerida (respeta partido, descanso y nivel)
    stats.ts                 Cálculos de estadísticas (solo datos del usuario)
    billing.ts / stripe.ts   Integración Stripe (solo servidor)
    supabase/                Clientes server / middleware / admin
  middleware.ts              Refresco de sesión y protección de rutas
supabase/migrations/         Esquema, RLS, triggers y contenido inicial de ejercicios
scripts/exercises.mjs        Contenido de la biblioteca (regenera la migración de seed)
tests/                       Pruebas RLS, E2E (Playwright), webhook y Pro
```

## Base de datos

Tablas: `profiles`, `player_preferences`, `training_sessions`, `session_exercises`, `exercise_library`, `daily_recovery_logs`, `personal_records`, `subscriptions`.

Seguridad aplicada en la propia base de datos:

- **RLS en todas las tablas**: cada usuario solo lee y modifica sus filas; los anónimos no acceden a datos privados.
- `subscriptions` es de solo lectura para el usuario; solo la escribe el webhook (service role).
- El plan Pro se calcula en PostgreSQL (`current_user_is_pro()`), nunca en el cliente.
- Ejercicios Pro filtrados por RLS; `exercise_catalog()` permite mostrarlos como bloqueados sin revelar su contenido.
- Triggers que aplican el límite del plan gratuito (5 sesiones personales/semana) y bloquean objetivos personalizados sin Pro.
- `delete_my_account()` borra al usuario de `auth.users` y todo lo demás en cascada.

## Ejecutar en local

Requisitos: Node 20+ y una instancia de Supabase (en la nube o local con la CLI y Docker).

```bash
npm install
cp .env.example .env.local      # rellena las variables
npm run dev                      # http://localhost:3000
```

### Opción A: Supabase en la nube (recomendado)

1. Crea un proyecto en https://supabase.com (región UE, p. ej. Frankfurt).
2. **SQL Editor** → ejecuta, en orden, los archivos de `supabase/migrations/` (`..._init.sql` y luego `..._exercise_library_seed.sql`).
   Alternativa con CLI: `npx supabase link --project-ref TU_REF && npx supabase db push`.
3. **Project Settings → API**: copia `URL`, `anon key` y `service_role key` a `.env.local`.
4. **Authentication → URL Configuration**: `Site URL` = `http://localhost:3000` (y tu dominio en producción). En **Redirect URLs** añade `http://localhost:3000/**` y `https://TU-DOMINIO/**`.
5. **Authentication → Providers → Email**: deja activado *Confirm email*. Para producción configura un SMTP propio (Authentication → SMTP), el SMTP por defecto de Supabase tiene un límite muy bajo de envíos.
6. (Opcional) Traduce las plantillas de email en **Authentication → Email Templates**.

### Opción B: Supabase local

```bash
npx supabase init          # si no existe supabase/config.toml
npx supabase start         # requiere Docker; aplica supabase/migrations
```
Usa la `API URL`, `anon key` y `service_role key` que imprime. Los emails se ven en Inbucket (http://localhost:54324).

## Configurar Stripe (plan Pro)

Sin estas variables la app funciona igualmente y muestra «Pagos todavía no disponibles»; nunca se simula un pago.

1. En https://dashboard.stripe.com (modo test primero) crea un **Producto** «FOOTLAB Pro» con un **precio recurrente mensual** de 7,99 € → copia el `price_...` a `STRIPE_PRICE_ID_PRO`.
2. **Developers → API keys** → `STRIPE_SECRET_KEY`.
3. **Settings → Billing → Customer portal**: activa cancelar suscripción, actualizar método de pago y (si quieres) cambiar de plan. Guarda.
4. Webhook:
   - Local: `stripe listen --forward-to localhost:3000/api/stripe/webhook` → copia el `whsec_...`.
   - Producción: **Developers → Webhooks → Add endpoint** `https://TU-DOMINIO/api/stripe/webhook` con los eventos
     `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`.
5. Añade también `SUPABASE_SERVICE_ROLE_KEY` (el webhook la necesita para escribir en `subscriptions`).
6. Prueba con la tarjeta `4242 4242 4242 4242`. Comprueba en `/configuracion` que todo aparece en verde.

## Desplegar en Internet (Vercel)

1. Sube el proyecto a un repositorio de GitHub.
2. En https://vercel.com → **Add New Project** → importa el repositorio (framework Next.js detectado automáticamente).
3. Añade todas las variables de `.env.example` en **Settings → Environment Variables** con `NEXT_PUBLIC_SITE_URL=https://TU-DOMINIO`.
4. Deploy. Después:
   - En Supabase, añade el dominio a *Site URL* y *Redirect URLs*.
   - En Stripe, crea el webhook de producción y actualiza `STRIPE_WEBHOOK_SECRET`; cambia a claves `live` cuando quieras cobrar de verdad.
5. Antes de lanzar comercialmente: completa y revisa con un profesional `/privacidad` y `/terminos` (están marcadas como borrador).

## Pruebas

```bash
npm run typecheck && npm run lint && npm run build

# Con Supabase y la app arrancados (ver cada archivo para las variables):
SUPABASE_URL=... ANON_KEY=... SERVICE_KEY=... node tests/rls.test.mjs              # 25 comprobaciones de seguridad
BASE_URL=http://localhost:3000 MAIL_DIR=... node tests/e2e.mjs                      # 25 flujos en navegador
SUPABASE_URL=... ANON_KEY=... SERVICE_KEY=... node tests/stripe-webhook.test.mjs   # webhook firmado
SUPABASE_URL=... SERVICE_KEY=... node tests/pro-ui.test.mjs                         # desbloqueo Pro
```

## Decisiones de producto

- **Menores**: registro a partir de 14 años (edad de consentimiento digital en España). Solo se guarda un apodo y la edad; los menores deben confirmar que revisarán las rutinas con su entrenador o tutor, y reciben un plan con menos carga y sin ejercicios avanzados.
- **Exportación CSV gratuita para todos**: aunque «Exportación de datos» figuraba como ventaja Pro, la portabilidad es un derecho del RGPD, así que no se cobra.
- **Planificación prudente**: nada intenso la víspera ni a dos días del partido, recuperación el día después, tope de sesiones intensas por nivel y al menos un día de descanso completo.
- **Datos honestos**: velocidad, distancia y calorías no se calculan. La carga sRPE y el índice de recuperación se marcan como «Estimación».
