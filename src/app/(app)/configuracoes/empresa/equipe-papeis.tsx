"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alterarPapelAction } from "@/actions/configuracoes";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/permissoes";
import { Aviso, Cartao, classeInput } from "../campos";

export type Membro = { userId: string; nome: string; email: string; papel: Papel };

export function EquipePapeis({ membros, meuId }: { membros: Membro[]; meuId: string }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  async function trocar(m: Membro, papel: string) {
    setMsg(null);
    if (m.userId === meuId && m.papel === "admin" && papel !== "admin") {
      const certeza = window.confirm("Você vai deixar de ser administrador e só poderá voltar se outro administrador devolver o acesso. Continuar?");
      if (!certeza) {
        router.refresh();
        return;
      }
    }
    setOcupado(m.userId);
    const res = await alterarPapelAction({ userId: m.userId, papel });
    setOcupado(null);
    if ("error" in res) {
      setMsg({ tipo: "erro", texto: res.error });
    } else {
      setMsg({ tipo: "ok", texto: `Papel de ${m.nome} atualizado.` });
    }
    router.refresh();
  }

  return (
    <Cartao titulo="Equipe e permissões" descricao="Só o administrador altera. A empresa sempre mantém pelo menos um administrador.">
      <ul className="flex flex-col divide-y divide-[#E3E9F2]">
        {membros.map((m) => (
          <li key={m.userId} className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">
                {m.nome}
                {m.userId === meuId && <span className="ml-2 text-[11px] font-bold rounded-full bg-[#DCE7FF] text-[#1B47B5] px-2 py-0.5">você</span>}
              </div>
              <div className="text-xs font-semibold text-[#3A4658] truncate">{m.email}</div>
            </div>
            <select
              aria-label={`Papel de ${m.nome}`}
              className={`${classeInput} !w-[190px]`}
              value={m.papel}
              disabled={ocupado === m.userId}
              onChange={(e) => trocar(m, e.target.value)}
            >
              {PAPEIS.map((p) => (
                <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <p className="text-xs font-semibold text-[#3A4658]">
        Hoje o papel decide quem altera os dados da empresa e as permissões. As demais restrições (ex.: quem vê o Financeiro) ainda não existem: Financeiro e Normal veem as mesmas telas.
        Para incluir mais pessoas na equipe, o cadastro de novos usuários ainda precisa ser feito pelo desenvolvimento.
      </p>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
    </Cartao>
  );
}
