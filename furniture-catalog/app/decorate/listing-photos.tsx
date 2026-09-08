'use client';
import {useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
import {homeDefinitions,type HomeDefinition} from './home-definitions';



export function ListingPhotos({home=homeDefinitions['13'],layoutIndex=0}:{home?:HomeDefinition;layoutIndex?:number}){
 const listing=home.listing,media=[{src:home.floorPlan,alt:home.title+' '+home.subtitle+' · Original floor plan'},...listing.photos];
 const layout=home.plan.layouts?.[layoutIndex]?.id;
 const download=home.id==='15'?(!layout||['gather','retreat'].includes(layout)?'/plans/bush-4101-'+(layout??'gather')+'.blend':null):home.download;
 const [index,setIndex]=useState(0),[failed,setFailed]=useState(false);
 const photo=media[index];
 const select=(next:number)=>{setIndex((next+media.length)%media.length);setFailed(false);};
 return <div className="listing-gallery" onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();select(index+(event.key==='ArrowRight'?1:-1));}}}>
  <div className="listing-media-tabs" aria-label="Apartment images"><button aria-pressed={index===0} onClick={()=>select(0)}>Floor plan</button><button aria-pressed={index>0} onClick={()=>select(index||1)}>Listing photos <span>{listing.photos.length}</span></button></div><p className="listing-photo-note">{index===0?'Original listing floor plan and dimensions.':(listing.note??'Spera’s apartment photos. Finishes may vary by unit; these photos are not identified as Plan E.')}</p>
  <div className="listing-photo-stage">
   {failed?<p role="status">This photo could not load. Try another photo or open the listing below.</p>:<img key={photo.src} src={photo.src} alt={photo.alt} onError={()=>setFailed(true)}/>}
   <button className="gallery-previous" aria-label="Previous image" onClick={()=>select(index-1)}><ChevronLeft/></button>
   <button className="gallery-next" aria-label="Next image" onClick={()=>select(index+1)}><ChevronRight/></button>
  </div>
  <div className="listing-photo-caption" aria-live="polite"><span>{photo.alt}</span><span>{index+1} / {media.length}</span></div>
  <div className="listing-thumbnails" aria-label="Choose floor plan or listing photo">{media.map((photo,i)=><button key={photo.src} aria-label={photo.alt} aria-pressed={i===index} onClick={()=>select(i)}><img src={photo.src} alt="" loading="lazy"/></button>)}</div>
  <footer><a href={photo.src} target="_blank" rel="noreferrer">Full-size image <ArrowUpRight size={15}/></a>{index===0&&download&&<a href={download} download>Blender scene ↓</a>}<a href={listing.source} target="_blank" rel="noreferrer">View listing <ArrowUpRight size={15}/></a></footer>
 </div>;
}
