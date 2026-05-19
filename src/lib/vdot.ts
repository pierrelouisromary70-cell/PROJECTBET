// VDOT — formules Jack Daniels (Running Formula)
// Permet de convertir un chrono sur une distance vers un VDOT,
// et inversement de prédire le chrono sur n'importe quelle distance.

// Vitesse en m/min utilisée par la formule de VO2 (Daniels & Gilbert).
// VO2(v) = -4.60 + 0.182258 * v + 0.000104 * v^2
// % VO2max(t) = 0.8 + 0.1894393 * e^(-0.012778 * t) + 0.2989558 * e^(-0.1932605 * t)
// VDOT = VO2(v) / %VO2max(t)

function vo2(velocityMperMin: number) {
  return -4.6 + 0.182258 * velocityMperMin + 0.000104 * velocityMperMin ** 2;
}

function pctVo2Max(timeMin: number) {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * timeMin) +
    0.2989558 * Math.exp(-0.1932605 * timeMin)
  );
}

export function vdotFromPerf(distanceM: number, timeSec: number): number {
  if (distanceM <= 0 || timeSec <= 0) return 0;
  const timeMin = timeSec / 60;
  const v = distanceM / timeMin; // m/min
  return vo2(v) / pctVo2Max(timeMin);
}

// Recherche binaire de la vitesse qui produit le vdot cible pour une distance donnée.
export function predictTimeSec(distanceM: number, targetVdot: number): number {
  let lo = 50; // m/min  (~50min/km, absurdement lent)
  let hi = 500; // m/min (~2min/km, élite mondiale)
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const t = distanceM / mid; // min
    const v = vo2(mid) / pctVo2Max(t);
    if (v < targetVdot) lo = mid;
    else hi = mid;
  }
  const vel = (lo + hi) / 2;
  return Math.round((distanceM / vel) * 60);
}

// Distances officielles courantes (mètres)
export const STANDARD_DISTANCES = [
  { label: "1500 m", m: 1500 },
  { label: "1 mile", m: 1609 },
  { label: "3000 m", m: 3000 },
  { label: "5 km", m: 5000 },
  { label: "10 km", m: 10000 },
  { label: "15 km", m: 15000 },
  { label: "10 miles", m: 16093 },
  { label: "Semi", m: 21097 },
  { label: "Marathon", m: 42195 },
] as const;

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function parseTimeToSec(input: string): number | null {
  // Accepte HH:MM:SS, MM:SS, MM:SS.s
  const parts = input.trim().split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || isNaN(Number(p)))) return null;
  let h = 0, m = 0, s = 0;
  if (parts.length === 3) [h, m, s] = parts.map(Number);
  else if (parts.length === 2) [m, s] = parts.map(Number);
  else if (parts.length === 1) s = Number(parts[0]);
  else return null;
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}
