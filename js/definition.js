/*
 * Définition du formulaire « Bilan DINO » (source : bilan-dino.pdf, © MEDI-ACADEMIE GmbH).
 * Ce fichier est la SOURCE DE VÉRITÉ du contenu du bilan : l'application finale doit
 * reprendre ces listes telles quelles (voir docs/analyse-pdf.md).
 */
window.DINO_DEF = {
  version: "2022.1",

  // Échelle de flexibilité à 4 cases (légende du PDF, en haut à droite de la page).
  // "+" dans la case N = raccourci de degré N ; "|" dans la case N = trop long de degré N.
  scale: {
    ok: { label: "Longueur optimale", short: "OK" },
    short: ["Légèrement raccourci", "Raccourci", "Très raccourci", "Très très raccourci"],
    long: ["Légèrement trop long", "Trop long", "Très long", "Très très long"],
    flags: {
      N: "Légère participation du nerf",
      a: "L'articulation empêche le mouvement"
    }
  },

  // 51 tests de flexibilité, dans l'ordre et l'orthographe du PDF.
  // `sep: true` = ligne pointillée APRÈS cet item sur le papier (séparateur de groupe).
  // `region` = zone du corps (hypothèse à valider avec Dino) utilisée pour proposer les vidéos.
  flex: [
    { n: "01", label: "Long fléchisseur de l'hallux", region: "pied" },
    { n: "02", label: "Long extenseur des orteils", region: "pied" },
    { n: "03", label: "Gastrocnémien", region: "pied" },
    { n: "04", label: "Soléaire", region: "pied" },
    { n: "05", label: "Tibial antérieur", region: "pied", sep: true },
    { n: "06", label: "Ischiojambiers + n. sciatique", region: "genou" },
    { n: "07", label: "Biceps fémoral + n. sciatique", region: "genou" },
    { n: "08", label: "Droit de la cuisse + n. fémoral", region: "genou" },
    { n: "09", label: "Quadriceps distal", region: "genou" },
    { n: "10", label: "Recurvatum et flexum", region: "genou" },
    { n: "11", label: "Rot. int. genou à 90° flex", region: "genou" },
    { n: "12", label: "Rot. ext. genou à 90° flex", region: "genou", sep: true },
    { n: "13", label: "Long adducteur", region: "hanche" },
    { n: "14", label: "Gracile", region: "hanche" },
    { n: "15", label: "Piriforme + nerf sciatique", region: "hanche" },
    { n: "16", label: "Rot. ext. hanche à 90° flex", region: "hanche" },
    { n: "17", label: "Petit fessier", region: "hanche" },
    { n: "18", label: "Rot. ext. hanche à 0°", region: "hanche" },
    { n: "19", label: "Rot. int. hanche à 0°", region: "hanche" },
    { n: "20", label: "Figure 4", region: "hanche" },
    { n: "21", label: "Psoas iliaque", region: "hanche" },
    { n: "22", label: "TFL", region: "hanche" },
    { n: "23", label: "Grand fessier", region: "hanche", sep: true },
    { n: "24", label: "Extenseurs colonne lombaire", region: "dos" },
    { n: "25", label: "Droit de l'abdomen", region: "dos" },
    { n: "26", label: "Carré des lombaires", region: "dos" },
    { n: "27", label: "Rot. colonne vertébrale vers", region: "dos", sep: true },
    { n: "28", label: "Fléchisseur de la nuque", region: "nuque" },
    { n: "29", label: "Scalène + plexus brachial", region: "nuque" },
    { n: "30", label: "Rotateurs de la nuque vers", region: "nuque" },
    { n: "31", label: "Triceps brachial", region: "epaule", sep: true },
    { n: "32", label: "Grand pectoral", region: "epaule" },
    { n: "33", label: "Petit pectoral", region: "epaule" },
    { n: "34", label: "Ext. épaule, réveil du chat", region: "epaule" },
    { n: "35", label: "Fléchisseur de l'épaule", region: "epaule" },
    { n: "36", label: "Rot. int. de l'épaule à 0°", region: "epaule" },
    { n: "37", label: "Rot. ext. de l'épaule à 0°", region: "epaule" },
    { n: "38", label: "Rot. int. épaule à 90° flex.", region: "epaule" },
    { n: "39", label: "Rot. ext. épaule à 90° flex", region: "epaule" },
    { n: "40", label: "Rot. int. épaule à 90° d'abd", region: "epaule" },
    { n: "41", label: "Rot. ext. épaule à 90° d'abd", region: "epaule" },
    { n: "42", label: "Rot. int. épaule à 180° d'abd.", region: "epaule", sep: true },
    { n: "43", label: "Rot. ext. épaule à 180° d'abd.", region: "epaule" },
    { n: "44", label: "Abd. horizontale de l'épaule", region: "epaule" },
    { n: "45", label: "Add. horizontale de l'épaule", region: "epaule" },
    { n: "46", label: "Ext. des doigts & poignet", region: "main" },
    { n: "47", label: "Fléch. des doigts du poignet", region: "main" },
    { n: "48", label: "Fléchisseurs du pouce", region: "main" },
    { n: "49", label: "Extenseurs du pouce", region: "main", sep: true },
    { n: "50", label: "Opposeurs du pouce", region: "main" },
    { n: "51", label: "Abducteurs du pouce", region: "main" }
  ],

  regions: {
    pied: "Pied & cheville",
    genou: "Genou & cuisse",
    hanche: "Hanche & bassin",
    dos: "Dos & lombaires",
    nuque: "Nuque",
    epaule: "Épaule & bras",
    main: "Poignet & main"
  },

  // Cases à cocher du bas de la page 1.
  checks: [
    { id: "vuPasFaire", label: "Vu ce qu'il faut pas faire" },
    { id: "vuDormir", label: "Vu comment dormir" },
    { id: "unipodal", label: "Unipodal" }
  ],

  // Zones de dessin (images extraites du PDF, coordonnées logiques = taille native de l'image).
  drawings: {
    douleur: { title: "Statique – Douleur – Irradiations", img: "assets/statique-douleur.png", w: 906, h: 990 },
    mobilite: { title: "Statique – Mobilité", img: "assets/statique-mobilite.png", w: 322, h: 990 },
    trigger: { title: "Triggerpoints", img: "assets/triggerpoints.png", w: 348, h: 990 }
  },

  // Code couleur du stylo (convention proposée, à valider avec Dino).
  pens: [
    { id: "noir", color: "#111827", label: "Noir", hint: "Notes" },
    { id: "rouge", color: "#DC2626", label: "Rouge", hint: "Douleur" },
    { id: "bleu", color: "#1D4ED8", label: "Bleu", hint: "Irradiation" },
    { id: "vert", color: "#15803D", label: "Vert", hint: "Amélioration" }
  ],

  // Catalogue d'exercices PROVISOIRE : les vraies vidéos seront fournies par Dino.
  exercises: [
    { id: "ex-mollet", region: "pied", title: "Étirement du mollet contre le mur", dose: "3 × 30 s par côté" },
    { id: "ex-orteils", region: "pied", title: "Mobilisation des orteils et de la cheville", dose: "2 × 15" },
    { id: "ex-ischio", region: "genou", title: "Étirement des ischio-jambiers assis", dose: "3 × 30 s" },
    { id: "ex-quadri", region: "genou", title: "Étirement du quadriceps debout", dose: "3 × 30 s par côté" },
    { id: "ex-piriforme", region: "hanche", title: "Étirement du piriforme (figure 4)", dose: "3 × 30 s par côté" },
    { id: "ex-psoas", region: "hanche", title: "Étirement du psoas en fente", dose: "3 × 30 s par côté" },
    { id: "ex-pont", region: "hanche", title: "Pont fessier", dose: "3 × 12" },
    { id: "ex-chat", region: "dos", title: "Réveil du chat (dos rond / dos creux)", dose: "2 × 10" },
    { id: "ex-rotation", region: "dos", title: "Rotation du tronc couché", dose: "2 × 10 par côté" },
    { id: "ex-nuque", region: "nuque", title: "Rotation douce de la nuque", dose: "2 × 10 par côté" },
    { id: "ex-scalene", region: "nuque", title: "Étirement latéral de la nuque", dose: "3 × 20 s par côté" },
    { id: "ex-pecto", region: "epaule", title: "Étirement du pectoral dans l'encadrement de porte", dose: "3 × 30 s" },
    { id: "ex-pendule", region: "epaule", title: "Pendule de l'épaule", dose: "2 × 30 s" },
    { id: "ex-poignet", region: "main", title: "Étirement des fléchisseurs du poignet", dose: "3 × 20 s par côté" },
    { id: "ex-pouce", region: "main", title: "Mobilisation du pouce", dose: "2 × 10" }
  ]
};
