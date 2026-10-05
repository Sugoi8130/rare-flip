"use client";

import { useEffect, useRef, useState } from "react";
import type { GameComponentProps } from "@rarefriends/friendsdk/runtime";
import type { GamePlay, GameSnapshot } from "@rarefriends/friendsdk/game";
import { maximumPrize } from "@rarefriends/friendsdk/game";
import { createFriendReader, spriteFrame, type GenerationSprites } from "@rarefriends/friendsdk/sprites";
import { formatGameAmount } from "@rarefriends/friendsdk/ui";
import "./style.css";

type Side = "heads" | "tails";
type Phase = "idle" | "working" | "flipping" | "result";
const RF = 10n ** 18n;
const GROSS = 4_000n * RF;
const FEE = 320n * RF;
const NET = 3_680n * RF;
const opposite = (side: Side): Side => side === "heads" ? "tails" : "heads";
const sideLabel = (side: Side) => side === "heads" ? "NGỬA" : "SẤP";
const money = (value: bigint) => `${formatGameAmount(value, 18)} RF`;

function octagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, cut = .28) {
  const c = radius * cut;
  ctx.beginPath();
  ctx.moveTo(x - radius + c, y - radius); ctx.lineTo(x + radius - c, y - radius);
  ctx.lineTo(x + radius, y - radius + c); ctx.lineTo(x + radius, y + radius - c);
  ctx.lineTo(x + radius - c, y + radius); ctx.lineTo(x - radius + c, y + radius);
  ctx.lineTo(x - radius, y + radius - c); ctx.lineTo(x - radius, y - radius + c); ctx.closePath();
}

function drawRabbitLogo(ctx: CanvasRenderingContext2D, x: number, y: number, unit: number, color: string, eye: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, unit * 2, unit * 3); ctx.fillRect(x + unit * 4, y, unit * 2, unit * 3);
  ctx.fillRect(x, y + unit * 2, unit * 6, unit * 4);
  ctx.fillStyle = eye;
  ctx.fillRect(x + unit, y + unit * 3, unit, unit); ctx.fillRect(x + unit * 4, y + unit * 3, unit, unit);
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  ctx.fillStyle = "#9a4f18";
  ctx.beginPath(); ctx.moveTo(x, y - radius); ctx.lineTo(x + radius * .28, y - radius * .28); ctx.lineTo(x + radius, y);
  ctx.lineTo(x + radius * .28, y + radius * .28); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius * .28, y + radius * .28);
  ctx.lineTo(x - radius, y); ctx.lineTo(x - radius * .28, y - radius * .28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#fff4a9"; ctx.fillRect(x - 3, y - radius * .7, 6, radius * 1.4); ctx.fillRect(x - radius * .7, y - 3, radius * 1.4, 6);
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, face: Side, scaleX = 1) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(Math.max(.07, Math.abs(scaleX)), 1);
  ctx.shadowColor = "#ffb62e"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
  octagon(ctx, 0, 0, radius); ctx.fillStyle = "#8d4216"; ctx.fill();
  ctx.shadowBlur = 0; octagon(ctx, 0, -5, radius - 5); ctx.fillStyle = "#ffb52d"; ctx.fill();
  octagon(ctx, 0, -7, radius - 13); ctx.fillStyle = "#ffe568"; ctx.fill();
  ctx.fillStyle = "#fff1a2"; ctx.fillRect(-radius * .46, -radius * .69, radius * .65, 6);
  ctx.fillStyle = "#e68a1e"; ctx.fillRect(-radius * .62, radius * .45, radius * 1.24, 7);
  if (face === "heads") drawRabbitLogo(ctx, -radius * .46, -radius * .48, radius * .153, "#9b4a18", "#ffd758");
  else drawStar(ctx, 0, -5, radius * .47);
  ctx.restore();
}

function drawFriend(ctx: CanvasRenderingContext2D, sprites: GenerationSprites, x: number, bottom: number, scale: number, frame: number, tossing = false) {
  const rows = spriteFrame(sprites, "down", tossing, frame).frame.rows;
  const points: Array<[number, number]> = [];
  rows.forEach((row, py) => [...row].forEach((pixel, px) => { if (pixel === "#") points.push([px, py]); }));
  const left = Math.round(x - scale * 8), top = Math.round(bottom - scale * 16);
  ctx.fillStyle = "#fff8e8";
  points.forEach(([px, py]) => ctx.fillRect(left + px * scale - scale, top + py * scale - scale, scale * 3, scale * 3));
  ctx.fillStyle = "#08040f";
  points.forEach(([px, py]) => ctx.fillRect(left + px * scale, top + py * scale, scale, scale));
}

