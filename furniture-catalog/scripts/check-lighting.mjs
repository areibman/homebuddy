import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {lightingAt,isLightingChoice,lightingPresets} from '../app/decorate/lighting-presets.ts';
import {createRoomLighting,configureSunShadow} from '../app/decorate/lighting.ts';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import {createCityBackdrop} from '../app/decorate/city-backdrop.ts';

// Pacific boundaries, including standard time and the repeated DST hour.
for(const [date,mode] of [
 ['2026-09-08T12:59:00Z','night'],['2026-09-08T13:00:00Z','morning'],
 ['2026-09-08T17:00:00Z','day'],['2026-09-09T00:00:00Z','golden'],
 ['2026-09-09T03:00:00Z','night'],['2026-12-08T14:00:00Z','morning'],
 ['2026-11-01T08:30:00Z','night'],['2026-11-01T09:30:00Z','night'],
])assert.equal(lightingAt(new Date(date)),mode,date);
for(const value of ['auto',...Object.keys(lightingPresets)])assert(isLightingChoice(value));
for(const value of [null,'toString','__proto__','sunny'])assert(!isLightingChoice(value));

for(const file of ['plan.json','homes/bush-4101/plan.json']){
 const plan=JSON.parse(fs.readFileSync('app/decorate/'+file));
 const architecture=buildArchitecture(plan);
 const scene=new T.Scene();scene.add(architecture.root);
 const backdrop=createCityBackdrop(),renderer={capabilities:{maxTextureSize:8192},toneMappingExposure:1};
 const lighting=createRoomLighting(scene,renderer,plan.footprint,plan.height,architecture.root,backdrop,'day');
 const sun=scene.children.find(o=>o instanceof T.DirectionalLight);
 const lamps=[];architecture.root.traverse(o=>{if(o instanceof T.SpotLight)lamps.push(o);});assert.equal(lamps.length,plan.lights?.length??0,'only declared fixtures emit light');
 function checkCoverage(){
  scene.updateMatrixWorld(true);sun.shadow.updateMatrices(sun);
  for(const [x,z] of plan.footprint)for(const y of [-.26,0,plan.height+.12]){
   const projected=new T.Vector3(x,y,z).project(sun.shadow.camera);
   assert([projected.x,projected.y,projected.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1),`${file}: complete shadow coverage`);
  }
 }
 for(const mode of ['night','morning','golden','day']){
  lighting.setMode(mode);
  for(let frame=0;frame<90;frame++){lighting.update(1/60);checkCoverage();}
  assert.equal(lighting.mode,mode);assert.equal(lighting.update(1/60),false,'settled lighting needs no shadow redraw');
  assert.equal(sun.intensity,lightingPresets[mode].power);
  assert.equal(backdrop.material.uniforms.cityBrightness.value,lightingPresets[mode].cityBrightness);
  assert(lamps.every(l=>l.intensity>0&&l.castShadow));
 }
 for(const cutaway of [true,false,true]){
  architecture.cutaway(cutaway);scene.updateMatrixWorld(true);
  for(const lamp of lamps){
   for(let parent=lamp;parent;parent=parent.parent)assert(parent.visible,'lights still illuminate the overhead view');
   assert(lamp.getWorldPosition(new T.Vector3()).y>lamp.target.getWorldPosition(new T.Vector3()).y,'downlights point down');
  }
 }
 lighting.setMode('night');lighting.update(1/60,true);assert.equal(lighting.update(1/60),false,'reduced motion snaps to the selected mode');
 const lowSpec=new T.DirectionalLight();configureSunShadow(lowSpec,plan.footprint,plan.height,2048);assert.equal(lowSpec.shadow.mapSize.x,2048);
 lighting.dispose();backdrop.dispose();
}
console.log('PASS: Pacific time boundaries, both homes, shadow coverage through every transition, downlight cutaway, reduced motion, and GPU map-size fallback.');
