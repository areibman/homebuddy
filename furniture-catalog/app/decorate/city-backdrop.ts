import * as T from 'three';

/** Screen-space panorama: only the walking camera controls its view, never the orbit transition. */
export function createCityBackdrop(){
 const scene=new T.Scene(),camera=new T.Camera();
 const material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{
  panorama:{value:null},fade:{value:0},base:{value:new T.Color('#e5ece9')},cityTint:{value:new T.Color('#ffffff')},cityBrightness:{value:.85},
  inverseProjection:{value:new T.Matrix4()},orientation:{value:new T.Matrix3()},
 },vertexShader:`varying vec2 uvScreen;
 void main(){uvScreen=uv;gl_Position=vec4(position.xy,1.0,1.0);}`,
 fragmentShader:`uniform sampler2D panorama;uniform float fade;uniform vec3 base;uniform vec3 cityTint;uniform float cityBrightness;
 uniform mat4 inverseProjection;uniform mat3 orientation;varying vec2 uvScreen;
 vec3 sampleCity(vec2 uv,vec2 dx,vec2 dy){return textureGrad(panorama,uv,dx,dy).rgb;}
 void main(){
  vec3 color=base;
  if(fade>0.0){
   vec4 view=inverseProjection*vec4(uvScreen*2.0-1.0,1.0,1.0);
   vec3 direction=normalize(orientation*view.xyz);
   vec2 uv=vec2(atan(direction.z,direction.x)/6.28318530718+0.5,asin(clamp(direction.y,-1.0,1.0))/3.14159265359+0.5);
   // atan wraps at the meridian. Correct its derivatives so mip selection
   // does not smear an entire panorama into a vertical stripe.
   vec2 dx=dFdx(uv),dy=dFdy(uv);
   dx.x=fract(dx.x+0.5)-0.5;dy.x=fract(dy.x+0.5)-0.5;
   vec3 city=sampleCity(uv,dx,dy);
   // Feather the imperfect source edges to the same value on both sides.
   float edge=min(uv.x,1.0-uv.x);
   float blend=0.5*(1.0-smoothstep(0.0,0.045,edge));
   vec3 opposite=sampleCity(vec2(1.0-uv.x,uv.y),vec2(-dx.x,dx.y),vec2(-dy.x,dy.y));
   city=mix(city,opposite,blend);
   color=mix(base,city*cityTint*cityBrightness,fade);
  }
  gl_FragColor=vec4(color,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const quad=new T.Mesh(new T.PlaneGeometry(2,2),material);quad.frustumCulled=false;scene.add(quad);
 return {scene,camera,material,setTexture(texture:T.Texture){texture.wrapS=T.RepeatWrapping;texture.wrapT=T.ClampToEdgeWrapping;texture.needsUpdate=true;material.uniforms.panorama.value=texture;},
  setLighting(base:T.Color,tint:T.Color,brightness:number){material.uniforms.base.value.copy(base);material.uniforms.cityTint.value.copy(tint);material.uniforms.cityBrightness.value=brightness;},
  update(walkCamera:T.PerspectiveCamera,perspective:number){
   walkCamera.updateMatrixWorld(true);
   material.uniforms.inverseProjection.value.copy(walkCamera.projectionMatrixInverse);
   material.uniforms.orientation.value.setFromMatrix4(walkCamera.matrixWorld);
   material.uniforms.fade.value=material.uniforms.panorama.value?T.MathUtils.smoothstep(perspective,0,1):0;
  },dispose(){quad.geometry.dispose();material.dispose();}};
}
