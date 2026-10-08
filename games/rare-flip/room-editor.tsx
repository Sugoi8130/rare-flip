import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { decorLayout, validDecorPosition, type DecorPosition, type RoomPositions } from "./room-layout";
import "./room-editor.css";
import { EXTRA_ART } from "./extra-art";

export function RoomEditor({ items, positions, setPositions, paused, onSave, onCancel,roomTheme }: {
  items: string[]; positions: RoomPositions; setPositions: Dispatch<SetStateAction<RoomPositions>>;
  roomTheme:string;paused: boolean; onSave: () => void; onCancel: () => void;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; pointerId: number; start: DecorPosition; origin: DecorPosition } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null), [invalid, setInvalid] = useState(false);
  const [status, setStatus] = useState("Drag decorations onto the floor · Mouse or touch");
  function pointerPoint(clientX: number, clientY: number) {
    const box = surface.current!.getBoundingClientRect();
    return { x: (clientX - box.left) / box.width * 960, y: (clientY - box.top) / box.height * 540 };
  }
  function playerPoint() {
    const canvas = surface.current?.closest(".game-shell")?.querySelector<HTMLCanvasElement>(".scene canvas");
    return { x: Number(canvas?.dataset.playerX ?? 480), y: Number(canvas?.dataset.playerY ?? 369) };
  }
  function valid(id: string, point: DecorPosition) { return validDecorPosition(id, point, items, positions, playerPoint(),roomTheme); }
  function stopDrag(cancel: boolean) {
    const current = drag.current; if (!current) return;
    const point = decorLayout(current.id, positions)!;
    if (cancel || paused || !valid(current.id, point)) {
      setPositions(previous => ({ ...previous, [current.id]: current.origin }));
      setStatus(cancel ? "Move cancelled." : "Cannot place here. Choose clear floor space.");
    } else setStatus(`${point.name} moved. Press SAVE LAYOUT to keep your changes.`);
    drag.current = null; setDragging(null); setInvalid(false);
  }
  useEffect(() => {
    if (!paused || !drag.current) return;
    const current = drag.current;
    setPositions(previous => ({ ...previous, [current.id]: current.origin }));
    drag.current = null; setDragging(null); setInvalid(false);
  }, [paused, setPositions]);
  return <div className="room-layout-editor" onKeyDown={event => { if (event.key === "Escape" && !paused) { event.preventDefault(); onCancel(); } }}>
    <div className="room-editor-title"><strong>EDIT ROOM</strong><small>Drag an item · Arrow keys for fine adjustment</small></div>
    <div className="room-drag-surface" ref={surface}>{items.map(id => {
      const prop = decorLayout(id, positions); if (!prop) return null;
      const bounds=EXTRA_ART[id]?.bounds;
      const height = prop.width * (bounds ? bounds[3]/bounds[2] : id === "aquarium" ? 470 / 377 : id === "cat" ? 405 / 400 : 440 / 392);
      return <button key={id} type="button" className="decor-drag-handle" aria-label={`Move ${prop.name}`} disabled={paused}
        data-dragging={dragging === id} data-invalid={dragging === id && invalid}
        style={{ left: `${prop.x / 960 * 100}%`, top: `${prop.y / 540 * 100}%`, width: `${prop.width / 960 * 100}%`, height: `${height / 540 * 100}%` }}
        onPointerDown={event => {
          if (paused || drag.current) return;
          event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { id, pointerId: event.pointerId, start: pointerPoint(event.clientX, event.clientY), origin: { x: prop.x, y: prop.y } };
          setDragging(id); setInvalid(false); setStatus(`Moving ${prop.name}...`);
        }}
        onPointerMove={event => {
          const current = drag.current; if (paused || current?.id !== id || current.pointerId !== event.pointerId) return;
          const point = pointerPoint(event.clientX, event.clientY);
          const next = { x: Math.round((current.origin.x + point.x - current.start.x) / 2) * 2, y: Math.round((current.origin.y + point.y - current.start.y) / 2) * 2 };
          setPositions(previous => ({ ...previous, [id]: next })); setInvalid(!valid(id, next));
        }}
        onPointerUp={event => { if (drag.current?.pointerId !== event.pointerId) return; stopDrag(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
        onPointerCancel={() => stopDrag(true)} onLostPointerCapture={() => { if (drag.current?.id === id) stopDrag(true); }}
        onKeyDown={event => {
          if (paused || drag.current) return;
          const directions: Record<string, [number,number]> = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1] };
          const direction = directions[event.key]; if (!direction) return; event.preventDefault();
          const step = event.shiftKey ? 16 : 4, next = { x: prop.x + direction[0] * step, y: prop.y + direction[1] * step };
          if (!valid(id, next)) { setStatus("Cannot place here. Choose clear floor space."); return; }
          setPositions(previous => ({ ...previous, [id]: next })); setStatus(`${prop.name} moved.`);
        }}><span aria-hidden="true">✥</span></button>;
    })}</div>
    <div className="room-editor-toolbar"><p role="status">{status}</p><div><button type="button" disabled={paused || Boolean(dragging)} onClick={onCancel}>CANCEL</button><button type="button" className="save-layout" disabled={paused || Boolean(dragging)} onClick={onSave}>SAVE LAYOUT</button></div></div>
  </div>;
}
