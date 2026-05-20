// Catalogue boutique — marques et modèles 100 % fictifs.
// Quatre marques imaginaires pour donner de la personnalité :
//   • Stride Co   → daily polyvalent, ton accessible
//   • Nimbus      → confort maximaliste
//   • Velox       → tempo / compétition légère
//   • Aether      → premium technique
//   • Helion      → carbone racing, élite (le rêve)
//
// Les noms montent en intensité selon le tier : "Daily 1" → "Phantom Carbon Elite".

export type CatalogItem = {
  id: string;
  category: "shoes" | "shirt" | "shorts" | "socks" | "cap" | "glasses" | "watch" | "belt";
  brand: string;
  model: string;
  tier: "entry" | "mid" | "premium" | "carbon" | "limited";
  priceTokens: number;
  imageEmoji: string;
  description: string;
  availableUntil?: string;
};

export const CATALOG: CatalogItem[] = [
  // ---------- CHAUSSURES — ENTRY ----------
  { id: "shoes_stride_daily_1", category: "shoes", brand: "Stride Co", model: "Daily 1", tier: "entry", priceTokens: 420, imageEmoji: "👟", description: "Ta première paire. Amorti franc, semelle souple, pour démarrer sans se ruiner." },
  { id: "shoes_nimbus_cloud", category: "shoes", brand: "Nimbus", model: "Cloud", tier: "entry", priceTokens: 480, imageEmoji: "👟", description: "Mousse moelleuse, parfait pour les sorties longues sans contrainte." },
  { id: "shoes_velox_start", category: "shoes", brand: "Velox", model: "Start", tier: "entry", priceTokens: 460, imageEmoji: "👟", description: "Plus dynamique que la moyenne, pour les premières accélérations." },
  { id: "shoes_stride_trail_basic", category: "shoes", brand: "Stride Co", model: "Trail Basic", tier: "entry", priceTokens: 550, imageEmoji: "👟", description: "Crampons d'entrée, idéal pour sortir du goudron sans se ruiner." },

  // ---------- CHAUSSURES — MID ----------
  { id: "shoes_velox_speed_3", category: "shoes", brand: "Velox", model: "Speed 3", tier: "mid", priceTokens: 1700, imageEmoji: "🥾", description: "Plaque nylon, mousse réactive. Le couteau-suisse tempo / fartlek." },
  { id: "shoes_nimbus_vapor_2", category: "shoes", brand: "Nimbus", model: "Vapor 2", tier: "mid", priceTokens: 1600, imageEmoji: "🥾", description: "Drop modéré, sensation de rebond sans plaque carbone." },
  { id: "shoes_aether_lift", category: "shoes", brand: "Aether", model: "Lift", tier: "mid", priceTokens: 1800, imageEmoji: "🥾", description: "Construction premium, parfait daily trainer pour gros volumes." },
  { id: "shoes_helion_tempo", category: "shoes", brand: "Helion", model: "Tempo", tier: "mid", priceTokens: 1950, imageEmoji: "🥾", description: "Plaque souple, sensation course sans la fragilité du carbone." },

  // ---------- CHAUSSURES — PREMIUM ----------
  { id: "shoes_aether_tempest", category: "shoes", brand: "Aether", model: "Tempest", tier: "premium", priceTokens: 2600, imageEmoji: "👠", description: "Double mousse PEBA, plaque renforcée. Le daily de haut niveau." },
  { id: "shoes_velox_apex", category: "shoes", brand: "Velox", model: "Apex", tier: "premium", priceTokens: 2900, imageEmoji: "👠", description: "Drop bas, mousse vive, tout pour les séances rapides à répétition." },
  { id: "shoes_nimbus_stratos", category: "shoes", brand: "Nimbus", model: "Stratos", tier: "premium", priceTokens: 3100, imageEmoji: "👠", description: "Empilement record et rebond ahurissant. Pour avaler les ultras." },
  { id: "shoes_helion_pulse_x", category: "shoes", brand: "Helion", model: "Pulse X", tier: "premium", priceTokens: 3400, imageEmoji: "👠", description: "Plaque carbone d'entraînement. Pour s'habituer à la vitesse." },

  // ---------- CHAUSSURES — CARBON (rares, prix de rêve) ----------
  { id: "shoes_helion_phantom_carbon", category: "shoes", brand: "Helion", model: "Phantom Carbon", tier: "carbon", priceTokens: 15000, imageEmoji: "🚀", description: "Le mythe. Plaque pleine carbone, mousse PEBA aérienne. Légère comme une plume, explosive comme un sprinteur." },
  { id: "shoes_velox_cometa_x", category: "shoes", brand: "Velox", model: "Cometa X", tier: "carbon", priceTokens: 14000, imageEmoji: "🚀", description: "Construction radicale, géométrie agressive. Conçue pour le 10 km — semi le plus rapide de ta vie." },
  { id: "shoes_aether_stellar_race", category: "shoes", brand: "Aether", model: "Stellar Race", tier: "carbon", priceTokens: 15500, imageEmoji: "🚀", description: "Plaque Helix Carbon™ et mousse Aerocell™. Une étoile sous chaque pied." },
  { id: "shoes_nimbus_aurora_pro", category: "shoes", brand: "Nimbus", model: "Aurora Pro", tier: "carbon", priceTokens: 16500, imageEmoji: "🚀", description: "Empilement maximaliste + carbone. La machine à marathon ultra-confort." },
  { id: "shoes_helion_vortex_elite", category: "shoes", brand: "Helion", model: "Vortex Elite", tier: "carbon", priceTokens: 17000, imageEmoji: "🚀", description: "Pour grandes amplitudes : amortit fort, propulse plus fort encore." },
  { id: "shoes_helion_nebula_rx", category: "shoes", brand: "Helion", model: "Nebula RX", tier: "carbon", priceTokens: 17000, imageEmoji: "🚀", description: "Variante cadence : plus directe, plus stable, taillée pour les pieds rapides." },
  { id: "shoes_aether_hyperion", category: "shoes", brand: "Aether", model: "Hyperion", tier: "carbon", priceTokens: 18000, imageEmoji: "🚀", description: "L'arsenal complet : double plaque, mousse à étages, drop modéré." },
  { id: "shoes_velox_solaris", category: "shoes", brand: "Velox", model: "Solaris", tier: "carbon", priceTokens: 15500, imageEmoji: "🚀", description: "Compromis idéal entre stabilité et explosivité. Pour les sub-3 marathon." },
  { id: "shoes_stride_meteora", category: "shoes", brand: "Stride Co", model: "Meteora", tier: "carbon", priceTokens: 14500, imageEmoji: "🚀", description: "Le premier carbone abordable de Stride Co. Sans concession sur la mousse." },
  { id: "shoes_quartz_eclipse", category: "shoes", brand: "Quartz", model: "Eclipse Carbon", tier: "carbon", priceTokens: 25000, imageEmoji: "💎", description: "Production ultra-limitée, projection sur la peau du pied, semelle décollée. La paire que personne ne possède." },

  // ---------- ÉDITIONS LIMITÉES ----------
  { id: "shoes_helion_phantom_aurora", category: "shoes", brand: "Helion", model: "Phantom Carbon « Aurora Edition »", tier: "limited", priceTokens: 22000, imageEmoji: "🌸", description: "Coloris numéroté inspiré des aurores boréales. Drop éphémère." },
  { id: "shoes_aether_stellar_gold", category: "shoes", brand: "Aether", model: "Stellar Race « Gold »", tier: "limited", priceTokens: 24000, imageEmoji: "🏅", description: "Empiècements dorés, semelle iridescente. Édition exclusive de courte fenêtre." },
  { id: "watch_apex_orion_signature", category: "watch", brand: "Apex Watch Co", model: "Orion Signature", tier: "limited", priceTokens: 18000, imageEmoji: "🌟", description: "Boîtier titane brossé et cadran cosmique. Numérotée à 100 exemplaires." },

  // ---------- TEXTILE — HAUTS ----------
  { id: "shirt_basic_white", category: "shirt", brand: "Basic Lab", model: "Tee Essentiel", tier: "entry", priceTokens: 80, imageEmoji: "👕", description: "Coton respirable. La base." },
  { id: "shirt_drift_dry", category: "shirt", brand: "Drift", model: "Dry Tee", tier: "mid", priceTokens: 280, imageEmoji: "👕", description: "Tissu technique micro-perforé." },
  { id: "shirt_lumen_aerosilk", category: "shirt", brand: "Lumen", model: "Aerosilk", tier: "premium", priceTokens: 1400, imageEmoji: "👕", description: "Maille silk-tech, ultra-légère, sensation seconde peau. Le luxe discret." },
  { id: "shirt_lumen_singlet_air", category: "shirt", brand: "Lumen", model: "Air Singlet", tier: "premium", priceTokens: 1100, imageEmoji: "🎽", description: "Le maillot de race nu, monogrammé Lumen." },

  // ---------- TEXTILE — SHORTS ----------
  { id: "shorts_basic", category: "shorts", brand: "Basic Lab", model: "Short Essentiel", tier: "entry", priceTokens: 100, imageEmoji: "🩳", description: "Confort sans chichi." },
  { id: "shorts_drift_pace_5", category: "shorts", brand: "Drift", model: "Pace 5\"", tier: "mid", priceTokens: 350, imageEmoji: "🩳", description: "Poche zippée, doublure intégrée." },
  { id: "shorts_lumen_race_3", category: "shorts", brand: "Lumen", model: "Race 3\"", tier: "premium", priceTokens: 950, imageEmoji: "🩳", description: "Coupe split, tissu ultra-aéré. Pour les chronos." },
  { id: "shorts_lumen_pro_split", category: "shorts", brand: "Lumen", model: "Pro Split", tier: "premium", priceTokens: 1500, imageEmoji: "🩳", description: "Le short de course des élites Lumen." },

  // ---------- CHAUSSETTES ----------
  { id: "socks_basic", category: "socks", brand: "Basic Lab", model: "Sock Essentiel", tier: "entry", priceTokens: 40, imageEmoji: "🧦", description: "Coton armé, basique mais propre." },
  { id: "socks_drift_invisible", category: "socks", brand: "Drift", model: "Invisible Run", tier: "mid", priceTokens: 180, imageEmoji: "🧦", description: "Coupe basse, anti-ampoules." },
  { id: "socks_lumen_compress", category: "socks", brand: "Lumen", model: "Compress", tier: "premium", priceTokens: 320, imageEmoji: "🧦", description: "Compression légère, fibre antibactérienne." },

  // ---------- CASQUETTES ----------
  { id: "cap_basic", category: "cap", brand: "Basic Lab", model: "Cap Essentiel", tier: "entry", priceTokens: 120, imageEmoji: "🧢", description: "Pour le soleil." },
  { id: "cap_drift_runner", category: "cap", brand: "Drift", model: "Runner", tier: "premium", priceTokens: 800, imageEmoji: "🧢", description: "Visière souple, tissu respirant." },
  { id: "cap_lumen_shell", category: "cap", brand: "Lumen", model: "Shell Cap", tier: "premium", priceTokens: 1200, imageEmoji: "🧢", description: "Coupe sculptée, monogramme discret. Pièce de collection." },

  // ---------- LUNETTES ----------
  { id: "glasses_basic", category: "glasses", brand: "Basic Lab", model: "Solar Basic", tier: "entry", priceTokens: 200, imageEmoji: "🕶️", description: "Protection UV simple." },
  { id: "glasses_drift_blade", category: "glasses", brand: "Drift", model: "Blade", tier: "premium", priceTokens: 2200, imageEmoji: "🕶️", description: "Monture sport sans cadre, verres polarisants." },
  { id: "glasses_lumen_zen", category: "glasses", brand: "Lumen", model: "Zen", tier: "premium", priceTokens: 3500, imageEmoji: "🕶️", description: "Lunettes de méditation cinétique. Aussi élégantes que techniques." },

  // ---------- MONTRES GPS ----------
  { id: "watch_cadence_pace_1", category: "watch", brand: "Cadence", model: "Pace 1", tier: "entry", priceTokens: 1800, imageEmoji: "⌚", description: "GPS double fréquence, autonomie XL, simple et solide." },
  { id: "watch_cadence_pace_2", category: "watch", brand: "Cadence", model: "Pace 2", tier: "entry", priceTokens: 2200, imageEmoji: "⌚", description: "Écran AMOLED, capteur cardiaque optique amélioré." },
  { id: "watch_cadence_meridian", category: "watch", brand: "Cadence", model: "Meridian", tier: "mid", priceTokens: 4200, imageEmoji: "⌚", description: "AMOLED, multi-bande, plans d'entraînement intégrés." },
  { id: "watch_apex_runner", category: "watch", brand: "Apex Watch Co", model: "Runner", tier: "mid", priceTokens: 3500, imageEmoji: "⌚", description: "Légère, FC précise, métriques course complètes." },
  { id: "watch_cadence_meridian_pro", category: "watch", brand: "Cadence", model: "Meridian Pro", tier: "premium", priceTokens: 6500, imageEmoji: "⌚", description: "Cartographie offline, charges d'entraînement. Le couteau-suisse." },
  { id: "watch_apex_summit_2", category: "watch", brand: "Apex Watch Co", model: "Summit 2", tier: "premium", priceTokens: 5800, imageEmoji: "⌚", description: "Titane, cartographie hors-ligne, autonomie de plusieurs semaines." },
  { id: "watch_orbis_one", category: "watch", brand: "Orbis", model: "One Ultra", tier: "premium", priceTokens: 9000, imageEmoji: "⌚", description: "Pour ceux qui veulent un objet aussi désirable que performant." },
  { id: "watch_apex_summit_pro", category: "watch", brand: "Apex Watch Co", model: "Summit Pro", tier: "premium", priceTokens: 10500, imageEmoji: "⌚", description: "Multi-sport haut de gamme, solaire optionnel." },
  { id: "watch_orbis_horizon_solar", category: "watch", brand: "Orbis", model: "Horizon Solar", tier: "carbon", priceTokens: 13000, imageEmoji: "💎", description: "Charge solaire perpétuelle, taillé pour les ultra-trails sans recharger." },

  // ---------- HYDRATATION ----------
  { id: "belt_drift_band", category: "belt", brand: "Drift", model: "Slim Band", tier: "mid", priceTokens: 700, imageEmoji: "🎽", description: "Ceinture invisible, accueille gels et téléphone." },
  { id: "belt_basic_zip", category: "belt", brand: "Basic Lab", model: "Zip Belt", tier: "entry", priceTokens: 350, imageEmoji: "🎒", description: "L'icône des ceintures rando-run. Robuste, fiable." },
  { id: "belt_apex_vest_5", category: "belt", brand: "Apex Athletica", model: "Race Vest 5L", tier: "premium", priceTokens: 2200, imageEmoji: "🎒", description: "Gilet de trail léger, 2 flasks 250 ml fournies." },
  { id: "belt_apex_vest_8", category: "belt", brand: "Apex Athletica", model: "Race Vest 8L", tier: "premium", priceTokens: 2800, imageEmoji: "🎒", description: "Compagnon d'ultra : zéro rebond, mille poches." },
  { id: "belt_fuel_gel", category: "belt", brand: "FuelCo", model: "Endurance Gel 320", tier: "entry", priceTokens: 200, imageEmoji: "🍯", description: "320 kcal, le gel longue distance des élites." },
  { id: "belt_fuel_caffeine", category: "belt", brand: "FuelCo", model: "Caffeine Mix", tier: "entry", priceTokens: 180, imageEmoji: "🥤", description: "Bidon recharge maison, dose caféinée." },
];

// Date d'expiration des drops limités : 30 jours.
const __dropEnd = new Date(Date.now() + 30 * 86400000).toISOString();
for (const item of CATALOG) {
  if (item.tier === "limited") item.availableUntil = __dropEnd;
}

export const findItem = (id: string) => CATALOG.find((c) => c.id === id);
