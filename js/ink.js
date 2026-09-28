/*
 * InkPad : zone de dessin au stylo (Apple Pencil) par-dessus une image ou une page lignée.
 * - Les traits sont stockés en VECTEUR (points + pression) dans le repère logique de l'image,
 *   donc identiques sur iPad, ordinateur, impression et PDF.
 * - Par défaut seul le stylo (ou la souris) dessine : le doigt fait défiler la page
 *   (« rejet de la paume »). Un réglage global permet de dessiner au doigt.
 */
(function () {
  const Ink = {
    fingerDraws: false,
    pen: "#111827",
    mode: "draw" // "draw" | "erase"
  };

  function strokeWidth(base, pressure) {
    const p = pressure > 0 ? pressure : 0.5;
    return base * (0.55 + p * 0.9);
  }

  // Dessine une liste de traits sur un contexte 2D déjà mis à l'échelle.
  Ink.drawStrokes = function (ctx, strokes) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of strokes) {
      const pts = s.p;
      if (!pts.length) continue;
      ctx.strokeStyle = s.c;
      ctx.fillStyle = s.c;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0][0], pts[0][1], strokeWidth(s.w, pts[0][2]) / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.lineWidth = strokeWidth(s.w, (a[2] + b[2]) / 2);
        ctx.beginPath();
        if (i > 1) {
          const z = pts[i - 2];
          ctx.moveTo((z[0] + a[0]) / 2, (z[1] + a[1]) / 2);
          ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        } else {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        }
        ctx.stroke();
      }
    }
  };

  // Rendu hors-écran (image de fond + traits) → dataURL, pour l'aperçu / impression.
  // `transparent` : pas de fond blanc (calque posé par-dessus l'image du schéma).
  Ink.renderToDataURL = function (strokes, w, h, bgImg, scale, transparent) {
    const c = document.createElement("canvas");
    const k = scale || 1;
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    const ctx = c.getContext("2d");
    if (!transparent) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.setTransform(k, 0, 0, k, 0, 0);
    if (bgImg && bgImg.complete && bgImg.naturalWidth) ctx.drawImage(bgImg, 0, 0, w, h);
    Ink.drawStrokes(ctx, strokes || []);
    return c.toDataURL("image/png");
  };

  /**
   * @param {HTMLElement} host  élément qui recevra le canvas (position: relative)
   * @param {{w:number,h:number,strokes:Array,onChange:Function,baseWidth?:number}} opts
   */
  Ink.Pad = function (host, opts) {
    const pad = this;
    pad.w = opts.w;
    pad.h = opts.h;
    pad.strokes = opts.strokes || [];
    pad.undoStack = [];
    pad.onChange = opts.onChange || function () {};
    pad.baseWidth = opts.baseWidth || 3.2;

    const canvas = document.createElement("canvas");
    canvas.className = "ink-canvas";
    host.appendChild(canvas);
    pad.canvas = canvas;
    const ctx = canvas.getContext("2d");

    let scale = 1;
    function resize() {
      const rect = host.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = window.devicePixelRatio || 1;
      scale = rect.width / pad.w;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(pad.h * scale * dpr);
      canvas.style.height = pad.h * scale + "px";
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
      pad.redraw();
    }
    pad.redraw = function () {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      Ink.drawStrokes(ctx, pad.strokes);
      if (current) Ink.drawStrokes(ctx, [current]);
    };

    function toLocal(e) {
      const r = canvas.getBoundingClientRect();
      return [
        Math.round(((e.clientX - r.left) / scale) * 10) / 10,
        Math.round(((e.clientY - r.top) / scale) * 10) / 10,
        Math.round((e.pressure || 0.5) * 100) / 100
      ];
    }

    function accepts(e) {
      return e.pointerType === "pen" || e.pointerType === "mouse" || Ink.fingerDraws;
    }

    function eraseAt(pt) {
      const r = 14 / Math.max(scale, 0.3);
      const before = pad.strokes.length;
      const kept = pad.strokes.filter(
        (s) => !s.p.some((q) => Math.abs(q[0] - pt[0]) < r && Math.abs(q[1] - pt[1]) < r)
      );
      if (kept.length !== before) {
        pad.undoStack.push(pad.strokes);
        pad.strokes = kept;
        pad.redraw();
        pad.onChange(pad.strokes);
      }
    }

    let current = null;
    let activeId = null;

    canvas.addEventListener("pointerdown", (e) => {
      if (!accepts(e) || activeId !== null) return;
      e.preventDefault();
      activeId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
      const pt = toLocal(e);
      if (Ink.mode === "erase") {
        eraseAt(pt);
        return;
      }
      current = { c: Ink.pen, w: pad.baseWidth, p: [pt] };
      pad.redraw();
    });

    canvas.addEventListener("pointermove", (e) => {
      if (e.pointerId !== activeId) return;
      e.preventDefault();
      const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      const events = coalesced.length ? coalesced : [e];
      if (Ink.mode === "erase") {
        events.forEach((ev) => eraseAt(toLocal(ev)));
        return;
      }
      if (!current) return;
      events.forEach((ev) => current.p.push(toLocal(ev)));
      pad.redraw();
    });

    function end(e) {
      if (e.pointerId !== activeId) return;
      activeId = null;
      if (current) {
        pad.undoStack.push(pad.strokes);
        pad.strokes = pad.strokes.concat([current]);
        current = null;
        pad.redraw();
        pad.onChange(pad.strokes);
      }
    }
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);

    // iPadOS : empêcher le défilement quand c'est le Pencil qui touche l'écran,
    // tout en laissant le doigt faire défiler la page.
    function blockStylusScroll(e) {
      const t = e.touches && e.touches[0];
      if ((t && t.touchType === "stylus") || Ink.fingerDraws) e.preventDefault();
    }
    canvas.addEventListener("touchstart", blockStylusScroll, { passive: false });
    canvas.addEventListener("touchmove", blockStylusScroll, { passive: false });

    pad.undo = function () {
      if (!pad.undoStack.length) return;
      pad.strokes = pad.undoStack.pop();
      pad.redraw();
      pad.onChange(pad.strokes);
    };
    pad.clear = function () {
      if (!pad.strokes.length) return;
      pad.undoStack.push(pad.strokes);
      pad.strokes = [];
      pad.redraw();
      pad.onChange(pad.strokes);
    };

    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    window.addEventListener("resize", resize);
    requestAnimationFrame(resize);
  };

  window.Ink = Ink;
})();
