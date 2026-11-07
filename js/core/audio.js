// All sound is synthesised with the Web Audio API: no audio files to license or fail to load.
//
// Music: four original folk-style pieces written for this project, scheduled live.
//   calm      "Ao Làng"   (Village Pond)    – unhurried, đàn bầu lead over đàn tranh
//   festival  "Hội Làng"  (Village Festival) – bright and bouncy, sáo (bamboo flute) lead, lots of mõ
//   battle    "Tỉ Thí"    (The Contest)     – fast and driving: war-drum rolls, cymbal crashes, tremolo strings
//   night     "Đêm Trăng" (Moonlit Night)   – slow and sparse, đàn bầu with a gong
// Calm, festival and night use the C D F G A five-note scale common in northern Vietnamese folk
// music; the battle piece centres the same idea on A (A C D E G) for a darker colour.
//
// Effects: only water sounds: splash (jump / landing / water play), plunge + bubbles (dive),
// and a continuous swirl whose loudness follows how fast a puppet spins in the water.

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const C_SCALE = [60, 62, 65, 67, 69, 72, 74, 77, 79, 81];   // C4 D4 F4 G4 A4 C5 D5 F5 G5 A5
const A_SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];   // A3 C4 D4 E4 G4 A4 C5 D5 E5 G5

// Each section: [melody [[degree, beats]...], roots (one MIDI note per 4-beat bar), options]
const SONGS = {
  calm: {
    title: 'Ao Làng · Village Pond', bpm: 80, scale: C_SCALE, lead: 'bau', comp: 'arp', perc: 'calm',
    sections: [
      [[[5, 2], [4, 1], [3, 1], [4, 2], [2, 2], [3, 1], [4, 1], [5, 1], [6, 1], [5, 4], [7, 2], [6, 1], [5, 1], [4, 2], [3, 1], [4, 1], [2, 1], [3, 1], [1, 1], [2, 1], [0, 4]],
        [48, 53, 53, 48, 55, 53, 55, 48]],
      [[[7, 1], [8, 1], [7, 1], [5, 1], [6, 2], [5, 2], [4, 1], [5, 1], [6, 1], [7, 1], [8, 4], [9, 2], [8, 1], [7, 1], [6, 1], [5, 1], [4, 2], [3, 1], [4, 1], [2, 2], [0, 4]],
        [55, 53, 53, 48, 53, 48, 55, 48]],
    ],
  },
  festival: {
    title: 'Hội Làng · Village Festival', bpm: 112, scale: C_SCALE, lead: 'sao', comp: 'arp', perc: 'festival',
    sections: [
      [[[5, 1], [5, 0.5], [6, 0.5], [7, 1], [5, 1], [4, 1], [5, 1], [3, 2], [4, 0.5], [5, 0.5], [4, 0.5], [3, 0.5], [2, 1], [3, 1], [4, 4],
        [7, 1], [7, 0.5], [8, 0.5], [9, 1], [7, 1], [6, 1], [7, 1], [5, 2], [4, 0.5], [3, 0.5], [2, 0.5], [1, 0.5], [2, 1], [3, 1], [0, 4]],
        [48, 48, 53, 55, 48, 53, 55, 48]],
      [[[9, 2], [8, 1], [7, 1], [8, 1], [7, 1], [5, 2], [6, 1], [7, 0.5], [6, 0.5], [5, 1], [4, 1], [5, 4],
        [4, 1], [5, 1], [7, 1], [5, 1], [4, 1], [3, 1], [2, 2], [3, 0.5], [4, 0.5], [3, 0.5], [2, 0.5], [1, 1], [2, 1], [0, 4]],
        [53, 55, 53, 48, 53, 55, 55, 48]],
    ],
  },
  battle: {
    title: 'Tỉ Thí · The Contest', bpm: 138, scale: A_SCALE, lead: 'sao', comp: 'tremolo', perc: 'battle',
    sections: [
      [[[5, 0.5], [5, 0.5], [7, 0.5], [5, 0.5], [8, 1], [7, 1], [6, 0.5], [6, 0.5], [5, 0.5], [4, 0.5], [5, 2],
        [5, 0.5], [5, 0.5], [7, 0.5], [8, 0.5], [9, 1], [8, 1], [7, 0.5], [6, 0.5], [5, 0.5], [4, 0.5], [3, 1], [5, 1]],
        [45, 45, 50, 52]],
      [[[9, 1], [8, 0.5], [7, 0.5], [8, 1], [9, 1], [7, 0.5], [8, 0.5], [7, 0.5], [5, 0.5], [6, 2],
        [4, 0.5], [5, 0.5], [6, 0.5], [7, 0.5], [8, 0.5], [7, 0.5], [6, 0.5], [5, 0.5], [4, 1], [3, 1], [0, 2]],
        [45, 50, 52, 45]],
    ],
  },
  // Deliberately unlike "Village Pond": a sad A-centred scale, a low breathy bamboo flute instead
  // of the đàn bầu, a held drone underneath, sparse zither, crickets and a gong.
  night: {
    title: 'Đêm Trăng · Moonlit Night', bpm: 56, scale: A_SCALE, lead: 'sao', leadShift: 0, comp: 'drone', perc: 'night',
    sections: [
      [[[5, 3], [4, 1], [3, 2], [2, 1], [3, 1], [1, 4], [2, 2], [3, 2], [5, 2], [6, 1], [5, 1], [4, 3], [3, 1], [2, 2], [1, 1], [2, 1], [0, 4]],
        [45, 50, 45, 52, 48, 50, 52, 45]],
    ],
  },
};

