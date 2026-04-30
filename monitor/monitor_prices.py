#!/usr/bin/env python3
"""
Flight Price Monitor for Russian Routes
Monitors prices for specific flight searches and saves to CSV for trend analysis
"""

import asyncio
from playwright.async_api import async_playwright
import json
from datetime import datetime
from pathlib import Path
import sys
import os

# Добавляем родительскую директорию в path для импорта утилит
sys.path.insert(0, str(Path(__file__).parent.parent))
from parser.utils.russianCities import isRussianCity


async def monitor_flight_prices(origin: str, destination: str, date: str, wait_time: int = 30):
    """
    Monitor flight prices from Aviasales search page for Russian routes

    Args:
        origin: IATA code of origin city (e.g., MOW)
        destination: IATA code of destination city (e.g., LED)
        date: Departure date in format YYYY-MM-DD
        wait_time: How long to wait for prices to load (seconds)
    """
    # Проверяем, что оба города российские
    if not isRussianCity(origin) or not isRussianCity(destination):
        print(f"❌ Error: Both cities must be Russian. {origin} → {destination}")
        return []

    # Формируем URL для Aviasales
    # Формат: ORIGIN[DATE]DESTINATION[DATE]
    # Пример: MOW1401LED1 (Москва 14 января Санкт-Петербург)
    date_parts = date.split('-')
    if len(date_parts) != 3:
        print(f"❌ Invalid date format: {date}. Use YYYY-MM-DD")
        return []
    
    day = date_parts[2].lstrip('0')
    month = date_parts[1].lstrip('0')
    url = f"https://www.aviasales.ru/search/{origin}{day}{month}{destination}1"

    flight_data = []
    api_responses = []

    async with async_playwright() as p:
        print(f"🚀 Launching browser...")
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Intercept API responses
        async def handle_response(response):
            if 'search' in response.url or 'ticket' in response.url or 'price' in response.url:
                try:
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        if 'json' in content_type:
                            data = await response.json()
                            api_responses.append({
                                'url': response.url,
                                'data': data
                            })
                            print(f"\n📡 Captured API response from: {response.url[:80]}...")
                except Exception as e:
                    pass

        page.on('response', handle_response)

        print(f"📄 Loading page: {url}")
        await page.goto(url, wait_until='networkidle')

        print(f"⏳ Waiting {wait_time} seconds for prices to load...")
        await asyncio.sleep(wait_time)

        # Try to extract flight data from the page
        print("\n🔍 Extracting flight prices from page...")

        try:
            selectors = [
                '[data-test-id*="ticket"]',
                '[class*="ticket"]',
                '[class*="flight"]',
                '[class*="price"]',
            ]

            for selector in selectors:
                elements = await page.locator(selector).all()
                if elements:
                    print(f"\n✅ Found {len(elements)} elements with selector: {selector}")
                    for i, elem in enumerate(elements[:5], 1):
                        text = await elem.text_content()
                        if text and len(text.strip()) > 5:
                            print(f"  {i}. {text.strip()[:200]}")
                    break

        except Exception as e:
            print(f"⚠️  Error: {e}")

        # Save API responses
        if api_responses:
            print(f"\n💾 Captured {len(api_responses)} API responses")
            output_dir = Path(__file__).parent / 'data'
            output_dir.mkdir(exist_ok=True)
            api_file = output_dir / f"api_responses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(api_file, 'w', encoding='utf-8') as f:
                json.dump(api_responses, f, ensure_ascii=False, indent=2)
            print(f"💾 API responses saved to: {api_file}")

            # Try to extract prices from API responses
            print("\n💰 Extracting prices from API responses...")
            for i, resp in enumerate(api_responses, 1):
                print(f"\n--- Response {i}: {resp['url'][:60]}... ---")
                try:
                    data_str = json.dumps(resp['data'], ensure_ascii=False)
                    if 'price' in data_str.lower():
                        print("  Contains price data!")
                except:
                    pass

        # Take screenshot
        output_dir = Path(__file__).parent / 'screenshots'
        output_dir.mkdir(exist_ok=True)
        screenshot_path = output_dir / f"aviasales_screenshot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        await page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"\n📸 Screenshot saved to: {screenshot_path}")

        await browser.close()

        print("\n✅ Done!")
        return api_responses


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python monitor_prices.py <origin> <destination> <date> [wait_time]")
        print("Example: python monitor_prices.py MOW LED 2026-05-01 30")
        sys.exit(1)

    origin = sys.argv[1]
    destination = sys.argv[2]
    date = sys.argv[3]
    wait_time = int(sys.argv[4]) if len(sys.argv) > 4 else 30

    print("=" * 60)
    print("Flight Price Monitor - Russian Routes")
    print("=" * 60)
    print(f"Route: {origin} → {destination}")
    print(f"Date: {date}")
    print("=" * 60)

    asyncio.run(monitor_flight_prices(origin, destination, date, wait_time))
