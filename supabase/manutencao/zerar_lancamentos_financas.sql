-- Zera as receitas e despesas (lançamentos) de TODOS os usuários em Finanças.
-- Mantém categorias, regras aprendidas e planos. Não mexe em carteira, coins nem conta simulada.
-- Rode no Supabase: SQL Editor. NÃO TEM DESFAZER, por isso o passo 1 guarda uma cópia.

-- 1) Cópia de segurança (rode uma vez antes de zerar)
create table if not exists public.financas_backup_zerar as
select *, now() as copiado_em from public.financas;

-- 2) Conferir quantos lançamentos serão apagados
select count(*) as usuarios,
       coalesce(sum(jsonb_array_length(coalesce(dados->'lancamentos', '[]'::jsonb))), 0) as lancamentos
from public.financas;

-- 3) Zerar
update public.financas
set dados = jsonb_set(dados, '{lancamentos}', '[]'::jsonb, true);

-- 4) Conferir (deve dar 0)
select coalesce(sum(jsonb_array_length(coalesce(dados->'lancamentos', '[]'::jsonb))), 0) as lancamentos_restantes
from public.financas;

-- Para desfazer, se precisar:
-- update public.financas f set dados = b.dados from public.financas_backup_zerar b where b.usuario_id = f.usuario_id;
-- Depois que estiver tudo certo, a cópia pode ser apagada:
-- drop table public.financas_backup_zerar;
