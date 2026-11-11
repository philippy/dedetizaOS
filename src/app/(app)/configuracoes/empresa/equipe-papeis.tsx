"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { alterarPapelAction, criarUsuarioAction, redefinirSenhaAction, removerUsuarioAction } from "@/actions/configuracoes";
import { PAPEIS, ROTULO_PAPEL, type Papel } from "@/lib/permissoes";
import { Aviso, Campo, Cartao, classeInput } from "../campos";

export type Membro = { userId: string; nome: string; email: string; papel: Papel; senhaProvisoria: boolean };

type Credencial = { motivo: "criado" | "redefinida"; nome: string; email: string; senha: string; emailEnviado: boolean | null };

export function EquipePapeis({ membros, meuId, emailAtivo }: { membros: Membro[]; meuId: string; emailAtivo: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [credencial, setCredencial] = useState<Credencial | null>(null);
  const [copiado, setCopiado] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("normal");
  const [criando, setCriando] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState(false);
  const [erroForm, setErroForm] = useState<{ texto: string; campo?: string } | null>(null);

  async function trocar(m: Membro, novo: string) {
    setMsg(null);
    if (m.userId === meuId && m.papel === "admin" && novo !== "admin") {
      const certeza = window.confirm("Você vai deixar de ser administrador e só poderá voltar se outro administrador devolver o acesso. Continuar?");
      if (!certeza) {
        router.refresh();
        return;
      }
    }
    setOcupado(m.userId);
    const res = await alterarPapelAction({ userId: m.userId, papel: novo });
    setOcupado(null);
    setMsg("error" in res ? { tipo: "erro", texto: res.error } : { tipo: "ok", texto: `Papel de ${m.nome} atualizado.` });
    router.refresh();
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErroForm(null);
    setMsg(null);
    setCriando(true);
    const res = await criarUsuarioAction({ nome, email, papel, enviarEmail: emailAtivo && enviarEmail });
    setCriando(false);
    if ("error" in res) {
      setErroForm({ texto: res.error, campo: res.campo });
      return;
    }
    setCredencial({ motivo: "criado", nome, email: res.email, senha: res.senhaProvisoria, emailEnviado: res.emailEnviado });
    setCopiado(false);
    setNome("");
    setEmail("");
    setPapel("normal");
    router.refresh();
  }

  async function redefinir(m: Membro) {
    if (!window.confirm(`Gerar uma nova senha provisória para ${m.nome}? A senha atual deixa de valer e a pessoa é desconectada.${emailAtivo && enviarEmail ? " A nova senha também será enviada por e-mail." : ""}`)) return;
    setMsg(null);
    setOcupado(m.userId);
    const res = await redefinirSenhaAction({ userId: m.userId, enviarEmail: emailAtivo && enviarEmail });
    setOcupado(null);
    if ("error" in res) {
      setMsg({ tipo: "erro", texto: res.error });
      return;
    }
    setCredencial({ motivo: "redefinida", nome: m.nome, email: res.email, senha: res.senhaProvisoria, emailEnviado: res.emailEnviado });
    setCopiado(false);
    router.refresh();
  }

  async function remover(m: Membro) {
    if (!window.confirm(`Remover o acesso de ${m.nome}?\n\nEsta ação é IRREVERSÍVEL: a conta é apagada e a pessoa nunca mais consegue entrar (para voltar, seria preciso criar um novo acesso).\n\nO registro de atividades dela continua guardado no sistema.`)) return;
    setMsg(null);
    setOcupado(m.userId);
    const res = await removerUsuarioAction({ userId: m.userId });
    setOcupado(null);
    setMsg("error" in res ? { tipo: "erro", texto: res.error } : { tipo: "ok", texto: `Acesso de ${m.nome} removido.` });
    router.refresh();
  }

  async function copiar() {
    if (!credencial) return;
    try {
      await navigator.clipboard.writeText(`E-mail: ${credencial.email}\nSenha provisória: ${credencial.senha}`);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  const botao = "min-h-[44px] px-4 rounded-full text-xs font-bold border-[1.5px] border-[#C9D3E0] bg-[#F4F7FB] disabled:opacity-60";

  return (
    <Cartao titulo="Equipe e permissões" descricao="Só o administrador altera. A empresa sempre mantém pelo menos um administrador.">
      {credencial && (
        <div role="status" className="rounded-[16px] bg-[#DDF3E4] text-[#14653A] p-4 flex flex-col gap-2">
          <div className="text-sm font-extrabold">
            {credencial.motivo === "criado" ? `Usuário criado: ${credencial.nome}` : `Nova senha provisória de ${credencial.nome}`}
          </div>
          <div className="text-sm font-semibold break-all">E-mail: {credencial.email}</div>
          <div className="text-sm font-semibold">
            Senha provisória: <span className="font-mono font-extrabold text-base select-all">{credencial.senha}</span>
          </div>
          {credencial.emailEnviado === true && <p className="text-xs font-bold">O acesso também foi enviado para {credencial.email}.</p>}
          {credencial.emailEnviado === false && <p className="text-xs font-bold text-[#7A4B00]">Não foi possível enviar o e-mail. Passe a senha à pessoa por outro canal.</p>}
          <p className="text-xs font-bold">
            Esta senha aparece só agora e não fica guardada em lugar nenhum. Passe para a pessoa por um canal seguro; ela vai precisar trocá-la no primeiro acesso.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copiar} className="min-h-[44px] px-4 rounded-full bg-[#14653A] text-white text-xs font-bold">
              {copiado ? "Copiado" : "Copiar e-mail e senha"}
            </button>
            <button type="button" onClick={() => setCredencial(null)} className="min-h-[44px] px-4 rounded-full bg-white text-[#14653A] text-xs font-bold">
              Já anotei, fechar
            </button>
          </div>
        </div>
      )}

      <ul className="flex flex-col divide-y divide-[#E3E9F2]">
        {membros.map((m) => (
          <li key={m.userId} className="py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-extrabold truncate">
                {m.nome}
                {m.userId === meuId && <span className="ml-2 text-[11px] font-bold rounded-full bg-[#DCE7FF] text-[#1B47B5] px-2 py-0.5">você</span>}
                {m.senhaProvisoria && <span className="ml-2 text-[11px] font-bold rounded-full bg-[#FFF0D1] text-[#7A4B00] px-2 py-0.5">ainda não trocou a senha</span>}
              </div>
              <div className="text-xs font-semibold text-[#3A4658] truncate">{m.email}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={`Papel de ${m.nome}`}
                className={`${classeInput} !w-[170px]`}
                value={m.papel}
                disabled={ocupado === m.userId}
                onChange={(e) => trocar(m, e.target.value)}
              >
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
                ))}
              </select>
              {m.userId !== meuId && (
                <>
                  <button type="button" disabled={ocupado === m.userId} onClick={() => redefinir(m)} className={botao}>Nova senha</button>
                  <button type="button" disabled={ocupado === m.userId} onClick={() => remover(m)} className={`${botao} !text-[#8E1B10]`}>Remover</button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {msg && <Aviso tipo={msg.tipo}>{msg.texto}</Aviso>}

      <form onSubmit={criar} className="rounded-[18px] bg-[#F4F7FB] p-4 flex flex-col gap-3">
        <h3 className="text-sm font-extrabold">Adicionar pessoa</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Campo rotulo="Nome" erro={erroForm?.campo === "nome" ? erroForm.texto : undefined}>
            <input className={classeInput} value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={80} autoComplete="off" />
          </Campo>
          <Campo rotulo="E-mail de acesso" erro={erroForm?.campo === "email" ? erroForm.texto : undefined}>
            <input type="email" className={classeInput} value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" autoCapitalize="none" />
          </Campo>
          <Campo rotulo="Papel">
            <select className={classeInput} value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
              {PAPEIS.map((p) => (
                <option key={p} value={p}>{ROTULO_PAPEL[p]}</option>
              ))}
            </select>
          </Campo>
        </div>
        {emailAtivo && (
          <label className="flex items-start gap-2 text-xs font-bold text-[#3A4658]">
            <input type="checkbox" checked={enviarEmail} onChange={(e) => setEnviarEmail(e.target.checked)} className="mt-0.5 w-5 h-5" />
            <span>
              Enviar o acesso (e-mail e senha provisória) para a pessoa por e-mail. Vale também para o botão "Nova senha".
              <span className="block font-medium text-[#5A6678]">A senha fica na caixa de e-mail dela até ser apagada; por isso ela é provisória e obrigatoriamente trocada no primeiro acesso.</span>
            </span>
          </label>
        )}
        {erroForm && !erroForm.campo && <Aviso tipo="erro">{erroForm.texto}</Aviso>}
        <div>
          <button type="submit" disabled={criando} className="min-h-[48px] px-6 rounded-full bg-[#2F5FE0] text-white font-bold text-sm disabled:opacity-60">
            {criando ? "Criando..." : "Criar usuário e gerar senha provisória"}
          </button>
        </div>
      </form>

      <p className="text-xs font-semibold text-[#3A4658]">
        Administrador altera os dados da empresa, a equipe e vê o Financeiro. Financeiro vê o Financeiro. Normal não vê nada de dinheiro (contas, cobranças, receitas).
      </p>
    </Cartao>
  );
}
