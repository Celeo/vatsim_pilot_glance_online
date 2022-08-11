import { AIRPORTS } from "./airports.ts";

export interface StatusData {
  v3: Array<string>;
}

export interface Status {
  data: StatusData;
}

export interface FlightPlan {
  aircraft_faa: string;
  aircraft_short: string;
}

export interface Pilot {
  cid: number;
  name: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  transponder: string;
  flight_plan: FlightPlan | null;
  logon_time: string;
}

export interface V3ResponseData {
  pilots: Array<Pilot>;
}

export interface RatingsData {
  pilot: number;
}

/**
 * Get the VATSIM live V3 URL.
 */
export async function getV3Url(): Promise<string> {
  const response = await fetch("https://status.vatsim.net/status.json");
  if (response.status !== 200) {
    throw new Error(`Got status ${response.status} from status URL`);
  }
  const data = await response.json();
  const urls: Array<string> = data["data"]["v3"];
  return urls[Math.floor(Math.random() * urls.length)];
}

/**
 * Query the VATSIM API for current data.
 */
export async function getOnlinePilots(v3Url: string): Promise<Array<Pilot>> {
  const response = await fetch(v3Url);
  const data: V3ResponseData = await response.json();
  data.pilots.sort((a, b): number => {
    const aS = a.callsign.toLowerCase();
    const bS = b.callsign.toLowerCase();
    return aS < bS ? -1 : aS > bS ? 1 : 0;
  });
  return data.pilots;
}

/**
 * Get a VATSIM user's total time piloting on the network.
 */
export async function getPilotTime(cid: number): Promise<number> {
  const response = await fetch(
    `https://api.vatsim.net/api/ratings/${cid}/rating_times`
  );
  const data: RatingsData = await response.json();
  return data.pilot;
}

/**
 * Calculate the Haversine Distance between two (lat & long) points.
 *
 * <https://www.movable-type.co.uk/scripts/latlong.html>
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 0.00054);
}

/**
 * Filter the list of pilots down to pilots in range of the given airport.
 */
export function filterPilotDistance(
  pilots: Array<Pilot>,
  airport: string,
  distance: number
): Array<Pilot> {
  const airportLocation = AIRPORTS[airport];
  if (airportLocation === undefined) {
    throw new Error(`Unsupported airport "${airport}"`);
  }
  return pilots.filter(
    (pilot) =>
      haversineDistance(
        pilot.latitude,
        pilot.longitude,
        airportLocation[0],
        airportLocation[1]
      ) <= distance
  );
}

/**
 * Get VATSIM pilot times for the given pilots.
 *
 * Defaults to and updates the cache.
 */
export async function getTimes(
  pilots: Array<Pilot>,
  cache: Record<number, number>
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
    const time = await getPilotTime(pilot.cid);
    cache[pilot.cid] = time;
    ret.push([pilot.callsign, aircraftType, time]);
  }

  await Promise.all(pilots.map((pilot) => _do(pilot)));
  return ret;
}
