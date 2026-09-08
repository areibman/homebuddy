import fs from 'node:fs/promises';
await fs.mkdir('additional-floor-plans',{recursive:true});
const rows=[
 {name:'Towers at Rincon - Pier 39 studio',beds:0,baths:1,sqft:300,source:'https://www.thetowersatrincon.com/floorplans',urls:['https://resource.rentcafe.com/image/upload/q_auto,f_auto,c_limit,w_1800,h_1800/s3/2/92369/pier39_towers%20at%20rincon.jpg'],note:'Building plan type, not a specific unit.'},
 {name:'Spera - Plan E',beds:1,baths:1,sqft:503,source:'https://www.sperasf.com/floor-plans/',urls:['https://cdngeneralcf.rentcafe.com/dmslivecafe/2/142604/SPERA_E.jpg'],note:'Building plan type, not a specific unit.'},
 {name:'88 Arkansas Street Unit 526',beds:0,baths:1,sqft:null,source:'https://88atthepark.com/floor-plans/',urls:['https://88atthepark.com/wp-content/uploads/2021/05/unit-526-2.pdf']},
 {name:'333 Bush Street Unit 4101',beds:2,baths:2,sqft:1250,source:'https://333bush4101.com/',cache:'333bush4101.com.md'},
 {name:'3749 17th Street Unit A',beds:null,baths:null,sqft:1375,source:'https://soldedoloressky.com/',cache:'soldedoloressky.com.md'},
 {name:'370 Church Street Unit E',beds:2,baths:2,sqft:null,source:'https://www.2levelcondo.com/',urls:['https://openhomesphotography.box.com/shared/static/nke2ypwnlz9h7kuceiodajlij02x1lyf.jpeg','https://openhomesphotography.box.com/shared/static/pq3anlgfb30msa9wzbdp79qwe7qrv5l0.jpg']},
 {name:'1159 Green Street Unit 1',beds:null,baths:null,sqft:1520,source:'https://homeongreen.com/',urls:['https://openhomesphotography.box.com/shared/static/cc3he0g8e801uhw9c4put3jnqvbomt2p.pdf'],note:'854 sq ft upstairs plus 666 sq ft downstairs per property site.'},
 {name:'1422 Rhode Island Street',beds:4,baths:3.5,sqft:2244,source:'https://www.homeinpotrero.com/',cache:'homeinpotrero.com.md'},
 {name:'842 35th Avenue',beds:4,baths:2,sqft:2380,source:'https://websites.open.homes/site/1ef286d7-51c8-6c4c-b653-02ffe917ffb9',cache:'websites.open.homes-site-1ef286d7-51c8-6c4c-b653-02ffe917ffb9.md'}
];
for(const r of rows){
 if(r.cache){const md=await fs.readFile(`.firecrawl/${r.cache}`,'utf8');
 const pdfs=[...new Set(md.match(/https:\/\/cdn\.openhomesphotography\.com\/[^\s)"]+\.pdf/g)||[])];
 const images=[...md.matchAll(/!\[Floor plan\]\((https[^\s)]+)\)/g)].map(m=>m[1]);
 r.urls=pdfs.length?[pdfs[0]]:images.slice(0,1);
 }
 r.files=[];
 for(const [i,url] of r.urls.entries()){
 const response=await fetch(url);if(!response.ok)throw new Error(`${r.name}: ${response.status}`);
 const data=Buffer.from(await response.arrayBuffer());
 const ext=data.subarray(0,4).toString()==='%PDF'?'pdf':data[0]===137?'png':data[0]===255?'jpg':'webp';
 const file=`${r.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${i+1}.${ext}`;
 await fs.writeFile(`additional-floor-plans/${file}`,data);r.files.push({file,url});console.log(r.name,file,data.length);
 }
}
await fs.writeFile('additional-floor-plans/manifest.json',JSON.stringify(rows,null,2));
