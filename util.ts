import {
  getAirportsMap,
  getRatingsTimes,
  getV3Data,
  haversineDistance,
  Pilot,
  Vatsim,
} from "./deps.ts";

/**
 * Query the VATSIM API for current data.
 *
 * Sort the returned list of pilots.
 */
export async function getOnlinePilots(vatsim: Vatsim): Promise<Array<Pilot>> {
  const data = await getV3Data(vatsim);
  data.pilots.sort((a, b): number => {
    const aS = a.callsign.toLowerCase();
    const bS = b.callsign.toLowerCase();
    return aS < bS ? -1 : aS > bS ? 1 : 0;
  });
  return data.pilots;
}

/**
 * Filter the list of pilots down to pilots in range of the given airport.
 */
export function filterPilotDistance(
  pilots: Array<Pilot>,
  airport: string,
  distance: number,
): Array<Pilot> {
  const airportLocation = getAirportsMap()[airport];
  if (airportLocation === undefined) {
    throw new Error(`Unsupported airport "${airport}"`);
  }
  return pilots.filter(
    (pilot) =>
      haversineDistance(
        pilot.latitude,
        pilot.longitude,
        airportLocation[0],
        airportLocation[1],
      ) <= distance,
  );
}

/**
 * Get VATSIM pilot times for the given pilots.
 *
 * Defaults to and updates the cache.
 */
export async function getTimes(
  pilots: Array<Pilot>,
  cache: Record<number, number>,
): Promise<Array<[string, string, number]>> {
  const ret: Array<[string, string, number]> = [];

  async function _do(pilot: Pilot): Promise<void> {
    const cached = cache[pilot.cid];
    let aircraftType = "???";
    if (pilot.flight_plan !== null) {
      if (pilot.flight_plan.aircraft_faa) {
        aircraftType = pilot.flight_plan.aircraft_faa;
      } else if (pilot.flight_plan.aircraft_short) {
        aircraftType = pilot.flight_plan.aircraft_short;
      }
    }
    if (cached !== undefined) {
      ret.push([pilot.callsign, aircraftType, cache[pilot.cid]]);
      return;
    }
    const ratingTimes = await getRatingsTimes(pilot.cid);
    const time = ratingTimes.pilot;
    cache[pilot.cid] = time;
    ret.push([pilot.callsign, aircraftType, time]);
  }

  await Promise.all(pilots.map((pilot) => _do(pilot)));
  return ret;
}
