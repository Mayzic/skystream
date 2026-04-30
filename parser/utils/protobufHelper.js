import protobuf from 'protobufjs';
import path from 'path';
import fs from 'fs';

/**
 * Helper для работы с Protobuf
 * Сериализует данные перед передачей в Analytics сервис
 */
class ProtobufHelper {
  constructor() {
    this.protoPath = path.join(process.cwd(), 'proto', 'flight.proto');
    this.root = null;
    this.Flight = null;
  }

  /**
   * Загрузка .proto файла
   */
  async loadProto() {
    try {
      this.root = await protobuf.load(this.protoPath);
      this.Flight = this.root.lookupType('Flight');
      return true;
    } catch (error) {
      console.error('Ошибка загрузки .proto файла:', error);
      return false;
    }
  }

  /**
   * Кодирование данных в Protobuf
   */
  encode(data) {
    if (!this.Flight) {
      throw new Error('Protobuf не загружен. Вызовите loadProto() сначала.');
    }

    try {
      // Создаем сообщение
      const message = this.Flight.create({
        flight_number: data.flight_number,
        airline: data.airline,
        price: data.price,
        departure_date: data.departure_date ? data.departure_date.toISOString() : new Date().toISOString(),
        origin: data.origin,
        destination: data.destination,
        is_with_baggage: data.is_with_baggage || false,
        source: data.source,
        booking_url: data.booking_url || ''
      });

      // Кодируем в бинарный формат
      const buffer = this.Flight.encode(message).finish();
      
      return buffer;
    } catch (error) {
      console.error('Ошибка кодирования Protobuf:', error);
      throw error;
    }
  }

  /**
   * Декодирование данных из Protobuf
   */
  decode(buffer) {
    if (!this.Flight) {
      throw new Error('Protobuf не загружен. Вызовите loadProto() сначала.');
    }

    try {
      const message = this.Flight.decode(buffer);
      const object = this.Flight.toObject(message);
      return object;
    } catch (error) {
      console.error('Ошибка декодирования Protobuf:', error);
      throw error;
    }
  }

  /**
   * Кодирование массива рейсов
   */
  encodeArray(flights) {
    return flights.map(flight => this.encode(flight));
  }

  /**
   * Декодирование массива рейсов
   */
  decodeArray(buffers) {
    return buffers.map(buffer => this.decode(buffer));
  }

  /**
   * Проверка валидности данных перед кодированием
   */
  validate(data) {
    const required = ['flight_number', 'airline', 'price', 'origin', 'destination'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Обязательное поле отсутствует: ${field}`);
      }
    }

    if (data.price < 1000 || data.price > 100000) {
      throw new Error('Цена вне допустимого диапазона (1000-100000)');
    }

    return true;
  }
}

export default new ProtobufHelper();
