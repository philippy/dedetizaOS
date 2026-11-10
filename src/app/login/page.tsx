"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { canPublicRegister } from "@/actions";

export default function LoginPage() {
  const router = useRouter();
  const [allowRegister, setAllowRegister] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("Dedetizadora Impacto");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    canPublicRegister().then((can) => {
      setAllowRegister(can);
      if (can) setIsSignUp(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (isSignUp && allowRegister) {
      const { error: err } = await authClient.signUp.email({ email, password, name });
      setLoading(false);
      if (err) { setError(err.message || "Erro ao criar conta."); return; }
      router.push("/");
      router.refresh();
    } else {
      const { error: err } = await authClient.signIn.email({ email, password });
      setLoading(false);
      if (err) { setError("E-mail ou senha incorretos."); return; }
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-[#E9EEF5] flex items-center justify-center p-4 text-[#0F1720]">
      <div className="w-full max-w-md bg-white rounded-[28px] shadow-xl p-7 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[15px] bg-[#0F1720] flex items-center justify-center"><ShieldCheck className="w-6 h-6 text-[#9DBBFF]" /></div>
          <div>
            <h1 className="text-xl font-extrabold">Dedetizadora Impacto</h1>
            <p className="text-xs font-semibold text-[#3A4658]">Detetiza OS · Acesso ao sistema</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignUp && allowRegister && (
            <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Nome<input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          )}
          <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">E-mail<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@impacto.com.br" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">Senha<input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm" /></label>
          {error && <div className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl p-3 text-xs font-bold">{error}</div>}
          <button type="submit" disabled={loading} className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white font-bold text-sm">{loading ? "Aguarde..." : isSignUp && allowRegister ? "Criar primeiro usuário e entrar" : "Entrar no Detetiza OS"}</button>
        </form>
        {allowRegister && (
          <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-xs font-bold text-[#1B47B5] text-center hover:underline">
            {isSignUp ? "Já tem conta? Entrar" : "Primeiro acesso? Criar conta"}
          </button>
        )}
      </div>
    </div>
  );
}
