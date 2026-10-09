import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {connect,type Game} from '@rarefriends/friendsdk';
import RareFlip from './index';
import {withArtKey} from './game-model';
import {createSdkClient} from './sdk-client';
let connection:ReturnType<typeof connect>|undefined;
function Client(){
 const [ready,setReady]=useState<{game:Game;client:ReturnType<typeof createSdkClient>;art:ReturnType<typeof withArtKey>}|null>(null),[paused,setPaused]=useState(false),[error,setError]=useState('');
 useEffect(()=>{let active=true;const stop:(()=>void)[]=[];
  (connection??=connect()).then(game=>{if(!active)return;if(!game.art)throw new Error('The host could not read this Friend artwork.');setPaused(game.paused);stop.push(game.on('pause',setPaused),game.on('closed',()=>{setReady(null);setError('This session ended. Choose your Friend on the platform.');}));setReady({game,client:createSdkClient(game),art:withArtKey(game.art)});}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to connect to Rare Friends.');});
  return()=>{active=false;stop.forEach(unsubscribe=>unsubscribe());};
 },[]);
 if(!ready)return <div className="rare-flip-loading" role={error?'alert':'status'}>{error||'Loading Rare Flip from the Rare Friends host…'}</div>;
 return <div className="platform-mode"><RareFlip friendId={BigInt(ready.game.friend.id)} client={ready.client} paused={paused} demoSprites={ready.art}/></div>;
}
createRoot(document.getElementById('root')!).render(<Client/>);
