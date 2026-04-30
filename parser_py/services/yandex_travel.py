"""
Яндекс.Путешествия API Service
Дополнительный источник данных для российских рейсов
"""

import httpx
from datetime import datetime
from typing import List
from utils.russian_cities import isRussianCity


class YandexTravelAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_base = "https://api.rasp.yandex.net/v3.0"

    async def get_prices_for_date(self, origin: str, destination: str, date: str) -> List[dict]:
        """Получить цены на авиабилеты через Яндекс.Путешествия"""
        try:
            if not isRussianCity(origin) or not isRussianCity(destination):
                print(f"Пропуск: {origin} → {destination} (не российские города)")
                return []

            url = f"{self.api_base}/search/"
            params = {
                "apikey": self.api_key,
                "from": origin,
                "to": destination,
                "date": date,
                "transport_types": "plane"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"Yandex API error: {response.status_code}")
                    return []
                
                data = response.json()
                
                if not data or "segments" not in data:
                    return []
                
                flights = []
                for segment in data.get("segments", []):
                    for flight in segment.get("stops", []):
                        flight_data = {
                            "origin": origin,
                            "destination": destination,
                            "price": flight.get("price", 0),
                            "airline": flight.get("thread", {}).get("carrier", {}).get("title", "Unknown"),
                            "departure_date": datetime.fromisoformat(flight.get("departure", "").replace("Z", "+00:00")),
                            "source": "yandex_travel_api",
                            "flight_number": flight.get("thread", {}).get("number"),
                            "booking_url": f"https://rasp.yandex.ru/search/?from={origin}&to={destination}&date={date}"
                        }
                        flights.append(flight_data)
                
                return flights
                
        except Exception as e:
            print(f"Yandex API request failed: {e}")
            return []
