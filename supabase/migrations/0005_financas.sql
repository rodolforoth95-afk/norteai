-- Receitas e despesas (fluxo de caixa pessoal): lançamentos, categorias da pessoa,
-- regras de aprendizado e metas de economia. Um documento por pessoa, validado pelo app
-- (mesmo modelo da carteira_v2). Ver docs/fluxo-de-caixa.md para o modelo relacional futuro.

create table if not exists public.financas (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  dados jsonb not null,
  atualizada_em timestamptz not null default now()
);

alter table public.financas enable row level security;

drop policy if exists "financas: dono lê" on public.financas;
create policy "financas: dono lê" on public.financas for select using (usuario_id = auth.uid());
