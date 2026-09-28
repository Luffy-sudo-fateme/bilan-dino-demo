/*
 * Prototype « Bilan DINO » — interface iPad pour physiothérapeutes.
 * Vanilla JS, aucune dépendance, aucun build : ouvrir index.html suffit.
 * Écrans : Patients → Patient → Bilan (+ aperçu impression), Direction, Portail patient.
 */
(function () {
  const DEF = window.DINO_DEF;
  const S = window.Store;
  const Ink = window.Ink;
  const app = document.getElementById("app");
  // Configuration de la démo publique (définie dans la page qui charge le prototype).
  const CFG = Object.assign({ publicDemo: false, feedbackUrl: "", device: "ipad", noPrint: false }, window.DINO_CONFIG || {});
  const overlay = document.getElementById("overlay");

  /* ---------- Préférences d'affichage (confort visuel) ---------- */
  const PREF_KEY = "dino-proto-prefs";
  let prefs = { fs: 2, autoNext: true, fingerDraws: false };
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || "{}"));
  } catch (e) {}
  function savePrefs() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }
  function applyPrefs() {
    document.documentElement.dataset.fs = prefs.fs;
    Ink.fingerDraws = prefs.fingerDraws;
    document.body.classList.toggle("finger-draws", prefs.fingerDraws);
  }
  applyPrefs();

  /* ---------- Utilitaires ---------- */
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (iso) => (iso ? iso.split("-").reverse().join(".") : "");
  function age(iso) {
    if (!iso) return "";
    const b = new Date(iso), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  }
  const fullName = (p) => (p ? `${p.prenom} ${p.nom}` : "");
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- Feuilles modales (remplacent confirm()/prompt()) ---------- */
  function openSheet(html, cls) {
    overlay.innerHTML = `<div class="sheet ${cls || ""}" role="dialog" aria-modal="true">${html}</div>`;
    overlay.hidden = false;
    overlay.onclick = (e) => {
      if (e.target === overlay) closeSheet();
    };
    return overlay.firstElementChild;
  }
  function closeSheet() {
    overlay.hidden = true;
    overlay.innerHTML = "";
  }
  function confirmSheet(title, text, okLabel, onOk, danger) {
    const el = openSheet(`
      <h2>${esc(title)}</h2>
      <p class="lead">${esc(text)}</p>
      <div class="sheet-actions">
        <button class="btn big ghost" data-act="no">Annuler</button>
        <button class="btn big ${danger ? "danger" : "primary"}" data-act="ok">${esc(okLabel)}</button>
      </div>`);
    $("[data-act=no]", el).onclick = closeSheet;
    $("[data-act=ok]", el).onclick = () => {
      closeSheet();
      onOk();
    };
  }
  function toast(msg) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  /* ---------- Navigation ---------- */
  let route = { view: "home" };
  function go(view, params) {
    route = Object.assign({ view }, params || {});
    closeSheet();
    window.scrollTo(0, 0);
    render();
  }
  function render() {
    document.body.dataset.view = route.view;
    ({ home: renderHome, patient: renderPatient, bilan: renderBilan, direction: renderDirection, portal: renderPortal }[route.view] ||
      renderHome)();
  }

  /* ---------- Barre d'en-tête commune ---------- */
  function brandBar(right) {
    const me = S.me();
    return `
      <header class="appbar">
        <div class="brand"><img src="assets/dino-logo.png" alt="" /><span>DINO <small>Bilans${CFG.publicDemo ? " · démo" : ""}</small></span></div>
        <div class="appbar-right">
          ${right || ""}
          ${CFG.feedbackUrl ? `<a class="btn feedback" href="${esc(CFG.feedbackUrl)}" target="_blank" rel="noopener">Donner mon avis</a>` : ""}
          <button class="btn chip-user" id="btn-user" aria-label="Changer d'utilisateur">
            <span class="avatar">${esc(me.name.charAt(0))}</span>
            <span><b>${esc(me.name)}</b><small>${me.role === "direction" ? "Direction" : "Physiothérapeute"}</small></span>
          </button>
        </div>
      </header>`;
  }
  function bindBrandBar() {
    const b = $("#btn-user");
    if (b) b.onclick = openUserSheet;
  }
  function openUserSheet() {
    const st = S.state;
    const el = openSheet(`
      <h2>Qui utilise l'iPad ?</h2>
      <p class="muted">Démonstration des futurs accès (phase 3 et 4). Dans l'application finale : connexion par code personnel ou Face ID.</p>
      <div class="user-list">
        ${st.therapists
          .map(
            (t) => `<button class="user-row ${t.id === st.currentUserId ? "is-on" : ""}" data-id="${t.id}">
              <span class="avatar">${esc(t.name.charAt(0))}</span>
              <span><b>${esc(t.name)}</b><small>${t.role === "direction" ? "Voit tous les bilans et le suivi du cabinet" : "Physiothérapeute : voit ses propres patients"}</small></span>
            </button>`
          )
          .join("")}
        <button class="user-row" data-id="portal">
          <span class="avatar patient">P</span>
          <span><b>Portail patient</b><small>Aperçu de ce que voit Marie Dupont chez elle</small></span>
        </button>
      </div>
      <div class="sheet-actions">
        <button class="btn ghost" data-act="reset">Réinitialiser la démo</button>
        <button class="btn big" data-act="close">Fermer</button>
      </div>`);
    $$(".user-row", el).forEach((b) => {
      b.onclick = () => {
        if (b.dataset.id === "portal") return go("portal", { patientId: "p-1" });
        st.currentUserId = b.dataset.id;
        S.save();
        go(S.me().role === "direction" ? "direction" : "home");
      };
    });
    $("[data-act=close]", el).onclick = closeSheet;
    $("[data-act=reset]", el).onclick = () =>
      confirmSheet("Réinitialiser la démo ?", "Toutes les données saisies dans ce navigateur seront remplacées par les exemples.", "Réinitialiser", () => {
        S.reset();
        go("home");
      }, true);
  }

  /* ---------- Droits (simulés) ---------- */
  function canSeeAll() {
    return S.me().role === "direction";
  }
  function visiblePatients() {
    const me = S.me();
    const st = S.state;
    if (canSeeAll()) return st.patients.slice();
    return st.patients.filter((p) => p.createdBy === me.id || st.bilans.some((b) => b.patientId === p.id && b.therapistId === me.id));
  }
  function visibleBilans(patientId) {
    const all = S.bilansOf(patientId);
    return canSeeAll() ? all : all.filter((b) => b.therapistId === S.me().id);
  }

  /* =========================================================
   * ÉCRAN 1 : Mes patients
   * ========================================================= */
  function renderHome() {
    if (S.me().role === "direction") return renderDirection();
    const me = S.me();
    const q = (route.q || "").trim().toLowerCase();
    const patients = visiblePatients()
      .filter((p) => !q || fullName(p).toLowerCase().includes(q) || (p.nom + " " + p.prenom).toLowerCase().includes(q))
      .map((p) => ({ p, last: visibleBilans(p.id)[0] }))
      .sort((a, b) => ((b.last ? b.last.updatedAt : 0) - (a.last ? a.last.updatedAt : 0)) || a.p.nom.localeCompare(b.p.nom));
    const drafts = S.state.bilans.filter((b) => b.therapistId === me.id && b.status === "brouillon");

    app.innerHTML = `
      ${brandBar()}
      <main class="page">
        <div class="page-head">
          <h1>Mes patients</h1>
          <button class="btn big primary" id="btn-new-patient"><span class="plus">+</span> Nouveau patient</button>
        </div>

        ${
          drafts.length
            ? `<section class="drafts">
            <h2>À terminer</h2>
            <div class="draft-list">
              ${drafts
                .map((b) => {
                  const p = S.patient(b.patientId);
                  return `<button class="draft" data-bilan="${b.id}">
                    <span class="pill warn">Brouillon</span>
                    <b>${esc(fullName(p))}</b>
                    <span class="muted">${esc(b.type)} du ${fmt(b.date)}</span>
                    <span class="go">Reprendre ›</span>
                  </button>`;
                })
                .join("")}
            </div>
          </section>`
            : ""
        }

        <label class="search" for="search">
          <span aria-hidden="true">⌕</span>
          <input id="search" type="search" placeholder="Chercher un patient (écrivez au stylo ou au clavier)" value="${esc(route.q || "")}" autocomplete="off" />
        </label>

        <div class="patient-list">
          ${
            patients.length
              ? patients
                  .map(
                    ({ p, last }) => `
            <button class="patient-card" data-patient="${p.id}">
              <span class="avatar lg">${esc(p.prenom.charAt(0))}${esc(p.nom.charAt(0))}</span>
              <span class="pc-main">
                <b>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</b>
                <small>${p.naissance ? `${age(p.naissance)} ans · né(e) le ${fmt(p.naissance)}` : "Date de naissance non saisie"}</small>
              </span>
              <span class="pc-last">${last ? `Dernier bilan<br /><b>${fmt(last.date)}</b>` : `<span class="muted">Aucun bilan</span>`}</span>
              <span class="go" aria-hidden="true">›</span>
            </button>`
                  )
                  .join("")
              : `<p class="empty-state">Aucun patient trouvé. <button class="btn" id="btn-new-patient-2">Créer « ${esc(route.q || "")} »</button></p>`
          }
        </div>
        <p class="demo-note">Démonstration : toutes les personnes affichées sont fictives.</p>
      </main>`;

    bindBrandBar();
    $("#btn-new-patient").onclick = () => openNewPatient();
    const b2 = $("#btn-new-patient-2");
    if (b2) b2.onclick = () => openNewPatient(route.q);
    const search = $("#search");
    search.oninput = () => {
      route.q = search.value;
      const pos = search.selectionStart;
      renderHome();
      const s2 = $("#search");
      s2.focus();
      s2.setSelectionRange(pos, pos);
    };
    $$("[data-patient]").forEach((b) => (b.onclick = () => go("patient", { patientId: b.dataset.patient })));
    $$("[data-bilan]").forEach((b) => (b.onclick = () => go("bilan", { bilanId: b.dataset.bilan })));
  }

  function openNewPatient(prefill) {
    const parts = (prefill || "").trim().split(/\s+/);
    const el = openSheet(`
      <h2>Nouveau patient</h2>
      <p class="muted">Écrivez directement au stylo dans les cases : l'iPad transforme l'écriture en texte.</p>
      <form id="np-form" class="form-grid">
        <label>Nom<input id="np-nom" required autocomplete="off" value="${esc(parts[0] || "")}" /></label>
        <label>Prénom<input id="np-prenom" required autocomplete="off" value="${esc(parts.slice(1).join(" "))}" /></label>
        <label>Date de naissance<input id="np-naissance" type="date" /></label>
        <label>Téléphone <small>(facultatif)</small><input id="np-tel" type="tel" autocomplete="off" /></label>
        <label class="span2">Médecin prescripteur <small>(facultatif)</small><input id="np-med" autocomplete="off" /></label>
        <div class="sheet-actions span2">
          <button type="button" class="btn big ghost" data-act="no">Annuler</button>
          <button type="submit" class="btn big primary">Créer et commencer le bilan</button>
        </div>
      </form>`);
    $("[data-act=no]", el).onclick = closeSheet;
    $("#np-form", el).onsubmit = (e) => {
      e.preventDefault();
      const p = {
        id: S.uid("p"),
        createdBy: S.me().id,
        nom: $("#np-nom").value.trim(),
        prenom: $("#np-prenom").value.trim(),
        naissance: $("#np-naissance").value,
        telephone: $("#np-tel").value.trim(),
        medecin: $("#np-med").value.trim()
      };
      if (!p.nom || !p.prenom) return;
      S.state.patients.push(p);
      startBilan(p.id, null);
    };
    setTimeout(() => $("#np-nom", el).focus(), 50);
  }

  function startBilan(patientId, fromBilan) {
    const p = S.patient(patientId);
    const b = S.emptyBilan(patientId, S.me().id);
    // Tout ce qui est déjà connu est pré-rempli : le physio ne fait que corriger.
    b.header.info = p.naissance ? `Né(e) le ${fmt(p.naissance)} · ${age(p.naissance)} ans` : "";
    b.header.f1 = p.telephone || "";
    b.header.f2 = p.medecin || "";
    if (fromBilan) {
      b.type = "Re-bilan";
      b.diagnostic = { text: fromBilan.diagnostic.text, ink: fromBilan.diagnostic.ink.slice() };
      b.anamnese = { text: fromBilan.anamnese.text, ink: fromBilan.anamnese.ink.slice() };
      b.flex = JSON.parse(JSON.stringify(fromBilan.flex));
      b.checks = Object.assign({}, fromBilan.checks);
      b.exercises = fromBilan.exercises.slice();
      b.header = Object.assign({}, fromBilan.header);
      b.previousId = fromBilan.id;
    }
    S.state.bilans.push(b);
    S.save();
    go("bilan", { bilanId: b.id });
  }

  /* =========================================================
   * ÉCRAN 2 : Dossier d'un patient
   * ========================================================= */
  function renderPatient() {
    const p = S.patient(route.patientId);
    if (!p) return go("home");
    const bilans = visibleBilans(p.id);
    const hidden = S.bilansOf(p.id).length - bilans.length;
    app.innerHTML = `
      ${brandBar()}
      <main class="page">
        <button class="btn back" id="btn-back">‹ Mes patients</button>
        <div class="patient-head">
          <span class="avatar xl">${esc(p.prenom.charAt(0))}${esc(p.nom.charAt(0))}</span>
          <div>
            <h1>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</h1>
            <p class="muted">${p.naissance ? `${age(p.naissance)} ans · né(e) le ${fmt(p.naissance)}` : ""}${p.telephone ? ` · ${esc(p.telephone)}` : ""}${p.medecin ? ` · ${esc(p.medecin)}` : ""}</p>
          </div>
          <button class="btn huge primary" id="btn-new-bilan"><span class="plus">+</span> Nouveau bilan</button>
        </div>

        <h2>Bilans (${bilans.length})</h2>
        <div class="bilan-list">
          ${
            bilans.length
              ? bilans
                  .map(
                    (b) => `
            <div class="bilan-row">
              <div class="br-date"><b>${fmt(b.date)}</b><small>${esc(b.type)}</small></div>
              <div class="br-meta">
                <span class="pill ${b.status === "termine" ? "ok" : "warn"}">${b.status === "termine" ? "Terminé" : "Brouillon"}</span>
                <span class="muted">par ${esc(S.therapist(b.therapistId).name)}</span>
                ${b.diagnostic.text ? `<span class="br-diag">${esc(b.diagnostic.text)}</span>` : ""}
              </div>
              <div class="br-actions">
                <button class="btn" data-preview="${b.id}">Aperçu / PDF</button>
                <button class="btn primary" data-open="${b.id}">Ouvrir</button>
              </div>
            </div>`
                  )
                  .join("")
              : `<p class="empty-state">Pas encore de bilan pour ce patient.</p>`
          }
        </div>
        ${hidden > 0 ? `<p class="muted">${hidden} bilan(s) fait(s) par un autre physiothérapeute : visibles par la Direction.</p>` : ""}
      </main>`;
    bindBrandBar();
    $("#btn-back").onclick = () => go("home");
    $$("[data-open]").forEach((b) => (b.onclick = () => go("bilan", { bilanId: b.dataset.open })));
    $$("[data-preview]").forEach((b) => (b.onclick = () => openPrintPreview(S.bilan(b.dataset.preview))));
    $("#btn-new-bilan").onclick = () => {
      const last = bilans[0];
      if (!last) return startBilan(p.id, null);
      const el = openSheet(`
        <h2>Nouveau bilan pour ${esc(fullName(p))}</h2>
        <div class="choice-list">
          <button class="choice" data-c="re">
            <b>Re-bilan</b>
            <span>Reprend les valeurs du bilan du ${fmt(last.date)}. Vous ne modifiez que ce qui a changé.</span>
          </button>
          <button class="choice" data-c="new">
            <b>Bilan vierge</b>
            <span>Nouvelle feuille vide, datée d'aujourd'hui.</span>
          </button>
        </div>
        <div class="sheet-actions"><button class="btn big ghost" data-act="no">Annuler</button></div>`);
      $("[data-act=no]", el).onclick = closeSheet;
      $("[data-c=re]", el).onclick = () => startBilan(p.id, last);
      $("[data-c=new]", el).onclick = () => startBilan(p.id, null);
    };
  }

  /* =========================================================
   * ÉCRAN 3 : Le bilan (reprend la mise en page du PDF)
   * ========================================================= */
  let pads = {};
  let lastPad = null;

  function glyph(v) {
    if (!v || !v.d) return `<span class="glyph empty"><i></i><i></i><i></i><i></i></span>`;
    let flags = (v.N ? `<b class="flag">N</b>` : "") + (v.a ? `<b class="flag">ɑ</b>` : "");
    if (v.d === "ok") return `<span class="glyph ok">OK</span>${flags}`;
    const mark = v.d === "short" ? "+" : `<u class="bar"></u>`;
    let boxes = "";
    for (let i = 1; i <= 4; i++) boxes += `<i class="${i === v.g ? "on" : ""}">${i === v.g ? mark : ""}</i>`;
    return `<span class="glyph ${v.d}">${boxes}</span>${flags}`;
  }
  function describe(v) {
    if (!v || !v.d) return "Non testé";
    let t = v.d === "ok" ? "OK – longueur optimale" : v.d === "short" ? DEF.scale.short[v.g - 1] : DEF.scale.long[v.g - 1];
    if (v.N) t += " · N";
    if (v.a) t += " · ɑ";
    return t;
  }

  function previousBilan(b) {
    return S.bilansOf(b.patientId).find((x) => x.id !== b.id && (x.date < b.date || (x.date === b.date && x.createdAt < b.createdAt)));
  }

  function textInkBlock(key, title, b, logical) {
    const f = b[key];
    const mode = f.mode || "ink";
    return `
      <section class="box" id="sec-${key}">
        <div class="box-head">
          <h3>${esc(title)}</h3>
          <div class="seg" role="group" aria-label="Mode de saisie">
            <button class="${mode === "ink" ? "on" : ""}" data-mode="ink" data-field="${key}">✎ Stylo</button>
            <button class="${mode === "text" ? "on" : ""}" data-mode="text" data-field="${key}">Aa Texte</button>
          </div>
        </div>
        <div class="ink-host lined" data-pad="${key}" style="aspect-ratio:${logical[0]}/${logical[1]}" ${mode === "text" ? "hidden" : ""}></div>
        <textarea id="ta-${key}" data-text="${key}" rows="5" placeholder="Écrivez au stylo dans ce cadre (converti en texte) ou au clavier" ${mode === "ink" ? "hidden" : ""}>${esc(f.text)}</textarea>
        ${mode === "ink" && f.text ? `<p class="also-text"><b>Texte :</b> ${esc(f.text)}</p>` : ""}
      </section>`;
  }

  function drawingBlock(key, b) {
    const d = DEF.drawings[key];
    return `
      <section class="box drawing" id="sec-${key}">
        <div class="box-head"><h3>${esc(d.title)}</h3><button class="btn small ghost" data-clear="${key}">Effacer le dessin</button></div>
        <div class="ink-host img" data-pad="${key}" style="aspect-ratio:${d.w}/${d.h}">
          <img src="${d.img}" alt="Schéma ${esc(d.title)}" draggable="false" />
        </div>
      </section>`;
  }

  function flexTable(b, prev) {
    const rows = DEF.flex
      .map((it) => {
        const v = b.flex[it.n] || {};
        const pv = prev ? prev.flex[it.n] || {} : null;
        const cell = (side) => `
          <button class="fcell ${v[side] && v[side].d ? "is-" + v[side].d : ""}" data-n="${it.n}" data-s="${side}" aria-label="${esc(it.label)} ${side === "D" ? "droite" : "gauche"} : ${esc(describe(v[side]))}">
            ${glyph(v[side])}
            ${pv && pv[side] && pv[side].d ? `<span class="prev" title="Bilan précédent">avant ${glyph(pv[side])}</span>` : ""}
          </button>`;
        return `
          <div class="frow ${it.sep ? "sep" : ""}" id="f-${it.n}">
            <div class="flabel"><span class="fnum">${it.n}</span> ${esc(it.label)}</div>
            ${cell("D")}${cell("G")}
          </div>`;
      })
      .join("");
    return rows;
  }

  function legendHTML() {
    const items = [
      [{ d: "ok" }, "Longueur optimale"],
      ...DEF.scale.short.map((l, i) => [{ d: "short", g: i + 1 }, l]),
      ...DEF.scale.long.map((l, i) => [{ d: "long", g: i + 1 }, l])
    ];
    return `<div class="legend">
      ${items.map(([v, l]) => `<div class="lg-item">${glyph(v)}<span>${esc(l)}</span></div>`).join("")}
      <div class="lg-item"><b class="flag">N</b><span>${esc(DEF.scale.flags.N)}</span></div>
      <div class="lg-item"><b class="flag">ɑ</b><span>${esc(DEF.scale.flags.a)}</span></div>
    </div>`;
  }

  function suggestedRegions(b) {
    const set = new Set();
    DEF.flex.forEach((it) => {
      const v = b.flex[it.n] || {};
      ["D", "G"].forEach((s) => {
        if (v[s] && (v[s].d === "short" || v[s].d === "long")) set.add(it.region);
      });
    });
    return set;
  }

  function exercisesHTML(b) {
    const sug = suggestedRegions(b);
    const regions = Object.keys(DEF.regions).sort((a, c) => (sug.has(c) ? 1 : 0) - (sug.has(a) ? 1 : 0));
    return regions
      .map((r) => {
        const list = DEF.exercises.filter((e) => e.region === r);
        return `
        <div class="ex-region ${sug.has(r) ? "suggested" : ""}">
          <h4>${esc(DEF.regions[r])} ${sug.has(r) ? `<span class="pill accent">Suggéré par le bilan</span>` : ""}</h4>
          <div class="ex-grid">
            ${list
              .map(
                (e) => `<button class="ex-card ${b.exercises.includes(e.id) ? "on" : ""}" data-ex="${e.id}" aria-pressed="${b.exercises.includes(e.id)}">
                <span class="ex-thumb" aria-hidden="true">▶</span>
                <span class="ex-text"><b>${esc(e.title)}</b><small>${esc(e.dose)}</small></span>
                <span class="ex-check" aria-hidden="true">${b.exercises.includes(e.id) ? "✓" : ""}</span>
              </button>`
              )
              .join("")}
          </div>
        </div>`;
      })
      .join("");
  }

  function renderBilan() {
    const b = S.bilan(route.bilanId);
    if (!b) return go("home");
    const p = S.patient(b.patientId);
    const prev = previousBilan(b);
    pads = {};
    lastPad = null;

    app.innerHTML = `
      <header class="bilanbar">
        <button class="btn back" id="btn-back">‹ ${esc(p.prenom)}</button>
        <div class="bb-title">
          <b>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</b>
          <small>${esc(b.type)} · ${fmt(b.date)} · ${esc(S.therapist(b.therapistId).name)}</small>
        </div>
        <span class="save-state" id="save-state" aria-live="polite">✓ Enregistré</span>
        <div class="fs-switch" role="group" aria-label="Taille du texte">
          <button data-fs="1" class="${prefs.fs == 1 ? "on" : ""}" aria-label="Texte normal">A</button>
          <button data-fs="2" class="${prefs.fs == 2 ? "on" : ""}" aria-label="Texte grand">A</button>
          <button data-fs="3" class="${prefs.fs == 3 ? "on" : ""}" aria-label="Texte très grand">A</button>
        </div>
        <button class="btn" id="btn-print">Aperçu / PDF</button>
        <button class="btn primary" id="btn-finish">${b.status === "termine" ? "✓ Terminé" : "Terminer"}</button>
      </header>

      <nav class="jump" aria-label="Aller à la section">
        <a href="#sec-infos">Patient</a><a href="#sec-diagnostic">Diagnostic</a><a href="#sec-anamnese">Anamnèse</a>
        <a href="#sec-douleur">Douleur</a><a href="#sec-mobilite">Mobilité</a><a href="#sec-trigger">Triggerpoints</a>
        <a href="#sec-flex">Flexibilité</a><a href="#sec-ex">Exercices</a>
      </nav>

      <main class="bilan">
        <div class="col-left">
          <section class="box header-block" id="sec-infos">
            <img class="hb-logo" src="assets/dino-logo.png" alt="Dino" />
            <div class="hb-name">
              <label class="field"><span>Nom :</span><input id="h-nom" value="${esc(p.nom.toUpperCase() + " " + p.prenom)}" readonly /></label>
              <label class="field"><span class="sr">Informations</span><input id="h-info" data-h="info" value="${esc(b.header.info)}" placeholder="Date de naissance, profession…" /></label>
            </div>
            <div class="hb-small">
              <input data-h="f1" value="${esc(b.header.f1)}" placeholder="Téléphone" aria-label="Téléphone" />
              <input data-h="f2" value="${esc(b.header.f2)}" placeholder="Médecin" aria-label="Médecin" />
              <input data-h="f3" value="${esc(b.header.f3)}" placeholder="Assurance" aria-label="Assurance" />
              <input data-h="f4" value="${esc(b.header.f4)}" placeholder="N° prescription" aria-label="Numéro de prescription" />
            </div>
          </section>

          <div class="row-2">
            ${textInkBlock("diagnostic", "Diagnostic :", b, [700, 260])}
            <div class="stack">
              ${textInkBlock("anamnese", "Anamnèse :", b, [520, 260])}
              <section class="box date-block">
                <div class="box-head"><h3>Date :</h3></div>
                <label class="field inline"><span>Bilan</span><input type="date" id="b-date" value="${b.date}" /></label>
                <div class="seances">
                  <span class="muted">Séances :</span>
                  ${b.seances.map((d, i) => `<button class="chip" data-seance="${i}" aria-label="Retirer la séance du ${fmt(d)}">${fmt(d)}</button>`).join("")}
                  <button class="chip add" id="btn-seance">+ Aujourd'hui</button>
                </div>
              </section>
            </div>
          </div>

          ${drawingBlock("douleur", b)}
          <div class="under-douleur">
            <label class="field inline"><span>U :</span><input id="b-u" value="${esc(b.u)}" /></label>
            <div class="checks">
              ${DEF.checks
                .map(
                  (c) => `<button class="check ${b.checks[c.id] ? "on" : ""}" data-check="${c.id}" aria-pressed="${!!b.checks[c.id]}">
                    <span class="box-tick" aria-hidden="true">${b.checks[c.id] ? "✓" : ""}</span>${esc(c.label)}</button>`
                )
                .join("")}
            </div>
          </div>

          <div class="row-2 even">
            ${drawingBlock("mobilite", b)}
            <div class="stack">
              ${drawingBlock("trigger", b)}
              <section class="box sp-m">
                <label class="field inline"><span>SP :</span><input id="b-sp" value="${esc(b.sp)}" /></label>
                <label class="field inline"><span>M :</span><input id="b-m" value="${esc(b.m)}" /></label>
              </section>
            </div>
          </div>
        </div>

        <div class="col-right">
          <section class="box flex-block" id="sec-flex">
            <div class="box-head">
              <h3>Flexibilité</h3>
              <button class="btn small" id="btn-rest-ok" title="Mettre OK dans toutes les cases vides">Cases vides → OK</button>
            </div>
            ${legendHTML()}
            ${prev ? `<p class="muted small">En gris : valeur du bilan du ${fmt(prev.date)}.</p>` : ""}
            <div class="fhead"><span></span><span>Droite</span><span>Gauche</span></div>
            <div class="ftable">${flexTable(b, prev)}</div>
          </section>
        </div>

        <section class="box exercises" id="sec-ex">
          <div class="box-head">
            <h3>Programme d'exercices à domicile</h3>
            <span class="muted" id="ex-count">${b.exercises.length} exercice(s) choisi(s) · visible(s) par le patient</span>
          </div>
          <p class="muted">Vidéos provisoires : les vraies vidéos de Dino seront ajoutées en phase 4.</p>
          <div id="ex-wrap">${exercisesHTML(b)}</div>
        </section>
      </main>

      <div class="inkbar" role="toolbar" aria-label="Outils de dessin">
        <span class="ib-label">Stylo</span>
        ${DEF.pens
          .map(
            (pn) =>
              `<button class="pen ${Ink.pen === pn.color && Ink.mode === "draw" ? "on" : ""}" data-pen="${pn.color}" aria-label="${pn.label} (${pn.hint})"><span style="background:${pn.color}"></span><small>${pn.hint}</small></button>`
          )
          .join("")}
        <button class="tool ${Ink.mode === "erase" ? "on" : ""}" id="tool-erase"><span aria-hidden="true">⌫</span><small>Gomme</small></button>
        <button class="tool" id="tool-undo"><span aria-hidden="true">↶</span><small>Annuler</small></button>
        <button class="tool ${prefs.fingerDraws ? "on" : ""}" id="tool-finger"><span aria-hidden="true">☝</span><small>${prefs.fingerDraws ? "Doigt : oui" : "Doigt : non"}</small></button>
      </div>`;

    const touch = () => {
      b.updatedAt = Date.now();
      $("#save-state").textContent = "Enregistrement…";
      $("#save-state").classList.add("pending");
      S.save();
    };

    // En-tête & champs simples
    $("#btn-back").onclick = () => go("patient", { patientId: p.id });
    $$("[data-h]").forEach((inp) => (inp.oninput = () => ((b.header[inp.dataset.h] = inp.value), touch())));
    $("#b-date").onchange = (e) => {
      b.date = e.target.value || S.todayISO();
      touch();
    };
    $("#b-u").oninput = (e) => ((b.u = e.target.value), touch());
    $("#b-sp").oninput = (e) => ((b.sp = e.target.value), touch());
    $("#b-m").oninput = (e) => ((b.m = e.target.value), touch());
    $("#btn-seance").onclick = () => {
      const t = S.todayISO();
      if (!b.seances.includes(t)) b.seances.push(t);
      touch();
      renderKeepScroll();
    };
    $$("[data-seance]").forEach(
      (c) =>
        (c.onclick = () =>
          confirmSheet("Retirer cette séance ?", "Séance du " + c.textContent, "Retirer", () => {
            b.seances.splice(+c.dataset.seance, 1);
            touch();
            renderKeepScroll();
          }))
    );
    $$("[data-check]").forEach(
      (c) =>
        (c.onclick = () => {
          const id = c.dataset.check;
          b.checks[id] = !b.checks[id];
          c.classList.toggle("on", b.checks[id]);
          c.setAttribute("aria-pressed", b.checks[id]);
          $(".box-tick", c).textContent = b.checks[id] ? "✓" : "";
          touch();
        })
    );

    // Taille du texte
    $$("[data-fs]").forEach(
      (btn) =>
        (btn.onclick = () => {
          prefs.fs = +btn.dataset.fs;
          savePrefs();
          applyPrefs();
          $$("[data-fs]").forEach((x) => x.classList.toggle("on", x === btn));
        })
    );

    // Texte / stylo
    $$("[data-mode]").forEach(
      (btn) =>
        (btn.onclick = () => {
          b[btn.dataset.field].mode = btn.dataset.mode;
          touch();
          renderKeepScroll();
        })
    );
    $$("[data-text]").forEach((ta) => (ta.oninput = () => ((b[ta.dataset.text].text = ta.value), touch())));

    // Zones de dessin
    $$("[data-pad]").forEach((host) => {
      const key = host.dataset.pad;
      if (host.hidden) return;
      const isText = key === "diagnostic" || key === "anamnese";
      const size = isText ? (key === "diagnostic" ? [700, 260] : [520, 260]) : [DEF.drawings[key].w, DEF.drawings[key].h];
      const pad = new Ink.Pad(host, {
        w: size[0],
        h: size[1],
        strokes: isText ? b[key].ink : b.ink[key],
        baseWidth: isText ? 2.6 : 3.4,
        onChange: (strokes) => {
          if (isText) b[key].ink = strokes;
          else b.ink[key] = strokes;
          touch();
        }
      });
      pads[key] = pad;
      host.addEventListener("pointerdown", () => (lastPad = pad));
    });
    $$("[data-clear]").forEach(
      (btn) =>
        (btn.onclick = () =>
          confirmSheet("Effacer ce dessin ?", "Tout ce qui est dessiné sur « " + DEF.drawings[btn.dataset.clear].title + " » sera effacé.", "Effacer", () =>
            pads[btn.dataset.clear].clear(), true))
    );

    // Barre d'outils stylo
    $$("[data-pen]").forEach(
      (btn) =>
        (btn.onclick = () => {
          Ink.pen = btn.dataset.pen;
          Ink.mode = "draw";
          $$(".inkbar .on").forEach((x) => x.id !== "tool-finger" && x.classList.remove("on"));
          btn.classList.add("on");
        })
    );
    $("#tool-erase").onclick = (e) => {
      Ink.mode = "erase";
      $$(".inkbar .on").forEach((x) => x.id !== "tool-finger" && x.classList.remove("on"));
      e.currentTarget.classList.add("on");
    };
    $("#tool-undo").onclick = () => {
      if (lastPad) lastPad.undo();
      else toast("Rien à annuler");
    };
    $("#tool-finger").onclick = (e) => {
      prefs.fingerDraws = !prefs.fingerDraws;
      savePrefs();
      applyPrefs();
      e.currentTarget.classList.toggle("on", prefs.fingerDraws);
      $("small", e.currentTarget).textContent = prefs.fingerDraws ? "Doigt : oui" : "Doigt : non";
      toast(prefs.fingerDraws ? "Le doigt dessine (la page défile avec deux doigts)" : "Seul le stylo dessine, le doigt fait défiler");
    };

    // Flexibilité
    const refreshCell = (n, side) => {
      const btn = $(`.fcell[data-n="${n}"][data-s="${side}"]`);
      const v = (b.flex[n] || {})[side];
      const pv = prev ? (prev.flex[n] || {})[side] : null;
      btn.className = "fcell " + (v && v.d ? "is-" + v.d : "");
      btn.innerHTML = glyph(v) + (pv && pv.d ? `<span class="prev">avant ${glyph(pv)}</span>` : "");
      refreshExercises();
    };
    const refreshExercises = () => {
      $("#ex-wrap").innerHTML = exercisesHTML(b);
      bindExercises();
    };
    const bindExercises = () => {
      $$("[data-ex]").forEach(
        (c) =>
          (c.onclick = () => {
            const id = c.dataset.ex;
            const i = b.exercises.indexOf(id);
            if (i >= 0) b.exercises.splice(i, 1);
            else b.exercises.push(id);
            c.classList.toggle("on", i < 0);
            c.setAttribute("aria-pressed", i < 0);
            $(".ex-check", c).textContent = i < 0 ? "✓" : "";
            $("#ex-count").textContent = `${b.exercises.length} exercice(s) choisi(s) · visible(s) par le patient`;
            touch();
          })
      );
    };
    bindExercises();
    $$(".fcell").forEach((c) => (c.onclick = () => openFlexPicker(b, c.dataset.n, c.dataset.s, refreshCell, touch)));
    $("#btn-rest-ok").onclick = () => {
      const empty = DEF.flex.reduce((n, it) => n + ["D", "G"].filter((s) => !((b.flex[it.n] || {})[s] || {}).d).length, 0);
      if (!empty) return toast("Toutes les cases sont déjà remplies");
      confirmSheet("Mettre OK partout ailleurs ?", `${empty} case(s) vide(s) passeront à « OK – longueur optimale ».`, "Oui, mettre OK", () => {
        DEF.flex.forEach((it) =>
          ["D", "G"].forEach((s) => {
            b.flex[it.n] = b.flex[it.n] || {};
            if (!(b.flex[it.n][s] || {}).d) {
              b.flex[it.n][s] = { d: "ok" };
              refreshCell(it.n, s);
            }
          })
        );
        touch();
      });
    };

    // Actions
    $("#btn-print").onclick = () => openPrintPreview(b);
    $("#btn-finish").onclick = () => {
      b.status = "termine";
      touch();
      toast("Bilan terminé et classé dans le dossier de " + p.prenom);
      $("#btn-finish").textContent = "✓ Terminé";
    };
  }

  function renderKeepScroll() {
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }

  S.onSaved(() => {
    const el = $("#save-state");
    if (el) {
      const d = new Date();
      el.textContent = `✓ Enregistré ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      el.classList.remove("pending");
    }
  });

  /* ---------- Sélecteur de valeur de flexibilité (grands boutons) ---------- */
  function openFlexPicker(b, n, side, refreshCell, touch) {
    const idx = DEF.flex.findIndex((it) => it.n === n);
    const it = DEF.flex[idx];
    const v = ((b.flex[n] || {})[side]) || {};
    const opt = (val, label, cls) => {
      const sel = v.d === val.d && (val.d === "ok" || v.g === val.g);
      return `<button class="fp-opt ${cls} ${sel ? "sel" : ""}" data-d="${val.d}" data-g="${val.g || ""}">${glyph(val)}<span>${esc(label)}</span></button>`;
    };
    const el = openSheet(
      `
      <div class="fp-head">
        <div><span class="fnum big">${it.n}</span> <b class="fp-title">${esc(it.label)}</b></div>
        <div class="seg lg" role="group" aria-label="Côté">
          <button class="${side === "D" ? "on" : ""}" data-side="D">Droite</button>
          <button class="${side === "G" ? "on" : ""}" data-side="G">Gauche</button>
        </div>
      </div>
      <div class="fp-body">
        ${opt({ d: "ok" }, "OK – longueur optimale", "okopt")}
        <div class="fp-group"><h4>Raccourci <span class="muted">(+)</span></h4>
          <div class="fp-row">${DEF.scale.short.map((l, i) => opt({ d: "short", g: i + 1 }, l, "short")).join("")}</div></div>
        <div class="fp-group"><h4>Trop long <span class="muted">(|)</span></h4>
          <div class="fp-row">${DEF.scale.long.map((l, i) => opt({ d: "long", g: i + 1 }, l, "long")).join("")}</div></div>
        <div class="fp-flags">
          <button class="toggle ${v.N ? "on" : ""}" data-flag="N"><b class="flag">N</b> ${esc(DEF.scale.flags.N)}</button>
          <button class="toggle ${v.a ? "on" : ""}" data-flag="a"><b class="flag">ɑ</b> ${esc(DEF.scale.flags.a)}</button>
        </div>
      </div>
      <div class="fp-foot">
        <button class="btn ghost" data-act="clear">Effacer la case</button>
        <label class="autonext"><input type="checkbox" id="fp-auto" ${prefs.autoNext ? "checked" : ""}/> Passer à la case suivante</label>
        <button class="btn" data-act="prev">‹ Précédente</button>
        <button class="btn" data-act="next">Suivante ›</button>
        <button class="btn primary" data-act="close">Fermer</button>
      </div>`,
      "flex-picker " + (side === "D" ? "side-d" : "side-g")
    );

    const set = (patch) => {
      b.flex[n] = b.flex[n] || {};
      b.flex[n][side] = patch;
      refreshCell(n, side);
      touch();
    };
    const move = (dir) => {
      let i = idx, s = side;
      if (dir > 0) {
        if (s === "D") s = "G";
        else if (i < DEF.flex.length - 1) (i++, (s = "D"));
        else return closeSheet();
      } else {
        if (s === "G") s = "D";
        else if (i > 0) (i--, (s = "G"));
        else return;
      }
      openFlexPicker(b, DEF.flex[i].n, s, refreshCell, touch);
      const row = document.getElementById("f-" + DEF.flex[i].n);
      if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
    };

    $$(".fp-opt", el).forEach(
      (o) =>
        (o.onclick = () => {
          const cur = ((b.flex[n] || {})[side]) || {};
          set({ d: o.dataset.d, g: o.dataset.g ? +o.dataset.g : undefined, N: cur.N, a: cur.a });
          if (prefs.autoNext) move(1);
          else openFlexPicker(b, n, side, refreshCell, touch);
        })
    );
    $$("[data-flag]", el).forEach(
      (t) =>
        (t.onclick = () => {
          const cur = Object.assign({}, ((b.flex[n] || {})[side]) || {});
          cur[t.dataset.flag] = !cur[t.dataset.flag];
          if (!cur.d) cur.d = "ok";
          set(cur);
          openFlexPicker(b, n, side, refreshCell, touch);
        })
    );
    $$("[data-side]", el).forEach((s) => (s.onclick = () => openFlexPicker(b, n, s.dataset.side, refreshCell, touch)));
    $("#fp-auto", el).onchange = (e) => {
      prefs.autoNext = e.target.checked;
      savePrefs();
    };
    $("[data-act=clear]", el).onclick = () => {
      set({});
      openFlexPicker(b, n, side, refreshCell, touch);
    };
    $("[data-act=prev]", el).onclick = () => move(-1);
    $("[data-act=next]", el).onclick = () => move(1);
    $("[data-act=close]", el).onclick = closeSheet;
  }

  /* =========================================================
   * APERÇU / IMPRESSION : feuille A4 paysage identique au papier
   * ========================================================= */
  function printSheetHTML(b) {
    const p = S.patient(b.patientId);
    // Schéma + calque d'encre superposés : on ne dessine jamais l'image dans le canvas,
    // sinon toDataURL échoue quand la page est ouverte en file:// (canvas « contaminé »).
    const draw = (k) => {
      const d = DEF.drawings[k];
      const inkLayer = b.ink[k].length ? `<img src="${Ink.renderToDataURL(b.ink[k], d.w, d.h, null, 1.5, true)}" alt="" />` : "";
      return `<span class="ps-stack"><img src="${d.img}" alt="" />${inkLayer}</span>`;
    };
    const textZone = (key, w) => {
      const f = b[key];
      const img = f.ink && f.ink.length ? `<img src="${Ink.renderToDataURL(f.ink, w, 260, null, 1)}" alt="" />` : "";
      return `${f.text ? `<p>${esc(f.text)}</p>` : ""}${img}`;
    };
    const flexRows = DEF.flex
      .map((it) => {
        const v = b.flex[it.n] || {};
        return `<div class="ps-frow ${it.sep ? "sep" : ""}"><span>${it.n} ${esc(it.label)}</span><span>${glyph(v.D)}</span><span>${glyph(v.G)}</span></div>`;
      })
      .join("");
    const ex = b.exercises.map((id) => DEF.exercises.find((e) => e.id === id)).filter(Boolean);
    const page1 = `
      <div class="ps">
        <div class="ps-left">
          <div class="ps-h-logo"><img src="assets/dino-logo.png" alt="" /></div>
          <div class="ps-h-name"><div class="ps-box"><span class="ps-l">Nom :</span> <b>${esc(p.nom.toUpperCase())} ${esc(p.prenom)}</b></div><div class="ps-box">${esc(b.header.info)}</div></div>
          <div class="ps-h-small">${["f1", "f2", "f3", "f4"].map((k) => `<div class="ps-box sm">${esc(b.header[k])}</div>`).join("")}</div>
          <div class="ps-box ps-diag"><span class="ps-l">Diagnostic :</span>${textZone("diagnostic", 700)}</div>
          <div class="ps-box ps-anam"><span class="ps-l">Anamnèse :</span>${textZone("anamnese", 520)}</div>
          <div class="ps-box ps-date"><span class="ps-l">Date :</span> <b>${fmt(b.date)}</b><div class="ps-seances">${b.seances.map(fmt).join("<br />")}</div></div>
          <div class="ps-box ps-img ps-douleur"><span class="ps-l">Statique – Douleur – Irradiations</span>${draw("douleur")}<span class="ps-u">U : ${esc(b.u)}</span></div>
          <div class="ps-box ps-img ps-mob"><span class="ps-l">Statique – Mobilité</span>${draw("mobilite")}</div>
          <div class="ps-box ps-img ps-trig"><span class="ps-l">Triggerpoints</span>${draw("trigger")}</div>
          <div class="ps-box ps-checks">${DEF.checks.map((c) => `<span class="ps-cb">${b.checks[c.id] ? "☑" : "☐"} ${esc(c.label)}</span>`).join("")}</div>
          <div class="ps-box ps-spm">SP : ${esc(b.sp)}<br />M : ${esc(b.m)}</div>
        </div>
        <div class="ps-right">
          <div class="ps-legend">
            <span><b>OK</b> Longueur optimale</span>
            ${DEF.scale.short.map((l, i) => `<span>${glyph({ d: "short", g: i + 1 })} ${esc(l)}</span>`).join("")}
            ${DEF.scale.long.map((l, i) => `<span>${glyph({ d: "long", g: i + 1 })} ${esc(l)}</span>`).join("")}
            <span><b>N</b> Léger particip. du nerf</span><span><b>ɑ</b> L'articulation empêche le mouvement</span>
          </div>
          <div class="ps-box ps-flex">
            <div class="ps-frow head"><span>Flexibilité</span><span>Droite</span><span>Gauche</span></div>
            ${flexRows}
          </div>
        </div>
        <div class="ps-foot">© Copyright 2022 MEDI-ACADEMIE GmbH, DINO Physiothérapie et rééducation, Rue de Lausanne 60, 1020 Renens · Bilan établi par ${esc(S.therapist(b.therapistId).name)} · ${esc(b.type)} · réf. ${esc(b.id)}</div>
      </div>`;
    const page2 = ex.length
      ? `<div class="ps ps-page2">
          <h2>Programme d'exercices à domicile — ${esc(p.prenom)} ${esc(p.nom)}</h2>
          <p>Préparé par ${esc(S.therapist(b.therapistId).name)} le ${fmt(b.date)}. Les vidéos sont disponibles dans votre espace patient.</p>
          <ol>${ex.map((e) => `<li><b>${esc(e.title)}</b> — ${esc(e.dose)} <small>(${esc(DEF.regions[e.region])})</small></li>`).join("")}</ol>
        </div>`
      : "";
    return page1 + page2;
  }

  function openPrintPreview(b) {
    const p = S.patient(b.patientId);
    const root = document.getElementById("print-root");
    root.innerHTML = printSheetHTML(b);
    const fileName = `${b.date}_${p.nom}_${p.prenom}_${b.type}`.replace(/\s+/g, "-");
    const el = openSheet(
      `
      <div class="pv-head">
        <div><h2>Aperçu avant impression</h2><p class="muted">Nom de fichier proposé : <b>${esc(fileName)}.pdf</b></p></div>
        <div class="pv-actions">
          <button class="btn big primary" id="pv-print">Imprimer / Enregistrer en PDF</button>
          <button class="btn big" data-act="close">Fermer</button>
        </div>
      </div>
      <p class="muted small">Sur iPad : « Imprimer », puis écartez deux doigts sur l'aperçu pour obtenir le PDF et le partager ou l'enregistrer dans Fichiers.</p>
      <div class="pv-stage"><div class="pv-scale">${printSheetHTML(b)}</div></div>`,
      "preview"
    );
    const stage = $(".pv-stage", el);
    const sc = $(".pv-scale", el);
    const fit = () => {
      const pagePx = (297 / 25.4) * 96;
      const k = Math.min(1, (stage.clientWidth - 8) / pagePx);
      sc.style.transform = `scale(${k})`;
      sc.style.height = sc.scrollHeight * k + "px";
    };
    requestAnimationFrame(fit);
    $("[data-act=close]", el).onclick = closeSheet;
    $("#pv-print", el).onclick = () => {
      if (CFG.noPrint) {
        return toast("Démonstration en ligne : l'impression est désactivée ici. Dans la vraie application, ce bouton imprime la feuille ou crée le PDF.");
      }
      const old = document.title;
      document.title = fileName;
      try {
        window.print();
      } catch (e) {}
      document.title = old;
    };
  }

  /* =========================================================
   * ÉCRAN DIRECTION : tous les bilans + suivi du cabinet
   * ========================================================= */
  function renderDirection() {
    const st = S.state;
    const month = S.todayISO().slice(0, 7);
    const filter = route.t || "all";
    const physios = st.therapists.filter((t) => t.role === "physio");
    const bilans = st.bilans
      .filter((b) => filter === "all" || b.therapistId === filter)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    const thisMonth = st.bilans.filter((b) => b.date.startsWith(month)).length;
    const drafts = st.bilans.filter((b) => b.status === "brouillon").length;
    const maxCount = Math.max(1, ...physios.map((t) => st.bilans.filter((b) => b.therapistId === t.id).length));

    app.innerHTML = `
      ${brandBar()}
      <main class="page">
        <div class="page-head"><h1>Suivi du cabinet</h1><span class="pill accent">Accès Direction</span></div>
        <div class="tiles">
          <div class="tile"><b>${st.bilans.length}</b><span>bilans archivés</span></div>
          <div class="tile"><b>${thisMonth}</b><span>bilans ce mois-ci</span></div>
          <div class="tile ${drafts ? "warn" : ""}"><b>${drafts}</b><span>brouillons non terminés</span></div>
          <div class="tile"><b>${st.patients.length}</b><span>patients</span></div>
        </div>

        <section class="box">
          <h3>Bilans par physiothérapeute</h3>
          <div class="bars">
            ${physios
              .map((t) => {
                const n = st.bilans.filter((b) => b.therapistId === t.id).length;
                return `<div class="bar-row"><span>${esc(t.name)}</span><span class="bar"><i style="width:${(n / maxCount) * 100}%"></i></span><b>${n}</b></div>`;
              })
              .join("")}
          </div>
        </section>

        <div class="filter-chips">
          <button class="chip ${filter === "all" ? "on" : ""}" data-t="all">Tous</button>
          ${physios.map((t) => `<button class="chip ${filter === t.id ? "on" : ""}" data-t="${t.id}">${esc(t.name)}</button>`).join("")}
        </div>
        <div class="table-wrap">
          <table class="dtable">
            <thead><tr><th>Date</th><th>Patient</th><th>Physio</th><th>Type</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              ${bilans
                .map((b) => {
                  const p = S.patient(b.patientId);
                  return `<tr>
                    <td class="num">${fmt(b.date)}</td>
                    <td><b>${esc(p.nom.toUpperCase())}</b> ${esc(p.prenom)}</td>
                    <td>${esc(S.therapist(b.therapistId).name)}</td>
                    <td>${esc(b.type)}</td>
                    <td><span class="pill ${b.status === "termine" ? "ok" : "warn"}">${b.status === "termine" ? "Terminé" : "Brouillon"}</span></td>
                    <td class="actions"><button class="btn small" data-preview="${b.id}">Aperçu / PDF</button><button class="btn small" data-open="${b.id}">Ouvrir</button></td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </main>`;
    bindBrandBar();
    $$("[data-t]").forEach((c) => (c.onclick = () => ((route.t = c.dataset.t), renderDirection())));
    $$("[data-open]").forEach((c) => (c.onclick = () => go("bilan", { bilanId: c.dataset.open })));
    $$("[data-preview]").forEach((c) => (c.onclick = () => openPrintPreview(S.bilan(c.dataset.preview))));
  }

  /* =========================================================
   * PORTAIL PATIENT (aperçu phase 4) : exercices choisis par le physio
   * ========================================================= */
  function renderPortal() {
    const p = S.patient(route.patientId || "p-1");
    const b = S.bilansOf(p.id).find((x) => x.exercises.length);
    const ex = b ? b.exercises.map((id) => DEF.exercises.find((e) => e.id === id)).filter(Boolean) : [];
    const regions = [...new Set(ex.map((e) => e.region))];
    app.innerHTML = `
      <main class="portal">
        <button class="btn back" id="btn-back">‹ Revenir à l'application du cabinet</button>
        <div class="phone">
          <div class="ph-top"><img src="assets/dino-logo.png" alt="" /><span>Mon programme</span></div>
          <h1>Bonjour ${esc(p.prenom)}</h1>
          ${
            b
              ? `<p class="muted">Programme préparé par <b>${esc(S.therapist(b.therapistId).name)}</b> le ${fmt(b.date)}.</p>
            <div class="region-chips">${regions.map((r) => `<span class="chip on">${esc(DEF.regions[r])}</span>`).join("")}</div>
            <div class="ph-list">
              ${ex
                .map(
                  (e, i) => `
                <article class="ph-ex">
                  <div class="ph-video"><span class="play" aria-hidden="true">▶</span><small>Vidéo de Dino (à venir)</small></div>
                  <div class="ph-ex-body">
                    <span class="muted small">${i + 1} / ${ex.length} · ${esc(DEF.regions[e.region])}</span>
                    <b>${esc(e.title)}</b>
                    <span>${esc(e.dose)}</span>
                    <button class="btn done" data-done="${e.id}">Fait aujourd'hui</button>
                  </div>
                </article>`
                )
                .join("")}
            </div>`
              : `<p>Votre physiothérapeute n'a pas encore choisi d'exercices.</p>`
          }
        </div>
      </main>`;
    $("#btn-back").onclick = () => go("home");
    $$("[data-done]").forEach(
      (btn) =>
        (btn.onclick = () => {
          btn.classList.toggle("on");
          btn.textContent = btn.classList.contains("on") ? "✓ Fait aujourd'hui" : "Fait aujourd'hui";
        })
    );
  }

  /* ---------- Démarrage ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeSheet();
  });
  render();

  // Démo publique : bandeau permanent + accueil en 3 étapes à la première visite.
  if (CFG.publicDemo) {
    const banner = document.createElement("div");
    banner.className = "demo-banner";
    banner.innerHTML = `<span><b>Démonstration</b> · patients fictifs, tu peux tout essayer</span>${
      CFG.feedbackUrl ? `<a href="${esc(CFG.feedbackUrl)}" target="_blank" rel="noopener">Donner mon avis ›</a>` : ""
    }`;
    document.body.insertBefore(banner, app);
    let seen = false;
    try {
      seen = sessionStorage.getItem("dino-demo-welcome") === "1";
    } catch (e) {}
    if (!seen) {
      const pc = CFG.device === "ordinateur";
      const el = openSheet(`
        <h2>Bienvenue dans la démonstration</h2>
        <p class="lead">Essaie librement : rien ne peut être cassé, les patients sont fictifs.</p>
        <ol class="welcome-steps">
          <li>${pc ? "Clique sur" : "Touche"} <b>« DUPONT Marie »</b>, puis ${pc ? "sur " : ""}<b>« Ouvrir »</b> pour voir un bilan rempli.</li>
          <li><b>Dessine</b> sur les squelettes ${pc ? "avec la souris (bouton gauche enfoncé)" : "avec l'Apple Pencil"}. La couleur se choisit en bas de l'écran.</li>
          <li>Dans <b>Flexibilité</b>, ${pc ? "clique sur une case, puis sur" : "touche une case, puis"} une grande réponse (OK, +, |).</li>
        </ol>
        <p class="muted">Le texte est trop petit ? Dans un bilan, ${pc ? "clique sur" : "touche"} le grand <b>A</b> en haut.</p>
        <div class="sheet-actions"><button class="btn huge primary" data-act="go">Commencer</button></div>`);
      $("[data-act=go]", el).onclick = () => {
        try {
          sessionStorage.setItem("dino-demo-welcome", "1");
        } catch (e) {}
        closeSheet();
      };
    }
  }
})();
