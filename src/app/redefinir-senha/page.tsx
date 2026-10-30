"use client";

import { useRouter } from "next/navigation";
import { TelaAuth } from "@/components/TelaAuth";
import { FormNovaSenha } from "@/components/FormNovaSenha";

export default function PaginaRedefinirSenha() {
  const router = useRouter();
  return (
    <TelaAuth titulo="Crie uma nova senha">
      <FormNovaSenha aoConcluir={() => setTimeout(() => router.replace("/inicio"), 1200)} />
    </TelaAuth>
  );
}
