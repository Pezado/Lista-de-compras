export interface ParsedSignal {
  direction: 'PLAYER' | 'BANKER' | 'TIE' | 'WAIT' | 'UNKNOWN';
  martingales: number; // 0, 1, or 2
  status: 'AGUARDANDO' | 'CONFIRMADA' | 'GREEN' | 'RED' | 'CANCELADO';
  time: string; // HH:MM:SS
  source?: string; // e.g. "FootballStudioDice01" or "RIGOSINAIS"
}

export interface Signal {
  id: string;
  timestamp: string; // ISO date string
  rawText: string;
  parsed: ParsedSignal;
}

export interface Stats {
  totalChecked: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number; // e.g. 94.5%
  streak: number;
  maxStreak: number;
  byMartingale: {
    g0: number; // Win on direct entry
    g1: number; // Win on Gale 1
    g2: number; // Win on Gale 2
  };
}

export interface SimulationTemplate {
  name: string;
  text: string;
}
