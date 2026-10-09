import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";

export const metadata: Metadata = { title: "Términos de uso" };

export default function TermsPage() {
  return (
    <LegalPage title="Términos de uso" updated="9 de octubre de 2026">
      <h2>El servicio</h2>
      <p>FOOTLAB es una herramienta para planificar, registrar y visualizar tu entrenamiento como futbolista. Ofrece un plan gratuito y un plan Pro de pago mensual.</p>
      <h2>No es asesoramiento médico</h2>
      <p>Los ejercicios, sesiones y sugerencias son orientativos y no sustituyen la supervisión de un entrenador cualificado ni el consejo de un profesional sanitario. No garantizamos resultados deportivos concretos. Si sientes dolor, mareos u otros síntomas preocupantes, detén el entrenamiento y consulta con un profesional.</p>
      <h2>Edad mínima</h2>
      <p>Debes tener al menos 14 años para crear una cuenta. Si eres menor de edad, adapta las rutinas con ayuda de tu entrenador, tutor o familia.</p>
      <h2>Suscripción Pro</h2>
      <ul>
        <li>Los pagos se procesan a través de Stripe. FOOTLAB no almacena datos de tarjetas.</li>
        <li>La suscripción se renueva mensualmente hasta que la canceles desde tu perfil.</li>
        <li>Si cancelas, mantienes el acceso Pro hasta el final del periodo ya pagado.</li>
      </ul>
      <h2>Tu cuenta</h2>
      <p>Eres responsable de mantener la confidencialidad de tu contraseña. Puedes eliminar tu cuenta en cualquier momento desde tu perfil.</p>
      <h2>Contacto</h2>
      <p>[Email de contacto del titular del servicio].</p>
    </LegalPage>
  );
}
