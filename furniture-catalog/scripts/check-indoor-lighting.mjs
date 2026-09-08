import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import {buildArchitecture} from '../app/decorate/architecture.ts';
import {createIndoorLightField} from '../app/decorate/indoor-light-field.ts';
import {createIndoorLighting} from '../app/decorate/indoor-lighting.ts';

// Two rooms joined by a doorway; only the left room has a window and a lamp.
const plan={floors:[[0,0,6,4]],walls:[[0,0,6,0],[6,0,6,4],[6,4,0,4],[0,4,0,0],[3,0,3,1.5],[3,2.5,3,4]],windows:[{wall:3,start:1,width:2}],lights:[[1,2]]};
const field=createIndoorLightField(plan);
assert(field.sample(5,2).daylight>0&&field.sample(5,2).lamps>0,'an open doorway admits diffuse light');
field.rebuild([{line:[3,1.475,3,2.525],halfWidth:.055}]);
assert.deepEqual(field.sample(5,2),{daylight:0,lamps:0},'a closed unlit room receives no global fill');
assert(field.sample(1,2).daylight>0&&field.sample(1,2).lamps>0,'the lit room remains illuminated');
const ownLight=createIndoorLightField({...plan,lights:[[5,2]]});
ownLight.rebuild([{line:[3,1.475,3,2.525],halfWidth:.055}]);
assert.equal(ownLight.sample(5,2).daylight,0);assert(ownLight.sample(5,2).lamps>.9,'a fixture inside a sealed room still works');
assert.equal(ownLight.sample(1,2).lamps,0,'fixture bounce cannot leak through the partition');

const bush=JSON.parse(fs.readFileSync('app/decorate/homes/bush-4101/plan.json'));
const architecture=buildArchitecture(bush);
const indoor=createIndoorLighting(bush,architecture.doors.map(door=>{const spec=bush.doors[door.pivot.userData.openingIndex];return {pivot:door.pivot,width:spec.width/(spec.leaves??1)};}));
for(const {name,rect:[x,z,w,d]} of bush.closetVolumes){
 // Check a grid throughout the enclosure, including both sides of each paired door.
 for(let a=x+.25;a<x+w-.18;a+=.18)for(let b=z+.2;b<z+d-.16;b+=.18){
  assert.deepEqual(indoor.field.sample(a,b),{daylight:0,lamps:0},`${name}: closed closet stays dark at ${a},${b}`);
 }
}
for(const room of bush.rooms.filter(room=>!room.name.includes('closet'))){
 const value=indoor.field.sample(...room.point);assert(value.daylight>0||value.lamps>0,room.name+' retains a light source');
}
for(const label of ['Walk-in closet','Entry closet','Bedroom closet doors','Primary closet']){
 const selected=architecture.doors.filter(door=>bush.doors[door.pivot.userData.openingIndex].label===label);
 const volume=bush.closetVolumes.find(closet=>label.startsWith(closet.name));assert(volume);
 const [x,z,w,d]=volume.rect;
 for(const door of selected){door.toggle();door.update(1,[],true);}indoor.update(1,1,1);
 const open=indoor.field.sample(x+w/2,z+d/2);assert(open.daylight>0||open.lamps>0,label+' admits spill when opened');
 for(const door of selected){door.toggle();door.update(1,[],true);}indoor.update(1,1,1);
 assert.deepEqual(indoor.field.sample(x+w/2,z+d/2),{daylight:0,lamps:0},label+' becomes dark again when closed');
}
// The shader affects ambient diffuse and environment reflections, preserving direct lights.
const material=new T.MeshStandardMaterial(),mesh=new T.Mesh(new T.BoxGeometry(),material);indoor.apply(mesh);
const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader,{});
assert(shader.fragmentShader.includes('irradiance=irradiance*indoorSky'));
assert(shader.fragmentShader.includes('radiance*=min(1.0,indoorSky+indoorBounce)'));
assert(shader.fragmentShader.includes('#include <lights_fragment_begin>'),'shadow-mapped direct lighting is retained');
assert(shader.vertexShader.includes('vIndoorPosition=(modelMatrix*vec4(transformed,1.0)).xyz'));
const ghost=mesh.clone();ghost.material=material.clone();indoor.apply(ghost);assert.equal(ghost.material.customProgramCacheKey(),material.customProgramCacheKey(),'carried furniture also respects enclosure lighting');
indoor.update(0,0,1);assert.equal(indoor.uniforms.indoorLampLevel.value,0);assert.equal(indoor.uniforms.indoorEnclosure.value,1);
indoor.update(0,1,0);assert.equal(indoor.uniforms.indoorEnclosure.value,0,'roofless overview keeps its presentation lighting');
indoor.dispose();mesh.geometry.dispose();material.dispose();ghost.material.dispose();
console.log('PASS: sealed unlit rooms, isolated fixtures, all four real closets, paired doors, open/close spill, environment reflections, and carried furniture.');
