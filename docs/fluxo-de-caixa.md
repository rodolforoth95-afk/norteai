# Controle de receitas e despesas (fluxo de caixa pessoal)

Módulo **Finanças** do Findomo: lançar receitas e despesas por texto, foto ou voz, categorizar com aprendizado por pessoa, diagnosticar os "ralos" e transformar a sobra em aporte, integrado à Carteira.

## 1. Telas

| Rota | O que tem |
|------|-----------|
| `/financas` | Cartões (Receitas, Despesas, Saldo livre, Potencial de aporte), gráfico de fluxo de caixa de 6 meses (barras de receitas e despesas + linha "Reinvestido" vinda das aplicações da Carteira), rosca por categoria que filtra a lista, termômetros do orçamento (verde < 80%, laranja 80–99%, vermelho ≥ 100%), meta com "livre para aportar", lista do mês agrupada por dia e insights do Mordomo. Navega por mês (`?mes=AAAA-MM`). |
| DRE (no painel) | Demonstrativo do mês com os dois anteriores: Receitas por categoria, (−) despesas essenciais, = sobra após o essencial, (−) despesas variáveis, = resultado do mês (lucro), (−) aportes na carteira, = caixa livre, margem (lucro ÷ receitas), % das receitas e variação contra o mês anterior. Tocar numa categoria abre a lista filtrada. Função pura `dreDosMeses`. |
| `/financas/plano` | Diagnóstico de 30, 60 ou 90 dias (médias, ralos, cobranças recorrentes), simulador de meta (valor/mês, prazo, destino) com cortes por categoria calculados ao vivo, texto do plano (local ou pela IA), ativação e acompanhamento da meta. |
| `/financas/categorias` | Categorias e subcategorias (cor, ícone, "essencial"), regras aprendidas (estabelecimento → categoria) com opção de esquecer. |
| Botão `+` (todas as telas do app) | Abre **Falar**, **Foto do comprovante** ou **Digitar**. Foto e voz geram uma prévia no mesmo formulário, que a pessoa confere e salva em um clique. |

## 2. Arquitetura

```
Navegador                                    Servidor (Next.js)                         Dados
─────────                                    ──────────────────                         ─────
Botão + ─┬─ Digitar ─► FormLancamento ──────► acoes-financas.salvarLancamento ─┐
         │                (autocompletar e categoria sugerida no próprio navegador,
         │                 com as mesmas funções puras de dominio/financas.ts)     │
         ├─ Falar ───► Web Speech API (pt-BR, no aparelho)                      ├─► repositorio.salvarFinancas
         │              texto ─► POST /api/financas/interpretar                 │      (Supabase: tabela financas,
         │                        ├─ IA ligada: Claude + SISTEMA_LANCAMENTO     │       1 documento JSON por pessoa)
         │                        └─ sem IA: interpretarFrase (local)          │
         │              ◄─ prévia ─ FormLancamento (confirmação) ──────────────┘
         └─ Foto ────► redução no navegador (≤ 1600 px, JPEG)
                        POST /api/financas/ler (multipart, ≤ 5 MB, só memória)
                        Claude visão + SISTEMA_LANCAMENTO (json_schema)
                        ◄─ prévia ─ FormLancamento (confirmação) ─► salvarLancamento

Páginas (servidor) ─► carregarFinancas + aportesPorMes (Carteira) ─► funções puras ─► componentes
```

