'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   GÜNLÜK GÖREVLER  —  DAILY QUESTS
   ---------------------------------------------------------------------------
   Kendi kendine yeten modül. Bağımlılıkların HEPSİ güvenli-opsiyonel (typeof guard),
   hiçbiri yoksa da modül çöker­meden çalışır:

     · SaveData.get/set            → kalıcılık (localStorage YOK — her şey SaveData)
     · SaveData.addGold            → ödül (Economy yoksa yedek)
     · Economy.addGold             → ödül (varsa öncelik)
     · UI.showToast                → bildirim (opsiyonel)
     · Audio.*                     → ses efektleri (opsiyonel)
     · Date.now()                  → gün damgası & yenilenme sayacı

   İÇERİK
     · Her gün 3 ROTASYONLU görev — gün numarasına göre DETERMİNİSTİK seçim.
       (Aynı gün herkeste/her açılışta aynı 3 görev; gün değişince yenilenir.)
     · İlerleme takibi: oyun trackEvent(type, amount) çağırınca ilgili görev artar.
     · Tamamlanan görevin ödülü "TALEP ET" ile alınır; alınınca "✓ ALINDI".
     · Yenilenme sayacı: bir sonraki gün başına (UTC gün yarısı) kalan süre.

   API
     DailyQuests.draw(ctx, W, H [, dt])  → tam ekran çizim
     DailyQuests.handleClick(x, y)       → 'back' | null  (TALEP ET ödülü verir)
     DailyQuests.getToday()              → bugünün 3 görevi (dizi, deterministik)
     DailyQuests.trackEvent(type, amt)   → görev ilerlemesini artırır + kaydeder
     DailyQuests.update(dt)              → (opsiyonel) sadece görsel saat ilerletir

   KURALLAR: localStorage kullanmaz. Tüm miktar/dt girişleri NaN korumalıdır.
   ═══════════════════════════════════════════════════════════════════════════ */
