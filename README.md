# Norte.ia

Guia educacional de investimentos com IA (PWA). Next.js + Supabase + Claude.

## Status

- [x] Login, cadastro, verificação de e-mail por código, recuperação de senha, tela Conta
- [x] Visual v2: tema escuro, gradientes (indigo, violeta, ciano)
- [x] Entrevista em chat (9 perguntas, respostas livres interpretadas, retomada do ponto exato)
- [x] Algoritmo de estilo: Cauteloso (risco baixo), Equilibrado (médio), Ousado (alto), com travas
- [x] Dashboard do perfil com os tipos de investimento de cada estilo e faixas de referência
- [x] 8 vídeos verticais de ~55 s (5 livres, 3 desbloqueados com coins), com narração por voz
- [x] Conteúdos educativos por classe
- [x] Importação de carteira: PDF (extrato/nota), planilha da B3 (XLSX/CSV) ou digitando
- [x] Dashboard da carteira: composição, aderência, pontos de atenção, mapa e evolução mês a mês
- [x] Coins e níveis (entrevista, vídeos, leituras, primeira carteira, mês positivo)
- [x] Conversa com IA (Claude) na entrevista, com checagem regulatória — liga ao preencher ANTHROPIC_API_KEY
- [x] Aba Mercado com dados da brapi.dev: Ibovespa, altas e baixas do dia, altas da semana, mais negociadas, FIIs, ETFs, Tesouro e futuros
- [x] Página de cada ativo: cotação, gráfico (5 dias, 1 mês, 3 meses), números do dia, faixa de 52 semanas, perfil da empresa
- [x] Carteira atualizada pelas cotações do mercado
- [x] Visual v3: preto com detalhes em laranja amarelado; fontes Barlow (títulos) e IBM Plex Sans (texto)
- [x] Início com saldo da carteira, jornada (aulas, quizzes, vídeos), próximo passo e módulos; estilo de investidor em Meu perfil (/perfil)
- [x] 6 trilhas com 30 aulas, ilustrações e quiz por módulo (+30 coins)
- [x] Gráficos interativos e botão de atualizar cotações
- [x] Versão para computador (menu lateral, telas largas) e para celular
- [x] Modo claro e modo escuro (botão no menu; a escolha fica salva)
- [x] Login de demonstração admin/admin na versão publicada (variável ADMIN_ATIVO=1)
- [x] Telas de carregamento, erro e página não encontrada; cabeçalhos de segurança; imagem para compartilhar o link
- [x] Simulador de carteiras (/simulador): 3 carteiras de exemplo por estilo, projeção com faixa de cenários, IR, inflação, teste de crise e últimos 3 meses reais; indicadores do Banco Central, brapi e CoinGecko; explicação pela IA (ou pelo app, sem chave). Conferência: `npm run testar:simulador`
- [x] Carteira v2: extrato por investimento (aplicação, resgate, atualização de saldo), datas só até hoje, importação com conferência (PDF, planilha, imagem pela IA, digitação), cadastro em 3 passos, edição e exclusão; painel com linha histórica, comparativo com CDI, poupança e IPCA (Banco Central), rendimento separado dos aportes e rentabilidade mês a mês. Conferência: `npm run testar:carteira`
- [x] Mercado v2: mapa de calor do dia; página do ativo com candles, médias móveis, volume, suportes e resistências (topos e fundos + pivôs mensais) selecionáveis no gráfico e em tabela, leituras educativas e desempenho mês a mês; comparador de até 5 ativos (base 100, mês a mês, risco). Histórico: 3 meses no plano gratuito da brapi (`BRAPI_PERIODO_ANALISE=1y` com plano pago)
- [ ] Revisão de segurança e critérios de aceite

## Configurar o Supabase (uma vez)