function compose(song) {
  const ev = [];
  let beat = 0;
  const order = song.sections.length > 1 ? [0, 1, 0, 1] : [0, 0];
  order.forEach((si, pass) => {
    const [melody, roots] = song.sections[si];
    const start = beat;
    for (const [deg, len] of melody) {
      // the second time through a calm/night tune, strings answer alone in the first two bars
      const rest = pass === 2 && song.perc === 'calm' && beat - start < 8;
      const shift = song.leadShift ?? (song.lead === 'sao' ? 12 : 0);
      if (!rest) ev.push({ beat, kind: song.lead, midi: song.scale[deg] + shift, dur: len * 60 / song.bpm, short: len <= 0.5 });
      beat += len;
    }
    roots.forEach((r, bar) => {
      const b0 = start + bar * 4;
      const last = bar === roots.length - 1;
      if (song.comp === 'arp') {
        const p = bar % 2 ? [0, 7, 12, 14, 12, 7, 12, 7] : [0, 7, 12, 7, 0, 7, 14, 12];
        p.forEach((o, i) => ev.push({ beat: b0 + i * 0.5, kind: 'tranh', midi: r + 12 + o, vel: i % 2 ? 0.55 : 0.8 }));
      } else if (song.comp === 'tremolo') {
        for (let i = 0; i < 16; i++) ev.push({ beat: b0 + i * 0.25, kind: 'tranh', midi: r + 12 + (i % 4 === 2 ? 7 : 0), vel: i % 4 === 0 ? 0.9 : 0.45 });
        ev.push({ beat: b0, kind: 'tranh', midi: r, vel: 1 });
      } else if (song.comp === 'drone') {
        // a held chord the length of the bar, and one or two soft high plucks
        ev.push({ beat: b0, kind: 'pad', midi: r + 12, dur: 4 * 60 / song.bpm });
        ev.push({ beat: b0 + 2, kind: 'tranh', midi: r + 24 + (bar % 2 ? 7 : 12), vel: 0.4 });
        if (bar % 2) ev.push({ beat: b0 + 3.5, kind: 'tranh', midi: r + 31, vel: 0.3 });
      } else {
        [0, 7, 12, 7].forEach((o, i) => ev.push({ beat: b0 + i, kind: 'tranh', midi: r + 12 + o, vel: 0.6 }));
      }
      switch (song.perc) {
        case 'calm':
          ev.push({ beat: b0, kind: 'mo', vel: 1 }, { beat: b0 + 2, kind: 'mo', vel: 0.7 });
          ev.push({ beat: b0 + 1.5, kind: 'songlang' }, { beat: b0 + 3.5, kind: 'songlang' });
          if (bar === 0 || last) ev.push({ beat: b0, kind: 'trong', vel: 0.8 });
          break;
        case 'festival':
          for (let i = 0; i < 4; i++) ev.push({ beat: b0 + i, kind: 'mo', vel: i % 2 ? 0.6 : 1 });
          ev.push({ beat: b0 + 0.5, kind: 'songlang' }, { beat: b0 + 2.5, kind: 'songlang' }, { beat: b0 + 3.5, kind: 'songlang' });
          ev.push({ beat: b0, kind: 'trong', vel: 0.8 }, { beat: b0 + 2, kind: 'trong', vel: 0.6 });
          break;
        case 'battle':
          // war-drum: every beat, double hits on 2 and 4, a roll into each new section
          for (let i = 0; i < 4; i++) ev.push({ beat: b0 + i, kind: 'trong', vel: i % 2 ? 0.7 : 1 });
          ev.push({ beat: b0 + 1.5, kind: 'trong', vel: 0.55 }, { beat: b0 + 3.5, kind: 'trong', vel: 0.55 });
          for (let i = 0; i < 8; i++) ev.push({ beat: b0 + i * 0.5 + 0.25, kind: 'mo', vel: 0.45 });
          if (bar % 2 === 0) ev.push({ beat: b0, kind: 'crash' });
          if (last) for (let i = 0; i < 8; i++) ev.push({ beat: b0 + 2 + i * 0.25, kind: 'trong', vel: 0.4 + i * 0.07 });
          break;
        case 'night':
          if (bar % 4 === 0) ev.push({ beat: b0, kind: 'gong' });
          // crickets chirping now and then
          ev.push({ beat: b0 + 1.5, kind: 'cricket' });
          if (bar % 2 === 0) ev.push({ beat: b0 + 3.25, kind: 'cricket' });
          break;
      }
    });
  });
  ev.sort((a, b) => a.beat - b.beat);
  return { events: ev, length: beat, spb: 60 / song.bpm };
}

