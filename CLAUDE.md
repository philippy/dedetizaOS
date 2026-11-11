# Detetiza OS

Sistema de gestão da Dedetizadora Impacto (uma única empresa).
Toda a interface em português do Brasil.
Produção: https://dedetiza-os.vercel.app (deploy automático a cada push na `main`).

## Escopo (MVP)
Início, Agenda, Clientes, Serviços, Financeiro (contas a pagar e a receber) e Campanhas.
Fora do escopo: IA, leitura de comprovante Pix, app offline do técnico, perfis de acesso,
Gerente Digital, certificados, atendente automático e qualquer integração/API do WhatsApp.
Entra só a cobrança por LINK do WhatsApp (wa.me), sem API, sem número comercial e sem envio automático.

## Protótipo
As telas de referência estão em `prototipo/`. Leia `prototipo/README.md` antes de criar ou
mudar qualquer tela. Os `.dc.html` são referência de layout, estilos, textos e regras.
Não copie o formato: reconstrua em Next.js + Tailwind.
Desempate: sobre O QUE existe, vale este Escopo. Sobre COMO fica na tela, vale o protótipo.
Dados dos protótipos são de exemplo e não vão para o banco.

## Stack
- Next.js 15 (App Router, TypeScript strict)
- Drizzle ORM + Neon Postgres
- Better Auth, só e-mail e senha
- Tailwind (componentes feitos à mão), validação com Zod

## Modelo de dados
- tecnicos: nome, telefone, cor, ativo
- clientes: tipo (PF/PJ), nome, documento, whatsapp, email, endereco, observacoes
- tipos_servico: nome, preco, duracao_min (padrão ao agendar), imagem (foto em data URL, reduzida no navegador; só a tela Serviços lê, as outras usam `tipoServicoColunas`)
- servicos: cliente_id, tipo_servico_id, tecnico_id, data_hora, duracao_min, valor,
  status (agendado, concluido, cancelado), observacoes
- lancamentos: tipo (receber, pagar), descricao, cliente_id ou fornecedor, servico_id,
  inscricao_id, vencimento, valor, status (aberto, pago), pago_em
- campanhas: nome, local, data_inicio, data_fim, desconto_pct, unidades, tipos_servico_ids (vazio = todo o catálogo),
  status (agendada, finalizada, cancelada)
- inscricoes: campanha_id, tipo_servico_id, unidade, morador, telefone, valor, pago
- empresas: nome, cnpj, endereco, telefone, email, responsavel, pix_tipo, pix_chave, pix_favorecido,
  pix_atualizado_em/por (quem mexeu na chave), atualizado_em/por. Hoje existe uma só.
- membros: user_id (um por usuário), empresa_id, papel (admin, financeiro, normal), telefone.
  `empresa_id` já existe aqui, mas as tabelas de negócio (clientes, servicos, lancamentos...) AINDA NÃO têm
  `empresa_id`: antes de atender uma segunda empresa é preciso incluí-lo nelas e filtrar todas as consultas.
Valores em centavos (integer). Datas em texto ISO (`AAAA-MM-DD`, `AAAA-MM-DDTHH:MM`).

## Segurança (não remover)
- Toda Server Action em `src/actions` começa com `await requireSession()`. Uma Server
  Action é um endpoint público: sem isso, qualquer pessoa chama sem login.
- O cadastro só aceita o primeiro usuário (hook em `src/lib/auth.ts`). `ALLOW_SIGNUP=true`
  libera de novo.
- Permissões: papel vem da tabela `membros`, lido no servidor por `obterContexto()` (`src/lib/contexto.ts`). Regras em
  `src/lib/permissoes.ts` (`pode(papel, acao)`). Toda Server Action de dados da empresa ou da equipe usa `autorizar(acao)`;
  a empresa vem da sessão, nunca do navegador. Hoje só `empresa.editar` e `equipe.gerenciar` (só admin) dependem do papel;
  Financeiro e Normal veem as mesmas telas. Sempre deve restar um administrador (checado numa única instrução SQL).
- Trocar a chave Pix (tipo, chave ou favorecido) pede a senha do usuário e grava quem/quando. Não tirar.
- Nada de rotinas que gravam ou apagam dados ao abrir uma página (seed, limpeza,
  migração). Dados de demonstração só com `npm run seed:demo`, em banco de teste.
- Nunca enviar ao GitHub `.env*` nem a pasta `dados/`.

