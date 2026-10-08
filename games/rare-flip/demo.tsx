import {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {parseChanceGame} from '@rarefriends/friendsdk/game';
import RareFlip from './index';
import definitionJson from './game.json';
import {createVariablePreview} from '../../scripts/variable-preview.mjs';
import sampleSprites from 'rare-flip-demo-sample';
import './demo.css';

// A separate, explicitly labelled sample-art demo. No wallet/provider/identity
// is injected or claimed, and the normal SDK host entrypoint stays unchanged.
const definition=parseChanceGame(definitionJson);
function Demo(){
 const [session,setSession]=useState(0),[hidden,setHidden]=useState(document.hidden);
 const client=useMemo(()=>createVariablePreview(definition,{friendId:7730n,stake:2_000_000n*10n**18n,rfBalance:200_000n*10n**18n}).client,[session]);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 return <><RareFlip key={session} friendId={7730n} client={client} paused={hidden} demoSprites={sampleSprites}/><aside className="demo-mode"><span>DEMO · SAMPLE FRIEND · NO REAL TOKENS</span><button onClick={()=>setSession(value=>value+1)}>RESET DEMO</button></aside></>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
