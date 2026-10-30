-- Etapa 1: usuário, consentimentos e controle de verificação de e-mail.
-- Rode no SQL Editor do Supabase (projeto na região São Paulo).

-- ---------------------------------------------------------------
-- usuario: espelho de auth.users com os únicos dados pessoais que guardamos
-- ---------------------------------------------------------------
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome_completo text not null check (char_length(nome_completo) between 3 and 120),
  email text not null,
  plano text not null default 'gratuito' check (plano in ('gratuito', 'premium')),
  criado_em timestamptz not null default now()
);

alter table public.usuario enable row level security;

create policy "usuario: lê o próprio registro"
  on public.usuario for select
  using (id = auth.uid());

create policy "usuario: altera o próprio registro"
  on public.usuario for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- O usuário só pode mudar o próprio nome. Plano e e-mail mudam pelo servidor.
revoke update on public.usuario from authenticated, anon;
grant update (nome_completo) on public.usuario to authenticated;

-- Cria a linha em public.usuario quando o Supabase Auth cria o usuário.
create or replace function public.criar_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.usuario (id, nome_completo, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome_completo', ''),
    new.email
  );
  return new;
end;
$$;

create trigger ao_criar_usuario_auth
  after insert on auth.users
  for each row execute function public.criar_usuario();

-- Mantém o e-mail sincronizado se for trocado no Auth.
create or replace function public.sincronizar_email_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.usuario set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger ao_trocar_email_auth
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sincronizar_email_usuario();

-- ---------------------------------------------------------------
-- consentimento: registro de cada aceite (documento, versão, data e hora)
-- ---------------------------------------------------------------
create table public.consentimento (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.usuario (id) on delete cascade,
  documento text not null check (documento in ('termos', 'privacidade', 'maioridade')),
  versao text not null,
  aceito_em timestamptz not null default now()
);

create index consentimento_usuario_idx on public.consentimento (usuario_id);

alter table public.consentimento enable row level security;

-- Só leitura pelo dono. A gravação é feita pelo servidor (service role) no cadastro.
create policy "consentimento: lê os próprios aceites"
  on public.consentimento for select
  using (usuario_id = auth.uid());

-- ---------------------------------------------------------------
-- verificacao_email: limita tentativas do código de 6 dígitos
-- Guarda só o hash do e-mail. Sem políticas: acessível apenas pelo servidor.
-- ---------------------------------------------------------------
create table public.verificacao_email (
  email_hash text primary key,
  tentativas int not null default 0,
  enviado_em timestamptz not null default now()
);

alter table public.verificacao_email enable row level security;
