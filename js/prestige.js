'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   PRESTİJ SİSTEMİ  —  İlerlemeyi "prestij" yapıp KALICI çarpan + yıldız kazan
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıklar (hepsi güvenli-opsiyonel, typeof guard):
     · SaveData.get/set/data       → kalıcılık (localStorage YOK; her şey SaveData)
     · UI.showToast                → bildirim (opsiyonel)
     · Audio.* , Particles.*       → ses & parçacık efektleri (opsiyonel)
     · Date.now()                  → animasyon saati (yıldız parıltısı, nabız)

   NASIL ÇALIŞIR
     · Prestij seviyesi  = SaveData.get('prestige')  (yoksa 0).
     · GEREKSİNİM        = oyuncu seviyesi eşiği  VEYA  toplam altın eşiği
                           (seviye arttıkça büyür). İkisinden BİRİ yeterli.
     · PRESTİJ YAP       = prestige+1, kalıcı çarpanlar artar ve GEÇİCİ ilerleme
                           sıfırlanır (seviye/xp). Araçlar, kartlar, başarımlar,
                           elmas/altın ve prestij KALIR.
     · getBonus()        = seviyeye göre kalıcı çarpanlar (level 0 → hepsi 1.0).
                           Fizik/ekonomi ileride okuyabilir.

   API
     Prestige.draw(ctx, W, H [, dt])   → tam ekran; başlık, yıldızlar, bonus,
                                         gereksinim, ilerleme çubuğu, PRESTİJ YAP
     Prestige.handleClick(x, y)        → 'back' | null  (onay → uygula akışı)
     Prestige.getBonus()               → { coinMult, nitroMult, xpMult, level }
     Prestige.update(dt)               → (isteğe bağlı) animasyon saati

   KURALLAR: localStorage kullanmaz. dt NaN korumalı. Reset guard'lı — yalnızca
   SaveData.data içinde VAR OLAN anahtarlar sıfırlanır.
   ═══════════════════════════════════════════════════════════════════════════ */
