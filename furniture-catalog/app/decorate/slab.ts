import * as T from 'three';
/** One watertight slab from the exterior wall outline, independent of room tiles. */
export function createSlab(footprint:number[][],bottom:number,thickness:number,material:T.Material){
 const shape=new T.Shape(footprint.map(([x,z])=>new T.Vector2(x,-z)));
 const geometry=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,bottom,0);
 const slab=new T.Mesh(geometry,material);slab.receiveShadow=true;slab.castShadow=true;return slab;
}
/** One continuous finish on the floor plan. Walkable rectangles stay collision data, not separate pieces. */
export function createFloorCap(rects:number[][],y:number,material:T.Material){
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[];
 for(const [x,z,w,d] of rects){
  const i=positions.length/3;
  positions.push(x,y,z,x+w,y,z,x+w,y,z+d,x,y,z+d);
  uvs.push(x/.75,z/.85,(x+w)/.75,z/.85,(x+w)/.75,(z+d)/.85,x/.75,(z+d)/.85);
  indices.push(i,i+2,i+1,i,i+3,i+2);
 }
 const geometry=new T.BufferGeometry();
 geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const cap=new T.Mesh(geometry,material);cap.name='Floor plan finish';cap.receiveShadow=true;
 if(material instanceof T.Material){material.polygonOffset=true;material.polygonOffsetFactor=-1;material.polygonOffsetUnits=-1;}
 return cap;
}
