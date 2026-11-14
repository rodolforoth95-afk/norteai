-- Conta simulada do Simulador: carteira com dinheiro fictício acompanhada com cotações reais.
-- Um documento por pessoa, validado pelo app (mesmo modelo de financas e carteira_v2).

create table if not exists public.conta_simulada (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  dados jsonb not null,
  atualizada_em timestamptz not null default now()
);

alter table public.conta_simulada enable row level security;

drop policy if exists "conta_simulada: dono lê" on public.conta_simulada;
create policy "conta_simulada: dono lê" on public.conta_simulada for select using (usuario_id = auth.uid());
