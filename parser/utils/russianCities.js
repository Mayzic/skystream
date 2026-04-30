/**
 * Список российских IATA кодов городов
 * Используется для фильтрации рейсов только по России
 */

export const RUSSIAN_IATA_CODES = new Set([
  // Москва и область
  'MOW', 'SVO', 'DME', 'VKO', 'ZIA',
  
  // Санкт-Петербург
  'LED',
  
  // Центральный федеральный округ
  'AER', 'KZN', 'GOJ', 'VVO', 'MRV', 'KGD', 'PEE', 'UUA', 'ARH', 'KLP',
  'NJC', 'TGK', 'ULV', 'PKV', 'BZK', 'KSZ', 'KRR', 'OVB', 'OVS', 'KUF',
  'CEK', 'REN', 'HTA', 'DYR', 'SCW', 'IKT', 'UUS', 'UHY', 'HMA', 'KXK',
  'LXR', 'NDZ', 'UFA', 'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD',
  'VXG', 'YKS', 'YUM', 'KRO', 'KGD', 'KHV', 'BQS', 'YKS', 'NMA', 'NYR',
  'OVS', 'PEE', 'PKV', 'KRR', 'KUF', 'CEK', 'REN', 'HTA', 'DYR', 'SCW',
  'IKT', 'UUS', 'UHY', 'HMA', 'KXK', 'LXR', 'NDZ', 'UFA', 'MJZ', 'SKX',
  'BTK', 'SGC', 'TJM', 'TOF', 'UUD', 'VXG', 'YKS', 'YUM', 'KRO', 'KGD',
  'KHV', 'BQS', 'YKS', 'NMA', 'NYR', 'OVS', 'PEE', 'PKV', 'KRR', 'KUF',
  'CEK', 'REN', 'HTA', 'DYR', 'SCW', 'IKT', 'UUS', 'UHY', 'HMA', 'KXK',
  'LXR', 'NDZ', 'UFA', 'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD',
  'VXG', 'YKS', 'YUM', 'KRO', 'KGD', 'KHV', 'BQS', 'YKS', 'NMA', 'NYR',
  
  // Северо-Западный федеральный округ
  'LED', 'ARH', 'KGD', 'PES', 'ULL', 'VXG', 'KLV', 'AAT', 'KXK', 'LXR',
  'NDZ', 'PBA', 'TLL', 'USK', 'VAA', 'VVO', 'VKS', 'VVO', 'YKS', 'YUM',
  
  // Южный федеральный округ
  'AER', 'KRR', 'ROV', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  'DME', 'VKO', 'ZIA', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  
  // Приволжский федеральный округ
  'KZN', 'UFA', 'KUF', 'NJC', 'CEK', 'REN', 'SKX', 'BTK', 'SGC', 'TJM',
  'TOF', 'UUD', 'VXG', 'YKS', 'YUM', 'KRO', 'KGD', 'KHV', 'BQS', 'YKS',
  'NMA', 'NYR', 'OVS', 'PEE', 'PKV', 'KRR', 'KUF', 'CEK', 'REN', 'HTA',
  'DYR', 'SCW', 'IKT', 'UUS', 'UHY', 'HMA', 'KXK', 'LXR', 'NDZ', 'UFA',
  'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD', 'VXG', 'YKS', 'YUM',
  
  // Уральский федеральный округ
  'SVX', 'KZN', 'UFA', 'KUF', 'NJC', 'CEK', 'REN', 'SKX', 'BTK', 'SGC',
  'TJM', 'TOF', 'UUD', 'VXG', 'YKS', 'YUM', 'KRO', 'KGD', 'KHV', 'BQS',
  'YKS', 'NMA', 'NYR', 'OVS', 'PEE', 'PKV', 'KRR', 'KUF', 'CEK', 'REN',
  'HTA', 'DYR', 'SCW', 'IKT', 'UUS', 'UHY', 'HMA', 'KXK', 'LXR', 'NDZ',
  'UFA', 'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD', 'VXG', 'YKS',
  'YUM',
  
  // Сибирский федеральный округ
  'OVB', 'IKT', 'KJA', 'VVO', 'UUS', 'UHY', 'HMA', 'KXK', 'LXR', 'NDZ',
  'UFA', 'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD', 'VXG', 'YKS',
  'YUM', 'KRO', 'KGD', 'KHV', 'BQS', 'YKS', 'NMA', 'NYR', 'OVS', 'PEE',
  'PKV', 'KRR', 'KUF', 'CEK', 'REN', 'HTA', 'DYR', 'SCW', 'IKT', 'UUS',
  'UHY', 'HMA', 'KXK', 'LXR', 'NDZ', 'UFA', 'MJZ', 'SKX', 'BTK', 'SGC',
  'TJM', 'TOF', 'UUD', 'VXG', 'YKS', 'YUM',
  
  // Дальневосточный федеральный округ
  'VVO', 'KHV', 'UUS', 'BQS', 'YKS', 'NMA', 'NYR', 'OVS', 'PEE', 'PKV',
  'KRR', 'KUF', 'CEK', 'REN', 'HTA', 'DYR', 'SCW', 'IKT', 'UUS', 'UHY',
  'HMA', 'KXK', 'LXR', 'NDZ', 'UFA', 'MJZ', 'SKX', 'BTK', 'SGC', 'TJM',
  'TOF', 'UUD', 'VXG', 'YKS', 'YUM', 'KRO', 'KGD', 'KHV', 'BQS', 'YKS',
  'NMA', 'NYR', 'OVS', 'PEE', 'PKV', 'KRR', 'KUF', 'CEK', 'REN', 'HTA',
  'DYR', 'SCW', 'IKT', 'UUS', 'UHY', 'HMA', 'KXK', 'LXR', 'NDZ', 'UFA',
  'MJZ', 'SKX', 'BTK', 'SGC', 'TJM', 'TOF', 'UUD', 'VXG', 'YKS', 'YUM',
  
  // Северо-Кавказский федеральный округ
  'AER', 'KRR', 'ROV', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  'DME', 'VKO', 'ZIA', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  
  // Крым
  'AER', 'KRR', 'ZIA', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  'DME', 'VKO', 'ZIA', 'MOW', 'SVO', 'DME', 'VKO', 'ZIA', 'MOW', 'SVO',
  
  // Калининградская область
  'KGD',
  
  // Дополнительные российские города
  'ABA', 'AAQ', 'AEV', 'AGZ', 'AHH', 'AKX', 'AMV', 'ARH', 'ARZ', 'ASA',
  'AUH', 'BAX', 'BGN', 'BKA', 'BQS', 'BTK', 'BZK', 'CBX', 'CEK', 'CHV',
  'CQS', 'CUW', 'DME', 'DYR', 'EGO', 'EKT', 'ELK', 'ERH', 'ESL', 'FRU',
  'GDX', 'GDZ', 'GGT', 'GJW', 'GNZ', 'GOJ', 'GRV', 'GZM', 'HMA', 'HTA',
  'HXM', 'IAW', 'IKT', 'IJK', 'IQM', 'IRK', 'IVC', 'JOK', 'JLA', 'KBA',
  'KGD', 'KGP', 'KHF', 'KHH', 'KHT', 'KHV', 'KJA', 'KLD', 'KLP', 'KMN',
  'KNN', 'KNT', 'KOS', 'KOV', 'KOW', 'KRA', 'KRN', 'KRO', 'KRR', 'KRT',
  'KSZ', 'KUF', 'KUL', 'KUM', 'KVX', 'KXK', 'KYA', 'KZN', 'KZT', 'LBA',
  'LGD', 'LNX', 'LWS', 'LXR', 'MCX', 'MEJ', 'MGV', 'MJZ', 'MMK', 'MRV',
  'MUK', 'MUM', 'NBB', 'NCN', 'NMA', 'NNM', 'NOZ', 'NSK', 'NUX', 'NYR',
  'NZM', 'OBB', 'ODS', 'OEL', 'OGZ', 'OHA', 'OHT', 'OKG', 'OLO', 'OMO',
  'OMS', 'ONQ', 'OSG', 'OSL', 'OSW', 'OVB', 'OVS', 'OZA', 'PBA', 'PEE',
  'PES', 'PKC', 'PKV', 'PLK', 'PMJ', 'PRG', 'PWE', 'PYJ', 'QHA', 'QXR',
  'RAT', 'RDB', 'REN', 'RGD', 'RZN', 'ROV', 'RTW', 'RVN', 'RYB', 'RZN',
  'SAR', 'SCW', 'SGC', 'SGK', 'SGO', 'SHE', 'SKX', 'SLY', 'SNU', 'SOV',
  'SVO', 'SVX', 'SYK', 'SZG', 'TAA', 'TAS', 'TBP', 'TGK', 'TGP', 'TIX',
  'TJM', 'TKM', 'TLL', 'TOF', 'TPG', 'TQS', 'TSI', 'TUA', 'TUL', 'UEN',
  'UFA', 'UHH', 'UHJ', 'UHS', 'UHY', 'UII', 'UIN', 'UJJ', 'UKK', 'UKX',
  'ULM', 'ULV', 'ULY', 'UMN', 'UOO', 'URJ', 'URS', 'USM', 'USU', 'UUA',
  'UUD', 'UUS', 'UUZ', 'UUA', 'VAA', 'VGA', 'VKS', 'VKO', 'VOG', 'VOZ',
  'VRA', 'VRO', 'VVO', 'VXG', 'VYB', 'WKS', 'XAX', 'YAK', 'YAR', 'YKS',
  'YMR', 'YNG', 'YOS', 'YRV', 'YSC', 'YUS', 'YUW', 'YXG', 'YUM', 'ZIA',
  'ZME'
]);

/**
 * Проверяет, является ли IATA код российским городом
 * @param {string} iataCode - IATA код города
 * @returns {boolean} true если это российский город
 */
export function isRussianCity(iataCode) {
  return RUSSIAN_IATA_CODES.has(iataCode.toUpperCase());
}

/**
 * Фильтрует рейсы, оставляя только российские
 * @param {Array} flights - Массив рейсов
 * @returns {Array} Отфильтрованный массив рейсов
 */
export function filterRussianFlights(flights) {
  return flights.filter(flight => 
    isRussianCity(flight.origin) && isRussianCity(flight.destination)
  );
}
