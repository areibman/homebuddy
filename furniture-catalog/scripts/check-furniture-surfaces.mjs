import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFurnitureCollisions} from '../app/decorate/furniture-collisions.ts';
import {createPlayer,stepPlayer,PLAYER} from '../app/decorate/player.ts';

const items=JSON.parse(readFileSync('app/decorate/items.json'));
const collisions=createFurnitureCollisions(),floor=[[-5,-5,10,10]],idle={x:0,z:0,yaw:0,run:false,jump:false};
// Geometry-only copies of the shipped GLBs keep this physics check independent of image decoding.
async function model(id){
 const item=items.find(item=>item.id===id),source=readFileSync('public'+item.files.glb.split('?')[0]);
 const size=source.readUInt32LE(12),json=JSON.parse(source.subarray(20,20+size).toString());
 delete json.images;delete json.textures;delete json.materials;
 for(const mesh of json.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const encoded=Buffer.from(JSON.stringify(json)),length=Math.ceil(encoded.length/4)*4;
 const buffer=Buffer.alloc(20+length+source.length-20-size,32);
 source.copy(buffer,0,0,12);buffer.writeUInt32LE(buffer.length,8);buffer.writeUInt32LE(length,12);buffer.writeUInt32LE(0x4e4f534a,16);encoded.copy(buffer,20);source.copy(buffer,20+length,20+size);
 const gltf=await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
 const model=gltf.scene,bounds=new Box3().setFromObject(model),dimensions=bounds.getSize(new Vector3());
 model.scale.set(item.dimensions_m.width/dimensions.x,item.dimensions_m.height/dimensions.y,item.dimensions_m.depth/dimensions.z);
 model.updateMatrixWorld(true);bounds.setFromObject(model);const center=bounds.getCenter(new Vector3());model.position.sub(new Vector3(center.x,bounds.min.y,center.z));
 const group=new Group();group.add(model);group.position.y=.01;return group;
}
for(const id of ['bed','sofa','coffee-table','dining-table']){
 const group=await model(id),parts=collisions(group),whole=new Box3().setFromObject(group);
 assert(parts.length>1);assert.equal(collisions(group),parts,'stationary colliders are cached');
 // Approach the middle of the front edge, jump forward from the floor, then settle.
 const p=createPlayer(0,whole.max.z+PLAYER.radius+.13);
 for(let i=0;i<120;i++)stepPlayer(p,{...idle,z:i<52&&p.z>(id==='sofa'?.3:.1)?-1:0,jump:i===0},1/120,parts,floor);
 assert(p.y>.25&&p.grounded,`${id}: landed on furniture from the floor (y=${p.y}, z=${p.z})`);
 if(id==='bed')assert(p.y<.7,'land on the mattress, not the headboard-height bounding box');
 if(id==='sofa')assert(p.y<.65,`land on the seat, not the backrest (y=${p.y}, z=${p.z})`);
 console.log(`PASS: jump onto ${id}, feet ${p.y.toFixed(3)}m`);
 for(let i=0;i<180;i++)stepPlayer(p,{...idle,z:1},1/120,parts,floor);
 assert.equal(p.y,0,`${id}: walking off returns to the floor`);
 group.position.x=2;group.rotation.y=Math.PI/2;
 const moved=collisions(group);assert.notEqual(moved,parts,'moving and rotating rebuilds colliders');
}
