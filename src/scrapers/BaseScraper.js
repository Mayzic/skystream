import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { createCursor } from 'ghost-cursor';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

chromium.use(stealth());

// macOS User‑Agents
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
];

export default class BaseScraper {
  constructor() {
    this.browser = null;
    this.context = null;
    this.cursor = null;
    this.statePath = path.resolve(__dirname, '../../browser-state.json');
  }

  /** Returns a random macOS UA string */
  static randomUA() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  async launch() {
    this.browser = await chromium.launch({
      headless: false,            // false для обхода капчи
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // Проверяем наличие прогретой сессии
    let stateExists = false;
    try {
      const fs = await import('fs');
      if (fs.existsSync('yandex_state.json')) {
        stateExists = true;
        console.log('🔥 Используем прогретую сессию из yandex_state.json');
      }
    } catch {}

    // Загружаем прогретую сессию если есть
    this.context = await this.browser.newContext({
      userAgent: BaseScraper.randomUA(),
      viewport: { width: 1440, height: 900 },
      locale: 'ru-RU',
      timezoneId: 'Europe/Moscow',
      storageState: stateExists ? 'yandex_state.json' : undefined,
    });

    const page = await this.context.newPage();
    this.cursor = createCursor(page);

    return page;
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}