function drawCabinet(ctx: CanvasRenderingContext2D, x: number, y: number, flip: boolean, sprites: GenerationSprites | null, now: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(flip ? -1 : 1, 1);
  ctx.fillStyle = "#080410"; ctx.fillRect(0, 0, 104, 168);
  ctx.fillStyle = "#2d1552"; ctx.fillRect(8, 8, 88, 110); ctx.fillStyle = "#a7339c"; ctx.fillRect(12, 12, 80, 7);
  ctx.fillStyle = "#100821"; ctx.fillRect(20, 28, 64, 66); ctx.strokeStyle = "#9a56d0"; ctx.lineWidth = 4; ctx.strokeRect(20, 28, 64, 66);
  if (sprites) drawFriend(ctx, sprites, 52, 91, 3, Math.floor(now / 180) % 8);
  ctx.fillStyle = "#1b0d34"; ctx.fillRect(4, 116, 96, 20); ctx.fillStyle = "#ff3ea6"; ctx.fillRect(25, 122, 11, 5);
  ctx.fillStyle = "#47e8ee"; ctx.fillRect(48, 122, 11, 5); ctx.fillStyle = "#ffd23f"; ctx.fillRect(71, 122, 11, 5);
  ctx.fillStyle = "#080410"; ctx.fillRect(12, 136, 18, 38); ctx.fillRect(74, 136, 18, 38); ctx.restore();
}

function drawBanner(ctx: CanvasRenderingContext2D, x: number, sprites: GenerationSprites | null, now: number) {
  ctx.fillStyle = "#2d1552"; ctx.fillRect(x, 24, 104, 135); ctx.fillStyle = "#8c3fb3"; ctx.fillRect(x + 5, 29, 94, 4);
  ctx.fillStyle = "#160a2b"; ctx.fillRect(x + 20, 47, 64, 74); ctx.strokeStyle = "#69368c"; ctx.lineWidth = 3; ctx.strokeRect(x + 20, 47, 64, 74);
  if (sprites) drawFriend(ctx, sprites, x + 52, 118, 3, Math.floor(now / 210) % 8);
  ctx.fillStyle = "#2d1552"; ctx.beginPath(); ctx.moveTo(x, 159); ctx.lineTo(x + 52, 192); ctx.lineTo(x + 104, 159); ctx.closePath(); ctx.fill();
}

function paintArcade(ctx: CanvasRenderingContext2D, sprites: GenerationSprites | null, phase: Phase, landed: Side | null, started: number, now: number, reducedMotion: boolean) {
  ctx.clearRect(0, 0, 960, 372); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#10051f"; ctx.fillRect(0, 0, 960, 372);
  ctx.fillStyle = "#251044"; ctx.fillRect(0, 0, 960, 180);
  ctx.fillStyle = "#32135a"; ctx.beginPath(); ctx.moveTo(385, 0); ctx.lineTo(575, 0); ctx.lineTo(650, 280); ctx.lineTo(310, 280); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1b0b33"; ctx.fillRect(0, 170, 960, 202);
  ctx.strokeStyle = "#5a2b81"; ctx.lineWidth = 2;
  [205, 242, 287, 338].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke(); });
  for (let x = -80; x <= 1040; x += 80) { ctx.beginPath(); ctx.moveTo(480, 170); ctx.lineTo(x, 372); ctx.stroke(); }
  ctx.fillStyle = "#51207c"; ctx.fillRect(0, 166, 960, 5);
  drawCabinet(ctx, 25, 160, false, sprites, now); drawCabinet(ctx, 831, 160, true, sprites, now);
  drawBanner(ctx, 205, sprites, now); drawBanner(ctx, 651, sprites, now);
  ctx.fillStyle = "#6e2ca0"; ctx.beginPath(); ctx.ellipse(480, 342, 120, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f7c436"; ctx.beginPath(); ctx.ellipse(480, 339, 102, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#31134f"; ctx.beginPath(); ctx.ellipse(480, 339, 87, 9, 0, 0, Math.PI * 2); ctx.fill();
  const elapsed = reducedMotion ? 2_700 : now - started;
  let coinY = 112 + Math.sin(now / 420) * 4, scaleX = 1, face: Side = landed ?? "heads";
  if (phase === "flipping") {
    const p = Math.min(1, elapsed / 2_700), rotations = face === "heads" ? 8 : 8.5;
    coinY = 166 - Math.sin(Math.PI * p) * 88; scaleX = Math.cos(p * rotations * Math.PI * 2);
    face = scaleX >= 0 ? "heads" : "tails";
  } else if (phase === "working") coinY = 145 + Math.sin(now / 90) * 6;
  drawCoin(ctx, 480, coinY, 76, face, scaleX);
  if (sprites) {
    const toss = phase === "working" || phase === "flipping", bob = reducedMotion ? 0 : Math.round(Math.sin(now / 180) * 3);
    drawFriend(ctx, sprites, 480, 352 + bob, 7, reducedMotion ? 0 : Math.floor(now / 120) % 8, toss);
  }
  const sparkles = [[358,70,"#ffcf3f"],[600,115,"#43e4ee"],[335,145,"#ff42a1"],[632,62,"#ffcf3f"]] as const;
  sparkles.forEach(([x,y,color], index) => { if (reducedMotion || (Math.floor(now / 260) + index) % 2 === 0) { ctx.fillStyle=color; ctx.fillRect(x-3,y-11,6,22); ctx.fillRect(x-11,y-3,22,6); } });
}

