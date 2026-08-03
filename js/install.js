'use strict';
// ============================================================================
// InstallPrompt — "Uygulama olarak kur" akışı (telefon + tablet + bilgisayar).
//
// 28 Tmz — YENİDEN YAZILDI. Eski sürümün sorunu:
//   Buton YALNIZCA `beforeinstallprompt` olayı tetiklenirse görünüyordu.
//   Bu olay şu durumlarda HİÇ gelmez ve kullanıcı ne yapacağını bilemezdi:
//     · iOS/Safari (Apple bu olayı desteklemiyor)
//     · Instagram/WhatsApp gibi uygulama-içi tarayıcılar
//     · Kullanıcı daha önce "Yükle"yi reddettiyse (Chrome bir süre susar)
//     · Chrome'un etkileşim eşiği dolmadıysa
//   ▶ Artık olay gelmezse de birkaç saniye sonra **"📲 Uygulama olarak kur"**
//     butonu çıkar ve tarayıcıya ÖZEL adım adım yönergeyi gösterir.
//
// Davranış:
//   1. `beforeinstallprompt` geldiyse → tek dokunuşla GERÇEK kurulum diyaloğu.
//   2. Gelmediyse → cihaza/tarayıcıya göre elle kurulum rehberi (overlay).
//   3. Zaten kuruluysa (standalone) → hiçbir şey gösterilmez.
//
// ⚠ Bu dosya HER cihazda yüklenir (index.html). `mobile.js`'e taşınmamalı —
//   o dosya yalnız telefon/tablette yükleniyor, kurulum masaüstünde de gerekli.
// ============================================================================

