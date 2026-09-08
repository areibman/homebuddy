import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const root=new URL('../',import.meta.url).pathname;
const parent=new URL('../../',import.meta.url).pathname;
const dest=root+'public/plans/';await fs.mkdir(dest,{recursive:true});
const first=JSON.parse(await fs.readFile(parent+'floor-plans/manifest.json','utf8')).filter(r=>r.files.length);
const extra=JSON.parse(await fs.readFile(parent+'additional-floor-plans/manifest.json','utf8'));
const values=[
 ['Bernal Heights',5,9,3,2,1385],['Pacific Heights',-2,-7,4,2.5,2692],['Outer Sunset',-9,8,3,2,1368],['Haight-Ashbury',-3,-1,2,1.5,1220],['Cole Valley',-4,2,3,1.5,1474],['Inner Sunset',-6,4,5,4,3114],['Inner Sunset',-5,1,2,2,1890],['West Portal',-5,10,4,3.5,3251],['Noe Valley',2,9,2,1,null],['Nob Hill',4,-7,3,2,1884],['Potrero Hill',9,7,4,3.5,2349],
 ['Rincon Hill',10,-6,0,1,300],['SoMa',9,-3,1,1,503],['Potrero Hill',9,3,0,1,462],['Financial District',8,-8,2,2,1250],['Mission Dolores',3,3,3,2,1375],['Castro',1,3,2,2,null],['Russian Hill',3,-10,3,2,1520],['Potrero Hill',9,10,4,3.5,2244],['Outer Richmond',-9,-3,4,2,2380]
];
const all=[];
for(const [i,r] of [...first,...extra].entries()){
 const isExtra=i>=first.length;const [area,x,z,beds,baths,sqft]=values[i];const previews=[];
 let files=r.files;
 if(!isExtra&&r.address==='2751 15th Ave')files=files.slice(0,1);
 if(isExtra&&r.name.startsWith('370 Church'))files=[files[1],files[0]];
 for(const f of files){
  const src=parent+(isExtra?'additional-floor-plans/':'floor-plans/')+f.file;
  if(f.file.endsWith('.pdf')){
   const base=f.file.replace('.pdf','');execFileSync('pdftoppm',['-scale-to','1800','-jpeg','-singlefile',src,dest+base]);previews.push('/plans/'+base+'.jpg');
  }else{await fs.copyFile(src,dest+f.file);previews.push('/plans/'+f.file);}
 }
 all.push({id:String(i+1).padStart(2,'0'),name:r.address||r.name,area,x,z,beds,baths,sqft,images:previews,source:files[0].source||r.source,note:r.notes||r.note||'',kind:beds===0?'Studio':beds<=2?'Apartment':'Large home'});
}
await fs.writeFile(root+'app/homes.json',JSON.stringify(all,null,2));
console.log('Prepared',all.length,'homes');
