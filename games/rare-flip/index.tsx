"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

function PixelFriend({ sprites, tossing }: { sprites: GenerationSprites | null; tossing: boolean }) {
  const rows = sprites ? spriteFrame(sprites, "up", tossing, tossing ? 3 : 0).frame.rows : null;
  const pixels = useMemo(() => {
    if (!rows) return null;
    const black = new Set<string>();
    rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === "#") black.add(`${x},${y}`); }));
    const outline = new Set<string>();
    black.forEach(key => {
      const [x, y] = key.split(",").map(Number);
      for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        if (Math.abs(ox) + Math.abs(oy) <= 1 && !black.has(`${x + ox},${y + oy}`)) outline.add(`${x + ox},${y + oy}`);
      }
    });
    return { black: [...black], outline: [...outline] };
  }, [rows]);
  return <div className="rf-character" data-tossing={tossing || undefined} aria-label="Rare Friend đang tung xu">
    {pixels ? <svg viewBox="-1 -1 18 18" shapeRendering="crispEdges" aria-hidden="true">
      <g className="rf-sprite-outline">{pixels.outline.map(key => { const [x, y] = key.split(","); return <rect key={key} x={x} y={y} width="1" height="1" />; })}</g>
      <g className="rf-sprite-fill">{pixels.black.map(key => { const [x, y] = key.split(","); return <rect key={key} x={x} y={y} width="1" height="1" />; })}</g>
    </svg> : <div className="rf-character-placeholder" aria-hidden="true"><i /><i /><i /></div>}
    <span className="rf-hand" aria-hidden="true" />
  </div>;
}

function Coin({ phase, landed }: { phase: Phase; landed: Side | null }) {
  return <div className="coin-flight" data-phase={phase}>
    <div className="pixel-coin" data-face={landed ?? "heads"} aria-label={landed ? `Kết quả ${sideLabel(landed)}` : "Đồng xu pixel"}>
      <div className="coin-face coin-heads"><span>RF</span><small>NGỬA</small></div>
      <div className="coin-face coin-tails"><span>◆</span><small>SẤP</small></div>
      <div className="coin-edge" />
    </div>
    <div className="coin-shadow" aria-hidden="true" />
  </div>;
}

