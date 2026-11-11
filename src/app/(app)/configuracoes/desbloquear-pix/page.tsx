import { redirect } from "next/navigation";
import { obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";
import { Aviso } from "../campos";
import { DesbloquearPix } from "./desbloquear-pix";

export const dynamic = "force-dynamic";

export default async function DesbloquearPixPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");
  const { token } = await searchParams;
  if (!pode(ctx.papel, "empresa.editar") || !ctx.temVinculo) {
    return <Aviso tipo="atencao">Só o administrador pode desbloquear a troca da chave Pix.</Aviso>;
  }
  if (!token) return <Aviso tipo="erro">Link inválido. Peça um novo na tela Dados da empresa.</Aviso>;
  return <DesbloquearPix token={token} />;
}
