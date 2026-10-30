(() => {
  const opening = document.getElementById('opening');
  if (typeof opening.showModal !== 'function') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pages = [];
  const source = document.getElementById('birthday-letter').content.textContent.trim();
  for (const paragraph of source.split(/\n+/)) {
    let line = '';
    for (const clause of paragraph.match(/[^，。！？]+[，。！？]?/g) || []) {
      if (line && line.length + clause.length > 58) { pages.push(line); line = ''; }
      line += clause;
      if (/[。！？]$/.test(clause)) { pages.push(line); line = ''; }
    }
    if (line) pages.push(line);
  }
  let page = 0;
  let closing = false;
  let cinematic = false;
  let filmTimer = null;
  let filmStarted = 0;
  let hiddenAt = 0;
  let night = 0;
  let targetNight = 0;
  const copy = document.getElementById('opening-copy');
  function renderLine() {
    copy.textContent = pages[page];
    copy.classList.remove('letter-appear');
    void copy.offsetWidth;
    copy.classList.add('letter-appear');
    document.querySelector('.letter-page').scrollTop = 0;
    targetNight = page / Math.max(1, pages.length - 1);
  }
  function advance() {
    if (closing || cinematic) return;
    if (page < pages.length - 1) { page++; renderLine(); } else playOcean();
  }
  function playOcean() {
    cinematic = true;
    targetNight = 1;
    night = 1;
    filmStarted = performance.now();
    opening.classList.add('ocean-film');
    copy.setAttribute('aria-hidden', 'true');
    opening.setAttribute('aria-label', '深蓝海洋中，发光的小鱼游向星星，蓝眼泪沿着海岸闪烁');
    filmTimer = window.setTimeout(finish, reduced ? 2500 : 9000);
  }
  let pointerStart = null;
  let dragged = false;
  opening.addEventListener('pointerdown', event => {
    pointerStart = { x: event.clientX, y: event.clientY };
    dragged = false;
  });
  opening.addEventListener('pointermove', event => {
    if (pointerStart && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 10) dragged = true;
  });
  opening.addEventListener('pointercancel', () => { dragged = true; pointerStart = null; });
  opening.addEventListener('click', event => {
    if (dragged || event.target.closest('button, a, input, textarea, #opening-copy, #opening-title, .opening-eyebrow, .opening-scene')) return;
    if (!window.getSelection().isCollapsed) return;
    advance();
  });
  opening.addEventListener('keydown', event => {
    if (event.target.closest('button') || event.repeat) return;
    if ([' ', 'Enter', 'ArrowRight'].includes(event.key)) { event.preventDefault(); advance(); }
    else if (event.key === 'ArrowLeft' && page > 0 && !closing && !cinematic) { event.preventDefault(); page--; renderLine(); }
  });
  function finish() {
    if (closing) return;
    closing = true;
    clearTimeout(filmTimer);
    opening.classList.add('opening-leave');
    document.documentElement.classList.remove('opening-active');
    window.setTimeout(() => opening.close(), reduced ? 0 : 500);
  }
  document.querySelector('#skip-opening').addEventListener('click', finish);
  opening.addEventListener('cancel', event => { event.preventDefault(); finish(); });
  opening.addEventListener('close', () => document.documentElement.classList.remove('opening-active'));
  // A single canvas paints the beach, bioluminescent surf and the later full-screen film.
  const canvas = document.getElementById('opening-ocean');
  const ctx = canvas.getContext('2d', { alpha: false });
  let width = innerWidth, height = innerHeight, frame = 0, last = 0;
  let seed = 813;
  function random() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  const motes = Array.from({ length: innerWidth < 760 ? 720 : 1350 }, () => ({ x: random(), y: random(), size: .4 + random() * 1.3, phase: random() * Math.PI * 2, speed: .4 + random() }));
  const stars = Array.from({ length: 100 }, () => ({ x: random(), y: random() * .31, size: .4 + random() * 1.1, phase: random() * 7 }));
  function blend(a, b, n = night) { return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * n)).join(',')})`; }
  function shore(x, t) { return height * (.765 + .046 * Math.sin(x / width * 5 + .5) + .012 * Math.sin(x / width * 12 + t * .35)); }
  function resizeOcean() {
    width = innerWidth; height = innerHeight;
    const ratio = Math.min(devicePixelRatio || 1, width < 760 ? 1.5 : 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function glow(x, y, radius, rgb, alpha) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(.3, `rgba(${rgb},${alpha * .3})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function wavePath(t, offset = 0) {
    ctx.beginPath();
    for (let x = -10; x <= width + 10; x += 10) { const y = shore(x, t) + offset + Math.sin(x * .025 + t) * 2; if (x === -10) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  }
  function paintBeach(t) {
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, blend([190, 219, 232], [3, 10, 32]));
    sky.addColorStop(.3, blend([232, 242, 238], [10, 28, 57]));
    sky.addColorStop(1, blend([192, 223, 229], [2, 14, 33]));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height);
    glow(width * .76, height * .16, width * .32, '194,234,255', .16 * (1 - night));
    if (night > .18) {
      stars.forEach(p => { ctx.fillStyle = `rgba(190,225,255,${(night - .18) * (.3 + .3 * Math.sin(t * .6 + p.phase))})`; ctx.beginPath(); ctx.arc(p.x * width, p.y * height, p.size, 0, Math.PI * 2); ctx.fill(); });
      glow(width * .81, height * .16, Math.min(width, height) * .08, '145,200,255', night * .16);
      ctx.fillStyle = `rgba(205,231,251,${night * .42})`; ctx.beginPath(); ctx.arc(width * .81, height * .16, 2 + Math.min(width, height) * .015, 0, Math.PI * 2); ctx.fill();
    }
    const horizon = height * .295;
    const sea = ctx.createLinearGradient(0, horizon, 0, height * .85);
    sea.addColorStop(0, blend([143, 191, 210], [6, 30, 61]));
    sea.addColorStop(.7, blend([164, 213, 220], [3, 29, 54]));
    sea.addColorStop(1, blend([193, 229, 225], [4, 44, 64]));
    ctx.fillStyle = sea; ctx.fillRect(0, horizon, width, height - horizon);
    // Fine horizontal bands give the water depth without competing with the letter.
    for (let j = 0; j < 27; j++) {
      const depth = j / 27, y = horizon + Math.pow(depth, 1.8) * height * .48;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 14) { const wy = y + Math.sin(x / width * (14 + j % 5) + t * (.25 + depth * .4) + j) * (1 + depth * 4); if (!x) ctx.moveTo(x, wy); else ctx.lineTo(x, wy); }
      ctx.strokeStyle = `rgba(122,218,241,${(.045 + night * .035) * depth})`; ctx.lineWidth = .5 + depth; ctx.stroke();
    }
    // A curved strip of sand makes this a beach, with light washing onto the shore.
    wavePath(t, 5); ctx.lineTo(width + 10, height); ctx.lineTo(-10, height); ctx.closePath();
    const sand = ctx.createLinearGradient(0, height * .7, 0, height);
    sand.addColorStop(0, blend([221, 230, 213], [10, 33, 49])); sand.addColorStop(1, blend([240, 231, 210], [7, 18, 37])); ctx.fillStyle = sand; ctx.fill();
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    wavePath(t, -4); ctx.strokeStyle = `rgba(16,175,241,${.13 + night * .22})`; ctx.lineWidth = 27; ctx.shadowColor = '#2ad7ff'; ctx.shadowBlur = 27; ctx.stroke();
    wavePath(t, -3); ctx.strokeStyle = `rgba(86,226,255,${.2 + night * .35})`; ctx.lineWidth = 6; ctx.stroke();
    wavePath(t, 0); ctx.shadowBlur = 12; ctx.strokeStyle = `rgba(179,251,255,${.25 + night * .36})`; ctx.lineWidth = 1.3; ctx.stroke(); ctx.restore();
    for (let k = 0; k < 3; k++) {
      const pulse = (t * .13 + k / 3) % 1;
      wavePath(t, -16 - (1 - pulse) * 55); ctx.strokeStyle = `rgba(57,197,245,${Math.sin(pulse * Math.PI) * (.07 + night * .1)})`; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    motes.forEach((p, i) => {
      const x = (p.x * width + Math.sin(t * .25 + p.phase) * 5 + width) % width;
      let y;
      if (i % 4 !== 0) y = shore(x, t) - 8 + Math.sin(p.phase + t * .5) * (6 + p.y * 18) + (p.y - .5) * 55;
      else y = horizon + p.y * (shore(x, t) - horizon);
      const pulse = .2 + .8 * Math.pow((Math.sin(t * p.speed + p.phase) + 1) / 2, 3);
      ctx.fillStyle = `rgba(${i % 5 === 0 ? '160,255,248' : '38,191,255'},${pulse * (.3 + night * .55)})`;
      ctx.beginPath(); ctx.arc(x, y, p.size * (cinematic ? 1.1 : .75), 0, Math.PI * 2); ctx.fill();
    }); ctx.restore();
    // Gentle atmospheric haze keeps the central text readable in both palettes.
    glow(width * .5, height * .48, Math.max(width, height) * .32, night < .5 ? '228,242,244' : '10,25,51', .14);
  }
  function paintFish(x, y, size, phase, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.13 + Math.sin(phase) * .07); ctx.scale(size, size); ctx.globalAlpha = alpha;
    glow(0, 0, 150, '36,195,255', .18);
    ctx.shadowColor = '#5deaff'; ctx.shadowBlur = 24;
    const body = ctx.createLinearGradient(-50, -20, 55, 20); body.addColorStop(0, '#369fe7'); body.addColorStop(.55, '#8ef3ff'); body.addColorStop(1, '#e0ffff');
    ctx.fillStyle = body; ctx.strokeStyle = '#a8fbff'; ctx.lineWidth = 1.1;
    const wag = Math.sin(phase * 3) * 7;
    ctx.beginPath(); ctx.moveTo(-34, -5); ctx.quadraticCurveTo(-56, -23 + wag, -70, -17 + wag); ctx.quadraticCurveTo(-61, 0, -72, 21 + wag); ctx.quadraticCurveTo(-48, 21 + wag, -34, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-37, 0); ctx.bezierCurveTo(-30, -32, 31, -35, 54, -3); ctx.bezierCurveTo(40, 29, -20, 33, -37, 0); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(230,255,255,.7)';
    ctx.beginPath(); ctx.moveTo(-14, -20); ctx.quadraticCurveTo(-1, -46, 14, -23); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, 1); ctx.quadraticCurveTo(12, -4, 2, 17); ctx.stroke();
    ctx.fillStyle = '#113f68'; ctx.beginPath(); ctx.arc(33, -6, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(34, -7, 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3591ad'; ctx.beginPath(); ctx.arc(47, 0, 3, .2, 1.8); ctx.stroke(); ctx.restore();
  }
  function paintStar(x, y, size, t, alpha) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * .6) * .1); ctx.globalAlpha = alpha;
    glow(0, 0, size * 4, '107,211,255', .25); glow(0, 0, size * 2.5, '255,229,150', .25);
    ctx.shadowColor = '#ffe8a4'; ctx.shadowBlur = 30; ctx.fillStyle = '#fff1b4'; ctx.strokeStyle = '#fffce2'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? size * .47 : size; if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0; ctx.fillStyle = '#ba9b51';
    for (const dx of [-.18, .18]) { ctx.beginPath(); ctx.arc(size * dx, size * .03, size * .035, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#ba9b51'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, size * .17, size * .075, .2, Math.PI - .2); ctx.stroke(); ctx.restore();
  }
  function paintFilm(t, elapsed) {
    const progress = reduced ? .55 : Math.min(elapsed / 7, 1), ease = progress * progress * (3 - 2 * progress);
    const visible = reduced ? 1 : Math.min(elapsed / 1.5, 1);
    const sx = width * .7, sy = height * (.25 + Math.sin(t * .6) * .008);
    const fx = width * (.17 + ease * .36), fy = height * (.57 - ease * .16) + Math.sin(t * 1.2) * 7;
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < (width < 760 ? 95 : 180); i++) {
      const p = motes[i], travel = (t * .045 * p.speed + p.x) % 1;
      const x = fx - travel * width * .4, y = fy + Math.sin(travel * 9 + p.phase) * 22 + (p.y - .5) * 85;
      ctx.fillStyle = `rgba(79,224,255,${(1 - travel) * visible * (.3 + p.y * .6)})`; ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 55; i++) {
      const p = motes[i + 200], a = p.phase + t * .2, r = 25 + p.y * Math.min(width, height) * .17;
      ctx.fillStyle = `rgba(174,237,255,${visible * (.2 + .4 * Math.sin(t + p.phase) ** 2)})`; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * r, sy + Math.sin(a) * r * .7, p.size, 0, Math.PI * 2); ctx.fill();
    } ctx.restore();
    paintFish(fx, fy, Math.min(width / 520, height / 550, 1.3), t, visible);
    paintStar(sx, sy, Math.min(width, height) * .065, t, visible);
    // A luminous reflection stretches from the star into the blue water.
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) { const y = height * .32 + i * height * .014; ctx.fillStyle = `rgba(135,225,255,${visible * (1 - i / 22) * .11})`; const w = (8 + i * 2) * (1 + Math.sin(i * 2 + t) * .3); ctx.fillRect(sx - w / 2 + Math.sin(i + t) * 8, y, w, 1); } ctx.restore();
  }
  function renderOcean(now) {
    frame = 0;
    if (!opening.open || document.hidden) return;
    if (now - last < 30) { frame = requestAnimationFrame(renderOcean); return; }
    const delta = Math.min((now - last) / 1000, .1); last = now;
    night += (targetNight - night) * (reduced ? 1 : Math.min(1, delta * (cinematic ? 1.8 : .8)));
    const t = reduced ? 1 : now / 1000;
    paintBeach(t);
    copy.style.color = blend([49, 88, 111], [221, 242, 255]);
    if (cinematic) paintFilm(t, (now - filmStarted) / 1000);
    frame = requestAnimationFrame(renderOcean);
  }
  function startRendering() { if (!frame && opening.open && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(renderOcean); } }
  window.addEventListener('resize', () => { resizeOcean(); startRendering(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cinematic) { hiddenAt = performance.now(); clearTimeout(filmTimer); }
    if (!document.hidden) {
      if (cinematic && !closing) {
        if (hiddenAt) filmStarted += performance.now() - hiddenAt;
        hiddenAt = 0;
        clearTimeout(filmTimer);
        const remaining = Math.max(1000, (reduced ? 2500 : 9000) - (performance.now() - filmStarted));
        filmTimer = setTimeout(finish, remaining);
      }
      startRendering();
    }
  });
  opening.addEventListener('close', () => { cancelAnimationFrame(frame); frame = 0; });
  resizeOcean();
  document.documentElement.classList.add('opening-active');
  renderLine();
  opening.showModal();
  opening.focus({ preventScroll: true });
  startRendering();
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reread-letter').addEventListener('click', () => {
      document.getElementById('birthday-dialog').close();
      page = 0;
      closing = false;
      cinematic = false;
      night = 0;
      clearTimeout(filmTimer);
      copy.removeAttribute('aria-hidden');
      opening.removeAttribute('aria-label');
      opening.classList.remove('opening-leave', 'ocean-film');
      renderLine();
      document.documentElement.classList.add('opening-active');
      opening.showModal();
      opening.focus({ preventScroll: true });
      startRendering();
    });
  });
})();
