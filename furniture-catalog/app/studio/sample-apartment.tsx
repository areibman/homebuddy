'use client';

import { RoomEditor } from '../decorate/page';
import { homeDefinitions } from '../decorate/home-definitions';

export function SampleApartment() {
  return <RoomEditor home={homeDefinitions['15']} />;
}
