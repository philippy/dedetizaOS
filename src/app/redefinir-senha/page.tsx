"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const input = "h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm";

function Formulario() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const invalido = !token || params.get("error") === "INVALID_TOKEN";
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (nova !== confirma) return setErro("A confirmação não é igual à nova senha.");
    setSalvando(true);
    const { error } = await authClient.resetPassword({ newPassword: nova, token });
    setSalvando(false);
    if (error) return setErro(error.message?.toLowerCase().includes("token") ? "Este link expirou ou já foi usado. Peça um novo." : error.message || "Não foi possível salvar a senha.");
    setPronto(true);
  }

  if (invalido) return <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-4 text-sm font-bold">Este link expirou ou já foi usado. <Link href="/esqueci-senha" className="underline">Peça um novo</Link>.</div>;
  if (pronto) return <div role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-xl p-4 text-sm font-bold">Senha alterada. Você já pode <Link href="/login" className="underline">entrar</Link> com a nova senha.</div>;
  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nova senha (mínimo de 8 caracteres)
        <input type="password" required minLength={8} value={nova} onChange={(e) => setNova(e.target.value)} className={input} autoComplete="new-password" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Repita a nova senha
        <input type="password" required minLength={8} value={confirma} onChange={(e) => setConfirma(e.target.value)} className={input} autoComplete="new-password" />
      </label>
      {erro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{erro}</div>}
      <button type="submit" disabled={salvando} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">{salvando ? "Salvando..." : "Salvar nova senha"}</button>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4 text-[#0F1720]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-xl p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[15px] bg-[#0F1720] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#9DBBFF]" /></div>
          <div>
            <h1 className="text-xl font-extrabold">Detetiza OS</h1>
            <p className="text-xs font-semibold text-[#3A4658]">Criar nova senha</p>
          </div>
        </div>
        <Suspense fallback={null}><Formulario /></Suspense>
      </div>
    </div>
  );
}
