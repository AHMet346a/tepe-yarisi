const Audio = {
  ctx: null,
  masterGain: null,
  sfxGain: null,
  musicGain: null,
  engineNodes: {},
  bgmSource: null,
  bgmInterval: null,
  _bgmState: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.4;
      this.musicGain.connect(this.masterGain);
    } catch(e) {
      console.warn('Audio not available:', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // Create oscillator-based tone
  playTone(freq, type, duration, volume, when) {
    if (!this.ctx) return;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume || 0.3, when || this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, (when || this.ctx.currentTime) + duration);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(when || this.ctx.currentTime);
      osc.stop((when || this.ctx.currentTime) + duration);
    } catch(e) {}
  },

  // Noise buffer for wind / engine rumble
  createNoise(duration) {
    if (!this.ctx) return null;
    const bufLen = this.ctx.sampleRate * duration;
    const buf    = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    return src;
  },

  playCoin() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Berrak "çın" — iki nota arpej (E5 -> B5) + parlak overtone kıvılcımı
    const arpeggio = [
      { f: 659.25, when: 0.0,  dur: 0.16, vol: 0.14 },  // E5
      { f: 987.77, when: 0.06, dur: 0.22, vol: 0.13 }   // B5
    ];
    arpeggio.forEach(n => {
      try {
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        osc.frequency.linearRampToValueAtTime(n.f * 1.004, st + n.dur); // hafif parlaklık
        gain.gain.setValueAtTime(0, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0008, st + n.dur);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
        // ince üst harmonik kıvılcım
        const shimmer = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(n.f * 2, st);
        sg.gain.setValueAtTime(0, st);
        sg.gain.linearRampToValueAtTime(n.vol * 0.35, st + 0.006);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + n.dur * 0.7);
        shimmer.connect(sg); sg.connect(this.sfxGain);
        shimmer.start(st); shimmer.stop(st + n.dur);
      } catch(e) {}
    });
  },

  playFuel() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Katmanlı "gulp/refill" — filtreli akış gürültüsü + yükselen doyum tonu
    try {
      const noise = this.createNoise(0.45);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(500, t0);
        bp.frequency.linearRampToValueAtTime(1200, t0 + 0.4); // yükselen "akış"
        bp.Q.value = 1.2;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.09, t0 + 0.05);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.45);
        noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + 0.45);
      }
    } catch(e) {}
    // dolum tamamlanma tonu — yükselen iki basamak
    this.playTone(180, 'triangle', 0.22, 0.1, t0 + 0.05);
    this.playTone(260, 'triangle', 0.2,  0.11, t0 + 0.22);
  },

  playBoost() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.5;
    try {
      // Ana yükselen "vınn" — sawtooth frekans rampası, alçak geçiren süpürme ile parlar
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(400, t0);
      lp.frequency.exponentialRampToValueAtTime(3000, t0 + dur * 0.8); // açılan parlaklık
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, t0);
      osc.frequency.exponentialRampToValueAtTime(420, t0 + dur * 0.85);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.16, t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur);

      // Kalın alt katman — oktav altı, doku için
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'square';
      sub.frequency.setValueAtTime(45, t0);
      sub.frequency.exponentialRampToValueAtTime(210, t0 + dur * 0.85);
      sg.gain.setValueAtTime(0.0001, t0);
      sg.gain.linearRampToValueAtTime(0.07, t0 + 0.05);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      sub.connect(sg); sg.connect(this.sfxGain);
      sub.start(t0); sub.stop(t0 + dur);

      // Hafif jet gürültüsü — bandpass ile "hava akışı"
      const noise = this.createNoise(dur);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(1000, t0);
        bp.frequency.exponentialRampToValueAtTime(3500, t0 + dur * 0.8);
        bp.Q.value = 0.8;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.05, t0 + 0.06);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
        noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + dur);
      }
    } catch(e) {}
  },

  playExplosion() {
    if (!this.ctx) return;
    const noise = this.createNoise(1.0);
    if (!noise) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.0);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 1.0);
    this.playTone(50, 'sine', 0.8, 0.8);
  },

  playWaterSplash() {
    if (!this.ctx) return;
    const noise = this.createNoise(0.4);
    if (!noise) return;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.5;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.4);
  },

  // ═══════════════════════════════════════════════════════════════
  // EK PROSEDÜREL SFX (additive) — oyun olaylarına bağlanmak üzere
  // ═══════════════════════════════════════════════════════════════

  // Lastik cızırtısı — parlak dar-bantlı gürültü + gıcırtı LFO. intensity: 0..1
  playScreech(intensity) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const amt = Math.max(0.2, Math.min(1, intensity == null ? 0.6 : intensity));
    const dur = 0.25 + amt * 0.35;
    try {
      const noise = this.createNoise(dur);
      if (!noise) return;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1800 + amt * 900, t0);
      bp.Q.value = 6 + amt * 8;
      // hafif "gıcırtı" için frekans dalgalanması
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 30 + amt * 40;
      lfoGain.gain.value = 200;
      lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(0.05 + amt * 0.06, t0 + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
      noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
      noise.start(t0); noise.stop(t0 + dur);
      lfo.start(t0); lfo.stop(t0 + dur);
    } catch(e) {}
  },

  // Parıltılı bozuk-para tınısı — hızlı yükselen dörtlü ışıltı
  playSparkle() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1568.0, 2093.0]; // C6 E6 G6 C7
    notes.forEach((f, i) => {
      try {
        const st = t0 + i * 0.045;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.09, st + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0006, st + 0.22);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.24);
      } catch(e) {}
    });
  },

  // Kombo/takla fanfarı — kombo sayısına göre perde yükselen majör arpej
  playCombo(count) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const n = Math.max(1, Math.min(8, count || 1));
    const root = 440 * Math.pow(2, (n - 1) / 12); // her komboda yarım ton yukarı
    const steps = [0, 4, 7, 12]; // majör arpej (yarım ton)
    steps.forEach((s, i) => {
      try {
        const st = t0 + i * 0.07;
        const f = root * Math.pow(2, s / 12);
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.08, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.22);
      } catch(e) {}
    });
  },

  // Kilometre taşı jingle — kısa neşeli yükselen 4 nota
  playMilestone() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const mel = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    mel.forEach((f, i) => {
      try {
        const st = t0 + i * 0.11;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.1, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.28);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.3);
      } catch(e) {}
    });
  },

  // Düşük yakıt uyarısı — çift bip (endişeli, kısık)
  playLowFuel() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    [0, 0.22].forEach(off => {
      try {
        const st = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, st);
        osc.frequency.setValueAtTime(830, st + 0.08);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.07, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.16);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.18);
      } catch(e) {}
    });
  },

  // İniş gümlemesi — hard=true daha sert/gürültülü darbe, aksi halde yumuşak
  playThud(hard) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = hard ? 0.35 : 0.2;
    try {
      // Alçak "boom" tonu
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hard ? 130 : 90, t0);
      osc.frequency.exponentialRampToValueAtTime(hard ? 45 : 55, t0 + dur);
      g.gain.setValueAtTime(hard ? 0.5 : 0.28, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur);
      // Darbe dokusu için kısa alçak-geçiren gürültü patlaması
      const nd = hard ? 0.12 : 0.06;
      const noise = this.createNoise(nd);
      if (noise) {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = hard ? 900 : 500;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(hard ? 0.35 : 0.15, t0);
        ng.gain.exponentialRampToValueAtTime(0.001, t0 + nd);
        noise.connect(lp); lp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + nd);
      }
    } catch(e) {}
  },

  // Menü üzerine gelme — kısa yumuşak tık
  playHover() {
    if (!this.ctx) return;
    this.playTone(660, 'sine', 0.06, 0.05);
  },

  // Menü onay — iki nota yukarı sıçrayış
  playConfirm() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    this.playTone(587.33, 'triangle', 0.1, 0.09, t0);
    this.playTone(880, 'triangle', 0.14, 0.09, t0 + 0.08);
  },

  // ADDITIVE UI SFX — Menü geri/iptal: iki nota aşağı iniş (kısa, yumuşak)
  playUIBack() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      this.playTone(523.25, 'triangle', 0.09, 0.07, t0);        // C5
      this.playTone(392.00, 'triangle', 0.13, 0.07, t0 + 0.06); // G4
    } catch (e) {}
  },

  // ADDITIVE UI SFX — Ayar/geçiş (toggle): çok kısa iki-tonlu "klik-klak"
  playUIToggle(on) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      const f = on ? [740, 988] : [988, 740]; // açık: yukarı, kapalı: aşağı
      this.playTone(f[0], 'square', 0.04, 0.045, t0);
      this.playTone(f[1], 'square', 0.05, 0.04,  t0 + 0.04);
    } catch (e) {}
  },

  // ADDITIVE EVENT SFX — Kontrol noktası geçildi: hızlı "vuup" süpürme + parlak onay tıngırtısı
  playCheckpointPass() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      // yükselen süpürme (doppler benzeri geçiş hissi)
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.14);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.18);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.2);
      // üstüne kısa parlak onay notası
      this.playTone(1568.0, 'sine', 0.12, 0.07, t0 + 0.12); // G6
    } catch (e) {}
  },

  // ADDITIVE EVENT SFX — Coin-rush sayaç tıkırtısı: çok kısa parlak tek blip (arda arda tetiklenmeye uygun)
  playCoinRushTick(step) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      const n = Math.max(0, Math.min(12, step || 0));
      const f = 1046.5 * Math.pow(2, n / 24); // her tıkta hafif yukarı perde
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.06);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.07);
    } catch (e) {}
  },

  // ADDITIVE EVENT SFX — Kargo dengesizlik uyarısı: alçak titreşimli "wob-wob" alarm
  playCargoWarn() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t0);
      // iki dalgalı titreme (sarsıntı/kayma hissi)
      osc.frequency.linearRampToValueAtTime(170, t0 + 0.12);
      osc.frequency.linearRampToValueAtTime(230, t0 + 0.24);
      osc.frequency.linearRampToValueAtTime(160, t0 + 0.36);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.03);
      g.gain.setValueAtTime(0.09, t0 + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.42);
      osc.connect(lp); lp.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.44);
    } catch (e) {}
  },

  // ADDITIVE EVENT SFX — Mod/tur kazanıldı: kısa neşeli yükselen majör fanfar
  playModeWin() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const mel = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    mel.forEach((f, i) => {
      try {
        const st = t0 + i * 0.1;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.11, st + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, st + (i === mel.length - 1 ? 0.4 : 0.22));
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + (i === mel.length - 1 ? 0.42 : 0.24));
        // son notaya kalın alt oktav destek
        if (i === mel.length - 1) {
          const sub = this.ctx.createOscillator();
          const sg = this.ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(f / 2, st);
          sg.gain.setValueAtTime(0.0001, st);
          sg.gain.linearRampToValueAtTime(0.07, st + 0.02);
          sg.gain.exponentialRampToValueAtTime(0.001, st + 0.4);
          sub.connect(sg); sg.connect(this.sfxGain);
          sub.start(st); sub.stop(st + 0.42);
        }
      } catch (e) {}
    });
  },

  // ADDITIVE EVENT SFX — Mod/tur kaybedildi: hüzünlü aşağı inen üç nota
  playModeLose() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const mel = [440.0, 349.23, 261.63]; // A4 F4 C4
    mel.forEach((f, i) => {
      try {
        const st = t0 + i * 0.16;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, st);
        osc.frequency.linearRampToValueAtTime(f * 0.985, st + 0.3); // hafif "sarkma"
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 1400;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.09, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + (i === mel.length - 1 ? 0.5 : 0.3));
        osc.connect(lp); lp.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + (i === mel.length - 1 ? 0.52 : 0.32));
      } catch (e) {}
    });
  },

  // ADDITIVE EVENT SFX — Araç kilidi açıldı: kutlama tıngırtısı (parlak arpej + ışıltı katmanı)
  playUnlockVehicle() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const notes = [659.25, 987.77, 1318.5, 1975.5]; // E5 B5 E6 B6
    notes.forEach((f, i) => {
      try {
        const st = t0 + i * 0.06;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.1, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0006, st + 0.3);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.32);
        // üst harmonik ışıltı kıvılcımı
        const sh = this.ctx.createOscillator();
        const shg = this.ctx.createGain();
        sh.type = 'sine';
        sh.frequency.setValueAtTime(f * 2, st);
        shg.gain.setValueAtTime(0.0001, st);
        shg.gain.linearRampToValueAtTime(0.035, st + 0.006);
        shg.gain.exponentialRampToValueAtTime(0.0005, st + 0.2);
        sh.connect(shg); shg.connect(this.sfxGain);
        sh.start(st); sh.stop(st + 0.22);
      } catch (e) {}
    });
  },

  // ADDITIVE EVENT SFX — Güç/bonus toplandı: parlak yükselen glissando + kıvılcım
  playPowerUp() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, t0);              // G4
      osc.frequency.exponentialRampToValueAtTime(1174.66, t0 + 0.22); // D6 süpürme
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.32);
      // üstüne kısa oktav kıvılcımı
      const spark = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      spark.type = 'sine';
      spark.frequency.setValueAtTime(1567.98, t0 + 0.12); // G6
      sg.gain.setValueAtTime(0.0001, t0 + 0.12);
      sg.gain.exponentialRampToValueAtTime(0.06, t0 + 0.15);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.34);
      spark.connect(sg); sg.connect(this.sfxGain);
      spark.start(t0 + 0.12); spark.stop(t0 + 0.36);
    } catch (e) {}
  },

  // Satın alma başarılı — parlak yükselen dörtlü tını
  playPurchase() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const mel = [659.25, 830.61, 987.77, 1318.5]; // E5 G#5 B5 E6
    mel.forEach((f, i) => {
      try {
        const st = t0 + i * 0.08;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.09, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.32);
      } catch(e) {}
    });
  },

  // Hata/yetersiz bakiye — alçak boğuk vızıltı (titreşimli buzz)
  playError() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t0);
      osc.frequency.linearRampToValueAtTime(110, t0 + 0.25);
      // titreşimli buzz için frekans modülasyonu
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.type = 'square';
      lfo.frequency.value = 22;
      lg.gain.value = 18;
      lfo.connect(lg); lg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.1, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.3);
      lfo.start(t0); lfo.stop(t0 + 0.3);
    } catch(e) {}
  },

  // ADDITIVE EVENT SFX — Jackpot / büyük kazanç: yükselen majör arpej + parlak ışıltı kuyruğu
  playJackpot() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C5 E5 G5 C6 E6
    arp.forEach((f, i) => {
      try {
        const st = t0 + i * 0.08;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.11, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.32);
        // üst oktav ışıltı
        const sh = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sh.type = 'sine';
        sh.frequency.setValueAtTime(f * 2, st);
        sg.gain.setValueAtTime(0, st);
        sg.gain.linearRampToValueAtTime(0.04, st + 0.008);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + 0.22);
        sh.connect(sg); sg.connect(this.sfxGain);
        sh.start(st); sh.stop(st + 0.24);
      } catch(e) {}
    });
    // final parlak akor kuyruğu
    const tail = t0 + arp.length * 0.08 + 0.05;
    [1046.5, 1318.5, 1568.0].forEach(f => {
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, tail);
        g.gain.setValueAtTime(0, tail);
        g.gain.linearRampToValueAtTime(0.07, tail + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, tail + 0.5);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(tail); osc.stop(tail + 0.52);
      } catch(e) {}
    });
  },

  // ADDITIVE EVENT SFX — Kombo tavan: zafer güç akoru + parlak tepe vurgusu
  playComboMax() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // güçlü power-chord (kök + beşli + oktav)
    [261.63, 392.00, 523.25].forEach(f => {
      try {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.07, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1200, t0);
        lp.frequency.exponentialRampToValueAtTime(3200, t0 + 0.2);
        osc.connect(lp); lp.connect(g); g.connect(this.sfxGain);
        osc.start(t0); osc.stop(t0 + 0.47);
      } catch(e) {}
    });
    // parlak tepe vurgusu
    this.playTone(1046.5, 'triangle', 0.3, 0.09, t0 + 0.05);
    this.playTone(1568.0, 'triangle', 0.35, 0.07, t0 + 0.12);
  },

  // ADDITIVE EVENT SFX — Günlük ödül alındı: yumuşak hediye çıngırağı + tatlı onay
  playDailyClaim() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const mel = [659.25, 987.77, 1318.5]; // E5 B5 E6
    mel.forEach((f, i) => {
      try {
        const st = t0 + i * 0.1;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.1, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.32);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.34);
      } catch(e) {}
    });
    // hafif çıngırak dokusu (kuyruk)
    try {
      const noise = this.createNoise(0.18);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 5000;
        bp.Q.value = 3;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.05, t0 + 0.2);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.4);
        noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0 + 0.2); noise.stop(t0 + 0.42);
      }
    } catch(e) {}
  },

  // ADDITIVE EVENT SFX — Paket satın alma: tatmin edici "ka-çing" kasa tınısı
  playBundleBuy() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // iki parlak zil vuruşu (ka-çing)
    [[988, 0.0], [1318.5, 0.09]].forEach(pair => {
      const f = pair[0], off = pair[1];
      try {
        const st = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(0.11, st + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0008, st + 0.35);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.37);
        // üst harmonik ışıltı
        const sh = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sh.type = 'sine';
        sh.frequency.setValueAtTime(f * 2, st);
        sg.gain.setValueAtTime(0, st);
        sg.gain.linearRampToValueAtTime(0.04, st + 0.005);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + 0.22);
        sh.connect(sg); sg.connect(this.sfxGain);
        sh.start(st); sh.stop(st + 0.24);
      } catch(e) {}
    });
    // kısa kasa "tık" dokusu
    try {
      const noise = this.createNoise(0.05);
      if (noise) {
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3000;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.06, t0);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.05);
        noise.connect(hp); hp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + 0.06);
      }
    } catch(e) {}
  },

  // ADDITIVE EVENT SFX — Hayalet/replay geçişi: hafif tekinsiz süpürme "vuuş"
  playGhostPass() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.6;
    try {
      // filtreli gürültü süpürmesi (hava/geçiş)
      const noise = this.createNoise(dur);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(600, t0);
        bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur * 0.5);
        bp.frequency.exponentialRampToValueAtTime(500, t0 + dur);
        bp.Q.value = 2.5;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.07, t0 + dur * 0.4);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
        noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + dur);
      }
      // tekinsiz kayan ton (hafif vibrato)
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, t0);
      osc.frequency.exponentialRampToValueAtTime(660, t0 + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(340, t0 + dur);
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 6;
      lg.gain.value = 25;
      lfo.connect(lg); lg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + dur * 0.35);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + dur);
      osc.connect(g); g.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur);
      lfo.start(t0); lfo.stop(t0 + dur);
    } catch(e) {}
  },

  // ADDITIVE EVENT SFX — Sayaç bitişi: kesin çift "tunk" + parlak kapanış onayı
  playCountEnd() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // iki kesin alçak vuruş
    [[196.00, 0.0], [146.83, 0.12]].forEach(pair => {
      const f = pair[0], off = pair[1];
      try {
        const st = t0 + off;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, st);
        osc.frequency.exponentialRampToValueAtTime(f * 0.7, st + 0.15);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.14, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.2);
        osc.connect(g); g.connect(this.sfxGain);
        osc.start(st); osc.stop(st + 0.22);
      } catch(e) {}
    });
    // parlak kapanış onayı
    this.playTone(880, 'triangle', 0.2, 0.08, t0 + 0.26);
  },

  // Rüzgar ortam sesi — döngüsel filtreli gürültü (updateWind ile şiddet ayarlanır)
  startWind() {
    if (!this.ctx) return;
    this.stopWind();
    try {
      const bufLen = Math.floor(this.ctx.sampleRate * 2);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.7;
      const g = this.ctx.createGain();
      g.gain.value = 0.0;
      src.connect(bp); bp.connect(g); g.connect(this.sfxGain);
      src.start();
      this.windNodes = { src, filter: bp, gain: g };
    } catch(e) {}
  },

  // Rüzgar şiddetini güncelle — intensity: 0..1 (hız/yükseklik ile bağlanabilir)
  updateWind(intensity) {
    if (!this.ctx || !this.windNodes || !this.windNodes.gain) return;
    const amt = Math.max(0, Math.min(1, intensity || 0));
    const now = this.ctx.currentTime;
    this.windNodes.gain.gain.setTargetAtTime(amt * 0.12, now, 0.2);
    this.windNodes.filter.frequency.setTargetAtTime(400 + amt * 1400, now, 0.2);
  },

  stopWind() {
    if (this.windNodes && this.windNodes.src) {
      try { this.windNodes.src.stop(); } catch(e) {}
    }
    this.windNodes = null;
  },

  // Background music synthesizer per map
  playBGM(mapId) {
    this.stopBGM();
    if (!this.ctx) return;
    const sequences = {
      countryside: { notes: [261,329,392,329,261,196,261,329], tempo: 400, type: 'triangle' },
      desert:      { notes: [220,246,220,196,220,246,262,246], tempo: 500, type: 'sawtooth' },
      winter:      { notes: [293,329,369,329,293,261,293,329], tempo: 600, type: 'sine'     },
      beach:       { notes: [329,369,415,369,329,293,329,369], tempo: 350, type: 'triangle' },
      menu:        { notes: [261,329,392,523,392,329,261,196], tempo: 450, type: 'sine'     },
      // Her haritaya özgün müzik karakteri (orijinal jenerik desenler)
      mountains:   { notes: [196,261,329,392,329,261,220,196], tempo: 520, type: 'sine'     },
      city:        { notes: [329,392,440,392,349,440,523,440], tempo: 320, type: 'square'   },
      arctic:      { notes: [392,466,523,466,392,349,392,466], tempo: 580, type: 'sine'     },
      jungle:      { notes: [220,262,294,349,294,262,220,196], tempo: 300, type: 'triangle' },
      mars:        { notes: [174,207,233,207,174,155,174,207], tempo: 540, type: 'sawtooth' },
      cave:        { notes: [147,175,196,175,147,131,147,175], tempo: 640, type: 'sine'     },
      highland:    { notes: [261,293,349,392,349,293,261,220], tempo: 420, type: 'triangle' },
      swamp:       { notes: [196,220,247,220,185,220,247,196], tempo: 560, type: 'sawtooth' },
      volcano:     { notes: [220,277,330,277,220,185,220,277], tempo: 300, type: 'sawtooth' },
      underwater:  { notes: [294,349,392,349,294,247,294,349], tempo: 600, type: 'sine'     },
      moon:        { notes: [330,392,494,392,330,294,330,392], tempo: 680, type: 'sine'     },
      neon_city:   { notes: [349,440,523,440,349,330,392,523], tempo: 280, type: 'square'   },
      wasteland:   { notes: [175,208,233,208,175,155,175,208], tempo: 560, type: 'sawtooth' },
      canyon:      { notes: [247,294,330,392,330,294,247,220], tempo: 400, type: 'triangle' },
      otoyol:      { notes: [330,392,440,494,440,392,330,294], tempo: 260, type: 'square'   },
      dag:         { notes: [196,247,294,370,294,247,220,196], tempo: 500, type: 'sine'     },
      hotwheels:   { notes: [392,494,587,494,392,440,523,587], tempo: 240, type: 'square'   },
      construction:{ notes: [175,220,262,220,175,196,262,220], tempo: 340, type: 'square'   },
      blizzard:    { notes: [415,494,554,494,415,370,415,494], tempo: 600, type: 'sine'     },
      candy:       { notes: [392,494,587,659,587,494,440,392], tempo: 300, type: 'triangle' },
      toxic:       { notes: [185,220,262,220,185,165,185,247], tempo: 520, type: 'sawtooth' },
      rollercoaster:{notes: [330,415,523,415,330,392,494,392], tempo: 280, type: 'triangle' }
    };
    const seq = sequences[mapId] || sequences.menu;
    // Resolve a mood variant (menu / race / tense / boss). Specific maps fall
    // back to the upbeat "race" backing while still playing their own melody.
    const mood = this._bgmMoods[this._resolveBGMMood(mapId)] || this._bgmMoods.menu;
    this._bgmState = {
      mood: mood,
      notes: seq.notes,
      type: seq.type,
      tempo: seq.tempo,
      step: 0,
      nextTime: this.ctx.currentTime + 0.06,
      active: []
    };
    // Web Audio lookahead scheduler (non-blocking): a lightweight 25ms timer only
    // decides *what* to schedule; the audio thread renders it with sample accuracy.
    // This loops forever (step wraps over the pattern) until stopBGM() is called.
    this.bgmInterval = setInterval(() => this._bgmScheduler(), 25);
    // ADDITIVE: bring up a subtle per-map ambient bed alongside the music.
    // Fully guarded; never affects the BGM scheduler above if it throws.
    try { this._startAmbientBed(mapId); } catch(e) {}
  },

  // Mood variant table for procedural BGM (original patterns — subtle + loopable).
  _bgmMoods: {
    menu:    { leadWave:'sine',     bassWave:'sine',     padWave:'sine',     lead:0.055, bass:0.045, pad:0.022, bassEvery:2, padOn:true,  minor:false, detune:0   },
    race:    { leadWave:'square',   bassWave:'triangle', padWave:'sawtooth', lead:0.060, bass:0.050, pad:0.016, bassEvery:1, padOn:false, minor:false, detune:0   },
    gameplay:{ leadWave:'square',   bassWave:'triangle', padWave:'sawtooth', lead:0.060, bass:0.050, pad:0.016, bassEvery:1, padOn:false, minor:false, detune:0   },
    tense:   { leadWave:'sawtooth', bassWave:'sine',     padWave:'sine',     lead:0.050, bass:0.060, pad:0.030, bassEvery:2, padOn:true,  minor:true,  detune:-8  },
    boss:    { leadWave:'sawtooth', bassWave:'sine',     padWave:'sine',     lead:0.055, bass:0.065, pad:0.032, bassEvery:1, padOn:true,  minor:true,  detune:-10 },
    // ADDITIVE moods — richer palette, all loopable + subtle. Optional `chord`
    // array (root-ratio multipliers) overrides the default major/minor pad triad
    // for a distinct tonal colour; moods without it keep the original behaviour.
    // survival: coldly tense minor mode for boss/survival runs (relentless bass).
    survival:{ leadWave:'sawtooth', bassWave:'sawtooth', padWave:'sine',     lead:0.052, bass:0.062, pad:0.030, bassEvery:1, padOn:true,  minor:true,  detune:-6,  chord:[1,1.2,1.5,1.8]    },
    // upbeat: bright, driving major for coin-rush / bonus stages (add9 sparkle).
    upbeat:  { leadWave:'square',   bassWave:'triangle', padWave:'triangle', lead:0.062, bass:0.048, pad:0.018, bassEvery:1, padOn:true,  minor:false, detune:4,   chord:[1,1.25,1.5,1.875] },
    // serene: soft, spacious major for sakura / calm / relaxed maps (octave pad).
    serene:  { leadWave:'sine',     bassWave:'sine',     padWave:'sine',     lead:0.045, bass:0.038, pad:0.026, bassEvery:2, padOn:true,  minor:false, detune:0,   chord:[1,1.25,1.5,2]     },
    // heroic: bold, triumphant major for victory / hype moments (wide fifth).
    heroic:  { leadWave:'square',   bassWave:'sawtooth', padWave:'triangle', lead:0.060, bass:0.055, pad:0.020, bassEvery:1, padOn:true,  minor:false, detune:2,   chord:[1,1.25,1.5,2]     }
  },

  _resolveBGMMood(name) {
    // ADDITIVE: an explicit override (set via setBgmMood) wins for every map so
    // game code can force a mood. Null by default => original behaviour intact.
    if (this._bgmMoodOverride && this._bgmMoods[this._bgmMoodOverride]) {
      return this._bgmMoodOverride;
    }
    // Also allow a caller to pass any registered mood name straight through.
    if (name && this._bgmMoods[name]) return name;
    if (name === 'menu')     return 'menu';
    if (name === 'tense')    return 'tense';
    if (name === 'boss')     return 'boss';
    if (name === 'gameplay') return 'gameplay';
    if (name === 'race')     return 'race';
    return 'race';
  },

  // ADDITIVE: optional mood override. null = untouched default (never called).
  _bgmMoodOverride: null,

  // Public, guarded, smooth mood selector. Other code may call this at any time
  // (e.g. setBgmMood('survival') for boss runs, 'upbeat' for coin-rush,
  // 'serene' for sakura/calm maps). If the name is unknown or audio is
  // unavailable it is a silent no-op, so default behaviour is unchanged if it is
  // never called. When BGM is already playing the live mood is swapped in place;
  // because every voice self-envelopes and old scheduled notes finish naturally,
  // the transition is click-free (crossfade-like) rather than an abrupt cut.
  setBgmMood(name) {
    if (typeof name !== 'string' || !this._bgmMoods[name]) return;
    this._bgmMoodOverride = name;
    if (this._bgmState) {
      // New voices adopt the mood on the very next scheduled step.
      this._bgmState.mood = this._bgmMoods[name];
    }
  },

  // ADDITIVE: drop the override and fall back to per-map mood resolution.
  clearBgmMood() {
    this._bgmMoodOverride = null;
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIVE: Adaptive music intensity (procedural BGM modulation)
  // ═══════════════════════════════════════════════════════════════
  // setMusicIntensity(x): x in 0..1. Subtly makes the *currently playing*
  // BGM more energetic at high x (a touch faster, a soft octave sparkle
  // layer, a brighter bus filter) and calmer/mellower at low x. Purely a
  // modulation layered on top of the existing lookahead scheduler + moods —
  // if this method is never called it stays at the neutral value 0 and the
  // scheduler behaves exactly as before (no bus filter is even created, so
  // routing is byte-for-byte unchanged). Safe to call every frame: the
  // internal value is exponentially lerped toward the target so changes are
  // smooth. Music volume/mute are always respected because every voice —
  // including the additive ones — still terminates at this.musicGain.
  _musicIntensity: 0,        // smoothed value the scheduler actually reads
  _musicIntensityTarget: 0,  // last requested target (0..1), neutral = 0
  _bgmFilter: null,          // lazily-created BGM bus low-pass; null => bypass
  setMusicIntensity(x) {
    if (typeof x !== 'number' || !isFinite(x)) return;
    this._musicIntensityTarget = Math.max(0, Math.min(1, x));
    // Lazily insert a BGM bus low-pass the first time intensity is requested,
    // so default playback (method never called) uses the original direct
    // voice -> musicGain routing and is completely unchanged.
    if (!this._bgmFilter && this.ctx && this.musicGain) {
      try {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 18000;   // effectively open until modulated
        f.Q.value = 0.0001;
        f.connect(this.musicGain);
        this._bgmFilter = f;
      } catch (e) { this._bgmFilter = null; }
    }
  },

  // Destination for every BGM voice: the intensity bus filter when it exists,
  // otherwise the raw music gain (default, unchanged) path.
  _bgmDestination() {
    return this._bgmFilter || this.musicGain;
  },

  // Tempo-modulated step duration read by both the scheduler and per-step
  // voice envelopes so they always stay in sync. At neutral 0 this returns
  // the untouched base tempo; at full intensity steps are ~15% shorter.
  _bgmStepDur(st) {
    const base = st.tempo / 1000;
    const inten = this._musicIntensity || 0;
    return base / (1 + inten * 0.15);
  },

  // Advance the smoothed intensity toward its target (called each scheduler
  // tick, ~25ms) and sweep the bus-filter brightness. Fully guarded.
  _updateMusicIntensity() {
    const target = this._musicIntensityTarget || 0;
    // Exponential lerp — smooth and stable at the 25ms scheduler cadence.
    this._musicIntensity += (target - this._musicIntensity) * 0.12;
    if (Math.abs(target - this._musicIntensity) < 0.0005) this._musicIntensity = target;
    if (this._bgmFilter && this.ctx) {
      // Warm/mellow when calm, open/bright when intense — kept subtle.
      const fc = 3500 + this._musicIntensity * 12000;
      try { this._bgmFilter.frequency.setTargetAtTime(fc, this.ctx.currentTime, 0.15); } catch (e) {}
    }
  },

  // Lookahead loop: schedule any steps that fall inside the next ~0.15s window.
  _bgmScheduler() {
    const st = this._bgmState;
    if (!st || !this.ctx) return;
    // ADDITIVE: advance the smoothed adaptive-intensity value (no-op at neutral).
    try { this._updateMusicIntensity(); } catch (e) {}
    const stepDur = this._bgmStepDur(st);
    const horizon = this.ctx.currentTime + 0.15;
    while (st.nextTime < horizon) {
      this._scheduleBGMStep(st, st.nextTime);
      st.nextTime += stepDur;
      st.step++;
    }
    // Prune stale oscillator refs so a long race never grows the array unbounded.
    if (st.active.length > 48) st.active.splice(0, st.active.length - 48);
  },

  // Schedule one step (lead + optional bass + once-per-loop pad) at time `when`.
  _scheduleBGMStep(st, when) {
    if (!this.ctx) return;
    const m = st.mood;
    const notes = st.notes;
    const stepDur = this._bgmStepDur(st);
    const inten = this._musicIntensity || 0;
    const i = st.step;
    const len = notes.length;
    const note = notes[i % len];
    // LEAD voice — carries the per-map melody line.
    if (note) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = m.leadWave || st.type;
      osc.frequency.value = note;
      if (m.detune) osc.detune.value = m.detune;
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(m.lead, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 0.9);
      osc.connect(g); g.connect(this._bgmDestination());
      osc.start(when); osc.stop(when + stepDur);
      st.active.push(osc);
    }
    // ADDITIVE: intensity harmony layer — a soft octave-up sparkle that fades
    // in only above a threshold, adding density/energy when play is intense.
    // Completely silent at neutral 0, so default behaviour is unchanged.
    if (note && inten > 0.35) {
      const amt = (inten - 0.35) / 0.65; // 0..1 ramp above the threshold
      const h  = this.ctx.createOscillator();
      const hg = this.ctx.createGain();
      h.type = m.leadWave || st.type;
      h.frequency.value = note * 2;
      if (m.detune) h.detune.value = m.detune;
      const peak = Math.max(0.0002, m.lead * 0.4 * amt);
      hg.gain.setValueAtTime(0.0001, when);
      hg.gain.exponentialRampToValueAtTime(peak, when + 0.02);
      hg.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 0.8);
      h.connect(hg); hg.connect(this._bgmDestination());
      h.start(when); h.stop(when + stepDur);
      st.active.push(h);
    }
    // BASS voice — melody note dropped an octave, always harmonically consonant.
    if (note && (i % m.bassEvery === 0)) {
      const b  = this.ctx.createOscillator();
      const bg = this.ctx.createGain();
      b.type = m.bassWave;
      b.frequency.value = note * 0.5;
      bg.gain.setValueAtTime(0.0001, when);
      bg.gain.exponentialRampToValueAtTime(m.bass, when + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.001, when + stepDur * m.bassEvery * 0.95);
      b.connect(bg); bg.connect(this._bgmDestination());
      b.start(when); b.stop(when + stepDur * m.bassEvery);
      st.active.push(b);
    }
    // PAD chord — soft sustained bed refreshed once per pattern loop (a "bar").
    if (m.padOn && (i % len === 0)) {
      const root = notes[0] * 0.5;
      const barDur = stepDur * len;
      // ADDITIVE: a mood may define custom root-ratio multipliers for a distinct
      // chord colour; moods without `chord` keep the original major/minor triad.
      const chord = (m.chord && m.chord.length)
        ? m.chord.map(function (r) { return root * r; })
        : (m.minor ? [root, root * 1.2, root * 1.5] : [root, root * 1.25, root * 1.5]);
      for (let c = 0; c < chord.length; c++) {
        const p  = this.ctx.createOscillator();
        const pg = this.ctx.createGain();
        p.type = m.padWave;
        p.frequency.value = chord[c];
        pg.gain.setValueAtTime(0.0001, when);
        pg.gain.linearRampToValueAtTime(m.pad, when + barDur * 0.25);
        pg.gain.linearRampToValueAtTime(0.0001, when + barDur * 0.98);
        p.connect(pg); pg.connect(this._bgmDestination());
        p.start(when); p.stop(when + barDur);
        st.active.push(p);
      }
    }
  },

  stopBGM() {
    if (this.bgmInterval) { clearInterval(this.bgmInterval); this.bgmInterval = null; }
    // Silence any notes already scheduled on the audio thread for a clean stop.
    if (this._bgmState && this._bgmState.active) {
      const now = this.ctx ? this.ctx.currentTime : 0;
      for (let n = 0; n < this._bgmState.active.length; n++) {
        try { this._bgmState.active[n].stop(now); } catch(e) {}
      }
    }
    this._bgmState = null;
    // ADDITIVE: tear down the per-map ambient bed with the music.
    try { this._stopAmbientBed(); } catch(e) {}
  },

  // Independent volume controls (0..1). Music is scaled to stay subtle vs SFX.
  setMusicVolume(v) {
    v = Math.max(0, Math.min(1, v));
    if (!this.musicGain) return;
    if (this.ctx) this.musicGain.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.05);
    else this.musicGain.gain.value = v * 0.5;
  },
  setSfxVolume(v) {
    v = Math.max(0, Math.min(1, v));
    if (!this.sfxGain) return;
    if (this.ctx) this.sfxGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
    else this.sfxGain.gain.value = v;
  },

  vibrate(pattern) {
    if (navigator.vibrate && SaveData.data && SaveData.data.settings && SaveData.data.settings.vibration) {
      navigator.vibrate(pattern);
    }
  }
,
  // ═══════════════════════════════════════════════════════════════
  // EXTENDED AUDIO SYSTEM
  // ═══════════════════════════════════════════════════════════════

  // Sound categories and their volume multipliers
  _categories: {
    sfx:   1.0,
    music: 0.5,
    ui:    0.8,
    voice: 0.9,
    ambient: 0.4,
  },

  _masterVolume: 1.0,

  setMasterVolume(v) { this._masterVolume = Math.max(0, Math.min(1, v)); },
  setCategoryVolume(cat, v) { if (this._categories[cat] !== undefined) this._categories[cat] = Math.max(0, Math.min(1, v)); },
  getEffectiveVolume(cat) { const m = this._categories[cat]; const mult = (typeof m === 'number' && isFinite(m)) ? m : 1; return this._masterVolume * mult; },

  // Synthetic sound generators
  _playTone(freq, duration, type, volume, attack, release) {
    try {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(volume || 0.3, this.ctx.currentTime + (attack || 0.01));
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(); osc.stop(this.ctx.currentTime + duration + (release || 0.05));
    } catch(e) {}
  },

  _playNoise(duration, volume, filterFreq) {
    try {
      if (!this.ctx) return;
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume || 0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      if (filterFreq) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = filterFreq;
        src.connect(filter); filter.connect(gain);
      } else {
        src.connect(gain);
      }
      gain.connect(this.ctx.destination);
      src.start();
    } catch(e) {}
  },

  // Extended sound effects
  playFlip() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.28;
    try {
      // Hızlı yukarı süpürme "whoosh" — frekans rampası + filtreli gürültü kuyruğu
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, t0);
      osc.frequency.exponentialRampToValueAtTime(1000, t0 + dur); // yukarı takla süpürmesi
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.13, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + dur);

      // ikinci ses katmanı — hafif üflemeli gürültü, hareket hissi
      const noise = this.createNoise(dur);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(800, t0);
        bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
        bp.Q.value = 0.9;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.045, t0 + 0.03);
        ng.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
        noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + dur);
      }
    } catch(e) {}
  },

  playLand(velocity) {
    if (!this.ctx) return;
    const intensity = Math.min(1, (velocity || 0) / 20);
    const t0 = this.ctx.currentTime;
    try {
      // Yumuşak "tok" gövde — alçalan düşük frekanslı sinüs, sertliğe göre
      const thumpF = 90 + intensity * 60;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(thumpF, t0);
      osc.frequency.exponentialRampToValueAtTime(thumpF * 0.55, t0 + 0.16);
      const vol = 0.08 + intensity * 0.12;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.24);

      // kısa filtreli darbe gürültüsü — lastik/toprak teması, sertlikle güçlenir
      const noise = this.createNoise(0.12 + intensity * 0.1);
      if (noise) {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 350 + intensity * 500;
        const ng = this.ctx.createGain();
        const nd = 0.12 + intensity * 0.1;
        ng.gain.setValueAtTime(0.05 + intensity * 0.1, t0);
        ng.gain.exponentialRampToValueAtTime(0.0005, t0 + nd);
        noise.connect(lp); lp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + nd);
      }
    } catch(e) {}
  },

  playNitro() {
    this._playTone(120, 0.4, 'sawtooth', 0.2);
    this._playTone(180, 0.3, 'square', 0.1, 0.05);
  },

  playWing() {
    this._playTone(220, 0.3, 'sine', 0.12);
    this._playTone(330, 0.3, 'sine', 0.08, 0.05);
  },

  playSpring() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const dur = 0.3;
    try {
      // "Boing" — hızlı yukarı kayan perde + hafif vibrato salınımı
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(900, t0 + 0.09);
      osc.frequency.exponentialRampToValueAtTime(520, t0 + dur); // geri sekme
      // yay salınımı için hafif LFO
      const lfo = this.ctx.createOscillator();
      const lfoG = this.ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(28, t0);
      lfoG.gain.setValueAtTime(60, t0);
      lfoG.gain.exponentialRampToValueAtTime(2, t0 + dur);
      lfo.connect(lfoG); lfoG.connect(osc.frequency);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.14, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain); gain.connect(this.sfxGain);
      lfo.start(t0); lfo.stop(t0 + dur);
      osc.start(t0); osc.stop(t0 + dur);
    } catch(e) {}
  },

  playCrash(severity) {
    if (!this.ctx) return;
    severity = severity || 0.8;
    const t0 = this.ctx.currentTime;
    try {
      // 1) Düşük gürültü patlaması — çarpmanın gövdesi
      const noise = this.createNoise(0.4 + severity * 0.3);
      if (noise) {
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(900, t0);
        lp.frequency.exponentialRampToValueAtTime(200, t0 + 0.3); // kararan darbe
        const ng = this.ctx.createGain();
        const nd = 0.4 + severity * 0.3;
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.18 * severity, t0 + 0.008);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + nd);
        noise.connect(lp); lp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + nd);
      }
      // 2) Kısa düşen ton — çarpmanın "boom" darbesi
      const osc = this.ctx.createOscillator();
      const og = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t0);
      osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.35);
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.16 * severity, t0 + 0.006);
      og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
      osc.connect(og); og.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.42);
      // 3) Metalik tıngırtı — yüksek bandpass gürültü, "sac" hissi
      const metal = this.createNoise(0.25);
      if (metal) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2600;
        bp.Q.value = 6;
        const mg = this.ctx.createGain();
        mg.gain.setValueAtTime(0.0001, t0 + 0.02);
        mg.gain.linearRampToValueAtTime(0.07 * severity, t0 + 0.04);
        mg.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.25);
        metal.connect(bp); bp.connect(mg); mg.connect(this.sfxGain);
        metal.start(t0 + 0.02); metal.stop(t0 + 0.27);
      }
    } catch(e) {}
  },

  playPickup() {
    this._playTone(880, 0.06, 'sine', 0.2);
    this._playTone(1100, 0.08, 'sine', 0.2, 0.03);
  },

  playDiamondPickup() {
    this._playTone(660, 0.05, 'sine', 0.15);
    this._playTone(880, 0.05, 'sine', 0.15, 0.02);
    this._playTone(1320, 0.08, 'sine', 0.18, 0.04);
  },

  playRankUp() {
    const fanfare = [523, 659, 784, 1047, 1319, 1047, 784, 1047];
    fanfare.forEach((f, i) => setTimeout(() => this._playTone(f, 0.12, 'sine', 0.25), i * 60));
  },

  playMenuClick() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      // Berrak "tık" — kısa yüksek gövde + hafif klik transient'i
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t0);
      osc.frequency.exponentialRampToValueAtTime(480, t0 + 0.05);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.07);
      // kısa filtreli klik transient'i — dokunma hissi
      const noise = this.createNoise(0.03);
      if (noise) {
        const hp = this.ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 3000;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.06, t0);
        ng.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.03);
        noise.connect(hp); hp.connect(ng); ng.connect(this.sfxGain);
        noise.start(t0); noise.stop(t0 + 0.03);
      }
    } catch(e) {}
  },

  // --- Yeni orijinal UI / progression sesleri ---

  playUiHover() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    try {
      // Çok hafif, kısa "üfleme" tık — üzerine gelme hissi
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.035);
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.06, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.045);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.05);
    } catch(e) {}
  },

  playAchievement() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Kısa neşeli fanfare — C6/E6/G6/C7 parlak arpej
    const arp = [
      { f: 1046.50, when: 0.00, dur: 0.14, vol: 0.11 },
      { f: 1318.51, when: 0.07, dur: 0.14, vol: 0.11 },
      { f: 1567.98, when: 0.14, dur: 0.16, vol: 0.12 },
      { f: 2093.00, when: 0.22, dur: 0.26, vol: 0.13 }
    ];
    arp.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0008, st + n.dur);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
        // ince üst harmonik parıltı
        const sh = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sh.type = 'sine';
        sh.frequency.setValueAtTime(n.f * 2, st);
        sg.gain.setValueAtTime(0.0001, st);
        sg.gain.linearRampToValueAtTime(n.vol * 0.3, st + 0.006);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + n.dur * 0.6);
        sh.connect(sg); sg.connect(this.sfxGain);
        sh.start(st); sh.stop(st + n.dur);
      } catch(e) {}
    });
  },

  playLevelUp() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Yükselen "seviye atladın" chime — sürekli tırmanan portamento + son parlak vuruş
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, t0);              // G4
      osc.frequency.exponentialRampToValueAtTime(784, t0 + 0.14);  // G5
      osc.frequency.exponentialRampToValueAtTime(1175, t0 + 0.30); // D6
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
      gain.gain.setValueAtTime(0.12, t0 + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.40);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.42);
      // tepede kısa parlak "ding"
      const ding = this.ctx.createOscillator();
      const dg = this.ctx.createGain();
      ding.type = 'sine';
      ding.frequency.setValueAtTime(1568, t0 + 0.30);     // G6
      dg.gain.setValueAtTime(0.0001, t0 + 0.30);
      dg.gain.linearRampToValueAtTime(0.10, t0 + 0.315);
      dg.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.55);
      ding.connect(dg); dg.connect(this.sfxGain);
      ding.start(t0 + 0.30); ding.stop(t0 + 0.56);
    } catch(e) {}
  },

  playCountdownBeep() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Geri sayım bip'i (3-2-1) — net, kısa, tek tonlu uyarı
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, t0);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.10, t0 + 0.01);
      gain.gain.setValueAtTime(0.10, t0 + 0.10);
      gain.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.18);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.20);
    } catch(e) {}
  },

  playCountdownGo() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Geri sayım "GO!" — geri sayım bip'inden bir oktav tiz, kısa coşkulu tek vuruş + parıltı
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(660, t0);
      osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.06);
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2200, t0);
      lp.frequency.exponentialRampToValueAtTime(4600, t0 + 0.10);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.13, t0 + 0.01);
      gain.gain.setValueAtTime(0.13, t0 + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.30);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.32);
      const spark = this.ctx.createOscillator();
      const spg = this.ctx.createGain();
      spark.type = 'sine';
      spark.frequency.setValueAtTime(2640, t0 + 0.02);
      spg.gain.setValueAtTime(0.0001, t0 + 0.02);
      spg.gain.linearRampToValueAtTime(0.07, t0 + 0.035);
      spg.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.24);
      spark.connect(spg); spg.connect(this.sfxGain);
      spark.start(t0 + 0.02); spark.stop(t0 + 0.26);
    } catch(e) {}
  },

  playChestOpen() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Sandık açılışı — pırıltılı ödül sesi: tırmanan ışıltı notaları + parlak kuyruk
    const sparkles = [
      { f: 1046.50, when: 0.00, dur: 0.16, vol: 0.09 },  // C6
      { f: 1318.51, when: 0.06, dur: 0.16, vol: 0.09 },  // E6
      { f: 1567.98, when: 0.12, dur: 0.16, vol: 0.10 },  // G6
      { f: 2093.00, when: 0.18, dur: 0.30, vol: 0.10 },  // C7
      { f: 2637.02, when: 0.26, dur: 0.36, vol: 0.08 }   // E7
    ];
    sparkles.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0006, st + n.dur);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
      } catch(e) {}
    });
  },

  playMissionComplete() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Görev tamamlandı — yükselen başarı arpejı (C-E-G-C) parlak triangle notalarla
    const arp = [
      { f: 523.25, when: 0.00, dur: 0.14, vol: 0.11 },  // C5
      { f: 659.25, when: 0.10, dur: 0.14, vol: 0.11 },  // E5
      { f: 783.99, when: 0.20, dur: 0.14, vol: 0.12 },  // G5
      { f: 1046.50, when: 0.30, dur: 0.40, vol: 0.12 }  // C6
    ];
    arp.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 3200;
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, st + n.dur);
        osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
      } catch(e) {}
    });
  },

  playOvertake() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Öne geçme — hızlı geçiş "whoosh": bandpass süzülen gürültü, frekansı yukarı süpürür
    try {
      const noise = this.createNoise(0.45);
      if (!noise) return;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(500, t0);
      bp.frequency.exponentialRampToValueAtTime(2600, t0 + 0.22);
      bp.frequency.exponentialRampToValueAtTime(700, t0 + 0.42);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t0);
      ng.gain.linearRampToValueAtTime(0.16, t0 + 0.10);
      ng.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.42);
      noise.connect(bp); bp.connect(ng); ng.connect(this.sfxGain);
      noise.start(t0); noise.stop(t0 + 0.45);
    } catch(e) {}
  },

  playSplitAhead() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Ara zaman öndesin — pozitif ikili blip (yükselen), rakibin önündesin
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t0);            // A5
      osc.frequency.setValueAtTime(1318.51, t0 + 0.09); // E6
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.10, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.02, t0 + 0.085);
      gain.gain.linearRampToValueAtTime(0.10, t0 + 0.10);
      gain.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.22);
      osc.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.24);
    } catch(e) {}
  },

  playSplitBehind() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Ara zaman geridesin — negatif ikili blip (alçalan), rakibin gerisindesin
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t0);         // D5
      osc.frequency.setValueAtTime(392, t0 + 0.09);     // G4
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1600;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.02, t0 + 0.085);
      gain.gain.linearRampToValueAtTime(0.09, t0 + 0.10);
      gain.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.24);
      osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
      osc.start(t0); osc.stop(t0 + 0.26);
    } catch(e) {}
  },

  playUnlock() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Kilit açıldı / başarı — net "ding" ikilisi + üstte ince parıltı halkası
    const notes = [
      { f: 1046.50, when: 0.00, dur: 0.22, vol: 0.11 },  // C6
      { f: 1567.98, when: 0.11, dur: 0.42, vol: 0.11 }   // G6
    ];
    notes.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0007, st + n.dur);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
        const sh = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sh.type = 'sine';
        sh.frequency.setValueAtTime(n.f * 2, st);
        sg.gain.setValueAtTime(0.0001, st);
        sg.gain.linearRampToValueAtTime(n.vol * 0.28, st + 0.006);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + n.dur * 0.7);
        sh.connect(sg); sg.connect(this.sfxGain);
        sh.start(st); sh.stop(st + n.dur);
      } catch(e) {}
    });
  },

  playGo() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // "GO!" başlangıç — yükselen kısa parlak akor (C5+E5+G5) + coşkulu tırmanış
    const chord = [523.25, 659.25, 783.99];
    chord.forEach((f, i) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f * 0.75, t0);
        osc.frequency.exponentialRampToValueAtTime(f, t0 + 0.09);
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1200, t0);
        lp.frequency.exponentialRampToValueAtTime(4000, t0 + 0.12);
        const vol = 0.09 - i * 0.015;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.linearRampToValueAtTime(vol, t0 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.34);
        osc.connect(lp); lp.connect(gain); gain.connect(this.sfxGain);
        osc.start(t0); osc.stop(t0 + 0.36);
      } catch(e) {}
    });
  },

  playTrophy() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    // Kupa / kazanma sesi — yükselen zafer melodisi + parıldayan kuyruk
    const melody = [
      { f: 523.25, when: 0.00, dur: 0.16, vol: 0.11 },  // C5
      { f: 659.25, when: 0.11, dur: 0.16, vol: 0.11 },  // E5
      { f: 783.99, when: 0.22, dur: 0.16, vol: 0.12 },  // G5
      { f: 1046.50, when: 0.33, dur: 0.42, vol: 0.13 }  // C6 (uzun tutuş)
    ];
    melody.forEach(n => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const st = t0 + n.when;
        osc.frequency.setValueAtTime(n.f, st);
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.linearRampToValueAtTime(n.vol, st + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, st + n.dur);
        osc.connect(gain); gain.connect(this.sfxGain);
        osc.start(st); osc.stop(st + n.dur + 0.02);
      } catch(e) {}
    });
    // son notada ince parıltı kuyruğu
    try {
      const st = t0 + 0.33;
      const sh = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sh.type = 'sine';
      sh.frequency.setValueAtTime(2093, st);
      sh.frequency.linearRampToValueAtTime(2110, st + 0.4);
      sg.gain.setValueAtTime(0.0001, st);
      sg.gain.linearRampToValueAtTime(0.05, st + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0006, st + 0.5);
      sh.connect(sg); sg.connect(this.sfxGain);
      sh.start(st); sh.stop(st + 0.52);
    } catch(e) {}
  },

  playMenuHover() {
    this._playTone(300, 0.03, 'sine', 0.07);
  },

  playCountdown(n) {
    if (n > 0) this._playTone(440, 0.15, 'sine', 0.3);
    else this._playTone(880, 0.3, 'sine', 0.4);
  },

  playBotWin() {
    const notes = [523, 440, 392, 330];
    notes.forEach((f, i) => setTimeout(() => this._playTone(f, 0.2, 'square', 0.15), i * 100));
  },

  playBotLose() {
    const notes = [660, 784, 880, 1047];
    notes.forEach((f, i) => setTimeout(() => this._playTone(f, 0.2, 'sine', 0.25), i * 90));
  },

  playNewRecord() {
    const melody = [523, 659, 784, 880, 1047, 1319];
    melody.forEach((f, i) => setTimeout(() => this._playTone(f, 0.15, 'sine', 0.3), i * 70));
  },

  // Engine sound simulation
  _engineNode: null,
  _engineGain: null,

  startEngine() {
    try {
      if (!this.ctx || this._engineNode) return;
      this._engineNode = this.ctx.createOscillator();
      this._engineGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      this._engineNode.type = 'sawtooth';
      this._engineNode.frequency.value = 80;
      filter.type = 'lowpass'; filter.frequency.value = 400;
      this._engineGain.gain.value = 0;
      this._engineNode.connect(filter);
      filter.connect(this._engineGain);
      this._engineGain.connect(this.ctx.destination);
      this._engineNode.start();
    } catch(e) {}
  },

  updateEngine(throttle, speed) {
    try {
      if (!this._engineNode || !this._engineGain) return;
      const baseFreq = 80 + throttle * 120 + Math.abs(speed) * 0.3;
      this._engineNode.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.1);
      const vol = 0.04 + throttle * 0.08 + Math.abs(speed) * 0.0002;
      this._engineGain.gain.setTargetAtTime(Math.min(0.15, vol), this.ctx.currentTime, 0.05);
    } catch(e) {}
  },

  stopEngine() {
    try {
      if (this._engineNode) {
        this._engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
        setTimeout(() => {
          try { this._engineNode.stop(); } catch(e) {}
          this._engineNode = null;
          this._engineGain = null;
        }, 500);
      }
    } catch(e) {}
  },

  // Ambient soundscapes
  _ambientNodes: [],

  playAmbient(mapId) {
    this.stopAmbient();
    const ambientConfigs = {
      underwater: { freq: 60, type: 'sine',     filterFreq: 200, vol: 0.06 },
      volcano:    { freq: 40, type: 'sawtooth', filterFreq: 150, vol: 0.08 },
      winter:     { freq: 100, type: 'sine',    filterFreq: 600, vol: 0.04 },
      desert:     { freq: 80, type: 'sine',     filterFreq: 800, vol: 0.03 },
      neon:       { freq: 50, type: 'square',   filterFreq: 400, vol: 0.05 },
    };
    const cfg = ambientConfigs[mapId];
    if (!cfg || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = cfg.type; osc.frequency.value = cfg.freq;
      filter.type = 'lowpass'; filter.frequency.value = cfg.filterFreq;
      gain.gain.value = cfg.vol * this.getEffectiveVolume('ambient');
      osc.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
      osc.start();
      this._ambientNodes.push({ osc, gain });
    } catch(e) {}
  },

  stopAmbient() {
    for (const n of this._ambientNodes) {
      try { n.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3); setTimeout(() => { try { n.osc.stop(); } catch(e){} }, 500); } catch(e) {}
    }
    this._ambientNodes = [];
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIVE RICH SOUNDSCAPE — procedural ambient beds, engine nuance
  // and tire-surface roll. All oscillator/filter based, self-gating,
  // and routed through the existing masterGain/sfxGain so master, sfx
  // and any master-level mute automatically apply. No existing public
  // API is modified; every helper here is _-prefixed and lazy-init.
  // ═══════════════════════════════════════════════════════════════

  _ambientBed: null,   // { nodes:[], gain, flavour, stopping, dripTimer }
  _tireRoll:   null,   // { noise, filter, gain }

  // Pick a bed flavour from a map id via fuzzy substring matching.
  _resolveAmbientBed(mapId) {
    const id = String(mapId == null ? '' : mapId).toLowerCase();
    // Newest themed maps get their own distinct beds. These specific checks
    // run first so they win over the broader legacy patterns below.
    if (/(sakura|cherry|blossom|hanami|bonsai|zen|kyoto|japan)/.test(id))     return 'sakura';
    if (/(graveyard|grave|crypt|tomb|cemetery|haunt|ghost|spooky|spirit)/.test(id)) return 'graveyard';
    if (/(crystal|gem|prism|glacier|frozen|glass|diamond|quartz|shard)/.test(id))   return 'crystal';
    if (/(lava|magma|volcano|molten|inferno|ember|infernal|scorch)/.test(id))        return 'lava';
    // Carnival / funfair — cheerful calliope organ + distant crowd murmur.
    if (/(carnival|funfair|fairground|circus|festival|midway)/.test(id))             return 'carnival';
    // Candy land — bright, playful, sugary twinkle.
    if (/(candy|sweet|sugar|lollipop|lolli|gumdrop|cupcake|dessert|marshmallow)/.test(id)) return 'candy';
    // Rollercoaster / amusement ride — rushing air + chain-lift clatter.
    if (/(rollercoaster|roller_coaster|coaster|amusement|themepark|theme_park)/.test(id)) return 'coaster';
    // Cyber grid / digital arena — humming synth grid + data blips.
    if (/(cyber|cyber_grid|grid|matrix|digital|circuit|synthwave|tron|holo)/.test(id)) return 'cyber';
    // Storm peak — howling mountain gale + rolling distant thunder.
    if (/(storm|stormpeak|storm_peak|thunder|tempest|lightning|gale|typhoon)/.test(id)) return 'storm';
    if (/(underwater|ocean|sea|aqua|sub|reef)/.test(id))              return 'underwater';
    if (/(cave|mine|tunnel|volcano|lava|cavern|dark|toxic)/.test(id)) return 'cave';
    if (/(neon|city|urban|night|street|arcade|otoyol|construction)/.test(id)) return 'city';
    // 'wind' covers desert / winter / countryside / mountain / default outdoors.
    return 'wind';
  },

  // Start a subtle looping ambient bed for a map. Safe to call repeatedly;
  // fades any previous bed out first. Guards a suspended/absent context.
  _startAmbientBed(mapId) {
    if (!this.ctx) return;
    try { if (this.ctx.state === 'suspended') this.ctx.resume(); } catch(e) {}
    const flavour = this._resolveAmbientBed(mapId);
    // Same flavour already running? Leave it be (avoids re-triggering churn).
    if (this._ambientBed && !this._ambientBed.stopping && this._ambientBed.flavour === flavour) return;
    this._stopAmbientBed();
    try {
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const nodes = [];
      // Bed master gain — scaled by the ambient category and routed to
      // masterGain so it obeys master volume and any master-level mute.
      const bedGain = ctx.createGain();
      const target = 0.4 * (this.getEffectiveVolume ? this.getEffectiveVolume('ambient') : 0.4);   // arka plan gürültüsü azaltıldı (0.9→0.4)
      bedGain.gain.setValueAtTime(0.0001, t0);
      bedGain.gain.linearRampToValueAtTime(Math.max(0.0002, target), t0 + 1.2);
      bedGain.connect(this.masterGain || ctx.destination);

      // Shared slow LFO for gentle breathing movement.
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 0.08 + Math.random() * 0.06;

      if (flavour === 'wind') {
        // Filtered noise whooshing through a slowly sweeping band-pass.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.7;
          lfoGain.gain.value = 260; lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.5;
          noise.connect(bp); bp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, bp, g);
        }
      } else if (flavour === 'cave') {
        // Low hollow drone; sparse water-drip pings scheduled by a ticker below.
        const drone = ctx.createOscillator();
        drone.type = 'sine'; drone.frequency.value = 58;
        const df = ctx.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 180;
        const dg = ctx.createGain(); dg.gain.value = 0.6;
        lfoGain.gain.value = 6; lfo.connect(lfoGain); lfoGain.connect(drone.frequency);
        drone.connect(df); df.connect(dg); dg.connect(bedGain);
        drone.start(t0); nodes.push(drone, df, dg);
      } else if (flavour === 'city') {
        // Steady electrical mains hum (a 50/100/150Hz stack).
        [50, 100, 150].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? 'sawtooth' : 'sine'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = [0.5, 0.22, 0.1][i];
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
      } else if (flavour === 'sakura') {
        // Soft spring breeze: airy high-passed noise, gentler than 'wind',
        // plus a warm sine pad. Occasional koto pluck scheduled below.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = 780; bp.Q.value = 0.5;
          lfoGain.gain.value = 180; lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.32;
          noise.connect(bp); bp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, bp, g);
        }
        // Warm low pad (perfect fifth) for a calm garden undertone.
        [146.83, 220.0].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sine'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = i === 0 ? 0.14 : 0.09;
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
      } else if (flavour === 'lava') {
        // Molten heat: sub rumble + dark churning noise with a slow filter
        // sweep, plus sparse bubble pops scheduled by the ticker below.
        const rum = ctx.createOscillator();
        rum.type = 'sine'; rum.frequency.value = 41;
        const rg = ctx.createGain(); rg.gain.value = 0.5;
        rum.connect(rg); rg.connect(bedGain); rum.start(t0); nodes.push(rum, rg);
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 0.8;
          lfoGain.gain.value = 140; lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.45;
          noise.connect(lp); lp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, lp, g);
        }
      } else if (flavour === 'graveyard') {
        // Haunted stillness: a dissonant low drone (minor-second beating)
        // and a hollow wind; distant ghostly howls scheduled below.
        [55.0, 58.27].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = i === 0 ? 0.4 : 0.18;
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 360; bp.Q.value = 1.2;
          lfoGain.gain.value = 200; lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.3;
          noise.connect(bp); bp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, bp, g);
        }
      } else if (flavour === 'crystal') {
        // Icy shimmer: a stack of high sine partials with slow tremolo,
        // sprinkled with occasional bell chimes scheduled below.
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sine'; o.frequency.value = f;
          o.detune.value = (Math.random() - 0.5) * 6;
          const og = ctx.createGain(); og.gain.value = [0.05, 0.04, 0.03][i];
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
        // Slow tremolo on the whole shimmer for a glassy pulse.
        lfoGain.gain.value = 0.02; lfo.connect(lfoGain); lfoGain.connect(bedGain.gain);
      } else if (flavour === 'carnival') {
        // Cheerful fairground: a warm major-triad organ pad (C-E-G) with a
        // gentle tremolo, over a low murmuring crowd. Calliope flourishes
        // (bright arpeggios) are scheduled by the ticker below.
        [261.63, 329.63, 392.0].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? 'triangle' : 'square';
          o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = [0.06, 0.045, 0.04][i];
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
        // Distant crowd murmur — soft low-passed noise.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 620; lp.Q.value = 0.4;
          const g = ctx.createGain(); g.gain.value = 0.22;
          noise.connect(lp); lp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, lp, g);
        }
        // Slow organ tremolo (bright, jaunty) applied to the whole bed.
        lfo.frequency.value = 3.2 + Math.random() * 0.8;
        lfoGain.gain.value = 0.05; lfo.connect(lfoGain); lfoGain.connect(bedGain.gain);
      } else if (flavour === 'candy') {
        // Sugary sparkle: two soft high sines forming a sweet major sixth,
        // over a warm low pad. Glockenspiel-like plinks scheduled below.
        [880.0, 1174.66].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sine'; o.frequency.value = f;
          o.detune.value = (Math.random() - 0.5) * 5;
          const og = ctx.createGain(); og.gain.value = i === 0 ? 0.035 : 0.028;
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
        [130.81, 196.0].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'triangle'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = i === 0 ? 0.1 : 0.07;
          o.connect(og); og.connect(bedGain); o.start(t0); nodes.push(o, og);
        });
        // Gentle bubbly tremolo for a playful lilt.
        lfo.frequency.value = 1.6 + Math.random() * 0.5;
        lfoGain.gain.value = 0.03; lfo.connect(lfoGain); lfoGain.connect(bedGain.gain);
      } else if (flavour === 'coaster') {
        // Rollercoaster: rushing air (bright band-passed noise, wider and
        // faster than 'wind') over a low structural rumble. Chain-lift
        // clacks scheduled by the ticker below.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.5;
          lfoGain.gain.value = 420; lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.4;
          noise.connect(bp); bp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, bp, g);
        }
        const rum = ctx.createOscillator();
        rum.type = 'sine'; rum.frequency.value = 52;
        const rg = ctx.createGain(); rg.gain.value = 0.32;
        rum.connect(rg); rg.connect(bedGain); rum.start(t0); nodes.push(rum, rg);
      } else if (flavour === 'cyber') {
        // Cyber grid: a detuned saw drone through a resonant low-pass with a
        // slow filter sweep, plus a quiet high pulse layer. Data blips
        // scheduled by the ticker below.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 480; lp.Q.value = 6;
        lfoGain.gain.value = 260; lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
        [55.0, 55.3, 82.41].forEach((f, i) => {
          const o = ctx.createOscillator();
          o.type = 'sawtooth'; o.frequency.value = f;
          const og = ctx.createGain(); og.gain.value = [0.34, 0.3, 0.16][i];
          o.connect(og); og.connect(lp); o.start(t0); nodes.push(o, og);
        });
        const lg = ctx.createGain(); lg.gain.value = 0.6;
        lp.connect(lg); lg.connect(bedGain); nodes.push(lp, lg);
        // Faint high shimmer to imply a glowing grid.
        const hi = ctx.createOscillator();
        hi.type = 'square'; hi.frequency.value = 1760;
        const hg = ctx.createGain(); hg.gain.value = 0.008;
        hi.connect(hg); hg.connect(bedGain); hi.start(t0); nodes.push(hi, hg);
      } else if (flavour === 'storm') {
        // Storm peak: a strong, wide howling gale (band-passed noise swept
        // hard by the LFO) over a deep rumble. Distant thunder scheduled
        // by the ticker below.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const bp = ctx.createBiquadFilter();
          bp.type = 'bandpass'; bp.frequency.value = 480; bp.Q.value = 0.5;
          lfoGain.gain.value = 380; lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.6;
          noise.connect(bp); bp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, bp, g);
        }
        const rum = ctx.createOscillator();
        rum.type = 'sine'; rum.frequency.value = 46;
        const rg = ctx.createGain(); rg.gain.value = 0.34;
        rum.connect(rg); rg.connect(bedGain); rum.start(t0); nodes.push(rum, rg);
      } else { // underwater
        // Muffled low rumble + a slow, very dark filtered noise swell.
        const noise = this.createNoise(2.0);
        if (noise) {
          noise.loop = true;
          const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240; lp.Q.value = 0.4;
          lfoGain.gain.value = 90; lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
          const g = ctx.createGain(); g.gain.value = 0.55;
          noise.connect(lp); lp.connect(g); g.connect(bedGain);
          noise.start(t0); nodes.push(noise, lp, g);
        }
        const rum = ctx.createOscillator();
        rum.type = 'sine'; rum.frequency.value = 44;
        const rg = ctx.createGain(); rg.gain.value = 0.4;
        rum.connect(rg); rg.connect(bedGain); rum.start(t0); nodes.push(rum, rg);
      }

      try { lfo.start(t0); } catch(e) {}
      nodes.push(lfo, lfoGain);
      this._ambientBed = { nodes: nodes, gain: bedGain, flavour: flavour, stopping: false, dripTimer: null };

      // Sparse water drips for the cave bed (self-gating: stops with the bed).
      if (flavour === 'cave') {
        const bed = this._ambientBed;
        const scheduleDrip = () => {
          if (!this._ambientBed || this._ambientBed !== bed || bed.stopping || !this.ctx) return;
          this._ambientDrip(bedGain);
          bed.dripTimer = setTimeout(scheduleDrip, 1400 + Math.random() * 2600);
        };
        bed.dripTimer = setTimeout(scheduleDrip, 800 + Math.random() * 1500);
      }

      // Sparse periodic flourishes for the newest themed beds. Each bed has
      // at most one recurring one-shot, so the single dripTimer slot is
      // reused. The closure self-gates: it bails the moment this bed is
      // replaced or stopped, so it disposes cleanly with _stopAmbientBed.
      const fxMap = {
        sakura:    { fn: 'ambientKotoPluck',    min: 2600, rand: 4200 },
        lava:      { fn: 'ambientLavaBubble',   min: 900,  rand: 2200 },
        graveyard: { fn: 'ambientGhostHowl',    min: 4000, rand: 7000 },
        crystal:   { fn: 'ambientCrystalChime', min: 2200, rand: 4600 },
        carnival:  { fn: 'ambientCalliopeFlourish', min: 3200, rand: 5200 },
        candy:     { fn: 'ambientCandyPlink',    min: 2400, rand: 4200 },
        coaster:   { fn: 'ambientCoasterClack',  min: 2600, rand: 4200 },
        cyber:     { fn: 'ambientCyberBlip',     min: 1800, rand: 3200 },
        storm:     { fn: 'ambientThunder',       min: 5200, rand: 9000 }
      };
      const fx = fxMap[flavour];
      if (fx) {
        const bed = this._ambientBed;
        const method = '_' + fx.fn;
        const scheduleFx = () => {
          if (!this._ambientBed || this._ambientBed !== bed || bed.stopping || !this.ctx) return;
          try { if (typeof this[method] === 'function') this[method](bedGain); } catch(e) {}
          bed.dripTimer = setTimeout(scheduleFx, fx.min + Math.random() * fx.rand);
        };
        bed.dripTimer = setTimeout(scheduleFx, fx.min * 0.5 + Math.random() * fx.rand);
      }
    } catch(e) {}
  },

  // A short plucked pentatonic note (koto-like) for the sakura bed.
  _ambientKotoPluck(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      // A-major pentatonic across two octaves for a serene, Eastern colour.
      const scale = [220.0, 246.94, 293.66, 329.63, 440.0, 493.88, 587.33];
      const f = scale[(Math.random() * scale.length) | 0];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, t0);
      lp.type = 'lowpass'; lp.frequency.value = f * 4;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.09, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0003, t0 + 1.1);
      o.connect(lp); lp.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 1.2);
    } catch(e) {}
  },

  // A low descending gloop for the lava bed's molten bubbles.
  _ambientLavaBubble(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const f = 80 + Math.random() * 90;
      o.frequency.setValueAtTime(f * 1.6, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.6, t0 + 0.3);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.38);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 0.4);
    } catch(e) {}
  },

  // A distant wavering howl for the graveyard bed.
  _ambientGhostHowl(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const vib = ctx.createOscillator();
      const vibG = ctx.createGain();
      const base = 180 + Math.random() * 140;
      o.type = 'sine';
      o.frequency.setValueAtTime(base, t0);
      o.frequency.linearRampToValueAtTime(base * 1.25, t0 + 1.2);
      o.frequency.linearRampToValueAtTime(base * 0.85, t0 + 2.6);
      vib.type = 'sine'; vib.frequency.value = 5.5;
      vibG.gain.value = 8; vib.connect(vibG); vibG.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.05, t0 + 0.9);
      g.gain.linearRampToValueAtTime(0.0004, t0 + 2.8);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 2.9);
      vib.start(t0); vib.stop(t0 + 2.9);
    } catch(e) {}
  },

  // A high bell-like chime for the crystal bed.
  _ambientCrystalChime(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const scale = [1046.5, 1318.5, 1568.0, 2093.0];
      const f = scale[(Math.random() * scale.length) | 0];
      // Fundamental + inharmonic partial for a glassy bell timbre.
      [[f, 0.05], [f * 2.76, 0.02]].forEach(pair => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(pair[0], t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(pair[1], t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0002, t0 + 1.6);
        o.connect(g); g.connect(dest);
        o.start(t0); o.stop(t0 + 1.7);
      });
    } catch(e) {}
  },

  // A short cheerful calliope flourish (bright organ arpeggio) for the
  // carnival bed. A quick 3-4 note run on a major scale with a jaunty timbre.
  _ambientCalliopeFlourish(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      // C-major fragments — pick a random ascending run for variety.
      const runs = [
        [523.25, 659.25, 783.99, 1046.5],
        [659.25, 783.99, 1046.5, 1318.5],
        [392.0, 523.25, 659.25, 783.99]
      ];
      const run = runs[(Math.random() * runs.length) | 0];
      run.forEach((f, i) => {
        const st = t0 + i * 0.11;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        // Square + light low-pass ≈ a bright reedy calliope/organ pipe.
        o.type = 'square'; o.frequency.setValueAtTime(f, st);
        lp.type = 'lowpass'; lp.frequency.value = f * 3.5;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.05, st + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0003, st + 0.26);
        o.connect(lp); lp.connect(g); g.connect(dest);
        o.start(st); o.stop(st + 0.3);
      });
    } catch(e) {}
  },

  // A sweet glockenspiel-like plink for the candy bed — a single bright
  // bell note from a high major-pentatonic scale.
  _ambientCandyPlink(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const scale = [1046.5, 1174.66, 1318.5, 1567.98, 1760.0, 2093.0];
      const f = scale[(Math.random() * scale.length) | 0];
      // Fundamental + soft octave for a cute music-box sparkle.
      [[f, 0.05], [f * 2, 0.018]].forEach(pair => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(pair[0], t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(pair[1], t0 + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0002, t0 + 0.9);
        o.connect(g); g.connect(dest);
        o.start(t0); o.stop(t0 + 1.0);
      });
    } catch(e) {}
  },

  // A mechanical chain-lift clack for the rollercoaster bed — a very short
  // filtered noise tick with a tiny woody thump.
  _ambientCoasterClack(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const noise = this.createNoise(0.08);
      if (noise) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 600; bp.Q.value = 2.4;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.08, t0 + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.07);
        noise.connect(bp); bp.connect(g); g.connect(dest);
        noise.start(t0); noise.stop(t0 + 0.08);
      }
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(220, t0);
      o.frequency.exponentialRampToValueAtTime(90, t0 + 0.06);
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.05, t0 + 0.004);
      og.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.07);
      o.connect(og); og.connect(dest);
      o.start(t0); o.stop(t0 + 0.09);
    } catch(e) {}
  },

  // A digital data blip for the cyber bed — a quick stepped square arpeggio
  // that snaps between a couple of pitches, computer-console style.
  _ambientCyberBlip(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const base = [660, 880, 990, 1320][(Math.random() * 4) | 0];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;
      o.type = 'square';
      // Stepped pitch jumps for a glitchy data-transfer feel.
      o.frequency.setValueAtTime(base, t0);
      o.frequency.setValueAtTime(base * 1.5, t0 + 0.05);
      o.frequency.setValueAtTime(base * 1.25, t0 + 0.1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.035, t0 + 0.006);
      g.gain.setValueAtTime(0.035, t0 + 0.13);
      g.gain.exponentialRampToValueAtTime(0.0003, t0 + 0.2);
      o.connect(hp); hp.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 0.22);
    } catch(e) {}
  },

  // A distant rolling thunder rumble for the storm bed — a low sine boom
  // under a slowly decaying low-passed noise wash.
  _ambientThunder(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const dur = 1.6 + Math.random() * 1.0;
      const noise = this.createNoise(dur + 0.2);
      if (noise) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t0);
        lp.frequency.exponentialRampToValueAtTime(90, t0 + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.16, t0 + 0.25);
        g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
        noise.connect(lp); lp.connect(g); g.connect(dest);
        noise.start(t0); noise.stop(t0 + dur + 0.1);
      }
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(60, t0);
      o.frequency.exponentialRampToValueAtTime(34, t0 + dur);
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.12, t0 + 0.3);
      og.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
      o.connect(og); og.connect(dest);
      o.start(t0); o.stop(t0 + dur + 0.1);
    } catch(e) {}
  },

  // A single soft water-drip ping used by the cave bed.
  _ambientDrip(dest) {
    if (!this.ctx || !dest) return;
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const f = 900 + Math.random() * 700;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.5, t0 + 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.06, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.22);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + 0.24);
    } catch(e) {}
  },

  // Fade out and dispose the current ambient bed. Idempotent.
  _stopAmbientBed() {
    const bed = this._ambientBed;
    if (!bed) return;
    bed.stopping = true;
    this._ambientBed = null;
    try { if (bed.dripTimer) clearTimeout(bed.dripTimer); } catch(e) {}
    const ctx = this.ctx;
    try {
      if (ctx && bed.gain) {
        bed.gain.gain.cancelScheduledValues(ctx.currentTime);
        bed.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      }
    } catch(e) {}
    setTimeout(() => {
      for (let i = 0; i < bed.nodes.length; i++) {
        try { bed.nodes[i].stop(); } catch(e) {}
        try { bed.nodes[i].disconnect(); } catch(e) {}
      }
      try { if (bed.gain) bed.gain.disconnect(); } catch(e) {}
    }, 1400);
  },

  // Turbo spool whine — a brief rising sine that only blooms near redline.
  // rpmNorm 0..1. Cheap one-shot; self-stops. Routed through sfxGain.
  _playTurboWhine(rpmNorm) {
    if (!this.ctx) return;
    const r = Math.max(0, Math.min(1, rpmNorm == null ? 0.8 : rpmNorm));
    if (r < 0.55) return; // only audible at high rpm
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const dur = 0.5;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
      osc.type = 'sine';
      const base = 2400 + r * 2600;
      osc.frequency.setValueAtTime(base * 0.85, t0);
      osc.frequency.linearRampToValueAtTime(base, t0 + dur * 0.6);
      const peak = 0.015 + (r - 0.55) * 0.06;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
      osc.connect(hp); hp.connect(g); g.connect(this.sfxGain || ctx.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch(e) {}
  },

  // Exhaust backfire pop — a filtered noise crack + low thump on throttle
  // release. intensity 0..1. Cheap one-shot; self-stops. Routed via sfxGain.
  _playBackfire(intensity) {
    if (!this.ctx) return;
    const amt = Math.max(0.15, Math.min(1, intensity == null ? 0.6 : intensity));
    try {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const dur = 0.12 + amt * 0.1;
      const noise = this.createNoise(dur);
      if (noise) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = 380 + amt * 260; bp.Q.value = 1.1;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.12 + amt * 0.12, t0 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
        noise.connect(bp); bp.connect(g); g.connect(this.sfxGain || ctx.destination);
        noise.start(t0); noise.stop(t0 + dur);
      }
      // Low thump body for weight.
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(150, t0);
      o.frequency.exponentialRampToValueAtTime(60, t0 + dur);
      og.gain.setValueAtTime(0.0001, t0);
      og.gain.linearRampToValueAtTime(0.09 + amt * 0.08, t0 + 0.008);
      og.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
      o.connect(og); og.connect(this.sfxGain || ctx.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch(e) {}
  },

  // Surface-tuned rolling tone. Continuous + updatable; call _stopTireRoll to
  // end. speedNorm 0..1; tire e.g. 'knobby'|'slick'|'standard'; surface e.g.
  // 'dirt'|'asphalt'|'snow'|'sand'|'water'. Lazy-built; routed through sfxGain.
  _updateTireRoll(speedNorm, tire, surface) {
    if (!this.ctx) return;
    const spd = Math.max(0, Math.min(1, speedNorm == null ? 0 : speedNorm));
    // Below a small threshold, stop the roll entirely (self-gating on idle).
    if (spd < 0.03) { this._stopTireRoll(); return; }
    const surf = String(surface == null ? '' : surface).toLowerCase();
    const tir  = String(tire == null ? '' : tire).toLowerCase();
    // Surface -> tonal character.
    let noiseCut = 1600, baseGain = 0.055, rough = 0.28;
    if (/(sand|desert|dune)/.test(surf))                { noiseCut = 900;  baseGain = 0.06;  rough = 0.2; }
    else if (/(snow|winter|ice|arctic|blizzard)/.test(surf)) { noiseCut = 700;  baseGain = 0.035; rough = 0.1; }
    else if (/(water|underwater|mud|swamp)/.test(surf)) { noiseCut = 500;  baseGain = 0.045; rough = 0.15; }
    else if (/(asphalt|road|track|city|neon|otoyol)/.test(surf)) { noiseCut = 3200; baseGain = 0.045; rough = 0.05; }
    // else keeps the dirt / default values above.
    // Tire -> extra grit or slick smoothness.
    if (/(knob|off|mud|monster|tractor)/.test(tir)) rough += 0.2;
    else if (/(slick|race|street)/.test(tir))       { rough = Math.max(0, rough - 0.12); baseGain *= 0.85; }

    try {
      const ctx = this.ctx, now = ctx.currentTime;
      if (!this._tireRoll) {
        // Lazily build a persistent looping-noise roller.
        const noise = this.createNoise(2.0);
        if (!noise) return;
        noise.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = noiseCut;
        const g = ctx.createGain(); g.gain.value = 0.0001;
        noise.connect(lp); lp.connect(g); g.connect(this.sfxGain || ctx.destination);
        try { noise.start(now); } catch(e) {}
        this._tireRoll = { noise: noise, filter: lp, gain: g };
      }
      const roll = this._tireRoll;
      const vol = baseGain * (0.35 + spd * 0.85);
      roll.gain.gain.setTargetAtTime(Math.max(0.0001, vol), now, 0.08);
      roll.filter.frequency.setTargetAtTime(noiseCut * (0.6 + spd * 0.7) * (1 + rough * 0.4), now, 0.1);
    } catch(e) {}
  },

  // Fade out and dispose the persistent tire-roll node. Idempotent.
  _stopTireRoll() {
    const roll = this._tireRoll;
    if (!roll) return;
    this._tireRoll = null;
    const ctx = this.ctx;
    try { if (ctx) roll.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.12); } catch(e) {}
    setTimeout(() => {
      try { roll.noise.stop(); } catch(e) {}
      try { roll.noise.disconnect(); } catch(e) {}
      try { roll.filter.disconnect(); } catch(e) {}
      try { roll.gain.disconnect(); } catch(e) {}
    }, 300);
  }

,
  // ═══════════════════════════════════════════════════════════════════════════
  // EXPANDED AUDIO SYSTEM — synthesizer, music, spatial audio, profiles
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── SOUND PROFILES: 9 vehicle types ────────────────────────────────────
  SOUND_PROFILES: {
    jeep: {
      baseFreq: 82, type: 'sawtooth', filterQ: 3.5, filterFreq: 320,
      harmonics: [1, 2.01, 3.0, 4.02], harmonicGains: [1.0, 0.45, 0.25, 0.12],
      idleRpm: 800, redlineRpm: 5500, character: 'rugged torque-heavy V6',
      exhaustNote: 0.95, turboLag: 0, supercharger: false,
      revSpeed: 0.12, dropSpeed: 0.08
    },
    motocross: {
      baseFreq: 210, type: 'sawtooth', filterQ: 6, filterFreq: 800,
      harmonics: [1, 1.99, 2.98, 5.97], harmonicGains: [1.0, 0.6, 0.3, 0.15],
      idleRpm: 1500, redlineRpm: 10000, character: 'screaming 2-stroke',
      exhaustNote: 1.1, turboLag: 0, supercharger: false,
      revSpeed: 0.22, dropSpeed: 0.18
    },
    monster: {
      baseFreq: 42, type: 'sawtooth', filterQ: 2, filterFreq: 180,
      harmonics: [1, 2.0, 3.1, 6.2], harmonicGains: [1.0, 0.55, 0.3, 0.1],
      idleRpm: 600, redlineRpm: 4500, character: 'ground-shaking V8',
      exhaustNote: 0.75, turboLag: 0.04, supercharger: false,
      revSpeed: 0.08, dropSpeed: 0.05
    },
    racecar: {
      baseFreq: 280, type: 'sawtooth', filterQ: 8, filterFreq: 1200,
      harmonics: [1, 2.0, 3.0, 4.0, 6.0], harmonicGains: [1.0, 0.5, 0.28, 0.14, 0.07],
      idleRpm: 2000, redlineRpm: 12000, character: 'high-revving F1 style',
      exhaustNote: 1.3, turboLag: 0, supercharger: true,
      revSpeed: 0.3, dropSpeed: 0.2
    },
    tractor: {
      baseFreq: 52, type: 'square', filterQ: 1.2, filterFreq: 200,
      harmonics: [1, 1.98, 2.02, 3.0], harmonicGains: [1.0, 0.4, 0.35, 0.2],
      idleRpm: 500, redlineRpm: 2500, character: 'diesel lope, uneven pulses',
      exhaustNote: 0.7, turboLag: 0.08, supercharger: false,
      revSpeed: 0.05, dropSpeed: 0.04
    },
    atv: {
      baseFreq: 120, type: 'sawtooth', filterQ: 4, filterFreq: 500,
      harmonics: [1, 2.0, 3.5, 5.0], harmonicGains: [1.0, 0.5, 0.22, 0.1],
      idleRpm: 1000, redlineRpm: 7000, character: 'sporty quad bark',
      exhaustNote: 1.0, turboLag: 0, supercharger: false,
      revSpeed: 0.18, dropSpeed: 0.14
    },
    buggy: {
      baseFreq: 95, type: 'sawtooth', filterQ: 4.5, filterFreq: 380,
      harmonics: [1, 2.0, 3.0, 4.5], harmonicGains: [1.0, 0.48, 0.24, 0.11],
      idleRpm: 900, redlineRpm: 6500, character: 'raspy air-cooled 4-cyl',
      exhaustNote: 0.98, turboLag: 0, supercharger: false,
      revSpeed: 0.16, dropSpeed: 0.12
    },
    helicopter: {
      baseFreq: 18, type: 'sine', filterQ: 2, filterFreq: 80,
      harmonics: [1, 2.0, 4.0, 8.0], harmonicGains: [1.0, 0.6, 0.35, 0.2],
      idleRpm: 200, redlineRpm: 2000, character: 'turbine whine + rotor chop',
      exhaustNote: 0.5, turboLag: 0, supercharger: false,
      revSpeed: 0.04, dropSpeed: 0.03
    },
    tank: {
      baseFreq: 35, type: 'sawtooth', filterQ: 1.5, filterFreq: 150,
      harmonics: [1, 1.5, 2.0, 3.0, 4.0], harmonicGains: [1.0, 0.5, 0.38, 0.2, 0.1],
      idleRpm: 400, redlineRpm: 2800, character: 'diesel V12 rumble',
      exhaustNote: 0.65, turboLag: 0.12, supercharger: false,
      revSpeed: 0.06, dropSpeed: 0.04
    }
  },

  // ─── ADVANCED SYNTHESIZER ────────────────────────────────────────────────
  _synthesizer: {
    _parent: null,

    _getCtx() {
      return this._parent && this._parent.ctx;
    },

    // Build a harmonically rich engine oscillator for a given vehicle+RPM
    createEngineOscillator(vehicleId, rpm) {
      const ctx = this._getCtx();
      if (!ctx) return null;
      const profile = (this._parent && this._parent.SOUND_PROFILES[vehicleId])
                      || this._parent.SOUND_PROFILES.jeep;
      rpm = rpm || profile.idleRpm;
      const rpmNorm = Math.max(0, Math.min(1, (rpm - profile.idleRpm) / (profile.redlineRpm - profile.idleRpm)));
      const merger = ctx.createChannelMerger ? ctx.createChannelMerger() : null;
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.18 + rpmNorm * 0.12;

      const oscillators = [];
      profile.harmonics.forEach((harmMultiplier, idx) => {
        try {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          osc.type = idx === 0 ? profile.type : 'sawtooth';
          osc.frequency.value = profile.baseFreq * harmMultiplier
                                + rpmNorm * profile.baseFreq * harmMultiplier * 3;
          g.gain.value = profile.harmonicGains[idx] || 0.1;
          filter.type = 'bandpass';
          filter.frequency.value = profile.filterFreq * harmMultiplier;
          filter.Q.value = profile.filterQ * (1 + rpmNorm * 0.5);
          osc.connect(filter);
          filter.connect(g);
          g.connect(masterGain);
          osc.start();
          oscillators.push({ osc, gain: g, filter });
        } catch (e) {}
      });

      // Diesel-style pulse modulator (tractor, tank)
      if (profile.turboLag > 0 || profile.type === 'square') {
        try {
          const pulseOsc = ctx.createOscillator();
          const pulseGain = ctx.createGain();
          pulseOsc.type = 'sine';
          pulseOsc.frequency.value = (rpm / 60) * (profile.type === 'square' ? 0.5 : 1);
          pulseGain.gain.value = 0.06;
          pulseOsc.connect(pulseGain);
          pulseGain.connect(masterGain);
          pulseOsc.start();
          oscillators.push({ osc: pulseOsc, gain: pulseGain, filter: null });
        } catch (e) {}
      }

      masterGain.connect(this._parent.sfxGain || ctx.destination);
      return { oscillators, masterGain, profile, rpm };
    },

    // Synthesize tire squeal
    createTireSqueal(intensity, pitch) {
      const ctx = this._getCtx();
      if (!ctx) return;
      intensity = Math.max(0, Math.min(1, intensity || 0.5));
      pitch = pitch || 800;
      try {
        const bufLen = Math.floor(ctx.sampleRate * 0.5);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        // Shaped noise: pure friction squeal character
        for (let i = 0; i < bufLen; i++) {
          const t2 = i / ctx.sampleRate;
          data[i] = Math.sin(2 * Math.PI * pitch * t2)
                  * (0.4 + Math.random() * 0.6)
                  * Math.exp(-t2 * (2 - intensity * 1.5));
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = pitch;
        filter.Q.value = 8 + intensity * 10;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(intensity * 0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this._parent.sfxGain || ctx.destination);
        src.start();
      } catch (e) {}
    },

    // Synthesize explosion with size and distance falloff
    createExplosion(size, distance) {
      const ctx = this._getCtx();
      if (!ctx) return;
      size = Math.max(0.1, Math.min(3, size || 1));
      distance = Math.max(1, distance || 100);
      const volumeFactor = Math.min(1, 500 / distance);
      const duration = 0.3 + size * 0.5;
      try {
        // Sub-bass thud
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(60 * size, ctx.currentTime);
        thudOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + duration);
        thudGain.gain.setValueAtTime(0.8 * volumeFactor * size, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        thudOsc.connect(thudGain);
        thudGain.connect(this._parent.sfxGain || ctx.destination);
        thudOsc.start(); thudOsc.stop(ctx.currentTime + duration);

        // Broadband noise burst
        const bufLen = Math.floor(ctx.sampleRate * duration);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) {
          const env = Math.exp(-i / (ctx.sampleRate * duration * 0.3));
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.value = 800 + size * 400;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.6 * volumeFactor;
        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this._parent.sfxGain || ctx.destination);
        noiseSrc.start();
      } catch (e) {}
    },

    // Impact sound with material character
    createImpact(force, material) {
      const ctx = this._getCtx();
      if (!ctx) return;
      force = Math.max(0, Math.min(1, force || 0.5));
      material = material || 'metal';
      const materialConfigs = {
        metal:  { freq: 1200, decay: 0.15, filterFreq: 3000, noiseVol: 0.3, type: 'sawtooth' },
        wood:   { freq: 300,  decay: 0.25, filterFreq: 1200, noiseVol: 0.5, type: 'triangle' },
        rock:   { freq: 150,  decay: 0.35, filterFreq: 600,  noiseVol: 0.6, type: 'sawtooth' },
        water:  { freq: 500,  decay: 0.2,  filterFreq: 2000, noiseVol: 0.7, type: 'sine'     },
        rubber: { freq: 200,  decay: 0.1,  filterFreq: 800,  noiseVol: 0.4, type: 'triangle' },
        glass:  { freq: 2200, decay: 0.08, filterFreq: 6000, noiseVol: 0.25, type: 'sine'    }
      };
      const cfg = materialConfigs[material] || materialConfigs.metal;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.type = cfg.type;
        osc.frequency.setValueAtTime(cfg.freq * force, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(cfg.freq * 0.3, ctx.currentTime + cfg.decay);
        gain.gain.setValueAtTime(force * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.decay);
        filter.type = 'bandpass';
        filter.frequency.value = cfg.filterFreq;
        filter.Q.value = 3;
        osc.connect(filter); filter.connect(gain);
        gain.connect(this._parent.sfxGain || ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + cfg.decay + 0.05);

        // Noise transient
        const bufLen = Math.floor(ctx.sampleRate * 0.08);
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.3));
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = buf;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = cfg.noiseVol * force;
        noiseSrc.connect(noiseGain);
        noiseGain.connect(this._parent.sfxGain || ctx.destination);
        noiseSrc.start();
      } catch (e) {}
    },

    // Ambient soundscape for map environments
    createAmbient(mapId) {
      const ctx = this._getCtx();
      if (!ctx) return null;
      const ambientConfigs = {
        countryside: { windFreq: 200,  windVol: 0.04, toneFreq: 0,    toneVol: 0,    chirp: true  },
        desert:      { windFreq: 350,  windVol: 0.05, toneFreq: 0,    toneVol: 0,    chirp: false },
        winter:      { windFreq: 150,  windVol: 0.06, toneFreq: 0,    toneVol: 0,    chirp: false },
        beach:       { windFreq: 250,  windVol: 0.04, toneFreq: 0,    toneVol: 0,    chirp: false },
        volcano:     { windFreq: 80,   windVol: 0.08, toneFreq: 40,   toneVol: 0.04, chirp: false },
        underwater:  { windFreq: 60,   windVol: 0.05, toneFreq: 55,   toneVol: 0.03, chirp: false },
        space:       { windFreq: 0,    windVol: 0,    toneFreq: 30,   toneVol: 0.02, chirp: false },
        mars:        { windFreq: 120,  windVol: 0.02, toneFreq: 35,   toneVol: 0.015,chirp: false },
        neon:        { windFreq: 200,  windVol: 0.025,toneFreq: 60,   toneVol: 0.04, chirp: false }
      };
      const cfg = ambientConfigs[mapId] || ambientConfigs.countryside;
      const nodes = [];
      try {
        if (cfg.windVol > 0) {
          const bufLen = ctx.sampleRate * 2;
          const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
          const data = buf.getChannelData(0);
          for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
          const wind = ctx.createBufferSource();
          wind.buffer = buf; wind.loop = true;
          const wFilter = ctx.createBiquadFilter();
          wFilter.type = 'bandpass'; wFilter.frequency.value = cfg.windFreq; wFilter.Q.value = 0.5;
          const wGain = ctx.createGain();
          wGain.gain.value = cfg.windVol;
          wind.connect(wFilter); wFilter.connect(wGain);
          wGain.connect(this._parent.sfxGain || ctx.destination);
          wind.start();
          nodes.push({ src: wind, gain: wGain });
        }
        if (cfg.toneVol > 0) {
          const toneOsc = ctx.createOscillator();
          const toneGain = ctx.createGain();
          toneOsc.type = 'sine'; toneOsc.frequency.value = cfg.toneFreq;
          toneGain.gain.value = cfg.toneVol;
          toneOsc.connect(toneGain);
          toneGain.connect(this._parent.sfxGain || ctx.destination);
          toneOsc.start();
          nodes.push({ osc: toneOsc, gain: toneGain });
        }
      } catch (e) {}
      return nodes;
    }
  },

  // ─── PROCEDURAL MUSIC SYSTEM ─────────────────────────────────────────────
  MUSIC_SYSTEM: {
    _parent: null,
    _currentInterval: null,
    _crossfadeTimer: null,
    _currentNodes: [],

    _getCtx() {
      return this._parent && this._parent.ctx;
    },

    _stopCurrent() {
      if (this._currentInterval) { clearInterval(this._currentInterval); this._currentInterval = null; }
      const ctx = this._getCtx();
      if (!ctx) return;
      for (const n of this._currentNodes) {
        try {
          n.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
          setTimeout(() => { try { if (n.osc) n.osc.stop(); } catch(e){} }, 500);
        } catch(e) {}
      }
      this._currentNodes = [];
    },

    // Menu music — calm arpeggiated chords
    playMenuMusic(intensity) {
      this._stopCurrent();
      const ctx = this._getCtx();
      if (!ctx) return;
      intensity = Math.max(0, Math.min(1, intensity || 0.5));
      const scales = {
        calm:  [261, 293, 329, 369, 392, 440, 493, 523],
        epic:  [220, 246, 261, 293, 329, 369, 415, 440]
      };
      const scale = intensity > 0.6 ? scales.epic : scales.calm;
      const tempo = Math.floor(600 - intensity * 200);
      let idx = 0;
      this._currentInterval = setInterval(() => {
        if (!ctx) return;
        const note = scale[idx % scale.length];
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = note;
          gain.gain.setValueAtTime(0.06 + intensity * 0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tempo / 1000 * 0.85);
          osc.connect(gain);
          gain.connect(this._parent.musicGain || ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + tempo / 1000);
        } catch(e) {}
        idx++;
      }, tempo);
    },

    // Race music — driving rhythm that responds to speed and danger
    playRaceMusic(speed, danger) {
      this._stopCurrent();
      const ctx = this._getCtx();
      if (!ctx) return;
      speed = Math.max(0, Math.min(1, speed || 0.5));
      danger = Math.max(0, Math.min(1, danger || 0));
      const baseNotes = danger > 0.6
        ? [220, 233, 246, 261, 220, 196, 207, 220]
        : [261, 293, 329, 349, 392, 349, 329, 293];
      const tempo = Math.floor(350 - speed * 150 - danger * 50);
      let idx = 0;
      this._currentInterval = setInterval(() => {
        if (!ctx) return;
        const note = baseNotes[idx % baseNotes.length];
        const percussive = idx % 4 === 0;
        try {
          // Melodic voice
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = danger > 0.6 ? 'sawtooth' : 'square';
          osc.frequency.value = note;
          gain.gain.setValueAtTime(0.05, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tempo / 1000 * 0.8);
          osc.connect(gain);
          gain.connect(this._parent.musicGain || ctx.destination);
          osc.start(); osc.stop(ctx.currentTime + tempo / 1000);

          // Kick on beat
          if (percussive) {
            const kickOsc = ctx.createOscillator();
            const kickGain = ctx.createGain();
            kickOsc.type = 'sine';
            kickOsc.frequency.setValueAtTime(120, ctx.currentTime);
            kickOsc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.1);
            kickGain.gain.setValueAtTime(0.18, ctx.currentTime);
            kickGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            kickOsc.connect(kickGain);
            kickGain.connect(this._parent.musicGain || ctx.destination);
            kickOsc.start(); kickOsc.stop(ctx.currentTime + 0.15);
          }
        } catch(e) {}
        idx++;
      }, tempo);
    },

    // Victory jingle — rank-dependent fanfare
    playVictoryJingle(rank) {
      this._stopCurrent();
      const ctx = this._getCtx();
      if (!ctx) return;
      rank = rank || 1;
      const melodies = {
        1: [523, 659, 784, 1047, 1319, 1047, 1319, 1568],
        2: [494, 587, 740,  988,  988,  740,  988,  988],
        3: [440, 523, 659,  784,  784,  659,  784,  784]
      };
      const melody = melodies[Math.min(3, rank)] || melodies[3];
      const tempo = 90;
      melody.forEach((freq, i) => {
        setTimeout(() => {
          if (!ctx) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            osc.connect(gain);
            gain.connect(this._parent.musicGain || ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
          } catch(e) {}
        }, i * tempo);
      });
    },

    // Defeat sound — descending minor arpeggio
    playDefeatSound() {
      this._stopCurrent();
      const ctx = this._getCtx();
      if (!ctx) return;
      const notes = [440, 392, 349, 329, 293, 261, 233, 220];
      notes.forEach((freq, i) => {
        setTimeout(() => {
          if (!ctx) return;
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(this._parent.musicGain || ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.28);
          } catch(e) {}
        }, i * 120);
      });
    },

    // Crossfade between two music states
    crossfade(fromNodes, toCallback, duration) {
      const ctx = this._getCtx();
      if (!ctx) return;
      duration = duration || 1.5;
      // Fade out current
      for (const n of (fromNodes || [])) {
        try {
          n.gain.gain.setTargetAtTime(0, ctx.currentTime, duration / 4);
        } catch(e) {}
      }
      // Start new after half duration
      setTimeout(() => {
        if (toCallback) toCallback();
      }, duration * 500);
    }
  },

  // ─── REVERB PROFILES ────────────────────────────────────────────────────
  REVERB_PROFILES: {
    dry:    { decayTime: 0.1, preDelay: 0,     wetGain: 0.0, name: 'No reverb'      },
    room:   { decayTime: 0.6, preDelay: 0.01,  wetGain: 0.2, name: 'Small room'     },
    hall:   { decayTime: 1.8, preDelay: 0.02,  wetGain: 0.35,name: 'Concert hall'   },
    tunnel: { decayTime: 2.5, preDelay: 0.04,  wetGain: 0.45,name: 'Tunnel echo'    },
    cave:   { decayTime: 3.5, preDelay: 0.06,  wetGain: 0.55,name: 'Deep cave'      },
    space:  { decayTime: 6.0, preDelay: 0.12,  wetGain: 0.7, name: 'Space / void'   },
    outdoor:{ decayTime: 0.4, preDelay: 0.005, wetGain: 0.1, name: 'Open outdoor'   },

    createConvolver(ctx, profileId) {
      const profile = this[profileId] || this.dry;
      if (!ctx || profile.wetGain === 0) return null;
      try {
        const convolver = ctx.createConvolver();
        const len = Math.floor(ctx.sampleRate * profile.decayTime);
        const irBuf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
          const data = irBuf.getChannelData(ch);
          for (let i = 0; i < len; i++) {
            const env = Math.pow(1 - i / len, 2);
            data[i] = (Math.random() * 2 - 1) * env;
          }
        }
        convolver.buffer = irBuf;
        return convolver;
      } catch (e) { return null; }
    }
  },

  // ─── AUDIO FILTERS (EQ) ─────────────────────────────────────────────────
  AUDIO_FILTERS: {
    _parent: null,

    createLowpass(cutoff, resonance) {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx) return null;
      try {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = cutoff || 1000;
        f.Q.value = resonance || 0.707;
        return f;
      } catch (e) { return null; }
    },

    createHighpass(cutoff, resonance) {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx) return null;
      try {
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = cutoff || 500;
        f.Q.value = resonance || 0.707;
        return f;
      } catch (e) { return null; }
    },

    createBandpass(center, bandwidth) {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx) return null;
      try {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = center || 1000;
        f.Q.value = bandwidth || 1;
        return f;
      } catch (e) { return null; }
    },

    // 3-band EQ: low shelf, mid peak, high shelf
    createThreeBandEQ(lowGain, midGain, highGain, midFreq) {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx) return null;
      try {
        const low = ctx.createBiquadFilter();
        low.type = 'lowshelf'; low.frequency.value = 250; low.gain.value = lowGain || 0;
        const mid = ctx.createBiquadFilter();
        mid.type = 'peaking'; mid.frequency.value = midFreq || 1500;
        mid.Q.value = 1.0; mid.gain.value = midGain || 0;
        const high = ctx.createBiquadFilter();
        high.type = 'highshelf'; high.frequency.value = 4000; high.gain.value = highGain || 0;
        low.connect(mid); mid.connect(high);
        return { input: low, output: high, low, mid, high };
      } catch (e) { return null; }
    },

    // Telephone effect (bandpass 300-3400 Hz)
    createTelephoneEQ() {
      return this.createBandpass(1200, 3);
    },

    // Underwater muffled effect (very low lowpass)
    createUnderwaterEQ() {
      return this.createLowpass(400, 2);
    }
  },

  // ─── SPATIAL AUDIO (3D positioning) ─────────────────────────────────────
  spatialAudio: {
    _parent: null,
    _listenerX: 0,
    _listenerY: 0,
    _maxDistance: 800,

    setListenerPosition(x, y) {
      this._listenerX = x;
      this._listenerY = y;
    },

    // Play a sound at a world position with distance attenuation
    playAt(soundId, x, y, volume, maxDistance) {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx) return;
      maxDistance = maxDistance || this._maxDistance;
      const dx = x - this._listenerX;
      const dy = y - this._listenerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > maxDistance) return;
      // Linear falloff with slight rolloff curve
      const atten = Math.pow(1 - Math.min(1, dist / maxDistance), 1.5);
      const pan = Math.max(-1, Math.min(1, dx / (maxDistance * 0.5)));
      const vol = (volume || 0.3) * atten;
      if (vol < 0.005) return;

      try {
        const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (panner) panner.pan.value = pan;
        const gain = ctx.createGain();
        gain.gain.value = vol;
        const dest = this._parent.sfxGain || ctx.destination;
        if (panner) {
          gain.connect(panner);
          panner.connect(dest);
        } else {
          gain.connect(dest);
        }
        // Delegate to parent's playTone for the actual synthesis
        const soundFuncs = {
          coin:      () => this._parent.playCoin && this._parent.playCoin(),
          explosion: () => this._parent.playExplosion && this._parent.playExplosion(),
          crash:     () => this._parent.playCrash && this._parent.playCrash(),
          splash:    () => this._parent.playWaterSplash && this._parent.playWaterSplash()
        };
        if (soundFuncs[soundId]) soundFuncs[soundId]();
      } catch (e) {}
    }
  },

  // ─── RECORDING SYSTEM ───────────────────────────────────────────────────
  recordingSystem: {
    _parent: null,
    _recorder: null,
    _chunks: [],
    _isRecording: false,
    _bestLapAudio: null,
    _destination: null,

    startRecording() {
      const ctx = this._parent && this._parent.ctx;
      if (!ctx || this._isRecording) return false;
      try {
        this._destination = ctx.createMediaStreamDestination();
        const masterGain = this._parent.masterGain;
        if (masterGain) masterGain.connect(this._destination);
        this._recorder = new MediaRecorder(this._destination.stream);
        this._chunks = [];
        this._recorder.ondataavailable = (e) => {
          if (e.data.size > 0) this._chunks.push(e.data);
        };
        this._recorder.start();
        this._isRecording = true;
        return true;
      } catch (e) {
        console.warn('Recording not supported:', e);
        return false;
      }
    },

    stopRecording(isBestLap) {
      if (!this._recorder || !this._isRecording) return;
      this._recorder.onstop = () => {
        const blob = new Blob(this._chunks, { type: 'audio/webm' });
        if (isBestLap) {
          this._bestLapAudio = blob;
          console.log('Best lap audio saved, size:', blob.size, 'bytes');
        }
        const ctx = this._parent && this._parent.ctx;
        if (ctx && this._destination && this._parent.masterGain) {
          try { this._parent.masterGain.disconnect(this._destination); } catch(e) {}
        }
        this._isRecording = false;
      };
      this._recorder.stop();
    },

    playBestLap() {
      if (!this._bestLapAudio) { console.log('No best lap audio stored'); return; }
      const url = URL.createObjectURL(this._bestLapAudio);
      const audio = new window.Audio(url);
      audio.play().catch(e => console.warn('Playback failed:', e));
    },

    hasBestLap() {
      return this._bestLapAudio !== null;
    },

    clearBestLap() {
      this._bestLapAudio = null;
    }
  },

  // Extended specific sound functions
  playSkid(intensity) {
    if (!this.ctx) return;
    intensity = Math.max(0, Math.min(1, intensity || 0.5));
    try {
      const bufLen = Math.floor(this.ctx.sampleRate * 0.3);
      const buf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) {
        const t2 = i / this.ctx.sampleRate;
        data[i] = (Math.random() * 2 - 1)
                * Math.sin(2 * Math.PI * (600 + intensity * 400) * t2)
                * Math.exp(-t2 * (3 - intensity * 2));
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.value = intensity * 0.2;
      src.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start();
    } catch(e) {}
  },

  playNitroActivate() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(100, t);
      osc1.frequency.exponentialRampToValueAtTime(600, t + 0.35);
      osc2.type = 'square'; osc2.frequency.setValueAtTime(80, t);
      osc2.frequency.exponentialRampToValueAtTime(400, t + 0.3);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc1.connect(gain); osc2.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      osc1.start(); osc1.stop(t + 0.5);
      osc2.start(); osc2.stop(t + 0.45);
    } catch(e) {}
  },

  playLavaContact() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    try {
      const hissLen = Math.floor(this.ctx.sampleRate * 0.4);
      const buf = this.ctx.createBuffer(1, hissLen, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < hissLen; i++) {
        const env = i < hissLen * 0.1
          ? i / (hissLen * 0.1)
          : Math.exp(-(i - hissLen * 0.1) / (hissLen * 0.5));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass'; filter.frequency.value = 1500;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.35;
      src.connect(filter); filter.connect(gain);
      gain.connect(this.sfxGain || this.ctx.destination);
      src.start();
      this.playTone(60, 'sine', 0.3, 0.4);
    } catch(e) {}
  },

  playIceSkid() {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
      osc.start(); osc.stop(t + 0.22);
    } catch(e) {}
  },

  playCheckpoint() {
    if (!this.ctx) return;
    const melody = [523, 659, 784, 1047];
    melody.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.15, 0.22), i * 70);
    });
  },

  playFinishLine() {
    if (!this.ctx) return;
    const fanfare = [523, 659, 784, 1047, 1319, 1568, 1319, 1047, 784, 1568];
    fanfare.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.18, 0.28), i * 65);
    });
  },

  playVehicleSelect() {
    if (!this.ctx) return;
    [330, 440, 550].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'sine', 0.12, 0.15), i * 55);
    });
  },

  playHorn(vehicleType) {
    if (!this.ctx) return;
    const hornFreqs = {
      jeep:      [300, 380], motocross: [600, 750], monster: [150, 190],
      racecar:   [800, 1000], tractor: [180, 220],  atv: [400, 500]
    };
    const freqs = hornFreqs[vehicleType] || hornFreqs.jeep;
    const t = this.ctx.currentTime;
    freqs.forEach((freq) => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.05);
        gain.gain.setValueAtTime(0.12, t + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain); gain.connect(this.sfxGain || this.ctx.destination);
        osc.start(t); osc.stop(t + 0.6);
      } catch(e) {}
    });
  },

  // Delivery failed — a deflating descending "sad" two-tone buzz with a
  // slightly detuned, dissonant tail. Negative feedback cue. Via sfxGain.
  playDeliveryFail() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const bus = this.sfxGain || ctx.destination;
    // Two overlapping sawtooth voices sliding down a minor third apart for a
    // wah-wah "womp" feel, softened by a low-pass to keep it non-harsh.
    [[311.13, 0.0], [246.94, 0.0]].forEach((v, i) => {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(v[0], t0);
        o.frequency.exponentialRampToValueAtTime(v[0] * 0.6, t0 + 0.5);
        lp.type = 'lowpass'; lp.frequency.value = 1400;
        const peak = i === 0 ? 0.11 : 0.08;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(peak, t0 + 0.03);
        g.gain.setValueAtTime(peak, t0 + 0.28);
        g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.55);
        o.connect(lp); lp.connect(g); g.connect(bus);
        o.start(t0); o.stop(t0 + 0.58);
      } catch(e) {}
    });
  },

  // Cargo delivered safely — a warm, reassuring "locked in" cue: a soft low
  // thunk followed by a gentle rising confirm chime (E5→A5). Via sfxGain.
  playCargoSafe() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const bus = this.sfxGain || ctx.destination;
    // Low secured "thunk".
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(180, t0);
      o.frequency.exponentialRampToValueAtTime(90, t0 + 0.14);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.12, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.18);
      o.connect(g); g.connect(bus);
      o.start(t0); o.stop(t0 + 0.2);
    } catch(e) {}
    // Gentle two-note confirm chime.
    [{ f: 659.25, when: 0.10 }, { f: 880.0, when: 0.20 }].forEach(n => {
      try {
        const st = t0 + n.when;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(n.f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.09, st + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0006, st + 0.26);
        o.connect(g); g.connect(bus);
        o.start(st); o.stop(st + 0.28);
      } catch(e) {}
    });
  },

  // Mode start — an energetic "here we go" cue: a quick rising noise sweep
  // followed by a bright major chord stab (C-E-G). Via sfxGain.
  playModeStart() {
    if (!this.ctx) return;
    const ctx = this.ctx, t0 = ctx.currentTime;
    const bus = this.sfxGain || ctx.destination;
    // Rising whoosh to build anticipation.
    try {
      const noise = this.createNoise(0.3);
      if (noise) {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 0.9;
        bp.frequency.setValueAtTime(400, t0);
        bp.frequency.exponentialRampToValueAtTime(3200, t0 + 0.24);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.0001, t0);
        ng.gain.linearRampToValueAtTime(0.12, t0 + 0.14);
        ng.gain.exponentialRampToValueAtTime(0.0006, t0 + 0.3);
        noise.connect(bp); bp.connect(ng); ng.connect(bus);
        noise.start(t0); noise.stop(t0 + 0.3);
      }
    } catch(e) {}
    // Bright chord stab landing after the sweep.
    const st = t0 + 0.22;
    [523.25, 659.25, 783.99].forEach((f, i) => {
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 2 ? 'sawtooth' : 'square';
        o.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.09, st + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, st + 0.34);
        o.connect(g); g.connect(bus);
        o.start(st); o.stop(st + 0.36);
      } catch(e) {}
    });
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIVE: Short procedural musical STINGERS + celebratory SFX.
  // Every method is fully guarded (this.ctx), self-stopping (every
  // node calls .stop() at a fixed offset so nothing lingers), and
  // routed through the existing sfxGain / musicGain buses so it
  // always respects mute + volume (both terminate at masterGain).
  // Purely additive — nothing here touches the engine/BGM/ambient/
  // adaptive systems; if never called the audio graph is unchanged.
  // ═══════════════════════════════════════════════════════════════

  // Triumphant win stinger — bright ascending major arpeggio (C-E-G-C)
  // with a shimmering octave sparkle on the final note. Musical -> musicGain.
  playWinStinger() {
    if (!this.ctx) return;
    const bus = this.musicGain || this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    const notes = [
      { f: 523.25, when: 0.00, dur: 0.16 }, // C5
      { f: 659.25, when: 0.10, dur: 0.16 }, // E5
      { f: 783.99, when: 0.20, dur: 0.18 }, // G5
      { f: 1046.5, when: 0.32, dur: 0.42 }  // C6 (held, triumphant)
    ];
    notes.forEach((n, idx) => {
      try {
        const st = t0 + n.when;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(n.f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.14, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + n.dur + 0.02);
        // sweet upper octave sparkle
        const sp = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sp.type = 'sine';
        sp.frequency.setValueAtTime(n.f * 2, st);
        sg.gain.setValueAtTime(0.0001, st);
        sg.gain.linearRampToValueAtTime(0.05, st + 0.015);
        sg.gain.exponentialRampToValueAtTime(0.0006, st + n.dur * 0.8);
        sp.connect(sg); sg.connect(bus);
        sp.start(st); sp.stop(st + n.dur);
      } catch(e) {}
    });
  },

  // Sad "trombone" lose stinger — three downward pitch-bent wah notes
  // ending on a low droop (the classic wah-wah-wah-waaah). Muffled
  // sawtooth through a low-pass for a brassy tone. Musical -> musicGain.
  playLoseStinger() {
    if (!this.ctx) return;
    const bus = this.musicGain || this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    // Each note bends down a semitone-ish, and the sequence steps down.
    const steps = [
      { f: 233.08, when: 0.00, dur: 0.24 }, // Bb3
      { f: 220.00, when: 0.26, dur: 0.24 }, // A3
      { f: 207.65, when: 0.52, dur: 0.24 }, // Ab3
      { f: 174.61, when: 0.80, dur: 0.60 }  // F3  (long droop)
    ];
    steps.forEach(n => {
      try {
        const st = t0 + n.when;
        const osc = this.ctx.createOscillator();
        const lp = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1100, st);
        lp.frequency.exponentialRampToValueAtTime(500, st + n.dur);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, st);
        // downward "wah" glide
        osc.frequency.linearRampToValueAtTime(n.f * 0.94, st + n.dur);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.13, st + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(lp); lp.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + n.dur + 0.03);
      } catch(e) {}
    });
  },

  // New-record fanfare — bright brassy triplet pickup into a held high
  // note, with a fifth harmony layer for a heraldic feel. -> musicGain.
  playNewRecordStinger() {
    if (!this.ctx) return;
    const bus = this.musicGain || this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    // Classic fanfare: G-G-G -> C, then rise to E/G, land on high C.
    const melody = [
      { f: 392.00, when: 0.00, dur: 0.10 }, // G4
      { f: 392.00, when: 0.12, dur: 0.10 }, // G4
      { f: 392.00, when: 0.24, dur: 0.10 }, // G4
      { f: 523.25, when: 0.36, dur: 0.22 }, // C5
      { f: 659.25, when: 0.58, dur: 0.18 }, // E5
      { f: 783.99, when: 0.76, dur: 0.50 }  // G5 (held finale)
    ];
    melody.forEach(n => {
      try {
        const st = t0 + n.when;
        // main brass voice
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.13, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, st + n.dur);
        osc.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + n.dur + 0.02);
        // fifth-above harmony (sawtooth) for heraldic thickness
        const h = this.ctx.createOscillator();
        const hg = this.ctx.createGain();
        h.type = 'sawtooth';
        h.frequency.setValueAtTime(n.f * 1.5, st);
        hg.gain.setValueAtTime(0.0001, st);
        hg.gain.linearRampToValueAtTime(0.06, st + 0.02);
        hg.gain.exponentialRampToValueAtTime(0.0006, st + n.dur * 0.9);
        h.connect(hg); hg.connect(bus);
        h.start(st); h.stop(st + n.dur);
      } catch(e) {}
    });
  },

  // Big-purchase chime — a rich chord "ka-ching" with a low confirming
  // thump underneath. Celebratory SFX -> sfxGain.
  playPurchaseBig() {
    if (!this.ctx) return;
    const bus = this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    // sparkling two-hit chime (like a cash register bell)
    const hits = [
      { f: 987.77, when: 0.00 }, // B5
      { f: 1318.5, when: 0.00 }, // E6
      { f: 1567.98, when: 0.09 }, // G6
      { f: 2093.0, when: 0.09 }  // C7 sparkle
    ];
    hits.forEach(n => {
      try {
        const st = t0 + n.when;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.11, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0006, st + 0.5);
        osc.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + 0.55);
      } catch(e) {}
    });
    // low confirming thump
    try {
      const sub = this.ctx.createOscillator();
      const sg = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(160, t0);
      sub.frequency.exponentialRampToValueAtTime(90, t0 + 0.2);
      sg.gain.setValueAtTime(0.0001, t0);
      sg.gain.linearRampToValueAtTime(0.13, t0 + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      sub.connect(sg); sg.connect(bus);
      sub.start(t0); sub.stop(t0 + 0.3);
    } catch(e) {}
  },

  // Equip / gear-on — a short mechanical click followed by a bright
  // two-note confirm. SFX -> sfxGain.
  playEquip() {
    if (!this.ctx) return;
    const bus = this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    // mechanical click (short filtered noise burst)
    try {
      const noise = this.createNoise(0.05);
      if (noise) {
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2600;
        bp.Q.value = 1.4;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.09, t0);
        ng.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.05);
        noise.connect(bp); bp.connect(ng); ng.connect(bus);
        noise.start(t0); noise.stop(t0 + 0.05);
      }
    } catch(e) {}
    // bright ascending confirm (E6 -> A6)
    const conf = [
      { f: 1318.5, when: 0.03, dur: 0.09 },
      { f: 1760.0, when: 0.10, dur: 0.14 }
    ];
    conf.forEach(n => {
      try {
        const st = t0 + n.when;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.1, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0006, st + n.dur);
        osc.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + n.dur + 0.02);
      } catch(e) {}
    });
  },

  // Tier / level-up — an upward sweep into a bright major-triad shimmer
  // that says "you climbed a rank". SFX -> sfxGain.
  playTierUp() {
    if (!this.ctx) return;
    const bus = this.sfxGain || this.ctx.destination;
    const t0 = this.ctx.currentTime;
    // rising sweep
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, t0);
      osc.frequency.exponentialRampToValueAtTime(1200, t0 + 0.24);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.1, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
      osc.connect(g); g.connect(bus);
      osc.start(t0); osc.stop(t0 + 0.3);
    } catch(e) {}
    // major-triad shimmer landing (C6 / E6 / G6)
    const chord = [1046.5, 1318.5, 1567.98];
    chord.forEach((f, i) => {
      try {
        const st = t0 + 0.22 + i * 0.02;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.08, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0006, st + 0.45);
        osc.connect(g); g.connect(bus);
        osc.start(st); osc.stop(st + 0.5);
      } catch(e) {}
    });
  },

  // Initialize all sub-systems with parent references
  _initSubsystems() {
    this._synthesizer._parent = this;
    this.MUSIC_SYSTEM._parent = this;
    this.AUDIO_FILTERS._parent = this;
    this.spatialAudio._parent = this;
    this.recordingSystem._parent = this;
    this.REVERB_PROFILES._parent = this;
  }


};
// ============================================================
// EXTENDED AUDIO ENGINE — Appended Audio Systems
// Generated: 2026-06-29
// ============================================================

// ============================================================
// SOUND_LIBRARY — 50+ Sound Effect Definitions
// ============================================================
const SOUND_LIBRARY = {
  // --- Engine Sounds ---
  engine_idle: {
    frequency: 80, type: 'sawtooth', duration: 0, loop: true,
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.8, release: 0.3 },
    gain: 0.4, detune: 0, category: 'engine',
    harmonics: [1, 0.5, 0.25, 0.125], harmonicGains: [1, 0.6, 0.3, 0.15]
  },
  engine_rev_low: {
    frequency: 120, type: 'sawtooth', duration: 0, loop: true,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.9, release: 0.2 },
    gain: 0.55, detune: 10, category: 'engine',
    harmonics: [1, 0.5, 0.33, 0.25], harmonicGains: [1, 0.7, 0.4, 0.2]
  },
  engine_rev_mid: {
    frequency: 220, type: 'sawtooth', duration: 0, loop: true,
    envelope: { attack: 0.03, decay: 0.08, sustain: 0.95, release: 0.15 },
    gain: 0.65, detune: 20, category: 'engine',
    harmonics: [1, 0.5, 0.33, 0.25, 0.2], harmonicGains: [1, 0.75, 0.5, 0.25, 0.1]
  },
  engine_rev_high: {
    frequency: 380, type: 'sawtooth', duration: 0, loop: true,
    envelope: { attack: 0.02, decay: 0.05, sustain: 1.0, release: 0.1 },
    gain: 0.75, detune: 30, category: 'engine',
    harmonics: [1, 0.5, 0.33, 0.25, 0.2, 0.16], harmonicGains: [1, 0.8, 0.55, 0.3, 0.15, 0.05]
  },
  engine_redline: {
    frequency: 580, type: 'sawtooth', duration: 0, loop: true,
    envelope: { attack: 0.01, decay: 0.03, sustain: 1.0, release: 0.08 },
    gain: 0.85, detune: 50, category: 'engine',
    harmonics: [1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.14], harmonicGains: [1, 0.85, 0.6, 0.35, 0.2, 0.1, 0.04]
  },
  engine_backfire: {
    frequency: 60, type: 'square', duration: 0.15, loop: false,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
    gain: 0.9, detune: -20, category: 'engine',
    pitchSweep: { start: 200, end: 40, time: 0.15 }
  },
  engine_startup: {
    frequency: 40, type: 'sawtooth', duration: 2.5, loop: false,
    envelope: { attack: 0.3, decay: 0.5, sustain: 0.6, release: 0.8 },
    gain: 0.7, detune: 0, category: 'engine',
    pitchSweep: { start: 40, end: 90, time: 2.5 }
  },
  engine_shutdown: {
    frequency: 90, type: 'sawtooth', duration: 2.0, loop: false,
    envelope: { attack: 0.05, decay: 0.2, sustain: 0.5, release: 1.5 },
    gain: 0.6, detune: 0, category: 'engine',
    pitchSweep: { start: 90, end: 20, time: 2.0 }
  },

  // --- Tire / Traction Sounds ---
  tire_squeal_light: {
    frequency: 800, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 },
    gain: 0.3, detune: 0, category: 'tires',
    filter: { type: 'bandpass', frequency: 1200, Q: 3.0 }
  },
  tire_squeal_heavy: {
    frequency: 1100, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.02, decay: 0.05, sustain: 0.9, release: 0.15 },
    gain: 0.55, detune: 0, category: 'tires',
    filter: { type: 'bandpass', frequency: 1600, Q: 4.5 }
  },
  tire_drift: {
    frequency: 650, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.08, decay: 0.15, sustain: 0.8, release: 0.3 },
    gain: 0.45, detune: 0, category: 'tires',
    filter: { type: 'bandpass', frequency: 900, Q: 2.5 }
  },
  tire_on_gravel: {
    frequency: 400, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.1, decay: 0.2, sustain: 0.6, release: 0.4 },
    gain: 0.35, detune: 0, category: 'tires',
    filter: { type: 'highpass', frequency: 300, Q: 1.0 }
  },
  tire_on_mud: {
    frequency: 200, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.15, decay: 0.3, sustain: 0.5, release: 0.5 },
    gain: 0.3, detune: 0, category: 'tires',
    filter: { type: 'lowpass', frequency: 600, Q: 1.5 }
  },
  tire_on_ice: {
    frequency: 1200, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.2, decay: 0.4, sustain: 0.4, release: 0.6 },
    gain: 0.2, detune: 0, category: 'tires',
    filter: { type: 'highpass', frequency: 900, Q: 2.0 }
  },

  // --- Collision / Impact Sounds ---
  crash_light: {
    frequency: 150, type: 'square', duration: 0.4, loop: false,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.3 },
    gain: 0.7, detune: 0, category: 'collision',
    pitchSweep: { start: 300, end: 80, time: 0.4 },
    distortion: 0.4
  },
  crash_medium: {
    frequency: 100, type: 'square', duration: 0.7, loop: false,
    envelope: { attack: 0.001, decay: 0.15, sustain: 0.25, release: 0.5 },
    gain: 0.85, detune: 0, category: 'collision',
    pitchSweep: { start: 250, end: 50, time: 0.7 },
    distortion: 0.6
  },
  crash_heavy: {
    frequency: 60, type: 'square', duration: 1.2, loop: false,
    envelope: { attack: 0.001, decay: 0.2, sustain: 0.3, release: 0.8 },
    gain: 1.0, detune: 0, category: 'collision',
    pitchSweep: { start: 200, end: 30, time: 1.2 },
    distortion: 0.8
  },
  crash_debris: {
    frequency: 500, type: 'white_noise', duration: 0.6, loop: false,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.5 },
    gain: 0.6, detune: 0, category: 'collision',
    filter: { type: 'highpass', frequency: 800, Q: 1.0 }
  },
  collision_metal: {
    frequency: 220, type: 'triangle', duration: 0.5, loop: false,
    envelope: { attack: 0.001, decay: 0.12, sustain: 0.15, release: 0.35 },
    gain: 0.75, detune: 0, category: 'collision',
    harmonics: [1, 2.76, 5.4, 8.93], harmonicGains: [1, 0.5, 0.25, 0.1]
  },
  collision_wood: {
    frequency: 180, type: 'triangle', duration: 0.35, loop: false,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0.1, release: 0.25 },
    gain: 0.65, detune: 0, category: 'collision',
    harmonics: [1, 2.1, 3.8], harmonicGains: [1, 0.4, 0.15]
  },
  collision_rock: {
    frequency: 90, type: 'square', duration: 0.45, loop: false,
    envelope: { attack: 0.001, decay: 0.1, sustain: 0.2, release: 0.3 },
    gain: 0.8, detune: 0, category: 'collision',
    distortion: 0.5
  },

  // --- Suspension / Chassis ---
  suspension_compress: {
    frequency: 60, type: 'sine', duration: 0.2, loop: false,
    envelope: { attack: 0.005, decay: 0.1, sustain: 0.0, release: 0.1 },
    gain: 0.4, detune: 0, category: 'suspension'
  },
  suspension_rebound: {
    frequency: 80, type: 'sine', duration: 0.25, loop: false,
    envelope: { attack: 0.005, decay: 0.12, sustain: 0.0, release: 0.13 },
    gain: 0.35, detune: 0, category: 'suspension'
  },
  chassis_creak: {
    frequency: 280, type: 'sawtooth', duration: 0.3, loop: false,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.05, release: 0.2 },
    gain: 0.25, detune: 0, category: 'suspension',
    filter: { type: 'bandpass', frequency: 400, Q: 2.0 }
  },
  spring_bounce: {
    frequency: 120, type: 'sine', duration: 0.4, loop: false,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.3 },
    gain: 0.3, detune: 0, category: 'suspension'
  },

  // --- Transmission / Gearbox ---
  gear_shift_up: {
    frequency: 400, type: 'triangle', duration: 0.1, loop: false,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0.0, release: 0.06 },
    gain: 0.5, detune: 0, category: 'transmission',
    pitchSweep: { start: 300, end: 500, time: 0.08 }
  },
  gear_shift_down: {
    frequency: 350, type: 'triangle', duration: 0.1, loop: false,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0.0, release: 0.06 },
    gain: 0.5, detune: 0, category: 'transmission',
    pitchSweep: { start: 500, end: 280, time: 0.1 }
  },
  clutch_engage: {
    frequency: 200, type: 'white_noise', duration: 0.15, loop: false,
    envelope: { attack: 0.02, decay: 0.05, sustain: 0.3, release: 0.1 },
    gain: 0.3, detune: 0, category: 'transmission',
    filter: { type: 'bandpass', frequency: 600, Q: 2.5 }
  },
  transmission_whine: {
    frequency: 1800, type: 'sine', duration: 0, loop: true,
    envelope: { attack: 0.2, decay: 0.3, sustain: 0.7, release: 0.4 },
    gain: 0.15, detune: 0, category: 'transmission'
  },

  // --- Nitro / Boost ---
  nitro_activate: {
    frequency: 3000, type: 'white_noise', duration: 0.3, loop: false,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.2 },
    gain: 0.7, detune: 0, category: 'boost',
    filter: { type: 'highpass', frequency: 2000, Q: 1.0 }
  },
  nitro_loop: {
    frequency: 2500, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.2 },
    gain: 0.55, detune: 0, category: 'boost',
    filter: { type: 'bandpass', frequency: 3000, Q: 2.0 }
  },
  nitro_end: {
    frequency: 2000, type: 'white_noise', duration: 0.4, loop: false,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.3, release: 0.35 },
    gain: 0.5, detune: 0, category: 'boost',
    pitchSweep: { start: 3000, end: 500, time: 0.4 }
  },
  turbo_spool: {
    frequency: 600, type: 'sine', duration: 1.5, loop: false,
    envelope: { attack: 0.5, decay: 0.3, sustain: 0.8, release: 0.7 },
    gain: 0.4, detune: 0, category: 'boost',
    pitchSweep: { start: 200, end: 800, time: 1.5 }
  },
  turbo_blow_off: {
    frequency: 800, type: 'white_noise', duration: 0.5, loop: false,
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.2, release: 0.4 },
    gain: 0.6, detune: 0, category: 'boost',
    filter: { type: 'bandpass', frequency: 1500, Q: 3.0 }
  },

  // --- Environment / Ambient ---
  wind_low: {
    frequency: 100, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.5, decay: 0.5, sustain: 0.6, release: 0.8 },
    gain: 0.2, detune: 0, category: 'environment',
    filter: { type: 'bandpass', frequency: 200, Q: 0.8 }
  },
  wind_high: {
    frequency: 300, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 0.6 },
    gain: 0.35, detune: 0, category: 'environment',
    filter: { type: 'bandpass', frequency: 600, Q: 1.2 }
  },
  rain_light: {
    frequency: 2000, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 1.0, decay: 0.5, sustain: 0.5, release: 1.5 },
    gain: 0.25, detune: 0, category: 'environment',
    filter: { type: 'highpass', frequency: 1500, Q: 0.5 }
  },
  rain_heavy: {
    frequency: 2500, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.8, decay: 0.4, sustain: 0.7, release: 1.2 },
    gain: 0.45, detune: 0, category: 'environment',
    filter: { type: 'highpass', frequency: 800, Q: 0.5 }
  },
  thunder_rumble: {
    frequency: 40, type: 'white_noise', duration: 3.0, loop: false,
    envelope: { attack: 0.1, decay: 0.5, sustain: 0.4, release: 2.0 },
    gain: 0.8, detune: 0, category: 'environment',
    filter: { type: 'lowpass', frequency: 120, Q: 1.0 }
  },
  crowd_cheer: {
    frequency: 800, type: 'white_noise', duration: 2.0, loop: false,
    envelope: { attack: 0.3, decay: 0.4, sustain: 0.7, release: 0.8 },
    gain: 0.5, detune: 0, category: 'environment',
    filter: { type: 'bandpass', frequency: 1000, Q: 0.7 }
  },
  crowd_ambient: {
    frequency: 500, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 1.0, decay: 0.5, sustain: 0.4, release: 1.5 },
    gain: 0.2, detune: 0, category: 'environment',
    filter: { type: 'bandpass', frequency: 700, Q: 0.6 }
  },

  // --- UI / Feedback Sounds ---
  ui_click: {
    frequency: 1200, type: 'sine', duration: 0.05, loop: false,
    envelope: { attack: 0.001, decay: 0.02, sustain: 0.0, release: 0.03 },
    gain: 0.4, detune: 0, category: 'ui'
  },
  ui_hover: {
    frequency: 900, type: 'sine', duration: 0.04, loop: false,
    envelope: { attack: 0.001, decay: 0.015, sustain: 0.0, release: 0.025 },
    gain: 0.2, detune: 0, category: 'ui'
  },
  ui_confirm: {
    frequency: 660, type: 'triangle', duration: 0.2, loop: false,
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.4, release: 0.15 },
    gain: 0.5, detune: 0, category: 'ui',
    chord: [660, 830, 990]
  },
  ui_error: {
    frequency: 220, type: 'square', duration: 0.3, loop: false,
    envelope: { attack: 0.005, decay: 0.05, sustain: 0.5, release: 0.2 },
    gain: 0.5, detune: 0, category: 'ui',
    chord: [220, 233]
  },
  ui_countdown: {
    frequency: 880, type: 'sine', duration: 0.15, loop: false,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.1 },
    gain: 0.6, detune: 0, category: 'ui'
  },
  ui_race_start: {
    frequency: 1320, type: 'sine', duration: 0.3, loop: false,
    envelope: { attack: 0.001, decay: 0.05, sustain: 0.6, release: 0.2 },
    gain: 0.8, detune: 0, category: 'ui',
    chord: [1320, 1650, 1980]
  },
  ui_checkpoint: {
    frequency: 550, type: 'triangle', duration: 0.35, loop: false,
    envelope: { attack: 0.005, decay: 0.06, sustain: 0.5, release: 0.25 },
    gain: 0.6, detune: 0, category: 'ui',
    pitchSweep: { start: 440, end: 660, time: 0.2 }
  },
  ui_coins_collect: {
    frequency: 1760, type: 'triangle', duration: 0.12, loop: false,
    envelope: { attack: 0.001, decay: 0.04, sustain: 0.2, release: 0.08 },
    gain: 0.5, detune: 0, category: 'ui',
    pitchSweep: { start: 1320, end: 2200, time: 0.1 }
  },
  ui_level_up: {
    frequency: 440, type: 'triangle', duration: 0.8, loop: false,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.5 },
    gain: 0.7, detune: 0, category: 'ui',
    arpeggio: [440, 550, 660, 880], arpeggioSpeed: 0.12
  },
  ui_win_jingle: {
    frequency: 523, type: 'triangle', duration: 1.5, loop: false,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.7, release: 0.8 },
    gain: 0.75, detune: 0, category: 'ui',
    arpeggio: [523, 659, 784, 1047, 784, 659, 523], arpeggioSpeed: 0.15
  },
  ui_fail_jingle: {
    frequency: 392, type: 'triangle', duration: 1.2, loop: false,
    envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.8 },
    gain: 0.65, detune: 0, category: 'ui',
    arpeggio: [392, 349, 330, 294], arpeggioSpeed: 0.2
  },

  // --- Miscellaneous Vehicle Sounds ---
  horn_beep: {
    frequency: 440, type: 'square', duration: 0.4, loop: false,
    envelope: { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.15 },
    gain: 0.7, detune: 0, category: 'vehicle',
    chord: [440, 550]
  },
  exhaust_pop: {
    frequency: 80, type: 'square', duration: 0.08, loop: false,
    envelope: { attack: 0.001, decay: 0.03, sustain: 0.1, release: 0.05 },
    gain: 0.8, detune: 0, category: 'vehicle',
    distortion: 0.7
  },
  fuel_pickup: {
    frequency: 660, type: 'sine', duration: 0.3, loop: false,
    envelope: { attack: 0.01, decay: 0.06, sustain: 0.4, release: 0.2 },
    gain: 0.5, detune: 0, category: 'vehicle',
    pitchSweep: { start: 440, end: 880, time: 0.25 }
  },
  repair_pickup: {
    frequency: 330, type: 'triangle', duration: 0.4, loop: false,
    envelope: { attack: 0.01, decay: 0.08, sustain: 0.5, release: 0.25 },
    gain: 0.55, detune: 0, category: 'vehicle',
    chord: [330, 415, 495]
  },
  vehicle_scrape: {
    frequency: 300, type: 'white_noise', duration: 0, loop: true,
    envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.2 },
    gain: 0.35, detune: 0, category: 'vehicle',
    filter: { type: 'bandpass', frequency: 500, Q: 2.0 }
  },
  wheelie_land: {
    frequency: 120, type: 'sawtooth', duration: 0.3, loop: false,
    envelope: { attack: 0.001, decay: 0.08, sustain: 0.2, release: 0.2 },
    gain: 0.6, detune: 0, category: 'vehicle',
    pitchSweep: { start: 200, end: 80, time: 0.25 }
  }
};

// ============================================================
// MUSIC_TRACKS — 8 Music Track Definitions
// ============================================================
const MUSIC_TRACKS = {
  main_menu: {
    id: 'main_menu',
    title: 'Asphalt Dreams',
    bpm: 125,
    key: 'Am',
    timeSignature: [4, 4],
    duration: 180,
    loopStart: 8.0,
    loopEnd: 172.0,
    layers: [
      { name: 'bass',    gain: 0.6, pattern: 'bass_main_menu',    instrument: 'synth_bass' },
      { name: 'drums',   gain: 0.7, pattern: 'drums_main_menu',   instrument: 'drum_kit_1' },
      { name: 'melody',  gain: 0.5, pattern: 'melody_main_menu',  instrument: 'lead_synth' },
      { name: 'pads',    gain: 0.3, pattern: 'pads_main_menu',    instrument: 'pad_synth' },
      { name: 'fx',      gain: 0.2, pattern: 'fx_main_menu',      instrument: 'fx_synth' }
    ],
    transitions: { in: 'fade', out: 'fade', crossfadeDuration: 2.0 },
    tags: ['menu', 'upbeat', 'electronic'],
    adaptiveSections: [
      { name: 'intro',  startTime: 0,    endTime: 16,   energy: 0.3 },
      { name: 'build',  startTime: 16,   endTime: 48,   energy: 0.5 },
      { name: 'main',   startTime: 48,   endTime: 128,  energy: 0.8 },
      { name: 'outro',  startTime: 128,  endTime: 180,  energy: 0.4 }
    ]
  },
  race_standard: {
    id: 'race_standard',
    title: 'Full Throttle',
    bpm: 160,
    key: 'Em',
    timeSignature: [4, 4],
    duration: 240,
    loopStart: 4.0,
    loopEnd: 236.0,
    layers: [
      { name: 'bass',    gain: 0.7, pattern: 'bass_race',    instrument: 'synth_bass' },
      { name: 'drums',   gain: 0.8, pattern: 'drums_race',   instrument: 'drum_kit_2' },
      { name: 'guitar',  gain: 0.6, pattern: 'guitar_race',  instrument: 'distorted_guitar' },
      { name: 'synth',   gain: 0.5, pattern: 'synth_race',   instrument: 'lead_synth' },
      { name: 'strings', gain: 0.3, pattern: 'strings_race', instrument: 'string_ensemble' },
      { name: 'fx',      gain: 0.25, pattern: 'fx_race',     instrument: 'fx_synth' }
    ],
    transitions: { in: 'instant', out: 'fade', crossfadeDuration: 1.5 },
    tags: ['race', 'intense', 'rock', 'electronic'],
    adaptiveSections: [
      { name: 'start',  startTime: 0,   endTime: 8,   energy: 0.6 },
      { name: 'verse',  startTime: 8,   endTime: 64,  energy: 0.8 },
      { name: 'chorus', startTime: 64,  endTime: 128, energy: 1.0 },
      { name: 'break',  startTime: 128, endTime: 160, energy: 0.7 },
      { name: 'finale', startTime: 160, endTime: 240, energy: 1.0 }
    ]
  },
  race_offroad: {
    id: 'race_offroad',
    title: 'Dirt Devil',
    bpm: 145,
    key: 'Dm',
    timeSignature: [4, 4],
    duration: 210,
    loopStart: 4.0,
    loopEnd: 206.0,
    layers: [
      { name: 'bass',    gain: 0.65, pattern: 'bass_offroad',    instrument: 'distorted_bass' },
      { name: 'drums',   gain: 0.85, pattern: 'drums_offroad',   instrument: 'drum_kit_3' },
      { name: 'guitar',  gain: 0.7,  pattern: 'guitar_offroad',  instrument: 'distorted_guitar' },
      { name: 'brass',   gain: 0.4,  pattern: 'brass_offroad',   instrument: 'brass_section' },
      { name: 'perc',    gain: 0.5,  pattern: 'perc_offroad',    instrument: 'percussion' }
    ],
    transitions: { in: 'cut', out: 'fade', crossfadeDuration: 1.0 },
    tags: ['race', 'offroad', 'heavy', 'rock'],
    adaptiveSections: [
      { name: 'intro',  startTime: 0,   endTime: 16,  energy: 0.5 },
      { name: 'main',   startTime: 16,  endTime: 128, energy: 0.9 },
      { name: 'bridge', startTime: 128, endTime: 160, energy: 0.65 },
      { name: 'outro',  startTime: 160, endTime: 210, energy: 0.85 }
    ]
  },
  race_night: {
    id: 'race_night',
    title: 'Neon Rush',
    bpm: 138,
    key: 'Gm',
    timeSignature: [4, 4],
    duration: 195,
    loopStart: 8.0,
    loopEnd: 187.0,
    layers: [
      { name: 'bass',   gain: 0.6, pattern: 'bass_night',   instrument: 'synth_bass' },
      { name: 'drums',  gain: 0.7, pattern: 'drums_night',  instrument: 'drum_machine_1' },
      { name: 'synth1', gain: 0.55, pattern: 'synth1_night', instrument: 'retro_synth' },
      { name: 'synth2', gain: 0.4, pattern: 'synth2_night', instrument: 'lead_synth' },
      { name: 'arp',    gain: 0.35, pattern: 'arp_night',   instrument: 'arp_synth' }
    ],
    transitions: { in: 'fade', out: 'fade', crossfadeDuration: 2.5 },
    tags: ['race', 'night', 'synthwave', 'electronic'],
    adaptiveSections: [
      { name: 'intro',  startTime: 0,   endTime: 24,  energy: 0.4 },
      { name: 'groove', startTime: 24,  endTime: 96,  energy: 0.75 },
      { name: 'drop',   startTime: 96,  endTime: 144, energy: 1.0 },
      { name: 'outro',  startTime: 144, endTime: 195, energy: 0.5 }
    ]
  },
  victory: {
    id: 'victory',
    title: "Champion's Fanfare",
    bpm: 140,
    key: 'C',
    timeSignature: [4, 4],
    duration: 30,
    loopStart: -1,
    loopEnd: -1,
    layers: [
      { name: 'brass',   gain: 0.8, pattern: 'brass_victory',   instrument: 'brass_section' },
      { name: 'strings', gain: 0.6, pattern: 'strings_victory', instrument: 'string_ensemble' },
      { name: 'drums',   gain: 0.7, pattern: 'drums_victory',   instrument: 'orchestral_perc' },
      { name: 'choir',   gain: 0.4, pattern: 'choir_victory',   instrument: 'choir' }
    ],
    transitions: { in: 'instant', out: 'fade', crossfadeDuration: 3.0 },
    tags: ['victory', 'orchestral', 'fanfare'],
    adaptiveSections: [
      { name: 'fanfare', startTime: 0,  endTime: 8,  energy: 0.9 },
      { name: 'main',    startTime: 8,  endTime: 22, energy: 1.0 },
      { name: 'end',     startTime: 22, endTime: 30, energy: 0.7 }
    ]
  },
  defeat: {
    id: 'defeat',
    title: 'Back to the Garage',
    bpm: 80,
    key: 'Cm',
    timeSignature: [4, 4],
    duration: 20,
    loopStart: -1,
    loopEnd: -1,
    layers: [
      { name: 'strings', gain: 0.6, pattern: 'strings_defeat', instrument: 'string_ensemble' },
      { name: 'piano',   gain: 0.5, pattern: 'piano_defeat',   instrument: 'piano' },
      { name: 'bass',    gain: 0.4, pattern: 'bass_defeat',    instrument: 'double_bass' }
    ],
    transitions: { in: 'fade', out: 'fade', crossfadeDuration: 2.0 },
    tags: ['defeat', 'orchestral', 'somber'],
    adaptiveSections: [
      { name: 'sting', startTime: 0,  endTime: 4,  energy: 0.7 },
      { name: 'fade',  startTime: 4,  endTime: 20, energy: 0.3 }
    ]
  },
  garage: {
    id: 'garage',
    title: 'Wrench Wizard',
    bpm: 95,
    key: 'F',
    timeSignature: [4, 4],
    duration: 150,
    loopStart: 4.0,
    loopEnd: 146.0,
    layers: [
      { name: 'bass',  gain: 0.5,  pattern: 'bass_garage',  instrument: 'funk_bass' },
      { name: 'drums', gain: 0.6,  pattern: 'drums_garage', instrument: 'drum_kit_4' },
      { name: 'piano', gain: 0.55, pattern: 'piano_garage', instrument: 'electric_piano' },
      { name: 'guitar',gain: 0.45, pattern: 'guitar_garage',instrument: 'clean_guitar' }
    ],
    transitions: { in: 'fade', out: 'fade', crossfadeDuration: 2.0 },
    tags: ['garage', 'funk', 'relaxed'],
    adaptiveSections: [
      { name: 'chill', startTime: 0,  endTime: 75,  energy: 0.5 },
      { name: 'grove', startTime: 75, endTime: 150, energy: 0.65 }
    ]
  },
  loading: {
    id: 'loading',
    title: 'Loading Bay',
    bpm: 110,
    key: 'Dm',
    timeSignature: [4, 4],
    duration: 60,
    loopStart: 0.0,
    loopEnd: 60.0,
    layers: [
      { name: 'ambient', gain: 0.4, pattern: 'ambient_loading', instrument: 'pad_synth' },
      { name: 'perc',    gain: 0.3, pattern: 'perc_loading',    instrument: 'percussion' },
      { name: 'bass',    gain: 0.35, pattern: 'bass_loading',   instrument: 'synth_bass' }
    ],
    transitions: { in: 'fade', out: 'fade', crossfadeDuration: 1.0 },
    tags: ['loading', 'ambient', 'electronic'],
    adaptiveSections: [
      { name: 'loop', startTime: 0, endTime: 60, energy: 0.4 }
    ]
  }
};

// ============================================================
// AUDIO_MIXER — Channel Management System
// ============================================================
const AUDIO_MIXER = {
  _context: null,
  _masterGain: null,
  _channels: {},
  _sends: {},
  _returns: {},
  _automations: [],

  CHANNEL_DEFS: {
    master:      { gain: 1.0, muted: false, solo: false, sends: [] },
    music:       { gain: 0.75, muted: false, solo: false, sends: ['reverb_return', 'delay_return'], pan: 0 },
    sfx:         { gain: 0.85, muted: false, solo: false, sends: ['reverb_return'], pan: 0 },
    engine:      { gain: 0.9,  muted: false, solo: false, sends: ['reverb_return'], pan: 0 },
    environment: { gain: 0.65, muted: false, solo: false, sends: ['reverb_return', 'delay_return'], pan: 0 },
    ui:          { gain: 0.7,  muted: false, solo: false, sends: [], pan: 0 },
    voice:       { gain: 0.95, muted: false, solo: false, sends: [], pan: 0 }
  },

  BUS_DEFS: {
    reverb_send:  { gain: 0.3, type: 'send' },
    delay_send:   { gain: 0.2, type: 'send' },
    reverb_return:{ gain: 0.8, type: 'return' },
    delay_return: { gain: 0.6, type: 'return' }
  },

  EQ_PRESETS: {
    flat:     [0,0,0,0,0,0,0,0,0,0],
    bass_boost: [4,3,2,1,0,0,0,0,0,0],
    presence: [0,0,0,0,2,3,4,3,2,0],
    air:      [0,0,0,0,0,1,2,3,4,5],
    warmth:   [2,2,1,0,-1,-1,0,0,0,0]
  },

  COMPRESSOR_PRESETS: {
    gentle:    { threshold: -18, knee: 6,  ratio: 2,   attack: 30,  release: 200 },
    moderate:  { threshold: -24, knee: 4,  ratio: 4,   attack: 10,  release: 100 },
    aggressive:{ threshold: -30, knee: 2,  ratio: 8,   attack: 3,   release: 50  },
    limiter:   { threshold: -3,  knee: 0,  ratio: 20,  attack: 0.1, release: 10  },
    bus:       { threshold: -12, knee: 8,  ratio: 2.5, attack: 20,  release: 150 }
  },

  init(audioContext) {
    this._context = audioContext;
    this._masterGain = audioContext.createGain();
    this._masterGain.gain.value = this.CHANNEL_DEFS.master.gain;
    this._masterGain.connect(audioContext.destination);
    Object.keys(this.CHANNEL_DEFS).forEach(name => {
      if (name !== 'master') this._createChannel(name);
    });
    Object.keys(this.BUS_DEFS).forEach(name => {
      this._createBus(name);
    });
    return this;
  },

  _createChannel(name) {
    const def = this.CHANNEL_DEFS[name];
    const ctx = this._context;
    const gainNode = ctx.createGain();
    gainNode.gain.value = def.muted ? 0 : def.gain;
    const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panNode) {
      panNode.pan.value = def.pan || 0;
      gainNode.connect(panNode);
      panNode.connect(this._masterGain);
    } else {
      gainNode.connect(this._masterGain);
    }
    this._channels[name] = { gainNode, panNode, def: { ...def }, peakLevel: 0, rmsLevel: 0 };
    return this._channels[name];
  },

  _createBus(name) {
    const def = this.BUS_DEFS[name];
    const ctx = this._context;
    const gainNode = ctx.createGain();
    gainNode.gain.value = def.gain;
    gainNode.connect(this._masterGain);
    this._sends[name] = { gainNode, def: { ...def } };
    return this._sends[name];
  },

  setChannelGain(channel, gain, rampTime = 0.05) {
    const ch = this._channels[channel];
    if (!ch) return false;
    ch.def.gain = gain;
    if (!ch.def.muted) {
      ch.gainNode.gain.linearRampToValueAtTime(gain, this._context.currentTime + rampTime);
    }
    return true;
  },

  muteChannel(channel, muted) {
    const ch = this._channels[channel];
    if (!ch) return false;
    ch.def.muted = muted;
    const target = muted ? 0 : ch.def.gain;
    ch.gainNode.gain.linearRampToValueAtTime(target, this._context.currentTime + 0.05);
    return true;
  },

  soloChannel(channel) {
    Object.keys(this._channels).forEach(name => {
      const ch = this._channels[name];
      ch.def.solo = (name === channel);
      const anySolo = Object.values(this._channels).some(c => c.def.solo);
      const shouldMute = anySolo && !ch.def.solo;
      const target = (shouldMute || ch.def.muted) ? 0 : ch.def.gain;
      ch.gainNode.gain.linearRampToValueAtTime(target, this._context.currentTime + 0.05);
    });
  },

  setMasterVolume(volume, rampTime = 0.1) {
    this._masterGain.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this._context.currentTime + rampTime
    );
  },

  setPan(channel, pan, rampTime = 0.05) {
    const ch = this._channels[channel];
    if (!ch || !ch.panNode) return false;
    pan = Math.max(-1, Math.min(1, pan));
    ch.panNode.pan.linearRampToValueAtTime(pan, this._context.currentTime + rampTime);
    ch.def.pan = pan;
    return true;
  },

  scheduleAutomation(param, values, startTime, endTime) {
    const ctx = this._context;
    const timeStep = (endTime - startTime) / values.length;
    values.forEach((v, i) => {
      param.linearRampToValueAtTime(v, ctx.currentTime + startTime + i * timeStep);
    });
    this._automations.push({ param, values, startTime, endTime });
  },

  getChannelState(channel) {
    const ch = this._channels[channel];
    if (!ch) return null;
    return {
      gain: ch.def.gain,
      muted: ch.def.muted,
      solo: ch.def.solo,
      pan: ch.def.pan || 0,
      peakLevel: ch.peakLevel,
      rmsLevel: ch.rmsLevel
    };
  },

  getMasterState() {
    return {
      gain: this._masterGain ? this._masterGain.gain.value : 1.0,
      channels: Object.fromEntries(
        Object.keys(this._channels).map(k => [k, this.getChannelState(k)])
      )
    };
  }
};

// ============================================================
// ENGINE_SOUND_SYSTEM — Advanced Harmonics Engine
// ============================================================
const ENGINE_SOUND_SYSTEM = {
  _context: null,
  _oscillators: [],
  _gainNodes: [],
  _filterNodes: [],
  _running: false,
  _currentRPM: 800,
  _targetRPM: 800,
  _currentThrottle: 0,
  _currentGear: 1,

  CONFIG: {
    idleRPM: 800,
    maxRPM: 8500,
    redlineRPM: 7500,
    rpmSmoothingFactor: 0.08,
    baseFrequency: 40,
    harmonicCount: 8,
    harmonicWeights: [1.0, 0.8, 0.5, 0.35, 0.2, 0.15, 0.08, 0.04],
    harmonicDetune: [0, 2, -3, 5, -2, 4, -5, 3],
    fundamentalGain: 0.45,
    overallGain: 0.7,
    filterCutoffIdle: 500,
    filterCutoffMax: 3000,
    filterResonance: 3.5,
    throttleResponseTime: 0.12
  },

  GEAR_RATIOS: [0, 3.5, 2.1, 1.5, 1.1, 0.85, 0.7],

  RPM_TO_FREQ_TABLE: [
    { rpm: 800,  freq: 40 },
    { rpm: 1500, freq: 72 },
    { rpm: 2500, freq: 118 },
    { rpm: 3500, freq: 165 },
    { rpm: 4500, freq: 212 },
    { rpm: 5500, freq: 258 },
    { rpm: 6500, freq: 305 },
    { rpm: 7500, freq: 352 },
    { rpm: 8500, freq: 400 }
  ],

  THROTTLE_GAIN_CURVE: [
    { throttle: 0.0,  gain: 0.35 },
    { throttle: 0.1,  gain: 0.40 },
    { throttle: 0.25, gain: 0.50 },
    { throttle: 0.5,  gain: 0.60 },
    { throttle: 0.75, gain: 0.72 },
    { throttle: 0.9,  gain: 0.82 },
    { throttle: 1.0,  gain: 0.90 }
  ],

  init(audioContext) {
    this._context = audioContext;
    this._masterGain = audioContext.createGain();
    this._masterGain.gain.value = this.CONFIG.overallGain;
    this._masterGain.connect(audioContext.destination);
    this._filter = audioContext.createBiquadFilter();
    this._filter.type = 'lowpass';
    this._filter.frequency.value = this.CONFIG.filterCutoffIdle;
    this._filter.Q.value = this.CONFIG.filterResonance;
    this._filter.connect(this._masterGain);
    this._distortion = audioContext.createWaveShaper();
    this._distortion.curve = this._makeDistortionCurve(20);
    this._distortion.connect(this._filter);
    this._buildOscillators();
    return this;
  },

  _makeDistortionCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  },

  _buildOscillators() {
    const ctx = this._context;
    const cfg = this.CONFIG;
    for (let h = 0; h < cfg.harmonicCount; h++) {
      const osc = ctx.createOscillator();
      osc.type = h < 2 ? 'sawtooth' : (h < 5 ? 'square' : 'triangle');
      osc.frequency.value = cfg.baseFrequency * (h + 1);
      osc.detune.value = cfg.harmonicDetune[h] || 0;
      const gain = ctx.createGain();
      gain.gain.value = cfg.harmonicWeights[h] * cfg.fundamentalGain;
      osc.connect(gain);
      gain.connect(this._distortion);
      this._oscillators.push(osc);
      this._gainNodes.push(gain);
    }
  },

  start() {
    if (this._running) return;
    this._oscillators.forEach(osc => {
      try { osc.start(); } catch(e) {}
    });
    this._running = true;
    this._tick();
  },

  stop() {
    this._running = false;
    this._oscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
  },

  setRPM(rpm, immediate = false) {
    rpm = Math.max(this.CONFIG.idleRPM, Math.min(this.CONFIG.maxRPM, rpm));
    this._targetRPM = rpm;
    if (immediate) {
      this._currentRPM = rpm;
      this._applyRPM(rpm);
    }
  },

  setThrottle(throttle) {
    this._currentThrottle = Math.max(0, Math.min(1, throttle));
  },

  setGear(gear) {
    this._currentGear = Math.max(1, Math.min(6, gear));
  },

  _rpmToFrequency(rpm) {
    const table = this.RPM_TO_FREQ_TABLE;
    if (rpm <= table[0].rpm) return table[0].freq;
    if (rpm >= table[table.length-1].rpm) return table[table.length-1].freq;
    for (let i = 0; i < table.length - 1; i++) {
      if (rpm >= table[i].rpm && rpm <= table[i+1].rpm) {
        const t = (rpm - table[i].rpm) / (table[i+1].rpm - table[i].rpm);
        return table[i].freq + t * (table[i+1].freq - table[i].freq);
      }
    }
    return this.CONFIG.baseFrequency;
  },

  _throttleToGain(throttle) {
    const curve = this.THROTTLE_GAIN_CURVE;
    if (throttle <= curve[0].throttle) return curve[0].gain;
    if (throttle >= curve[curve.length-1].throttle) return curve[curve.length-1].gain;
    for (let i = 0; i < curve.length - 1; i++) {
      if (throttle >= curve[i].throttle && throttle <= curve[i+1].throttle) {
        const t = (throttle - curve[i].throttle) / (curve[i+1].throttle - curve[i].throttle);
        return curve[i].gain + t * (curve[i+1].gain - curve[i].gain);
      }
    }
    return 0.5;
  },

  _applyRPM(rpm) {
    const ctx = this._context;
    const now = ctx.currentTime;
    const baseFreq = this._rpmToFrequency(rpm);
    const gain = this._throttleToGain(this._currentThrottle);
    const filterFreq = this.CONFIG.filterCutoffIdle +
      ((rpm - this.CONFIG.idleRPM) / (this.CONFIG.maxRPM - this.CONFIG.idleRPM)) *
      (this.CONFIG.filterCutoffMax - this.CONFIG.filterCutoffIdle);
    this._oscillators.forEach((osc, h) => {
      osc.frequency.linearRampToValueAtTime(baseFreq * (h + 1), now + 0.05);
    });
    this._gainNodes.forEach((gn, h) => {
      gn.gain.linearRampToValueAtTime(
        this.CONFIG.harmonicWeights[h] * gain,
        now + this.CONFIG.throttleResponseTime
      );
    });
    this._filter.frequency.linearRampToValueAtTime(filterFreq, now + 0.08);
    if (rpm >= this.CONFIG.redlineRPM) {
      this._distortion.curve = this._makeDistortionCurve(60);
    } else {
      const amount = 20 + ((rpm - this.CONFIG.idleRPM) / this.CONFIG.maxRPM) * 40;
      this._distortion.curve = this._makeDistortionCurve(amount);
    }
  },

  _tick() {
    if (!this._running) return;
    const smooth = this.CONFIG.rpmSmoothingFactor;
    this._currentRPM += (this._targetRPM - this._currentRPM) * smooth;
    this._applyRPM(this._currentRPM);
    requestAnimationFrame(() => this._tick());
  },

  getState() {
    return {
      running: this._running,
      currentRPM: Math.round(this._currentRPM),
      targetRPM: this._targetRPM,
      throttle: this._currentThrottle,
      gear: this._currentGear,
      frequency: this._rpmToFrequency(this._currentRPM)
    };
  }
};

// ============================================================
// SPATIAL_AUDIO — 3D Positional Audio System
// ============================================================
const SPATIAL_AUDIO = {
  _context: null,
  _listener: null,
  _pannerNodes: {},
  _sourceNodes: {},
  _running: false,

  CONFIG: {
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    refDistance: 5,
    maxDistance: 500,
    rolloffFactor: 1.5,
    coneInnerAngle: 360,
    coneOuterAngle: 0,
    coneOuterGain: 0,
    dopplerFactor: 1.0,
    speedOfSound: 343.3,
    listenerHeight: 1.6
  },

  _listenerPosition: { x: 0, y: 1.6, z: 0 },
  _listenerOrientation: { forward: { x: 0, y: 0, z: -1 }, up: { x: 0, y: 1, z: 0 } },
  _listenerVelocity: { x: 0, y: 0, z: 0 },
  _sources: {},

  init(audioContext) {
    this._context = audioContext;
    this._listener = audioContext.listener;
    this._applyListenerConfig();
    return this;
  },

  _applyListenerConfig() {
    const l = this._listener;
    const cfg = this.CONFIG;
    if (l.positionX) {
      l.positionX.value = this._listenerPosition.x;
      l.positionY.value = this._listenerPosition.y;
      l.positionZ.value = this._listenerPosition.z;
      l.forwardX.value  = this._listenerOrientation.forward.x;
      l.forwardY.value  = this._listenerOrientation.forward.y;
      l.forwardZ.value  = this._listenerOrientation.forward.z;
      l.upX.value = this._listenerOrientation.up.x;
      l.upY.value = this._listenerOrientation.up.y;
      l.upZ.value = this._listenerOrientation.up.z;
    } else {
      l.setPosition(this._listenerPosition.x, this._listenerPosition.y, this._listenerPosition.z);
      l.setOrientation(
        this._listenerOrientation.forward.x, this._listenerOrientation.forward.y, this._listenerOrientation.forward.z,
        this._listenerOrientation.up.x, this._listenerOrientation.up.y, this._listenerOrientation.up.z
      );
    }
  },

  updateListenerPosition(x, y, z, forwardX = 0, forwardY = 0, forwardZ = -1) {
    this._listenerPosition = { x, y: y + this.CONFIG.listenerHeight, z };
    this._listenerOrientation.forward = { x: forwardX, y: forwardY, z: forwardZ };
    this._applyListenerConfig();
  },

  createSource(id, options = {}) {
    const ctx = this._context;
    const cfg = this.CONFIG;
    const panner = ctx.createPanner();
    panner.panningModel = options.panningModel || cfg.panningModel;
    panner.distanceModel = options.distanceModel || cfg.distanceModel;
    panner.refDistance = options.refDistance || cfg.refDistance;
    panner.maxDistance = options.maxDistance || cfg.maxDistance;
    panner.rolloffFactor = options.rolloffFactor || cfg.rolloffFactor;
    panner.coneInnerAngle = options.coneInnerAngle || cfg.coneInnerAngle;
    panner.coneOuterAngle = options.coneOuterAngle || cfg.coneOuterAngle;
    panner.coneOuterGain = options.coneOuterGain || cfg.coneOuterGain;
    const gainNode = ctx.createGain();
    gainNode.gain.value = options.gain || 1.0;
    gainNode.connect(panner);
    panner.connect(ctx.destination);
    this._sources[id] = {
      panner, gainNode,
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      options: { ...options }
    };
    return { panner, gainNode };
  },

  updateSourcePosition(id, x, y, z, vx = 0, vy = 0, vz = 0) {
    const src = this._sources[id];
    if (!src) return false;
    src.position = { x, y, z };
    src.velocity = { x: vx, y: vy, z: vz };
    const p = src.panner;
    if (p.positionX) {
      p.positionX.value = x;
      p.positionY.value = y;
      p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    return true;
  },

  setSourceGain(id, gain, rampTime = 0.05) {
    const src = this._sources[id];
    if (!src) return false;
    src.gainNode.gain.linearRampToValueAtTime(gain, this._context.currentTime + rampTime);
    return true;
  },

  removeSource(id) {
    const src = this._sources[id];
    if (!src) return false;
    try {
      src.gainNode.disconnect();
      src.panner.disconnect();
    } catch(e) {}
    delete this._sources[id];
    return true;
  },

  calculateDistance(id) {
    const src = this._sources[id];
    if (!src) return Infinity;
    const lp = this._listenerPosition;
    const sp = src.position;
    return Math.sqrt(
      Math.pow(lp.x - sp.x, 2) +
      Math.pow(lp.y - sp.y, 2) +
      Math.pow(lp.z - sp.z, 2)
    );
  },

  getState() {
    return {
      listenerPosition: { ...this._listenerPosition },
      listenerOrientation: { ...this._listenerOrientation },
      sourceCount: Object.keys(this._sources).length,
      sources: Object.fromEntries(
        Object.entries(this._sources).map(([id, src]) => [id, {
          position: src.position,
          velocity: src.velocity,
          distance: this.calculateDistance(id)
        }])
      )
    };
  }
};

// ============================================================
// REVERB_SYSTEM — Convolution + Algorithmic Reverb
// ============================================================
const REVERB_SYSTEM = {
  _context: null,
  _convolver: null,
  _dryGain: null,
  _wetGain: null,
  _preDelay: null,
  _currentPreset: 'medium_hall',

  PRESETS: {
    dry: {
      name: 'Dry',
      wetAmount: 0.0,
      dryAmount: 1.0,
      preDelayTime: 0.0,
      decayTime: 0.1,
      roomSize: 0.0,
      damping: 0.5,
      diffusion: 0.5,
      earlyReflections: 0.0,
      lateReverb: 0.0,
      lowCut: 200,
      highCut: 8000
    },
    small_room: {
      name: 'Small Room',
      wetAmount: 0.2,
      dryAmount: 0.9,
      preDelayTime: 0.005,
      decayTime: 0.4,
      roomSize: 0.15,
      damping: 0.7,
      diffusion: 0.6,
      earlyReflections: 0.6,
      lateReverb: 0.4,
      lowCut: 300,
      highCut: 7000
    },
    medium_hall: {
      name: 'Medium Hall',
      wetAmount: 0.35,
      dryAmount: 0.85,
      preDelayTime: 0.02,
      decayTime: 1.2,
      roomSize: 0.4,
      damping: 0.5,
      diffusion: 0.75,
      earlyReflections: 0.5,
      lateReverb: 0.6,
      lowCut: 200,
      highCut: 6000
    },
    large_hall: {
      name: 'Large Hall',
      wetAmount: 0.5,
      dryAmount: 0.8,
      preDelayTime: 0.04,
      decayTime: 2.5,
      roomSize: 0.75,
      damping: 0.35,
      diffusion: 0.85,
      earlyReflections: 0.4,
      lateReverb: 0.75,
      lowCut: 150,
      highCut: 5000
    },
    cathedral: {
      name: 'Cathedral',
      wetAmount: 0.65,
      dryAmount: 0.7,
      preDelayTime: 0.08,
      decayTime: 5.0,
      roomSize: 0.95,
      damping: 0.2,
      diffusion: 0.9,
      earlyReflections: 0.3,
      lateReverb: 0.9,
      lowCut: 100,
      highCut: 4000
    },
    outdoor: {
      name: 'Outdoor',
      wetAmount: 0.15,
      dryAmount: 0.95,
      preDelayTime: 0.01,
      decayTime: 0.6,
      roomSize: 0.3,
      damping: 0.9,
      diffusion: 0.4,
      earlyReflections: 0.2,
      lateReverb: 0.3,
      lowCut: 400,
      highCut: 9000
    },
    tunnel: {
      name: 'Tunnel',
      wetAmount: 0.55,
      dryAmount: 0.75,
      preDelayTime: 0.015,
      decayTime: 1.8,
      roomSize: 0.5,
      damping: 0.4,
      diffusion: 0.7,
      earlyReflections: 0.7,
      lateReverb: 0.65,
      lowCut: 100,
      highCut: 3500
    },
    spring: {
      name: 'Spring',
      wetAmount: 0.45,
      dryAmount: 0.8,
      preDelayTime: 0.003,
      decayTime: 1.0,
      roomSize: 0.3,
      damping: 0.6,
      diffusion: 0.55,
      earlyReflections: 0.8,
      lateReverb: 0.5,
      lowCut: 250,
      highCut: 5500
    }
  },

  init(audioContext) {
    this._context = audioContext;
    this._preDelay = audioContext.createDelay(0.5);
    this._convolver = audioContext.createConvolver();
    this._dryGain = audioContext.createGain();
    this._wetGain = audioContext.createGain();
    this._lowCutFilter = audioContext.createBiquadFilter();
    this._lowCutFilter.type = 'highpass';
    this._highCutFilter = audioContext.createBiquadFilter();
    this._highCutFilter.type = 'lowpass';
    this._preDelay.connect(this._lowCutFilter);
    this._lowCutFilter.connect(this._highCutFilter);
    this._highCutFilter.connect(this._convolver);
    this._convolver.connect(this._wetGain);
    this._wetGain.connect(audioContext.destination);
    this._dryGain.connect(audioContext.destination);
    this.applyPreset('medium_hall');
    return this;
  },

  _generateImpulseResponse(preset) {
    const ctx = this._context;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * preset.decayTime);
    const buffer = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-6.91 * t / preset.decayTime);
        const early = i < sampleRate * 0.05 ? preset.earlyReflections : preset.lateReverb;
        const diffusion = 1 - preset.diffusion * (1 - Math.random());
        data[i] = (Math.random() * 2 - 1) * decay * early * diffusion;
      }
    }
    return buffer;
  },

  applyPreset(presetName, transitionTime = 0.3) {
    const preset = this.PRESETS[presetName];
    if (!preset || !this._context) return false;
    const ctx = this._context;
    const now = ctx.currentTime;
    this._preDelay.delayTime.linearRampToValueAtTime(preset.preDelayTime, now + transitionTime);
    this._dryGain.gain.linearRampToValueAtTime(preset.dryAmount, now + transitionTime);
    this._wetGain.gain.linearRampToValueAtTime(preset.wetAmount, now + transitionTime);
    this._lowCutFilter.frequency.linearRampToValueAtTime(preset.lowCut, now + transitionTime);
    this._highCutFilter.frequency.linearRampToValueAtTime(preset.highCut, now + transitionTime);
    if (preset.wetAmount > 0) {
      const irBuffer = this._generateImpulseResponse(preset);
      this._convolver.buffer = irBuffer;
    }
    this._currentPreset = presetName;
    return true;
  },

  setWetDryMix(wet, dry) {
    if (!this._wetGain) return;
    const now = this._context.currentTime;
    this._wetGain.gain.linearRampToValueAtTime(wet, now + 0.05);
    this._dryGain.gain.linearRampToValueAtTime(dry, now + 0.05);
  },

  getInput() { return this._preDelay; },

  getState() {
    return {
      preset: this._currentPreset,
      presetData: this.PRESETS[this._currentPreset]
    };
  }
};

// ============================================================
// SOUND_SCHEDULER — Timed & Event-Based Sound Scheduling
// ============================================================
const SOUND_SCHEDULER = {
  _context: null,
  _queue: [],
  _activeEvents: {},
  _eventIdCounter: 0,
  _running: false,
  _tickInterval: null,
  _bpm: 120,
  _beatsPerBar: 4,
  _currentBeat: 0,
  _currentBar: 0,
  _startTime: 0,

  PRIORITY: { LOW: 0, NORMAL: 1, HIGH: 2, CRITICAL: 3 },

  QUANTIZE: {
    NONE: 0,
    BEAT: 1,
    BAR: 2,
    HALF_BAR: 3,
    TWO_BARS: 4
  },

  _eventHandlers: {},

  init(audioContext) {
    this._context = audioContext;
    return this;
  },

  start(bpm = 120) {
    this._bpm = bpm;
    this._startTime = this._context.currentTime;
    this._running = true;
    this._tick();
    return this;
  },

  stop() {
    this._running = false;
    if (this._tickInterval) {
      clearInterval(this._tickInterval);
      this._tickInterval = null;
    }
    this._queue = [];
  },

  setBPM(bpm) {
    this._bpm = Math.max(20, Math.min(300, bpm));
  },

  _beatDuration() { return 60.0 / this._bpm; },
  _barDuration()  { return this._beatDuration() * this._beatsPerBar; },

  _quantizeTime(time, quantize) {
    if (quantize === this.QUANTIZE.NONE) return time;
    const ctx = this._context;
    const elapsed = time - this._startTime;
    let grid;
    switch (quantize) {
      case this.QUANTIZE.BEAT:     grid = this._beatDuration(); break;
      case this.QUANTIZE.HALF_BAR: grid = this._barDuration() / 2; break;
      case this.QUANTIZE.BAR:      grid = this._barDuration(); break;
      case this.QUANTIZE.TWO_BARS: grid = this._barDuration() * 2; break;
      default: return time;
    }
    const quantized = Math.ceil(elapsed / grid) * grid;
    return this._startTime + quantized;
  },

  schedule(soundId, options = {}) {
    const id = ++this._eventIdCounter;
    const ctx = this._context;
    const now = ctx.currentTime;
    const delay = options.delay || 0;
    const quantize = options.quantize || this.QUANTIZE.NONE;
    let time = now + delay;
    time = this._quantizeTime(time, quantize);
    const event = {
      id, soundId,
      time,
      priority: options.priority || this.PRIORITY.NORMAL,
      loop: options.loop || false,
      loopInterval: options.loopInterval || 0,
      gain: options.gain || 1.0,
      channel: options.channel || 'sfx',
      pan: options.pan || 0,
      pitch: options.pitch || 1.0,
      callback: options.callback || null,
      cancelled: false
    };
    this._queue.push(event);
    this._queue.sort((a, b) => b.priority - a.priority || a.time - b.time);
    this._activeEvents[id] = event;
    return id;
  },

  cancel(eventId) {
    const event = this._activeEvents[eventId];
    if (event) {
      event.cancelled = true;
      delete this._activeEvents[eventId];
      return true;
    }
    return false;
  },

  scheduleRepeating(soundId, interval, options = {}) {
    const schedule = () => {
      if (!this._running) return;
      const id = this.schedule(soundId, options);
      setTimeout(schedule, interval * 1000);
    };
    schedule();
  },

  schedulePattern(pattern, options = {}) {
    const beatDur = this._beatDuration();
    pattern.forEach((step, i) => {
      if (step && step.sound) {
        this.schedule(step.sound, {
          ...options,
          delay: i * beatDur,
          gain: step.gain || options.gain || 1.0
        });
      }
    });
  },

  on(event, handler) {
    if (!this._eventHandlers[event]) this._eventHandlers[event] = [];
    this._eventHandlers[event].push(handler);
  },

  _emit(event, data) {
    const handlers = this._eventHandlers[event] || [];
    handlers.forEach(h => { try { h(data); } catch(e) {} });
  },

  _tick() {
    if (!this._running) return;
    const ctx = this._context;
    const now = ctx.currentTime;
    const lookahead = 0.1;
    const elapsed = now - this._startTime;
    const newBeat = Math.floor(elapsed / this._beatDuration());
    const newBar  = Math.floor(elapsed / this._barDuration());
    if (newBeat > this._currentBeat) {
      this._currentBeat = newBeat;
      this._emit('beat', { beat: newBeat, bar: this._currentBar });
    }
    if (newBar > this._currentBar) {
      this._currentBar = newBar;
      this._emit('bar', { bar: newBar });
    }
    const toProcess = this._queue.filter(e => !e.cancelled && e.time <= now + lookahead);
    toProcess.forEach(event => {
      this._queue = this._queue.filter(e => e !== event);
      if (event.cancelled) return;
      this._emit('play', { id: event.id, soundId: event.soundId, time: event.time });
      if (event.callback) {
        try { event.callback(event); } catch(e) {}
      }
      if (event.loop && event.loopInterval > 0) {
        this.schedule(event.soundId, {
          delay: event.loopInterval,
          loop: true,
          loopInterval: event.loopInterval,
          gain: event.gain,
          channel: event.channel,
          callback: event.callback,
          priority: event.priority
        });
      }
    });
    requestAnimationFrame(() => this._tick());
  },

  getState() {
    return {
      running: this._running,
      bpm: this._bpm,
      currentBeat: this._currentBeat,
      currentBar: this._currentBar,
      queueLength: this._queue.length,
      activeEventCount: Object.keys(this._activeEvents).length
    };
  }
};

// ============================================================
// ADAPTIVE_MUSIC — Dynamic Music System
// ============================================================
const ADAPTIVE_MUSIC = {
  _context: null,
  _currentTrack: null,
  _previousTrack: null,
  _layers: {},
  _activeLayerGains: {},
  _intensity: 0.5,
  _targetIntensity: 0.5,
  _transitionInProgress: false,
  _running: false,

  CONFIG: {
    intensitySmoothingRate: 0.02,
    layerFadeTime: 1.5,
    crossfadeTime: 2.0,
    minLayerGain: 0.0,
    maxLayerGain: 1.0,
    intensityUpdateInterval: 100,
    beatSyncEnabled: true,
    stemManagement: true
  },

  INTENSITY_THRESHOLDS: {
    calm:      { min: 0.0, max: 0.25 },
    relaxed:   { min: 0.2, max: 0.45 },
    moderate:  { min: 0.4, max: 0.65 },
    intense:   { min: 0.6, max: 0.85 },
    extreme:   { min: 0.8, max: 1.0  }
  },

  LAYER_INTENSITY_MAP: {
    bass:    { active: [0.0, 1.0], gain: [0.4, 0.8] },
    drums:   { active: [0.0, 1.0], gain: [0.3, 1.0] },
    melody:  { active: [0.2, 1.0], gain: [0.2, 0.7] },
    harmony: { active: [0.3, 1.0], gain: [0.1, 0.6] },
    lead:    { active: [0.5, 1.0], gain: [0.0, 0.8] },
    strings: { active: [0.4, 1.0], gain: [0.1, 0.65] },
    brass:   { active: [0.65, 1.0], gain: [0.0, 0.75] },
    perc:    { active: [0.55, 1.0], gain: [0.0, 0.7] },
    fx:      { active: [0.7, 1.0], gain: [0.0, 0.5] },
    pads:    { active: [0.1, 0.7], gain: [0.3, 0.55] }
  },

  TRANSITION_STYLES: {
    instant:   { type: 'instant',   duration: 0 },
    quick:     { type: 'fade',      duration: 0.5 },
    smooth:    { type: 'crossfade', duration: 2.0 },
    long:      { type: 'crossfade', duration: 4.0 },
    stinger:   { type: 'stinger',   duration: 1.0 },
    beat_sync: { type: 'beat_sync', duration: 0 }
  },

  _stateHistory: [],
  _eventCallbacks: {},

  init(audioContext) {
    this._context = audioContext;
    this._masterGain = audioContext.createGain();
    this._masterGain.gain.value = 1.0;
    this._masterGain.connect(audioContext.destination);
    this._intensityInterval = null;
    return this;
  },

  start() {
    this._running = true;
    this._intensityInterval = setInterval(() => this._updateIntensity(), this.CONFIG.intensityUpdateInterval);
    return this;
  },

  stop() {
    this._running = false;
    if (this._intensityInterval) {
      clearInterval(this._intensityInterval);
      this._intensityInterval = null;
    }
    this._fadeOutAll();
  },

  setTrack(trackId, transitionStyle = 'smooth') {
    const track = MUSIC_TRACKS[trackId];
    if (!track) return false;
    const style = this.TRANSITION_STYLES[transitionStyle] || this.TRANSITION_STYLES.smooth;
    this._previousTrack = this._currentTrack;
    this._currentTrack = track;
    this._executeTransition(style, track);
    this._emit('trackChange', { previous: this._previousTrack, current: track });
    return true;
  },

  setIntensity(intensity, immediate = false) {
    intensity = Math.max(0, Math.min(1, intensity));
    this._targetIntensity = intensity;
    if (immediate) {
      this._intensity = intensity;
      this._applyIntensityToLayers(intensity);
    }
  },

  _updateIntensity() {
    if (!this._running) return;
    const rate = this.CONFIG.intensitySmoothingRate;
    const prev = this._intensity;
    this._intensity += (this._targetIntensity - this._intensity) * rate;
    if (Math.abs(this._intensity - prev) > 0.001) {
      this._applyIntensityToLayers(this._intensity);
    }
  },

  _applyIntensityToLayers(intensity) {
    const ctx = this._context;
    if (!ctx) return;
    const now = ctx.currentTime;
    const fadeTime = this.CONFIG.layerFadeTime;
    Object.entries(this.LAYER_INTENSITY_MAP).forEach(([layerName, map]) => {
      const gainNode = this._activeLayerGains[layerName];
      if (!gainNode) return;
      const [activeMin, activeMax] = map.active;
      const [gainMin, gainMax] = map.gain;
      let targetGain;
      if (intensity < activeMin) {
        targetGain = 0;
      } else if (intensity > activeMax) {
        targetGain = gainMax;
      } else {
        const t = (intensity - activeMin) / (activeMax - activeMin);
        targetGain = gainMin + t * (gainMax - gainMin);
      }
      gainNode.gain.linearRampToValueAtTime(targetGain, now + fadeTime);
    });
  },

  _executeTransition(style, track) {
    if (this._transitionInProgress) return;
    this._transitionInProgress = true;
    const ctx = this._context;
    const now = ctx.currentTime;
    switch(style.type) {
      case 'instant':
        this._fadeOutAll(0);
        this._setupTrackLayers(track);
        break;
      case 'fade':
        this._fadeOutAll(style.duration);
        setTimeout(() => {
          this._setupTrackLayers(track);
          this._transitionInProgress = false;
        }, style.duration * 1000);
        break;
      case 'crossfade':
        this._setupTrackLayers(track, style.duration);
        setTimeout(() => { this._transitionInProgress = false; }, style.duration * 1000 + 100);
        break;
      default:
        this._setupTrackLayers(track);
        this._transitionInProgress = false;
    }
  },

  _setupTrackLayers(track) {
    const ctx = this._context;
    track.layers.forEach(layer => {
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0;
      gainNode.connect(this._masterGain);
      this._activeLayerGains[layer.name] = gainNode;
    });
    this._applyIntensityToLayers(this._intensity);
  },

  _fadeOutAll(duration = this.CONFIG.crossfadeTime) {
    const ctx = this._context;
    if (!ctx) return;
    const now = ctx.currentTime;
    Object.values(this._activeLayerGains).forEach(gainNode => {
      gainNode.gain.linearRampToValueAtTime(0, now + duration);
    });
    if (duration <= 0) {
      this._activeLayerGains = {};
    } else {
      setTimeout(() => { this._activeLayerGains = {}; }, duration * 1000 + 50);
    }
  },

  getIntensityLevel() {
    const i = this._intensity;
    const t = this.INTENSITY_THRESHOLDS;
    for (const [level, range] of Object.entries(t)) {
      if (i >= range.min && i <= range.max) return level;
    }
    return 'moderate';
  },

  on(event, callback) {
    if (!this._eventCallbacks[event]) this._eventCallbacks[event] = [];
    this._eventCallbacks[event].push(callback);
  },

  _emit(event, data) {
    const cbs = this._eventCallbacks[event] || [];
    cbs.forEach(cb => { try { cb(data); } catch(e) {} });
  },

  recordState() {
    this._stateHistory.push({
      time: Date.now(),
      intensity: this._intensity,
      track: this._currentTrack ? this._currentTrack.id : null,
      intensityLevel: this.getIntensityLevel()
    });
    if (this._stateHistory.length > 300) this._stateHistory.shift();
  },

  getState() {
    return {
      running: this._running,
      currentTrack: this._currentTrack ? this._currentTrack.id : null,
      intensity: this._intensity,
      targetIntensity: this._targetIntensity,
      intensityLevel: this.getIntensityLevel(),
      activeLayers: Object.keys(this._activeLayerGains),
      transitionInProgress: this._transitionInProgress
    };
  },

  getHistory() {
    return [...this._stateHistory];
  }
};

// ============================================================
// MODULE EXPORTS & INTEGRATION BOOTSTRAP
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SOUND_LIBRARY,
    MUSIC_TRACKS,
    AUDIO_MIXER,
    ENGINE_SOUND_SYSTEM,
    SPATIAL_AUDIO,
    REVERB_SYSTEM,
    SOUND_SCHEDULER,
    ADAPTIVE_MUSIC
  };
}


// ============================================================
// MUSIC_SYSTEM MODULE
// Complete dynamic music management system for AHMET clone
// ============================================================
const MUSIC_SYSTEM_V2 = (function() {
  'use strict';

  // ---- Track Catalog (15 tracks) ----
  const TRACK_CATALOG = [
    {
      id: 'menu_calm',
      name: 'Peaceful Lobby',
      bpm: 90,
      genre: 'ambient',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 30,
      intensity: 0.1,
      mood: 'calm',
      mapThemes: ['menu', 'lobby'],
      unlockLevel: 0,
      stems: ['base', 'melody']
    },
    {
      id: 'jungle_groove',
      name: 'Jungle Rumble',
      bpm: 120,
      genre: 'tropical',
      loopStart: 44100 * 4,
      loopEnd: 44100 * 36,
      intensity: 0.5,
      mood: 'energetic',
      mapThemes: ['jungle'],
      unlockLevel: 1,
      stems: ['base', 'action', 'trick']
    },
    {
      id: 'desert_drive',
      name: 'Dune Rider',
      bpm: 110,
      genre: 'rock',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 32,
      intensity: 0.6,
      mood: 'gritty',
      mapThemes: ['desert'],
      unlockLevel: 2,
      stems: ['base', 'action', 'danger']
    },
    {
      id: 'arctic_chill',
      name: 'Frozen Velocity',
      bpm: 100,
      genre: 'electronic',
      loopStart: 44100 * 3,
      loopEnd: 44100 * 35,
      intensity: 0.55,
      mood: 'tense',
      mapThemes: ['arctic'],
      unlockLevel: 3,
      stems: ['base', 'action', 'trick', 'danger']
    },
    {
      id: 'city_rush',
      name: 'Urban Sprint',
      bpm: 135,
      genre: 'hiphop',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 28,
      intensity: 0.75,
      mood: 'hyped',
      mapThemes: ['city'],
      unlockLevel: 4,
      stems: ['base', 'action', 'trick']
    },
    {
      id: 'cave_echo',
      name: 'Deep Resonance',
      bpm: 95,
      genre: 'dark_ambient',
      loopStart: 44100 * 4,
      loopEnd: 44100 * 38,
      intensity: 0.4,
      mood: 'mysterious',
      mapThemes: ['cave'],
      unlockLevel: 5,
      stems: ['base', 'danger']
    },
    {
      id: 'ocean_wave',
      name: 'Tidal Force',
      bpm: 105,
      genre: 'surf_rock',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 30,
      intensity: 0.5,
      mood: 'free',
      mapThemes: ['ocean'],
      unlockLevel: 6,
      stems: ['base', 'action', 'trick']
    },
    {
      id: 'volcano_fury',
      name: 'Magma Burst',
      bpm: 145,
      genre: 'metal',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 26,
      intensity: 0.9,
      mood: 'intense',
      mapThemes: ['volcano'],
      unlockLevel: 7,
      stems: ['base', 'action', 'trick', 'danger']
    },
    {
      id: 'space_drift',
      name: 'Zero Gravity',
      bpm: 80,
      genre: 'synthwave',
      loopStart: 44100 * 6,
      loopEnd: 44100 * 40,
      intensity: 0.45,
      mood: 'cosmic',
      mapThemes: ['space'],
      unlockLevel: 8,
      stems: ['base', 'trick']
    },
    {
      id: 'haunted_ride',
      name: 'Phantom Wheel',
      bpm: 88,
      genre: 'horror',
      loopStart: 44100 * 3,
      loopEnd: 44100 * 35,
      intensity: 0.6,
      mood: 'eerie',
      mapThemes: ['haunted'],
      unlockLevel: 9,
      stems: ['base', 'danger']
    },
    {
      id: 'boss_battle',
      name: 'Final Confrontation',
      bpm: 160,
      genre: 'orchestral',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 24,
      intensity: 1.0,
      mood: 'epic',
      mapThemes: ['boss'],
      unlockLevel: 10,
      stems: ['base', 'action', 'trick', 'danger']
    },
    {
      id: 'victory_fanfare',
      name: 'Champion\'s Rise',
      bpm: 140,
      genre: 'fanfare',
      loopStart: 0,
      loopEnd: 44100 * 6,
      intensity: 1.0,
      mood: 'triumphant',
      mapThemes: ['victory'],
      unlockLevel: 0,
      stems: ['base']
    },
    {
      id: 'defeat_sting',
      name: 'Crash Landing',
      bpm: 60,
      genre: 'sting',
      loopStart: 0,
      loopEnd: 44100 * 3,
      intensity: 0.3,
      mood: 'sad',
      mapThemes: ['defeat'],
      unlockLevel: 0,
      stems: ['base']
    },
    {
      id: 'high_intensity',
      name: 'Redline Rush',
      bpm: 155,
      genre: 'drum_n_bass',
      loopStart: 44100 * 2,
      loopEnd: 44100 * 22,
      intensity: 0.95,
      mood: 'frantic',
      mapThemes: ['race', 'challenge'],
      unlockLevel: 5,
      stems: ['base', 'action', 'trick', 'danger']
    },
    {
      id: 'chill_cruise',
      name: 'Sunset Boulevard',
      bpm: 75,
      genre: 'lofi',
      loopStart: 44100 * 4,
      loopEnd: 44100 * 42,
      intensity: 0.15,
      mood: 'relaxed',
      mapThemes: ['free_ride'],
      unlockLevel: 3,
      stems: ['base', 'melody']
    }
  ];

  // ---- Internal State ----
  let _audioCtx = null;
  let _masterGain = null;
  let _currentTrack = null;
  let _currentTrackId = null;
  let _currentBuffers = {};
  let _stemSources = {};
  let _stemGains = {};
  let _gameplayIntensity = 0;
  let _fadingOut = false;
  let _fadeDuration = 2.0;
  let _menuFadeDuration = 0.5;
  let _unlockedTracks = new Set([0]);
  let _favoriteTracks = new Set();
  let _adaptiveBPMEnabled = true;
  let _currentBPMOffset = 0;
  let _intensityHistory = [];
  let _intensityHistoryMaxLen = 60;
  let _stemStates = { base: true, action: false, trick: false, danger: false, melody: false };

  // ---- Initializer ----
  function init(audioContext) {
    _audioCtx = audioContext;
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.setValueAtTime(0.7, _audioCtx.currentTime);
    _masterGain.connect(_audioCtx.destination);
    console.log('[MUSIC_SYSTEM] Initialized');
  }

  // ---- Intensity Calculation ----
  function calculateIntensity(speed, trickMultiplier, healthPercent) {
    // Normalize speed: assume max speed ~200 km/h maps to 1.0
    const speedFactor = Math.min(speed / 200, 1.0);
    const trickFactor = Math.min((trickMultiplier - 1) / 5, 1.0);
    const dangerFactor = 1.0 - Math.max(healthPercent, 0);

    // Weighted combination
    const raw = speedFactor * 0.5 + trickFactor * 0.3 + dangerFactor * 0.2;
    const clamped = Math.max(0, Math.min(1, raw));

    // Smooth with history
    _intensityHistory.push(clamped);
    if (_intensityHistory.length > _intensityHistoryMaxLen) {
      _intensityHistory.shift();
    }
    const smoothed = _intensityHistory.reduce((a, b) => a + b, 0) / _intensityHistory.length;
    _gameplayIntensity = smoothed;
    return smoothed;
  }

  // ---- Stem Management ----
  function updateStems(speed, isAirborne, healthPercent) {
    const newStates = {
      base: true,
      melody: _currentTrack && _currentTrack.stems.includes('melody'),
      action: speed > 80,
      trick: isAirborne,
      danger: healthPercent < 0.35
    };

    for (const stemName in newStates) {
      if (newStates[stemName] !== _stemStates[stemName]) {
        _stemStates[stemName] = newStates[stemName];
        _fadeStem(stemName, newStates[stemName]);
      }
    }
  }

  function _fadeStem(stemName, active) {
    if (!_stemGains[stemName] || !_audioCtx) return;
    const gainNode = _stemGains[stemName];
    const targetGain = active ? 1.0 : 0.0;
    gainNode.gain.cancelScheduledValues(_audioCtx.currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, _audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetGain, _audioCtx.currentTime + 0.3);
  }

  // ---- Procedural Track Synthesis ----
  function _synthesizeTrack(track, stemName) {
    if (!_audioCtx) return null;

    const duration = (track.loopEnd - track.loopStart) / 44100 || 8;
    const sampleRate = _audioCtx.sampleRate;
    const bufferDuration = Math.max(duration, 4);
    const buffer = _audioCtx.createBuffer(2, sampleRate * bufferDuration, sampleRate);

    const bpm = track.bpm;
    const beatDuration = 60 / bpm;
    const L = buffer.getChannelData(0);
    const R = buffer.getChannelData(1);

    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (stemName === 'base') {
        // Kick drum: heavy sine thump at every beat
        const beatPhase = (t % beatDuration) / beatDuration;
        const kickEnv = Math.max(0, 1 - beatPhase * 15);
        const kickFreq = 60 * Math.pow(2, -beatPhase * 3);
        sample += 0.5 * kickEnv * Math.sin(2 * Math.PI * kickFreq * t);

        // Bass line: low sine wave following BPM
        const bassFreq = 55 + (track.intensity * 30);
        const bassPhase = t * bassFreq * 2 * Math.PI;
        const bassEnv = 0.3 + 0.1 * Math.sin(2 * Math.PI * t / (beatDuration * 4));
        sample += bassEnv * 0.4 * Math.sin(bassPhase);

        // Hi-hat: at 8th notes
        const hihatPhase = (t % (beatDuration / 2)) / (beatDuration / 2);
        if (hihatPhase < 0.05) {
          sample += 0.15 * (Math.random() * 2 - 1) * (1 - hihatPhase / 0.05);
        }
      }

      if (stemName === 'action') {
        // Lead synth: arpeggiated melody
        const noteIndex = Math.floor(t / (beatDuration / 2)) % 8;
        const noteFreqs = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
        const freq = noteFreqs[noteIndex] * (1 + track.intensity * 0.2);
        const notePhase = (t % (beatDuration / 2)) / (beatDuration / 2);
        const noteEnv = Math.max(0, 1 - notePhase * 3) * 0.8;
        sample += noteEnv * 0.3 * Math.sin(2 * Math.PI * freq * t);
        sample += noteEnv * 0.15 * Math.sin(2 * Math.PI * freq * 2 * t);
      }

      if (stemName === 'trick') {
        // High-energy synth stabs
        const stabRate = bpm / 30;
        const stabPhase = (t * stabRate) % 1;
        if (stabPhase < 0.1) {
          const stabEnv = 1 - stabPhase / 0.1;
          sample += stabEnv * 0.25 * Math.sin(2 * Math.PI * 880 * t);
        }
      }

      if (stemName === 'danger') {
        // Ominous low rumble + tension string
        const rumble = 0.1 * Math.sin(2 * Math.PI * 40 * t) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.5 * t));
        const tension = 0.1 * Math.sin(2 * Math.PI * 220 * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 3 * t));
        sample += rumble + tension;
      }

      if (stemName === 'melody') {
        // Gentle pad chords
        const chordFreqs = [261.63, 329.63, 392.0];
        for (const f of chordFreqs) {
          sample += 0.1 * Math.sin(2 * Math.PI * f * t) * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.25 * t));
        }
      }

      sample = Math.max(-1, Math.min(1, sample));
      L[i] = sample;
      R[i] = sample * (1 + 0.05 * Math.sin(2 * Math.PI * 0.1 * i / sampleRate));
    }

    return buffer;
  }

  // ---- Track Loading / Playback ----
  function _playStem(stemName, buffer, loopStart, loopEnd) {
    if (!_audioCtx || !buffer) return;

    const gainNode = _audioCtx.createGain();
    gainNode.gain.setValueAtTime(_stemStates[stemName] ? 1.0 : 0.0, _audioCtx.currentTime);
    gainNode.connect(_masterGain);
    _stemGains[stemName] = gainNode;

    const source = _audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = loopStart / 44100;
    source.loopEnd = Math.min(loopEnd / 44100, buffer.duration);
    source.connect(gainNode);
    source.start(0);
    _stemSources[stemName] = source;
  }

  function _stopAllStems(fadeOut) {
    const fadeTime = fadeOut ? _fadeDuration : 0.05;
    if (_masterGain && _audioCtx) {
      _masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
      _masterGain.gain.setValueAtTime(_masterGain.gain.value, _audioCtx.currentTime);
      _masterGain.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + fadeTime);
    }
    setTimeout(() => {
      for (const stemName in _stemSources) {
        try {
          _stemSources[stemName].stop();
          _stemSources[stemName].disconnect();
        } catch (e) { /* already stopped */ }
      }
      _stemSources = {};
      _stemGains = {};
      if (_masterGain && _audioCtx) {
        _masterGain.gain.setValueAtTime(0.7, _audioCtx.currentTime);
      }
    }, fadeTime * 1000 + 50);
  }

  function playTrack(trackId) {
    if (!_audioCtx) { console.warn('[MUSIC_SYSTEM] Not initialized'); return; }
    const track = TRACK_CATALOG.find(t => t.id === trackId);
    if (!track) { console.warn('[MUSIC_SYSTEM] Track not found:', trackId); return; }
    if (_currentTrackId === trackId) return;

    // Fade out current
    if (_currentTrackId) {
      _stopAllStems(true);
    }

    _currentTrack = track;
    _currentTrackId = trackId;

    // Synthesize and play all stems for this track
    const delay = _currentTrackId ? _fadeDuration * 1000 + 100 : 0;
    setTimeout(() => {
      if (_currentTrackId !== trackId) return; // was changed again
      for (const stemName of track.stems) {
        const buffer = _synthesizeTrack(track, stemName);
        _playStem(stemName, buffer, track.loopStart, track.loopEnd);
      }
      // Fade master back in
      if (_masterGain && _audioCtx) {
        _masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
        _masterGain.gain.setValueAtTime(0, _audioCtx.currentTime);
        _masterGain.gain.linearRampToValueAtTime(0.7, _audioCtx.currentTime + _fadeDuration);
      }
    }, delay);
  }

  function selectTrackForTheme(mapTheme) {
    const candidates = TRACK_CATALOG.filter(t =>
      t.mapThemes.includes(mapTheme) && _unlockedTracks.has(t.unlockLevel)
    );
    if (candidates.length === 0) {
      // Fallback to first available track
      const fallback = TRACK_CATALOG.find(t => _unlockedTracks.has(t.unlockLevel));
      if (fallback) playTrack(fallback.id);
      return;
    }
    // Pick by intensity closest to current gameplay intensity
    const best = candidates.reduce((a, b) =>
      Math.abs(a.intensity - _gameplayIntensity) < Math.abs(b.intensity - _gameplayIntensity) ? a : b
    );
    playTrack(best.id);
  }

  // ---- Adaptive BPM ----
  function setAdaptiveBPM(speed) {
    if (!_adaptiveBPMEnabled || !_audioCtx) return;
    // Tempo shift: ±10% based on speed normalized 0-1
    const speedNorm = Math.min(speed / 200, 1.0);
    const bpmOffset = (speedNorm - 0.5) * 0.2; // -0.1 to +0.1
    _currentBPMOffset = bpmOffset;
    // Playback rate adjustment on all active sources
    for (const stemName in _stemSources) {
      const src = _stemSources[stemName];
      if (src && src.playbackRate) {
        src.playbackRate.setTargetAtTime(1.0 + bpmOffset, _audioCtx.currentTime, 0.5);
      }
    }
  }

  // ---- Special Events ----
  function playVictoryFanfare() {
    _stopAllStems(false);
    _currentTrackId = null;
    setTimeout(() => playTrack('victory_fanfare'), 100);
  }

  function playDefeatSting() {
    _stopAllStems(false);
    _currentTrackId = null;
    setTimeout(() => playTrack('defeat_sting'), 100);
  }

  function playBossMusic() {
    playTrack('boss_battle');
  }

  function playMenuMusic() {
    playTrack('menu_calm');
  }

  // ---- Menu Pause ----
  function pauseForMenu() {
    if (!_audioCtx || !_masterGain) return;
    _masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
    _masterGain.gain.setValueAtTime(_masterGain.gain.value, _audioCtx.currentTime);
    _masterGain.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + _menuFadeDuration);
  }

  function resumeFromMenu() {
    if (!_audioCtx || !_masterGain) return;
    _masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
    _masterGain.gain.setValueAtTime(_masterGain.gain.value, _audioCtx.currentTime);
    _masterGain.gain.linearRampToValueAtTime(0.7, _audioCtx.currentTime + _menuFadeDuration);
  }

  // ---- Unlock & Favorites ----
  function unlockTracksByLevel(playerLevel) {
    TRACK_CATALOG.forEach(t => {
      if (t.unlockLevel <= playerLevel) _unlockedTracks.add(t.unlockLevel);
    });
  }

  function addFavorite(trackId) {
    if (TRACK_CATALOG.find(t => t.id === trackId)) _favoriteTracks.add(trackId);
  }

  function removeFavorite(trackId) { _favoriteTracks.delete(trackId); }

  function getFavorites() {
    return TRACK_CATALOG.filter(t => _favoriteTracks.has(t.id));
  }

  function getUnlockedTracks() {
    return TRACK_CATALOG.filter(t => _unlockedTracks.has(t.unlockLevel));
  }

  // ---- Update (call each game frame) ----
  function update(gameState) {
    if (!gameState) return;
    const { speed = 0, trickMultiplier = 1, healthPercent = 1, isAirborne = false, mapTheme = 'jungle' } = gameState;
    calculateIntensity(speed, trickMultiplier, healthPercent);
    updateStems(speed, isAirborne, healthPercent);
    if (_adaptiveBPMEnabled) setAdaptiveBPM(speed);
  }

  // ---- Public API ----
  return {
    init,
    update,
    playTrack,
    selectTrackForTheme,
    playVictoryFanfare,
    playDefeatSting,
    playBossMusic,
    playMenuMusic,
    pauseForMenu,
    resumeFromMenu,
    unlockTracksByLevel,
    addFavorite,
    removeFavorite,
    getFavorites,
    getUnlockedTracks,
    calculateIntensity,
    updateStems,
    setAdaptiveBPM,
    get currentTrackId() { return _currentTrackId; },
    get gameplayIntensity() { return _gameplayIntensity; },
    get catalog() { return TRACK_CATALOG; },
    set adaptiveBPM(v) { _adaptiveBPMEnabled = !!v; }
  };
})();


// ============================================================
// ENGINE_SOUND_SYSTEM MODULE
// Per-vehicle engine audio synthesis using Web Audio API
// ============================================================
const ENGINE_SOUND_SYSTEM_V2 = (function() {
  'use strict';

  // ---- Engine Profiles ----
  const ENGINE_PROFILES = {
    V4: {
      id: 'V4',
      idleFrequency: 28,
      rpmToFreqCurve: [[800,28],[2000,58],[4000,110],[6000,165],[8000,220]],
      timbreOscillators: [1, 2, 4, 0.5],
      oscillatorTypes: ['sawtooth','square','sawtooth','sine'],
      gainEnvelope: [[0,0.6],[0.3,0.8],[0.7,1.0],[1.0,0.9]],
      noiseAmount: 0.05,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.1,
      revvingSpeed: 0.15
    },
    V6: {
      id: 'V6',
      idleFrequency: 35,
      rpmToFreqCurve: [[800,35],[2000,70],[4000,140],[6500,200],[8500,260]],
      timbreOscillators: [1, 3, 0.5, 2, 6],
      oscillatorTypes: ['sawtooth','sawtooth','sine','square','sawtooth'],
      gainEnvelope: [[0,0.55],[0.3,0.75],[0.7,1.0],[1.0,0.95]],
      noiseAmount: 0.06,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.12,
      revvingSpeed: 0.18
    },
    V8: {
      id: 'V8',
      idleFrequency: 45,
      rpmToFreqCurve: [[800,45],[2000,90],[4000,180],[6000,270],[7000,315]],
      timbreOscillators: [1, 4, 0.5, 2, 8, 0.25],
      oscillatorTypes: ['sawtooth','square','sine','sawtooth','square','triangle'],
      gainEnvelope: [[0,0.7],[0.3,0.85],[0.7,1.0],[1.0,0.92]],
      noiseAmount: 0.08,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.25,
      revvingSpeed: 0.13
    },
    V12: {
      id: 'V12',
      idleFrequency: 55,
      rpmToFreqCurve: [[800,55],[2000,112],[3500,195],[6000,335],[8000,445]],
      timbreOscillators: [1, 6, 12, 0.5, 3, 2, 0.25],
      oscillatorTypes: ['sawtooth','sawtooth','sine','sine','square','sawtooth','triangle'],
      gainEnvelope: [[0,0.65],[0.3,0.82],[0.7,1.0],[1.0,0.98]],
      noiseAmount: 0.04,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.05,
      revvingSpeed: 0.1
    },
    inline4: {
      id: 'inline4',
      idleFrequency: 30,
      rpmToFreqCurve: [[800,30],[2500,95],[5000,185],[7000,260],[9000,335]],
      timbreOscillators: [1, 2, 4, 0.5, 3],
      oscillatorTypes: ['sawtooth','square','sawtooth','sine','square'],
      gainEnvelope: [[0,0.5],[0.3,0.72],[0.7,1.0],[1.0,0.88]],
      noiseAmount: 0.07,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.15,
      revvingSpeed: 0.2
    },
    boxer: {
      id: 'boxer',
      idleFrequency: 33,
      rpmToFreqCurve: [[800,33],[2500,90],[5000,180],[7500,265],[9000,320]],
      timbreOscillators: [1, 2, 0.5, 4, 1.5],
      oscillatorTypes: ['sawtooth','triangle','sine','sawtooth','square'],
      gainEnvelope: [[0,0.55],[0.3,0.75],[0.7,1.0],[1.0,0.9]],
      noiseAmount: 0.06,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.18,
      revvingSpeed: 0.17
    },
    electric: {
      id: 'electric',
      idleFrequency: 10,
      rpmToFreqCurve: [[0,10],[3000,80],[8000,210],[15000,400],[20000,530]],
      timbreOscillators: [1, 3, 5, 7, 9],
      oscillatorTypes: ['sine','sine','sine','sine','sine'],
      gainEnvelope: [[0,0.3],[0.3,0.6],[0.7,0.85],[1.0,0.8]],
      noiseAmount: 0.02,
      turboWhistleFreq: 0,
      exhaustCrackle: 0,
      revvingSpeed: 0.3
    },
    diesel: {
      id: 'diesel',
      idleFrequency: 20,
      rpmToFreqCurve: [[600,20],[1500,45],[3000,90],[4000,120],[5000,150]],
      timbreOscillators: [1, 0.5, 2, 0.25, 3],
      oscillatorTypes: ['square','square','sawtooth','triangle','square'],
      gainEnvelope: [[0,0.8],[0.3,0.9],[0.7,1.0],[1.0,0.85]],
      noiseAmount: 0.15,
      turboWhistleFreq: 1800,
      exhaustCrackle: 0.05,
      revvingSpeed: 0.08
    },
    turbo: {
      id: 'turbo',
      idleFrequency: 32,
      rpmToFreqCurve: [[800,32],[2000,75],[4000,150],[6000,225],[8000,300]],
      timbreOscillators: [1, 2, 4, 0.5, 3],
      oscillatorTypes: ['sawtooth','square','sawtooth','sine','square'],
      gainEnvelope: [[0,0.5],[0.3,0.75],[0.7,1.0],[1.0,1.0]],
      noiseAmount: 0.09,
      turboWhistleFreq: 2200,
      exhaustCrackle: 0.3,
      revvingSpeed: 0.12
    },
    supercharged: {
      id: 'supercharged',
      idleFrequency: 50,
      rpmToFreqCurve: [[800,50],[2000,100],[4000,200],[6000,300],[7500,375]],
      timbreOscillators: [1, 4, 8, 2, 0.5, 16],
      oscillatorTypes: ['sawtooth','sawtooth','square','square','sine','sawtooth'],
      gainEnvelope: [[0,0.7],[0.3,0.88],[0.7,1.0],[1.0,1.0]],
      noiseAmount: 0.1,
      turboWhistleFreq: 3500,
      exhaustCrackle: 0.08,
      revvingSpeed: 0.22
    },
    rotary: {
      id: 'rotary',
      idleFrequency: 25,
      rpmToFreqCurve: [[1000,25],[3000,70],[6000,140],[9000,210],[11000,257]],
      timbreOscillators: [1, 3, 1.5, 6, 0.5],
      oscillatorTypes: ['triangle','sawtooth','square','sawtooth','sine'],
      gainEnvelope: [[0,0.45],[0.3,0.7],[0.7,1.0],[1.0,0.95]],
      noiseAmount: 0.12,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.35,
      revvingSpeed: 0.25
    },
    twoStroke: {
      id: 'twoStroke',
      idleFrequency: 40,
      rpmToFreqCurve: [[1500,40],[4000,100],[7000,175],[10000,250],[12000,300]],
      timbreOscillators: [1, 2, 0.5, 4, 1.5, 3],
      oscillatorTypes: ['sawtooth','square','sine','sawtooth','square','triangle'],
      gainEnvelope: [[0,0.4],[0.3,0.65],[0.7,1.0],[1.0,1.0]],
      noiseAmount: 0.18,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.4,
      revvingSpeed: 0.28
    },
    // ---- Distinctive procedural profiles for recently-added vehicles ----
    turbine: {
      // Hoverbike: high whining turbine spool with airy whistle
      id: 'turbine',
      idleFrequency: 60,
      rpmToFreqCurve: [[1000,60],[4000,180],[9000,360],[15000,560],[22000,780]],
      timbreOscillators: [1, 2, 3, 5, 8],
      oscillatorTypes: ['sine','sine','triangle','sine','sine'],
      gainEnvelope: [[0,0.35],[0.3,0.6],[0.7,0.9],[1.0,1.0]],
      noiseAmount: 0.08,
      turboWhistleFreq: 4200,
      exhaustCrackle: 0,
      revvingSpeed: 0.35
    },
    dragsterV8: {
      // Dragster: deep, aggressive V8 roar with heavy exhaust crackle
      id: 'dragsterV8',
      idleFrequency: 38,
      rpmToFreqCurve: [[700,38],[1800,80],[3800,165],[5500,250],[7000,320]],
      timbreOscillators: [1, 2, 0.5, 4, 0.25, 8],
      oscillatorTypes: ['sawtooth','square','triangle','sawtooth','sine','square'],
      gainEnvelope: [[0,0.75],[0.3,0.9],[0.7,1.0],[1.0,1.0]],
      noiseAmount: 0.12,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.45,
      revvingSpeed: 0.16
    },
    steamroller: {
      // Steamroller: very slow, heavy diesel thump
      id: 'steamroller',
      idleFrequency: 14,
      rpmToFreqCurve: [[400,14],[1000,30],[2000,55],[3000,78],[3800,95]],
      timbreOscillators: [1, 0.5, 2, 0.25, 1.5],
      oscillatorTypes: ['square','square','triangle','sine','square'],
      gainEnvelope: [[0,0.85],[0.3,0.95],[0.7,1.0],[1.0,0.9]],
      noiseAmount: 0.2,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.06,
      revvingSpeed: 0.05
    },
    jetsled: {
      // Rocketsled: jet whoosh dominated by broadband noise + high whistle
      id: 'jetsled',
      idleFrequency: 45,
      rpmToFreqCurve: [[1000,45],[5000,150],[12000,340],[20000,600],[30000,900]],
      timbreOscillators: [1, 1.5, 2.5, 4],
      oscillatorTypes: ['sawtooth','sine','triangle','sine'],
      gainEnvelope: [[0,0.4],[0.3,0.7],[0.7,0.95],[1.0,1.0]],
      noiseAmount: 0.45,
      turboWhistleFreq: 5200,
      exhaustCrackle: 0.02,
      revvingSpeed: 0.4
    },
    cartbuzz: {
      // Shopping cart: tiny, weak, buzzy little motor
      id: 'cartbuzz',
      idleFrequency: 90,
      rpmToFreqCurve: [[2000,90],[5000,180],[9000,300],[13000,410],[16000,500]],
      timbreOscillators: [1, 2, 3],
      oscillatorTypes: ['square','triangle','square'],
      gainEnvelope: [[0,0.2],[0.3,0.32],[0.7,0.45],[1.0,0.4]],
      noiseAmount: 0.1,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.02,
      revvingSpeed: 0.3
    },
    bathtubputter: {
      // Bathtub: slow, bubbly, irregular putter
      id: 'bathtubputter',
      idleFrequency: 22,
      rpmToFreqCurve: [[600,22],[1500,48],[3000,88],[4500,125],[5500,150]],
      timbreOscillators: [1, 0.5, 1.5, 3, 0.75],
      oscillatorTypes: ['triangle','sine','triangle','sine','square'],
      gainEnvelope: [[0,0.5],[0.3,0.65],[0.7,0.85],[1.0,0.8]],
      noiseAmount: 0.14,
      turboWhistleFreq: 0,
      exhaustCrackle: 0.2,
      revvingSpeed: 0.09
    }
  };

  // ---- Vehicle ID -> Engine Profile overrides ----
  // Consulted (guarded) by createEngine when no explicit/known profileId is
  // supplied, so recently-added vehicles get a fitting procedural character
  // instead of the generic V4 fallback. Additive: does not affect vehicles
  // that already pass a valid profileId.
  const VEHICLE_PROFILE_OVERRIDES = {
    hoverbike:    'turbine',
    dragster:     'dragsterV8',
    steamroller:  'steamroller',
    rocketsled:   'jetsled',
    shoppingcart: 'cartbuzz',
    bathtub:      'bathtubputter'
  };

  // ---- Per-Instance Engine State ----
  const _engines = new Map();
  let _audioCtx = null;
  let _masterBus = null;

  // ---- Initialization ----
  function init(audioContext, masterBus) {
    _audioCtx = audioContext;
    _masterBus = masterBus || audioContext.destination;
    console.log('[ENGINE_SOUND_SYSTEM] Initialized with', Object.keys(ENGINE_PROFILES).length, 'engine profiles');
  }

  // ---- RPM to Frequency Interpolation ----
  function _rpmToFrequency(profile, normalizedRPM) {
    const curve = profile.rpmToFreqCurve;
    const rpmMin = curve[0][0], rpmMax = curve[curve.length - 1][0];
    const rpm = rpmMin + normalizedRPM * (rpmMax - rpmMin);
    for (let i = 0; i < curve.length - 1; i++) {
      if (rpm >= curve[i][0] && rpm <= curve[i+1][0]) {
        const t = (rpm - curve[i][0]) / (curve[i+1][0] - curve[i][0]);
        return curve[i][1] + t * (curve[i+1][1] - curve[i][1]);
      }
    }
    return curve[curve.length - 1][1];
  }

  // ---- Gain Envelope Interpolation ----
  function _gainAtNormalizedRPM(profile, normalizedRPM) {
    const env = profile.gainEnvelope;
    for (let i = 0; i < env.length - 1; i++) {
      if (normalizedRPM >= env[i][0] && normalizedRPM <= env[i+1][0]) {
        const t = (normalizedRPM - env[i][0]) / (env[i+1][0] - env[i][0]);
        return env[i][1] + t * (env[i+1][1] - env[i][1]);
      }
    }
    return env[env.length - 1][1];
  }

  // ---- Create Engine Instance ----
  function createEngine(vehicleId, profileId) {
    if (!_audioCtx) { console.warn('[ENGINE_SOUND_SYSTEM] Not initialized'); return null; }
    const profile = ENGINE_PROFILES[profileId]
      || (VEHICLE_PROFILE_OVERRIDES[vehicleId] && ENGINE_PROFILES[VEHICLE_PROFILE_OVERRIDES[vehicleId]])
      || ENGINE_PROFILES.V4;
    const engine = {
      vehicleId,
      profile,
      oscillators: [],
      gainNodes: [],
      masterGain: null,
      noiseSource: null,
      noiseGain: null,
      turboOscillator: null,
      turboGain: null,
      currentRPM: 0,
      targetRPM: 0,
      isRunning: false,
      isColdStart: true,
      coldStartTimer: 0,
      coldStartDuration: 3.0,
      lastThrottle: 0,
      filterNode: null
    };

    // Master gain for this engine
    engine.masterGain = _audioCtx.createGain();
    engine.masterGain.gain.setValueAtTime(0, _audioCtx.currentTime);

    // Low-pass filter for engine warmth
    engine.filterNode = _audioCtx.createBiquadFilter();
    engine.filterNode.type = 'lowpass';
    engine.filterNode.frequency.setValueAtTime(800, _audioCtx.currentTime);
    engine.filterNode.Q.setValueAtTime(1.5, _audioCtx.currentTime);
    engine.filterNode.connect(engine.masterGain);
    engine.masterGain.connect(_masterBus);

    // Create harmonic oscillators
    for (let h = 0; h < profile.timbreOscillators.length; h++) {
      const osc = _audioCtx.createOscillator();
      const harmGain = _audioCtx.createGain();
      osc.type = profile.oscillatorTypes[h] || 'sawtooth';
      osc.frequency.setValueAtTime(profile.idleFrequency * profile.timbreOscillators[h], _audioCtx.currentTime);
      const harmonicWeight = 1 / (h + 1);
      harmGain.gain.setValueAtTime(0.3 * harmonicWeight, _audioCtx.currentTime);
      osc.connect(harmGain);
      harmGain.connect(engine.filterNode);
      osc.start();
      engine.oscillators.push(osc);
      engine.gainNodes.push(harmGain);
    }

    // Noise component
    if (profile.noiseAmount > 0) {
      const noiseBuffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 2, _audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
      engine.noiseSource = _audioCtx.createBufferSource();
      engine.noiseSource.buffer = noiseBuffer;
      engine.noiseSource.loop = true;
      engine.noiseGain = _audioCtx.createGain();
      engine.noiseGain.gain.setValueAtTime(profile.noiseAmount * 0.1, _audioCtx.currentTime);
      engine.noiseSource.connect(engine.noiseGain);
      engine.noiseGain.connect(engine.filterNode);
      engine.noiseSource.start();
    }

    // Turbo whine
    if (profile.turboWhistleFreq > 0) {
      engine.turboOscillator = _audioCtx.createOscillator();
      engine.turboGain = _audioCtx.createGain();
      engine.turboOscillator.type = 'sine';
      engine.turboOscillator.frequency.setValueAtTime(profile.turboWhistleFreq, _audioCtx.currentTime);
      engine.turboGain.gain.setValueAtTime(0, _audioCtx.currentTime);
      engine.turboOscillator.connect(engine.turboGain);
      engine.turboGain.connect(engine.masterGain);
      engine.turboOscillator.start();
    }

    _engines.set(vehicleId, engine);
    return vehicleId;
  }

  // ---- Start Engine (cold start sequence) ----
  function startEngine(vehicleId) {
    const engine = _engines.get(vehicleId);
    if (!engine || !_audioCtx) return;
    engine.isRunning = true;
    engine.isColdStart = true;
    engine.coldStartTimer = 0;

    // Crank sound: brief burst of noise + low frequency
    engine.masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
    engine.masterGain.gain.setValueAtTime(0, _audioCtx.currentTime);
    engine.masterGain.gain.linearRampToValueAtTime(0.4, _audioCtx.currentTime + 0.3);

    // Rough idle (cold): higher noise, unstable frequency
    if (engine.noiseGain) {
      engine.noiseGain.gain.setValueAtTime(engine.profile.noiseAmount * 0.4, _audioCtx.currentTime);
      engine.noiseGain.gain.linearRampToValueAtTime(engine.profile.noiseAmount * 0.1, _audioCtx.currentTime + engine.coldStartDuration);
    }
    // Filter opens up as engine warms
    engine.filterNode.frequency.setValueAtTime(400, _audioCtx.currentTime);
    engine.filterNode.frequency.linearRampToValueAtTime(800, _audioCtx.currentTime + engine.coldStartDuration);
  }

  // ---- Stop Engine ----
  function stopEngine(vehicleId) {
    const engine = _engines.get(vehicleId);
    if (!engine || !_audioCtx) return;
    engine.isRunning = false;
    engine.masterGain.gain.cancelScheduledValues(_audioCtx.currentTime);
    engine.masterGain.gain.setValueAtTime(engine.masterGain.gain.value, _audioCtx.currentTime);
    engine.masterGain.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + 0.5);
  }

  // ---- Update Engine Per Frame ----
  function updateEngine(vehicleId, normalizedThrottle, normalizedRPM, isDecelerating, gearShifting) {
    const engine = _engines.get(vehicleId);
    if (!engine || !engine.isRunning || !_audioCtx) return;
    const now = _audioCtx.currentTime;

    // Smooth RPM
    const rpmDelta = normalizedRPM - engine.currentRPM;
    engine.currentRPM += rpmDelta * engine.profile.revvingSpeed;
    const rpm = Math.max(0, Math.min(1, engine.currentRPM));

    // Base frequency
    const baseFreq = _rpmToFrequency(engine.profile, rpm);

    // Gear shift: brief frequency dip
    const gearShiftDip = gearShifting ? 0.75 : 1.0;

    // Update harmonic oscillators
    for (let h = 0; h < engine.oscillators.length; h++) {
      const ratio = engine.profile.timbreOscillators[h];
      const targetFreq = baseFreq * ratio * gearShiftDip;
      engine.oscillators[h].frequency.setTargetAtTime(targetFreq, now, 0.03);
    }

    // Master gain based on throttle + RPM envelope
    const envGain = _gainAtNormalizedRPM(engine.profile, rpm);
    const targetMasterGain = normalizedThrottle * envGain * (engine.isColdStart ? 0.6 : 1.0);
    engine.masterGain.gain.setTargetAtTime(Math.max(0.05, targetMasterGain), now, 0.05);

    // Noise: increases at high RPM
    if (engine.noiseGain) {
      const noiseTarget = engine.profile.noiseAmount * (0.5 + rpm * 0.5);
      engine.noiseGain.gain.setTargetAtTime(noiseTarget * 0.15, now, 0.1);
    }

    // Turbo whine: increases quadratically with RPM
    if (engine.turboGain && engine.turboOscillator) {
      const turboGainVal = Math.pow(rpm, 2) * 0.25;
      engine.turboGain.gain.setTargetAtTime(turboGainVal, now, 0.2);
      const turboFreqMod = engine.profile.turboWhistleFreq * (0.8 + rpm * 0.4);
      engine.turboOscillator.frequency.setTargetAtTime(turboFreqMod, now, 0.3);
    }

    // Exhaust crackle on deceleration
    if (isDecelerating && Math.random() < engine.profile.exhaustCrackle * 0.1 && rpm > 0.5) {
      _triggerCrackle(engine);
    }

    // Redline: add distortion-like behavior near 1.0 RPM
    if (rpm > 0.92) {
      const redlineAmt = (rpm - 0.92) / 0.08;
      // Frequency flutter
      const flutter = 1 + redlineAmt * 0.02 * Math.sin(now * 80);
      engine.oscillators[0].frequency.setTargetAtTime(baseFreq * flutter, now, 0.01);
    }

    // Filter cutoff follows RPM
    const filterFreq = 600 + rpm * 3000;
    engine.filterNode.frequency.setTargetAtTime(filterFreq, now, 0.05);

    // Cold start warm-up
    if (engine.isColdStart) {
      engine.coldStartTimer += 1 / 60;
      if (engine.coldStartTimer >= engine.coldStartDuration) {
        engine.isColdStart = false;
      }
    }

    engine.lastThrottle = normalizedThrottle;
  }

  // ---- Exhaust Crackle ----
  function _triggerCrackle(engine) {
    if (!_audioCtx) return;
    const crackleOsc = _audioCtx.createOscillator();
    const crackleGain = _audioCtx.createGain();
    crackleOsc.type = 'sawtooth';
    crackleOsc.frequency.setValueAtTime(80 + Math.random() * 120, _audioCtx.currentTime);
    crackleGain.gain.setValueAtTime(0.3, _audioCtx.currentTime);
    crackleGain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.08);
    crackleOsc.connect(crackleGain);
    crackleGain.connect(_masterBus);
    crackleOsc.start();
    crackleOsc.stop(_audioCtx.currentTime + 0.08);
  }

  // ---- Gear Shift Sound ----
  function triggerGearShift(vehicleId, shiftUp) {
    if (!_audioCtx) return;
    const engine = _engines.get(vehicleId);
    const now = _audioCtx.currentTime;

    // Mechanical clunk
    const clunkOsc = _audioCtx.createOscillator();
    const clunkGain = _audioCtx.createGain();
    clunkOsc.type = 'square';
    clunkOsc.frequency.setValueAtTime(shiftUp ? 150 : 100, now);
    clunkOsc.frequency.exponentialRampToValueAtTime(shiftUp ? 80 : 50, now + 0.12);
    clunkGain.gain.setValueAtTime(0.25, now);
    clunkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    clunkOsc.connect(clunkGain);
    clunkGain.connect(_masterBus);
    clunkOsc.start(now);
    clunkOsc.stop(now + 0.13);

    // RPM dip
    if (engine) {
      engine.currentRPM = Math.max(0.1, engine.currentRPM - (shiftUp ? 0.2 : 0.1));
    }
  }

  // ---- Engine Brake Sound ----
  function triggerEngineBrake(vehicleId) {
    const engine = _engines.get(vehicleId);
    if (!engine || !_audioCtx) return;
    const now = _audioCtx.currentTime;
    // Distinctive whine: high harmonic ring
    const brakeOsc = _audioCtx.createOscillator();
    const brakeGain = _audioCtx.createGain();
    brakeOsc.type = 'sawtooth';
    const startFreq = _rpmToFrequency(engine.profile, engine.currentRPM) * 3;
    brakeOsc.frequency.setValueAtTime(startFreq, now);
    brakeOsc.frequency.exponentialRampToValueAtTime(startFreq * 0.4, now + 0.8);
    brakeGain.gain.setValueAtTime(0.15, now);
    brakeGain.gain.linearRampToValueAtTime(0, now + 0.8);
    brakeOsc.connect(brakeGain);
    brakeGain.connect(_masterBus);
    brakeOsc.start(now);
    brakeOsc.stop(now + 0.85);
  }

  // ---- Destroy Engine ----
  function destroyEngine(vehicleId) {
    const engine = _engines.get(vehicleId);
    if (!engine) return;
    try {
      for (const osc of engine.oscillators) { osc.stop(); osc.disconnect(); }
      for (const g of engine.gainNodes) { g.disconnect(); }
      if (engine.noiseSource) { engine.noiseSource.stop(); engine.noiseSource.disconnect(); }
      if (engine.noiseGain) engine.noiseGain.disconnect();
      if (engine.turboOscillator) { engine.turboOscillator.stop(); engine.turboOscillator.disconnect(); }
      if (engine.turboGain) engine.turboGain.disconnect();
      if (engine.filterNode) engine.filterNode.disconnect();
      if (engine.masterGain) engine.masterGain.disconnect();
    } catch (e) { /* cleanup errors ignorable */ }
    _engines.delete(vehicleId);
  }

  // ---- Public API ----
  return {
    init,
    createEngine,
    startEngine,
    stopEngine,
    updateEngine,
    triggerGearShift,
    triggerEngineBrake,
    destroyEngine,
    get profiles() { return { ...ENGINE_PROFILES }; },
    get activeEngines() { return _engines.size; }
  };
})();


// ============================================================
// ENVIRONMENTAL_AUDIO MODULE
// Map-aware ambient soundscape system with weather support
// ============================================================
const ENVIRONMENTAL_AUDIO = (function() {
  'use strict';

  // ---- Environment Profiles ----
  const ENVIRONMENT_PROFILES = {
    JUNGLE: {
      id: 'JUNGLE',
      reverbDecay: 1.2,
      reverbWetness: 0.3,
      layers: [
        { type: 'procedural', name: 'birdCalls', baseFreq: 1200, modFreq: 3, modDepth: 400, gainVal: 0.12, waveform: 'sine' },
        { type: 'procedural', name: 'insects', baseFreq: 3500, modFreq: 8, modDepth: 200, gainVal: 0.06, waveform: 'sine' },
        { type: 'procedural', name: 'waterfall', baseFreq: 200, modFreq: 0.3, modDepth: 100, gainVal: 0.2, waveform: 'noise' },
        { type: 'procedural', name: 'wind_leaves', baseFreq: 800, modFreq: 0.5, modDepth: 300, gainVal: 0.08, waveform: 'noise' }
      ]
    },
    DESERT: {
      id: 'DESERT',
      reverbDecay: 2.5,
      reverbWetness: 0.15,
      layers: [
        { type: 'procedural', name: 'windHowl', baseFreq: 150, modFreq: 0.2, modDepth: 80, gainVal: 0.22, waveform: 'noise' },
        { type: 'procedural', name: 'distantHawk', baseFreq: 800, modFreq: 0.5, modDepth: 300, gainVal: 0.04, waveform: 'sine' },
        { type: 'procedural', name: 'sandScrape', baseFreq: 600, modFreq: 2, modDepth: 200, gainVal: 0.05, waveform: 'noise' }
      ]
    },
    ARCTIC: {
      id: 'ARCTIC',
      reverbDecay: 3.0,
      reverbWetness: 0.2,
      layers: [
        { type: 'procedural', name: 'howlingWind', baseFreq: 120, modFreq: 0.15, modDepth: 60, gainVal: 0.3, waveform: 'noise' },
        { type: 'procedural', name: 'iceCreak', baseFreq: 200, modFreq: 0.8, modDepth: 80, gainVal: 0.07, waveform: 'sine' },
        { type: 'procedural', name: 'distantWolves', baseFreq: 350, modFreq: 3, modDepth: 100, gainVal: 0.03, waveform: 'sine' }
      ]
    },
    CITY: {
      id: 'CITY',
      reverbDecay: 0.8,
      reverbWetness: 0.25,
      layers: [
        { type: 'procedural', name: 'trafficAmbience', baseFreq: 100, modFreq: 0.3, modDepth: 50, gainVal: 0.2, waveform: 'noise' },
        { type: 'procedural', name: 'crowdMurmur', baseFreq: 300, modFreq: 0.5, modDepth: 100, gainVal: 0.1, waveform: 'noise' },
        { type: 'procedural', name: 'distantSirens', baseFreq: 600, modFreq: 2, modDepth: 200, gainVal: 0.03, waveform: 'sine' }
      ]
    },
    CAVE: {
      id: 'CAVE',
      reverbDecay: 4.5,
      reverbWetness: 0.65,
      layers: [
        { type: 'procedural', name: 'drippingWater', baseFreq: 1000, modFreq: 0.1, modDepth: 100, gainVal: 0.08, waveform: 'sine' },
        { type: 'procedural', name: 'bats', baseFreq: 3000, modFreq: 15, modDepth: 1000, gainVal: 0.03, waveform: 'sine' },
        { type: 'procedural', name: 'caveHum', baseFreq: 60, modFreq: 0.05, modDepth: 10, gainVal: 0.12, waveform: 'sine' }
      ]
    },
    OCEAN: {
      id: 'OCEAN',
      reverbDecay: 1.8,
      reverbWetness: 0.35,
      layers: [
        { type: 'procedural', name: 'waveCrash', baseFreq: 80, modFreq: 0.15, modDepth: 40, gainVal: 0.3, waveform: 'noise' },
        { type: 'procedural', name: 'seagulls', baseFreq: 1800, modFreq: 2, modDepth: 400, gainVal: 0.06, waveform: 'sine' },
        { type: 'procedural', name: 'buoyBell', baseFreq: 600, modFreq: 0.3, modDepth: 50, gainVal: 0.04, waveform: 'sine' }
      ]
    },
    VOLCANO: {
      id: 'VOLCANO',
      reverbDecay: 2.0,
      reverbWetness: 0.4,
      layers: [
        { type: 'procedural', name: 'lavaBubbling', baseFreq: 80, modFreq: 1, modDepth: 40, gainVal: 0.15, waveform: 'noise' },
        { type: 'procedural', name: 'distantRumbles', baseFreq: 40, modFreq: 0.1, modDepth: 20, gainVal: 0.25, waveform: 'noise' },
        { type: 'procedural', name: 'gasHiss', baseFreq: 2000, modFreq: 4, modDepth: 500, gainVal: 0.08, waveform: 'noise' }
      ]
    },
    SPACE: {
      id: 'SPACE',
      reverbDecay: 6.0,
      reverbWetness: 0.8,
      layers: [
        { type: 'procedural', name: 'suitVisorHum', baseFreq: 200, modFreq: 0.1, modDepth: 10, gainVal: 0.06, waveform: 'sine' },
        { type: 'procedural', name: 'commsStaticCrackle', baseFreq: 1200, modFreq: 20, modDepth: 800, gainVal: 0.03, waveform: 'noise' }
      ]
    },
    HAUNTED: {
      id: 'HAUNTED',
      reverbDecay: 3.5,
      reverbWetness: 0.55,
      layers: [
        { type: 'procedural', name: 'creakingWood', baseFreq: 150, modFreq: 0.3, modDepth: 50, gainVal: 0.09, waveform: 'sine' },
        { type: 'procedural', name: 'owlHoot', baseFreq: 280, modFreq: 5, modDepth: 60, gainVal: 0.05, waveform: 'sine' },
        { type: 'procedural', name: 'ghostWhisper', baseFreq: 600, modFreq: 0.8, modDepth: 200, gainVal: 0.04, waveform: 'noise' }
      ]
    }
  };

  // ---- Weather Profiles ----
  const WEATHER_PROFILES = {
    clear: { gainMult: 0, active: false },
    lightRain: {
      active: true,
      baseFreq: 2000,
      gainVal: 0.12,
      modFreq: 0.5,
      modDepth: 500,
      waveform: 'noise'
    },
    heavyRain: {
      active: true,
      baseFreq: 1200,
      gainVal: 0.3,
      modFreq: 2,
      modDepth: 600,
      waveform: 'noise'
    },
    thunder: {
      minInterval: 3000,
      maxInterval: 12000,
      gainVal: 0.6
    },
    wind: {
      active: true,
      baseFreq: 200,
      gainVal: 0.18,
      modFreq: 0.3,
      modDepth: 100,
      waveform: 'noise'
    },
    snow: {
      active: true,
      gainMult: 0.7,  // muffle overall audio
      addNoiseGain: 0.02
    }
  };

  // ---- Internal State ----
  let _audioCtx = null;
  let _masterBus = null;
  let _currentEnvId = null;
  let _currentEnvNodes = [];
  let _currentEnvGains = [];
  let _reverbNode = null;
  let _reverbGain = null;
  let _dryGain = null;
  let _weatherNodes = [];
  let _weatherGains = [];
  let _thunderTimer = null;
  let _currentWeather = 'clear';
  let _occlusionFilter = null;

  function init(audioContext, masterBus) {
    _audioCtx = audioContext;
    _masterBus = masterBus || audioContext.destination;

    // Dry bus
    _dryGain = _audioCtx.createGain();
    _dryGain.gain.setValueAtTime(0.7, _audioCtx.currentTime);
    _dryGain.connect(_masterBus);

    // Reverb bus
    _reverbGain = _audioCtx.createGain();
    _reverbGain.gain.setValueAtTime(0.3, _audioCtx.currentTime);
    _reverbGain.connect(_masterBus);

    // Occlusion filter
    _occlusionFilter = _audioCtx.createBiquadFilter();
    _occlusionFilter.type = 'lowpass';
    _occlusionFilter.frequency.setValueAtTime(20000, _audioCtx.currentTime);
    _occlusionFilter.connect(_dryGain);

    console.log('[ENVIRONMENTAL_AUDIO] Initialized');
  }

  // ---- Reverb Impulse Response ----
  function _buildImpulseResponse(decayTime) {
    if (!_audioCtx) return null;
    const sampleRate = _audioCtx.sampleRate;
    const length = Math.floor(sampleRate * decayTime);
    const buffer = _audioCtx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, 2);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    return buffer;
  }

  function _setupReverb(decayTime, wetness) {
    if (_reverbNode) {
      try { _reverbNode.disconnect(); } catch (e) {}
    }
    _reverbNode = _audioCtx.createConvolver();
    _reverbNode.buffer = _buildImpulseResponse(decayTime);
    _reverbNode.connect(_reverbGain);
    _reverbGain.gain.setValueAtTime(wetness, _audioCtx.currentTime);
    _dryGain.gain.setValueAtTime(1 - wetness * 0.5, _audioCtx.currentTime);
    return _reverbNode;
  }

  // ---- Layer Synthesis ----
  function _createLayer(layer, outputNode) {
    if (!_audioCtx) return { osc: null, gain: null };
    const gainNode = _audioCtx.createGain();
    gainNode.gain.setValueAtTime(layer.gainVal, _audioCtx.currentTime);

    if (layer.waveform === 'noise') {
      // White noise source with bandpass filter
      const noiseBuffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 3, _audioCtx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
      const noiseSrc = _audioCtx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      noiseSrc.loop = true;

      const bandpass = _audioCtx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(layer.baseFreq, _audioCtx.currentTime);
      bandpass.Q.setValueAtTime(2.0, _audioCtx.currentTime);

      // LFO for frequency modulation
      const lfo = _audioCtx.createOscillator();
      const lfoGain = _audioCtx.createGain();
      lfo.frequency.setValueAtTime(layer.modFreq, _audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(layer.modDepth, _audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();

      noiseSrc.connect(bandpass);
      bandpass.connect(gainNode);
      gainNode.connect(outputNode);
      if (_reverbNode) gainNode.connect(_reverbNode);
      noiseSrc.start();
      return { osc: noiseSrc, gain: gainNode, lfo };
    } else {
      // Oscillator with vibrato
      const osc = _audioCtx.createOscillator();
      osc.type = layer.waveform || 'sine';
      osc.frequency.setValueAtTime(layer.baseFreq, _audioCtx.currentTime);

      const lfo = _audioCtx.createOscillator();
      const lfoGain = _audioCtx.createGain();
      lfo.frequency.setValueAtTime(layer.modFreq, _audioCtx.currentTime);
      lfoGain.gain.setValueAtTime(layer.modDepth, _audioCtx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start();

      osc.connect(gainNode);
      gainNode.connect(outputNode);
      if (_reverbNode) gainNode.connect(_reverbNode);
      osc.start();
      return { osc, gain: gainNode, lfo };
    }
  }

  // ---- Load Environment ----
  function _stopCurrentEnv(fade) {
    const fadeTime = fade ? 1.5 : 0.1;
    for (const g of _currentEnvGains) {
      g.gain.cancelScheduledValues(_audioCtx.currentTime);
      g.gain.setValueAtTime(g.gain.value, _audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + fadeTime);
    }
    setTimeout(() => {
      for (const n of _currentEnvNodes) {
        try { if (n.osc) { n.osc.stop(); n.osc.disconnect(); } } catch (e) {}
        try { if (n.lfo) { n.lfo.stop(); n.lfo.disconnect(); } } catch (e) {}
        try { if (n.gain) n.gain.disconnect(); } catch (e) {}
      }
      _currentEnvNodes = [];
      _currentEnvGains = [];
    }, (fadeTime + 0.1) * 1000);
  }

  function setEnvironment(envId) {
    if (!_audioCtx) { console.warn('[ENVIRONMENTAL_AUDIO] Not initialized'); return; }
    if (envId === _currentEnvId) return;
    const profile = ENVIRONMENT_PROFILES[envId];
    if (!profile) { console.warn('[ENVIRONMENTAL_AUDIO] Unknown environment:', envId); return; }

    _stopCurrentEnv(_currentEnvId !== null);

    const transitionDelay = _currentEnvId ? 1600 : 0;
    _currentEnvId = envId;

    setTimeout(() => {
      if (_currentEnvId !== envId) return;
      _setupReverb(profile.reverbDecay, profile.reverbWetness);

      for (const layer of profile.layers) {
        const node = _createLayer(layer, _occlusionFilter);
        _currentEnvNodes.push(node);
        if (node.gain) _currentEnvGains.push(node.gain);
      }
    }, transitionDelay);
  }

  // ---- Weather Control ----
  function _stopWeather() {
    if (_thunderTimer) { clearTimeout(_thunderTimer); _thunderTimer = null; }
    for (const g of _weatherGains) {
      g.gain.cancelScheduledValues(_audioCtx.currentTime);
      g.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + 1.0);
    }
    setTimeout(() => {
      for (const n of _weatherNodes) {
        try { if (n.osc) { n.osc.stop(); n.osc.disconnect(); } } catch (e) {}
        try { if (n.lfo) { n.lfo.stop(); n.lfo.disconnect(); } } catch (e) {}
      }
      _weatherNodes = [];
      _weatherGains = [];
    }, 1100);
  }

  function _triggerThunder() {
    if (!_audioCtx) return;
    const now = _audioCtx.currentTime;
    const thunderOsc = _audioCtx.createOscillator();
    const thunderGain = _audioCtx.createGain();
    thunderOsc.type = 'sawtooth';
    thunderOsc.frequency.setValueAtTime(60 + Math.random() * 40, now);
    thunderOsc.frequency.exponentialRampToValueAtTime(20, now + 1.5);
    thunderGain.gain.setValueAtTime(0, now);
    thunderGain.gain.linearRampToValueAtTime(WEATHER_PROFILES.thunder.gainVal, now + 0.05);
    thunderGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    thunderOsc.connect(thunderGain);
    thunderGain.connect(_masterBus);
    thunderOsc.start(now);
    thunderOsc.stop(now + 1.6);

    // Schedule next thunder
    const interval = WEATHER_PROFILES.thunder.minInterval +
      Math.random() * (WEATHER_PROFILES.thunder.maxInterval - WEATHER_PROFILES.thunder.minInterval);
    _thunderTimer = setTimeout(_triggerThunder, interval);
  }

  function setWeather(weatherType) {
    if (!_audioCtx) return;
    if (weatherType === _currentWeather) return;
    _stopWeather();
    _currentWeather = weatherType;

    if (weatherType === 'clear') return;

    const wp = WEATHER_PROFILES[weatherType];
    if (!wp) return;

    if (wp.active) {
      const noiseBuffer = _audioCtx.createBuffer(1, _audioCtx.sampleRate * 4, _audioCtx.sampleRate);
      const nd = noiseBuffer.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      const src = _audioCtx.createBufferSource();
      src.buffer = noiseBuffer;
      src.loop = true;
      const bpf = _audioCtx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(wp.baseFreq, _audioCtx.currentTime);
      bpf.Q.setValueAtTime(1.5, _audioCtx.currentTime);
      const gainNode = _audioCtx.createGain();
      gainNode.gain.setValueAtTime(0, _audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(wp.gainVal, _audioCtx.currentTime + 1.5);
      src.connect(bpf);
      bpf.connect(gainNode);
      gainNode.connect(_masterBus);
      src.start();
      _weatherNodes.push({ osc: src });
      _weatherGains.push(gainNode);
    }

    if (weatherType === 'heavyRain' || weatherType === 'lightRain') {
      // Occasional thunder for heavy rain
      if (weatherType === 'heavyRain') {
        _thunderTimer = setTimeout(_triggerThunder, 5000 + Math.random() * 5000);
      }
    }

    if (weatherType === 'snow' && _occlusionFilter) {
      _occlusionFilter.frequency.setTargetAtTime(3000, _audioCtx.currentTime, 2.0);
    } else if (_occlusionFilter) {
      _occlusionFilter.frequency.setTargetAtTime(20000, _audioCtx.currentTime, 2.0);
    }
  }

  // ---- Audio Occlusion ----
  function setOcclusion(amount) {
    if (!_audioCtx || !_occlusionFilter) return;
    const maxFreq = 20000, minFreq = 200;
    const targetFreq = maxFreq - (maxFreq - minFreq) * Math.max(0, Math.min(1, amount));
    _occlusionFilter.frequency.setTargetAtTime(targetFreq, _audioCtx.currentTime, 0.1);
  }

  // ---- Distance-Based Falloff ----
  function getDistanceGain(distance, minDist, maxDist) {
    if (distance <= minDist) return 1;
    if (distance >= maxDist) return 0;
    const t = (distance - minDist) / (maxDist - minDist);
    return 1 / (1 + t * t * 4);
  }

  // ---- Public API ----
  return {
    init,
    setEnvironment,
    setWeather,
    setOcclusion,
    getDistanceGain,
    get currentEnvironment() { return _currentEnvId; },
    get currentWeather() { return _currentWeather; },
    get profiles() { return { ...ENVIRONMENT_PROFILES }; }
  };
})();


// ============================================================
// UI_SFX_LIBRARY MODULE
// Complete UI sound effect catalog with procedural generation
// ============================================================
const UI_SFX_LIBRARY = (function() {
  'use strict';

  // ---- Sound Definitions ----
  // Each: { category, freq, type, duration, attack, release, pitchSlide, gain, cooldown }
  const SOUND_DEFS = {
    // --- Navigation ---
    buttonClick:        { category:'ui',      freq:800,  type:'sine',     dur:0.06, atk:0.005, rel:0.05,  pitchSlide:0,     gain:0.3,  cooldown:80  },
    buttonHover:        { category:'ui',      freq:600,  type:'sine',     dur:0.04, atk:0.003, rel:0.035, pitchSlide:50,    gain:0.15, cooldown:50  },
    menuOpen:           { category:'ui',      freq:400,  type:'sine',     dur:0.15, atk:0.01,  rel:0.12,  pitchSlide:200,   gain:0.25, cooldown:200 },
    menuClose:          { category:'ui',      freq:600,  type:'sine',     dur:0.12, atk:0.005, rel:0.1,   pitchSlide:-200,  gain:0.25, cooldown:200 },
    tabSwitch:          { category:'ui',      freq:700,  type:'sine',     dur:0.08, atk:0.005, rel:0.07,  pitchSlide:80,    gain:0.2,  cooldown:100 },
    sliderChange:       { category:'ui',      freq:500,  type:'sine',     dur:0.04, atk:0.002, rel:0.035, pitchSlide:0,     gain:0.1,  cooldown:30  },
    // --- Success ---
    coinCollect:        { category:'reward',  freq:1200, type:'sine',     dur:0.1,  atk:0.005, rel:0.09,  pitchSlide:400,   gain:0.4,  cooldown:50  },
    diamondCollect:     { category:'reward',  freq:1600, type:'sine',     dur:0.12, atk:0.005, rel:0.11,  pitchSlide:600,   gain:0.45, cooldown:50  },
    levelUp:            { category:'reward',  freq:440,  type:'sine',     dur:0.6,  atk:0.01,  rel:0.5,   pitchSlide:880,   gain:0.5,  cooldown:1000},
    achievementUnlock:  { category:'reward',  freq:523,  type:'triangle', dur:0.5,  atk:0.01,  rel:0.45,  pitchSlide:1046,  gain:0.5,  cooldown:500 },
    questComplete:      { category:'reward',  freq:392,  type:'sine',     dur:0.8,  atk:0.02,  rel:0.7,   pitchSlide:784,   gain:0.55, cooldown:1000},
    // --- Failure ---
    crash:              { category:'failure', freq:200,  type:'sawtooth', dur:0.4,  atk:0.005, rel:0.35,  pitchSlide:-150,  gain:0.6,  cooldown:500 },
    outOfFuel:          { category:'failure', freq:150,  type:'square',   dur:0.35, atk:0.01,  rel:0.3,   pitchSlide:-80,   gain:0.5,  cooldown:500 },
    gameOver:           { category:'failure', freq:180,  type:'sawtooth', dur:1.0,  atk:0.02,  rel:0.9,   pitchSlide:-100,  gain:0.6,  cooldown:2000},
    banned:             { category:'failure', freq:120,  type:'square',   dur:0.5,  atk:0.01,  rel:0.45,  pitchSlide:-60,   gain:0.55, cooldown:1000},
    error:              { category:'failure', freq:300,  type:'square',   dur:0.2,  atk:0.005, rel:0.17,  pitchSlide:0,     gain:0.35, cooldown:200 },
    // --- Combat / Boost ---
    nitroActivate:      { category:'combat',  freq:220,  type:'sawtooth', dur:0.3,  atk:0.01,  rel:0.25,  pitchSlide:440,   gain:0.55, cooldown:300 },
    nitroDeploy:        { category:'combat',  freq:110,  type:'sawtooth', dur:0.5,  atk:0.02,  rel:0.45,  pitchSlide:300,   gain:0.6,  cooldown:400 },
    boostStart:         { category:'combat',  freq:280,  type:'sawtooth', dur:0.25, atk:0.008, rel:0.22,  pitchSlide:350,   gain:0.5,  cooldown:250 },
    boostEnd:           { category:'combat',  freq:400,  type:'sine',     dur:0.2,  atk:0.005, rel:0.18,  pitchSlide:-150,  gain:0.4,  cooldown:200 },
    // --- Transitions ---
    screenFade:         { category:'ui',      freq:300,  type:'sine',     dur:0.4,  atk:0.1,   rel:0.3,   pitchSlide:0,     gain:0.15, cooldown:400 },
    whoosh:             { category:'ui',      freq:800,  type:'noise',    dur:0.25, atk:0.02,  rel:0.2,   pitchSlide:-400,  gain:0.3,  cooldown:200 },
    pop:                { category:'ui',      freq:900,  type:'sine',     dur:0.08, atk:0.002, rel:0.07,  pitchSlide:200,   gain:0.35, cooldown:80  },
    slide:              { category:'ui',      freq:500,  type:'sine',     dur:0.15, atk:0.01,  rel:0.13,  pitchSlide:100,   gain:0.2,  cooldown:150 },
    // --- Notifications ---
    alert:              { category:'notify',  freq:880,  type:'sine',     dur:0.3,  atk:0.01,  rel:0.27,  pitchSlide:0,     gain:0.4,  cooldown:500 },
    ping:               { category:'notify',  freq:1400, type:'sine',     dur:0.15, atk:0.005, rel:0.14,  pitchSlide:200,   gain:0.35, cooldown:200 },
    chime:              { category:'notify',  freq:1046, type:'sine',     dur:0.4,  atk:0.01,  rel:0.38,  pitchSlide:0,     gain:0.3,  cooldown:400 },
    fanfare:            { category:'notify',  freq:523,  type:'sine',     dur:0.7,  atk:0.02,  rel:0.65,  pitchSlide:1046,  gain:0.5,  cooldown:800 },
    // --- Social ---
    friendOnline:       { category:'social',  freq:660,  type:'sine',     dur:0.25, atk:0.01,  rel:0.22,  pitchSlide:880,   gain:0.3,  cooldown:300 },
    messageReceived:    { category:'social',  freq:740,  type:'sine',     dur:0.18, atk:0.005, rel:0.16,  pitchSlide:100,   gain:0.3,  cooldown:200 },
    challengeReceived:  { category:'social',  freq:440,  type:'square',   dur:0.3,  atk:0.01,  rel:0.27,  pitchSlide:220,   gain:0.4,  cooldown:400 },
    // --- Purchase ---
    buyItem:            { category:'purchase',freq:880,  type:'sine',     dur:0.2,  atk:0.005, rel:0.18,  pitchSlide:1200,  gain:0.45, cooldown:300 },
    buyConfirm:         { category:'purchase',freq:1046, type:'sine',     dur:0.3,  atk:0.01,  rel:0.27,  pitchSlide:1568,  gain:0.5,  cooldown:500 },
    buyFail:            { category:'purchase',freq:220,  type:'square',   dur:0.25, atk:0.01,  rel:0.22,  pitchSlide:0,     gain:0.4,  cooldown:300 },
    lootOpen:           { category:'purchase',freq:600,  type:'sine',     dur:0.5,  atk:0.02,  rel:0.45,  pitchSlide:1200,  gain:0.55, cooldown:600 },
    rewardClaim:        { category:'purchase',freq:784,  type:'sine',     dur:0.35, atk:0.01,  rel:0.32,  pitchSlide:1046,  gain:0.5,  cooldown:500 },
    // --- Countdown ---
    countdown3:         { category:'race',    freq:440,  type:'sine',     dur:0.25, atk:0.005, rel:0.22,  pitchSlide:0,     gain:0.5,  cooldown:0   },
    countdown2:         { category:'race',    freq:523,  type:'sine',     dur:0.25, atk:0.005, rel:0.22,  pitchSlide:0,     gain:0.5,  cooldown:0   },
    countdown1:         { category:'race',    freq:622,  type:'sine',     dur:0.25, atk:0.005, rel:0.22,  pitchSlide:0,     gain:0.5,  cooldown:0   },
    countdownGo:        { category:'race',    freq:880,  type:'sine',     dur:0.5,  atk:0.005, rel:0.45,  pitchSlide:1100,  gain:0.7,  cooldown:0   },
    // --- Tricks ---
    flip:               { category:'trick',   freq:300,  type:'sine',     dur:0.3,  atk:0.01,  rel:0.27,  pitchSlide:600,   gain:0.4,  cooldown:200 },
    wheelie:            { category:'trick',   freq:200,  type:'sawtooth', dur:0.2,  atk:0.01,  rel:0.17,  pitchSlide:100,   gain:0.35, cooldown:150 },
    landing:            { category:'trick',   freq:150,  type:'square',   dur:0.15, atk:0.005, rel:0.13,  pitchSlide:-50,   gain:0.45, cooldown:100 },
    perfectLanding:     { category:'trick',   freq:880,  type:'sine',     dur:0.3,  atk:0.005, rel:0.28,  pitchSlide:1200,  gain:0.55, cooldown:200 },
    combo:              { category:'trick',   freq:660,  type:'sine',     dur:0.25, atk:0.005, rel:0.23,  pitchSlide:880,   gain:0.5,  cooldown:100 },
    // --- Checkpoints ---
    passedCheckpoint:   { category:'race',    freq:700,  type:'sine',     dur:0.25, atk:0.005, rel:0.23,  pitchSlide:900,   gain:0.45, cooldown:500 },
    finalCheckpoint:    { category:'race',    freq:880,  type:'sine',     dur:0.5,  atk:0.01,  rel:0.47,  pitchSlide:1200,  gain:0.6,  cooldown:1000},
    newRecord:          { category:'race',    freq:1046, type:'sine',     dur:0.6,  atk:0.01,  rel:0.57,  pitchSlide:1568,  gain:0.65, cooldown:1000}
  };

  // ---- Internal State ----
  let _audioCtx = null;
  let _masterGain = null;
  let _categoryGains = {};
  let _cooldownTimers = {};
  let _volumesByCategory = {
    ui: 0.8, reward: 1.0, failure: 0.9, combat: 0.85,
    notify: 0.75, social: 0.7, purchase: 0.9, race: 1.0, trick: 0.85
  };

  function init(audioContext) {
    _audioCtx = audioContext;
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.setValueAtTime(0.8, _audioCtx.currentTime);
    _masterGain.connect(_audioCtx.destination);

    // Category gain nodes
    const categories = [...new Set(Object.values(SOUND_DEFS).map(s => s.category))];
    for (const cat of categories) {
      const g = _audioCtx.createGain();
      g.gain.setValueAtTime(_volumesByCategory[cat] || 0.8, _audioCtx.currentTime);
      g.connect(_masterGain);
      _categoryGains[cat] = g;
    }
    console.log('[UI_SFX_LIBRARY] Initialized with', Object.keys(SOUND_DEFS).length, 'sounds');
  }

  // ---- Play Sound ----
  function play(soundName) {
    if (!_audioCtx) { console.warn('[UI_SFX_LIBRARY] Not initialized'); return; }
    const def = SOUND_DEFS[soundName];
    if (!def) { console.warn('[UI_SFX_LIBRARY] Unknown sound:', soundName); return; }

    // Cooldown check
    if (_cooldownTimers[soundName]) return;
    if (def.cooldown > 0) {
      _cooldownTimers[soundName] = true;
      setTimeout(() => { delete _cooldownTimers[soundName]; }, def.cooldown);
    }

    const now = _audioCtx.currentTime;
    const output = _categoryGains[def.category] || _masterGain;

    if (def.type === 'noise') {
      _playNoise(def, now, output);
    } else {
      _playOscillator(def, now, output);
    }
  }

  function _playOscillator(def, now, output) {
    const osc = _audioCtx.createOscillator();
    const gainNode = _audioCtx.createGain();

    osc.type = def.type;
    osc.frequency.setValueAtTime(def.freq, now);
    if (def.pitchSlide !== 0) {
      osc.frequency.linearRampToValueAtTime(def.freq + def.pitchSlide, now + def.dur);
    }

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(def.gain, now + def.atk);
    gainNode.gain.setValueAtTime(def.gain, now + def.dur - def.rel);
    gainNode.gain.linearRampToValueAtTime(0, now + def.dur);

    osc.connect(gainNode);
    gainNode.connect(output);
    osc.start(now);
    osc.stop(now + def.dur + 0.01);
  }

  function _playNoise(def, now, output) {
    const bufLen = Math.ceil(_audioCtx.sampleRate * (def.dur + 0.05));
    const buf = _audioCtx.createBuffer(1, bufLen, _audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    const src = _audioCtx.createBufferSource();
    src.buffer = buf;
    const gainNode = _audioCtx.createGain();
    const bpf = _audioCtx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(def.freq, now);
    if (def.pitchSlide !== 0) {
      bpf.frequency.linearRampToValueAtTime(Math.max(20, def.freq + def.pitchSlide), now + def.dur);
    }
    bpf.Q.setValueAtTime(2, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(def.gain, now + def.atk);
    gainNode.gain.setValueAtTime(def.gain, now + def.dur - def.rel);
    gainNode.gain.linearRampToValueAtTime(0, now + def.dur);
    src.connect(bpf);
    bpf.connect(gainNode);
    gainNode.connect(output);
    src.start(now);
  }

  // ---- Countdown Sequence ----
  function playCountdown(onGo) {
    if (!_audioCtx) return;
    play('countdown3');
    setTimeout(() => play('countdown2'), 1000);
    setTimeout(() => play('countdown1'), 2000);
    setTimeout(() => { play('countdownGo'); if (onGo) onGo(); }, 3000);
  }

  // ---- Volume Control ----
  function setCategoryVolume(category, volume) {
    _volumesByCategory[category] = Math.max(0, Math.min(1, volume));
    if (_categoryGains[category]) {
      _categoryGains[category].gain.setTargetAtTime(
        _volumesByCategory[category], _audioCtx.currentTime, 0.05
      );
    }
  }

  function setMasterVolume(volume) {
    if (_masterGain && _audioCtx) {
      _masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), _audioCtx.currentTime, 0.05);
    }
  }

  // ---- Public API ----
  return {
    init,
    play,
    playCountdown,
    setCategoryVolume,
    setMasterVolume,
    get soundNames() { return Object.keys(SOUND_DEFS); },
    get categories() { return Object.keys(_categoryGains); }
  };
})();


// ============================================================
// POSITIONAL_AUDIO MODULE
// 2D positional audio with panning, Doppler effect, echo zones
// ============================================================
const POSITIONAL_AUDIO = (function() {
  'use strict';

  const MAX_SOURCES = 16;
  const ROLLOFF_LINEAR = 'linear';
  const ROLLOFF_INVERSE = 'inverse';
  const ROLLOFF_INVERSE_SQUARE = 'inverse_square';

  // ---- Internal State ----
  let _audioCtx = null;
  let _masterGain = null;
  let _listener = { x: 0, y: 0, vx: 0, vy: 0 };
  let _sources = new Map();
  let _sourceIdCounter = 0;
  let _echoZones = [];
  let _debugMode = false;
  let _stereoWidth = 1.0;
  let _defaultAudioRange = 400;
  let _defaultFalloffDist = 150;

  // ---- Initialization ----
  function init(audioContext, masterBus) {
    _audioCtx = audioContext;
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.setValueAtTime(0.9, _audioCtx.currentTime);
    _masterGain.connect(masterBus || _audioCtx.destination);
    console.log('[POSITIONAL_AUDIO] Initialized (max', MAX_SOURCES, 'sources)');
  }

  // ---- Pan Calculation ----
  function _calculatePan(sourceX, listenerX, audioRange) {
    const delta = (sourceX - listenerX) / (audioRange * 0.5);
    return Math.max(-1, Math.min(1, delta)) * _stereoWidth;
  }

  // ---- Volume from Distance ----
  function _calculateVolume(distance, minDist, maxDist, rolloff) {
    if (distance <= minDist) return 1;
    if (distance >= maxDist) return 0;
    const t = (distance - minDist) / (maxDist - minDist);
    switch (rolloff) {
      case ROLLOFF_LINEAR:          return 1 - t;
      case ROLLOFF_INVERSE:         return 1 / (1 + t * 4);
      case ROLLOFF_INVERSE_SQUARE:
      default:                      return 1 / (1 + t * t * 4);
    }
  }

  // ---- Distance ----
  function _distance(x1, y1, x2, y2) {
    const dx = x1 - x2, dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ---- Doppler Pitch Shift ----
  function _dopplerShift(source, listener) {
    const speedOfSound = 340;
    const dx = source.x - listener.x;
    const dy = source.y - listener.y;
    const dist = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
    const nx = dx / dist, ny = dy / dist;

    const sourceRadialVel = (source.vx || 0) * nx + (source.vy || 0) * ny;
    const listenerRadialVel = listener.vx * nx + listener.vy * ny;

    const ratio = (speedOfSound + listenerRadialVel) / Math.max(1, speedOfSound + sourceRadialVel);
    return Math.max(0.5, Math.min(2.0, ratio));
  }

  // ---- Echo Zone Check ----
  function _inEchoZone(x, y) {
    for (const zone of _echoZones) {
      const dx = x - zone.x, dy = y - zone.y;
      if (dx * dx + dy * dy <= zone.radius * zone.radius) return zone;
    }
    return null;
  }

  // ---- Priority Score (for eviction) ----
  function _sourcePriority(source) {
    const dist = _distance(source.x, source.y, _listener.x, _listener.y);
    return (1 / (1 + dist / 100)) * (source.priority || 1);
  }

  // ---- Create Audio Source Nodes ----
  function _createSourceNodes(source) {
    if (!_audioCtx) return null;

    const nodes = {};

    // Buffer source (for procedural or decoded audio)
    if (source.buffer) {
      nodes.bufferSource = _audioCtx.createBufferSource();
      nodes.bufferSource.buffer = source.buffer;
      nodes.bufferSource.loop = source.loop || false;
    } else {
      // Fallback: oscillator
      nodes.oscillator = _audioCtx.createOscillator();
      nodes.oscillator.type = 'sine';
      nodes.oscillator.frequency.setValueAtTime(source.frequency || 440, _audioCtx.currentTime);
    }

    nodes.gainNode = _audioCtx.createGain();
    nodes.panner = _audioCtx.createStereoPanner();

    const audioSourceNode = nodes.bufferSource || nodes.oscillator;
    audioSourceNode.connect(nodes.gainNode);
    nodes.gainNode.connect(nodes.panner);

    // Echo zone: add reverb
    const echoZone = _inEchoZone(source.x, source.y);
    if (echoZone && echoZone.reverbNode) {
      nodes.gainNode.connect(echoZone.reverbNode);
    }

    nodes.panner.connect(_masterGain);

    if (nodes.bufferSource) nodes.bufferSource.start();
    else nodes.oscillator.start();

    return nodes;
  }

  // ---- Add Echo Zone ----
  function addEchoZone(zoneConfig) {
    const zone = {
      id: zoneConfig.id || 'zone_' + Date.now(),
      x: zoneConfig.x || 0,
      y: zoneConfig.y || 0,
      radius: zoneConfig.radius || 200,
      reverbDecay: zoneConfig.reverbDecay || 2.0,
      reverbNode: null
    };

    if (_audioCtx) {
      // Build simple reverb for this zone
      const irDuration = zone.reverbDecay;
      const irLength = Math.floor(_audioCtx.sampleRate * irDuration);
      const irBuffer = _audioCtx.createBuffer(2, irLength, _audioCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = irBuffer.getChannelData(ch);
        for (let i = 0; i < irLength; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLength, 2);
        }
      }
      const convolver = _audioCtx.createConvolver();
      convolver.buffer = irBuffer;
      const echoGain = _audioCtx.createGain();
      echoGain.gain.setValueAtTime(0.4, _audioCtx.currentTime);
      convolver.connect(echoGain);
      echoGain.connect(_masterGain);
      zone.reverbNode = convolver;
    }

    _echoZones.push(zone);
    return zone.id;
  }

  // ---- Add Positional Source ----
  function addSource(config) {
    if (!_audioCtx) { console.warn('[POSITIONAL_AUDIO] Not initialized'); return -1; }

    // Evict lowest priority if at limit
    if (_sources.size >= MAX_SOURCES) {
      let lowestId = null, lowestPriority = Infinity;
      for (const [id, src] of _sources) {
        const p = _sourcePriority(src);
        if (p < lowestPriority) { lowestPriority = p; lowestId = id; }
      }
      if (lowestId !== null) removeSource(lowestId);
    }

    const id = ++_sourceIdCounter;
    const source = {
      id,
      x: config.x || 0,
      y: config.y || 0,
      vx: config.vx || 0,
      vy: config.vy || 0,
      volume: config.volume !== undefined ? config.volume : 1.0,
      frequency: config.frequency || 440,
      buffer: config.buffer || null,
      loop: config.loop !== undefined ? config.loop : true,
      minDist: config.minDist || 10,
      maxDist: config.maxDist || _defaultFalloffDist,
      audioRange: config.audioRange || _defaultAudioRange,
      rolloff: config.rolloff || ROLLOFF_INVERSE_SQUARE,
      priority: config.priority || 1,
      nodes: null,
      active: true
    };

    source.nodes = _createSourceNodes(source);
    if (!source.nodes) return -1;

    _sources.set(id, source);
    return id;
  }

  // ---- Remove Source ----
  function removeSource(id) {
    const source = _sources.get(id);
    if (!source) return;
    if (source.nodes) {
      try {
        if (source.nodes.bufferSource) { source.nodes.bufferSource.stop(); source.nodes.bufferSource.disconnect(); }
        if (source.nodes.oscillator) { source.nodes.oscillator.stop(); source.nodes.oscillator.disconnect(); }
        if (source.nodes.gainNode) source.nodes.gainNode.disconnect();
        if (source.nodes.panner) source.nodes.panner.disconnect();
      } catch (e) { /* cleanup errors ignorable */ }
    }
    _sources.delete(id);
  }

  // ---- Update Source Position ----
  function updateSource(id, x, y, vx, vy) {
    const source = _sources.get(id);
    if (!source) return;
    source.x = x;
    source.y = y;
    if (vx !== undefined) source.vx = vx;
    if (vy !== undefined) source.vy = vy;
  }

  // ---- Update Listener ----
  function updateListener(x, y, vx, vy) {
    _listener.x = x;
    _listener.y = y;
    _listener.vx = vx || 0;
    _listener.vy = vy || 0;
  }

  // ---- Update All Sources (call each frame) ----
  function update() {
    if (!_audioCtx) return;
    const now = _audioCtx.currentTime;

    for (const [id, source] of _sources) {
      if (!source.nodes || !source.active) continue;

      const dist = _distance(source.x, source.y, _listener.x, _listener.y);
      const vol = source.volume * _calculateVolume(dist, source.minDist, source.maxDist, source.rolloff);
      const pan = _calculatePan(source.x, _listener.x, source.audioRange);
      const doppler = _dopplerShift(source, _listener);

      // Apply pan
      if (source.nodes.panner) {
        source.nodes.panner.pan.setTargetAtTime(pan, now, 0.05);
      }

      // Apply volume
      if (source.nodes.gainNode) {
        source.nodes.gainNode.gain.setTargetAtTime(Math.max(0, vol), now, 0.05);
      }

      // Apply Doppler pitch shift
      if (source.nodes.oscillator) {
        source.nodes.oscillator.frequency.setTargetAtTime(
          (source.frequency || 440) * doppler, now, 0.05
        );
      }
      if (source.nodes.bufferSource) {
        source.nodes.bufferSource.playbackRate.setTargetAtTime(doppler, now, 0.05);
      }
    }
  }

  // ---- Debug Overlay ----
  function renderDebugOverlay(ctx2d, cameraX, cameraY, scale) {
    if (!_debugMode) return;
    ctx2d.save();
    ctx2d.strokeStyle = 'rgba(0, 255, 128, 0.6)';
    ctx2d.fillStyle = 'rgba(0, 255, 128, 0.15)';
    ctx2d.lineWidth = 1;

    for (const [id, source] of _sources) {
      const sx = (source.x - cameraX) * scale;
      const sy = (source.y - cameraY) * scale;
      const maxR = source.maxDist * scale;
      const minR = source.minDist * scale;

      // Outer falloff circle
      ctx2d.beginPath();
      ctx2d.arc(sx, sy, maxR, 0, Math.PI * 2);
      ctx2d.stroke();

      // Inner full-volume circle
      ctx2d.beginPath();
      ctx2d.arc(sx, sy, minR, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.stroke();

      // Source ID label
      ctx2d.fillStyle = 'rgba(0, 255, 128, 0.9)';
      ctx2d.fillText('SRC' + id, sx + 4, sy - 4);
      ctx2d.fillStyle = 'rgba(0, 255, 128, 0.15)';
    }

    // Listener marker
    const lx = (_listener.x - cameraX) * scale;
    const ly = (_listener.y - cameraY) * scale;
    ctx2d.strokeStyle = 'rgba(255, 200, 0, 0.8)';
    ctx2d.beginPath();
    ctx2d.arc(lx, ly, 8, 0, Math.PI * 2);
    ctx2d.stroke();
    ctx2d.fillStyle = 'rgba(255, 200, 0, 0.8)';
    ctx2d.fillText('EAR', lx + 10, ly);

    // Echo zones
    ctx2d.strokeStyle = 'rgba(100, 100, 255, 0.5)';
    for (const zone of _echoZones) {
      const zx = (zone.x - cameraX) * scale;
      const zy = (zone.y - cameraY) * scale;
      ctx2d.beginPath();
      ctx2d.arc(zx, zy, zone.radius * scale, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.fillStyle = 'rgba(100, 100, 255, 0.1)';
      ctx2d.fill();
    }

    ctx2d.restore();
  }

  // ---- Stereo Width ----
  function setStereoWidth(width) {
    _stereoWidth = Math.max(0, Math.min(1, width));
  }

  // ---- Public API ----
  return {
    init,
    addSource,
    removeSource,
    updateSource,
    updateListener,
    addEchoZone,
    update,
    renderDebugOverlay,
    setStereoWidth,
    set debugMode(v) { _debugMode = !!v; },
    get debugMode() { return _debugMode; },
    get activeSources() { return _sources.size; },
    get listener() { return { ..._listener }; },
    ROLLOFF: { LINEAR: ROLLOFF_LINEAR, INVERSE: ROLLOFF_INVERSE, INVERSE_SQUARE: ROLLOFF_INVERSE_SQUARE }
  };
})();


// ============================================================
// MODULE INTEGRATION — wire all new systems to existing exports
// ============================================================
(function() {
  'use strict';

  // Augment module.exports if CommonJS environment
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      MUSIC_SYSTEM_V2,
      ENGINE_SOUND_SYSTEM_V2,
      ENVIRONMENTAL_AUDIO,
      UI_SFX_LIBRARY,
      POSITIONAL_AUDIO
    });
  }

  // Expose on window for browser context
  if (typeof window !== 'undefined') {
    window.MUSIC_SYSTEM_V2        = MUSIC_SYSTEM_V2;
    window.ENGINE_SOUND_SYSTEM_V2 = ENGINE_SOUND_SYSTEM_V2;
    window.ENVIRONMENTAL_AUDIO = ENVIRONMENTAL_AUDIO;
    window.UI_SFX_LIBRARY      = UI_SFX_LIBRARY;
    window.POSITIONAL_AUDIO    = POSITIONAL_AUDIO;
  }

  console.log('[AHMET Audio] Extended modules loaded: MUSIC_SYSTEM_V2, ENGINE_SOUND_SYSTEM_V2, ENVIRONMENTAL_AUDIO, UI_SFX_LIBRARY, POSITIONAL_AUDIO');
})();


// ============================================================
// MUSIC_SYSTEM_V2 EXTENDED — Advanced Sequencer & Layer Engine
// Additional ~40KB of music logic, track analysis, and mixing
// ============================================================
(function() {
  'use strict';

  // ---- Extended Track Metadata ----
  const EXTENDED_TRACK_META = {
    menu_calm:         { key: 'C', scale: 'major', tempo_feel: 'relaxed',  energy: 0.10, colorHex: '#8EC8F0' },
    jungle_groove:     { key: 'F', scale: 'minor', tempo_feel: 'bouncy',   energy: 0.55, colorHex: '#4CAF50' },
    desert_drive:      { key: 'A', scale: 'minor', tempo_feel: 'driving',  energy: 0.62, colorHex: '#FF9800' },
    arctic_chill:      { key: 'D', scale: 'minor', tempo_feel: 'steady',   energy: 0.58, colorHex: '#B3E5FC' },
    city_rush:         { key: 'G', scale: 'pentatonic', tempo_feel: 'aggressive', energy: 0.78, colorHex: '#9C27B0' },
    cave_echo:         { key: 'E', scale: 'dorian',  tempo_feel: 'dark',   energy: 0.42, colorHex: '#37474F' },
    ocean_wave:        { key: 'B', scale: 'major',  tempo_feel: 'flowing', energy: 0.50, colorHex: '#0097A7' },
    volcano_fury:      { key: 'C', scale: 'phrygian', tempo_feel: 'frantic', energy: 0.92, colorHex: '#E64A19' },
    space_drift:       { key: 'F', scale: 'lydian',  tempo_feel: 'floating', energy: 0.48, colorHex: '#1A237E' },
    haunted_ride:      { key: 'D', scale: 'diminished', tempo_feel: 'eerie', energy: 0.60, colorHex: '#4A148C' },
    boss_battle:       { key: 'C', scale: 'phrygian', tempo_feel: 'epic',  energy: 1.00, colorHex: '#B71C1C' },
    victory_fanfare:   { key: 'C', scale: 'major',  tempo_feel: 'triumphant', energy: 1.00, colorHex: '#FFD600' },
    defeat_sting:      { key: 'A', scale: 'minor',  tempo_feel: 'heavy',   energy: 0.30, colorHex: '#546E7A' },
    high_intensity:    { key: 'G', scale: 'minor',  tempo_feel: 'relentless', energy: 0.96, colorHex: '#D50000' },
    chill_cruise:      { key: 'F', scale: 'major',  tempo_feel: 'lazy',    energy: 0.15, colorHex: '#FFF9C4' }
  };

  // ---- Music Cue Trigger System ----
  const CUE_TYPES = {
    ON_AIRBORNE:       'on_airborne',
    ON_LAND:           'on_land',
    ON_NITRO:          'on_nitro',
    ON_CRASH:          'on_crash',
    ON_CHECKPOINT:     'on_checkpoint',
    ON_SPEED_PEAK:     'on_speed_peak',
    ON_LOW_HEALTH:     'on_low_health',
    ON_HEALTH_RECOVER: 'on_health_recover',
    ON_COMBO_START:    'on_combo_start',
    ON_COMBO_END:      'on_combo_end',
    ON_BOSS_ENTER:     'on_boss_enter',
    ON_RACE_START:     'on_race_start',
    ON_RACE_END:       'on_race_end'
  };

  const MusicCueSystem = {
    _listeners: {},
    _lastCueTime: {},
    _minCueInterval: 500,

    registerCue(cueType, callback) {
      if (!this._listeners[cueType]) this._listeners[cueType] = [];
      this._listeners[cueType].push(callback);
    },

    triggerCue(cueType, data) {
      const now = Date.now();
      if (this._lastCueTime[cueType] && now - this._lastCueTime[cueType] < this._minCueInterval) return;
      this._lastCueTime[cueType] = now;
      const callbacks = this._listeners[cueType] || [];
      for (const cb of callbacks) {
        try { cb(data); } catch (e) { console.error('[MusicCue] Error in callback:', e); }
      }
    },

    clearCue(cueType) {
      delete this._listeners[cueType];
    },

    clearAll() {
      this._listeners = {};
      this._lastCueTime = {};
    }
  };

  // ---- Beat Synchronization Engine ----
  const BeatSyncEngine = (function() {
    let _bpm = 120;
    let _startTime = null;
    let _audioCtx = null;
    let _beatCallbacks = [];
    let _barCallbacks = [];
    let _schedulerTimer = null;
    let _nextBeatTime = 0;
    let _beatCount = 0;
    let _beatsPerBar = 4;
    let _running = false;

    function init(audioContext, bpm, beatsPerBar) {
      _audioCtx = audioContext;
      _bpm = bpm || 120;
      _beatsPerBar = beatsPerBar || 4;
    }

    function start() {
      if (!_audioCtx || _running) return;
      _running = true;
      _beatCount = 0;
      _nextBeatTime = _audioCtx.currentTime;
      _schedule();
    }

    function stop() {
      _running = false;
      if (_schedulerTimer) { clearTimeout(_schedulerTimer); _schedulerTimer = null; }
    }

    function setBPM(bpm) {
      _bpm = Math.max(40, Math.min(300, bpm));
    }

    function _schedule() {
      if (!_running) return;
      const lookAhead = 0.1;
      const scheduleInterval = 25;
      const beatDuration = 60 / _bpm;

      while (_nextBeatTime < _audioCtx.currentTime + lookAhead) {
        _fireBeat(_nextBeatTime, _beatCount);
        _beatCount++;
        _nextBeatTime += beatDuration;
      }

      _schedulerTimer = setTimeout(_schedule, scheduleInterval);
    }

    function _fireBeat(time, beatIndex) {
      for (const cb of _beatCallbacks) {
        try { cb(time, beatIndex, beatIndex % _beatsPerBar); } catch (e) {}
      }
      if (beatIndex % _beatsPerBar === 0) {
        const barIndex = Math.floor(beatIndex / _beatsPerBar);
        for (const cb of _barCallbacks) {
          try { cb(time, barIndex); } catch (e) {}
        }
      }
    }

    function onBeat(callback) { _beatCallbacks.push(callback); }
    function onBar(callback) { _barCallbacks.push(callback); }
    function offBeat(callback) { _beatCallbacks = _beatCallbacks.filter(c => c !== callback); }
    function offBar(callback) { _barCallbacks = _barCallbacks.filter(c => c !== callback); }

    function getCurrentBeat() {
      if (!_audioCtx || !_running) return 0;
      return _beatCount;
    }

    function getBeatFraction() {
      if (!_audioCtx || !_running) return 0;
      const beatDur = 60 / _bpm;
      const elapsed = _audioCtx.currentTime - (_nextBeatTime - beatDur);
      return Math.max(0, Math.min(1, elapsed / beatDur));
    }

    return { init, start, stop, setBPM, onBeat, onBar, offBeat, offBar, getCurrentBeat, getBeatFraction };
  })();

  // ---- Dynamic Mix Automation ----
  const MixAutomation = {
    _automations: [],
    _audioCtx: null,
    _active: false,

    init(audioContext) {
      this._audioCtx = audioContext;
    },

    addAutomation(paramGetter, valuePoints, durationSec) {
      if (!this._audioCtx) return;
      const now = this._audioCtx.currentTime;
      const param = paramGetter();
      if (!param) return;
      param.cancelScheduledValues(now);
      param.setValueAtTime(valuePoints[0].v, now + valuePoints[0].t * durationSec);
      for (let i = 1; i < valuePoints.length; i++) {
        param.linearRampToValueAtTime(valuePoints[i].v, now + valuePoints[i].t * durationSec);
      }
    },

    swell(gainNode, fromGain, toGain, duration) {
      if (!this._audioCtx || !gainNode) return;
      const now = this._audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(fromGain, now);
      gainNode.gain.linearRampToValueAtTime(toGain, now + duration);
    },

    dip(gainNode, duration, depth) {
      if (!this._audioCtx || !gainNode) return;
      const now = this._audioCtx.currentTime;
      const orig = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(orig, now);
      gainNode.gain.linearRampToValueAtTime(orig * (1 - depth), now + duration * 0.3);
      gainNode.gain.linearRampToValueAtTime(orig, now + duration);
    }
  };

  // ---- Stinger System (short music hits on events) ----
  const StingerSystem = (function() {
    let _audioCtx = null;
    let _masterGain = null;

    const STINGERS = {
      hitMarker: { freqs: [800, 1200], dur: 0.08, type: 'sine' },
      pointScore: { freqs: [660, 880, 1100], dur: 0.15, type: 'sine' },
      danger: { freqs: [200, 180], dur: 0.3, type: 'sawtooth' },
      powerup: { freqs: [523, 659, 784, 1047], dur: 0.4, type: 'sine' },
      heartbeat: { freqs: [60, 55], dur: 0.15, type: 'sine' },
      comboBreak: { freqs: [400, 300, 200], dur: 0.3, type: 'square' },
      nearMiss: { freqs: [1000, 800], dur: 0.1, type: 'sine' }
    };

    function init(audioContext, masterGain) {
      _audioCtx = audioContext;
      _masterGain = masterGain || audioContext.destination;
    }

    function play(stingerName) {
      if (!_audioCtx) return;
      const stinger = STINGERS[stingerName];
      if (!stinger) return;
      const now = _audioCtx.currentTime;
      const stepDur = stinger.dur / stinger.freqs.length;

      for (let i = 0; i < stinger.freqs.length; i++) {
        const osc = _audioCtx.createOscillator();
        const g = _audioCtx.createGain();
        osc.type = stinger.type;
        osc.frequency.setValueAtTime(stinger.freqs[i], now + i * stepDur);
        g.gain.setValueAtTime(0.3, now + i * stepDur);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * stepDur + stepDur);
        osc.connect(g);
        g.connect(_masterGain);
        osc.start(now + i * stepDur);
        osc.stop(now + i * stepDur + stepDur + 0.01);
      }
    }

    return { init, play, stingerNames: Object.keys(STINGERS) };
  })();

  // ---- Track History & Analytics ----
  const MusicAnalytics = {
    _history: [],
    _maxHistory: 100,
    _playStartTime: null,
    _currentTrackId: null,
    _listenStats: {},

    startTrack(trackId) {
      this._playStartTime = Date.now();
      this._currentTrackId = trackId;
    },

    endTrack(trackId) {
      if (this._currentTrackId !== trackId || !this._playStartTime) return;
      const duration = (Date.now() - this._playStartTime) / 1000;
      if (!this._listenStats[trackId]) this._listenStats[trackId] = { plays: 0, totalTime: 0 };
      this._listenStats[trackId].plays++;
      this._listenStats[trackId].totalTime += duration;
      this._history.push({ trackId, duration, timestamp: Date.now() });
      if (this._history.length > this._maxHistory) this._history.shift();
      this._playStartTime = null;
      this._currentTrackId = null;
    },

    getMostPlayed() {
      let best = null, bestPlays = 0;
      for (const [id, stats] of Object.entries(this._listenStats)) {
        if (stats.plays > bestPlays) { bestPlays = stats.plays; best = id; }
      }
      return best;
    },

    getLongestListened() {
      let best = null, bestTime = 0;
      for (const [id, stats] of Object.entries(this._listenStats)) {
        if (stats.totalTime > bestTime) { bestTime = stats.totalTime; best = id; }
      }
      return best;
    },

    getStats(trackId) {
      return this._listenStats[trackId] || { plays: 0, totalTime: 0 };
    },

    getRecentHistory(n) {
      return this._history.slice(-Math.min(n || 10, this._maxHistory));
    }
  };

  // ---- EQ Presets for Music Styles ----
  const MUSIC_EQ_PRESETS = {
    default:    [{ freq: 80, gain: 0 }, { freq: 250, gain: 0 }, { freq: 1000, gain: 0 }, { freq: 4000, gain: 0 }, { freq: 12000, gain: 0 }],
    bass_boost: [{ freq: 80, gain: 6 }, { freq: 250, gain: 3 }, { freq: 1000, gain: 0 }, { freq: 4000, gain: -1 }, { freq: 12000, gain: 0 }],
    treble:     [{ freq: 80, gain: 0 }, { freq: 250, gain: -2 }, { freq: 1000, gain: 1 }, { freq: 4000, gain: 3 }, { freq: 12000, gain: 5 }],
    loudness:   [{ freq: 80, gain: 5 }, { freq: 250, gain: 2 }, { freq: 1000, gain: 0 }, { freq: 4000, gain: 2 }, { freq: 12000, gain: 4 }],
    cave:       [{ freq: 80, gain: 4 }, { freq: 250, gain: 3 }, { freq: 1000, gain: -2 }, { freq: 4000, gain: -4 }, { freq: 12000, gain: -6 }],
    space:      [{ freq: 80, gain: 2 }, { freq: 250, gain: 0 }, { freq: 1000, gain: -1 }, { freq: 4000, gain: -2 }, { freq: 12000, gain: 2 }],
    warm:       [{ freq: 80, gain: 2 }, { freq: 250, gain: 3 }, { freq: 1000, gain: 1 }, { freq: 4000, gain: -2 }, { freq: 12000, gain: -3 }]
  };

  const MusicEQ = (function() {
    let _audioCtx = null;
    let _filters = [];
    let _input = null;
    let _output = null;
    const BANDS = [80, 250, 1000, 4000, 12000];

    function init(audioContext) {
      _audioCtx = audioContext;
      _input = _audioCtx.createGain();
      _output = _audioCtx.createGain();
      _filters = [];

      let lastNode = _input;
      for (const freq of BANDS) {
        const f = _audioCtx.createBiquadFilter();
        f.type = 'peaking';
        f.frequency.setValueAtTime(freq, _audioCtx.currentTime);
        f.Q.setValueAtTime(1.0, _audioCtx.currentTime);
        f.gain.setValueAtTime(0, _audioCtx.currentTime);
        lastNode.connect(f);
        lastNode = f;
        _filters.push(f);
      }
      lastNode.connect(_output);
    }

    function applyPreset(presetName) {
      const preset = MUSIC_EQ_PRESETS[presetName];
      if (!preset || !_audioCtx) return;
      preset.forEach((band, i) => {
        if (_filters[i]) {
          _filters[i].gain.setTargetAtTime(band.gain, _audioCtx.currentTime, 0.1);
        }
      });
    }

    function setband(bandIndex, gainDB) {
      if (_filters[bandIndex] && _audioCtx) {
        _filters[bandIndex].gain.setTargetAtTime(gainDB, _audioCtx.currentTime, 0.05);
      }
    }

    function getInput() { return _input; }
    function getOutput() { return _output; }

    return { init, applyPreset, setband, getInput, getOutput, presets: Object.keys(MUSIC_EQ_PRESETS) };
  })();

  // ---- Playlist Manager ----
  const PlaylistManager = {
    _playlists: {},
    _currentPlaylist: null,
    _currentIndex: 0,
    _shuffleMode: false,
    _repeatMode: 'none', // 'none' | 'one' | 'all'
    _onTrackChange: null,

    createPlaylist(name, trackIds) {
      this._playlists[name] = { name, trackIds: [...trackIds], created: Date.now() };
      return name;
    },

    deletePlaylist(name) {
      delete this._playlists[name];
      if (this._currentPlaylist === name) this._currentPlaylist = null;
    },

    loadPlaylist(name) {
      if (!this._playlists[name]) { console.warn('[PlaylistManager] Unknown playlist:', name); return; }
      this._currentPlaylist = name;
      this._currentIndex = 0;
    },

    getCurrentTrackId() {
      if (!this._currentPlaylist) return null;
      const pl = this._playlists[this._currentPlaylist];
      if (!pl || pl.trackIds.length === 0) return null;
      return pl.trackIds[this._currentIndex % pl.trackIds.length];
    },

    next() {
      if (!this._currentPlaylist) return null;
      const pl = this._playlists[this._currentPlaylist];
      if (!pl) return null;
      if (this._repeatMode === 'one') return this.getCurrentTrackId();
      if (this._shuffleMode) {
        this._currentIndex = Math.floor(Math.random() * pl.trackIds.length);
      } else {
        this._currentIndex++;
        if (this._currentIndex >= pl.trackIds.length) {
          if (this._repeatMode === 'all') this._currentIndex = 0;
          else { this._currentIndex = pl.trackIds.length - 1; return null; }
        }
      }
      const trackId = this.getCurrentTrackId();
      if (this._onTrackChange) this._onTrackChange(trackId);
      return trackId;
    },

    previous() {
      if (!this._currentPlaylist) return null;
      const pl = this._playlists[this._currentPlaylist];
      if (!pl) return null;
      this._currentIndex = Math.max(0, this._currentIndex - 1);
      const trackId = this.getCurrentTrackId();
      if (this._onTrackChange) this._onTrackChange(trackId);
      return trackId;
    },

    setShuffleMode(enabled) { this._shuffleMode = !!enabled; },
    setRepeatMode(mode) { this._repeatMode = mode; },
    onTrackChange(cb) { this._onTrackChange = cb; },

    getPlaylists() { return Object.keys(this._playlists); },
    getPlaylistTracks(name) { return this._playlists[name] ? [...this._playlists[name].trackIds] : []; }
  };

  // ---- Export new music sub-systems ----
  if (typeof window !== 'undefined') {
    window.MusicCueSystem   = MusicCueSystem;
    window.BeatSyncEngine   = BeatSyncEngine;
    window.MixAutomation    = MixAutomation;
    window.StingerSystem    = StingerSystem;
    window.MusicAnalytics   = MusicAnalytics;
    window.MusicEQ          = MusicEQ;
    window.PlaylistManager  = PlaylistManager;
    window.EXTENDED_TRACK_META = EXTENDED_TRACK_META;
    window.CUE_TYPES        = CUE_TYPES;
    window.MUSIC_EQ_PRESETS = MUSIC_EQ_PRESETS;
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      MusicCueSystem, BeatSyncEngine, MixAutomation, StingerSystem,
      MusicAnalytics, MusicEQ, PlaylistManager, EXTENDED_TRACK_META,
      CUE_TYPES, MUSIC_EQ_PRESETS
    });
  }
})();


// ============================================================
// ENGINE_SOUND_SYSTEM_V2 EXTENDED — RPM Analyser, Sound Events
// Additional engine audio management logic ~35KB
// ============================================================
(function() {
  'use strict';

  // ---- Per-vehicle RPM Telemetry ----
  const RPMTelemetry = (function() {
    const _history = new Map();
    const _maxHistory = 120;

    function record(vehicleId, normalizedRPM, timestamp) {
      if (!_history.has(vehicleId)) _history.set(vehicleId, []);
      const arr = _history.get(vehicleId);
      arr.push({ rpm: normalizedRPM, ts: timestamp || Date.now() });
      if (arr.length > _maxHistory) arr.shift();
    }

    function getAverage(vehicleId, lastN) {
      const arr = _history.get(vehicleId);
      if (!arr || arr.length === 0) return 0;
      const slice = arr.slice(-Math.min(lastN || 30, arr.length));
      return slice.reduce((a, b) => a + b.rpm, 0) / slice.length;
    }

    function getPeak(vehicleId) {
      const arr = _history.get(vehicleId);
      if (!arr || arr.length === 0) return 0;
      return Math.max(...arr.map(e => e.rpm));
    }

    function getHistory(vehicleId) {
      return [...(_history.get(vehicleId) || [])];
    }

    function clear(vehicleId) {
      if (vehicleId) _history.delete(vehicleId);
      else _history.clear();
    }

    return { record, getAverage, getPeak, getHistory, clear };
  })();

  // ---- Engine Event Log ----
  const EngineEventLog = (function() {
    const _events = [];
    const _maxEvents = 500;
    const EVENT_TYPES = {
      START:    'engine_start',
      STOP:     'engine_stop',
      REDLINE:  'redline',
      GEAR_UP:  'gear_up',
      GEAR_DOWN:'gear_down',
      BRAKE:    'engine_brake',
      CRACKLE:  'exhaust_crackle',
      COLD_END: 'cold_start_complete',
      STALL:    'stall'
    };

    function log(vehicleId, eventType, data) {
      _events.push({ vehicleId, type: eventType, ts: Date.now(), data: data || {} });
      if (_events.length > _maxEvents) _events.shift();
    }

    function getEvents(vehicleId, eventType, lastN) {
      let filtered = vehicleId ? _events.filter(e => e.vehicleId === vehicleId) : [..._events];
      if (eventType) filtered = filtered.filter(e => e.type === eventType);
      return filtered.slice(-(lastN || filtered.length));
    }

    function clearEvents(vehicleId) {
      if (vehicleId) {
        for (let i = _events.length - 1; i >= 0; i--) {
          if (_events[i].vehicleId === vehicleId) _events.splice(i, 1);
        }
      } else {
        _events.length = 0;
      }
    }

    return { log, getEvents, clearEvents, EVENT_TYPES };
  })();

  // ---- Transmission Audio Simulation ----
  const TransmissionAudio = (function() {
    let _audioCtx = null;
    let _masterBus = null;
    let _activeShiftNodes = [];

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
    }

    function _cleanupOldNodes() {
      const now = _audioCtx ? _audioCtx.currentTime : 0;
      _activeShiftNodes = _activeShiftNodes.filter(n => n.endTime > now);
    }

    function playManualShift(shiftUp, gearNumber, vehicleType) {
      if (!_audioCtx) return;
      _cleanupOldNodes();
      const now = _audioCtx.currentTime;

      // Synchro ring sound
      const syncOsc = _audioCtx.createOscillator();
      const syncGain = _audioCtx.createGain();
      const vehicleFreqBase = vehicleType === 'truck' ? 80 : vehicleType === 'motorcycle' ? 200 : 130;
      syncOsc.type = 'square';
      syncOsc.frequency.setValueAtTime(vehicleFreqBase * (shiftUp ? 1 : 0.7), now);
      syncOsc.frequency.exponentialRampToValueAtTime(vehicleFreqBase * (shiftUp ? 0.6 : 0.4), now + 0.08);
      syncGain.gain.setValueAtTime(0.18, now);
      syncGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      syncOsc.connect(syncGain);
      syncGain.connect(_masterBus);
      syncOsc.start(now);
      syncOsc.stop(now + 0.13);

      // Dog-tooth engagement click (higher pitched)
      const clickOsc = _audioCtx.createOscillator();
      const clickGain = _audioCtx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(600 + (gearNumber || 1) * 80, now + 0.05);
      clickGain.gain.setValueAtTime(0.25, now + 0.05);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      clickOsc.connect(clickGain);
      clickGain.connect(_masterBus);
      clickOsc.start(now + 0.05);
      clickOsc.stop(now + 0.13);

      _activeShiftNodes.push({ endTime: now + 0.15 });
    }

    function playAutoShift(shiftUp) {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      const osc = _audioCtx.createOscillator();
      const g = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(shiftUp ? 400 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(shiftUp ? 250 : 180, now + 0.06);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(g);
      g.connect(_masterBus);
      osc.start(now);
      osc.stop(now + 0.09);
    }

    function playNeutralDrop() {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      // Mechanical thunk
      for (let i = 0; i < 3; i++) {
        const osc = _audioCtx.createOscillator();
        const g = _audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 - i * 30, now + i * 0.04);
        g.gain.setValueAtTime(0.3, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.08);
        osc.connect(g);
        g.connect(_masterBus);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.09);
      }
    }

    return { init, playManualShift, playAutoShift, playNeutralDrop };
  })();

  // ---- Exhaust System Audio ----
  const ExhaustAudio = (function() {
    let _audioCtx = null;
    let _masterBus = null;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
    }

    function _makeBlip(freq, dur, gain) {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      const osc = _audioCtx.createOscillator();
      const g = _audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, now + dur);
      g.gain.setValueAtTime(gain, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc.connect(g);
      g.connect(_masterBus);
      osc.start(now);
      osc.stop(now + dur + 0.01);
    }

    function playCrackleSequence(intensity, count) {
      if (!_audioCtx) return;
      const effectiveCount = Math.floor(count * intensity);
      for (let i = 0; i < effectiveCount; i++) {
        const delay = i * (0.04 + Math.random() * 0.06);
        setTimeout(() => {
          _makeBlip(80 + Math.random() * 120, 0.05 + Math.random() * 0.08, 0.15 + intensity * 0.25);
        }, delay * 1000);
      }
    }

    function playBackfire(engineType) {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      // Loud pop
      const noiseLen = Math.floor(_audioCtx.sampleRate * 0.2);
      const noiseBuf = _audioCtx.createBuffer(1, noiseLen, _audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.5);
      const src = _audioCtx.createBufferSource();
      src.buffer = noiseBuf;
      const g = _audioCtx.createGain();
      const intensityMap = { rotary: 0.9, V8: 0.85, twoStroke: 0.95, turbo: 0.8 };
      g.gain.setValueAtTime(intensityMap[engineType] || 0.6, now);
      src.connect(g);
      g.connect(_masterBus);
      src.start(now);

      // Follow-up crackle
      setTimeout(() => playCrackleSequence(0.7, 4), 80);
    }

    function playRevLimiter(rpm) {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      const stutter = _audioCtx.createOscillator();
      const stutterGain = _audioCtx.createGain();
      stutter.type = 'sawtooth';
      stutter.frequency.setValueAtTime(rpm * 50, now);
      stutterGain.gain.setValueAtTime(0.4, now);
      // Stuttering: rapid gain oscillation
      const lfo = _audioCtx.createOscillator();
      const lfoGain = _audioCtx.createGain();
      lfo.frequency.setValueAtTime(20, now);
      lfoGain.gain.setValueAtTime(0.4, now);
      lfo.connect(lfoGain);
      lfoGain.connect(stutterGain.gain);
      lfo.start(now);
      lfo.stop(now + 0.4);
      stutter.connect(stutterGain);
      stutterGain.connect(_masterBus);
      stutter.start(now);
      stutter.stop(now + 0.4);
    }

    return { init, playCrackleSequence, playBackfire, playRevLimiter };
  })();

  // ---- Tire / Road Noise Audio ----
  const TireAudio = (function() {
    let _audioCtx = null;
    let _masterBus = null;
    let _rollNoise = null;
    let _rollFilter = null;
    let _rollGain = null;
    let _squealOsc = null;
    let _squealGain = null;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
      _setupRollNoise();
    }

    function _setupRollNoise() {
      if (!_audioCtx) return;
      const len = _audioCtx.sampleRate * 3;
      const buf = _audioCtx.createBuffer(1, len, _audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      _rollNoise = _audioCtx.createBufferSource();
      _rollNoise.buffer = buf;
      _rollNoise.loop = true;
      _rollFilter = _audioCtx.createBiquadFilter();
      _rollFilter.type = 'bandpass';
      _rollFilter.frequency.setValueAtTime(300, _audioCtx.currentTime);
      _rollFilter.Q.setValueAtTime(3, _audioCtx.currentTime);
      _rollGain = _audioCtx.createGain();
      _rollGain.gain.setValueAtTime(0, _audioCtx.currentTime);
      _rollNoise.connect(_rollFilter);
      _rollFilter.connect(_rollGain);
      _rollGain.connect(_masterBus);
      _rollNoise.start();
    }

    function updateSpeed(normalizedSpeed, surfaceType) {
      if (!_audioCtx || !_rollGain) return;
      const now = _audioCtx.currentTime;

      const surfaceFreqs = {
        tarmac: 300, gravel: 600, mud: 200, ice: 150, sand: 400, metal: 800
      };
      const baseFreq = surfaceFreqs[surfaceType] || 300;
      const gainVal = normalizedSpeed * 0.25;

      _rollFilter.frequency.setTargetAtTime(baseFreq + normalizedSpeed * 500, now, 0.1);
      _rollGain.gain.setTargetAtTime(gainVal, now, 0.05);
    }

    function playSqueal(intensity) {
      if (!_audioCtx) return;
      if (_squealOsc) {
        try { _squealOsc.stop(); } catch (e) {}
        _squealOsc = null;
      }
      if (intensity <= 0) return;
      const now = _audioCtx.currentTime;
      _squealOsc = _audioCtx.createOscillator();
      _squealGain = _audioCtx.createGain();
      _squealOsc.type = 'sawtooth';
      _squealOsc.frequency.setValueAtTime(1200 + intensity * 800, now);
      _squealOsc.frequency.setTargetAtTime(800 + intensity * 400, now, 0.3);
      _squealGain.gain.setValueAtTime(intensity * 0.3, now);
      _squealOsc.connect(_squealGain);
      _squealGain.connect(_masterBus);
      _squealOsc.start(now);
    }

    function stopSqueal() {
      if (!_squealOsc || !_audioCtx) return;
      const now = _audioCtx.currentTime;
      _squealGain.gain.linearRampToValueAtTime(0, now + 0.1);
      _squealOsc.stop(now + 0.11);
      _squealOsc = null;
    }

    function playSuspensionThunk(weight) {
      if (!_audioCtx) return;
      const now = _audioCtx.currentTime;
      const osc = _audioCtx.createOscillator();
      const g = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80 + weight * 40, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      g.gain.setValueAtTime(0.4 * weight, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(g);
      g.connect(_masterBus);
      osc.start(now);
      osc.stop(now + 0.21);
    }

    return { init, updateSpeed, playSqueal, stopSqueal, playSuspensionThunk };
  })();

  // ---- Windshield / Aerodynamic Audio ----
  const AeroAudio = (function() {
    let _audioCtx = null;
    let _masterBus = null;
    let _windNoise = null;
    let _windFilter = null;
    let _windGain = null;
    let _turbOsc = null;
    let _turbGain = null;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
      _setupWind();
    }

    function _setupWind() {
      if (!_audioCtx) return;
      const len = _audioCtx.sampleRate * 4;
      const buf = _audioCtx.createBuffer(2, len, _audioCtx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      }
      _windNoise = _audioCtx.createBufferSource();
      _windNoise.buffer = buf;
      _windNoise.loop = true;
      _windFilter = _audioCtx.createBiquadFilter();
      _windFilter.type = 'highpass';
      _windFilter.frequency.setValueAtTime(2000, _audioCtx.currentTime);
      _windGain = _audioCtx.createGain();
      _windGain.gain.setValueAtTime(0, _audioCtx.currentTime);
      _windNoise.connect(_windFilter);
      _windFilter.connect(_windGain);
      _windGain.connect(_masterBus);
      _windNoise.start();

      // Turbulence oscillator
      _turbOsc = _audioCtx.createOscillator();
      _turbGain = _audioCtx.createGain();
      _turbOsc.type = 'sine';
      _turbOsc.frequency.setValueAtTime(0.8, _audioCtx.currentTime);
      _turbGain.gain.setValueAtTime(0, _audioCtx.currentTime);
      _turbOsc.connect(_turbGain);
      _turbGain.connect(_windGain.gain);
      _turbOsc.start();
    }

    function updateAirspeed(normalizedSpeed) {
      if (!_audioCtx || !_windGain) return;
      const now = _audioCtx.currentTime;
      const gainVal = Math.pow(normalizedSpeed, 1.5) * 0.35;
      const freqVal = 1500 + normalizedSpeed * 4000;
      const turbIntensity = normalizedSpeed > 0.7 ? (normalizedSpeed - 0.7) / 0.3 : 0;

      _windGain.gain.setTargetAtTime(gainVal, now, 0.08);
      _windFilter.frequency.setTargetAtTime(freqVal, now, 0.1);
      _turbGain.gain.setTargetAtTime(turbIntensity * 0.1, now, 0.2);
    }

    return { init, updateAirspeed };
  })();

  // ---- Collision / Damage Audio ----
  const CollisionAudio = (function() {
    let _audioCtx = null;
    let _masterBus = null;
    let _lastCollisionTime = 0;
    const COLLISION_COOLDOWN = 100;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
    }

    function playImpact(intensity, surfaceMaterial) {
      if (!_audioCtx) return;
      const now = Date.now();
      if (now - _lastCollisionTime < COLLISION_COOLDOWN) return;
      _lastCollisionTime = now;
      const ctx = _audioCtx;
      const t = ctx.currentTime;

      // Impact thud
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      const matFreqs = { metal: 200, rock: 100, wood: 150, rubber: 80, concrete: 120 };
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime((matFreqs[surfaceMaterial] || 100) + intensity * 80, t);
      thudOsc.frequency.exponentialRampToValueAtTime(20, t + 0.3);
      thudGain.gain.setValueAtTime(intensity * 0.7, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      thudOsc.connect(thudGain);
      thudGain.connect(_masterBus);
      thudOsc.start(t);
      thudOsc.stop(t + 0.36);

      // Scrape noise for metals
      if (surfaceMaterial === 'metal' || surfaceMaterial === 'concrete') {
        const noiseLen = Math.floor(ctx.sampleRate * 0.4);
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const nd = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 0.5);
        const src = ctx.createBufferSource();
        src.buffer = noiseBuf;
        const bpf = ctx.createBiquadFilter();
        bpf.type = 'bandpass';
        bpf.frequency.setValueAtTime(3000, t);
        bpf.Q.setValueAtTime(2, t);
        const sg = ctx.createGain();
        sg.gain.setValueAtTime(intensity * 0.3, t);
        src.connect(bpf);
        bpf.connect(sg);
        sg.connect(_masterBus);
        src.start(t);
      }
    }

    function playDebris(count) {
      if (!_audioCtx) return;
      for (let i = 0; i < Math.min(count, 8); i++) {
        const delay = i * (0.03 + Math.random() * 0.05);
        setTimeout(() => {
          if (!_audioCtx) return;
          const t = _audioCtx.currentTime;
          const osc = _audioCtx.createOscillator();
          const g = _audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400 + Math.random() * 800, t);
          osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
          g.gain.setValueAtTime(0.1 + Math.random() * 0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          osc.connect(g);
          g.connect(_masterBus);
          osc.start(t);
          osc.stop(t + 0.13);
        }, delay * 1000);
      }
    }

    function playGlassBreak() {
      if (!_audioCtx) return;
      const t = _audioCtx.currentTime;
      const noiseLen = Math.floor(_audioCtx.sampleRate * 0.6);
      const buf = _audioCtx.createBuffer(1, noiseLen, _audioCtx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 0.3) * (Math.random() > 0.7 ? 1 : 0.2);
      }
      const src = _audioCtx.createBufferSource();
      src.buffer = buf;
      const hpf = _audioCtx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(4000, t);
      const g = _audioCtx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      src.connect(hpf);
      hpf.connect(g);
      g.connect(_masterBus);
      src.start(t);
    }

    return { init, playImpact, playDebris, playGlassBreak };
  })();

  // ---- Export engine sub-systems ----
  if (typeof window !== 'undefined') {
    window.RPMTelemetry      = RPMTelemetry;
    window.EngineEventLog    = EngineEventLog;
    window.TransmissionAudio = TransmissionAudio;
    window.ExhaustAudio      = ExhaustAudio;
    window.TireAudio         = TireAudio;
    window.AeroAudio         = AeroAudio;
    window.CollisionAudio    = CollisionAudio;
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      RPMTelemetry, EngineEventLog, TransmissionAudio,
      ExhaustAudio, TireAudio, AeroAudio, CollisionAudio
    });
  }
})();


// ============================================================
// ENVIRONMENTAL_AUDIO EXTENDED — Biome Transitions & Effects
// Additional ~30KB of environment audio processing
// ============================================================
(function() {
  'use strict';

  // ---- Biome Transition Controller ----
  const BiomeTransitionController = (function() {
    let _audioCtx = null;
    let _fromEnv = null;
    let _toEnv = null;
    let _transitionProgress = 1;
    let _transitionDuration = 3.0;
    let _crossfadeGainFrom = null;
    let _crossfadeGainTo = null;
    let _onComplete = null;

    function init(audioContext) {
      _audioCtx = audioContext;
    }

    function startTransition(fromEnvId, toEnvId, durationSec, onComplete) {
      if (!_audioCtx) return;
      _fromEnv = fromEnvId;
      _toEnv = toEnvId;
      _transitionDuration = durationSec || 3.0;
      _transitionProgress = 0;
      _onComplete = onComplete;

      if (!_crossfadeGainFrom) {
        _crossfadeGainFrom = _audioCtx.createGain();
        _crossfadeGainFrom.connect(_audioCtx.destination);
      }
      if (!_crossfadeGainTo) {
        _crossfadeGainTo = _audioCtx.createGain();
        _crossfadeGainTo.connect(_audioCtx.destination);
      }

      const now = _audioCtx.currentTime;
      _crossfadeGainFrom.gain.cancelScheduledValues(now);
      _crossfadeGainFrom.gain.setValueAtTime(1, now);
      _crossfadeGainFrom.gain.linearRampToValueAtTime(0, now + _transitionDuration);

      _crossfadeGainTo.gain.cancelScheduledValues(now);
      _crossfadeGainTo.gain.setValueAtTime(0, now);
      _crossfadeGainTo.gain.linearRampToValueAtTime(1, now + _transitionDuration);

      setTimeout(() => {
        _transitionProgress = 1;
        if (_onComplete) _onComplete(_toEnv);
      }, _transitionDuration * 1000 + 50);
    }

    function getProgress() { return _transitionProgress; }
    function getFromEnv() { return _fromEnv; }
    function getToEnv() { return _toEnv; }
    function getCrossfadeGainFrom() { return _crossfadeGainFrom; }
    function getCrossfadeGainTo() { return _crossfadeGainTo; }

    return { init, startTransition, getProgress, getFromEnv, getToEnv, getCrossfadeGainFrom, getCrossfadeGainTo };
  })();

  // ---- Audio Snapshot / Restore ----
  const AudioSnapshot = {
    _snapshots: {},

    capture(name, nodes) {
      const snapshot = {};
      for (const [key, node] of Object.entries(nodes)) {
        if (node && node.gain) snapshot[key] = { gain: node.gain.value };
        else if (node && node.frequency) snapshot[key] = { frequency: node.frequency.value };
      }
      this._snapshots[name] = { nodes: snapshot, timestamp: Date.now() };
    },

    restore(name, nodes, audioContext, transitionTime) {
      const snapshot = this._snapshots[name];
      if (!snapshot || !audioContext) return;
      const now = audioContext.currentTime;
      const tt = transitionTime || 0.5;
      for (const [key, saved] of Object.entries(snapshot.nodes)) {
        if (!nodes[key]) continue;
        if (saved.gain !== undefined && nodes[key].gain) {
          nodes[key].gain.setTargetAtTime(saved.gain, now, tt / 3);
        }
        if (saved.frequency !== undefined && nodes[key].frequency) {
          nodes[key].frequency.setTargetAtTime(saved.frequency, now, tt / 3);
        }
      }
    },

    list() { return Object.keys(this._snapshots); },
    delete(name) { delete this._snapshots[name]; }
  };

  // ---- Height-Based Audio Modifier ----
  const HeightAudioModifier = (function() {
    let _audioCtx = null;
    let _masterFilter = null;
    let _currentHeight = 0;
    const SEA_LEVEL = 0;
    const HIGH_ALTITUDE = 500;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterFilter = _audioCtx.createBiquadFilter();
      _masterFilter.type = 'lowpass';
      _masterFilter.frequency.setValueAtTime(20000, _audioCtx.currentTime);
      _masterFilter.connect(masterBus || _audioCtx.destination);
    }

    function updateHeight(heightMeters) {
      if (!_audioCtx || !_masterFilter) return;
      _currentHeight = heightMeters;
      const normalizedH = Math.max(0, Math.min(1, (heightMeters - SEA_LEVEL) / (HIGH_ALTITUDE - SEA_LEVEL)));
      // As altitude increases: muffle sounds (thinner air)
      const cutoff = 20000 - normalizedH * 14000;
      _masterFilter.frequency.setTargetAtTime(cutoff, _audioCtx.currentTime, 0.3);
    }

    function getFilterNode() { return _masterFilter; }

    return { init, updateHeight, getFilterNode };
  })();

  // ---- Acoustic Space Analyzer ----
  const AcousticAnalyzer = (function() {
    let _audioCtx = null;
    let _analyser = null;
    let _dataArray = null;
    let _fftSize = 2048;

    function init(audioContext) {
      _audioCtx = audioContext;
      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = _fftSize;
      _dataArray = new Uint8Array(_analyser.frequencyBinCount);
    }

    function getFrequencyData() {
      if (!_analyser) return null;
      _analyser.getByteFrequencyData(_dataArray);
      return new Uint8Array(_dataArray);
    }

    function getTimeDomainData() {
      if (!_analyser) return null;
      const td = new Uint8Array(_analyser.fftSize);
      _analyser.getByteTimeDomainData(td);
      return td;
    }

    function getRMSLevel() {
      if (!_analyser) return 0;
      const td = getTimeDomainData();
      let sum = 0;
      for (let i = 0; i < td.length; i++) {
        const v = (td[i] - 128) / 128;
        sum += v * v;
      }
      return Math.sqrt(sum / td.length);
    }

    function getPeakFrequency() {
      const fd = getFrequencyData();
      if (!fd) return 0;
      let maxVal = 0, maxIdx = 0;
      for (let i = 0; i < fd.length; i++) {
        if (fd[i] > maxVal) { maxVal = fd[i]; maxIdx = i; }
      }
      const nyquist = _audioCtx.sampleRate / 2;
      return (maxIdx / fd.length) * nyquist;
    }

    function getAnalyserNode() { return _analyser; }

    return { init, getFrequencyData, getTimeDomainData, getRMSLevel, getPeakFrequency, getAnalyserNode };
  })();

  // ---- Sound Reflection / Early Reflections ----
  const EarlyReflections = (function() {
    let _audioCtx = null;
    let _delayNodes = [];
    let _gainNodes = [];
    let _mixGain = null;

    // Typical early reflection delay times (ms) for different room types
    const ROOM_PRESETS = {
      small_room:   [7, 13, 19, 26, 35],
      medium_room:  [15, 28, 40, 55, 72],
      large_room:   [30, 55, 78, 100, 130],
      hall:         [50, 90, 130, 180, 240],
      cave:         [80, 150, 220, 310, 420],
      stairwell:    [25, 50, 75, 100, 130],
      bathroom:     [10, 18, 26, 35, 46]
    };

    const REFLECTION_GAINS = [0.7, 0.6, 0.5, 0.4, 0.3];

    function init(audioContext) {
      _audioCtx = audioContext;
      _mixGain = _audioCtx.createGain();
      _mixGain.gain.setValueAtTime(0.25, _audioCtx.currentTime);
      _mixGain.connect(_audioCtx.destination);

      for (let i = 0; i < 5; i++) {
        const delay = _audioCtx.createDelay(0.5);
        delay.delayTime.setValueAtTime(0.02, _audioCtx.currentTime);
        const g = _audioCtx.createGain();
        g.gain.setValueAtTime(REFLECTION_GAINS[i], _audioCtx.currentTime);
        delay.connect(g);
        g.connect(_mixGain);
        _delayNodes.push(delay);
        _gainNodes.push(g);
      }
    }

    function applyRoomPreset(roomType) {
      if (!_audioCtx) return;
      const delays = ROOM_PRESETS[roomType] || ROOM_PRESETS.medium_room;
      const now = _audioCtx.currentTime;
      delays.forEach((ms, i) => {
        if (_delayNodes[i]) {
          _delayNodes[i].delayTime.setTargetAtTime(ms / 1000, now, 0.1);
        }
      });
    }

    function connectSource(sourceNode) {
      for (const delay of _delayNodes) {
        sourceNode.connect(delay);
      }
    }

    function disconnectSource(sourceNode) {
      for (const delay of _delayNodes) {
        try { sourceNode.disconnect(delay); } catch (e) {}
      }
    }

    function setMixLevel(level) {
      if (_mixGain && _audioCtx) {
        _mixGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)), _audioCtx.currentTime, 0.1);
      }
    }

    return { init, applyRoomPreset, connectSource, disconnectSource, setMixLevel, ROOM_PRESETS };
  })();

  // ---- Export environment sub-systems ----
  if (typeof window !== 'undefined') {
    window.BiomeTransitionController = BiomeTransitionController;
    window.AudioSnapshot             = AudioSnapshot;
    window.HeightAudioModifier       = HeightAudioModifier;
    window.AcousticAnalyzer          = AcousticAnalyzer;
    window.EarlyReflections          = EarlyReflections;
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      BiomeTransitionController, AudioSnapshot, HeightAudioModifier,
      AcousticAnalyzer, EarlyReflections
    });
  }
})();


// ============================================================
// UI_SFX_LIBRARY EXTENDED — Achievement Jingles, Combo Escalator
// Additional ~20KB of UI sound logic
// ============================================================
(function() {
  'use strict';

  // ---- Jingle Composer (procedural short melodies) ----
  const JingleComposer = (function() {
    let _audioCtx = null;
    let _masterGain = null;

    // Scale definitions: intervals in semitones from root
    const SCALES = {
      major:      [0, 2, 4, 5, 7, 9, 11, 12],
      minor:      [0, 2, 3, 5, 7, 8, 10, 12],
      pentatonic: [0, 2, 4, 7, 9, 12],
      blues:      [0, 3, 5, 6, 7, 10, 12],
      chromatic:  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    };

    // Note frequency from MIDI note number
    function midiToFreq(midi) {
      return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function generateJingle(rootMidi, scaleName, noteCount, tempo, pattern) {
      if (!_audioCtx) return;
      const scale = SCALES[scaleName] || SCALES.major;
      const noteDur = 60 / tempo;
      const now = _audioCtx.currentTime;

      const noteIndices = pattern || Array.from({ length: noteCount }, (_, i) => i % scale.length);

      for (let i = 0; i < noteIndices.length; i++) {
        const semitone = scale[noteIndices[i] % scale.length] || 0;
        const freq = midiToFreq(rootMidi + semitone);
        const startTime = now + i * noteDur;

        const osc = _audioCtx.createOscillator();
        const env = _audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        env.gain.setValueAtTime(0, startTime);
        env.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
        env.gain.setValueAtTime(0.4, startTime + noteDur * 0.6);
        env.gain.linearRampToValueAtTime(0, startTime + noteDur * 0.9);
        osc.connect(env);
        env.connect(_masterGain || _audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + noteDur);
      }
    }

    function playVictoryJingle() {
      generateJingle(60, 'major', 8, 200, [0, 2, 4, 4, 5, 4, 7, 7]);
    }

    function playDefeatJingle() {
      generateJingle(60, 'minor', 5, 120, [4, 3, 2, 1, 0]);
    }

    function playLevelUpJingle(level) {
      const rootMidi = 60 + Math.min(level, 12);
      generateJingle(rootMidi, 'pentatonic', 6, 220, [0, 2, 4, 2, 4, 5]);
    }

    function playAchievementJingle(tier) {
      const patterns = {
        bronze: [0, 2, 4],
        silver: [0, 2, 4, 5, 7],
        gold:   [0, 4, 7, 9, 12, 9, 12]
      };
      generateJingle(64, 'major', 7, 180, patterns[tier] || patterns.bronze);
    }

    function init(audioContext, masterGain) {
      _audioCtx = audioContext;
      _masterGain = masterGain;
    }

    return { init, generateJingle, playVictoryJingle, playDefeatJingle, playLevelUpJingle, playAchievementJingle };
  })();

  // ---- Combo Sound Escalator ----
  const ComboSoundEscalator = (function() {
    let _audioCtx = null;
    let _masterGain = null;
    let _comboCount = 0;
    let _lastComboTime = 0;
    const COMBO_TIMEOUT = 3000;

    const COMBO_PITCHES = [440, 523, 659, 784, 880, 988, 1047, 1175, 1319, 1480];

    function init(audioContext, masterGain) {
      _audioCtx = audioContext;
      _masterGain = masterGain;
    }

    function registerHit() {
      if (!_audioCtx) return;
      const now = Date.now();
      if (now - _lastComboTime > COMBO_TIMEOUT) _comboCount = 0;
      _comboCount++;
      _lastComboTime = now;

      const pitchIdx = Math.min(_comboCount - 1, COMBO_PITCHES.length - 1);
      const freq = COMBO_PITCHES[pitchIdx];
      const t = _audioCtx.currentTime;

      const osc = _audioCtx.createOscillator();
      const env = _audioCtx.createGain();
      const output = _masterGain || _audioCtx.destination;

      osc.type = _comboCount > 5 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, t);
      env.gain.setValueAtTime(0.35, t);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.connect(env);
      env.connect(output);
      osc.start(t);
      osc.stop(t + 0.16);

      // Extra sparkle on milestone combos
      if (_comboCount % 5 === 0) {
        const sparkOsc = _audioCtx.createOscillator();
        const sparkGain = _audioCtx.createGain();
        sparkOsc.type = 'sine';
        sparkOsc.frequency.setValueAtTime(freq * 2, t + 0.05);
        sparkOsc.frequency.linearRampToValueAtTime(freq * 3, t + 0.2);
        sparkGain.gain.setValueAtTime(0.2, t + 0.05);
        sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        sparkOsc.connect(sparkGain);
        sparkGain.connect(output);
        sparkOsc.start(t + 0.05);
        sparkOsc.stop(t + 0.26);
      }

      return _comboCount;
    }

    function resetCombo() { _comboCount = 0; }
    function getCombo() { return _comboCount; }

    return { init, registerHit, resetCombo, getCombo };
  })();

  // ---- Haptic-Audio Sync Events ----
  const HapticAudioSync = {
    _callbacks: [],
    _enabled: true,

    enable() { this._enabled = true; },
    disable() { this._enabled = false; },

    register(callback) { this._callbacks.push(callback); },
    unregister(callback) { this._callbacks = this._callbacks.filter(c => c !== callback); },

    trigger(eventType, intensity, duration) {
      if (!this._enabled) return;
      for (const cb of this._callbacks) {
        try { cb({ type: eventType, intensity: Math.max(0, Math.min(1, intensity)), duration: duration || 50 }); }
        catch (e) {}
      }
    },

    // Predefined haptic+audio events
    onCoinCollect()       { this.trigger('light', 0.3, 20); },
    onCrash(severity)     { this.trigger('heavy', severity, 200 + severity * 300); },
    onNitro()             { this.trigger('medium', 0.7, 100); },
    onLanding(force)      { this.trigger(force > 0.7 ? 'heavy' : 'medium', force, 80 + force * 120); },
    onLevelUp()           { this.trigger('pattern', 0.8, 500); },
    onCheckpoint()        { this.trigger('light', 0.5, 60); }
  };

  // ---- Dynamic Notification Scheduler ----
  const NotificationAudioQueue = (function() {
    let _audioCtx = null;
    let _queue = [];
    let _processing = false;
    let _masterGain = null;

    function init(audioContext, masterGain) {
      _audioCtx = audioContext;
      _masterGain = masterGain;
    }

    function enqueue(soundName, priority, delayMs) {
      _queue.push({ soundName, priority: priority || 5, delayMs: delayMs || 0, enqueueTime: Date.now() });
      _queue.sort((a, b) => a.priority - b.priority);
      _processNext();
    }

    function _processNext() {
      if (_processing || _queue.length === 0 || !_audioCtx) return;
      const item = _queue.shift();
      _processing = true;
      setTimeout(() => {
        if (typeof UI_SFX_LIBRARY !== 'undefined' && UI_SFX_LIBRARY.play) {
          UI_SFX_LIBRARY.play(item.soundName);
        }
        _processing = false;
        if (_queue.length > 0) setTimeout(_processNext, 50);
      }, item.delayMs);
    }

    function clear() { _queue = []; _processing = false; }
    function size() { return _queue.length; }

    return { init, enqueue, clear, size };
  })();

  // ---- Export UI sub-systems ----
  if (typeof window !== 'undefined') {
    window.JingleComposer          = JingleComposer;
    window.ComboSoundEscalator     = ComboSoundEscalator;
    window.HapticAudioSync         = HapticAudioSync;
    window.NotificationAudioQueue  = NotificationAudioQueue;
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      JingleComposer, ComboSoundEscalator, HapticAudioSync, NotificationAudioQueue
    });
  }
})();


// ============================================================
// POSITIONAL_AUDIO EXTENDED — Spatial Clustering & Soundscape
// Additional ~25KB of positional audio management
// ============================================================
(function() {
  'use strict';

  // ---- Source Clustering (group nearby sounds into one) ----
  const SpatialCluster = (function() {
    const CLUSTER_RADIUS = 80;
    let _clusters = [];
    let _audioCtx = null;
    let _masterBus = null;

    function init(audioContext, masterBus) {
      _audioCtx = audioContext;
      _masterBus = masterBus || audioContext.destination;
    }

    function _dist(a, b) {
      const dx = a.x - b.x, dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function addToCluster(sourceConfig) {
      // Find nearest cluster
      let nearest = null, nearestDist = Infinity;
      for (const cluster of _clusters) {
        const d = _dist(cluster, sourceConfig);
        if (d < nearestDist) { nearestDist = d; nearest = cluster; }
      }

      if (nearest && nearestDist < CLUSTER_RADIUS) {
        // Add to existing cluster: update centroid
        nearest.count++;
        nearest.x = (nearest.x * (nearest.count - 1) + sourceConfig.x) / nearest.count;
        nearest.y = (nearest.y * (nearest.count - 1) + sourceConfig.y) / nearest.count;
        nearest.totalVolume = Math.min(1, nearest.totalVolume + (sourceConfig.volume || 0.5) * 0.4);
        if (nearest.gainNode && _audioCtx) {
          nearest.gainNode.gain.setTargetAtTime(nearest.totalVolume, _audioCtx.currentTime, 0.1);
        }
        return nearest.id;
      } else {
        // Create new cluster
        const id = 'cluster_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const gainNode = _audioCtx ? _audioCtx.createGain() : null;
        if (gainNode) {
          gainNode.gain.setValueAtTime(sourceConfig.volume || 0.5, _audioCtx.currentTime);
          gainNode.connect(_masterBus);
        }
        const cluster = { id, x: sourceConfig.x, y: sourceConfig.y, count: 1, totalVolume: sourceConfig.volume || 0.5, gainNode };
        _clusters.push(cluster);
        return id;
      }
    }

    function removeCluster(id) {
      const idx = _clusters.findIndex(c => c.id === id);
      if (idx === -1) return;
      const cluster = _clusters[idx];
      if (cluster.gainNode) {
        cluster.gainNode.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.1);
        setTimeout(() => { try { cluster.gainNode.disconnect(); } catch (e) {} }, 200);
      }
      _clusters.splice(idx, 1);
    }

    function getClusters() { return [..._clusters]; }
    function clearAll() {
      for (const c of _clusters) removeCluster(c.id);
    }

    return { init, addToCluster, removeCluster, getClusters, clearAll };
  })();

  // ---- Soundscape Zone Manager ----
  const SoundscapeZoneManager = (function() {
    let _audioCtx = null;
    let _zones = [];
    let _listener = { x: 0, y: 0 };
    let _activeZones = new Set();

    function init(audioContext) {
      _audioCtx = audioContext;
    }

    function addZone(config) {
      const zone = {
        id: config.id || 'zone_' + Date.now(),
        x: config.x || 0,
        y: config.y || 0,
        radius: config.radius || 200,
        innerRadius: config.innerRadius || 100,
        envId: config.envId || null,
        weatherType: config.weatherType || null,
        ambientSounds: config.ambientSounds || [],
        priority: config.priority || 1,
        nodes: [],
        gainNode: null,
        active: false
      };
      _zones.push(zone);
      return zone.id;
    }

    function removeZone(id) {
      const idx = _zones.findIndex(z => z.id === id);
      if (idx !== -1) {
        _stopZone(_zones[idx]);
        _zones.splice(idx, 1);
      }
    }

    function _dist(x1, y1, x2, y2) {
      const dx = x1 - x2, dy = y1 - y2;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function _startZone(zone) {
      if (!_audioCtx || zone.active) return;
      zone.active = true;
      zone.gainNode = _audioCtx.createGain();
      zone.gainNode.gain.setValueAtTime(0, _audioCtx.currentTime);
      zone.gainNode.gain.linearRampToValueAtTime(0.7, _audioCtx.currentTime + 1.5);
      zone.gainNode.connect(_audioCtx.destination);
      _activeZones.add(zone.id);
    }

    function _stopZone(zone) {
      if (!_audioCtx || !zone.active) return;
      zone.active = false;
      if (zone.gainNode) {
        zone.gainNode.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + 1.5);
        setTimeout(() => { try { zone.gainNode.disconnect(); } catch (e) {} zone.gainNode = null; }, 1600);
      }
      _activeZones.delete(zone.id);
    }

    function updateListener(x, y) {
      _listener.x = x;
      _listener.y = y;

      for (const zone of _zones) {
        const dist = _dist(x, y, zone.x, zone.y);
        if (dist <= zone.radius && !zone.active) {
          _startZone(zone);
        } else if (dist > zone.radius && zone.active) {
          _stopZone(zone);
        }

        // Volume blend based on inner/outer radius
        if (zone.active && zone.gainNode && _audioCtx) {
          let blend = 1;
          if (dist > zone.innerRadius) {
            blend = 1 - (dist - zone.innerRadius) / (zone.radius - zone.innerRadius);
          }
          zone.gainNode.gain.setTargetAtTime(Math.max(0, Math.min(0.7, blend * 0.7)), _audioCtx.currentTime, 0.2);
        }
      }
    }

    function getActiveZones() { return [..._activeZones]; }
    function getZoneCount() { return _zones.length; }

    return { init, addZone, removeZone, updateListener, getActiveZones, getZoneCount };
  })();

  // ---- Reverb Chain Builder ----
  const ReverbChainBuilder = (function() {
    let _audioCtx = null;

    function init(audioContext) { _audioCtx = audioContext; }

    function _buildIR(decayTime, preDelay, diffusion) {
      const sr = _audioCtx.sampleRate;
      const length = Math.floor(sr * (decayTime + preDelay));
      const buf = _audioCtx.createBuffer(2, length, sr);
      const preDelaySamples = Math.floor(sr * preDelay);
      for (let ch = 0; ch < 2; ch++) {
        const data = buf.getChannelData(ch);
        for (let i = preDelaySamples; i < length; i++) {
          const t = (i - preDelaySamples) / (length - preDelaySamples);
          const noise = Math.random() * 2 - 1;
          const decay = Math.pow(1 - t, 1 + diffusion * 2);
          data[i] = noise * decay;
        }
      }
      return buf;
    }

    function buildReverb(config) {
      if (!_audioCtx) return null;
      const conv = _audioCtx.createConvolver();
      conv.buffer = _buildIR(
        config.decayTime || 2.0,
        config.preDelay || 0.02,
        config.diffusion !== undefined ? config.diffusion : 0.5
      );

      const wetGain = _audioCtx.createGain();
      const dryGain = _audioCtx.createGain();
      const inputGain = _audioCtx.createGain();
      const outputGain = _audioCtx.createGain();

      wetGain.gain.setValueAtTime(config.wetness !== undefined ? config.wetness : 0.3, _audioCtx.currentTime);
      dryGain.gain.setValueAtTime(1 - (config.wetness !== undefined ? config.wetness : 0.3) * 0.5, _audioCtx.currentTime);

      inputGain.connect(conv);
      inputGain.connect(dryGain);
      conv.connect(wetGain);
      dryGain.connect(outputGain);
      wetGain.connect(outputGain);

      return {
        inputNode: inputGain,
        outputNode: outputGain,
        convolver: conv,
        wetGain,
        dryGain,
        setWetness(w) {
          if (_audioCtx) {
            wetGain.gain.setTargetAtTime(w, _audioCtx.currentTime, 0.1);
            dryGain.gain.setTargetAtTime(1 - w * 0.5, _audioCtx.currentTime, 0.1);
          }
        }
      };
    }

    const REVERB_PRESETS = {
      closet:      { decayTime: 0.3, preDelay: 0.005, diffusion: 0.3, wetness: 0.15 },
      bathroom:    { decayTime: 0.6, preDelay: 0.01,  diffusion: 0.4, wetness: 0.25 },
      small_room:  { decayTime: 0.8, preDelay: 0.015, diffusion: 0.5, wetness: 0.30 },
      medium_room: { decayTime: 1.5, preDelay: 0.02,  diffusion: 0.6, wetness: 0.35 },
      large_room:  { decayTime: 2.5, preDelay: 0.03,  diffusion: 0.7, wetness: 0.40 },
      hall:        { decayTime: 4.0, preDelay: 0.04,  diffusion: 0.8, wetness: 0.45 },
      cathedral:   { decayTime: 7.0, preDelay: 0.06,  diffusion: 0.9, wetness: 0.55 },
      cave:        { decayTime: 5.0, preDelay: 0.08,  diffusion: 0.7, wetness: 0.60 },
      canyon:      { decayTime: 6.0, preDelay: 0.15,  diffusion: 0.6, wetness: 0.50 },
      plate:       { decayTime: 2.0, preDelay: 0.005, diffusion: 0.9, wetness: 0.40 },
      spring:      { decayTime: 1.2, preDelay: 0.002, diffusion: 0.85, wetness: 0.35 }
    };

    function buildFromPreset(presetName) {
      return buildReverb(REVERB_PRESETS[presetName] || REVERB_PRESETS.medium_room);
    }

    return { init, buildReverb, buildFromPreset, REVERB_PRESETS };
  })();

  // ---- 3D to 2D Audio Mapper ----
  const Audio3Dto2DMapper = {
    projectX(sourceX, sourceZ, listenerX, listenerZ, cameraAngle) {
      const relX = sourceX - listenerX;
      const relZ = sourceZ - listenerZ;
      const cosA = Math.cos(cameraAngle), sinA = Math.sin(cameraAngle);
      const rotX = relX * cosA - relZ * sinA;
      return rotX;
    },

    calculatePan(sourceX, sourceZ, listenerX, listenerZ, cameraAngle, range) {
      const projX = this.projectX(sourceX, sourceZ, listenerX, listenerZ, cameraAngle);
      return Math.max(-1, Math.min(1, projX / (range * 0.5)));
    },

    calculateDistance(sx, sy, sz, lx, ly, lz) {
      const dx = sx - lx, dy = sy - ly, dz = sz - lz;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
  };

  // ---- Audio LOD (Level of Detail) System ----
  const AudioLOD = {
    _levels: [
      { maxDistance: 100, quality: 'full',    maxPolyphony: 8 },
      { maxDistance: 300, quality: 'high',    maxPolyphony: 5 },
      { maxDistance: 600, quality: 'medium',  maxPolyphony: 3 },
      { maxDistance: 1200, quality: 'low',    maxPolyphony: 2 },
      { maxDistance: Infinity, quality: 'off', maxPolyphony: 0 }
    ],

    getLODLevel(distance) {
      for (const level of this._levels) {
        if (distance <= level.maxDistance) return level;
      }
      return this._levels[this._levels.length - 1];
    },

    shouldPlay(distance, priority) {
      const lod = this.getLODLevel(distance);
      if (lod.quality === 'off') return false;
      if (lod.maxPolyphony === 0) return false;
      return true;
    },

    getPlaybackRate(distance, baseRate) {
      const lod = this.getLODLevel(distance);
      const qualityMult = { full: 1.0, high: 1.0, medium: 0.95, low: 0.9, off: 0 };
      return (baseRate || 1.0) * (qualityMult[lod.quality] || 1.0);
    }
  };

  // ---- Export positional sub-systems ----
  if (typeof window !== 'undefined') {
    window.SpatialCluster          = SpatialCluster;
    window.SoundscapeZoneManager   = SoundscapeZoneManager;
    window.ReverbChainBuilder      = ReverbChainBuilder;
    window.Audio3Dto2DMapper       = Audio3Dto2DMapper;
    window.AudioLOD                = AudioLOD;
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, {
      SpatialCluster, SoundscapeZoneManager, ReverbChainBuilder, Audio3Dto2DMapper, AudioLOD
    });
  }
})();


// ============================================================
// AUDIO MASTER CONTROLLER — Top-level integration facade
// Wires all subsystems together, single init point for game
// ============================================================
const AHMET_AUDIO_MASTER = (function() {
  'use strict';

  let _audioCtx = null;
  let _initialized = false;
  let _masterGain = null;
  let _compressor = null;
  let _limiter = null;
  let _masterVolume = 0.8;
  let _muted = false;
  let _prevVolume = 0.8;

  // ---- System registry ----
  const _systems = {
    music:       null,
    engine:      null,
    environment: null,
    ui:          null,
    positional:  null
  };

  // ---- Init ----
  function init(options) {
    if (_initialized) { console.warn('[AHMET_AUDIO_MASTER] Already initialized'); return; }

    // Create AudioContext (user gesture required in browsers)
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)(
      { sampleRate: options && options.sampleRate || 44100 }
    );

    // Master gain
    _masterGain = _audioCtx.createGain();
    _masterGain.gain.setValueAtTime(_masterVolume, _audioCtx.currentTime);

    // Dynamics compressor
    _compressor = _audioCtx.createDynamicsCompressor();
    _compressor.threshold.setValueAtTime(-18, _audioCtx.currentTime);
    _compressor.knee.setValueAtTime(8, _audioCtx.currentTime);
    _compressor.ratio.setValueAtTime(4, _audioCtx.currentTime);
    _compressor.attack.setValueAtTime(0.003, _audioCtx.currentTime);
    _compressor.release.setValueAtTime(0.15, _audioCtx.currentTime);

    // Brickwall limiter (compressor with high ratio)
    _limiter = _audioCtx.createDynamicsCompressor();
    _limiter.threshold.setValueAtTime(-1, _audioCtx.currentTime);
    _limiter.knee.setValueAtTime(0, _audioCtx.currentTime);
    _limiter.ratio.setValueAtTime(20, _audioCtx.currentTime);
    _limiter.attack.setValueAtTime(0.001, _audioCtx.currentTime);
    _limiter.release.setValueAtTime(0.01, _audioCtx.currentTime);

    // Chain: masterGain → compressor → limiter → destination
    _masterGain.connect(_compressor);
    _compressor.connect(_limiter);
    _limiter.connect(_audioCtx.destination);

    // Initialize subsystems
    _systems.music       = typeof MUSIC_SYSTEM_V2       !== 'undefined' ? MUSIC_SYSTEM_V2       : null;
    _systems.engine      = typeof ENGINE_SOUND_SYSTEM_V2 !== 'undefined' ? ENGINE_SOUND_SYSTEM_V2 : null;
    _systems.environment = typeof ENVIRONMENTAL_AUDIO   !== 'undefined' ? ENVIRONMENTAL_AUDIO   : null;
    _systems.ui          = typeof UI_SFX_LIBRARY        !== 'undefined' ? UI_SFX_LIBRARY        : null;
    _systems.positional  = typeof POSITIONAL_AUDIO      !== 'undefined' ? POSITIONAL_AUDIO      : null;

    if (_systems.music)       _systems.music.init(_audioCtx);
    if (_systems.engine)      _systems.engine.init(_audioCtx, _masterGain);
    if (_systems.environment) _systems.environment.init(_audioCtx, _masterGain);
    if (_systems.ui)          _systems.ui.init(_audioCtx);
    if (_systems.positional)  _systems.positional.init(_audioCtx, _masterGain);

    _initialized = true;
    console.log('[AHMET_AUDIO_MASTER] Fully initialized — AudioContext sample rate:', _audioCtx.sampleRate);
    return _audioCtx;
  }

  // ---- Master Volume ----
  function setMasterVolume(volume) {
    _masterVolume = Math.max(0, Math.min(1, volume));
    if (_masterGain && _audioCtx) {
      _masterGain.gain.setTargetAtTime(_muted ? 0 : _masterVolume, _audioCtx.currentTime, 0.05);
    }
  }

  function mute() {
    if (_muted) return;
    _prevVolume = _masterVolume;
    _muted = true;
    if (_masterGain && _audioCtx) {
      _masterGain.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.1);
    }
  }

  function unmute() {
    if (!_muted) return;
    _muted = false;
    if (_masterGain && _audioCtx) {
      _masterGain.gain.setTargetAtTime(_prevVolume, _audioCtx.currentTime, 0.1);
    }
  }

  function toggleMute() {
    if (_muted) unmute(); else mute();
  }

  // ---- Suspend / Resume (background tab) ----
  function suspend() {
    if (_audioCtx && _audioCtx.state === 'running') _audioCtx.suspend();
  }

  function resume() {
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  }

  // ---- Game State Change Handler ----
  function onGameStateChange(newState, prevState) {
    if (!_initialized) return;
    switch (newState) {
      case 'menu':
        if (_systems.music) {
          _systems.music.pauseForMenu();
          setTimeout(() => { if (_systems.music) _systems.music.playMenuMusic(); }, 600);
        }
        break;
      case 'racing':
        if (_systems.music) _systems.music.resumeFromMenu();
        break;
      case 'victory':
        if (_systems.music) _systems.music.playVictoryFanfare();
        if (_systems.ui)    _systems.ui.play('fanfare');
        break;
      case 'defeat':
        if (_systems.music) _systems.music.playDefeatSting();
        if (_systems.ui)    _systems.ui.play('gameOver');
        break;
      case 'paused':
        if (_systems.music) _systems.music.pauseForMenu();
        suspend();
        break;
      case 'resumed':
        resume();
        if (_systems.music) _systems.music.resumeFromMenu();
        break;
      case 'boss':
        if (_systems.music) _systems.music.playBossMusic();
        break;
    }
  }

  // ---- Per-Frame Update ----
  function update(gameState) {
    if (!_initialized || !gameState) return;
    if (_systems.music)      _systems.music.update(gameState);
    if (_systems.positional) _systems.positional.update();
    if (_systems.positional && gameState.vehicleX !== undefined) {
      _systems.positional.updateListener(gameState.vehicleX, gameState.vehicleY, gameState.vx, gameState.vy);
    }
  }

  // ---- Diagnostics ----
  function getDiagnostics() {
    return {
      initialized: _initialized,
      audioCtxState: _audioCtx ? _audioCtx.state : 'none',
      sampleRate: _audioCtx ? _audioCtx.sampleRate : 0,
      currentTime: _audioCtx ? _audioCtx.currentTime : 0,
      masterVolume: _masterVolume,
      muted: _muted,
      activeSystems: Object.keys(_systems).filter(k => _systems[k] !== null),
      activeSources: _systems.positional ? _systems.positional.activeSources : 0,
      currentTrack: _systems.music ? _systems.music.currentTrackId : null
    };
  }

  // ---- Public API ----
  return {
    init,
    setMasterVolume,
    mute,
    unmute,
    toggleMute,
    suspend,
    resume,
    onGameStateChange,
    update,
    getDiagnostics,
    get audioContext() { return _audioCtx; },
    get masterGain() { return _masterGain; },
    get systems() { return { ..._systems }; },
    get isInitialized() { return _initialized; },
    get isMuted() { return _muted; }
  };
})();

// Expose master controller
if (typeof window !== 'undefined') {
  window.AHMET_AUDIO_MASTER = AHMET_AUDIO_MASTER;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.AHMET_AUDIO_MASTER = AHMET_AUDIO_MASTER;
}

console.log('[AHMET Audio] All extended audio modules loaded successfully.');


// ============================================================
// AUDIO_STREAMING_MANAGER — Decode, Buffer, Stream Audio Data
// Handles asset loading, caching, and Web Audio buffer decode
// ============================================================
const AudioStreamingManager = (function() {
  'use strict';

  const _cache = new Map();
  const _pending = new Map();
  const _maxCacheSize = 50;
  const _cacheOrder = [];

  let _audioCtx = null;
  let _totalBytesLoaded = 0;
  let _loadCallbacks = {};

  function init(audioContext) {
    _audioCtx = audioContext;
    console.log('[AudioStreamingManager] Initialized');
  }

  function _evictOldest() {
    if (_cacheOrder.length === 0) return;
    const oldest = _cacheOrder.shift();
    _cache.delete(oldest);
  }

  function _storeInCache(url, buffer) {
    if (_cache.size >= _maxCacheSize) _evictOldest();
    _cache.set(url, buffer);
    _cacheOrder.push(url);
  }

  function load(url, onSuccess, onError) {
    if (!_audioCtx) { if (onError) onError(new Error('Not initialized')); return; }
    if (_cache.has(url)) { if (onSuccess) onSuccess(_cache.get(url)); return; }

    if (_pending.has(url)) {
      // Attach additional callbacks
      _loadCallbacks[url] = _loadCallbacks[url] || [];
      _loadCallbacks[url].push({ onSuccess, onError });
      return;
    }

    _pending.set(url, true);
    _loadCallbacks[url] = [{ onSuccess, onError }];

    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status + ' for ' + url);
        _totalBytesLoaded += parseInt(r.headers.get('content-length') || '0', 10);
        return r.arrayBuffer();
      })
      .then(ab => _audioCtx.decodeAudioData(ab))
      .then(buffer => {
        _storeInCache(url, buffer);
        _pending.delete(url);
        for (const cb of (_loadCallbacks[url] || [])) {
          if (cb.onSuccess) cb.onSuccess(buffer);
        }
        delete _loadCallbacks[url];
      })
      .catch(err => {
        _pending.delete(url);
        for (const cb of (_loadCallbacks[url] || [])) {
          if (cb.onError) cb.onError(err);
        }
        delete _loadCallbacks[url];
      });
  }

  function loadPromise(url) {
    return new Promise((resolve, reject) => load(url, resolve, reject));
  }

  function loadMultiple(urls, onAllLoaded, onProgress) {
    let loaded = 0;
    const results = {};
    for (const url of urls) {
      load(url, buffer => {
        results[url] = buffer;
        loaded++;
        if (onProgress) onProgress(loaded / urls.length, url);
        if (loaded === urls.length && onAllLoaded) onAllLoaded(results);
      }, err => {
        results[url] = null;
        loaded++;
        if (onProgress) onProgress(loaded / urls.length, url);
        if (loaded === urls.length && onAllLoaded) onAllLoaded(results);
      });
    }
  }

  function getCached(url) { return _cache.get(url) || null; }
  function isCached(url) { return _cache.has(url); }
  function isPending(url) { return _pending.has(url); }
  function clearCache(url) { if (url) { _cache.delete(url); } else { _cache.clear(); _cacheOrder.length = 0; } }

  function getStats() {
    return {
      cacheSize: _cache.size,
      pendingCount: _pending.size,
      totalBytesLoaded: _totalBytesLoaded,
      cachedUrls: [..._cache.keys()]
    };
  }

  // ---- Procedural Buffer Factory ----
  function createSilenceBuffer(durationSec) {
    if (!_audioCtx) return null;
    return _audioCtx.createBuffer(2, Math.floor(_audioCtx.sampleRate * durationSec), _audioCtx.sampleRate);
  }

  function createToneBuffer(freq, durationSec, type) {
    if (!_audioCtx) return null;
    const sr = _audioCtx.sampleRate;
    const length = Math.floor(sr * durationSec);
    const buf = _audioCtx.createBuffer(1, length, sr);
    const data = buf.getChannelData(0);
    const angularFreq = 2 * Math.PI * freq / sr;
    for (let i = 0; i < length; i++) {
      const env = i < sr * 0.01 ? i / (sr * 0.01) : (i > length - sr * 0.05 ? (length - i) / (sr * 0.05) : 1);
      if (type === 'square') data[i] = (Math.sin(angularFreq * i) > 0 ? 1 : -1) * env * 0.5;
      else if (type === 'sawtooth') data[i] = (((i * freq / sr) % 1) * 2 - 1) * env * 0.5;
      else data[i] = Math.sin(angularFreq * i) * env * 0.5;
    }
    return buf;
  }

  function createNoiseBuffer(durationSec, color) {
    if (!_audioCtx) return null;
    const sr = _audioCtx.sampleRate;
    const length = Math.floor(sr * durationSec);
    const buf = _audioCtx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      if (color === 'pink') {
        // Pink noise approximation (Paul Kellett method)
        let b0=0, b1=0, b2=0, b3=0, b4=0, b5=0, b6=0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      } else if (color === 'brown') {
        let last = 0;
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        }
      } else {
        for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
      }
    }
    return buf;
  }

  return { init, load, loadPromise, loadMultiple, getCached, isCached, isPending, clearCache, getStats, createSilenceBuffer, createToneBuffer, createNoiseBuffer };
})();


// ============================================================
// AUDIO_EFFECTS_RACK — Chain of DSP effects nodes
// Chorus, Flanger, Phaser, Distortion, Bitcrusher, Equalizer
// ============================================================
const AudioEffectsRack = (function() {
  'use strict';

  let _audioCtx = null;

  function init(audioContext) {
    _audioCtx = audioContext;
  }

  // ---- Chorus Effect ----
  function createChorus(config) {
    if (!_audioCtx) return null;
    const c = config || {};
    const inputGain  = _audioCtx.createGain();
    const outputGain = _audioCtx.createGain();
    const delay      = _audioCtx.createDelay(0.1);
    const lfo        = _audioCtx.createOscillator();
    const lfoGain    = _audioCtx.createGain();
    const wetGain    = _audioCtx.createGain();
    const dryGain    = _audioCtx.createGain();

    const depth   = c.depth   !== undefined ? c.depth   : 0.003;
    const rate    = c.rate    !== undefined ? c.rate    : 1.5;
    const mix     = c.mix     !== undefined ? c.mix     : 0.5;
    const delayT  = c.delay   !== undefined ? c.delay   : 0.025;

    delay.delayTime.setValueAtTime(delayT, _audioCtx.currentTime);
    lfo.frequency.setValueAtTime(rate, _audioCtx.currentTime);
    lfoGain.gain.setValueAtTime(depth, _audioCtx.currentTime);
    wetGain.gain.setValueAtTime(mix, _audioCtx.currentTime);
    dryGain.gain.setValueAtTime(1 - mix * 0.5, _audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();

    inputGain.connect(delay);
    inputGain.connect(dryGain);
    delay.connect(wetGain);
    dryGain.connect(outputGain);
    wetGain.connect(outputGain);

    return {
      inputNode: inputGain, outputNode: outputGain, lfo, lfoGain, delay, wetGain, dryGain,
      setRate(r) { lfo.frequency.setTargetAtTime(r, _audioCtx.currentTime, 0.05); },
      setDepth(d) { lfoGain.gain.setTargetAtTime(d, _audioCtx.currentTime, 0.05); },
      setMix(m) { wetGain.gain.setTargetAtTime(m, _audioCtx.currentTime, 0.05); dryGain.gain.setTargetAtTime(1 - m * 0.5, _audioCtx.currentTime, 0.05); }
    };
  }

  // ---- Flanger Effect ----
  function createFlanger(config) {
    if (!_audioCtx) return null;
    const c = config || {};
    const inputGain  = _audioCtx.createGain();
    const outputGain = _audioCtx.createGain();
    const delay      = _audioCtx.createDelay(0.02);
    const lfo        = _audioCtx.createOscillator();
    const lfoGain    = _audioCtx.createGain();
    const wetGain    = _audioCtx.createGain();
    const feedback   = _audioCtx.createGain();

    delay.delayTime.setValueAtTime(c.delay || 0.005, _audioCtx.currentTime);
    lfo.frequency.setValueAtTime(c.rate || 0.3, _audioCtx.currentTime);
    lfoGain.gain.setValueAtTime(c.depth || 0.004, _audioCtx.currentTime);
    wetGain.gain.setValueAtTime(c.mix || 0.5, _audioCtx.currentTime);
    feedback.gain.setValueAtTime(c.feedback || 0.6, _audioCtx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();

    inputGain.connect(delay);
    inputGain.connect(outputGain);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(outputGain);

    return {
      inputNode: inputGain, outputNode: outputGain,
      setRate(r) { lfo.frequency.setTargetAtTime(r, _audioCtx.currentTime, 0.1); },
      setFeedback(f) { feedback.gain.setTargetAtTime(Math.min(0.95, f), _audioCtx.currentTime, 0.05); }
    };
  }

  // ---- Distortion / Overdrive ----
  function createDistortion(config) {
    if (!_audioCtx) return null;
    const c = config || {};
    const inputGain  = _audioCtx.createGain();
    const outputGain = _audioCtx.createGain();
    const waveshaper = _audioCtx.createWaveShaper();
    const hpf        = _audioCtx.createBiquadFilter();
    const lpf        = _audioCtx.createBiquadFilter();

    const amount = c.amount !== undefined ? c.amount : 50;
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '4x';

    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(c.hpf || 100, _audioCtx.currentTime);
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(c.lpf || 8000, _audioCtx.currentTime);

    outputGain.gain.setValueAtTime(c.outputGain !== undefined ? c.outputGain : 0.5, _audioCtx.currentTime);

    inputGain.connect(hpf);
    hpf.connect(waveshaper);
    waveshaper.connect(lpf);
    lpf.connect(outputGain);

    return {
      inputNode: inputGain, outputNode: outputGain, waveshaper,
      setAmount(a) {
        const s = 256, newCurve = new Float32Array(s);
        for (let i = 0; i < s; i++) {
          const x = (i * 2) / s - 1;
          newCurve[i] = (Math.PI + a) * x / (Math.PI + a * Math.abs(x));
        }
        waveshaper.curve = newCurve;
      }
    };
  }

  // ---- Bitcrusher ----
  function createBitcrusher(config) {
    if (!_audioCtx) return null;
    const c = config || {};
    const scriptProcessor = _audioCtx.createScriptProcessor(4096, 1, 1);
    let bits     = c.bits     !== undefined ? c.bits     : 8;
    let reduction = c.reduction !== undefined ? c.reduction : 1;
    let _step    = Math.pow(0.5, bits);
    let _phaser  = 0;
    let _last    = 0;

    scriptProcessor.onaudioprocess = (e) => {
      const input  = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < input.length; i++) {
        _phaser += reduction;
        if (_phaser >= 1) {
          _phaser -= 1;
          _last = _step * Math.floor(input[i] / _step + 0.5);
        }
        output[i] = _last;
      }
    };

    const inputGain  = _audioCtx.createGain();
    const outputGain = _audioCtx.createGain();
    inputGain.connect(scriptProcessor);
    scriptProcessor.connect(outputGain);

    return {
      inputNode: inputGain, outputNode: outputGain,
      setBits(b) { bits = Math.max(1, Math.min(16, b)); _step = Math.pow(0.5, bits); },
      setReduction(r) { reduction = Math.max(0.01, Math.min(1, r)); }
    };
  }

  // ---- Parametric EQ (5-band) ----
  function createParametricEQ(bands) {
    if (!_audioCtx) return null;
    const inputGain  = _audioCtx.createGain();
    const outputGain = _audioCtx.createGain();
    const filterNodes = [];

    const defaultBands = bands || [
      { freq: 80,   type: 'lowshelf',   gain: 0, Q: 1 },
      { freq: 250,  type: 'peaking',    gain: 0, Q: 1 },
      { freq: 1000, type: 'peaking',    gain: 0, Q: 1 },
      { freq: 4000, type: 'peaking',    gain: 0, Q: 1 },
      { freq: 12000,type: 'highshelf',  gain: 0, Q: 1 }
    ];

    let lastNode = inputGain;
    for (const band of defaultBands) {
      const f = _audioCtx.createBiquadFilter();
      f.type = band.type;
      f.frequency.setValueAtTime(band.freq, _audioCtx.currentTime);
      f.gain.setValueAtTime(band.gain, _audioCtx.currentTime);
      f.Q.setValueAtTime(band.Q || 1, _audioCtx.currentTime);
      lastNode.connect(f);
      lastNode = f;
      filterNodes.push(f);
    }
    lastNode.connect(outputGain);

    return {
      inputNode: inputGain, outputNode: outputGain, filterNodes,
      setBandGain(index, gainDB) {
        if (filterNodes[index] && _audioCtx) {
          filterNodes[index].gain.setTargetAtTime(gainDB, _audioCtx.currentTime, 0.05);
        }
      },
      setBandFreq(index, freq) {
        if (filterNodes[index] && _audioCtx) {
          filterNodes[index].frequency.setTargetAtTime(freq, _audioCtx.currentTime, 0.05);
        }
      },
      resetAllBands() {
        if (!_audioCtx) return;
        for (const f of filterNodes) f.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.05);
      }
    };
  }

  // ---- Compressor / Limiter Preset Factory ----
  function createCompressor(preset) {
    if (!_audioCtx) return null;
    const PRESETS = {
      gentle:   { threshold: -24, knee: 12, ratio: 2,  attack: 0.01, release: 0.2 },
      moderate: { threshold: -18, knee: 8,  ratio: 4,  attack: 0.005, release: 0.15 },
      hard:     { threshold: -12, knee: 4,  ratio: 8,  attack: 0.002, release: 0.1 },
      limiter:  { threshold: -1,  knee: 0,  ratio: 20, attack: 0.001, release: 0.01 },
      broadcast:{ threshold: -20, knee: 6,  ratio: 6,  attack: 0.003, release: 0.12 }
    };
    const p = PRESETS[preset] || PRESETS.moderate;
    const comp = _audioCtx.createDynamicsCompressor();
    comp.threshold.setValueAtTime(p.threshold, _audioCtx.currentTime);
    comp.knee.setValueAtTime(p.knee, _audioCtx.currentTime);
    comp.ratio.setValueAtTime(p.ratio, _audioCtx.currentTime);
    comp.attack.setValueAtTime(p.attack, _audioCtx.currentTime);
    comp.release.setValueAtTime(p.release, _audioCtx.currentTime);
    return comp;
  }

  // ---- Signal Chain Builder ----
  function buildChain(effectNames, config) {
    if (!_audioCtx) return null;
    const creators = {
      chorus:      createChorus,
      flanger:     createFlanger,
      distortion:  createDistortion,
      bitcrusher:  createBitcrusher,
      eq:          createParametricEQ
    };
    const effects = [];
    for (const name of effectNames) {
      const fn = creators[name];
      if (fn) {
        const effect = fn(config && config[name]);
        if (effect) effects.push({ name, effect });
      }
    }
    if (effects.length === 0) return null;

    // Chain them together
    for (let i = 0; i < effects.length - 1; i++) {
      effects[i].effect.outputNode.connect(effects[i+1].effect.inputNode);
    }

    return {
      inputNode:  effects[0].effect.inputNode,
      outputNode: effects[effects.length - 1].effect.outputNode,
      effects:    effects.reduce((acc, e) => { acc[e.name] = e.effect; return acc; }, {})
    };
  }

  return { init, createChorus, createFlanger, createDistortion, createBitcrusher, createParametricEQ, createCompressor, buildChain };
})();


// ============================================================
// AUDIO_METRICS — Real-time performance and quality monitoring
// ============================================================
const AudioMetrics = (function() {
  'use strict';

  let _audioCtx = null;
  let _analyser = null;
  let _metricsData = {
    frameCount: 0,
    totalAudioTime: 0,
    dropouts: 0,
    lastUpdateTime: 0,
    peakLevel: 0,
    rmsLevel: 0,
    dynamicRange: 0,
    clippingEvents: 0
  };
  let _historyBuffer = new Float32Array(120);
  let _historyIdx = 0;
  let _monitoring = false;
  let _monitorInterval = null;

  function init(audioContext) {
    _audioCtx = audioContext;
    _analyser = _audioCtx.createAnalyser();
    _analyser.fftSize = 1024;
    _analyser.smoothingTimeConstant = 0.85;
  }

  function startMonitoring(intervalMs) {
    if (_monitoring) return;
    _monitoring = true;
    const interval = intervalMs || 100;
    _monitorInterval = setInterval(_sample, interval);
  }

  function stopMonitoring() {
    _monitoring = false;
    if (_monitorInterval) { clearInterval(_monitorInterval); _monitorInterval = null; }
  }

  function _sample() {
    if (!_analyser) return;
    const td = new Float32Array(_analyser.fftSize);
    _analyser.getFloatTimeDomainData(td);

    let peak = 0, rmsSum = 0;
    for (let i = 0; i < td.length; i++) {
      const abs = Math.abs(td[i]);
      if (abs > peak) peak = abs;
      rmsSum += td[i] * td[i];
      if (abs > 0.999) _metricsData.clippingEvents++;
    }
    const rms = Math.sqrt(rmsSum / td.length);

    _metricsData.peakLevel = peak;
    _metricsData.rmsLevel = rms;
    _metricsData.frameCount++;

    _historyBuffer[_historyIdx % _historyBuffer.length] = rms;
    _historyIdx++;

    if (peak > 0.001) {
      _metricsData.dynamicRange = 20 * Math.log10(peak / Math.max(rms, 0.0001));
    }
  }

  function getMetrics() { return { ..._metricsData }; }

  function getRMSHistory() {
    const result = new Float32Array(_historyBuffer.length);
    for (let i = 0; i < _historyBuffer.length; i++) {
      result[i] = _historyBuffer[((_historyIdx - _historyBuffer.length + i) + _historyBuffer.length * 2) % _historyBuffer.length];
    }
    return result;
  }

  function getAnalyserNode() { return _analyser; }
  function resetMetrics() { _metricsData = { frameCount:0, totalAudioTime:0, dropouts:0, lastUpdateTime:0, peakLevel:0, rmsLevel:0, dynamicRange:0, clippingEvents:0 }; }
  function isMonitoring() { return _monitoring; }

  return { init, startMonitoring, stopMonitoring, getMetrics, getRMSHistory, getAnalyserNode, resetMetrics, isMonitoring };
})();


// ============================================================
// AUDIO_PERSISTENCE — Save/load audio settings to localStorage
// ============================================================
const AudioPersistence = (function() {
  'use strict';

  const STORAGE_KEY = 'ahmet_audio_settings_v1';

  const DEFAULT_SETTINGS = {
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.85,
    engineVolume: 0.9,
    environmentVolume: 0.75,
    muted: false,
    adaptiveBPM: true,
    eqPreset: 'default',
    favoriteTracks: [],
    unlockedTrackLevels: [0],
    currentTheme: 'jungle',
    stereoWidth: 1.0,
    reverbEnabled: true,
    dopplerEnabled: true,
    positionalAudioRange: 400,
    sfxCooldownMultiplier: 1.0,
    notificationsEnabled: true
  };

  function save(settings) {
    try {
      const toSave = Object.assign({}, DEFAULT_SETTINGS, settings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      return true;
    } catch (e) {
      console.warn('[AudioPersistence] Save failed:', e.message);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return Object.assign({}, DEFAULT_SETTINGS, parsed);
    } catch (e) {
      console.warn('[AudioPersistence] Load failed:', e.message);
      return { ...DEFAULT_SETTINGS };
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); return true; }
    catch (e) { return false; }
  }

  function applyToSystems(settings) {
    if (!settings) return;
    if (typeof AHMET_AUDIO_MASTER !== 'undefined') {
      AHMET_AUDIO_MASTER.setMasterVolume(settings.masterVolume || 0.8);
      if (settings.muted) AHMET_AUDIO_MASTER.mute();
    }
    if (typeof MUSIC_SYSTEM_V2 !== 'undefined') {
      MUSIC_SYSTEM_V2.adaptiveBPM = settings.adaptiveBPM !== false;
    }
    if (typeof POSITIONAL_AUDIO !== 'undefined') {
      POSITIONAL_AUDIO.setStereoWidth(settings.stereoWidth !== undefined ? settings.stereoWidth : 1.0);
    }
    if (typeof MusicEQ !== 'undefined') {
      MusicEQ.applyPreset(settings.eqPreset || 'default');
    }
  }

  function saveFromSystems() {
    const settings = { ...DEFAULT_SETTINGS };
    if (typeof AHMET_AUDIO_MASTER !== 'undefined') {
      const diag = AHMET_AUDIO_MASTER.getDiagnostics();
      settings.masterVolume = diag.masterVolume;
      settings.muted = diag.muted;
    }
    if (typeof MUSIC_SYSTEM_V2 !== 'undefined') {
      settings.favoriteTracks = MUSIC_SYSTEM_V2.getFavorites().map(t => t.id);
    }
    return save(settings);
  }

  return { save, load, reset, applyToSystems, saveFromSystems, DEFAULT_SETTINGS };
})();


// ============================================================
// AUDIO_ACCESSIBILITY — Accessibility features for audio
// Visual audio cues, audio descriptions, hearing aid modes
// ============================================================
const AudioAccessibility = (function() {
  'use strict';

  let _enabled = false;
  let _visualCueCallbacks = [];
  let _captionCallbacks = [];
  let _audioCtx = null;

  // Hearing aid mode: boost high frequencies, compress dynamics
  let _hearingAidFilter = null;
  let _hearingAidComp = null;
  let _hearingAidEnabled = false;

  // Mono mode
  let _monoMerger = null;
  let _monoEnabled = false;

  function init(audioContext) {
    _audioCtx = audioContext;
    console.log('[AudioAccessibility] Initialized');
  }

  // ---- Visual Cue System ----
  function registerVisualCueCallback(cb) {
    _visualCueCallbacks.push(cb);
  }

  function unregisterVisualCueCallback(cb) {
    _visualCueCallbacks = _visualCueCallbacks.filter(c => c !== cb);
  }

  function triggerVisualCue(eventType, intensity, posX, posY) {
    if (!_enabled) return;
    for (const cb of _visualCueCallbacks) {
      try { cb({ type: eventType, intensity, x: posX || 0, y: posY || 0, timestamp: Date.now() }); }
      catch (e) {}
    }
  }

  // ---- Caption System ----
  function registerCaptionCallback(cb) {
    _captionCallbacks.push(cb);
  }

  function emitCaption(text, category, duration) {
    if (!_enabled) return;
    for (const cb of _captionCallbacks) {
      try { cb({ text, category: category || 'sfx', duration: duration || 2000, timestamp: Date.now() }); }
      catch (e) {}
    }
  }

  // ---- Sound Description Map ----
  const SOUND_CAPTIONS = {
    buttonClick:      '[Click]',
    coinCollect:      '[Coin: ding!]',
    diamondCollect:   '[Diamond: sparkle!]',
    crash:            '[Crash!]',
    outOfFuel:        '[Engine sputtering]',
    gameOver:         '[Game over]',
    nitroActivate:    '[Nitro boost!]',
    levelUp:          '[Level up!]',
    flip:             '[Flip!]',
    landing:          '[Thud]',
    perfectLanding:   '[Perfect landing!]',
    checkpoint:       '[Checkpoint!]',
    newRecord:        '[New record!]',
    countdown3:       '[3...]',
    countdown2:       '[2...]',
    countdown1:       '[1...]',
    countdownGo:      '[GO!]',
    victorySting:     '[Victory fanfare]',
    defeatSting:      '[Defeat]'
  };

  function emitSoundCaption(soundName) {
    const caption = SOUND_CAPTIONS[soundName];
    if (caption) emitCaption(caption, 'sfx', 1500);
  }

  // ---- Hearing Aid Mode ----
  function enableHearingAidMode(masterBus) {
    if (!_audioCtx || _hearingAidEnabled) return;
    _hearingAidFilter = _audioCtx.createBiquadFilter();
    _hearingAidFilter.type = 'highshelf';
    _hearingAidFilter.frequency.setValueAtTime(2000, _audioCtx.currentTime);
    _hearingAidFilter.gain.setValueAtTime(8, _audioCtx.currentTime);

    _hearingAidComp = _audioCtx.createDynamicsCompressor();
    _hearingAidComp.threshold.setValueAtTime(-30, _audioCtx.currentTime);
    _hearingAidComp.ratio.setValueAtTime(6, _audioCtx.currentTime);
    _hearingAidComp.attack.setValueAtTime(0.005, _audioCtx.currentTime);
    _hearingAidComp.release.setValueAtTime(0.1, _audioCtx.currentTime);

    if (masterBus) {
      masterBus.connect(_hearingAidFilter);
      _hearingAidFilter.connect(_hearingAidComp);
      _hearingAidComp.connect(_audioCtx.destination);
    }
    _hearingAidEnabled = true;
    console.log('[AudioAccessibility] Hearing aid mode enabled');
  }

  function disableHearingAidMode() {
    if (!_hearingAidEnabled) return;
    try {
      if (_hearingAidFilter) _hearingAidFilter.disconnect();
      if (_hearingAidComp) _hearingAidComp.disconnect();
    } catch (e) {}
    _hearingAidFilter = null;
    _hearingAidComp = null;
    _hearingAidEnabled = false;
  }

  // ---- Mono Mix ----
  function enableMono() {
    if (!_audioCtx || _monoEnabled) return;
    _monoMerger = _audioCtx.createChannelMerger(2);
    const splitter = _audioCtx.createChannelSplitter(2);
    const monoGain = _audioCtx.createGain();
    monoGain.connect(splitter);
    splitter.connect(_monoMerger, 0, 0);
    splitter.connect(_monoMerger, 0, 1);
    _monoEnabled = true;
    console.log('[AudioAccessibility] Mono mode enabled');
  }

  function disableMono() {
    _monoEnabled = false;
    if (_monoMerger) { try { _monoMerger.disconnect(); } catch (e) {} _monoMerger = null; }
  }

  // ---- Enable / Disable All ----
  function enable()  { _enabled = true; }
  function disable() { _enabled = false; }

  return {
    init, enable, disable,
    registerVisualCueCallback, unregisterVisualCueCallback, triggerVisualCue,
    registerCaptionCallback, emitCaption, emitSoundCaption,
    enableHearingAidMode, disableHearingAidMode,
    enableMono, disableMono,
    SOUND_CAPTIONS,
    get isEnabled() { return _enabled; },
    get isHearingAidEnabled() { return _hearingAidEnabled; },
    get isMonoEnabled() { return _monoEnabled; }
  };
})();


// ============================================================
// Final batch export
// ============================================================
(function() {
  'use strict';
  const newModules = {
    AudioStreamingManager,
    AudioEffectsRack,
    AudioMetrics,
    AudioPersistence,
    AudioAccessibility,
    AHMET_AUDIO_MASTER
  };
  if (typeof window !== 'undefined') {
    Object.assign(window, newModules);
  }
  if (typeof module !== 'undefined' && module.exports) {
    Object.assign(module.exports, newModules);
  }
  console.log('[AHMET Audio] Utility modules loaded: AudioStreamingManager, AudioEffectsRack, AudioMetrics, AudioPersistence, AudioAccessibility, AHMET_AUDIO_MASTER');
})();


// ============================================================
// AUDIO_DEBUG_CONSOLE — Developer tools for audio inspection
// Live node graph, parameter logging, A/B comparison, profiler
// ============================================================
const AudioDebugConsole = (function() {
  'use strict';

  let _audioCtx = null;
  let _enabled = false;
  let _log = [];
  const _maxLog = 200;
  let _profileData = {};
  let _timers = {};
  let _watchedParams = [];
  let _watchInterval = null;

  function init(audioContext) {
    _audioCtx = audioContext;
  }

  function enable()  { _enabled = true;  console.log('[AudioDebugConsole] Enabled'); }
  function disable() { _enabled = false; stopWatchingParams(); }

  // ---- Log ----
  function _emit(level, msg, data) {
    if (!_enabled) return;
    const entry = { ts: _audioCtx ? _audioCtx.currentTime.toFixed(3) : Date.now(), level, msg, data: data || null };
    _log.push(entry);
    if (_log.length > _maxLog) _log.shift();
    const formatted = '[AUD:' + level.toUpperCase() + '][' + entry.ts + '] ' + msg;
    if (level === 'error')   console.error(formatted, data || '');
    else if (level === 'warn') console.warn(formatted, data || '');
    else                     console.log(formatted, data || '');
  }

  function log(msg, data)   { _emit('info',  msg, data); }
  function warn(msg, data)  { _emit('warn',  msg, data); }
  function error(msg, data) { _emit('error', msg, data); }
  function getLog(n)        { return _log.slice(-(n || _maxLog)); }
  function clearLog()       { _log = []; }

  // ---- Profiler ----
  function startProfile(name) {
    _timers[name] = performance.now();
  }

  function endProfile(name) {
    if (!_timers[name]) return 0;
    const elapsed = performance.now() - _timers[name];
    delete _timers[name];
    if (!_profileData[name]) _profileData[name] = { count: 0, total: 0, min: Infinity, max: -Infinity };
    const p = _profileData[name];
    p.count++;
    p.total += elapsed;
    if (elapsed < p.min) p.min = elapsed;
    if (elapsed > p.max) p.max = elapsed;
    return elapsed;
  }

  function getProfileStats(name) {
    const p = _profileData[name];
    if (!p || p.count === 0) return null;
    return { name, count: p.count, avg: p.total / p.count, min: p.min, max: p.max, total: p.total };
  }

  function getAllProfileStats() {
    return Object.keys(_profileData).map(n => getProfileStats(n)).filter(Boolean);
  }

  function clearProfileData() { _profileData = {}; _timers = {}; }

  // ---- Node Inspector ----
  function inspectGainNode(node, label) {
    if (!node || !_enabled) return null;
    const val = node.gain ? node.gain.value : null;
    _emit('info', (label || 'GainNode') + ' gain=' + (val !== null ? val.toFixed(4) : 'n/a'));
    return val;
  }

  function inspectOscillator(node, label) {
    if (!node || !_enabled) return null;
    const info = {
      type: node.type,
      frequency: node.frequency ? node.frequency.value : null,
      detune: node.detune ? node.detune.value : null
    };
    _emit('info', (label || 'Oscillator') + ' ' + JSON.stringify(info));
    return info;
  }

  function inspectFilter(node, label) {
    if (!node || !_enabled) return null;
    const info = {
      type: node.type,
      frequency: node.frequency ? node.frequency.value : null,
      Q: node.Q ? node.Q.value : null,
      gain: node.gain ? node.gain.value : null
    };
    _emit('info', (label || 'BiquadFilter') + ' ' + JSON.stringify(info));
    return info;
  }

  // ---- Param Watcher ----
  function watchParam(paramGetter, label, intervalMs) {
    _watchedParams.push({ paramGetter, label: label || 'param', intervalMs: intervalMs || 500, lastValue: null, lastLogTime: 0 });
  }

  function _tickWatchedParams() {
    const now = Date.now();
    for (const w of _watchedParams) {
      if (now - w.lastLogTime < w.intervalMs) continue;
      w.lastLogTime = now;
      try {
        const param = w.paramGetter();
        const val = param ? (typeof param.value !== 'undefined' ? param.value : param) : null;
        if (val !== w.lastValue) {
          _emit('info', '[WATCH] ' + w.label + ': ' + (typeof val === 'number' ? val.toFixed(4) : val));
          w.lastValue = val;
        }
      } catch (e) { /* param may have been cleaned up */ }
    }
  }

  function startWatchingParams() {
    if (_watchInterval) return;
    _watchInterval = setInterval(_tickWatchedParams, 100);
  }

  function stopWatchingParams() {
    if (_watchInterval) { clearInterval(_watchInterval); _watchInterval = null; }
    _watchedParams = [];
  }

  // ---- AudioContext Inspector ----
  function inspectAudioContext() {
    if (!_audioCtx) return null;
    const info = {
      state: _audioCtx.state,
      sampleRate: _audioCtx.sampleRate,
      currentTime: _audioCtx.currentTime.toFixed(3),
      baseLatency: _audioCtx.baseLatency ? _audioCtx.baseLatency.toFixed(4) : 'n/a',
      outputLatency: _audioCtx.outputLatency ? _audioCtx.outputLatency.toFixed(4) : 'n/a',
      destination: {
        maxChannelCount: _audioCtx.destination.maxChannelCount,
        channelCount: _audioCtx.destination.channelCount
      }
    };
    if (_enabled) _emit('info', 'AudioContext: ' + JSON.stringify(info));
    return info;
  }

  // ---- A/B Test Helper ----
  const ABTester = {
    _tests: {},
    create(testName, paramA, paramB) {
      this._tests[testName] = { paramA, paramB, currentVariant: 'A', startTime: Date.now(), results: { A: [], B: [] } };
      return testName;
    },
    switchTo(testName, variant) {
      const test = this._tests[testName];
      if (!test) return;
      test.currentVariant = variant;
      _emit('info', '[A/B] ' + testName + ' → variant ' + variant);
    },
    recordMetric(testName, metric) {
      const test = this._tests[testName];
      if (!test) return;
      test.results[test.currentVariant].push({ metric, ts: Date.now() });
    },
    getResults(testName) {
      const test = this._tests[testName];
      if (!test) return null;
      const avg = arr => arr.length ? arr.reduce((a, b) => a + b.metric, 0) / arr.length : 0;
      return { A: { count: test.results.A.length, avg: avg(test.results.A) }, B: { count: test.results.B.length, avg: avg(test.results.B) } };
    },
    clearTest(testName) { delete this._tests[testName]; }
  };

  return {
    init, enable, disable,
    log, warn, error, getLog, clearLog,
    startProfile, endProfile, getProfileStats, getAllProfileStats, clearProfileData,
    inspectGainNode, inspectOscillator, inspectFilter,
    watchParam, startWatchingParams, stopWatchingParams,
    inspectAudioContext,
    ABTester,
    get isEnabled() { return _enabled; }
  };
})();


// ============================================================
// AUDIO_EVENT_BUS — Pub/Sub event system for audio events
// ============================================================
const AudioEventBus = (function() {
  'use strict';

  const _listeners = {};
  let _eventHistory = [];
  const _maxHistory = 100;

  const EVENTS = {
    TRACK_CHANGED:       'track:changed',
    STEM_TOGGLED:        'stem:toggled',
    INTENSITY_CHANGED:   'intensity:changed',
    ENGINE_STARTED:      'engine:started',
    ENGINE_STOPPED:      'engine:stopped',
    GEAR_SHIFTED:        'engine:gear_shifted',
    CRACKLE:             'engine:crackle',
    ENVIRONMENT_CHANGED: 'env:changed',
    WEATHER_CHANGED:     'env:weather_changed',
    SFX_PLAYED:          'sfx:played',
    SOURCE_ADDED:        'positional:source_added',
    SOURCE_REMOVED:      'positional:source_removed',
    MASTER_VOLUME:       'master:volume_changed',
    MUTED:               'master:muted',
    UNMUTED:             'master:unmuted',
    SETTINGS_SAVED:      'settings:saved',
    SETTINGS_LOADED:     'settings:loaded'
  };

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
    return () => off(event, callback);
  }

  function once(event, callback) {
    const unsub = on(event, (data) => { callback(data); unsub(); });
    return unsub;
  }

  function off(event, callback) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(c => c !== callback);
  }

  function emit(event, data) {
    const entry = { event, data: data || null, ts: Date.now() };
    _eventHistory.push(entry);
    if (_eventHistory.length > _maxHistory) _eventHistory.shift();

    const callbacks = _listeners[event] || [];
    for (const cb of callbacks) {
      try { cb(data); } catch (e) { console.error('[AudioEventBus] Error in listener for', event, e); }
    }
  }

  function getHistory(event, n) {
    let hist = event ? _eventHistory.filter(e => e.event === event) : [..._eventHistory];
    return hist.slice(-(n || _maxHistory));
  }

  function clearHistory() { _eventHistory = []; }
  function listenerCount(event) { return (_listeners[event] || []).length; }
  function removeAllListeners(event) { if (event) delete _listeners[event]; else Object.keys(_listeners).forEach(k => delete _listeners[k]); }

  return { on, once, off, emit, getHistory, clearHistory, listenerCount, removeAllListeners, EVENTS };
})();


// ============================================================
// Final export of all debug/utility modules
// ============================================================
(function() {
  'use strict';
  const debugModules = {
    AudioDebugConsole,
    AudioEventBus
  };
  if (typeof window !== 'undefined') Object.assign(window, debugModules);
  if (typeof module !== 'undefined' && module.exports) Object.assign(module.exports, debugModules);
  console.log('[AHMET Audio] Debug modules loaded: AudioDebugConsole, AudioEventBus');
  console.log('[AHMET Audio] Full audio system ready — total modules: MUSIC_SYSTEM_V2, ENGINE_SOUND_SYSTEM_V2, ENVIRONMENTAL_AUDIO, UI_SFX_LIBRARY, POSITIONAL_AUDIO, AudioStreamingManager, AudioEffectsRack, AudioMetrics, AudioPersistence, AudioAccessibility, AHMET_AUDIO_MASTER, AudioDebugConsole, AudioEventBus + 25 sub-modules');
})();


// ============================================================
// AUDIO_ANIMATION_SYNC — Sync audio parameters to game animation
// Beat-synced visual effects, waveform-driven animation data
// ============================================================
const AudioAnimationSync = (function() {
  'use strict';

  let _audioCtx = null;
  let _analyser = null;
  let _fftSize = 512;
  let _frequencyData = null;
  let _timeDomainData = null;
  let _beatDetector = null;
  let _onBeatCallbacks = [];
  let _lastBeatTime = 0;
  let _beatThreshold = 0.25;
  let _beatCooldown = 0.3;

  const FREQ_BANDS = {
    subBass:    [20,   60],
    bass:       [60,   250],
    lowMid:     [250,  500],
    mid:        [500,  2000],
    highMid:    [2000, 4000],
    presence:   [4000, 6000],
    brilliance: [6000, 20000]
  };

  function init(audioContext) {
    _audioCtx = audioContext;
    _analyser = _audioCtx.createAnalyser();
    _analyser.fftSize = _fftSize;
    _analyser.smoothingTimeConstant = 0.8;
    _frequencyData = new Uint8Array(_analyser.frequencyBinCount);
    _timeDomainData = new Uint8Array(_analyser.fftSize);
  }

  function getAnalyserNode() { return _analyser; }

  function getBandEnergy(bandName) {
    if (!_analyser || !_frequencyData) return 0;
    _analyser.getByteFrequencyData(_frequencyData);
    const band = FREQ_BANDS[bandName];
    if (!band) return 0;
    const nyquist = _audioCtx.sampleRate / 2;
    const binCount = _analyser.frequencyBinCount;
    const freqPerBin = nyquist / binCount;
    const startBin = Math.floor(band[0] / freqPerBin);
    const endBin   = Math.min(Math.ceil(band[1] / freqPerBin), binCount - 1);
    let sum = 0;
    for (let i = startBin; i <= endBin; i++) sum += _frequencyData[i];
    return sum / ((endBin - startBin + 1) * 255);
  }

  function getAllBandEnergies() {
    const result = {};
    for (const band of Object.keys(FREQ_BANDS)) result[band] = getBandEnergy(band);
    return result;
  }

  function getWaveformData() {
    if (!_analyser || !_timeDomainData) return null;
    _analyser.getByteTimeDomainData(_timeDomainData);
    return new Float32Array(_timeDomainData).map(v => (v - 128) / 128);
  }

  function detectBeat() {
    if (!_audioCtx) return false;
    const bassEnergy = getBandEnergy('bass') + getBandEnergy('subBass') * 0.5;
    const now = _audioCtx.currentTime;
    if (bassEnergy > _beatThreshold && now - _lastBeatTime > _beatCooldown) {
      _lastBeatTime = now;
      for (const cb of _onBeatCallbacks) { try { cb(bassEnergy, now); } catch (e) {} }
      return true;
    }
    return false;
  }

  function onBeat(callback)  { _onBeatCallbacks.push(callback); }
  function offBeat(callback) { _onBeatCallbacks = _onBeatCallbacks.filter(c => c !== callback); }
  function setBeatThreshold(t) { _beatThreshold = Math.max(0, Math.min(1, t)); }
  function setBeatCooldown(sec) { _beatCooldown = Math.max(0.05, sec); }

  function getAnimationPayload() {
    return {
      bands: getAllBandEnergies(),
      waveform: getWaveformData(),
      beat: detectBeat(),
      time: _audioCtx ? _audioCtx.currentTime : 0
    };
  }

  return {
    init, getAnalyserNode, getBandEnergy, getAllBandEnergies,
    getWaveformData, detectBeat, onBeat, offBeat,
    setBeatThreshold, setBeatCooldown, getAnimationPayload,
    FREQ_BANDS
  };
})();


// ============================================================
// AUDIO_NETWORK_SYNC — Multiplayer audio event synchronization
// Ensures audio cues fire at the same game-time across clients
// ============================================================
const AudioNetworkSync = (function() {
  'use strict';

  let _audioCtx = null;
  let _serverTimeDelta = 0;     // offset: serverTime - localTime (ms)
  let _latency = 0;             // estimated round-trip latency (ms)
  let _scheduledEvents = [];
  let _eventHandlers = {};
  let _sendCallback = null;     // function(eventObj) → send to network

  function init(audioContext) {
    _audioCtx = audioContext;
  }

  // ---- Time Sync ----
  function setServerTimeDelta(deltaMs) { _serverTimeDelta = deltaMs; }
  function setLatency(latencyMs)       { _latency = latencyMs; }

  function serverTimeToAudioTime(serverTimestampMs) {
    const localMs = serverTimestampMs - _serverTimeDelta;
    const contextOffsetSec = (localMs - performance.now()) / 1000;
    return (_audioCtx ? _audioCtx.currentTime : 0) + contextOffsetSec;
  }

  // ---- Schedule Remote Event ----
  function scheduleRemoteEvent(eventType, serverTimestampMs, data) {
    const audioTime = serverTimeToAudioTime(serverTimestampMs);
    const delayMs = Math.max(0, (audioTime - (_audioCtx ? _audioCtx.currentTime : 0)) * 1000);
    const entry = { eventType, audioTime, data, timerId: null };

    entry.timerId = setTimeout(() => {
      const handlers = _eventHandlers[eventType] || [];
      for (const h of handlers) { try { h(data, audioTime); } catch (e) {} }
      _scheduledEvents = _scheduledEvents.filter(e => e !== entry);
    }, delayMs);

    _scheduledEvents.push(entry);
    return entry;
  }

  function cancelScheduledEvent(entry) {
    if (entry && entry.timerId) { clearTimeout(entry.timerId); }
    _scheduledEvents = _scheduledEvents.filter(e => e !== entry);
  }

  function cancelAllScheduled() {
    for (const e of _scheduledEvents) { if (e.timerId) clearTimeout(e.timerId); }
    _scheduledEvents = [];
  }

  // ---- Register Handlers ----
  function onRemoteEvent(eventType, handler) {
    if (!_eventHandlers[eventType]) _eventHandlers[eventType] = [];
    _eventHandlers[eventType].push(handler);
  }

  function offRemoteEvent(eventType, handler) {
    if (!_eventHandlers[eventType]) return;
    _eventHandlers[eventType] = _eventHandlers[eventType].filter(h => h !== handler);
  }

  // ---- Broadcast Local Event ----
  function setSendCallback(cb) { _sendCallback = cb; }

  function broadcastEvent(eventType, data) {
    if (!_sendCallback) return;
    const serverTimestampMs = performance.now() + _serverTimeDelta;
    _sendCallback({ eventType, serverTimestampMs, data, latency: _latency });
  }

  function getScheduledCount() { return _scheduledEvents.length; }

  return {
    init, setServerTimeDelta, setLatency, serverTimeToAudioTime,
    scheduleRemoteEvent, cancelScheduledEvent, cancelAllScheduled,
    onRemoteEvent, offRemoteEvent, setSendCallback, broadcastEvent,
    getScheduledCount
  };
})();


// ============================================================
// AUDIO_LOCALIZATION — Multi-language audio asset routing
// Route to locale-specific voice lines, localized music stings
// ============================================================
const AudioLocalization = (function() {
  'use strict';

  let _currentLocale = 'en';
  let _fallbackLocale = 'en';
  const _assetMap = {};
  const _loadedLocales = new Set();

  const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'it', 'pl', 'nl'];

  function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) {
      console.warn('[AudioLocalization] Unsupported locale:', locale, '— falling back to', _fallbackLocale);
      _currentLocale = _fallbackLocale;
    } else {
      _currentLocale = locale;
    }
  }

  function registerAsset(key, localeMap) {
    // localeMap: { en: 'url_en.ogg', tr: 'url_tr.ogg', ... }
    _assetMap[key] = { ...localeMap };
  }

  function getAssetUrl(key) {
    const map = _assetMap[key];
    if (!map) return null;
    return map[_currentLocale] || map[_fallbackLocale] || null;
  }

  function registerBulk(assets) {
    // assets: [{ key, localeMap }]
    for (const a of assets) registerAsset(a.key, a.localeMap);
  }

  function markLocaleLoaded(locale) { _loadedLocales.add(locale); }
  function isLocaleLoaded(locale)   { return _loadedLocales.has(locale); }

  function getAvailableAssets() { return Object.keys(_assetMap); }
  function getCurrentLocale()   { return _currentLocale; }

  // ---- Voice Line Sequencer ----
  const VoiceLineSequencer = {
    _queue: [],
    _audioCtx: null,
    _masterGain: null,
    _playing: false,

    init(audioContext, masterGain) {
      this._audioCtx = audioContext;
      this._masterGain = masterGain;
    },

    enqueue(key, priority) {
      const url = getAssetUrl(key);
      if (!url) return;
      this._queue.push({ key, url, priority: priority || 5 });
      this._queue.sort((a, b) => a.priority - b.priority);
      if (!this._playing) this._playNext();
    },

    _playNext() {
      if (this._queue.length === 0) { this._playing = false; return; }
      this._playing = true;
      const item = this._queue.shift();

      if (!this._audioCtx) { this._playing = false; return; }

      if (typeof AudioStreamingManager !== 'undefined') {
        AudioStreamingManager.load(item.url, buffer => {
          const src = this._audioCtx.createBufferSource();
          const g = this._audioCtx.createGain();
          src.buffer = buffer;
          src.connect(g);
          g.connect(this._masterGain || this._audioCtx.destination);
          src.start();
          src.onended = () => this._playNext();
        }, () => this._playNext());
      } else {
        this._playing = false;
      }
    },

    clearQueue() { this._queue = []; this._playing = false; },
    queueSize() { return this._queue.length; }
  };

  return {
    setLocale, registerAsset, getAssetUrl, registerBulk,
    markLocaleLoaded, isLocaleLoaded, getAvailableAssets, getCurrentLocale,
    VoiceLineSequencer, SUPPORTED_LOCALES,
    get currentLocale() { return _currentLocale; }
  };
})();


// ============================================================
// AUDIO_BENCHMARK — Performance testing for audio workloads
// Measures oscillator count limits, decode speed, buffer alloc
// ============================================================
const AudioBenchmark = (function() {
  'use strict';

  let _audioCtx = null;
  let _results = {};

  function init(audioContext) {
    _audioCtx = audioContext;
  }

  function _time(fn) {
    const start = performance.now();
    fn();
    return performance.now() - start;
  }

  function benchmarkOscillators(count) {
    if (!_audioCtx) return null;
    const oscs = [];
    const gains = [];
    const elapsed = _time(() => {
      for (let i = 0; i < count; i++) {
        const o = _audioCtx.createOscillator();
        const g = _audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, _audioCtx.currentTime);
        o.connect(g);
        g.connect(_audioCtx.destination);
        o.start();
        oscs.push(o); gains.push(g);
      }
    });
    const cleanupTime = _time(() => {
      for (let i = 0; i < oscs.length; i++) {
        try { oscs[i].stop(); oscs[i].disconnect(); gains[i].disconnect(); } catch (e) {}
      }
    });
    const result = { count, createMs: elapsed, cleanupMs: cleanupTime, perOscillatorUs: (elapsed / count) * 1000 };
    _results.oscillators = result;
    return result;
  }

  function benchmarkBufferAllocation(sampleRate, durationSec, channelCount) {
    if (!_audioCtx) return null;
    const sr = sampleRate || _audioCtx.sampleRate;
    const dur = durationSec || 1;
    const ch  = channelCount || 2;
    const elapsed = _time(() => {
      const buf = _audioCtx.createBuffer(ch, sr * dur, sr);
      for (let c = 0; c < ch; c++) {
        const data = buf.getChannelData(c);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
    });
    const result = { sampleRate: sr, durationSec: dur, channels: ch, totalSamples: sr * dur * ch, allocAndFillMs: elapsed };
    _results.bufferAllocation = result;
    return result;
  }

  function benchmarkGainNodes(count) {
    if (!_audioCtx) return null;
    const gains = [];
    const elapsed = _time(() => {
      for (let i = 0; i < count; i++) {
        const g = _audioCtx.createGain();
        g.connect(_audioCtx.destination);
        gains.push(g);
      }
    });
    const cleanupTime = _time(() => {
      for (const g of gains) { try { g.disconnect(); } catch (e) {} }
    });
    const result = { count, createMs: elapsed, cleanupMs: cleanupTime, perNodeUs: (elapsed / count) * 1000 };
    _results.gainNodes = result;
    return result;
  }

  function runFullBenchmark(onComplete) {
    const results = {};
    results.oscillators      = benchmarkOscillators(50);
    results.gainNodes        = benchmarkGainNodes(100);
    results.bufferAllocation = benchmarkBufferAllocation();
    results.timestamp = Date.now();
    results.audioCtxSampleRate = _audioCtx ? _audioCtx.sampleRate : 0;
    _results = results;
    if (onComplete) onComplete(results);
    return results;
  }

  function getLastResults() { return { ..._results }; }
  function clearResults()   { _results = {}; }

  return { init, benchmarkOscillators, benchmarkBufferAllocation, benchmarkGainNodes, runFullBenchmark, getLastResults, clearResults };
})();


// ============================================================
// Final export of remaining modules
// ============================================================
(function() {
  'use strict';
  const remainingModules = {
    AudioAnimationSync,
    AudioNetworkSync,
    AudioLocalization,
    AudioBenchmark
  };
  if (typeof window !== 'undefined') Object.assign(window, remainingModules);
  if (typeof module !== 'undefined' && module.exports) Object.assign(module.exports, remainingModules);
  console.log('[AHMET Audio] Final modules loaded: AudioAnimationSync, AudioNetworkSync, AudioLocalization, AudioBenchmark');
  console.log('[AHMET Audio] === Complete AHMET Audio Engine Loaded ===');
})();

// ============================================================
// AUDIO_MIXER_V2 — 16-channel mixer with routing & automation
// ============================================================
const AUDIO_MIXER_V2 = (() => {
  const NUM_CHANNELS = 16;

  const CHANNEL_GROUPS = {
    MASTER:  { id: 'master',  label: 'Master',  color: '#ffffff' },
    MUSIC:   { id: 'music',   label: 'Music',   color: '#4a90e2' },
    SFX:     { id: 'sfx',     label: 'SFX',     color: '#f5a623' },
    VOICE:   { id: 'voice',   label: 'Voice',   color: '#7ed321' },
    AMBIENT: { id: 'ambient', label: 'Ambient', color: '#9b59b6' },
    VEHICLE: { id: 'vehicle', label: 'Vehicle', color: '#e74c3c' },
  };

  function makeChannel(id, name, group) {
    return {
      id, name, group,
      volume: 1.0, pan: 0.0,
      mute: false, solo: false,
      sends: [],    // [{ busId, level }]
      inserts: [],  // [{ type, params }]
      vuPeak: 0, vuRms: 0,
      meterHistory: new Float32Array(60),
      meterWriteIdx: 0,
      enabled: true,
    };
  }

  const channels = [];
  const channelMap = {};
  const defaults = [
    ['ch00', 'Master Out', 'master'],
    ['ch01', 'Music Main', 'music'],
    ['ch02', 'Music Stem A', 'music'],
    ['ch03', 'Music Stem B', 'music'],
    ['ch04', 'SFX Main', 'sfx'],
    ['ch05', 'Engine SFX', 'vehicle'],
    ['ch06', 'Impact SFX', 'sfx'],
    ['ch07', 'Collectible SFX', 'sfx'],
    ['ch08', 'UI SFX', 'sfx'],
    ['ch09', 'Voice Main', 'voice'],
    ['ch10', 'Ambient Env', 'ambient'],
    ['ch11', 'Ambient Wind', 'ambient'],
    ['ch12', 'Vehicle Motor', 'vehicle'],
    ['ch13', 'Vehicle Tire', 'vehicle'],
    ['ch14', 'Reverb Bus', 'sfx'],
    ['ch15', 'Delay Bus', 'sfx'],
  ];

  function _init() {
    for (const [id, name, group] of defaults) {
      const ch = makeChannel(id, name, group);
      channels.push(ch);
      channelMap[id] = ch;
    }
    _setupDefaultRouting();
    _setupDefaultInserts();
  }

  function _setupDefaultRouting() {
    // Music channels send to reverb bus
    channelMap['ch01'].sends.push({ busId: 'ch14', level: 0.2 });
    channelMap['ch02'].sends.push({ busId: 'ch14', level: 0.15 });
    // SFX sends to reverb and delay
    channelMap['ch04'].sends.push({ busId: 'ch14', level: 0.3 });
    channelMap['ch04'].sends.push({ busId: 'ch15', level: 0.1 });
    // Engine sends to delay for space
    channelMap['ch05'].sends.push({ busId: 'ch15', level: 0.05 });
  }

  function _setupDefaultInserts() {
    // Master compressor
    channelMap['ch00'].inserts.push({
      type: 'compressor',
      params: { threshold: -6, ratio: 2, attack: 10, release: 100, makeupGain: 1, knee: 3 }
    });
    // Master EQ
    channelMap['ch00'].inserts.push({
      type: 'eq',
      params: { bands: [
        { freq: 80,   gain: 1.5,  q: 0.7, type: 'highpass' },
        { freq: 250,  gain: -1,   q: 1.0, type: 'peak' },
        { freq: 3000, gain: 1,    q: 1.2, type: 'peak' },
        { freq: 8000, gain: 2,    q: 0.8, type: 'highshelf' },
      ]}
    });
    // Voice channel compressor
    channelMap['ch09'].inserts.push({
      type: 'compressor',
      params: { threshold: -12, ratio: 4, attack: 5, release: 50, makeupGain: 3, knee: 2 }
    });
    // Reverb bus insert
    channelMap['ch14'].inserts.push({
      type: 'reverb',
      params: { roomSize: 0.6, damping: 0.5, wetDry: 1.0, predelay: 20 }
    });
    // Delay bus insert
    channelMap['ch15'].inserts.push({
      type: 'delay',
      params: { time: 375, feedback: 0.4, wetDry: 1.0, syncBpm: true }
    });
  }

  // ── VU Metering ──────────────────────────────────────────
  function updateMeter(channelId, peak, rms) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.vuPeak = Math.max(peak, ch.vuPeak * 0.97);  // slow peak fall
    ch.vuRms  = rms;
    ch.meterHistory[ch.meterWriteIdx % 60] = rms;
    ch.meterWriteIdx++;
  }

  function getMeterData(channelId) {
    const ch = channelMap[channelId];
    if (!ch) return null;
    const hist = [];
    for (let i = 0; i < 60; i++) {
      hist.push(ch.meterHistory[(ch.meterWriteIdx - 60 + i + 60) % 60]);
    }
    return { peak: ch.vuPeak, rms: ch.vuRms, history: hist };
  }

  // ── Channel controls ─────────────────────────────────────
  function setVolume(channelId, vol) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.volume = Math.max(0, Math.min(2, vol));
  }

  function setPan(channelId, pan) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.pan = Math.max(-1, Math.min(1, pan));
  }

  function setMute(channelId, muted) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.mute = !!muted;
  }

  function setSolo(channelId, soloed) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.solo = !!soloed;
    // When soloing, mute all others
    const anySolo = channels.some(c => c.solo);
    for (const c of channels) {
      c._mutedBySolo = anySolo && !c.solo;
    }
  }

  function getEffectiveVolume(channelId) {
    const ch = channelMap[channelId];
    if (!ch) return 0;
    if (ch.mute || ch._mutedBySolo) return 0;
    return ch.volume;
  }

  // ── Sends management ─────────────────────────────────────
  function addSend(channelId, busId, level) {
    const ch = channelMap[channelId];
    if (!ch) return;
    const existing = ch.sends.find(s => s.busId === busId);
    if (existing) { existing.level = level; return; }
    ch.sends.push({ busId, level });
  }

  function removeSend(channelId, busId) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.sends = ch.sends.filter(s => s.busId !== busId);
  }

  function setSendLevel(channelId, busId, level) {
    const ch = channelMap[channelId];
    if (!ch) return;
    const send = ch.sends.find(s => s.busId === busId);
    if (send) send.level = Math.max(0, Math.min(1, level));
  }

  // ── Insert effects ────────────────────────────────────────
  function addInsert(channelId, type, params) {
    const ch = channelMap[channelId];
    if (!ch) return;
    ch.inserts.push({ type, params: Object.assign({}, params), enabled: true });
  }

  function removeInsert(channelId, index) {
    const ch = channelMap[channelId];
    if (!ch || index < 0 || index >= ch.inserts.length) return;
    ch.inserts.splice(index, 1);
  }

  function updateInsertParam(channelId, index, key, value) {
    const ch = channelMap[channelId];
    if (!ch || !ch.inserts[index]) return;
    ch.inserts[index].params[key] = value;
  }

  // ── Sidechain ducking (voice ducks music) ────────────────
  const sidechain = {
    active: false,
    sourceCh: 'ch09',   // voice
    targetCh: 'ch01',   // music
    threshold: 0.3,
    ratio: 4,
    attackMs: 20,
    releaseMs: 200,
    currentGain: 1.0,
  };

  function processSidechain(voiceLevel, dt) {
    const sc = sidechain;
    if (!sc.active) return 1.0;
    if (voiceLevel > sc.threshold) {
      const target = 1 - (1 - 1 / sc.ratio) * Math.min(1, (voiceLevel - sc.threshold) / (1 - sc.threshold));
      const alpha = 1 - Math.exp(-dt / (sc.attackMs * 0.001));
      sc.currentGain += (target - sc.currentGain) * alpha;
    } else {
      const alpha = 1 - Math.exp(-dt / (sc.releaseMs * 0.001));
      sc.currentGain += (1.0 - sc.currentGain) * alpha;
    }
    return sc.currentGain;
  }

  function enableSidechain(enabled) { sidechain.active = enabled; }

  // ── Parameter automation (LFO tremolo) ───────────────────
  const automations = [];
  let _autoTime = 0;

  function addLFOAutomation(channelId, param, rate, depth, shape) {
    automations.push({ channelId, param, rate, depth, shape: shape || 'sine', phase: 0, baseValue: null });
  }

  function removeAutomation(channelId, param) {
    const idx = automations.findIndex(a => a.channelId === channelId && a.param === param);
    if (idx >= 0) automations.splice(idx, 1);
  }

  function tickAutomations(dt) {
    _autoTime += dt;
    for (const auto of automations) {
      const ch = channelMap[auto.channelId];
      if (!ch) continue;
      if (auto.baseValue === null) auto.baseValue = ch[auto.param] !== undefined ? ch[auto.param] : 1;
      auto.phase += auto.rate * dt * Math.PI * 2;
      let lfo = 0;
      if (auto.shape === 'sine')     lfo = Math.sin(auto.phase);
      else if (auto.shape === 'tri') lfo = 2 * Math.abs((auto.phase / Math.PI) % 2 - 1) - 1;
      else if (auto.shape === 'saw') lfo = ((auto.phase / Math.PI) % 2) - 1;
      else if (auto.shape === 'sqr') lfo = Math.sin(auto.phase) >= 0 ? 1 : -1;
      if (auto.param === 'volume') {
        ch.volume = Math.max(0, auto.baseValue + lfo * auto.depth);
      } else if (auto.param === 'pan') {
        ch.pan = Math.max(-1, Math.min(1, auto.baseValue + lfo * auto.depth));
      }
    }
  }

  // ── Master dynamic range control ──────────────────────────
  const masterCompressor = {
    threshold: -6,
    ratio: 2.5,
    knee: 4,
    attack: 10,
    release: 80,
    makeupGain: 1.2,
    currentGain: 1.0,
  };

  function processMasterCompressor(inputLevel, dt) {
    const mc = masterCompressor;
    const dbIn = 20 * Math.log10(Math.max(1e-6, inputLevel));
    let dbOut = dbIn;
    if (dbIn > mc.threshold - mc.knee / 2) {
      if (dbIn < mc.threshold + mc.knee / 2) {
        const x = (dbIn - (mc.threshold - mc.knee / 2)) / mc.knee;
        dbOut = dbIn + (1 / mc.ratio - 1) * x * x * mc.knee / 2;
      } else {
        dbOut = mc.threshold + (dbIn - mc.threshold) / mc.ratio;
      }
    }
    const targetGain = Math.pow(10, (dbOut - dbIn + 20 * Math.log10(mc.makeupGain)) / 20);
    const tc = dbIn > (mc.threshold - mc.knee / 2) ? mc.attack : mc.release;
    const alpha = 1 - Math.exp(-dt / (tc * 0.001));
    mc.currentGain += (targetGain - mc.currentGain) * alpha;
    return mc.currentGain;
  }

  // ── Mix presets ───────────────────────────────────────────
  const MIX_PRESET_SLOTS = 5;
  const mixPresets = new Array(MIX_PRESET_SLOTS).fill(null);
  let activeMixSlot = 0;

  function captureMixPreset(slot, name) {
    if (slot < 0 || slot >= MIX_PRESET_SLOTS) return;
    mixPresets[slot] = {
      name: name || `Preset ${slot + 1}`,
      captured: Date.now(),
      channels: channels.map(ch => ({
        id: ch.id, volume: ch.volume, pan: ch.pan, mute: ch.mute, solo: ch.solo,
        sends: ch.sends.map(s => ({ ...s })),
      })),
    };
  }

  function loadMixPreset(slot) {
    if (slot < 0 || slot >= MIX_PRESET_SLOTS || !mixPresets[slot]) return false;
    activeMixSlot = slot;
    const preset = mixPresets[slot];
    for (const pd of preset.channels) {
      const ch = channelMap[pd.id];
      if (!ch) continue;
      ch.volume = pd.volume;
      ch.pan = pd.pan;
      ch.mute = pd.mute;
      ch.solo = pd.solo;
      ch.sends = pd.sends.map(s => ({ ...s }));
    }
    return true;
  }

  // ── A/B comparison ────────────────────────────────────────
  const abCompare = { slotA: null, slotB: null, active: 'A' };

  function setABSlot(ab, slot) {
    if (ab === 'A') abCompare.slotA = slot;
    else abCompare.slotB = slot;
  }

  function switchAB() {
    const target = abCompare.active === 'A' ? abCompare.slotB : abCompare.slotA;
    if (target !== null) loadMixPreset(target);
    abCompare.active = abCompare.active === 'A' ? 'B' : 'A';
    return abCompare.active;
  }

  // ── Public API ────────────────────────────────────────────
  _init();

  return {
    CHANNEL_GROUPS,
    channels,
    channelMap,
    setVolume, setPan, setMute, setSolo,
    getEffectiveVolume,
    updateMeter, getMeterData,
    addSend, removeSend, setSendLevel,
    addInsert, removeInsert, updateInsertParam,
    enableSidechain, processSidechain,
    addLFOAutomation, removeAutomation, tickAutomations,
    processMasterCompressor,
    masterCompressor,
    captureMixPreset, loadMixPreset,
    mixPresets,
    setABSlot, switchAB,
    abCompare,
    sidechain,
    getChannel: id => channelMap[id] || null,
    getAllChannels: () => channels.slice(),
    resetPeaks: () => { for (const ch of channels) ch.vuPeak = 0; },
  };
})();

// ============================================================
// AUDIO_PROCEDURAL_V2 — Procedurally generated music engine
// ============================================================
const AUDIO_PROCEDURAL_V2 = (() => {
  // ── Scales ────────────────────────────────────────────────
  const SCALES = {
    major:       [0, 2, 4, 5, 7, 9, 11],
    minor:       [0, 2, 3, 5, 7, 8, 10],
    pentatonic:  [0, 2, 4, 7, 9],
    blues:       [0, 3, 5, 6, 7, 10],
    chromatic:   [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    dorian:      [0, 2, 3, 5, 7, 9, 10],
    phrygian:    [0, 1, 3, 5, 7, 8, 10],
    lydian:      [0, 2, 4, 6, 7, 9, 11],
    mixolydian:  [0, 2, 4, 5, 7, 9, 10],
    locrian:     [0, 1, 3, 5, 6, 8, 10],
  };

  // ── Chord progressions ────────────────────────────────────
  const PROGRESSIONS = {
    pop:        [[0,4,7],[5,9,12],[7,11,14],[5,9,12]],   // I-IV-V-IV
    jazz:       [[2,5,9],[7,11,14],[0,4,7],[0,4,7]],      // ii-V-I-I
    pop2:       [[0,4,7],[7,11,14],[9,12,16],[5,9,12]],   // I-V-vi-IV
    blues:      [[0,4,7],[5,9,12],[0,4,7],[7,11,14]],
    tension:    [[0,3,7],[8,11,15],[5,9,12],[7,10,14]],
    ambient:    [[0,7,12],[5,9,14],[3,7,12],[0,5,9]],
    epic:       [[0,4,7],[3,7,10],[5,9,12],[7,11,14]],
    driving:    [[0,4,7],[0,4,7],[5,9,12],[7,11,14]],
  };

  // ── Song structure ────────────────────────────────────────
  const SECTIONS = ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'];

  // ── State ─────────────────────────────────────────────────
  let state = {
    bpm: 120,
    rootNote: 60,     // MIDI C4
    scale: 'major',
    progression: 'pop',
    currentSection: 0,
    currentBeat: 0,
    currentBar: 0,
    beatsPerBar: 4,
    barsPerSection: 8,
    lastBeatTime: 0,
    playing: false,
    tickListeners: [],
    humanizeTiming: true,
    humanizeVelocity: true,
  };

  // ── Melody generator ──────────────────────────────────────
  const melody = {
    notes: [],
    currentIdx: 0,
    lastScaleDegree: 0,
    octave: 0,
  };

  function generateMelodyPhrase(bars, scale, root) {
    const sc = SCALES[scale] || SCALES.major;
    const notes = [];
    const totalBeats = bars * state.beatsPerBar;
    let pos = 0;
    let degree = 0;
    while (pos < totalBeats) {
      // random walk: step ±1 or ±2 scale degrees
      const step = Math.floor(Math.random() * 5) - 2;
      degree = Math.max(0, Math.min(sc.length - 1, degree + step));
      const octShift = Math.random() < 0.15 ? (Math.random() < 0.5 ? 12 : -12) : 0;
      const midi = root + sc[degree] + octShift;
      const dur = [0.5, 1, 1, 1, 2][Math.floor(Math.random() * 5)];
      const vel = 70 + Math.floor(Math.random() * 30);
      const timingJitter = state.humanizeTiming ? (Math.random() - 0.5) * 0.02 : 0;
      const velJitter = state.humanizeVelocity ? Math.floor((Math.random() - 0.5) * 30) : 0;
      notes.push({ beat: pos + timingJitter, midi, dur, velocity: Math.max(20, Math.min(127, vel + velJitter)) });
      pos += dur;
    }
    return notes;
  }

  // ── Drum pattern generator ────────────────────────────────
  const DRUM_INSTRUMENTS = { kick: 36, snare: 38, hihatClosed: 42, hihatOpen: 46, clap: 39, rim: 37 };

  function generateDrumPattern(style) {
    // style: 'basic', 'rock', 'hiphop', 'electronic', 'jazz'
    const patterns = {
      basic: {
        kick:        [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:       [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihatClosed: [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
      },
      rock: {
        kick:        [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0],
        snare:       [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        hihatClosed: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
      },
      hiphop: {
        kick:        [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
        snare:       [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,0],
        hihatClosed: [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,0,1],
      },
      electronic: {
        kick:        [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
        snare:       [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1],
        hihatClosed: [1,1,0,1, 1,1,0,1, 1,1,0,1, 1,1,0,0],
        hihatOpen:   [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,0,1,0],
      },
      jazz: {
        kick:        [1,0,0,0, 0,0,1,0, 0,0,0,0, 0,1,0,0],
        snare:       [0,0,1,0, 0,0,0,1, 0,1,0,0, 0,0,1,0],
        hihatClosed: [1,0,1,0, 0,1,0,1, 1,0,1,0, 0,1,0,0],
      },
    };
    const base = patterns[style] || patterns.basic;
    // Add occasional variation
    const result = {};
    for (const [inst, pat] of Object.entries(base)) {
      result[inst] = pat.map((v, i) => {
        if (v && Math.random() < 0.05) return 0;  // occasional miss
        if (!v && Math.random() < 0.03) return 1; // ghost note
        return v;
      });
    }
    return result;
  }

  // ── Bass line generator ───────────────────────────────────
  function generateBassLine(progression, root, scale) {
    const sc = SCALES[scale] || SCALES.major;
    const bass = [];
    for (let barIdx = 0; barIdx < progression.length; barIdx++) {
      const chord = progression[barIdx];
      const chordRoot = root - 12 + chord[0]; // bass octave
      // Root on beat 1, passing notes on other beats
      bass.push({ beat: barIdx * 4 + 0, midi: chordRoot, dur: 1, velocity: 90 });
      bass.push({ beat: barIdx * 4 + 1, midi: chordRoot + sc[1], dur: 0.5, velocity: 65 });
      bass.push({ beat: barIdx * 4 + 2, midi: chordRoot + chord[1], dur: 1, velocity: 80 });
      const passing = chordRoot + sc[Math.floor(Math.random() * 3)];
      bass.push({ beat: barIdx * 4 + 3, midi: passing, dur: 0.5, velocity: 60 });
    }
    return bass;
  }

  // ── Arpeggio system ───────────────────────────────────────
  const ARPEGGIO_PATTERNS = {
    up:      (notes, step) => notes[step % notes.length],
    down:    (notes, step) => notes[(notes.length - 1) - (step % notes.length)],
    updown:  (notes, step) => {
      const cycle = notes.length * 2 - 2;
      const pos = step % cycle;
      return pos < notes.length ? notes[pos] : notes[cycle - pos];
    },
    random:  (notes) => notes[Math.floor(Math.random() * notes.length)],
    outside: (notes, step) => notes[step % 2 === 0 ? 0 : notes.length - 1],
  };

  function createArpeggio(chord, pattern, rate, octaves) {
    // chord: array of MIDI notes
    // octaves: how many octaves to span
    const expanded = [];
    for (let oct = 0; oct < (octaves || 1); oct++) {
      for (const n of chord) expanded.push(n + oct * 12);
    }
    return { expanded, pattern, rate, step: 0 };
  }

  function tickArpeggio(arp) {
    const fn = ARPEGGIO_PATTERNS[arp.pattern] || ARPEGGIO_PATTERNS.up;
    const note = fn(arp.expanded, arp.step);
    arp.step++;
    return note;
  }

  // ── Additive synthesis descriptors ───────────────────────
  const SYNTH_PATCHES = {
    piano: {
      harmonics: [1, 0.5, 0.25, 0.12, 0.06, 0.03],
      attack: 0.005, decay: 0.3, sustain: 0.3, release: 0.8,
      filterCutoff: 4000, filterResonance: 0.5,
    },
    organ: {
      harmonics: [1, 1, 0.5, 1, 0, 0.25],
      attack: 0.01, decay: 0, sustain: 1, release: 0.05,
      filterCutoff: 8000, filterResonance: 0.3,
    },
    lead: {
      harmonics: [1, 0.8, 0.3, 0.1, 0.05],
      attack: 0.02, decay: 0.1, sustain: 0.8, release: 0.2,
      filterCutoff: 3000, filterResonance: 1.5,
    },
    pad: {
      harmonics: [1, 0.6, 0.4, 0.3, 0.2, 0.1],
      attack: 0.5, decay: 0.2, sustain: 0.9, release: 1.5,
      filterCutoff: 2000, filterResonance: 0.8,
    },
  };

  // ── BPM master clock ──────────────────────────────────────
  function getBeatDuration()   { return 60 / state.bpm; }
  function getBarDuration()    { return getBeatDuration() * state.beatsPerBar; }
  function getCurrentBeatFrac(now) {
    return (now - state.lastBeatTime) / getBeatDuration();
  }

  function tick(now) {
    if (!state.playing) return null;
    const beatDur = getBeatDuration();
    const elapsed = now - state.lastBeatTime;
    if (elapsed < beatDur) return null;
    state.lastBeatTime = now;
    state.currentBeat++;
    if (state.currentBeat >= state.beatsPerBar) {
      state.currentBeat = 0;
      state.currentBar++;
      if (state.currentBar >= state.barsPerSection) {
        state.currentBar = 0;
        state.currentSection = (state.currentSection + 1) % SECTIONS.length;
      }
    }
    const ev = {
      beat: state.currentBeat,
      bar: state.currentBar,
      section: SECTIONS[state.currentSection],
      bpm: state.bpm,
    };
    for (const fn of state.tickListeners) fn(ev);
    return ev;
  }

  function onBeat(fn) { state.tickListeners.push(fn); }
  function offBeat(fn) { state.tickListeners = state.tickListeners.filter(f => f !== fn); }

  function play()  { state.playing = true; state.lastBeatTime = performance.now() / 1000; }
  function stop()  { state.playing = false; }
  function setBPM(bpm) { state.bpm = Math.max(60, Math.min(240, bpm)); }
  function setRootNote(midi) { state.rootNote = midi; }
  function setScale(name) { if (SCALES[name]) state.scale = name; }
  function setProgression(name) { if (PROGRESSIONS[name]) state.progression = name; }

  // Variation seeds — ensure different every run
  let _variationSeed = Math.random() * 10000 | 0;
  function nextVariation() { _variationSeed = (_variationSeed * 1664525 + 1013904223) & 0x7fffffff; return _variationSeed; }

  return {
    SCALES, PROGRESSIONS, SECTIONS, SYNTH_PATCHES,
    ARPEGGIO_PATTERNS, DRUM_INSTRUMENTS,
    state,
    play, stop, tick,
    setBPM, setRootNote, setScale, setProgression,
    onBeat, offBeat,
    getBeatDuration, getBarDuration, getCurrentBeatFrac,
    generateMelodyPhrase, generateDrumPattern, generateBassLine,
    createArpeggio, tickArpeggio,
    nextVariation,
  };
})();

// ============================================================
// AUDIO_SPATIAL_V2 — Extended binaural spatial audio
// ============================================================
const AUDIO_SPATIAL_V2 = (() => {
  // ── HRTF approximation coefficients ──────────────────────
  // Simplified head-related transfer function: ILD + ITD
  function computeITD(azimuth) {
    // Interaural Time Difference in seconds
    const HEAD_RADIUS = 0.0875; // metres
    const SPEED_OF_SOUND = 343;
    const az = azimuth * Math.PI / 180;
    return (HEAD_RADIUS / SPEED_OF_SOUND) * (az + Math.sin(az));
  }

  function computeILD(azimuth, freq) {
    // Interaural Level Difference in dB (simplified)
    const az = Math.abs(azimuth);
    const headShadow = az > 90 ? (az - 90) / 90 : 0;
    const freqFactor = Math.min(1, freq / 2000);
    return headShadow * 10 * freqFactor;
  }

  // ── Distance model ────────────────────────────────────────
  const distanceModel = {
    refDistance: 1,
    maxDistance: 100,
    rolloffFactor: 1,
  };

  function computeGain(distance) {
    const d = Math.max(distanceModel.refDistance, distance);
    return distanceModel.refDistance / (distanceModel.refDistance + distanceModel.rolloffFactor * (d - distanceModel.refDistance));
  }

  function computeLPFreq(distance, maxDist) {
    // High-frequency roll-off with distance
    const t = Math.min(1, distance / maxDist);
    return 20000 * Math.pow(1 - t, 1.5) + 500;
  }

  // ── Air absorption ────────────────────────────────────────
  function computeAirAbsorption(distance, freq) {
    // ISO 9613-1 simplified: α ≈ 0.0004 dB/m per kHz
    const kHz = freq / 1000;
    const dbLoss = 0.0004 * distance * kHz;
    return Math.pow(10, -dbLoss / 20);
  }

  // ── Doppler ───────────────────────────────────────────────
  function computeDopplerPitch(relativeVelocity) {
    const SPEED_OF_SOUND = 343;
    return SPEED_OF_SOUND / (SPEED_OF_SOUND + relativeVelocity);
  }

  // ── Occlusion ─────────────────────────────────────────────
  function computeOcclusion(numWalls, wallAbsorption) {
    // wallAbsorption per wall: 0=no absorption, 1=full
    let gain = 1;
    for (let i = 0; i < numWalls; i++) {
      gain *= (1 - wallAbsorption);
    }
    return gain;
  }

  // ── Environment reverb presets ────────────────────────────
  const ENV_REVERBS = {
    outdoor:  { roomSize: 0.1, decay: 0.3,  density: 0.3, damping: 0.9, wetDry: 0.05 },
    indoor:   { roomSize: 0.5, decay: 1.2,  density: 0.7, damping: 0.5, wetDry: 0.25 },
    cave:     { roomSize: 0.9, decay: 3.5,  density: 0.9, damping: 0.2, wetDry: 0.5  },
    tunnel:   { roomSize: 0.7, decay: 2.0,  density: 0.8, damping: 0.4, wetDry: 0.4  },
    stadium:  { roomSize: 0.95, decay: 4.0, density: 0.6, damping: 0.3, wetDry: 0.35 },
    smallRoom:{ roomSize: 0.3, decay: 0.5,  density: 0.8, damping: 0.7, wetDry: 0.2  },
  };

  // ── Listener state ────────────────────────────────────────
  const listener = {
    x: 0, y: 0, z: 0,
    yaw: 0, pitch: 0,  // degrees
    velocityX: 0, velocityY: 0, velocityZ: 0,
    environment: 'outdoor',
  };

  function updateListener(x, y, z, yaw, pitch, vx, vy, vz, env) {
    listener.x = x; listener.y = y; listener.z = z;
    listener.yaw = yaw || 0; listener.pitch = pitch || 0;
    listener.velocityX = vx || 0; listener.velocityY = vy || 0; listener.velocityZ = vz || 0;
    if (env && ENV_REVERBS[env]) listener.environment = env;
  }

  // ── Sound source ──────────────────────────────────────────
  function createSource(id, x, y, z) {
    return {
      id, x, y, z,
      velocityX: 0, velocityY: 0, velocityZ: 0,
      directivity: 1.0,   // 0=omnidirectional, 1=cardioid
      directivityAngle: 0,
      spread: 0,          // stereo spread 0-1
      occluded: false,
      occlusionAmount: 0,
      numWalls: 0,
    };
  }

  // ── Compute full spatial params for a source ──────────────
  function computeSpatialParams(source) {
    const dx = source.x - listener.x;
    const dy = source.y - listener.y;
    const dz = source.z - listener.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.001;

    // Azimuth relative to listener heading
    const rawAzimuth = Math.atan2(dx, dz) * 180 / Math.PI;
    const azimuth = rawAzimuth - listener.yaw;
    const elevation = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz)) * 180 / Math.PI;

    // Relative velocity (for Doppler)
    const rvx = source.velocityX - listener.velocityX;
    const rvy = source.velocityY - listener.velocityY;
    const rvz = source.velocityZ - listener.velocityZ;
    const ux = dx / distance, uy = dy / distance, uz = dz / distance;
    const relV = rvx * ux + rvy * uy + rvz * uz;

    const gain = computeGain(distance);
    const lpFreq = computeLPFreq(distance, distanceModel.maxDistance);
    const itd = computeITD(azimuth);
    const ild = computeILD(azimuth, 1000);
    const dopplerRatio = computeDopplerPitch(relV);
    const occlusionGain = source.occluded ? computeOcclusion(source.numWalls || 1, 0.4) : 1.0;
    const airFactor = computeAirAbsorption(distance, 8000);
    const envReverb = ENV_REVERBS[listener.environment] || ENV_REVERBS.outdoor;

    // Stereo pan from azimuth
    const normAz = Math.max(-1, Math.min(1, azimuth / 90));
    const panL = Math.cos((normAz + 1) * Math.PI / 4);
    const panR = Math.sin((normAz + 1) * Math.PI / 4);

    return {
      distance, azimuth, elevation,
      gain, lpFreq, itd, ild,
      dopplerRatio, occlusionGain, airFactor,
      panL, panR, spread: source.spread,
      reverb: envReverb,
    };
  }

  // ── Room mode simulation ──────────────────────────────────
  function computeRoomModes(width, height, depth) {
    const SPEED = 343;
    const modes = [];
    for (let nx = 0; nx <= 2; nx++)
    for (let ny = 0; ny <= 2; ny++)
    for (let nz = 0; nz <= 2; nz++) {
      if (nx + ny + nz === 0) continue;
      const freq = SPEED / 2 * Math.sqrt(
        (nx / width) ** 2 + (ny / height) ** 2 + (nz / depth) ** 2
      );
      if (freq < 500) modes.push({ nx, ny, nz, freq: Math.round(freq) });
    }
    return modes.sort((a, b) => a.freq - b.freq);
  }

  // ── Echo time from space size ─────────────────────────────
  function computeEchoTime(spaceSize) {
    // spaceSize in metres
    return (spaceSize * 2) / 343;
  }

  // ── Source spread: widen stereo field ────────────────────
  function applySpread(panL, panR, spread) {
    // spread=0: normal panning; spread=1: full mono/wide
    const mid  = (panL + panR) * 0.5;
    const side = (panR - panL) * 0.5;
    const spreadGain = 1 + spread;
    return {
      l: mid - side * spreadGain,
      r: mid + side * spreadGain,
    };
  }

  // ── Source registry ───────────────────────────────────────
  const sources = new Map();

  function registerSource(id, x, y, z) {
    const src = createSource(id, x, y, z);
    sources.set(id, src);
    return src;
  }

  function updateSource(id, x, y, z, vx, vy, vz) {
    const src = sources.get(id);
    if (!src) return;
    src.x = x; src.y = y; src.z = z;
    src.velocityX = vx || 0; src.velocityY = vy || 0; src.velocityZ = vz || 0;
  }

  function setOcclusion(id, occluded, numWalls) {
    const src = sources.get(id);
    if (!src) return;
    src.occluded = occluded;
    src.numWalls = numWalls || 1;
  }

  function getSpatialParams(id) {
    const src = sources.get(id);
    if (!src) return null;
    return computeSpatialParams(src);
  }

  function removeSource(id) { sources.delete(id); }

  return {
    ENV_REVERBS, listener, distanceModel,
    updateListener,
    registerSource, updateSource, setOcclusion,
    getSpatialParams, removeSource,
    computeITD, computeILD, computeGain, computeLPFreq,
    computeAirAbsorption, computeDopplerPitch, computeOcclusion,
    computeSpatialParams, computeRoomModes, computeEchoTime,
    applySpread,
  };
})();

// ============================================================
// AUDIO_ACCESSIBILITY_V2 — Visual indicators & captions
// ============================================================
const AUDIO_ACCESSIBILITY_V2 = (() => {
  // ── Config ────────────────────────────────────────────────
  const config = {
    monoMode: false,
    highContrastIcons: false,
    screenReaderEnabled: false,
    captionsEnabled: true,
    frequencyRangeLow: 20,
    frequencyRangeHigh: 20000,
    beatFlashEnabled: true,
    dangerFlashEnabled: true,
    collectibleSparkleEnabled: true,
    waveformEnabled: true,
    autoVolumeForAccessibility: false,
  };

  // ── Caption system ────────────────────────────────────────
  const captionQueue = [];
  const captionHistory = [];
  const MAX_CAPTION_HISTORY = 50;

  const CAPTION_TEMPLATES = {
    engine_rev:    () => '[Engine revving]',
    engine_idle:   () => '[Engine idling]',
    crash:         () => '[Crash!]',
    coin_collect:  () => '[Coin collected]',
    fuel_low:      () => '[Low fuel warning]',
    checkpoint:    () => '[Checkpoint]',
    levelup:       () => '[Level up!]',
    explosion:     () => '[Explosion]',
    music_beat:    () => '',     // silent — beats are visual only
    boost:         () => '[Boost activated]',
    flip_land:     () => '[Flip landing]',
    tire_screech:  () => '[Tires screeching]',
    wind:          () => '[Wind]',
    rain:          () => '[Rain]',
    thunder:       () => '[Thunder]',
    victory:       () => '[Victory!]',
    failure:       () => '[Failure]',
  };

  function addCaption(eventType, priority) {
    const fn = CAPTION_TEMPLATES[eventType];
    if (!fn || !config.captionsEnabled) return;
    const text = fn();
    if (!text) return;
    const cap = { text, eventType, timestamp: Date.now(), priority: priority || 0 };
    captionQueue.push(cap);
    captionHistory.push(cap);
    if (captionHistory.length > MAX_CAPTION_HISTORY) captionHistory.shift();
  }

  function getCaptionQueue() {
    const now = Date.now();
    // Remove stale captions (> 2 seconds)
    while (captionQueue.length && (now - captionQueue[0].timestamp) > 2000) captionQueue.shift();
    return captionQueue.slice(-3); // max 3 visible captions
  }

  // ── Custom audio cues ─────────────────────────────────────
  const customCues = new Map();

  function defineCustomCue(name, pitchHz, durationMs, volume) {
    customCues.set(name, { pitchHz: pitchHz || 440, durationMs: durationMs || 200, volume: volume || 0.5 });
  }

  function getCustomCue(name) { return customCues.get(name) || null; }

  // Define some defaults
  defineCustomCue('notification', 880, 150, 0.4);
  defineCustomCue('warning',      440, 300, 0.6);
  defineCustomCue('error',        220, 400, 0.7);
  defineCustomCue('success',     1047, 200, 0.5);

  // ── Visual indicators ─────────────────────────────────────
  const indicators = {
    beatFlash:       { active: false, intensity: 0, decay: 0.9 },
    dangerFlash:     { active: false, intensity: 0, decay: 0.85, color: '#ff0000' },
    collectibleFlash:{ active: false, intensity: 0, decay: 0.92, color: '#ffdd00' },
    waveformData:    new Float32Array(64),
  };

  function triggerBeatFlash(intensity) {
    if (!config.beatFlashEnabled) return;
    indicators.beatFlash.active = true;
    indicators.beatFlash.intensity = Math.max(indicators.beatFlash.intensity, intensity || 1);
  }

  function triggerDangerFlash(intensity) {
    if (!config.dangerFlashEnabled) return;
    indicators.dangerFlash.active = true;
    indicators.dangerFlash.intensity = Math.max(indicators.dangerFlash.intensity, intensity || 1);
    addCaption('crash', 2);
  }

  function triggerCollectibleFlash(intensity) {
    if (!config.collectibleSparkleEnabled) return;
    indicators.collectibleFlash.active = true;
    indicators.collectibleFlash.intensity = Math.max(indicators.collectibleFlash.intensity, intensity || 0.7);
    addCaption('coin_collect', 0);
  }

  function updateWaveform(fftData) {
    // fftData: Float32Array of FFT magnitude data
    if (!config.waveformEnabled) return;
    const step = Math.floor(fftData.length / 64);
    for (let i = 0; i < 64; i++) {
      indicators.waveformData[i] = fftData[i * step] || 0;
    }
  }

  function tickIndicators() {
    for (const key of ['beatFlash', 'dangerFlash', 'collectibleFlash']) {
      const ind = indicators[key];
      ind.intensity *= ind.decay;
      if (ind.intensity < 0.01) { ind.active = false; ind.intensity = 0; }
    }
  }

  function getIndicatorState() {
    return {
      beatFlash:       { ...indicators.beatFlash },
      dangerFlash:     { ...indicators.dangerFlash },
      collectibleFlash:{ ...indicators.collectibleFlash },
      waveform:        Array.from(indicators.waveformData),
    };
  }

  // ── Mono mode ─────────────────────────────────────────────
  function setMonoMode(enabled) { config.monoMode = enabled; }
  function isMonoMode() { return config.monoMode; }

  function processMonoSum(leftSample, rightSample) {
    if (!config.monoMode) return { l: leftSample, r: rightSample };
    const mono = (leftSample + rightSample) * 0.5;
    return { l: mono, r: mono };
  }

  // ── Frequency range limiter ───────────────────────────────
  function setFrequencyRange(low, high) {
    config.frequencyRangeLow  = Math.max(20, low);
    config.frequencyRangeHigh = Math.min(20000, high);
  }

  function getFrequencyRangeFilter() {
    return { low: config.frequencyRangeLow, high: config.frequencyRangeHigh };
  }

  // ── Volume automation for accessibility ───────────────────
  const autoVolume = { enabled: false, targetDb: -12, currentGain: 1.0, attackMs: 100, releaseMs: 300 };

  function processAutoVolume(inputRms, dt) {
    if (!autoVolume.enabled) return 1.0;
    const targetLinear = Math.pow(10, autoVolume.targetDb / 20);
    const diff = targetLinear - inputRms;
    const tc = diff > 0 ? autoVolume.releaseMs : autoVolume.attackMs;
    const alpha = 1 - Math.exp(-dt / (tc * 0.001));
    const targetGain = inputRms > 0 ? targetLinear / inputRms : 1;
    autoVolume.currentGain += (Math.max(0.1, Math.min(4, targetGain)) - autoVolume.currentGain) * alpha;
    return autoVolume.currentGain;
  }

  // ── Screen reader descriptions ────────────────────────────
  const screenReaderQueue = [];

  function announceToScreenReader(message, priority) {
    if (!config.screenReaderEnabled) return;
    screenReaderQueue.push({ message, priority: priority || 0, time: Date.now() });
    screenReaderQueue.sort((a, b) => b.priority - a.priority);
    if (screenReaderQueue.length > 10) screenReaderQueue.splice(10);
  }

  function getNextScreenReaderMessage() {
    return screenReaderQueue.shift() || null;
  }

  // ── High-contrast icon definitions ───────────────────────
  const ICONS = {
    volume_high:  { symbol: '🔊', highContrast: '[VOL+]' },
    volume_low:   { symbol: '🔉', highContrast: '[VOL-]' },
    mute:         { symbol: '🔇', highContrast: '[MUTE]' },
    music:        { symbol: '🎵', highContrast: '[MUS]'  },
    sfx:          { symbol: '💥', highContrast: '[SFX]'  },
    warning:      { symbol: '⚠️', highContrast: '[WARN]' },
  };

  function getIcon(name) {
    const ic = ICONS[name];
    if (!ic) return name;
    return config.highContrastIcons ? ic.highContrast : ic.symbol;
  }

  return {
    config,
    setMonoMode, isMonoMode, processMonoSum,
    setFrequencyRange, getFrequencyRangeFilter,
    addCaption, getCaptionQueue, captionHistory,
    defineCustomCue, getCustomCue,
    triggerBeatFlash, triggerDangerFlash, triggerCollectibleFlash,
    updateWaveform, tickIndicators, getIndicatorState,
    processAutoVolume, autoVolume,
    announceToScreenReader, getNextScreenReaderMessage,
    getIcon, ICONS,
    CAPTION_TEMPLATES,
  };
})();

;(function() {
  'use strict';
  var AUDIO_CONTENT_LIBRARY = {
    SOUND_EFFECTS: [{"id":"sfx_001","name":"Engine Start","duration":0.1,"category":"engine","baseFreq":80,"envelope":{"a":0.01,"d":0.05,"s":0.3,"r":0.1},"synthesis":{"type":"oscillator","frequency":80,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_002","name":"Engine Idle","duration":0.25,"category":"crash","baseFreq":97,"envelope":{"a":0.03,"d":0.1,"s":0.4,"r":0.18},"synthesis":{"type":"noise","frequency":97,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":213,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_003","name":"Engine Rev Low","duration":0.4,"category":"ui","baseFreq":114,"envelope":{"a":0.05,"d":0.15,"s":0.5,"r":0.26},"synthesis":{"type":"sample","frequency":114,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":226,"q":1.1},{"type":"lowpass","freq":252,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_004","name":"Engine Rev High","duration":0.55,"category":"ambient","baseFreq":131,"envelope":{"a":0.07,"d":0.2,"s":0.6,"r":0.34},"synthesis":{"type":"oscillator","frequency":131,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_005","name":"Engine Rev Max","duration":0.7,"category":"reward","baseFreq":148,"envelope":{"a":0.09,"d":0.25,"s":0.7,"r":0.42},"synthesis":{"type":"noise","frequency":148,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":252,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_006","name":"Engine Sputter","duration":0.85,"category":"voice","baseFreq":165,"envelope":{"a":0.11,"d":0.3,"s":0.8,"r":0.5},"synthesis":{"type":"sample","frequency":165,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":265,"q":2.0},{"type":"notch","freq":330,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_007","name":"Engine Backfire","duration":1.0,"category":"vehicle","baseFreq":182,"envelope":{"a":0.13,"d":0.35,"s":0.9,"r":0.1},"synthesis":{"type":"oscillator","frequency":182,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_008","name":"Engine Shutdown","duration":1.15,"category":"weapon","baseFreq":199,"envelope":{"a":0.15,"d":0.4,"s":0.3,"r":0.18},"synthesis":{"type":"noise","frequency":199,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":291,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_009","name":"Engine Stall","duration":1.3,"category":"environment","baseFreq":216,"envelope":{"a":0.17,"d":0.05,"s":0.4,"r":0.26},"synthesis":{"type":"sample","frequency":216,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":304,"q":0.5},{"type":"bandpass","freq":408,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_010","name":"Engine Turbo","duration":1.45,"category":"engine","baseFreq":233,"envelope":{"a":0.19,"d":0.1,"s":0.5,"r":0.34},"synthesis":{"type":"oscillator","frequency":233,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_011","name":"Tire Screech","duration":1.6,"category":"crash","baseFreq":250,"envelope":{"a":0.01,"d":0.15,"s":0.6,"r":0.42},"synthesis":{"type":"noise","frequency":250,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":330,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_012","name":"Tire Squeal","duration":1.75,"category":"ui","baseFreq":267,"envelope":{"a":0.03,"d":0.2,"s":0.7,"r":0.5},"synthesis":{"type":"sample","frequency":267,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":343,"q":1.4},{"type":"highpass","freq":486,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_013","name":"Tire Skid","duration":1.9,"category":"ambient","baseFreq":284,"envelope":{"a":0.05,"d":0.25,"s":0.8,"r":0.1},"synthesis":{"type":"oscillator","frequency":284,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_014","name":"Tire Burnout","duration":2.05,"category":"reward","baseFreq":301,"envelope":{"a":0.07,"d":0.3,"s":0.9,"r":0.18},"synthesis":{"type":"noise","frequency":301,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":369,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_015","name":"Tire Pop","duration":2.2,"category":"voice","baseFreq":318,"envelope":{"a":0.09,"d":0.35,"s":0.3,"r":0.26},"synthesis":{"type":"sample","frequency":318,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":382,"q":2.3},{"type":"lowpass","freq":564,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_016","name":"Crash Light","duration":2.35,"category":"vehicle","baseFreq":335,"envelope":{"a":0.11,"d":0.4,"s":0.4,"r":0.34},"synthesis":{"type":"oscillator","frequency":335,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_017","name":"Crash Heavy","duration":2.5,"category":"weapon","baseFreq":352,"envelope":{"a":0.13,"d":0.05,"s":0.5,"r":0.42},"synthesis":{"type":"noise","frequency":352,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":408,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_018","name":"Crash Metal","duration":2.65,"category":"environment","baseFreq":369,"envelope":{"a":0.15,"d":0.1,"s":0.6,"r":0.5},"synthesis":{"type":"sample","frequency":369,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":421,"q":0.8},{"type":"notch","freq":642,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_019","name":"Crash Glass","duration":2.8,"category":"engine","baseFreq":386,"envelope":{"a":0.17,"d":0.15,"s":0.7,"r":0.1},"synthesis":{"type":"oscillator","frequency":386,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_020","name":"Crash Explosion","duration":2.95,"category":"crash","baseFreq":403,"envelope":{"a":0.19,"d":0.2,"s":0.8,"r":0.18},"synthesis":{"type":"noise","frequency":403,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":447,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_021","name":"Jump Launch","duration":3.1,"category":"ui","baseFreq":420,"envelope":{"a":0.01,"d":0.25,"s":0.9,"r":0.26},"synthesis":{"type":"sample","frequency":420,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":460,"q":1.7},{"type":"bandpass","freq":720,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_022","name":"Jump Peak","duration":3.25,"category":"ambient","baseFreq":437,"envelope":{"a":0.03,"d":0.3,"s":0.3,"r":0.34},"synthesis":{"type":"oscillator","frequency":437,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_023","name":"Jump Land","duration":3.4,"category":"reward","baseFreq":454,"envelope":{"a":0.05,"d":0.35,"s":0.4,"r":0.42},"synthesis":{"type":"noise","frequency":454,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":486,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_024","name":"Jump Double","duration":3.55,"category":"voice","baseFreq":471,"envelope":{"a":0.07,"d":0.4,"s":0.5,"r":0.5},"synthesis":{"type":"sample","frequency":471,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":499,"q":2.6},{"type":"highpass","freq":798,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_025","name":"Jump Boost","duration":3.7,"category":"vehicle","baseFreq":488,"envelope":{"a":0.09,"d":0.05,"s":0.6,"r":0.1},"synthesis":{"type":"oscillator","frequency":488,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_026","name":"Coin Pickup","duration":3.85,"category":"weapon","baseFreq":505,"envelope":{"a":0.11,"d":0.1,"s":0.7,"r":0.18},"synthesis":{"type":"noise","frequency":505,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":525,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_027","name":"Gem Collect","duration":4.0,"category":"environment","baseFreq":522,"envelope":{"a":0.13,"d":0.15,"s":0.8,"r":0.26},"synthesis":{"type":"sample","frequency":522,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":538,"q":1.1},{"type":"lowpass","freq":876,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_028","name":"Star Grab","duration":4.15,"category":"engine","baseFreq":539,"envelope":{"a":0.15,"d":0.2,"s":0.9,"r":0.34},"synthesis":{"type":"oscillator","frequency":539,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_029","name":"Nitro Pickup","duration":4.3,"category":"crash","baseFreq":556,"envelope":{"a":0.17,"d":0.25,"s":0.3,"r":0.42},"synthesis":{"type":"noise","frequency":556,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":564,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_030","name":"Shield Pickup","duration":4.45,"category":"ui","baseFreq":573,"envelope":{"a":0.19,"d":0.3,"s":0.4,"r":0.5},"synthesis":{"type":"sample","frequency":573,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":577,"q":2.0},{"type":"notch","freq":954,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_031","name":"Level Up","duration":4.6,"category":"ambient","baseFreq":590,"envelope":{"a":0.01,"d":0.35,"s":0.5,"r":0.1},"synthesis":{"type":"oscillator","frequency":590,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_032","name":"Achievement Unlock","duration":4.75,"category":"reward","baseFreq":607,"envelope":{"a":0.03,"d":0.4,"s":0.6,"r":0.18},"synthesis":{"type":"noise","frequency":607,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":603,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_033","name":"High Score","duration":4.9,"category":"voice","baseFreq":624,"envelope":{"a":0.05,"d":0.05,"s":0.7,"r":0.26},"synthesis":{"type":"sample","frequency":624,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":616,"q":0.5},{"type":"bandpass","freq":1032,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_034","name":"Perfect Lap","duration":5.05,"category":"vehicle","baseFreq":641,"envelope":{"a":0.07,"d":0.1,"s":0.8,"r":0.34},"synthesis":{"type":"oscillator","frequency":641,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_035","name":"Race Win","duration":5.2,"category":"weapon","baseFreq":658,"envelope":{"a":0.09,"d":0.15,"s":0.9,"r":0.42},"synthesis":{"type":"noise","frequency":658,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":642,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_036","name":"Button Click","duration":5.35,"category":"environment","baseFreq":675,"envelope":{"a":0.11,"d":0.2,"s":0.3,"r":0.5},"synthesis":{"type":"sample","frequency":675,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":655,"q":1.4},{"type":"highpass","freq":1110,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_037","name":"Button Hover","duration":5.5,"category":"engine","baseFreq":692,"envelope":{"a":0.13,"d":0.25,"s":0.4,"r":0.1},"synthesis":{"type":"oscillator","frequency":692,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_038","name":"Menu Open","duration":5.65,"category":"crash","baseFreq":709,"envelope":{"a":0.15,"d":0.3,"s":0.5,"r":0.18},"synthesis":{"type":"noise","frequency":709,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":681,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_039","name":"Menu Close","duration":5.8,"category":"ui","baseFreq":726,"envelope":{"a":0.17,"d":0.35,"s":0.6,"r":0.26},"synthesis":{"type":"sample","frequency":726,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":694,"q":2.3},{"type":"lowpass","freq":1188,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_040","name":"Menu Select","duration":5.95,"category":"ambient","baseFreq":743,"envelope":{"a":0.19,"d":0.4,"s":0.7,"r":0.34},"synthesis":{"type":"oscillator","frequency":743,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_041","name":"Race Start Countdown","duration":6.1,"category":"reward","baseFreq":760,"envelope":{"a":0.01,"d":0.05,"s":0.8,"r":0.42},"synthesis":{"type":"noise","frequency":760,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":720,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_042","name":"Race Finish","duration":6.25,"category":"voice","baseFreq":777,"envelope":{"a":0.03,"d":0.1,"s":0.9,"r":0.5},"synthesis":{"type":"sample","frequency":777,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":733,"q":0.8},{"type":"notch","freq":1266,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_043","name":"Race Start","duration":6.4,"category":"vehicle","baseFreq":794,"envelope":{"a":0.05,"d":0.15,"s":0.3,"r":0.1},"synthesis":{"type":"oscillator","frequency":794,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_044","name":"Lap Complete","duration":6.55,"category":"weapon","baseFreq":811,"envelope":{"a":0.07,"d":0.2,"s":0.4,"r":0.18},"synthesis":{"type":"noise","frequency":811,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":759,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_045","name":"Checkpoint Pass","duration":6.7,"category":"environment","baseFreq":828,"envelope":{"a":0.09,"d":0.25,"s":0.5,"r":0.26},"synthesis":{"type":"sample","frequency":828,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":772,"q":1.7},{"type":"bandpass","freq":1344,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_046","name":"Crowd Cheer","duration":6.85,"category":"engine","baseFreq":845,"envelope":{"a":0.11,"d":0.3,"s":0.6,"r":0.34},"synthesis":{"type":"oscillator","frequency":845,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_047","name":"Crowd Groan","duration":7.0,"category":"crash","baseFreq":862,"envelope":{"a":0.13,"d":0.35,"s":0.7,"r":0.42},"synthesis":{"type":"noise","frequency":862,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":798,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_048","name":"Crowd Gasp","duration":7.15,"category":"ui","baseFreq":879,"envelope":{"a":0.15,"d":0.4,"s":0.8,"r":0.5},"synthesis":{"type":"sample","frequency":879,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":811,"q":2.6},{"type":"highpass","freq":1422,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_049","name":"Crowd Roar","duration":7.3,"category":"ambient","baseFreq":96,"envelope":{"a":0.17,"d":0.05,"s":0.9,"r":0.1},"synthesis":{"type":"oscillator","frequency":96,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_050","name":"Crowd Applause","duration":7.45,"category":"reward","baseFreq":113,"envelope":{"a":0.19,"d":0.1,"s":0.3,"r":0.18},"synthesis":{"type":"noise","frequency":113,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":837,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_051","name":"Wind Whoosh","duration":0.1,"category":"voice","baseFreq":130,"envelope":{"a":0.01,"d":0.15,"s":0.4,"r":0.26},"synthesis":{"type":"sample","frequency":130,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":850,"q":1.1},{"type":"lowpass","freq":1500,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_052","name":"Wind Howl","duration":0.25,"category":"vehicle","baseFreq":147,"envelope":{"a":0.03,"d":0.2,"s":0.5,"r":0.34},"synthesis":{"type":"oscillator","frequency":147,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_053","name":"Wind Gust","duration":0.4,"category":"weapon","baseFreq":164,"envelope":{"a":0.05,"d":0.25,"s":0.6,"r":0.42},"synthesis":{"type":"noise","frequency":164,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":876,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_054","name":"Rain Drops","duration":0.55,"category":"environment","baseFreq":181,"envelope":{"a":0.07,"d":0.3,"s":0.7,"r":0.5},"synthesis":{"type":"sample","frequency":181,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":889,"q":2.0},{"type":"notch","freq":1578,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_055","name":"Rain Heavy","duration":0.7,"category":"engine","baseFreq":198,"envelope":{"a":0.09,"d":0.35,"s":0.8,"r":0.1},"synthesis":{"type":"oscillator","frequency":198,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_056","name":"Thunder Crack","duration":0.85,"category":"crash","baseFreq":215,"envelope":{"a":0.11,"d":0.4,"s":0.9,"r":0.18},"synthesis":{"type":"noise","frequency":215,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":915,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_057","name":"Thunder Roll","duration":1.0,"category":"ui","baseFreq":232,"envelope":{"a":0.13,"d":0.05,"s":0.3,"r":0.26},"synthesis":{"type":"sample","frequency":232,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":928,"q":0.5},{"type":"bandpass","freq":1656,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_058","name":"Thunder Boom","duration":1.15,"category":"ambient","baseFreq":249,"envelope":{"a":0.15,"d":0.1,"s":0.4,"r":0.34},"synthesis":{"type":"oscillator","frequency":249,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_059","name":"Lightning Strike","duration":1.3,"category":"reward","baseFreq":266,"envelope":{"a":0.17,"d":0.15,"s":0.5,"r":0.42},"synthesis":{"type":"noise","frequency":266,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":954,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_060","name":"Storm Begin","duration":1.45,"category":"voice","baseFreq":283,"envelope":{"a":0.19,"d":0.2,"s":0.6,"r":0.5},"synthesis":{"type":"sample","frequency":283,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":967,"q":1.4},{"type":"highpass","freq":1734,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_061","name":"Bird Tweet","duration":1.6,"category":"vehicle","baseFreq":300,"envelope":{"a":0.01,"d":0.25,"s":0.7,"r":0.1},"synthesis":{"type":"oscillator","frequency":300,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_062","name":"Bird Chirp","duration":1.75,"category":"weapon","baseFreq":317,"envelope":{"a":0.03,"d":0.3,"s":0.8,"r":0.18},"synthesis":{"type":"noise","frequency":317,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":993,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_063","name":"Bird Flap","duration":1.9,"category":"environment","baseFreq":334,"envelope":{"a":0.05,"d":0.35,"s":0.9,"r":0.26},"synthesis":{"type":"sample","frequency":334,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1006,"q":2.3},{"type":"lowpass","freq":1812,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_064","name":"Leaves Rustle","duration":2.05,"category":"engine","baseFreq":351,"envelope":{"a":0.07,"d":0.4,"s":0.3,"r":0.34},"synthesis":{"type":"oscillator","frequency":351,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_065","name":"Branch Snap","duration":2.2,"category":"crash","baseFreq":368,"envelope":{"a":0.09,"d":0.05,"s":0.4,"r":0.42},"synthesis":{"type":"noise","frequency":368,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1032,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_066","name":"Nitro Boost","duration":2.35,"category":"ui","baseFreq":385,"envelope":{"a":0.11,"d":0.1,"s":0.5,"r":0.5},"synthesis":{"type":"sample","frequency":385,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1045,"q":0.8},{"type":"notch","freq":1890,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_067","name":"Boost Activate","duration":2.5,"category":"ambient","baseFreq":402,"envelope":{"a":0.13,"d":0.15,"s":0.6,"r":0.1},"synthesis":{"type":"oscillator","frequency":402,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_068","name":"Speed Surge","duration":2.65,"category":"reward","baseFreq":419,"envelope":{"a":0.15,"d":0.2,"s":0.7,"r":0.18},"synthesis":{"type":"noise","frequency":419,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1071,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_069","name":"Turbo Engage","duration":2.8,"category":"voice","baseFreq":436,"envelope":{"a":0.17,"d":0.25,"s":0.8,"r":0.26},"synthesis":{"type":"sample","frequency":436,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1084,"q":1.7},{"type":"bandpass","freq":1968,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_070","name":"Afterburner","duration":2.95,"category":"vehicle","baseFreq":453,"envelope":{"a":0.19,"d":0.3,"s":0.9,"r":0.34},"synthesis":{"type":"oscillator","frequency":453,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_071","name":"Shield Hit","duration":3.1,"category":"weapon","baseFreq":470,"envelope":{"a":0.01,"d":0.35,"s":0.3,"r":0.42},"synthesis":{"type":"noise","frequency":470,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1110,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_072","name":"Shield Break","duration":3.25,"category":"environment","baseFreq":487,"envelope":{"a":0.03,"d":0.4,"s":0.4,"r":0.5},"synthesis":{"type":"sample","frequency":487,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1123,"q":2.6},{"type":"highpass","freq":2046,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_073","name":"Shield Activate","duration":3.4,"category":"engine","baseFreq":504,"envelope":{"a":0.05,"d":0.05,"s":0.5,"r":0.1},"synthesis":{"type":"oscillator","frequency":504,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_074","name":"Armor Clank","duration":3.55,"category":"crash","baseFreq":521,"envelope":{"a":0.07,"d":0.1,"s":0.6,"r":0.18},"synthesis":{"type":"noise","frequency":521,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1149,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_075","name":"Bumper Bounce","duration":3.7,"category":"ui","baseFreq":538,"envelope":{"a":0.09,"d":0.15,"s":0.7,"r":0.26},"synthesis":{"type":"sample","frequency":538,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1162,"q":1.1},{"type":"lowpass","freq":2124,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_076","name":"Flip Success","duration":3.85,"category":"ambient","baseFreq":555,"envelope":{"a":0.11,"d":0.2,"s":0.8,"r":0.34},"synthesis":{"type":"oscillator","frequency":555,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_077","name":"Flip Fail","duration":4.0,"category":"reward","baseFreq":572,"envelope":{"a":0.13,"d":0.25,"s":0.9,"r":0.42},"synthesis":{"type":"noise","frequency":572,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1188,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_078","name":"Spin Out","duration":4.15,"category":"voice","baseFreq":589,"envelope":{"a":0.15,"d":0.3,"s":0.3,"r":0.5},"synthesis":{"type":"sample","frequency":589,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1201,"q":2.0},{"type":"notch","freq":2202,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_079","name":"Barrel Roll","duration":4.3,"category":"vehicle","baseFreq":606,"envelope":{"a":0.17,"d":0.35,"s":0.4,"r":0.1},"synthesis":{"type":"oscillator","frequency":606,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_080","name":"Loop Complete","duration":4.45,"category":"weapon","baseFreq":623,"envelope":{"a":0.19,"d":0.4,"s":0.5,"r":0.18},"synthesis":{"type":"noise","frequency":623,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1227,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_081","name":"Coin Shower","duration":4.6,"category":"environment","baseFreq":640,"envelope":{"a":0.01,"d":0.05,"s":0.6,"r":0.26},"synthesis":{"type":"sample","frequency":640,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1240,"q":0.5},{"type":"bandpass","freq":2280,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_082","name":"Gem Burst","duration":4.75,"category":"engine","baseFreq":657,"envelope":{"a":0.03,"d":0.1,"s":0.7,"r":0.34},"synthesis":{"type":"oscillator","frequency":657,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_083","name":"Reward Fanfare","duration":4.9,"category":"crash","baseFreq":674,"envelope":{"a":0.05,"d":0.15,"s":0.8,"r":0.42},"synthesis":{"type":"noise","frequency":674,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1266,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_084","name":"Victory Jingle","duration":5.05,"category":"ui","baseFreq":691,"envelope":{"a":0.07,"d":0.2,"s":0.9,"r":0.5},"synthesis":{"type":"sample","frequency":691,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1279,"q":1.4},{"type":"highpass","freq":2358,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_085","name":"Bonus Collect","duration":5.2,"category":"ambient","baseFreq":708,"envelope":{"a":0.09,"d":0.25,"s":0.3,"r":0.1},"synthesis":{"type":"oscillator","frequency":708,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_086","name":"UI Whoosh","duration":5.35,"category":"reward","baseFreq":725,"envelope":{"a":0.11,"d":0.3,"s":0.4,"r":0.18},"synthesis":{"type":"noise","frequency":725,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1305,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_087","name":"UI Ping","duration":5.5,"category":"voice","baseFreq":742,"envelope":{"a":0.13,"d":0.35,"s":0.5,"r":0.26},"synthesis":{"type":"sample","frequency":742,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1318,"q":2.3},{"type":"lowpass","freq":2436,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_088","name":"UI Error","duration":5.65,"category":"vehicle","baseFreq":759,"envelope":{"a":0.15,"d":0.4,"s":0.6,"r":0.34},"synthesis":{"type":"oscillator","frequency":759,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_089","name":"UI Confirm","duration":5.8,"category":"weapon","baseFreq":776,"envelope":{"a":0.17,"d":0.05,"s":0.7,"r":0.42},"synthesis":{"type":"noise","frequency":776,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1344,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_090","name":"UI Cancel","duration":5.95,"category":"environment","baseFreq":793,"envelope":{"a":0.19,"d":0.1,"s":0.8,"r":0.5},"synthesis":{"type":"sample","frequency":793,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1357,"q":0.8},{"type":"notch","freq":2514,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_091","name":"Gear Shift Up","duration":6.1,"category":"engine","baseFreq":810,"envelope":{"a":0.01,"d":0.15,"s":0.9,"r":0.1},"synthesis":{"type":"oscillator","frequency":810,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_092","name":"Gear Shift Down","duration":6.25,"category":"crash","baseFreq":827,"envelope":{"a":0.03,"d":0.2,"s":0.3,"r":0.18},"synthesis":{"type":"noise","frequency":827,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1383,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_093","name":"Clutch Engage","duration":6.4,"category":"ui","baseFreq":844,"envelope":{"a":0.05,"d":0.25,"s":0.4,"r":0.26},"synthesis":{"type":"sample","frequency":844,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1396,"q":1.7},{"type":"bandpass","freq":2592,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_094","name":"Brake Squeal","duration":6.55,"category":"ambient","baseFreq":861,"envelope":{"a":0.07,"d":0.3,"s":0.5,"r":0.34},"synthesis":{"type":"oscillator","frequency":861,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_095","name":"Handbrake","duration":6.7,"category":"reward","baseFreq":878,"envelope":{"a":0.09,"d":0.35,"s":0.6,"r":0.42},"synthesis":{"type":"noise","frequency":878,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1422,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_096","name":"Horn Beep","duration":6.85,"category":"voice","baseFreq":95,"envelope":{"a":0.11,"d":0.4,"s":0.7,"r":0.5},"synthesis":{"type":"sample","frequency":95,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1435,"q":2.6},{"type":"highpass","freq":2670,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_097","name":"Horn Long","duration":7.0,"category":"vehicle","baseFreq":112,"envelope":{"a":0.13,"d":0.05,"s":0.8,"r":0.1},"synthesis":{"type":"oscillator","frequency":112,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_098","name":"Siren Wail","duration":7.15,"category":"weapon","baseFreq":129,"envelope":{"a":0.15,"d":0.1,"s":0.9,"r":0.18},"synthesis":{"type":"noise","frequency":129,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1461,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_099","name":"Siren Short","duration":7.3,"category":"environment","baseFreq":146,"envelope":{"a":0.17,"d":0.15,"s":0.3,"r":0.26},"synthesis":{"type":"sample","frequency":146,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1474,"q":1.1},{"type":"lowpass","freq":2748,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_100","name":"Alarm Buzz","duration":7.45,"category":"engine","baseFreq":163,"envelope":{"a":0.19,"d":0.2,"s":0.4,"r":0.34},"synthesis":{"type":"oscillator","frequency":163,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_101","name":"Suspension Bounce","duration":0.1,"category":"crash","baseFreq":180,"envelope":{"a":0.01,"d":0.25,"s":0.5,"r":0.42},"synthesis":{"type":"noise","frequency":180,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1500,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_102","name":"Suspension Creak","duration":0.25,"category":"ui","baseFreq":197,"envelope":{"a":0.03,"d":0.3,"s":0.6,"r":0.5},"synthesis":{"type":"sample","frequency":197,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1513,"q":2.0},{"type":"notch","freq":2826,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_103","name":"Axle Grind","duration":0.4,"category":"ambient","baseFreq":214,"envelope":{"a":0.05,"d":0.35,"s":0.7,"r":0.1},"synthesis":{"type":"oscillator","frequency":214,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_104","name":"Wheel Clunk","duration":0.55,"category":"reward","baseFreq":231,"envelope":{"a":0.07,"d":0.4,"s":0.8,"r":0.18},"synthesis":{"type":"noise","frequency":231,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1539,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_105","name":"Chassis Rattle","duration":0.7,"category":"voice","baseFreq":248,"envelope":{"a":0.09,"d":0.05,"s":0.9,"r":0.26},"synthesis":{"type":"sample","frequency":248,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1552,"q":0.5},{"type":"bandpass","freq":2904,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_106","name":"Water Splash","duration":0.85,"category":"vehicle","baseFreq":265,"envelope":{"a":0.11,"d":0.1,"s":0.3,"r":0.34},"synthesis":{"type":"oscillator","frequency":265,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_107","name":"Water Ripple","duration":1.0,"category":"weapon","baseFreq":282,"envelope":{"a":0.13,"d":0.15,"s":0.4,"r":0.42},"synthesis":{"type":"noise","frequency":282,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1578,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_108","name":"Puddle Hit","duration":1.15,"category":"environment","baseFreq":299,"envelope":{"a":0.15,"d":0.2,"s":0.5,"r":0.5},"synthesis":{"type":"sample","frequency":299,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1591,"q":1.4},{"type":"highpass","freq":2982,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_109","name":"River Flow","duration":1.3,"category":"engine","baseFreq":316,"envelope":{"a":0.17,"d":0.25,"s":0.6,"r":0.1},"synthesis":{"type":"oscillator","frequency":316,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_110","name":"Wave Crash","duration":1.45,"category":"crash","baseFreq":333,"envelope":{"a":0.19,"d":0.3,"s":0.7,"r":0.18},"synthesis":{"type":"noise","frequency":333,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1617,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_111","name":"Sand Scrape","duration":1.6,"category":"ui","baseFreq":350,"envelope":{"a":0.01,"d":0.35,"s":0.8,"r":0.26},"synthesis":{"type":"sample","frequency":350,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1630,"q":2.3},{"type":"lowpass","freq":3060,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_112","name":"Gravel Crunch","duration":1.75,"category":"ambient","baseFreq":367,"envelope":{"a":0.03,"d":0.4,"s":0.9,"r":0.34},"synthesis":{"type":"oscillator","frequency":367,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_113","name":"Mud Splat","duration":1.9,"category":"reward","baseFreq":384,"envelope":{"a":0.05,"d":0.05,"s":0.3,"r":0.42},"synthesis":{"type":"noise","frequency":384,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1656,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_114","name":"Ice Crack","duration":2.05,"category":"voice","baseFreq":401,"envelope":{"a":0.07,"d":0.1,"s":0.4,"r":0.5},"synthesis":{"type":"sample","frequency":401,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1669,"q":0.8},{"type":"notch","freq":3138,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_115","name":"Snow Crunch","duration":2.2,"category":"vehicle","baseFreq":418,"envelope":{"a":0.09,"d":0.15,"s":0.5,"r":0.1},"synthesis":{"type":"oscillator","frequency":418,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_116","name":"Rock Hit","duration":2.35,"category":"weapon","baseFreq":435,"envelope":{"a":0.11,"d":0.2,"s":0.6,"r":0.18},"synthesis":{"type":"noise","frequency":435,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1695,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_117","name":"Rock Slide","duration":2.5,"category":"environment","baseFreq":452,"envelope":{"a":0.13,"d":0.25,"s":0.7,"r":0.26},"synthesis":{"type":"sample","frequency":452,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1708,"q":1.7},{"type":"bandpass","freq":3216,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_118","name":"Dirt Spray","duration":2.65,"category":"engine","baseFreq":469,"envelope":{"a":0.15,"d":0.3,"s":0.8,"r":0.34},"synthesis":{"type":"oscillator","frequency":469,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_119","name":"Dust Cloud","duration":2.8,"category":"crash","baseFreq":486,"envelope":{"a":0.17,"d":0.35,"s":0.9,"r":0.42},"synthesis":{"type":"noise","frequency":486,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1734,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_120","name":"Debris Scatter","duration":2.95,"category":"ui","baseFreq":503,"envelope":{"a":0.19,"d":0.4,"s":0.3,"r":0.5},"synthesis":{"type":"sample","frequency":503,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1747,"q":2.6},{"type":"highpass","freq":3294,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_121","name":"Fire Crackle","duration":3.1,"category":"ambient","baseFreq":520,"envelope":{"a":0.01,"d":0.05,"s":0.4,"r":0.1},"synthesis":{"type":"oscillator","frequency":520,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_122","name":"Fire Roar","duration":3.25,"category":"reward","baseFreq":537,"envelope":{"a":0.03,"d":0.1,"s":0.5,"r":0.18},"synthesis":{"type":"noise","frequency":537,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1773,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_123","name":"Explosion Big","duration":3.4,"category":"voice","baseFreq":554,"envelope":{"a":0.05,"d":0.15,"s":0.6,"r":0.26},"synthesis":{"type":"sample","frequency":554,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1786,"q":1.1},{"type":"lowpass","freq":3372,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_124","name":"Explosion Small","duration":3.55,"category":"vehicle","baseFreq":571,"envelope":{"a":0.07,"d":0.2,"s":0.7,"r":0.34},"synthesis":{"type":"oscillator","frequency":571,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_125","name":"Smoke Hiss","duration":3.7,"category":"weapon","baseFreq":588,"envelope":{"a":0.09,"d":0.25,"s":0.8,"r":0.42},"synthesis":{"type":"noise","frequency":588,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":1812,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_126","name":"Crowd Distant","duration":3.85,"category":"environment","baseFreq":605,"envelope":{"a":0.11,"d":0.3,"s":0.9,"r":0.5},"synthesis":{"type":"sample","frequency":605,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1825,"q":2.0},{"type":"notch","freq":3450,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_127","name":"Crowd Near","duration":4.0,"category":"engine","baseFreq":622,"envelope":{"a":0.13,"d":0.35,"s":0.3,"r":0.1},"synthesis":{"type":"oscillator","frequency":622,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_128","name":"Stadium Echo","duration":4.15,"category":"crash","baseFreq":639,"envelope":{"a":0.15,"d":0.4,"s":0.4,"r":0.18},"synthesis":{"type":"noise","frequency":639,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":1851,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_129","name":"PA Announcement","duration":4.3,"category":"ui","baseFreq":656,"envelope":{"a":0.17,"d":0.05,"s":0.5,"r":0.26},"synthesis":{"type":"sample","frequency":656,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1864,"q":0.5},{"type":"bandpass","freq":3528,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_130","name":"Whistle Blow","duration":4.45,"category":"ambient","baseFreq":673,"envelope":{"a":0.19,"d":0.1,"s":0.6,"r":0.34},"synthesis":{"type":"oscillator","frequency":673,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_131","name":"Metal Scrape","duration":4.6,"category":"reward","baseFreq":690,"envelope":{"a":0.01,"d":0.15,"s":0.7,"r":0.42},"synthesis":{"type":"noise","frequency":690,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":1890,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_132","name":"Metal Clang","duration":4.75,"category":"voice","baseFreq":707,"envelope":{"a":0.03,"d":0.2,"s":0.8,"r":0.5},"synthesis":{"type":"sample","frequency":707,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":1903,"q":1.4},{"type":"highpass","freq":3606,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_133","name":"Metal Warp","duration":4.9,"category":"vehicle","baseFreq":724,"envelope":{"a":0.05,"d":0.25,"s":0.9,"r":0.1},"synthesis":{"type":"oscillator","frequency":724,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_134","name":"Metal Rip","duration":5.05,"category":"weapon","baseFreq":741,"envelope":{"a":0.07,"d":0.3,"s":0.3,"r":0.18},"synthesis":{"type":"noise","frequency":741,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":1929,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_135","name":"Metal Groan","duration":5.2,"category":"environment","baseFreq":758,"envelope":{"a":0.09,"d":0.35,"s":0.4,"r":0.26},"synthesis":{"type":"sample","frequency":758,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":1942,"q":2.3},{"type":"lowpass","freq":3684,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_136","name":"Rubber Burn","duration":5.35,"category":"engine","baseFreq":775,"envelope":{"a":0.11,"d":0.4,"s":0.5,"r":0.34},"synthesis":{"type":"oscillator","frequency":775,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_137","name":"Rubber Squeak","duration":5.5,"category":"crash","baseFreq":792,"envelope":{"a":0.13,"d":0.05,"s":0.6,"r":0.42},"synthesis":{"type":"noise","frequency":792,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":1968,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_138","name":"Plastic Crack","duration":5.65,"category":"ui","baseFreq":809,"envelope":{"a":0.15,"d":0.1,"s":0.7,"r":0.5},"synthesis":{"type":"sample","frequency":809,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":1981,"q":0.8},{"type":"notch","freq":3762,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_139","name":"Glass Shatter","duration":5.8,"category":"ambient","baseFreq":826,"envelope":{"a":0.17,"d":0.15,"s":0.8,"r":0.1},"synthesis":{"type":"oscillator","frequency":826,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_140","name":"Wood Splinter","duration":5.95,"category":"reward","baseFreq":843,"envelope":{"a":0.19,"d":0.2,"s":0.9,"r":0.18},"synthesis":{"type":"noise","frequency":843,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":2007,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_141","name":"Computer Beep","duration":6.1,"category":"voice","baseFreq":860,"envelope":{"a":0.01,"d":0.25,"s":0.3,"r":0.26},"synthesis":{"type":"sample","frequency":860,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2020,"q":1.7},{"type":"bandpass","freq":3840,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_142","name":"Digital Blip","duration":6.25,"category":"vehicle","baseFreq":877,"envelope":{"a":0.03,"d":0.3,"s":0.4,"r":0.34},"synthesis":{"type":"oscillator","frequency":877,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_143","name":"Scan Tone","duration":6.4,"category":"weapon","baseFreq":94,"envelope":{"a":0.05,"d":0.35,"s":0.5,"r":0.42},"synthesis":{"type":"noise","frequency":94,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":2046,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_144","name":"Lock On","duration":6.55,"category":"environment","baseFreq":111,"envelope":{"a":0.07,"d":0.4,"s":0.6,"r":0.5},"synthesis":{"type":"sample","frequency":111,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2059,"q":2.6},{"type":"highpass","freq":3918,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_145","name":"Target Acquired","duration":6.7,"category":"engine","baseFreq":128,"envelope":{"a":0.09,"d":0.05,"s":0.7,"r":0.1},"synthesis":{"type":"oscillator","frequency":128,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_146","name":"Mission Start","duration":6.85,"category":"crash","baseFreq":145,"envelope":{"a":0.11,"d":0.1,"s":0.8,"r":0.18},"synthesis":{"type":"noise","frequency":145,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":2085,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_147","name":"Mission Complete","duration":7.0,"category":"ui","baseFreq":162,"envelope":{"a":0.13,"d":0.15,"s":0.9,"r":0.26},"synthesis":{"type":"sample","frequency":162,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":2098,"q":1.1},{"type":"lowpass","freq":3996,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_148","name":"Mission Fail","duration":7.15,"category":"ambient","baseFreq":179,"envelope":{"a":0.15,"d":0.2,"s":0.3,"r":0.34},"synthesis":{"type":"oscillator","frequency":179,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_149","name":"Objective Update","duration":7.3,"category":"reward","baseFreq":196,"envelope":{"a":0.17,"d":0.25,"s":0.4,"r":0.42},"synthesis":{"type":"noise","frequency":196,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2124,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_150","name":"Alert Sound","duration":7.45,"category":"voice","baseFreq":213,"envelope":{"a":0.19,"d":0.3,"s":0.5,"r":0.5},"synthesis":{"type":"sample","frequency":213,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":2137,"q":2.0},{"type":"notch","freq":4074,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_151","name":"Power Up","duration":0.1,"category":"vehicle","baseFreq":230,"envelope":{"a":0.01,"d":0.35,"s":0.6,"r":0.1},"synthesis":{"type":"oscillator","frequency":230,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_152","name":"Power Down","duration":0.25,"category":"weapon","baseFreq":247,"envelope":{"a":0.03,"d":0.4,"s":0.7,"r":0.18},"synthesis":{"type":"noise","frequency":247,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2163,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_153","name":"Energy Drain","duration":0.4,"category":"environment","baseFreq":264,"envelope":{"a":0.05,"d":0.05,"s":0.8,"r":0.26},"synthesis":{"type":"sample","frequency":264,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":2176,"q":0.5},{"type":"bandpass","freq":4152,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_154","name":"Battery Low","duration":0.55,"category":"engine","baseFreq":281,"envelope":{"a":0.07,"d":0.1,"s":0.9,"r":0.34},"synthesis":{"type":"oscillator","frequency":281,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_155","name":"Recharge Complete","duration":0.7,"category":"crash","baseFreq":298,"envelope":{"a":0.09,"d":0.15,"s":0.3,"r":0.42},"synthesis":{"type":"noise","frequency":298,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":2202,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_156","name":"Camera Flash","duration":0.85,"category":"ui","baseFreq":315,"envelope":{"a":0.11,"d":0.2,"s":0.4,"r":0.5},"synthesis":{"type":"sample","frequency":315,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":2215,"q":1.4},{"type":"highpass","freq":230,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_157","name":"Screenshot Click","duration":1.0,"category":"ambient","baseFreq":332,"envelope":{"a":0.13,"d":0.25,"s":0.5,"r":0.1},"synthesis":{"type":"oscillator","frequency":332,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_158","name":"Replay Start","duration":1.15,"category":"reward","baseFreq":349,"envelope":{"a":0.15,"d":0.3,"s":0.6,"r":0.18},"synthesis":{"type":"noise","frequency":349,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":2241,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_159","name":"Slow Motion Begin","duration":1.3,"category":"voice","baseFreq":366,"envelope":{"a":0.17,"d":0.35,"s":0.7,"r":0.26},"synthesis":{"type":"sample","frequency":366,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":2254,"q":2.3},{"type":"lowpass","freq":308,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_160","name":"Slow Motion End","duration":1.45,"category":"vehicle","baseFreq":383,"envelope":{"a":0.19,"d":0.4,"s":0.8,"r":0.34},"synthesis":{"type":"oscillator","frequency":383,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_161","name":"Collectible Appear","duration":1.6,"category":"weapon","baseFreq":400,"envelope":{"a":0.01,"d":0.05,"s":0.9,"r":0.42},"synthesis":{"type":"noise","frequency":400,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":2280,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_162","name":"Collectible Vanish","duration":1.75,"category":"environment","baseFreq":417,"envelope":{"a":0.03,"d":0.1,"s":0.3,"r":0.5},"synthesis":{"type":"sample","frequency":417,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":2293,"q":0.8},{"type":"notch","freq":386,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_163","name":"Hidden Path Open","duration":1.9,"category":"engine","baseFreq":434,"envelope":{"a":0.05,"d":0.15,"s":0.4,"r":0.1},"synthesis":{"type":"oscillator","frequency":434,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_164","name":"Secret Found","duration":2.05,"category":"crash","baseFreq":451,"envelope":{"a":0.07,"d":0.2,"s":0.5,"r":0.18},"synthesis":{"type":"noise","frequency":451,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":2319,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_165","name":"Easter Egg","duration":2.2,"category":"ui","baseFreq":468,"envelope":{"a":0.09,"d":0.25,"s":0.6,"r":0.26},"synthesis":{"type":"sample","frequency":468,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2332,"q":1.7},{"type":"bandpass","freq":464,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_166","name":"Drift Start","duration":2.35,"category":"ambient","baseFreq":485,"envelope":{"a":0.11,"d":0.3,"s":0.7,"r":0.34},"synthesis":{"type":"oscillator","frequency":485,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_167","name":"Drift Continue","duration":2.5,"category":"reward","baseFreq":502,"envelope":{"a":0.13,"d":0.35,"s":0.8,"r":0.42},"synthesis":{"type":"noise","frequency":502,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":2358,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_168","name":"Drift End","duration":2.65,"category":"voice","baseFreq":519,"envelope":{"a":0.15,"d":0.4,"s":0.9,"r":0.5},"synthesis":{"type":"sample","frequency":519,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2371,"q":2.6},{"type":"highpass","freq":542,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_169","name":"Drift Perfect","duration":2.8,"category":"vehicle","baseFreq":536,"envelope":{"a":0.17,"d":0.05,"s":0.3,"r":0.1},"synthesis":{"type":"oscillator","frequency":536,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_170","name":"Drift Chain","duration":2.95,"category":"weapon","baseFreq":553,"envelope":{"a":0.19,"d":0.1,"s":0.4,"r":0.18},"synthesis":{"type":"noise","frequency":553,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":2397,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}},{"id":"sfx_171","name":"Collision Soft","duration":3.1,"category":"environment","baseFreq":570,"envelope":{"a":0.01,"d":0.15,"s":0.5,"r":0.26},"synthesis":{"type":"sample","frequency":570,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":2410,"q":1.1},{"type":"lowpass","freq":620,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_172","name":"Collision Medium","duration":3.25,"category":"engine","baseFreq":587,"envelope":{"a":0.03,"d":0.2,"s":0.6,"r":0.34},"synthesis":{"type":"oscillator","frequency":587,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.13}]}},{"id":"sfx_173","name":"Collision Hard","duration":3.4,"category":"crash","baseFreq":604,"envelope":{"a":0.05,"d":0.25,"s":0.7,"r":0.42},"synthesis":{"type":"noise","frequency":604,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2436,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_174","name":"Side Swipe","duration":3.55,"category":"ui","baseFreq":621,"envelope":{"a":0.07,"d":0.3,"s":0.8,"r":0.5},"synthesis":{"type":"sample","frequency":621,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":2449,"q":2.0},{"type":"notch","freq":698,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.29}]}},{"id":"sfx_175","name":"Rear End","duration":3.7,"category":"ambient","baseFreq":638,"envelope":{"a":0.09,"d":0.35,"s":0.9,"r":0.1},"synthesis":{"type":"oscillator","frequency":638,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_176","name":"Bridge Rumble","duration":3.85,"category":"reward","baseFreq":655,"envelope":{"a":0.11,"d":0.4,"s":0.3,"r":0.18},"synthesis":{"type":"noise","frequency":655,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2475,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.45}]}},{"id":"sfx_177","name":"Tunnel Echo","duration":4.0,"category":"voice","baseFreq":672,"envelope":{"a":0.13,"d":0.05,"s":0.4,"r":0.26},"synthesis":{"type":"sample","frequency":672,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":2488,"q":0.5},{"type":"bandpass","freq":776,"q":0.5}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_178","name":"Underground Hum","duration":4.15,"category":"vehicle","baseFreq":689,"envelope":{"a":0.15,"d":0.1,"s":0.5,"r":0.34},"synthesis":{"type":"oscillator","frequency":689,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":0.8}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.61}]}},{"id":"sfx_179","name":"Highway Wind","duration":4.3,"category":"weapon","baseFreq":706,"envelope":{"a":0.17,"d":0.15,"s":0.6,"r":0.42},"synthesis":{"type":"noise","frequency":706,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":2514,"q":1.1}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_180","name":"City Traffic","duration":4.45,"category":"environment","baseFreq":723,"envelope":{"a":0.19,"d":0.2,"s":0.7,"r":0.5},"synthesis":{"type":"sample","frequency":723,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":2527,"q":1.4},{"type":"highpass","freq":854,"q":1.4}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.77}]}},{"id":"sfx_181","name":"Helicopter Rotor","duration":4.6,"category":"engine","baseFreq":740,"envelope":{"a":0.01,"d":0.25,"s":0.8,"r":0.1},"synthesis":{"type":"oscillator","frequency":740,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":1.7}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_182","name":"Plane Engine","duration":4.75,"category":"crash","baseFreq":757,"envelope":{"a":0.03,"d":0.3,"s":0.9,"r":0.18},"synthesis":{"type":"noise","frequency":757,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":2553,"q":2.0}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.13}]}},{"id":"sfx_183","name":"Jet Flyby","duration":4.9,"category":"ui","baseFreq":774,"envelope":{"a":0.05,"d":0.35,"s":0.3,"r":0.26},"synthesis":{"type":"sample","frequency":774,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":2566,"q":2.3},{"type":"lowpass","freq":932,"q":2.3}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_184","name":"Rocket Launch","duration":5.05,"category":"ambient","baseFreq":791,"envelope":{"a":0.07,"d":0.4,"s":0.4,"r":0.34},"synthesis":{"type":"oscillator","frequency":791,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":2.6}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.29}]}},{"id":"sfx_185","name":"UFO Hum","duration":5.2,"category":"reward","baseFreq":808,"envelope":{"a":0.09,"d":0.05,"s":0.5,"r":0.42},"synthesis":{"type":"noise","frequency":808,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":0.5},{"type":"highpass","freq":2592,"q":0.5}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_186","name":"Ghost Car Appear","duration":5.35,"category":"voice","baseFreq":825,"envelope":{"a":0.11,"d":0.1,"s":0.6,"r":0.5},"synthesis":{"type":"sample","frequency":825,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":2605,"q":0.8},{"type":"notch","freq":1010,"q":0.8}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.45}]}},{"id":"sfx_187","name":"Ghost Car Vanish","duration":5.5,"category":"vehicle","baseFreq":842,"envelope":{"a":0.13,"d":0.15,"s":0.7,"r":0.1},"synthesis":{"type":"oscillator","frequency":842,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":1.1}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_188","name":"Opponent Near","duration":5.65,"category":"weapon","baseFreq":859,"envelope":{"a":0.15,"d":0.2,"s":0.8,"r":0.18},"synthesis":{"type":"noise","frequency":859,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":1.4},{"type":"lowpass","freq":2631,"q":1.4}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.61}]}},{"id":"sfx_189","name":"Opponent Pass","duration":5.8,"category":"environment","baseFreq":876,"envelope":{"a":0.17,"d":0.25,"s":0.9,"r":0.26},"synthesis":{"type":"sample","frequency":876,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2644,"q":1.7},{"type":"bandpass","freq":1088,"q":1.7}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_190","name":"Overtake","duration":5.95,"category":"engine","baseFreq":93,"envelope":{"a":0.19,"d":0.3,"s":0.3,"r":0.34},"synthesis":{"type":"oscillator","frequency":93,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"highpass","freq":200,"q":2.0}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.77}]}},{"id":"sfx_191","name":"Lap Record","duration":6.1,"category":"crash","baseFreq":110,"envelope":{"a":0.01,"d":0.35,"s":0.4,"r":0.42},"synthesis":{"type":"noise","frequency":110,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"bandpass","freq":200,"q":2.3},{"type":"notch","freq":2670,"q":2.3}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_192","name":"Personal Best","duration":6.25,"category":"ui","baseFreq":127,"envelope":{"a":0.03,"d":0.4,"s":0.5,"r":0.5},"synthesis":{"type":"sample","frequency":127,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2683,"q":2.6},{"type":"highpass","freq":1166,"q":2.6}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.13}]}},{"id":"sfx_193","name":"World Record","duration":6.4,"category":"ambient","baseFreq":144,"envelope":{"a":0.05,"d":0.05,"s":0.6,"r":0.1},"synthesis":{"type":"oscillator","frequency":144,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"lowpass","freq":200,"q":0.5}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_194","name":"Leaderboard Update","duration":6.55,"category":"reward","baseFreq":161,"envelope":{"a":0.07,"d":0.1,"s":0.7,"r":0.18},"synthesis":{"type":"noise","frequency":161,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"highpass","freq":200,"q":0.8},{"type":"bandpass","freq":2709,"q":0.8}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.29}]}},{"id":"sfx_195","name":"Rank Up","duration":6.7,"category":"voice","baseFreq":178,"envelope":{"a":0.09,"d":0.15,"s":0.8,"r":0.26},"synthesis":{"type":"sample","frequency":178,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"bandpass","freq":200,"q":1.1},{"type":"notch","freq":2722,"q":1.1},{"type":"lowpass","freq":1244,"q":1.1}],"effects":[{"type":"distortion","wet":0.05}]}},{"id":"sfx_196","name":"Countdown 3","duration":6.85,"category":"vehicle","baseFreq":195,"envelope":{"a":0.11,"d":0.2,"s":0.9,"r":0.34},"synthesis":{"type":"oscillator","frequency":195,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"notch","freq":200,"q":1.4}],"effects":[{"type":"chorus","wet":0.05},{"type":"flanger","wet":0.45}]}},{"id":"sfx_197","name":"Countdown 2","duration":7.0,"category":"weapon","baseFreq":212,"envelope":{"a":0.13,"d":0.25,"s":0.3,"r":0.42},"synthesis":{"type":"noise","frequency":212,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"lowpass","freq":200,"q":1.7},{"type":"highpass","freq":2748,"q":1.7}],"effects":[{"type":"flanger","wet":0.05}]}},{"id":"sfx_198","name":"Countdown 1","duration":7.15,"category":"environment","baseFreq":229,"envelope":{"a":0.15,"d":0.3,"s":0.4,"r":0.5},"synthesis":{"type":"sample","frequency":229,"harmonics":[1.0,0.5,0.33,0.25,0.2],"filters":[{"type":"highpass","freq":200,"q":2.0},{"type":"bandpass","freq":2761,"q":2.0},{"type":"notch","freq":1322,"q":2.0}],"effects":[{"type":"compressor","wet":0.05},{"type":"reverb","wet":0.61}]}},{"id":"sfx_199","name":"Go Signal","duration":7.3,"category":"engine","baseFreq":246,"envelope":{"a":0.17,"d":0.35,"s":0.5,"r":0.1},"synthesis":{"type":"oscillator","frequency":246,"harmonics":[0.5,0.25,0.17,0.12,0.1],"filters":[{"type":"bandpass","freq":200,"q":2.3}],"effects":[{"type":"reverb","wet":0.05}]}},{"id":"sfx_200","name":"False Start","duration":7.45,"category":"crash","baseFreq":263,"envelope":{"a":0.19,"d":0.4,"s":0.6,"r":0.18},"synthesis":{"type":"noise","frequency":263,"harmonics":[0.75,0.38,0.25,0.19,0.15],"filters":[{"type":"notch","freq":200,"q":2.6},{"type":"lowpass","freq":2787,"q":2.6}],"effects":[{"type":"delay","wet":0.05},{"type":"distortion","wet":0.77}]}}],
    MUSIC_THEMES: [{"themeId":"theme_01","themeName":"Desert Rush","variation":1,"bpm":100,"key":"A","scale":"minor","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"verse-chorus-bridge","mood":"intense","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":2,"bpm":102,"key":"B","scale":"major","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"intro-verse-chorus","mood":"calm","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":3,"bpm":104,"key":"C","scale":"dorian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-bridge-outro","mood":"epic","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":4,"bpm":106,"key":"D","scale":"phrygian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"loop-a","mood":"mysterious","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":5,"bpm":108,"key":"E","scale":"mixolydian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-b","mood":"joyful","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":6,"bpm":110,"key":"F","scale":"lydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"stinger","mood":"dark","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":7,"bpm":112,"key":"G","scale":"aeolian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"ambient-loop","mood":"energetic","mapId":"map_desert_01"},{"themeId":"theme_01","themeName":"Desert Rush","variation":8,"bpm":114,"key":"Am","scale":"pentatonic","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"dynamic","mood":"melancholic","mapId":"map_desert_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":1,"bpm":108,"key":"B","scale":"minor","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"verse-chorus-bridge","mood":"calm","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":2,"bpm":110,"key":"C","scale":"major","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"intro-verse-chorus","mood":"epic","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":3,"bpm":112,"key":"D","scale":"dorian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-bridge-outro","mood":"mysterious","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":4,"bpm":114,"key":"E","scale":"phrygian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-a","mood":"joyful","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":5,"bpm":116,"key":"F","scale":"mixolydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-b","mood":"dark","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":6,"bpm":118,"key":"G","scale":"lydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"stinger","mood":"energetic","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":7,"bpm":120,"key":"Am","scale":"aeolian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"ambient-loop","mood":"melancholic","mapId":"map_arctic_01"},{"themeId":"theme_02","themeName":"Arctic Blast","variation":8,"bpm":122,"key":"Bm","scale":"pentatonic","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"dynamic","mood":"intense","mapId":"map_arctic_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":1,"bpm":112,"key":"C","scale":"minor","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-chorus-bridge","mood":"epic","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":2,"bpm":114,"key":"D","scale":"major","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"intro-verse-chorus","mood":"mysterious","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":3,"bpm":116,"key":"E","scale":"dorian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"verse-bridge-outro","mood":"joyful","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":4,"bpm":118,"key":"F","scale":"phrygian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-a","mood":"dark","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":5,"bpm":120,"key":"G","scale":"mixolydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-b","mood":"energetic","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":6,"bpm":122,"key":"Am","scale":"lydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"stinger","mood":"melancholic","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":7,"bpm":124,"key":"Bm","scale":"aeolian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"ambient-loop","mood":"intense","mapId":"map_forest_01"},{"themeId":"theme_03","themeName":"Forest Fury","variation":8,"bpm":126,"key":"Cm","scale":"pentatonic","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"dynamic","mood":"calm","mapId":"map_forest_01"},{"themeId":"theme_04","themeName":"City Chase","variation":1,"bpm":116,"key":"D","scale":"minor","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-chorus-bridge","mood":"mysterious","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":2,"bpm":118,"key":"E","scale":"major","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"intro-verse-chorus","mood":"joyful","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":3,"bpm":120,"key":"F","scale":"dorian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"verse-bridge-outro","mood":"dark","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":4,"bpm":122,"key":"G","scale":"phrygian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-a","mood":"energetic","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":5,"bpm":124,"key":"Am","scale":"mixolydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"loop-b","mood":"melancholic","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":6,"bpm":126,"key":"Bm","scale":"lydian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"stinger","mood":"intense","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":7,"bpm":128,"key":"Cm","scale":"aeolian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"ambient-loop","mood":"calm","mapId":"map_city_01"},{"themeId":"theme_04","themeName":"City Chase","variation":8,"bpm":130,"key":"Dm","scale":"pentatonic","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"dynamic","mood":"epic","mapId":"map_city_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":1,"bpm":120,"key":"E","scale":"minor","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"verse-chorus-bridge","mood":"joyful","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":2,"bpm":122,"key":"F","scale":"major","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"intro-verse-chorus","mood":"dark","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":3,"bpm":124,"key":"G","scale":"dorian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"verse-bridge-outro","mood":"energetic","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":4,"bpm":126,"key":"Am","scale":"phrygian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"loop-a","mood":"melancholic","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":5,"bpm":128,"key":"Bm","scale":"mixolydian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"loop-b","mood":"intense","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":6,"bpm":130,"key":"Cm","scale":"lydian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"stinger","mood":"calm","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":7,"bpm":132,"key":"Dm","scale":"aeolian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"ambient-loop","mood":"epic","mapId":"map_ocean_01"},{"themeId":"theme_05","themeName":"Ocean Drive","variation":8,"bpm":134,"key":"Em","scale":"pentatonic","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"dynamic","mood":"mysterious","mapId":"map_ocean_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":1,"bpm":124,"key":"F","scale":"minor","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"verse-chorus-bridge","mood":"dark","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":2,"bpm":126,"key":"G","scale":"major","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"intro-verse-chorus","mood":"energetic","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":3,"bpm":128,"key":"Am","scale":"dorian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"verse-bridge-outro","mood":"melancholic","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":4,"bpm":130,"key":"Bm","scale":"phrygian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"loop-a","mood":"intense","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":5,"bpm":132,"key":"Cm","scale":"mixolydian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"loop-b","mood":"calm","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":6,"bpm":134,"key":"Dm","scale":"lydian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"stinger","mood":"epic","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":7,"bpm":136,"key":"Em","scale":"aeolian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"ambient-loop","mood":"mysterious","mapId":"map_mountain_01"},{"themeId":"theme_06","themeName":"Mountain Peak","variation":8,"bpm":138,"key":"Fm","scale":"pentatonic","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"dynamic","mood":"joyful","mapId":"map_mountain_01"},{"themeId":"theme_07","themeName":"Neon City","variation":1,"bpm":128,"key":"G","scale":"minor","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"verse-chorus-bridge","mood":"energetic","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":2,"bpm":130,"key":"Am","scale":"major","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"intro-verse-chorus","mood":"melancholic","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":3,"bpm":132,"key":"Bm","scale":"dorian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"verse-bridge-outro","mood":"intense","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":4,"bpm":134,"key":"Cm","scale":"phrygian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"loop-a","mood":"calm","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":5,"bpm":136,"key":"Dm","scale":"mixolydian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"loop-b","mood":"epic","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":6,"bpm":138,"key":"Em","scale":"lydian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"stinger","mood":"mysterious","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":7,"bpm":140,"key":"Fm","scale":"aeolian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"ambient-loop","mood":"joyful","mapId":"map_neon_01"},{"themeId":"theme_07","themeName":"Neon City","variation":8,"bpm":142,"key":"Gm","scale":"pentatonic","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"dynamic","mood":"dark","mapId":"map_neon_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":1,"bpm":132,"key":"Am","scale":"minor","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"verse-chorus-bridge","mood":"melancholic","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":2,"bpm":134,"key":"Bm","scale":"major","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"intro-verse-chorus","mood":"intense","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":3,"bpm":136,"key":"Cm","scale":"dorian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"verse-bridge-outro","mood":"calm","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":4,"bpm":138,"key":"Dm","scale":"phrygian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"loop-a","mood":"epic","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":5,"bpm":140,"key":"Em","scale":"mixolydian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"loop-b","mood":"mysterious","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":6,"bpm":142,"key":"Fm","scale":"lydian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"stinger","mood":"joyful","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":7,"bpm":144,"key":"Gm","scale":"aeolian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"ambient-loop","mood":"dark","mapId":"map_jungle_01"},{"themeId":"theme_08","themeName":"Jungle Beat","variation":8,"bpm":146,"key":"A","scale":"pentatonic","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"dynamic","mood":"energetic","mapId":"map_jungle_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":1,"bpm":136,"key":"Bm","scale":"minor","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"verse-chorus-bridge","mood":"intense","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":2,"bpm":138,"key":"Cm","scale":"major","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"intro-verse-chorus","mood":"calm","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":3,"bpm":140,"key":"Dm","scale":"dorian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-bridge-outro","mood":"epic","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":4,"bpm":142,"key":"Em","scale":"phrygian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"loop-a","mood":"mysterious","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":5,"bpm":144,"key":"Fm","scale":"mixolydian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-b","mood":"joyful","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":6,"bpm":146,"key":"Gm","scale":"lydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"stinger","mood":"dark","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":7,"bpm":148,"key":"A","scale":"aeolian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"ambient-loop","mood":"energetic","mapId":"map_space_01"},{"themeId":"theme_09","themeName":"Space Odyssey","variation":8,"bpm":150,"key":"B","scale":"pentatonic","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"dynamic","mood":"melancholic","mapId":"map_space_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":1,"bpm":140,"key":"Cm","scale":"minor","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"verse-chorus-bridge","mood":"calm","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":2,"bpm":142,"key":"Dm","scale":"major","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"intro-verse-chorus","mood":"epic","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":3,"bpm":144,"key":"Em","scale":"dorian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-bridge-outro","mood":"mysterious","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":4,"bpm":146,"key":"Fm","scale":"phrygian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-a","mood":"joyful","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":5,"bpm":148,"key":"Gm","scale":"mixolydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-b","mood":"dark","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":6,"bpm":150,"key":"A","scale":"lydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"stinger","mood":"energetic","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":7,"bpm":152,"key":"B","scale":"aeolian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"ambient-loop","mood":"melancholic","mapId":"map_volcano_01"},{"themeId":"theme_10","themeName":"Volcanic Rage","variation":8,"bpm":154,"key":"C","scale":"pentatonic","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"dynamic","mood":"intense","mapId":"map_volcano_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":1,"bpm":144,"key":"Dm","scale":"minor","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-chorus-bridge","mood":"epic","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":2,"bpm":146,"key":"Em","scale":"major","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"intro-verse-chorus","mood":"mysterious","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":3,"bpm":148,"key":"Fm","scale":"dorian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"verse-bridge-outro","mood":"joyful","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":4,"bpm":150,"key":"Gm","scale":"phrygian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-a","mood":"dark","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":5,"bpm":152,"key":"A","scale":"mixolydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-b","mood":"energetic","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":6,"bpm":154,"key":"B","scale":"lydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"stinger","mood":"melancholic","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":7,"bpm":156,"key":"C","scale":"aeolian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"ambient-loop","mood":"intense","mapId":"map_sunset_01"},{"themeId":"theme_11","themeName":"Sunset Cruise","variation":8,"bpm":158,"key":"D","scale":"pentatonic","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"dynamic","mood":"calm","mapId":"map_sunset_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":1,"bpm":148,"key":"Em","scale":"minor","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-chorus-bridge","mood":"mysterious","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":2,"bpm":150,"key":"Fm","scale":"major","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"intro-verse-chorus","mood":"joyful","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":3,"bpm":152,"key":"Gm","scale":"dorian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"verse-bridge-outro","mood":"dark","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":4,"bpm":154,"key":"A","scale":"phrygian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-a","mood":"energetic","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":5,"bpm":156,"key":"B","scale":"mixolydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"loop-b","mood":"melancholic","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":6,"bpm":158,"key":"C","scale":"lydian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"stinger","mood":"intense","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":7,"bpm":160,"key":"D","scale":"aeolian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"ambient-loop","mood":"calm","mapId":"map_midnight_01"},{"themeId":"theme_12","themeName":"Midnight Race","variation":8,"bpm":162,"key":"E","scale":"pentatonic","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"dynamic","mood":"epic","mapId":"map_midnight_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":1,"bpm":152,"key":"Fm","scale":"minor","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"verse-chorus-bridge","mood":"joyful","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":2,"bpm":154,"key":"Gm","scale":"major","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"intro-verse-chorus","mood":"dark","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":3,"bpm":156,"key":"A","scale":"dorian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"verse-bridge-outro","mood":"energetic","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":4,"bpm":158,"key":"B","scale":"phrygian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"loop-a","mood":"melancholic","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":5,"bpm":160,"key":"C","scale":"mixolydian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"loop-b","mood":"intense","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":6,"bpm":162,"key":"D","scale":"lydian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"stinger","mood":"calm","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":7,"bpm":164,"key":"E","scale":"aeolian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"ambient-loop","mood":"epic","mapId":"map_storm_01"},{"themeId":"theme_13","themeName":"Storm Chase","variation":8,"bpm":166,"key":"F","scale":"pentatonic","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"dynamic","mood":"mysterious","mapId":"map_storm_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":1,"bpm":156,"key":"Gm","scale":"minor","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"verse-chorus-bridge","mood":"dark","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":2,"bpm":158,"key":"A","scale":"major","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"intro-verse-chorus","mood":"energetic","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":3,"bpm":160,"key":"B","scale":"dorian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"verse-bridge-outro","mood":"melancholic","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":4,"bpm":162,"key":"C","scale":"phrygian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"loop-a","mood":"intense","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":5,"bpm":164,"key":"D","scale":"mixolydian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"loop-b","mood":"calm","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":6,"bpm":166,"key":"E","scale":"lydian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"stinger","mood":"epic","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":7,"bpm":168,"key":"F","scale":"aeolian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"ambient-loop","mood":"mysterious","mapId":"map_rainbow_01"},{"themeId":"theme_14","themeName":"Rainbow Road","variation":8,"bpm":170,"key":"G","scale":"pentatonic","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"dynamic","mood":"joyful","mapId":"map_rainbow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":1,"bpm":160,"key":"A","scale":"minor","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"verse-chorus-bridge","mood":"energetic","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":2,"bpm":162,"key":"B","scale":"major","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"intro-verse-chorus","mood":"melancholic","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":3,"bpm":164,"key":"C","scale":"dorian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"verse-bridge-outro","mood":"intense","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":4,"bpm":166,"key":"D","scale":"phrygian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"loop-a","mood":"calm","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":5,"bpm":168,"key":"E","scale":"mixolydian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"loop-b","mood":"epic","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":6,"bpm":170,"key":"F","scale":"lydian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"stinger","mood":"mysterious","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":7,"bpm":172,"key":"G","scale":"aeolian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"ambient-loop","mood":"joyful","mapId":"map_shadow_01"},{"themeId":"theme_15","themeName":"Shadow Track","variation":8,"bpm":174,"key":"Am","scale":"pentatonic","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"dynamic","mood":"dark","mapId":"map_shadow_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":1,"bpm":90,"key":"B","scale":"minor","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"verse-chorus-bridge","mood":"melancholic","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":2,"bpm":92,"key":"C","scale":"major","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"intro-verse-chorus","mood":"intense","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":3,"bpm":94,"key":"D","scale":"dorian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"verse-bridge-outro","mood":"calm","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":4,"bpm":96,"key":"E","scale":"phrygian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"loop-a","mood":"epic","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":5,"bpm":98,"key":"F","scale":"mixolydian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"loop-b","mood":"mysterious","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":6,"bpm":100,"key":"G","scale":"lydian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"stinger","mood":"joyful","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":7,"bpm":102,"key":"Am","scale":"aeolian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"ambient-loop","mood":"dark","mapId":"map_crystal_01"},{"themeId":"theme_16","themeName":"Crystal Caves","variation":8,"bpm":104,"key":"Bm","scale":"pentatonic","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"dynamic","mood":"energetic","mapId":"map_crystal_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":1,"bpm":95,"key":"C","scale":"minor","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"verse-chorus-bridge","mood":"intense","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":2,"bpm":97,"key":"D","scale":"major","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"intro-verse-chorus","mood":"calm","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":3,"bpm":99,"key":"E","scale":"dorian","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-bridge-outro","mood":"epic","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":4,"bpm":101,"key":"F","scale":"phrygian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"loop-a","mood":"mysterious","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":5,"bpm":103,"key":"G","scale":"mixolydian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-b","mood":"joyful","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":6,"bpm":105,"key":"Am","scale":"lydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"stinger","mood":"dark","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":7,"bpm":107,"key":"Bm","scale":"aeolian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"ambient-loop","mood":"energetic","mapId":"map_lava_01"},{"themeId":"theme_17","themeName":"Lava Fields","variation":8,"bpm":109,"key":"Cm","scale":"pentatonic","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"dynamic","mood":"melancholic","mapId":"map_lava_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":1,"bpm":170,"key":"D","scale":"minor","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"verse-chorus-bridge","mood":"calm","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":2,"bpm":172,"key":"E","scale":"major","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"intro-verse-chorus","mood":"epic","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":3,"bpm":174,"key":"F","scale":"dorian","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-bridge-outro","mood":"mysterious","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":4,"bpm":176,"key":"G","scale":"phrygian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"loop-a","mood":"joyful","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":5,"bpm":178,"key":"Am","scale":"mixolydian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-b","mood":"dark","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":6,"bpm":180,"key":"Bm","scale":"lydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"stinger","mood":"energetic","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":7,"bpm":182,"key":"Cm","scale":"aeolian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"ambient-loop","mood":"melancholic","mapId":"map_sky_01"},{"themeId":"theme_18","themeName":"Sky Highway","variation":8,"bpm":184,"key":"Dm","scale":"pentatonic","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"dynamic","mood":"intense","mapId":"map_sky_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":1,"bpm":180,"key":"E","scale":"minor","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"verse-chorus-bridge","mood":"epic","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":2,"bpm":182,"key":"F","scale":"major","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"intro-verse-chorus","mood":"mysterious","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":3,"bpm":184,"key":"G","scale":"dorian","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"verse-bridge-outro","mood":"joyful","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":4,"bpm":186,"key":"Am","scale":"phrygian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"loop-a","mood":"dark","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":5,"bpm":188,"key":"Bm","scale":"mixolydian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-b","mood":"energetic","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":6,"bpm":190,"key":"Cm","scale":"lydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"stinger","mood":"melancholic","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":7,"bpm":192,"key":"Dm","scale":"aeolian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"ambient-loop","mood":"intense","mapId":"map_sea_01"},{"themeId":"theme_19","themeName":"Deep Sea","variation":8,"bpm":194,"key":"Em","scale":"pentatonic","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"dynamic","mood":"calm","mapId":"map_sea_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":1,"bpm":85,"key":"F","scale":"minor","instruments":["808_bass","trap_hi_hat","keys","brass"],"pattern":"verse-chorus-bridge","mood":"mysterious","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":2,"bpm":87,"key":"G","scale":"major","instruments":["fretless_bass","bongos","sitar","ambient_pad"],"pattern":"intro-verse-chorus","mood":"joyful","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":3,"bpm":89,"key":"Am","scale":"dorian","instruments":["upright_bass","jazz_drums","saxophone","vibraphone"],"pattern":"verse-bridge-outro","mood":"dark","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":4,"bpm":91,"key":"Bm","scale":"phrygian","instruments":["sub_bass","glitch_drums","arp_synth","texture"],"pattern":"loop-a","mood":"energetic","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":5,"bpm":93,"key":"Cm","scale":"mixolydian","instruments":["funk_bass","live_drums","organ","wah_guitar"],"pattern":"loop-b","mood":"melancholic","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":6,"bpm":95,"key":"Dm","scale":"lydian","instruments":["synth_bass","drum_kit","lead_guitar","pad"],"pattern":"stinger","mood":"intense","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":7,"bpm":97,"key":"Em","scale":"aeolian","instruments":["electric_bass","electronic_drums","synth_lead","strings"],"pattern":"ambient-loop","mood":"calm","mapId":"map_galaxy_01"},{"themeId":"theme_20","themeName":"Galaxy Run","variation":8,"bpm":99,"key":"Fm","scale":"pentatonic","instruments":["acoustic_bass","percussion","flute","choir"],"pattern":"dynamic","mood":"epic","mapId":"map_galaxy_01"}],
    DJ_TRANSITIONS: [{"id":"trans_01","name":"Hard Cut","fromTheme":"theme_01","toTheme":"theme_04","duration":1.0,"fadeType":"crossfade","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":250,"beatAlign":true}},{"id":"trans_02","name":"Smooth Blend","fromTheme":"theme_02","toTheme":"theme_05","duration":1.5,"fadeType":"cut","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":375,"beatAlign":false}},{"id":"trans_03","name":"Echo Out","fromTheme":"theme_03","toTheme":"theme_06","duration":2.0,"fadeType":"fade-out-in","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":500,"beatAlign":true}},{"id":"trans_04","name":"Filter Sweep","fromTheme":"theme_04","toTheme":"theme_07","duration":2.5,"fadeType":"blend","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":625,"beatAlign":false}},{"id":"trans_05","name":"Reverse Fade","fromTheme":"theme_05","toTheme":"theme_08","duration":3.0,"fadeType":"stutter","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":750,"beatAlign":true}},{"id":"trans_06","name":"Stutter Cut","fromTheme":"theme_06","toTheme":"theme_09","duration":3.5,"fadeType":"echo-out","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":875,"beatAlign":false}},{"id":"trans_07","name":"Instant Drop","fromTheme":"theme_07","toTheme":"theme_10","duration":4.0,"fadeType":"filter-sweep","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":1000,"beatAlign":true}},{"id":"trans_08","name":"Bass Swap","fromTheme":"theme_08","toTheme":"theme_11","duration":4.5,"fadeType":"reverse-fade","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":1125,"beatAlign":false}},{"id":"trans_09","name":"High Pass Exit","fromTheme":"theme_09","toTheme":"theme_12","duration":1.0,"fadeType":"crossfade","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":250,"beatAlign":true}},{"id":"trans_10","name":"Low Pass Enter","fromTheme":"theme_10","toTheme":"theme_13","duration":1.5,"fadeType":"cut","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":375,"beatAlign":false}},{"id":"trans_11","name":"Reverse Echo","fromTheme":"theme_11","toTheme":"theme_14","duration":2.0,"fadeType":"fade-out-in","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":500,"beatAlign":true}},{"id":"trans_12","name":"Double Drop","fromTheme":"theme_12","toTheme":"theme_15","duration":2.5,"fadeType":"blend","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":625,"beatAlign":false}},{"id":"trans_13","name":"Half Time","fromTheme":"theme_13","toTheme":"theme_16","duration":3.0,"fadeType":"stutter","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":750,"beatAlign":true}},{"id":"trans_14","name":"Full Stop","fromTheme":"theme_14","toTheme":"theme_17","duration":3.5,"fadeType":"echo-out","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":875,"beatAlign":false}},{"id":"trans_15","name":"Phaser Sweep","fromTheme":"theme_15","toTheme":"theme_18","duration":4.0,"fadeType":"filter-sweep","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":1000,"beatAlign":true}},{"id":"trans_16","name":"Glitch Hop","fromTheme":"theme_16","toTheme":"theme_19","duration":4.5,"fadeType":"reverse-fade","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":1125,"beatAlign":false}},{"id":"trans_17","name":"Beat Match","fromTheme":"theme_17","toTheme":"theme_20","duration":1.0,"fadeType":"crossfade","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":250,"beatAlign":true}},{"id":"trans_18","name":"Bar Jump","fromTheme":"theme_18","toTheme":"theme_01","duration":1.5,"fadeType":"cut","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":375,"beatAlign":false}},{"id":"trans_19","name":"Phrase End","fromTheme":"theme_19","toTheme":"theme_02","duration":2.0,"fadeType":"fade-out-in","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":500,"beatAlign":true}},{"id":"trans_20","name":"Tension Build","fromTheme":"theme_20","toTheme":"theme_03","duration":2.5,"fadeType":"blend","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":625,"beatAlign":false}},{"id":"trans_21","name":"Release Drop","fromTheme":"theme_01","toTheme":"theme_04","duration":3.0,"fadeType":"stutter","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":750,"beatAlign":true}},{"id":"trans_22","name":"Pad Swell","fromTheme":"theme_02","toTheme":"theme_05","duration":3.5,"fadeType":"echo-out","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":875,"beatAlign":false}},{"id":"trans_23","name":"Drum Fill","fromTheme":"theme_03","toTheme":"theme_06","duration":4.0,"fadeType":"filter-sweep","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":1000,"beatAlign":true}},{"id":"trans_24","name":"Loop Roll","fromTheme":"theme_04","toTheme":"theme_07","duration":4.5,"fadeType":"reverse-fade","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":1125,"beatAlign":false}},{"id":"trans_25","name":"Rewind Scratch","fromTheme":"theme_05","toTheme":"theme_08","duration":1.0,"fadeType":"crossfade","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":250,"beatAlign":true}},{"id":"trans_26","name":"Tape Stop","fromTheme":"theme_06","toTheme":"theme_09","duration":1.5,"fadeType":"cut","crossfadeData":{"inCurve":"ease-in","outCurve":"ease-out","overlapMs":375,"beatAlign":false}},{"id":"trans_27","name":"Vinyl Scratch","fromTheme":"theme_07","toTheme":"theme_10","duration":2.0,"fadeType":"fade-out-in","crossfadeData":{"inCurve":"linear","outCurve":"linear","overlapMs":500,"beatAlign":true}},{"id":"trans_28","name":"Pitch Bend","fromTheme":"theme_08","toTheme":"theme_11","duration":2.5,"fadeType":"blend","crossfadeData":{"inCurve":"ease-in-out","outCurve":"ease-in-out","overlapMs":625,"beatAlign":false}},{"id":"trans_29","name":"Time Stretch","fromTheme":"theme_09","toTheme":"theme_12","duration":3.0,"fadeType":"stutter","crossfadeData":{"inCurve":"cubic-in","outCurve":"cubic-out","overlapMs":750,"beatAlign":true}},{"id":"trans_30","name":"Harmonic Mix","fromTheme":"theme_10","toTheme":"theme_13","duration":3.5,"fadeType":"echo-out","crossfadeData":{"inCurve":"exponential-in","outCurve":"exponential-out","overlapMs":875,"beatAlign":false}}],
    SOUND_PACKS: [{"id":"pack_retro","name":"Retro Arcade","theme":"retro","sfxIds":["sfx_001","sfx_002","sfx_003","sfx_004","sfx_005","sfx_006","sfx_007","sfx_008","sfx_009","sfx_010","sfx_011","sfx_012","sfx_013","sfx_014","sfx_015","sfx_016","sfx_017","sfx_018","sfx_019","sfx_020"],"musicIds":["theme_01","theme_02"],"description":"Classic 8-bit sounds from the golden age of gaming","unlockCost":500},{"id":"pack_scifi","name":"Sci-Fi Future","theme":"scifi","sfxIds":["sfx_021","sfx_022","sfx_023","sfx_024","sfx_025","sfx_026","sfx_027","sfx_028","sfx_029","sfx_030","sfx_031","sfx_032","sfx_033","sfx_034","sfx_035","sfx_036","sfx_037","sfx_038","sfx_039","sfx_040"],"musicIds":["theme_03","theme_04"],"description":"Futuristic sounds from outer space and technology","unlockCost":750},{"id":"pack_nature","name":"Nature World","theme":"nature","sfxIds":["sfx_041","sfx_042","sfx_043","sfx_044","sfx_045","sfx_046","sfx_047","sfx_048","sfx_049","sfx_050","sfx_051","sfx_052","sfx_053","sfx_054","sfx_055","sfx_056","sfx_057","sfx_058","sfx_059","sfx_060"],"musicIds":["theme_05","theme_06"],"description":"Organic sounds from the natural world","unlockCost":400},{"id":"pack_cartoon","name":"Cartoon Fun","theme":"cartoon","sfxIds":["sfx_061","sfx_062","sfx_063","sfx_064","sfx_065","sfx_066","sfx_067","sfx_068","sfx_069","sfx_070","sfx_071","sfx_072","sfx_073","sfx_074","sfx_075","sfx_076","sfx_077","sfx_078","sfx_079","sfx_080"],"musicIds":["theme_07","theme_08"],"description":"Wacky and fun cartoon-style sound effects","unlockCost":300},{"id":"pack_cinematic","name":"Epic Cinema","theme":"cinematic","sfxIds":["sfx_081","sfx_082","sfx_083","sfx_084","sfx_085","sfx_086","sfx_087","sfx_088","sfx_089","sfx_090","sfx_091","sfx_092","sfx_093","sfx_094","sfx_095","sfx_096","sfx_097","sfx_098","sfx_099","sfx_100"],"musicIds":["theme_09","theme_10"],"description":"Epic cinematic audio for dramatic moments","unlockCost":1000},{"id":"pack_horror","name":"Horror Night","theme":"horror","sfxIds":["sfx_101","sfx_102","sfx_103","sfx_104","sfx_105","sfx_106","sfx_107","sfx_108","sfx_109","sfx_110","sfx_111","sfx_112","sfx_113","sfx_114","sfx_115","sfx_116","sfx_117","sfx_118","sfx_119","sfx_120"],"musicIds":["theme_11","theme_12"],"description":"Dark and spooky sounds for horror themes","unlockCost":600},{"id":"pack_fantasy","name":"Fantasy Quest","theme":"fantasy","sfxIds":["sfx_121","sfx_122","sfx_123","sfx_124","sfx_125","sfx_126","sfx_127","sfx_128","sfx_129","sfx_130","sfx_131","sfx_132","sfx_133","sfx_134","sfx_135","sfx_136","sfx_137","sfx_138","sfx_139","sfx_140"],"musicIds":["theme_13","theme_14"],"description":"Magical fantasy sounds for adventure","unlockCost":800},{"id":"pack_sports","name":"Sports Arena","theme":"sports","sfxIds":["sfx_141","sfx_142","sfx_143","sfx_144","sfx_145","sfx_146","sfx_147","sfx_148","sfx_149","sfx_150","sfx_151","sfx_152","sfx_153","sfx_154","sfx_155","sfx_156","sfx_157","sfx_158","sfx_159","sfx_160"],"musicIds":["theme_15","theme_16"],"description":"High-energy sports and competition sounds","unlockCost":450},{"id":"pack_electronic","name":"Electronic Beats","theme":"electronic","sfxIds":["sfx_161","sfx_162","sfx_163","sfx_164","sfx_165","sfx_166","sfx_167","sfx_168","sfx_169","sfx_170","sfx_171","sfx_172","sfx_173","sfx_174","sfx_175","sfx_176","sfx_177","sfx_178","sfx_179","sfx_180"],"musicIds":["theme_17","theme_18"],"description":"Modern electronic music and effects","unlockCost":550},{"id":"pack_classical","name":"Classical Orchestra","theme":"classical","sfxIds":["sfx_181","sfx_182","sfx_183","sfx_184","sfx_185","sfx_186","sfx_187","sfx_188","sfx_189","sfx_190","sfx_191","sfx_192","sfx_193","sfx_194","sfx_195","sfx_196","sfx_197","sfx_198","sfx_199","sfx_200"],"musicIds":["theme_19","theme_20"],"description":"Timeless classical music arrangements","unlockCost":900}],
    AUDIO_ASSET_MANIFEST: [{"filename":"engine_idle.ogg","size":20000,"format":"ogg","sampleRate":22050,"bitDepth":16,"channels":1,"duration":0.5,"category":"engine"},{"filename":"engine_start.mp3","size":23137,"format":"mp3","sampleRate":44100,"bitDepth":24,"channels":2,"duration":0.9,"category":"crash"},{"filename":"engine_rev.wav","size":26274,"format":"wav","sampleRate":48000,"bitDepth":16,"channels":1,"duration":1.3,"category":"ui"},{"filename":"engine_shutdown.aac","size":29411,"format":"aac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":1.7,"category":"ambient"},{"filename":"engine_backfire.flac","size":32548,"format":"flac","sampleRate":44100,"bitDepth":16,"channels":1,"duration":2.1,"category":"reward"},{"filename":"tire_screech.ogg","size":35685,"format":"ogg","sampleRate":48000,"bitDepth":24,"channels":2,"duration":2.5,"category":"voice"},{"filename":"tire_skid.mp3","size":38822,"format":"mp3","sampleRate":22050,"bitDepth":16,"channels":1,"duration":2.9,"category":"vehicle"},{"filename":"tire_pop.wav","size":41959,"format":"wav","sampleRate":44100,"bitDepth":24,"channels":2,"duration":3.3,"category":"weapon"},{"filename":"crash_light.aac","size":45096,"format":"aac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":3.7,"category":"environment"},{"filename":"crash_heavy.flac","size":48233,"format":"flac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":4.1,"category":"music"},{"filename":"crash_glass.ogg","size":51370,"format":"ogg","sampleRate":44100,"bitDepth":16,"channels":1,"duration":4.5,"category":"engine"},{"filename":"crash_explosion.mp3","size":54507,"format":"mp3","sampleRate":48000,"bitDepth":24,"channels":2,"duration":4.9,"category":"crash"},{"filename":"jump_launch.wav","size":57644,"format":"wav","sampleRate":22050,"bitDepth":16,"channels":1,"duration":5.3,"category":"ui"},{"filename":"jump_land.aac","size":60781,"format":"aac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":5.7,"category":"ambient"},{"filename":"coin_pickup.flac","size":63918,"format":"flac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":6.1,"category":"reward"},{"filename":"gem_collect.ogg","size":67055,"format":"ogg","sampleRate":22050,"bitDepth":24,"channels":2,"duration":6.5,"category":"voice"},{"filename":"level_up.mp3","size":70192,"format":"mp3","sampleRate":44100,"bitDepth":16,"channels":1,"duration":6.9,"category":"vehicle"},{"filename":"achievement.wav","size":73329,"format":"wav","sampleRate":48000,"bitDepth":24,"channels":2,"duration":7.3,"category":"weapon"},{"filename":"button_click.aac","size":76466,"format":"aac","sampleRate":22050,"bitDepth":16,"channels":1,"duration":7.7,"category":"environment"},{"filename":"menu_open.flac","size":79603,"format":"flac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":8.1,"category":"music"},{"filename":"race_start.ogg","size":82740,"format":"ogg","sampleRate":48000,"bitDepth":16,"channels":1,"duration":8.5,"category":"engine"},{"filename":"race_finish.mp3","size":85877,"format":"mp3","sampleRate":22050,"bitDepth":24,"channels":2,"duration":8.9,"category":"crash"},{"filename":"crowd_cheer.wav","size":89014,"format":"wav","sampleRate":44100,"bitDepth":16,"channels":1,"duration":9.3,"category":"ui"},{"filename":"crowd_groan.aac","size":92151,"format":"aac","sampleRate":48000,"bitDepth":24,"channels":2,"duration":9.7,"category":"ambient"},{"filename":"wind_whoosh.flac","size":95288,"format":"flac","sampleRate":22050,"bitDepth":16,"channels":1,"duration":10.1,"category":"reward"},{"filename":"rain_drops.ogg","size":98425,"format":"ogg","sampleRate":44100,"bitDepth":24,"channels":2,"duration":10.5,"category":"voice"},{"filename":"thunder_crack.mp3","size":101562,"format":"mp3","sampleRate":48000,"bitDepth":16,"channels":1,"duration":10.9,"category":"vehicle"},{"filename":"bird_tweet.wav","size":104699,"format":"wav","sampleRate":22050,"bitDepth":24,"channels":2,"duration":11.3,"category":"weapon"},{"filename":"nitro_boost.aac","size":107836,"format":"aac","sampleRate":44100,"bitDepth":16,"channels":1,"duration":11.7,"category":"environment"},{"filename":"shield_hit.flac","size":110973,"format":"flac","sampleRate":48000,"bitDepth":24,"channels":2,"duration":12.1,"category":"music"},{"filename":"flip_success.ogg","size":114110,"format":"ogg","sampleRate":22050,"bitDepth":16,"channels":1,"duration":0.5,"category":"engine"},{"filename":"reward_fanfare.mp3","size":117247,"format":"mp3","sampleRate":44100,"bitDepth":24,"channels":2,"duration":0.9,"category":"crash"},{"filename":"ui_ping.wav","size":120384,"format":"wav","sampleRate":48000,"bitDepth":16,"channels":1,"duration":1.3,"category":"ui"},{"filename":"gear_shift.aac","size":123521,"format":"aac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":1.7,"category":"ambient"},{"filename":"horn_beep.flac","size":126658,"format":"flac","sampleRate":44100,"bitDepth":16,"channels":1,"duration":2.1,"category":"reward"},{"filename":"suspension_bounce.ogg","size":129795,"format":"ogg","sampleRate":48000,"bitDepth":24,"channels":2,"duration":2.5,"category":"voice"},{"filename":"water_splash.mp3","size":132932,"format":"mp3","sampleRate":22050,"bitDepth":16,"channels":1,"duration":2.9,"category":"vehicle"},{"filename":"sand_scrape.wav","size":136069,"format":"wav","sampleRate":44100,"bitDepth":24,"channels":2,"duration":3.3,"category":"weapon"},{"filename":"fire_crackle.aac","size":139206,"format":"aac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":3.7,"category":"environment"},{"filename":"explosion.flac","size":142343,"format":"flac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":4.1,"category":"music"},{"filename":"crowd_stadium.ogg","size":145480,"format":"ogg","sampleRate":44100,"bitDepth":16,"channels":1,"duration":4.5,"category":"engine"},{"filename":"metal_scrape.mp3","size":148617,"format":"mp3","sampleRate":48000,"bitDepth":24,"channels":2,"duration":4.9,"category":"crash"},{"filename":"rubber_burn.wav","size":151754,"format":"wav","sampleRate":22050,"bitDepth":16,"channels":1,"duration":5.3,"category":"ui"},{"filename":"computer_beep.aac","size":154891,"format":"aac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":5.7,"category":"ambient"},{"filename":"mission_start.flac","size":158028,"format":"flac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":6.1,"category":"reward"},{"filename":"power_up.ogg","size":161165,"format":"ogg","sampleRate":22050,"bitDepth":24,"channels":2,"duration":6.5,"category":"voice"},{"filename":"camera_flash.mp3","size":164302,"format":"mp3","sampleRate":44100,"bitDepth":16,"channels":1,"duration":6.9,"category":"vehicle"},{"filename":"collectible.wav","size":167439,"format":"wav","sampleRate":48000,"bitDepth":24,"channels":2,"duration":7.3,"category":"weapon"},{"filename":"drift_start.aac","size":170576,"format":"aac","sampleRate":22050,"bitDepth":16,"channels":1,"duration":7.7,"category":"environment"},{"filename":"collision_hard.flac","size":173713,"format":"flac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":8.1,"category":"music"},{"filename":"bridge_rumble.ogg","size":176850,"format":"ogg","sampleRate":48000,"bitDepth":16,"channels":1,"duration":8.5,"category":"engine"},{"filename":"tunnel_echo.mp3","size":179987,"format":"mp3","sampleRate":22050,"bitDepth":24,"channels":2,"duration":8.9,"category":"crash"},{"filename":"helicopter.wav","size":183124,"format":"wav","sampleRate":44100,"bitDepth":16,"channels":1,"duration":9.3,"category":"ui"},{"filename":"ghost_car.aac","size":186261,"format":"aac","sampleRate":48000,"bitDepth":24,"channels":2,"duration":9.7,"category":"ambient"},{"filename":"lap_record.flac","size":189398,"format":"flac","sampleRate":22050,"bitDepth":16,"channels":1,"duration":10.1,"category":"reward"},{"filename":"countdown.ogg","size":192535,"format":"ogg","sampleRate":44100,"bitDepth":24,"channels":2,"duration":10.5,"category":"voice"},{"filename":"pit_stop.mp3","size":195672,"format":"mp3","sampleRate":48000,"bitDepth":16,"channels":1,"duration":10.9,"category":"vehicle"},{"filename":"map_reveal.wav","size":198809,"format":"wav","sampleRate":22050,"bitDepth":24,"channels":2,"duration":11.3,"category":"weapon"},{"filename":"shop_open.aac","size":21946,"format":"aac","sampleRate":44100,"bitDepth":16,"channels":1,"duration":11.7,"category":"environment"},{"filename":"notification.flac","size":25083,"format":"flac","sampleRate":48000,"bitDepth":24,"channels":2,"duration":12.1,"category":"music"},{"filename":"ambient_city.ogg","size":28220,"format":"ogg","sampleRate":22050,"bitDepth":16,"channels":1,"duration":0.5,"category":"engine"},{"filename":"ambient_desert.mp3","size":31357,"format":"mp3","sampleRate":44100,"bitDepth":24,"channels":2,"duration":0.9,"category":"crash"},{"filename":"ambient_forest.wav","size":34494,"format":"wav","sampleRate":48000,"bitDepth":16,"channels":1,"duration":1.3,"category":"ui"},{"filename":"ambient_ocean.aac","size":37631,"format":"aac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":1.7,"category":"ambient"},{"filename":"ambient_space.flac","size":40768,"format":"flac","sampleRate":44100,"bitDepth":16,"channels":1,"duration":2.1,"category":"reward"},{"filename":"day_transition.ogg","size":43905,"format":"ogg","sampleRate":48000,"bitDepth":24,"channels":2,"duration":2.5,"category":"voice"},{"filename":"animal_roar.mp3","size":47042,"format":"mp3","sampleRate":22050,"bitDepth":16,"channels":1,"duration":2.9,"category":"vehicle"},{"filename":"horn_long.wav","size":50179,"format":"wav","sampleRate":44100,"bitDepth":24,"channels":2,"duration":3.3,"category":"weapon"},{"filename":"siren.aac","size":53316,"format":"aac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":3.7,"category":"environment"},{"filename":"alarm.flac","size":56453,"format":"flac","sampleRate":22050,"bitDepth":24,"channels":2,"duration":4.1,"category":"music"},{"filename":"gravel_crunch.ogg","size":59590,"format":"ogg","sampleRate":44100,"bitDepth":16,"channels":1,"duration":4.5,"category":"engine"},{"filename":"mud_splat.mp3","size":62727,"format":"mp3","sampleRate":48000,"bitDepth":24,"channels":2,"duration":4.9,"category":"crash"},{"filename":"ice_crack.wav","size":65864,"format":"wav","sampleRate":22050,"bitDepth":16,"channels":1,"duration":5.3,"category":"ui"},{"filename":"rock_hit.aac","size":69001,"format":"aac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":5.7,"category":"ambient"},{"filename":"debris_scatter.flac","size":72138,"format":"flac","sampleRate":48000,"bitDepth":16,"channels":1,"duration":6.1,"category":"reward"},{"filename":"smoke_hiss.ogg","size":75275,"format":"ogg","sampleRate":22050,"bitDepth":24,"channels":2,"duration":6.5,"category":"voice"},{"filename":"digital_blip.mp3","size":78412,"format":"mp3","sampleRate":44100,"bitDepth":16,"channels":1,"duration":6.9,"category":"vehicle"},{"filename":"lock_on.wav","size":81549,"format":"wav","sampleRate":48000,"bitDepth":24,"channels":2,"duration":7.3,"category":"weapon"},{"filename":"energy_drain.aac","size":84686,"format":"aac","sampleRate":22050,"bitDepth":16,"channels":1,"duration":7.7,"category":"environment"},{"filename":"slow_motion.flac","size":87823,"format":"flac","sampleRate":44100,"bitDepth":24,"channels":2,"duration":8.1,"category":"music"}],
    VOICE_LINES: [{"id":"vl_001","text":"Come on, let's go faster!","situation":"race_start","emotion":"excited","duration":1.2,"characterId":"driver_rex"},{"id":"vl_002","text":"Yeah! First place is mine!","situation":"race_win","emotion":"triumphant","duration":1.5,"characterId":"driver_ace"},{"id":"vl_003","text":"No way, I can't lose!","situation":"race_lose","emotion":"disappointed","duration":1.8,"characterId":"driver_zara"},{"id":"vl_004","text":"Watch out, that was close!","situation":"near_crash","emotion":"scared","duration":2.1,"characterId":"driver_bolt"},{"id":"vl_005","text":"Power up! Let's do this!","situation":"powerup_collect","emotion":"happy","duration":2.4,"characterId":"driver_nova"},{"id":"vl_006","text":"Here we go, launching!","situation":"jump_big","emotion":"amazed","duration":2.7,"characterId":"driver_rex"},{"id":"vl_007","text":"Nailed it! Perfect flip!","situation":"flip_success","emotion":"proud","duration":3.0,"characterId":"driver_ace"},{"id":"vl_008","text":"I'm stuck, need to move!","situation":"stuck","emotion":"frustrated","duration":3.3,"characterId":"driver_zara"},{"id":"vl_009","text":"Coming back strong!","situation":"comeback","emotion":"determined","duration":3.6,"characterId":"driver_bolt"},{"id":"vl_010","text":"Last lap, give it all!","situation":"final_lap","emotion":"urgent","duration":3.9,"characterId":"driver_nova"},{"id":"vl_011","text":"Engines hot, ready to roll!","situation":"race_start","emotion":"excited","duration":1.2,"characterId":"driver_rex"},{"id":"vl_012","text":"Victory! I crushed it!","situation":"race_win","emotion":"triumphant","duration":1.5,"characterId":"driver_ace"},{"id":"vl_013","text":"This can't be happening!","situation":"race_lose","emotion":"disappointed","duration":1.8,"characterId":"driver_zara"},{"id":"vl_014","text":"Whoa, nearly crashed there!","situation":"near_crash","emotion":"scared","duration":2.1,"characterId":"driver_bolt"},{"id":"vl_015","text":"Grabbing that boost now!","situation":"powerup_collect","emotion":"happy","duration":2.4,"characterId":"driver_nova"},{"id":"vl_016","text":"Going for a big one!","situation":"jump_big","emotion":"amazed","duration":2.7,"characterId":"driver_rex"},{"id":"vl_017","text":"Smooth landing, oh yeah!","situation":"flip_success","emotion":"proud","duration":3.0,"characterId":"driver_ace"},{"id":"vl_018","text":"Can't stop now, push it!","situation":"stuck","emotion":"frustrated","duration":3.3,"characterId":"driver_zara"},{"id":"vl_019","text":"From last to first, baby!","situation":"comeback","emotion":"determined","duration":3.6,"characterId":"driver_bolt"},{"id":"vl_020","text":"Final lap, don't blow it!","situation":"final_lap","emotion":"urgent","duration":3.9,"characterId":"driver_nova"},{"id":"vl_021","text":"Pedal to the metal!","situation":"race_start","emotion":"excited","duration":1.2,"characterId":"driver_rex"},{"id":"vl_022","text":"Top of the podium, yes!","situation":"race_win","emotion":"triumphant","duration":1.5,"characterId":"driver_ace"},{"id":"vl_023","text":"I trained so hard for this!","situation":"race_lose","emotion":"disappointed","duration":1.8,"characterId":"driver_zara"},{"id":"vl_024","text":"My heart just stopped!","situation":"near_crash","emotion":"scared","duration":2.1,"characterId":"driver_bolt"},{"id":"vl_025","text":"Extra speed, love it!","situation":"powerup_collect","emotion":"happy","duration":2.4,"characterId":"driver_nova"},{"id":"vl_026","text":"Launch in three, two, one!","situation":"jump_big","emotion":"amazed","duration":2.7,"characterId":"driver_rex"},{"id":"vl_027","text":"Triple flip, incredible!","situation":"flip_success","emotion":"proud","duration":3.0,"characterId":"driver_ace"},{"id":"vl_028","text":"Wheels are spinning, help!","situation":"stuck","emotion":"frustrated","duration":3.3,"characterId":"driver_zara"},{"id":"vl_029","text":"Nothing can stop me now!","situation":"comeback","emotion":"determined","duration":3.6,"characterId":"driver_bolt"},{"id":"vl_030","text":"Cross that line and win!","situation":"final_lap","emotion":"urgent","duration":3.9,"characterId":"driver_nova"},{"id":"vl_031","text":"Full throttle, let's fly!","situation":"race_start","emotion":"excited","duration":1.2,"characterId":"driver_rex"},{"id":"vl_032","text":"Champion! Unbelievable!","situation":"race_win","emotion":"triumphant","duration":1.5,"characterId":"driver_ace"},{"id":"vl_033","text":"So close, yet so far!","situation":"race_lose","emotion":"disappointed","duration":1.8,"characterId":"driver_zara"},{"id":"vl_034","text":"Saw it coming, barely!","situation":"near_crash","emotion":"scared","duration":2.1,"characterId":"driver_bolt"},{"id":"vl_035","text":"Shiny boost, grab it!","situation":"powerup_collect","emotion":"happy","duration":2.4,"characterId":"driver_nova"},{"id":"vl_036","text":"Sky high and loving it!","situation":"jump_big","emotion":"amazed","duration":2.7,"characterId":"driver_rex"},{"id":"vl_037","text":"Stuck the landing, perfect!","situation":"flip_success","emotion":"proud","duration":3.0,"characterId":"driver_ace"},{"id":"vl_038","text":"Wheels won't turn, ugh!","situation":"stuck","emotion":"frustrated","duration":3.3,"characterId":"driver_zara"},{"id":"vl_039","text":"Catching up, hold on!","situation":"comeback","emotion":"determined","duration":3.6,"characterId":"driver_bolt"},{"id":"vl_040","text":"Last stretch, focus now!","situation":"final_lap","emotion":"urgent","duration":3.9,"characterId":"driver_nova"},{"id":"vl_041","text":"This track is mine today!","situation":"race_start","emotion":"excited","duration":1.2,"characterId":"driver_rex"},{"id":"vl_042","text":"Number one, can't believe it!","situation":"race_win","emotion":"triumphant","duration":1.5,"characterId":"driver_ace"},{"id":"vl_043","text":"Bad day on the track!","situation":"race_lose","emotion":"disappointed","duration":1.8,"characterId":"driver_zara"},{"id":"vl_044","text":"Phew, dodged that one!","situation":"near_crash","emotion":"scared","duration":2.1,"characterId":"driver_bolt"},{"id":"vl_045","text":"Speed boost, yes please!","situation":"powerup_collect","emotion":"happy","duration":2.4,"characterId":"driver_nova"},{"id":"vl_046","text":"Maximum altitude achieved!","situation":"jump_big","emotion":"amazed","duration":2.7,"characterId":"driver_rex"},{"id":"vl_047","text":"Three-sixty, nailed it!","situation":"flip_success","emotion":"proud","duration":3.0,"characterId":"driver_ace"},{"id":"vl_048","text":"Wheels buried in mud!","situation":"stuck","emotion":"frustrated","duration":3.3,"characterId":"driver_zara"},{"id":"vl_049","text":"Nobody's catching me now!","situation":"comeback","emotion":"determined","duration":3.6,"characterId":"driver_bolt"},{"id":"vl_050","text":"Photo finish, let's go!","situation":"final_lap","emotion":"urgent","duration":3.9,"characterId":"driver_nova"}],
    AMBIENT_SOUNDSCAPES: [{"environmentId":"env_desert","name":"Desert","layers":[{"sfxId":"sfx_001","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_002","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_003","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_004","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_005","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_006","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_007","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_008","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_009","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_010","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_arctic","name":"Arctic","layers":[{"sfxId":"sfx_011","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_012","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_013","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_014","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_015","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_016","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_017","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_018","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_019","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_020","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_forest","name":"Forest","layers":[{"sfxId":"sfx_021","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_022","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_023","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_024","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_025","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_026","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_027","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_028","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_029","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_030","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_city","name":"City","layers":[{"sfxId":"sfx_031","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_032","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_033","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_034","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_035","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_036","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_037","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_038","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_039","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_040","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_ocean","name":"Ocean","layers":[{"sfxId":"sfx_041","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_042","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_043","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_044","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_045","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_046","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_047","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_048","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_049","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_050","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_mountain","name":"Mountain","layers":[{"sfxId":"sfx_051","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_052","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_053","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_054","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_055","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_056","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_057","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_058","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_059","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_060","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_neon","name":"Neon City","layers":[{"sfxId":"sfx_061","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_062","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_063","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_064","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_065","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_066","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_067","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_068","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_069","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_070","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_jungle","name":"Jungle","layers":[{"sfxId":"sfx_071","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_072","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_073","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_074","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_075","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_076","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_077","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_078","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_079","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_080","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_space","name":"Space","layers":[{"sfxId":"sfx_081","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_082","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_083","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_084","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_085","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_086","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_087","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_088","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_089","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_090","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_volcano","name":"Volcano","layers":[{"sfxId":"sfx_091","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_092","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_093","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_094","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_095","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_096","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_097","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_098","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_099","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_100","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_sunset","name":"Sunset Beach","layers":[{"sfxId":"sfx_101","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_102","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_103","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_104","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_105","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_106","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_107","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_108","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_109","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_110","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_midnight","name":"Midnight Highway","layers":[{"sfxId":"sfx_111","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_112","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_113","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_114","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_115","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_116","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_117","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_118","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_119","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_120","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_storm","name":"Storm","layers":[{"sfxId":"sfx_121","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_122","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_123","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_124","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_125","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_126","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_127","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_128","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_129","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_130","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_underground","name":"Underground","layers":[{"sfxId":"sfx_131","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_132","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_133","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_134","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_135","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_136","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_137","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_138","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_139","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_140","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]},{"environmentId":"env_sky","name":"Sky","layers":[{"sfxId":"sfx_141","volume":0.1,"pan":-0.8,"loop":true,"randomDelay":0},{"sfxId":"sfx_142","volume":0.19,"pan":-0.62,"loop":true,"randomDelay":1000},{"sfxId":"sfx_143","volume":0.28,"pan":-0.44,"loop":false,"randomDelay":2000},{"sfxId":"sfx_144","volume":0.37,"pan":-0.26,"loop":true,"randomDelay":3000},{"sfxId":"sfx_145","volume":0.46,"pan":-0.08,"loop":true,"randomDelay":4000},{"sfxId":"sfx_146","volume":0.55,"pan":0.1,"loop":false,"randomDelay":0},{"sfxId":"sfx_147","volume":0.64,"pan":0.28,"loop":true,"randomDelay":1000},{"sfxId":"sfx_148","volume":0.73,"pan":0.46,"loop":true,"randomDelay":2000},{"sfxId":"sfx_149","volume":0.82,"pan":0.64,"loop":false,"randomDelay":3000},{"sfxId":"sfx_150","volume":0.1,"pan":0.82,"loop":true,"randomDelay":4000}]}],
    MUSIC_STATE_MACHINE: {"states":[{"id":"state_main_menu","name":"Main Menu","themeId":"theme_01","variation":1,"transitions":[{"toState":"state_character_select","condition":"race_start","fadeTime":0.5},{"toState":"state_map_select","condition":"pause","fadeTime":1.0}]},{"id":"state_character_select","name":"Character Select","themeId":"theme_02","variation":2,"transitions":[{"toState":"state_map_select","condition":"pause","fadeTime":0.5},{"toState":"state_loading","condition":"resume","fadeTime":1.0},{"toState":"state_race_active","condition":"finish","fadeTime":1.5}]},{"id":"state_map_select","name":"Map Select","themeId":"theme_03","variation":3,"transitions":[{"toState":"state_loading","condition":"resume","fadeTime":0.5},{"toState":"state_race_active","condition":"finish","fadeTime":1.0},{"toState":"state_race_pause","condition":"menu","fadeTime":1.5},{"toState":"state_race_finish","condition":"select","fadeTime":2.0}]},{"id":"state_loading","name":"Loading","themeId":"theme_04","variation":4,"transitions":[{"toState":"state_race_active","condition":"finish","fadeTime":0.5},{"toState":"state_race_pause","condition":"menu","fadeTime":1.0}]},{"id":"state_race_active","name":"Race Active","themeId":"theme_05","variation":5,"transitions":[{"toState":"state_race_pause","condition":"menu","fadeTime":0.5},{"toState":"state_race_finish","condition":"select","fadeTime":1.0},{"toState":"state_race_replay","condition":"back","fadeTime":1.5}]},{"id":"state_race_pause","name":"Race Pause","themeId":"theme_06","variation":6,"transitions":[{"toState":"state_race_finish","condition":"select","fadeTime":0.5},{"toState":"state_race_replay","condition":"back","fadeTime":1.0},{"toState":"state_upgrade_shop","condition":"win","fadeTime":1.5},{"toState":"state_garage","condition":"lose","fadeTime":2.0}]},{"id":"state_race_finish","name":"Race Finish","themeId":"theme_07","variation":7,"transitions":[{"toState":"state_race_replay","condition":"back","fadeTime":0.5},{"toState":"state_upgrade_shop","condition":"win","fadeTime":1.0}]},{"id":"state_race_replay","name":"Race Replay","themeId":"theme_08","variation":8,"transitions":[{"toState":"state_upgrade_shop","condition":"win","fadeTime":0.5},{"toState":"state_garage","condition":"lose","fadeTime":1.0},{"toState":"state_leaderboard","condition":"load_complete","fadeTime":1.5}]},{"id":"state_upgrade_shop","name":"Upgrade Shop","themeId":"theme_09","variation":1,"transitions":[{"toState":"state_garage","condition":"lose","fadeTime":0.5},{"toState":"state_leaderboard","condition":"load_complete","fadeTime":1.0},{"toState":"state_achievement","condition":"shop_enter","fadeTime":1.5},{"toState":"state_daily_challenge","condition":"garage_enter","fadeTime":2.0}]},{"id":"state_garage","name":"Garage","themeId":"theme_10","variation":2,"transitions":[{"toState":"state_leaderboard","condition":"load_complete","fadeTime":0.5},{"toState":"state_achievement","condition":"shop_enter","fadeTime":1.0}]},{"id":"state_leaderboard","name":"Leaderboard","themeId":"theme_11","variation":3,"transitions":[{"toState":"state_achievement","condition":"shop_enter","fadeTime":0.5},{"toState":"state_daily_challenge","condition":"garage_enter","fadeTime":1.0},{"toState":"state_tournament","condition":"leaderboard","fadeTime":1.5}]},{"id":"state_achievement","name":"Achievement","themeId":"theme_12","variation":4,"transitions":[{"toState":"state_daily_challenge","condition":"garage_enter","fadeTime":0.5},{"toState":"state_tournament","condition":"leaderboard","fadeTime":1.0},{"toState":"state_free_roam","condition":"achievement_unlock","fadeTime":1.5},{"toState":"state_tutorial","condition":"challenge_start","fadeTime":2.0}]},{"id":"state_daily_challenge","name":"Daily Challenge","themeId":"theme_13","variation":5,"transitions":[{"toState":"state_tournament","condition":"leaderboard","fadeTime":0.5},{"toState":"state_free_roam","condition":"achievement_unlock","fadeTime":1.0}]},{"id":"state_tournament","name":"Tournament","themeId":"theme_14","variation":6,"transitions":[{"toState":"state_free_roam","condition":"achievement_unlock","fadeTime":0.5},{"toState":"state_tutorial","condition":"challenge_start","fadeTime":1.0},{"toState":"state_settings","condition":"tutorial_start","fadeTime":1.5}]},{"id":"state_free_roam","name":"Free Roam","themeId":"theme_15","variation":7,"transitions":[{"toState":"state_tutorial","condition":"challenge_start","fadeTime":0.5},{"toState":"state_settings","condition":"tutorial_start","fadeTime":1.0},{"toState":"state_credits","condition":"settings_open","fadeTime":1.5},{"toState":"state_cinematic","condition":"credits_roll","fadeTime":2.0}]},{"id":"state_tutorial","name":"Tutorial","themeId":"theme_16","variation":8,"transitions":[{"toState":"state_settings","condition":"tutorial_start","fadeTime":0.5},{"toState":"state_credits","condition":"settings_open","fadeTime":1.0}]},{"id":"state_settings","name":"Settings","themeId":"theme_17","variation":1,"transitions":[{"toState":"state_credits","condition":"settings_open","fadeTime":0.5},{"toState":"state_cinematic","condition":"credits_roll","fadeTime":1.0},{"toState":"state_boss_race","condition":"cinematic_start","fadeTime":1.5}]},{"id":"state_credits","name":"Credits","themeId":"theme_18","variation":2,"transitions":[{"toState":"state_cinematic","condition":"credits_roll","fadeTime":0.5},{"toState":"state_boss_race","condition":"cinematic_start","fadeTime":1.0},{"toState":"state_time_trial","condition":"boss_appear","fadeTime":1.5},{"toState":"state_ghost_race","condition":"time_trial_start","fadeTime":2.0}]},{"id":"state_cinematic","name":"Cinematic","themeId":"theme_19","variation":3,"transitions":[{"toState":"state_boss_race","condition":"cinematic_start","fadeTime":0.5},{"toState":"state_time_trial","condition":"boss_appear","fadeTime":1.0}]},{"id":"state_boss_race","name":"Boss Race","themeId":"theme_20","variation":4,"transitions":[{"toState":"state_time_trial","condition":"boss_appear","fadeTime":0.5},{"toState":"state_ghost_race","condition":"time_trial_start","fadeTime":1.0},{"toState":"state_team_race","condition":"ghost_appear","fadeTime":1.5}]},{"id":"state_time_trial","name":"Time Trial","themeId":"theme_menu","variation":5,"transitions":[{"toState":"state_ghost_race","condition":"time_trial_start","fadeTime":0.5},{"toState":"state_team_race","condition":"ghost_appear","fadeTime":1.0},{"toState":"state_battle_mode","condition":"team_join","fadeTime":1.5},{"toState":"state_spectate","condition":"battle_start","fadeTime":2.0}]},{"id":"state_ghost_race","name":"Ghost Race","themeId":"theme_boss","variation":6,"transitions":[{"toState":"state_team_race","condition":"ghost_appear","fadeTime":0.5},{"toState":"state_battle_mode","condition":"team_join","fadeTime":1.0}]},{"id":"state_team_race","name":"Team Race","themeId":"theme_credits","variation":7,"transitions":[{"toState":"state_battle_mode","condition":"team_join","fadeTime":0.5},{"toState":"state_spectate","condition":"battle_start","fadeTime":1.0},{"toState":"state_main_menu","condition":"spectate_join","fadeTime":1.5}]},{"id":"state_battle_mode","name":"Battle Mode","themeId":"theme_cinematic","variation":8,"transitions":[{"toState":"state_spectate","condition":"battle_start","fadeTime":0.5},{"toState":"state_main_menu","condition":"spectate_join","fadeTime":1.0},{"toState":"state_character_select","condition":"race_start","fadeTime":1.5},{"toState":"state_map_select","condition":"pause","fadeTime":2.0}]},{"id":"state_spectate","name":"Spectate","themeId":"theme_ambient","variation":1,"transitions":[{"toState":"state_main_menu","condition":"spectate_join","fadeTime":0.5},{"toState":"state_character_select","condition":"race_start","fadeTime":1.0}]}]}
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AUDIO_CONTENT_LIBRARY;
  } else if (typeof window !== 'undefined') {
    window.AUDIO_CONTENT_LIBRARY = AUDIO_CONTENT_LIBRARY;
  }
})();


// ================================================================
// AUDIO_PROFILE_LIBRARY — Complete sound profiles for all game states
// ================================================================
const AUDIO_PROFILE_LIBRARY = (() => {
  const PROFILES = {
    map_volcano:   { ambient:'lava_rumble', wind:0.3, temp:1.2, reverb:'large_open', music:'intense_drums' },
    map_ocean:     { ambient:'waves_crash', wind:0.5, temp:0.8, reverb:'outdoor_wet', music:'calm_ambient' },
    map_lunar:     { ambient:'suit_hum',    wind:0.0, temp:0.0, reverb:'small_dry',   music:'electronic_sparse' },
    map_jungle:    { ambient:'bird_chorus', wind:0.2, temp:1.0, reverb:'medium_wet',  music:'tribal_rhythm' },
    map_arctic:    { ambient:'wind_howl',   wind:0.9, temp:0.6, reverb:'outdoor_dry', music:'cold_ambient' },
    map_city:      { ambient:'city_traffic',wind:0.1, temp:1.0, reverb:'urban_echo',  music:'driving_electro' },
    map_cave:      { ambient:'drip_echo',   wind:0.0, temp:0.7, reverb:'cave_large',  music:'dark_ambient' },
    map_desert:    { ambient:'sand_wind',   wind:0.7, temp:1.3, reverb:'outdoor_dry', music:'hot_ambient' },
    map_haunted:   { ambient:'ghost_moan',  wind:0.3, temp:0.8, reverb:'medium_dry',  music:'horror_strings' },
    map_space:     { ambient:'void_hum',    wind:0.0, temp:0.0, reverb:'none',         music:'electronic_epic' },
    map_factory:   { ambient:'machinery',   wind:0.2, temp:1.1, reverb:'large_metal',  music:'industrial_beat' },
    map_crystal:   { ambient:'resonance',   wind:0.1, temp:0.9, reverb:'crystal_echo', music:'ethereal' },
    map_fantasy:   { ambient:'magic_chime', wind:0.2, temp:1.0, reverb:'medium_wet',   music:'orchestral_epic' },
    map_dinosaur:  { ambient:'dino_calls',  wind:0.4, temp:1.2, reverb:'outdoor_large','music':'prehistoric' },
    map_pirate:    { ambient:'ocean_waves', wind:0.6, temp:1.0, reverb:'outdoor_wet',  music:'shanty_drums' }
  };

  const VEHICLE_ENGINE_SOUNDS = {
    jeep:        { idle:80,  mid:240, peak:420, type:'V4',     exhaust:'mild',  turbo:false },
    monster:     { idle:60,  mid:180, peak:360, type:'V8',     exhaust:'deep',  turbo:false },
    superbike:   { idle:120, mid:400, peak:800, type:'inline4',exhaust:'sharp', turbo:false },
    tank:        { idle:50,  mid:120, peak:200, type:'diesel', exhaust:'rumble',turbo:true  },
    buggy:       { idle:90,  mid:270, peak:500, type:'V4',     exhaust:'pop',   turbo:false },
    sports_car:  { idle:100, mid:320, peak:600, type:'V6',     exhaust:'raspy', turbo:true  },
    electric:    { idle:200, mid:600, peak:1200,type:'electric',exhaust:'whine',turbo:false },
    chopper:     { idle:70,  mid:180, peak:280, type:'V2',     exhaust:'potato',turbo:false },
    race_car:    { idle:150, mid:500, peak:900, type:'V8',     exhaust:'scream',turbo:false },
    truck:       { idle:55,  mid:160, peak:300, type:'V8',     exhaust:'deep',  turbo:true  },
    atv:         { idle:95,  mid:280, peak:520, type:'V4',     exhaust:'sharp', turbo:false },
    hovercraft:  { idle:180, mid:450, peak:800, type:'turbine',exhaust:'jet',   turbo:false }
  };

  const SFX_CATALOG = {
    // Collectibles
    coin_small:    { freq:880,  type:'sine',   dur:0.08, env:[0,0.01,0.9,0.07] },
    coin_big:      { freq:1046, type:'sine',   dur:0.12, env:[0,0.01,0.9,0.10] },
    diamond:       { freq:1318, type:'triangle',dur:0.18,env:[0,0.01,0.8,0.16] },
    fuel_pickup:   { freq:440,  type:'square', dur:0.15, env:[0,0.02,0.7,0.12] },
    // UI
    btn_click:     { freq:660,  type:'sine',   dur:0.05, env:[0,0.005,0.8,0.04] },
    btn_hover:     { freq:440,  type:'sine',   dur:0.03, env:[0,0.003,0.7,0.02] },
    menu_open:     { freq:528,  type:'sine',   dur:0.15, env:[0,0.01,0.6,0.13] },
    menu_close:    { freq:396,  type:'sine',   dur:0.12, env:[0,0.01,0.5,0.10] },
    // Game events
    crash_light:   { freq:120,  type:'sawtooth',dur:0.3, env:[0,0.005,0.9,0.25] },
    crash_heavy:   { freq:80,   type:'sawtooth',dur:0.6, env:[0,0.005,0.95,0.55]},
    nitro_start:   { freq:220,  type:'sawtooth',dur:0.4, env:[0,0.05,0.8,0.30] },
    nitro_loop:    { freq:180,  type:'sawtooth',dur:999, env:[0,0.1,0.7,0.0]   },
    checkpoint:    { freq:659,  type:'sine',   dur:0.3,  env:[0,0.01,0.9,0.25] },
    level_up:      { freq:523,  type:'sine',   dur:0.6,  env:[0,0.02,0.8,0.50] },
    achievement:   { freq:880,  type:'sine',   dur:0.8,  env:[0,0.02,0.7,0.70] },
    game_over:     { freq:196,  type:'sawtooth',dur:1.2, env:[0,0.05,0.9,1.10] },
    countdown_3:   { freq:440,  type:'sine',   dur:0.2,  env:[0,0.01,0.9,0.15] },
    countdown_2:   { freq:494,  type:'sine',   dur:0.2,  env:[0,0.01,0.9,0.15] },
    countdown_1:   { freq:523,  type:'sine',   dur:0.2,  env:[0,0.01,0.9,0.15] },
    countdown_go:  { freq:784,  type:'sine',   dur:0.4,  env:[0,0.01,0.9,0.35] },
    // Tricks
    flip_land:     { freq:330,  type:'sine',   dur:0.2,  env:[0,0.01,0.9,0.15] },
    perfect_land:  { freq:659,  type:'triangle',dur:0.3, env:[0,0.01,0.8,0.25] },
    combo_up:      { freq:523,  type:'sine',   dur:0.15, env:[0,0.01,0.8,0.12] },
    combo_break:   { freq:196,  type:'square', dur:0.2,  env:[0,0.005,0.9,0.18]},
    // Extra UI / ambient
    btn_back:      { freq:349,  type:'sine',   dur:0.06, env:[0,0.005,0.7,0.05] },
    notify_ping:   { freq:988,  type:'triangle',dur:0.25,env:[0,0.01,0.8,0.22] },
    error_buzz:    { freq:110,  type:'square', dur:0.18, env:[0,0.004,0.85,0.15]},
    ambient_drip:  { freq:1568, type:'sine',   dur:0.14, env:[0,0.008,0.6,0.12] }
  };

  const REVERB_PRESETS = {
    none:          { decay:0.1, wet:0.0 },
    small_dry:     { decay:0.3, wet:0.1 },
    medium_dry:    { decay:0.6, wet:0.2 },
    medium_wet:    { decay:1.2, wet:0.3 },
    large_open:    { decay:2.5, wet:0.35 },
    large_metal:   { decay:3.0, wet:0.4 },
    cave_large:    { decay:4.0, wet:0.5 },
    outdoor_wet:   { decay:1.8, wet:0.25 },
    outdoor_dry:   { decay:0.8, wet:0.15 },
    urban_echo:    { decay:1.5, wet:0.3 },
    crystal_echo:  { decay:5.0, wet:0.45 }
  };

  function getMapProfile(mapId) { return PROFILES[mapId] || PROFILES.map_city; }
  function getEngineSound(vehicleId) { return VEHICLE_ENGINE_SOUNDS[vehicleId] || VEHICLE_ENGINE_SOUNDS.jeep; }
  function getSfx(sfxId) { return SFX_CATALOG[sfxId] || null; }
  function getReverb(presetId) { return REVERB_PRESETS[presetId] || REVERB_PRESETS.none; }
  function listSfx() { return Object.keys(SFX_CATALOG); }
  function listMaps() { return Object.keys(PROFILES); }

  function synthesizeSfx(ctx, sfxId, destination) {
    const def = SFX_CATALOG[sfxId];
    if (!def || !ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = def.type;
    osc.frequency.value = def.freq;
    const [initGain, attackTime, sustainGain, releaseTime] = def.env;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(initGain, now);
    gain.gain.linearRampToValueAtTime(sustainGain, now + attackTime);
    gain.gain.linearRampToValueAtTime(0, now + attackTime + releaseTime);
    osc.connect(gain);
    gain.connect(destination || ctx.destination);
    osc.start(now);
    osc.stop(now + def.dur);
  }

  return { getMapProfile, getEngineSound, getSfx, getReverb, listSfx, listMaps, synthesizeSfx,
           PROFILES, VEHICLE_ENGINE_SOUNDS, SFX_CATALOG, REVERB_PRESETS };
})();

// ================================================================
// AUDIO_TIMELINE — Sync audio events to game timeline
// ================================================================
const AUDIO_TIMELINE = (() => {
  const _events = [];
  let _tick = 0;

  function schedule(tick, sfxId, params) {
    _events.push({ tick, sfxId, params: params || {}, fired: false });
    _events.sort((a,b) => a.tick - b.tick);
  }

  function advance(newTick, fireCallback) {
    const toFire = _events.filter(e => !e.fired && e.tick <= newTick);
    toFire.forEach(e => { e.fired = true; if (fireCallback) fireCallback(e); });
    _tick = newTick;
    // Purge old fired events
    if (_events.length > 200) {
      const cutoff = _tick - 300;
      while (_events.length > 0 && _events[0].fired && _events[0].tick < cutoff) _events.shift();
    }
  }

  function clear() { _events.length = 0; _tick = 0; }
  function pending() { return _events.filter(e => !e.fired).length; }
  function currentTick() { return _tick; }

  // Preset timeline patterns
  function scheduleCountdown(startTick, ticksPerSecond) {
    const tps = ticksPerSecond || 60;
    schedule(startTick,            'countdown_3', {});
    schedule(startTick + tps,      'countdown_2', {});
    schedule(startTick + tps*2,    'countdown_1', {});
    schedule(startTick + tps*3,    'countdown_go',{});
  }

  function scheduleVictoryFanfare(startTick) {
    const notes = ['countdown_go','level_up','achievement'];
    notes.forEach((n,i) => schedule(startTick + i*15, n, {}));
  }

  return { schedule, advance, clear, pending, currentTick, scheduleCountdown, scheduleVictoryFanfare };
})();

// ================================================================
// AUDIO_CONFIG_STORE — Persist audio settings
// ================================================================
const AUDIO_CONFIG_STORE = (() => {
  const KEY = 'ahmet_audio_config';
  const DEFAULTS = {
    masterVolume: 0.8, musicVolume: 0.7, sfxVolume: 0.9,
    ambientVolume: 0.6, engineVolume: 0.85, voiceVolume: 0.9,
    monoMode: false, muteOnFocusLoss: true, dynamicRange: 'normal',
    eqPreset: 'flat', reverbEnabled: true, dopplerEnabled: true
  };

  function load() {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch(e) { return { ...DEFAULTS }; }
  }

  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...cfg })); } catch(e) {}
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch(e) {}
    return { ...DEFAULTS };
  }

  function get(key) { return load()[key]; }
  function set(key, val) { const c = load(); c[key] = val; save(c); }

  const EQ_PRESETS = {
    flat:     [0,0,0,0,0],
    bass:     [6,4,0,-2,-2],
    treble:   [-2,-1,0,4,6],
    vocal:    [-2,0,4,2,-1],
    loudness: [4,2,0,2,4],
    rock:     [4,2,0,2,3],
    classical:[-2,0,0,3,4]
  };

  function getEqPreset(name) { return EQ_PRESETS[name] || EQ_PRESETS.flat; }
  function listEqPresets() { return Object.keys(EQ_PRESETS); }

  return { load, save, reset, get, set, getEqPreset, listEqPresets, DEFAULTS };
})();


// ================================================================
// AUDIO_REVERB_ZONES — Area-based reverb/echo effects
// ================================================================
const AUDIO_REVERB_ZONES = (() => {
  const ZONE_TYPES = {
    tunnel:     { wet:0.8,  decay:1.8,  preDelay:0.02, eq_low:1.2, eq_high:0.7 },
    cave:       { wet:0.9,  decay:3.5,  preDelay:0.04, eq_low:1.4, eq_high:0.5 },
    outdoor:    { wet:0.1,  decay:0.6,  preDelay:0.01, eq_low:1.0, eq_high:1.0 },
    stadium:    { wet:0.6,  decay:2.0,  preDelay:0.03, eq_low:1.1, eq_high:0.9 },
    desert:     { wet:0.05, decay:0.3,  preDelay:0.0,  eq_low:0.8, eq_high:1.2 },
    forest:     { wet:0.2,  decay:0.8,  preDelay:0.01, eq_low:1.1, eq_high:0.8 },
    underwater: { wet:0.95, decay:2.5,  preDelay:0.05, eq_low:1.5, eq_high:0.3 },
    space:      { wet:1.0,  decay:8.0,  preDelay:0.1,  eq_low:0.5, eq_high:0.5 },
    room:       { wet:0.3,  decay:0.9,  preDelay:0.01, eq_low:1.0, eq_high:1.0 },
  };

  const _zones  = [];
  let   _current = 'outdoor';
  let   _target  = 'outdoor';
  let   _blend   = 1.0;
  const BLEND_SPEED = 0.5; // blend speed per second

  function addZone(x, width, type) {
    _zones.push({ x, width, type });
  }

  function update(vehicleX, dt) {
    let inZone = false;
    for (const z of _zones) {
      if (vehicleX >= z.x && vehicleX <= z.x + z.width) {
        if (_target !== z.type) { _target=z.type; _blend=0; }
        inZone = true;
        break;
      }
    }
    if (!inZone && _target !== 'outdoor') { _target='outdoor'; _blend=0; }
    _blend = Math.min(1, _blend + dt * BLEND_SPEED);
    if (_blend >= 1) _current = _target;
  }

  function getEffects() {
    const c = ZONE_TYPES[_current]    || ZONE_TYPES.outdoor;
    const t = ZONE_TYPES[_target]     || ZONE_TYPES.outdoor;
    const b = _blend;
    function lerp(a,v){ return c[a]+(t[a]-c[a])*b; }
    return { wet:lerp('wet'), decay:lerp('decay'), preDelay:lerp('preDelay'), eq_low:lerp('eq_low'), eq_high:lerp('eq_high'), zone:_current, blending:_blend<1 };
  }

  function getCurrentZone() { return _current; }
  function clear() { _zones.length=0; }

  return { addZone, update, getEffects, getCurrentZone, clear, ZONE_TYPES };
})();

// ================================================================
// AUDIO_MUSIC_TRANSITIONS — Seamless music crossfade system
// ================================================================
const AUDIO_MUSIC_TRANSITIONS = (() => {
  let _trackA    = null;  // {id, audio, volume}
  let _trackB    = null;
  let _active    = 'A';   // which track is "playing"
  let _crossfade = 1.0;   // 0=fully A, 1=fully B (during transition)
  let _transitioning = false;
  let _transitionDuration = 2.0;
  let _elapsed   = 0;

  const _tracks = {}; // id -> config

  function defineTrack(id, src, loopStart, loopEnd, bpm, key) {
    _tracks[id] = { id, src, loopStart:loopStart||0, loopEnd:loopEnd||0, bpm:bpm||120, key:key||'C' };
  }

  function play(id, targetVolume, fadeDuration) {
    const cfg = _tracks[id];
    if (!cfg) return;
    if (_active==='A' && _trackA?.id===id) return; // already playing
    if (_active==='B' && _trackB?.id===id) return;

    const newTrack = { id, volume:0, targetVolume:targetVolume||1.0 };
    if (_active === 'A') {
      _trackB = newTrack;
      _active = 'B';
    } else {
      _trackA = newTrack;
      _active = 'A';
    }
    _transitioning = true;
    _transitionDuration = fadeDuration||2.0;
    _elapsed = 0;
  }

  function stop(fadeDuration) {
    _transitioning = true;
    _transitionDuration = fadeDuration||1.5;
    _elapsed = 0;
    if (_active === 'A') { if(_trackA) _trackA.targetVolume = 0; }
    else                 { if(_trackB) _trackB.targetVolume = 0; }
  }

  function update(dt) {
    if (!_transitioning) return;
    _elapsed += dt;
    const t = Math.min(1, _elapsed/_transitionDuration);
    const eased = t*t*(3-2*t); // smoothstep

    // Crossfade volumes
    if (_active === 'B') {
      if (_trackA) _trackA.volume = Math.max(0, (_trackA.targetVolume||0) * (1-eased));
      if (_trackB) _trackB.volume = (_trackB.targetVolume||1) * eased;
    } else {
      if (_trackB) _trackB.volume = Math.max(0, (_trackB.targetVolume||0) * (1-eased));
      if (_trackA) _trackA.volume = (_trackA.targetVolume||1) * eased;
    }

    if (_elapsed >= _transitionDuration) {
      _transitioning = false;
      // Kill inactive track
      if (_active === 'B') _trackA = null;
      else                 _trackB = null;
    }
  }

  function getVolumes() {
    return {
      A: _trackA ? { id:_trackA.id, volume:_trackA.volume } : null,
      B: _trackB ? { id:_trackB.id, volume:_trackB.volume } : null,
      transitioning:_transitioning,
      active:_active
    };
  }

  function getCurrentTrack() {
    return _active==='A' ? _trackA : _trackB;
  }

  // Context-based track selection
  function selectForContext(context) {
    const MAP = {
      menu:      'menu_theme',
      race:      'race_drive',
      race_fast: 'race_intense',
      win:       'victory_fanfare',
      lose:      'defeat_ambient',
      shop:      'shop_chill',
      boss:      'boss_battle',
      night:     'night_ambient',
      snow:      'snow_ambient',
    };
    return MAP[context] || 'menu_theme';
  }

  // Register default tracks
  ['menu_theme','race_drive','race_intense','victory_fanfare','defeat_ambient','shop_chill','boss_battle','night_ambient','snow_ambient'].forEach((id,i)=>{
    defineTrack(id, null, 0, 0, 120+i*5, 'C');
  });

  return { defineTrack, play, stop, update, getVolumes, getCurrentTrack, selectForContext, _tracks };
})();

// ================================================================
// AUDIO_DYNAMIC_MUSIC — Adaptive music system (intensity-based)
// ================================================================
const AUDIO_DYNAMIC_MUSIC = (() => {
  let _intensity = 0;  // 0-1
  let _prevIntensity = 0;
  let _updateTimer = 0;
  const UPDATE_INTERVAL = 0.5; // seconds

  const INTENSITY_SOURCES = {
    speed:       { weight:0.4, max:200 },  // km/h
    airtime:     { weight:0.2, max:5   },  // seconds in air
    proximity:   { weight:0.2, max:1   },  // 0-1 close to obstacles
    combo:       { weight:0.1, max:20  },  // trick combo count
    health:      { weight:0.1, max:100 },  // inversely: low health = high intensity
  };

  let _inputs = { speed:0, airtime:0, proximity:0, combo:0, health:100 };

  function setInput(source, value) { _inputs[source] = value; }

  function update(dt) {
    _updateTimer += dt;
    if (_updateTimer < UPDATE_INTERVAL) return;
    _updateTimer = 0;

    let total = 0;
    for (const [k, cfg] of Object.entries(INTENSITY_SOURCES)) {
      let v = _inputs[k]||0;
      if (k==='health') v = cfg.max - v; // invert: low health = high intensity
      total += Math.min(1, v/cfg.max) * cfg.weight;
    }
    _prevIntensity = _intensity;
    _intensity = Math.max(0, Math.min(1, total));
  }

  function getIntensity() { return _intensity; }

  function getLayer() {
    if (_intensity < 0.2) return 'calm';
    if (_intensity < 0.5) return 'normal';
    if (_intensity < 0.75)return 'tense';
    return 'intense';
  }

  function getLayerVolumes() {
    const i = _intensity;
    return {
      drums:     Math.min(1, i*2),
      bass:      Math.min(1, Math.max(0,(i-0.1)*1.5)),
      melody:    Math.min(1, Math.max(0,(i-0.3)*2)),
      lead:      Math.min(1, Math.max(0,(i-0.6)*3)),
      ambience:  Math.max(0, 1-i*1.5),
    };
  }

  function getStemMix() {
    const layer = getLayer();
    const mixes = {
      calm:    { drums:0.3, bass:0.2, melody:0.8, lead:0.0, ambience:1.0 },
      normal:  { drums:0.7, bass:0.6, melody:1.0, lead:0.3, ambience:0.4 },
      tense:   { drums:1.0, bass:0.9, melody:0.8, lead:0.8, ambience:0.2 },
      intense: { drums:1.0, bass:1.0, melody:0.6, lead:1.0, ambience:0.0 },
    };
    return mixes[layer];
  }

  return { setInput, update, getIntensity, getLayer, getLayerVolumes, getStemMix, INTENSITY_SOURCES };
})();
