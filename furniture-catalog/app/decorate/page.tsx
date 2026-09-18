'use client';
import {Suspense} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {useQuery} from 'convex/react';
import {api} from '../../convex/_generated/api';
import {fromInterior,materializeSample} from './resolve-home';
import {RoomEditor} from './room-editor';

/**
 * `home` is either a Convex home id (a generated interior, visible only to its owner) or the slug of
 * a bundled sample. Convex is asked first so a seeded copy of a sample wins over the bundled one.
 */
function Decorate(){
 const query=useSearchParams();
 const ref=query.get('home')??'13';
 const interior=useQuery(api.interiors.get,{ref});
 if(interior===undefined)return <Message>Loading this home…</Message>;
 const home=(interior?.status==='ready'&&interior.plan?fromInterior(interior):undefined)??materializeSample(ref);
 if(!home){
  if(interior?.status==='failed')return <Message title="This home isn’t walkable yet">{interior.error||'The floor plan could not be reconstructed.'}</Message>;
  return <Message title="Home not found">Open one of your homes, or start from a sample.</Message>;
 }
 const layoutIndex=Math.max(0,Math.min((home.plan.layouts?.length??1)-1,Number(query.get('layout'))||0));
 return <RoomEditor key={home.id} home={home} layoutIndex={layoutIndex}/>;
}

function Message({title,children}:{title?:string;children:React.ReactNode}){
 return <main style={{padding:32}}>{title&&<h1>{title}</h1>}<p>{children}</p><Link href="/homes">Back to your homes</Link></main>;
}

export default function DecoratePage(){
 return <Suspense fallback={<main style={{padding:32}}><p>Loading this home…</p></main>}><Decorate /></Suspense>;
}
