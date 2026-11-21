(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);

  /* ---------- header: colour follows the section under it, hides on scroll down ---------- */
  const top = $('.top');
  const themed = $$('[data-theme]');
  let lastY = scrollY;
  function header() {
    if (!top) return;
    const y = 34;
    let theme = 'light';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) { theme = s.dataset.theme; break; }
    }
    const atTop = scrollY < 10;
    top.classList.toggle('on-light', theme === 'light');
    top.classList.toggle('on-dark', theme === 'dark' && !atTop);
    top.classList.toggle('on-ink', theme === 'ink');
    top.style.color = theme === 'light' ? 'var(--ink)' : '#fff';
    const down = scrollY > lastY && scrollY > 300;
    top.classList.toggle('hide', down && !top.matches(':focus-within'));
    lastY = scrollY;
  }

  /* ---------- hero rig: a tracked skeleton doing squats ---------- */
  const rig = $('svg.rig');
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['', '', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
  const say = n => n < 20 ? words[n] : tens[Math.floor(n / 10)] + (n % 10 ? '-' + words[n % 10] : '');

  if (rig) {
    const P = id => rig.getElementById ? rig.getElementById(id) : $('#' + id, rig);
    const bones = ['shin', 'thigh', 'torso', 'uarm', 'farm'].map(P);
    const joints = ['jAnkle', 'jKnee', 'jHip', 'jShoulder', 'jElbow', 'jWrist'].map(P);
    const ring = P('ring'), head = P('head'), arc = P('arc');
    const angleEl = $('.readout.angle'), countEl = $('.count'), saidEl = $('.said b');
    const stage = $('.stage');
    const A = { x: 282, y: 384 };
    const L = { shin: 84, thigh: 90, torso: 100, uarm: 56, farm: 50 };
    const rad = d => d * Math.PI / 180;
    const dir = a => ({ x: Math.cos(a), y: Math.sin(a) });
    const add = (p, d, l) => ({ x: p.x + d.x * l, y: p.y + d.y * l });
    const line = (el, a, b) => { el.setAttribute('x1', a.x); el.setAttribute('y1', a.y); el.setAttribute('x2', b.x); el.setAttribute('y2', b.y); };
    const dot = (el, p) => { el.setAttribute('cx', p.x); el.setAttribute('cy', p.y); };

    let count = 0, wasDown = false, t0 = performance.now();
    const intro = reduce ? 0 : 1500;

    function pose(depth) {
      const k = lerp(176, 74, depth);                 // knee angle
      const shinA = rad(-90 + lerp(3, 30, depth));     // leaning forward (+x)
      const sd = dir(shinA);
      const knee = add(A, sd, L.shin);
      const thighA = shinA - rad(180 - k);
      const hip = add(knee, dir(thighA), L.thigh);
      const torsoA = rad(-90 + lerp(2, 44, depth));
      const td = dir(torsoA);
      const sh = add(hip, td, L.torso);
      const hc = add(sh, td, 30);
      const armA = rad(lerp(96, 6, smooth(depth)));
      const elbow = add(sh, dir(armA), L.uarm);
      const wrist = add(elbow, dir(armA - rad(lerp(8, 2, depth))), L.farm);
      return { k, knee, hip, sh, hc, elbow, wrist, shinA, thighA };
    }

    function draw(p, reveal) {
      line(bones[0], A, p.knee); line(bones[1], p.knee, p.hip); line(bones[2], p.hip, p.sh);
      line(bones[3], p.sh, p.elbow); line(bones[4], p.elbow, p.wrist);
      [A, p.knee, p.hip, p.sh, p.elbow, p.wrist].forEach((pt, i) => {
        dot(joints[i], pt);
        const r = reveal >= 1 ? 7.5 : 7.5 * smooth(clamp(reveal * 7 - i * .9, 0, 1));
        joints[i].setAttribute('r', r);
      });
      dot(head, p.hc); dot(ring, p.knee);
      const bv = clamp(reveal * 2.4 - 1, 0, 1);
      bones.forEach(b => b.style.opacity = bv);
      head.style.opacity = bv;
      // knee arc between shin (towards ankle) and thigh
      const a1 = p.shinA + Math.PI, a2 = p.thighA, r = 30;
      const s = add(p.knee, dir(a1), r), e = add(p.knee, dir(a2), r);
      arc.setAttribute('d', `M${s.x} ${s.y} A${r} ${r} 0 0 1 ${e.x} ${e.y}`);
      arc.style.opacity = bv;
      if (angleEl && stage) {
        angleEl.textContent = `knee ${Math.round(p.k)}°`;
        const box = rig.getBoundingClientRect(), sx = box.width / 400, sy = box.height / 420;
        angleEl.style.left = Math.min((p.knee.x + 30) * sx, box.width - 104) + 'px';
        angleEl.style.top = (p.knee.y + 22) * sy + 'px';
        angleEl.style.opacity = bv;
      }
    }

    let visible = true;
    new IntersectionObserver(([e]) => visible = e.isIntersecting).observe(rig);

    function tick(now) {
      if (visible) {
        const t = now - t0;
        const reveal = intro ? clamp(t / intro, 0, 1) : 1;
        let depth = 0;
        if (!reduce && t > intro) {
          const ph = ((t - intro) / 2300) % 1;
          depth = smooth(clamp((1 - Math.cos(ph * Math.PI * 2)) / 2 * 1.15 - .05, 0, 1));
        } else if (reduce) depth = .55;
        draw(pose(depth), reveal);
        if (depth > .9) wasDown = true;
        if (wasDown && depth < .12) {
          wasDown = false; count = count >= 99 ? 1 : count + 1;
          countEl.textContent = String(count).padStart(2, '0');
          saidEl.textContent = say(count);
          countEl.classList.remove('hit'); void countEl.offsetWidth; countEl.classList.add('hit');
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    requestAnimationFrame(() => $('.hero')?.classList.add('ready'));
  }

  /* ---------- exercise wheel ---------- */
  const moves = $('.moves');
  let movesUpdate = () => {};
  if (moves) {
    const items = $$('.wheel li', moves);
    const ol = $('.wheel ol', moves);
    const img = $('.viewer img', moves), tag = $('.viewer .tag', moves), ix = $('.viewer .ix', moves), viewer = $('.viewer', moves);
    const track = $('.track', moves);
    const n = items.length;
    let cur = -1;
    const loaded = new Set();
    function show(i) {
      if (i === cur) return;
      cur = i;
      items.forEach((li, j) => li.classList.toggle('on', j === i));
      const li = items[i];
      img.src = `assets/move/${li.dataset.key}.webp`;
      img.alt = `3D trainer doing ${li.textContent.trim().toLowerCase()}`;
      tag.textContent = li.dataset.group + (li.classList.contains('pro') ? ', Pro' : ', free');
      ix.textContent = `${i + 1} of ${n}`;
      viewer.classList.remove('bump'); void viewer.offsetWidth; viewer.classList.add('bump');
      setTimeout(() => viewer.classList.remove('bump'), 260);
      // warm the next one
      const nx = items[i + 1];
      if (nx && !loaded.has(nx.dataset.key)) { loaded.add(nx.dataset.key); new Image().src = `assets/move/${nx.dataset.key}.webp`; }
    }
    movesUpdate = () => {
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      const p = clamp(-r.top / span, 0, 1);
      const f = clamp(p * n - .5, 0, n - 1);
      const i = Math.floor(f), fr = f - i;
      const eased = i + smooth(clamp((fr - .25) / .5, 0, 1));
      const h = items[0].getBoundingClientRect().height;
      ol.style.transform = `translateY(${-(eased + .5) * h}px)`;
      show(Math.round(eased));
    };
    items.forEach((li, j) => li.addEventListener('click', () => {
      const r = track.getBoundingClientRect();
      const span = r.height - innerHeight;
      scrollTo({ top: scrollY + r.top + span * ((j + .5) / n), behavior: reduce ? 'auto' : 'smooth' });
    }));
  }

  /* ---------- steps rail ---------- */
  const steps = $('.steps ol');
  function stepsUpdate() {
    if (!steps) return;
    const r = steps.getBoundingClientRect();
    const mid = innerHeight * .6;
    const p = clamp((mid - r.top) / r.height, 0, 1);
    $('.steps .rail i').style.height = p * 100 + '%';
    $$('li', steps).forEach(li => li.classList.toggle('lit', li.getBoundingClientRect().top < mid));
  }

  /* ---------- promise: words light up as you read ---------- */
  const big = $('.promise .big');
  let ws = [];
  if (big) {
    const walk = node => {
      [...node.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.append(part);
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.append(s); }
          });
          c.replaceWith(frag);
        } else walk(c);
      });
    };
    walk(big);
    ws = $$('.w', big);
  }
  function promiseUpdate() {
    if (!big) return;
    const r = big.getBoundingClientRect();
    const p = clamp((innerHeight * .85 - r.top) / (r.height + innerHeight * .35), 0, 1);
    const k = Math.round(p * ws.length * 1.05);
    ws.forEach((w, i) => w.classList.toggle('in', i < k));
  }

  /* ---------- pricing switch with rolling digits ---------- */
  const sw = $('.switch');
  if (sw) {
    const btns = $$('button', sw), knob = $('.knob', sw);
    const amt = $('.pro .amt'), unit = $('.pro .amt small'), note = $('.pro .note');
    const plans = {
      year: { n: '349', unit: 'kr a year', note: 'Starts with 3 days free. That is about 6,70 kr a week, 89% less than paying weekly.' },
      week: { n: '59', unit: 'kr a week', note: 'Billed every week. Cancel any time in your iPhone settings.' }
    };
    const rolls = $$('.roll', amt);
    rolls.forEach(r => {
      const col = document.createElement('span');
      col.innerHTML = '0123456789'.split('').map(d => `<i>${d}</i>`).join('') + '<i></i>';
      r.append(col);
    });
    function set(k) {
      const p = plans[k];
      const digits = p.n.padStart(rolls.length, ' ');
      rolls.forEach((r, i) => {
        const d = digits[i];
        const idx = d === ' ' ? 10 : +d;
        r.firstElementChild.style.transform = `translateY(${-idx}em)`;
        r.style.width = d === ' ' ? '0' : '';
      });
      unit.textContent = p.unit; note.textContent = p.note;
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plan === k)));
      const on = btns.find(b => b.dataset.plan === k);
      knob.style.width = on.offsetWidth + 'px';
      knob.style.transform = `translateX(${on.offsetLeft - 4}px)`;
      $('.pro .sr').textContent = `${p.n} ${p.unit}`;
    }
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.plan)));
    set('year');
    addEventListener('resize', () => set(btns.find(b => b.getAttribute('aria-pressed') === 'true').dataset.plan));
  }

  /* ---------- faq: animate open and close ---------- */
  $$('.faq details').forEach(d => {
    const s = $('summary', d), body = $('.ans', d);
    s.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        const a = body.animate({ height: [body.offsetHeight + 'px', '0px'], opacity: [1, 0] }, { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
        a.onfinish = () => d.open = false;
      } else {
        d.open = true;
        body.animate({ height: ['0px', body.offsetHeight + 'px'], opacity: [0, 1] }, { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
  });

  /* ---------- footer wordmark stretches with the pointer ---------- */
  const giant = $('.giant');
  if (giant && !reduce) {
    const foot = giant.closest('footer');
    foot.addEventListener('pointermove', e => {
      const r = foot.getBoundingClientRect();
      const x = clamp((e.clientX - r.left) / r.width, 0, 1);
      giant.style.fontStretch = lerp(62, 125, x) + '%';
    });
    foot.addEventListener('pointerleave', () => giant.style.fontStretch = '');
  }

  /* ---------- reveal on enter ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  /* ---------- scroll loop ---------- */
  let queued = false;
  function frame() { queued = false; header(); movesUpdate(); stepsUpdate(); promiseUpdate(); }
  const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
