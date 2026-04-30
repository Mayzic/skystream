const BaseParser = require('./BaseParser');

/**
 * Парсер для Победы (pobeda.aero)
 * Наследуется от BaseParser и реализует специфичную логику извлечения данных
 */
class PobedaParser extends BaseParser {
  constructor() {
    super('pobeda.aero');
  }

  /**
   * Парсинг страницы Победы
   */
  async parse(origin, destination, date, page) {
    const dateStr = date.toISOString().split('T')[0];
    const url = `https://pobeda.aero/ru/?${new URLSearchParams({ origin, destination, date: dateStr })}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.humanDelay();
    await this.humanScroll(page);

    const flights = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('[class*="flight"]') || document.querySelectorAll('[class*="ticket"]') || document.querySelectorAll('[class*="segment"]');

      cards.forEach(card => {
        try {
          const priceEl = card.querySelector('[class*="price"]') || card.querySelector('.price') || card.querySelector('[data-price]');
          const flightEl = card.querySelector('[class*="flight-number"]') || card.querySelector('.flight-number');
          const timeEl = card.querySelector('[class*="time"]') || card.querySelector('.time');

          if (priceEl) {
            const priceText = priceEl.textContent.replace(/\D/g, '');
            const price = parseInt(priceText) || 0;

            if (price > 0) {
              const flightNumber = flightEl ? flightEl.textContent.trim() : 'DP';
              const time = timeEl ? timeEl.textContent.trim() : '';

              results.push({
                flight_name: `Победа ${flightNumber}`,
                price: price,
                time: time
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

module.exports = PobedaParser;
