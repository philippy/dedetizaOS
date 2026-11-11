"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { trocarSenhaProvisoriaAction } from "@/actions/configuracoes";

const input = "h-12 w-full border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm bg-white";

// Primeiro acesso de quem foi cadastrado pelo administrador: só libera o sistema depois de trocar a senha provisória.
export function TrocaSenhaObrigatoria({ nome, empresaNome }: { nome: string; empresaNome: string }) {
  const router = useRouter();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (nova !== confirma) return setErro("A confirmação não é igual à nova senha.");
    setSalvando(true);
    const res = await trocarSenhaProvisoriaAction({ atual, nova });
    setSalvando(false);
    if ("error" in res) return setErro(res.error);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4 text-[#0F1720]">
      <form onSubmit={enviar} className="w-full max-w-md bg-white rounded-[28px] shadow-xl p-7 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[15px] bg-[#0F1720] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#9DBBFF]" /></div>
          <div>
            <h1 className="text-xl font-extrabold">{empresaNome}</h1>
            <p className="text-xs font-semibold text-[#3A4658]">Detetiza OS</p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-extrabold">Olá, {nome.split(" ")[0]}. Crie a sua senha.</h2>
          <p className="text-sm font-semibold text-[#3A4658] mt-1">Você entrou com uma senha provisória. Escolha uma senha só sua para continuar.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Senha provisória
          <input type="password" className={input} value={atual} onChange={(e) => setAtual(e.target.value)} required autoComplete="current-password" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nova senha (mínimo de 8 caracteres)
          <input type="password" className={input} value={nova} onChange={(e) => setNova(e.target.value)} required minLength={8} autoComplete="new-password" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Repita a nova senha
          <input type="password" className={input} value={confirma} onChange={(e) => setConfirma(e.target.value)} required minLength={8} autoComplete="new-password" />
        </label>
        {erro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{erro}</div>}
        <button type="submit" disabled={salvando} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">{salvando ? "Salvando..." : "Salvar e entrar"}</button>
      </form>
    </div>
  );
}
