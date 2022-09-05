import {
  getAirportsMap,
  getRatingsTimes,
  getV3Data,
  haversineDistance,
  Pilot,
  Vatsim,
} from "./deps.ts";

/**
 * cache invalidation timeout.
 *
 * 1 hour.
 */
const CACHE_INVALIDATION_TIME = 60 * 60 * 1000;

/**
 * Cache for storing pilot information.
 */
export class TimeCache {
  entries: Record<number, {
    value: number;
    expires: number;
  }>;

  constructor() {
    this.entries = {};
  }

  /**
   * Check if the pilot's time is cached.
   */
  get(cid: number): number | null {
    const entry = this.entries[cid];
    if (entry === undefined) {
      return null;
    }
    if (entry.expires < new Date().getTime()) {
      delete this.entries[cid];
      return null;
    }
    return entry.value;
  }

  /**
   * Store a pilot's time in the cache.
   */
  set(cid: number, value: number): void {
    this.entries[cid] = {
      value,
      expires: new Date().getTime() + CACHE_INVALIDATION_TIME,
    };
  }
}

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
  cache: TimeCache,
): Promise<Array<[string, string, number]>> {
  const ret: Array<[string, string, number]> = [];

  async function _do(pilot: Pilot): Promise<void> {
    let aircraftType = "???";
    if (pilot.flight_plan !== null) {
      if (pilot.flight_plan.aircraft_faa) {
        aircraftType = pilot.flight_plan.aircraft_faa;
      } else if (pilot.flight_plan.aircraft_short) {
        aircraftType = pilot.flight_plan.aircraft_short;
      }
    }
    const cached = cache.get(pilot.cid);
    if (cached !== null) {
      ret.push([pilot.callsign, aircraftType, cached]);
      return;
    }
    const ratingTimes = await getRatingsTimes(pilot.cid);
    const time = ratingTimes.pilot;
    cache.set(pilot.cid, time);
    ret.push([pilot.callsign, aircraftType, time]);
  }

  await Promise.all(pilots.map((pilot) => _do(pilot)));
  return ret;
}
