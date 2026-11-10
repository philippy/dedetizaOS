// Regras de horário da agenda. O banco guarda só o início (AAAA-MM-DDTHH:MM);
// cada serviço é tratado como 1 hora até existir um campo de duração.

export const DURACAO_MIN = 60;

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

export function sobrepoe(inicioA: number, inicioB: number, dur = DURACAO_MIN): boolean {
  return inicioA < inicioB + dur && inicioB < inicioA + dur;
}

// Coloca lado a lado os cartões que se sobrepõem no tempo (ex.: dois técnicos no
// mesmo horário na visão da semana). Devolve a faixa de cada item e quantas faixas
// o grupo dele usa.
export function distribuirFaixas<T extends { inicio: number }>(itens: T[]): (T & { faixa: number; faixas: number })[] {
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
    fimFaixas[faixa] = it.inicio + DURACAO_MIN;
    fimGrupo = Math.max(fimGrupo, it.inicio + DURACAO_MIN);
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
