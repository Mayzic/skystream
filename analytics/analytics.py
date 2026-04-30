"""
SkyStream Analytics
Базовая аналитика цен на авиабилеты
На собеседовании: "Использую Python для анализа данных — pandas для обработки, matplotlib для визуализации"
"""

import pymongo
import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import sys

# Конфигурация
MONGO_URI = "mongodb://mongodb:27017/skystream"


def fetch_flight_data(days_back=7):
    """
    Загружает данные о рейсах из MongoDB за указанный период
    На собеседовании: "Использую MongoDB для хранения временных рядов цен"
    """
    client = pymongo.MongoClient(MONGO_URI)
    db = client.skystream
    collection = db.flights
    
    # Вычисляем дату начала периода
    start_date = datetime.now() - timedelta(days=days_back)
    start_timestamp = int(start_date.timestamp() * 1000)
    
    # Запрашиваем данные
    cursor = collection.find({
        "collected_at": {"$gte": start_timestamp}
    }).sort("collected_at", 1)
    
    # Преобразуем в DataFrame
    data = list(cursor)
    if not data:
        print("Нет данных за указанный период")
        return None
    
    df = pd.DataFrame(data)
    
    # Преобразуем timestamp в datetime
    df['collected_dt'] = pd.to_datetime(df['collected_at'], unit='ms')
    df['departure_dt'] = pd.to_datetime(df['departure_date'], unit='ms')
    
    client.close()
    return df


def calculate_statistics(df):
    """
    Считает базовую статистику: средняя, минимальная, максимальная цена
    На собеседовании: "Начинаю с базовой статистики, прежде чем переходить к ML"
    """
    if df is None or df.empty:
        return None
    
    stats = {
        'mean_price': df['price'].mean(),
        'min_price': df['price'].min(),
        'max_price': df['price'].max(),
        'std_price': df['price'].std(),
        'total_flights': len(df)
    }
    
    print("\n=== Статистика цен ===")
    print(f"Средняя цена: {stats['mean_price']:.2f} руб")
    print(f"Минимальная цена: {stats['min_price']:.2f} руб")
    print(f"Максимальная цена: {stats['max_price']:.2f} руб")
    print(f"Стандартное отклонение: {stats['std_price']:.2f} руб")
    print(f"Всего рейсов: {stats['total_flights']}")
    
    return stats


def plot_price_history(df, output_path='web/price_chart.png'):
    """
    Строит график изменения цен во времени
    На собеседовании: "Визуализация помогает быстро оценить тренды"
    """
    if df is None or df.empty:
        print("Нет данных для построения графика")
        return
    
    # Группируем по времени сбора и считаем среднюю цену
    df_grouped = df.groupby('collected_dt')['price'].mean().reset_index()
    
    plt.figure(figsize=(12, 6))
    plt.plot(df_grouped['collected_dt'], df_grouped['price'], 
             marker='o', linewidth=2, markersize=6)
    plt.title('Динамика средних цен на авиабилеты', fontsize=14, fontweight='bold')
    plt.xlabel('Время сбора данных', fontsize=12)
    plt.ylabel('Цена (руб)', fontsize=12)
    plt.grid(True, alpha=0.3)
    plt.xticks(rotation=45)
    plt.tight_layout()
    
    # Сохраняем график
    plt.savefig(output_path, dpi=100, bbox_inches='tight')
    print(f"\nГрафик сохранен: {output_path}")
    plt.close()


def find_best_time_to_buy(df):
    """
    Находит время с минимальной ценой
    На собеседовании: "Простой алгоритм для рекомендации времени покупки"
    """
    if df is None or df.empty:
        return None
    
    # Находим запись с минимальной ценой
    min_price_row = df.loc[df['price'].idxmin()]
    
    print("\n=== Рекомендация ===")
    print(f"Минимальная цена была: {min_price_row['price']} руб")
    print(f"Время фиксации: {min_price_row['collected_dt']}")
    print(f"Рейс: {min_price_row['flight_name']}")
    
    return min_price_row


def main():
    """Главная функция"""
    print("SkyStream Analytics запущен...")
    
    # Загружаем данные за последние 7 дней
    df = fetch_flight_data(days_back=7)
    
    if df is not None:
        # Считаем статистику
        stats = calculate_statistics(df)
        
        # Находим лучшее время для покупки
        find_best_time_to_buy(df)
        
        # Строим график
        plot_price_history(df)
    else:
        print("Данные отсутствуют. Запустите парсер для сбора данных.")


if __name__ == "__main__":
    main()