export default function RareFlip({ friendId, client, paused }: GameComponentProps) {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [sprites, setSprites] = useState<GenerationSprites | null>(null);
  const [choice, setChoice] = useState<Side | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GamePlay | null>(null);
  const [landed, setLanded] = useState<Side | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Chọn SẤP hoặc NGỬA để bắt đầu.");
  const [reducedMotion, setReducedMotion] = useState(false);
  const lock = useRef(false), alive = useRef(true), timer = useRef<number | null>(null);
  const definition = client.definition;

  useEffect(() => {
    alive.current = true;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(preference.matches);
    updateMotion(); preference.addEventListener("change", updateMotion);
    void Promise.all([client.read(), createFriendReader().read(friendId)]).then(([state, art]) => {
      if (!alive.current) return;
      if (state.friendId !== friendId) throw new Error("Phiên game không khớp với Rare Friend đã chọn.");
      setSnapshot(state); setSprites(art);
      if (state.plays.some(play => play.outcomeId === null)) setMessage("Có một lượt tung đang chờ. Tiếp tục lượt này mà không mất thêm cược.");
    }).catch(cause => { if (alive.current) setError(cause instanceof Error ? cause.message : "Không thể tải game."); });
    return () => {
      alive.current = false; preference.removeEventListener("change", updateMotion);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [client, friendId]);

  async function refresh() {
    const state = await client.read();
    if (alive.current) setSnapshot(state);
    return state;
  }

  async function flip() {
    if (!snapshot || !choice || paused || lock.current) return;
    lock.current = true; setBusy(true); setError(""); setResult(null); setLanded(null); setPhase("working");
    try {
      const pending = snapshot.plays.find(play => play.outcomeId === null);
      let play = pending;
      if (!play) {
        if (snapshot.consumables === 0n) await client.buy(1n);
        [play] = await client.play(1n);
      }
      if (!play) throw new Error("Không tạo được lượt tung. Hãy thử lại.");
      const settled = await client.settle(play.id);
      if (settled.outcomeId === null) throw new Error("Kết quả chưa sẵn sàng. Lượt tung đã được giữ lại để tiếp tục.");
      const won = settled.outcomeId === 1;
      const finalSide = won ? choice : opposite(choice);
      setResult(settled); setLanded(finalSide); setPhase("flipping"); setMessage("Đồng xu đang xoay...");
      const delay = reducedMotion ? 250 : 2_700;
      timer.current = window.setTimeout(() => {
        if (!alive.current) return;
        setPhase("result");
        setMessage(won ? `Thắng! Nhận ròng ${money(NET)} sau phí ${money(FEE)}.` : `Thua. Đồng xu ra ${sideLabel(finalSide)}.`);
      }, delay);
      await refresh();
    } catch (cause) {
      setPhase("idle");
      setError(cause instanceof Error ? cause.message : "Lượt tung không hoàn tất.");
      try { await refresh(); } catch { /* keep the actionable error */ }
    } finally {
      lock.current = false; if (alive.current) setBusy(false);
    }
  }

  async function claim() {
    if (!snapshot || snapshot.inventory[0] === 0n || paused || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await client.redeem(1, snapshot.inventory[0]);
      await refresh(); setMessage(`${money(NET)} đã được cộng vào số dư mô phỏng.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể nhận thưởng."); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  function nextRound() {
    if (busy || paused) return;
    setChoice(null); setResult(null); setLanded(null); setPhase("idle"); setError(""); setMessage("Chọn SẤP hoặc NGỬA để bắt đầu lượt mới.");
  }

  if (!snapshot) return <div className="rare-flip-loading" role={error ? "alert" : "status"}>{error || "Đang tải Rare Flip..."}</div>;
  const pending = snapshot.plays.some(play => play.outcomeId === null);
  const won = result?.outcomeId === 1;
  const canAfford = snapshot.rfBalance >= definition.price;
  const hasBacking = snapshot.freeStake >= maximumPrize(definition);
  const unclaimed = snapshot.inventory[0] ?? 0n;
  const actionDisabled = paused || busy || phase === "flipping" || phase === "result" || !choice || (!pending && snapshot.consumables === 0n && (!canAfford || !hasBacking));

  return <main className="rare-flip" data-paused={paused || undefined} data-reduced-motion={reducedMotion || undefined} aria-label="Rare Flip" aria-busy={busy}>
    <header className="game-header">
      <div><span className="eyebrow">RARE FRIENDS ARCADE</span><h1>RARE FLIP</h1></div>
      <div className="balance-panel"><small>SỐ DƯ MÔ PHỎNG</small><strong data-testid="balance">{money(snapshot.rfBalance)}</strong></div>
    </header>

    <section className="game-stage">
      <div className="floor-grid" aria-hidden="true" />
      <div className="neon-sign sign-left" aria-hidden="true">50</div><div className="neon-sign sign-right" aria-hidden="true">50</div>
      <div className="flip-table" aria-hidden="true"><span>CHOOSE</span><b>◆</b><span>FLIP</span></div>
      <Coin phase={phase} landed={landed} />
      <PixelFriend sprites={sprites} tossing={phase === "working" || phase === "flipping"} />
      <div className="character-shadow" aria-hidden="true" />
      {phase === "result" && <div className={`result-burst ${won ? "win" : "lose"}`} role="status" aria-live="assertive">
        <span>{won ? "WIN" : "LOSE"}</span><small>{landed ? sideLabel(landed) : ""}</small>
      </div>}
      <div className="pixel-sparkles" aria-hidden="true"><i /><i /><i /><i /></div>
    </section>

    <section className="control-deck">
      <div className="choice-group" aria-label="Chọn mặt đồng xu">
        <button type="button" className="choice-card" aria-pressed={choice === "tails"} disabled={paused || busy || phase !== "idle"} onClick={() => { setChoice("tails"); setMessage("Đã chọn SẤP. Sẵn sàng tung xu."); }}>
          <span className="mini-coin tails">◆</span><strong>SẤP</strong><small>Mặt biểu tượng</small>
        </button>
        <button type="button" className="choice-card" aria-pressed={choice === "heads"} disabled={paused || busy || phase !== "idle"} onClick={() => { setChoice("heads"); setMessage("Đã chọn NGỬA. Sẵn sàng tung xu."); }}>
          <span className="mini-coin heads">RF</span><strong>NGỬA</strong><small>Mặt chữ RF</small>
        </button>
      </div>
      <div className="action-column">
        {phase === "result" ? <button type="button" className="flip-button" disabled={paused || busy} onClick={nextRound}>LƯỢT MỚI</button> :
          <button type="button" className="flip-button" disabled={actionDisabled} onClick={() => void flip()}>{pending ? "TIẾP TỤC LƯỢT TUNG" : busy ? "ĐANG XỬ LÝ..." : "TUNG XU · 2.000 RF"}</button>}
        {unclaimed > 0n && <button type="button" className="claim-button" disabled={paused || busy} onClick={() => void claim()}>NHẬN {money(unclaimed * NET)}</button>}
        <p className="game-feedback" role={error ? "alert" : "status"}>{error || message}</p>
      </div>
      <div className="odds-panel">
        <div><span>TỶ LỆ</span><strong>50 / 50</strong></div>
        <div><span>CƯỢC</span><strong>2.000 RF</strong></div>
        <div><span>THẮNG GỘP</span><strong>4.000 RF</strong></div>
        <div><span>PHÍ</span><strong>8% · 320 RF</strong></div>
        <div className="net"><span>NHẬN RÒNG</span><strong>3.680 RF</strong></div>
      </div>
    </section>
    <footer><span>DEMO · RF VÀ KẾT QUẢ ĐƯỢC MÔ PHỎNG</span><label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> Giảm chuyển động</label></footer>
  </main>;
}
