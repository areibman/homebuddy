import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as T from 'three';
import { createAssembly, createViewTransition } from '../app/decorate/scene-motion.ts';
import { buildArchitecture } from '../app/decorate/architecture.ts';

const close = (a, b, message) => assert(a.distanceTo(b) < 1e-7, message);
const architecture = buildArchitecture(JSON.parse(fs.readFileSync('app/decorate/plan.json')));
architecture.cutaway(true);
architecture.root.updateMatrixWorld(true);
const pieces = [...architecture.root.children];
const original = pieces.map(o => ({ object: o, local: o.matrix.clone(), world: o.matrixWorld.clone() }));
const assembly = createAssembly(pieces.map(object => ({ object, layer: 'structure' })), new T.Vector3(3.35, 0, 4.225));
assert(assembly.active);
architecture.root.updateMatrixWorld(true);
assert(pieces.every((o, i) => o.matrixWorld.elements[13] > original[i].world.elements[13] + 3), 'all structural pieces begin raised');
assembly.update(.75);
architecture.root.updateMatrixWorld(true);
assert(pieces.some((o, i) => !o.matrixWorld.equals(original[i].world)), 'pieces are still assembling midway');
assembly.update(3);
assert(!assembly.active);
architecture.root.updateMatrixWorld(true);
for (const { object, local, world } of original) {
  assert.equal(object.parent, architecture.root, 'temporary parents are removed');
  assert(object.matrix.equals(local), 'authored local transforms are preserved exactly');
  assert(object.matrixWorld.equals(world), 'settled geometry matches its original position exactly');
}
const reduced = createAssembly(pieces.map(object => ({ object, layer: 'structure' })), new T.Vector3(), true);
assert(!reduced.active);
assert(pieces.every(o => o.parent === architecture.root), 'reduced motion skips assembly');
for (const amount of [0, .25, .5, .75, 1, .5, 0]) {
  architecture.cutaway(amount);
  for (const wall of architecture.wallMeshes) {
    assert(wall.scale.y >= 0 && wall.scale.y <= 1, 'cutaway geometry never inverts or overgrows');
  }
}
assert(architecture.wallMeshes.every(o => o.visible && o.scale.y === 1), 'full walls restored after animation');

const iso = new T.OrthographicCamera(-10.5, 10.5, 7, -7, .1, 100);
const fps = new T.PerspectiveCamera(65, 1.5, .05, 80);
const target = new T.Vector3(3.1, 0, 4.3);
iso.position.set(13, 15, 18); iso.lookAt(target); iso.zoom = 1.6; iso.updateProjectionMatrix(); iso.updateMatrixWorld(true);
fps.position.set(5.7, 1.6, 7.1); fps.rotation.order = 'YXZ'; fps.rotation.y = Math.PI / 2; fps.updateMatrixWorld(true);
const transition = createViewTransition(iso, fps, target);
const points = [target, new T.Vector3(1, .5, 1), new T.Vector3(4, 1, 7)];
const projected = camera => points.map(p => p.clone().project(camera));
const checkProjection = (a, b, message) => a.forEach((p, i) => close(p, b[i], message));
const start = projected(iso);
transition.begin('fps', 0);
checkProjection(projected(transition.camera), start, 'no projection jump when leaving isometric, including user zoom');
transition.update(575);
assert(transition.perspective > 0 && transition.perspective < 1, 'projection changes gradually');
assert(transition.camera.position.distanceTo(iso.position) > 1 && transition.camera.position.distanceTo(fps.position) > 1, 'camera moves through intermediate positions');
const midpoint = projected(transition.camera);
transition.begin('iso', 575);
checkProjection(projected(transition.camera), midpoint, 'rapid reversal starts from current view');
transition.update(1725);
assert.equal(transition.camera, iso);
checkProjection(projected(transition.camera), start, 'isometric orbit and zoom preserved');
transition.begin('fps', 2000);
transition.update(3149.99);
checkProjection(projected(transition.camera), projected(fps), 'perspective endpoint matches native camera before handoff');
transition.update(3150);
assert.equal(transition.camera, fps);
transition.begin('iso', 4000);
checkProjection(projected(transition.camera), projected(fps), 'no projection jump when leaving first person');
transition.update(4500);
transition.resize(.6);
assert(transition.camera.projectionMatrix.elements.every(Number.isFinite), 'portrait resize remains valid during transition');
transition.begin('fps', 4500, true);
assert(!transition.active);
assert.equal(transition.camera, fps, 'reduced motion switches immediately');
console.log('PASS: raised assembly, exact geometry restoration, reduced motion, continuous cutaway, camera projection endpoints, retained zoom, rapid reversal, and portrait resize.');
