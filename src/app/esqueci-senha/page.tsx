"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { emailDisponivelAction } from "@/actions/configuracoes";
import { useEffect } from "react";

const input = "h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [indisponivel, setIndisponivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    emailDisponivelAction().then((ok) => setIndisponivel(!ok)).catch(() => {});
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" });
    setCarregando(false);
    if (error) {
      setErro(error.status === 429 ? "Muitos pedidos seguidos. Aguarde um minuto e tente de novo." : "Não foi possível enviar agora. Tente de novo em instantes.");
      return;
    }
    setEnviado(true);
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4 text-[#0F1720]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-xl p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[15px] bg-[#0F1720] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#9DBBFF]" /></div>
          <div>
            <h1 className="text-xl font-extrabold">Detetiza OS</h1>
            <p className="text-xs font-semibold text-[#3A4658]">Esqueci minha senha</p>
          </div>
        </div>
        {indisponivel ? (
          <p className="text-sm font-semibold text-[#3A4658]">O envio de e-mail ainda não está ligado neste sistema. Peça uma nova senha provisória ao administrador.</p>
        ) : enviado ? (
          <div role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-xl p-4 text-sm font-bold">
            Se esse e-mail tiver acesso ao sistema, enviamos um link para criar uma nova senha. Ele vale por 1 hora. Confira também a caixa de spam.
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <p className="text-sm font-semibold text-[#3A4658]">Digite o e-mail do seu acesso. Vamos enviar um link para você criar uma nova senha.</p>
            <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">E-mail
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} autoComplete="email" />
            </label>
            {erro && <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{erro}</div>}
            <button type="submit" disabled={carregando} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">{carregando ? "Enviando..." : "Enviar link"}</button>
          </form>
        )}
        <Link href="/login" className="text-xs font-bold text-[#1B47B5] text-center hover:underline">Voltar ao login</Link>
      </div>
    </div>
  );
}
