import {useLayoutEffect,useRef,useState} from 'react';

export type FurnitureHover={id:string;x:number;y:number;width:number;height:number}|null;

export function FurnitureHoverLabel({hover,name,price}:{hover:NonNullable<FurnitureHover>;name:string;price:string}){
 const caption=useRef<HTMLDivElement>(null),[measuredWidth,setMeasuredWidth]=useState(220);
 const maxWidth=Math.min(300,Math.max(1,hover.width-24));
 useLayoutEffect(()=>{if(caption.current)setMeasuredWidth(Math.ceil(caption.current.getBoundingClientRect().width));},[name,price,maxWidth]);
 const width=Math.min(measuredWidth,maxWidth);
 const right=hover.x+36+width<=hover.width-12;
 const left=Math.max(12,Math.min(hover.width-width-12,right?hover.x+36:hover.x-36-width));
 const lineY=Math.max(46,Math.min(hover.height-16,hover.y+40));
 const elbow=right?left:left+width,end=right?left+width:left;
 const points=`${hover.x},${hover.y} ${elbow},${lineY} ${end},${lineY}`;
 return <div className="furniture-hover-label" role="tooltip" aria-label={`${price} · ${name}`}>
  <svg width="100%" height="100%" aria-hidden="true">
   <polyline points={points} fill="none" stroke="#fbfcf8" strokeWidth="4" strokeLinejoin="round"/>
   <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round"/>
   <circle cx={hover.x} cy={hover.y} r="3" fill="currentColor" stroke="#fbfcf8" strokeWidth="1.5"/>
  </svg>
  <div ref={caption} className="furniture-hover-caption" style={{left,top:lineY-34,maxWidth}}>
   <strong>{price}</strong><span>{name}</span>
  </div>
 </div>;
}
