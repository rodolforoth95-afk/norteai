# Findomo no WhatsApp

O cliente conversa com o Mordomo pelo WhatsApp: lança receitas e despesas (texto, foto, PDF ou áudio), consulta o mês, o plano, a carteira, cotações e indicadores, e aprende conceitos com link para as aulas. Tudo grava na mesma conta do site.

A estrutura segue o guia do FARO: um serviço separado (Node + Baileys) só para o WhatsApp, que conversa com o sistema principal por uma chave interna. A proposta completa, com o que mudou em relação ao guia, está em `arquitetura-findomo-whatsapp.html`.

## Como as peças se ligam

```
Cliente no WhatsApp
   ⇅
whatsapp-service/   (Node 20 + Baileys 6.7.24, Docker, sempre ligado)
   │  POST /api/whatsapp/webhook   mensagem → respostas   (assinatura HMAC)
   │  POST /api/whatsapp/canal     estado e QR → comando  (a cada 30 s)
   ▼
Findomo na Vercel
   src/app/api/whatsapp/...         portas de entrada
   src/lib/servidor/whatsapp/       Mordomo, ferramentas, armazenamento
   supabase: whatsapp_*             vínculos, mensagens, pendências, canal
```

- O canal **só faz chamadas de saída**. Nenhuma porta precisa ficar aberta na internet, e não existe endpoint para alguém disparar mensagens de fora.
- Cada mensagem recebida entra numa **fila em disco** (`dados/fila.json`). Se o Findomo estiver fora, o canal tenta de novo em 2 s, 5 s, 15 s, 30 s e 60 s. Depois disso, avisa o cliente.
- Cada conversa é atendida em ordem; conversas diferentes andam em paralelo.
- O Findomo **nunca processa a mesma mensagem duas vezes**, porque o `message_id` é único.
- Lançar e apagar **sempre pedem "sim"**. A proposta vale 10 minutos.
- Sem a chave da IA, o Mordomo continua funcionando com as regras locais: lança por texto e responde resumo, últimos lançamentos, cotação e perguntas comuns. Foto pede IA; áudio pede `OPENAI_API_KEY`.

## Para colocar no ar

### 1. Banco (Supabase)

Rode `supabase/migrations/0007_whatsapp.sql` no SQL Editor.

### 2. Variáveis na Vercel

| Variável | O que é |
|---|---|
| `WHATSAPP_CHAVE_INTERNA` | Chave compartilhada com o canal. Gere com `openssl rand -hex 32`. Precisa ter 32 caracteres ou mais. |
| `WHATSAPP_NUMERO` | Número do Findomo com DDI, só dígitos (ex.: `5511999998888`), para o botão "Abrir o WhatsApp". |
| `WHATSAPP_OPERADORES` | E-mails de quem pode ver o QR e desconectar o número, separados por vírgula. |
| `ANTHROPIC_API_KEY` | Já pendente. Liga a IA: frases livres, fotos, carteira e indicadores por conversa. |
| `OPENAI_API_KEY` | Opcional: transcrição de áudio (`gpt-4o-mini-transcribe`, centavos por minuto). |
| `NEXT_PUBLIC_SITE_URL` | Opcional: endereço usado nos links das respostas (padrão: o endereço atual da Vercel). |

### 3. Servidor do canal

Precisa de um servidor sempre ligado, porque a Vercel não segura a conexão do WhatsApp. Escolha uma opção.

**VPS com Docker**, como no guia:

```bash
cd whatsapp-service
cp .env.example .env        # preencha FINDOMO_URL e WHATSAPP_CHAVE_INTERNA
docker compose up -d --build
docker logs -f findomo_whatsapp
```

**Railway** (escolhido):
1. **New Project › Deploy from GitHub repo**, escolha o repositório do Findomo.
2. No serviço, em **Settings**:
   - **Root Directory**: `whatsapp-service`. O Railway acha o Dockerfile sozinho.
   - **Watch Paths**: `/whatsapp-service/**`. Assim, mudanças no site não reiniciam o canal.
   - **Restart Policy**: Always.
   - **Replicas**: 1. Nunca mais de uma, porque o número só aceita uma conexão.
   - **Domínio público**: não precisa.
3. Em **Variables**, cadastre:
   - `FINDOMO_URL`: o endereço do site;
   - `WHATSAPP_CHAVE_INTERNA`: a mesma da Vercel;
   - `RAILWAY_RUN_UID=0`: o volume do Railway pertence ao root, e sem ela o canal avisa nos logs que não consegue gravar.
4. Clique com o botão direito no serviço, escolha **Attach Volume** e informe o mount path **`/app/dados`**. Sem volume, o número desconecta a cada deploy.

**Render / Fly.io:** mesmo esquema, com a pasta `whatsapp-service`, as variáveis do `.env.example` e um volume persistente em `/app/dados`.

### 4. Parear o número

1. Entre no Findomo com um e-mail que esteja em `WHATSAPP_OPERADORES` e abra **Conta › WhatsApp**.
2. A área "Canal do Findomo (operação)" mostra o QR. Ele também aparece nos logs do serviço.
3. No celular do número do Findomo, abra **WhatsApp › Aparelhos conectados › Conectar um aparelho** e leia o QR.

A sessão fica em `dados/auth`. Não apague essa pasta, a não ser que queira parear de novo.

### 5. Teste

1. Em Conta › WhatsApp, marque a autorização e toque em **Conectar WhatsApp**.
2. Mande o código para o número do Findomo.
3. Mande "gastei 20 no café" e responda "sim".

## Desenvolvimento local

- `npm run testar:whatsapp` testa o Mordomo sem rede: vínculo, confirmação, correções, apagar, mensagem repetida e sair.
- `cd whatsapp-service && npm run testar` testa o canal: leitura das mensagens, mapa LID, assinatura e fila.
- `npm run simular:whatsapp -- "gastei 85 no almoço"` faz o papel do WhatsApp contra o `npm run dev`. Precisa de `WHATSAPP_CHAVE_INTERNA` no `.env.local`. No modo de teste, tudo fica em `.dados/whatsapp.json` e as finanças vão para a conta admin.
- Para ver o canal real localmente, sem parear:
  ```bash
  FINDOMO_URL=http://localhost:3000 WHATSAPP_CHAVE_INTERNA=... PORTA_SAUDE=3100 node src/index.js
  ```

## Riscos e limites conhecidos

- **Baileys não é oficial.** A Meta pode banir o número. Para reduzir o risco:
  - o Findomo só responde quem escreve;
  - envia uma mensagem por vez, com intervalo de pelo menos 1,2 s;
  - não dispara mensagens em massa.

  A troca para a API oficial muda só o canal; o Mordomo e o banco ficam iguais.
- **Um número por serviço.** Para mais números, sobe-se outro serviço com outra pasta `dados`. Isso exige separar o estado do canal por número, porque hoje a tabela `whatsapp_canal` tem uma linha só.
- **Ainda não feito (fase 3):** avisos que o Findomo inicia (limite estourado, resumo semanal, lembrete de aporte) e painel de métricas. O vínculo já guarda `avisos` e o horário de silêncio para isso.
- **Limite de mensagens.** O teto por número (40 a cada 10 min) é guardado em memória por instância da Vercel. Com volume alto, deve ir para um armazenamento compartilhado.
- **Retenção.** As mensagens são apagadas depois de 90 dias pela função `limpar_whatsapp()`, chamada de tempos em tempos pelo webhook. Para garantir, agende essa função no Supabase (pg_cron) uma vez por dia.
