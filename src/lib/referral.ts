// Génère un code de parrainage court, lisible, non ambigu.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I, L, O, 0, 1

export function generateReferralCode(len = 7): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

// Récompenses
export const REFERRAL_REWARDS = {
  REFEREE_BONUS: 50,         // bonus immédiat pour le filleul
  REFERRER_SIGNUP: 100,      // bonus immédiat pour le parrain
  REFERRER_FIRST_PR: 200,    // quand le filleul valide son 1er chrono
  REFERRER_FIRST_BET: 200,   // quand le filleul place son 1er pari
};
