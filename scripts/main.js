/* ==========================================================================
   Mis XV · Heyli — interactividad
   ========================================================================== */
(() => {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURACIÓN EDITABLE
     ------------------------------------------------------------------ */
  const CONFIG = {
    name: 'Heyli',
    // Fecha y hora del evento (hora de Colombia, UTC-5)
    event: { year: 2026, month: 12, day: 5, hour: 17, minute: 0 },
    durationHours: 7,

    // WhatsApp (con indicativo de país, sin + ni espacios)
    phone: '573113337059',
    whatsappMessage:
      '¡Hola Heyli! Quiero confirmar mi asistencia a tus XV años el sábado 5 de diciembre.',

    // Ubicación. Si conoces las coordenadas exactas de la finca, ponlas en
    // `coords` (ej. '4.4851,-75.7420') y el mapa / botones las usarán.
    place: {
      name: 'Finca El Rocío',
      query: 'Finca El Rocío, Vía El Caimo, Armenia, Quindío, Colombia',
      // Punto de referencia: Estación de Policía San Pedro (la finca no figura en los mapas)
      coords: '4.4919404,-75.7021972',
    },

    // Galería (carpeta images/)
    gallery: [
      { src: 'images/family.jpeg',    caption: 'Antes de llegar, ya era amada' },
      { src: 'images/baby.jpeg',      caption: 'Mis primeros días' },
      { src: 'images/child.jpeg',     caption: 'Creciendo entre risas' },
      { src: 'images/girl.jpeg',      caption: 'Una sonrisa que florece' },
      { src: 'images/table.jpeg',     caption: 'Pequeña soñadora' },
      { src: 'images/beautiful.jpeg', caption: 'Floreciendo' },
      { src: 'images/teen.jpeg',      caption: 'Quince primaveras' },
    ],
    autoplayMs: 5000,
  };

  /* ------------------------------------------------------------------
     Al recargar, siempre iniciar en el primer apartado
     ------------------------------------------------------------------ */
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  window.scrollTo(0, 0);
  window.addEventListener('pageshow', () => window.scrollTo(0, 0));

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, '0');
  const rand = (a, b) => a + Math.random() * (b - a);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const { year, month, day, hour, minute } = CONFIG.event;
  // Fecha absoluta en UTC (Colombia = UTC-5, sin horario de verano)
  const EVENT_DATE = new Date(Date.UTC(year, month - 1, day, hour + 5, minute));

  /* ------------------------------------------------------------------
     Wing SVG (reutilizado por las mariposas)
     ------------------------------------------------------------------ */
  const WING_FILLS = ['url(#wingGreen)', 'url(#wingGold)', 'url(#wingBlush)'];
  const wingSVG = (fill) => `
    <svg viewBox="0 0 50 80" aria-hidden="true">
      <path d="M2 36C8 8 36-4 47 12c7 12-6 26-44 28z" fill="${fill}" stroke="#c6a052" stroke-width=".9" stroke-opacity=".8"/>
      <path d="M3 43c26-2 44 10 37 25-6 13-27 7-37-21z" fill="${fill}" stroke="#c6a052" stroke-width=".9" stroke-opacity=".8"/>
      <path d="M4 37C16 26 28 16 40 12M4 40c12-4 24-8 34-6M4 45c10 4 20 10 28 18" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width=".6"/>
      <circle cx="34" cy="18" r="3" fill="#fff" fill-opacity=".55"/>
      <circle cx="28" cy="60" r="2.2" fill="#fff" fill-opacity=".5"/>
    </svg>`;

  const butterflyMarkup = (fill) => `
    <div class="butterfly__inner">
      <span class="wing wing--l">${wingSVG(fill)}</span>
      <span class="wing wing--r">${wingSVG(fill)}</span>
      <span class="butterfly__body"></span>
    </div>`;

  /* ------------------------------------------------------------------
     Música de fondo
     ------------------------------------------------------------------ */
  const audio = $('#bgMusic');
  const musicBtn = $('#musicToggle');
  audio.volume = 0;

  let fadeId = 0;
  function fadeVolume(to, ms = 1600) {
    const id = ++fadeId;              // cancela cualquier fundido anterior
    const from = audio.volume;
    const start = performance.now();
    const step = (now) => {
      if (id !== fadeId) return;
      const t = Math.min(1, (now - start) / ms);
      audio.volume = Math.min(1, Math.max(0, from + (to - from) * t));
      if (t < 1) requestAnimationFrame(step);
      else if (to === 0) audio.pause();
    };
    requestAnimationFrame(step);
  }

  function setMusicUI(playing) {
    musicBtn.classList.toggle('is-playing', playing);
    musicBtn.setAttribute('aria-pressed', String(playing));
    musicBtn.setAttribute('aria-label', playing ? 'Pausar música' : 'Reproducir música');
  }

  function playMusic() {
    const p = audio.play();
    if (p && p.then) {
      p.then(() => { setMusicUI(true); fadeVolume(0.7); }).catch(() => setMusicUI(false));
    }
  }

  musicBtn.addEventListener('click', () => {
    if (audio.paused) playMusic();
    else { setMusicUI(false); fadeVolume(0, 600); }
  });
  // Respaldo por si algún navegador ignora el atributo loop
  audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play().catch(() => {}); });

  /* ------------------------------------------------------------------
     Portal de apertura
     ------------------------------------------------------------------ */
  const portal = $('#portal');
  $('#openInvite').addEventListener('click', (e) => {
    playMusic();
    const btn = e.currentTarget;
    btn.disabled = true;
    const seal = $('.seal', portal).getBoundingClientRect();
    portal.classList.add('is-open');
    // El polvo sale del sello en el siguiente cuadro, sin bloquear la transición
    requestAnimationFrame(() => Dust.burst(seal.left + seal.width / 2, seal.top + seal.height / 2, 45));
    window.scrollTo(0, 0);
    document.body.classList.remove('is-locked');
    setTimeout(() => document.body.classList.add('is-ready'), 450);
    setTimeout(() => { portal.classList.add('is-gone'); Dust.fairy(); }, 2000);
  });

  /* ------------------------------------------------------------------
     Polvo de hadas (canvas): motas ambientales, estela del cursor,
     ráfagas y una pequeña luz de hada que cruza la pantalla.
     ------------------------------------------------------------------ */
  const Dust = (() => {
    const canvas = $('#dust');
    const ctx = canvas.getContext('2d');
    const COLORS = ['#f6e7b4', '#e3c77f', '#d4b162', '#fff8e1', '#bfe3c8'];
    let W = 0, H = 0, dpr = 1;
    const motes = [];
    const sparks = [];
    let fairyState = null;
    let running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = reduceMotion ? 0 : (W < 640 ? 26 : 50);
      while (motes.length < target) motes.push(newMote(true));
      motes.length = target;
    }

    function newMote(anyY) {
      return {
        x: Math.random() * W,
        y: anyY ? Math.random() * H : H + 10,
        r: rand(.6, 1.8),
        vy: rand(-.25, -.08),
        vx: rand(-.08, .08),
        ph: Math.random() * Math.PI * 2,
        sp: rand(.01, .03),
        c: COLORS[(Math.random() * COLORS.length) | 0],
      };
    }

    function spawn(x, y, opts = {}) {
      if (sparks.length > 420) return;
      const ang = opts.angle ?? Math.random() * Math.PI * 2;
      const speed = opts.speed ?? rand(.3, 1.6);
      sparks.push({
        x, y,
        vx: Math.cos(ang) * speed + (opts.vx || 0),
        vy: Math.sin(ang) * speed + (opts.vy || 0),
        g: opts.g ?? .025,
        life: 0,
        max: opts.max ?? rand(40, 90),
        r: opts.r ?? rand(.8, 2.6),
        star: Math.random() < .35,
        rot: Math.random() * Math.PI,
        c: COLORS[(Math.random() * COLORS.length) | 0],
      });
    }

    function burst(x, y, n = 30) {
      if (reduceMotion) return;
      for (let i = 0; i < n; i++) spawn(x, y, { speed: rand(1, 4.5), max: rand(50, 110), r: rand(1, 3.2) });
    }

    function drawStar(x, y, r, rot) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.quadraticCurveTo(0, 0, 0, r);
      ctx.quadraticCurveTo(0, 0, -r, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r);
      ctx.fill();
      ctx.restore();
    }

    // Luz de hada: recorre una curva Bézier dejando estela dorada
    function fairy() {
      if (reduceMotion || fairyState) return;
      const fromLeft = Math.random() < .5;
      const y0 = rand(H * .15, H * .6);
      const y3 = rand(H * .2, H * .7);
      fairyState = {
        t: 0,
        dur: rand(260, 360),
        p0: { x: fromLeft ? -40 : W + 40, y: y0 },
        p1: { x: W * (fromLeft ? .3 : .7), y: y0 - rand(120, 260) },
        p2: { x: W * (fromLeft ? .6 : .4), y: y3 + rand(120, 260) },
        p3: { x: fromLeft ? W + 40 : -40, y: y3 },
      };
    }

    function bezier(t, a, b, c, d) {
      const u = 1 - t;
      return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
    }

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      // Motas ambientales
      for (const m of motes) {
        m.ph += m.sp;
        m.x += m.vx + Math.sin(m.ph) * .15;
        m.y += m.vy;
        if (m.y < -10) Object.assign(m, newMote(false));
        const a = .25 + .55 * Math.abs(Math.sin(m.ph));
        ctx.globalAlpha = a * .35;
        ctx.fillStyle = m.c;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }

      // Luz de hada
      if (fairyState) {
        const f = fairyState;
        f.t++;
        const t = f.t / f.dur;
        const x = bezier(t, f.p0.x, f.p1.x, f.p2.x, f.p3.x) + Math.sin(f.t * .15) * 10;
        const y = bezier(t, f.p0.y, f.p1.y, f.p2.y, f.p3.y) + Math.cos(f.t * .11) * 8;
        for (let i = 0; i < 3; i++) spawn(x, y, { speed: rand(.1, .7), g: .02, max: rand(40, 80), r: rand(.6, 2.2) });
        const g = ctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, 'rgba(255,250,225,1)');
        g.addColorStop(.25, 'rgba(246,231,180,.75)');
        g.addColorStop(1, 'rgba(227,199,127,0)');
        ctx.globalAlpha = .9 + Math.sin(f.t * .4) * .1;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
        if (t >= 1) fairyState = null;
      }

      // Destellos
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life++;
        s.vx *= .985;
        s.vy = s.vy * .985 + s.g;
        s.x += s.vx;
        s.y += s.vy;
        s.rot += .05;
        const k = 1 - s.life / s.max;
        if (k <= 0) { sparks.splice(i, 1); continue; }
        ctx.fillStyle = s.c;
        if (s.star) {
          ctx.globalAlpha = k;
          drawStar(s.x, s.y, s.r * 2.4 * (.6 + k * .4), s.rot);
        } else {
          ctx.globalAlpha = k * .3;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = k;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }

    // Estela al mover el cursor o el dedo
    let last = 0;
    function trail(x, y) {
      const now = performance.now();
      if (now - last < 24) return;
      last = now;
      spawn(x, y, { speed: rand(.2, 1), g: .04, max: rand(35, 70), r: rand(.6, 2) });
      spawn(x, y, { speed: rand(.2, 1), g: .04, max: rand(35, 70), r: rand(.6, 2) });
    }

    if (!reduceMotion) {
      window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') trail(e.clientX, e.clientY); }, { passive: true });
      window.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (t) trail(t.clientX, t.clientY); }, { passive: true });
      window.addEventListener('pointerdown', (e) => burst(e.clientX, e.clientY, 14), { passive: true });
      // La luz de hada vuelve a cruzar cada cierto tiempo
      setInterval(() => { if (!document.hidden && document.body.classList.contains('is-ready')) fairy(); }, 14000);
    }

    document.addEventListener('visibilitychange', () => {
      const wasRunning = running;
      running = !document.hidden;
      if (running && !wasRunning) requestAnimationFrame(frame);
    });
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(frame);

    return { burst, spawn, fairy };
  })();

  /* ------------------------------------------------------------------
     Mariposas que vuelan libremente
     ------------------------------------------------------------------ */
  (function butterflies() {
    const toggle = $('#fliesToggle');
    if (reduceMotion) { toggle.hidden = true; return; }
    const layer = $('#butterflies');
    const list = [];
    let enabled = true;
    try { enabled = localStorage.getItem('xv-butterflies') !== 'off'; } catch (e) { /* sin almacenamiento */ }

    function setEnabled(on) {
      enabled = on;
      layer.classList.toggle('is-off', !on);
      toggle.setAttribute('aria-pressed', String(on));
      toggle.setAttribute('aria-label', on ? 'Ocultar mariposas' : 'Mostrar mariposas');
      try { localStorage.setItem('xv-butterflies', on ? 'on' : 'off'); } catch (e) { /* sin almacenamiento */ }
    }
    toggle.addEventListener('click', () => {
      setEnabled(!enabled);
      if (enabled) {
        const r = toggle.getBoundingClientRect();
        Dust.burst(r.left + r.width / 2, r.top + r.height / 2, 24);
      }
    });
    setEnabled(enabled);
    let W = window.innerWidth, H = window.innerHeight;
    let pointer = { x: -999, y: -999 };

    const count = () => (W < 640 ? 5 : 9);

    function pickTarget(b) {
      b.tx = rand(W * .05, W * .95);
      b.ty = rand(H * .08, H * .92);
    }

    function create(i) {
      const el = document.createElement('div');
      el.className = 'butterfly';
      const size = rand(W < 640 ? 22 : 26, W < 640 ? 34 : 44);
      el.style.setProperty('--size', size + 'px');
      el.style.setProperty('--flap', rand(.24, .4).toFixed(2) + 's');
      el.innerHTML = butterflyMarkup(WING_FILLS[i % WING_FILLS.length]);
      layer.appendChild(el);
      const b = {
        el,
        x: rand(0, W),
        y: H + rand(20, 200),     // entran desde abajo
        vx: 0,
        vy: -1,
        speed: rand(.9, 1.6),
        angle: 0,
        t: Math.random() * 1000,
        rest: 0,
      };
      pickTarget(b);
      list.push(b);
    }

    let lastT = performance.now();
    function tick(now) {
      const dt = Math.min(3, (now - lastT) / 16.67);
      lastT = now;
      if (!document.hidden && enabled) {
        for (const b of list) {
          b.t += dt;
          const dx = b.tx - b.x;
          const dy = b.ty - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          if (dist < 40) pickTarget(b);

          // Gira suavemente hacia su destino
          b.vx += ((dx / dist) * b.speed - b.vx) * .025 * dt;
          b.vy += ((dy / dist) * b.speed - b.vy) * .025 * dt;

          // Huye suavemente del cursor
          const px = b.x - pointer.x, py = b.y - pointer.y;
          const pd = Math.hypot(px, py);
          if (pd < 110) {
            b.vx += (px / pd) * .35 * dt;
            b.vy += (py / pd) * .35 * dt;
          }

          // Aleteo: oscilación lateral y vertical
          const flutter = Math.sin(b.t * .12) * .6;
          b.x += (b.vx + flutter * (-b.vy / b.speed) * .5) * dt;
          b.y += (b.vy + Math.sin(b.t * .3) * .45) * dt;

          const target = Math.atan2(b.vy, b.vx) * 180 / Math.PI + 90;
          let diff = ((target - b.angle + 540) % 360) - 180;
          b.angle += diff * .08 * dt;

          b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0) rotate(${b.angle.toFixed(1)}deg)`;

          // De vez en cuando dejan polvo de hadas
          if (Math.random() < .04) Dust.spawn(b.x, b.y + 6, { speed: rand(.1, .4), g: .03, max: rand(30, 60), r: rand(.5, 1.4) });
        }
      }
      requestAnimationFrame(tick);
    }

    window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    window.addEventListener('resize', () => {
      W = window.innerWidth; H = window.innerHeight;
      list.forEach(pickTarget);
    });

    for (let i = 0; i < count(); i++) create(i);
    requestAnimationFrame(tick);
  })();

  /* ------------------------------------------------------------------
     Animaciones de aparición por sección
     ------------------------------------------------------------------ */
  (function reveal() {
    const items = $$('[data-reveal]');
    const markDone = (el) => {
      el.addEventListener('transitionend', function done(e) {
        if (e.propertyName !== 'opacity') return;
        el.classList.add('is-done');
        el.removeEventListener('transitionend', done);
      });
    };
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible', 'is-done'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        markDone(entry.target);
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  })();

  /* ------------------------------------------------------------------
     Calendario
     ------------------------------------------------------------------ */
  (function calendar() {
    const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    $('#calMonth').textContent = MONTHS[month - 1];
    $('#calYear').textContent = year;

    const first = new Date(year, month - 1, 1);
    const offset = (first.getDay() + 6) % 7;            // semana inicia en lunes
    const daysInMonth = new Date(year, month, 0).getDate();
    const wrap = $('#calDays');
    const frag = document.createDocumentFragment();

    for (let i = 0; i < offset; i++) frag.appendChild(document.createElement('span'));
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('span');
      cell.className = 'calendar__day';
      cell.textContent = d;
      const dow = (offset + d - 1) % 7;
      if (dow >= 5) cell.classList.add('is-weekend');
      if (d === day) {
        cell.classList.add('is-event');
        cell.setAttribute('aria-label', `${d} de ${MONTHS[month - 1].toLowerCase()}: mis XV años`);
        const bf = document.createElement('span');
        bf.className = 'butterfly butterfly--perched';
        bf.innerHTML = butterflyMarkup('url(#wingGold)');
        cell.appendChild(bf);
      }
      frag.appendChild(cell);
    }
    wrap.appendChild(frag);
  })();

  /* ------------------------------------------------------------------
     Cuenta regresiva
     ------------------------------------------------------------------ */
  (function countdown() {
    const els = {
      days: $('[data-unit="days"]'),
      hours: $('[data-unit="hours"]'),
      minutes: $('[data-unit="minutes"]'),
      seconds: $('[data-unit="seconds"]'),
    };
    const msg = $('#countdownMsg');
    let timer;

    function set(el, value) {
      if (el.textContent === value) return;
      el.textContent = value;
      el.classList.remove('tick');
      void el.offsetWidth; // reinicia la animación
      el.classList.add('tick');
    }

    function update() {
      const diff = EVENT_DATE - Date.now();
      if (diff <= 0) {
        Object.values(els).forEach((el) => set(el, '00'));
        const endOfParty = EVENT_DATE.getTime() + CONFIG.durationHours * 3600e3;
        msg.textContent = Date.now() < endOfParty
          ? '¡Hoy es el gran día! La magia ya comenzó ✨'
          : 'Gracias por ser parte de mi historia ✨';
        clearInterval(timer);
        return;
      }
      const s = Math.floor(diff / 1000);
      set(els.days, pad(Math.floor(s / 86400)));
      set(els.hours, pad(Math.floor((s % 86400) / 3600)));
      set(els.minutes, pad(Math.floor((s % 3600) / 60)));
      set(els.seconds, pad(s % 60));
    }

    update();
    timer = setInterval(update, 1000);
  })();

  /* ------------------------------------------------------------------
     Enlaces: calendario, mapa, WhatsApp
     ------------------------------------------------------------------ */
  (function links() {
    const enc = encodeURIComponent;
    const toICS = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const end = new Date(EVENT_DATE.getTime() + CONFIG.durationHours * 3600e3);
    const where = CONFIG.place.coords || CONFIG.place.query;

    const cal = $('#addCalendar');
    if (cal) cal.href =
      'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      `&text=${enc(`Mis XV · ${CONFIG.name}`)}` +
      `&dates=${toICS(EVENT_DATE)}/${toICS(end)}` +
      `&details=${enc('Eucaristía y celebración de los quince años de Heyli. Código de vestuario: beige.')}` +
      `&location=${enc(`${CONFIG.place.name}, Vía El Caimo, Armenia, Quindío`)}`;

    // Solo rellena los enlaces que sigan vacíos (href="#") o el mapa sin src,
    // así se respetan los enlaces personalizados escritos en index.html.
    const setIfEmpty = (sel, attr, value) => {
      const el = $(sel);
      if (!el) return;
      const cur = el.getAttribute(attr);
      if (!cur || cur === '#') el.setAttribute(attr, value);
    };
    setIfEmpty('#mapFrame', 'src', `https://maps.google.com/maps?q=${enc(where)}&z=14&output=embed`);
    setIfEmpty('#gmapsBtn', 'href', `https://www.google.com/maps/search/?api=1&query=${enc(where)}`);
    setIfEmpty('#wazeBtn', 'href', CONFIG.place.coords
      ? `https://waze.com/ul?ll=${enc(CONFIG.place.coords)}&navigate=yes`
      : `https://waze.com/ul?q=${enc(where)}&navigate=yes`);

    setIfEmpty('#routeHelpBtn', 'href', `https://wa.me/${CONFIG.phone}?text=${enc('¡Hola! Voy en camino a la Finca El Rocío (vía El Caimo) para los XV de Heyli. ¿Me ayudas con las indicaciones desde la Estación de Policía San Pedro?')}`);
    setIfEmpty('#rsvpBtn', 'href', `https://wa.me/${CONFIG.phone}?text=${enc(CONFIG.whatsappMessage)}`);
  })();

  /* ------------------------------------------------------------------
     Carrusel de fotografías
     ------------------------------------------------------------------ */
  (function carousel() {
    const root = $('#carousel');
    const track = $('#carouselTrack');
    const dotsWrap = $('#carouselDots');
    const counter = $('#carouselCounter');
    const viewport = $('.carousel__viewport', root);
    const total = CONFIG.gallery.length;
    let index = 0;
    let autoplay;

    CONFIG.gallery.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'diapositiva');
      slide.setAttribute('aria-label', `${i + 1} de ${total}: ${item.caption}`);
      slide.innerHTML = `
        <div class="slide__bg" style="background-image:url('${item.src}')"></div>
        <img class="slide__img" src="${item.src}" alt="${item.caption}" ${i > 1 ? 'loading="lazy"' : ''} draggable="false">
        <p class="slide__caption">${item.caption}</p>`;
      track.appendChild(slide);

      const dot = document.createElement('button');
      dot.className = 'carousel__dot';
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Ver foto ${i + 1}`);
      dot.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });

    const slides = $$('.slide', track);
    const dots = $$('.carousel__dot', dotsWrap);

    function go(i) {
      index = (i + total) % total;
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === index);
        s.setAttribute('aria-hidden', String(k !== index));
      });
      dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === index)));
      counter.textContent = `${pad(index + 1)} / ${pad(total)}`;
    }

    const next = () => go(index + 1);
    const prev = () => go(index - 1);

    function restart() {
      clearInterval(autoplay);
      if (!reduceMotion) autoplay = setInterval(next, CONFIG.autoplayMs);
    }

    $('#nextBtn').addEventListener('click', () => { next(); restart(); });
    $('#prevBtn').addEventListener('click', () => { prev(); restart(); });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { next(); restart(); }
      if (e.key === 'ArrowLeft') { prev(); restart(); }
    });
    root.addEventListener('mouseenter', () => clearInterval(autoplay));
    root.addEventListener('mouseleave', restart);

    // Deslizar con el dedo / arrastrar
    let startX = 0, startY = 0, dx = 0, dragging = false, locked = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; locked = null; dx = 0;
      startX = e.clientX; startY = e.clientY;
      clearInterval(autoplay);
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const mx = e.clientX - startX;
      const my = e.clientY - startY;
      if (locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (locked !== 'x') return;
      dx = mx;
      track.classList.add('is-dragging');
      track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      const threshold = viewport.offsetWidth * .15;
      if (locked === 'x' && dx < -threshold) next();
      else if (locked === 'x' && dx > threshold) prev();
      else go(index);
      restart();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // Solo corre el autoplay cuando la galería está a la vista
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) restart(); else clearInterval(autoplay);
      }, { threshold: .3 }).observe(root);
    }

    go(0);
  })();
})();
