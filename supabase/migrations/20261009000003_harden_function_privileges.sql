-- Endurecimiento según el asesor de seguridad de Supabase:
-- search_path fijo y sin EXECUTE para clientes en funciones que solo usan los triggers.
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.enforce_free_weekly_limit() from public, anon, authenticated;
revoke execute on function public.enforce_pro_targets() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
