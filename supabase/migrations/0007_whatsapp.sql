-- Findomo no WhatsApp: vínculo do número com a conta, códigos de vínculo, mensagens,
-- ação aguardando confirmação e estado do canal (serviço Baileys).
-- Rode no SQL Editor do Supabase. Só o servidor (service role) grava; o dono lê o próprio vínculo.

-- Número de WhatsApp ligado a uma conta. Um número por conta e uma conta por número.
create table if not exists public.whatsapp_vinculo (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  telefone text not null unique check (telefone ~ '^[0-9]{10,15}$'),
  lid text unique,
  jid text not null,
  nome_whatsapp text,
  avisos boolean not null default true,
  silencio_inicio time not null default '21:00',
  silencio_fim time not null default '08:00',
  consentido_em timestamptz not null,
  vinculado_em timestamptz not null default now(),
  ultima_mensagem_em timestamptz
);

alter table public.whatsapp_vinculo enable row level security;
drop policy if exists "whatsapp_vinculo: dono lê" on public.whatsapp_vinculo;
create policy "whatsapp_vinculo: dono lê" on public.whatsapp_vinculo for select using (usuario_id = auth.uid());

-- Código de uso único gerado no site; o cliente envia pelo WhatsApp para provar que o número é dele.
create table if not exists public.whatsapp_codigo (
  codigo text primary key check (codigo ~ '^[0-9]{6}$'),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index if not exists whatsapp_codigo_usuario on public.whatsapp_codigo (usuario_id);
alter table public.whatsapp_codigo enable row level security;

-- Mensagens recebidas e enviadas. message_id único: a mesma mensagem nunca é processada duas vezes.
-- Apagadas depois de 90 dias (função limpar_whatsapp abaixo).
create table if not exists public.whatsapp_mensagem (
  id uuid primary key default gen_random_uuid(),
  message_id text unique,
  usuario_id uuid references public.usuario (id) on delete cascade,
  telefone text not null,
  direcao text not null check (direcao in ('entrada', 'saida')),
  tipo text not null default 'texto' check (tipo in ('texto', 'imagem', 'audio', 'documento')),
  texto text not null default '' check (char_length(texto) <= 4000),
  status text not null default 'recebida' check (status in ('recebida', 'processando', 'respondida', 'erro', 'enviada')),
  tentativas integer not null default 0,
  resposta_de uuid references public.whatsapp_mensagem (id) on delete cascade,
  criado_em timestamptz not null default now()
);
create index if not exists whatsapp_mensagem_usuario_data on public.whatsapp_mensagem (usuario_id, criado_em desc);
create index if not exists whatsapp_mensagem_data on public.whatsapp_mensagem (criado_em);
alter table public.whatsapp_mensagem enable row level security;

-- Ação aguardando "sim" do cliente (lançamento proposto, apagar o último). Uma por conta.
create table if not exists public.whatsapp_pendente (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  acao jsonb not null,
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
alter table public.whatsapp_pendente enable row level security;

-- Estado do canal (o serviço Baileys informa a cada mudança e a cada 30 s).
create table if not exists public.whatsapp_canal (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'desconhecido',
  qr text,
  numero text,
  nome text,
  comando text check (comando in ('desconectar')),
  atualizado_em timestamptz not null default now()
);
alter table public.whatsapp_canal enable row level security;

-- Retenção (LGPD): mensagens com mais de 90 dias e códigos vencidos.
create or replace function public.limpar_whatsapp()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.whatsapp_mensagem where criado_em < now() - interval '90 days';
  delete from public.whatsapp_codigo where expira_em < now();
  delete from public.whatsapp_pendente where expira_em < now();
$$;
revoke execute on function public.limpar_whatsapp() from public, anon, authenticated;
