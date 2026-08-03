'use strict';
// ══════════════════════════════════════════════════════════════════════════
// DDA — Dinamik Zorluk Ayarı (Dynamic Difficulty Adjustment)
// ---------------------------------------------------------------------------
// Kendi kendine yeten modül. Oyuncunun sürekli kazanıp kazanmadığını izleyen
// gizli bir "beceri tahmini" (skill 0..1) tutar ve bunu DAR aralıklı çarpanlara
// çevirir:
//   · getBotBonus()    → bot güç çarpanı   (0.90 .. 1.12)
//   · getRewardBonus() → ödül çarpanı      (1.00 .. 1.35)
//   · getAssist()      → yardım faktörü    (0.00 .. 0.15)
// İnce ayar felsefesi: oyuncu ASLA hile hissetmemeli. Tüm çarpanlar küçük
// adımlarla, dar aralıkta hareket eder. Kaybeden oyuncu hafifçe rahatlar +
// biraz daha ödül alır (frustrasyon ↓, tutunma ↑). Kazanan oyuncu için
// zorluk hafifçe artar (meydan okuma korunur).
//
// Kalıcılık: SADECE SaveData (guard'lı). localStorage'a doğrudan DOKUNULMAZ.
// ══════════════════════════════════════════════════════════════════════════
const DDA = {
  // ── Ayar sabitleri (hepsi dar aralık — bilerek konservatif) ──────────────
  _MIN_SKILL: 0,
  _MAX_SKILL: 1,
  _DEFAULT_SKILL: 0.5,
  _WIN_STEP: 0.04,          // kazanınca skill +0.04 (yavaş yükseliş)
  _LOSS_STEP: 0.05,         // kaybedince skill −0.05 (biraz daha hızlı düşüş → frustrasyon önleme)
  _STREAK_THRESHOLD: 3,     // 3+ üst üste kayıpta ekstra kolaylaştır
  _STREAK_EXTRA: 0.03,      // kayıp serisinde skill'e ekstra düşüş

  // ── Çarpan aralıkları (dışarıdan okunabilir referans) ────────────────────
  _BOT_MIN: 0.90, _BOT_MAX: 1.12,
  _REWARD_MIN: 1.00, _REWARD_MAX: 1.35,
  _ASSIST_MAX: 0.15,

  // ── Dahili durum ─────────────────────────────────────────────────────────
  _skill: 0.5,
  _lossStreak: 0,
  _loaded: false,

  // ── SaveData guard'lı yardımcılar ────────────────────────────────────────
  _hasSave() {
    return (typeof SaveData !== 'undefined' && SaveData &&
            typeof SaveData.get === 'function' && typeof SaveData.set === 'function');
  },

  _clamp(v, lo, hi) {
    const n = Number(v);
    if (!isFinite(n)) return lo;
    return n < lo ? lo : (n > hi ? hi : n);
  },

  // İlk erişimde kalıcı skill'i yükle (guard'lı, NaN korumalı)
  _ensureLoaded() {
    if (this._loaded) return;
    this._loaded = true;
    let s = this._DEFAULT_SKILL;
    let streak = 0;
    if (this._hasSave()) {
      try {
        const raw = SaveData.get('ddaSkill', this._DEFAULT_SKILL);
        // SaveData.get(key) tek argümanlı sürümde default'u yok sayabilir → çift guard
        const val = (raw === undefined || raw === null) ? this._DEFAULT_SKILL : raw;
        s = this._clamp(val, this._MIN_SKILL, this._MAX_SKILL);
        const rawStreak = SaveData.get('ddaLossStreak', 0);
        const sv = Number(rawStreak);
        streak = (isFinite(sv) && sv > 0) ? Math.floor(sv) : 0;
      } catch (e) { s = this._DEFAULT_SKILL; streak = 0; }
    }
    this._skill = s;
    this._lossStreak = streak;
  },

  _persist() {
    if (!this._hasSave()) return;
    try {
      SaveData.set('ddaSkill', this._clamp(this._skill, this._MIN_SKILL, this._MAX_SKILL));
      SaveData.set('ddaLossStreak', Math.max(0, Math.floor(this._lossStreak) || 0));
    } catch (e) { /* sessiz — kayıt hatası oynanışı bozmamalı */ }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // recordResult(result) — yarış/koşu bitiminde çağrılır.
  //   result = { won:bool, margin:number(0..1 ops.), distance:ops, deaths:ops }
  //   · kazandı → skill küçük adımla ARTAR (+_WIN_STEP)
  //   · kaybetti → skill AZALIR (−_LOSS_STEP); kayıp serisi büyürse ekstra düşer
  //   margin verilirse (0=kıl payı, 1=ezici) ayarı hafifçe ölçekler.
  // ══════════════════════════════════════════════════════════════════════════
  recordResult(result) {
    this._ensureLoaded();
    result = (result && typeof result === 'object') ? result : {};
    const won = !!result.won;

    // margin: 0..1 opsiyonel. Kıl payı sonuçlar skill'i daha az oynatır,
    // ezici sonuçlar biraz daha çok — ama toplam etki HÂLÂ dar tutulur.
    let margin = Number(result.margin);
    if (!isFinite(margin)) margin = 0.5;      // bilinmiyorsa nötr orta değer
    margin = this._clamp(margin, 0, 1);
    // 0.5 nötr → çarpan ~0.7..1.3 aralığında (dar) kalır
    const marginScale = 0.7 + margin * 0.6;

    if (won) {
      this._lossStreak = 0;
      this._skill += this._WIN_STEP * marginScale;
    } else {
      this._lossStreak = (this._lossStreak || 0) + 1;
      this._skill -= this._LOSS_STEP * marginScale;
      // 3+ üst üste kayıp → ekstra kolaylaştırma (frustrasyon kırıcı)
      if (this._lossStreak >= this._STREAK_THRESHOLD) {
        this._skill -= this._STREAK_EXTRA;
      }
    }

    // Ölüm sayısı çok yüksekse (takılma sinyali) ufak ek kolaylaştırma
    const deaths = Number(result.deaths);
    if (isFinite(deaths) && deaths >= 3) {
      this._skill -= 0.01;
    }

    this._skill = this._clamp(this._skill, this._MIN_SKILL, this._MAX_SKILL);
    this._persist();
    return this._skill;
  },

  // ── getBotBonus() → bot güç çarpanı (0.90 .. 1.12) ───────────────────────
  // skill 0.5 (nötr) → 1.0. Yüksek skill → bot güçlenir (>1). Düşük → zayıflar (<1).
  // Kayıp serisi varsa botu biraz daha kısar (kaybeden oyuncuya nefes aldırır).
  getBotBonus() {
    this._ensureLoaded();
    const s = this._clamp(this._skill, 0, 1);
    // s=0 → _BOT_MIN, s=0.5 → 1.0, s=1 → _BOT_MAX (parçalı doğrusal)
    let bonus;
    if (s <= 0.5) {
      bonus = this._BOT_MIN + (s / 0.5) * (1.0 - this._BOT_MIN);
    } else {
      bonus = 1.0 + ((s - 0.5) / 0.5) * (this._BOT_MAX - 1.0);
    }
    // Kayıp serisi → botu hafif daha kıs (max ~−0.03)
    if (this._lossStreak >= this._STREAK_THRESHOLD) {
      bonus -= Math.min(0.03, (this._lossStreak - this._STREAK_THRESHOLD + 1) * 0.01);
    }
    const out = this._clamp(bonus, this._BOT_MIN, this._BOT_MAX);
    return isFinite(out) ? out : 1.0;   // bilinmeyen/bozuk durumda nötr
  },

  // ── getRewardBonus() → ödül çarpanı (1.00 .. 1.35) ───────────────────────
  // Düşük skill / kayıp serisi → daha çok altın (oyuncuyu tutmak için).
  // Yüksek skill → 1.0 (ekstra yok — zaten iyi gidiyor).
  getRewardBonus() {
    this._ensureLoaded();
    const s = this._clamp(this._skill, 0, 1);
    // skill düştükçe artar: s=1 → 1.0, s=0 → ~1.25 (taban katkı)
    let bonus = 1.0 + (1 - s) * (this._REWARD_MAX - 1.0) * 0.7;
    // Kayıp serisi → ekstra ödül dürtmesi (tavan _REWARD_MAX'a doğru)
    if (this._lossStreak >= this._STREAK_THRESHOLD) {
      bonus += Math.min(0.12, (this._lossStreak - this._STREAK_THRESHOLD + 1) * 0.04);
    }
    const out = this._clamp(bonus, this._REWARD_MIN, this._REWARD_MAX);
    return isFinite(out) ? out : 1.0;
  },

  // ── getAssist() → küçük yardım faktörü (0.00 .. 0.15) ────────────────────
  // Kaybeden / düşük skill oyuncu için: takla direnci / ekstra tutuş miktarı.
  // Yüksek skill → 0 (yardım yok). Entegratör bunu physics'te grip/anti-flip
  // katkısı olarak kullanabilir (örn v.angularVel *= (1 - assist)).
  getAssist() {
    this._ensureLoaded();
    const s = this._clamp(this._skill, 0, 1);
    // s>=0.6 → yardım yok; s düştükçe doğrusal artar
    if (s >= 0.6) return 0;
    let assist = ((0.6 - s) / 0.6) * this._ASSIST_MAX;
    // Kayıp serisi → yardımı biraz artır (tavan _ASSIST_MAX)
    if (this._lossStreak >= this._STREAK_THRESHOLD) {
      assist += Math.min(0.04, (this._lossStreak - this._STREAK_THRESHOLD + 1) * 0.015);
    }
    const out = this._clamp(assist, 0, this._ASSIST_MAX);
    return isFinite(out) ? out : 0;
  },

  // ── getSkill() → mevcut skill (debug / gösterim) ─────────────────────────
  getSkill() {
    this._ensureLoaded();
    return this._clamp(this._skill, this._MIN_SKILL, this._MAX_SKILL);
  },

  // ── reset() → skill'i başlangıca döndür (opsiyonel) ──────────────────────
  reset() {
    this._skill = this._DEFAULT_SKILL;
    this._lossStreak = 0;
    this._loaded = true;
    this._persist();
    return this._skill;
  }
};

window.DDA = DDA;