const COMPOSED = Object.fromEntries(Object.entries(SONGS).map(([k, s]) => [k, compose(s)]));
export const SONG_TITLES = Object.fromEntries(Object.entries(SONGS).map(([k, s]) => [k, s.title]));

/** Names and short descriptions shown in the music picker. */
export const SONG_INFO = {
  calm: {
    name: 'Village Pond', vi: 'Ao Làng', icon: '🪷',
    desc: 'Unhurried and gentle. A singing đàn bầu over a plucked zither, for everyday scenes.',
  },
  festival: {
    name: 'Village Festival', vi: 'Hội Làng', icon: '🏮',
    desc: 'Bright and bouncy. A bamboo flute leads, with clacking wood blocks and drums.',
  },
  battle: {
    name: 'The Contest', vi: 'Tỉ Thí', icon: '🥁',
    desc: 'Fast and fierce. Rolling war drums, crashing cymbals and trembling strings.',
  },
  night: {
    name: 'Moonlit Night', vi: 'Đêm Trăng', icon: '🌙',
    desc: 'Slow and wistful. A low bamboo flute over a held drone, with crickets and a distant gong.',
  },
};

export class Sound {
  constructor() {
    this.ctx = null;
    this.musicOn = true;
    this.sfxOn = true;
    this.songName = 'calm';
    this.song = COMPOSED.calm;
  }

