"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { Botao } from "@/components/Botao";
import { hojeBR, type Movimentacao, type TipoMovimentacao } from "@/lib/dominio/carteira";
import { editarMovimentacao, salvarMovimentacao } from "@/app/acoes-carteira";
import { AvisoErro, CampoData, CampoDinheiro, ESTILO_CAMPO, brl, lerDinheiro, paraTextoDinheiro, useAcao } from "./comum";

const OPCOES: { tipo: TipoMovimentacao; rotulo: string; ajuda: string; Icone: typeof RefreshCw }[] = [
  { tipo: "saldo", rotulo: "Atualizar saldo", ajuda: "Informe quanto o investimento vale na data, como aparece no extrato.", Icone: RefreshCw },
  { tipo: "aplicacao", rotulo: "Aplicação", ajuda: "Dinheiro novo que você colocou. Não conta como rendimento.", Icone: ArrowUpCircle },
  { tipo: "resgate", rotulo: "Resgate", ajuda: "Dinheiro que você tirou. Não conta como perda.", Icone: ArrowDownCircle },
];

export function FormMovimentacao({
  investimento,
  tipoInicial = "saldo",
  editando,
  onFeito,
}: {
  investimento: { id: string; nome: string; quantidade: number | null; saldo: number };
  tipoInicial?: TipoMovimentacao;
  editando?: Movimentacao;
  onFeito: (ganhos: string[]) => void;
}) {
  const [tipo, setTipo] = useState<TipoMovimentacao>(editando?.tipo ?? tipoInicial);
  const [data, setData] = useState(editando?.data ?? hojeBR());
  const [valor, setValor] = useState(editando ? paraTextoDinheiro(editando.valor) : "");
  const [quantidade, setQuantidade] = useState(
    editando?.quantidade != null ? String(editando.quantidade).replace(".", ",") : investimento.quantidade != null ? String(investimento.quantidade).replace(".", ",") : "",
  );
  const { executar, pendente, erro, setErro } = useAcao();
  const opcao = OPCOES.find((o) => o.tipo === tipo)!;
  const numero = lerDinheiro(valor);
  const diferenca = tipo === "saldo" && numero !== null && !editando ? numero - investimento.saldo : null;

  function salvar() {
    if (numero === null || (tipo !== "saldo" && numero <= 0)) return setErro("Informe um valor válido.");
    if (data > hojeBR()) return setErro("A data não pode ser depois de hoje.");
    const qtd = quantidade.trim() ? lerDinheiro(quantidade) : null;
    const dados = { investimentoId: investimento.id, tipo, data, valor: numero, quantidade: qtd };
    executar(
      () => (editando ? editarMovimentacao({ ...dados, movimentacaoId: editando.id }) : salvarMovimentacao(dados)),
      (r) => onFeito(r.ganhos ?? []),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Tipo de movimentação">
        {OPCOES.map((o) => (
          <button
            key={o.tipo}
            type="button"
            role="radio"
            aria-checked={tipo === o.tipo}
            onClick={() => setTipo(o.tipo)}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-1 text-xs font-semibold transition ${
              tipo === o.tipo ? "border-ciano bg-ciano/15 text-texto" : "border-linha text-suave hover:border-violeta"
            }`}
          >
            <o.Icone className="h-5 w-5" aria-hidden="true" />
            {o.rotulo}
          </button>
        ))}
      </div>
      <p className="text-sm text-suave">{opcao.ajuda}</p>

      <CampoData rotulo="Data" valor={data} onChange={setData} />
      <CampoDinheiro
        rotulo={tipo === "saldo" ? "Saldo na data" : tipo === "aplicacao" ? "Valor aplicado" : "Valor resgatado"}
        valor={valor}
        onChange={setValor}
        obrigatorio
        autoFocus
        ajuda={
          tipo === "saldo" && !editando
            ? `Saldo registrado hoje: ${brl(investimento.saldo)}`
            : tipo === "resgate" && !editando
              ? `Saldo disponível: ${brl(investimento.saldo)}`
              : undefined
        }
      />
      {diferenca !== null && Math.abs(diferenca) >= 0.01 ? (
        <p className={`rounded-xl px-3 py-2 text-sm ${diferenca >= 0 ? "bg-menta/10 text-menta" : "bg-erro/10 text-erro"}`}>
          {diferenca >= 0 ? "Rendimento" : "Queda"} de {brl(Math.abs(diferenca))} desde o último registro.
          <span className="block text-xs text-suave">Se parte disso foi dinheiro novo, registre também uma aplicação para não contar como rendimento.</span>
        </p>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-texto">
        Quantidade (opcional)
        <input
          inputMode="decimal"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value.replace(/[^\d.,]/g, ""))}
          placeholder="Cotas ou ações depois desta movimentação"
          className={ESTILO_CAMPO}
        />
      </label>

      {erro ? <AvisoErro>{erro}</AvisoErro> : null}
      <Botao larguraTotal onClick={salvar} carregando={pendente}>
        {editando ? "Salvar alteração" : tipo === "saldo" ? "Registrar novo saldo" : tipo === "aplicacao" ? "Registrar aplicação" : "Registrar resgate"}
      </Botao>
    </div>
  );
}
