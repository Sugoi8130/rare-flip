import { useEffect, useRef, useState } from "react";

export type SoundCue = "click" | "flip" | "win" | "lose";
class PixelAudio {
  context: AudioContext | null = null;
  music = true; effects = true; paused = false;
  interval: ReturnType<typeof setInterval> | null = null;
  voices = new Map<OscillatorNode, "music" | "effects">();
  step = 0; next = 0; disposed = false;
  async unlock() {
    if (this.disposed) return;
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === "running") return;
      if (!this.paused && this.context.state === "suspended") await this.context.resume();
      this.sync();
    } catch { /* Audio unavailable must never block gameplay. */ }
  }
  tone(frequency: number, start: number, duration: number, volume: number, group: "music" | "effects", type: OscillatorType = "square") {
    const ctx = this.context; if (!ctx || this.disposed) return;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(ctx.destination);
    this.voices.set(oscillator, group);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
    oscillator.start(start); oscillator.stop(start + duration + .02);
  }
  stop(group?: "music" | "effects") {
    for (const [voice, kind] of this.voices) if (!group || kind === group) { try { voice.stop(); } catch {} }
  }
  sync() {
    const ctx = this.context; if (!ctx || this.disposed) return;
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (!this.effects) this.stop("effects");
    if (!this.music) this.stop("music");
    if (this.paused) { this.stop(); void ctx.suspend().catch(() => {}); return; }
    // Resume is attempted on a user gesture, never via unsolicited autoplay.
    if (ctx.state === "suspended") { void ctx.resume().then(() => { if (!this.disposed) this.sync(); }).catch(() => {}); return; }
    if (ctx.state !== "running" || !this.music) return;
    this.next = ctx.currentTime + .04;
    const melody = [72,76,79,76,74,77,81,77,71,74,79,74,72,76,79,83,76,79,84,79,74,77,81,77,71,74,79,83,72,76,79,0];
    const bass = [48,53,55,48,48,53,55,48];
    const tick = () => {
      while (this.next < ctx.currentTime + .15) {
        const note = melody[this.step % melody.length];
        if (note) this.tone(440 * 2 ** ((note - 69) / 12),this.next,.22,.025,"music","triangle");
        if (this.step % 4 === 0) this.tone(440 * 2 ** ((bass[Math.floor(this.step / 4) % bass.length] - 69) / 12),this.next,.65,.018,"music","triangle");
        this.next += .32; this.step++;
      }
    };
    tick(); this.interval = setInterval(tick,80);
  }
  cue(cue: SoundCue) {
    const ctx = this.context; if (!ctx || !this.effects || this.paused || this.disposed) return;
    if (ctx.state === "suspended") { void ctx.resume().then(() => this.cue(cue)).catch(() => {}); return; }
    if (ctx.state !== "running") return;
    const now = ctx.currentTime;
    if (cue === "click") { this.tone(720,now,.055,.035,"effects"); this.tone(1080,now+.025,.055,.025,"effects"); }
    if (cue === "flip") for (let i=0;i<10;i++) this.tone(i%2 ? 1320 : 880,now+i*.045+i*i*.012,.08,.028,"effects");
    if (cue === "win") for (const [i,f] of [523.25,659.25,783.99,1046.5].entries()) this.tone(f,now+i*.12,i===3?.55:.18,.045,"effects","triangle");
    if (cue === "lose") for (const [i,f] of [392,329.63,261.63].entries()) this.tone(f,now+i*.18,.3,.038,"effects","triangle");
  }
  close() {
    this.disposed=true; if (this.interval) clearInterval(this.interval);
    this.stop(); void this.context?.close().catch(() => {});
  }
}
export function usePixelSound(paused: boolean, phase: string, won: boolean) {
  const engine = useRef<PixelAudio | null>(null);
  const [music,setMusic] = useState(true), [effects,setEffects] = useState(true);
  if (!engine.current) engine.current = new PixelAudio();
  useEffect(() => {
    const audio=engine.current!;
    const sync=() => { audio.music=music; audio.effects=effects; audio.paused=paused || document.hidden; audio.sync(); };
    sync(); document.addEventListener("visibilitychange",sync);
    return () => document.removeEventListener("visibilitychange",sync);
  },[music,effects,paused]);
  useEffect(() => { if (phase === "flipping") engine.current!.cue("flip"); if (phase === "result") engine.current!.cue(won ? "win" : "lose"); },[phase,won]);
  useEffect(() => () => engine.current?.close(),[]);
  return { music,effects,setMusic,setEffects,unlock:() => void engine.current!.unlock(),click:() => engine.current!.cue("click") };
}
