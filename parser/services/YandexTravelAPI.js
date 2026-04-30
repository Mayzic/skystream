/**
 * Яндекс.Путешествия API Service
 * Дополнительный источник данных для российских рейсов
 */

import { isRussianCity } from '../utils/russianCities.js';

const API_BASE = 'https://api.rasp.yandex.net/v3.0';

/**
 * Получить цены на авиабилеты через Яндекс.Путешествия
 * @param {string} origin - IATA код города вылета
 * @param {string} destination - IATA код города прилета
 * @param {string} date - Дата вылета в формате YYYY-MM-DD
 * @returns {Promise<Array>} Массив найденных рейсов
 */
async function getPricesForDate(origin, destination, date) {
  try {
    // Проверяем, что оба города российские
    if (!isRussianCity(origin) || !isRussianCity(destination)) {
      console.log(`Пропуск: ${origin} → ${destination} (не российские города)`);
      return [];
    }

    // Яндекс API требует API ключ
    const API_KEY = process.env.YANDEX_API_KEY || 'your_yandex_api_key';
    
    const url = `${API_BASE}/search/?apikey=${API_KEY}&format=json&from=${origin}&to=${destination}&date=${date}&transport_types=plane`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Yandex API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.segments || data.segments.length === 0) {
      return [];
    }
    
    // Конвертируем данные в формат Flight модели
    return data.segments.map(segment => ({
      origin: segment.from,
      destination: segment.to,
      price: segment.price || 0,
      airline: segment.carrier?.title || 'Unknown',
      departureDate: new Date(segment.departure),
      source: 'yandex_travel_api',
      flightNumber: segment.thread?.number || null,
      bookingUrl: `https://travel.yandex.ru/avia/search/?from=${origin}&to=${destination}&date=${date}`
    }));
    
  } catch (error) {
    console.error('Yandex API request failed:', error.message);
    return [];
  }
}

/**
 * Получить самые дешевые билеты
 * @param {string} origin - IATA код города вылета
 * @param {string} destination - IATA код города прилета
 * @param {number} limit - Количество результатов
 * @returns {Promise<Array>} Массив самых дешевых рейсов
 */
async function getCheapestFlights(origin, destination, limit = 10) {
  const flights = await getPricesForDate(origin, destination, new Date().toISOString().split('T')[0]);
  return flights.sort((a, b) => a.price - b.price).slice(0, limit);
}

export default {
  getPricesForDate,
  getCheapestFlights
};
