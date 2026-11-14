// Confere o Mordomo do WhatsApp sem rede: vínculo por código, lançar com confirmação,
// correções, apagar, mensagem repetida, desligar e respostas sem IA.
// Rodar: npm run testar:whatsapp
import {
  financasVazias,
  type FinancasDados,
} from "../src/lib/dominio/financas";
import { lerComando, lerCorrecao } from "../src/lib/servidor/whatsapp/comandos";
import { armazemEmMemoria } from "../src/lib/servidor/whatsapp/armazem/memoria";
import {
  assinar,
  assinaturaValida,
} from "../src/lib/servidor/whatsapp/assinatura";
import {
  processarMensagem,
  type Dependencias,
} from "../src/lib/servidor/whatsapp/mordomo";
import {
  EsquemaLancamento,
  aplicarLancamento,
} from "../src/lib/servidor/lancamentos";
import type { MensagemCanal } from "../src/lib/servidor/whatsapp/tipos";

let falhas = 0;
const ok = (nome: string, cond: boolean, info: unknown = "") => {
  if (!cond) falhas++;
  console.log(
    `${cond ? "ok  " : "ERRO"} ${nome} ${cond ? "" : JSON.stringify(info)}`,
  );
};

ok(
  "código com FINDOMO",
  JSON.stringify(lerComando("FINDOMO 482913")) ===
    '{"tipo":"codigo","codigo":"482913"}',
);
ok("código solto com espaço", lerComando("482 913").tipo === "codigo");
ok("sim com acento e pontuação", lerComando("Sim!").tipo === "sim");
ok("não", lerComando("não").tipo === "nao");
ok("apagar o último", lerComando("apagar o último").tipo === "apagar_ultimo");
ok("frase vira texto", lerComando("gastei 85 no almoço").tipo === "texto");
ok("correção de valor", lerCorrecao("valor 90")?.valor === 90);
ok("correção 1.250,50", lerCorrecao("foi 1.250,50")?.valor === 1250.5);
ok(
  "correção de data e meio",
  JSON.stringify(lerCorrecao("foi ontem no pix")) ===
    '{"data":"ontem","meio":"pix"}',
);

const chave = "k".repeat(40);
const ts = String(Date.now());
const ass = assinar(chave, ts, "{}");
ok(
  "assinatura válida",
  assinaturaValida({ chave, timestamp: ts, assinatura: ass, corpo: "{}" }),
);
ok(
  "assinatura com corpo trocado",
  !assinaturaValida({
    chave,
    timestamp: ts,
    assinatura: ass,
    corpo: '{"a":1}',
  }),
);
ok(
  "assinatura vencida",
  !assinaturaValida({
    chave,
    timestamp: String(Date.now() - 10 * 60 * 1000),
    assinatura: assinar(chave, String(Date.now() - 10 * 60 * 1000), "{}"),
    corpo: "{}",
  }),
);
ok(
  "sem chave não passa",
  !assinaturaValida({
    chave: null,
    timestamp: ts,
    assinatura: ass,
    corpo: "{}",
  }),
);

