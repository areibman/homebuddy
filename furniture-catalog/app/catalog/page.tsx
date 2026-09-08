'use client';
import {createElement,useEffect,useRef,useState} from 'react';
import {Box,ArrowDownToLine,RotateCcw,MoveUpRight,Layers,Image as ImageIcon,Columns2} from 'lucide-react';
import rawCatalog from '../catalog.json';
type Item={id:string;name:string;category:string;description:string;materials:string[];dimensions_m:{width:number;depth:number;height:number};dimensions_note?:string;source:{retailer:string;url:string;photo_url:string;article_number:string;checked_date:string};files:{preview:string;glb:string;blend:string};provenance:string;viewer?:{orbit?:string;field_of_view?:string};view?:{camera_orbit_degrees?:{theta:number;phi:number}}};
const catalog=rawCatalog as Item[];
const cm=(m:number)=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(m*100);
function CatalogPhoto({item,thumbnail=false}:{item:Item;thumbnail?:boolean}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[item.source.photo_url]);
 if(!item.source.photo_url)return <img className={thumbnail?'catalog-thumb':'catalog-photo'} src={item.files.preview} alt={thumbnail?'':item.name+' — original design render'} loading={thumbnail?'lazy':'eager'}/>;
 if(failed)return <div className="photo-unavailable"><ImageIcon size={22}/><span>Catalog photo unavailable</span>{!thumbnail&&<a href={item.source.url} target="_blank" rel="noreferrer">View it on IKEA ↗</a>}</div>;
 return <img className={thumbnail?'catalog-thumb':'catalog-photo'} src={item.source.photo_url} alt={thumbnail?'':item.name+' — original IKEA catalog photo'} onError={()=>setFailed(true)} referrerPolicy="no-referrer" loading={thumbnail?'lazy':'eager'}/>;
}
export default function Home(){
 const [selected,setSelected]=useState(0);const [mode,setMode]=useState<'compare'|'photo'|'3d'>('compare');const [ready,setReady]=useState(false);const [importError,setImportError]=useState(false);const [modelError,setModelError]=useState(false);const [loaded,setLoaded]=useState(false);const [revision,setRevision]=useState(0);
 const viewer=useRef<HTMLElement|null>(null);const item=catalog[selected];
 useEffect(()=>{setMode('compare');import('@google/model-viewer').then(()=>setReady(true)).catch(()=>setImportError(true));},[]);
 useEffect(()=>{setLoaded(false);setModelError(false);const el=viewer.current;if(!el)return;const onLoad=()=>setLoaded(true);const onError=()=>setModelError(true);el.addEventListener('load',onLoad);el.addEventListener('error',onError);if((el as HTMLElement & {loaded?:boolean}).loaded)setLoaded(true);return()=>{el.removeEventListener('load',onLoad);el.removeEventListener('error',onError)}},[selected,ready,mode,revision]);
 const error=importError||modelError;
 function select(i:number){setSelected(i);setMode('compare');document.querySelector('.workspace')?.scrollIntoView({block:'start',behavior:'instant'})}
 const dims=item.dimensions_m;
 const angles=item.view?.camera_orbit_degrees;
 const referenceOrbits:Record<string,string>={sofa:"22deg 77deg 115%",armchair:"19deg 80deg 84%",bed:"29deg 73deg 100%","dining-table":"-23deg 74deg 98%",rug:"0deg 0deg 92%",dresser:"20deg 77deg 100%",bookshelf:"20deg 85deg 125%",nightstand:"24deg 70deg 120%","coffee-table":"27deg 69deg 106%","floor-lamp":"14deg 82deg 105%"};
 const framingOrbit=item.viewer?.orbit||referenceOrbits[item.id]||(angles?`${angles.theta}deg ${angles.phi}deg 112%`:"20deg 78deg 112%");
 const orbit=framingOrbit;
 return <main>
 <header><a className="brand" href="/" aria-label="Homebuddy city home"><span className="brandmark"><Box size={23}/></span>homebuddy <span className="brand-sub">Furniture library</span></a><a className="collection-download" href="/">Choose a home ↗</a><a className="collection-download" href="/furniture-collection.zip" download><ArrowDownToLine size={16}/><span>Download 3D collection</span></a></header>
 <section className="intro"><div><p className="eyebrow">THE WHOLE HOME <span className="intro-dot">/</span> {catalog.length} FURNITURE MODELS</p><h1>A home, piece by piece.</h1></div><div className="collection-count"><strong>{String(catalog.length).padStart(2,'0')}</strong><span>products<br/>to explore</span></div></section>
 <section className="workspace compare-workspace" aria-label="Selected furniture">
  <div className="viewer-area">
   <div className="viewer-toolbar"><span className="object-id">{item.source.retailer} / {item.source.article_number||'Original design'}</span><div className="view-switch" aria-label="View mode"><button aria-pressed={mode==='compare'} onClick={()=>setMode('compare')}><Columns2 size={15}/>Compare</button><button aria-pressed={mode==='photo'} onClick={()=>setMode('photo')}><ImageIcon size={15}/>{item.source.photo_url?'Catalog photo':'Preview'}</button><button aria-pressed={mode==='3d'} onClick={()=>setMode('3d')}><Box size={15}/>3D</button></div></div>
   <div className={'viewer-panes '+(mode==='compare'?'split':'single')}>
    {mode!=='3d'&&<figure className="reference-pane"><div className="pane-label"><ImageIcon size={14}/>{item.source.photo_url?'IKEA catalog photo':'Original design preview'}</div><div className="reference-image"><CatalogPhoto item={item}/></div><figcaption><span>{item.source.photo_url?'Original product photo · © IKEA':'Homebuddy design · rendered preview'}</span>{item.source.url&&<a href={item.source.url} target="_blank" rel="noreferrer">View product <MoveUpRight size={12}/></a>}</figcaption></figure>}
    {mode!=='photo'&&<div className="recreation-pane"><div className="pane-label"><Box size={14}/>3D model</div><div className="model-stage">{!ready||error?<img className="model-poster" src={item.files.preview} alt={item.name+' — rendered model preview'}/>:createElement('model-viewer',{key:item.id+'-'+revision,ref:viewer,src:item.files.glb,poster:item.files.preview,alt:'Interactive 3D model of '+item.name,'camera-controls':true,'touch-action':'pan-y','shadow-intensity':item.id==='rug'?'0.15':'0.65','shadow-softness':'1',exposure:'1','tone-mapping':'neutral','environment-image':'/environments/catalog-studio-final.hdr','camera-orbit':orbit,'max-camera-orbit':'auto auto 500%','field-of-view':'30deg','interaction-prompt':'none',loading:'eager',reveal:'auto',style:{width:'100%',height:'100%'}})}</div><div className="model-caption"><span role="status">{error?'3D unavailable · Rendered preview':!loaded?'Loading 3D model…':'Drag to rotate · Scroll to zoom'}</span>{ready&&!error&&<button className="reset" aria-label="Reset camera view" onClick={()=>setRevision(v=>v+1)}><RotateCcw size={15}/></button>}</div></div>}
   </div>
  </div>
  <aside><p className="eyebrow">{item.category}</p><h2>{item.name}</h2><p className="description">{item.description}</p>{item.source.url&&<a className="retailer-link" href={item.source.url} target="_blank" rel="noreferrer">View original {item.source.retailer} listing <MoveUpRight size={15}/></a>}<div className="material-tags">{item.materials.map(d=><span key={d}>{d}</span>)}</div><dl className="dimensions"><div><dt>Width</dt><dd>{cm(dims.width)}<small>cm</small></dd></div><div><dt>Depth</dt><dd>{cm(dims.depth)}<small>cm</small></dd></div><div><dt>Height</dt><dd>{cm(dims.height)}<small>cm</small></dd></div></dl>{item.dimensions_note&&<p className="dimension-note">{item.dimensions_note}</p>}<a className="primary" href={item.files.glb} download><ArrowDownToLine size={17}/>Download model <span>GLB</span></a><a className="secondary" href={item.files.blend} download><Layers size={16}/>Editable Blender scene<MoveUpRight size={15}/></a><p className="note">{item.source.photo_url?<>Reconstructed from the linked catalog photo.<br/>Photo and product design belong to IKEA.<br/>Reference checked {item.source.checked_date}.</>:<>Original Homebuddy design.<br/>An editable scene asset, not a retail product.</>}</p></aside>
 </section>
 <section className="browse"><div className="browse-heading"><h3>Furniture for the whole home</h3><span>IKEA references & original Homebuddy designs</span></div><div className="object-grid">{catalog.map((obj,i)=><button className={'object-card '+(selected===i?'active':'')} key={obj.id} aria-pressed={selected===i} onClick={()=>select(i)}><div className="thumb"><CatalogPhoto item={obj} thumbnail/><span className="card-index">{String(i+1).padStart(2,'0')}</span><span className="card-open"><MoveUpRight size={15}/></span></div><div className="card-copy"><span>{obj.category}</span><strong>{obj.name}</strong></div></button>)}</div></section>
 <footer><span>FORM / Virtual furniture catalog</span><span>IKEA references · Original Homebuddy designs · Not affiliated with IKEA</span></footer>
 </main>
}
