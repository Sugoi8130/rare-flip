import atlasUrl from "./assets/shop-items-v3.png";
import { sprite } from "./costume-renderer";

// Cosmetic only. Uses the scene clock so host pause and reduced motion apply.
export function drawFriendEffect(ctx: CanvasRenderingContext2D, id: string | undefined, x: number, bottom: number, headTop: number, time: number, reducedMotion: boolean, win: boolean, resultAge: number) {
  if (!id) return;
  ctx.save();
  if (id === "hearts") {
    for (let i = 0; i < 4; i++) {
      const t = reducedMotion ? (i + .5) / 4 : (time / 2600 + i / 4) % 1;
      const side = i % 2 ? 1 : -1;
      ctx.globalAlpha = reducedMotion ? 1 : Math.min(1, t * 8, (1 - t) * 8);
      sprite(ctx, atlasUrl, [26,882,390,360], x + side * (47 + Math.sin(t * Math.PI) * 9), bottom - 4 - t * 68, 24);
    }
  } else if (id === "orbit") {
    const cy = (headTop + bottom) / 2, angle = reducedMotion ? -.65 : time / 2400;
    const radiusY = (bottom - headTop) / 2 + 34;
    const ox = x + Math.cos(angle) * 62, oy = cy + Math.sin(angle) * radiusY;
    // An ellipse outside the silhouette keeps the moon off the face.
    sprite(ctx, atlasUrl, [435,875,389,374], ox, oy + 18, 36);
    ctx.fillStyle = "#fff1cc";
    for (let i = 1; i <= 4; i++) {
      const a = angle - i * .24;
      ctx.globalAlpha = 1 - i * .16;
      const sx = Math.round(x + Math.cos(a) * 62), sy = Math.round(cy + Math.sin(a) * radiusY);
      ctx.fillRect(sx - 3, sy, 8, 2); ctx.fillRect(sx, sy - 3, 2, 8);
    }
  } else if (id === "confetti") {
    // Small idle ribbons show the equipped item; a win triggers the party burst.
    const celebrating = win && resultAge < 3200;
    const count = celebrating ? 32 : 10;
    const colors = ["#ff91ba", "#9df5ed", "#fff1b1", "#bcf27e"];
    for (let i = 0; i < count; i++) {
      const t = reducedMotion ? (i + .5) / count : ((celebrating ? resultAge / 1600 : time / 3200) + i * .137) % 1;
      const side = i % 2 ? 1 : -1;
      const px = x + side * (43 + (celebrating ? t * 65 : (i % 3) * 9));
      const py = celebrating ? headTop - 22 + t * t * 115 : bottom - 10 - t * 68;
      ctx.globalAlpha = reducedMotion ? 1 : Math.min(1, t * 8, (1 - t) * 8);
      const width = i % 2 ? 3 : 6, height = i % 2 ? 6 : 3;
      ctx.fillStyle = "#392440"; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, width + 2, height + 2);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(Math.round(px), Math.round(py), width, height);
      ctx.fillStyle = "#fff8e1"; ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
    if (celebrating) {
      ctx.globalAlpha = 1;
      sprite(ctx, atlasUrl, [836,864,408,380], x - 73, headTop + 2, 34);
      sprite(ctx, atlasUrl, [836,864,408,380], x + 73, headTop + 2, 34, true);
    }
  }
  ctx.restore();
}
