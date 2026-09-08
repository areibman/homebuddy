import * as T from 'three';
import defaultListing from './listing.json';
import type {Listing} from './home-definitions';
/** Sample archived listing photographs. Each surface keeps its own provenance. */
export async function loadListingMaterials(anisotropy:number,listing:Listing=defaultListing){
 const textures:T.Texture[]=[];
 const sample=async(source:{src:string;crop:number[]})=>{
  const image=await new T.ImageLoader().loadAsync(source.src);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const context=canvas.getContext('2d');if(!context)throw new Error('Texture canvas unavailable');
  const [x,y,w,h]=source.crop;context.drawImage(image,x,y,w,h,0,0,512,512);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.anisotropy=anisotropy;textures.push(texture);return texture;
 };
 const entries=Object.entries(listing.finishes),results=await Promise.allSettled(entries.map(([,source])=>sample(source)));
 const maps:Record<string,T.Texture|null>={};entries.forEach(([key],i)=>{const result=results[i];maps[key]=result.status==='fulfilled'?result.value:null;});
 return {maps,dispose:()=>textures.forEach(texture=>texture.dispose())};
}