function ArcadeScene({ sprites, phase, landed, paused, reducedMotion }: { sprites: GenerationSprites | null; phase: Phase; landed: Side | null; paused: boolean; reducedMotion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null), started = useRef(performance.now());
  useEffect(() => { started.current = performance.now(); }, [phase, landed]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
    let frame = 0;
    const render = (now: number) => { paintArcade(ctx, sprites, phase, landed, started.current, paused ? started.current : now, reducedMotion); frame = requestAnimationFrame(render); };
    frame = requestAnimationFrame(render); return () => cancelAnimationFrame(frame);
  }, [sprites, phase, landed, paused, reducedMotion]);
  return <canvas ref={canvas} width="960" height="372" aria-label="Rare Friend đứng trước máy tung xu trong arcade" />;
}

function RabbitMark() {
  return <svg viewBox="0 0 6 6" shapeRendering="crispEdges" aria-hidden="true"><path d="M0 0h2v2h2V0h2v6H0z" /><path className="mark-eyes" d="M1 3h1v1H1z M4 3h1v1H4z" /></svg>;
}

export default function RareFlip({ friendId, client, paused }: GameComponentProps) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null), [sprites, setSprites] = useState<GenerationSprites | null>(null);
  const [choice, setChoice] = useState<Side | null>(null), [phase, setPhase] = useState<Phase>("idle"), [result, setResult] = useState<GamePlay | null>(null), [landed, setLanded] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false), [rulesOpen, setRulesOpen] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("Chọn SẤP hoặc NGỬA để bắt đầu."), [reducedMotion, setReducedMotion] = useState(false);
  const lock = useRef(false), alive = useRef(true), timer = useRef<number | null>(null), definition = client.definition;
  useEffect(() => {
    alive.current = true; const preference = window.matchMedia("(prefers-reduced-motion: reduce)"), update = () => setReducedMotion(preference.matches); update(); preference.addEventListener("change", update);
    void Promise.all([client.read(), createFriendReader().read(friendId)]).then(([state, art]) => { if (!alive.current) return; if (state.friendId !== friendId) throw new Error("Phiên game không khớp với Rare Friend đã chọn."); setSnapshot(state); setSprites(art); if (state.plays.some(play => play.outcomeId === null)) setMessage("Có một lượt tung đang chờ. Tiếp tục mà không mất thêm cược."); }).catch(cause => { if (alive.current) setError(cause instanceof Error ? cause.message : "Không thể tải game."); });
    return () => { alive.current = false; preference.removeEventListener("change", update); if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [client, friendId]);
  async function refresh() { const state = await client.read(); if (alive.current) setSnapshot(state); return state; }
  async function flip() {
    if (!snapshot || !choice || paused || rulesOpen || lock.current) return; lock.current = true; setBusy(true); setError(""); setResult(null); setLanded(null); setPhase("working");
    try { const pending = snapshot.plays.find(play => play.outcomeId === null); let play = pending; if (!play) { if (snapshot.consumables === 0n) await client.buy(1n); [play] = await client.play(1n); } if (!play) throw new Error("Không tạo được lượt tung. Hãy thử lại."); const settled = await client.settle(play.id); if (settled.outcomeId === null) throw new Error("Kết quả chưa sẵn sàng. Lượt tung đã được giữ lại để tiếp tục."); const won = settled.outcomeId === 1, finalSide = won ? choice : opposite(choice); setResult(settled); setLanded(finalSide); setPhase("flipping"); setMessage("Đồng xu đang xoay..."); timer.current = window.setTimeout(() => { if (!alive.current) return; setPhase("result"); setMessage(won ? `WIN · Nhận ròng ${money(NET)} sau phí ${money(FEE)}.` : `LOSE · Đồng xu ra ${sideLabel(finalSide)}.`); }, reducedMotion ? 250 : 2_700); await refresh(); }
    catch (cause) { setPhase("idle"); setError(cause instanceof Error ? cause.message : "Lượt tung không hoàn tất."); try { await refresh(); } catch { /* retain error */ } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function claim() { if (!snapshot || snapshot.inventory[0] === 0n || paused || rulesOpen || lock.current) return; lock.current = true; setBusy(true); setError(""); try { await client.redeem(1, snapshot.inventory[0]); await refresh(); setMessage(`${money(NET)} đã được cộng vào số dư mô phỏng.`); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể nhận thưởng."); } finally { lock.current = false; if (alive.current) setBusy(false); } }
  function nextRound() { if (busy || paused || rulesOpen) return; setChoice(null); setResult(null); setLanded(null); setPhase("idle"); setError(""); setMessage("Chọn SẤP hoặc NGỬA để bắt đầu lượt mới."); }
  if (!snapshot) return <div className="rare-flip-loading" role={error ? "alert" : "status"}>{error || "Đang tải Rare Flip..."}</div>;
  const pending = snapshot.plays.some(play => play.outcomeId === null), won = result?.outcomeId === 1, unclaimed = snapshot.inventory[0] ?? 0n;
  const unavailable = paused || rulesOpen || busy || phase === "flipping" || phase === "working";
  const flipDisabled = unavailable || phase === "result" || !choice || (!pending && snapshot.consumables === 0n && (snapshot.rfBalance < definition.price || snapshot.freeStake < maximumPrize(definition)));
  const actionLabel = phase === "result" ? unclaimed > 0n ? `NHẬN ${money(unclaimed * NET)}` : "LƯỢT MỚI" : pending ? "TIẾP TỤC LƯỢT TUNG" : busy ? "ĐANG XỬ LÝ..." : "TUNG XU · 2.000 RF";
  const action = phase === "result" ? unclaimed > 0n ? () => void claim() : nextRound : () => void flip();
  return <main className="rare-flip" data-paused={paused || rulesOpen || undefined} data-reduced-motion={reducedMotion || undefined} aria-label="Rare Flip" aria-busy={busy}>
    <section className="game-shell">
      <header className="arcade-hud"><div><small>RARE FRIENDS ARCADE</small><h1>RARE FLIP</h1></div><div className="hud-actions"><button type="button" onClick={() => setRulesOpen(true)} disabled={paused || busy}>RULES</button><div className="balance"><RabbitMark /><strong data-testid="balance">{money(snapshot.rfBalance)}</strong></div></div></header>
      <div className="scene"><ArcadeScene sprites={sprites} phase={phase} landed={landed} paused={paused || rulesOpen} reducedMotion={reducedMotion} />{phase === "result" && <div className={`result-burst ${won ? "win" : "lose"}`} role="status" aria-live="assertive"><strong>{won ? "WIN" : "LOSE"}</strong><span>{landed ? sideLabel(landed) : ""}</span></div>}</div>
      <section className="control-row" aria-label="Điều khiển tung xu">
        <button type="button" className="choice-card tails" aria-label="SẤP" aria-pressed={choice === "tails"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("tails"); setMessage("Đã chọn SẤP. Sẵn sàng tung xu."); }}><span className="ui-coin"><i>✦</i></span><strong>SẤP</strong></button>
        <button type="button" className="primary-action" disabled={phase === "result" ? unavailable : flipDisabled} onClick={action} aria-label={actionLabel}>{actionLabel}</button>
        <button type="button" className="choice-card heads" aria-label="NGỬA" aria-pressed={choice === "heads"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("heads"); setMessage("Đã chọn NGỬA. Sẵn sàng tung xu."); }}><span className="ui-coin"><RabbitMark /></span><strong>NGỬA</strong></button>
      </section>
      <p className="feedback" role={error ? "alert" : "status"}>{error || message}</p>
      {rulesOpen && <div className="rules-shade"><section className="rules-window" role="dialog" aria-modal="true" aria-labelledby="rules-title"><header><span>RARE FLIP</span><button type="button" aria-label="Đóng RULES" onClick={() => setRulesOpen(false)}>×</button></header><h2 id="rules-title">RULES</h2><dl><div><dt>CHỌN</dt><dd>SẤP hoặc NGỬA</dd></div><div><dt>MỖI LƯỢT</dt><dd>{money(definition.price)}</dd></div><div><dt>THẮNG</dt><dd>{money(GROSS)} gộp</dd></div><div><dt>PHÍ</dt><dd>8% · {money(FEE)}</dd></div><div className="rules-net"><dt>NHẬN RÒNG</dt><dd>{money(NET)}</dd></div><div><dt>THUA</dt><dd>0 RF</dd></div></dl><p>50% WIN · 50% LOSE · RF và kết quả trong bản demo được mô phỏng.</p><label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> GIẢM CHUYỂN ĐỘNG</label><button type="button" className="rules-close" onClick={() => setRulesOpen(false)}>ĐÃ HIỂU</button></section></div>}
    </section>
  </main>;
}
