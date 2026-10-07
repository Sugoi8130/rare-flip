import originalUrl from "./assets/shop-items-v2.png";
import modernUrl from "./assets/shop-items-v3.png";
import skateboardUrl from "./assets/mint-skateboard.png";
import { drawRoyalAura } from "./aura-art";

const images = new Map<string, HTMLImageElement>();
function imageFor(url: string) { let image = images.get(url); if (!image) { image = new Image(); image.src = url; images.set(url, image); } return image; }
export function sprite(ctx: CanvasRenderingContext2D, url: string, rect: number[], x: number, bottom: number, width: number, mirror = false) {
  const image = imageFor(url); if (!image.complete || !image.naturalWidth) return;
  const [sx,sy,sw,sh] = rect, height = Math.round(width * sh / sw);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(bottom)); if (mirror) ctx.scale(-1, 1);
  ctx.drawImage(image, sx * image.naturalWidth / 1254, sy * image.naturalHeight / 1254, sw * image.naturalWidth / 1254, sh * image.naturalHeight / 1254, -Math.round(width / 2), -height, width, height);
  ctx.restore();
}
export function drawFriendCostumes(ctx: CanvasRenderingContext2D, equipped: Record<string,string>, x: number, bottom: number, headTop: number, facing: string, time: number, reducedMotion: boolean, layer: "back" | "front") {
  const items = Object.values(equipped), mirror = facing === "left";
  if (layer === "back") {
    if (items.includes("aura")) {
      const cy = (headTop + bottom) / 2, ry = Math.max(30, (bottom - headTop) / 2 + 9);
      drawRoyalAura(ctx, x, cy, 36, ry, 2, time, reducedMotion);
    }
    if (items.includes("wings")) {
      // Split the existing pair into separate wings, leaving a clear center.
      sprite(ctx, modernUrl, [827,515,145,336], x - 26, bottom - 7, 17);
      sprite(ctx, modernUrl, [1099,515,145,336], x + 26, bottom - 7, 17);
    }
    if (items.includes("skateboard")) {
      const image = imageFor(skateboardUrl);
      if (image.complete && image.naturalWidth) {
        ctx.save(); ctx.translate(Math.round(x), Math.round(bottom + 4)); if (mirror) ctx.scale(-1,1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, image.naturalWidth * .07, image.naturalHeight * .25, image.naturalWidth * .86, image.naturalHeight * .66, -24, 0, 48, 17);
        ctx.restore();
      }
    }
    return;
  }
  // Small headpieces end at the top of the silhouette, above the face.
  if (items.includes("beanie")) sprite(ctx, modernUrl, [24,490,389,393], x, headTop + 3, 23, mirror);
  if (items.includes("royal-crown")) sprite(ctx, originalUrl, [36,539,370,299], x, headTop + 3, 25, mirror);
  if (items.includes("arcane-hat")) sprite(ctx, originalUrl, [420,489,415,367], x, headTop + 3, 26, mirror);
}
