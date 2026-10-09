import {spriteFrame,type Facing as SpriteFacing} from '@rarefriends/friendsdk';
import type {GenerationSprites} from './game-model';
import { renderRoom, renderArtCoin } from "./artwork";
import { resultEffects } from "./results";
import { drawRoomDecoration } from "./shop-art";
import { decorLayout, type RoomPositions } from "./room-layout";
import { drawFriendCostumes } from "./costume-renderer";
import { drawFriendEffect } from "./effect-renderer";
import { drawPet, type PetPosition } from "./extra-art";
import type { RoomId } from "./rooms";
type Side="heads" | "tails";
type Phase="idle" | "working" | "flipping" | "result";
export type Player={x:number;y:number;facing:SpriteFacing;walking:boolean};
const friendRasterCache=new Map<string,HTMLCanvasElement>();
function drawFriend(ctx: CanvasRenderingContext2D, sprites: GenerationSprites, x: number, bottom: number, scale: number, frame: number, walking = false, facing: SpriteFacing = "down") {
  const key = `${sprites.cacheKey}:${facing}:${walking}:${frame}`;
  const cached = friendRasterCache.get(key);
  if (cached) { ctx.imageSmoothingEnabled = false; ctx.drawImage(cached, Math.round(x - scale * 9), Math.round(bottom - scale * 17), scale * 18, scale * 18); return; }
  const rows = spriteFrame(sprites, facing, walking, frame);
  // Fill enclosed gaps so the body remains solid black, while preserving
  // all spaces connected to the outside (ears, limbs and the silhouette).
  const outside = new Set<number>(), queue: number[] = [];
  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= 16 || y >= 16 || rows[y][x] === "#" || outside.has(y * 16 + x)) return;
    outside.add(y * 16 + x); queue.push(y * 16 + x);
  };
  for (let i = 0; i < 16; i++) { enqueue(i, 0); enqueue(i, 15); enqueue(0, i); enqueue(15, i); }
  for (let i = 0; i < queue.length; i++) { const x = queue[i] % 16, y = Math.floor(queue[i] / 16); enqueue(x - 1, y); enqueue(x + 1, y); enqueue(x, y - 1); enqueue(x, y + 1); }
  const points: Array<[number, number]> = [];
  rows.forEach((row, py) => [...row].forEach((pixel, px) => { if (pixel === "#" || !outside.has(py * 16 + px)) points.push([px, py]); }));
  // Rasterize at integer source pixels first. Drawing many scaled rectangles
  // directly exposes white seams when the canvas scale is fractional.
  const sprite = document.createElement("canvas"); sprite.width = sprite.height = 18;
  const art = sprite.getContext("2d")!;
  art.fillStyle = "#fff8e8";
  points.forEach(([px, py]) => art.fillRect(px, py, 3, 3));
  art.fillStyle = "#000000";
  points.forEach(([px, py]) => art.fillRect(px + 1, py + 1, 1, 1));
  // The front clip already faces the viewer. Keep its solid silhouette,
  // but add two deliberate eye pixels so it does not read as a back view.
  if (facing === "down") {
    const occupied = new Set(points.map(([px, py]) => py * 16 + px));
    const top = Math.min(...points.map(([, py]) => py));
    for (let y = top + 4; y <= Math.min(top + 7, 10); y++) {
      const xs = points.filter(([, py]) => py === y).map(([px]) => px);
      if (!xs.length) continue;
      const left = Math.min(...xs), right = Math.max(...xs);
      if (right - left < 6) continue;
      const eyes = [left + 2, right - 2];
      if (!eyes.every(x => [x - 1, x, x + 1].every(px => occupied.has(y * 16 + px)) && occupied.has((y - 1) * 16 + x) && occupied.has((y + 1) * 16 + x))) continue;
      art.fillStyle = "#fff8e8";
      eyes.forEach(x => art.fillRect(x + 1, y + 1, 1, 1));
      break;
    }
  }
  ctx.imageSmoothingEnabled = false;
  if (friendRasterCache.size >= 128) friendRasterCache.clear();
  friendRasterCache.set(key, sprite);
  ctx.drawImage(sprite, Math.round(x - scale * 9), Math.round(bottom - scale * 17), scale * 18, scale * 18);
}


