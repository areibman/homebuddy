import * as T from 'three';
import {createSlab} from './slab.ts';
export function createCeiling(footprint:number[][],height:number){
 const root=new T.Group();root.name='First-person ceiling';root.visible=false;
 const material=new T.MeshStandardMaterial({color:'#f4f3ee',roughness:.95});
 const slab=createSlab(footprint,height,.12,material);slab.name='Continuous ceiling';root.add(slab);
 return {root,update(perspective:number,cameraHeight:number){root.visible=perspective>.98&&cameraHeight<height-.04;}};
}
