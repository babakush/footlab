import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de privacidad" updated="9 de octubre de 2026">
      <p>En FOOTLAB aplicamos el principio de minimización de datos: solo tratamos la información necesaria para prestarte el servicio.</p>
      <h2>Responsable del tratamiento</h2>
      <p>[Nombre o razón social, NIF, dirección y email de contacto del responsable].</p>
      <h2>Qué datos tratamos</h2>
      <ul>
        <li>Datos de cuenta: email y contraseña (almacenada de forma cifrada por nuestro proveedor de autenticación).</li>
        <li>Perfil: un nombre o apodo y tu edad. No pedimos fecha de nacimiento, teléfono, dirección ni fotografías.</li>
        <li>Datos deportivos que introduces: posición, nivel, objetivos, planificación, sesiones, esfuerzo percibido, distancias y récords.</li>
        <li>Registros opcionales de bienestar: sueño, energía, fatiga, motivación, hidratación y síntomas que decidas indicar.</li>
        <li>Datos de suscripción: identificadores de cliente y suscripción de Stripe y su estado. Nunca almacenamos datos de tarjetas.</li>
      </ul>
      <h2>Finalidad y base legal</h2>
      <p>Tratamos tus datos para prestarte el servicio que solicitas al registrarte (ejecución del contrato) y, en el caso de los registros de bienestar, porque decides introducirlos voluntariamente. No usamos tus datos para publicidad ni los vendemos a terceros.</p>
      <h2>Menores de edad</h2>
      <p>FOOTLAB está disponible a partir de 14 años. Para los usuarios de 14 a 17 años no recogemos ningún dato adicional y recomendamos que revisen su planificación con su entrenador, tutor o familia.</p>
      <h2>Encargados del tratamiento</h2>
      <ul>
        <li>Supabase: base de datos y autenticación.</li>
        <li>Stripe: gestión de pagos de suscripciones.</li>
        <li>Proveedor de alojamiento de la aplicación web.</li>
      </ul>
      <h2>Seguridad</h2>
      <p>Cada usuario solo puede acceder a sus propios datos gracias a políticas de seguridad a nivel de fila (Row Level Security) en la base de datos y a la verificación de la sesión en el servidor.</p>
      <h2>Tus derechos</h2>
      <p>Puedes acceder, rectificar, exportar (en CSV desde tu perfil) y suprimir tus datos (eliminando tu cuenta desde tu perfil) en cualquier momento. También puedes ejercer tus derechos escribiendo al email del responsable y reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
      <h2>Conservación</h2>
      <p>Conservamos tus datos mientras mantengas tu cuenta. Al eliminarla, se borran de forma permanente de nuestra base de datos.</p>
    </LegalPage>
  );
}