async function principal() {
  let agora = new Date("2026-11-14T15:00:00-03:00");
  const { armazem } = armazemEmMemoria(() => agora);
  const UID = "usuario-1";
  const banco: Record<string, FinancasDados> = { [UID]: financasVazias() };
  const deps: Dependencias = {
    armazem,
    agora: () => agora,
    financas: {
      carregar: async (uid) => structuredClone(banco[uid] ?? financasVazias()),
      gravar: async (uid, d) => {
        banco[uid] = structuredClone(d);
      },
      aportes: async () => ({}),
      lancar(d, l, hoje) {
        aplicarLancamento(
          d,
          EsquemaLancamento.parse({
            ...l,
            recorrente: false,
            origem: "whatsapp",
          }),
          hoje,
        );
      },
    },
    primeiroNome: async () => "Ana",
    limite: () => true,
    ia: {
      disponivel: false,
      conversar: async () => ({ tipo: "texto", texto: "", bloqueado: false }),
      lerImagem: async () => null,
    },
    transcrever: async () => null,
    cotacao: async (s) =>
      s === "PETR4"
        ? { preco: 38.12, variacaoPct: 1.4, nome: "Petrobras" }
        : null,
    auditarBloqueio: async () => {},
  };

  let seq = 0;
  const msg = (
    texto: string,
    extra: Partial<MensagemCanal> = {},
  ): MensagemCanal => ({
    messageId: `m${++seq}`,
    telefone: "5511999998888",
    jid: "5511999998888@s.whatsapp.net",
    lid: null,
    nome: "Ana WhatsApp",
    texto,
    midia: null,
    ...extra,
  });
  const enviar = async (texto: string, extra: Partial<MensagemCanal> = {}) =>
    (await processarMensagem(msg(texto, extra), deps)).respostas.join(
      "\n---\n",
    );

  let r = await enviar("oi");
  ok("sem vínculo pede para conectar", r.includes("/conta/whatsapp"), r);
  r = await enviar("gastei 50 no mercado");
  ok(
    "sem vínculo nada é lançado",
    banco[UID].lancamentos.length === 0 && r.includes("código"),
    r,
  );

  await armazem.criarCodigo(
    UID,
    "123456",
    new Date(agora.getTime() + 15 * 60 * 1000).toISOString(),
  );
  r = await enviar("999999");
  ok("código errado recusado", r.includes("não vale"), r);
  r = await enviar("FINDOMO 123456");
  ok(
    "código certo liga a conta",
    r.includes("Pronto, Ana") &&
      (await armazem.vinculoPorTelefone("5511999998888"))?.usuarioId === UID,
    r,
  );
  r = await enviar("FINDOMO 123456");
  ok("código não vale duas vezes", r.includes("não vale"), r);

  r = await enviar("gastei 85 no almoço no débito");
  ok(
    "propõe a despesa e pede confirmação",
    r.includes("Despesa R$ 85,00") &&
      r.includes("débito") &&
      r.includes("Confirma"),
    r,
  );
  ok("nada salvo antes do sim", banco[UID].lancamentos.length === 0);
  r = await enviar("valor 90");
  ok("corrige o valor", r.includes("R$ 90,00"), r);
  r = await enviar("foi ontem no pix");
  ok("corrige data e meio", r.includes("Pix") && r.includes("13/11/2026"), r);
  r = await enviar("sim");
  const l = banco[UID].lancamentos[0];
  ok(
    "salva no sim",
    banco[UID].lancamentos.length === 1 &&
      l.valor === 90 &&
      l.meio === "pix" &&
      l.data === "2026-11-13" &&
      l.origem === "whatsapp",
    l,
  );
  ok("responde com o mês", r.includes("Feito"), r);
  r = await enviar("sim");
  ok(
    "sim sem pendência não duplica",
    banco[UID].lancamentos.length === 1 && r.includes("Não tenho nada"),
    r,
  );

  const repetida = msg("recebi 3200 de salário");
  const primeira = await processarMensagem(repetida, deps);
  const segunda = await processarMensagem(repetida, deps);
  ok(
    "mensagem repetida não processa de novo",
    segunda.repetida && segunda.respostas.join() === primeira.respostas.join(),
    segunda,
  );
  r = await enviar("não");
  ok(
    "não descarta",
    r.includes("descartei") && banco[UID].lancamentos.length === 1,
    r,
  );

  r = await enviar("recebi 3.200 de salário");
  ok("propõe receita", r.includes("Receita R$ 3.200,00"), r);
  await enviar("s");
  ok("receita salva", banco[UID].lancamentos.length === 2);

  r = await enviar("resumo");
  ok(
    "resumo do mês",
    r.includes("Entrou: R$ 3.200") && r.includes("Saiu: R$ 90"),
    r,
  );
  r = await enviar("últimos lançamentos");
  ok(
    "últimos lançamentos",
    r.includes("Últimos lançamentos") && r.includes("R$ 3.200,00"),
    r,
  );

  r = await enviar("apagar o último");
  ok("propõe apagar o último", r.includes("Apago a receita de R$ 3.200,00"), r);
  r = await enviar("sim");
  ok("apaga", banco[UID].lancamentos.length === 1 && r.includes("Apaguei"), r);

  r = await enviar("como está a PETR4?");
  ok(
    "cotação sem IA",
    r.includes("PETR4") && r.includes("R$ 38,12") && r.includes("não indico"),
    r,
  );

  r = await enviar("", {
    midia: { tipo: "audio", mimetype: "audio/ogg", base64: "AAAA" },
  });
  ok("áudio sem transcrição pede texto", r.includes("áudios"), r);
  deps.transcrever = async () => "gastei 30 na farmácia";
  r = await enviar("", {
    midia: { tipo: "audio", mimetype: "audio/ogg", base64: "AAAA" },
  });
  ok(
    "áudio transcrito vira proposta",
    r.includes("Ouvi") && r.includes("R$ 30,00"),
    r,
  );
  await enviar("não");

  r = await enviar("", {
    midia: { tipo: "imagem", mimetype: "image/jpeg", base64: "AAAA" },
  });
  ok("foto sem IA pede texto", r.includes("fotos"), r);

  agora = new Date(agora.getTime() + 11 * 60 * 1000);
  await enviar("gastei 12 de café");
  agora = new Date(agora.getTime() + 11 * 60 * 1000);
  r = await enviar("sim");
  ok(
    "proposta vence em 10 min",
    r.includes("Não tenho nada") && banco[UID].lancamentos.length === 1,
    r,
  );

  const pelaLid = await processarMensagem(
    msg("resumo", {
      telefone: "123456789012345",
      jid: "123456789012345@lid",
      lid: "123456789012345@lid",
    }),
    deps,
  );
  ok(
    "número desconhecido pela LID não vê dados",
    pelaLid.respostas.join().includes("código"),
    pelaLid,
  );

  r = await enviar("SAIR");
  ok("sair pede confirmação", r.includes("desligar"), r);
  r = await enviar("sim");
  ok(
    "sair desliga",
    r.includes("desliguei") &&
      !(await armazem.vinculoPorTelefone("5511999998888")),
    r,
  );
  r = await enviar("resumo");
  ok("depois de sair não vê dados", r.includes("código"), r);

  console.log(falhas ? `\n${falhas} falha(s)` : "\nWhatsApp OK");
  process.exit(falhas ? 1 : 0);
}

principal();
