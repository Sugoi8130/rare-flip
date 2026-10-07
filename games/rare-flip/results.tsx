import { useEffect, useRef } from "react";
import resultUrl from "./assets/result-concept.png";
import { pixelText } from "./pixel-text";

let resultImage: HTMLImageElement | null = null;
export function ResultBanner({ won, reward }: { won: boolean; reward: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!resultImage) { resultImage = new Image(); resultImage.src = resultUrl; }
    const canvas = ref.current!, ctx = canvas.getContext("2d")!;
    let active = true;
    const paint = () => {
      if (!active || !resultImage?.naturalWidth) return;
      ctx.clearRect(0, 0, 600, 360); ctx.imageSmoothingEnabled = false;
      const x = won ? 224 : 1090, y = 102, w = won ? 443 : 488, h = 252;
      ctx.save(); ctx.translate(35, 76); ctx.scale(530 / w, 265 / h);
      ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(w - 78, 0); ctx.lineTo(w - 78, 15); ctx.lineTo(w - 36, 15); ctx.lineTo(w - 36, 44); ctx.lineTo(w - 15, 44); ctx.lineTo(w - 15, 72); ctx.lineTo(w, 72); ctx.lineTo(w, h - 66); ctx.lineTo(w - 15, h - 66); ctx.lineTo(w - 15, h - 34); ctx.lineTo(w - 40, h - 34); ctx.lineTo(w - 40, h - 12); ctx.lineTo(w - 75, h - 12); ctx.lineTo(w - 75, h); ctx.lineTo(75, h); ctx.lineTo(75, h - 12); ctx.lineTo(40, h - 12); ctx.lineTo(40, h - 34); ctx.lineTo(15, h - 34); ctx.lineTo(15, h - 66); ctx.lineTo(0, h - 66); ctx.lineTo(0, 72); ctx.lineTo(15, 72); ctx.lineTo(15, 44); ctx.lineTo(36, 44); ctx.lineTo(36, 15); ctx.lineTo(78, 15); ctx.closePath(); ctx.clip();
      ctx.drawImage(resultImage, x, y, w, h, 0, 0, w, h);
      if (won) { ctx.fillStyle = "#00553c"; ctx.fillRect(76, 146, w - 152, 52); pixelText(ctx, `+${reward}`, w / 2, 171, w - 105, "#ffe568"); }
      ctx.restore();
      // The emblem is another clipped artwork layer, not the room background.
      ctx.save(); ctx.beginPath(); ctx.moveTo(256, 12); ctx.lineTo(344, 12); ctx.lineTo(344, 48); ctx.lineTo(374, 48); ctx.lineTo(374, 112); ctx.lineTo(226, 112); ctx.lineTo(226, 48); ctx.lineTo(256, 48); ctx.closePath(); ctx.clip();
      ctx.drawImage(resultImage, won ? 372 : 1274, won ? 48 : 57, 139, 99, 226, 6, 148, 112); ctx.restore();
    };
    if (resultImage.complete) paint();
    resultImage.addEventListener("load", paint);
    return () => { active = false; resultImage?.removeEventListener("load", paint); };
  }, [won, reward]);
  return <div className={`result-burst ${won ? "win" : "lose"}`} role="status" aria-live="assertive"><canvas ref={ref} width={600} height={360} aria-hidden="true" /><strong className="result-accessible">{won ? "WIN" : "LOSE"}</strong><span className="result-accessible">{won ? `+${reward} net reward` : "Better luck next flip. 0 RF"}</span></div>;
}

export function resultEffects(ctx: CanvasRenderingContext2D, won: boolean, elapsed: number, reduced: boolean) {
  const colors = won ? ["#ffe66b", "#64f3ff", "#ff75d9", "#fff6cf"] : ["#ac82e2", "#e1c0ff", "#ffe3f1"];
  if (won) {
    for (let side = 0; side < 2; side++) {
      const t = reduced ? .55 : ((elapsed + side * 550) % 1800) / 1800;
      const radius = 22 + t * 85;
      for (let ray = 0; ray < 16; ray++) {
        const angle = ray * Math.PI / 8;
        for (let trail = 0; trail < 3; trail++) {
          ctx.globalAlpha = (1 - t * .35) * (1 - trail * .18);
          ctx.fillStyle = colors[(ray + side) % colors.length];
          const r = radius - trail * 10, size = trail === 0 ? 8 : 5;
          ctx.fillRect(Math.round((side ? 749 : 211) + Math.cos(angle) * r), Math.round(143 + Math.sin(angle) * r), size, size);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  const count = won ? 40 : 20;
  for (let i = 0; i < count; i++) {
    const t = reduced ? .48 : ((elapsed / (won ? 1600 : 2200) + i * .067) % 1);
    const side = i % 2, angle = i * 2.399;
    const radius = won ? t * 83 : 0;
    const x = won ? (side ? 757 : 203) + Math.cos(angle) * radius : 355 + (i * 43 % 240);
    const y = won ? 120 + Math.sin(angle) * radius + t * t * 25 : 224 + t * 153;
    ctx.globalAlpha = reduced ? .85 : 1 - t;
    ctx.fillStyle = colors[i % colors.length];
    const size = i % 4 === 0 ? 5 : 3;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
    if (i % 5 === 0) { ctx.fillRect(Math.round(x) - 3, Math.round(y) + 1, size + 6, 2); ctx.fillRect(Math.round(x) + 1, Math.round(y) - 3, 2, size + 6); }
  }
  ctx.globalAlpha = 1;
  if (!won) {
    ctx.fillStyle = "#f7e6ff"; ctx.fillRect(524, 290, 30, 22); ctx.fillRect(528, 286, 22, 30); ctx.fillRect(522, 310, 6, 6);
    ctx.fillStyle = "#572a77"; ctx.fillRect(538, 291, 4, 17); ctx.fillRect(531, 298, 17, 4);
  }
}
