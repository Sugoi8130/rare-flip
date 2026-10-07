import { useEffect, useRef } from "react";
import atlasUrl from "./assets/shop-items-v3.png";
import skateboardUrl from "./assets/mint-skateboard.png";
import classicUrl from "./assets/shop-items-v2.png";
import { decorLayout, type RoomPositions } from "./room-layout";
import { drawRoyalAura } from "./aura-art";

const ids = ["aquarium", "cat", "blossom", "beanie", "scarf", "wings", "hearts", "orbit", "confetti"];
let atlas: HTMLImageElement | null = null;
let skateboard: HTMLImageElement | null = null;
let classic: HTMLImageElement | null = null;
export function drawRoomDecoration(ctx: CanvasRenderingContext2D, id: string, positions: RoomPositions) {
  const layout = decorLayout(id, positions); if (!layout) return;
  if (!atlas) { atlas = new Image(); atlas.src = atlasUrl; }
  if (!atlas.complete || !atlas.naturalWidth) return;
  const index = ids.indexOf(id);
  const [x, y, w, h] = [[34,10,377,470],[429,65,400,405],[852,38,392,440]][index];
  const sx = atlas.naturalWidth / 1254, sy = atlas.naturalHeight / 1254;
  const height = Math.round(layout.width * h / w);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#1d132b";
  ctx.fillRect(Math.round(layout.x - layout.width * .4), layout.y - 3, Math.round(layout.width * .8), 4);
  ctx.drawImage(atlas, x * sx, y * sy, w * sx, h * sy, Math.round(layout.x - layout.width / 2), layout.y - height, layout.width, height);
}
export function ItemArt({ id, className = "" }: { id: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (id === "aura") {
      const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
      ctx.clearRect(0, 0, 256, 256);
      drawRoyalAura(ctx, 128, 128, 90, 100, 4, 0, true);
      canvas.current!.dataset.loaded = "true"; return;
    }
    if (id === "royal-crown" || id === "arcane-hat") {
      if (!classic) { classic = new Image(); classic.src = classicUrl; }
      const paintClassic = () => {
        const ctx = canvas.current?.getContext("2d"); if (!ctx || !classic?.naturalWidth) return;
        const [x, y, w, h] = id === "royal-crown" ? [36,539,370,299] : [420,489,415,367];
        const sx = classic.naturalWidth / 1254, sy = classic.naturalHeight / 1254;
        const scale = Math.min(220 / w, 220 / h), dw = Math.round(w * scale), dh = Math.round(h * scale);
        ctx.clearRect(0, 0, 256, 256); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(classic, x * sx, y * sy, w * sx, h * sy, Math.round((256 - dw) / 2), 238 - dh, dw, dh);
        canvas.current!.dataset.loaded = "true";
      };
      if (classic.complete) paintClassic(); else classic.addEventListener("load", paintClassic);
      return () => classic?.removeEventListener("load", paintClassic);
    }
    if (id === "skateboard") {
      if (!skateboard) { skateboard = new Image(); skateboard.src = skateboardUrl; }
      const paintBoard = () => {
        const ctx = canvas.current?.getContext("2d"); if (!ctx || !skateboard?.naturalWidth) return;
        const x = skateboard.naturalWidth * .07, y = skateboard.naturalHeight * .25;
        const w = skateboard.naturalWidth * .86, h = skateboard.naturalHeight * .66;
        const scale = Math.min(220 / w, 82 / h), dw = Math.round(w * scale), dh = Math.round(h * scale);
        ctx.clearRect(0, 0, 256, 96); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(skateboard, x, y, w, h, Math.round((256 - dw) / 2), Math.round((96 - dh) / 2), dw, dh);
        canvas.current!.dataset.loaded = "true";
      };
      if (skateboard.complete) paintBoard(); else skateboard.addEventListener("load", paintBoard);
      return () => skateboard?.removeEventListener("load", paintBoard);
    }
    if (!atlas) { atlas = new Image(); atlas.src = atlasUrl; }
    const paint = () => {
      const ctx = canvas.current?.getContext("2d"); if (!ctx || !atlas?.naturalWidth) return;
      const index = ids.indexOf(id); if (index < 0) return;
      // Explicit artwork bounds keep the full silhouettes. Do not read canvas
      // pixels: FriendSDK's sandbox loads these assets across opaque origins.
      const bounds = [[34,10,377,470],[429,65,400,405],[852,38,392,440],
        [24,490,389,393],[435,532,372,341],[827,515,417,336],
        [26,882,390,360],[435,875,389,374],[836,864,408,380]];
      const [x, y, w, h] = bounds[index];
      const sx = atlas.naturalWidth / 1254, sy = atlas.naturalHeight / 1254;
      const scale = Math.min(220 / w, 220 / h), dw = Math.round(w * scale), dh = Math.round(h * scale);
      ctx.clearRect(0, 0, 256, 256); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(atlas, x * sx, y * sy, w * sx, h * sy, Math.round((256 - dw) / 2), 238 - dh, dw, dh);
      canvas.current!.dataset.loaded = "true";
    };
    if (atlas.complete) paint(); else atlas.addEventListener("load", paint);
    return () => atlas?.removeEventListener("load", paint);
  }, [id]);
  return <canvas width={256} height={id === "skateboard" ? 96 : 256} ref={canvas} className={`${className} item-sprite ${ids.indexOf(id) >= 6 || id === "aura" ? `sprite-effect sprite-${id}` : ""}`} aria-hidden="true" />;
}
