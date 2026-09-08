import * as T from 'three';
import {lightingAt,lightingPresets,type LightingChoice,type LightingMode} from './lighting-presets.ts';

/** One fixed, house-sized shadow volume: orbiting the camera cannot move its texel grid. */
export function configureSunShadow(sun:T.DirectionalLight,footprint:number[][],height:number,maxTextureSize:number){
 const bounds=new T.Box3();
 for(const [x,z] of footprint){bounds.expandByPoint(new T.Vector3(x,-.3,z));bounds.expandByPoint(new T.Vector3(x,height+.3,z));}
 const center=bounds.getCenter(new T.Vector3()),radius=bounds.getSize(new T.Vector3()).length()/2+.3;
 sun.target.position.copy(center);
 const size=Math.min(4096,maxTextureSize);sun.shadow.mapSize.set(size,size);
 Object.assign(sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,near:radius,far:radius*3});
 sun.shadow.camera.updateProjectionMatrix();
 sun.shadow.bias=-.0002;
 // Scale the surface offset to world-space texels to avoid self-shadow striping.
 sun.shadow.normalBias=Math.max(.015,2*radius/size*2);
 sun.shadow.radius=2.5;sun.castShadow=true;
 return {center,radius};
}

export function createRoomLighting(scene:T.Scene,renderer:T.WebGLRenderer,footprint:number[][],height:number,architecture:T.Group,backdrop:{setLighting:(base:T.Color,tint:T.Color,brightness:number)=>void},initial:LightingChoice='auto'){
 const sky=new T.HemisphereLight(),sun=new T.DirectionalLight();
 sky.name='Diffuse sky and floor bounce';sun.name='Time-of-day sun';
 const {center,radius}=configureSunShadow(sun,footprint,height,renderer.capabilities.maxTextureSize);
 scene.add(sky,sun,sun.target);
 const lamps:T.SpotLight[]=[],diffusers:T.MeshStandardMaterial[]=[];
 architecture.traverse(object=>{
  if(object instanceof T.SpotLight)lamps.push(object);
  if(object instanceof T.Mesh&&object.name==='Diffuser')diffusers.push(object.material as T.MeshStandardMaterial);
 });
 let choice=initial,mode:LightingMode=choice==='auto'?lightingAt():choice;
 let elapsed=0,mix=1;
 const direction=new T.Vector3(),base=new T.Color(),tint=new T.Color(),targetColor=new T.Color();
 let lampLevel=0,brightness=0;
 function apply(dt:number,instant=false){
  const p=lightingPresets[mode],a=instant?1:1-Math.exp(-dt*5);
  const color=(value:T.Color,target:string)=>value.lerp(targetColor.set(target),a);
  color(sky.color,p.sky);color(sky.groundColor,p.ground);sky.intensity=T.MathUtils.lerp(sky.intensity,p.fill,a);
  color(sun.color,p.sun);sun.intensity=T.MathUtils.lerp(sun.intensity,p.power,a);
  direction.set(...p.direction as [number,number,number]).normalize().multiplyScalar(radius*2).add(center);
  sun.position.lerp(direction,a);
  sun.position.sub(center).normalize().multiplyScalar(radius*2).add(center);
  scene.environmentIntensity=T.MathUtils.lerp(scene.environmentIntensity,p.environment,a);
  renderer.toneMappingExposure=T.MathUtils.lerp(renderer.toneMappingExposure,p.exposure,a);
  lampLevel=T.MathUtils.lerp(lampLevel,p.lamps,a);
  for(const lamp of lamps){lamp.intensity=lampLevel*5;lamp.color.set('#ffe4be');}
  for(const material of diffusers)material.emissiveIntensity=.12+lampLevel*1.4;
  color(base,p.background);color(tint,p.city);brightness=T.MathUtils.lerp(brightness,p.cityBrightness,a);
  backdrop.setLighting(base,tint,brightness);
 }
 apply(0,true);
 return {
  get mode(){return mode;},
  get lampLevel(){return lampLevel;},
  setMode(next:LightingChoice,instant=false){choice=next;mode=next==='auto'?lightingAt():next;mix=0;if(instant){apply(0,true);mix=1;}},
  update(dt:number,reducedMotion=false){
   elapsed+=dt;
   if(choice==='auto'&&elapsed>=30){elapsed=0;const next=lightingAt();if(next!==mode){mode=next;mix=0;}}
   if(mix===1)return false;
   mix=Math.min(1,mix+dt/1.4);apply(dt,reducedMotion||mix===1);if(reducedMotion)mix=1;return true;
  },
  dispose(){sun.shadow.dispose();lamps.forEach(lamp=>lamp.shadow.dispose());scene.remove(sky,sun,sun.target);},
 };
}
