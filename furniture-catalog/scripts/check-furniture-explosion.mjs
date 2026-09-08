import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {createFurnitureExplosion} from '../app/decorate/furniture-explosion.ts';
import {pickFurniture} from '../app/decorate/scene-picking.ts';

const catalog=JSON.parse(fs.readFileSync('app/catalog.json'));
for(const path of ['app/decorate/plan.json','app/decorate/homes/bush-4101/plan.json']){
 const plan=JSON.parse(fs.readFileSync(path));
 for(const aspect of [1.6,.48])for(const layout of plan.layouts??[{furniture:plan.furniture}]){
  const scene=new T.Scene(),objects=layout.furniture.map((p,i)=>{
   const dimensions=catalog.find(item=>item.id===p.id).dimensions_m;
   const object=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(dimensions.width,dimensions.height,dimensions.depth));
   mesh.position.y=dimensions.height/2;object.add(mesh);object.position.set(p.x,.01,p.z);object.rotation.y=p.r;
   // Include a manually moved piece and an elevated placement in the rollback check.
   if(i===0)object.position.add(new T.Vector3(.17,.13,.21));
   scene.add(object);return object;
  });
  const originals=objects.map(object=>({position:object.position.clone(),rotation:object.quaternion.clone()}));
  const xs=plan.footprint.map(p=>p[0]),zs=plan.footprint.map(p=>p[1]);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
  const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs)),size=Math.max(7,span*.83);
  const camera=new T.OrthographicCamera(-size*aspect,size*aspect,size,-size,.1,100),target=new T.Vector3(cx,0,cz);
  camera.position.set(cx+span*1.2,span*1.7,cz+span*1.6);camera.lookAt(target);camera.zoom=1.4;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
  const saved={position:camera.position.clone(),target:target.clone(),zoom:camera.zoom};
  const explosion=createFurnitureExplosion(objects,plan.footprint,plan.height,camera,target);
  explosion.setExpanded(true,0);explosion.update(400);assert(explosion.active);
  explosion.update(950);assert(!explosion.active&&explosion.expanded);
  const bounds=objects.map(object=>new T.Box3().setFromObject(object));
  bounds.forEach((box,i)=>{
   assert(box.min.z>Math.max(...zs),'every piece is outside the apartment');
   bounds.slice(i+1).forEach(other=>assert(!box.intersectsBox(other),'display pieces never overlap'));
   const center=box.getCenter(new T.Vector3()).project(camera);
   assert(Math.abs(center.x)<.81&&Math.abs(center.y)<.65&&Math.abs(center.z)<1,'all pieces fit the camera on desktop and portrait');
   const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(center.x,center.y),camera);
   assert.equal(pickFurniture(ray,objects,[]),objects[i],'every piece can be clicked independently');
  });
  camera.left=-size*.7;camera.right=size*.7;camera.updateProjectionMatrix();explosion.resize();
  explosion.setExpanded(false,1000);explosion.update(1950);
  objects.forEach((object,i)=>{assert(object.position.equals(originals[i].position));assert(object.quaternion.equals(originals[i].rotation));assert.equal(object.parent,scene);});
  assert(camera.position.equals(saved.position));assert(target.equals(saved.target));assert.equal(camera.zoom,saved.zoom);
  explosion.setExpanded(true,2000,true);assert(!explosion.active&&explosion.expanded);
  const removed=objects.pop();removed.removeFromParent();explosion.restore();
  objects.forEach((object,i)=>assert(object.position.equals(originals[i].position)));
  explosion.setExpanded(true,3000);explosion.restore();assert(!explosion.active&&!explosion.expanded);
 }
}
console.log('PASS: both apartments and layouts; separated, independently clickable pieces; desktop/portrait framing; resize; exact custom placement/camera rollback; reduced motion; removal and interrupted animation.');
