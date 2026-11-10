# Protótipo de referência

Telas exportadas do protótipo "Detetiza OS — Protótipo" (claude.ai, Design) em 10/11/2026.
Os arquivos `.dc.html` são referência de layout, estilos, textos e regras de tela.
Não abrem sozinhos (dependem do runtime do Design) e não devem ser copiados como formato:
reconstrua em Next.js + Tailwind seguindo o que eles mostram.

Os dados que aparecem nas telas são de exemplo e não vão para o banco.

| Módulo | Arquivo | Ignorar (fora do MVP) |
|---|---|---|
| Layout e Início | `Main.dc.html` (inclui o modal "Novo serviço") | Gerente Digital, Consumo do plano, Certificados |
| Agenda e Serviços | `Agenda.dc.html` | — |
| Clientes | `Clientes.dc.html`, `Cliente.dc.html` | Enviar lembrete, Nova campanha |
| Financeiro | `Financeiro.dc.html` | Baixa por comprovante Pix com IA |
| Campanhas | `Campanhas.dc.html`, `Campanha.dc.html` | Comprovante Pix, CPF do morador |

Ficam fora deste pacote de propósito: Gerente Digital, App do técnico, Atendente no WhatsApp
e Certificado de execução.

Desempate: sobre O QUE existe, vale o escopo do `CLAUDE.md`. Sobre COMO fica na tela, vale o protótipo.