const InstallPrompt = {
  _deferred: null,
  _btn: null,
  _overlay: null,
  _kuruldu: false,

  // ── Cihaz/tarayıcı tespiti ───────────────────────────────────────────────
  _ua() { try { return navigator.userAgent || ''; } catch (e) { return ''; } },
  _iOS() { return /iPhone|iPad|iPod/i.test(this._ua()); },
  _android() { return /Android/i.test(this._ua()); },
  // Uygulama-içi tarayıcı: Instagram/Facebook/WhatsApp/Twitter webview.
  // Buralarda PWA KURULAMAZ — kullanıcıyı gerçek tarayıcıya yönlendirmeliyiz.
  _uygulamaIci() {
    const u = this._ua();
    return /FBAN|FBAV|Instagram|Line|WhatsApp|Twitter|TikTok|Snapchat/i.test(u);
  },
  _zatenKurulu() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if (navigator.standalone === true) return true;   // iOS
    } catch (e) {}
    return false;
  },

  init() {
    try {
      // 🔴 KURULUYSA HİÇBİR ŞEY GÖSTERME (28 Tmz).
      //   Uygulama olarak açıldığında (standalone) kurulum butonu ve rehber
      //   anlamsız — kullanıcı zaten kurmuş. Eskiden "Nasıl kurulur?" butonu
      //   kurulu uygulamanın içinde de çıkıyordu.
      if (this._zatenKurulu()) { this._kuruldu = true; return; }

      this._injectCSS();

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this._deferred = e;
        this._showBtn('kur');
      });

      window.addEventListener('appinstalled', () => {
        this._kuruldu = true;
        this._hideBtn();
        this._kapatOverlay();
        this._deferred = null;
      });

      // Olay gelmezse yedek plan: 4 sn sonra REHBER butonunu göster.
      // (Chrome olayı genelde ilk saniyelerde yollar; gecikme yanlış pozitifi önler.)
      setTimeout(() => {
        if (this._deferred || this._kuruldu || this._zatenKurulu()) return;
        this._showBtn('rehber');
      }, 4000);
    } catch (e) {}
  },

  _injectCSS() {
    try {
      if (document.getElementById('mc_install_css')) return;
      const css =
        '#mc_install{position:fixed;top:calc(10px + env(safe-area-inset-top,0px));' +
        'left:50%;transform:translateX(-50%);z-index:9600;background:#ff8a3d;color:#1a1000;' +
        'font:700 14px system-ui,sans-serif;padding:9px 16px;border-radius:20px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;display:none;white-space:nowrap}' +
        '#mc_howto{position:fixed;inset:0;z-index:9700;background:rgba(0,0,0,.72);' +
        'display:flex;align-items:center;justify-content:center;padding:18px}' +
        '#mc_howto .b{background:#141a2e;color:#e8eeff;max-width:420px;width:100%;' +
        'border:1px solid rgba(120,190,255,.35);border-radius:14px;padding:20px 20px 16px;' +
        'font:14px/1.55 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6)}' +
        '#mc_howto h3{margin:0 0 10px;font-size:16px;color:#9fd0ff}' +
        '#mc_howto ol{margin:0 0 14px;padding-left:20px}' +
        '#mc_howto li{margin:6px 0}' +
        '#mc_howto .x{display:block;width:100%;padding:11px;background:#ff8a3d;color:#1a1000;' +
        'border:none;border-radius:9px;font:700 14px system-ui;cursor:pointer}';
      const s = document.createElement('style');
      s.id = 'mc_install_css';
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {}
  },

  // mod: 'kur' → gerçek prompt · 'rehber' → elle kurulum yönergesi
  _showBtn(mod) {
    try {
      if (this._zatenKurulu()) return;
      const yazi = (mod === 'kur') ? '⬇ Uygulama olarak kur' : '📲 Nasıl kurulur?';
      if (this._btn) {
        this._btn.textContent = yazi;
        this._btn.dataset.mod = mod;
        this._btn.style.display = 'block';
        return;
      }
      const b = document.createElement('div');
      b.id = 'mc_install';
      b.textContent = yazi;
      b.dataset.mod = mod;
      b.addEventListener('click', () => {
        if (b.dataset.mod === 'kur') this.show();
        else this.rehber();
      });
      // ⚠ CSS'te display:none — oluştururken AÇ. (Eski bugda unutulmuştu ve
      //   buton DOM'a girip hiç görünmüyordu.)
      b.style.display = 'block';
      (document.body || document.documentElement).appendChild(b);
      this._btn = b;
    } catch (e) {}
  },

  _hideBtn() { if (this._btn) this._btn.style.display = 'none'; },

  // ── Gerçek kurulum diyaloğu ──────────────────────────────────────────────
  async show() {
    if (!this._deferred) { this.rehber(); return false; }
    try {
      this._deferred.prompt();
      const sonuc = await this._deferred.userChoice;
      if (sonuc && sonuc.outcome === 'accepted') { this._kuruldu = true; this._hideBtn(); }
      else {
        // Reddetti → butonu rehber moduna çevir, yine de kurabilsin.
        this._showBtn('rehber');
      }
    } catch (e) {}
    this._deferred = null;
    return true;
  },

  // ── Elle kurulum rehberi (tarayıcıya özel) ───────────────────────────────
  rehber() {
    try {
      this._kapatOverlay();
      let baslik, adimlar;

      // ⚠ ADIM METİNLERİNDE HTML ETİKETİ YOK.
      //   DOM çevirici metin DÜĞÜMLERİNİ çevirir; cümlenin ortasına <b> koyulursa
      //   cümle 3 ayrı düğüme bölünür ve sözlükte eşleşmez. Düz metin şart.
      if (this._uygulamaIci()) {
        baslik = 'Önce tarayıcıda aç';
        adimlar = [
          'Şu an bir uygulama içi tarayıcıdasın (Instagram, WhatsApp gibi). Burada kurulum yapılamaz.',
          'Sağ üstteki ⋮ menüsünden “Tarayıcıda aç” seçeneğine dokun.',
          'Sonra bu butona tekrar bas.'
        ];
      } else if (this._iOS()) {
        baslik = 'iPhone veya iPad’e kurulum';
        adimlar = [
          'Alttaki Paylaş düğmesine dokun (kutudan çıkan ok).',
          'Listeyi kaydırıp “Ana Ekrana Ekle”ye dokun.',
          'Sağ üstten Ekle’ye bas.',
          'Oyun ana ekranında uygulama olarak görünecek.'
        ];
      } else if (this._android()) {
        baslik = 'Telefona kurulum';
        adimlar = [
          'Sağ üstteki ⋮ menüsüne dokun.',
          '“Uygulamayı yükle” ya da “Ana ekrana ekle”ye dokun.',
          'Yükle’yi onayla.',
          'Oyun ana ekranına uygulama olarak düşecek.'
        ];
      } else {
        baslik = 'Bilgisayara kurulum';
        adimlar = [
          'Adres çubuğunun sağındaki kurulum simgesine tıkla.',
          'Simge yoksa sağ üstteki ⋮ menüsünden “Uygulamayı yükle”yi seç.',
          'Yükle’yi onayla.',
          'Oyun kendi penceresinde, ayrı bir uygulama gibi açılacak.'
        ];
      }

      const o = document.createElement('div');
      o.id = 'mc_howto';
      const kutu = document.createElement('div');
      kutu.className = 'b';
      kutu.innerHTML =
        '<h3>' + baslik + '</h3><ol>' +
        adimlar.map(function (a) { return '<li>' + a + '</li>'; }).join('') +
        '</ol>';
      const btn = document.createElement('button');
      btn.className = 'x';
      btn.textContent = 'Tamam';
      btn.addEventListener('click', () => this._kapatOverlay());
      kutu.appendChild(btn);
      o.appendChild(kutu);
      o.addEventListener('click', (e) => { if (e.target === o) this._kapatOverlay(); });
      document.body.appendChild(o);
      this._overlay = o;
      // Rehber metni de çevrilsin (DOM çevirici i18n.js'te).
      try { if (window.I18N && window.I18N.dom) window.I18N.dom(o); } catch (e) {}
    } catch (e) {}
  },

  _kapatOverlay() {
    try {
      if (this._overlay && this._overlay.parentNode) this._overlay.parentNode.removeChild(this._overlay);
      this._overlay = null;
    } catch (e) {}
  },

  selfTest() {
    const r = {
      varMi: typeof InstallPrompt === 'object',
      initVar: typeof InstallPrompt.init === 'function',
      rehberVar: typeof InstallPrompt.rehber === 'function',
      cssEnjekte: !!document.getElementById('mc_install_css'),
      tespitCalisiyor: typeof InstallPrompt._iOS() === 'boolean'
    };
    r.allPass = r.varMi && r.initVar && r.rehberVar && r.cssEnjekte && r.tespitCalisiyor;
    return r;
  }
};

if (typeof window !== 'undefined') {
  window.InstallPrompt = InstallPrompt;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => InstallPrompt.init());
  } else {
    InstallPrompt.init();
  }
}
