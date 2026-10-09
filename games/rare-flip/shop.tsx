import { useState, type Dispatch, type SetStateAction } from "react";
import "./shop.css";
import { type RoomId } from "./rooms";
import type {GenerationSprites} from './game-model';
import {ShopPreview} from "./shop-preview";
import type {Player} from "./scene-renderer";
import type {PetPosition} from "./extra-art";
import { roomSpots } from "./room-layout";
import { ItemArt } from "./shop-art";
import { decorLayout, validDecorPosition, type RoomPositions } from "./room-layout";

const catalog = [
  { id: "aquarium", category: "ROOM", name: "JELLY AQUARIUM", price: 15, detail: "Cyan jellyfish in a pearl glass lantern.", color: "#80efef" },
  { id: "cat", category: "ROOM", name: "LUCKY CLOUD CAT", price: 45, detail: "Ivory cat, coral scarf, mint cushion. No odds bonus.", color: "#fff1dc" },
  { id: "blossom", category: "ROOM", name: "PEACH BLOSSOM", price: 90, detail: "Peach petals above a turquoise ceramic pot.", color: "#ffb6b5" },
  { id:"trophy",category:"ROOM",name:"GOLD TROPHY",price:60,detail:"A golden cup with a cyan jewel and plum pedestal.",color:"#ffdc73" },
  { id:"statue",category:"ROOM",name:"FRIEND STATUE",price:75,detail:"Solid obsidian Friend on a gold-trimmed pedestal.",color:"#fff0cf" },
  { id:"radio",category:"ROOM",name:"RETRO RADIO",price:45,detail:"Mint and violet radio with golden knobs. Decoration only.",color:"#80efdf" },
  { id: "beanie", category: "COSTUME", name: "CLOUD BEANIE", price: 60, detail: "A tiny sky-blue hat above your head. Face stays clear.", color: "#9addff" },
  { id: "skateboard", category: "COSTUME", name: "MINT SKATEBOARD", price: 35, detail: "A slim mint deck below your feet. Cosmetic only.", color: "#80efdf" },
  { id: "wings", category: "COSTUME", name: "PRISM WINGS", price: 25, detail: "Two little wings beside you. Nothing covers your body.", color: "#adf6d8" },
  { id: "royal-crown", category: "COSTUME", name: "ROYAL CROWN", price: 75, detail: "A small ruby-and-gold crown above your head.", color: "#ffe4a2" },
  { id: "arcane-hat", category: "COSTUME", name: "ARCANE HAT", price: 55, detail: "A compact violet wizard hat. Face stays visible.", color: "#bba0ff" },
  { id: "aura", category: "COSTUME", name: "ROYAL AURA", price: 100, detail: "A hollow golden halo with sparkling edges. No odds bonus.", color: "#ffe4a2" },
  { id: "hearts", category: "EFFECTS", name: "HEART BUBBLES", price: 40, detail: "Coral heart bubbles with bright pearl highlights.", color: "#ff98b3" },
  { id: "orbit", category: "EFFECTS", name: "MOON ORBIT", price: 65, detail: "A mint crescent and twinkling ivory stars.", color: "#adf6d8" },
  { id: "confetti", category: "EFFECTS", name: "PARTY POP", price: 120, detail: "Coral, cyan and lime confetti for your WIN.", color: "#8beddf" },
  { id:"mint-slime",category:"PET",name:"MINT SLIME",price:35*3,detail:"Bouncing mint jelly. 3x skateboard price.",color:"#a3f4cc" },
  { id:"cloud-fox",category:"PET",name:"CLOUD FOX",price:60*3,detail:"Fluffy peach fox. 3x beanie price.",color:"#ffd9b9" },
  { id:"moon-bat",category:"PET",name:"MOON BAT",price:75*3,detail:"Hovering violet bat. 3x crown price.",color:"#c996ff" },
  { id:"star-dragon",category:"PET",name:"STAR DRAGON",price:100*3,detail:"Teal dragon, star tail. 3x aura price.",color:"#90f2ea" },
] as const;
type Item = typeof catalog[number];
export type ShopInventory = { balance: number; owned: string[]; roomItems: string[]; roomPositions: RoomPositions; equipped: Record<string,string> };
export const INITIAL_SHOP_INVENTORY: ShopInventory = { balance: 250, owned: [], roomItems: [], roomPositions: {}, equipped: {} };
export function costumeSlot(id: string) { return ["beanie","royal-crown","arcane-hat"].includes(id) ? "HEAD" : id === "skateboard" ? "FEET" : id === "wings" ? "WINGS" : "AURA"; }


