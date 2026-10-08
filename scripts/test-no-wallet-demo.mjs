import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const pagesMode=process.argv.includes('--pages'),prefix=pagesMode?'/rare-flip':'';
const root=resolve(pagesMode?'dist':'.friendsdk/demo');
const server=createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;if(prefix&&!pathname.startsWith(prefix+'/')){res.writeHead(404).end();return;}const path=resolve(root,'.'+pathname.slice(prefix.length));if(!path.startsWith(root+sep)){res.writeHead(403).end();return;}const content=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(path)]??'application/octet-stream');res.end(content);}catch{res.writeHead(404).end();}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({headless:true}),errors=[],external=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(r.url());});
 await page.addInitScript(()=>{Object.defineProperty(window,'ethereum',{get(){throw new Error('Demo accessed a wallet');}});});
 await page.goto(origin+prefix+'/demo.html');
 await page.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 assert.equal(await page.getByTestId('balance').innerText(),'200,000 RF');
 assert.equal(await page.getByTestId('flip-balance').innerText(),'250 FLIP');
 await page.getByRole('button',{name:/INTERACT/}).click();
 for(const [draw,outcome]of [[1500,'WIN'],[9999,'LOSE']]){
  await page.evaluate(value=>{const random=crypto.getRandomValues.bind(crypto);crypto.getRandomValues=array=>array instanceof Uint32Array&&array.length===1?(array[0]=value,array):random(array);},draw);
  await page.getByRole('button',{name:'HEADS',exact:true}).click();await page.getByRole('button',{name:'FLIP COIN · 2,000 RF',exact:true}).click();
  await page.locator('.result-burst').waitFor();assert.equal(await page.locator('.result-burst strong').innerText(),outcome);
  if(outcome==='WIN'){await page.getByRole('button',{name:/^CLAIM /}).click();await page.getByRole('button',{name:'NEXT ROUND',exact:true}).click();}
 }
 assert.equal(await page.getByTestId('flip-balance').innerText(),'252 FLIP');
 await page.getByRole('button',{name:'SHOP',exact:true}).click();await page.getByRole('button',{name:'BUY · 15 FLIP',exact:true}).click();assert.equal(await page.getByTestId('flip-balance').innerText(),'237 FLIP');await page.getByRole('button',{name:'Close shop'}).click();
 await page.screenshot({path:'outputs/rare-flip-no-wallet-demo.png'});
 await page.getByRole('button',{name:'RESET DEMO',exact:true}).click();await page.getByRole('button',{name:'ENTER ROOM →',exact:true}).click();
 assert.equal(await page.getByTestId('balance').innerText(),'200,000 RF');assert.equal(await page.getByTestId('flip-balance').innerText(),'250 FLIP');
 await page.setViewportSize({width:390,height:844});
 const box=await page.locator('.game-shell').boundingBox();assert(box.width<=390);
 await page.getByRole('button',{name:/INTERACT/}).tap();await page.getByRole('button',{name:'TAILS',exact:true}).tap();
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 console.log('PASS: no wallet or external requests; WIN/LOSE, FLIP earning, shop purchase, reset, mobile touch.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
