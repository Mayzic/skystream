"""
Web Scraper Service
Fallback для получения данных через веб-скрапинг если API не работают
"""

import httpx
from datetime import datetime
from typing import List
from utils.russian_cities import isRussianCity
import logging
import re

logger = logging.getLogger(__name__)
logger.info("Модуль scraper.py загружен")


class WebScraper:
    async def scrape_flights(self, origin: str, destination: str, date: str) -> List[dict]:
        """Парсит Aviasales через HTML страницы"""
        try:
            logger.info(f"WebScraper.scrape_flights вызван: {origin} → {destination} на {date}")
            
            if not isRussianCity(origin) or not isRussianCity(destination):
                logger.warning(f"Пропуск: {origin} → {destination} (не российские города)")
                return []

            # Формируем URL для Aviasales
            date_parts = date.split('-')
            day = date_parts[2].lstrip('0')
            month = date_parts[1].lstrip('0')
            url = f"https://www.aviasales.ru/search/{origin}{day}{month}{destination}1"

            logger.info(f"Запрос к Aviasales: {url}")

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                
                if response.status_code != 200:
                    logger.error(f"Aviasales error: {response.status_code}")
                    return []
                
                html = response.text
                logger.info(f"Получен HTML ответ, длина: {len(html)}")

                # Ищем цены в HTML через регулярные выражения
                flights = []
                
                # Ищем паттерны цен в рублях (разные форматы)
                price_patterns = [
                    r'(\d[\d\s]*\d)\s*₽',
                    r'(\d[\d\s]*\d)\s*руб',
                    r'(\d[\d\s]*\d)\s*RUB',
                    r'(\d{3,5})'  # Просто числа от 3 до 5 цифр
                ]
                
                prices = []
                for pattern in price_patterns:
                    found = re.findall(pattern, html)
                    prices.extend(found)
                
                if prices:
                    logger.info(f"Найдено {len(prices)} цен в HTML")
                    # Убираем дубликаты и сортируем
                    unique_prices = list(set(prices))
                    unique_prices.sort()
                    
                    for i, price_str in enumerate(unique_prices[:20]):
                        try:
                            price = int(price_str.replace(' ', '').replace('\xa0', ''))
                            if price > 500:  # Уменьшенный фильтр
                                flight = {
                                    "origin": origin,
                                    "destination": destination,
                                    "price": price,
                                    "airline": "Aviasales",
                                    "departure_date": datetime.strptime(date, "%Y-%m-%d"),
                                    "source": "web_scraping",
                                    "flight_number": f"{i+1}00",
                                    "booking_url": url
                                }
                                flights.append(flight)
                        except ValueError:
                            continue
                else:
                    logger.warning("Цены не найдены в HTML")

                logger.info(f"Распарсено {len(flights)} рейсов")
                return flights[:20]

        except Exception as e:
            logger.error(f"Web scraping failed: {e}")
            import traceback
            traceback.print_exc()
            return []
