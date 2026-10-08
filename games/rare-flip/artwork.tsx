import { useEffect, useRef } from "react";
import roomUrl from "./assets/arcade-room.png";
import approvedUrl from "./assets/approved-artwork.png";
import { pixelText } from "./pixel-text";
import { roomAsset, type RoomId } from "./rooms";
const themes=new Map<RoomId,HTMLImageElement>();
function roomImage(id:RoomId) {
  if(id === "classic") return artworkImages().room;
  let image=themes.get(id); if(!image) { image=new Image();image.src=roomAsset(id);themes.set(id,image); } return image;
}

let room: HTMLImageElement | null = null, approved: HTMLImageElement | null = null;
export function artworkImages() {
  if (!room) { room = new Image(); room.src = roomUrl; approved = new Image(); approved.src = approvedUrl; }
  return { room, approved: approved! };
}

export function renderRoom(ctx: CanvasRenderingContext2D, theme:RoomId="classic") {
  const room=roomImage(theme);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.scale(ctx.canvas.width / 960, ctx.canvas.height / 540); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#10051f"; ctx.fillRect(0, 0, 960, 540);
  if (room.complete && room.naturalWidth) ctx.drawImage(room, 0, 0, room.naturalWidth, room.naturalHeight, 0, 0, 960, 540);
}

export function renderArtCoin(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, heads: boolean, squash: number) {
  const { approved } = artworkImages();
  if (!approved.complete || !approved.naturalWidth) return;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(Math.max(.04, Math.abs(squash)), 1);
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.clip();
  if (heads) ctx.drawImage(approved, 734, 220, 204, 196, -radius, -radius, radius * 2, radius * 2);
  else ctx.drawImage(approved, 186, 768, 90, 89, -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

export function ArtButton({ side, label, paused }: { side: "heads" | "tails" | "action"; label?: string; paused: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d"); if (!ctx) return;
    let frame = 0, clock = 0, previous = performance.now();
    const render = (now: number) => {
      if (!paused) clock += Math.min(now - previous, 40); previous = now;
      ctx.clearRect(0, 0, 500, 160); ctx.imageSmoothingEnabled = false;
      const { approved } = artworkImages();
      if (approved.complete && approved.naturalWidth) {
        // Include the complete stepped border, shadow and aura with padding.
        const [x, y, width, height] = side === "tails" ? [112, 736, 466, 152] : side === "heads" ? [1097, 736, 466, 152] : [593, 736, 490, 152];
        const scale = Math.min(500 / width, 160 / height);
        const offsetX = (500 - width * scale) / 2, offsetY = (160 - height * scale) / 2;
        ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale);
        ctx.drawImage(approved, x, y, width, height, 0, 0, width, height);
        // Replace baked Vietnamese lettering using a clean background strip.
        if (side === "action") {
          ctx.drawImage(approved, x + 40, y + 36, 4, 82, 40, 36, width - 80, 82);
          pixelText(ctx, label || "FLIP COIN", width / 2, 77, width - 100, "#140c23");
        } else {
          ctx.drawImage(approved, x + width - 38, y + 28, 4, 100, 210, 28, width - 232, 100);
          pixelText(ctx, side === "tails" ? "TAILS" : "HEADS", (210 + width - 22) / 2, 76, width - 248, "#100c20");
          pixelText(ctx, side === "tails" ? "TAILS" : "HEADS", (210 + width - 22) / 2 - 2, 74, width - 248, "#fff8e8");
        }
        if (side !== "action") {
          ctx.strokeStyle = side === "tails" ? "#7efaff" : "#ff81ed";
          ctx.lineWidth = 3;
          const cx = side === "tails" ? 119 : 114, cy = 77, pulse = Math.floor(clock / 160) % 4;
          const r = 48 + pulse * 2, cut = 14;
          ctx.beginPath(); ctx.moveTo(cx - r + cut, cy - r); ctx.lineTo(cx + r - cut, cy - r); ctx.lineTo(cx + r, cy - r + cut); ctx.lineTo(cx + r, cy + r - cut); ctx.lineTo(cx + r - cut, cy + r); ctx.lineTo(cx - r + cut, cy + r); ctx.lineTo(cx - r, cy + r - cut); ctx.lineTo(cx - r, cy - r + cut); ctx.closePath(); ctx.stroke();
          for (let i = 0; i < 4; i++) { const a = clock / 700 + i * Math.PI / 2; const r = 53 + pulse * 2; ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 5, 5); }
        }
        ctx.restore();
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, [side, label, paused]);
  return <canvas className="button-art" ref={ref} width={500} height={160} aria-hidden="true" />;
}
