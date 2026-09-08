import assert from 'node:assert/strict';
import {interactionAction,rightClickAction,snappedRotation} from '../app/decorate/interaction-shortcuts.ts';
for(const placing of [false,true])for(const selected of [false,true])assert.equal(interactionAction('E',placing,selected),'inventory');
assert.equal(interactionAction('Enter',true,false),'place');
assert.equal(rightClickAction(false,true),'details');
assert.equal(rightClickAction(true,false),'details');
assert.equal(rightClickAction(false,false),null);
assert.equal(interactionAction('Delete',false,false),null);
assert.equal(interactionAction('Delete',false,true),'remove');
for(const key of ['Delete','Backspace']){
 for(const selected of [false,true])assert.equal(interactionAction(key,true,selected),'remove','carried furniture can be deleted without a details selection');
 assert.equal(interactionAction(key,false,true),'remove','hovered furniture can be deleted');
 assert.equal(interactionAction(key,false,false),null);
}
assert.equal(interactionAction('Escape',true,true),'cancel');
assert.equal(interactionAction('Escape',false,false,true),null,'hover cannot consume Escape and trap mouse look');
assert.equal(interactionAction('Delete',false,false,true),'remove');
const rad=degrees=>degrees*Math.PI/180;
const near=(actual,degrees)=>assert(Math.abs(actual-rad(degrees))<1e-9,`expected ${degrees}°, got ${actual*180/Math.PI}°`);
near(snappedRotation(0,'r'),15);
near(snappedRotation(0,'q'),345);
near(snappedRotation(rad(7),'q'),0);
near(snappedRotation(rad(7),'r'),15);
near(snappedRotation(rad(-7),'q'),345);
near(snappedRotation(rad(-7),'r'),0);
near(snappedRotation(rad(15),'r',true),90);
near(snappedRotation(rad(105),'q',true),90);
near(snappedRotation(rad(270),'r',true),0);
near(snappedRotation(3.14159,'r'),195);
near(snappedRotation(3.14159,'q'),165);
let angle=0;
for(let i=0;i<24;i++){angle=snappedRotation(angle,'r');if((i+1)%6===0)near(angle,((i+1)*15)%360);}
near(angle,0);
for(let i=0;i<2400;i++)angle=snappedRotation(angle,'q');
near(angle,0);
console.log('PASS: inventory/deletion/cancel shortcuts; 15° stops, exact cardinal angles, 90° shortcuts, imported off-grid angles, and wraparound without drift.');
