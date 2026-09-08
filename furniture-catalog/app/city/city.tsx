"use client";
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {House} from 'lucide-react';
import type {Home} from './explorer';
type Props={homes:Home[];hover:string|null;onHover:(id:string|null)=>void;onSelect:(h:Home)=>void;zoom:number;reset:number;onReady:()=>void};
const neighborhoods=[['GOLDEN GATE PARK',-8,0],['THE RICHMOND',-9,-5],['PACIFIC HEIGHTS',-1,-9],['DOWNTOWN',8,-10],['THE SUNSET',-9,6],['THE CASTRO',0,5],['THE MISSION',5,6],['POTRERO HILL',10,9]] as const;
function elevation(x:number,z:number){return .42+1.25*Math.exp(-((x+1)**2+(z+8)**2)/17)+1.2*Math.exp(-((x+2)**2+(z-7)**2)/16);}
export default function City(props:Props){
 const host=useRef<HTMLDivElement>(null),pins=useRef<HTMLDivElement>(null),labels=useRef<HTMLDivElement>(null),latest=useRef(props),control=useRef<OrbitControls|null>(null),cameraRef=useRef<THREE.OrthographicCamera|null>(null);
 const [error,setError]=useState(false);latest.current=props;
 useEffect(()=>{const camera=cameraRef.current;if(camera){camera.zoom=props.zoom;camera.updateProjectionMatrix();}},[props.zoom]);
 useEffect(()=>{control.current?.reset();},[props.reset]);
 useEffect(()=>{
  const container=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}catch{setError(true);props.onReady();return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));renderer.setClearColor('#deeeed');renderer.shadowMap.enabled=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.Fog('#deeeed',75,150);
  const camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,220);camera.position.set(33,37,43);cameraRef.current=camera;
  const controls=new OrbitControls(camera,renderer.domElement);control.current=controls;controls.target.set(-1,1.5,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.enableRotate=false;controls.enableZoom=false;controls.screenSpacePanning=true;controls.mouseButtons.LEFT=THREE.MOUSE.PAN;controls.touches.ONE=THREE.TOUCH.PAN;controls.saveState();controls.update();
  scene.add(new THREE.HemisphereLight(0xffffff,0x769e98,2.6));const sun=new THREE.DirectionalLight(0xfff7e8,3.2);sun.position.set(-20,45,20);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-35,right:35,top:35,bottom:-35,far:100});sun.shadow.normalBias=.06;sun.shadow.bias=-.00015;scene.add(sun);
  const mats=new Map<string,THREE.MeshStandardMaterial>();const mat=(color:string)=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return mats.get(color)!;};
  const boxGeom=new THREE.BoxGeometry(1,1,1);
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,parent:THREE.Object3D=scene)=>{const m=new THREE.Mesh(boxGeom,mat(color));m.position.set(x,y+h/2,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(220,220),mat('#c6e3e2'));sea.rotation.x=-Math.PI/2;sea.position.y=-.65;sea.receiveShadow=true;scene.add(sea);
  const coast=[[-12,15],[-12,-7],[-11,-11],[-8,-14],[-4,-14],[0,-13],[4,-13],[8,-11],[11,-7],[12,-3],[11,1],[12,5],[12,15]];
  const landShape=new THREE.Shape();coast.forEach(([x,z],i)=>i?landShape.lineTo(x,-z):landShape.moveTo(x,-z));landShape.closePath();const land=new THREE.Mesh(new THREE.ExtrudeGeometry(landShape,{depth:.95,bevelEnabled:true,bevelSize:.15,bevelThickness:.12,bevelSegments:1,steps:1}),[mat('#edf0e8'),mat('#c9cfc5')]);land.rotation.x=-Math.PI/2;land.position.y=-.6;land.receiveShadow=true;scene.add(land);
  const shore=(x:number,z:number)=>x>-11.5&&x<10.7&&z>-11.5&&z<14.5&&!(z<-8&&x>8)&&!(z<-9&&x<-9);
  const park=(x:number,z:number)=>(x<-3&&z>-.8&&z<1.2)||(x<-6&&z<-7)||(x>-1&&x<1.8&&z>6&&z<10)||(x>2&&x<4&&z>3&&z<5);
  box(-7.4,.37,.15,8.6,.12,2.4,'#8cae87');box(-8.2,.37,-9.3,5,.1,4,'#93b293');box(.1,.4,8,3.5,.6,4,'#93b68e');box(3,.4,4.1,2,.09,2.1,'#9cba90');
  // Repeated city blocks and windows are instanced to keep the miniature light.
  const bodies: {p:number[];s:number[];color:string}[]=[],roofs:typeof bodies=[],windows:typeof bodies=[],greens:typeof bodies=[];
  let seed=19;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let gx=-11;gx<11;gx+=1.45){for(let gz=-11;gz<14;gz+=1.55){
   if(!shore(gx,gz))continue;
   const y=elevation(gx,gz);if(park(gx,gz)){for(let k=0;k<3;k++)greens.push({p:[gx+(random()-.5),y+.35,gz+(random()-.5)],s:[.32,.6,.32],color:random()>.5?'#547b58':'#789665'});continue;}
   box(gx,.36,gz,1.29,Math.max(.08,y-.36),1.38,'#d7dcd4');
   for(let a=0;a<2;a++)for(let b=0;b<2;b++){
    const x=gx+(a-.5)*.57,z=gz+(b-.5)*.64;
    if(props.homes.some(p=>Math.hypot(p.x-x,p.z-z)<.65))continue;
    const downtown=x>5&&z<-5;let h=downtown?.9+random()*3.6:.32+random()*.65;
    const colors=['#f4f3ed','#e9cdbd','#d8e2df','#e5dba6','#d5d3de','#c7dbd5','#e7b9ae'];const color=colors[Math.floor(random()*colors.length)];
    const w=.40+random()*.13,d=.43+random()*.13;
    bodies.push({p:[x,y+h/2,z],s:[w,h,d],color});roofs.push({p:[x,y+h+.035,z],s:[w+.04,.07,d+.04],color:random()>.5?'#c7c8bd':'#e7e3d8'});
    for(let fl=.17;fl<h-.08;fl+=.30){windows.push({p:[x,y+fl,z+d/2+.004],s:[w*.52,.11,.015],color:'#7d969a'});windows.push({p:[x+w/2+.004,y+fl,z],s:[.015,.11,d*.52],color:'#91a8aa'});}
   }
  }}
  const instances=(geo:THREE.BufferGeometry,data:typeof bodies)=>{const mesh=new THREE.InstancedMesh(geo,mat('#ffffff'),data.length),dummy=new THREE.Object3D();data.forEach((v,i)=>{dummy.position.set(...v.p as [number,number,number]);dummy.scale.set(...v.s as [number,number,number]);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(v.color));});mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);};
  instances(boxGeom,bodies);instances(boxGeom,roofs);instances(boxGeom,windows);
  for(let i=0;i<170;i++){const x=-11+random()*22,z=-12+random()*26;if(park(x,z)&&shore(x,z))greens.push({p:[x,elevation(x,z)+.32,z],s:[.32+random()*.18,.45+random()*.25,.34],color:random()>.5?'#4f785b':'#6b9166'});}
  instances(new THREE.IcosahedronGeometry(1,0),greens);
  // Market Street cuts through the otherwise orthogonal street grid.
  const street=new THREE.Mesh(new THREE.BoxGeometry(.28,.02,14),mat('#f9f8ef'));street.position.set(5,.44,-.5);street.rotation.y=.7;scene.add(street);
  // Golden Gate Bridge, at the northwest edge of the peninsula.
  const bridge=new THREE.Group();bridge.position.set(-10,-.15,-15.5);scene.add(bridge);
  box(0,.8,0,.65,.13,9,'#d6674f',bridge);box(0,.95,0,.47,.04,9,'#efcfb7',bridge);
  for(const z of [-2.5,2.5]){for(const x of [-.42,.42])box(x,-.2,z,.14,3.4,.23,'#c54d38',bridge);for(const y of [1.5,2.5])box(0,y,z,.93,.13,.2,'#ce563e',bridge);}
  for(const x of [-.42,.42]){const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,1.05,-4.5),new THREE.Vector3(x,3.15,-2.5),new THREE.Vector3(x,1.45,0),new THREE.Vector3(x,3.15,2.5),new THREE.Vector3(x,1.05,4.5)]);const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,72,.035,5,false),mat('#cf6246'));bridge.add(cable);for(let z=-2.25;z<2.5;z+=.45){const top=1.45+1.7*(Math.abs(z)/2.5)**2;box(x,.94,z,.025,top-.94,.025,'#cf6246',bridge);}}
  box(-10,-.55,-21,4,.5,3,'#8bab8c');
  // Downtown landmarks: Transamerica Pyramid and a stepped tower skyline.
  const pyramid=new THREE.Mesh(new THREE.ConeGeometry(.7,4.4,4),mat('#fff8e9'));pyramid.position.set(7,2.6,-10);pyramid.rotation.y=Math.PI/4;pyramid.castShadow=true;scene.add(pyramid);box(8.9,.5,-6.8,.9,4.5,.9,'#adced0');box(8.9,5,-6.8,.68,.5,.68,'#c0d9d9');
  for(let i=0;i<4;i++)box(11.7,.02,-8+i*1.4,2.2,.18,.5,'#e4e2d4');
  const boats:THREE.Group[]=[];for(const [x,z] of [[16,-12],[18,5],[-18,-6]]){const b=new THREE.Group();b.position.set(x,-.39,z);box(0,0,0,.3,.1,.8,'#fcfbf1',b);box(0,.1,0,.18,.15,.32,'#e8ab73',b);scene.add(b);boats.push(b);}
  const buildings=new Map<string,THREE.Mesh>();for(const h of props.homes){const y=elevation(h.x,h.z),height=h.area==='Financial District'||h.name.startsWith('Spera')?1.8:.7;const m=box(h.x,y,h.z,.68,height,.74,'#de7055');m.material=(m.material as THREE.MeshStandardMaterial).clone();m.userData.home=h;buildings.set(h.id,m);box(h.x,y+height,h.z,.77,.09,.83,'#a75443');box(h.x,y+.2,h.z+.375,.35,.28,.015,'#ffe6c1');}
  const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let start={x:0,y:0},dragged=false;
  const move=(e:PointerEvent)=>{dragged=Math.hypot(e.clientX-start.x,e.clientY-start.y)>6;const rect=container.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects([...buildings.values()]).find(v=>latest.current.homes.some(h=>h.id===v.object.userData.home.id));if(hit){latest.current.onHover(hit.object.userData.home.id);renderer.domElement.style.cursor='pointer';}else{renderer.domElement.style.cursor='grab';}};
  const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY};dragged=false;};const click=()=>{if(dragged)return;ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects([...buildings.values()]).find(v=>latest.current.homes.some(h=>h.id===v.object.userData.home.id));if(hit)latest.current.onSelect(hit.object.userData.home);};
  renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('click',click);
  const resize=()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);const vertical=w<700?Math.max(45,34*h/w):34;camera.left=-vertical*w/h/2;camera.right=vertical*w/h/2;camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(container);resize();
  let frame=0,renderedState='';const vec=new THREE.Vector3();function place(el:HTMLElement,x:number,y:number,z:number){vec.set(x,y,z).project(camera);el.style.left=`${(vec.x*.5+.5)*container.clientWidth}px`;el.style.top=`${(-vec.y*.5+.5)*container.clientHeight}px`;}
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animate=(time:number)=>{frame=requestAnimationFrame(animate);controls.update();const viewState=camera.matrixWorld.elements.join(',')+camera.projectionMatrix.elements.join(',')+latest.current.hover+latest.current.homes.length;if(motion&&renderedState===viewState)return;renderedState=viewState;const placed:{x:number;y:number}[]=[];pins.current?.querySelectorAll<HTMLElement>('[data-id]').forEach(el=>{const h=latest.current.homes.find(h=>h.id===el.dataset.id);if(h){place(el,h.x,elevation(h.x,h.z)+1.9,h.z);const mobile=container.clientWidth<700,gapX=mobile?30:48,gapY=mobile?29:33,baseX=parseFloat(el.style.left),baseY=parseFloat(el.style.top);let x=baseX,y=baseY;const candidates=[];for(let dx=-4;dx<=4;dx++)for(let dy=-4;dy<=4;dy++)candidates.push({x:baseX+dx*gapX,y:baseY+dy*gapY,d:dx*dx+dy*dy});candidates.sort((a,b)=>a.d-b.d);const free=candidates.find(c=>c.x>18&&c.x<container.clientWidth-18&&c.y>180&&!placed.some(p=>Math.abs(p.x-c.x)<gapX&&Math.abs(p.y-c.y)<gapY));if(free){x=free.x;y=free.y;}placed.push({x,y});el.style.left=`${x}px`;el.style.top=`${y}px`; }});labels.current?.querySelectorAll<HTMLElement>('[data-index]').forEach(el=>{const n=neighborhoods[Number(el.dataset.index)];place(el,n[1],.7,n[2]);});buildings.forEach((m,id)=>{const material=m.material as THREE.MeshStandardMaterial;material.emissive.set(latest.current.hover===id?'#7d3017':'#000000');material.emissiveIntensity=.4;});if(!motion)boats.forEach((b,i)=>{b.position.y=-.38+Math.sin(time*.001+i)*.025;b.position.z+=Math.sin(time*.00008+i)*.0008;});renderer.render(scene,camera);};animate(0);props.onReady();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();scene.traverse(obj=>{if(obj instanceof THREE.Mesh)obj.geometry.dispose();});mats.forEach(m=>m.dispose());renderer.domElement.remove();};
 },[]);
 return <div className="city-canvas" ref={host} aria-label="Isometric map of San Francisco">
  {error&&<div className="map-error">The 3D view is unavailable. Choose a home from Browse homes.</div>}
  <div className="neighborhood-labels" ref={labels}>{neighborhoods.map((n,i)=><span key={n[0]} data-index={i}>{n[0]}</span>)}</div>
  <div className="map-pins" ref={pins}>{props.homes.map(h=><button key={h.id} data-id={h.id} className={'home-pin '+(props.hover===h.id?'active':'')} onMouseEnter={()=>props.onHover(h.id)} onMouseLeave={()=>props.onHover(null)} onFocus={()=>props.onHover(h.id)} onBlur={()=>props.onHover(null)} onClick={()=>props.onSelect(h)} aria-label={h.name+' — '+h.area}><House size={13}/><span>{h.id}</span></button>)}</div>
 </div>;
}
