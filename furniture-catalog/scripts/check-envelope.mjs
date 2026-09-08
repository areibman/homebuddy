import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createSlab} from '../app/decorate/slab.ts';
import {createCeiling} from '../app/decorate/ceiling.ts';
const plan=JSON.parse(fs.readFileSync('app/decorate/plan.json'));
const floor=createSlab(plan.footprint,-.25,.25,new T.MeshStandardMaterial());
const ceiling=createCeiling(plan.footprint,plan.height);ceiling.root.updateMatrixWorld(true);
function inside(x,z){let c=false;const p=plan.footprint;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])c=!c;return c;}
let samples=0;
for(let x=.025;x<6.7;x+=.1)for(let z=.025;z<8.45;z+=.1){
 if(!inside(x,z))continue;samples++;
 const point=new T.Vector3(x,1.6,z);
 assert(new T.Raycaster(point,new T.Vector3(0,-1,0)).intersectObject(floor).length,`floor hole at ${x},${z}`);
 assert(new T.Raycaster(point,new T.Vector3(0,1,0)).intersectObject(ceiling.root,true).length,`ceiling hole at ${x},${z}`);
 assert(plan.floors.some(([a,b,w,d])=>x>=a&&x<=a+w&&z>=b&&z<=b+d),`finish/collision hole at ${x},${z}`);
}
console.log(`PASS: ${samples} interior samples have floor, ceiling, finish and collision coverage.`);
