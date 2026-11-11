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
- membros: user_id (um por usuário), empresa_id, papel (admin, financeiro, normal), telefone, senha_provisoria,
  pix_falhas/pix_ultima_falha/pix_bloqueado_ate (limite de senha na troca da chave Pix).
- auditoria: registro de atividades (empresa_id, quando, ator_id/nome/email, acao, alvo_id/nome/email, detalhe). SEM chave estrangeira para o
  usuário: guarda nome e e-mail no momento do fato, então o histórico sobrevive à remoção da conta. Só o admin lê (Dados da empresa). Nunca apagar linhas.
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
  a empresa vem da sessão, nunca do navegador. Ações: `empresa.editar` e `equipe.gerenciar` (só admin) e `financeiro.acessar`
  (admin e financeiro). O papel Normal não vê o item Financeiro no menu, `/financeiro` redireciona para o Início, e os dados de dinheiro
  nem são lidos no servidor para ele: KPIs e painel de contas do Início, Cobrar, "Pagamento" no modal do serviço, LTV/pendente/atraso e
  chips de pagamento do cliente, "Total pago" em Clientes, receita em Campanhas e "Marcar como pago". As ações que gravam dinheiro
  (baixa, criar/excluir conta, marcar inscrição paga) conferem `financeiro.acessar` no servidor. O preço do serviço continua visível.
  Sempre deve restar um administrador (checado numa única instrução SQL).
- Trocar a chave Pix (tipo, chave ou favorecido) pede a senha do usuário e grava quem/quando. Não tirar. Limite: 3 senhas erradas bloqueiam a
  troca por 1 hora (`src/lib/pix-limite.ts`; a tentativa é reservada numa única instrução SQL ANTES de conferir a senha, para a rajada paralela
  não furar o limite). Com SMTP, o admin pode desbloquear por link enviado ao seu e-mail (30 min, uso único, só vale logado na mesma conta, confirma
  por clique/POST, nunca ao abrir o link).
- Registro de atividades (`src/lib/auditoria.ts`, `registrarAuditoria`): grava equipe (criar/remover/papel/nova senha/senha definida), dados da empresa,
  Pix (alterado/bloqueado/desbloqueado) e dinheiro (baixa, criar/excluir conta a pagar, marcar inscrição paga). É melhor esforço: se a gravação falhar,
  a ação não é desfeita. Ao criar uma ação nova que mexe em dinheiro, em permissão ou em dados da empresa, registre-a. Remover usuário avisa que é irreversível
  e que o histórico dele permanece.
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
  O nome da empresa no topo, no título da aba e na cobrança vem desses dados.
  O administrador cria usuários em Equipe e permissões (nome, e-mail, papel): o sistema gera uma senha provisória, mostrada UMA vez
  na tela (não é guardada em texto; só o hash) e a pessoa é obrigada a trocá-la no primeiro acesso (`membros.senha_provisoria`;
  `(app)/layout.tsx` mostra só a tela de troca enquanto a flag estiver ligada, e a ação de troca confere a senha provisória).
  Também há "Nova senha" (gera outra provisória e derruba as sessões) e "Remover" (apaga a conta; não remove a si mesmo nem o último admin).
  O cadastro público continua só para o primeiro usuário (`ALLOW_SIGNUP=true` reabre).
  E-mail (`src/lib/email.ts`, nodemailer 10.3.1 fixado): SMTP só por variáveis de ambiente `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
  (`SMTP_SECURE` opcional). Sem `SMTP_HOST` e `SMTP_FROM` o sistema funciona e as telas escondem as opções de e-mail. Usos: desbloqueio do Pix, envio opcional do
  acesso ao criar usuário / gerar nova senha, e "Esqueci minha senha" (`/esqueci-senha` e `/redefinir-senha`, link de 1 hora, derruba sessões e dispensa a troca da provisória).
  Nunca colocar credenciais SMTP no código nem em arquivo versionado.
  A troca obrigatória é barreira de tela (layout), não de cada ação; o login tem limite de tentativas do Better Auth.
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
