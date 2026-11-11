// Papéis e permissões. Regras puras, sem acesso a banco, para valer no servidor e nas telas.
// Hoje só duas ações dependem do papel. Para restringir outra área (ex.: Financeiro só para
// admin e financeiro), crie a ação aqui e confira com `pode()` na tela e na Server Action.

export const PAPEIS = ["admin", "financeiro", "normal"] as const;
export type Papel = (typeof PAPEIS)[number];

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  financeiro: "Financeiro",
  normal: "Normal",
};

export type Acao = "empresa.editar" | "equipe.gerenciar" | "financeiro.acessar" | "dados.escrever";

const QUEM_PODE: Record<Acao, readonly Papel[]> = {
  "empresa.editar": ["admin"],
  "equipe.gerenciar": ["admin"],
  // Tela Financeiro, contas a pagar e a receber, cobrança, baixa e os totais de dinheiro das outras telas.
  "financeiro.acessar": ["admin", "financeiro"],
  // Gravar clientes, serviços, técnicos e campanhas da própria empresa. Exige vínculo com uma empresa (ver autorizar()).
  "dados.escrever": ["admin", "financeiro", "normal"],
};

export function ehPapel(valor: unknown): valor is Papel {
  return typeof valor === "string" && (PAPEIS as readonly string[]).includes(valor);
}

export function pode(papel: Papel, acao: Acao): boolean {
  return QUEM_PODE[acao].includes(papel);
}
