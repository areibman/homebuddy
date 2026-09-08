import * as T from 'three';
/** One watertight slab from the exterior wall outline, independent of room tiles. */
export function createSlab(footprint:number[][],bottom:number,thickness:number,material:T.Material){
 const shape=new T.Shape(footprint.map(([x,z])=>new T.Vector2(x,-z)));
 const geometry=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:false});
 geometry.rotateX(-Math.PI/2);geometry.translate(0,bottom,0);
 const slab=new T.Mesh(geometry,material);slab.receiveShadow=true;slab.castShadow=true;return slab;
}
