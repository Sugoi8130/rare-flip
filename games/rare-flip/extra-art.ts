import trophy from "./assets/decor-trophy-v1.png";
import statue from "./assets/decor-statue-v1.png";
import radio from "./assets/decor-radio-v1.png";
import slime from "./assets/pet-mint-slime-v2.png";
import fox from "./assets/pet-cloud-fox-v2.png";
import bat from "./assets/pet-moon-bat-v2.png";
import dragon from "./assets/pet-star-dragon-v2.png";

export const EXTRA_ART: Record<string,{ url:string; bounds:number[] }> = {
  trophy:{ url:trophy,bounds:[148,92,1008,1028] },
  statue:{ url:statue,bounds:[296,160,652,1024] },
  radio:{ url:radio,bounds:[56,80,1204,1004] },
  "mint-slime":{ url:slime,bounds:[282,278,778,650] },
  "cloud-fox":{ url:fox,bounds:[124,166,1022,1000] },
  "moon-bat":{ url:bat,bounds:[40,86,1274,1022] },
  "star-dragon":{ url:dragon,bounds:[190,182,918,930] },
};
const images=new Map<string,HTMLImageElement>();
const classicPetSprites=new Map<string,HTMLCanvasElement>();
const petPixelWidths:Record<string,number>={"mint-slime":16,"cloud-fox":18,"moon-bat":20,"star-dragon":18};
export function extraImage(id:string) {
  const art=EXTRA_ART[id]; if (!art) return null;
  let image=images.get(id); if (!image) { image=new Image(); image.src=art.url; images.set(id,image); }
  return image;
}
export function drawExtraArt(ctx:CanvasRenderingContext2D,id:string,x:number,bottom:number,width:number,mirror=false) {
  const art=EXTRA_ART[id],image=extraImage(id); if (!art || !image?.complete || !image.naturalWidth) return false;
  const [sx,sy,sw,sh]=art.bounds, height=Math.round(width*sh/sw);
  // Both shop and room use this same coarse native sprite, so large shop
  // previews cannot add detail that disappears at playable pet size.
  let sprite:HTMLCanvasElement | undefined;
  const nativeWidth=petPixelWidths[id];
  if(nativeWidth) {
    sprite=classicPetSprites.get(id);
    if(!sprite) {
      sprite=document.createElement("canvas");sprite.width=nativeWidth;sprite.height=Math.max(1,Math.round(nativeWidth*sh/sw));
      const pixelContext=sprite.getContext("2d")!;pixelContext.imageSmoothingEnabled=false;
      pixelContext.drawImage(image,sx,sy,sw,sh,0,0,sprite.width,sprite.height);
      classicPetSprites.set(id,sprite);
    }
  }
  ctx.save(); ctx.imageSmoothingEnabled=false; ctx.translate(Math.round(x),Math.round(bottom));
  if (mirror) ctx.scale(-1,1);
  if(sprite)ctx.drawImage(sprite,-Math.round(width/2),-height,width,height);
  else ctx.drawImage(image,sx,sy,sw,sh,-Math.round(width/2),-height,width,height);
  ctx.restore(); return true;
}
export type PetPosition={ x:number; y:number; facing:string };
export function drawPet(ctx:CanvasRenderingContext2D,id:string,pet:PetPosition,time:number,reduced:boolean) {
  if (!EXTRA_ART[id]) return false;
  const floating=id === "moon-bat" || id === "star-dragon";
  const bob=reduced ? 0 : Math.round(Math.sin(time/(floating ? 230 : 320))*2);
  const width=id === "moon-bat" ? 40 : id === "mint-slime" ? 32 : 36;
  ctx.save(); ctx.fillStyle="#1c122b"; ctx.fillRect(Math.round(pet.x-12),Math.round(pet.y),24,3);
  const drawn=drawExtraArt(ctx,id,pet.x,pet.y+bob-(floating ? 7 : 0),width,pet.facing === "left");
  ctx.restore(); return drawn;
}
