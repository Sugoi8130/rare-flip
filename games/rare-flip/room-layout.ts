export type DecorPosition = { x: number; y: number };
export type RoomPositions = Record<string, DecorPosition>;
export const ROOM_PLACEMENT_SPOTS = [
  { id: "left-aisle", name: "LEFT AISLE", x: 235, y: 265 },
  { id: "right-aisle", name: "RIGHT AISLE", x: 725, y: 265 },
  { id: "left-corner", name: "LEFT CORNER", x: 235, y: 365 },
  { id: "right-corner", name: "RIGHT CORNER", x: 725, y: 365 },
  { id: "left-front", name: "FRONT LEFT", x: 330, y: 390 },
  { id: "right-front", name: "FRONT RIGHT", x: 625, y: 390 },
] as const;
export const ROOM_DECOR_LAYOUT = {
  aquarium: { x: 245, y: 373, width: 51, name: "JELLY AQUARIUM" },
  cat: { x: 713, y: 363, width: 48, name: "LUCKY CLOUD CAT" },
  blossom: { x: 650, y: 389, width: 57, name: "PEACH BLOSSOM" },
} as const;
export function decorLayout(id: string, positions: RoomPositions) {
  const base = ROOM_DECOR_LAYOUT[id as keyof typeof ROOM_DECOR_LAYOUT];
  return base ? { ...base, ...positions[id] } : null;
}
export function validDecorPosition(id: string, point: DecorPosition, items: string[], positions: RoomPositions, player?: DecorPosition) {
  const prop = decorLayout(id, positions); if (!prop || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const half = prop.width / 2;
  if (point.x - half < 190 || point.x + half > 770 || point.y < 195 || point.y > 398) return false;
  // Match the game's solid table and rope-post floor footprints.
  if (point.x + half > 347 && point.x - half < 614 && point.y + 15 > 198 && point.y - 15 < 331) return false;
  if ([319,374,591,644].some(x => Math.hypot(point.x - x, point.y - (x === 319 || x === 644 ? 251 : 226)) < half + 20)) return false;
  if (player && Math.abs(point.x - player.x) < half + 24 && Math.abs(point.y - player.y) < 28) return false;
  return !items.some(other => { const placed = decorLayout(other, positions); return other !== id && placed && Math.abs(point.x - placed.x) < half + placed.width / 2 + 8 && Math.abs(point.y - placed.y) < 36; });
}
