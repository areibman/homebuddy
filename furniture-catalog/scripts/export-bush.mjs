import fs from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildArchitecture} from '../app/decorate/architecture.ts';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();});}};
const plan=JSON.parse(await fs.readFile('app/decorate/homes/bush-4101/plan.json','utf8'));
const architecture=buildArchitecture(plan);architecture.root.updateMatrixWorld(true);
const glb=await new GLTFExporter().parseAsync(architecture.root,{binary:true});await fs.writeFile('public/plans/bush-4101-architecture.glb',Buffer.from(glb));
console.log('Shared architecture exported',glb.byteLength);

architecture.cutaway(true);architecture.root.updateMatrixWorld(true);const cutaway=await new GLTFExporter().parseAsync(architecture.root,{binary:true});await fs.writeFile('public/plans/bush-4101-cutaway.glb',Buffer.from(cutaway));
