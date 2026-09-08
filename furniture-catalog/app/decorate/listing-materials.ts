import * as T from 'three';
import listing from './listing.json';

/** Sample actual listing photographs; mirrored wrapping keeps crop edges continuous. */
export async function loadListingMaterials(anisotropy:number){
 const textures:T.Texture[]=[];
 const sample=async(source:{src:string;crop:number[]})=>{
  const image=await new T.ImageLoader().loadAsync(source.src);
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const context=canvas.getContext('2d');if(!context)throw new Error('Texture canvas unavailable');
  const [x,y,w,h]=source.crop;context.drawImage(image,x,y,w,h,0,0,512,512);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;texture.anisotropy=anisotropy;textures.push(texture);return texture;
 };
 const results=await Promise.allSettled([sample(listing.finishes.floor),sample(listing.finishes.wall),sample(listing.finishes.carpet)]);
 return {floor:results[0].status==='fulfilled'?results[0].value:null,wall:results[1].status==='fulfilled'?results[1].value:null,carpet:results[2].status==='fulfilled'?results[2].value:null,dispose:()=>textures.forEach(texture=>texture.dispose())};
}
