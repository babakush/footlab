import Link from "next/link";
import {
  ArrowRight, BarChart3, BookOpen, CalendarDays, ClipboardCheck, HeartPulse, ShieldCheck, Sparkles, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-header";
import { DashboardPreview } from "@/components/marketing/dashboard-preview";
import { Pricing } from "@/components/marketing/pricing";
import { isStripeConfigured } from "@/lib/stripe";

const features = [
  { icon: CalendarDays, title: "Planificación semanal", text: "Organiza tu semana de lunes a domingo alrededor de los entrenamientos con tu equipo y del día de partido." },
  { icon: ClipboardCheck, title: "Registro de entrenamientos", text: "Marca sesiones como completadas, anota la duración real, el esfuerzo percibido y tus sensaciones." },
  { icon: BookOpen, title: "Biblioteca de ejercicios", text: "Aceleración, fuerza, core, movilidad, técnica y cambios de dirección, con pasos claros, variantes y precauciones." },
  { icon: BarChart3, title: "Evolución visible", text: "Minutos semanales, sesiones por tipo y comparativas entre semanas, calculadas solo con tus datos." },
  { icon: HeartPulse, title: "Hábitos y recuperación", text: "Un registro diario opcional de sueño, energía, fatiga y motivación para entender cómo llegas a cada sesión." },
  { icon: Target, title: "Constancia", text: "Rachas semanales y objetivos para que mantengas el ritmo durante toda la temporada." },
];

const steps = [
  { n: "01", title: "Crea tu perfil", text: "Cuéntanos tu posición, nivel, objetivo, material disponible y cuándo entrenas con tu equipo y juegas." },
  { n: "02", title: "Recibe una semana sugerida", text: "FOOTLAB propone un plan prudente que respeta el partido, deja días de descanso y puedes editar a tu gusto." },
  { n: "03", title: "Entrena y registra", text: "Marca lo que completas, cómo te has sentido y cómo te recuperas. Tu panel se actualiza con datos reales." },
];

const faqs = [
  { q: "¿FOOTLAB sustituye a mi entrenador?", a: "No. FOOTLAB te ayuda a organizarte y a registrar tu trabajo, pero las rutinas deben adaptarse a tu estado físico y a las indicaciones de tu entrenador. Si eres menor de edad, revisa tu planificación con tu entrenador o tutor." },
  { q: "¿Qué incluye el plan gratuito?", a: "Perfil deportivo, planificador semanal básico, registro manual de entrenamientos y recuperación, una selección de ejercicios, estadísticas básicas y exportación de tus datos. No caduca." },
  { q: "¿Cuánto cuesta el plan Pro y cómo lo cancelo?", a: "El precio orientativo es de 7,99 € al mes. El pago se gestiona con Stripe y puedes cancelar o cambiar de plan en cualquier momento desde tu perfil. FOOTLAB no almacena los datos de tu tarjeta." },
  { q: "¿FOOTLAB calcula mi velocidad, distancia o calorías?", a: "No. Solo mostramos los datos que tú introduces. Cuando algo es una estimación (por ejemplo, la carga a partir de minutos y esfuerzo percibido) lo indicamos claramente." },
  { q: "¿Puedo usar FOOTLAB si soy menor de edad?", a: "Puedes registrarte a partir de 14 años. Solo pedimos los datos imprescindibles (un nombre o apodo y tu edad) y te recordamos que adaptes las rutinas con ayuda de tu entrenador o tutor." },
  { q: "¿Puedo exportar o borrar mis datos?", a: "Sí. Desde tu perfil puedes descargar tus datos de entrenamiento en CSV y eliminar tu cuenta con todos tus datos de forma permanente." },
];

export default function LandingPage() {
  const paymentsEnabled = isStripeConfigured();
  return (
    <>
      <SiteHeader />
      <main id="contenido">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-grid [mask-image:radial-gradient(70%_60%_at_50%_0%,#000,transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-24">
            <div className="mx-auto max-w-3xl text-center animate-fade-up">
              <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" /> Para futbolistas amateurs, juveniles y semiprofesionales
              </p>
              <h1 className="mt-6 text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-7xl">
                Entrena con propósito.{" "}
                <span className="text-primary">Compite a otro nivel.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
                FOOTLAB organiza tu semana alrededor del equipo y del partido, registra cada sesión y te muestra tu evolución con tus propios datos. Todo desde el móvil, en el vestuario o en el gimnasio.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/registro">Empieza gratis <ArrowRight /></Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link href="#como-funciona">Cómo funciona</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">Sin tarjeta. Plan gratuito sin caducidad.</p>
            </div>
            <div className="mx-auto mt-14 max-w-4xl animate-fade-up [animation-delay:120ms]">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* Funciones */}
        <section id="funciones" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Funciones</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Todo tu trabajo fuera del equipo, en un solo lugar.</h2>
              <p className="mt-3 text-muted-foreground">Diseñado para que tardes segundos en planificar y registrar, y dediques el tiempo a entrenar.</p>
            </div>
            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="group bg-card p-6 transition-colors hover:bg-elevated">
                  <div className="grid size-10 place-items-center rounded-lg border border-border bg-background text-primary transition group-hover:border-primary/40">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 font-medium">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-primary">Cómo funciona</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">En marcha en tres pasos.</h2>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
                  <span className="font-mono text-sm text-primary">{s.n}</span>
                  <h3 className="mt-4 text-lg font-medium">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>Las sugerencias son orientativas y prudentes: evitan sesiones exigentes en la víspera del partido y siempre dejan días de descanso. Ajusta tu plan con tu entrenador.</p>
            </div>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-medium text-primary">Precios</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Empieza gratis. Pasa a Pro cuando lo necesites.</h2>
            </div>
            <div className="mt-12"><Pricing paymentsEnabled={paymentsEnabled} /></div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 border-t border-border/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="text-sm font-medium text-primary">Preguntas frecuentes</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">Lo que suelen preguntarnos.</h2>
            </div>
            <Accordion type="single" collapsible className="border-t border-border">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA final */}
        <section className="border-t border-border/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center sm:px-12">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_100%,rgba(198,244,50,0.16),transparent)]" />
              <h2 className="relative text-3xl font-semibold tracking-tight sm:text-5xl">Tu temporada empieza esta semana.</h2>
              <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">Crea tu cuenta gratis, completa tu perfil en dos minutos y recibe tu primera semana sugerida.</p>
              <Button asChild size="lg" className="relative mt-8">
                <Link href="/registro">Empieza gratis <ArrowRight /></Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
