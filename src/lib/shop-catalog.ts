// Catalogue boutique — basé sur le marché actuel des paires de course (2026)
// et du textile running. Les prix en jetons s'inspirent du prix réel en euros,
// avec une non-linéarité forte pour rendre les paires carbones très rares.

export type CatalogItem = {
  id: string;
  category: "shoes" | "shirt" | "shorts" | "socks" | "cap" | "glasses";
  brand: string;
  model: string;
  tier: "entry" | "mid" | "premium" | "carbon";
  priceTokens: number;
  imageEmoji: string;
  description: string;
};

// Conversion volontairement non-linéaire :
//  - paire d'entrée  ~  60€  →    400 jetons
//  - paire premium  ~ 180€  →   2 000 jetons
//  - paire carbone  ~ 280€  →  15 000 jetons (rareté !)
//  - paire élite    ~ 300€+ →  25 000 jetons

export const CATALOG: CatalogItem[] = [
  // ---------- CHAUSSURES — ENTRY ----------
  { id: "shoes_nike_pegasus_41", category: "shoes", brand: "Nike", model: "Pegasus 41", tier: "entry", priceTokens: 450, imageEmoji: "👟", description: "Chaussure d'entrée polyvalente, parfaite pour tes premiers kilomètres." },
  { id: "shoes_asics_cumulus_27", category: "shoes", brand: "Asics", model: "Gel-Cumulus 27", tier: "entry", priceTokens: 480, imageEmoji: "👟", description: "Amorti FF Blast+ confortable pour endurance fondamentale." },
  { id: "shoes_brooks_ghost_17", category: "shoes", brand: "Brooks", model: "Ghost 17", tier: "entry", priceTokens: 460, imageEmoji: "👟", description: "Le best-seller américain, neutre et tolérant." },
  { id: "shoes_hoka_clifton_10", category: "shoes", brand: "Hoka", model: "Clifton 10", tier: "entry", priceTokens: 550, imageEmoji: "👟", description: "Amorti maximaliste signature Hoka." },

  // ---------- CHAUSSURES — MID ----------
  { id: "shoes_saucony_endo_speed_5", category: "shoes", brand: "Saucony", model: "Endorphin Speed 5", tier: "mid", priceTokens: 1800, imageEmoji: "🥾", description: "Plaque nylon, PWRRUN PB. La pépite polyvalente." },
  { id: "shoes_asics_novablast_5", category: "shoes", brand: "Asics", model: "Novablast 5", tier: "mid", priceTokens: 1600, imageEmoji: "🥾", description: "Sensation rebond, idéale pour fractionner sans plaque." },
  { id: "shoes_hoka_mach_6", category: "shoes", brand: "Hoka", model: "Mach 6", tier: "mid", priceTokens: 1700, imageEmoji: "🥾", description: "Légère et nerveuse, parfaite pour tempo run." },
  { id: "shoes_puma_deviate_nitro_3", category: "shoes", brand: "Puma", model: "Deviate Nitro 3", tier: "mid", priceTokens: 1900, imageEmoji: "🥾", description: "Plaque nylon Pwrplate, mousse Nitro Elite." },

  // ---------- CHAUSSURES — PREMIUM ----------
  { id: "shoes_nike_vomero_18", category: "shoes", brand: "Nike", model: "Vomero 18", tier: "premium", priceTokens: 2400, imageEmoji: "👠", description: "Double mousse ZoomX + ReactX. Top niveau premium daily." },
  { id: "shoes_asics_superblast_2", category: "shoes", brand: "Asics", model: "Superblast 2", tier: "premium", priceTokens: 3200, imageEmoji: "👠", description: "Deux mousses superposées, le daily trainer le plus convoité." },
  { id: "shoes_newbal_supercomp_trainer_v3", category: "shoes", brand: "New Balance", model: "SC Trainer v3", tier: "premium", priceTokens: 3000, imageEmoji: "👠", description: "Mousse FuelCell PEBA + plaque carbone d'entraînement." },

  // ---------- CHAUSSURES — CARBON (rares & chères) ----------
  { id: "shoes_nike_alphafly_3", category: "shoes", brand: "Nike", model: "Alphafly 3", tier: "carbon", priceTokens: 15000, imageEmoji: "🚀", description: "Plaque carbone + Air Zoom. La chaussure des records mondiaux marathon." },
  { id: "shoes_nike_vaporfly_4", category: "shoes", brand: "Nike", model: "Vaporfly 4", tier: "carbon", priceTokens: 14000, imageEmoji: "🚀", description: "L'arme légère pour le 10K-semi rapide." },
  { id: "shoes_adidas_adios_pro_4", category: "shoes", brand: "Adidas", model: "Adios Pro 4", tier: "carbon", priceTokens: 15500, imageEmoji: "🚀", description: "Lightstrike Pro + Energyrods 2.0." },
  { id: "shoes_asics_metaspeed_sky_paris", category: "shoes", brand: "Asics", model: "Metaspeed Sky Paris", tier: "carbon", priceTokens: 16000, imageEmoji: "🚀", description: "Pour les coureurs à grande amplitude." },
  { id: "shoes_asics_metaspeed_edge_paris", category: "shoes", brand: "Asics", model: "Metaspeed Edge Paris", tier: "carbon", priceTokens: 16000, imageEmoji: "🚀", description: "Pour les coureurs à haute cadence." },
  { id: "shoes_saucony_endo_elite_2", category: "shoes", brand: "Saucony", model: "Endorphin Elite 2", tier: "carbon", priceTokens: 18000, imageEmoji: "🚀", description: "PWRRUN HG, plaque carbone Carbitex." },
  { id: "shoes_puma_fastr_nitro_elite_3", category: "shoes", brand: "Puma", model: "Fast-R Nitro Elite 3", tier: "carbon", priceTokens: 17000, imageEmoji: "🚀", description: "Construction décollée, agressive et radicale." },
  { id: "shoes_nb_supercomp_elite_v5", category: "shoes", brand: "New Balance", model: "SC Elite v5", tier: "carbon", priceTokens: 16500, imageEmoji: "🚀", description: "Empilement énorme, FuelCell PEBA + plaque carbone." },
  { id: "shoes_hoka_rocket_x3", category: "shoes", brand: "Hoka", model: "Rocket X3", tier: "carbon", priceTokens: 15500, imageEmoji: "🚀", description: "Carbone Hoka, profilée pour les distances rapides." },
  { id: "shoes_on_cloudboom_strike_ls", category: "shoes", brand: "On", model: "Cloudboom Strike LS", tier: "carbon", priceTokens: 25000, imageEmoji: "💎", description: "LightSpray, ultra-rare. Le rêve interdit." },

  // ---------- TEXTILE — TEE-SHIRTS ----------
  { id: "shirt_basic_white", category: "shirt", brand: "Generic", model: "Tee blanc basique", tier: "entry", priceTokens: 80, imageEmoji: "👕", description: "Coton standard." },
  { id: "shirt_nike_miler", category: "shirt", brand: "Nike", model: "Dri-FIT Miler", tier: "mid", priceTokens: 280, imageEmoji: "👕", description: "Technique respirant." },
  { id: "shirt_satisfy_techsilk", category: "shirt", brand: "Satisfy", model: "TechSilk", tier: "premium", priceTokens: 1400, imageEmoji: "👕", description: "Soie technique, le luxe du running." },
  { id: "shirt_distance_iconic_singlet", category: "shirt", brand: "District Vision", model: "Air-Wear Singlet", tier: "premium", priceTokens: 1100, imageEmoji: "🎽", description: "Singlet de compétition élégant." },

  // ---------- TEXTILE — SHORTS ----------
  { id: "shorts_basic", category: "shorts", brand: "Generic", model: "Short basique", tier: "entry", priceTokens: 100, imageEmoji: "🩳", description: "Pour démarrer." },
  { id: "shorts_nike_stride", category: "shorts", brand: "Nike", model: "Stride 5\"", tier: "mid", priceTokens: 350, imageEmoji: "🩳", description: "Avec poche intégrée." },
  { id: "shorts_bandit_track", category: "shorts", brand: "Bandit Running", model: "Track Short", tier: "premium", priceTokens: 950, imageEmoji: "🩳", description: "Coupe race fine." },
  { id: "shorts_soar_race_split", category: "shorts", brand: "Soar", model: "Race Split", tier: "premium", priceTokens: 1500, imageEmoji: "🩳", description: "Le short de course de l'élite." },

  // ---------- CHAUSSETTES ----------
  { id: "socks_basic", category: "socks", brand: "Generic", model: "Chaussettes coton", tier: "entry", priceTokens: 40, imageEmoji: "🧦", description: "Basiques." },
  { id: "socks_balega_hidden", category: "socks", brand: "Balega", model: "Hidden Comfort", tier: "mid", priceTokens: 180, imageEmoji: "🧦", description: "Les invisibles confortables." },
  { id: "socks_stance_run_crew", category: "socks", brand: "Stance", model: "Run Crew", tier: "premium", priceTokens: 320, imageEmoji: "🧦", description: "Compression douce." },

  // ---------- CASQUETTES ----------
  { id: "cap_basic", category: "cap", brand: "Generic", model: "Casquette unie", tier: "entry", priceTokens: 120, imageEmoji: "🧢", description: "Pour le soleil." },
  { id: "cap_ciele_gocap", category: "cap", brand: "Ciele Athletics", model: "GOCap", tier: "premium", priceTokens: 800, imageEmoji: "🧢", description: "L'icône running." },
  { id: "cap_satisfy_peaceshell", category: "cap", brand: "Satisfy", model: "Peaceshell Cap", tier: "premium", priceTokens: 1200, imageEmoji: "🧢", description: "Premium running headwear." },

  // ---------- LUNETTES ----------
  { id: "glasses_basic", category: "glasses", brand: "Generic", model: "Lunettes basiques", tier: "entry", priceTokens: 200, imageEmoji: "🕶️", description: "Anti-UV simple." },
  { id: "glasses_oakley_radar_ev", category: "glasses", brand: "Oakley", model: "Radar EV Path", tier: "premium", priceTokens: 2200, imageEmoji: "🕶️", description: "Prizm, la référence sport." },
  { id: "glasses_district_vision_keiichi", category: "glasses", brand: "District Vision", model: "Keiichi", tier: "premium", priceTokens: 3500, imageEmoji: "🕶️", description: "Lunettes de méditation cinétique." },
];

export const findItem = (id: string) => CATALOG.find((c) => c.id === id);