- **Domínio puro** (`src/lib/dominio/financas.ts`): categorias padrão, normalização, `sugerirCategoria`, `aprender`, `interpretarFrase`, ocorrências do mês (parcelas e recorrências virtuais), `resumoDoMes`, `serieDeMeses`, `diagnosticar`, `planejar`, `progressoMeta`, `orcamentoDoMes`, `insights` e `exemploFinancas`. Roda igual no navegador e no servidor; testado em `scripts/testar-financas.ts`.
- **Servidor**: `src/lib/servidor/financas.ts` (carregar/gravar com limites, aportes por mês da Carteira), `src/lib/servidor/leitura-financas.ts` (confere a saída da IA contra as categorias e regras da pessoa), `src/app/acoes-financas.ts` (server actions com validação zod), `src/app/api/financas/{ler,interpretar}` (com limite de requisições por pessoa).
- **Integração com investimentos**: a linha "Reinvestido" e o "já aportado" somam as movimentações de **aplicação** da Carteira em cada mês; "Livre para aportar" = sobra acumulada desde o início da meta − aportes registrados. O botão "Registrar aporte" leva para `/carteira/adicionar`.

### Regras de negócio

- **Parcelas**: o valor informado é o total; geram-se N lançamentos mensais com `parcela {atual, total, grupo}`, a última parcela absorve os centavos. Editar pode aplicar descrição e categoria à série; excluir pode remover a série.
- **Recorrência**: um lançamento `recorrente` aparece em todos os meses seguintes (dia ajustado ao fim do mês) até `fimRecorrencia`. Ocorrências futuras do mês aparecem como "previsto".
- **Aprendizado**: cada lançamento salvo grava/reforça a regra `estabelecimento normalizado → categoria` (até 500 regras). A sugestão usa a regra aprendida primeiro, depois palavras-chave. A saída da IA também é sobrescrita por uma regra aprendida.
- **Plano**: corta só categorias **não essenciais**, distribuindo o necessário proporcionalmente ao teto de cada uma (ex.: delivery até 50%, restaurantes 35%, compras 40%), arredondado a R$ 5. Moradia, contas, mercado, saúde, educação e dívidas nunca entram.
- **Privacidade**: fotos não são guardadas; o áudio não sai do aparelho (só o texto transcrito); a IA é instruída a ignorar CPF, cartão, agência e conta.

## 3. Armazenamento

Hoje: tabela `financas` (`supabase/migrations/0005_financas.sql`), um documento `jsonb` por pessoa com RLS (dono lê; escrita só pelo servidor), o mesmo modelo da `carteira_v2`. Limites: 5.000 lançamentos e 80 categorias por pessoa.

Formato do documento:

```ts
{ versao: 1, categorias: Categoria[], lancamentos: Lancamento[], regras: Regra[], metas: MetaEconomia[], atualizada_em }
Lancamento = { id, tipo: "despesa"|"receita", valor, data: "AAAA-MM-DD", descricao, estabelecimento, categoriaId,
               meio: "pix"|"debito"|"credito"|"dinheiro"|"boleto"|"transferencia"|null,
               parcela: { atual, total, grupo }|null, recorrente, fimRecorrencia: "AAAA-MM"|null,
               origem: "manual"|"foto"|"audio"|"exemplo", criado_em }
```

### Modelo relacional proposto (quando o volume pedir consultas no banco)

