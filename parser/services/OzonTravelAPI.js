/**
 * Ozon Travel API Service
 * Дополнительный источник данных для российских рейсов
 */

import { isRussianCity } from '../utils/russianCities.js';

const API_BASE = 'https://api.ozon.travel';

/**
 * Получить цены на авиабилеты через Ozon Travel
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

    // Ozon Travel API требует партнерский ключ
    const API_KEY = process.env.OZON_API_KEY || 'your_ozon_api_key';
    
    const url = `${API_BASE}/flights/search/?apikey=${API_KEY}&origin=${origin}&destination=${destination}&departure_date=${date}`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Ozon API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.offers || data.offers.length === 0) {
      return [];
    }
    
    // Конвертируем данные в формат Flight модели
    return data.offers.map(offer => ({
      origin: offer.origin,
      destination: offer.destination,
      price: offer.price || 0,
      airline: offer.airline || 'Unknown',
      departureDate: new Date(offer.departureDate),
      source: 'ozon_travel_api',
      flightNumber: offer.flightNumber || null,
      bookingUrl: `https://www.ozon.ru/travel/flights/?origin=${origin}&destination=${destination}&date=${date}`
    }));
    
  } catch (error) {
    console.error('Ozon API request failed:', error.message);
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
