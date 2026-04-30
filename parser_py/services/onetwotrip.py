"""
OneTwoTrip API Service
Дополнительный источник данных для российских рейсов
"""

import httpx
from datetime import datetime
from typing import List
from utils.russian_cities import isRussianCity


class OneTwoTripAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.api_base = "https://api.onetwotrip.com"

    async def get_prices_for_date(self, origin: str, destination: str, date: str) -> List[dict]:
        """Получить цены на авиабилеты через OneTwoTrip"""
        try:
            if not isRussianCity(origin) or not isRussianCity(destination):
                print(f"Пропуск: {origin} → {destination} (не российские города)")
                return []

            url = f"{self.api_base}/flights/search"
            params = {
                "apikey": self.api_key,
                "origin": origin,
                "destination": destination,
                "departure_date": date
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                
                if response.status_code != 200:
                    print(f"OneTwoTrip API error: {response.status_code}")
                    return []
                
                data = response.json()
                
                if not data or "flights" not in data:
                    return []
                
                flights = []
                for flight in data.get("flights", []):
                    flight_data = {
                        "origin": origin,
                        "destination": destination,
                        "price": flight.get("price", 0),
                        "airline": flight.get("airline", "Unknown"),
                        "departure_date": datetime.fromisoformat(flight.get("departure_date", "").replace("Z", "+00:00")),
                        "source": "onetwotrip_api",
                        "flight_number": flight.get("flight_number"),
                        "booking_url": f"https://www.onetwotrip.com/avia/search/?origin={origin}&destination={destination}&date={date}"
                    }
                    flights.append(flight_data)
                
                return flights
                
        except Exception as e:
            print(f"OneTwoTrip API request failed: {e}")
            return []
