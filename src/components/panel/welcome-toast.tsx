"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";

export function WelcomeToast({ welcome, passwordChanged }: { welcome?: boolean; passwordChanged?: boolean }) {
  const shown = useRef(false);
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (shown.current || (!welcome && !passwordChanged)) return;
    shown.current = true;
    if (welcome) toast.success("¡Perfil creado!", { description: "Tu panel ya está personalizado. Revisa tu semana sugerida y ajústala a tu gusto." });
    if (passwordChanged) toast.success("Contraseña actualizada");
    router.replace(path, { scroll: false });
  }, [welcome, passwordChanged, router, path]);
  return null;
}
