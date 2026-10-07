import { useEffect, useRef, useState } from "react";
import { decorLayout, ROOM_PLACEMENT_SPOTS, validDecorPosition, type DecorPosition, type RoomPositions } from "./room-layout";
import "./room-editor.css";

export function RoomPlacement({ id, items, positions, selected, onSelect, onPlace, onCancel, paused }: {
  id: string; items: string[]; positions: RoomPositions; selected: DecorPosition | null;
  onSelect: (point: DecorPosition) => void; onPlace: () => void; onCancel: () => void; paused: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState<DecorPosition>({ x:480, y:369 });
  useEffect(() => {
    const canvas = root.current?.closest(".game-shell")?.querySelector<HTMLCanvasElement>(".scene canvas");
    setPlayer({ x:Number(canvas?.dataset.playerX ?? 480), y:Number(canvas?.dataset.playerY ?? 369) });
    root.current?.querySelector<HTMLButtonElement>(".placement-spot:not(:disabled)")?.focus();
  }, [id]);
  const prop = decorLayout(id, positions)!;
  const available = (point: DecorPosition) => validDecorPosition(id, point, items, positions, player);
  const chosen = ROOM_PLACEMENT_SPOTS.find(spot => selected?.x === spot.x && selected?.y === spot.y);
  return <div ref={root} className="room-layout-editor room-placement" role="dialog" aria-modal="true" aria-label="Choose decoration position"
    onKeyDown={event => { if (event.key === "Escape" && !paused) { event.preventDefault(); onCancel(); } }}>
    <div className="room-editor-title"><strong>CHOOSE A SPOT</strong><small>{prop.name} · 6 preset locations</small></div>
    {ROOM_PLACEMENT_SPOTS.map((spot, index) => {
      const free = available(spot);
      return <button key={spot.id} type="button" className="placement-spot" aria-label={`Place at ${spot.name}`} aria-pressed={chosen?.id === spot.id}
        disabled={paused || !free} title={free ? spot.name : `${spot.name} · Occupied`}
        style={{ left:`${spot.x / 960 * 100}%`, top:`${spot.y / 540 * 100}%` }} onClick={() => onSelect({ x:spot.x, y:spot.y })}>
        <span>{free ? index + 1 : "×"}</span><small>{free ? spot.name : "OCCUPIED"}</small>
      </button>;
    })}
    <div className="room-editor-toolbar"><p role="status">{chosen ? `${chosen.name} selected · Confirm to place` : "Pick a numbered spot · Grey spots are unavailable"}</p>
      <div><button type="button" disabled={paused} onClick={onCancel}>CANCEL</button><button type="button" className="save-layout" disabled={paused || !selected || !available(selected)} onClick={onPlace}>PLACE HERE</button></div>
    </div>
  </div>;
}
