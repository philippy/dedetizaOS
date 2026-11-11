import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/contexto";
import { ROTULO_PAPEL } from "@/lib/permissoes";
import { ContaForm } from "./conta-form";

export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");
  return (
    <ContaForm
      nome={ctx.nome}
      email={ctx.email}
      telefone={ctx.telefone}
      papel={ROTULO_PAPEL[ctx.papel]}
      empresaNome={ctx.empresa?.nome ?? "Sem empresa"}
    />
  );
}
