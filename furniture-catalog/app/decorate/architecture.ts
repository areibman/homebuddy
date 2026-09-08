import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createHingedDoor} from './hinged-door.ts';

export type Fixture = {type:'closet-interior'|'microwave'|'shelving'|'closet'|'walk-in-closet'|'laundry'|'toilet'|'vanity'|'bathtub'|'shower'|'stove'|'dishwasher'|'sink'|'cabinet'|'refrigerator';x:number;z:number;width:number;depth:number;height:number;rotation?:number;upper?:boolean;cooktop?:string;island?:boolean;y?:number;freezer?:string};
export type Opening = {wall:number;start:number;width:number;sill:number;height:number};
export type Door = {x:number;z:number;width:number;rotation:number;swing:number;label?:string;leaves?:2;initialOpen?:boolean;keepFullHeight?:boolean;glazed?:boolean};
export type ArchitecturePlan = {height:number;closetVolumes?:{name:string;rect:number[];side:string;start:number;opening:number}[];walls:number[][];fixtures:Fixture[];windows:Opening[];doors:Door[];appearance?:{wood?:string;stone?:string;wall?:string;refrigerator?:string;trim?:boolean};columns?:number[][];lights?:number[][];surfacePanels?:{line:number[];height:number;bottom:number;finish:string}[]};
const materials = () => ({
 ceramic:new T.MeshStandardMaterial({color:'#fafbf9',roughness:.24}),
 wood:new T.MeshStandardMaterial({color:'#a9b9ac',roughness:.62}),
 oak:new T.MeshStandardMaterial({color:'#c4a47e',roughness:.65}),
 stone:new T.MeshStandardMaterial({color:'#e9e8df',roughness:.35}),
 metal:new T.MeshStandardMaterial({color:'#afb7ba',metalness:.8,roughness:.23}),
 dark:new T.MeshStandardMaterial({color:'#243337',roughness:.3}),
 glass:new T.MeshStandardMaterial({color:'#a8dce9',transparent:true,opacity:.25,roughness:.12,metalness:.15,depthWrite:false,side:T.DoubleSide}),
 wall:new T.MeshStandardMaterial({color:'#e8e7e2',roughness:.85}),
});

