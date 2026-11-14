import { redirect } from "next/navigation";

export default async function PaginaJornada({
  searchParams,
}: {
  searchParams: Promise<{ plano?: string }>;
}) {
  const { plano } = await searchParams;
  redirect(
    plano && /^[\w-]{1,60}$/.test(plano)
      ? `/financas/planos/${plano}/editar`
      : "/financas/planos/novo",
  );
}
