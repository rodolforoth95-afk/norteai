-- Auditoria da IA (seção 7.3): registra bloqueios da checagem regulatória.
-- Sem texto da conversa e sem dados pessoais: só usuário, tipo e data.
create table public.auditoria_ia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  tipo text not null check (tipo in ('bloqueio_regulatorio')),
  criado_em timestamptz not null default now()
);

alter table public.auditoria_ia enable row level security;
-- Sem políticas: só o servidor (service role) lê e grava.
