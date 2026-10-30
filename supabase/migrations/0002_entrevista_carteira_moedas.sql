-- Entrevista, perfil, carteira, evolução, coins e progresso nos conteúdos.
-- Leitura liberada só para o dono (RLS). Gravações feitas pelo servidor (service role).

create table public.entrevista (
  usuario_id uuid primary key references public.usuario (id) on delete cascade,
  respostas jsonb not null default '{}',
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluida')),
  iniciada_em timestamptz not null default now(),
  atualizada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table public.perfil (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  versao int not null,
  respostas jsonb not null, -- só faixas e opções do roteiro, nunca valores exatos
  pontuacao int not null check (pontuacao between 0 and 7),
  estilo text not null check (estilo in ('Cauteloso', 'Equilibrado', 'Ousado')),
  travado boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (usuario_id, versao)
);

create table public.carteira (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null unique references public.usuario (id) on delete cascade,
  origem text not null check (origem in ('b3', 'pdf', 'planilha', 'manual', 'exemplo')),
  atualizada_em timestamptz not null default now()
);

create table public.posicao (
  id uuid primary key default gen_random_uuid(),
  carteira_id uuid not null references public.carteira (id) on delete cascade,
  classe text not null check (classe in ('renda_fixa', 'acoes_etfs', 'fiis', 'multimercado', 'cripto', 'exterior')),
  codigo_ou_nome text not null,
  quantidade numeric,
  valor_atual numeric(14, 2) not null check (valor_atual >= 0),
  data_referencia date
);

create table public.carteira_snapshot (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  data timestamptz not null default now(),
  total numeric(14, 2) not null,
  por_classe jsonb not null
);
create index carteira_snapshot_usuario_idx on public.carteira_snapshot (usuario_id, data);

create table public.moeda_lancamento (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  tipo text not null,
  referencia text not null,
  valor int not null,
  criado_em timestamptz not null default now(),
  unique (usuario_id, tipo, referencia)
);

create table public.conclusao (
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  chave text not null, -- ex.: video:cdb, leitura:cripto
  concluido_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

alter table public.entrevista enable row level security;
alter table public.perfil enable row level security;
alter table public.carteira enable row level security;
alter table public.posicao enable row level security;
alter table public.carteira_snapshot enable row level security;
alter table public.moeda_lancamento enable row level security;
alter table public.conclusao enable row level security;

create policy "entrevista: dono lê" on public.entrevista for select using (usuario_id = auth.uid());
create policy "perfil: dono lê" on public.perfil for select using (usuario_id = auth.uid());
create policy "carteira: dono lê" on public.carteira for select using (usuario_id = auth.uid());
create policy "posicao: dono lê" on public.posicao for select
  using (exists (select 1 from public.carteira c where c.id = carteira_id and c.usuario_id = auth.uid()));
create policy "snapshot: dono lê" on public.carteira_snapshot for select using (usuario_id = auth.uid());
create policy "moedas: dono lê" on public.moeda_lancamento for select using (usuario_id = auth.uid());
create policy "conclusao: dono lê" on public.conclusao for select using (usuario_id = auth.uid());
