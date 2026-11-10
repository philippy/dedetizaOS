// Regras de horário da agenda. O banco guarda o início (AAAA-MM-DDTHH:MM) e a duração
// em minutos de cada serviço.

export const DURACAO_PADRAO = 60;

// Durações oferecidas nos formulários: de 30 min a 8 h, de meia em meia hora.
export const DURACOES: number[] = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

// 30 -> "30 min", 60 -> "1 h", 90 -> "1 h 30"
export function formatDuracao(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

// Horários oferecidos nos formulários: 06:00 a 19:30, de meia em meia hora.
export const HORARIOS: string[] = Array.from({ length: 28 }, (_, i) => {
  const m = 6 * 60 + i * 30;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});

export function minutosDe(dataHoraOuHora: string): number {
  const hhmm = dataHoraOuHora.length > 5 ? dataHoraOuHora.slice(11, 16) : dataHoraOuHora;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return (isNaN(h) ? 8 : h) * 60 + (isNaN(m) ? 0 : m);
}

export function horaDe(minutos: number): string {
  const m = ((minutos % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function sobrepoe(inicioA: number, durA: number, inicioB: number, durB: number): boolean {
  return inicioA < inicioB + durB && inicioB < inicioA + durA;
}

// Coloca lado a lado os cartões que se sobrepõem no tempo (ex.: dois técnicos no
// mesmo horário na visão da semana). Devolve a faixa de cada item e quantas faixas
// o grupo dele usa.
export function distribuirFaixas<T extends { inicio: number; duracao: number }>(itens: T[]): (T & { faixa: number; faixas: number })[] {
  const ordenados = [...itens].sort((a, b) => a.inicio - b.inicio);
  const saida: (T & { faixa: number; faixas: number })[] = [];
  let grupo: (T & { faixa: number; faixas: number })[] = [];
  let fimGrupo = -1;
  let fimFaixas: number[] = [];
  const fecharGrupo = () => {
    const n = Math.max(1, fimFaixas.length);
    grupo.forEach((g) => (g.faixas = n));
    saida.push(...grupo);
    grupo = [];
    fimFaixas = [];
  };
  for (const it of ordenados) {
    if (grupo.length && it.inicio >= fimGrupo) fecharGrupo();
    let faixa = fimFaixas.findIndex((fim) => fim <= it.inicio);
    if (faixa === -1) {
      faixa = fimFaixas.length;
      fimFaixas.push(0);
    }
    fimFaixas[faixa] = it.inicio + it.duracao;
    fimGrupo = Math.max(fimGrupo, it.inicio + it.duracao);
    grupo.push({ ...it, faixa, faixas: 1 });
  }
  if (grupo.length) fecharGrupo();
  return saida;
}

// Segunda-feira da semana de uma data ISO.
export function inicioDaSemana(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 = domingo
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7));
  return d.toISOString().slice(0, 10);
}
