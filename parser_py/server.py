"""
SkyStream Parser Server - Python версия
API сервер для парсинга авиабилетов с множественными источниками
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import List, Optional
import os
import logging
from pymongo import MongoClient
from bson import ObjectId

# Импорт сервисов
from services.travelpayouts import TravelpayoutsAPI
from services.yandex_travel import YandexTravelAPI
from services.tutu import TutuAPI
from services.ozon_travel import OzonTravelAPI
from services.onetwotrip import OneTwoTripAPI
from services.scraper import WebScraper
from utils.russian_cities import isRussianCity

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SkyStream Parser API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Конфигурация
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/skyscout")
TRAVELPAYOUTS_TOKEN = os.getenv("TRAVELPAYOUTS_TOKEN", "your_token_here")
YANDEX_API_KEY = os.getenv("YANDEX_API_KEY", "your_yandex_api_key")
TUTU_API_KEY = os.getenv("TUTU_API_KEY", "your_tutu_api_key")
OZON_API_KEY = os.getenv("OZON_API_KEY", "your_ozon_api_key")
ONETWOTRIP_API_KEY = os.getenv("ONETWOTRIP_API_KEY", "your_onetwotrip_api_key")

# Инициализация API сервисов
travelpayouts_api = TravelpayoutsAPI(TRAVELPAYOUTS_TOKEN)
yandex_api = YandexTravelAPI(YANDEX_API_KEY)
tutu_api = TutuAPI(TUTU_API_KEY)
ozon_api = OzonTravelAPI(OZON_API_KEY)
onetwotrip_api = OneTwoTripAPI(ONETWOTRIP_API_KEY)

try:
    web_scraper = WebScraper()
    logger.info("WebScraper инициализирован успешно")
except Exception as e:
    logger.error(f"Ошибка инициализации WebScraper: {e}")
    web_scraper = None


class Flight:
    """Модель данных рейса"""
    def __init__(self, origin: str, destination: str, price: float, airline: str, 
                 departure_date: datetime, source: str, flight_number: Optional[str] = None,
                 booking_url: Optional[str] = None):
        self.origin = origin
        self.destination = destination
        self.price = price
        self.airline = airline
        self.departure_date = departure_date
        self.source = source
        self.flight_number = flight_number
        self.booking_url = booking_url

    def to_dict(self):
        return {
            "origin": self.origin,
            "destination": self.destination,
            "price": self.price,
            "airline": self.airline,
            "departure_date": int(self.departure_date.timestamp() * 1000),
            "source": self.source,
            "flight_number": self.flight_number,
            "booking_url": self.booking_url
        }


def get_mongo_collection():
    """Получает коллекцию MongoDB"""
    client = MongoClient(MONGO_URI)
    db = client.skystream
    return db.raw_prices


@app.get("/")
async def root():
    """Корневой endpoint"""
    return {
        "service": "SkyStream Parser API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/api/search")
async def search_flights(origin: str, destination: str, date: str):
    """
    Поиск билетов по маршруту и дате
    Параллельный запрос ко всем API источникам
    """
    try:
        # Проверяем, что оба города российские
        if not isRussianCity(origin) or not isRussianCity(destination):
            raise HTTPException(status_code=400, detail="Поиск доступен только для российских городов")

        search_date = datetime.strptime(date, "%Y-%m-%d")
        logger.info(f"Поиск билетов: {origin} → {destination} с {date}")

        all_flights = []
        sources = []

        # Параллельное получение данных из всех источников
        import asyncio
        
        async def fetch_from_source(api, source_name):
            try:
                flights = await api.get_prices_for_date(origin, destination, date)
                if flights:
                    return flights, source_name
                return [], source_name
            except Exception as e:
                logger.error(f"Ошибка {source_name}: {e}")
                return [], source_name

        results = await asyncio.gather(
            fetch_from_source(travelpayouts_api, "travelpayouts_api"),
            fetch_from_source(yandex_api, "yandex_travel_api"),
            fetch_from_source(tutu_api, "tutu_api"),
            fetch_from_source(ozon_api, "ozon_travel_api"),
            fetch_from_source(onetwotrip_api, "onetwotrip_api"),
            return_exceptions=True
        )

        for result in results:
            if isinstance(result, Exception):
                continue
            flights, source_name = result
            if flights:
                all_flights.extend(flights)
                sources.append(source_name)

        # Fallback: веб-скрапинг если API не вернули данных
        if not all_flights:
            logger.info("API не вернули данных, используем веб-скрапинг")
            if web_scraper is None:
                logger.error("WebScraper не инициализирован!")
            else:
                try:
                    scraped_flights = await web_scraper.scrape_flights(origin, destination, date)
                    logger.info(f"Веб-скрапинг вернул {len(scraped_flights)} рейсов")
                    if scraped_flights:
                        # Конвертируем словари из скрапера в объекты Flight
                        for flight_dict in scraped_flights:
                            flight = Flight(
                                origin=flight_dict['origin'],
                                destination=flight_dict['destination'],
                                price=flight_dict['price'],
                                airline=flight_dict['airline'],
                                departure_date=flight_dict['departure_date'],
                                source=flight_dict['source'],
                                flight_number=flight_dict.get('flight_number'),
                                booking_url=flight_dict.get('booking_url')
                            )
                            all_flights.append(flight)
                        sources.append("web_scraping")
                except Exception as e:
                    logger.error(f"Ошибка веб-скрапинга: {e}")
                    import traceback
                    traceback.print_exc()

        # Удаляем дубликаты
        unique_flights = []
        seen = set()
        for flight in all_flights:
            key = (flight.price, flight.airline, flight.departure_date)
            if key not in seen:
                seen.add(key)
                unique_flights.append(flight)

        logger.info(f"Всего найдено: {len(unique_flights)} уникальных рейсов из {len(sources)} источников")

        # Сохраняем в MongoDB
        collection = get_mongo_collection()
        for flight in unique_flights:
            collection.insert_one({
                **flight.to_dict(),
                "scraped_at": datetime.now()
            })

        return {
            "origin": origin,
            "destination": destination,
            "flights": [f.to_dict() for f in unique_flights],
            "total": len(unique_flights),
            "sources": sources,
            "sources_count": len(sources)
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Ошибка поиска: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cheapest")
async def search_cheapest(origin: str, date: str):
    """
    Поиск самых дешевых билетов по всем направлениям
    """
    try:
        if not isRussianCity(origin):
            raise HTTPException(status_code=400, detail="Город вылета должен быть российским")

        search_date = datetime.strptime(date, "%Y-%m-%d")
        logger.info(f"Поиск дешевых билетов из {origin} с {date}")

        # Популярные российские направления
        destinations = ['LED', 'KZN', 'AER', 'SVX', 'KRR', 'GOJ', 'ROV', 'KUF', 'VVO', 'OVB']
        
        all_flights = []
        
        for dest in destinations:
            try:
                flights = await travelpayouts_api.get_prices_for_date(origin, dest, date)
                all_flights.extend(flights)
            except Exception as e:
                logger.error(f"Ошибка для {dest}: {e}")

        # Сортируем по цене и берем топ 20
        all_flights.sort(key=lambda x: x.price)
        cheapest = all_flights[:20]

        return {
            "origin": origin,
            "date": date,
            "flights": [f.to_dict() for f in cheapest],
            "total": len(cheapest)
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты. Используйте YYYY-MM-DD")
    except Exception as e:
        logger.error(f"Ошибка поиска дешевых билетов: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/price-history")
async def get_price_history(origin: str, destination: str, days: int = 7):
    """
    Получение истории цен за указанный период
    """
    try:
        days_limit = int(days)
        start_date = datetime.now() - timedelta(days=days_limit)

        logger.info(f"Получение истории цен: {origin} → {destination} за {days_limit} дней")

        collection = get_mongo_collection()
        
        history = list(collection.find({
            "origin": origin,
            "destination": destination,
            "scraped_at": {"$gte": start_date}
        }).sort("scraped_at", -1))

        # Группируем по датам
        grouped_by_date = {}
        for flight in history:
            date_str = flight["scraped_at"].strftime("%Y-%m-%d")
            if date_str not in grouped_by_date:
                grouped_by_date[date_str] = []
            grouped_by_date[date_str].append(flight)

        # Вычисляем статистику
        stats = []
        for date_str in sorted(grouped_by_date.keys(), reverse=True):
            flights = grouped_by_date[date_str]
            prices = [f["price"] for f in flights]
            stats.append({
                "date": date_str,
                "count": len(flights),
                "min_price": min(prices),
                "max_price": max(prices),
                "avg_price": round(sum(prices) / len(prices)),
                "sources": list(set(f["source"] for f in flights))
            })

        return {
            "origin": origin,
            "destination": destination,
            "days": days_limit,
            "history": stats,
            "total_records": len(history)
        }

    except Exception as e:
        logger.error(f"Ошибка получения истории цен: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3000)
