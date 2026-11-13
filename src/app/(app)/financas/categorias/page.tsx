import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { exigirUsuario } from "@/lib/servidor/sessao";
import { carregarFinancas } from "@/lib/servidor/financas";
import { GerenciarCategorias } from "./GerenciarCategorias";

export const metadata = { title: "Categorias" };

export default async function PaginaCategorias() {
  const { uid, repo } = await exigirUsuario();
  const dados = await carregarFinancas(repo, uid);
  const usos: Record<string, number> = {};
  for (const l of dados.lancamentos) usos[l.categoriaId] = (usos[l.categoriaId] ?? 0) + 1;
  return (
    <section className="flex flex-col gap-5 lg:gap-6">
      <div>
        <Link href="/financas" className="inline-flex items-center gap-1 text-sm text-suave hover:text-texto">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Finanças
        </Link>
        <h1 className="mt-1 font-display text-[1.75rem] font-black tracking-[-0.01em] text-texto lg:text-[2rem]">Categorias</h1>
        <p className="mt-0.5 text-sm text-suave">Crie categorias e subcategorias do seu jeito. Quando você corrige uma categoria, eu guardo a regra para a próxima vez.</p>
      </div>
      <GerenciarCategorias categorias={dados.categorias} regras={[...dados.regras].sort((a, b) => b.usos - a.usos)} usos={usos} />
    </section>
  );
}
