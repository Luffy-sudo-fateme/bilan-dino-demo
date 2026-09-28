/*
 * Stockage du PROTOTYPE : localStorage du navigateur (données de démonstration uniquement).
 * Dans l'application finale, ce module est remplacé par IndexedDB (hors-ligne) + synchronisation
 * serveur (voir docs/architecture.md). Les données de santé réelles ne doivent JAMAIS rester
 * uniquement dans le navigateur.
 */
(function () {
  const KEY = "dino-bilan-proto-v1";

  function uid(prefix) {
    return prefix + "-" + Math.random().toString(36).slice(2, 9);
  }

  function todayISO(offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d - tz).toISOString().slice(0, 10);
  }

  function emptyBilan(patientId, therapistId) {
    return {
      id: uid("b"),
      patientId,
      therapistId,
      date: todayISO(),
      type: "Bilan initial",
      status: "brouillon",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      header: { info: "", f1: "", f2: "", f3: "", f4: "" },
      diagnostic: { text: "", ink: [] },
      anamnese: { text: "", ink: [] },
      seances: [todayISO()],
      ink: { douleur: [], mobilite: [], trigger: [] },
      u: "",
      sp: "",
      m: "",
      checks: {},
      flex: {},
      exercises: []
    };
  }

  function seed() {
    const therapists = [
      { id: "t-anne", name: "Anne Rochat", role: "physio" },
      { id: "t-marc", name: "Marc Favre", role: "physio" },
      { id: "t-dir", name: "Direction", role: "direction" }
    ];
    const patients = [
      { id: "p-1", createdBy: "t-anne", nom: "Dupont", prenom: "Marie", naissance: "1958-04-12", telephone: "079 000 00 01", medecin: "Dr Exemple" },
      { id: "p-2", createdBy: "t-marc", nom: "Bernasconi", prenom: "Luca", naissance: "1971-11-03", telephone: "", medecin: "" },
      { id: "p-3", createdBy: "t-anne", nom: "Nguyen", prenom: "Linh", naissance: "1990-06-21", telephone: "", medecin: "Dr Exemple" },
      { id: "p-4", createdBy: "t-anne", nom: "Morel", prenom: "Jacques", naissance: "1949-01-30", telephone: "", medecin: "" }
    ];
    const b1 = emptyBilan("p-1", "t-anne");
    b1.date = todayISO(-21);
    b1.seances = [todayISO(-21), todayISO(-14), todayISO(-7)];
    b1.status = "termine";
    b1.header = { info: "Née le 12.04.1958 · retraitée", f1: "079 000 00 01", f2: "Dr Exemple", f3: "", f4: "" };
    b1.diagnostic.text = "Lombalgie chronique, raideur hanche droite";
    b1.anamnese.text = "Douleurs depuis 6 mois, travail assis, marche 30 min/jour";
    b1.checks = { vuPasFaire: true, vuDormir: true };
    b1.flex = {
      "01": { D: { d: "ok" }, G: { d: "ok" } },
      "03": { D: { d: "short", g: 2 }, G: { d: "short", g: 1 } },
      "06": { D: { d: "short", g: 3, N: true }, G: { d: "short", g: 2 } },
      "15": { D: { d: "short", g: 2 }, G: { d: "ok" } },
      "21": { D: { d: "short", g: 3 }, G: { d: "short", g: 2 } },
      "24": { D: { d: "short", g: 1 }, G: { d: "short", g: 1 } },
      "32": { D: { d: "long", g: 1 }, G: { d: "ok" } },
      "36": { D: { d: "ok", a: true }, G: { d: "ok" } }
    };
    b1.exercises = ["ex-psoas", "ex-piriforme", "ex-chat", "ex-mollet"];
    // Exemple de dessin : zone douloureuse lombaire (rouge) + irradiation dans la jambe droite (bleu).
    const ring = [];
    for (let i = 0; i <= 44; i++) ring.push([172 + Math.cos(i / 7) * 46, 425 + Math.sin(i / 7) * 34, 0.6]);
    const hatch = [];
    for (let k = 0; k < 5; k++) hatch.push({ c: "#DC2626", w: 2.6, p: [[140 + k * 14, 450, 0.5], [160 + k * 14, 400, 0.5]] });
    const leg = [];
    for (let i = 0; i <= 30; i++) leg.push([222 + Math.sin(i / 4) * 5, 470 + i * 9, 0.5 + (i % 5) / 20]);
    b1.ink.douleur = [{ c: "#DC2626", w: 3.4, p: ring }].concat(hatch, [
      { c: "#1D4ED8", w: 3.4, p: leg },
      { c: "#1D4ED8", w: 3.4, p: [[208, 725, 0.6], [222, 745, 0.6], [236, 725, 0.6]] }
    ]);
    b1.ink.mobilite = [{ c: "#111827", w: 3.4, p: [[250, 600, 0.6], [290, 640, 0.6]] }, { c: "#111827", w: 3.4, p: [[290, 600, 0.6], [250, 640, 0.6]] }];
    const b2 = emptyBilan("p-2", "t-marc");
    b2.date = todayISO(-3);
    b2.diagnostic.text = "Épaule gauche douloureuse";
    b2.flex = { "32": { D: { d: "ok" }, G: { d: "short", g: 2 } }, "33": { D: { d: "ok" }, G: { d: "short", g: 3 } } };
    return { therapists, currentUserId: "t-anne", patients, bilans: [b1, b2], demo: true };
  }

  let state;
  try {
    const raw = localStorage.getItem(KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) {
    state = null;
  }
  if (!state || !state.patients) state = seed();

  let timer = null;
  const listeners = [];
  const Store = {
    get state() {
      return state;
    },
    uid,
    todayISO,
    emptyBilan,
    save() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(KEY, JSON.stringify(state));
        } catch (e) {
          /* stockage indisponible : la démo continue en mémoire */
        }
        listeners.forEach((fn) => fn());
      }, 300);
    },
    onSaved(fn) {
      listeners.push(fn);
    },
    reset() {
      state = seed();
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
    },
    me() {
      return state.therapists.find((t) => t.id === state.currentUserId);
    },
    therapist(id) {
      return state.therapists.find((t) => t.id === id) || { name: "?" };
    },
    patient(id) {
      return state.patients.find((p) => p.id === id);
    },
    bilan(id) {
      return state.bilans.find((b) => b.id === id);
    },
    bilansOf(patientId) {
      return state.bilans
        .filter((b) => b.patientId === patientId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
    }
  };
  window.Store = Store;
})();