## Regras
- Ler dados em Server Components e gravar com Server Actions. Sem API REST.
- Não instalar bibliotecas além da stack sem perguntar.
- Moeda R$ 1.234,56, datas dd/mm/aaaa, fuso America/Sao_Paulo (helpers em `src/lib/utils.ts`).
- Conflito de agenda: serviços do mesmo técnico no mesmo dia não podem se sobrepor, considerando a duração de cada um.
- Editar serviço concluído com conta em aberto atualiza valor e cliente da conta; com conta paga, valor e cliente ficam travados. Serviço concluído não pode ser cancelado.
- Importação de clientes: `/clientes/importar` (cola do Excel ou CSV, limpeza em `src/lib/importar-clientes.ts`).
- Excluir serviço = mudar status para cancelado. Lançamento pago não pode ser excluído.
- Ao concluir um serviço, criar o lançamento a receber: vence hoje para PF e em 30 dias para PJ.
- Cada inscrição de campanha cria um lançamento a receber.
- Cobrança por WhatsApp (botão "Cobrar" nas contas a receber em aberto, no Início e no Financeiro): modal com a mensagem
  pronta e editável, que abre `wa.me` com o texto. Regras em `src/lib/cobranca.ts`, modal em `src/components/cobranca-modal.tsx`.
  O envio final é feito pela pessoa dentro do WhatsApp; o sistema não grava que cobrou (a hora "WhatsApp aberto" só vale na tela aberta).
  A chave Pix da mensagem vem dos Dados da empresa (`pixDaEmpresa()` em `src/lib/contexto.ts`). As variáveis da Vercel
  `PIX_CHAVE`, `PIX_TIPO`, `PIX_FAVORECIDO` só valem como plano B enquanto a chave nunca foi salva na tela (remover depois).
  Sem chave o modal avisa e bloqueia o envio até a chave ser digitada no texto.
- Configurações (menu do avatar, canto superior direito: Minha conta, Dados da empresa, Sair; não é um sétimo item do menu lateral):
  `/configuracoes/conta` (nome, telefone, troca de senha) e `/configuracoes/empresa` (dados da empresa, chave Pix e,
  só para admin, Equipe e permissões). Validação de CNPJ (numérico e alfanumérico), CPF, telefone e chave Pix em `src/lib/validacao.ts`.
  O nome da empresa no topo, no título da aba e na cobrança vem desses dados. Ainda não existe cadastro de novos usuários pela tela
  (o cadastro público só aceita o primeiro usuário; `ALLOW_SIGNUP=true` reabre).
- Início: toque em um serviço de hoje ou em uma conta vencida/que vence hoje abre um modal com os detalhes.
- Visual: fundo #E9EEF5, cartões brancos, texto #0F1720, primária #2F5FE0, a receber verde
  #14653A sobre #DDF3E4, a pagar vermelho #8E1B10 sobre #FDE4E1, fonte Plus Jakarta Sans,
  botões em pílula, áreas de toque de no mínimo 44 px.
- Menu lateral: Início, Agenda, Clientes, Serviços, Financeiro, Campanhas. No celular vira menu inferior.
- Toda tela precisa funcionar no celular.
- O app conecta com DATABASE_URL (pooled). O drizzle-kit usa DATABASE_URL_UNPOOLED.
- Variáveis de banco na Vercel (Production): `DATABASE_URL` e `DATABASE_URL_UNPOOLED` foram criadas à mão e a integração Neon↔Vercel está DESCONECTADA (10/11/2026). O passo "Create database branch for deployment" da integração estourava o tempo antes do build e derrubava todos os deploys ("Resource provisioning timed out"). Não reconectar a integração nem apagar essas variáveis sem necessidade. Se a senha do banco mudar na Neon, atualizar as duas variáveis na Vercel e fazer Redeploy. Deploys de Preview ficam sem banco.
- Ao terminar cada etapa, rodar `npm run typecheck` e `npm run build` e corrigir os erros.

## Desenvolvimento local
- Mudou `src/db/schema.ts`? Aplique com `npm run db:push` no banco de teste. Em produção o deploy NÃO muda o banco: escreva um SQL aditivo em `db/migracoes/` (ADD COLUMN IF NOT EXISTS, com DEFAULT) e peça para rodar no SQL Editor da Neon ANTES de publicar o código. Não usar `drizzle-kit push` no build: ele recusa mudanças em silêncio e o deploy sai quebrado.
- `.env.local` com `DATABASE_URL`. Se apontar para um Postgres em localhost/127.0.0.1,
  o app usa o driver `pg` em vez do Neon (ver `src/db/index.ts`).
- Banco novo: `npm run db:push` cria as tabelas; `npm run seed:demo` insere dados de exemplo
  (`src/lib/demo-data.ts`). `npm run seed:demo -- --reset` apaga os dados de negócio e recarrega.

## Comandos
- npm run dev
- npm run typecheck
- npm run build
- npm run db:push
- npm run seed:demo
