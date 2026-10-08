// Logical room coordinates (960 x 540). Obstacles describe floor footprints,
// not the tall artwork: the Friend can walk in front of machines and plants.
export const ROOM_WALK_BOUNDS = { left:82, right:878, top:192, bottom:398 };
const furniture = [
  { left:62, right:160, top:192, bottom:300 }, // left arcade + stool
  { left:800, right:898, top:192, bottom:300 },
  { left:149, right:205, top:205, bottom:264 }, // coin cabinets
  { left:755, right:811, top:205, bottom:264 },
  { left:198, right:251, top:192, bottom:204 }, // rear plant pots
  { left:709, right:762, top:192, bottom:204 },
  { left:32, right:101, top:290, bottom:371 }, // front plant pots
  { left:859, right:928, top:290, bottom:371 },
  { left:120, right:207, top:357, bottom:410 }, // foreground columns
  { left:753, right:840, top:357, bottom:410 },
];
export function canWalkRoom(x: number, y: number,theme:string="classic") {
  const bounds = ROOM_WALK_BOUNDS;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) return false;
  if(theme !== "classic") {
    if(x>347 && x<614 && y>198 && y<315) return false;
    if(theme === "galaxyroom") return ((x-480)/445)**2+((y-276)/120)**2<.98;
    if(y<208 || y>391 || x<95 || x>865) return false;
    return ![
      {left:82,right:188,top:192,bottom:239}, // cellar entrance stairs
      {left:742,right:900,top:192,bottom:235}, // raised lounge
      {left:82,right:184,top:352,bottom:398}, // front wall
      {left:782,right:900,top:352,bottom:398},
    ].some(prop=>x>prop.left && x<prop.right && y>prop.top && y<prop.bottom);
  }
  if (x > 347 && x < 614 && y > 198 && y < 331) return false;
  if ([319,374,591,644].some(post => Math.hypot(x - post, y - (post === 319 || post === 644 ? 251 : 226)) < 17)) return false;
  return !furniture.some(prop => x > prop.left && x < prop.right && y > prop.top && y < prop.bottom);
}
export function clampRoomTarget(x: number, y: number) {
  return { x:Math.max(ROOM_WALK_BOUNDS.left, Math.min(ROOM_WALK_BOUNDS.right,x)), y:Math.max(ROOM_WALK_BOUNDS.top,Math.min(ROOM_WALK_BOUNDS.bottom,y)) };
}