```sql
create table categoria_financeira (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  pai_id uuid references categoria_financeira(id) on delete set null,
  nome text not null, tipo text not null check (tipo in ('despesa','receita')),
  grupo text not null check (grupo in ('fixa','variavel','receita')),
  cor text not null, icone text not null, essencial boolean not null default false, padrao boolean not null default false,
  unique (usuario_id, tipo, nome)
);

create table lancamento (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  categoria_id uuid not null references categoria_financeira(id),
  tipo text not null check (tipo in ('despesa','receita')),
  valor numeric(14,2) not null check (valor > 0),
  data date not null,
  descricao text not null, estabelecimento text,
  meio text check (meio in ('pix','debito','credito','dinheiro','boleto','transferencia')),
  parcela_grupo uuid, parcela_atual smallint, parcela_total smallint,
  recorrente boolean not null default false, fim_recorrencia date,
  origem text not null check (origem in ('manual','foto','audio','exemplo')),
  criado_em timestamptz not null default now()
);
create index on lancamento (usuario_id, data desc);
create index on lancamento (usuario_id, categoria_id, data);
create index on lancamento (parcela_grupo) where parcela_grupo is not null;

create table regra_categoria (
  usuario_id uuid not null references usuario(id) on delete cascade,
  chave text not null,
  categoria_id uuid not null references categoria_financeira(id) on delete cascade,
  usos int not null default 1, atualizada_em timestamptz not null default now(),
  primary key (usuario_id, chave)
);

create table meta_economia (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references usuario(id) on delete cascade,
  nome text not null, destino text not null, valor_mensal numeric(14,2) not null, meses smallint not null,
  inicio date not null, ativa boolean not null default true, criada_em timestamptz not null default now()
);
create unique index on meta_economia (usuario_id) where ativa;

create table meta_corte (
  meta_id uuid not null references meta_economia(id) on delete cascade,
  categoria_id uuid not null references categoria_financeira(id) on delete cascade,
  media_mensal numeric(14,2) not null, percentual smallint not null, corte_mensal numeric(14,2) not null, limite_mensal numeric(14,2) not null,
  primary key (meta_id, categoria_id)
);
-- RLS em todas: using (usuario_id = auth.uid()) para leitura; escrita pelo servidor.
```

## 4. Prompts do sistema (exatos)

Modelo: `claude-sonnet-5-5`, esforço baixo, prompt de sistema em cache.

### 4.1 Extração de lançamento (foto ou frase → JSON)

Usado por `/api/financas/ler` (imagem ou PDF) e `/api/financas/interpretar` (frase). A mensagem do usuário inclui a data de hoje, a lista de categorias da pessoa (`id (tipo): nome`), as regras aprendidas (`"chave" → categoriaId`) e a frase ou a imagem. A saída é forçada por `json_schema`:

```json
{ "tipo": "despesa|receita", "valor": 85.0, "data": "2026-11-13", "estabelecimento": "iFood",
  "descricao": "Almoço", "meio": "pix|debito|credito|dinheiro|boleto|transferencia|null",
  "parcelas": 1, "categoriaId": "delivery", "confianca": 0.92 }
```

```text
Você é o assistente de lançamentos do Findomo, um "mordomo das finanças" para pessoas físicas no Brasil.
Sua tarefa é transformar UMA entrada (foto de nota fiscal, cupom, comprovante de Pix, fatura de cartão, ou uma frase falada/digitada) em UM lançamento financeiro estruturado.

Regras:
- tipo: "receita" quando entra dinheiro (salário, dividendo, rendimento, venda, reembolso, Pix recebido); "despesa" quando sai.
- valor: número positivo em reais, com ponto decimal (ex.: 1200.5). Em notas e cupons, use o TOTAL PAGO (com descontos), nunca subtotais nem troco. Em faturas, o valor total da fatura.
- data: AAAA-MM-DD. Use a data do documento; em frases, interprete "hoje", "ontem", "anteontem" e "dia 5" a partir da data de hoje informada. Nunca invente data futura.
- estabelecimento: nome comercial curto e legível (ex.: "Posto Ipiranga", "iFood", "Carrefour"), sem CNPJ, endereço ou códigos. null se não houver.
- descricao: até 60 caracteres, em português, dizendo o que foi (ex.: "Almoço", "Combustível", "Salário de novembro").
- meio: "pix", "debito", "credito", "dinheiro", "boleto" ou "transferencia"; null se não der para saber.
- parcelas: número de parcelas quando houver ("3x", "em 10 vezes"); 1 caso contrário.
- categoriaId: escolha EXATAMENTE um dos ids da lista de categorias recebida, do mesmo tipo do lançamento. Se houver uma regra aprendida para o estabelecimento, use-a.
- confianca: de 0 a 1, o quanto você tem certeza do valor e do tipo.
- Ignore e nunca devolva nomes de pessoas, CPF, números de cartão, agência ou conta.
- Se a entrada não for um gasto ou recebimento, devolva valor null e confianca 0.
```