1. Crie um projeto em [supabase.com](https://supabase.com), na região **South America (São Paulo)**.
2. Em **SQL Editor**, rode, nesta ordem: `0001_usuario_consentimento.sql`, `0002_entrevista_carteira_moedas.sql`, `0003_auditoria_ia.sql` e `0004_carteira_movimentacoes.sql` (pasta `supabase/migrations`).
3. Em **Authentication > Sign In / Providers > Email**:
   - deixe **Confirm email** ligado;
   - **Email OTP Expiration:** `600` segundos (10 minutos);
   - **Email OTP Length:** `6`;
   - **Minimum password length:** `8`.
4. Em **Authentication > Emails > Templates > Confirm signup**, troque o corpo para usar o código em vez do link:
   ```html
   <h2>Confirme seu e-mail</h2>
   <p>Seu código do Norte.ia é:</p>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>Ele vale por 10 minutos. Se você não criou uma conta, ignore este e-mail.</p>
   ```
5. Em **Authentication > URL Configuration**, adicione `http://localhost:3000/auth/callback` (e depois o endereço de produção) em **Redirect URLs**, para o link de redefinição de senha.
6. Para produção, configure um **SMTP próprio** (Authentication > Emails > SMTP). O e-mail padrão do Supabase tem limite baixo de envios por hora.

## Modo de teste (sem Supabase)

Com `MODO_TESTE=1` no `.env.local`, dá para entrar com o usuário `admin` e a senha `admin`, sem e-mail real. Funciona só com `npm run dev`; em produção (`npm run build`) fica sempre desligado. Os dados do modo de teste ficam em `.dados/teste.json` (apague a pasta para recomeçar). Na aba Carteira há um botão para carregar uma carteira de exemplo com 4 meses de histórico. Cadastro, verificação, troca de senha e exclusão de conta continuam exigindo o Supabase.

## IA (Claude)

1. Crie uma chave em [console.anthropic.com](https://console.anthropic.com) (Settings > API Keys) e cadastre um meio de pagamento.
2. Cole em `ANTHROPIC_API_KEY=` no `.env.local` e reinicie o `npm run dev`.
3. Sem chave, a entrevista continua funcionando com a interpretação local das respostas livres.

Como funciona: as perguntas e os botões continuam vindo do app; quando a pessoa escreve com as próprias palavras, o `claude-sonnet-5-5` interpreta, registra a resposta (ferramenta `registrar_resposta`) e responde em até 3 frases. Antes de aparecer na tela, a resposta passa pela checagem regulatória do `claude-haiku-5-5`; se indicar ativo ou prometer retorno, é trocada pela resposta padrão e o caso vai para `auditoria_ia` (sem texto da conversa). A IA nunca recebe nome, e-mail nem dados sensíveis (CPF e afins são barrados antes do envio). Limite: 60 mensagens por pessoa por dia.

Teste de aceite (20 pedidos de indicação de ativo): `npm run testar:ia`.

## Cotações (brapi.dev)

Token em `BRAPI_TOKEN` no `.env.local` (só servidor). O código está em `src/lib/servidor/brapi.ts`.

Plano gratuito (verificado em 30/10/2026): 1 ativo por requisição, uma requisição por vez, histórico diário de até 3 meses, atraso de até 30 min e 15 mil requisições por mês. O app usa cache (cotações 15 min, histórico 1 h, altas da semana 6 h) para caber na cota. Dividendos, cripto, câmbio, Selic/IPCA, Tesouro completo e futuros completos exigem plano pago; ao assinar o Startup, defina `BRAPI_ATIVOS_POR_REQUISICAO=10` para buscar vários ativos de uma vez.

## Login de demonstração na web

Para testes com colegas, cadastre `ADMIN_ATIVO=1` nas variáveis de ambiente da Vercel e publique de novo. Aí dá para entrar com usuário `admin` e senha `admin` (troque a senha com `ADMIN_SENHA`). Todos que usarem esse login compartilham a mesma conta. Desligue (`ADMIN_ATIVO=0`) antes de abrir para clientes reais.

## Rodar localmente

```bash
cp .env.example .env.local   # e preencha as chaves (Project Settings > API)
npm install
npm run dev
```

Abra http://localhost:3000.

## Regras do projeto

- Toda chave secreta (`SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`) fica só no servidor.
- RLS ligado em todas as tabelas.
- Nenhum dado além de nome, e-mail, senha, maioridade e aceites.
- Todo número exibido vem do código, nunca da IA.
