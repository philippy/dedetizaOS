import { AbasConfiguracoes } from "./campos";

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-extrabold">Configurações</h1>
      </div>
      <AbasConfiguracoes />
      {children}
    </div>
  );
}
