import nodemailer from "nodemailer";

// Envio de e-mail por SMTP. Configuração só por variáveis de ambiente (nunca no código):
//   SMTP_HOST, SMTP_PORT (465 = TLS direto; 587 = STARTTLS), SMTP_USER, SMTP_PASS, SMTP_FROM
//   SMTP_SECURE=true|false (opcional; por padrão vale true só na porta 465)
// Sem SMTP_HOST e SMTP_FROM o sistema segue funcionando e as telas escondem as opções de e-mail.

export function emailConfigurado(): boolean {
  if (!process.env.SMTP_HOST?.trim() || !process.env.SMTP_FROM?.trim()) return false;
  // Com usuário definido, a senha é obrigatória: configuração pela metade não liga o e-mail
  // (evita mostrar opções de envio que fatalmente falhariam).
  if (process.env.SMTP_USER?.trim() && !process.env.SMTP_PASS) return false;
  return true;
}

function transporte() {
  const porta = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : porta === 465;
  const usuario = process.env.SMTP_USER?.trim();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!.trim(),
    port: porta,
    secure,
    auth: usuario ? { user: usuario, pass: process.env.SMTP_PASS ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

const escapar = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Layout simples e legível em qualquer leitor de e-mail. `linhas` são parágrafos de texto puro.
export function montarEmail(opcoes: { titulo: string; linhas: string[]; botao?: { texto: string; url: string }; rodape?: string }) {
  const { titulo, linhas, botao, rodape } = opcoes;
  const texto = [titulo, "", ...linhas, ...(botao ? ["", `${botao.texto}: ${botao.url}`] : []), ...(rodape ? ["", rodape] : [])].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#E9EEF5;font-family:Arial,Helvetica,sans-serif;color:#0F1720">
<div style="max-width:520px;margin:0 auto;padding:24px">
<div style="background:#fff;border-radius:20px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapar(titulo)}</h1>
${linhas.map((l) => `<p style="font-size:15px;line-height:1.5;margin:0 0 12px">${escapar(l)}</p>`).join("\n")}
${botao ? `<p style="margin:20px 0"><a href="${escapar(botao.url)}" style="background:#2F5FE0;color:#fff;text-decoration:none;font-weight:bold;padding:14px 24px;border-radius:999px;display:inline-block">${escapar(botao.texto)}</a></p><p style="font-size:12px;color:#3A4658;word-break:break-all">Se o botão não abrir, copie este endereço: ${escapar(botao.url)}</p>` : ""}
${rodape ? `<p style="font-size:12px;color:#3A4658;margin:20px 0 0">${escapar(rodape)}</p>` : ""}
</div></div></body></html>`;
  return { texto, html };
}

// Devolve true se o servidor SMTP aceitou a mensagem. Nunca lança: quem chama decide o que mostrar.
export async function enviarEmail(args: { para: string; assunto: string; texto: string; html: string }): Promise<boolean> {
  if (!emailConfigurado()) return false;
  try {
    await transporte().sendMail({ from: process.env.SMTP_FROM!.trim(), to: args.para, subject: args.assunto, text: args.texto, html: args.html });
    return true;
  } catch (e) {
    console.error("Falha ao enviar e-mail", (e as Error)?.message);
    return false;
  }
}

// Endereço público do sistema, para os links dos e-mails.
export function urlDoSistema(): string {
  const base = process.env.BETTER_AUTH_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://dedetiza-os.vercel.app");
  return base.replace(/\/+$/, "");
}
