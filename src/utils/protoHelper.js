import protobuf from 'protobufjs';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const protoPath = path.resolve(__dirname, '../../proto/flight.proto');

let FlightMessage, FlightListMessage;

async function loadProto() {
  const root = await protobuf.load(protoPath);
  FlightMessage = root.lookupType('Flight');
  FlightListMessage = root.lookupType('FlightList');
}

/**
 * Encodes an array of flight objects into a binary Protobuf buffer.
 * @param {Array<{
 *   flightNumber: string,
 *   airline: string,
 *   price: number,
 *   origin: string,
 *   destination: string,
 *   departureDate: string,
 *   source: string
 * }>} flights
 * @returns {Promise<Buffer>}
 */
export async function encodeFlights(flights) {
  if (!FlightListMessage) await loadProto();

  const payload = { flights };
  const errMsg = FlightListMessage.verify(payload);
  if (errMsg) throw new Error(`Protobuf verification failed: ${errMsg}`);

  const message = FlightListMessage.create(payload);
  return FlightListMessage.encode(message).finish();
}
