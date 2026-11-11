"use client";

import { useState } from "react";
import Link from "next/link";
import { desbloquearPixAction } from "@/actions/configuracoes";
import { Aviso, Cartao } from "../campos";

// O desbloqueio só acontece no clique (POST), nunca ao abrir o link: leitores de e-mail que "pré-visualizam" links não o consomem.
export function DesbloquearPix({ token }: { token: string }) {
  const [estado, setEstado] = useState<"parado" | "enviando" | "ok" | { erro: string }>("parado");

  async function confirmar() {
    setEstado("enviando");
    const res = await desbloquearPixAction({ token });
    setEstado("error" in res ? { erro: res.error } : "ok");
  }

  return (
    <Cartao titulo="Desbloquear a troca da chave Pix" descricao="Confirme que foi você quem pediu este desbloqueio.">
      {estado === "ok" ? (
        <>
          <Aviso tipo="ok">Desbloqueado. Você tem mais 3 tentativas de senha para trocar a chave Pix.</Aviso>
          <div><Link href="/configuracoes/empresa" className="inline-flex min-h-[48px] items-center px-6 rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Voltar para Dados da empresa</Link></div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-[#3A4658]">Se você não pediu o desbloqueio, não confirme e troque a sua senha em Minha conta.</p>
          {typeof estado === "object" && <Aviso tipo="erro">{estado.erro}</Aviso>}
          <div>
            <button type="button" onClick={confirmar} disabled={estado === "enviando"} className="min-h-[48px] px-6 rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">
              {estado === "enviando" ? "Desbloqueando..." : "Confirmar desbloqueio"}
            </button>
          </div>
        </>
      )}
    </Cartao>
  );
}
