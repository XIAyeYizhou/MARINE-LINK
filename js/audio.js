/* ============================================================
   字卡 · 玻璃信使 — 音频引擎（WebAudio 合成 + 音乐播放器）
   ============================================================ */
(function () {
  var ctx = null, master = null;

  function ensure() {
    if (!ctx) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.8;
        master.connect(ctx.destination);
      } catch (e) { }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type, vol, when, slideTo) {
    if (!ensure()) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noiseBurst(dur, vol, when, freq) {
    if (!ensure()) return;
    var t = ctx.currentTime + (when || 0);
    var n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1000; f.Q.value = 0.8;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  /* 类人声合成（语音文件模拟） */
  function voiceLike(dur) {
    if (!ensure()) return;
    dur = dur || 2.6;
    var base = 170 + Math.random() * 60;
    var t = 0, n = 8 + Math.floor(Math.random() * 6);
    for (var i = 0; i < n; i++) {
      var seg = dur / n * (0.7 + Math.random() * 0.6);
      var f = base * (0.75 + Math.random() * 0.55);
      tone(f, seg, 'sawtooth', 0.05, t, f * (1 + (Math.random() - 0.5) * 0.3));
      noiseBurst(seg * 0.5, 0.03, t, f * 2);
      t += seg;
    }
    noiseBurst(dur * 0.3, 0.02, dur * 0.1, 600);
  }

  function ringTone(stop) {
    if (!ensure()) return;
    var t = 0;
    for (var i = 0; i < 3 && !(stop && stop()); i++) {
      tone(760, 0.14, 'sine', 0.07, t);
      tone(1000, 0.14, 'sine', 0.06, t + 0.02);
      t += 0.35;
    }
  }

  function pokeSound() { tone(660, 0.09, 'triangle', 0.1); tone(880, 0.12, 'triangle', 0.1, 0.1); }
  function sendSound() { tone(520, 0.07, 'sine', 0.08); tone(700, 0.1, 'sine', 0.07, 0.07); }
  function receiveSound() { tone(880, 0.08, 'sine', 0.08); tone(1100, 0.12, 'sine', 0.07, 0.09); }
  function diceSound() { for (var i = 0; i < 6; i++) tone(300 + i * 80, 0.05, 'square', 0.05, i * 0.07); }
  function openPacket() { tone(500, 0.1, 'sine', 0.12, 0); tone(750, 0.14, 'sine', 0.12, 0.1); tone(1000, 0.2, 'sine', 0.1, 0.22); }
  function clickSound() { tone(600, 0.04, 'sine', 0.06); }

  /* ---------- 音乐播放器 ---------- */
  var Music = {
    audio: null,           // 用户导入 MP3 的 Audio 实例
    timer: null,
    seqIdx: 0,
    pattern: null,
    bpm: 96,
    stopFlag: false,

    playSong: function (idx) {
      var st = Store.state;
      var list = st.music;
      if (!list.length) return;
      idx = ((idx % list.length) + list.length) % list.length;
      st.musicState.idx = idx;
      st.musicState.playing = true;
      this.stop();
      var song = list[idx];
      Bus.emit('music', 'play');
      if (song.src) {
        // 本地导入 MP3
        this.audio = new Audio(song.src);
        this.audio.loop = false;
        var self = this;
        this.audio.onended = function () { self.next(true); };
        this.audio.play().catch(function () { });
      } else {
        this.pattern = this.synthPattern(idx);
        this.seqIdx = 0;
        this.stopFlag = false;
        this.scheduleLoop();
      }
    },
    synthPattern: function (idx) {
      var pent = [0, 2, 4, 7, 9, 12, 14, 16];
      var base = 220 * Math.pow(2, (idx % 3) * 2 / 12);
      var notes = [];
      var n = 32;
      for (var i = 0; i < n; i++) {
        var m = pent[Math.floor(Math.random() * pent.length)];
        notes.push(base * Math.pow(2, m / 12));
      }
      return notes;
    },
    scheduleLoop: function () {
      if (!ensure()) return;
      var self = this;
      this.timer = setInterval(function () {
        if (self.stopFlag) return;
        if (!Store.state.musicState.playing) return;
        var pat = self.pattern;
        if (!pat) return;
        var step = 0.22;
        var now = ctx.currentTime;
        var when = now + 0.06;
        var note = pat[self.seqIdx % pat.length];
        tone(note, step * 1.6, 'triangle', 0.07, when - now);
        tone(note / 2, step * 2, 'sine', 0.05, when - now);
        if (self.seqIdx % 8 === 7) noiseBurst(0.1, 0.015, when - now, 4000);
        self.seqIdx++;
        if (self.seqIdx % pat.length === 0) {
          if (Store.state.musicState.mode === 'single') { /* 单曲循环继续 */ }
          else if (Store.state.musicState.mode === 'shuffle') { self.pattern = self.synthPattern(Math.floor(Math.random() * Store.state.music.length)); }
          else { self.next(true); }
        }
        Bus.emit('music', 'tick');
      }, 60);
    },
    toggle: function () {
      var st = Store.state.musicState;
      if (!st.playing) { this.playSong(st.idx); }
      else {
        st.playing = false;
        if (this.audio) this.audio.pause();
        this.stopFlag = true;
        Bus.emit('music', 'pause');
      }
      Store.saveDebounced();
    },
    next: function (auto) {
      var st = Store.state;
      var mode = st.musicState.mode;
      if (auto && mode === 'single') return;
      var idx = st.musicState.idx;
      if (mode === 'shuffle') idx = Math.floor(Math.random() * st.music.length);
      else idx = (idx + 1) % st.music.length;
      this.playSong(idx);
    },
    prev: function () {
      var st = Store.state;
      var idx = st.musicState.idx;
      idx = (idx - 1 + st.music.length) % st.music.length;
      this.playSong(idx);
    },
    stop: function () {
      this.stopFlag = true;
      clearInterval(this.timer);
      this.timer = null;
      if (this.audio) { try { this.audio.pause(); } catch (e) { } this.audio = null; }
    }
  };

  window.AudioX = {
    ensure: ensure, tone: tone, noiseBurst: noiseBurst, voiceLike: voiceLike,
    ringTone: ringTone, pokeSound: pokeSound, sendSound: sendSound,
    receiveSound: receiveSound, diceSound: diceSound, openPacket: openPacket,
    clickSound: clickSound, Music: Music
  };
})();
