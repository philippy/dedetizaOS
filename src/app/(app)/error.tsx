"use client";

import Link from "next/link";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Em produção o Next esconde a mensagem original; a sessão expirada é o caso mais comum.
  return (
    <div className="bg-white rounded-[24px] p-6 shadow-sm flex flex-col gap-3 max-w-lg">
      <h2 className="text-[17px] font-extrabold">Não foi possível concluir esta ação</h2>
      <p className="text-sm text-[#3A4658]">
        Sua sessão pode ter expirado. Entre novamente e tente de novo. Se o erro continuar, anote o código abaixo.
      </p>
      {error.digest && <p className="text-xs font-mono text-[#3A4658]">Código: {error.digest}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={reset} className="min-h-[44px] px-5 rounded-full bg-[#2F5FE0] text-white font-bold text-sm">Tentar de novo</button>
        <Link href="/login" className="min-h-[44px] px-5 rounded-full bg-[#E8ECF2] text-[#0F1720] font-bold text-sm inline-flex items-center">Entrar novamente</Link>
      </div>
    </div>
  );
}
