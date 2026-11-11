import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, membros, user } from "@/db/schema";
import { obterContexto } from "@/lib/contexto";
import { pode } from "@/lib/permissoes";
import { emailConfigurado } from "@/lib/email";
import { estadoBloqueioPix } from "@/lib/pix-limite";
import { Aviso } from "../campos";
import { EmpresaForm, type PixAuditoria } from "./empresa-form";
import { EquipePapeis, type Membro } from "./equipe-papeis";
import { RegistroAtividades, type Evento } from "./registro-atividades";

export const dynamic = "force-dynamic";

export default async function DadosDaEmpresaPage() {
  const ctx = await obterContexto();
  if (!ctx) redirect("/login");
  const empresa = ctx.empresa;

  if (!empresa) {
    return (
      <Aviso tipo="atencao">
        Os dados da empresa ainda não foram criados no banco. Rode o SQL de <b>db/migracoes/2026-11-11-empresa-e-permissoes.sql</b> na Neon e atualize a página.
      </Aviso>
    );
  }

  const podeEditar = pode(ctx.papel, "empresa.editar") && ctx.temVinculo;
  const podeGerenciar = pode(ctx.papel, "equipe.gerenciar") && ctx.temVinculo;

  let pixAuditoria: PixAuditoria | null = null;
  if (empresa.pixAtualizadoEm) {
    let quem = "";
    if (empresa.pixAtualizadoPor) {
      const [u] = await db.select({ nome: user.name }).from(user).where(eq(user.id, empresa.pixAtualizadoPor)).limit(1);
      quem = u?.nome ?? "";
    }
    pixAuditoria = { quando: empresa.pixAtualizadoEm.toISOString(), quem };
  }

  const equipe: Membro[] = podeGerenciar
    ? await db
        .select({ userId: membros.userId, nome: user.name, email: user.email, papel: membros.papel, senhaProvisoria: membros.senhaProvisoria })
        .from(membros)
        .innerJoin(user, eq(membros.userId, user.id))
        .where(eq(membros.empresaId, empresa.id))
        .orderBy(asc(user.name))
    : [];

  const pixBloqueadoAte = podeEditar ? await estadoBloqueioPix(ctx.userId) : null;

  const eventos: Evento[] = podeGerenciar
    ? (
        await db
          .select()
          .from(auditoria)
          .where(eq(auditoria.empresaId, empresa.id))
          .orderBy(desc(auditoria.quando), desc(auditoria.id))
          .limit(60)
      ).map((e) => ({
        id: e.id,
        quando: e.quando.toISOString(),
        acao: e.acao,
        ator: `${e.atorNome} (${e.atorEmail})`,
        alvo: e.alvoNome ? `${e.alvoNome} (${e.alvoEmail ?? ""})` : "",
        detalhe: e.detalhe,
      }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <EmpresaForm
        podeEditar={podeEditar}
        pixBloqueadoAte={pixBloqueadoAte ? pixBloqueadoAte.toISOString() : null}
        emailAtivo={emailConfigurado()}
        pixAuditoria={pixAuditoria}
        inicial={{
          nome: empresa.nome,
          cnpj: empresa.cnpj,
          responsavel: empresa.responsavel,
          telefone: empresa.telefone,
          email: empresa.email,
          endereco: empresa.endereco,
          pixTipo: empresa.pixTipo,
          pixChave: empresa.pixChave,
          pixFavorecido: empresa.pixFavorecido,
        }}
      />
      {podeGerenciar && <EquipePapeis membros={equipe} meuId={ctx.userId} emailAtivo={emailConfigurado()} />}
      {podeGerenciar && <RegistroAtividades eventos={eventos} />}
    </div>
  );
}
