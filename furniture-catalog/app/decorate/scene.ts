import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import plan from './plan.json';
import {buildArchitecture,type ArchitecturePlan} from './architecture';
import items from './items.json';
import {createFurnitureCarry,removePlacedFurniture} from './furniture-carry';
import {CARRY_REACH,clampCarryReach,nearbyCarryPosition,createDragAnchor,dragCarryPosition} from './carry-position';
import {createPlayer,stepPlayer,PLAYER,overlaps} from './player';
import {createCursorLook} from './cursor-look';
import {lookDelta,type LookDirection,type ObjectHint} from './look-input';
import {pickFurniture,isVisible} from './scene-picking';
import {interactionAction,rightClickAction,rotationDelta,type InteractionAction} from './interaction-shortcuts';
import {createAssembly,createViewTransition} from './scene-motion';
type Callbacks={status:(s:string)=>void;count:(n:number)=>void;active:(s:string)=>void;playing:(v:boolean)=>void;hint:(hint:ObjectHint)=>void;motion:(phase:'assembly'|'camera'|null)=>void;inventory:()=>void;details:(id:string,placed:boolean)=>void;placement:(valid:boolean)=>void};
export async function mountRoom(host:HTMLDivElement,ui:Callbacks){
 const player=createPlayer(),cursorLook=createCursorLook();let playing=false,fallback=false,jumpQueued=false;let lockTimer:ReturnType<typeof setTimeout>|undefined;
 const scene=new T.Scene();scene.background=new T.Color('#e5ece9');const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=T.SRGBColorSpace;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','3D apartment. WASD to move, arrow keys to look, E inventory, left-click move or place, hold Q or R to rotate, right-click details, Delete or Backspace to remove furniture.');host.appendChild(renderer.domElement);
 const iso=new T.OrthographicCamera(-8,8,8,-8,.1,100);iso.position.set(13,15,18);const fps=new T.PerspectiveCamera(65,1,.05,80);fps.position.set(5.7,PLAYER.eye,7.1);fps.rotation.order='YXZ';fps.rotation.y=Math.PI/2;let camera:T.Camera=iso;const controls=new OrbitControls(iso,renderer.domElement);controls.target.set(3.1,0,4.3);controls.maxPolarAngle=Math.PI/2.5;controls.minZoom=.6;controls.maxZoom=3;controls.update();
 const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
 const viewTransition=createViewTransition(iso,fps,controls.target);let targetMode:'iso'|'fps'='iso';
 const environmentRoom=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);const environmentMap=pmrem.fromScene(environmentRoom,.04);scene.environment=environmentMap.texture;scene.environmentIntensity=.08;environmentRoom.dispose();pmrem.dispose();
 // Restrained sky fill preserves material colors and shaded room depth.
 scene.add(new T.HemisphereLight('#e4edff','#aaa08e',.8));
 const sun=new T.DirectionalLight('#fff1da',1.8);sun.position.set(-5,10,6);sun.target.position.set(3.1,0,4.3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-7.5,right:7.5,top:7.5,bottom:-7.5,near:.5,far:30});sun.shadow.bias=-.0001;sun.shadow.normalBias=.015;scene.add(sun,sun.target);
 const blockers:T.Mesh[]=[];let mouseOverCanvas=false,aimWithKeys=false,lastHint='';
 const floors:T.Mesh[]=[],floorPieces:T.Group[]=[],fixed:T.Box3[]=[],furniture:T.Group[]=[];const templates=new Map<string,T.Group>();let current:T.Group|null=null,disposed=false,overlayOpen=false;
 const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.85});
 function box(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 for(const [x,z,w,d] of plan.floors){const panel=new T.Group();panel.name='Floor section';scene.add(panel);floorPieces.push(panel);floors.push(box(panel,x+w/2,-.13,z+d/2,w,.25,d,z===3.8?'#c5d4cf':'#d3b690'));for(let p=x+.18;p<x+w;p+=.22){const seam=box(panel,p,.002,z+d/2,.006,.003,d,'#bd9e79');seam.castShadow=false;}}
 const architecture=buildArchitecture(plan as ArchitecturePlan);scene.add(architecture.root);fixed.push(...architecture.colliders);architecture.cutaway(true);
 architecture.root.traverse(o=>{if(o instanceof T.Mesh)blockers.push(o);});
 const loader=new GLTFLoader();
 const results=await Promise.allSettled(items.map(async item=>{const gltf=await loader.loadAsync(item.files.glb);const model=gltf.scene;model.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(model);const size=bounds.getSize(new T.Vector3());model.scale.set(item.dimensions_m.width/size.x,item.dimensions_m.height/size.y,item.dimensions_m.depth/size.z);model.updateMatrixWorld(true);bounds=new T.Box3().setFromObject(model);const center=bounds.getCenter(new T.Vector3());model.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));const group=new T.Group();group.add(model);group.userData.id=item.id;group.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});templates.set(item.id,group);}));
 if(disposed)return {dispose(){}} as any;
 function select(g:T.Group|null){current=g;}
 function add(id:string,x:number,z:number,r:number){const template=templates.get(id);if(!template)return;const g=template.clone(true);g.position.set(x,.01,z);g.rotation.y=r;scene.add(g);furniture.push(g);ui.count(furniture.length);return g;}
 plan.furniture.forEach(f=>add(f.id,f.x,f.z,f.r));
 const carry=createFurnitureCarry(scene,templates,add);
 const assembly=createAssembly([
  ...floorPieces.map(object=>({object,layer:'floor' as const})),
  ...architecture.root.children.map(object=>({object,layer:'structure' as const})),
  ...furniture.map(object=>({object,layer:'furniture' as const})),
 ],new T.Vector3(3.35,0,4.225),motionPreference.matches);
 controls.enabled=!assembly.active;ui.motion(assembly.active?'assembly':null);
 function inputBlocked(){return assembly.active||viewTransition.active||overlayOpen;}
 const failures=results.filter(r=>r.status==='rejected').length;ui.status(failures?`${failures} catalog models could not load. Other pieces are ready.`:'');
 const outline=new T.BoxHelper(new T.Object3D(),0x3b8a62);outline.visible=false;scene.add(outline);const ray=new T.Raycaster(),pointer=new T.Vector2(),keys=new Set<string>(),lookKeys=new Set<string>();let valid=false;
 function inside(x:number,z:number,margin=0){return plan.floors.some(([a,b,w,d])=>x>=a+margin&&x<=a+w-margin&&z>=b+margin&&z<=b+d-margin);}
 function bounds(g:T.Group){g.updateMatrixWorld(true);return new T.Box3().setFromObject(g);}
 function legal(g:T.Group){const b=bounds(g);if(![[b.min.x,b.min.z],[b.max.x,b.min.z],[b.min.x,b.max.z],[b.max.x,b.max.z]].every(([x,z])=>inside(x,z)))return false;const test=b.clone();test.min.y+=.05;test.expandByScalar(-.025);if(fixed.some(v=>v.intersectsBox(test)))return false;if(camera===fps&&player.y<b.max.y&&player.y+PLAYER.height>b.min.y&&overlaps(player.x,player.z,b))return false;return !furniture.some(v=>v!==g&&v!==carry.source&&v.userData.id!=='rug'&&g.userData.id!=='rug'&&bounds(v).intersectsBox(test));}
 function centered(){return camera===fps&&(document.pointerLockElement===renderer.domElement||aimWithKeys);}
 function cast(){ray.setFromCamera(centered()?new T.Vector2():pointer,camera);}
 function pick(){if(inputBlocked()||(!centered()&&!mouseOverCanvas))return null;cast();return pickFurniture(ray,furniture,blockers);}
 function showHint(hint:ObjectHint){const signature=JSON.stringify(hint);if(signature!==lastHint){lastHint=signature;ui.hint(hint);}}
 function updateHint(){
  const target=carry.preview;if(overlayOpen||!target||!target.visible){showHint(null);return;}
  let x=(pointer.x+1)*host.clientWidth/2,y=(1-pointer.y)*host.clientHeight/2;
  if(target){const anchor=bounds(target).getCenter(new T.Vector3()).project(camera);if(anchor.z>1||anchor.z< -1){showHint(null);return;}x=(anchor.x+1)*host.clientWidth/2;y=(1-anchor.y)*host.clientHeight/2;}
  
  showHint({id:target.userData.id,name:items.find(i=>i.id===target.userData.id)!.name,x:Math.round(T.MathUtils.clamp(x+24>host.clientWidth-292?x-304:x+24,12,Math.max(12,host.clientWidth-292))),y:Math.round(T.MathUtils.clamp(y-50,12,Math.max(12,host.clientHeight-190)))});
 }

 const pickupPosition=new T.Vector3(),carryPoint=new T.Vector3(),carryForward=new T.Vector3(),sightDirection=new T.Vector3(),sightRay=new T.Raycaster();let dragAnchor:ReturnType<typeof createDragAnchor>|null=null,carryReach=CARRY_REACH.default,placementBlocked=false,lastValid:boolean|undefined;
 function tintGhost(){const ghost=carry.preview;if(!ghost)return;valid=ghost.visible&&!placementBlocked&&legal(ghost);if(valid!==lastValid){lastValid=valid;ui.placement(valid);}ghost.traverse(o=>{if(o instanceof T.Mesh){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.color.set(valid?'#6dab86':'#d97768');});}});}
 function ghostUpdate(){const ghost=carry.preview;if(!ghost||inputBlocked())return;if(centered()||mouseOverCanvas){cast();placementBlocked=false;
  if(camera===fps){
   carryForward.set(-Math.sin(fps.rotation.y),0,-Math.cos(fps.rotation.y));
   ghost.position.copy(nearbyCarryPosition(ray.ray,fps.position,carryForward,carryReach,carryPoint));ghost.visible=true;
   const height=items.find(item=>item.id===ghost.userData.id)?.dimensions_m.height??.8;
   sightDirection.copy(ghost.position).sub(fps.position);sightDirection.y+=height/2;
   const distance=sightDirection.length();sightRay.set(fps.position,sightDirection.normalize());
   const obstruction=sightRay.intersectObjects(blockers.filter(isVisible),false)[0];
   placementBlocked=!!obstruction&&obstruction.distance<distance-.02;
  }else if(dragAnchor){const point=dragCarryPosition(ray.ray,dragAnchor,carryPoint);ghost.visible=!!point;if(point)ghost.position.copy(point);}
 }tintGhost();}
 function syncControls(){controls.enabled=targetMode==='iso'&&!inputBlocked()&&!carry.preview;}
 function cancel(restorePlayer=true){const restored=carry.source;carry.cancel();if(restorePlayer&&restored&&camera===fps){const b=bounds(restored);if(player.y<b.max.y&&player.y+PLAYER.height>b.min.y&&overlaps(player.x,player.z,b)){player.x=pickupPosition.x;player.y=pickupPosition.y;player.z=pickupPosition.z;player.vx=player.vz=player.vy=0;fps.position.set(player.x,player.y+PLAYER.eye,player.z);}}dragAnchor=null;placementBlocked=false;valid=false;lastValid=undefined;keys.delete('q');keys.delete('r');ui.active('');showHint(null);syncControls();}
 function choose(id:string,object:T.Group|null=null){if(inputBlocked())return;cancel();cast();const hit=object?ray.intersectObject(object,true)[0]:null;
  dragAnchor=createDragAnchor(ray.ray,object?.position,hit?.point.y);
  carryReach=clampCarryReach(object?Math.hypot(object.position.x-player.x,object.position.z-player.z):CARRY_REACH.default);
  if(!carry.begin(id,object)){ui.status('This model is unavailable. Choose another piece.');return;}
  if(object)pickupPosition.set(player.x,player.y,player.z);
  ui.active(id);select(null);syncControls();ghostUpdate();tintGhost();updateHint();renderer.domElement.focus();ui.status('');
 }
 function place(){tintGhost();if(!carry.preview||!valid){ui.status('Choose a clear floor area for this piece.');return;}const moving=!!carry.source;carry.place(valid);cancel();select(null);ui.status(moving?'Moved':'Placed');}
 function remove(){if(assembly.active||viewTransition.active)return;const target=carry.source??current??(carry.preview?null:pick());const hadPreview=!!carry.preview;
  cancel(false);select(null);
  if(removePlacedFurniture(scene,furniture,target)){ui.count(furniture.length);ui.status('Removed from room');}
  else if(hadPreview)ui.status('Placement canceled');
 }
 function rotate(direction:'q'|'r',pressed:boolean){if(!carry.preview||inputBlocked())return;if(pressed)keys.add(direction);else keys.delete(direction);}
 function openInventory(){if(inputBlocked())return;cancel();select(null);setOverlay(true);ui.inventory();}
 function details(){if(inputBlocked())return;const target=carry.source??(carry.preview?null:pick());const id=carry.preview?.userData.id??target?.userData.id;if(!id)return;select(target);setOverlay(true);ui.details(id,!!target);}
 function setOverlay(open:boolean){overlayOpen=open;pause();if(open){if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();showHint(null);}syncControls();if(!open){select(null);renderer.domElement.focus();if(targetMode==='fps')walk();}}
 function completeView(){camera=viewTransition.camera;syncControls();architecture.cutaway(targetMode==='iso');ui.motion(null);if(targetMode==='fps'){if(document.pointerLockElement===renderer.domElement)lock();else cursorMode();}}
 function mode(m:string){if(assembly.active||m===targetMode)return;targetMode=m==='fps'?'fps':'iso';cancel();select(null);showHint(null);document.exitPointerLock?.();pause();controls.enabled=false;viewTransition.begin(targetMode,performance.now(),motionPreference.matches);camera=viewTransition.camera;ui.status('');if(targetMode==='fps')walk();if(viewTransition.active)ui.motion('camera');else completeView();}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h);iso.left=-7*w/h;iso.right=7*w/h;iso.top=7;iso.bottom=-7;iso.updateProjectionMatrix();fps.aspect=w/h;fps.updateProjectionMatrix();viewTransition.resize(w/h);}const observer=new ResizeObserver(resize);observer.observe(host);resize();
 let downX=0,downY=0;
 function pause(){clearTimeout(lockTimer);keys.clear();lookKeys.clear();jumpQueued=false;player.vx=0;player.vz=0;playing=false;cursorLook.reset();ui.playing(false);}
 function cursorMode(){
  if(disposed||overlayOpen||targetMode!=='fps')return;clearTimeout(lockTimer);fallback=true;playing=true;cursorLook.reset();renderer.domElement.focus();ui.playing(true);ui.status('');
 }
 function walk(){
  if(assembly.active||overlayOpen||targetMode!=='fps')return;renderer.domElement.tabIndex=0;renderer.domElement.focus();
  if(fallback){cursorMode();return;}
  // Some embedded browsers emit pointerlockerror instead of rejecting a promise.
  lockTimer=setTimeout(()=>{if(document.pointerLockElement!==renderer.domElement)cursorMode();},400);
  try{if(!renderer.domElement.requestPointerLock){cursorMode();return;}renderer.domElement.requestPointerLock()?.catch(cursorMode);}catch{cursorMode();}
 }
 function down(e:PointerEvent){downX=e.clientX;downY=e.clientY;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);mouseOverCanvas=true;renderer.domElement.tabIndex=0;renderer.domElement.focus();}
 function move(e:PointerEvent){
  mouseOverCanvas=e.target===renderer.domElement;if(mouseOverCanvas)aimWithKeys=false;const r=host.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
  if(inputBlocked()||camera!==fps||!playing)return;
  let dx=0,dy=0;
  if(document.pointerLockElement===renderer.domElement){dx=e.movementX;dy=e.movementY;}
  else if(fallback&&e.target===renderer.domElement){({dx,dy}=cursorLook.move(e.clientX,e.clientY,r.left,r.width));}
  else {cursorLook.reset();return;}
  fps.rotation.y-=dx*.003;fps.rotation.x=T.MathUtils.clamp(fps.rotation.x-dy*.003,-1.45,1.45);
 }
 function leave(){mouseOverCanvas=false;cursorLook.reset();}
 function click(e:MouseEvent){if(inputBlocked()||e.button!==0)return;if(Math.hypot(e.clientX-downX,e.clientY-downY)>5&&document.pointerLockElement!==renderer.domElement)return;if(carry.preview){ghostUpdate();place();return;}const target=pick();if(target)choose(target.userData.id,target);}
 function look(direction:LookDirection,pressed:boolean){if(inputBlocked()||camera!==fps)return;cursorLook.reset();aimWithKeys=true;if(pressed){renderer.domElement.tabIndex=0;renderer.domElement.focus();lookKeys.add('arrow'+direction);}else lookKeys.delete('arrow'+direction);}
 function lookStep(direction:LookDirection){if(inputBlocked()||camera!==fps)return;aimWithKeys=true;cursorLook.reset();const delta=lookDelta(new Set(['arrow'+direction]),.14);fps.rotation.y+=delta.yaw;fps.rotation.x=T.MathUtils.clamp(fps.rotation.x+delta.pitch,-1.45,1.45);updateHint();}
 function runAction(action:InteractionAction){if(action==='inventory')openInventory();if(action==='details')details();if(action==='remove')remove();if(action==='place')place();if(action==='cancel')cancel();if(action==='dismiss'){select(null);showHint(null);}}
 function context(e:MouseEvent){e.preventDefault();if(inputBlocked())return;runAction(rightClickAction(!!carry.preview,!!pick()));}
 function key(e:KeyboardEvent){if(inputBlocked())return;const target=e.target as HTMLElement;if(target?.closest('dialog,input,textarea,select,[contenteditable="true"]'))return;const k=e.key.toLowerCase();
  if(k==='e'){e.preventDefault();if(!e.repeat)openInventory();return;}
  const inPopover=!!target?.closest('.placement-popover');const focused=document.activeElement===renderer.domElement;
  if(focused||inPopover){if(carry.preview&&(k==='q'||k==='r')){e.preventDefault();keys.add(k);return;}const action=interactionAction(k,!!carry.preview,!!current||!!pick());if(action){e.preventDefault();if(!e.repeat)runAction(action);return;}}
  if(camera===fps){if(!focused)return;if(k.startsWith('arrow')){e.preventDefault();keys.add(k);aimWithKeys=true;cursorLook.reset();return;}if(['w','a','s','d',' ','shift'].includes(k)){e.preventDefault();keys.add(k);}if(k===' '&&!e.repeat)jumpQueued=true;if(k==='b'||k==='escape'){e.preventDefault();document.exitPointerLock?.();pause();cancel();select(null);showHint(null);return;}}
  else if(k==='shift'&&focused)keys.add(k);
 }
 function up(e:KeyboardEvent){keys.delete(e.key.toLowerCase());}function blur(){pause();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock?.();ui.playing(false);}function lock(){const captured=document.pointerLockElement===renderer.domElement;pause();playing=captured;ui.playing(captured);if(captured){fallback=false;renderer.domElement.focus();ui.status('');}}
 renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('click',click);renderer.domElement.addEventListener('contextmenu',context);renderer.domElement.addEventListener('blur',blur);window.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerleave',leave);document.addEventListener('pointerlockerror',cursorMode);window.addEventListener('keydown',key);window.addEventListener('keyup',up);window.addEventListener('blur',blur);document.addEventListener('pointerlockchange',lock);
 let last=performance.now(),lastHover=0,frame=0,assemblyStart:number|undefined;function tick(now:number){if(disposed)return;const dt=Math.min((now-last)/1000,.05);last=now;
 if(assembly.active){assemblyStart??=now;if(motionPreference.matches)assembly.finish();else assembly.update((now-assemblyStart)/1000);if(!assembly.active){syncControls();ui.motion(null);}}
 if(viewTransition.active){if(motionPreference.matches)viewTransition.begin(targetMode,now,true);else viewTransition.update(now);camera=viewTransition.camera;architecture.cutaway(1-viewTransition.perspective);if(!viewTransition.active)completeView();}
 if(camera===fps&&!inputBlocked()){const looking=lookDelta(new Set([...keys,...lookKeys]),dt);fps.rotation.y+=looking.yaw;fps.rotation.x=T.MathUtils.clamp(fps.rotation.x+looking.pitch,-1.45,1.45);if(playing&&fallback)fps.rotation.y-=cursorLook.turn(dt);const obstacles=[...fixed,...furniture.filter(g=>g!==carry.source&&g.userData.id!=='rug').map(bounds)];
  stepPlayer(player,{x:Number(keys.has('d'))-Number(keys.has('a')),z:Number(keys.has('s'))-Number(keys.has('w')),yaw:fps.rotation.y,run:keys.has('shift'),jump:jumpQueued},dt,obstacles,plan.floors,plan.height);jumpQueued=false;fps.position.set(player.x,player.y+PLAYER.eye,player.z);
 }if(carry.preview&&!inputBlocked())carry.preview.rotation.y+=rotationDelta(keys,dt);ghostUpdate();if(now-lastHover>70){updateHint();lastHover=now;}const hovered=pick(),highlighted=carry.preview?null:hovered;renderer.domElement.style.cursor=carry.preview?'grabbing':hovered?'grab':'default';outline.visible=!!highlighted;if(highlighted)outline.setFromObject(highlighted);renderer.render(scene,camera);frame=requestAnimationFrame(tick);}frame=requestAnimationFrame(tick);
 return {mode,choose,cancel,rotate,remove,place,walk,look,lookStep,setOverlay,openInventory,details,deselect(){select(null);showHint(null);},dispose(){disposed=true;carry.cancel();cancelAnimationFrame(frame);observer.disconnect();controls.dispose();document.exitPointerLock?.();window.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerleave',leave);document.removeEventListener('pointerlockerror',cursorMode);clearTimeout(lockTimer);renderer.domElement.removeEventListener('blur',blur);window.removeEventListener('keydown',key);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('pointerlockchange',lock);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('click',click);renderer.domElement.removeEventListener('contextmenu',context);scene.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});environmentMap.dispose();sun.shadow.dispose();renderer.dispose();renderer.domElement.remove();}};
}