export function paintArcade(ctx: CanvasRenderingContext2D, sprites: GenerationSprites | null, phase: Phase, landed: Side | null, started: number, now: number, reducedMotion: boolean, player: Player, won: boolean, roomItems: string[], roomPositions: RoomPositions, costumes: Record<string,string>, pet: PetPosition,theme:RoomId) {
  renderRoom(ctx,theme);
  const decorationBottom = (id: string) => decorLayout(id, roomPositions)?.y ?? 0;
  const sortedDecorations = [...roomItems].sort((a, b) => decorationBottom(a) - decorationBottom(b));
  sortedDecorations.filter(id => decorationBottom(id) < player.y).forEach(id => drawRoomDecoration(ctx, id, roomPositions));
  const p = Math.min(1, Math.max(0, (now - started) / 2700));
  const flipping = phase === "flipping" && !reducedMotion;
  // Ease-out rotation: a completed flip always ends on the settled face.
  const rotations = landed === "tails" ? 8.5 : 8;
  const squash = flipping ? Math.cos((1 - Math.pow(1 - p, 2)) * rotations * Math.PI * 2) : 1;
  const heads = flipping ? squash >= 0 : landed !== "tails";
  const resultAge = Math.max(0, now - started);
  renderArtCoin(ctx, 480, phase === "result" ? 257 : flipping ? 188 - Math.sin(p * Math.PI) * 90 : 185 + (reducedMotion ? 0 : Math.round(Math.sin(now / 460) * 2)), phase === "result" ? 47 : 57, heads, squash);
  if (sprites) {
    if (costumes.PET && pet.y < player.y) drawPet(ctx,costumes.PET,pet,now,reducedMotion);
    ctx.fillStyle = "#1d132d"; ctx.fillRect(Math.round(player.x - 20), Math.round(player.y - 2), 40, 5);
    const bob = reducedMotion ? 0 : Math.round(Math.sin(now / (player.walking ? 100 : 300)) * 2);
    const celebration = phase === "result" && !reducedMotion ? won ? -Math.round(Math.abs(Math.sin(resultAge / 240)) * 22) : Math.round((1 - Math.cos(resultAge / 420)) * 2) : 0;
    ctx.save();
    if (phase === "result" && !won && !reducedMotion) { ctx.translate(player.x, player.y); ctx.rotate(Math.sin(resultAge / 600) > 0 ? -.055 : .055); ctx.translate(-player.x, -player.y); }
    const frameIndex = reducedMotion ? 0 : Math.floor(now / (player.walking ? 110 : 280)) % 8;
    const rows = spriteFrame(sprites, player.facing, player.walking, frameIndex);
    const topRow = Math.max(0, rows.findIndex(row => row.includes("#")));
    const bottom = player.y + bob + celebration, headTop = bottom - 68 + topRow * 4;
    drawFriendCostumes(ctx, costumes, player.x, bottom, headTop, player.facing, now, reducedMotion, "back");
    drawFriend(ctx, sprites, player.x, bottom, 4, frameIndex, player.walking, player.facing);
    drawFriendCostumes(ctx, costumes, player.x, bottom, headTop, player.facing, now, reducedMotion, "front");
    drawFriendEffect(ctx, costumes.EFFECTS, player.x, bottom, headTop, now, reducedMotion, phase === "result" && won, resultAge);
    ctx.restore();
    if (costumes.PET && pet.y >= player.y) drawPet(ctx,costumes.PET,pet,now,reducedMotion);
    // Table collision keeps floor-level characters outside its footprint.
    // Draw front-floor characters over the room; an opaque table/background
    // crop here would erase their head and body at the newer rooms' edge.
  }
  sortedDecorations.filter(id => decorationBottom(id) >= player.y).forEach(id => drawRoomDecoration(ctx, id, roomPositions));
  if (!reducedMotion) {
    for (let i = 0; i < 4; i++) { const a = now / 1200 + i * Math.PI / 2; ctx.fillStyle = i % 2 ? "#fff9af" : "#ffce31"; ctx.fillRect(Math.round(480 + Math.cos(a) * 75), Math.round(185 + Math.sin(a) * 60), 4, 4); }
  }
  if (phase === "result") resultEffects(ctx, won, resultAge, reducedMotion);
}