export function FlipShop({ onClose, onPlaceRoomItem, paused, inventory, setInventory,roomTheme,sprites,reducedMotion,previewPlayer,previewPetPosition }: { onClose: () => void; onPlaceRoomItem: (id: string) => void; paused: boolean; inventory: ShopInventory; setInventory: Dispatch<SetStateAction<ShopInventory>>; roomTheme:RoomId;sprites:GenerationSprites|null;reducedMotion:boolean;previewPlayer:Player;previewPetPosition:PetPosition }) {
  const [tab, setTab] = useState("ROOM"), [selected, setSelected] = useState<Item>(catalog[0]);
  const { balance, owned, roomItems, equipped } = inventory;
  const [notice, setNotice] = useState("Preview credit only · Cosmetics never change your odds.");
  const selectedSlot = selected.category === "COSTUME" ? costumeSlot(selected.id) : selected.category;
  const has = owned.includes(selected.id), active = selected.category === "ROOM" ? roomItems.includes(selected.id) : equipped[selectedSlot] === selected.id;
  const previewEquipped={...equipped};
  if(selected.category!=="ROOM")previewEquipped[selectedSlot]=selected.id;
  const roomOwned = catalog.filter(i => i.category === "ROOM" && owned.includes(i.id)).map(i => i.id);
  const previewRooms=[...roomItems],previewPositions={...inventory.roomPositions};
  if(selected.category==="ROOM"&&!previewRooms.includes(selected.id)){
    const preferred=decorLayout(selected.id,previewPositions)!;
    const free=[preferred,...roomSpots(roomTheme)].find(point=>validDecorPosition(selected.id,point,previewRooms,previewPositions,previewPlayer,roomTheme));
    if(free){previewPositions[selected.id]={x:free.x,y:free.y};previewRooms.push(selected.id);}
  }
  function equipAllRooms() {
    setInventory(previous => {
      const items = [...previous.roomItems], positions = { ...previous.roomPositions };
      for (const item of catalog.filter(item => item.category === "ROOM" && previous.owned.includes(item.id))) {
        if (items.includes(item.id)) continue;
        const preferred = decorLayout(item.id, positions)!;
        const point = [preferred, ...roomSpots(roomTheme)].find(point => validDecorPosition(item.id, point, items, positions,undefined,roomTheme));
        if (!point) continue;
        positions[item.id] = { x:point.x, y:point.y }; items.push(item.id);
      }
      return { ...previous, roomItems:items, roomPositions:positions };
    });
    setNotice("Owned decorations placed in available locations. Existing positions are kept.");
  }
  function buyOrEquip() {
    if (paused) return;
    if (has && selected.category === "ROOM" && !active) { onPlaceRoomItem(selected.id); return; }
    setInventory(previous => {
      if (!previous.owned.includes(selected.id)) {
        if (previous.balance < selected.price) return previous;
        return { ...previous, balance: previous.balance - selected.price, owned: [...previous.owned, selected.id] };
      }
      if (selected.category === "ROOM") return { ...previous, roomItems: previous.roomItems.includes(selected.id) ? previous.roomItems.filter(id => id !== selected.id) : [...previous.roomItems, selected.id] };
      return { ...previous, equipped: { ...previous.equipped, [selectedSlot]: previous.equipped[selectedSlot] === selected.id ? "" : selected.id } };
    });
    setNotice(!has ? `${selected.name} purchased. Press EQUIP to use it.` : active ? "Item removed." : selected.category === "ROOM" ? "Placed in your room. Other decorations stay equipped." : "Equipped on your Friend. Close SHOP to see it in the room.");
  }
  return <div className="shop-shade"><section className="flip-shop" role="dialog" aria-modal="true" aria-labelledby="shop-title" data-paused={paused}>
    <header className="shop-header"><div><small>RARE FRIENDS BOUTIQUE</small><h2 id="shop-title">FLIP SHOP</h2></div><div className="flip-wallet"><span>✦</span><strong>{balance}</strong><small>FLIP</small></div><button aria-label="Close shop" onClick={onClose}>×</button></header>
    <nav className="shop-tabs" aria-label="Shop categories">{["ROOM", "COSTUME", "EFFECTS", "PET"].map(category => <button key={category} aria-pressed={tab === category} onClick={() => { setTab(category); setSelected(catalog.find(i => i.category === category)!); }}>{category}</button>)}</nav>
    <div className="shop-body"><div className="shop-catalog" data-category={tab}>{catalog.filter(i => i.category === tab).map(item => <button key={item.id} className="shop-item" aria-label={`Preview ${item.name}`} aria-pressed={selected.id === item.id} onClick={() => setSelected(item)}><div className="item-pedestal"><ItemArt id={item.id}/></div><strong>{item.name}</strong><span>{roomItems.includes(item.id) ? "PLACED" : equipped[item.category === "COSTUME" ? costumeSlot(item.id) : item.category] === item.id ? "EQUIPPED" : owned.includes(item.id) ? "OWNED" : `${item.price} FLIP`}</span></button>)}</div>
      <aside className="shop-preview" data-category={tab}><small>LIVE PREVIEW · IN-GAME SCALE</small>
      <ShopPreview focus={selected.category === "ROOM" ? decorLayout(selected.id,previewPositions)! : previewPlayer} sprites={sprites} theme={roomTheme} player={previewPlayer} pet={previewPetPosition} items={previewRooms} positions={previewPositions} equipped={previewEquipped} paused={paused} reducedMotion={reducedMotion} showWin={tab==="EFFECTS"}/>
      <strong className="preview-name">{selected.name}</strong><p>{selected.detail}</p><div className="shop-price"><span>{active ? "PLACED / EQUIPPED" : "PRICE"}</span><strong>{selected.price} FLIP</strong></div><button className="shop-buy" disabled={paused || (!has && balance < selected.price)} onClick={buyOrEquip}>{has ? active ? "UNEQUIP" : "EQUIP" : `BUY · ${selected.price} FLIP`}</button>{tab === "ROOM" && <div className="room-equip-actions"><button disabled={paused || roomOwned.length === 0 || roomOwned.every(id => roomItems.includes(id))} onClick={equipAllRooms}>EQUIP ALL</button><button disabled={paused || roomItems.length === 0} onClick={() => { setInventory(v => ({ ...v, roomItems: [] })); setNotice("All decorations removed. Your items are still owned."); }}>REMOVE ALL</button></div>}</aside>
    </div><footer><span role="status">{notice}</span>{tab === "PET" && <button className="demo-pet-credit" type="button" disabled={paused} onClick={() => { setInventory(previous => ({ ...previous,balance:previous.balance+500 })); setNotice("Added 500 simulated FLIP for demo testing. No real tokens used."); }}>DEMO +500 FLIP</button>}<small>ROOM + COSTUMES + EFFECTS + PET APPLY IN GAME · SESSION SAVE</small></footer>
  </section></div>;
}
