const BaseParser = require('./BaseParser');

/**
 * Парсер для Aviasales.ru
 * Наследуется от BaseParser и реализует специфичную логику извлечения данных
 */
class AviasalesParser extends BaseParser {
  constructor() {
    super('aviasales.ru');
  }

  /**
   * Парсинг страницы Aviasales
   */
  async parse(origin, destination, date, page) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://www.aviasales.ru/search?origin=${origin}&destination=${destination}&date=${dateStr}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay();
    await this.humanScroll(page);

    const flights = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('[class*="ticket"]') || document.querySelectorAll('[class*="Ticket"]');

      cards.forEach(card => {
        try {
          const priceEl = card.querySelector('[class*="price"]') || card.querySelector('.price');
          const airlineEl = card.querySelector('[class*="airline"]') || card.querySelector('.airline');

          if (priceEl) {
            const priceText = priceEl.textContent.replace(/\D/g, '');
            const price = parseInt(priceText) || 0;

            if (price > 0) {
              results.push({
                flight_name: airlineEl ? airlineEl.textContent.trim() : 'Авиакомпания',
                price: price
              });
            }
          }
        } catch (e) {}
      });

      return results;
    });

    return flights.map(f => ({...f, booking_url: url}));
  }
}

module.exports = AviasalesParser;