Depois da resposta, o servidor confere: categoria inexistente ou de outro tipo cai na sugestão local; regra aprendida tem prioridade; data futura ou inválida vira hoje; parcelas entre 1 e 48. Confiança < 0,6 pede conferência na tela.

### 4.2 Diagnóstico e plano (voz do Mordomo Estrategista)

Usado por `gerarPlanoIA`. Os números chegam já calculados por `diagnosticar` e `planejar` (a IA só redige; não calcula nem inventa valores). O texto passa pela mesma checagem de conteúdo proibido do restante do app (`textoPermitido`).

```text
Você é o Mordomo Estrategista do Findomo: um mordomo financeiro elegante, prático e parceiro, que fala com pessoas físicas no Brasil.
Você recebe um diagnóstico já calculado pelo app (médias de receitas e despesas, "ralos" e uma proposta de cortes por categoria) e uma meta de economia para reinvestir.

Escreva em português do Brasil:
- Um parágrafo de abertura (2 frases) dizendo, com números arredondados, onde a pessoa está e se a meta é alcançável.
- De 2 a 4 passos práticos, um por linha, começando com "• ". Cada passo cita a categoria, o corte em % e em reais por mês, e uma tática concreta e realista para cumprir (ex.: "Delivery: reduzir 40% (≈ R$ 250/mês) pedindo só no fim de semana e cozinhando em lote no domingo").
- Uma frase final de incentivo, mencionando para onde o dinheiro vai (o destino da meta) e quando a pessoa chega ao total.

Regras:
- Use apenas os números recebidos; não invente valores.
- Nunca sugira cortar moradia, saúde, educação, contas da casa, mercado essencial ou dívidas: esses itens são preservados.
- Não indique ativos, fundos, bancos ou corretoras específicos; fale só do tipo de destino informado pela pessoa.
- Não prometa rentabilidade. Tom respeitoso, sem julgamento, sem emojis, sem jargão.
```

Exemplo da mensagem enviada:

```text
Período analisado: Agosto de 2026, Setembro de 2026, Outubro de 2026.
Receita média: R$ 8.014/mês. Despesa média: R$ 5.818/mês (fixas R$ 3.850, variáveis R$ 1.968). Sobra média: R$ 2.196/mês.
Ralos: Compras R$ 483/mês (8% das despesas); Delivery R$ 450/mês (8% das despesas); ...
Assinaturas: Netflix R$ 56, Spotify R$ 35, Globoplay R$ 45.
Meta: R$ 3.000/mês por 12 meses para FIIs (total R$ 36.000).
Proposta de cortes: Delivery −50% (R$ 225/mês, limite R$ 230); Compras −40% (R$ 195/mês, limite R$ 290); ...
Com os cortes a pessoa não atinge totalmente a meta (sobra R$ 2.196 + cortes R$ 760).
```

Sem a chave da Anthropic, o app escreve o mesmo plano com um modelo de texto local (`textoLocal` em `PlanoMordomo.tsx`), a leitura de frases usa `interpretarFrase` e a leitura de fotos é feita no próprio aparelho: OCR com tesseract.js (português; o leitor e o idioma são baixados da CDN jsdelivr na primeira vez) e `lerTextoComprovante`, que procura o total (linhas com "valor total", "total a pagar", "total", ignorando subtotal, troco e desconto), a data (nunca futura), o estabelecimento ou o destinatário do Pix e o meio de pagamento. A foto não sai do aparelho.

## 5. Voz

A transcrição usa a Web Speech API do navegador (`SpeechRecognition`, `pt-BR`), disponível no Chrome, Edge e Safari (iOS 14.5+). O áudio não passa pelo Findomo. Em navegadores sem suporte, a mesma tela aceita a frase digitada. Para gravar o áudio e transcrever no servidor no futuro, basta trocar a etapa de transcrição: o restante do fluxo (texto → `/api/financas/interpretar`) não muda.