/** Shared architecture for the interactive room and downloadable scene. Units are metres. */
export function buildArchitecture(plan:ArchitecturePlan){
 const root=new T.Group();root.name='Floor plan architecture';
 const m=materials(),colliders:T.Box3[]=[],wallMeshes:T.Mesh[]=[],doorMeshes:T.Mesh[]=[],wallMounted:T.Object3D[]=[],fixtureColliders:T.Box3[]=[];
 const doors:ReturnType<typeof createHingedDoor>[]=[];
 if(plan.appearance){for(const key of ['wood','stone','wall'] as const){const color=plan.appearance[key];if(color)m[key].color.set(color);}}
 function mesh(parent:T.Object3D,name:string,g:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const o=new T.Mesh(g,material);o.name=name;o.position.set(x,y,z);o.castShadow=material!==m.glass;o.receiveShadow=true;const raycast=o.raycast.bind(o);o.raycast=(ray,hits)=>{for(let a:T.Object3D|null=o;a;a=a.parent){if(!a.visible)return;}raycast(ray,hits);};parent.add(o);return o;}
 function box(p:T.Object3D,n:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material){return mesh(p,n,new T.BoxGeometry(w,h,d),mat,x,y,z);}
 function cylinder(p:T.Object3D,n:string,x:number,y:number,z:number,r:number,h:number,mat:T.Material){return mesh(p,n,new T.CylinderGeometry(r,r,h,24),mat,x,y,z);}
 function roundedBox(p:T.Object3D,n:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material,r=.015){return mesh(p,n,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/4,h/4,d/4)),mat,x,y,z);}
 function pipe(p:T.Object3D,n:string,points:number[][],radius=.012){const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v)));return mesh(p,n,new T.TubeGeometry(curve,24,radius,8,false),m.metal);}
 function handle(p:T.Object3D,x:number,y:number,z:number,width=.22){
  // Straight bar with two short mounting posts, without overshooting spline corners.
  const bar=cylinder(p,'Handle bar',x,y,z,.009,width,m.metal);bar.rotation.z=Math.PI/2;
  for(const dx of [-width*.4,width*.4]){const post=cylinder(p,'Handle mount',x+dx,y,z-.016,.007,.032,m.metal);post.rotation.x=Math.PI/2;}
 }
 function roundedOutline(w:number,d:number,r:number){const q=new T.Shape(),x=w/2,z=d/2;q.moveTo(-x+r,-z);q.lineTo(x-r,-z);q.quadraticCurveTo(x,-z,x,-z+r);q.lineTo(x,z-r);q.quadraticCurveTo(x,z,x-r,z);q.lineTo(-x+r,z);q.quadraticCurveTo(-x,z,-x,z-r);q.lineTo(-x,-z+r);q.quadraticCurveTo(-x,-z,-x+r,-z);return q;}
 function horizontalShape(p:T.Object3D,n:string,shape:T.Shape,y:number,thickness:number,mat:T.Material){const o=mesh(p,n,new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false,curveSegments:12}),mat,0,y,0);o.rotation.x=-Math.PI/2;return o;}
 function basin(p:T.Object3D,w:number,d:number,y:number,kitchen:boolean){
  const finish=kitchen?m.metal:m.ceramic;
  const flange=roundedOutline(w+.025,d+.025,.055);flange.holes.push(roundedOutline(w-.04,d-.04,.04));horizontalShape(p,'Fitted sink rim',flange,y,.012,finish);
  // A continuous bowl surface connects the rim to a closed bottom. No exposed cabinet void.
  const outer=roundedOutline(w-.04,d-.04,.04).getPoints(12),inner=roundedOutline(w-.12,d-.12,.035).getPoints(12);
  const vertices:number[]=[],indices:number[]=[];for(let i=0;i<outer.length;i++){vertices.push(outer[i].x,y,-outer[i].y,inner[i].x,y-.14,-inner[i].y);if(i<outer.length-1){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const bowlMaterial=finish.clone();bowlMaterial.side=T.DoubleSide;mesh(p,'Recessed basin',geo,bowlMaterial);
  horizontalShape(p,'Closed sink bottom',roundedOutline(w-.12,d-.12,.035),y-.148,.01,finish);
  cylinder(p,'Drain',0,y-.136,0,.022,.006,m.metal);
  pipe(p,'Mixer faucet',[[0,y,-d/2-.05],[0,y+.20,-d/2-.05],[0,y+.23,-d*.2],[0,y+.17,-d*.10]],.009);
 }
 function cabinet(p:T.Object3D,w:number,d:number,h:number,top=true){
  box(p,'Cabinet plinth',0,.055,0,w-.10,.11,d-.08,m.dark);
  box(p,'Cabinet carcass',0,h/2,0,w,h-.06,d-.025,m.wood);
  const count=Math.max(1,Math.round(w/.5));for(let i=0;i<count;i++){const x=-w/2+(i+.5)*w/count;box(p,'Panelled cabinet door',x,h/2,d/2,w/count-.015,h-.15,.025,m.wood);handle(p,x,h-.16,d/2+.025,Math.min(.22,w/count*.5));}
  if(top)box(p,'Stone countertop',0,h,0,w+.025,.04,d+.025,m.stone);
 }
 function apertureCounter(p:T.Object3D,w:number,d:number,h:number,bw:number,bd:number){
  const top=roundedOutline(w+.025,d+.025,.012);top.holes.push(roundedOutline(bw,bd,.05));horizontalShape(p,'Fitted countertop',top,h-.02,.04,m.stone);
 }
 for(const f of plan.fixtures){
  const g=new T.Group();g.name=f.type;g.position.set(f.x,f.y??0,f.z);g.rotation.y=f.rotation||0;root.add(g);const {width:w,depth:d,height:h}=f;
  // Collision follows the installed footprint, independent of decorative mesh detail.
  const collision=new T.Box3(new T.Vector3(-w/2,0,-d/2),new T.Vector3(w/2,h,d/2));g.updateMatrixWorld(true);collision.applyMatrix4(g.matrixWorld);colliders.push(collision);fixtureColliders.push(collision);
  switch(f.type){
   case 'microwave':{
    roundedBox(g,'Microwave housing',0,h/2,0,w,h,d,m.metal,.012);
    box(g,'Microwave glass door',-w*.10,h*.50,d/2+.006,w*.71,h*.76,.013,m.dark);
    handle(g,w*.22,h*.50,d/2+.035,h*.57);
    box(g,'Microwave display',w*.36,h*.73,d/2+.013,w*.15,h*.16,.01,m.dark);
    for(const y of [.28,.42,.55])box(g,'Microwave controls',w*.36,h*y,d/2+.015,w*.12,.01,.01,m.ceramic);break;
   }
   case 'closet-interior':{
    g.name='Closet hanging storage';
    box(g,'Closet overhead shelf',0,h-.22,0,w,.025,d,m.ceramic);
    const rod=cylinder(g,'Clothes rail',0,h-.40,0,.012,w-.06,m.metal);rod.rotation.z=Math.PI/2;
    for(const x of [-w*.33,w*.33])box(g,'Rail wall bracket',x,h-.40,-d*.24,.025,.025,d*.5,m.metal);
    break;
   }
   case 'shelving':{
    box(g,'Cupboard back',0,h/2,-d/2,w,h,.025,m.ceramic);
    for(const sign of [-1,1])box(g,'Cupboard side',sign*(w/2-.012),h/2,0,.025,h,d,m.ceramic);
    for(const y of [.05,.45,.85,1.25,1.65,2.1])if(y<h)box(g,'Storage shelf',0,y,0,w,.025,d,m.ceramic);break;
   }
   case 'closet':case 'walk-in-closet':{
    // Fitted white millwork with separate storage bays and aligned paired doors.
    const finish=m.ceramic,t=.025,front=d/2+.035;
    box(g,'Closet back',0,h/2,-d/2+t/2,w,h,t,finish);
    for(const sign of [-1,1])box(g,'Closet side',sign*(w/2-t/2),h/2,0,t,h,d,finish);
    for(const y of [t/2,h-t/2])box(g,'Closet cap',0,y,0,w-2*t,t,d,finish);
    const divider=-w*.18;
    box(g,'Closet divider',divider,h/2,0,t,h-.05,d-.04,finish);
    const shelfWidth=w*.32-t*1.5,shelfX=-w/2+t+shelfWidth/2;
    for(const y of [.38,.76,1.14,1.52,1.9])box(g,'Closet shelf',shelfX,y,-.015,shelfWidth,t,d-.08,finish);
    const railWidth=w*.68-.065,railX=divider+.025+railWidth/2;
    box(g,'Closet upper shelf',railX,h-.30,-.015,railWidth,t,d-.08,finish);
    const rod=cylinder(g,'Hanging rail',railX,h-.43,-.02,.012,railWidth,m.metal);rod.rotation.z=Math.PI/2;
    // Two flush leaves, each with a real pivot; no floating half-width sliding panel.
    const leafWidth=(w-.07)/2;
    for(const sign of [-1,1]){
     const pivot=new T.Group();pivot.name='Closet door pivot';pivot.position.set(sign*(w/2-.025),.06,front);g.add(pivot);
     // Local +X always points across the leaf from its hinge.
     pivot.rotation.y=sign===-1?0:Math.PI;
     const mount=new T.Group();mount.name='Closet hinge mount';mount.position.copy(pivot.position);mount.rotation.copy(pivot.rotation);g.remove(pivot);g.add(mount);pivot.position.set(0,0,0);pivot.rotation.set(0,0,0);mount.add(pivot);
     box(pivot,'Closet door',leafWidth/2,(h-.10)/2,0,leafWidth-.008,h-.10,.024,finish);
     const pull=cylinder(pivot,'Closet pull',leafWidth-.055,1.04,sign===-1?.027:-.027,.009,.16,m.metal);
     const interactive=createHingedDoor(pivot,leafWidth,sign===-1?-Math.PI/2:Math.PI/2);doors.push(interactive);interactive.toggle();interactive.update(1,[],true);
     // Closet doors are blocked by their cabinet body; they open outward into the room.
     colliders.push(...interactive.colliders);pivot.traverse(o=>{o.userData.doorIndex=doors.length-1;});
    }
    break;
   }
   case 'laundry':{
    const unit=(h-.06)/2;
    for(let i=0;i<2;i++){const y=.03+i*(unit+.025);box(g,i?'Dryer housing':'Washer housing',0,y+unit/2,0,w,unit,d,m.ceramic);box(g,'Laundry control panel',0,y+unit-.09,d/2+.006,w-.035,.14,.02,m.metal);
     const ring=mesh(g,'Round laundry door rim',new T.TorusGeometry(w*.30,.025,10,32),m.metal,0,y+unit*.44,d/2+.022);
     const glass=cylinder(g,'Laundry drum window',0,y+unit*.44,d/2+.026,w*.26,.025,m.dark);glass.rotation.x=Math.PI/2;
     const inner=cylinder(g,'Drum reflection',0,y+unit*.44,d/2+.043,w*.18,.004,m.glass);inner.rotation.x=Math.PI/2;
     const dial=cylinder(g,'Cycle selector',w*.25,y+unit-.09,d/2+.032,.035,.018,m.dark);dial.rotation.x=Math.PI/2;
    }break;
   }
   case 'toilet':{
    roundedBox(g,'Toilet foot',0,.065,-.015,w*.65,.13,d*.59,m.ceramic,.04);
    roundedBox(g,'Toilet pedestal',0,.21,-.055,w*.47,.29,d*.42,m.ceramic,.055);
    const profile=[new T.Vector2(0,.20),new T.Vector2(.10,.20),new T.Vector2(.125,.25),new T.Vector2(.17,.31),new T.Vector2(.188,.365),new T.Vector2(.19,.40),new T.Vector2(0,.40)];
    const bowl=mesh(g,'Smooth toilet bowl',new T.LatheGeometry(profile,48),m.ceramic,0,0,.075);bowl.scale.set(w/.4,1,1.28);
    const seat=roundedOutline(w*.94,d*.63,.16);const seatMesh=horizontalShape(g,'Toilet seat',seat,.402,.018,m.ceramic);seatMesh.position.z=.075;
    const lid=roundedOutline(w*.92,d*.61,.155);const lidMesh=horizontalShape(g,'Closed toilet lid',lid,.426,.016,m.ceramic);lidMesh.position.z=.075;
    roundedBox(g,'Toilet cistern',0,.555,-d*.325,w*.91,.43,.185,m.ceramic,.032);
    roundedBox(g,'Cistern lid',0,.778,-d*.325,w*.94,.025,.195,m.ceramic,.01);
    cylinder(g,'Flush button',0,.795,-d*.325,.019,.008,m.metal);break;
   }
   case 'vanity':case 'sink':{
    // Hollow cabinet top leaves the basin visible below its rim.
    const finish=f.type==='vanity'&&plan.appearance?.wood?m.ceramic:m.wood;
    box(g,'Sink cabinet back',0,h/2,-d/2+.02,w,h,.04,finish);
    for(const sign of [-1,1])box(g,'Sink cabinet side',sign*(w/2-.02),h/2,0,.04,h,d,finish);
    box(g,'Sink cabinet front',0,h/2,d/2,w-.03,h-.07,.025,finish);handle(g,0,h-.13,d/2+.03);
    const bw=Math.min(w*.62,.52),bd=Math.min(d*.58,.36);apertureCounter(g,w,d,h,bw,bd);basin(g,bw,bd,h+.022,f.type==='sink');
    if(f.type==='vanity'){const mirror=new T.Group();g.add(mirror);wallMounted.push(mirror);box(mirror,'Mirror frame',0,h+.6,-d/2,w*.9,.8,.035,m.metal);box(mirror,'Bathroom mirror',0,h+.6,-d/2+.021,w*.86,.76,.012,m.glass);}break;
   }
   case 'bathtub':case 'shower':{
    const tub=f.type==='bathtub',rim=tub?.11:.035,level=tub?h:.10;
    box(g,tub?'Tub base':'Shower tray',0,.035,0,w,.07,d,m.ceramic);
    for(const sign of [-1,1]){box(g,'Basin side',sign*(w/2-rim/2),level/2,0,rim,level,d,m.ceramic);box(g,'Basin end',0,level/2,sign*(d/2-rim/2),w-rim*2,level,rim,m.ceramic);}
    cylinder(g,'Bath drain',0,.076,-d*.32,.035,.007,m.metal);
    pipe(g,'Bath mixer',[[0,level+.03,-d/2+.05],[0,level+.15,-d/2+.05],[0,level+.15,-d/2+.24]]);
    pipe(g,'Shower riser',[[w/2-.06,level+.15,-d*.25],[w/2-.06,2.08,-d*.25],[w/2-.30,2.08,-d*.25]]);
    cylinder(g,'Rain shower head',w/2-.30,2.05,-d*.25,.10,.025,m.metal);
    box(g,'Glass shower screen',-w/2+.015,1.35,-d*.24,.018,1.4,d*.48,m.glass);
    break;
   }
   case 'stove':{
    roundedBox(g,'Oven body',0,h/2,0,w,h,d,m.metal,.012);box(g,'Oven plinth',0,.04,0,w-.06,.08,d-.04,m.dark);box(g,'Oven door',0,h*.42,d/2+.01,w-.07,h*.6,.025,m.dark);box(g,'Oven glass',0,h*.43,d/2+.027,w-.17,h*.37,.008,m.glass);handle(g,0,h*.72,d/2+.055,w*.65);
    box(g,'Cooktop',0,h+.01,0,w+.015,.04,d+.015,m.dark);
    for(const x of [-w*.24,w*.24])for(const z of [-d*.24,d*.24]){
     if(f.cooktop==='ceramic'){const ring=mesh(g,'Ceramic hob zone',new T.TorusGeometry(w*.145,.002,6,32),m.metal,x,h+.032,z);ring.rotation.x=Math.PI/2;}
     else{cylinder(g,'Burner',x,h+.037,z,w*.145,.015,m.metal);cylinder(g,'Burner cap',x,h+.048,z,w*.095,.013,m.dark);}}

    for(let i=0;i<4;i++){const knob=cylinder(g,'Oven knob',-w*.3+i*w*.2,h-.08,d/2+.028,.025,.022,m.dark);knob.rotation.x=Math.PI/2;}
    const hood=new T.Group();hood.name='Wall mounted range hood';g.add(hood);wallMounted.push(hood);box(hood,'Range hood',0,1.86,f.island?0:-d*.10,f.island?w+.18:w,.12,d*.8,m.metal);box(hood,'Hood chimney',0,2.28,f.island?0:-d*.36,w*.36,.84,d*.28,m.metal);break;
   }
   case 'dishwasher':{
    box(g,'Dishwasher',0,h/2,0,w,h,d,m.metal);box(g,'Dishwasher door seam',0,.45,d/2+.006,w-.035,h-.13,.015,m.dark);box(g,'Dishwasher front',0,.44,d/2+.02,w-.055,h-.18,.022,m.metal);handle(g,0,h-.10,d/2+.05,w*.65);box(g,'Dishwasher display',w*.2,h-.06,d/2+.02,.09,.025,.01,m.dark);box(g,'Counter over dishwasher',0,h,0,w+.015,.04,d+.015,m.stone);break;
   }
   case 'refrigerator':{
    box(g,'Refrigerator body',0,h/2,0,w,h,d,m.metal);
    if(f.freezer==='bottom'){box(g,'Freezer door',0,h*.145,d/2,w-.025,h*.28,.035,m.metal);box(g,'Refrigerator door',0,h*.65,d/2,w-.025,h*.69,.035,m.metal);}
    else{box(g,'Refrigerator lower door',0,h*.30,d/2,w-.025,h*.59,.035,m.ceramic);box(g,'Freezer door',0,h*.80,d/2,w-.025,h*.38,.035,m.ceramic);}
    if(plan.appearance?.refrigerator){for(const child of g.children){if(child instanceof T.Mesh&&child.name.includes('door'))child.material=m.metal;}}
    for(const y of [h*.56,h*.71])handle(g,-w*.22,y,d/2+.045,w*.26);break;
   }
   case 'cabinet':{cabinet(g,w,d,h);if(f.upper===false)break;const upper=new T.Group();upper.name='Wall mounted cabinet';g.add(upper);wallMounted.push(upper);box(upper,'Upper kitchen cabinet',0,1.94,-d*.25,w,.62,d*.5,m.wood);handle(upper,0,1.71,.035,w*.4);break;}
  }
 }
 // Continuous upper storage above the dishwasher and sink, when present in the listing.
 for(const f of plan.fixtures.filter(f=>f.upper===true&&f.type!=='cabinet')){
  const upper=new T.Group();upper.name='Wall mounted cabinet';upper.position.set(f.x,0,f.z);upper.rotation.y=f.rotation??0;root.add(upper);wallMounted.push(upper);
  box(upper,'Upper kitchen cabinet',0,1.94,-f.depth*.25,f.width,.62,f.depth*.5,m.wood);handle(upper,0,1.71,.035,f.width*.4);
 }
 // Segment each wall around real window openings instead of drawing glass over solid walls.
 plan.walls.forEach(([x,z,xx,zz],index)=>{
  const length=Math.hypot(xx-x,zz-z),along=new T.Vector3((xx-x)/length,0,(zz-z)/length);
  function segment(start:number,end:number,bottom:number,top:number){if(end-start<.001||top-bottom<.001)return;const center=new T.Vector3(x,0,z).addScaledVector(along,(start+end)/2);const o=box(root,'Wall',center.x,(bottom+top)/2,center.z,end-start+.12,top-bottom,.12,m.wall);o.rotation.y=-Math.atan2(zz-z,xx-x);o.userData.bottom=bottom;o.userData.top=top;const raycast=o.raycast.bind(o);o.raycast=(ray,hits)=>{if(o.visible)raycast(ray,hits);};wallMeshes.push(o);o.updateMatrixWorld(true);colliders.push(new T.Box3().setFromObject(o));}
  let cursor=0;for(const win of plan.windows.filter(v=>v.wall===index).sort((a,b)=>a.start-b.start)){
   segment(cursor,win.start,0,plan.height);segment(win.start,win.start+win.width,0,win.sill);segment(win.start,win.start+win.width,win.sill+win.height,plan.height);cursor=win.start+win.width;
   const g=new T.Group();g.name='Window';g.position.set(x,0,z).addScaledVector(along,win.start+win.width/2);g.rotation.y=-Math.atan2(zz-z,xx-x);root.add(g);
   for(const sign of [-1,1]){box(g,'Window jamb',sign*(win.width/2-.025),win.sill+win.height/2,0,.05,win.height,.16,m.ceramic);box(g,'Window rail',0,win.sill+(sign===1?win.height:0),0,win.width,.05,.16,m.ceramic);}
   box(g,'Window mullion',0,win.sill+win.height/2,0,.035,win.height,.08,m.metal);box(g,'Window glazing',0,win.sill+win.height/2,0,win.width-.06,win.height-.06,.015,m.glass);box(g,'Window sill',0,win.sill-.035,0,win.width+.12,.055,.24,m.stone);
   // Glass remains a barrier in first-person mode even though transparent.
   g.updateMatrixWorld(true);colliders.push(new T.Box3(new T.Vector3(-win.width/2,win.sill,-.06),new T.Vector3(win.width/2,win.sill+win.height,.06)).applyMatrix4(g.matrixWorld));
  }segment(cursor,length,0,plan.height);
 });
 for(const [openingIndex,door] of plan.doors.entries()){
  const g=new T.Group();g.name=door.leaves===2?'Double door frame':'Door frame';g.userData.label=door.label;g.position.set(door.x,0,door.z);g.rotation.y=door.rotation;root.add(g);
  // One uninterrupted opening: paired leaves share the two outer jambs and one lintel.
  for(const x of [0,door.width])box(g,'Door jamb',x,1.05,0,.045,2.1,.12,m.ceramic);
  box(g,'Door lintel',door.width/2,2.12,0,door.width+.05,.06,.12,m.ceramic);
  box(g,'Wall above doorway',door.width/2,(2.15+plan.height)/2,0,door.width+.12,plan.height-2.15,.12,m.wall);
  const firstIndex=doors.length,count=door.leaves??1,width=door.width/count;
  for(let i=0;i<count;i++){
   const mount=new T.Group();mount.name='Door hinge mount';mount.position.x=i===0?0:door.width;mount.rotation.y=i===0?0:Math.PI;g.add(mount);
   const pivot=new T.Group();pivot.name=count===2?(i===0?'Left door leaf':'Right door leaf'):'Door leaf';mount.add(pivot);
   if(door.glazed){
    const panel=new T.Group();panel.name='Painted door leaf';pivot.add(panel);
    const center=width/2+.0095,w=width-.026;
    for(const sign of [-1,1])box(panel,'White door stile',center+sign*(w/2-.035),1.05,0,.07,2.07,.035,m.ceramic);
    box(panel,'White door top rail',center,2.05,0,w,.07,.035,m.ceramic);
    box(panel,'White lower door panel',center,.29,0,w,.55,.035,m.ceramic);
    box(panel,'White door middle rail',center,.60,0,w,.07,.035,m.ceramic);
    const frosted=new T.MeshStandardMaterial({color:'#e2ebe7',roughness:.8,transparent:true,opacity:.72,side:T.DoubleSide,depthWrite:false});
    box(panel,'Frosted door glass',center,1.32,0,w-.14,1.36,.012,frosted);
   }else{
    box(pivot,'Painted door leaf',width/2+(count===2?.0095:0),1.05,0,width-(count===2?.026:.045),2.07,.035,m.ceramic);
   }
   // Shallow painted panels make closet fronts legible in both camera modes.
   if(door.keepFullHeight&&!door.glazed)for(const side of [-1,1])for(const [y,h] of [[.56,.75],[1.52,.85]])box(pivot,'Door inset panel',width/2,y,side*.021,width-.17,h,.008,m.ceramic);
   for(const side of [-1,1]){box(pivot,'Door lever',width-.13,1,side*.043,.10,.016,.016,m.metal);const spindle=cylinder(pivot,'Door spindle',width-.18,1,side*.027,.018,.03,m.metal);spindle.rotation.x=Math.PI/2;}
   root.updateMatrixWorld(true);const interactive=createHingedDoor(pivot,width,i===0?door.swing:-door.swing);
   if(door.initialOpen===false){interactive.toggle();interactive.update(1,[],true);}
   pivot.userData.openingIndex=openingIndex;pivot.userData.paired=count===2;
   doors.push(interactive);colliders.push(...interactive.colliders);
   pivot.traverse(o=>{o.userData.doorIndex=doors.length-1;});
  }
  for(const o of g.children)if(o instanceof T.Mesh)o.userData.doorIndex=firstIndex;
  g.traverse(o=>{if(o instanceof T.Mesh){o.geometry.computeBoundingBox();const bounds=o.geometry.boundingBox!.clone().applyMatrix4(new T.Matrix4().compose(o.position,o.quaternion,o.scale));o.userData.bottom=bounds.min.y;o.userData.top=bounds.max.y;o.userData.originalY=o.position.y;
   // Closet fronts and paired leaves stay recognizable in isometric view.
   if(!door.keepFullHeight)doorMeshes.push(o);
  }});
 }
 // Retain closed closet enclosures in the dollhouse view. Full-height mode uses
 // the existing room walls, so these overlays are hidden there to avoid coplanar faces.
 const closetShells=new T.Group();closetShells.name='Closet enclosures';closetShells.visible=false;root.add(closetShells);
 for(const closet of plan.closetVolumes??[]){
  const [x,z,w,d]=closet.rect,g=new T.Group();g.name=closet.name;closetShells.add(g);
  function side(name:string,length:number){
   const ranges=name===closet.side?[[0,closet.start],[closet.start+closet.opening,length]]:[[0,length]];
   for(const [a,b] of ranges){if(b-a<.001)continue;const horizontal=name==='north'||name==='south';box(g,'Closet enclosure wall',horizontal?x+(a+b)/2:name==='east'?x+w:x,(.62+plan.height)/2,horizontal?(name==='north'?z:z+d):z+(a+b)/2,horizontal?b-a:.12,plan.height-.62,horizontal?.12:b-a,m.wall);}
  }
  side('north',w);side('south',w);side('west',d);side('east',d);
  box(g,'Closet ceiling',x+w/2,plan.height+.035,z+d/2,w+.16,.07,d+.16,m.ceramic);
 }

 for(const [x,z] of plan.lights??[]){
  const lamp=new T.Group();lamp.name='Recessed ceiling light';lamp.position.set(x,0,z);root.add(lamp);
  wallMounted.push(cylinder(lamp,'Ceiling light trim',0,plan.height-.018,0,.09,.025,m.ceramic));
  const glow=new T.MeshStandardMaterial({color:'#fff9ed',emissive:'#fff0d0',emissiveIntensity:2});wallMounted.push(cylinder(lamp,'Diffuser',0,plan.height-.035,0,.066,.015,glow));
  // Broad, feathered downlights with occlusion; point lights lit through closed walls.
  const light=new T.SpotLight('#ffe4be',5,6,Math.PI*.36,.65,2);
  light.position.set(0,plan.height-.18,0);light.target.position.set(0,0,0);
  light.castShadow=true;light.shadow.mapSize.set(512,512);light.shadow.camera.near=.1;light.shadow.camera.far=6;
  light.shadow.bias=-.0003;light.shadow.normalBias=.02;light.shadow.radius=2;
  lamp.add(light,light.target);
 }
 // Structural piers and finish liners use the same cutaway as the walls.
 for(const [x,z,w,d] of plan.columns??[]){const o=box(root,'Structural pier',x+w/2,plan.height/2,z+d/2,w,plan.height,d,m.wall);o.userData.bottom=0;o.userData.top=plan.height;wallMeshes.push(o);o.updateMatrixWorld(true);colliders.push(new T.Box3().setFromObject(o));}
 for(const panel of plan.surfacePanels??[]){const [x,z,xx,zz]=panel.line;const o=box(root,'Surface '+panel.finish,(x+xx)/2,panel.bottom+panel.height/2,(z+zz)/2,Math.hypot(xx-x,zz-z),panel.height,.015,m.stone.clone());o.rotation.y=-Math.atan2(zz-z,xx-x);o.userData.finish=panel.finish;o.userData.bottom=panel.bottom;o.userData.top=panel.bottom+panel.height;wallMeshes.push(o);}
 if(plan.appearance?.trim){for(const [x,z,xx,zz] of plan.walls){const length=Math.hypot(xx-x,zz-z),angle=-Math.atan2(zz-z,xx-x);
  const skirting=box(root,'White baseboard',(x+xx)/2,.055,(z+zz)/2,length,.11,.145,m.ceramic);skirting.rotation.y=angle;
  const crown=box(root,'Ceiling trim',(x+xx)/2,plan.height-.055,(z+zz)/2,length,.11,.17,m.ceramic);crown.rotation.y=angle;wallMounted.push(crown);
 }}
 function cutaway(enabled:boolean|number){
  const amount=typeof enabled==='boolean'?Number(enabled):T.MathUtils.clamp(enabled,0,1);
  closetShells.visible=amount>0;closetShells.scale.y=Math.max(.001,amount);closetShells.position.y=plan.height*(1-amount);
  for(const wall of wallMeshes){const bottom=wall.userData.bottom as number,top=wall.userData.top as number;const visibleTop=T.MathUtils.lerp(top,Math.max(bottom,Math.min(top,.62)),amount);wall.visible=visibleTop>bottom;if(wall.visible){wall.scale.y=(visibleTop-bottom)/(top-bottom);wall.position.y=(visibleTop+bottom)/2;}}
  for(const door of doorMeshes){const {bottom,top,originalY}=door.userData;const visibleTop=T.MathUtils.lerp(top,Math.max(bottom,Math.min(top,.62)),amount);door.visible=visibleTop>bottom;door.scale.y=(visibleTop-bottom)/(top-bottom);door.position.y=originalY-(top-visibleTop)/2;}
  wallMounted.forEach(o=>{o.visible=amount<1;o.scale.y=Math.max(.001,1-amount);});
 }
 return {root,colliders,fixtureColliders,wallMeshes,doors,cutaway};
}
