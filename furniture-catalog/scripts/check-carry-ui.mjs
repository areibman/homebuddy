import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {OrthographicCamera,Vector3} from 'three';
import sharp from 'sharp';
import {chromium} from '/Users/hyperbox/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const output='/Users/hyperbox/homebuddy/.firecrawl/carry-fix';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-angle=swiftshader','--enable-webgl']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.setDefaultTimeout(30000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.HOMEBUDDY_URL||'http://localhost:3000')+'/decorate',{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>document.querySelector('.room-stage')?.getAttribute('aria-busy')==='false');
 const canvas=page.locator('.room-canvas canvas');
 const count=()=>page.locator('.inventory-trigger small').innerText();
 assert.equal(await count(),'8 pieces in room');
 async function point(x,y,z){
  const rect=await canvas.boundingBox(),ratio=rect.width/rect.height;
  const camera=new OrthographicCamera(-7*ratio,7*ratio,7,-7,.1,100);
  camera.position.set(13,15,18);camera.lookAt(3.1,0,4.3);camera.updateMatrixWorld();
  const projected=new Vector3(x,y,z).project(camera);
  return {x:rect.x+(projected.x+1)*rect.width/2,y:rect.y+(1-projected.y)*rect.height/2};
 }
 async function pick(x,y,z){const p=await point(x,y,z);await page.mouse.click(p.x,p.y);await page.getByRole('group',{name:'Furniture in hand'}).waitFor();return p;}
 async function picture(name){
  const buffer=await canvas.screenshot();
  const {data,info}=await sharp(buffer).resize(80,80).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const colors=new Set();for(let i=0;i<data.length;i+=info.channels)colors.add(`${data[i]},${data[i+1]},${data[i+2]}`);
  assert(colors.size>50,'room canvas must be visibly rendered');
  await page.screenshot({path:output+'/'+name+'.png',animations:'disabled'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await picture('desktop');
 const bed=await pick(1.6,.55,1.35);
 const panel=page.getByRole('group',{name:'Furniture in hand'}),anchor=await panel.boundingBox();
 await page.mouse.move(bed.x-30,bed.y+30);
 await page.waitForTimeout(250);
 assert.deepEqual(await panel.boundingBox(),anchor,'action panel stays reachable while moving furniture');
 await picture('desktop-carry');
 await page.keyboard.press('Escape');
 assert.equal(await count(),'8 pieces in room');
 await page.mouse.click(bed.x,bed.y);await page.getByRole('button',{name:'Delete furniture',exact:true}).click();
 assert.equal(await count(),'7 pieces in room');
 console.log('PASS: pickup, stable actions, Escape rollback, and trash button');
 await page.getByRole('group',{name:'Furniture in hand'}).waitFor({state:'hidden'});
 await pick(2.4,.4,6.6);await page.keyboard.press('Delete');
 assert.equal(await count(),'6 pieces in room');
 await pick(.85,.55,6.45);await page.keyboard.press('Backspace');
 assert.equal(await count(),'5 pieces in room');
 console.log('PASS: Escape rollback, trash button, Delete, and Backspace in the real editor');
 const table=await point(4.7,.7,7.02);await page.mouse.click(table.x,table.y,{button:'right'});
 await page.getByRole('button',{name:'Remove from room',exact:true}).click();
 assert.equal(await count(),'4 pieces in room');
 console.log('PASS: right-click details and removal');
 await page.getByRole('button',{name:'Walk',exact:true}).click();
 await page.keyboard.press('E');await page.locator('.inventory-slot').first().click();
 await page.keyboard.press('ArrowDown');
 await page.getByRole('button',{name:'Delete furniture',exact:true}).waitFor();
 await picture('walk-carry');
 await page.keyboard.press('Backspace');assert.equal(await count(),'4 pieces in room');
 await page.getByRole('button',{name:'Isometric',exact:true}).click();
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:/Inventory/}).click();await page.locator('.inventory-slot').first().click();
 await picture('mobile-carry');
 const overflow=await page.locator('.placement-actions button').evaluateAll(buttons=>buttons.some(button=>button.scrollWidth>button.clientWidth));
 assert.equal(overflow,false,'placement controls fit on mobile');
 await page.getByRole('button',{name:'Delete furniture',exact:true}).click();assert.equal(await count(),'4 pieces in room');
 console.log('PASS: walk mode, cancel new furniture, mobile trash control and nonblank desktop/mobile canvas');
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
