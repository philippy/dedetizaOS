import { ROTULO_ACAO } from "@/lib/auditoria";
import { Cartao } from "../campos";

export type Evento = { id: number; quando: string; acao: string; ator: string; alvo: string; detalhe: string };

function dataHoraBR(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

// Só leitura. O registro guarda nome e e-mail no momento do fato, então continua inteiro mesmo se a conta for removida.
export function RegistroAtividades({ eventos }: { eventos: Evento[] }) {
  return (
    <Cartao titulo="Registro de atividades" descricao="Últimas 60 ações sensíveis: equipe, dados da empresa, chave Pix e contas. Não pode ser editado nem apagado por esta tela, e continua depois que uma conta é removida.">
      {eventos.length === 0 ? (
        <p className="text-sm font-semibold text-[#3A4658]">Nenhuma atividade registrada ainda.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-[#E3E9F2]">
          {eventos.map((e) => (
            <li key={e.id} className="py-3 flex flex-col gap-0.5">
              <div className="text-sm font-extrabold">{ROTULO_ACAO[e.acao as keyof typeof ROTULO_ACAO] ?? e.acao}</div>
              <div className="text-xs font-semibold text-[#3A4658] break-words">
                {dataHoraBR(e.quando)} · por {e.ator}
                {e.alvo ? ` · sobre ${e.alvo}` : ""}
              </div>
              {e.detalhe && <div className="text-xs text-[#3A4658] break-words">{e.detalhe}</div>}
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
