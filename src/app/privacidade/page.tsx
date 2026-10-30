import { PaginaDocumento } from "@/components/PaginaDocumento";

export const metadata = { title: "Política de privacidade" };

export default function PaginaPrivacidade() {
  return (
    <PaginaDocumento titulo="Política de privacidade" versao="2026-10-30">
      <p>[Texto provisório. Substituir pela versão revisada por um advogado antes do lançamento.]</p>
      <p>
        Coletamos apenas seu nome completo, e-mail, senha (guardada com criptografia), a
        confirmação de maioridade e os aceites destes documentos.
      </p>
      <p>
        Nunca pedimos CPF, documentos, endereço, telefone, dados bancários ou senhas de corretora.
        Os valores da entrevista são guardados em faixas, nunca exatos.
      </p>
      <p>
        A inteligência artificial não recebe seu nome nem seu e-mail. Arquivos importados são
        apagados logo após a leitura.
      </p>
      <p>
        Em Conta, você pode baixar seus dados ou excluir sua conta a qualquer momento.
      </p>
    </PaginaDocumento>
  );
}
