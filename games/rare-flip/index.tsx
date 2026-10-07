"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import type { GamePlay, GameSnapshot } from "@rarefriends/friendsdk/game";
import { maximumPrize } from "@rarefriends/friendsdk/game";
import { createFriendReader, spriteFrame, type GenerationSprites, type SpriteFacing } from "@rarefriends/friendsdk/sprites";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import "./style.css";
import { renderRoom, renderArtCoin, renderTableFront, ArtButton } from "./artwork";
import { ResultBanner, resultEffects } from "./results";
import { FlipShop, INITIAL_SHOP_INVENTORY, type ShopInventory } from "./shop";
import { drawRoomDecoration } from "./shop-art";
import { decorLayout, validDecorPosition, type DecorPosition, type RoomPositions } from "./room-layout";
import { RoomEditor } from "./room-editor";
import { RoomPlacement } from "./room-placement";
import { drawFriendCostumes } from "./costume-renderer";
import { drawFriendEffect } from "./effect-renderer";
import { canWalkRoom, clampRoomTarget } from "./room-navigation";
import { ThoughtBubble } from "./thoughts";
import { usePixelSound } from "./sound";

type Side = "heads" | "tails";
type Phase = "idle" | "working" | "flipping" | "result";
type Player = { x: number; y: number; facing: SpriteFacing; walking: boolean };
const RF = 10n ** 18n;
const GROSS = 4_000n * RF;
const FEE = 160n * RF;
const NET = 3_840n * RF;
const opposite = (side: Side): Side => side === "heads" ? "tails" : "heads";
const sideLabel = (side: Side) => side === "heads" ? "HEADS" : "TAILS";
const money = (value: bigint) => `${formatGameAmount(value, 18)} RF`;
const friendRasterCache = new Map<string, HTMLCanvasElement>();


function drawFriend(ctx: CanvasRenderingContext2D, sprites: GenerationSprites, x: number, bottom: number, scale: number, frame: number, walking = false, facing: SpriteFacing = "down") {
  const key = `${sprites.cacheKey}:${facing}:${walking}:${frame}`;
  const cached = friendRasterCache.get(key);
  if (cached) { ctx.imageSmoothingEnabled = false; ctx.drawImage(cached, Math.round(x - scale * 9), Math.round(bottom - scale * 17), scale * 18, scale * 18); return; }
  const rows = spriteFrame(sprites, facing, walking, frame).frame.rows;
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


function paintArcade(ctx: CanvasRenderingContext2D, sprites: GenerationSprites | null, phase: Phase, landed: Side | null, started: number, now: number, reducedMotion: boolean, player: Player, won: boolean, roomItems: string[], roomPositions: RoomPositions, costumes: Record<string,string>) {
  renderRoom(ctx);
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
    ctx.fillStyle = "#1d132d"; ctx.fillRect(Math.round(player.x - 20), Math.round(player.y - 2), 40, 5);
    const bob = reducedMotion ? 0 : Math.round(Math.sin(now / (player.walking ? 100 : 300)) * 2);
    const celebration = phase === "result" && !reducedMotion ? won ? -Math.round(Math.abs(Math.sin(resultAge / 240)) * 22) : Math.round((1 - Math.cos(resultAge / 420)) * 2) : 0;
    ctx.save();
    if (phase === "result" && !won && !reducedMotion) { ctx.translate(player.x, player.y); ctx.rotate(Math.sin(resultAge / 600) > 0 ? -.055 : .055); ctx.translate(-player.x, -player.y); }
    const frameIndex = reducedMotion ? 0 : Math.floor(now / (player.walking ? 110 : 280)) % 8;
    const rows = spriteFrame(sprites, player.facing, player.walking, frameIndex).frame.rows;
    const topRow = Math.max(0, rows.findIndex(row => row.includes("#")));
    const bottom = player.y + bob + celebration, headTop = bottom - 68 + topRow * 4;
    drawFriendCostumes(ctx, costumes, player.x, bottom, headTop, player.facing, now, reducedMotion, "back");
    drawFriend(ctx, sprites, player.x, bottom, 4, frameIndex, player.walking, player.facing);
    drawFriendCostumes(ctx, costumes, player.x, bottom, headTop, player.facing, now, reducedMotion, "front");
    drawFriendEffect(ctx, costumes.EFFECTS, player.x, bottom, headTop, now, reducedMotion, phase === "result" && won, resultAge);
    ctx.restore();
    if (player.y < 326 && player.x > 345 && player.x < 610) renderTableFront(ctx);
  }
  sortedDecorations.filter(id => decorationBottom(id) >= player.y).forEach(id => drawRoomDecoration(ctx, id, roomPositions));
  if (!reducedMotion) {
    for (let i = 0; i < 4; i++) { const a = now / 1200 + i * Math.PI / 2; ctx.fillStyle = i % 2 ? "#fff9af" : "#ffce31"; ctx.fillRect(Math.round(480 + Math.cos(a) * 75), Math.round(185 + Math.sin(a) * 60), 4, 4); }
  }
  if (phase === "result") resultEffects(ctx, won, resultAge, reducedMotion);
}

