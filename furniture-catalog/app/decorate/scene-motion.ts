import * as T from 'three';

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export type AssemblyPiece = { object: T.Object3D; layer: 'floor' | 'structure' | 'furniture' };

/** Animate whole pieces on temporary parents, preserving their geometry and local transforms. */
export function createAssembly(pieces: AssemblyPiece[], center: T.Vector3, reducedMotion = false) {
  const order = { floor: 0, structure: 0, furniture: 0 };
  const tracks = reducedMotion ? [] : pieces.map(({ object, layer }) => {
    const parent = object.parent!;
    parent.updateWorldMatrix(true, true);
    const pivot = parent.worldToLocal(new T.Box3().setFromObject(object).getCenter(new T.Vector3()));
    const origin = parent.worldToLocal(center.clone());
    const index = order[layer]++;
    const variation = (Math.sin(index * 12.9898 + 4.3) + 1) / 2;
    const floor = layer === 'floor';
    const offset = pivot.clone().sub(origin).setY(0).multiplyScalar(floor ? .18 : .32);
    offset.y = (floor ? 1.8 : layer === 'structure' ? 3.2 : 4.2) + variation * 1.3;
    const rotation = new T.Quaternion().setFromEuler(new T.Euler(
      floor ? 0 : (variation - .5) * .14,
      floor ? 0 : (variation - .5) * .28,
      floor ? 0 : (variation - .5) * .12,
    ));
    const wrapper = new T.Group();
    wrapper.name = 'Assembly motion';
    parent.add(wrapper);
    wrapper.add(object);
    return { object, parent, wrapper, pivot, offset, rotation,
      delay: floor ? index * .065 : layer === 'structure' ? .22 + index * .009 : .68 + index * .055,
      duration: floor ? .95 : 1.15, bounce: floor ? .025 : .065 };
  });
  let active = tracks.length > 0;
  const identity = new T.Quaternion();
  function finish() {
    if (!active) return;
    for (const { object, parent, wrapper } of tracks) {
      parent.add(object);
      wrapper.removeFromParent();
    }
    active = false;
  }
  function update(elapsed: number) {
    if (!active) return;
    let complete = true;
    for (const track of tracks) {
      const t = T.MathUtils.clamp((elapsed - track.delay) / track.duration, 0, 1);
      complete &&= t === 1;
      const remaining = 1 - smooth(t);
      track.wrapper.quaternion.slerpQuaternions(identity, track.rotation, remaining);
      // Rotate about the piece's center while its authored transform stays untouched.
      track.wrapper.position.copy(track.pivot).applyQuaternion(track.wrapper.quaternion).negate()
        .add(track.pivot).addScaledVector(track.offset, remaining);
      const settle = T.MathUtils.clamp((t - .78) / .22, 0, 1);
      track.wrapper.position.y += Math.sin(settle * Math.PI) ** 2 * track.bounce;
    }
    if (complete) finish();
  }
  update(0);
  return { get active() { return active; }, update, finish };
}

type View = {
  position: T.Vector3; quaternion: T.Quaternion;
  perspective: number; halfHeight: number; focusDistance: number; near: number; far: number;
};

/** A continuous projection: orthographic at 0, perspective at 1, with matching endpoints. */
function project(camera: T.Camera, view: View, aspect: number) {
  const { perspective: p, focusDistance: d, halfHeight: h, near: n, far: f } = view;
  const wn = 1 - p + p * n / d, wf = 1 - p + p * f / d;
  const depth = -(wf + wn) / (f - n);
  camera.projectionMatrix.set(1 / (h * aspect), 0, 0, 0, 0, 1 / h, 0, 0,
    0, 0, depth, -wn + n * depth, 0, 0, -p / d, 1 - p);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.position.copy(view.position);
  camera.quaternion.copy(view.quaternion);
  camera.updateMatrixWorld(true);
}

export function createViewTransition(iso: T.OrthographicCamera, fps: T.PerspectiveCamera, target: T.Vector3) {
  const bridge = new T.Camera();
  let camera: T.Camera = iso, destination: T.Camera = iso;
  let from: View, to: View, current: View;
  let started = 0, active = false, aspect = fps.aspect;
  function snapshot(camera: T.Camera): View {
    if (camera === bridge) return { ...current, position: current.position.clone(), quaternion: current.quaternion.clone() };
    const perspective = camera === fps ? 1 : 0;
    const focusDistance = perspective ? 3 : Math.max(.1, iso.position.distanceTo(target));
    return { position: camera.position.clone(), quaternion: camera.quaternion.clone(), perspective, focusDistance,
      halfHeight: perspective ? Math.tan(T.MathUtils.degToRad(fps.getEffectiveFOV()) / 2) * focusDistance : (iso.top - iso.bottom) / (2 * iso.zoom),
      near: perspective ? fps.near : iso.near, far: perspective ? fps.far : iso.far };
  }
  function update(now: number) {
    if (!active) return;
    const t = T.MathUtils.clamp((now - started) / 1150, 0, 1), eased = smooth(t);
    current = { position: from.position.clone().lerp(to.position, eased), quaternion: from.quaternion.clone().slerp(to.quaternion, eased),
      perspective: T.MathUtils.lerp(from.perspective, to.perspective, eased),
      halfHeight: T.MathUtils.lerp(from.halfHeight, to.halfHeight, eased),
      focusDistance: T.MathUtils.lerp(from.focusDistance, to.focusDistance, eased),
      near: T.MathUtils.lerp(from.near, to.near, eased), far: T.MathUtils.lerp(from.far, to.far, eased) };
    project(bridge, current, aspect);
    if (t === 1) { camera = destination; active = false; }
  }
  return {
    get camera() { return camera; },
    get active() { return active; },
    get perspective() { return active ? current.perspective : camera === fps ? 1 : 0; },
    begin(next: 'iso' | 'fps', now: number, reducedMotion = false) {
      update(now);
      destination = next === 'fps' ? fps : iso;
      if (reducedMotion) { camera = destination; active = false; return; }
      from = snapshot(camera); to = snapshot(destination); started = now;
      current = from; active = true; camera = bridge; update(now);
    },
    resize(nextAspect: number) { aspect = nextAspect; if (active) project(bridge, current, aspect); },
    update,
  };
}
