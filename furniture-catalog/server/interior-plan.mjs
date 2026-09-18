const fixtureTypes = new Set(['closet-interior', 'microwave', 'shelving', 'closet', 'walk-in-closet', 'laundry', 'toilet', 'vanity', 'bathtub', 'shower', 'stove', 'dishwasher', 'sink', 'cabinet', 'refrigerator']);

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

function point(value, label) {
  if (!Array.isArray(value) || value.length < 2) throw new Error(`${label} is incomplete.`);
  finite(value[0], label);
  finite(value[1], label);
}

/** Reject a generated or uploaded plan that the existing editor cannot walk. */
export function validateInteriorPlan(plan, { requireSpawn = false } = {}) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) throw new Error('Interior plan is missing.');
  if (typeof plan.name !== 'string' || !plan.name.trim() || plan.name.length > 120) throw new Error('Interior plan needs a name.');
  finite(plan.height, 'Ceiling height');
  if (plan.height < 2 || plan.height > 6) throw new Error('Ceiling height is not a believable room height.');
  if (!Array.isArray(plan.footprint) || plan.footprint.length < 3) throw new Error('Interior plan needs a footprint.');
  plan.footprint.forEach((corner, index) => point(corner, `Footprint point ${index + 1}`));
  if (!Array.isArray(plan.floors) || !plan.floors.length) throw new Error('Interior plan needs floors.');
  for (const [index, floor] of plan.floors.entries()) {
    if (!Array.isArray(floor) || floor.length < 4) throw new Error(`Floor ${index + 1} is incomplete.`);
    floor.slice(0, 4).forEach((n, i) => finite(n, `Floor ${index + 1} value ${i + 1}`));
    if (floor[2] <= 0 || floor[3] <= 0) throw new Error(`Floor ${index + 1} has no area.`);
  }
  if (!Array.isArray(plan.walls) || !plan.walls.length) throw new Error('Interior plan needs walls.');
  for (const [index, wall] of plan.walls.entries()) {
    if (!Array.isArray(wall) || wall.length < 4) throw new Error(`Wall ${index + 1} is incomplete.`);
    wall.slice(0, 4).forEach((n, i) => finite(n, `Wall ${index + 1}`));
  }
  if (!Array.isArray(plan.fixtures)) throw new Error('Interior plan needs a fixtures list.');
  for (const [index, fixture] of plan.fixtures.entries()) {
    if (!fixture || typeof fixture !== 'object' || !fixtureTypes.has(fixture.type)) throw new Error(`Fixture ${index + 1} is not a known fitting.`);
    for (const key of ['x', 'z', 'width', 'depth', 'height']) finite(fixture[key], `Fixture ${index + 1} ${key}`);
    if (fixture.width <= 0 || fixture.depth <= 0 || fixture.height <= 0) throw new Error(`Fixture ${index + 1} has no size.`);
  }
  if (!Array.isArray(plan.doors)) throw new Error('Interior plan needs a doors list.');
  for (const [index, door] of plan.doors.entries()) {
    if (!door || typeof door !== 'object') throw new Error(`Door ${index + 1} is incomplete.`);
    for (const key of ['x', 'z', 'width', 'rotation', 'swing']) finite(door[key], `Door ${index + 1} ${key}`);
    if (door.width <= 0 || door.width > 4) throw new Error(`Door ${index + 1} width is not usable.`);
  }
  if (requireSpawn || plan.spawn != null) point(plan.spawn, 'Spawn');
  if (!Array.isArray(plan.furniture)) plan.furniture = [];
  for (const piece of plan.furniture) {
    if (!piece || typeof piece.id !== 'string' || !piece.id) throw new Error('A furniture placement is missing its catalog id.');
    finite(piece.x, 'Furniture x');
    finite(piece.z, 'Furniture z');
    finite(piece.r, 'Furniture rotation');
  }
  return plan;
}
