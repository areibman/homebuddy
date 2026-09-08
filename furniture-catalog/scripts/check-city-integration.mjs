import assert from 'node:assert/strict';

// Exercise rendered routes without requiring a browser or WebGL.
const base = process.env.HOMEBUDDY_URL || 'http://localhost:3000';
async function render(path) {
 const response = await fetch(new URL(path, base));
 assert.equal(response.status, 200, path + ' renders successfully');
 return response.text();
}
const city = await render('/');
assert.equal((city.match(/<button[^>]*class="list-home"[^>]*disabled/g) || []).length, 19, 'Incomplete homes are disabled');
assert.equal((city.match(/href="\/decorate\?home=13"/g) || []).length, 1, 'Spera links directly to its playable interior');
assert(!/href="\/decorate\?home=(?!13)/.test(city), 'Incomplete homes have no editor links');
assert(city.includes('San Francisco street map'), 'Street map container renders');
const unavailable = await render('/decorate?home=01');
assert(unavailable.includes('This home isn’t playable yet'), 'Old deep links cannot open incomplete homes');
assert(!unavailable.includes('plan-editor-nav'), 'The image editor is no longer offered as an explorable home');
const playable = await render('/decorate?home=13');
assert(playable.includes('room-canvas'), 'Playable home renders the 3D editor');
const unknown = await render('/decorate?home=missing');
assert(unknown.includes('Home not found'), 'Unknown homes retain their not-found state');
const catalog = await render('/catalog');
assert(catalog.includes('object-grid'), 'Furniture library remains available');
console.log('PASS: street map route, 19 disabled homes, direct Spera entry, guarded deep links, and furniture library.');