const Prestige = {

  _SAVE_KEY: 'prestige',

  // ── Kalıcı bonus başına artış (prestij seviyesi × bu değerler) ──────────────
  COIN_PER_LEVEL:  0.15,   // +%15 altın / prestij
  NITRO_PER_LEVEL: 0.10,   // +%10 nitro / prestij
  XP_PER_LEVEL:    0.10,   // +%10 XP / prestij

  // ── Gereksinim eğrisi (prestij arttıkça büyür) ──────────────────────────────
  BASE_LEVEL_REQ:  30,     // ilk prestij için oyuncu seviyesi
  LEVEL_REQ_STEP:  20,     // her prestijte +20 seviye
  BASE_COIN_REQ:   50000,  // ilk prestij için toplam altın
  COIN_REQ_STEP:   50000,  // her prestijte +50.000

  // ── Tema (koyu + mor/altın prestij vurgusu) ─────────────────────────────────
  COL: {
    bg0:'#0b0713', bg1:'#160c26', panel:'#1a1030', panel2:'#221340',
    line:'rgba(255,255,255,0.10)', text:'#f3eefe', mute:'#9a8fc0',
    purple:'#c07bff', gold:'#ffd54a', green:'#39d98a', red:'#ff5a6a',
    barBg:'#241640', locked:'#3a2f52'
  },

  // ── Çalışma zamanı durumu ────────────────────────────────────────────────────
  _t: 0,                   // görsel animasyon saati
  _lastNow: 0,
  _extDriven: false,
  _updatedThisFrame: false,
  _confirming: false,      // onay ekranı açık mı
  _btns: [],               // her draw'da yeniden doldurulan tıklama hedefleri

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _int(v, fb) { return Math.floor(this._num(v, fb)); },
  _now() { return Date.now(); },

  // SaveData'dan güvenli okuma (varsayılan destekli — SaveData.get default almaz).
  _sget(key, fb) {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const v = SaveData.get(key);
        if (v !== undefined && v !== null) return v;
      }
    } catch (e) {}
    return fb;
  },

  // SaveData.data içinde anahtar gerçekten var mı? (guard'lı reset için)
  _hasKey(key) {
    try {
      return (typeof SaveData !== 'undefined' && SaveData.data &&
              Object.prototype.hasOwnProperty.call(SaveData.data, key));
    } catch (e) { return false; }
  },

  _sset(key, val) {
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(key, val); } catch (e) {}
  },

  _toast(msg) {
    try { if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') UI.showToast(msg); } catch (e) {}
  },

  _sfx(name) {
    try { if (typeof Audio !== 'undefined' && typeof Audio[name] === 'function') Audio[name](); } catch (e) {}
  },

  // ── Mevcut prestij seviyesi ─────────────────────────────────────────────────
  _level() { return Math.max(0, this._int(this._sget(this._SAVE_KEY, 0), 0)); },

  // ── Oyuncu seviyesi (playerLevel öncelikli; legacy 'level' yedek) ───────────
  _playerLevel() {
    let lv = this._sget('playerLevel', undefined);
    if (lv === undefined) lv = this._sget('level', 1);
    return Math.max(1, this._int(lv, 1));
  },

  _totalCoins() { return Math.max(0, this._int(this._sget('totalCoins', 0), 0)); },

  // ── Sıradaki prestij için gereksinim ────────────────────────────────────────
  _levelReq()  { return this.BASE_LEVEL_REQ + this._level() * this.LEVEL_REQ_STEP; },
  _coinReq()   { return this.BASE_COIN_REQ  + this._level() * this.COIN_REQ_STEP; },

  // ── Gereksinim karşılandı mı? (seviye VEYA altın) ───────────────────────────
  _eligible() {
    return this._playerLevel() >= this._levelReq() || this._totalCoins() >= this._coinReq();
  },

  // ── İlerleme (0..1) — iki koşuldan hangisi daha yakınsa onu göster ──────────
  _progress() {
    const lp = this._levelReq() > 0 ? this._playerLevel() / this._levelReq() : 1;
    const cp = this._coinReq()  > 0 ? this._totalCoins()  / this._coinReq()  : 1;
    return Math.max(0, Math.min(1, Math.max(lp, cp)));
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: getBonus()  → kalıcı çarpanlar (level 0 → hepsi 1.0)
  // ══════════════════════════════════════════════════════════════════════════
  getBonus() {
    const lv = this._level();
    return {
      level:     lv,
      coinMult:  1 + lv * this.COIN_PER_LEVEL,
      nitroMult: 1 + lv * this.NITRO_PER_LEVEL,
      xpMult:    1 + lv * this.XP_PER_LEVEL
    };
  },

  // Belirli bir seviye için bonus (önizleme — "sıradaki" göstermek için).
  _bonusFor(lv) {
    lv = Math.max(0, this._int(lv, 0));
    return {
      level: lv,
      coinMult:  1 + lv * this.COIN_PER_LEVEL,
      nitroMult: 1 + lv * this.NITRO_PER_LEVEL,
      xpMult:    1 + lv * this.XP_PER_LEVEL
    };
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PRESTİJ UYGULA  (onaydan sonra) — GEÇİCİ ilerlemeyi guard'lı sıfırla
  // ══════════════════════════════════════════════════════════════════════════
  //  Sıfırlanan (yalnızca VAR OLAN anahtarlar):
  //    · playerLevel → 1
  //    · level       → 1   (legacy alan)
  //    · xp          → 0
  //  KALIR: araçlar, kartlar, başarımlar, altın, elmas, hurda, prestij, ayarlar.
  _RESET_KEYS: [
    { key: 'playerLevel', val: 1 },
    { key: 'level',       val: 1 },
    { key: 'xp',          val: 0 }
  ],

  _apply() {
    if (!this._eligible()) { this._toast('Gereksinim henüz karşılanmadı'); return; }
    const newLevel = this._level() + 1;

    // 1) Prestij seviyesini artır ve kalıcılaştır.
    this._sset(this._SAVE_KEY, newLevel);

    // 2) GEÇİCİ ilerlemeyi sıfırla — yalnızca gerçekten var olan anahtarlar.
    for (let i = 0; i < this._RESET_KEYS.length; i++) {
      const r = this._RESET_KEYS[i];
      if (this._hasKey(r.key)) this._sset(r.key, r.val);
    }

    // 3) Efektler + bildirim.
    this._confirming = false;
    const b = this.getBonus();
    this._toast('⭐ PRESTİJ ' + newLevel + '! Kalıcı bonus: +%' +
                Math.round((b.coinMult - 1) * 100) + ' altın, +%' +
                Math.round((b.nitroMult - 1) * 100) + ' nitro');
    this._sfx('playLevelUp');
    this._sfx('playWinStinger');
    this._burst();
  },

  _burst() {
    try {
      if (typeof Particles === 'undefined') return;
      const cx = this._cx || 0, cy = this._cy || 0;
      if (typeof Particles.confettiRain === 'function') Particles.confettiRain(cx, cy - 40, 260);
      else if (typeof Particles.confetti === 'function') Particles.confetti(cx, cy);
      if (typeof Particles.explosion === 'function') Particles.explosion(cx, cy);
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ZAMAN
  // ══════════════════════════════════════════════════════════════════════════
  _advance(dt) {
    dt = this._num(dt, 0);
    if (dt < 0) dt = 0; if (dt > 0.05) dt = 0.05;   // kare atlama koruması
    this._t += dt;
  },

  update(dt) {
    this._extDriven = true;
    this._updatedThisFrame = true;
    this._advance(dt);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: draw(ctx, W, H [, dt])
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    // ── Zaman ilerlet: update() dışarıdan çağrılmadıysa kendi saatimizle ──
    if (!this._updatedThisFrame && !this._extDriven) {
      let d;
      if (isFinite(dt) && dt > 0) d = dt;
      else {
        const now = this._now();
        if (!this._lastNow) this._lastNow = now;
        d = (now - this._lastNow) / 1000;
        this._lastNow = now;
      }
      this._advance(d);
    }
    this._updatedThisFrame = false;

    this._btns = [];
    const lv = this._level();

    // ── Arka plan ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0); g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // ── Başlık ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.purple;
    ctx.font = 'bold ' + Math.round(H * 0.048) + 'px system-ui, sans-serif';
    ctx.fillText('⭐ PRESTİJ', W / 2, H * 0.115);

    // ── Prestij yıldızları (parlar) ──
    this._drawStars(ctx, W / 2, H * 0.205, lv, Math.min(W, H) * 0.032);

    // ── Seviye rozeti ──
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(H * 0.03) + 'px system-ui, sans-serif';
    ctx.fillText('Prestij Seviyesi: ' + lv, W / 2, H * 0.275);

    // ── Aktif kalıcı bonus paneli ──
    const b = this.getBonus();
    const pX = W * 0.08, pW = W * 0.84;
    let panelY = H * 0.32, panelH = H * 0.115;
    this._panel(ctx, pX, panelY, pW, panelH);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute;
    ctx.font = Math.round(H * 0.02) + 'px system-ui, sans-serif';
    ctx.fillText('AKTİF KALICI BONUS', pX + pW * 0.05, panelY + panelH * 0.28);
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(H * 0.027) + 'px system-ui, sans-serif';
    const bonusTxt = (lv <= 0)
      ? 'Henüz bonus yok (Prestij 0)'
      : ('+%' + Math.round((b.coinMult - 1) * 100) + ' altın,  +%' +
         Math.round((b.nitroMult - 1) * 100) + ' nitro,  +%' +
         Math.round((b.xpMult - 1) * 100) + ' XP');
    ctx.fillStyle = (lv <= 0) ? this.COL.mute : this.COL.green;
    ctx.fillText(bonusTxt, pX + pW * 0.05, panelY + panelH * 0.68);

    // ── Sıradaki gereksinim paneli ──
    const reqLv = this._levelReq(), reqCoin = this._coinReq();
    const curLv = this._playerLevel(), curCoin = this._totalCoins();
    const eligible = this._eligible();
    panelY = H * 0.455; panelH = H * 0.155;
    this._panel(ctx, pX, panelY, pW, panelH);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute;
    ctx.font = Math.round(H * 0.02) + 'px system-ui, sans-serif';
    ctx.fillText('SIRADAKI PRESTİJ İÇİN', pX + pW * 0.05, panelY + panelH * 0.20);
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(H * 0.024) + 'px system-ui, sans-serif';
    ctx.fillText('Seviye ' + reqLv + '’e ulaş', pX + pW * 0.05, panelY + panelH * 0.44);
    ctx.fillStyle = this.COL.mute;
    ctx.font = Math.round(H * 0.022) + 'px system-ui, sans-serif';
    ctx.fillText('VEYA', pX + pW * 0.05, panelY + panelH * 0.62);
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(H * 0.024) + 'px system-ui, sans-serif';
    ctx.fillText(this._fmt(reqCoin) + ' toplam altın', pX + pW * 0.05, panelY + panelH * 0.80);
    // Anlık durum (sağ)
    ctx.textAlign = 'right';
    ctx.fillStyle = curLv >= reqLv ? this.COL.green : this.COL.mute;
    ctx.font = Math.round(H * 0.021) + 'px system-ui, sans-serif';
    ctx.fillText('Sv ' + curLv + '/' + reqLv, pX + pW * 0.95, panelY + panelH * 0.44);
    ctx.fillStyle = curCoin >= reqCoin ? this.COL.green : this.COL.mute;
    ctx.fillText(this._fmt(curCoin) + '/' + this._fmt(reqCoin), pX + pW * 0.95, panelY + panelH * 0.80);

    // ── İlerleme çubuğu ──
    const prog = this._progress();
    const barX = pX, barW = pW, barY = H * 0.645, barH = Math.max(16, H * 0.028);
    ctx.fillStyle = this.COL.barBg;
    this._roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.fill();
    const fillW = Math.max(barH, barW * prog);
    const bg = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    bg.addColorStop(0, this.COL.purple); bg.addColorStop(1, this.COL.gold);
    ctx.save();
    this._roundRect(ctx, barX, barY, fillW, barH, barH / 2); ctx.clip();
    ctx.fillStyle = bg; ctx.fillRect(barX, barY, barW, barH);
    ctx.restore();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(barH * 0.72) + 'px system-ui, sans-serif';
    ctx.fillText(Math.round(prog * 100) + '%', barX + barW / 2, barY + barH / 2);
    ctx.textBaseline = 'alphabetic';

    // ── PRESTİJ YAP butonu ──
    const bw = Math.min(W * 0.7, 440), bh = Math.max(54, H * 0.09);
    const bx = W / 2 - bw / 2, by = H * 0.73;
    if (eligible) {
      // Nabızlı ışıltı (parlayan).
      const pulse = 0.5 + 0.5 * Math.sin(this._t * 4);
      ctx.save();
      ctx.shadowColor = this.COL.purple;
      ctx.shadowBlur = 22 + pulse * 26;
      const bgrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      bgrad.addColorStop(0, '#8a3dff'); bgrad.addColorStop(1, this.COL.purple);
      ctx.fillStyle = bgrad;
      this._roundRect(ctx, bx, by, bw, bh, 16); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = this.COL.gold; ctx.lineWidth = 2 + pulse * 2;
      this._roundRect(ctx, bx, by, bw, bh, 16); ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(bh * 0.36) + 'px system-ui, sans-serif';
      ctx.fillText('⭐ PRESTİJ YAP', W / 2, by + bh * 0.5);
      ctx.textBaseline = 'alphabetic';
      this._btns.push({ id: 'prestige', x: bx, y: by, w: bw, h: bh });
    } else {
      // Gri / kilitli.
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = this.COL.locked;
      this._roundRect(ctx, bx, by, bw, bh, 16); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1;
      this._roundRect(ctx, bx, by, bw, bh, 16); ctx.stroke();
      ctx.fillStyle = this.COL.mute;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold ' + Math.round(bh * 0.32) + 'px system-ui, sans-serif';
      ctx.fillText('🔒 KİLİTLİ', W / 2, by + bh * 0.5);
      ctx.textBaseline = 'alphabetic';
      // buton kayıtlı DEĞİL → tıklama yok
    }

    // ── Alt bilgi: ne kalır ──
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute;
    // ⚠ Uzun aciklama: font H'ye bagli oldugu icin dar ekranda tasiyordu.
    ctx.font = Math.round(Math.min(H * 0.019, W * 0.027)) + 'px system-ui, sans-serif';
    ctx.fillText('Prestij: seviye & XP sıfırlanır — araçlar, kartlar, başarımlar KALIR',
                 W / 2, H * 0.85, W * 0.96);
    ctx.textBaseline = 'alphabetic';

    // ── Geri butonu ──
    const back = { id: 'back', x: W * 0.04, y: H * 0.04, w: Math.max(64, W * 0.14), h: Math.max(40, H * 0.06) };
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    ctx.textBaseline = 'alphabetic';
    this._btns.push(back);

    // ── Geometri (efekt merkezi) ──
    this._cx = W / 2; this._cy = H * 0.205;

    // ── Onay ekranı (overlay) ──
    if (this._confirming) this._drawConfirm(ctx, W, H);
  },

  // Parlayan prestij yıldızları satırı.
  _drawStars(ctx, cx, cy, count, r) {
    const shown = Math.max(1, count);       // level 0 → 1 soluk yıldız
    const gap = r * 2.6;
    const totalW = (shown - 1) * gap;
    let x0 = cx - totalW / 2;
    for (let i = 0; i < shown; i++) {
      const filled = i < count;
      const pulse = 0.5 + 0.5 * Math.sin(this._t * 3 + i * 0.6);
      const x = x0 + i * gap;
      ctx.save();
      if (filled) {
        ctx.shadowColor = this.COL.gold;
        ctx.shadowBlur = 10 + pulse * 14;
        ctx.fillStyle = this.COL.gold;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
      }
      this._star(ctx, x, cy, r, r * 0.45);
      ctx.fill();
      ctx.restore();
    }
    // Çok yıldız varsa özet
    if (count > 8) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = this.COL.gold;
      ctx.font = 'bold ' + Math.round(r * 1.1) + 'px system-ui, sans-serif';
      ctx.fillText('×' + count, cx, cy);
      ctx.textBaseline = 'alphabetic';
    }
  },

  _star(ctx, cx, cy, outer, inner) {
    const spikes = 5;
    let rot = -Math.PI / 2;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    for (let i = 0; i < spikes; i++) {
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * inner, cy + Math.sin(rot) * inner);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * outer, cy + Math.sin(rot) * outer);
    }
    ctx.closePath();
  },

  _panel(ctx, x, y, w, h) {
    ctx.fillStyle = this.COL.panel;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; ctx.stroke();
  },

  // ── Onay ekranı: ne sıfırlanır / ne kalır açıkça ──────────────────────────
  _drawConfirm(ctx, W, H) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    const pw = Math.min(W * 0.86, 520), ph = Math.min(H * 0.62, 460);
    const px = W / 2 - pw / 2, py = H / 2 - ph / 2;
    ctx.fillStyle = this.COL.panel2;
    this._roundRect(ctx, px, py, pw, ph, 18); ctx.fill();
    ctx.strokeStyle = this.COL.purple; ctx.lineWidth = 3;
    this._roundRect(ctx, px, py, pw, ph, 18); ctx.stroke();

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.purple;
    ctx.font = 'bold ' + Math.round(ph * 0.09) + 'px system-ui, sans-serif';
    ctx.fillText('⭐ PRESTİJ YAP?', W / 2, py + ph * 0.14);

    const next = this._bonusFor(this._level() + 1);
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(ph * 0.055) + 'px system-ui, sans-serif';
    ctx.fillText('Yeni bonus: +%' + Math.round((next.coinMult - 1) * 100) +
                 ' altın, +%' + Math.round((next.nitroMult - 1) * 100) + ' nitro',
                 W / 2, py + ph * 0.24);

    // SIFIRLANIR
    ctx.textAlign = 'left';
    ctx.fillStyle = this.COL.red;
    ctx.font = 'bold ' + Math.round(ph * 0.05) + 'px system-ui, sans-serif';
    ctx.fillText('SIFIRLANIR:', px + pw * 0.08, py + ph * 0.38);
    ctx.fillStyle = this.COL.text;
    ctx.font = Math.round(ph * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('• Oyuncu seviyesi → 1', px + pw * 0.10, py + ph * 0.46);
    ctx.fillText('• XP → 0', px + pw * 0.10, py + ph * 0.53);

    // KALIR
    ctx.fillStyle = this.COL.green;
    ctx.font = 'bold ' + Math.round(ph * 0.05) + 'px system-ui, sans-serif';
    ctx.fillText('KALIR:', px + pw * 0.08, py + ph * 0.64);
    ctx.fillStyle = this.COL.text;
    ctx.font = Math.round(ph * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('• Araçlar, kartlar, başarımlar', px + pw * 0.10, py + ph * 0.72);
    ctx.fillText('• Altın, elmas, hurda ve prestij', px + pw * 0.10, py + ph * 0.79);

    // Butonlar
    const bw = pw * 0.4, bh = ph * 0.13;
    const gap = pw * 0.06;
    const byy = py + ph * 0.85;
    const noX = px + pw / 2 - bw - gap / 2;
    const yesX = px + pw / 2 + gap / 2;
    // İptal
    ctx.fillStyle = this.COL.locked;
    this._roundRect(ctx, noX, byy, bw, bh, 12); ctx.fill();
    ctx.fillStyle = this.COL.text;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(bh * 0.4) + 'px system-ui, sans-serif';
    ctx.fillText('İPTAL', noX + bw / 2, byy + bh / 2);
    // Onayla (parlayan)
    ctx.save();
    ctx.shadowColor = this.COL.purple; ctx.shadowBlur = 18;
    const yg = ctx.createLinearGradient(yesX, 0, yesX + bw, 0);
    yg.addColorStop(0, '#8a3dff'); yg.addColorStop(1, this.COL.purple);
    ctx.fillStyle = yg;
    this._roundRect(ctx, yesX, byy, bw, bh, 12); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = this.COL.gold; ctx.lineWidth = 2;
    this._roundRect(ctx, yesX, byy, bw, bh, 12); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PRESTİJ YAP', yesX + bw / 2, byy + bh / 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    this._btns.push({ id: 'confirm_no',  x: noX,  y: byy, w: bw, h: bh });
    this._btns.push({ id: 'confirm_yes', x: yesX, y: byy, w: bw, h: bh });
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

  _fmt(n) {
    n = this._int(n, 0);
    if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + 'M';
    if (n >= 1000)    return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'K';
    return String(n);
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: handleClick(x, y)  → 'back' | null
  // ══════════════════════════════════════════════════════════════════════════
  handleClick(x, y) {
    // Onay ekranı açıkken yalnızca onay butonları geçerli.
    if (this._confirming) {
      for (let i = 0; i < this._btns.length; i++) {
        const b = this._btns[i];
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          if (b.id === 'confirm_no')  { this._confirming = false; this._sfx('playMenuClick'); return null; }
          if (b.id === 'confirm_yes') { this._apply(); return null; }
        }
      }
      return null;   // overlay dışına tıklama yutulur
    }

    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        if (b.id === 'prestige') {
          if (this._eligible()) { this._confirming = true; this._sfx('playMenuClick'); }
          else this._toast('Gereksinim henüz karşılanmadı');
          return null;
        }
        return null;
      }
    }
    return null;
  }
};

// Global erişim (tarayıcı).
if (typeof window !== 'undefined') window.Prestige = Prestige;
// Node/CommonJS ortamında da yüklenebilsin (node --check & test uyumu).
if (typeof module !== 'undefined' && module.exports) module.exports = Prestige;
