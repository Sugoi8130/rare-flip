import {useEffect,useRef,useState} from "react";
import type {GenerationSprites} from './game-model';
import {paintArcade,type Player} from "./scene-renderer";
import type {RoomId} from "./rooms";
import type {RoomPositions} from "./room-layout";
import type {PetPosition} from "./extra-art";

export function ShopPreview({sprites,theme,player,pet,items,positions,equipped,paused,reducedMotion,showWin,focus}:{
 sprites:GenerationSprites|null;theme:RoomId;player:Player;pet:PetPosition;items:string[];positions:RoomPositions;
 equipped:Record<string,string>;paused:boolean;reducedMotion:boolean;showWin:boolean;focus:{x:number;y:number};
}) {
 const canvas=useRef<HTMLCanvasElement>(null),clock=useRef(0),winStart=useRef(-Infinity);
 const [testingWin,setTestingWin]=useState(false);
 useEffect(()=>{
  const target=canvas.current,ctx=target?.getContext("2d");if(!target||!ctx)return;
  const room=document.createElement("canvas");room.width=1672;room.height=941;
  const roomContext=room.getContext("2d")!;
  let frame=0,previous=performance.now();
  const render=(now:number)=>{
   if(!paused)clock.current+=Math.max(0,Math.min(40,now-previous));previous=now;
   const win=testingWin&&clock.current-winStart.current<2400;
   paintArcade(roomContext,sprites,win?"result":"idle",null,winStart.current,clock.current,reducedMotion,
    {...player,walking:false},win,items,positions,equipped,pet,theme);
   ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,960,405);
   // Zoom the whole scene uniformly, never individual items. Include both
   // the selected decoration and the real Friend for a size comparison.
   const width=Math.max(360,Math.abs(focus.x-player.x)+150),height=width*405/960;
   const x=Math.max(0,Math.min(960-width,(focus.x+player.x)/2-width/2));
   const y=Math.max(0,Math.min(405-height,(focus.y+player.y)/2-height/2-20));
   ctx.drawImage(room,x/960*1672,y/540*941,width/960*1672,height/540*941,0,0,960,405);
   target.dataset.equipped=JSON.stringify(equipped);target.dataset.positions=JSON.stringify(positions);
   target.dataset.player=JSON.stringify(player);target.dataset.pet=JSON.stringify(pet);
   target.dataset.clock=String(Math.round(clock.current));target.dataset.win=String(win);
   target.dataset.theme=theme;
   frame=requestAnimationFrame(render);
  };
  frame=requestAnimationFrame(render);return()=>cancelAnimationFrame(frame);
 },[sprites,theme,player,pet,items,positions,equipped,paused,reducedMotion,testingWin,focus]);
 return <><div className="preview-stage live-scene-stage"><canvas ref={canvas} className="live-room-preview" width={960} height={405} aria-label="Live room preview"/></div>
 {showWin&&<button className="test-win-effect" type="button" disabled={paused} onClick={()=>{winStart.current=clock.current;setTestingWin(true);}}>TEST WIN EFFECT</button>}</>;
}
