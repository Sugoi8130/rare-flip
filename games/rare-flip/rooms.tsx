import { useState } from "react";
import classic from "./assets/arcade-room.png";
import dark from "./assets/darkroom-v2.png";
import galaxy from "./assets/galaxyroom-v2.png";
import "./rooms.css";
export const ROOMS = [
  { id:"classic",name:"CLASSIC ROOM",url:classic,detail:"Golden lights · Royal arcade",symbol:"◆" },
  { id:"darkroom",name:"DARKROOM",url:dark,detail:"Vaulted cellar · Candlelit lounge",symbol:"☾" },
  { id:"galaxyroom",name:"GALAXYROOM",url:galaxy,detail:"Orbital deck · Panorama observatory",symbol:"✦" },
] as const;
export type RoomId=typeof ROOMS[number]["id"];
export function roomAsset(id:RoomId) { return ROOMS.find(room=>room.id===id)!.url; }
export function RoomChooser({paused,onChoose}:{paused:boolean;onChoose:(id:RoomId)=>void}) {
  const [selected,setSelected]=useState<RoomId>("classic");
  return <main className="rare-flip room-selection" aria-label="Rare Flip room selection"><section className="room-chooser" aria-labelledby="room-question">
    <header><span>RARE FRIENDS ARCADE</span><h1>RARE FLIP</h1><h2 id="room-question">What room do you want to RARE FLIP?</h2></header>
    <div className="room-options">{ROOMS.map(room=><button type="button" key={room.id} aria-label={`Select ${room.name}`} aria-pressed={selected===room.id} disabled={paused} onClick={()=>setSelected(room.id)}>
      <img src={room.url} alt={`${room.name} pixel room preview`}/><span className="room-label"><b>{room.symbol} {room.name}</b><small>{room.detail}</small></span><span className="room-selected">{selected===room.id?"SELECTED":"SELECT ROOM"}</span>
    </button>)}</div>
    <button className="enter-room" type="button" disabled={paused} onClick={()=>onChoose(selected)}>ENTER ROOM →</button><p>Same rules. Your room, your style.</p>
  </section></main>;
}
