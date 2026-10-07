import { useEffect, useRef, useState } from "react";
import "./thoughts.css";

type Mood = "idle" | "thinking" | "win" | "big" | "lose" | "rest";
const lines: Record<Mood,string[]> = {
  idle:["Hmm... shiny coins!","Just vibing...","Anyone home?"],
  thinking:["Heads... or tails?","Decisions, decisions...","One coin. Two stories!"],
  win:["YAY! Coin magic!","That felt good!","A little victory dance!"],
  big:["WOW! +{amount} RF!","Big sparkle moment!!","My crown is sparkling!"],
  lose:["Oof... wrong side!","Tiny cloud moment...","Still looking cute!"],
  rest:["Let's catch our breath...","A little room stroll?","No rush. I'm here!"],
};
const icons: Record<Mood,string[]> = {
  idle:["..#....","..##...","..#.#..","..#....","###....","###....","......."],
  thinking:[".###...","#...#..","....#..","...#...","..#....",".......","..#...."],
  win:[".##.##.","#######","#######",".#####.","..###..","...#...","......."],
  big:["#..#..#","#######",".#####.",".#####.",".......",".#####.","......."],
  lose:[".......",".#...#.",".......","..###..",".#...#.",".......","......."],
  rest:[".......","#####..","#...#.#","#...#.#",".###...",".......","#######"],
};
export function ThoughtBubble({ paused, phase, won, reward, losses, resultId, reducedMotion }: {
  paused:boolean; phase:string; won:boolean; reward:bigint; losses:number; resultId:string; reducedMotion:boolean;
}) {
  const root = useRef<HTMLDivElement>(null), previous = useRef("");
  const lastResult = useRef("");
  const current = useRef<{ mood:Mood; text:string; until:number } | null>(null);
  const clock = useRef(0), nextIdle = useRef(18000 + Math.random()*12000);
  const lastPosition = useRef({ x:480,y:369 });
  const pending = useRef<{ mood:Mood; delay:number } | null>(null);
  const [bubble,setBubble] = useState<{ mood:Mood; text:string } | null>(null);
  function show(mood:Mood) {
    const options=lines[mood].filter(line => line !== previous.current);
    const text=options[Math.floor(Math.random()*options.length)]; previous.current=text;
    current.current={ mood,text:text.replace("{amount}",(reward / 10n**18n).toLocaleString("en-US")),until:clock.current+4000 };
    setBubble(current.current);
  }
  useEffect(() => {
    if (phase === "flipping" || phase === "working") { current.current=null; setBubble(null); }
    if (phase === "result" && resultId && resultId !== lastResult.current) {
      lastResult.current=resultId;
      if (!won && losses >= 3 && losses % 3 !== 0) { pending.current=null; return; }
      pending.current={ mood:won ? reward >= 50000n*10n**18n ? "big" : "win" : losses >= 3 ? "rest" : "lose",delay:clock.current+700 };
    }
    if (phase !== "result") pending.current=null;
  },[phase,resultId,won,losses,reward]);
  useEffect(() => {
    let frame=0, previousTime=performance.now();
    const tick=(now:number) => {
      const dt=Math.min(100,now-previousTime); previousTime=now;
      if (!paused && !document.hidden) {
        clock.current+=dt;
        const canvas=root.current?.parentElement?.querySelector<HTMLCanvasElement>("canvas");
        const x=Number(canvas?.dataset.playerX ?? 480), y=Number(canvas?.dataset.playerY ?? 369);
        const moving=canvas?.dataset.walking === "true" || Math.hypot(x-lastPosition.current.x,y-lastPosition.current.y)>1;
        lastPosition.current={ x,y };
        if (root.current) { root.current.style.left=`${Math.max(135,Math.min(825,x+(phase === "result" ? 140 : 0)))/960*100}%`; root.current.style.top=`${Math.max(120,y-(phase === "result" ? 30 : 90))/540*100}%`; }
        if (pending.current && clock.current >= pending.current.delay) { const mood=pending.current.mood; pending.current=null; show(mood); }
        if (current.current && clock.current >= current.current.until) { current.current=null; setBubble(null); }
        if (phase === "idle") {
          if (moving) nextIdle.current=clock.current+18000+Math.random()*12000;
          else if (clock.current >= nextIdle.current) { show("idle"); nextIdle.current=clock.current+18000+Math.random()*12000; }
        }
      }
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  },[paused,phase,reward]);
  useEffect(() => { if (phase === "idle" && resultId === "thinking") { show("thinking"); nextIdle.current=clock.current+24000; } },[resultId]);
  return <div ref={root} className="friend-thought" data-visible={Boolean(bubble) && !paused} data-mood={bubble?.mood} data-reduced-motion={reducedMotion} role="status" aria-live="polite">
    {bubble && <><svg viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden="true">{icons[bubble.mood].flatMap((row,y) => [...row].map((pixel,x) => pixel === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1"/> : null))}</svg><span>{bubble.text}</span></>}
  </div>;
}
