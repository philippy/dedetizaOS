"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const classeInput =
  "h-12 w-full border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-sm bg-white disabled:bg-[#F4F7FB] disabled:text-[#3A4658] aria-[invalid=true]:border-[#B42318]";

export function Campo({ rotulo, dica, erro, children }: { rotulo: string; dica?: string; erro?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-bold text-[#3A4658]">
      {rotulo}
      {children}
      {erro ? <span className="text-[#B42318] font-bold">{erro}</span> : dica ? <span className="font-medium text-[#5A6678]">{dica}</span> : null}
    </label>
  );
}

export function Cartao({ titulo, descricao, children }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[24px] p-5 shadow-sm flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-extrabold">{titulo}</h2>
        {descricao && <p className="text-xs font-semibold text-[#3A4658] mt-0.5">{descricao}</p>}
      </div>
      {children}
    </section>
  );
}

export function Aviso({ tipo, children }: { tipo: "erro" | "ok" | "atencao"; children: React.ReactNode }) {
  const cor =
    tipo === "erro" ? "bg-[#FDE4E1] text-[#8E1B10]" : tipo === "ok" ? "bg-[#DDF3E4] text-[#14653A]" : "bg-[#FFF0D1] text-[#7A4B00]";
  return (
    <div role={tipo === "erro" ? "alert" : "status"} className={`${cor} rounded-xl p-3 text-xs font-bold`}>
      {children}
    </div>
  );
}

const ABAS = [
  { href: "/configuracoes/conta", rotulo: "Minha conta" },
  { href: "/configuracoes/empresa", rotulo: "Dados da empresa" },
];

export function AbasConfiguracoes() {
  const pathname = usePathname();
  return (
    <nav aria-label="Configurações" className="flex flex-wrap gap-2">
      {ABAS.map((a) => {
        const ativa = pathname.startsWith(a.href);
        return (
          <Link
            key={a.href}
            href={a.href}
            aria-current={ativa ? "page" : undefined}
            className={`min-h-[44px] px-5 rounded-full flex items-center text-sm font-bold ${ativa ? "bg-[#2F5FE0] text-white" : "bg-white text-[#0F1720] shadow-sm"}`}
          >
            {a.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
