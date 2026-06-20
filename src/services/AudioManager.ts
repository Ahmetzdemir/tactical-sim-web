import { WeatherType } from '../engine/types'

class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 1.0;

  // Master gain nodes - ALL audio routes through these
  private musicMasterGain: GainNode | null = null;
  private sfxMasterGain: GainNode | null = null;

  // Sound loop references
  private ambienceInterval: any = null;
  private warAmbienceActive = false;
  private warAmbienceSource: { stop: () => void; setVolume: (v: number) => void } | null = null;
  private gunfireInterval: any = null;
  private gunfireTimeout: any = null;
  private helicopterSynth: { stop: () => void; setVolume: (v: number) => void } | null = null;
  private windSynth: { stop: () => void; updateWeather: (type: WeatherType) => void; setVolume: (v: number) => void } | null = null;

  // Cached noise buffers
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private brownNoiseBuffer: AudioBuffer | null = null;

  // Cache for loaded audio buffers
  private bufferCache: Map<string, AudioBuffer> = new Map();
  private loadPromises: Map<string, Promise<AudioBuffer>> = new Map();

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        // Create master gain nodes on first context creation
        this.musicMasterGain = this.ctx.createGain();
        this.musicMasterGain.gain.value = this.musicVolume;
        this.musicMasterGain.connect(this.ctx.destination);

        this.sfxMasterGain = this.ctx.createGain();
        this.sfxMasterGain.gain.value = this.sfxVolume;
        this.sfxMasterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** Get the music output bus (all ambient/music sounds route here) */
  public getMusicDest(): AudioNode {
    if (this.musicMasterGain) return this.musicMasterGain;
    const ctx = this.getContext();
    return ctx ? ctx.destination : (null as any);
  }

  /** Get the SFX output bus (all sound effects route here) */
  public getSfxDest(): AudioNode {
    if (this.sfxMasterGain) return this.sfxMasterGain;
    const ctx = this.getContext();
    return ctx ? ctx.destination : (null as any);
  }

  public resumeContext(): Promise<void> {
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      return ctx.resume();
    }
    return Promise.resolve();
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      this.ctx.suspend();
    } else if (!muted && this.ctx) {
      this.ctx.resume();
    }
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = volume;
    if (this.musicMasterGain) {
      this.musicMasterGain.gain.value = volume;
    }
    if (this.warAmbienceSource) {
      try { this.warAmbienceSource.setVolume(volume); } catch (e) {}
    }
    if (this.windSynth) {
      try { this.windSynth.setVolume(volume); } catch (e) {}
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = volume;
    if (this.sfxMasterGain) {
      this.sfxMasterGain.gain.value = volume;
    }
  }

  // ── NOISE BUFFER GENERATORS ───────────────────────────────────

  private getWhiteNoise(ctx: AudioContext): AudioBuffer {
    if (this.whiteNoiseBuffer) return this.whiteNoiseBuffer;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = buffer;
    return buffer;
  }

  private getPinkNoise(ctx: AudioContext): AudioBuffer {
    if (this.pinkNoiseBuffer) return this.pinkNoiseBuffer;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11; // Gain correction
      b6 = white * 0.115926;
    }
    this.pinkNoiseBuffer = buffer;
    return buffer;
  }

  private getBrownNoise(ctx: AudioContext): AudioBuffer {
    if (this.brownNoiseBuffer) return this.brownNoiseBuffer;
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain correction
    }
    this.brownNoiseBuffer = buffer;
    return buffer;
  }

  // ── SOUND DECORATORS ──────────────────────────────────────────

  // Multi-tap canyon feedback reflection matrix
  private applyCanyonEcho(ctx: AudioContext, source: AudioNode, feedbackGain: number, cutoffFrequency: number) {
    const echoMix = ctx.createGain();
    echoMix.gain.value = feedbackGain * this.sfxVolume;

    // Reflection Tap 1: 180ms delay, mid frequency damp
    const delay1 = ctx.createDelay();
    delay1.delayTime.setValueAtTime(0.18, ctx.currentTime);
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(cutoffFrequency, ctx.currentTime);
    const gain1 = ctx.createGain();
    gain1.gain.setValueAtTime(0.4, ctx.currentTime);

    // Reflection Tap 2: 360ms delay, lower frequency damp
    const delay2 = ctx.createDelay();
    delay2.delayTime.setValueAtTime(0.36, ctx.currentTime);
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.setValueAtTime(cutoffFrequency * 0.7, ctx.currentTime);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.25, ctx.currentTime);

    // Reflection Tap 3: 590ms delay, heavily muffled
    const delay3 = ctx.createDelay();
    delay3.delayTime.setValueAtTime(0.59, ctx.currentTime);
    const filter3 = ctx.createBiquadFilter();
    filter3.type = 'lowpass';
    filter3.frequency.setValueAtTime(cutoffFrequency * 0.4, ctx.currentTime);
    const gain3 = ctx.createGain();
    gain3.gain.setValueAtTime(0.15, ctx.currentTime);

    // Routing
    source.connect(delay1);
    delay1.connect(filter1);
    filter1.connect(gain1);
    gain1.connect(echoMix);

    source.connect(delay2);
    delay2.connect(filter2);
    filter2.connect(gain2);
    gain2.connect(echoMix);

    source.connect(delay3);
    delay3.connect(filter3);
    filter3.connect(gain3);
    gain3.connect(echoMix);

    echoMix.connect(this.getSfxDest());

    return {
      disconnect: () => {
        try {
          delay1.disconnect(); filter1.disconnect(); gain1.disconnect();
          delay2.disconnect(); filter2.disconnect(); gain2.disconnect();
          delay3.disconnect(); filter3.disconnect(); gain3.disconnect();
          echoMix.disconnect();
        } catch (e) {}
      }
    };
  }

  // WaveShaper saturation curve to mimic microphone clipping from extreme pressure transients
  private createDistortionCurve(amount = 20) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // Metallic spent brass shell casing drop ringing
  private triggerCasingSound(ctx: AudioContext, time: number) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Metallic chime pitch (high frequency) with random variance
    osc.frequency.setValueAtTime(2600 + Math.random() * 800, time);
    osc.frequency.exponentialRampToValueAtTime(1200 + Math.random() * 300, time + 0.14);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, time);
    filter.Q.setValueAtTime(3.0, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.04 * this.sfxVolume, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest());

    osc.start(time);
    osc.stop(time + 0.14);
  }

  // ── MP3 FILE LOADING AND BUFFERING ────────────────────────────

  private fetchAndDecodeBuffer(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) {
      return Promise.resolve(this.bufferCache.get(url)!);
    }
    if (this.loadPromises.has(url)) {
      return this.loadPromises.get(url)!;
    }

    const promise = (async () => {
      const ctx = this.getContext();
      if (!ctx) throw new Error("AudioContext not ready");
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch sound: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Promise<AudioBuffer>((resolve, reject) => {
        ctx.decodeAudioData(
          arrayBuffer,
          (decoded) => {
            this.bufferCache.set(url, decoded);
            resolve(decoded);
          },
          (err) => reject(err)
        );
      });
    })();

    this.loadPromises.set(url, promise);
    return promise;
  }

  private playBuffer(
    buffer: AudioBuffer,
    vol: number,
    loop = false,
    pan = 0,
    echoFeedback = 0,
    echoCutoff = 1000
  ): { source: AudioBufferSourceNode; gainNode: GainNode; stop: () => void } {
    const ctx = this.getContext();
    if (!ctx) throw new Error("Context not ready");
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol * this.sfxVolume, now);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    source.connect(gainNode);

    let destinationNode: AudioNode = this.getSfxDest();

    if (panner) {
      panner.pan.setValueAtTime(pan, now);
      gainNode.connect(panner);
      panner.connect(this.getSfxDest()); // Route from panner to speakers!
      destinationNode = panner;
    } else {
      gainNode.connect(this.getSfxDest());
    }

    let echoDisconnect: (() => void) | null = null;
    if (echoFeedback > 0) {
      const echo = this.applyCanyonEcho(ctx, destinationNode, echoFeedback, echoCutoff);
      echoDisconnect = () => echo.disconnect();
    }

    source.start(now);

    return {
      source,
      gainNode,
      stop: () => {
        try { source.stop(); } catch (e) {}
        if (echoDisconnect) echoDisconnect();
      }
    };
  }

  // ── GENERAL SFX ───────────────────────────────────────────────

  public playClick() {
    this.fetchAndDecodeBuffer('/sounds/tactical_click.mp3')
      .then((buf) => {
        this.playBuffer(buf, 0.45);
      })
      .catch(() => {
        // Fallback to synth click
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const bandpass = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.035);

        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(800, now);
        bandpass.Q.setValueAtTime(1.5, now);

        gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

        osc.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(this.getSfxDest());
        
        osc.start(now);
        osc.stop(now + 0.035);
      });
  }

  public playRadioBeep() {
    this.triggerBeep(false);
  }

  public playRogerThat() {
    this.triggerBeep(true);
  }

  private triggerBeep(isDouble: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    // Fetch and play MP3 beep
    this.fetchAndDecodeBuffer('/sounds/radio_beep.mp3')
      .then((buf) => {
        // Play the MP3 radio beep
        this.playBuffer(buf, 0.45);
        
        // Static and speech overlays for realistic transmission clicks
        const playStaticBurst = (start: number, dur: number, volFactor: number) => {
          const noise = ctx.createBufferSource();
          noise.buffer = this.getWhiteNoise(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1500, start);
          filter.Q.setValueAtTime(2.5, start);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.06 * volFactor * sfxVol, start + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getSfxDest());
          noise.start(start);
          noise.stop(start + dur);
        };

        const playRadioSpeech = (start: number, dur: number) => {
          const carrier = ctx.createOscillator();
          carrier.type = 'sawtooth';
          carrier.frequency.setValueAtTime(120, start);
          carrier.frequency.linearRampToValueAtTime(145, start + dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(900, start);
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(12, start);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(280, start);
          const noise = ctx.createBufferSource();
          noise.buffer = this.getWhiteNoise(ctx);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.03 * sfxVol, start);
          const speechGain = ctx.createGain();
          speechGain.gain.setValueAtTime(0, start);
          speechGain.gain.linearRampToValueAtTime(0.08 * sfxVol, start + 0.03);
          speechGain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          carrier.connect(filter);
          filter.connect(speechGain);
          noise.connect(noiseGain);
          noiseGain.connect(speechGain);
          speechGain.connect(this.getSfxDest());
          carrier.start(start);
          lfo.start(start);
          noise.start(start);
          carrier.stop(start + dur);
          lfo.stop(start + dur);
          noise.stop(start + dur);
        };

        // Static overlay on top of radio beep
        playStaticBurst(now, 0.05, 0.8);
        if (isDouble) {
          playRadioSpeech(now + 0.15, 0.3);
          playStaticBurst(now + 0.45, 0.16, 1.3);
        } else {
          playStaticBurst(now + 0.12, 0.12, 1.0);
        }
      })
      .catch(() => {
        // Fallback to original synthesized beep
        const playStaticBurst = (start: number, dur: number, volFactor: number) => {
          const noise = ctx.createBufferSource();
          noise.buffer = this.getWhiteNoise(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1500, start);
          filter.Q.setValueAtTime(2.5, start);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.06 * volFactor * sfxVol, start + 0.005);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(this.getSfxDest());
          noise.start(start);
          noise.stop(start + dur);
        };

        const playRadioSpeech = (start: number, dur: number) => {
          const carrier = ctx.createOscillator();
          carrier.type = 'sawtooth';
          carrier.frequency.setValueAtTime(120, start);
          carrier.frequency.linearRampToValueAtTime(145, start + dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(900, start);
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(12, start);
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(280, start);
          const noise = ctx.createBufferSource();
          noise.buffer = this.getWhiteNoise(ctx);
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.03 * sfxVol, start);
          const speechGain = ctx.createGain();
          speechGain.gain.setValueAtTime(0, start);
          speechGain.gain.linearRampToValueAtTime(0.08 * sfxVol, start + 0.03);
          speechGain.gain.exponentialRampToValueAtTime(0.001, start + dur);
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          carrier.connect(filter);
          filter.connect(speechGain);
          noise.connect(noiseGain);
          noiseGain.connect(speechGain);
          speechGain.connect(this.getSfxDest());
          carrier.start(start);
          lfo.start(start);
          noise.start(start);
          carrier.stop(start + dur);
          lfo.stop(start + dur);
          noise.stop(start + dur);
        };

        playStaticBurst(now, 0.045, 0.9);
        const beepStart = now + 0.04;
        const playTone = (freq: number, start: number, dur: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.09 * sfxVol, start + 0.005);
          gain.gain.setValueAtTime(0.09 * sfxVol, start + dur - 0.008);
          gain.gain.linearRampToValueAtTime(0, start + dur);
          osc.connect(gain);
          gain.connect(this.getSfxDest());
          osc.start(start);
          osc.stop(start + dur);
        };

        if (isDouble) {
          playTone(950, beepStart, 0.04);
          playTone(720, beepStart + 0.055, 0.075);
          playRadioSpeech(beepStart + 0.14, 0.28);
          playStaticBurst(beepStart + 0.42, 0.16, 1.4);
        } else {
          playTone(1050, beepStart, 0.065);
          playStaticBurst(beepStart + 0.07, 0.12, 1.0);
        }
      });
   }

  // ── INFANTRY WEAPONS SYNTH ────────────────────────────────────

  public playRifleShot() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    // Double-tap burst ("pop-pop")
    const triggerSingleRifle = (time: number) => {
      // 1. Muzzle blast transient thud
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(450, time);
      sub.frequency.exponentialRampToValueAtTime(45, time + 0.065);
      subGain.gain.setValueAtTime(0.85 * sfxVol, time);
      subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);

      // 2. High-pressure gunpowder crack (highpassed pink noise)
      const crack = ctx.createBufferSource();
      crack.buffer = this.getPinkNoise(ctx);
      const crackFilter = ctx.createBiquadFilter();
      crackFilter.type = 'highpass';
      crackFilter.frequency.setValueAtTime(950, time);
      const crackGain = ctx.createGain();
      crackGain.gain.setValueAtTime(1.1 * sfxVol, time);
      crackGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      // Routing
      sub.connect(subGain);
      subGain.connect(this.getSfxDest());
      
      crack.connect(crackFilter);
      crackFilter.connect(crackGain);
      crackGain.connect(this.getSfxDest());

      sub.start(time);
      sub.stop(time + 0.065);
      crack.start(time);
      crack.stop(time + 0.08);

      // 3. Canyon echo reflection
      const echo = this.applyCanyonEcho(ctx, crackFilter, 0.28, 480);
      setTimeout(() => echo.disconnect(), 1800);

      // 4. Shell casing drop (260ms delay)
      this.triggerCasingSound(ctx, time + 0.26);
    };

    triggerSingleRifle(now);
    triggerSingleRifle(now + 0.125);
  }

  public playMGBurst() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    // Fast 5-shot heavy burst ("tr-tr-tr-tr-tr")
    const shotsCount = 5;
    const burstDelay = 0.085; // 85ms spacing

    for (let i = 0; i < shotsCount; i++) {
      const time = now + i * burstDelay;
      
      const pitchOffset = Math.random() * 40 - 20;
      const volRand = 0.85 + Math.random() * 0.3;

      const click = ctx.createOscillator();
      const clickGain = ctx.createGain();
      click.type = 'triangle';
      click.frequency.setValueAtTime(800 + pitchOffset, time);
      clickGain.gain.setValueAtTime(0.18 * sfxVol * volRand, time);
      clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.008);

      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'sawtooth';
      sub.frequency.setValueAtTime(260 + pitchOffset, time);
      subGain.gain.setValueAtTime(0.75 * sfxVol * volRand, time);
      subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.085);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, time);

      const noise = ctx.createBufferSource();
      noise.buffer = this.getPinkNoise(ctx);
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(650, time);
      noiseFilter.Q.setValueAtTime(3.0, time);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.95 * sfxVol * volRand, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);

      click.connect(clickGain);
      clickGain.connect(this.getSfxDest());

      sub.connect(filter);
      filter.connect(subGain);
      subGain.connect(this.getSfxDest());

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.getSfxDest());

      click.start(time); click.stop(time + 0.008);
      sub.start(time); sub.stop(time + 0.085);
      noise.start(time); noise.stop(time + 0.075);

      const echo = this.applyCanyonEcho(ctx, noiseFilter, 0.2, 400);
      setTimeout(() => echo.disconnect(), 1900);

      if (i % 2 === 0) {
        this.triggerCasingSound(ctx, time + 0.22);
      }
    }
  }

  public playSniperShot() {
    this.fetchAndDecodeBuffer('/sounds/sniper_shot.mp3')
      .then((buf) => {
        // Play with 3-tap echo
        this.playBuffer(buf, 0.95, false, 0, 0.48, 380);
        
        // Spent casing click overlay
        const ctx = this.getContext();
        if (ctx) {
          const casingTime = ctx.currentTime + 0.45;
          this.triggerCasingSound(ctx, casingTime);
          setTimeout(() => {
            this.triggerCasingSound(ctx, casingTime + 0.11);
          }, 110);
        }
      })
      .catch(() => {
        // Fallback to original synthesized sniper shot
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const sfxVol = this.sfxVolume;

        const crack = ctx.createBufferSource();
        crack.buffer = this.getWhiteNoise(ctx);
        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = 'highpass';
        crackFilter.frequency.setValueAtTime(4500, now);
        const crackGain = ctx.createGain();
        crackGain.gain.setValueAtTime(1.9 * sfxVol, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

        crack.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(this.getSfxDest());
        
        crack.start(now);
        crack.stop(now + 0.015);

        const blast = ctx.createOscillator();
        const saturator = ctx.createWaveShaper();
        const blastGain = ctx.createGain();
        blast.type = 'sawtooth';
        blast.frequency.setValueAtTime(320, now);
        blast.frequency.exponentialRampToValueAtTime(25, now + 0.18);
        saturator.curve = this.createDistortionCurve(25);
        saturator.oversample = '4x';
        const blastFilter = ctx.createBiquadFilter();
        blastFilter.type = 'lowpass';
        blastFilter.frequency.setValueAtTime(350, now);
        blastGain.gain.setValueAtTime(1.4 * sfxVol, now);
        blastGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        blast.connect(saturator);
        saturator.connect(blastFilter);
        blastFilter.connect(blastGain);
        blastGain.connect(this.getSfxDest());
        blast.start(now);
        blast.stop(now + 0.18);

        const roar = ctx.createBufferSource();
        roar.buffer = this.getBrownNoise(ctx);
        const roarFilter = ctx.createBiquadFilter();
        roarFilter.type = 'lowpass';
        roarFilter.frequency.setValueAtTime(800, now);
        const roarGain = ctx.createGain();
        roarGain.gain.setValueAtTime(1.6 * sfxVol, now);
        roarGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        roar.connect(roarFilter);
        roarFilter.connect(roarGain);
        roarGain.connect(this.getSfxDest());
        roar.start(now);
        roar.stop(now + 0.28);

        const echo = this.applyCanyonEcho(ctx, roarFilter, 0.48, 380);
        setTimeout(() => echo.disconnect(), 2500);

        const casingTime = now + 0.42;
        this.triggerCasingSound(ctx, casingTime);
        setTimeout(() => {
          this.triggerCasingSound(ctx, casingTime + 0.11);
        }, 110);
      });
  }

  public playRocketLaunch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;
    const dur = 0.8;

    const whoosh = ctx.createBufferSource();
    whoosh.buffer = this.getPinkNoise(ctx);
    const whooshFilter = ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.setValueAtTime(120, now);
    whooshFilter.frequency.exponentialRampToValueAtTime(1100, now + 0.25);
    whooshFilter.Q.setValueAtTime(2.0, now);

    const whooshGain = ctx.createGain();
    whooshGain.gain.setValueAtTime(0, now);
    whooshGain.gain.linearRampToValueAtTime(1.3 * sfxVol, now + 0.08);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    whoosh.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.getSfxDest());

    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.setValueAtTime(95, now);
    motor.frequency.linearRampToValueAtTime(30, now + dur);
    
    const motorFilter = ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(80, now);

    const motorGain = ctx.createGain();
    motorGain.gain.setValueAtTime(0.85 * sfxVol, now);
    motorGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    motor.connect(motorFilter);
    motorFilter.connect(motorGain);
    motorGain.connect(this.getSfxDest());

    whoosh.start(now); whoosh.stop(now + dur);
    motor.start(now); motor.stop(now + dur);

    const echo = this.applyCanyonEcho(ctx, whooshFilter, 0.35, 450);
    setTimeout(() => echo.disconnect(), 2200);
  }

  // ── EXPLOSIONS SYNTH ──────────────────────────────────────────

  public playTankFire() {
    this.fetchAndDecodeBuffer('/sounds/tank_fire.mp3')
      .then((buf) => {
        // Play with heavy echo
        this.playBuffer(buf, 0.9, false, 0, 0.45, 320);
      })
      .catch(() => {
        // Fallback to synthesized tank fire
        this.triggerExplosion(0.7, 1.8, true);
      });
  }

  public playArtilleryImpact() {
    this.fetchAndDecodeBuffer('/sounds/artillery_impact.mp3')
      .then((buf) => {
        // Play with maximum echo depth
        this.playBuffer(buf, 1.0, false, 0, 0.62, 180);
      })
      .catch(() => {
        // Fallback to synthesized artillery blast
        this.triggerExplosion(0.85, 2.5, false);
      });
  }

  private triggerExplosion(vol: number, dur: number, isTank: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    const shock = ctx.createOscillator();
    const saturator = ctx.createWaveShaper();
    const shockGain = ctx.createGain();
    
    shock.type = 'triangle';
    shock.frequency.setValueAtTime(480, now);
    shock.frequency.exponentialRampToValueAtTime(10, now + 0.05);

    saturator.curve = this.createDistortionCurve(45);
    saturator.oversample = '4x';

    shockGain.gain.setValueAtTime(vol * 2.0 * sfxVol, now);
    shockGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    shock.connect(saturator);
    saturator.connect(shockGain);
    shockGain.connect(this.getSfxDest());
    
    shock.start(now);
    shock.stop(now + 0.05);

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(isTank ? 85 : 45, now);
    sub.frequency.linearRampToValueAtTime(10, now + dur);
    
    subGain.gain.setValueAtTime(vol * 1.3 * sfxVol, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    sub.connect(subGain);
    subGain.connect(this.getSfxDest());
    
    sub.start(now);
    sub.stop(now + dur);

    const roar = ctx.createBufferSource();
    roar.buffer = this.getBrownNoise(ctx);
    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.setValueAtTime(isTank ? 280 : 150, now);
    roarFilter.frequency.exponentialRampToValueAtTime(15, now + dur);
    
    const roarGain = ctx.createGain();
    roarGain.gain.setValueAtTime(vol * 1.4 * sfxVol, now);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    roar.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(this.getSfxDest());
    
    roar.start(now);
    roar.stop(now + dur);

    if (!isTank) {
      const debris = ctx.createBufferSource();
      debris.buffer = this.getWhiteNoise(ctx);
      const debrisFilter = ctx.createBiquadFilter();
      debrisFilter.type = 'bandpass';
      debrisFilter.frequency.setValueAtTime(2000, now);
      debrisFilter.Q.setValueAtTime(4.0, now);

      const debrisGain = ctx.createGain();
      debrisGain.gain.setValueAtTime(0, now);
      debrisGain.gain.linearRampToValueAtTime(0.18 * sfxVol, now + 0.15);
      debrisGain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.7);

      debris.connect(debrisFilter);
      debrisFilter.connect(debrisGain);
      debrisGain.connect(this.getSfxDest());

      debris.start(now);
      debris.stop(now + dur);
    }

    const echo = this.applyCanyonEcho(ctx, roarFilter, isTank ? 0.4 : 0.58, isTank ? 320 : 180);
    setTimeout(() => echo.disconnect(), (dur + 2.0) * 1000);
  }

  // ── ENGINES & MOVEMENT SYNTH ──────────────────────────────────

  public playTankMove() {
    this.fetchAndDecodeBuffer('/sounds/tank_move.mp3')
      .then((buf) => {
        this.playBuffer(buf, 0.45);
      })
      .catch(() => {
        // Fallback to synthesized tank engine
        const ctx = this.getContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const duration = 1.35;
        const sfxVol = this.sfxVolume;

        const engine = ctx.createOscillator();
        engine.type = 'sawtooth';
        engine.frequency.setValueAtTime(48, now);
        engine.frequency.linearRampToValueAtTime(38, now + duration);

        const pulseLfo = ctx.createOscillator();
        pulseLfo.type = 'sine';
        pulseLfo.frequency.setValueAtTime(8, now);
        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(0.4, now);

        const engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.setValueAtTime(75, now);

        const engineGain = ctx.createGain();
        engineGain.gain.setValueAtTime(0, now);
        engineGain.gain.linearRampToValueAtTime(0.4 * sfxVol, now + 0.1);
        engineGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        pulseLfo.connect(pulseGain);
        pulseGain.connect(engineGain.gain);

        engine.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(this.getSfxDest());

        const squeak = ctx.createBufferSource();
        squeak.buffer = this.getWhiteNoise(ctx);
        const squeakFilter = ctx.createBiquadFilter();
        squeakFilter.type = 'bandpass';
        squeakFilter.frequency.setValueAtTime(1900, now);
        squeakFilter.Q.setValueAtTime(6.0, now);
        const squeakGain = ctx.createGain();
        squeakGain.gain.setValueAtTime(0, now);
        squeakGain.gain.linearRampToValueAtTime(0.03 * sfxVol, now + 0.2);
        squeakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        squeak.connect(squeakFilter);
        squeakFilter.connect(squeakGain);
        squeakGain.connect(this.getSfxDest());

        const crunch = ctx.createBufferSource();
        crunch.buffer = this.getBrownNoise(ctx);
        const crunchFilter = ctx.createBiquadFilter();
        crunchFilter.type = 'lowpass';
        crunchFilter.frequency.setValueAtTime(130, now);
        const crunchGain = ctx.createGain();
        crunchGain.gain.setValueAtTime(0, now);
        crunchGain.gain.linearRampToValueAtTime(0.22 * sfxVol, now + 0.15);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        crunch.connect(crunchFilter);
        crunchFilter.connect(crunchGain);
        crunchGain.connect(this.getSfxDest());

        engine.start(now); pulseLfo.start(now); squeak.start(now); crunch.start(now);
        engine.stop(now + duration); pulseLfo.stop(now + duration); squeak.stop(now + 0.95); crunch.stop(now + duration);
      });
  }

  public playAirStrike() {
    const ctx = this.getContext();
    if (!ctx) return;
    const duration = 5.5;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    const masterAir = ctx.createGain();
    masterAir.gain.setValueAtTime(0, now);
    masterAir.gain.linearRampToValueAtTime(0.7 * sfxVol, now + duration * 0.35);
    masterAir.gain.exponentialRampToValueAtTime(0.001, now + duration);

    const roarSource = ctx.createBufferSource();
    roarSource.buffer = this.getPinkNoise(ctx);
    roarSource.loop = true;

    const roarFilter = ctx.createBiquadFilter();
    roarFilter.type = 'lowpass';
    roarFilter.frequency.setValueAtTime(250, now);
    roarFilter.frequency.exponentialRampToValueAtTime(1200, now + duration * 0.35);
    roarFilter.frequency.exponentialRampToValueAtTime(120, now + duration);

    const delay = ctx.createDelay();
    delay.delayTime.setValueAtTime(0.003, now);

    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.75, now);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.002, now);

    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);

    const flangerFeedback = ctx.createGain();
    flangerFeedback.gain.setValueAtTime(0.45, now);

    delay.connect(flangerFeedback);
    flangerFeedback.connect(delay);

    const whineSource = ctx.createOscillator();
    whineSource.type = 'sine';
    whineSource.frequency.setValueAtTime(800, now);
    whineSource.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.35);
    whineSource.frequency.exponentialRampToValueAtTime(300, now + duration);

    const whineGain = ctx.createGain();
    whineGain.gain.setValueAtTime(0.04, now);

    whineSource.connect(whineGain);
    whineGain.connect(masterAir);

    roarSource.connect(roarFilter);
    roarFilter.connect(delay);
    delay.connect(masterAir);
    roarFilter.connect(masterAir);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(-1.0, now);
      panner.pan.linearRampToValueAtTime(1.0, now + duration);
      masterAir.connect(panner);
      panner.connect(this.getSfxDest());
    } else {
      masterAir.connect(this.getSfxDest());
    }

    roarSource.start(now);
    whineSource.start(now);
    lfo.start(now);

    roarSource.stop(now + duration);
    whineSource.stop(now + duration);
    lfo.stop(now + duration);
  }

  // ── SPECIAL BUILDING ABILITIES SYNTH ──────────────────────────

  public playHeal() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    const playBeepNode = (time: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, time);
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.08 * sfxVol, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.connect(gain);
      gain.connect(this.getSfxDest());
      osc.start(time);
      osc.stop(time + 0.06);
    };

    playBeepNode(now);
    playBeepNode(now + 0.15);

    const flush = ctx.createBufferSource();
    flush.buffer = this.getWhiteNoise(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(250, now + 0.6);
    filter.Q.setValueAtTime(2.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12 * sfxVol, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    flush.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest());

    flush.start(now);
    flush.stop(now + 0.6);
  }

  public playAmmoSupply() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    const playMetalClank = (time: number, freq: number, dur: number, volFactor: number) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, time + dur);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.2, time);
      filter.Q.setValueAtTime(3.0, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.15 * sfxVol * volFactor, time + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDest());

      osc.start(time);
      osc.stop(time + dur);
    };

    playMetalClank(now, 800, 0.15, 0.8);
    playMetalClank(now + 0.12, 450, 0.22, 1.0);
    playMetalClank(now + 0.35, 950, 0.11, 1.2);
  }

  public playReinforce() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    const playKlaxon = (start: number) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      
      osc1.frequency.setValueAtTime(380, start);
      osc1.frequency.linearRampToValueAtTime(480, start + 0.35);
      osc1.frequency.linearRampToValueAtTime(380, start + 0.7);

      osc2.frequency.setValueAtTime(384, start);
      osc2.frequency.linearRampToValueAtTime(484, start + 0.35);
      osc2.frequency.linearRampToValueAtTime(384, start + 0.7);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.08 * sfxVol, start + 0.15);
      gain.gain.setValueAtTime(0.08 * sfxVol, start + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDest());

      osc1.start(start);
      osc2.start(start);
      osc1.stop(start + 0.7);
      osc2.stop(start + 0.7);
    };

    playKlaxon(now);
    playKlaxon(now + 0.95);

    const crank = ctx.createOscillator();
    crank.type = 'sawtooth';
    crank.frequency.setValueAtTime(35, now + 0.25);
    crank.frequency.exponentialRampToValueAtTime(80, now + 1.25);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(100, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + 0.25);
    gain.gain.linearRampToValueAtTime(0.16 * sfxVol, now + 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.55);

    crank.connect(filter);
    filter.connect(gain);
    gain.connect(this.getSfxDest());

    crank.start(now + 0.25);
    crank.stop(now + 1.55);
  }

  public playConstruction() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
    gain.gain.setValueAtTime(0.06 * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    
    osc.connect(gain);
    gain.connect(this.getSfxDest());
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playConstructionProgress() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const sfxVol = this.sfxVolume;

    if (Math.random() < 0.5) {
      const hammer = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      hammer.type = 'triangle';
      hammer.frequency.setValueAtTime(900 + Math.random() * 300, now);
      hammer.frequency.setValueAtTime(120, now + 0.02);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1500, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.12 * sfxVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      hammer.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDest());

      hammer.start(now);
      hammer.stop(now + 0.09);
    } else {
      const sizzle = ctx.createBufferSource();
      sizzle.buffer = this.getWhiteNoise(ctx);
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(4500, now);
      filter.Q.setValueAtTime(5.0, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.05 * sfxVol, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      sizzle.connect(filter);
      filter.connect(gain);
      gain.connect(this.getSfxDest());

      sizzle.start(now);
      sizzle.stop(now + 0.12);
    }
  }

  // ── LOOP PLAYERS ──────────────────────────────────────────────

  public startWarAmbience() {
    if (this.warAmbienceActive) return;
    this.warAmbienceActive = true;

    this.fetchAndDecodeBuffer('/sounds/war_ambience.mp3')
      .then((buf) => {
        if (!this.warAmbienceActive) return; // Guard against race condition
        const ctx = this.getContext();
        if (!ctx) return;
        
        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.value = this.musicVolume;

        source.connect(gainNode);
        gainNode.connect(this.getMusicDest());
        source.start();

        this.warAmbienceSource = {
          stop: () => {
            try { source.stop(); } catch (e) {}
            try { source.disconnect(); } catch (e) {}
            try { gainNode.disconnect(); } catch (e) {}
          },
          setVolume: (v: number) => {
            try {
              gainNode.gain.cancelScheduledValues(ctx.currentTime);
              gainNode.gain.setValueAtTime(v, ctx.currentTime);
            } catch (e) {
              gainNode.gain.value = v;
            }
          }
        };
      })
      .catch(() => {
        // Fallback to synthesized distant explosions
        // Create a persistent master gain node for the fallback path
        const ctx = this.getContext();
        if (!ctx) return;
        const fallbackMaster = ctx.createGain();
        fallbackMaster.gain.value = this.musicVolume;
        fallbackMaster.connect(this.getMusicDest());

        // Store setVolume so slider changes propagate to fallback too
        this.warAmbienceSource = {
          stop: () => {
            try { fallbackMaster.disconnect(); } catch (e) {}
          },
          setVolume: (v: number) => {
            try {
              fallbackMaster.gain.cancelScheduledValues(ctx.currentTime);
              fallbackMaster.gain.setValueAtTime(v, ctx.currentTime);
            } catch (e) {
              fallbackMaster.gain.value = v;
            }
          }
        };

        const triggerBoom = () => {
          if (!this.warAmbienceActive) return;
          const boomCtx = this.getContext();
          if (!boomCtx) return;
          
          const duration = 3.0 + Math.random() * 2.5;
          const vol = 0.05 + Math.random() * 0.08;

          const osc = boomCtx.createOscillator();
          const gain = boomCtx.createGain();
          const filter = boomCtx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(35 + Math.random() * 20, boomCtx.currentTime);
          osc.frequency.linearRampToValueAtTime(8, boomCtx.currentTime + duration);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(90, boomCtx.currentTime);

          gain.gain.setValueAtTime(0, boomCtx.currentTime);
          gain.gain.linearRampToValueAtTime(vol, boomCtx.currentTime + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, boomCtx.currentTime + duration);

          // Route through the fallback master gain (which respects musicVolume)
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(fallbackMaster);

          // Echo also routes through fallback master
          const echo = this.applyCanyonEcho(boomCtx, gain, 0.35, 100);

          osc.start();
          osc.stop(boomCtx.currentTime + duration);

          setTimeout(() => {
            echo.disconnect();
          }, (duration + 2.5) * 1000);
        };

        triggerBoom();
        this.ambienceInterval = setInterval(() => {
          triggerBoom();
        }, 4500 + Math.random() * 4500);
      });
  }

  public stopWarAmbience() {
    this.warAmbienceActive = false;
    if (this.warAmbienceSource) {
      this.warAmbienceSource.stop();
      this.warAmbienceSource = null;
    }
    if (this.ambienceInterval) {
      clearInterval(this.ambienceInterval);
      this.ambienceInterval = null;
    }
  }

  public startGunfireAmbient() {
    if (this.gunfireTimeout) {
      clearTimeout(this.gunfireTimeout);
    }
    this.gunfireTimeout = setTimeout(() => {
      this.stopGunfireAmbient();
    }, 20000); // Auto-stop ambient gunfire after 20 seconds of real-time silence

    if (this.gunfireInterval) return;

    const triggerBurst = () => {
      const ctx = this.getContext();
      if (!ctx) return;

      const shots = 3 + Math.floor(Math.random() * 5);
      let delay = 0;

      for (let i = 0; i < shots; i++) {
        const shotTime = ctx.currentTime + delay;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160 + Math.random() * 70, shotTime);
        osc.frequency.exponentialRampToValueAtTime(25, shotTime + 0.07);

        gain.gain.setValueAtTime(0, shotTime);
        gain.gain.linearRampToValueAtTime(0.09 * this.sfxVolume, shotTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.07);

        const noise = ctx.createBufferSource();
        noise.buffer = this.getWhiteNoise(ctx);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850 + Math.random() * 300, shotTime);
        filter.Q.setValueAtTime(3.5, shotTime);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, shotTime);
        noiseGain.gain.linearRampToValueAtTime(0.07 * this.sfxVolume, shotTime + 0.005);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.05);

        const echo = ctx.createDelay();
        echo.delayTime.setValueAtTime(0.2, shotTime);
        const echoGain = ctx.createGain();
        echoGain.gain.setValueAtTime(0.03 * this.sfxVolume, shotTime + 0.2);
        echoGain.gain.exponentialRampToValueAtTime(0.001, shotTime + 0.8);
        filter.connect(echo);
        echo.connect(echoGain);
        echoGain.connect(this.getSfxDest());

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.getSfxDest());

        osc.connect(gain);
        gain.connect(this.getSfxDest());

        osc.start(shotTime);
        osc.stop(shotTime + 0.07);

        noise.start(shotTime);
        noise.stop(shotTime + 0.05);

        delay += 0.11 + Math.random() * 0.09;
      }
    };

    triggerBurst();
    this.gunfireInterval = setInterval(() => {
      triggerBurst();
    }, 2800 + Math.random() * 2500);
  }

  public stopGunfireAmbient() {
    if (this.gunfireInterval) {
      clearInterval(this.gunfireInterval);
      this.gunfireInterval = null;
    }
    if (this.gunfireTimeout) {
      clearTimeout(this.gunfireTimeout);
      this.gunfireTimeout = null;
    }
  }

  public playHelicopter(distance: number = 0, pan: number = 0) {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.helicopterSynth) {
      // Fetch and play MP3 rotor loop
      this.fetchAndDecodeBuffer('/sounds/helicopter_rotor.mp3')
        .then((buf) => {
          const source = ctx.createBufferSource();
          source.buffer = buf;
          source.loop = true;

          const masterMix = ctx.createGain();
          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

          source.connect(masterMix);
          if (panner) {
            masterMix.connect(panner);
            panner.connect(this.getSfxDest());
          } else {
            masterMix.connect(this.getSfxDest());
          }

          source.start();

          this.helicopterSynth = {
            stop: () => {
              try { source.stop(); } catch (e) {}
              try { source.disconnect(); } catch (e) {}
              try { masterMix.disconnect(); } catch (e) {}
              if (panner) try { panner.disconnect(); } catch (e) {}
            },
            setVolume: (d: number) => {
              const finalVol = Math.max(0, 0.45 * this.sfxVolume * (1 - d));
              masterMix.gain.setValueAtTime(finalVol, ctx.currentTime);
              if (panner) {
                panner.pan.setValueAtTime(pan, ctx.currentTime);
              }
            }
          };
          this.helicopterSynth.setVolume(distance);
        })
        .catch(() => {
          // Fallback to synthesized helicopter
          const carrier = ctx.createOscillator();
          carrier.type = 'sawtooth';
          carrier.frequency.setValueAtTime(54, ctx.currentTime);

          const lowpass = ctx.createBiquadFilter();
          lowpass.type = 'lowpass';
          lowpass.frequency.setValueAtTime(110, ctx.currentTime);

          const mainGain = ctx.createGain();

          const lfo = ctx.createOscillator();
          lfo.type = 'sawtooth';
          lfo.frequency.setValueAtTime(7.6, ctx.currentTime); 
          const lfoGain = ctx.createGain();
          lfoGain.gain.setValueAtTime(0.75, ctx.currentTime);
          
          lfo.connect(lfoGain);
          lfoGain.connect(mainGain.gain);

          const tailCarrier = ctx.createOscillator();
          tailCarrier.type = 'sine';
          tailCarrier.frequency.setValueAtTime(185, ctx.currentTime);
          const tailLowpass = ctx.createBiquadFilter();
          tailLowpass.type = 'bandpass';
          tailLowpass.frequency.setValueAtTime(185, ctx.currentTime);
          tailLowpass.Q.setValueAtTime(3.5, ctx.currentTime);
          const tailGain = ctx.createGain();
          
          const tailLfo = ctx.createOscillator();
          tailLfo.type = 'sine';
          tailLfo.frequency.setValueAtTime(15.2, ctx.currentTime);
          const tailLfoGain = ctx.createGain();
          tailLfoGain.gain.setValueAtTime(0.45, ctx.currentTime);
          
          tailLfo.connect(tailLfoGain);
          tailLfoGain.connect(tailGain.gain);
          tailCarrier.connect(tailLowpass);
          tailLowpass.connect(tailGain);

          const turbine = ctx.createOscillator();
          turbine.type = 'sine';
          turbine.frequency.setValueAtTime(1450, ctx.currentTime);
          const turbineGain = ctx.createGain();
          turbineGain.gain.setValueAtTime(0.05, ctx.currentTime);
          turbine.connect(turbineGain);

          const noise = ctx.createBufferSource();
          noise.buffer = this.getPinkNoise(ctx);
          noise.loop = true;
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'lowpass';
          noiseFilter.frequency.setValueAtTime(85, ctx.currentTime);
          const noiseGain = ctx.createGain();
          lfoGain.connect(noiseGain.gain);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);

          const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          const masterMix = ctx.createGain();

          carrier.connect(lowpass);
          lowpass.connect(mainGain);
          
          mainGain.connect(masterMix);
          tailGain.connect(masterMix);
          turbineGain.connect(masterMix);
          noiseGain.connect(masterMix);

          if (panner) {
            masterMix.connect(panner);
            panner.connect(this.getSfxDest());
          } else {
            masterMix.connect(this.getSfxDest());
          }

          carrier.start();
          lfo.start();
          tailCarrier.start();
          tailLfo.start();
          turbine.start();
          noise.start();

          this.helicopterSynth = {
            stop: () => {
              try { carrier.stop(); } catch (e) {}
              try { lfo.stop(); } catch (e) {}
              try { tailCarrier.stop(); } catch (e) {}
              try { tailLfo.stop(); } catch (e) {}
              try { turbine.stop(); } catch (e) {}
              try { noise.stop(); } catch (e) {}
            },
            setVolume: (d: number) => {
              const finalVol = Math.max(0, 0.4 * this.sfxVolume * (1 - d));
              masterMix.gain.setValueAtTime(finalVol, ctx.currentTime);
              if (panner) {
                panner.pan.setValueAtTime(pan, ctx.currentTime);
              }
            }
          };
          this.helicopterSynth.setVolume(distance);
        });
    } else {
      this.helicopterSynth.setVolume(distance);
    }
  }

  public stopHelicopter() {
    if (this.helicopterSynth) {
      this.helicopterSynth.stop();
      this.helicopterSynth = null;
    }
  }

  // ── WEATHER & ATMOSPHERE LOOP SYNTH ───────────────────────────

  public startWindAmbience(initialWeather: WeatherType = WeatherType.CLEAR) {
    if (this.windSynth) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const windSource = ctx.createBufferSource();
    windSource.buffer = this.getPinkNoise(ctx);
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.Q.setValueAtTime(4.0, now);
    windFilter.frequency.setValueAtTime(450, now);

    const gustLfo = ctx.createOscillator();
    gustLfo.type = 'sine';
    gustLfo.frequency.setValueAtTime(0.06, now);
    
    const gustLfoGain = ctx.createGain();
    gustLfoGain.gain.setValueAtTime(250, now);

    gustLfo.connect(gustLfoGain);
    gustLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);

    windSource.connect(windFilter);
    windFilter.connect(windGain);

    const rainSource = ctx.createBufferSource();
    rainSource.buffer = this.getPinkNoise(ctx);
    rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.setValueAtTime(4000, now);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0, now);

    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);

    const windMix = ctx.createGain();
    windMix.gain.setValueAtTime(0, now);

    windGain.connect(windMix);
    rainGain.connect(windMix);
    windMix.connect(this.getMusicDest());

    windSource.start(now);
    gustLfo.start(now);
    rainSource.start(now);

    let thunderTimer: any = null;
    const setupThunder = (active: boolean) => {
      if (thunderTimer) {
        clearInterval(thunderTimer);
        thunderTimer = null;
      }
      if (active) {
        thunderTimer = setInterval(() => {
          if (Math.random() < 0.08) {
            const delayTime = Math.random() * 2;
            setTimeout(() => {
              const currentCtx = this.getContext();
              if (currentCtx && this.windSynth) {
                this.triggerThunderStrike(currentCtx, currentCtx.currentTime);
              }
            }, delayTime * 1000);
          }
        }, 12000);
      }
    };

    this.windSynth = {
      stop: () => {
        try { windSource.stop(); } catch (e) {}
        try { gustLfo.stop(); } catch (e) {}
        try { rainSource.stop(); } catch (e) {}
        if (thunderTimer) clearInterval(thunderTimer);
        try { windMix.disconnect(); } catch (e) {}
      },
      setVolume: (v: number) => {
        windMix.gain.linearRampToValueAtTime(v, ctx.currentTime + 0.3);
      },
      updateWeather: (type: WeatherType) => {
        const time = ctx.currentTime;
        let windVol = 0.0;
        let rainVol = 0.0;
        let isStorm = false;

        switch (type) {
          case WeatherType.CLEAR:
            windVol = 0.04;
            rainVol = 0.0;
            break;
          case WeatherType.CLOUDY:
            windVol = 0.08;
            rainVol = 0.0;
            break;
          case WeatherType.FOGGY:
            windVol = 0.05;
            rainVol = 0.0;
            windFilter.Q.setValueAtTime(1.5, time);
            break;
          case WeatherType.RAINY:
            windVol = 0.12;
            rainVol = 0.08;
            windFilter.Q.setValueAtTime(3.5, time);
            break;
          case WeatherType.STORM:
            windVol = 0.22;
            rainVol = 0.16;
            isStorm = true;
            windFilter.Q.setValueAtTime(6.0, time);
            break;
        }

        const masterVol = this.musicVolume;
        windGain.gain.linearRampToValueAtTime(windVol, time + 2.0);
        rainGain.gain.linearRampToValueAtTime(rainVol, time + 2.0);
        windMix.gain.linearRampToValueAtTime(masterVol, time + 1.0);

        setupThunder(isStorm);
      }
    };

    this.windSynth.updateWeather(initialWeather);
  }

  private triggerThunderStrike(ctx: AudioContext, time: number) {
    const brown = ctx.createBufferSource();
    brown.buffer = this.getBrownNoise(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(95, time);
    filter.frequency.exponentialRampToValueAtTime(10, time + 4.5);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.58 * this.musicVolume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 4.5);

    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    
    brown.connect(filter);
    filter.connect(gain);
    
    if (panner) {
      panner.pan.setValueAtTime(Math.random() * 2 - 1, time);
      gain.connect(panner);
      panner.connect(this.getMusicDest());
    } else {
      gain.connect(this.getMusicDest());
    }

    brown.start(time);
    brown.stop(time + 4.5);
  }

  public updateWeatherAmbience(type: WeatherType) {
    if (this.windSynth) {
      this.windSynth.updateWeather(type);
    }
  }

  public stopWindAmbience() {
    if (this.windSynth) {
      this.windSynth.stop();
      this.windSynth = null;
    }
  }

  // ── CLEANUP ───────────────────────────────────────────────────

  public stopAllGameSounds() {
    this.stopGunfireAmbient();
    this.stopHelicopter();
    this.stopWindAmbience();
    this.stopWarAmbience();
  }
}

export const audioManager = AudioManager.getInstance();
