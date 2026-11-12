"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { salvarMinhaContaAction, trocarMeuEmailAction } from "@/actions/configuracoes";
import { Aviso, Campo, Cartao, classeInput } from "../campos";

const SENHA_MIN = 8; // mínimo padrão do Better Auth

export function ContaForm({ nome: nomeInicial, email, telefone: telefoneInicial, papel, empresaNome }: { nome: string; email: string; telefone: string; papel: string; empresaNome: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [telefone, setTelefone] = useState(telefoneInicial);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string; campo?: string } | null>(null);

  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [trocando, setTrocando] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  const [novoEmail, setNovoEmail] = useState("");
  const [senhaEmail, setSenhaEmail] = useState("");
  const [trocandoEmail, setTrocandoEmail] = useState(false);
  const [msgEmail, setMsgEmail] = useState<{ tipo: "ok" | "erro"; texto: string; campo?: string } | null>(null);

  async function trocarEmail(e: React.FormEvent) {
    e.preventDefault();
    setMsgEmail(null);
    setTrocandoEmail(true);
    const res = await trocarMeuEmailAction({ senha: senhaEmail, novoEmail });
    setTrocandoEmail(false);
    if ("error" in res) return setMsgEmail({ tipo: "erro", texto: res.error, campo: res.campo });
    setNovoEmail("");
    setSenhaEmail("");
    setMsgEmail({ tipo: "ok", texto: "E-mail de acesso trocado. Use o novo e-mail no próximo login." });
    router.refresh();
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSalvando(true);
    const res = await salvarMinhaContaAction({ nome, telefone });
    setSalvando(false);
    if ("error" in res) {
      setMsg({ tipo: "erro", texto: res.error, campo: res.campo });
      return;
    }
    setMsg({ tipo: "ok", texto: "Dados salvos." });
    router.refresh();
  }

  async function trocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setMsgSenha(null);
    if (nova.length < SENHA_MIN) return setMsgSenha({ tipo: "erro", texto: `A nova senha precisa ter pelo menos ${SENHA_MIN} caracteres.` });
    if (nova !== confirma) return setMsgSenha({ tipo: "erro", texto: "A confirmação não é igual à nova senha." });
    if (nova === atual) return setMsgSenha({ tipo: "erro", texto: "A nova senha precisa ser diferente da atual." });
    setTrocando(true);
    const { error } = await authClient.changePassword({ currentPassword: atual, newPassword: nova, revokeOtherSessions: true });
    setTrocando(false);
    if (error) {
      const incorreta = /invalid|incorrect|wrong/i.test(error.message ?? "");
      return setMsgSenha({ tipo: "erro", texto: incorreta ? "Senha atual incorreta." : error.message || "Não foi possível trocar a senha." });
    }
    setAtual("");
    setNova("");
    setConfirma("");
    setMsgSenha({ tipo: "ok", texto: "Senha trocada. Os outros aparelhos conectados foram desconectados." });
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={salvar}>
        <Cartao titulo="Meus dados" descricao={`${empresaNome} · ${papel}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo rotulo="Nome" erro={msg?.tipo === "erro" && msg.campo === "nome" ? msg.texto : undefined}>
              <input className={classeInput} value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} autoComplete="name" aria-invalid={msg?.campo === "nome"} />
            </Campo>
            <Campo rotulo="Telefone / WhatsApp" dica="Contato interno da equipe." erro={msg?.tipo === "erro" && msg.campo === "telefone" ? msg.texto : undefined}>
              <input className={classeInput} value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" placeholder="(11) 90000-0000" autoComplete="tel" aria-invalid={msg?.campo === "telefone"} />
            </Campo>
            <Campo rotulo="E-mail de acesso" dica="Para trocar, use o cartão abaixo.">
              <input className={classeInput} value={email} disabled readOnly />
            </Campo>
          </div>
          {msg && !msg.campo && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}
          <div>
            <button type="submit" disabled={salvando} className="min-h-[48px] px-6 rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">
              {salvando ? "Salvando..." : "Salvar dados"}
            </button>
          </div>
        </Cartao>
      </form>

      <form onSubmit={trocarEmail}>
        <Cartao titulo="Trocar e-mail de acesso" descricao="É o e-mail do login e o que recebe o link de “Esqueci minha senha”. Confirme com a sua senha.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo rotulo="Novo e-mail" erro={msgEmail?.tipo === "erro" && msgEmail.campo === "novoEmail" ? msgEmail.texto : undefined}>
              <input type="email" className={classeInput} value={novoEmail} onChange={(e) => setNovoEmail(e.target.value)} required autoComplete="off" autoCapitalize="none" maxLength={200} />
            </Campo>
            <Campo rotulo="Sua senha atual" erro={msgEmail?.tipo === "erro" && msgEmail.campo === "senha" ? msgEmail.texto : undefined}>
              <input type="password" className={classeInput} value={senhaEmail} onChange={(e) => setSenhaEmail(e.target.value)} required autoComplete="current-password" />
            </Campo>
          </div>
          {msgEmail && (msgEmail.tipo === "ok" || !msgEmail.campo) && <Aviso tipo={msgEmail.tipo}>{msgEmail.texto}</Aviso>}
          <div>
            <button type="submit" disabled={trocandoEmail} className="min-h-[48px] px-6 rounded-full bg-[#0F1720] text-white font-bold text-sm disabled:opacity-60">
              {trocandoEmail ? "Trocando..." : "Trocar e-mail"}
            </button>
          </div>
        </Cartao>
      </form>

      <form onSubmit={trocarSenha}>
        <Cartao titulo="Trocar senha" descricao="Ao trocar, os outros aparelhos conectados saem da conta.">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo rotulo="Senha atual">
              <input type="password" className={classeInput} value={atual} onChange={(e) => setAtual(e.target.value)} required autoComplete="current-password" />
            </Campo>
            <Campo rotulo="Nova senha" dica={`Mínimo de ${SENHA_MIN} caracteres.`}>
              <input type="password" className={classeInput} value={nova} onChange={(e) => setNova(e.target.value)} required minLength={SENHA_MIN} autoComplete="new-password" />
            </Campo>
            <Campo rotulo="Repita a nova senha">
              <input type="password" className={classeInput} value={confirma} onChange={(e) => setConfirma(e.target.value)} required minLength={SENHA_MIN} autoComplete="new-password" />
            </Campo>
          </div>
          {msgSenha && <Aviso tipo={msgSenha.tipo}>{msgSenha.texto}</Aviso>}
          <div>
            <button type="submit" disabled={trocando} className="min-h-[48px] px-6 rounded-full bg-[#0F1720] text-white font-bold text-sm disabled:opacity-60">
              {trocando ? "Trocando..." : "Trocar senha"}
            </button>
          </div>
        </Cartao>
      </form>
    </div>
  );
}
