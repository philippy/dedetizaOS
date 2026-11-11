"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Calendar, Users, Wrench, Megaphone, CreditCard, ShieldCheck } from "lucide-react";
import { NovoServicoModal } from "./novo-servico-modal";
import { UserMenu } from "./user-menu";

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: LayoutGrid },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/servicos", label: "Serviços", icon: Wrench },
  { href: "/financeiro", label: "Financeiro", icon: CreditCard },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
];

export function AppShell({ children, clientesList, tiposList, tecnicosList, todayLabel, empresaNome, usuario }: any) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-[#E9EEF5] p-3 md:p-6 pb-24 md:pb-6 text-[#0F1720]">
      <div className="relative rounded-[28px] md:rounded-[36px] border-4 md:border-[6px] border-white bg-[#F4F7FB] shadow-[0_18px_50px_rgba(20,40,80,0.14)] p-4 md:p-6 flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-[46px] h-[46px] rounded-[15px] bg-[#0F1720] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-[#9DBBFF]" />
            </div>
            <div>
              <div className="text-xl font-extrabold leading-tight">{empresaNome}</div>
              <div className="text-xs font-semibold text-[#3A4658]">Detetiza OS</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden sm:flex items-center bg-white rounded-full px-4 h-12 text-sm font-semibold shadow-sm">{todayLabel}</div>
            <NovoServicoModal clientes={clientesList} tipos={tiposList} tecnicos={tecnicosList} />
            <UserMenu usuario={usuario} rotuloPapel={usuario.rotuloPapel} />
          </div>
        </header>
        <div className="flex gap-5 items-start">
          <nav aria-label="Navegação principal" className="hidden md:flex flex-col gap-1.5 p-2 bg-white rounded-[22px] shadow-md shrink-0">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} aria-label={item.label} title={item.label} className={`w-12 h-12 rounded-[15px] flex items-center justify-center transition ${active ? "bg-[#2F5FE0] text-white" : "text-[#0F1720] hover:bg-[#F4F7FB]"}`}>
                  <Icon className="w-[22px] h-[22px]" />
                </Link>
              );
            })}
          </nav>
          <main className="flex-1 min-w-0 flex flex-col gap-4">{children}</main>
        </div>
      </div>
      <nav aria-label="Navegação móvel" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex justify-around items-center shadow-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} className={`min-h-[48px] min-w-[54px] px-2 rounded-2xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${active ? "bg-[#2F5FE0] text-white" : "text-[#0F1720]"}`}>
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
