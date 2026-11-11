"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Modal } from "./modal";
import { formatBRL, formatDateBR } from "@/lib/utils";
import {
  PLACEHOLDER_PIX,
  horaAgoraSP,
  linkWhatsApp,
  montarMensagemCobranca,
  situacaoVencimento,
  type ContaCobranca,
  type PixConfig,
} from "@/lib/cobranca";

const inputCls = "h-12 w-full box-border border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 text-base text-[#0F1720] bg-white";
const labelCls = "flex flex-col gap-1.5 text-xs font-bold text-[#3A4658]";

// Cobrança por link do WhatsApp: mostra a mensagem pronta, a pessoa edita se quiser e o WhatsApp
// abre já preenchido. O envio final é feito dentro do WhatsApp.
export function CobrancaModal({ conta, hoje, pix, onClose, onAberto }: {
  conta: ContaCobranca;
  hoje: string;
  pix: PixConfig | null;
  onClose: () => void;
  onAberto: (contaId: number, hora: string) => void;
}) {
  const [telefone, setTelefone] = useState(conta.telefone);
  const [texto, setTexto] = useState(() => montarMensagemCobranca(conta, hoje, pix));
  const [aberto, setAberto] = useState(false);

  const sit = situacaoVencimento(conta.vencimento, hoje);
  const link = linkWhatsApp(telefone, texto);
  const semTelefone = telefone.trim() !== "" && !link;
  const faltaPix = texto.includes(PLACEHOLDER_PIX);
  const podeEnviar = !!link && !faltaPix && texto.trim() !== "";

  return (
    <Modal titleId="cobranca-titulo" onClose={onClose}>
      <div className="flex justify-between items-center gap-3">
        <h2 id="cobranca-titulo" className="text-[22px] font-extrabold m-0">Cobrar por WhatsApp</h2>
        <button onClick={onClose} aria-label="Fechar" className="w-11 h-11 shrink-0 rounded-full bg-[#E8ECF2] flex items-center justify-center">
          <X className="w-5 h-5" />
        </button>
      </div>

      {!aberto ? (
        <>
          <div className="flex items-center justify-between gap-3 bg-[#F4F7FB] rounded-2xl px-3.5 py-3">
            <div className="min-w-0">
              <div className="text-[15px] font-extrabold">{conta.quem}</div>
              <div className="text-xs font-medium text-[#3A4658] mt-0.5">
                {conta.oQue ? `${conta.oQue} · ` : ""}vence {formatDateBR(conta.vencimento).slice(0, 5)}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-base font-extrabold">{formatBRL(conta.valor)}</div>
              <span className={`inline-block mt-0.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${sit.chip}`}>{sit.longo}</span>
            </div>
          </div>

          <label className={labelCls}>
            WhatsApp do cliente
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 90000-0000"
              inputMode="tel"
              autoComplete="off"
              className={inputCls}
            />
          </label>
          {(semTelefone || telefone.trim() === "") && (
            <div role="alert" className="bg-[#FDE4E1] text-[#8E1B10] rounded-xl px-3 py-2 text-xs font-bold">
              Informe o número com DDD para abrir o WhatsApp.
            </div>
          )}

          <label className={labelCls}>
            Mensagem (você pode editar)
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={9}
              className="box-border w-full border-[1.5px] border-[#C9D3E0] rounded-[14px] px-3.5 py-3 text-base leading-[1.45] text-[#0F1720] resize-y font-[inherit]"
            />
          </label>

          {pix ? (
            <div className="text-xs font-medium text-[#3A4658] leading-[1.45]">
              Chave Pix na mensagem: <strong className="font-extrabold text-[#0F1720]">{pix.tipo} · {pix.chave}</strong>. Para usar outra só desta vez, edite o texto acima.
            </div>
          ) : (
            <div role="alert" className="bg-[#FFF0D1] text-[#7A4B00] rounded-xl px-3 py-2 text-xs font-bold leading-[1.45]">
              A chave Pix da empresa ainda não está configurada. Troque {PLACEHOLDER_PIX} no texto pela chave para liberar o envio.
            </div>
          )}

          <div>
            <div className="text-xs font-bold text-[#3A4658] mb-1.5">Prévia no WhatsApp{link ? ` · para ${telefone.trim()}` : ""}</div>
            <div className="bg-[#E4EBF3] rounded-[18px] p-3.5">
              <div className="max-w-[92%] ml-auto bg-[#DDF3E4] rounded-[16px_16px_4px_16px] px-3.5 py-2.5 text-sm font-medium leading-[1.45] whitespace-pre-wrap break-words">
                {texto}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[48px] border-[1.5px] border-[#0F1720] rounded-full px-5 text-sm font-bold">Cancelar</button>
            {podeEnviar ? (
              <a
                href={link!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  setAberto(true);
                  onAberto(conta.id, horaAgoraSP());
                }}
                className="inline-flex items-center min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold"
              >
                Enviar pelo WhatsApp
              </a>
            ) : (
              <button type="button" disabled className="min-h-[48px] rounded-full bg-[#2F5FE0] text-white px-6 text-sm font-bold opacity-45">
                Enviar pelo WhatsApp
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <div role="status" className="bg-[#DDF3E4] text-[#14653A] rounded-2xl px-4 py-3.5 text-sm font-bold leading-[1.5]">
            O WhatsApp abriu em outra aba com a mensagem para {conta.saudacao}. Falta só tocar em enviar por lá. Quando o pagamento chegar, dê baixa na conta.
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="min-h-[48px] rounded-full bg-[#0F1720] text-white px-6 text-sm font-bold">Fechar</button>
          </div>
        </>
      )}
    </Modal>
  );
}
