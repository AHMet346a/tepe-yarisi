'use strict';
/* ============================================================================
   Ulke — ÜLKE SEÇİMİ + BAYRAK ROZETİ (ADDITIVE, 31 Tmz)
   ============================================================================
   Kullanıcı isteği: "HCR2'deki gibi ülke seçme olsun, seçtiğimiz ülkenin
   bayrağı görünsün, 193 ülkenin de bayrağını ekle."
   HCR2'de oyuncu adının SOLUNDA küçük bir bayrak durur (mağaza ekran
   görüntüsünde "🇫🇮Bill" olarak görüldü).

   Bayraklar `js/bayraklar.js` motoruyla KODLA ÇİZİLİR (emoji DEĞİL — Windows
   Chrome'da emoji bayrak canvas'a bayrak olarak çizilmiyor, ölçüldü).

   ── EKRANLAR ─────────────────────────────────────────────────────────────
     `UI.goTo('ulke')` → seçim ızgarası (arama + kaydırma)
     `Ulke.rozet(ctx, x, y, h)` → küçük bayrak rozeti (ad yanında)

   🔴 Kaydırma `UI._dokunmatikKaydirma` ile bağlanır → yumuşatma bedava gelir
      (31 Tmz'de eklenen merkezi katman).
   🔴 Dokunma hedefi ≥44 px (dogrula-mobil.js kuralı).
   ============================================================================ */

