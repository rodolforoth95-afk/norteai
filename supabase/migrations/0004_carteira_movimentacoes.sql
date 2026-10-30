-- Carteira com histórico de movimentações (aplicações, resgates e atualizações de saldo).
-- Um documento por pessoa: os investimentos e o extrato de cada um, validados pelo app.
-- As tabelas antigas (carteira, posicao, carteira_snapshot) ficam só para converter
-- quem já tinha carteira; o app passa a gravar aqui.

create table if not exists public.carteira_v2 (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  dados jsonb not null,
  atualizada_em timestamptz not null default now()
);

alter table public.carteira_v2 enable row level security;

drop policy if exists "carteira_v2: dono lê" on public.carteira_v2;
create policy "carteira_v2: dono lê" on public.carteira_v2 for select using (usuario_id = auth.uid());
