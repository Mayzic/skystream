import BaseFlightScraper from './BaseFlightScraper.js';

/**
 * Парсер для Победы (pobeda.aero)
 * Использует API Hooking для перехвата JSON-ответов от внутреннего API
 */
class PobedaScraper extends BaseFlightScraper {
  constructor() {
    super('pobeda.aero');
  }

  /**
   * Генерация URL для поиска рейсов
   */
  buildUrl(params) {
    const { origin, destination, date } = params;
    const dateStr = date.toISOString().split('T')[0];
    return `https://pobeda.aero/ru/?${new URLSearchParams({ origin, destination, date: dateStr })}`;
  }

  /**
   * Парсинг страницы с API Hooking
   */
  async parse(page) {
    const apiData = [];

    // Перехватываем сетевые запросы
    page.on('response', async (response) => {
      try {
        const url = response.url();

        // Перехватываем API запросы Победы
        if (url.includes('/api/') || 
            url.includes('/search') || 
            url.includes('/flights') ||
            url.includes('/booking') ||
            url.includes('/schedule')) {
          
          const contentType = response.headers()['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            const data = await response.json();
            this.logToFile(`Перехвачен API ответ: ${url}`);
            apiData.push(data);
            
            // Эмитируем событие для обработки данных
            this.emit('api_response', data);
          }
        }
      } catch (error) {
        this.logToFile(`Ошибка перехвата ответа: ${error.message}`, 'error');
      }
    });

    // Ждем загрузки страницы
    await page.waitForTimeout(3000);

    // Если получили данные из API, парсим их
    if (apiData.length > 0) {
      this.logToFile(`Получено ${apiData.length} API ответов`);
      const flights = this.parseApiData(apiData);
      return this.cleanData(flights);
    }

    // Иначе парсим DOM
    this.logToFile('API данные не получены, парсим DOM');
    return this.parseDom(page);
  }

  /**
   * Парсинг данных из API ответов
   */
  parseApiData(apiData) {
    const flights = [];

    apiData.forEach(data => {
      try {
        // Обработка разных форматов API
        if (data.flights) {
          data.flights.forEach(flight => {
            flights.push(this.mapFlightData(flight));
          });
        } else if (data.segments) {
          data.segments.forEach(segment => {
            flights.push(this.mapFlightData(segment));
          });
        } else if (data.offers) {
          data.offers.forEach(offer => {
            flights.push(this.mapFlightData(offer));
          });
        } else if (data.tickets) {
          data.tickets.forEach(ticket => {
            flights.push(this.mapFlightData(ticket));
          });
        } else if (Array.isArray(data)) {
          // Если это массив рейсов
          data.forEach(item => {
            flights.push(this.mapFlightData(item));
          });
        }
      } catch (error) {
        this.logToFile(`Ошибка парсинга API данных: ${error.message}`, 'error');
      }
    });

    this.logToFile(`Извлечено ${flights.length} рейсов из API`);
    return flights;
  }

  /**
   * Маппинг данных из API в нашу схему
   */
  mapFlightData(rawData) {
    return {
      flight_number: rawData.flight_number || 
                      rawData.flightNumber || 
                      rawData.number || 
                      rawData.code || 
                      'DP',
      airline: rawData.airline || 
              rawData.carrier || 
              rawData.company || 
              'Победа',
      price: rawData.price || 
             rawData.cost || 
             rawData.amount || 
             rawData.fare || 
             0,
      departure_date: rawData.departure_date || 
                     rawData.departureDate || 
                     rawData.date || 
                     rawData.time || 
                     new Date(),
      origin: rawData.origin || 
              rawData.from || 
              rawData.departure || 
              '',
      destination: rawData.destination || 
                  rawData.to || 
                  rawData.arrival || 
                  '',
      is_with_baggage: rawData.is_with_baggage || 
                      rawData.withBaggage || 
                      rawData.baggage || 
                      false,
      booking_url: rawData.booking_url || 
                   rawData.url || 
                   rawData.link || 
                   rawData.bookUrl || 
                   '',
      time: rawData.departure_time || 
           rawData.time || 
           rawData.departureTime || 
           ''
    };
  }

  /**
   * Fallback: парсинг DOM если API недоступен
   */
  async parseDom(page) {
    const flights = await page.evaluate(() => {
      const results = [];

      // Ищем карточки рейсов по разным селекторам
      const cardSelectors = [
        '[class*="flight"]',
        '[class*="ticket"]',
        '[class*="segment"]',
        '[class*="offer"]',
        '[data-test*="flight"]',
        '[data-test*="ticket"]',
        '.flight-item',
        '.ticket-item'
      ];

      let cards = [];
      for (const selector of cardSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          cards = Array.from(found);
          break;
        }
      }

      // Парсим карточки
      cards.forEach(card => {
        try {
          // Извлекаем цену
          const priceEl = card.querySelector('[class*="price"]') ||
                         card.querySelector('.price') ||
                         card.querySelector('[data-price]') ||
                         card.querySelector('[class*="cost"]');

          // Извлекаем номер рейса
          const flightEl = card.querySelector('[class*="flight-number"]') ||
                          card.querySelector('.flight-number') ||
                          card.querySelector('[class*="airline"]') ||
                          card.querySelector('.airline');

          // Извлекаем время
          const timeEl = card.querySelector('[class*="time"]') ||
                        card.querySelector('.time') ||
                        card.querySelector('[class*="departure"]');

          // Извлекаем ссылку
          const linkEl = card.querySelector('a[href]') ||
                        card.querySelector('[href]') ||
                        card.querySelector('button');

          if (priceEl) {
            const priceText = priceEl.textContent.replace(/\D/g, '');
            const price = parseInt(priceText) || 0;

            if (price > 1000 && price < 100000) {
              const flightNumber = flightEl ? flightEl.textContent.trim() : 'DP';
              const time = timeEl ? timeEl.textContent.trim() : '';
              const bookingUrl = linkEl?.href || linkEl?.closest('a')?.href || window.location.href;

              results.push({
                flight_number: flightNumber,
                airline: 'Победа',
                price: price,
                time: time,
                booking_url: bookingUrl
              });
            }
          }
        } catch (error) {
          // Игнорируем ошибки парсинга отдельных карточек
        }
      });

      return results;
    });

    this.logToFile(`Найдено ${flights.length} рейсов через DOM`);
    return flights;
  }

  /**
   * Основной метод для запуска парсинга
   */
  async scrape(origin, destination, date) {
    const url = this.buildUrl({ origin, destination, date });
    const data = await this.fetchData(url);
    return data;
  }
}

export default PobedaScraper;
