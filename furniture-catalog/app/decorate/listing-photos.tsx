'use client';
import {useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
import listing from './listing.json';

export function ListingPhotos(){
 const [index,setIndex]=useState(0),[failed,setFailed]=useState(false);
 const photo=listing.photos[index];
 const select=(next:number)=>{setIndex((next+listing.photos.length)%listing.photos.length);setFailed(false);};
 return <div className="listing-gallery" onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();select(index+(event.key==='ArrowRight'?1:-1));}}}>
  <p className="listing-photo-note">Spera’s apartment photos. Finishes may vary by unit; these photos are not identified as Plan E.</p>
  <div className="listing-photo-stage">
   {failed?<p role="status">This photo could not load. Try another photo or open the listing below.</p>:<img key={photo.src} src={photo.src} alt={photo.alt} onError={()=>setFailed(true)}/>}
   <button className="gallery-previous" aria-label="Previous listing photo" onClick={()=>select(index-1)}><ChevronLeft/></button>
   <button className="gallery-next" aria-label="Next listing photo" onClick={()=>select(index+1)}><ChevronRight/></button>
  </div>
  <div className="listing-photo-caption" aria-live="polite"><span>{photo.alt}</span><span>{index+1} / {listing.photos.length}</span></div>
  <div className="listing-thumbnails" aria-label="Choose listing photo">{listing.photos.map((photo,i)=><button key={photo.src} aria-label={photo.alt} aria-pressed={i===index} onClick={()=>select(i)}><img src={photo.src} alt="" loading="lazy"/></button>)}</div>
  <footer><a href={listing.source} target="_blank" rel="noreferrer">View Spera listing <ArrowUpRight size={15}/></a></footer>
 </div>;
}
