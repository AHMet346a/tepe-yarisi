'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   SKILL TREE  —  YETENEK AĞACI  (kalıcı buff'lar)
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar (hepsi güvenli-opsiyonel, typeof guard):
     · SaveData.get/set   → kalıcılık  (localStorage YOK; sadece SaveData)
     · UI.showToast       → bildirim (opsiyonel)
     · Audio.*            → ses efektleri (opsiyonel)
     · Date.now()         → kare-bağımsız nabız saati

   YETENEK PUANI KAYNAĞI
     · kazanılan  = oyuncu seviyesi (playerLevel/level) + bonus (addPoints)
                    seviye yoksa maxDistance / rank'tan türetilir.
     · harcanan   = SaveData.get('skillSpent', 0)
     · mevcut     = kazanılan − harcanan   (asla negatif değil)
     · alınan seviyeler: SaveData.get('skillTree', {}) = { nodeId: level }

   3 DAL × 3-4 KADEME:
     MOTOR (turuncu)      : kalkış itişi → nitro → tutuş → turbo
     EKONOMİ (altın)      : altın → zengin sürüş → hurdacı → tecrübe
     HAYATTA KALMA (yeşil): yakıt → denge → zırh → verimli motor
   Bir node ancak dalındaki önceki node en az 1. seviye alınınca açılır.

   API
     SkillTree.draw(ctx, W, H [, dt])  → tam ekran ağaç + bağlantılar + puan
     SkillTree.handleClick(x, y)       → 'back' | null  (node'a basınca yükseltir)
     SkillTree.getBonus(key)           → çarpan/değer  (bilinmeyen → 1)
     SkillTree.addPoints(n)            → yetenek puanı ekle (guard'lı)
     SkillTree.update(dt)              → nabız saati (İSTEĞE BAĞLI; draw da ilerletir)

   KURALLAR: localStorage kullanmaz. Tüm sayısal girişler NaN korumalıdır.
   ═══════════════════════════════════════════════════════════════════════════ */
const SkillTree = {

  _TREE_KEY: 'skillTree',      // { nodeId: level }
  _SPENT_KEY: 'skillSpent',    // toplam harcanan puan
  _BONUS_KEY: 'skillBonusPoints', // addPoints ile eklenen ekstra puan

  // ── Tema ────────────────────────────────────────────────────────────────────
  COL: {
    bg0:'#0b1020', bg1:'#1b2a4a', panel:'#141c34', line:'rgba(255,255,255,0.10)',
    text:'#eaf0ff', mute:'#8593b8', accent:'#ff8a3d', gold:'#ffd54a',
    green:'#39d98a', red:'#ff5a5a', locked:'#2a3350', lockedTxt:'#5a6690'
  },

  // Dal renkleri (vurgu)
  BRANCH: {
    motor:   { name:'MOTOR',         icon:'⚙️', col:'#ff8a3d' },
    eco:     { name:'EKONOMİ',       icon:'🪙', col:'#ffd54a' },
    surv:    { name:'HAYATTA KALMA', icon:'🛡️', col:'#39d98a' }
  },

  // Her getBonus anahtarının taban değeri.
  //   Çarpan anahtarları 1.0 tabanlı (1.0+ döner); katkı anahtarları 0 tabanlı.
  KEY_BASE: {
    coinMult:1, fuelMax:1, nitroMax:1, startBoost:1, grip:1, power:1,
    scrapMult:1, xpMult:1, flipResist:0, damageResist:0
  },

  // ── Node tanımları ───────────────────────────────────────────────────────────
  //   branch : dal id'si   · tier : dal içindeki kademe (0..)
  //   max    : üst seviye  · key  : getBonus anahtarı   · per : seviye başına katkı
  //   cost   : seviye başına yetenek puanı
  NODES: [
    // ── MOTOR ──────────────────────────────────────────────────────────────────
    { id:'m_boost', branch:'motor', tier:0, name:'Kalkış İtişi', icon:'⚡', max:3, key:'startBoost',  per:0.06, cost:1, desc:'Başlangıç hızı' },
    { id:'m_nitro', branch:'motor', tier:1, name:'Nitro Deposu', icon:'🔥', max:4, key:'nitroMax',    per:0.10, cost:1, desc:'Nitro kapasitesi' },
    { id:'m_grip',  branch:'motor', tier:2, name:'Tutuş',        icon:'🛞', max:3, key:'grip',        per:0.06, cost:2, desc:'Lastik tutuşu' },
    { id:'m_turbo', branch:'motor', tier:3, name:'Turbo Motor',  icon:'🚀', max:3, key:'power',       per:0.10, cost:2, desc:'Motor gücü' },

    // ── EKONOMİ ─────────────────────────────────────────────────────────────────
    { id:'e_coin1', branch:'eco', tier:0, name:'Altın Dokunuş',  icon:'🪙', max:4, key:'coinMult',   per:0.05, cost:1, desc:'Altın kazancı' },
    { id:'e_coin2', branch:'eco', tier:1, name:'Zengin Sürüş',   icon:'💰', max:3, key:'coinMult',   per:0.06, cost:1, desc:'Ekstra altın' },
    { id:'e_scrap', branch:'eco', tier:2, name:'Hurdacı',        icon:'⚙️', max:3, key:'scrapMult',  per:0.08, cost:2, desc:'Hurda kazancı' },
    { id:'e_xp',    branch:'eco', tier:3, name:'Tecrübe',        icon:'⭐', max:3, key:'xpMult',     per:0.08, cost:2, desc:'XP kazancı' },

    // ── HAYATTA KALMA ───────────────────────────────────────────────────────────
    { id:'s_fuel',  branch:'surv', tier:0, name:'Yakıt Deposu',  icon:'⛽', max:4, key:'fuelMax',     per:0.08, cost:1, desc:'Yakıt kapasitesi' },
    { id:'s_flip',  branch:'surv', tier:1, name:'Denge Ustası',  icon:'🌀', max:3, key:'flipResist',  per:0.12, cost:1, desc:'Takla direnci' },
    { id:'s_armor', branch:'surv', tier:2, name:'Zırh',          icon:'🛡️', max:3, key:'damageResist',per:0.08, cost:2, desc:'Hasar direnci' },
    { id:'s_eco',   branch:'surv', tier:3, name:'Verimli Motor', icon:'🍃', max:3, key:'fuelMax',     per:0.06, cost:2, desc:'Yakıt verimi' }
  ],

  // ── Çalışma zamanı durumu ────────────────────────────────────────────────────
  _t: 0,                // nabız saati
  _lastNow: 0,          // Date.now tabanlı iç saat
  _extDriven: false,    // update(dt) dışarıdan geldiyse draw kendi saatini kullanmaz
  _updatedThisFrame: false,
  _nodes: [],           // her draw'da doldurulan tıklama hedefleri {id,x,y,r,...}
  _btns: [],            // geri butonu vb.
  _flash: null,         // { id, a } — yükseltme parıltısı
  _levelsCache: null,   // {id:level} önbellek

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR (NaN korumalı)
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _int(v, fb) { return Math.floor(this._num(v, fb)); },

  _sget(key, fb) {
    try { if (typeof SaveData !== 'undefined' && SaveData.get) { const v = SaveData.get(key); return (v === undefined || v === null) ? fb : v; } }
    catch (e) {}
    return fb;
  },
  _sset(key, val) {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(key, val); } catch (e) {}
  },
  _sfx(name) {
    try { if (typeof Audio !== 'undefined' && typeof Audio[name] === 'function') Audio[name](); } catch (e) {}
  },
  _toast(msg) {
    try { if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') UI.showToast(msg); } catch (e) {}
  },

  _node(id) { for (let i = 0; i < this.NODES.length; i++) if (this.NODES[i].id === id) return this.NODES[i]; return null; },

  // Alınan seviyeler {id:level} — SaveData'dan güvenli oku.
  _levels() {
    let d = this._sget(this._TREE_KEY, null);
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
    const out = {};
    for (let i = 0; i < this.NODES.length; i++) {
      const n = this.NODES[i];
      let lv = this._int(d[n.id], 0);
      if (lv < 0) lv = 0; if (lv > n.max) lv = n.max;
      out[n.id] = lv;
    }
    this._levelsCache = out;
    return out;
  },

  // ── Puan muhasebesi ───────────────────────────────────────────────────────────
  // Kazanılan puan = oyuncu seviyesi (+ bonus). Seviye yoksa mesafe/rank'tan türet.
  _earned() {
    let lvl = Number(this._sget('playerLevel', undefined));
    if (!isFinite(lvl) || lvl < 1) lvl = Number(this._sget('level', undefined));
    if (!isFinite(lvl) || lvl < 1) {
      // Seviye yoksa: en iyi mesafeden (her ~1000 m = +1) türet.
      const dist = this._num(this._sget('maxDistance', 0), 0);
      lvl = 1 + Math.floor(dist / 1000);
    }
    if (!isFinite(lvl) || lvl < 1) lvl = 1;
    const bonus = Math.max(0, this._int(this._sget(this._BONUS_KEY, 0), 0));
    return Math.floor(lvl) + bonus;   // 1 seviye = 1 puan
  },
  _spent()  { return Math.max(0, this._int(this._sget(this._SPENT_KEY, 0), 0)); },
  _points() { return Math.max(0, this._earned() - this._spent()); },   // mevcut puan

  // ── Node durumu ────────────────────────────────────────────────────────────────
  // Bir node açık mı? (dalındaki bir önceki kademe en az 1 seviye alınmış mı?)
  _isUnlocked(node, levels) {
    if (!node) return false;
    if (node.tier <= 0) return true;   // ilk kademe daima açık
    for (let i = 0; i < this.NODES.length; i++) {
      const p = this.NODES[i];
      if (p.branch === node.branch && p.tier === node.tier - 1) {
        return this._int(levels[p.id], 0) >= 1;
      }
    }
    return true;   // beklenmedik durumda kilitleme
  },

  // ── Yükseltme ────────────────────────────────────────────────────────────────
  _tryUpgrade(id) {
    const node = this._node(id);
    if (!node) return;
    const levels = this._levels();
    const lv = this._int(levels[id], 0);
    if (lv >= node.max) { this._toast('✔ ' + node.name + ' zaten maksimum'); this._sfx('playMenuClick'); return; }
    if (!this._isUnlocked(node, levels)) { this._toast('🔒 Önce önceki yeteneği aç'); this._sfx('playMenuClick'); return; }
    const cost = Math.max(1, this._int(node.cost, 1));
    if (this._points() < cost) { this._toast('⭐ Yetersiz yetenek puanı (' + cost + ' gerekli)'); this._sfx('playMenuClick'); return; }

    // Uygula: seviye +1, harcanan += maliyet.  Her yazım SaveData guard'lı.
    levels[id] = lv + 1;
    this._sset(this._TREE_KEY, levels);
    this._sset(this._SPENT_KEY, this._spent() + cost);
    this._flash = { id: id, a: 1 };
    this._toast('⬆ ' + node.name + '  Sv.' + (lv + 1) + '/' + node.max);
    this._sfx('playPurchase');
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: getBonus(key)  → çarpan/değer  (bilinmeyen anahtar → 1)
  // ══════════════════════════════════════════════════════════════════════════
  getBonus(key) {
    if (!Object.prototype.hasOwnProperty.call(this.KEY_BASE, key)) return 1;   // güvenli varsayılan
    let val = this.KEY_BASE[key];
    const levels = this._levels();
    for (let i = 0; i < this.NODES.length; i++) {
      const n = this.NODES[i];
      if (n.key !== key) continue;
      const lv = this._int(levels[n.id], 0);
      val += lv * this._num(n.per, 0);
    }
    return isFinite(val) ? val : (Object.prototype.hasOwnProperty.call(this.KEY_BASE, key) ? this.KEY_BASE[key] : 1);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: addPoints(n)  → yetenek puanı ekle (level atlayınca çağrılabilir)
  // ══════════════════════════════════════════════════════════════════════════
  addPoints(n) {
    let add = Number(n);
    if (!isFinite(add)) return;          // NaN/undefined koruması
    add = Math.floor(add);
    if (add <= 0) return;                // negatif/sıfır yok say
    const cur = Math.max(0, this._int(this._sget(this._BONUS_KEY, 0), 0));
    this._sset(this._BONUS_KEY, cur + add);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ZAMAN (kare-bağımsız nabız)
  // ══════════════════════════════════════════════════════════════════════════
  _advance(dt) {
    dt = this._num(dt, 0);
    if (dt < 0) dt = 0; if (dt > 0.05) dt = 0.05;   // kare atlama koruması
    this._t += dt;
    if (this._flash) { this._flash.a -= dt * 1.8; if (this._flash.a <= 0) this._flash = null; }
  },

  update(dt) { this._extDriven = true; this._updatedThisFrame = true; this._advance(dt); },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: draw(ctx, W, H [, dt])
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    // Zaman ilerlet: update() dışarıdan çağrılmadıysa kendi saatimizi kullan.
    if (!this._updatedThisFrame && !this._extDriven) {
      let d;
      if (isFinite(dt) && dt > 0) d = dt;
      else {
        const now = Date.now();
        if (!this._lastNow) this._lastNow = now;
        d = (now - this._lastNow) / 1000;
        this._lastNow = now;
      }
      this._advance(d);
    }
    this._updatedThisFrame = false;

    this._nodes = [];
    this._btns = [];
    const levels = this._levels();
    const points = this._points();
    const pulse = 0.5 + 0.5 * Math.sin(this._t * 3);

    // ── Arka plan ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ── Başlık ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.accent;
    ctx.font = 'bold ' + Math.round(H * 0.048) + 'px system-ui, sans-serif';
    ctx.fillText('🌳 YETENEK AĞACI', W / 2, H * 0.095);

    // ── Mevcut yetenek puanı rozeti ──
    const pw = Math.min(W * 0.5, 320), ph = Math.max(34, H * 0.058);
    const px = W / 2 - pw / 2, py = H * 0.125;
    ctx.fillStyle = 'rgba(255,213,74,0.12)';
    this._roundRect(ctx, px, py, pw, ph, 12); ctx.fill();
    ctx.strokeStyle = this.COL.gold; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(ph * 0.5) + 'px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('⭐ Yetenek Puanı: ' + points, W / 2, py + ph / 2 + 1);
    ctx.textBaseline = 'alphabetic';

    // ── Dal düzeni: 3 kolon ──
    const branches = ['motor', 'eco', 'surv'];
    const colX = [W * 0.22, W * 0.50, W * 0.78];
    const topY = H * 0.29;
    const botY = H * 0.95;
    const r = Math.max(20, Math.min(W, H) * 0.052);

    // Kademe başına dikey konum (max 4 kademe).
    const tierY = (tier) => topY + (botY - topY) * (tier / 3);

    for (let b = 0; b < branches.length; b++) {
      const bid = branches[b];
      const bx = colX[b];
      const meta = this.BRANCH[bid];
      const nodes = this.NODES.filter(n => n.branch === bid).sort((a, c) => a.tier - c.tier);

      // Dal başlığı.
      // 🔴 TASMA (29 Tmz): font yalniz H'ye bagliydi; dar ekranda uc dal yan
      //   yana sigmiyor, "🛡️ HAYATTA KALMA" komsu sutuna/ekran disina tasiyordu.
      //   Bir dala dusen genislik W/3 → font ve maxWidth ona gore sinirli.
      const dalGen = W / 3 - 6;
      ctx.fillStyle = meta.col;
      ctx.font = 'bold ' + Math.round(Math.min(H * 0.026, dalGen * 0.115)) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(meta.icon + ' ' + meta.name, bx, topY - r * 0.55, dalGen);

      // Bağlantı çizgileri (önce çiz ki node'lar üstte kalsın).
      for (let i = 1; i < nodes.length; i++) {
        const prev = nodes[i - 1], cur = nodes[i];
        const y0 = tierY(prev.tier), y1 = tierY(cur.tier);
        const lit = this._int(levels[prev.id], 0) >= 1;
        ctx.save();
        ctx.lineWidth = lit ? 5 : 3;
        if (lit) {
          ctx.strokeStyle = meta.col;
          ctx.shadowColor = meta.col;
          ctx.shadowBlur = 12 + pulse * 8;
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        }
        ctx.beginPath();
        ctx.moveTo(bx, y0 + r);
        ctx.lineTo(bx, y1 - r);
        ctx.stroke();
        ctx.restore();
      }

      // Node'lar.
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const ny = tierY(n.tier);
        const lv = this._int(levels[n.id], 0);
        const maxed = lv >= n.max;
        const unlocked = this._isUnlocked(n, levels);
        const affordable = unlocked && !maxed && points >= Math.max(1, this._int(n.cost, 1));
        this._drawNode(ctx, n, bx, ny, r, lv, maxed, unlocked, affordable, meta.col, pulse);
        this._nodes.push({ id: n.id, x: bx, y: ny, r: r });
      }
    }

    // ── Alt bilgi ipucu ──
    ctx.fillStyle = this.COL.mute;
    ctx.textAlign = 'center';
    // ⚠ Uzun ipucu metni: font H'ye bagli oldugu icin dar-uzun ekranda
    //   [-50..410] araligina tasiyordu. W'ye gore sinirla + maxWidth ver.
    ctx.font = Math.round(Math.min(H * 0.020, W * 0.028)) + 'px system-ui, sans-serif';
    ctx.fillText('Bir yeteneğe dokunarak puan harca • önceki alınınca sonraki açılır',
                 W / 2, H * 0.985, W * 0.96);

    // ── Geri butonu ──
    const back = { id: 'back', x: W * 0.04, y: H * 0.035, w: Math.max(64, W * 0.13), h: Math.max(38, H * 0.058) };
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    ctx.textBaseline = 'alphabetic';
    this._btns.push(back);
  },

  // Tek bir node çiz (durum renkleriyle).
  _drawNode(ctx, n, cx, cy, r, lv, maxed, unlocked, affordable, col, pulse) {
    ctx.save();

    // Yükseltme parıltısı.
    const flashing = this._flash && this._flash.id === n.id ? Math.max(0, this._flash.a) : 0;

    // Dış halka / glow.
    let ringCol, fillCol, glow = 0;
    if (maxed)          { ringCol = this.COL.gold;   fillCol = 'rgba(255,213,74,0.18)'; glow = 14 + pulse * 8; }
    else if (!unlocked) { ringCol = this.COL.locked;  fillCol = 'rgba(20,28,52,0.85)';   glow = 0; }
    else if (affordable){ ringCol = col;              fillCol = 'rgba(255,255,255,0.06)'; glow = 8 + pulse * 10; }
    else                { ringCol = 'rgba(255,255,255,0.28)'; fillCol = 'rgba(255,255,255,0.04)'; glow = 0; }

    if (flashing > 0) glow = Math.max(glow, 24 * flashing + 8);

    // Gövde.
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = fillCol; ctx.fill();
    if (glow > 0) { ctx.shadowColor = maxed ? this.COL.gold : col; ctx.shadowBlur = glow; }
    ctx.strokeStyle = flashing > 0 ? this.COL.gold : ringCol;
    ctx.lineWidth = maxed || affordable ? 4 : 2.5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // İkon.
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = unlocked ? 1 : 0.45;
    ctx.font = Math.round(r * 0.85) + 'px system-ui, sans-serif';
    ctx.fillText(unlocked ? n.icon : '🔒', cx, cy - r * 0.06);
    ctx.globalAlpha = 1;

    // İsim (dairenin altında).
    ctx.fillStyle = unlocked ? this.COL.text : this.COL.lockedTxt;
    ctx.font = 'bold ' + Math.round(r * 0.34) + 'px system-ui, sans-serif';
    ctx.fillText(n.name, cx, cy + r + r * 0.42, r * 3.6);   // komsu dala tasmasin

    // Seviye rozeti (lv/max).
    const badge = lv + '/' + n.max;
    ctx.font = 'bold ' + Math.round(r * 0.30) + 'px system-ui, sans-serif';
    ctx.fillStyle = maxed ? this.COL.gold : (unlocked ? col : this.COL.lockedTxt);
    ctx.fillText(badge, cx, cy + r + r * 0.82);

    // Maliyet / durum satırı.
    ctx.font = Math.round(r * 0.26) + 'px system-ui, sans-serif';
    if (maxed)          { ctx.fillStyle = this.COL.gold;  ctx.fillText('MAKS', cx, cy + r + r * 1.18); }
    else if (!unlocked) { ctx.fillStyle = this.COL.lockedTxt; ctx.fillText('kilitli', cx, cy + r + r * 1.18); }
    else                { ctx.fillStyle = affordable ? this.COL.green : this.COL.mute; ctx.fillText('⭐ ' + Math.max(1, this._int(n.cost, 1)), cx, cy + r + r * 1.18); }

    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  },

  _roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: handleClick(x, y)  → 'back' | null
  // ══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    // Butonlar (geri).
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        return null;
      }
    }
    // Node'lar (dairesel isabet testi).
    for (let i = 0; i < this._nodes.length; i++) {
      const nd = this._nodes[i];
      const dx = x - nd.x, dy = y - nd.y;
      if (dx * dx + dy * dy <= nd.r * nd.r * 1.15) {
        this._tryUpgrade(nd.id);
        return null;
      }
    }
    return null;
  }
};

window.SkillTree = SkillTree;

// Node/CommonJS ortamında da yüklenebilsin (node --check & test uyumu; tarayıcıda etkisiz).
if (typeof module !== 'undefined' && module.exports) module.exports = SkillTree;
