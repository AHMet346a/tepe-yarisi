'use strict';
/* ============================================================
   Responsive — cihaz sınıfı + ölçek katmanı (telefon / tablet)
   Yatay-öncelikli. Yüzlerce telefon ve tablete tek formülle uyum.
   Main._resize her boyut değişiminde Responsive.update(W,H) çağırır.
   Ekranlar bu katmandan ölçek/güvenli konum okur; sabit piksel yerine
   H'ye göre ölçeklenen değerler kullanır → kısa yatay ekranda taşma/kayma olmaz.
   ============================================================ */
const Responsive = {
  W: 0, H: 0,
  aspect: 1,           // W / H
  isLandscape: true,
  deviceClass: 'phone',// 'phone' | 'tablet'
  ui: 1,               // genel UI ölçeği (öğe boyutları bununla çarpılır)

  update(W, H) {
    W = Math.max(1, W | 0); H = Math.max(1, H | 0);
    this.W = W; this.H = H;
    this.aspect = W / H;
    this.isLandscape = W >= H;
    const minDim = Math.min(W, H);

    // Tablet: kısa kenar büyük (≥600) VE oran daha kare (≤ ~2.05). Aksi halde telefon.
    this.deviceClass = (minDim >= 600 && this.aspect <= 2.05) ? 'tablet' : 'phone';

    // UI ölçeği yüksekliğe bağlı: 700px tasarım yüksekliğine göre, güvenli aralıkta clamp.
    // Kısa yatay telefonda (~360) küçülür ama okunur kalır; tablette biraz büyür.
    let s = H / 700;
    s = Math.max(0.72, Math.min(1.35, s));
    if (this.deviceClass === 'tablet') s = Math.min(1.5, Math.max(s, 0.95) * 1.08);
    this.ui = s;
    return this;
  },

  // H'ye orantılı, min/max sınırlı bir ölçü döndürür (px).
  vh(frac, min, max) {
    const v = this.H * frac;
    return Math.round(Math.max(min, Math.min(max, v)));
  },

  isTablet() { return this.deviceClass === 'tablet'; }
};

// İlk güvenli varsayılan (Main._resize hemen üzerine yazacak).
if (typeof window !== 'undefined') {
  window.Responsive = Responsive;
  try { Responsive.update(window.innerWidth || 800, window.innerHeight || 450); } catch (e) {}
}
