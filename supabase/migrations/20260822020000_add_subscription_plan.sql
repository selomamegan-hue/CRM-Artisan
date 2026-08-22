-- Bonfil — offres commerciales (Pro / Premium / Gold) + essai gratuit 15 jours.
-- L'essai démarre automatiquement à l'inscription, sans action de l'artisan.

create type subscription_plan_type as enum ('essai', 'pro', 'premium', 'gold');

alter table profiles add column subscription_plan subscription_plan_type not null default 'essai';

create or replace function handle_new_user ()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, subscription_plan, subscription_expires_at)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'essai', now() + interval '15 days');
  return new;
end;
$$;
