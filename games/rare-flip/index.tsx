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

function FriendSprite({ sprites, tossing = false, className = "" }: { sprites: GenerationSprites | null; tossing?: boolean; className?: string }) {
  const rows = sprites ? spriteFrame(sprites, "down", tossing, tossing ? 3 : 0).frame.rows : null;
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
  return <div className={`wallet-friend ${className}`} data-tossing={tossing || undefined} aria-hidden="true">
    {pixels ? <svg viewBox="-1 -1 18 18" shapeRendering="crispEdges">
      <g className="friend-outline">{pixels.outline.map(key => { const [x, y] = key.split(","); return <rect key={key} x={x} y={y} width="1" height="1" />; })}</g>
      <g className="friend-fill">{pixels.black.map(key => { const [x, y] = key.split(","); return <rect key={key} x={x} y={y} width="1" height="1" />; })}</g>
    </svg> : <span className="friend-loading">···</span>}
  </div>;
}

function ConceptCoin({ phase, landed }: { phase: Phase; landed: Side | null }) {
  return <div className="concept-coin-anchor" data-phase={phase} data-result={landed ?? undefined} aria-label={landed ? `Kết quả ${sideLabel(landed)}` : "Đồng xu Rare Flip"}>
    <div className="concept-coin-token">
      <span className="concept-coin-face concept-heads" />
      <span className="concept-coin-face concept-tails" />
    </div>
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
  const [rulesOpen, setRulesOpen] = useState(false);
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
      if (state.plays.some(play => play.outcomeId === null)) setMessage("Có một lượt tung đang chờ. Tiếp tục mà không mất thêm cược.");
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
    if (!snapshot || !choice || paused || rulesOpen || lock.current) return;
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
      timer.current = window.setTimeout(() => {
        if (!alive.current) return;
        setPhase("result");
        setMessage(won ? `WIN · Nhận ròng ${money(NET)} sau phí ${money(FEE)}.` : `LOSE · Đồng xu ra ${sideLabel(finalSide)}.`);
      }, reducedMotion ? 250 : 2_700);
      await refresh();
    } catch (cause) {
      setPhase("idle"); setError(cause instanceof Error ? cause.message : "Lượt tung không hoàn tất.");
      try { await refresh(); } catch { /* keep the actionable error */ }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  async function claim() {
    if (!snapshot || snapshot.inventory[0] === 0n || paused || rulesOpen || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await client.redeem(1, snapshot.inventory[0]);
      await refresh(); setMessage(`${money(NET)} đã được cộng vào số dư mô phỏng.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể nhận thưởng."); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }

  function nextRound() {
    if (busy || paused || rulesOpen) return;
    setChoice(null); setResult(null); setLanded(null); setPhase("idle"); setError(""); setMessage("Chọn SẤP hoặc NGỬA để bắt đầu lượt mới.");
  }

  if (!snapshot) return <div className="rare-flip-loading" role={error ? "alert" : "status"}>{error || "Đang tải Rare Flip..."}</div>;
  const pending = snapshot.plays.some(play => play.outcomeId === null);
  const won = result?.outcomeId === 1;
  const canAfford = snapshot.rfBalance >= definition.price;
  const hasBacking = snapshot.freeStake >= maximumPrize(definition);
  const unclaimed = snapshot.inventory[0] ?? 0n;
  const unavailable = paused || rulesOpen || busy || phase === "flipping" || phase === "working";
  const flipDisabled = unavailable || phase === "result" || !choice || (!pending && snapshot.consumables === 0n && (!canAfford || !hasBacking));
  const actionLabel = phase === "result" ? unclaimed > 0n ? `NHẬN ${money(unclaimed * NET)}` : "LƯỢT MỚI" : pending ? "TIẾP TỤC LƯỢT TUNG" : busy ? "ĐANG XỬ LÝ..." : "TUNG XU · 2.000 RF";
  const action = phase === "result" ? unclaimed > 0n ? () => void claim() : nextRound : () => void flip();

  return <main className="rare-flip" data-paused={paused || rulesOpen || undefined} data-reduced-motion={reducedMotion || undefined} aria-label="Rare Flip" aria-busy={busy}>
    <section className="concept-board" aria-label="Sân khấu Rare Flip">
      <div className="balance-live" data-testid="balance">{money(snapshot.rfBalance)}</div>
      <button type="button" className="hotspot rules-hotspot" onClick={() => setRulesOpen(true)} disabled={paused || busy} aria-label="RULES" />

      <div className="portrait-cover portrait-banner-left"><FriendSprite sprites={sprites} /></div>
      <div className="portrait-cover portrait-banner-right"><FriendSprite sprites={sprites} /></div>
      <div className="portrait-cover portrait-cabinet-left"><FriendSprite sprites={sprites} /></div>
      <div className="portrait-cover portrait-cabinet-right"><FriendSprite sprites={sprites} /></div>

      <div className="central-friend-cover" aria-hidden="true" />
      <FriendSprite sprites={sprites} tossing={phase === "working" || phase === "flipping"} className="wallet-friend-main" />
      <div className="central-coin-cover" aria-hidden="true" />
      <ConceptCoin phase={phase} landed={landed} />

      <button type="button" className="hotspot choice-hotspot tails-hotspot" aria-label="SẤP" aria-pressed={choice === "tails"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("tails"); setMessage("Đã chọn SẤP. Sẵn sàng tung xu."); }} />
      <button type="button" className="hotspot choice-hotspot heads-hotspot" aria-label="NGỬA" aria-pressed={choice === "heads"} disabled={unavailable || phase === "result"} onClick={() => { setChoice("heads"); setMessage("Đã chọn NGỬA. Sẵn sàng tung xu."); }} />
      <button type="button" className="hotspot action-hotspot" disabled={phase === "result" ? unavailable : flipDisabled} onClick={action} aria-label={actionLabel}>
        {(phase === "result" || pending || busy) && <span>{actionLabel}</span>}
      </button>

      {phase === "result" && <div className={`result-burst ${won ? "win" : "lose"}`} role="status" aria-live="assertive"><strong>{won ? "WIN" : "LOSE"}</strong><span>{landed ? sideLabel(landed) : ""}</span></div>}
      {(error || phase === "result") && <p className="status-toast" role={error ? "alert" : "status"}>{error || message}</p>}
      <p className="sr-only" aria-live="polite">{error || message}</p>

      {rulesOpen && <div className="rules-shade">
        <section className="rules-window" role="dialog" aria-modal="true" aria-labelledby="rules-title">
          <header><span>RARE FLIP</span><button type="button" aria-label="Đóng RULES" onClick={() => setRulesOpen(false)}>×</button></header>
          <h2 id="rules-title">RULES</h2>
          <dl>
            <div><dt>CHỌN</dt><dd>SẤP hoặc NGỬA</dd></div>
            <div><dt>MỖI LƯỢT</dt><dd>{money(definition.price)}</dd></div>
            <div><dt>THẮNG</dt><dd>{money(GROSS)} gộp</dd></div>
            <div><dt>PHÍ</dt><dd>8% · {money(FEE)}</dd></div>
            <div className="rules-net"><dt>NHẬN RÒNG</dt><dd>{money(NET)}</dd></div>
            <div><dt>THUA</dt><dd>0 RF</dd></div>
          </dl>
          <p>50% WIN · 50% LOSE · RF và kết quả trong bản demo được mô phỏng.</p>
          <label><input type="checkbox" checked={reducedMotion} onChange={event => setReducedMotion(event.target.checked)} /> GIẢM CHUYỂN ĐỘNG</label>
          <button type="button" className="rules-close" onClick={() => setRulesOpen(false)}>ĐÃ HIỂU</button>
        </section>
      </div>}
    </section>
  </main>;
}