  /** Must be called from a user gesture (browser autoplay rules). Safe to call repeatedly. */
  unlock() {
    try {
      if (!this.ctx) this.init();
      if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
    } catch (e) {
      this.ctx = null; // audio is optional: the experience works silently
    }
  }

  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no audio');
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? 0.42 : 0;
    // A song's own fader, so tracks can cross-fade
    this.songBus = ctx.createGain();
    this.songBus.gain.value = 1;
    this.songBus.connect(this.musicBus);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.sfxOn ? 1 : 0;
    // A small "hall" reverb for the music, like an indoor theatre
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.2);
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb).connect(wet).connect(this.master);
    this.sfxBus.connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

    this.initSwirl();
    this.startMusic();
  }

  impulse(seconds) {
    const rate = this.ctx.sampleRate, len = rate * seconds;
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  suspend(paused) {
    this.paused = paused;
    if (!this.ctx) return;
    paused ? this.ctx.suspend() : this.ctx.resume();
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(on ? 0.42 : 0, this.ctx.currentTime, 0.2);
  }

  setSfx(on) {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  // ------------------------------------------------------------------ music
  /** Switch to another piece (calm | festival | battle | night) with a short fade. */
  setSong(name) {
    if (!COMPOSED[name] || name === this.songName) return;
    this.songName = name;
    if (!this.ctx) { this.song = COMPOSED[name]; return; }
    const t = this.ctx.currentTime;
    this.songBus.gain.cancelScheduledValues(t);
    this.songBus.gain.setValueAtTime(this.songBus.gain.value, t);
    this.songBus.gain.linearRampToValueAtTime(0, t + 0.35);
    clearTimeout(this.switchTimer);
    this.switchTimer = setTimeout(() => {
      this.song = COMPOSED[name];
      this.idx = 0;
      this.loopStart = this.ctx.currentTime + 0.05;
      this.songBus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.08);
    }, 380);
  }

  startMusic() {
    this.idx = 0;
    this.loopStart = this.ctx.currentTime + 0.3;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  schedule() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const { events, length, spb } = this.song;
    const horizon = this.ctx.currentTime + 0.25;
    // If the tab was frozen for a while, skip ahead instead of firing a burst of notes
    if (this.loopStart + events[this.idx].beat * spb < this.ctx.currentTime - 0.5) {
      this.loopStart = this.ctx.currentTime + 0.1 - events[this.idx].beat * spb;
    }
    for (;;) {
      const e = events[this.idx];
      const t = this.loopStart + e.beat * spb;
      if (t > horizon) break;
      this.play(e, t);
      this.idx++;
      if (this.idx >= events.length) { this.idx = 0; this.loopStart += length * spb; }
    }
  }

  play(e, t) {
    switch (e.kind) {
      case 'bau': return this.bau(t, e.midi, e.dur);
      case 'sao': return this.sao(t, e.midi, e.dur, e.short);
      case 'tranh': return this.tranh(t, e.midi, e.vel);
      case 'mo': return this.mo(t, e.vel);
      case 'songlang': return this.songlang(t);
      case 'trong': return this.trong(t, e.vel);
      case 'crash': return this.crash(t);
      case 'gong': return this.gong(t);
      case 'pad': return this.pad(t, e.midi, e.dur);
      case 'cricket': return this.cricket(t);
    }
  }

  /** Soft held chord (root + fifth, slightly detuned) that swells in and fades: a night drone. */
  pad(t, midi, dur) {
    const c = this.ctx, f = hz(midi);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    g.connect(lp).connect(this.songBus);
    for (const [ratio, det] of [[1, -4], [1, 4], [1.5, 0], [0.5, 0]]) {
      const o = c.createOscillator();
      o.type = ratio === 1 ? 'triangle' : 'sine';
      o.frequency.value = f * ratio;
      o.detune.value = det;
      o.connect(g);
      o.start(t); o.stop(t + dur + 0.7);
    }
  }

  /** A cricket: a few very quick high chirps. */
  cricket(t) {
    const c = this.ctx;
    const n = 3 + Math.floor(Math.random() * 3);
    const f = 4200 + Math.random() * 600;
    for (let i = 0; i < n; i++) {
      const st = t + i * 0.055;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, st);
      g.gain.linearRampToValueAtTime(0.025, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.035);
      o.connect(g).connect(this.songBus);
      o.start(st); o.stop(st + 0.04);
    }
  }

  /** Đàn bầu-like lead: slides up into the note, vibrato grows as the note is held. */
  bau(t, midi, dur) {
    const c = this.ctx, f = hz(midi);
    const o = c.createOscillator();
    const o2 = c.createOscillator();
    o.type = 'sine'; o2.type = 'sine';
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.13);
    o2.frequency.setValueAtTime(f * 2 * 0.94, t);
    o2.frequency.exponentialRampToValueAtTime(f * 2, t + 0.13);
    const vib = c.createOscillator(); vib.frequency.value = 5.2;
    const vibAmt = c.createGain();
    vibAmt.gain.setValueAtTime(0, t);
    vibAmt.gain.linearRampToValueAtTime(f * 0.013, t + Math.min(dur, 0.6));
    vib.connect(vibAmt); vibAmt.connect(o.frequency); vibAmt.connect(o2.frequency);
    const h = c.createGain(); h.gain.value = 0.12;
    const g = c.createGain();
    const end = t + dur;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.16, end);
    g.gain.exponentialRampToValueAtTime(0.0008, end + 0.35);
    if (dur > 1.1) o.frequency.setTargetAtTime(f * 0.985, end - 0.1, 0.1);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    o.connect(g); o2.connect(h).connect(g);
    g.connect(lp).connect(this.songBus);
    for (const n of [o, o2, vib]) { n.start(t); n.stop(end + 0.4); }
  }

  /** Sáo (bamboo flute): breathy, scoops up into the note, delayed vibrato. */
  sao(t, midi, dur, short) {
    const c = this.ctx, f = hz(midi);
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(f * 0.97, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f;
    const vib = c.createOscillator(); vib.frequency.value = 5.6;
    const vibAmt = c.createGain();
    vibAmt.gain.setValueAtTime(0, t);
    vibAmt.gain.linearRampToValueAtTime(short ? 0 : f * 0.01, t + Math.min(dur, 0.4));
    vib.connect(vibAmt); vibAmt.connect(o.frequency); vibAmt.connect(o2.frequency);
    const g = c.createGain();
    const end = t + dur * (short ? 0.85 : 0.97);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.14, t + 0.03);
    g.gain.setValueAtTime(0.12, end - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0008, end + 0.12);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    o.connect(g); o2.connect(g);
    g.connect(lp).connect(this.songBus);
    // breath noise
    const s = c.createBufferSource(); s.buffer = this.noise;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.05, t);
    ng.gain.exponentialRampToValueAtTime(0.008, t + 0.12);
    ng.gain.exponentialRampToValueAtTime(0.0008, end + 0.1);
    s.connect(bp).connect(ng).connect(this.songBus);
    s.start(t, Math.random()); s.stop(end + 0.15);
    for (const n of [o, o2, vib]) { n.start(t); n.stop(end + 0.15); }
  }

  /** Đàn tranh-like pluck. */
  tranh(t, midi, vel = 0.7) {
    const c = this.ctx, f = hz(midi);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
    const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.005;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.11 * vel, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1);
    const h = c.createGain(); h.gain.value = 0.35;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(4200, t);
    lp.frequency.exponentialRampToValueAtTime(900, t + 0.6);
    o.connect(g); o2.connect(h).connect(g);
    g.connect(lp).connect(this.songBus);
    o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  }

  /** Mõ: hollow wooden knock. */
  mo(t, vel = 1) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1180, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.06);
    const g = c.createGain();
    g.gain.setValueAtTime(0.18 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.09);
    o.connect(g).connect(this.songBus);
    o.start(t); o.stop(t + 0.1);
  }

  /** Song lang: short double click of the clapper. */
  songlang(t) {
    const c = this.ctx;
    for (const dt of [0, 0.045]) {
      const s = c.createBufferSource(); s.buffer = this.noise;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.25, t + dt);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dt + 0.03);
      s.connect(bp).connect(g).connect(this.songBus);
      s.start(t + dt, Math.random()); s.stop(t + dt + 0.04);
    }
  }

  /** Trống: low drum with a skin "thump". */
  trong(t, vel = 1) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(125, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.28);
    const g = c.createGain();
    g.gain.setValueAtTime(0.55 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
    o.connect(g).connect(this.songBus);
    o.start(t); o.stop(t + 0.6);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.25 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
    s.connect(lp).connect(ng).connect(this.songBus);
    s.start(t, Math.random()); s.stop(t + 0.1);
  }

  /** Chập chõa (small cymbals): bright crash. */
  crash(t) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 1.0);
    s.connect(hp).connect(g).connect(this.songBus);
    s.start(t, Math.random()); s.stop(t + 1.05);
  }

  /** Cồng (gong): low tone with a slow shimmer. */
  gong(t) {
    const c = this.ctx;
    for (const [f, v] of [[98, 0.22], [98 * 2.76, 0.06], [98 * 1.5, 0.05]]) {
      const o = c.createOscillator(); o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 3.5);
      o.connect(g).connect(this.songBus);
      o.start(t); o.stop(t + 3.6);
    }
  }

  // ------------------------------------------------------------------ water
  ok() { return this.ctx && this.ctx.state === 'running'; }

  noiseBurst(t, { type = 'bandpass', from, to, q = 0.8, peak, attack = 0.01, decay }) {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t);
    f.frequency.exponentialRampToValueAtTime(to, t + decay);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random()); s.stop(t + decay + 0.05);
  }

  /** A single water drop / bubble "blip". */
  blip(t, from, to, vol, len = 0.06) {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + len);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + len * 1.3);
    o.connect(g).connect(this.sfxBus);
    o.start(t); o.stop(t + len * 1.4);
  }

  /** Splash: body of white noise + low slap + falling droplets. */
  splash(strength = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    const s = Math.min(1.6, strength);
    this.noiseBurst(t, { from: 2600, to: 600, peak: 0.25 + 0.35 * s, decay: 0.3 + 0.35 * s });
    this.noiseBurst(t, { type: 'lowpass', from: 700, to: 150, q: 0.5, peak: 0.35 * s, decay: 0.18 + 0.1 * s });
    const drops = Math.round(3 + 6 * s);
    for (let i = 0; i < drops; i++) {
      const dt = 0.12 + Math.random() * (0.5 + 0.3 * s);
      this.blip(t + dt, 1400 + Math.random() * 1800, 500 + Math.random() * 300, 0.05 + Math.random() * 0.05, 0.04);
    }
  }

  /** Plunge: deep "bloop" as the puppet goes under, then rising bubbles. */
  plunge(strength = 1) {
    if (!this.ok()) return;
    const t = this.ctx.currentTime;
    this.blip(t, 380, 85, 0.45 * strength, 0.28);
    this.noiseBurst(t, { type: 'lowpass', from: 1500, to: 180, q: 0.7, peak: 0.4 * strength, decay: 0.5 });
    for (let i = 0; i < 9; i++) {
      const dt = 0.15 + Math.random() * 0.8;
      this.blip(t + dt, 300 + Math.random() * 200, 700 + Math.random() * 500, 0.06 + Math.random() * 0.05, 0.05);
    }
  }

  /** Emerge: water pouring off the puppet as it rises. */
  emerge(strength = 1) {
    if (!this.ok()) return;
    this.splash(0.7 * strength);
    const t = this.ctx.currentTime;
    this.noiseBurst(t + 0.05, { from: 1800, to: 900, peak: 0.12, attack: 0.08, decay: 0.9 });
    for (let i = 0; i < 10; i++) this.blip(t + 0.3 + i * 0.09 + Math.random() * 0.05, 1600 + Math.random() * 1200, 600, 0.04, 0.035);
  }

  /** Continuous swirl: band-passed noise with a churning filter; loudness set every frame. */
  initSwirl() {
    const c = this.ctx;
    const s = c.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.4;
    const lfo = c.createOscillator(); lfo.frequency.value = 3;
    const lfoAmt = c.createGain(); lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt).connect(bp.frequency);
    const trem = c.createOscillator(); trem.frequency.value = 7;
    const tremAmt = c.createGain(); tremAmt.gain.value = 0;
    const g = c.createGain(); g.gain.value = 0;
    trem.connect(tremAmt).connect(g.gain);
    s.connect(bp).connect(g).connect(this.sfxBus);
    s.start(); lfo.start(); trem.start();
    this.swirlNodes = { g, lfo, tremAmt, bp };
  }

  /** amount 0..1 */
  setSwirl(amount) {
    if (!this.ok() || !this.swirlNodes) return;
    const { g, lfo, tremAmt, bp } = this.swirlNodes;
    const t = this.ctx.currentTime;
    const a = Math.max(0, Math.min(1, amount));
    g.gain.setTargetAtTime(a * 0.4, t, 0.08);
    tremAmt.gain.setTargetAtTime(a * 0.12, t, 0.08);
    lfo.frequency.setTargetAtTime(2 + a * 5, t, 0.1);
    bp.frequency.setTargetAtTime(450 + a * 500, t, 0.1);
  }
}