const DailyQuests = {

  // ── Sabitler ────────────────────────────────────────────────────────────────
  DAY_MS: 86400000,
  _SAVE_KEY: 'dailyQuests',
  DAILY_COUNT: 3,

  // ── Görev HAVUZU (12 şablon; günlük 3 seçilir) ─────────────────────────────
  //   type  → trackEvent(type, amount) ile eşleşen olay tipi
  //   max   → true ise ilerleme += yerine max(ilerleme, amount) (tek koşu ölçümleri)
  //   unit  → ilerleme çubuğunda gösterilen birim
  POOL: [
    { key:'dist_total', type:'distance', target:2000, reward:400, icon:'🏁', unit:'m',  desc:'Toplam 2000m sür' },
    { key:'flips',      type:'flips',    target:5,    reward:300, icon:'🌀', unit:'',   desc:'5 takla at' },
    { key:'coins',      type:'coins',    target:800,  reward:350, icon:'🪙', unit:'',   desc:'800 altın topla' },
    { key:'race_win',   type:'race_win', target:1,    reward:600, icon:'🏆', unit:'',   desc:'1 bot yarışı kazan' },
    { key:'nitro',      type:'nitro',    target:3,    reward:250, icon:'🔥', unit:'',   desc:'3 kez nitro kullan' },
    { key:'run_dist',   type:'run_distance', target:1500, reward:500, icon:'📏', unit:'m', desc:'Tek koşuda 1500m git', max:true },
    { key:'chests',     type:'chest',    target:10,   reward:450, icon:'🎁', unit:'',   desc:'10 sandık/ödül aç' },
    { key:'airtime',    type:'air',      target:500,  reward:350, icon:'✈️', unit:'m',  desc:'Havada 500m uç' },
    { key:'jumps',      type:'jump',     target:8,    reward:280, icon:'⛰️', unit:'',   desc:'8 kez zıpla/atla' },
    { key:'speed',      type:'speed',    target:130,  reward:320, icon:'💨', unit:'km/s', desc:'130 km/s hıza ulaş', max:true },
    { key:'games',      type:'race',     target:3,    reward:300, icon:'🚗', unit:'',   desc:'3 yarış tamamla' },
    { key:'combo',      type:'combo',    target:4,    reward:420, icon:'🎯', unit:'',   desc:'4 komboluk seri yap', max:true },
  ],

  // ── Tema ────────────────────────────────────────────────────────────────────
  COL: {
    bg0:'#0b1020', bg1:'#1b2a4a', panel:'#141d36', panelHi:'#1b2748',
    line:'rgba(255,255,255,0.10)', text:'#eef3ff', mute:'#8ea0c6',
    orange:'#ff8a3d', gold:'#ffd54a', green:'#39d98a', done:'#5c6f96',
    barBg:'rgba(255,255,255,0.10)'
  },

  // ── Çalışma zamanı ───────────────────────────────────────────────────────────
  _state: null,          // { day, progress:[], claimed:[] }
  _todayQuests: null,    // getToday() önbelleği (gün başına)
  _cacheDay: -1,
  _btns: [],             // her draw'da yeniden doldurulan tıklama hedefleri
  _t: 0,                 // görsel saat (ışıltı)
  _lastNow: 0,
  _extDriven: false,
  _updatedThisFrame: false,

  // ══════════════════════════════════════════════════════════════════════════
  //  YARDIMCILAR
  // ══════════════════════════════════════════════════════════════════════════
  _num(v, fb) { v = Number(v); return isFinite(v) ? v : (Number(fb) || 0); },
  _int(v, fb) { return Math.floor(this._num(v, fb)); },
  _now() { return Date.now(); },
  _day() { return Math.floor(this._now() / this.DAY_MS); },

  // ── Bugünün 3 görevi — gün numarasına göre DETERMİNİSTİK, distinct ──────────
  getToday() {
    const day = this._day();
    if (this._todayQuests && this._cacheDay === day) return this._todayQuests;
    const N = this.POOL.length;
    const need = Math.min(this.DAILY_COUNT, N);
    const step = 1 + (((day % (N - 1)) + (N - 1)) % (N - 1)); // 1..N-1, güne göre kayar
    const idxs = [];
    // Gün ofsetinden adımlayarak distinct indeksler topla.
    for (let k = 0; k < N && idxs.length < need; k++) {
      const cand = (((day + k * step) % N) + N) % N;
      if (idxs.indexOf(cand) < 0) idxs.push(cand);
    }
    // Güvenlik: hâlâ eksikse sırayla doldur (asla 3'ten az dönmesin).
    for (let k = 0; k < N && idxs.length < need; k++) {
      if (idxs.indexOf(k) < 0) idxs.push(k);
    }
    this._todayQuests = idxs.map(i => this.POOL[i]);
    this._cacheDay = day;
    return this._todayQuests;
  },

  // ── Kalıcı durum (gün değişince ilerleme sıfırlanır) ────────────────────────
  _fresh(day) {
    return { day: day, progress: [0, 0, 0], claimed: [false, false, false] };
  },

  _get() {
    const day = this._day();
    if (this._state && this._state.day === day) return this._state;
    let d = null;
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) d = SaveData.get(this._SAVE_KEY, null);
    } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d)) d = this._fresh(day);

    // Gün değiştiyse (kaydedilen dailyDay != day) ilerlemeyi ve talepleri sıfırla.
    if (this._int(d.day, -1) !== day) {
      d = this._fresh(day);
    } else {
      // Dizileri güvene al (bozuk kayıt / eski şema koruması).
      if (!Array.isArray(d.progress)) d.progress = [0, 0, 0];
      if (!Array.isArray(d.claimed))  d.claimed  = [false, false, false];
      for (let i = 0; i < this.DAILY_COUNT; i++) {
        d.progress[i] = Math.max(0, this._num(d.progress[i], 0));
        d.claimed[i]  = !!d.claimed[i];
      }
    }
    this._state = d;
    return d;
  },

  _persist() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this._SAVE_KEY, this._state);
    } catch (e) {}
  },

  _toast(msg) {
    try { if (typeof UI !== 'undefined' && typeof UI.showToast === 'function') UI.showToast(msg); } catch (e) {}
  },

  _sfx(name) {
    try { if (typeof Audio !== 'undefined' && typeof Audio[name] === 'function') Audio[name](); } catch (e) {}
  },

  // ── Ödül ver — Economy varsa onu, yoksa SaveData; NaN korumalı ──────────────
  _giveGold(amt) {
    amt = Math.max(0, this._int(amt, 0));
    if (amt <= 0) return;
    try {
      if (typeof Economy !== 'undefined' && typeof Economy.addGold === 'function') {
        Economy.addGold(amt);
      } else if (typeof SaveData !== 'undefined' && typeof SaveData.addGold === 'function') {
        SaveData.addGold(amt);
      } else if (typeof SaveData !== 'undefined' && typeof SaveData.set === 'function') {
        const cur = this._num((SaveData.get && SaveData.get('gold', 0)) || 0, 0);
        SaveData.set('gold', cur + amt);
      }
    } catch (e) {}
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: trackEvent(type, amount)  — oyun her yerden çağırabilir (guard'lı)
  //    Örn: DailyQuests.trackEvent('distance', 120)   // 120m sürüldü
  //         DailyQuests.trackEvent('flips', 1)        // 1 takla
  //         DailyQuests.trackEvent('run_distance', d) // tek koşu mesafesi (max)
  // ══════════════════════════════════════════════════════════════════════════
  trackEvent(type, amount) {
    try {
      if (!type) return;
      amount = this._num(amount, 1);
      if (amount <= 0 && type.indexOf('speed') < 0 && type.indexOf('combo') < 0) {
        // 'speed'/'combo' gibi max-ölçümlerde 0 anlamlı olabilir; diğerlerinde atla.
        if (amount <= 0) return;
      }
      const quests = this.getToday();
      const st = this._get();
      let changed = false;
      for (let i = 0; i < quests.length; i++) {
        const q = quests[i];
        if (!q || q.type !== type) continue;
        let cur = Math.max(0, this._num(st.progress[i], 0));
        let next;
        if (q.max) next = Math.max(cur, amount);       // tek koşu / zirve ölçümleri
        else       next = cur + amount;                // birikimli sayaçlar
        next = Math.min(next, q.target);               // hedefte sabitle
        if (next !== cur) { st.progress[i] = next; changed = true; }
      }
      if (changed) this._persist();
    } catch (e) {}
  },

  // ── Bir görev tamamlandı mı / talep edildi mi ───────────────────────────────
  _isComplete(i) {
    const st = this._get();
    const q = this.getToday()[i];
    if (!q) return false;
    return this._num(st.progress[i], 0) >= q.target;
  },
  _isClaimed(i) { return !!this._get().claimed[i]; },

  // ── Ödül talep et ───────────────────────────────────────────────────────────
  _claim(i) {
    const st = this._get();
    const q = this.getToday()[i];
    if (!q) return;
    if (this._isClaimed(i)) return;
    if (!this._isComplete(i)) return;
    st.claimed[i] = true;
    this._persist();
    this._giveGold(q.reward);
    this._toast('🎉 +' + q.reward + ' 🪙  ' + q.desc);
    this._sfx('playCoin');
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  GÖRSEL SAAT (yalnızca ışıltı — ilerleme değil)
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

  // ── Yenilenme sayacı metni: sonraki gün başına kalan ("14s 32d") ────────────
  _renewText() {
    const nextDay = (this._day() + 1) * this.DAY_MS;
    let rem = Math.max(0, nextDay - this._now());
    const h = Math.floor(rem / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);
    return h + 's ' + m + 'd';
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  PUBLIC: draw(ctx, W, H [, dt])
  // ══════════════════════════════════════════════════════════════════════════
  draw(ctx, W, H, dt) {
    // Zaman ilerlet (update dışarıdan çağrılmadıysa kendi saatimizi kullan).
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
    const quests = this.getToday();
    const st = this._get();

    // ── Arka plan ──
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, this.COL.bg0);
    g.addColorStop(1, this.COL.bg1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // ── Geri butonu ──
    const back = { id: 'back', x: W * 0.04, y: H * 0.04, w: Math.max(64, W * 0.14), h: Math.max(40, H * 0.06) };
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    this._roundRect(ctx, back.x, back.y, back.w, back.h, 10); ctx.fill();
    ctx.strokeStyle = this.COL.line; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(back.h * 0.42) + 'px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('‹ Geri', back.x + back.w / 2, back.y + back.h / 2);
    this._btns.push(back);

    // ── Başlık ──
    // 🔴 TASMA (29 Tmz): font YALNIZ H'ye bagliydi. Dar-uzun ekranda (360x800)
    //   H buyuk → font buyuk → metin W'ye SIGMIYOR ve ekran disina tasiyordu
    //   ("📋 GÜNLÜK GÖREVLER" 373 px, ekran 360 px).
    //   ▶ Font artik min(H tabanli, W tabanli); ayrica fillText'e maxWidth
    //     veriliyor (guvenlik agi — cevirisi uzun bir dilde de tasmaz).
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(Math.min(H * 0.044, W * 0.058)) + 'px system-ui, sans-serif';
    ctx.fillText('📋 GÜNLÜK GÖREVLER', W / 2, H * 0.115, W * 0.92);

    // ── Yenilenme sayacı ──
    ctx.fillStyle = this.COL.mute;
    ctx.font = 'bold ' + Math.round(Math.min(H * 0.024, W * 0.036)) + 'px system-ui, sans-serif';
    ctx.fillText('⏳ Yenilenme: ' + this._renewText(), W / 2, H * 0.16, W * 0.92);

    // ── Görev kartları ──
    const cardX = W * 0.07;
    const cardW = W * 0.86;
    const top = H * 0.215;
    const gap = H * 0.025;
    const cardH = Math.min(H * 0.20, (H * 0.74 - gap * 2) / 3);

    for (let i = 0; i < quests.length; i++) {
      const y = top + i * (cardH + gap);
      this._drawCard(ctx, i, quests[i], st, cardX, y, cardW, cardH);
    }
  },

  _drawCard(ctx, i, q, st, x, y, w, h) {
    if (!q) return;
    const cur = Math.min(q.target, Math.max(0, this._num(st.progress[i], 0)));
    const complete = cur >= q.target;
    const claimed = !!st.claimed[i];
    const pct = q.target > 0 ? Math.min(1, cur / q.target) : 0;

    // Panel
    const pg = ctx.createLinearGradient(x, y, x, y + h);
    pg.addColorStop(0, this.COL.panelHi);
    pg.addColorStop(1, this.COL.panel);
    ctx.fillStyle = pg;
    this._roundRect(ctx, x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = complete && !claimed ? this.COL.orange : this.COL.line;
    ctx.lineWidth = complete && !claimed ? 2 : 1;
    ctx.stroke();

    const pad = h * 0.16;
    const iconSz = h * 0.34;

    // İkon (sol)
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = Math.round(iconSz) + 'px system-ui, sans-serif';
    ctx.fillText(q.icon, x + pad, y + h * 0.30);

    // Açıklama
    // ⚠ Metin ikonun sagindan baslar ve ODUL yazisina kadar yer var; kalan
    //   genislik ASILMAMALI (dar ekranda "Tek koşuda 1500m git" tasiyordu).
    const odulGen = w * 0.26;                       // sag ustteki "+N 🪙" payi
    const aciklamaGen = Math.max(40, w - pad * 2 - iconSz - 10 - odulGen);
    ctx.fillStyle = this.COL.text;
    ctx.font = 'bold ' + Math.round(Math.min(h * 0.20, w * 0.055)) + 'px system-ui, sans-serif';
    ctx.fillText(q.desc, x + pad + iconSz + 10, y + h * 0.30, aciklamaGen);

    // Ödül (sağ üst)
    ctx.textAlign = 'right';
    ctx.fillStyle = this.COL.gold;
    ctx.font = 'bold ' + Math.round(Math.min(h * 0.19, w * 0.052)) + 'px system-ui, sans-serif';
    ctx.fillText('+' + q.reward + ' 🪙', x + w - pad, y + h * 0.28, odulGen);

    // İlerleme çubuğu
    const barX = x + pad;
    const barY = y + h * 0.56;
    const barW = w - pad * 2;
    const barH = Math.max(10, h * 0.14);
    ctx.fillStyle = this.COL.barBg;
    this._roundRect(ctx, barX, barY, barW, barH, barH / 2); ctx.fill();
    if (pct > 0) {
      const fillW = Math.max(barH, barW * pct);
      const bg = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
      if (complete) { bg.addColorStop(0, this.COL.green); bg.addColorStop(1, '#7ef0b4'); }
      else          { bg.addColorStop(0, this.COL.orange); bg.addColorStop(1, this.COL.gold); }
      ctx.fillStyle = bg;
      this._roundRect(ctx, barX, barY, fillW, barH, barH / 2); ctx.fill();
    }

    // İlerleme metni (mevcut/hedef)
    const unit = q.unit ? q.unit : '';
    const progTxt = Math.floor(cur) + unit + ' / ' + q.target + unit;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = this.COL.mute;
    ctx.font = Math.round(h * 0.15) + 'px system-ui, sans-serif';
    ctx.fillText(progTxt, barX + 2, barY + barH + h * 0.16);

    // Buton / durum (sağ alt)
    const bw = Math.min(w * 0.34, 190);
    const bh = Math.max(30, h * 0.30);
    const bx = x + w - pad - bw;
    const by = barY + barH + h * 0.05;

    if (claimed) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = this.COL.done;
      ctx.font = 'bold ' + Math.round(bh * 0.5) + 'px system-ui, sans-serif';
      ctx.fillText('✓ ALINDI', bx + bw / 2, by + bh / 2);
    } else if (complete) {
      // "TALEP ET" butonu — parıltılı
      const pulse = 0.5 + 0.5 * Math.sin(this._t * 4);
      ctx.save();
      ctx.shadowColor = 'rgba(255,138,61,' + (0.4 + pulse * 0.4) + ')';
      ctx.shadowBlur = 12;
      ctx.fillStyle = this.COL.orange;
      this._roundRect(ctx, bx, by, bw, bh, 10); ctx.fill();
      ctx.restore();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#10131f';
      ctx.font = 'bold ' + Math.round(bh * 0.48) + 'px system-ui, sans-serif';
      ctx.fillText('TALEP ET', bx + bw / 2, by + bh / 2);
      this._btns.push({ id: 'claim', slot: i, x: bx, y: by, w: bw, h: bh });
    } else {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = this.COL.mute;
      ctx.font = 'bold ' + Math.round(bh * 0.44) + 'px system-ui, sans-serif';
      ctx.fillText(Math.floor(pct * 100) + '%', bx + bw / 2, by + bh / 2);
    }
    ctx.textBaseline = 'alphabetic';
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
    for (let i = 0; i < this._btns.length; i++) {
      const b = this._btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        if (b.id === 'back') return 'back';
        if (b.id === 'claim') { this._claim(b.slot); return null; }
        return null;
      }
    }
    return null;
  }
};

// Tarayıcı global'i.
window.DailyQuests = DailyQuests;
// Node/CommonJS ortamında da yüklenebilsin (node --check & test uyumu; tarayıcıda etkisiz).
if (typeof module !== 'undefined' && module.exports) module.exports = DailyQuests;
