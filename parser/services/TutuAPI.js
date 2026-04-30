/**
 * Tutu.ru API Service
 * Дополнительный источник данных для российских рейсов
 */

import { isRussianCity } from '../utils/russianCities.js';

const API_BASE = 'https://api.tutu.ru';

/**
 * Получить цены на авиабилеты через Tutu.ru
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

    // Tutu.ru API требует партнерский ключ
    const API_KEY = process.env.TUTU_API_KEY || 'your_tutu_api_key';
    
    const url = `${API_BASE}/avia/search/?apikey=${API_KEY}&from=${origin}&to=${destination}&date=${date}`;
    
    const response = await fetch(url);
    
    if (response.status !== 200) {
      console.error(`Tutu API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.flights || data.flights.length === 0) {
      return [];
    }
    
    // Конвертируем данные в формат Flight модели
    return data.flights.map(flight => ({
      origin: flight.origin,
      destination: flight.destination,
      price: flight.price || 0,
      airline: flight.airline || 'Unknown',
      departureDate: new Date(flight.departureDate),
      source: 'tutu_api',
      flightNumber: flight.flightNumber || null,
      bookingUrl: `https://www.tutu.ru/avia/search/?from=${origin}&to=${destination}&date=${date}`
    }));
    
  } catch (error) {
    console.error('Tutu API request failed:', error.message);
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
