import fs from 'node:fs/promises';
const path='additional-floor-plans/manifest.json';
const rows=JSON.parse(await fs.readFile(path,'utf8'));
for(const r of rows){
 if(r.name.includes('526'))r.sqft=462;
 if(r.name.startsWith('3749')){r.beds=3;r.baths=2;}
 if(r.name.startsWith('1159')){r.beds=3;r.baths=2;r.note='Plan depicts 3 bedroom labels and 2 baths across both levels. The property site describes the 666 sq ft lower level as an unwarranted bonus apartment; upper level is 854 sq ft. Do not treat this as confirmation of permitted bedrooms or dwelling units.';}
 if(r.name.startsWith('370'))r.note='Includes 2D and furnished 3D layouts. No verified floor area. The 3D drawing is illustrative, not to scale or based on actual measurements.';
 r.verified='Downloaded and visually inspected September 8, 2026; legible room layout and matching source property or plan type.';
}
await fs.writeFile(path,JSON.stringify(rows,null,2));
const md=`# Nine additional San Francisco floor plans\n\nNine distinct locations, none duplicated from the previous collection. Ten source files: four PDFs and six images (Church Street includes both 2D and 3D versions). Downloaded and visually checked September 8, 2026.\n\nAreas below are approximate source-reported living areas, not independently measured. These are marketing floor plans, not certified architectural or permit drawings. Current rental/sale availability was not evaluated.\n\n| Property or plan type | Beds / baths | Sq ft | Download |\n| --- | --- | ---: | --- |\n${rows.map(r=>`| [${r.name}](${r.source}) | ${r.beds===0?'Studio':r.beds} / ${r.baths} | ${r.sqft?.toLocaleString('en-US')||'Not stated'} | ${r.files.map((f,i)=>`[Plan ${i+1}](${f.file})`).join(', ')} |`).join('\n')}\n\n## Source Notes\n\n${rows.filter(r=>r.note).map(r=>`- **${r.name}:** ${r.note}`).join('\n')}\n\nAll original download URLs are retained in manifest.json.\n`;
await fs.writeFile('additional-floor-plans/README.md',md);
console.log({properties:rows.length,files:rows.reduce((n,r)=>n+r.files.length,0)});
