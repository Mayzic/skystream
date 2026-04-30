const BaseParser = require('./BaseParser');

/**
 * Парсер для Kupibilet.ru
 * Наследуется от BaseParser и реализует специфичную логику извлечения данных
 */
class KupibiletParser extends BaseParser {
  constructor() {
    super('kupibilet.ru');
  }

  /**
   * Парсинг страницы Kupibilet с API Hooking (интерцепция сетевых запросов)
   */
  async parse(origin, destination, date, page) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://kupibilet.ru/?from=${origin}&to=${destination}&date=${dateStr}`;

    // Перехватываем сетевые запросы для получения данных из API
    const apiData = [];

    page.on('response', async (response) => {
      try {
        if (response.url().includes('/api/') || response.url().includes('/search') || response.url().includes('/flights')) {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            apiData.push(data);
          }
        }
      } catch (e) {}
    });

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await this.humanDelay();
    await this.humanScroll(page);

    // Если получили данные из API, парсим их
    if (apiData.length > 0) {
      this.logToFile(`Kupibilet: получено ${apiData.length} ответов от API`);
      const flights = this.parseApiData(apiData, url);
      return flights;
    }

    // Иначе парсим DOM
    const flights = await page.evaluate(() => {
      const results = [];

      // Ищем карточки рейсов по разным селекторам
      const cardSelectors = [
        '[class*="ticket"]',
        '[class*="Ticket"]',
        '[class*="offer"]',
        '[class*="flight"]',
        '[class*="segment"]',
        '.ticket-item',
        '.flight-item',
        '[data-test*="ticket"]',
        '[data-test*="flight"]'
      ];

      let cards = [];
      for (const selector of cardSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          cards = Array.from(found);
          break;
        }
      }

      // Если карточки не найдены, пробуем другой подход
      if (cards.length === 0) {
        // Ищем элементы с ценами и ссылками
        const priceElements = document.querySelectorAll('[class*="price"], .price, [data-price]');
        priceElements.forEach(el => {
          const priceText = el.textContent.replace(/\D/g, '');
          const price = parseInt(priceText) || 0;

          if (price > 1000 && price < 100000) {
            // Ищем ближайшую ссылку или кнопку
            const parent = el.closest('a') || el.closest('[href]') || el.parentElement;
            const link = parent?.href || parent?.querySelector('a')?.href || '';

            // Ищем номер рейса поблизости
            const flightInfo = parent?.textContent || el.parentElement?.textContent || '';
            const flightMatch = flightInfo.match(/[A-Z]{2}\s*\d{3,4}/);
            const flightNumber = flightMatch ? flightMatch[0] : 'Рейс';

            results.push({
              flight_name: flightNumber,
              price: price,
              booking_url: link || window.location.href
            });
          }
        });
      } else {
        // Парсим карточки
        cards.forEach(card => {
          try {
            // Извлекаем цену
            const priceEl = card.querySelector('[class*="price"]') ||
                           card.querySelector('.price') ||
                           card.querySelector('[data-price]') ||
                           card.querySelector('[class*="cost"]');

            if (priceEl) {
              const priceText = priceEl.textContent.replace(/\D/g, '');
              const price = parseInt(priceText) || 0;

              if (price > 1000 && price < 100000) {
                // Извлекаем номер рейса
                const flightEl = card.querySelector('[class*="flight-number"]') ||
                                card.querySelector('.flight-number') ||
                                card.querySelector('[class*="airline"]') ||
                                card.querySelector('.airline');

                const flightName = flightEl ? flightEl.textContent.trim() : 'Рейс';

                // Извлекаем ссылку на покупку
                const linkEl = card.querySelector('a[href]') ||
                              card.querySelector('[href]') ||
                              card.querySelector('button') ||
                              card;

                const bookingUrl = linkEl?.href || linkEl?.closest('a')?.href || window.location.href;

                // Извлекаем время вылета
                const timeEl = card.querySelector('[class*="time"]') ||
                              card.querySelector('.time') ||
                              card.querySelector('[class*="departure"]');

                const time = timeEl ? timeEl.textContent.trim() : '';

                results.push({
                  flight_name: flightName,
                  price: price,
                  time: time,
                  booking_url: bookingUrl
                });
              }
            }
          } catch (e) {}
        });
      }

      return results;
    });

    this.logToFile(`Kupibilet: найдено ${flights.length} карточек рейсов через DOM`);

    return flights;
  }

  /**
   * Парсинг данных из API ответов
   */
  parseApiData(apiData, baseUrl) {
    const flights = [];

    apiData.forEach(data => {
      try {
        // Извлекаем рейсы из разных форматов API
        if (data.flights) {
          data.flights.forEach(flight => {
            if (flight.price && flight.price > 1000 && flight.price < 100000) {
              flights.push({
                flight_name: flight.flight_number || flight.airline || 'Рейс',
                price: flight.price,
                time: flight.departure_time || flight.time || '',
                booking_url: flight.booking_url || flight.url || baseUrl
              });
            }
          });
        } else if (data.tickets) {
          data.tickets.forEach(ticket => {
            if (ticket.price && ticket.price > 1000 && ticket.price < 100000) {
              flights.push({
                flight_name: ticket.flight_number || ticket.airline || 'Рейс',
                price: ticket.price,
                time: ticket.departure_time || ticket.time || '',
                booking_url: ticket.booking_url || ticket.url || baseUrl
              });
            }
          });
        } else if (data.offers) {
          data.offers.forEach(offer => {
            if (offer.price && offer.price > 1000 && offer.price < 100000) {
              flights.push({
                flight_name: offer.flight_number || offer.airline || 'Рейс',
                price: offer.price,
                time: offer.departure_time || offer.time || '',
                booking_url: offer.booking_url || offer.url || baseUrl
              });
            }
          });
        }
      } catch (e) {}
    });

    this.logToFile(`Kupibilet: извлечено ${flights.length} рейсов из API данных`);

    return flights;
  }
}

module.exports = KupibiletParser;
