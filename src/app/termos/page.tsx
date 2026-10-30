import { PaginaDocumento } from "@/components/PaginaDocumento";

export const metadata = { title: "Termos de uso · Norte.ia" };

export default function PaginaTermos() {
  return (
    <PaginaDocumento titulo="Termos de uso" versao="2026-10-30">
      <p>[Texto provisório. Substituir pela versão revisada por um advogado antes do lançamento.]</p>
      <p>
        O Norte.ia é um serviço educacional. Ele explica, compara e simula, mas não recomenda
        investimentos, não vende produtos e não tem vínculo com corretoras.
      </p>
      <p>
        As decisões de investimento são sempre suas. Rentabilidade passada não garante resultado
        futuro.
      </p>
      <p>Para usar o app, você precisa ter 18 anos ou mais.</p>
    </PaginaDocumento>
  );
}
