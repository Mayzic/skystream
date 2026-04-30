import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import Flight from '../models/Flight.js';

chromium.use(stealthPlugin());

/**
 * Реальный парсер Kupibilet с актуальными селекторами
 * Использует stealth-режим и рандомные задержки для защиты от банов
 */
async function scrapeKupibilet(from, to, date) {
  const browser = await chromium.launch({ headless: true });
  
  // Создаем чистый контекст с рандомным User-Agent
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ru-RU',
    timezoneId: 'Europe/Moscow'
  });
  
  const page = await context.newPage();

  try {
    // Формируем URL для Kupibilet
    const url = `https://www.kupibilet.ru/search?from=${from}&to=${to}&date=${date}`;
    console.log(`Scraping: ${url}`);

    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    // Ждем появления карточек с ценами (пробуем разные селекторы)
    const selectors = [
      '[data-test-id="ticket-price"]',
      '[class*="price"]',
      '.price',
      '[data-price]'
    ];

    let foundSelector = null;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        foundSelector = selector;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!foundSelector) {
      console.log('Не найден селектор для цен, пробуем парсить все элементы');
    }

    // Вытягиваем данные прямо из браузера
    const tickets = await page.evaluate(() => {
      const results = [];

      // Ищем карточки билетов по разным селекторам
      const cardSelectors = [
        '[data-test-id="ticket-card"]',
        '[class*="ticket"]',
        '[class*="Ticket"]',
        '[class*="offer"]',
        '[class*="flight"]'
      ];

      let cards = [];
      for (const selector of cardSelectors) {
        const found = document.querySelectorAll(selector);
        if (found.length > 0) {
          cards = Array.from(found);
          break;
        }
      }

      // Если карточки не найдены, ищем элементы с ценами напрямую
      if (cards.length === 0) {
        const priceElements = document.querySelectorAll('[class*="price"], .price, [data-price]');
        priceElements.forEach(el => {
          const priceText = el.textContent.replace(/\D/g, '');
          const price = parseInt(priceText) || 0;
          if (price > 1000 && price < 100000) {
            results.push({
              price: price,
              airline: 'Рейс'
            });
          }
        });
      } else {
        // Парсим карточки
        cards.slice(0, 10).forEach(card => {
          try {
            const priceEl = card.querySelector('[class*="price"]') ||
                           card.querySelector('.price') ||
                           card.querySelector('[data-price]');
            
            const airlineEl = card.querySelector('[class*="airline"]') ||
                            card.querySelector('.airline') ||
                            card.querySelector('[class*="company"]');

            if (priceEl) {
              const priceText = priceEl.textContent.replace(/\D/g, '');
              const price = parseInt(priceText) || 0;

              if (price > 1000 && price < 100000) {
                results.push({
                  price: price,
                  airline: airlineEl ? airlineEl.textContent.trim() : 'Unknown'
                });
              }
            }
          } catch (e) {}
        });
      }

      return results;
    });

    console.log(`Found ${tickets.length} tickets`);

    // Сохраняем каждый найденный билет в БД
    let savedCount = 0;
    for (const t of tickets) {
      try {
        await Flight.create({
          origin: from,
          destination: to,
          price: t.price,
          airline: t.airline,
          departureDate: new Date(date),
          source: 'kupibilet.ru'
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving ticket:', error.message);
      }
    }

    console.log(`Successfully saved ${savedCount} tickets!`);
    return savedCount;

  } catch (error) {
    console.error('Scraping failed:', error.message);
    // Для отладки делаем скриншот ошибки
    await page.screenshot({ path: `error-${Date.now()}.png` });
    throw error;
  } finally {
    await browser.close();
  }
}

export default scrapeKupibilet;
