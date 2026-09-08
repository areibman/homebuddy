import * as T from 'three';
import {createIndoorLightField,type IndoorLightPlan,type LightBarrier} from './indoor-light-field.ts';

type DoorLightSource={pivot:T.Group;width:number};
export function createIndoorLighting(plan:IndoorLightPlan,doors:DoorLightSource[]){
 const field=createIndoorLightField(plan);
 const texture=new T.DataTexture(field.data,field.width,field.depth,T.RGBAFormat);
 texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
 const uniforms={indoorLightField:{value:texture},indoorLightBounds:{value:new T.Vector4(field.minX-field.step/2,field.minZ-field.step/2,field.width*field.step,field.depth*field.step)},indoorLampLevel:{value:0},indoorEnclosure:{value:0}};
 const installed=new WeakSet<T.Material>();
 let lastSignature='',elapsed=1;
 function update(dt:number,lamps:number,perspective:number,force=false){
  uniforms.indoorLampLevel.value=lamps;
  // The overhead view deliberately removes the roof. Full enclosure applies in Walk.
  uniforms.indoorEnclosure.value=T.MathUtils.smoothstep(perspective,.5,1);
  elapsed+=dt;
  const signature=doors.map(door=>door.pivot.rotation.y.toFixed(3)).join(',');
  if(!force&&(signature===lastSignature||elapsed<.1))return;
  const barriers:LightBarrier[]=doors.map(({pivot,width})=>{
   pivot.updateWorldMatrix(true,false);
   const a=pivot.localToWorld(new T.Vector3(-.025,0,0)),b=pivot.localToWorld(new T.Vector3(width+.025,0,0));
   return {line:[a.x,a.z,b.x,b.z],halfWidth:.055};
  });
  field.rebuild(barriers);texture.needsUpdate=true;lastSignature=signature;elapsed=0;
 }
 function apply(root:T.Object3D){
  root.traverse(object=>{
   if(!(object instanceof T.Mesh))return;
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof T.MeshStandardMaterial)||installed.has(material))continue;
    installed.add(material);
    material.onBeforeCompile=shader=>{
     Object.assign(shader.uniforms,uniforms);
     shader.vertexShader='varying vec3 vIndoorPosition;\n'+shader.vertexShader;
     shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvIndoorPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
     shader.fragmentShader=`uniform sampler2D indoorLightField;
uniform vec4 indoorLightBounds;
uniform float indoorLampLevel;
uniform float indoorEnclosure;
varying vec3 vIndoorPosition;\n`+shader.fragmentShader;
     shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`
// Sample just inside the surface's room, rather than inside its wall thickness.
vec3 indoorNormal=inverseTransformDirection(geometryNormal,viewMatrix);
vec2 indoorUV=(vIndoorPosition.xz+indoorNormal.xz*0.13-indoorLightBounds.xy)/indoorLightBounds.zw;
vec2 indoorAccess=texture2D(indoorLightField,clamp(indoorUV,0.0,1.0)).rg;
float indoorSky=mix(1.0,indoorAccess.r,indoorEnclosure);
float indoorBounce=indoorAccess.g*indoorLampLevel*0.32*indoorEnclosure;
#if defined(RE_IndirectDiffuse)
 irradiance=irradiance*indoorSky+vec3(1.0,0.78,0.52)*indoorBounce;
 iblIrradiance*=min(1.0,indoorSky+indoorBounce);
#endif
#if defined(RE_IndirectSpecular)
 radiance*=min(1.0,indoorSky+indoorBounce);
 clearcoatRadiance*=min(1.0,indoorSky+indoorBounce);
#endif
#include <lights_fragment_end>`);
    };
    material.customProgramCacheKey=()=> 'homebuddy-enclosed-indirect-v1';
    material.needsUpdate=true;
   }
  });
 }
 update(0,0,0,true);
 return {field,uniforms,apply,update,dispose(){texture.dispose();}};
}
