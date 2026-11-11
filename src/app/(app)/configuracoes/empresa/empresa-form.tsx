"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { salvarEmpresaAction } from "@/actions/configuracoes";
import { TIPOS_PIX, ehTipoPix, normalizarChavePix, type TipoPix } from "@/lib/validacao";
import { Aviso, Campo, Cartao, classeInput } from "../campos";

export type PixAuditoria = { quando: string; quem: string };

type Dados = {
  nome: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  email: string;
  endereco: string;
  pixTipo: string;
  pixChave: string;
  pixFavorecido: string;
};

const EXEMPLO_CHAVE: Record<TipoPix, string> = {
  CNPJ: "00.000.000/0000-00",
  CPF: "000.000.000-00",
  "E-mail": "financeiro@suaempresa.com.br",
  Celular: "(11) 90000-0000",
  Aleatória: "123e4567-e89b-12d3-a456-426614174000",
};

function dataHoraBR(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

export function EmpresaForm({ inicial, podeEditar, pixAuditoria }: { inicial: Dados; podeEditar: boolean; pixAuditoria: PixAuditoria | null }) {
  const router = useRouter();
  const [d, setD] = useState<Dados>(inicial);
  const [senha, setSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string; campo?: string } | null>(null);

  const set = (campo: keyof Dados) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setD((a) => ({ ...a, [campo]: e.target.value }));
    setMsg(null);
  };

  const pixMudou = d.pixTipo !== inicial.pixTipo || d.pixChave.trim() !== inicial.pixChave || d.pixFavorecido.trim() !== inicial.pixFavorecido;
  const tipo: TipoPix = ehTipoPix(d.pixTipo) ? d.pixTipo : "CNPJ";
  // Chave já salva que não passa na conferência (ex.: a chave de exemplo): avisa para trocar pela real.
  const chaveSalvaInvalida = inicial.pixChave !== "" && ehTipoPix(inicial.pixTipo) && !normalizarChavePix(inicial.pixTipo, inicial.pixChave).ok;
  const erroDe = (campo: string) => (msg?.tipo === "erro" && msg.campo === campo ? msg.texto : undefined);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEditar) return;
    setMsg(null);
    setSalvando(true);
    const res = await salvarEmpresaAction({ ...d, pixTipo: tipo, senhaAtual: senha });
    setSalvando(false);
    if ("error" in res) {
      setMsg({ tipo: "erro", texto: res.error, campo: res.campo });
      return;
    }
    setSenha("");
    setMsg({ tipo: "ok", texto: "Dados da empresa salvos." });
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      {!podeEditar && <Aviso tipo="atencao">Só o administrador pode alterar os dados da empresa. Você pode consultá-los aqui.</Aviso>}

      <Cartao titulo="Dados da empresa" descricao="Aparecem no topo do sistema e nos contatos com o cliente.">
        <fieldset disabled={!podeEditar} className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <Campo rotulo="Nome da empresa" erro={erroDe("nome")}>
            <input className={classeInput} value={d.nome} onChange={set("nome")} required maxLength={120} aria-invalid={msg?.campo === "nome"} />
          </Campo>
          <Campo rotulo="CNPJ" dica="Opcional. Aceita o CNPJ numérico e o alfanumérico." erro={erroDe("cnpj")}>
            <input className={classeInput} value={d.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" inputMode="text" autoCapitalize="characters" aria-invalid={msg?.campo === "cnpj"} />
          </Campo>
          <Campo rotulo="Responsável">
            <input className={classeInput} value={d.responsavel} onChange={set("responsavel")} maxLength={120} />
          </Campo>
          <Campo rotulo="Telefone / WhatsApp da empresa" erro={erroDe("telefone")}>
            <input className={classeInput} value={d.telefone} onChange={set("telefone")} inputMode="tel" placeholder="(11) 90000-0000" aria-invalid={msg?.campo === "telefone"} />
          </Campo>
          <Campo rotulo="E-mail da empresa" erro={erroDe("email")}>
            <input type="email" className={classeInput} value={d.email} onChange={set("email")} placeholder="contato@suaempresa.com.br" aria-invalid={msg?.campo === "email"} />
          </Campo>
          <Campo rotulo="Endereço" erro={erroDe("endereco")}>
            <input className={classeInput} value={d.endereco} onChange={set("endereco")} maxLength={200} placeholder="Rua, número, bairro, cidade/UF" />
          </Campo>
        </fieldset>
      </Cartao>

      <Cartao titulo="Chave Pix para cobrança" descricao="É a chave que o sistema coloca na mensagem de cobrança por WhatsApp.">
        {chaveSalvaInvalida && <Aviso tipo="atencao">A chave salva não é válida (parece ser de exemplo). Troque pela chave real antes de cobrar clientes.</Aviso>}
        <fieldset disabled={!podeEditar} className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          <Campo rotulo="Tipo da chave">
            <select className={classeInput} value={tipo} onChange={set("pixTipo")}>
              {TIPOS_PIX.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Chave Pix" erro={erroDe("pixChave")} dica="Deixe em branco para cobrar sem chave (o modal avisa).">
            <input className={classeInput} value={d.pixChave} onChange={set("pixChave")} placeholder={EXEMPLO_CHAVE[tipo]} autoCapitalize="none" autoComplete="off" aria-invalid={msg?.campo === "pixChave"} />
          </Campo>
          <Campo rotulo="Favorecido (nome na mensagem)" dica="Em branco usa o nome da empresa.">
            <input className={classeInput} value={d.pixFavorecido} onChange={set("pixFavorecido")} maxLength={120} placeholder={d.nome} />
          </Campo>
        </fieldset>
        {pixAuditoria ? (
          <p className="text-xs font-semibold text-[#3A4658]">
            Última alteração da chave: {dataHoraBR(pixAuditoria.quando)}
            {pixAuditoria.quem ? ` por ${pixAuditoria.quem}` : ""}.
          </p>
        ) : (
          <p className="text-xs font-semibold text-[#3A4658]">A chave ainda não foi alterada por esta tela.</p>
        )}
        {podeEditar && pixMudou && (
          <div className="rounded-[16px] bg-[#FFF0D1] p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-[#7A4B00]">Trocar a chave redireciona os pagamentos dos clientes. Confirme com a sua senha.</p>
            <Campo rotulo="Sua senha" erro={erroDe("senhaAtual")}>
              <input type="password" className={classeInput} value={senha} onChange={(e) => { setSenha(e.target.value); setMsg(null); }} autoComplete="current-password" aria-invalid={msg?.campo === "senhaAtual"} />
            </Campo>
          </div>
        )}
      </Cartao>

      {msg && (!msg.campo || msg.tipo === "ok") && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
      {podeEditar && (
        <div>
          <button type="submit" disabled={salvando} className="min-h-[48px] px-6 rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">
            {salvando ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      )}
    </form>
  );
}
