import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {chromium} from '/Users/hyperbox/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const output='/Users/hyperbox/homebuddy/.firecrawl/jump-doors';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Test-only observation and spawn positioning; no physics or production debug API is replaced.
 await page.route('**/app/decorate/player.ts*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const body=source.replace(/export function stepPlayer\([^)]*\) \{/,match=>match+'\nwindow.__player = p;');
  assert.notEqual(source,body);await route.fulfill({response,body});
 });
 await page.route('**/app/decorate/scene.ts*',async route=>{
  const response=await route.fetch(),source=await response.text();
  const body=source.replace('renderer.render(scene, camera);','window.__scene = scene; window.__camera = camera; renderer.render(scene, camera);');
  assert.notEqual(source,body);await route.fulfill({response,body});
 });
 await page.goto('http://localhost:3000/decorate',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.querySelector('.room-stage')?.getAttribute('aria-busy')==='false'&&window.__scene);
 const canvas=page.locator('.room-canvas canvas');
 async function point(index,closed=false){return page.evaluate(({index,closed})=>{
  const doors=[];window.__scene.traverse(o=>{if(o.name==='Open door')doors.push(o);});
  const door=doors[index],v=door.position.clone().set(closed?.43:0,.3,closed?0:-.43);
  door.parent.localToWorld(v);v.project(window.__camera);const r=document.querySelector('.room-canvas').getBoundingClientRect();
  return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};
 },{index,closed});}
 async function angle(index){return page.evaluate(index=>{const doors=[];window.__scene.traverse(o=>{if(o.name==='Open door')doors.push(o);});return doors[index].rotation.y;},index);}
 async function picture(name){
  const png=await canvas.screenshot(),{data,info}=await sharp(png).resize(80,80).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const colors=new Set();for(let i=0;i<data.length;i+=info.channels)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);assert(colors.size>50);
  await page.screenshot({path:output+'/'+name+'.png',animations:'disabled'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 const open=await point(0);await page.mouse.move(open.x,open.y);
 await page.getByRole('button',{name:'Close door F',exact:true}).waitFor();
 await picture('desktop-open');
 await page.mouse.click(open.x,open.y);
 await page.waitForFunction(()=>{let door;window.__scene.traverse(o=>{if(o.name==='Open door'&&o.parent.userData.doorIndex===0)door=o;});return Math.abs(door.rotation.y)<.001;});
 await picture('desktop-closed');
 const closed=await point(0,true);await page.mouse.move(closed.x,closed.y);await canvas.focus();await page.keyboard.press('f');
 await page.waitForFunction(()=>{let door;window.__scene.traverse(o=>{if(o.name==='Open door'&&o.parent.userData.doorIndex===0)door=o;});return Math.abs(door.rotation.y-Math.PI/2)<.001;});
 console.log('PASS: real door click closes; F reopens; rendered angles change');
 await page.getByRole('button',{name:'Walk',exact:true}).click();await page.waitForFunction(()=>window.__player&&window.__camera.isPerspectiveCamera);
 await page.evaluate(()=>{Object.assign(window.__player,{x:1.6,y:0,z:2.69,vx:0,vy:0,vz:0,grounded:true});window.__camera.rotation.set(-.35,0,0,'YXZ');});
 await canvas.focus();await page.keyboard.down('w');await page.keyboard.press('Space');
 await page.waitForFunction(()=>window.__player.z<2.12);await page.keyboard.up('w');
 await page.waitForFunction(()=>window.__player.grounded&&window.__player.y>.5);
 const landed=await page.evaluate(()=>({feet:window.__player.y,eye:window.__camera.position.y,z:window.__player.z}));
 assert(landed.feet<.7);assert(Math.abs(landed.eye-landed.feet-1.55)<.01);
 await picture('on-bed');console.log('PASS: Space + W lands on the real bed mattress',landed);
 await page.keyboard.down('s');await page.waitForFunction(()=>window.__player.z>2.6);await page.keyboard.up('s');await page.waitForFunction(()=>window.__player.y===0);
 console.log('PASS: walking off the bed returns to the floor');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement);
 await page.getByRole('button',{name:'Isometric',exact:true}).click();await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>window.__camera.isOrthographicCamera&&document.querySelector('.room-canvas canvas').clientWidth===390);
 const mobile=await point(0);await page.mouse.click(mobile.x,mobile.y);
 await page.waitForTimeout(300);assert(Math.abs(await angle(0))<.001);
 await picture('mobile-closed');assert.deepEqual(errors,[]);
 console.log('PASS: mobile door interaction and nonblank desktop/mobile canvas');
}finally{await browser.close();}
