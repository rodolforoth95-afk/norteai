import { TelaJornada } from "../../TelaJornada";

export const metadata = { title: "Editar plano" };

export default async function PaginaEditarPlano({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TelaJornada planoId={id} />;
}