function ArcadeScene({ sprites, phase, landed, paused, reducedMotion, atTable, onNearTable, onInteract, movement, won, roomItems, roomPositions, costumes }: { sprites: GenerationSprites | null; phase: Phase; landed: Side | null; paused: boolean; reducedMotion: boolean; atTable: boolean; onNearTable: (near: boolean) => void; onInteract: () => void; movement: { current: string | null }; won: boolean; roomItems: string[]; roomPositions: RoomPositions; costumes: Record<string,string> }) {
  const canvas = useRef<HTMLCanvasElement>(null), started = useRef(performance.now());
  const sceneClock = useRef(performance.now());
  const player = useRef<Player>({ x: 480, y: 369, facing: "down", walking: false });
  // Stand at the front edge of the table, above the bet controls, so the
  // complete silhouette and foot accessory remain visible during a flip.
  useEffect(() => { if (atTable) player.current = { x: 480, y: 331, facing: "down", walking: false }; }, [atTable]);
  const keys = useRef(new Set<string>()), target = useRef<{ x: number; y: number } | null>(null);
  const callbacks = useRef({ onNearTable, onInteract }); callbacks.current = { onNearTable, onInteract };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (paused || atTable || event.target instanceof HTMLInputElement) return;
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) { event.preventDefault(); keys.current.add(key); target.current = null; }
      if ((key === "e" || key === "enter") && !event.repeat && Math.hypot(player.current.x - 480, player.current.y - 353) < 80) { event.preventDefault(); callbacks.current.onInteract(); }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const clear = () => { keys.current.clear(); movement.current = null; target.current = null; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear);
    return () => { clear(); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); };
  }, [paused, atTable, movement]);
  useEffect(() => { started.current = sceneClock.current; }, [phase, landed]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    let frame = 0, previous = performance.now(), lastNear: boolean | null = null;
    const render = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .04); previous = now; if (!paused) sceneClock.current += dt * 1000;
      let dx = 0, dy = 0;
      if (!paused && !atTable) {
        const pressed = (key: string, arrow: string) => keys.current.has(key) || keys.current.has(arrow) || movement.current === arrow;
        dx = Number(pressed("d", "arrowright")) - Number(pressed("a", "arrowleft")); dy = Number(pressed("s", "arrowdown")) - Number(pressed("w", "arrowup"));
        if (dx || dy) target.current = null;
        else if (target.current) { dx = target.current.x - player.current.x; dy = target.current.y - player.current.y; if (Math.hypot(dx, dy) < 5) { target.current = null; dx = dy = 0; } }
      }
      const length = Math.hypot(dx, dy), p = player.current;
      p.walking = length > 0;
      if (atTable) p.facing = "down";
      if (length) {
        p.facing = Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up";
        const x = p.x + dx / length * 160 * dt, y = p.y + dy / length * 160 * dt;
        const oldX = p.x, oldY = p.y;
        const avoidsDecor = (x: number, y: number) => !roomItems.some(id => { const prop = decorLayout(id, roomPositions); return prop && Math.abs(x - prop.x) < prop.width / 2 + 9 && Math.abs(y - prop.y) < 18; });
        if (canWalkRoom(x, p.y) && avoidsDecor(x, p.y)) p.x = x; if (canWalkRoom(p.x, y) && avoidsDecor(p.x, y)) p.y = y;
        if (p.x === oldX && p.y === oldY) { p.walking = false; target.current = null; }
      }
      const near = Math.hypot(p.x - 480, p.y - 353) < 80;
      if (near !== lastNear) { lastNear = near; callbacks.current.onNearTable(near); }
      paintArcade(ctx, sprites, phase, landed, started.current, sceneClock.current, reducedMotion, p, won, roomItems, roomPositions, costumes);
      if (canvas.current) { canvas.current.dataset.playerX = String(Math.round(p.x)); canvas.current.dataset.playerY = String(Math.round(p.y)); canvas.current.dataset.walking = String(p.walking); canvas.current.dataset.facing = p.facing; }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, [sprites, phase, landed, paused, reducedMotion, atTable, movement, won, roomItems, roomPositions, costumes]);
  return <canvas ref={canvas} width="1672" height="941" aria-label="Rare Flip room — tap the floor to move" onPointerDown={event => {
    if (paused || atTable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    target.current = clampRoomTarget((event.clientX - bounds.left) / bounds.width * 960, (event.clientY - bounds.top) / bounds.height * 540);
  }} />;
}

