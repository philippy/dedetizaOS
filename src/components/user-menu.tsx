"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, LogOut, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type Usuario = { nome: string; email: string };

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const letras = partes.length === 1 ? partes[0].slice(0, 2) : partes[0][0] + partes[partes.length - 1][0];
  return letras.toUpperCase();
}

// Menu do avatar: Minha conta, Dados da empresa e Sair.
export function UserMenu({ usuario, rotuloPapel }: { usuario: Usuario; rotuloPapel: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const [deslocamento, setDeslocamento] = useState(0);

  // No celular o avatar pode ficar longe da borda direita: alinha o menu pela direita do avatar, mas
  // nunca deixa sair da tela.
  useLayoutEffect(() => {
    if (!aberto || !raiz.current) return;
    const largura = Math.min(260, window.innerWidth - 16);
    const r = raiz.current.getBoundingClientRect();
    const esquerda = Math.min(Math.max(r.right - largura, 8), window.innerWidth - largura - 8);
    setDeslocamento(esquerda - r.left);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent | TouchEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  async function sair() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const item = "flex w-full items-center gap-3 min-h-[44px] px-3 rounded-[12px] text-sm font-bold text-left hover:bg-[#F4F7FB]";

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={`Menu da conta de ${usuario.nome}`}
        title={usuario.nome}
        className="w-12 h-12 rounded-full bg-[#2F5FE0] text-white flex items-center justify-center text-sm font-extrabold"
      >
        {iniciais(usuario.nome)}
      </button>
      {aberto && (
        <div role="menu" style={{ left: deslocamento }} className="absolute top-14 z-50 w-[260px] max-w-[calc(100vw-1rem)] bg-white rounded-[20px] shadow-[0_12px_32px_rgba(20,40,80,0.18)] p-2">
          <div className="px-3 py-2 border-b border-[#E3E9F2] mb-1">
            <div className="text-sm font-extrabold truncate">{usuario.nome}</div>
            <div className="text-xs font-semibold text-[#3A4658] truncate">{usuario.email}</div>
            <div className="mt-1 inline-block text-[11px] font-bold rounded-full bg-[#DCE7FF] text-[#1B47B5] px-2 py-0.5">{rotuloPapel}</div>
          </div>
          <Link href="/configuracoes/conta" role="menuitem" onClick={() => setAberto(false)} className={item}>
            <UserRound className="w-[18px] h-[18px]" /> Minha conta
          </Link>
          <Link href="/configuracoes/empresa" role="menuitem" onClick={() => setAberto(false)} className={item}>
            <Building2 className="w-[18px] h-[18px]" /> Dados da empresa
          </Link>
          <button type="button" role="menuitem" onClick={sair} className={`${item} text-[#8E1B10]`}>
            <LogOut className="w-[18px] h-[18px]" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