const Ulke = {
  version: '1.0',
  ANAHTAR: 'ulkeKodu',
  VARSAYILAN: 'TR',

  _scroll: 0, _view: { viewH: 0, maxScroll: 0 },
  _arama: '',
  _btns: [],
  _hookKuruldu: false,

  // ── Seçim ───────────────────────────────────────────────────────────────
  kod() {
    try {
      if (typeof SaveData !== 'undefined' && SaveData.get) {
        const k = SaveData.get(this.ANAHTAR);
        if (k && typeof Bayraklar !== 'undefined' && Bayraklar.T[k]) return k;
      }
    } catch (e) {}
    return this.VARSAYILAN;
  },
  ad() {
    try { return (typeof Bayraklar !== 'undefined') ? Bayraklar.ad(this.kod()) : this.kod(); }
    catch (e) { return this.kod(); }
  },
  sec(kod) {
    const k = String(kod || '').toUpperCase();
    try { if (typeof Bayraklar === 'undefined' || !Bayraklar.T[k]) return false; } catch (e) { return false; }
    try { if (typeof SaveData !== 'undefined' && SaveData.set) SaveData.set(this.ANAHTAR, k); } catch (e) {}
    try { if (typeof UI !== 'undefined' && UI.toast) UI.toast(Bayraklar.ad(k)); } catch (e) {}
    return true;
  },

  // ── Küçük bayrak rozeti (oyuncu adının yanında) ─────────────────────────
  // `h` yüksekliği verilir; genişlik 3:2 orandan türetilir (gerçek bayrak oranı).
  // ⚠ Motor `_oran`'ı `ciz()` içinde kendisi ayarlar; burada bir şey yapma.
  rozet(ctx, x, y, h, kod) {
    if (!ctx || !(h > 0)) return 0;
    const w = Math.round(h * 1.5);
    try {
      if (typeof Bayraklar !== 'undefined') Bayraklar.ciz(ctx, kod || this.kod(), x, y, w, h);
    } catch (e) {}
    return w;
  },

  // ── Seçim ekranı ────────────────────────────────────────────────────────
  draw(ctx, W, H) {
    this._btns = [];
    const U = (typeof UI !== 'undefined') ? UI : null;
    if (U && U._drawScreenBg) U._drawScreenBg(ctx, W, H, 'rgba(68,221,255,0.18)');
    if (U && U._drawHeader) U._drawHeader(ctx, W, '🌍  ÜLKE SEÇ');
    if (U && U._drawBackBtn) U._drawBackBtn(ctx);
    if (U) U.buttons = [{ id: 'back', x: 4, y: 4, w: 48, h: 48 }];

    const secili = this.kod();
    const kodlar = (typeof Bayraklar !== 'undefined')
      ? (this._arama ? Bayraklar.ara(this._arama) : Bayraklar.kodlar()) : [];

    // Seçili ülke şeridi
    const stY = 58, stH = 46;
    if (U && U._drawCard) U._drawCard(ctx, 10, stY, W - 20, stH, { r: 9, accent: '#00CCFF', active: true });
    this.rozet(ctx, 20, stY + 11, 24);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(this.ad(), 20 + 36 + 10, stY + stH / 2, W - 120);
    ctx.fillStyle = '#8fd0ff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
    ctx.fillText(secili, W - 20, stY + stH / 2);

    // ── Izgara ─────────────────────────────────────────────────────────────
    const ust = stY + stH + 10;
    const viewH = Math.max(60, H - ust - 8);
    // Sütun sayısı: dokunma hedefi ≥44 px kalacak şekilde
    const sut = Math.max(2, Math.min(6, Math.floor(W / 132)));
    const kw = Math.floor((W - 20 - (sut - 1) * 8) / sut), kh = 54;
    const satir = Math.ceil(kodlar.length / sut);
    const contentH = satir * (kh + 8);
    const maxScroll = Math.max(0, contentH - viewH);
    this._scroll = Math.max(0, Math.min(maxScroll, this._scroll || 0));
    this._view = { viewH: viewH, maxScroll: maxScroll, viewTop: ust };
    this._kaydirmaBagla();

    ctx.save();
    ctx.beginPath(); ctx.rect(0, ust, W, viewH); ctx.clip();
    const bas = this._btns.length;
    for (let i = 0; i < kodlar.length; i++) {
      const r = Math.floor(i / sut), c = i % sut;
      const kx = 10 + c * (kw + 8), ky = ust + r * (kh + 8) - this._scroll;
      if (ky + kh < ust - 4 || ky > ust + viewH + 4) continue;   // ekran dışı → atla
      const k = kodlar[i], bu = (k === secili);
      if (U && U._drawCard) U._drawCard(ctx, kx, ky, kw, kh, { r: 8, accent: bu ? '#00CCFF' : null, active: bu });
      // bayrak
      const bh = 22, bw = Math.round(bh * 1.5);
      this.rozet(ctx, kx + 8, ky + 7, bh, k);
      // kod
      ctx.fillStyle = bu ? '#8fd0ff' : '#cfd6e6'; ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(k, kx + 8 + bw + 6, ky + 7 + bh / 2);
      // ad (kart genişliğine sığdır)
      ctx.fillStyle = '#e6ebf5'; ctx.font = '9px Arial';
      ctx.fillText(Bayraklar.ad(k), kx + 8, ky + kh - 12, kw - 14);
      this._btns.push({ id: 'ulke_' + k, x: kx, y: ky, w: kw, h: kh });
    }
    // Başlık şeridinin altına taşan kutuları kırp (yanlış tıklama olmasın)
    if (U && U._kirpButonlar) {
      const y0 = this._btns.length;
      // _kirpButonlar UI.buttons üzerinde çalışır; burada kendi listemiz var →
      // aynı mantığı elle uygula.
      for (let i = bas; i < this._btns.length; i++) {
        const b = this._btns[i];
        const a0 = Math.max(b.y, ust), a1 = Math.min(b.y + b.h, ust + viewH);
        if (a1 - a0 < 8) { b.y = -9999; continue; }
        b.y = a0; b.h = a1 - a0;
      }
    }
    ctx.restore();

    // Kaydırma göstergesi
    if (maxScroll > 0) {
      const trkH = viewH - 8, thH = Math.max(24, trkH * (viewH / contentH));
      const thY = ust + 4 + (trkH - thH) * (this._scroll / maxScroll);
      ctx.fillStyle = 'rgba(20,24,44,0.55)';
      ctx.beginPath(); ctx.roundRect(W - 6, ust + 4, 4, trkH, 2); ctx.fill();
      ctx.fillStyle = 'rgba(0,204,255,0.72)';
      ctx.beginPath(); ctx.roundRect(W - 6, thY, 4, thH, 2); ctx.fill();
    }

    if (U) U.buttons = U.buttons.concat(this._btns);
  },

  // 🌊 Merkezi yumuşak kaydırma katmanına bağlan (31 Tmz).
  _kaydirmaBagla() {
    if (this._hookKuruldu) return;
    try {
      if (typeof UI === 'undefined' || !UI._dokunmatikKaydirma) return;
      UI._dokunmatikKaydirma('ulke',
        () => UI.currentScreen === 'ulke',
        () => this._view,
        () => this._scroll,
        (v) => { this._scroll = v; });
      this._hookKuruldu = true;
    } catch (e) {}
  },

  // Tıklama — `main.js` `_dispatchUIAction`'dan `ulke_XX` gelir
  handleAction(action) {
    if (typeof action !== 'string') return false;
    if (action.indexOf('ulke_') !== 0) return false;
    const k = action.slice(5);
    if (this.sec(k)) { try { if (typeof UI !== 'undefined') UI.goTo('menu'); } catch (e) {} return true; }
    return false;
  },

  selfTest() {
    const r = {};
    try {
      r.bayrakMotoru = (typeof Bayraklar !== 'undefined') && Bayraklar.sayi() >= 193;
      r.varsayilanGecerli = (typeof Bayraklar !== 'undefined') && !!Bayraklar.T[this.VARSAYILAN];
      // Sahte ctx ile ekran çizimi çökmemeli + save/restore dengeli
      let d = 0, ciz = 0;
      const c = {
        save() { d++; }, restore() { d--; },
        beginPath() {}, closePath() {}, rect() {}, clip() {}, translate() {}, scale() {},
        moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, stroke() {}, fillText() {},
        roundRect() {}, strokeRect() {}, measureText() { return { width: 10 }; },
        fillRect() { ciz++; }, fill() { ciz++; },
        set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
        set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
        set lineJoin(v) {}, set miterLimit(v) {}
      };
      this.draw(c, 800, 480);
      r.ekranCiziliyor = ciz > 0;
      r.saveRestoreDengeli = (d === 0);
      r.butonVar = this._btns.length > 0;
      // Dokunma hedefi ≥44 px
      let kucuk = 0;
      for (const b of this._btns) if (b.y > -9000 && (b.w < 44 || b.h < 44)) kucuk++;
      r.dokunmaHedefi44 = (kucuk === 0);
      // Arama
      this._arama = 'tür'; this.draw(c, 800, 480);
      r.aramaCalisiyor = this._btns.length > 0;
      this._arama = '';
      // Rozet
      r.rozetGenisligi = this.rozet(c, 0, 0, 20) === 30;
      // Geçersiz kod seçilememeli
      r.gecersizKodReddediliyor = (this.sec('ZZ') === false);
    } catch (e) { r.hata = String(e && e.message ? e.message : e); }
    let allPass = !r.hata;
    for (const k in r) if (typeof r[k] === 'boolean' && r[k] === false) allPass = false;
    r.allPass = allPass;
    return r;
  }
};

if (typeof window !== 'undefined') window.Ulke = Ulke;
