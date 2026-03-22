/* ============================================
   Audio System — Web Audio API
   Procedural BGM + SFX
   ============================================ */

const GameAudio = (() => {
  let ctx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let isMuted = false;
  let bgmPlaying = false;
  let bgmTimeout = null;

  function init() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.6;
    masterGain.connect(ctx.destination);

    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.25;
    bgmGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  // --- Instrument: Xylophone / bell (bright melody) ---
  function playNote(freq, time, duration, gain) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    // Shimmer overtone
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(gain * 0.2, time);
    g2.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.5);
    osc2.connect(g2);
    g2.connect(bgmGain);
    osc2.start(time);
    osc2.stop(time + duration);

    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  // --- Instrument: Warm pad (sustained chords) ---
  function playPad(freq, time, duration, gain) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.15);
    g.gain.setValueAtTime(gain, time + duration - 0.2);
    g.gain.linearRampToValueAtTime(0.001, time + duration);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // --- Instrument: Soft bass (rounded) ---
  function playBass(freq, time, duration, gain) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(300, time);
    osc.connect(filter);
    filter.connect(g);
    g.connect(bgmGain);
    osc.start(time);
    osc.stop(time + duration + 0.01);
  }

  // --- Instrument: Soft percussion ---
  function playKick(time, gain) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc.connect(g);
    g.connect(bgmGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  function playHihat(time, gain) {
    if (!ctx) return;
    const bufLen = ctx.sampleRate * 0.04;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.15));
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6000, time);
    src.connect(hp);
    hp.connect(g);
    g.connect(bgmGain);
    src.start(time);
  }

  // =============================================
  // ADVENTURE BGM — Multi-layered procedural music
  // =============================================
  let bgmTimeouts = [];

  function playBGM() {
    if (!ctx || bgmPlaying) return;
    bgmPlaying = true;

    // Musical constants
    const BPM = 120;
    const beat = 60 / BPM; // 0.5s per beat
    const bar = beat * 4;  // 2s per bar

    // Key of C major / A minor pentatonic for warm adventure feel
    // C4=261.63, D4=293.66, E4=329.63, F4=349.23, G4=392.00, A4=440, B4=493.88
    // C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880

    // Adventure melodies — uplifting, moving forward
    const melodies = [
      // Theme A: Rising call to adventure
      [
        { f: 523.25, d: 0.75 }, { f: 587.33, d: 0.25 },
        { f: 659.25, d: 0.5 }, { f: 783.99, d: 0.5 },
        { f: 880.00, d: 1.0 },
        { f: 783.99, d: 0.5 }, { f: 659.25, d: 0.5 },
        { f: 783.99, d: 1.0 }, { f: 659.25, d: 1.5 },
        { f: 0, d: 0.5 },
      ],
      // Theme B: Playful exploration
      [
        { f: 659.25, d: 0.25 }, { f: 783.99, d: 0.25 },
        { f: 880.00, d: 0.5 }, { f: 783.99, d: 0.25 },
        { f: 659.25, d: 0.25 }, { f: 523.25, d: 0.5 },
        { f: 587.33, d: 0.5 }, { f: 659.25, d: 1.0 },
        { f: 523.25, d: 0.75 }, { f: 587.33, d: 0.25 },
        { f: 659.25, d: 0.5 }, { f: 880.00, d: 0.5 },
        { f: 783.99, d: 1.5 }, { f: 0, d: 0.5 },
      ],
      // Theme C: Triumphant / determined
      [
        { f: 783.99, d: 0.5 }, { f: 880.00, d: 0.5 },
        { f: 1046.50, d: 1.0 }, { f: 880.00, d: 0.5 },
        { f: 783.99, d: 0.5 }, { f: 659.25, d: 1.0 },
        { f: 783.99, d: 0.5 }, { f: 659.25, d: 0.5 },
        { f: 587.33, d: 0.5 }, { f: 523.25, d: 0.5 },
        { f: 587.33, d: 1.0 }, { f: 0, d: 0.5 },
      ],
      // Theme D: Gentle wonder
      [
        { f: 440.00, d: 0.5 }, { f: 523.25, d: 0.5 },
        { f: 659.25, d: 1.0 }, { f: 587.33, d: 0.5 },
        { f: 523.25, d: 0.5 }, { f: 440.00, d: 1.0 },
        { f: 523.25, d: 0.5 }, { f: 659.25, d: 0.5 },
        { f: 783.99, d: 1.0 }, { f: 659.25, d: 1.0 },
        { f: 0, d: 0.5 },
      ],
    ];

    // Chord progressions (root notes for pads)
    const chordSets = [
      // I - V - vi - IV  (C G Am F)
      [
        { root: 261.63, third: 329.63, fifth: 392.00 },
        { root: 392.00, third: 493.88, fifth: 587.33 },
        { root: 440.00, third: 523.25, fifth: 659.25 },
        { root: 349.23, third: 440.00, fifth: 523.25 },
      ],
      // I - IV - V - I  (C F G C)
      [
        { root: 261.63, third: 329.63, fifth: 392.00 },
        { root: 349.23, third: 440.00, fifth: 523.25 },
        { root: 392.00, third: 493.88, fifth: 587.33 },
        { root: 261.63, third: 329.63, fifth: 392.00 },
      ],
    ];

    // Bass patterns
    const bassPatterns = [
      // Walking bass
      (root, t) => {
        playBass(root, t, beat * 0.9, 0.18);
        playBass(root * 1.25, t + beat, beat * 0.9, 0.14);
        playBass(root * 1.5, t + beat * 2, beat * 0.9, 0.14);
        playBass(root * 1.25, t + beat * 3, beat * 0.9, 0.14);
      },
      // Rhythmic bass
      (root, t) => {
        playBass(root, t, beat * 0.4, 0.2);
        playBass(root, t + beat * 0.5, beat * 0.3, 0.1);
        playBass(root, t + beat * 2, beat * 0.4, 0.18);
        playBass(root * 1.5, t + beat * 3, beat * 0.6, 0.14);
      },
    ];

    let melodyIdx = 0;
    let chordIdx = 0;

    function playSection() {
      if (!bgmPlaying || !ctx) return;
      const now = ctx.currentTime + 0.05;

      const melody = melodies[melodyIdx % melodies.length];
      const chords = chordSets[chordIdx % chordSets.length];
      const bassPattern = bassPatterns[melodyIdx % bassPatterns.length];

      // --- Layer 1: Melody (xylophone) ---
      let melodyTime = 0;
      melody.forEach(note => {
        if (note.f > 0) {
          playNote(note.f, now + melodyTime * beat, note.d * beat * 0.9, 0.28);
        }
        melodyTime += note.d;
      });

      const sectionLen = Math.max(melodyTime * beat, bar * 4);

      // --- Layer 2: Pad chords (warm sustained) ---
      chords.forEach((chord, ci) => {
        const ct = now + ci * bar;
        playPad(chord.root * 0.5, ct, bar * 0.95, 0.06);
        playPad(chord.third * 0.5, ct, bar * 0.95, 0.04);
        playPad(chord.fifth * 0.5, ct, bar * 0.95, 0.04);
      });

      // --- Layer 3: Bass ---
      chords.forEach((chord, ci) => {
        bassPattern(chord.root * 0.5, now + ci * bar);
      });

      // --- Layer 4: Arpeggio sparkles ---
      chords.forEach((chord, ci) => {
        const at = now + ci * bar;
        const arpNotes = [chord.root, chord.third, chord.fifth, chord.third];
        arpNotes.forEach((an, ai) => {
          playNote(an * 2, at + ai * beat, beat * 0.3, 0.08);
        });
      });

      // --- Layer 5: Soft percussion ---
      for (let b = 0; b < 4; b++) {
        const bt = now + b * bar;
        // Kick on beats 1 and 3
        playKick(bt, 0.1);
        playKick(bt + beat * 2, 0.08);
        // Hi-hat on every beat
        for (let h = 0; h < 4; h++) {
          playHihat(bt + h * beat, 0.04);
          // Off-beat hi-hat (quieter, gives swing)
          playHihat(bt + h * beat + beat * 0.5, 0.02);
        }
      }

      melodyIdx++;
      if (melodyIdx % 2 === 0) chordIdx++;

      const tid = setTimeout(playSection, sectionLen * 1000 + 200);
      bgmTimeouts.push(tid);
    }

    playSection();
  }

  function stopBGM() {
    bgmPlaying = false;
    bgmTimeouts.forEach(t => clearTimeout(t));
    bgmTimeouts = [];
    if (bgmTimeout) {
      clearTimeout(bgmTimeout);
      bgmTimeout = null;
    }
  }

  // 뾰로롱 collect sound
  function playCollect() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [784, 988, 1175, 1568];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      g.gain.setValueAtTime(0.35, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(g);
      g.connect(sfxGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  }

  // Soft footstep
  function playStep() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    source.connect(filter);
    filter.connect(g);
    g.connect(sfxGain);
    source.start(now);
  }

  // Dialog bloop
  function playBloop() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  // Victory fanfare
  function playFanfare() {
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => {
      playNote(f, now + i * 0.2, 0.5, 0.4);
    });
  }

  // Nature ambience: gentle water noise (with fade in/out)
  let waterSource = null;
  let waterGain = null;
  let waterActive = false;

  function startWaterAmbience() {
    if (!ctx || waterActive) return;
    waterActive = true;

    if (!waterSource) {
      const bufferSize = ctx.sampleRate * 3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2 + white * 0.5362) * 0.02;
      }
      waterSource = ctx.createBufferSource();
      waterSource.buffer = buffer;
      waterSource.loop = true;
      waterGain = ctx.createGain();
      waterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      waterSource.connect(filter);
      filter.connect(waterGain);
      waterGain.connect(bgmGain);
      waterSource.start();
    }
    // Fade in
    waterGain.gain.cancelScheduledValues(ctx.currentTime);
    waterGain.gain.setValueAtTime(waterGain.gain.value, ctx.currentTime);
    waterGain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 1.5);
  }

  function stopWaterAmbience() {
    if (!ctx || !waterActive || !waterGain) return;
    waterActive = false;
    // Fade out
    waterGain.gain.cancelScheduledValues(ctx.currentTime);
    waterGain.gain.setValueAtTime(waterGain.gain.value, ctx.currentTime);
    waterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  }

  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(isMuted ? 0 : 0.6, ctx.currentTime);
    }
    return isMuted;
  }

  function getIsMuted() { return isMuted; }

  return {
    init, resume, playBGM, stopBGM, playCollect, playStep, playBloop,
    playFanfare, startWaterAmbience, stopWaterAmbience, toggleMute, getIsMuted
  };
})();
