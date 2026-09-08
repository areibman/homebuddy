/** Coordinates use meters; y is the player's feet, not the camera. */
export type Obstacle = {min:{x:number;y:number;z:number};max:{x:number;y:number;z:number}};
export type Floor = number[];
export const PLAYER = {radius:.12,height:1.68,eye:1.55,walk:2.3,run:3.8,gravity:18,jump:5.8};
export type Player = {x:number;y:number;z:number;vx:number;vy:number;vz:number;grounded:boolean};
export function createPlayer(x=5.7,z=7.1):Player{return {x,y:0,z,vx:0,vy:0,vz:0,grounded:true};}
export function overlaps(x:number,z:number,b:Obstacle,r=PLAYER.radius){
 const dx=x-Math.max(b.min.x,Math.min(x,b.max.x));const dz=z-Math.max(b.min.z,Math.min(z,b.max.z));
 return dx*dx+dz*dz<r*r-1e-8;
}
export function onFloor(x:number,z:number,floors:Floor[]){
 // Test the union, so shared edges never become invisible barriers.
 const inside=(a:number,b:number)=>floors.some(([fx,fz,w,d])=>a>=fx&&a<=fx+w&&b>=fz&&b<=fz+d);
 if(!inside(x,z))return false;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;if(!inside(x+Math.cos(a)*PLAYER.radius,z+Math.sin(a)*PLAYER.radius))return false;}
 return true;
}
export function blocked(p:Player,x:number,z:number,obstacles:Obstacle[],floors:Floor[]){
 return !onFloor(x,z,floors)||obstacles.some(b=>p.y<b.max.y-.001&&p.y+PLAYER.height>b.min.y+.001&&overlaps(x,z,b));
}
export function stepPlayer(p:Player,input:{x:number;z:number;yaw:number;run:boolean;jump:boolean},dt:number,obstacles:Obstacle[],floors:Floor[],ceiling=2.7){
 dt=Math.min(Math.max(dt,0),.05);
 const length=Math.hypot(input.x,input.z)||1,speed=input.run?PLAYER.run:PLAYER.walk;
 const x=input.x/length,z=input.z/length,c=Math.cos(input.yaw),s=Math.sin(input.yaw);
 const blend=1-Math.exp(-18*dt);p.vx+=((x*c+z*s)*speed-p.vx)*blend;p.vz+=((z*c-x*s)*speed-p.vz)*blend;
 if(input.jump&&p.grounded){p.vy=PLAYER.jump;p.grounded=false;}
 // Substeps prevent sprinting or a slow frame from tunnelling through thin walls.
 const steps=Math.max(1,Math.ceil(Math.max(Math.hypot(p.vx,p.vz),Math.abs(p.vy))*dt/.025)),h=dt/steps;
 for(let n=0;n<steps;n++){
  const nx=p.x+p.vx*h;if(!blocked(p,nx,p.z,obstacles,floors))p.x=nx;else p.vx=0;
  const nz=p.z+p.vz*h;if(!blocked(p,p.x,nz,obstacles,floors))p.z=nz;else p.vz=0;
  p.vy-=PLAYER.gravity*h;let ny=p.y+p.vy*h;
  if(p.vy<=0){let support=0;for(const b of obstacles)if(overlaps(p.x,p.z,b)&&p.y>=b.max.y-.002&&ny<=b.max.y) support=Math.max(support,b.max.y);
   if(ny<=support){ny=support;p.vy=0;p.grounded=true;}else p.grounded=false;
  }else{let top=ceiling;for(const b of obstacles)if(overlaps(p.x,p.z,b)&&p.y+PLAYER.height<=b.min.y+.002)top=Math.min(top,b.min.y);
   if(ny+PLAYER.height>=top){ny=Math.max(0,top-PLAYER.height);p.vy=0;}
  }
  p.y=ny;
 }
}
