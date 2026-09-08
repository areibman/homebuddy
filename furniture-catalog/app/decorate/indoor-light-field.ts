export type LightBarrier={line:number[];halfWidth:number};
export type IndoorLightPlan={floors:number[][];walls:number[][];windows:{wall:number;start:number;width:number}[];lights?:number[][]};

/** Diffuse light travels through connected indoor space, never straight through walls.
 * Direct sunlight and fixture lighting remain the renderer's shadow-mapped lights.
 */
export function createIndoorLightField(plan:IndoorLightPlan,step=.14){
 const minX=Math.min(...plan.floors.map(f=>f[0]))-step,minZ=Math.min(...plan.floors.map(f=>f[1]))-step;
 const width=Math.ceil((Math.max(...plan.floors.map(f=>f[0]+f[2]))-minX)/step)+1;
 const depth=Math.ceil((Math.max(...plan.floors.map(f=>f[1]+f[3]))-minZ)/step)+1;
 const size=width*depth,data=new Uint8Array(size*4),free=new Uint8Array(size),edges=new Uint8Array(size);
 const walls:LightBarrier[]=plan.walls.map(([x,z,xx,zz])=>{
  const length=Math.hypot(xx-x,zz-z),dx=(xx-x)/length*.06,dz=(zz-z)/length*.06;
  return {line:[x-dx,z-dz,xx+dx,zz+dz],halfWidth:.065};
 });
 const center=(index:number)=>[minX+(index%width)*step,minZ+Math.floor(index/width)*step];
 const inside=(x:number,z:number)=>plan.floors.some(([a,b,w,d])=>x>=a&&x<=a+w&&z>=b&&z<=b+d);
 function hits(x:number,z:number,barriers:LightBarrier[]){
  return barriers.some(({line:[a,b,c,d],halfWidth})=>{
   const dx=c-a,dz=d-b,t=Math.max(0,Math.min(1,((x-a)*dx+(z-b)*dz)/(dx*dx+dz*dz||1)));
   return Math.hypot(x-a-t*dx,z-b-t*dz)<halfWidth;
  });
 }
 const daylight:number[][]=[];
 for(const window of plan.windows){
  const [x,z,xx,zz]=plan.walls[window.wall],length=Math.hypot(xx-x,zz-z),dx=(xx-x)/length,dz=(zz-z)/length;
  // Seed the inside face along the aperture, rather than a point outside the building.
  for(let along=window.start+.1;along<window.start+window.width;along+=.24){
   for(const side of [-1,1])daylight.push([x+along*dx-dz*.22*side,z+along*dz+dx*.22*side]);
  }
 }
 function spread(sources:number[][],falloff:number,channel:number){
  const distances=new Float32Array(size);distances.fill(Infinity);
  const queue=new Int32Array(size);let start=0,end=0;
  for(const [x,z] of sources){
   if(!inside(x,z))continue;
   const ix=Math.round((x-minX)/step),iz=Math.round((z-minZ)/step),index=iz*width+ix;
   if(ix<0||ix>=width||iz<0||iz>=depth||!free[index]||distances[index]===0)continue;
   distances[index]=0;queue[end++]=index;
  }
  const offsets=[1,-1,width,-width];
  while(start<end){
   const index=queue[start++];
   for(let direction=0;direction<4;direction++){
    if(!(edges[index]&(1<<direction)))continue;
    const next=index+offsets[direction];if(Number.isFinite(distances[next]))continue;
    distances[next]=distances[index]+step;queue[end++]=next;
   }
  }
  for(let i=0;i<size;i++)data[i*4+channel]=Number.isFinite(distances[i])?Math.round(255*Math.exp(-distances[i]*falloff)):0;
 }
 function rebuild(doors:LightBarrier[]=[]){
  const barriers=[...walls,...doors];
  for(let i=0;i<size;i++){const [x,z]=center(i);free[i]=Number(inside(x,z)&&!hits(x,z,barriers));}
  edges.fill(0);
  for(let i=0;i<size;i++){
   if(!free[i])continue;const [x,z]=center(i),ix=i%width,iz=Math.floor(i/width);
   // Check edge midpoints too: a thin door must not fall between grid samples.
   if(ix+1<width&&free[i+1]&&!hits(x+step/2,z,barriers)){edges[i]|=1;edges[i+1]|=2;}
   if(iz+1<depth&&free[i+width]&&!hits(x,z+step/2,barriers)){edges[i]|=4;edges[i+width]|=8;}
  }
  spread(daylight,.22,0);spread(plan.lights??[],.5,1);
  for(let i=0;i<size;i++)data[i*4+3]=255;
 }
 rebuild();
 return {data,width,depth,minX,minZ,step,rebuild,
  sample(x:number,z:number){const ix=Math.round((x-minX)/step),iz=Math.round((z-minZ)/step);if(ix<0||ix>=width||iz<0||iz>=depth)return {daylight:0,lamps:0};const i=(iz*width+ix)*4;return {daylight:data[i]/255,lamps:data[i+1]/255};},
 };
}