function RabbitMark() {
  return <svg viewBox="0 0 6 6" shapeRendering="crispEdges" aria-hidden="true"><path d="M0 0h2v2h2V0h2v6H0z" /><path className="mark-eyes" d="M1 3h1v1H1z M4 3h1v1H4z" /></svg>;
}

export default function RareFlip({ friendId, client, paused }: GameComponentProps) {
  const [shopOpen, setShopOpen] = useState(false);
  const [shopInventory, setShopInventory] = useState<ShopInventory>(INITIAL_SHOP_INVENTORY);
  const [editingRoom, setEditingRoom] = useState(false), [draftPositions, setDraftPositions] = useState<RoomPositions>({});
  const [placingItem, setPlacingItem] = useState<string | null>(null), [placementSpot, setPlacementSpot] = useState<DecorPosition | null>(null);
  const shell = useRef<HTMLElement>(null);
  const [atTable, setAtTable] = useState(false), [nearTable, setNearTable] = useState(true);
  const movement = useRef<string | null>(null);
  const [betInput, setBetInput] = useState("2000"), [roundUnits, setRoundUnits] = useState(1n);
  const betNumber = Number(betInput);
  const betValid = /^[0-9]+$/.test(betInput) && Number.isSafeInteger(betNumber) && betNumber >= 2000 && betNumber <= 100000 && betNumber % 2000 === 0;
  const selectedUnits = betValid ? BigInt(betNumber / 2000) : 1n;
  const selectedBet = selectedUnits * 2000n * RF;
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null), [sprites, setSprites] = useState<GenerationSprites | null>(null);
  const [choice, setChoice] = useState<Side | null>(null), [phase, setPhase] = useState<Phase>("idle"), [result, setResult] = useState<GamePlay | null>(null), [landed, setLanded] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false), [rulesOpen, setRulesOpen] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("Choose HEADS or TAILS to begin."), [reducedMotion, setReducedMotion] = useState(false);
  const audio = usePixelSound(paused,phase,result?.outcomeId === 1);
  const [losses,setLosses] = useState(0), seenResult = useRef("");
  useEffect(() => {
    if (phase !== "result" || !result || seenResult.current === String(result.id)) return;
    seenResult.current=String(result.id); setLosses(previous => result.outcomeId === 1 ? 0 : previous+1);
  },[phase,result]);
  const lock = useRef(false), alive = useRef(true), timer = useRef<number | null>(null), definition = client.definition;
  useEffect(() => {
    alive.current = true; const preference = window.matchMedia("(prefers-reduced-motion: reduce)"), update = () => setReducedMotion(preference.matches); update(); preference.addEventListener("change", update);
    void Promise.all([client.read(), createFriendReader().read(friendId)]).then(([state, art]) => { if (!alive.current) return; if (state.friendId !== friendId) throw new Error("The game session does not match your selected Rare Friend."); setSnapshot(state); setSprites(art); if (state.plays.some(play => play.outcomeId === null)) setMessage("A flip is pending. Resume it without another bet."); }).catch(cause => { if (alive.current) setError(cause instanceof Error ? cause.message : "Unable to load the game."); });
    return () => { alive.current = false; preference.removeEventListener("change", update); if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [client, friendId]);
  async function refresh() { const state = await client.read(); if (alive.current) setSnapshot(state); return state; }
  async function flip() {
    if (!snapshot || !choice || !betValid || paused || rulesOpen || lock.current) return; lock.current = true; setBusy(true); setError(""); setResult(null); setLanded(null); setPhase("working");
    try { const pending = snapshot.plays.find(play => play.outcomeId === null); const wagerQuantities = (snapshot as GameSnapshot & { wagerQuantities?: Record<string, bigint> }).wagerQuantities; const units = pending ? wagerQuantities?.[String(pending.id)] ?? 1n : selectedUnits; if (!wagerQuantities && units !== 1n) throw new Error("Variable bets require the local Rare Flip preview host."); setRoundUnits(units); let play = pending; if (!play) { const missing = units > snapshot.consumables ? units - snapshot.consumables : 0n; if (missing) await client.buy(missing); [play] = await client.play(units); } if (!play) throw new Error("Unable to start a flip. Please try again."); const settled = await client.settle(play.id); if (settled.outcomeId === null) throw new Error("The result is not ready. Your pending flip can be resumed."); const won = settled.outcomeId === 1, finalSide = won ? choice : opposite(choice); setResult(settled); setLanded(finalSide); setPhase("flipping"); setMessage("The coin is spinning..."); timer.current = window.setTimeout(() => { if (!alive.current) return; setPhase("result"); setMessage(won ? `WIN · Net reward ${money(NET * units)} after fee ${money(FEE * units)}.` : `LOSE · The coin landed on ${sideLabel(finalSide)}.`); }, reducedMotion ? 250 : 2_700); await refresh(); }
    catch (cause) { setPhase("idle"); setError(cause instanceof Error ? cause.message : "The flip could not be completed."); try { await refresh(); } catch { /* retain error */ } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function claim() { if (!snapshot || snapshot.inventory[0] === 0n || paused || rulesOpen || lock.current) return; lock.current = true; setBusy(true); setError(""); try { const quantity = snapshot.inventory[0] > 99n ? 99n : snapshot.inventory[0]; await client.redeem(1, quantity); await refresh(); setMessage(`${money(NET * quantity)} has been added to your simulated balance.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to claim the reward."); } finally { lock.current = false; if (alive.current) setBusy(false); } }
  function nextRound() { if (busy || paused || rulesOpen) return; setChoice(null); setResult(null); setLanded(null); setPhase("idle"); setError(""); setMessage("Choose HEADS or TAILS for your next flip."); }
  if (!snapshot) return <div className="rare-flip-loading" role={error ? "alert" : "status"}>{error || "Loading Rare Flip..."}</div>;
  const pending = snapshot.plays.some(play => play.outcomeId === null), won = result?.outcomeId === 1, unclaimed = snapshot.inventory[0] ?? 0n;
  const thoughtLosses=losses+(phase === "result" && !won && result && seenResult.current !== String(result.id) ? 1 : 0);
  const unavailable = paused || rulesOpen || shopOpen || editingRoom || Boolean(placingItem) || busy || phase === "flipping" || phase === "working";
  const needed = selectedUnits > snapshot.consumables ? selectedUnits - snapshot.consumables : 0n;
  const variableHost = Boolean((snapshot as GameSnapshot & { wagerQuantities?: Record<string, bigint> }).wagerQuantities);
  const flipDisabled = unavailable || phase === "result" || !choice || !betValid || (!pending && ((!variableHost && selectedUnits !== 1n) || snapshot.rfBalance < needed * definition.price || snapshot.freeStake + needed * definition.price < needed * maximumPrize(definition)));
  const actionLabel = phase === "result" ? unclaimed > 0n ? `CLAIM ${money(unclaimed * NET)}` : won ? "NEXT ROUND" : "TRY AGAIN" : pending ? "RESUME FLIP" : busy ? "WORKING..." : `FLIP COIN · ${money(selectedBet)}`;
  const action = phase === "result" ? unclaimed > 0n ? () => void claim() : nextRound : () => void flip();
  const roomPositions = editingRoom ? draftPositions : placingItem && placementSpot ? { ...shopInventory.roomPositions, [placingItem]:placementSpot } : shopInventory.roomPositions;
  const roomItems = placingItem && placementSpot ? [...shopInventory.roomItems.filter(id => id !== placingItem), placingItem] : shopInventory.roomItems;
  function confirmPlacement() {
    if (paused || !placingItem || !placementSpot || !shopInventory.owned.includes(placingItem)) return;
    const canvas = shell.current?.querySelector<HTMLCanvasElement>(".scene canvas");
    const player = { x:Number(canvas?.dataset.playerX ?? 480), y:Number(canvas?.dataset.playerY ?? 369) };
    if (!validDecorPosition(placingItem, placementSpot, shopInventory.roomItems, shopInventory.roomPositions, player)) return;
    setShopInventory(previous => ({ ...previous, roomItems:[...previous.roomItems.filter(id => id !== placingItem), placingItem], roomPositions:{ ...previous.roomPositions, [placingItem]:placementSpot } }));
    setPlacingItem(null); setPlacementSpot(null);
  }
  return <main className="rare-flip" onPointerDownCapture={audio.unlock} onKeyDownCapture={audio.unlock} onClickCapture={event => { const button=(event.target as Element).closest("button"); if (button && !button.disabled) audio.click(); }} data-exploring={!atTable || undefined} data-editing={editingRoom || Boolean(placingItem) || undefined} data-paused={paused || rulesOpen || editingRoom || Boolean(placingItem) || undefined} data-reduced-motion={reducedMotion || undefined} aria-label="Rare Flip" aria-busy={busy}>
    <section className="game-shell" ref={shell}>
      <header className="arcade-hud"><div><small>RARE FRIENDS ARCADE</small><h1>RARE FLIP</h1></div><div className="hud-actions"><button type="button" disabled={unavailable || phase !== "idle" || shopInventory.roomItems.length === 0} onClick={() => { setDraftPositions({ ...shopInventory.roomPositions }); setAtTable(false); setEditingRoom(true); }}>EDIT ROOM</button><button type="button" className="shop-open" onClick={() => setShopOpen(true)} disabled={paused || busy || editingRoom || Boolean(placingItem) || phase === "flipping"}>SHOP</button><button type="button" onClick={() => setRulesOpen(true)} disabled={paused || busy || editingRoom || Boolean(placingItem)}>RULES</button><div className="balance"><RabbitMark /><strong data-testid="balance">{money(snapshot.rfBalance)}</strong></div></div></header>
      <div className="sound-controls" aria-label="Audio settings"><button type="button" aria-label="Background music" aria-pressed={audio.music} disabled={paused} onClick={() => audio.setMusic(value => !value)}>MUSIC {audio.music ? "ON" : "OFF"}</button><button type="button" aria-label="Sound effects" aria-pressed={audio.effects} disabled={paused} onClick={() => audio.setEffects(value => !value)}>SFX {audio.effects ? "ON" : "OFF"}</button></div>
      <div className="scene" data-decorations={shopInventory.roomItems.join(",")} data-room-positions={JSON.stringify(roomPositions)} data-costumes={JSON.stringify(shopInventory.equipped)}><ArcadeScene sprites={sprites} phase={phase} landed={landed} paused={paused || rulesOpen || shopOpen || editingRoom || Boolean(placingItem)} reducedMotion={reducedMotion} atTable={atTable} onNearTable={setNearTable} onInteract={() => setAtTable(true)} movement={movement} won={won} roomItems={roomItems} roomPositions={roomPositions} costumes={shopInventory.equipped} />{atTable && phase === "result" && <ResultBanner won={won} reward={money(NET * roundUnits)} />}<ThoughtBubble paused={paused || rulesOpen || shopOpen || editingRoom || Boolean(placingItem)} phase={phase} won={won} reward={NET*roundUnits} losses={thoughtLosses} resultId={phase === "result" && result ? String(result.id) : choice ? "thinking" : ""} reducedMotion={reducedMotion} /></div>
      {atTable ? <><button className="leave-table" type="button" disabled={unavailable} onClick={() => setAtTable(false)}>← BACK TO ROOM</button>{phase !== "result" && <section className="bet-panel" aria-label="Bet amount" data-invalid={!betValid}>
        <div className="bet-value-group"><span className="bet-emblem" aria-hidden="true">◆</span><div className="bet-value"><span className="bet-caption">YOUR BET</span><label><input aria-label="Bet amount in RF" type="number" inputMode="numeric" min={2000} max={100000} step={2000} value={betInput} disabled={unavailable || pending} onChange={event => setBetInput(event.target.value)} /><span>RF</span></label></div><div className="bet-steppers"><button type="button" aria-label="Increase bet" disabled={unavailable || pending || betNumber >= 100000} onClick={() => setBetInput(String(Math.min(100000, (betValid ? betNumber : 2000) + 2000)))}>+</button><button type="button" aria-label="Decrease bet" disabled={unavailable || pending || betNumber <= 2000} onClick={() => setBetInput(String(Math.max(2000, (betValid ? betNumber : 2000) - 2000)))}>−</button></div></div>
        <div className="bet-presets"><span className="bet-caption">QUICK PICK</span><div>{[2000, 10000, 50000, 100000].map(amount => <button key={amount} type="button" aria-label={`Bet ${amount.toLocaleString("en-US")} RF`} aria-pressed={betNumber === amount} disabled={unavailable || pending} onClick={() => setBetInput(String(amount))}><span>{amount / 1000}K</span></button>)}</div></div>
      </section>}<section className="control-row" aria-label="Coin flip controls" data-result={phase === "result" ? won ? "win" : "lose" : undefined}>
        <button type="button" className="choice-card tails" aria-label="TAILS" aria-pressed={choice === "tails"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("tails"); setMessage("TAILS selected. Ready to flip."); }}><ArtButton side="tails" paused={paused || rulesOpen || reducedMotion} /></button>
        <button type="button" className="primary-action" disabled={phase === "result" ? unavailable : flipDisabled} onClick={action} aria-label={actionLabel}><ArtButton side="action" paused={paused || rulesOpen || reducedMotion} label={phase === "result" && unclaimed > 0n ? "CLAIM REWARD" : phase !== "idle" ? actionLabel : undefined} /></button>
        <button type="button" className="choice-card heads" aria-label="HEADS" aria-pressed={choice === "heads"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("heads"); setMessage("HEADS selected. Ready to flip."); }}><ArtButton side="heads" paused={paused || rulesOpen || reducedMotion} /></button>
      </section></> : <section className="room-controls" aria-label="Explore room"><div className="dpad">{[["arrowup", "↑", "Up"], ["arrowleft", "←", "Left"], ["arrowdown", "↓", "Down"], ["arrowright", "→", "Right"]].map(([direction, icon, label]) => <button key={direction} type="button" aria-label={`Move ${label}`} disabled={paused || rulesOpen} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); movement.current = direction; }} onPointerUp={() => { movement.current = null; }} onPointerCancel={() => { movement.current = null; }} onLostPointerCapture={() => { movement.current = null; }}>{icon}</button>)}</div><span>WASD / ↑ ↓ ← →<br />TAP THE FLOOR TO MOVE</span><button className="interact-button" type="button" disabled={!nearTable || paused || rulesOpen} onClick={() => setAtTable(true)}>{nearTable ? "! INTERACT · E" : "APPROACH THE COIN TABLE"}</button></section>}
      <p className="feedback" role={error ? "alert" : "status"}>{error || (atTable && !betValid ? "Enter 2,000–100,000 RF in steps of 2,000." : atTable ? message : "Explore the room · Approach the table and interact to flip")}</p>
      {rulesOpen && <div className="rules-shade"><section className="rules-window" role="dialog" aria-modal="true" aria-labelledby="rules-title"><header><span>RARE FLIP</span><button type="button" aria-label="Close RULES" onClick={() => setRulesOpen(false)}>×</button></header><h2 id="rules-title">RULES</h2><dl><div><dt>CHOOSE</dt><dd>HEADS or TAILS</dd></div><div><dt>BET</dt><dd>2,000–100,000 RF · steps of 2,000</dd></div><div><dt>WIN</dt><dd>{money(selectedBet * 2n)} gross · 2× bet</dd></div><div><dt>FEE</dt><dd>8% of bet · {money(selectedBet * 8n / 100n)}</dd></div><div className="rules-net"><dt>NET REWARD</dt><dd>{money(selectedUnits * NET)}</dd></div><div><dt>LOSE</dt><dd>0 RF</dd></div></dl><p>50% WIN · 50% LOSE · RF balances and outcomes in this demo are simulated.</p><label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> REDUCED MOTION</label><button type="button" className="rules-close" onClick={() => setRulesOpen(false)}>GOT IT</button></section></div>}
      {shopOpen && <FlipShop paused={paused} inventory={shopInventory} setInventory={setShopInventory} onClose={() => setShopOpen(false)} onPlaceRoomItem={id => { setShopOpen(false); setAtTable(false); setPlacementSpot(null); setPlacingItem(id); }} />}
      {placingItem && <RoomPlacement id={placingItem} items={shopInventory.roomItems} positions={shopInventory.roomPositions} selected={placementSpot} onSelect={setPlacementSpot} onPlace={confirmPlacement} paused={paused} onCancel={() => { setPlacingItem(null); setPlacementSpot(null); setShopOpen(true); }} />}
      {editingRoom && <RoomEditor items={shopInventory.roomItems} positions={draftPositions} setPositions={setDraftPositions} paused={paused} onCancel={() => setEditingRoom(false)} onSave={() => { setShopInventory(previous => ({ ...previous, roomPositions: draftPositions })); setEditingRoom(false); }} />}
    </section>
  </main>;
}
