export { createAircraftMesh, buildPropPlane, buildJet, buildHelicopter } from "./meshes.js";
export { FlightModel, AIRCRAFT } from "./flight.js";

import { createAircraftMesh } from "./meshes.js";

export function createAirplane() {
  return createAircraftMesh("prop");
}
