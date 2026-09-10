"use client";
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap, LayerGroup} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {Home} from './explorer';
import {playableHomes,isPlayable} from './playable';

type Props={homes:Home[];zoom:number;reset:number;onReady:()=>void;onZoom:(zoom:number)=>void};
const center:[number,number]=[37.7871778,-122.3963593];
export default function City({homes,zoom,reset,onReady,onZoom}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),markers=useRef<LayerGroup|null>(null),readyCallback=useRef(onReady),zoomCallback=useRef(onZoom);
 useEffect(()=>{readyCallback.current=onReady;zoomCallback.current=onZoom;},[onReady,onZoom]);
 const [loaded,setLoaded]=useState(false),[error,setError]=useState(false),[tileError,setTileError]=useState(false);
 useEffect(()=>{
  let disposed=false;let observer:ResizeObserver|undefined;
  import('leaflet').then(L=>{
   if(disposed||!host.current)return;
   const instance=L.map(host.current,{zoomControl:false,scrollWheelZoom:true,minZoom:11,maxZoom:19}).setView(center,13);
   map.current=instance;instance.on('zoomend',()=>zoomCallback.current(instance.getZoom()));
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{className:'city-basemap',maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>setTileError(true)).on('tileload',()=>setTileError(false)).addTo(instance);
   markers.current=L.layerGroup().addTo(instance);
   observer=new ResizeObserver(()=>instance.invalidateSize());observer.observe(host.current);
   setLoaded(true);readyCallback.current();
  }).catch(()=>{if(!disposed){setError(true);readyCallback.current();}});
  return()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null;markers.current=null;};
 },[]);
 useEffect(()=>{if(loaded)map.current?.setZoom(zoom);},[zoom,loaded]);
 useEffect(()=>{if(loaded)map.current?.setView(center,13);},[reset,loaded]);
 useEffect(()=>{
  if(!loaded)return;
  let disposed=false;
  import('leaflet').then(L=>{
   if(disposed||!markers.current)return;
   markers.current.clearLayers();
   for(const home of homes.filter(isPlayable)){
    const place=playableHomes[home.id];
    const link=document.createElement('a');link.href=place.path;link.className='playable-pin';link.dataset.id=home.id;
    link.textContent='↗ '+home.name;link.setAttribute('aria-label','Explore '+home.name);link.title=place.address+' · Playable 3D home';
    L.marker([place.latitude,place.longitude],{keyboard:false,icon:L.divIcon({html:link,className:'home-marker',iconSize:[180,44],iconAnchor:[90,44]})}).addTo(markers.current);
   }
  }).catch(()=>setError(true));
  return()=>{disposed=true;};
 },[homes,loaded]);
 return <div className="city-canvas"><div ref={host} className="street-map" aria-label="San Francisco street map"/>{(error||tileError)&&<output className="map-error">Street map could not load. You can still enter a playable home from the home list.</output>}</div>;
}
