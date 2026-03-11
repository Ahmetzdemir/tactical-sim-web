import { Howl, Howler } from 'howler';

class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl> = new Map();
  private ambience: Howl | null = null;
  private helicopter: Howl | null = null;
  private gunfire: Howl | null = null;

  private musicVolume: number = 0.5;
  private sfxVolume: number = 1.0;

  private constructor() {
    Howler.volume(1.0);
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public setMute(muted: boolean) {
    Howler.mute(muted);
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = volume;
    if (this.ambience) {
      this.ambience.volume(0.15 * this.musicVolume);
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = volume;
    if (this.gunfire) {
      this.gunfire.volume(0.3 * this.sfxVolume);
    }
    if (this.helicopter) {
      // Helicopter volume is dynamic, but we can update its scale
      // For simplicity, we just set the multiplier
    }
    // Note: Active one-shot effects can't be updated mid-playback easily without tracking them,
    // but future effects will use the new volume.
  }

  public playClick() {
    this.playEffect('tactical_click', '/sounds/tactical_click.mp3', 0.5);
  }

  public playRadioBeep() {
    this.playEffect('radio_beep', '/sounds/radio_beep.mp3', 0.6);
  }

  public playRogerThat() {
    const variations = ['roger_that', 'roger_that_2', 'roger_that_3'];
    const selected = variations[Math.floor(Math.random() * variations.length)];
    this.playEffect(selected, `/sounds/${selected}.mp3`, 0.8);
  }

  public playTankFire() {
    this.playEffect('tank_fire', '/sounds/tank_fire.mp3', 0.9);
  }

  public playTankMove() {
    this.playEffect('tank_move', '/sounds/tank_move.mp3', 0.9);
  }

  public playAirStrike() {
    this.playEffect('f16_flyby', '/sounds/f16_flyby.mp3', 0.8);
  }

  public playSniperShot() {
    this.playEffect('sniper_shot', '/sounds/sniper_shot.mp3', 1.0);
  }

  public playArtilleryImpact() {
    this.playEffect('artillery_impact', '/sounds/artillery_impact.mp3', 1.0);
  }

  public startWarAmbience() {
    if (this.ambience) return;
    this.ambience = new Howl({
      src: ['/sounds/war_ambience.mp3'],
      loop: true,
      volume: 0.15 * this.musicVolume,
      html5: true,
    });
    this.ambience.play();
  }

  public stopWarAmbience() {
    if (this.ambience) {
      this.ambience.stop();
      this.ambience = null;
    }
  }

  public startGunfireAmbient() {
    if (this.gunfire) return;
    this.gunfire = new Howl({
      src: ['/sounds/gunfire_ambient.mp3'],
      loop: true,
      volume: 0.3 * this.sfxVolume,
    });
    this.gunfire.play();
  }

  public stopGunfireAmbient() {
    if (this.gunfire) {
      this.gunfire.stop();
      this.gunfire = null;
    }
  }

  public playHelicopter(distance: number = 0, pan: number = 0) {
    if (!this.helicopter) {
      this.helicopter = new Howl({
        src: ['/sounds/helicopter_rotor.mp3'],
        loop: true,
        volume: 0.5 * this.sfxVolume,
      });
      this.helicopter.play();
    }
    
    const vol = Math.max(0, (0.5 * this.sfxVolume) * (1 - distance));
    this.helicopter.volume(vol);
    this.helicopter.stereo(pan);
  }

  public stopHelicopter() {
    if (this.helicopter) {
      this.helicopter.stop();
      this.helicopter = null;
    }
  }

  public stopAllGameSounds() {
    this.stopGunfireAmbient();
    this.stopHelicopter();
  }

  private playEffect(key: string, path: string, volume: number = 1.0) {
    let sound = this.sounds.get(key);
    if (!sound) {
      sound = new Howl({
        src: [path],
        volume: volume * this.sfxVolume,
        preload: true,
      });
      this.sounds.set(key, sound);
    } else {
      sound.volume(volume * this.sfxVolume);
    }
    sound.play();
  }
}

export const audioManager = AudioManager.getInstance();
