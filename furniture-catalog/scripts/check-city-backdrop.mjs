import assert from 'node:assert/strict';
import * as T from 'three';
import {createCityBackdrop} from '../app/decorate/city-backdrop.ts';
const backdrop=createCityBackdrop(),camera=new T.PerspectiveCamera(65,1.5,.05,80);
camera.rotation.set(.1,1.2,0);backdrop.setTexture(new T.Texture());backdrop.update(camera,0);
const orientation=backdrop.material.uniforms.orientation.value.clone(),projection=backdrop.material.uniforms.inverseProjection.value.clone();
let previous=0;
for(const p of [0,.1,.3,.5,.8,1]){
 backdrop.update(camera,p);const fade=backdrop.material.uniforms.fade.value;assert(fade>=previous);previous=fade;
 assert(backdrop.material.uniforms.orientation.value.equals(orientation));assert(backdrop.material.uniforms.inverseProjection.value.equals(projection));
}
assert.equal(previous,1);backdrop.update(camera,0);assert.equal(backdrop.material.uniforms.fade.value,0);
camera.position.set(20,15,30);backdrop.update(camera,.5);assert(backdrop.material.uniforms.orientation.value.equals(orientation),'translation cannot move the panorama');
camera.rotation.y+=.2;backdrop.update(camera,1);assert(!backdrop.material.uniforms.orientation.value.equals(orientation),'mouse look still turns the city view');
backdrop.dispose();console.log('PASS: backdrop fades without camera flight or zoom, and follows FPS look.');
