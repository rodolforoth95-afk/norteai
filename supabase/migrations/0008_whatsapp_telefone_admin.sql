-- WhatsApp: o telefone informado no site liga a conta (confirmado na primeira conversa)
-- e o admin liga ou pausa o atendimento. Rode no SQL Editor do Supabase depois da 0007.

alter table public.whatsapp_vinculo add column if not exists confirmado_em timestamptz;
update public.whatsapp_vinculo set confirmado_em = vinculado_em where confirmado_em is null;

alter table public.whatsapp_canal add column if not exists atendimento boolean not null default true;
alter table public.whatsapp_canal add column if not exists mensagem_pausa text check (char_length(mensagem_pausa) <= 500);
