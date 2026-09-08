import fs from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildArchitecture} from '../app/decorate/architecture.ts';
// GLTFExporter only needs these FileReader methods for its in-memory binary buffers.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});} readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}};
const plan=JSON.parse(await fs.readFile('app/decorate/plan.json','utf8'));
const architecture=buildArchitecture(plan);const {root}=architecture;if(process.argv.includes('--cutaway'))architecture.cutaway(true);root.updateMatrixWorld(true);
const glb=await new GLTFExporter().parseAsync(root,{binary:true});
await fs.writeFile(process.argv.includes('--cutaway')?'/tmp/homebuddy-architecture-cutaway.glb':'public/plans/spera-architecture.glb',Buffer.from(glb));
console.log(`Exported shared architecture: ${glb.byteLength} bytes`);
