"""
SkyStream Web Interface
Интерфейс в стиле Tutu.ru для поиска и мониторинга авиабилетов
Темная тема и полный русский язык
"""

import streamlit as st
import pymongo
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
import requests
from datetime import datetime, timedelta

# Кастомный CSS - темная тема
st.set_page_config(
    page_title="SkyStream — Авиабилеты",
    page_icon="✈️",
    layout="wide",
    initial_sidebar_state="collapsed"
)

st.markdown("""
<style>
    /* Темная тема */
    .stApp {
        background-color: #1a1a1a;
        color: #e0e0e0;
    }

    /* Кнопки */
    .stButton > button {
        background-color: #ff6b35;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: bold;
        transition: all 0.3s;
    }

    .stButton > button:hover {
        background-color: #ff8c5a;
        transform: translateY(-2px);
    }

    .stButton > button[kind="secondary"] {
        background-color: #4a90e2;
    }

    .stButton > button[kind="secondary"]:hover {
        background-color: #6ab0ff;
    }

    /* Выпадающие списки */
    .stSelectbox > div > div > select {
        background-color: #2a2a2a;
        color: #e0e0e0;
        border: 1px solid #444;
    }

    /* Дата пикер */
    .stDateInput > div > div > input {
        background-color: #2a2a2a;
        color: #e0e0e0;
        border: 1px solid #444;
    }

    /* Метрики */
    .metric-container {
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 10px;
        padding: 15px;
    }

    /* Таблица */
    .dataframe {
        background-color: #2a2a2a;
        border: 1px solid #444;
    }

    .dataframe th {
        background-color: #3a3a3a;
        color: #ff6b35;
    }

    .dataframe td {
        color: #e0e0e0;
    }

    /* Карточка рейса */
    .flight-card {
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
    }

    .flight-card:hover {
        border-color: #ff6b35;
        transform: translateY(-2px);
        transition: all 0.3s;
    }

    /* Контейнер поиска */
    .search-container {
        background-color: #2a2a2a;
        border: 1px solid #444;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
    }

    /* Ссылка на покупку */
    .booking-link {
        color: #ff6b35;
        text-decoration: none;
        font-weight: bold;
    }

    .booking-link:hover {
        color: #ff8c5a;
        text-decoration: underline;
    }

    /* Анимация вращающегося кубика */
    .cube-loader {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
    }

    .cube {
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ff6b35, #ff8c5a);
        border-radius: 10px;
        animation: rotate 1.5s infinite ease-in-out;
        box-shadow: 0 0 20px rgba(255, 107, 53, 0.5);
    }

    @keyframes rotate {
        0% {
            transform: rotate(0deg) scale(1);
        }
        50% {
            transform: rotate(180deg) scale(1.2);
        }
        100% {
            transform: rotate(360deg) scale(1);
        }
    }

    /* Стили для спиннера */
    .stSpinner > div {
        border-top-color: #ff6b35 !important;
    }
</style>
""", unsafe_allow_html=True)

# Города РФ
RUSSIAN_CITIES = [
    "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань",
    "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
    "Уфа", "Красноярск", "Воронеж", "Пермь", "Волгоград",
    "Краснодар", "Саратов", "Тюмень", "Тольятти", "Ижевск",
    "Барнаул", "Иркутск", "Ульяновск", "Хабаровск", "Владивосток",
    "Махачкала", "Томск", "Оренбург", "Кемерово", "Новокузнецк",
    "Рязань", "Астрахань", "Набережные Челны", "Пенза", "Липецк",
    "Киров", "Чебоксары", "Тула", "Калининград", "Курск",
    "Севастополь", "Симферополь", "Ярославль", "Владимир", "Чита"
]

# Конфигурация MongoDB
MONGO_URI = "mongodb://mongodb:27017/skystream"


def fetch_data_from_api(origin, destination, departure_date):
    """Загружает данные из API парсера для конкретного маршрута и даты"""
    try:
        # Преобразуем названия городов в IATA коды
        city_to_iata = {
            'Москва': 'MOW',
            'Санкт-Петербург': 'LED',
            'Казань': 'KZN',
            'Сочи': 'AER',
            'Екатеринбург': 'SVX'
        }

        origin_iata = city_to_iata.get(origin, origin)
        dest_iata = city_to_iata.get(destination, destination)

        # Формируем дату в формате YYYY-MM-DD
        date_str = departure_date.strftime('%Y-%m-%d')

        # Вызываем API парсера
        api_url = f"http://localhost:3000/api/search?origin={origin_iata}&destination={dest_iata}&date={date_str}"

        response = requests.get(api_url, timeout=60)

        if response.status_code == 200:
            data = response.json()
            flights = data.get('flights', [])

            if flights:
                df = pd.DataFrame(flights)
                df['departure_dt'] = pd.to_datetime(df['departure_date'], unit='ms')
                df['origin'] = origin
                df['destination'] = destination
                return df
        return None
    except Exception as e:
        st.error(f"Ошибка парсинга: {e}")
        return None


def fetch_cheapest_flights(origin, departure_date):
    """Загружает самые дешевые билеты по всем направлениям"""
    try:
        # Преобразуем названия городов в IATA коды
        city_to_iata = {
            'Москва': 'MOW',
            'Санкт-Петербург': 'LED',
            'Казань': 'KZN',
            'Сочи': 'AER',
            'Екатеринбург': 'SVX'
        }

        origin_iata = city_to_iata.get(origin, origin)

        # Формируем дату в формате YYYY-MM-DD
        date_str = departure_date.strftime('%Y-%m-%d')

        # Вызываем API парсера для поиска дешевых билетов
        api_url = f"http://localhost:3000/api/cheapest?origin={origin_iata}&date={date_str}"

        response = requests.get(api_url, timeout=120)

        if response.status_code == 200:
            data = response.json()
            flights = data.get('flights', [])

            if flights:
                df = pd.DataFrame(flights)
                df['departure_dt'] = pd.to_datetime(df['departure_date'], unit='ms')
                df['origin'] = origin

                # Преобразуем IATA коды в названия городов
                iata_to_city = {
                    'LED': 'Санкт-Петербург',
                    'KZN': 'Казань',
                    'AER': 'Сочи',
                    'SVX': 'Екатеринбург',
                    'KRR': 'Краснодар',
                    'GOJ': 'Нижний Новгород',
                    'ROV': 'Ростов-на-Дону',
                    'KUF': 'Самара',
                    'VVO': 'Владивосток',
                    'OVB': 'Новосибирск'
                }

                df['destination'] = df['destination'].map(iata_to_city).fillna(df['destination'])
                return df
        return None
    except Exception as e:
        st.error(f"Ошибка поиска дешевых билетов: {e}")
        return None


@st.cache_data(ttl=300)
def fetch_data(origin, destination, departure_date=None, days_back=7):
    """Загружает данные из MongoDB для конкретного маршрута и даты"""
    try:
        client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db = client.skystream
        collection = db.flights
        
        start_date = datetime.now() - timedelta(days=days_back)
        start_timestamp = int(start_date.timestamp() * 1000)
        
        query = {
            "collected_at": {"$gte": start_timestamp}
        }
        
        if origin and destination:
            query["origin"] = origin
            query["destination"] = destination
        elif origin:
            query["origin"] = origin
        elif destination:
            query["destination"] = destination
        
        # Сначала пробуем найти билеты на выбранную дату
        if departure_date:
            departure_start = int(departure_date.replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
            departure_end = int(departure_date.replace(hour=23, minute=59, second=59, microsecond=999999).timestamp() * 1000)
            query["departure_date"] = {"$gte": departure_start, "$lte": departure_end}
        
        cursor = collection.find(query).sort("collected_at", 1)
        
        data = list(cursor)
        
        # Если на выбранную дату нет билетов, ищем ближайшую дату в будущем
        if not data and departure_date:
            # Убираем фильтр по дате
            del query["departure_date"]
            
            # Ищем билеты на даты после выбранной
            departure_start = int(departure_date.replace(hour=0, minute=0, second=0, microsecond=0).timestamp() * 1000)
            query["departure_date"] = {"$gte": departure_start}
            
            # Сортируем по дате вылета по возрастанию
            cursor = collection.find(query).sort("departure_date", 1).limit(50)
            data = list(cursor)
            
            if data:
                # Находим ближайшую дату
                nearest_date = min(data, key=lambda x: x.get('departure_date', float('inf')))
                nearest_dt = pd.to_datetime(nearest_date['departure_date'], unit='ms')
                return pd.DataFrame(data), nearest_dt
        
        if data:
            df = pd.DataFrame(data)
            df['collected_dt'] = pd.to_datetime(df['collected_at'], unit='ms')
            df['departure_dt'] = pd.to_datetime(df['departure_date'], unit='ms')
            return df, None
        return None, None
    except Exception as e:
        st.error(f"Ошибка подключения к базе: {e}")
        return None, None


def render_search_box():
    """Рендерит форму поиска"""
    st.markdown('<div class="search-container">', unsafe_allow_html=True)

    col1, col2, col3, col4, col5, col6 = st.columns([2, 2, 2, 1, 1, 1])

    with col1:
        origin = st.selectbox("Откуда", ["Все города"] + RUSSIAN_CITIES, key="origin")

    with col2:
        destination = st.selectbox("Куда", ["Все города"] + RUSSIAN_CITIES, key="destination")

    with col3:
        departure_date = st.date_input("Дата вылета", value=datetime.now().date(), key="departure_date")


    with col4:
        days_back = st.selectbox(
            "Период",
            [1, 3, 7, 14, 30],
            index=2,
            label_visibility="collapsed",
            format_func=lambda x: f"{x} дн."
        )

    search_clicked = st.button("🔍 Найти билеты", use_container_width=True, type="primary")

    anywhere_clicked = st.button("🎲 Куда угодно", use_container_width=True, type="secondary")

    st.markdown('</div>', unsafe_allow_html=True)

    return origin, destination, departure_date, days_back, search_clicked, anywhere_clicked


def render_metrics(df):
    """Рендерит метрики"""
    if df is None or df.empty:
        return
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Средняя цена", f"{df['price'].mean():.0f} ₽")
    with col2:
        st.metric("Минимальная цена", f"{df['price'].min():.0f} ₽")
    with col3:
        st.metric("Максимальная цена", f"{df['price'].max():.0f} ₽")
    with col4:
        st.metric("Всего рейсов", len(df))


def render_chart(df):
    """Рендерит график цен"""
    if df is None or df.empty:
        return

    # Группируем по направлению и рассчитываем среднюю цену
    df_grouped = df.groupby('destination')['price'].mean().reset_index()

    # Создаем график с plotly.graph_objects
    fig = go.Figure()

    colors = ['#ff6b35', '#4a90e2', '#50c878', '#ffd700', '#ff6b6b']

    for i, (_, row) in enumerate(df_grouped.iterrows()):
        fig.add_trace(go.Bar(
            x=[row['destination']],
            y=[row['price']],
            name=row['destination'],
            marker_color=colors[i % len(colors)]
        ))

    fig.update_layout(
        title='Средние цены по направлениям',
        xaxis_title="Направление",
        yaxis_title="Цена (₽)",
        plot_bgcolor='#16213e',
        paper_bgcolor='#16213e',
        font=dict(color='#e0e0e0'),
        xaxis=dict(gridcolor='#0f3460'),
        yaxis=dict(gridcolor='#0f3460'),
        showlegend=False
    )

    st.plotly_chart(fig, use_container_width=True)


def render_flights_table(df):
    """Рендерит таблицу рейсов с кнопками покупки"""
    if df is None or df.empty:
        return

    st.subheader("📋 Доступные рейсы")

    # Сортируем по цене (от дешевых к дорогим)
    df_sorted = df.sort_values('price', ascending=True).head(10)

    for _, row in df_sorted.iterrows():
        with st.container():
            col1, col2, col3 = st.columns([3, 2, 1])

            with col1:
                # Используем airline или flight_number как название рейса
                flight_name = row.get('flight_number') or row.get('airline', 'Рейс')
                st.markdown(f"""
                <div class="flight-card">
                    <strong style="color: #e0e0e0;">{flight_name}</strong><br>
                    <span style="color: #e0e0e0;">{row['origin']} → {row['destination']}</span><br>
                    <span style="color: #999; font-size: 0.85rem;">Дата вылета: {row['departure_dt'].strftime('%d.%m.%Y')}</span>
                </div>
                """, unsafe_allow_html=True)

            with col2:
                st.markdown(f"""
                <div class="flight-card" style="display: flex; align-items: center; justify-content: center;">
                    <span style="color: #ff6b35; font-size: 1.8rem; font-weight: 700;">{row['price']} ₽</span>
                </div>
                """, unsafe_allow_html=True)

            with col3:
                booking_url = row.get('booking_url', '#')
                source = row.get('source', 'Источник')
                
                st.markdown(f"""
                <div class="flight-card" style="display: flex; align-items: center; justify-content: center;">
                    <span style="color: #999; font-size: 0.75rem;">{source}</span>
                </div>
                """, unsafe_allow_html=True)
                
                if booking_url and booking_url != '#':
                    st.markdown(f'<a href="{booking_url}" target="_blank" style="text-decoration: none;"><button style="width: 100%; background-color: #ff6b35; color: white; border: none; padding: 0.5rem; border-radius: 6px; font-weight: 600; cursor: pointer;">Купить</button></a>', unsafe_allow_html=True)


def render_recommendation(df):
    """Рендерит рекомендацию"""
    if df is None or df.empty:
        return
    
    min_price_row = df.loc[df['price'].idxmin()]
    flight_name = min_price_row.get('flight_number') or min_price_row.get('airline', 'Рейс')
    
    st.info(f"""
    💡 **Лучшая цена:** {min_price_row['price']} ₽ на рейсе {flight_name}
    ({min_price_row['origin']} → {min_price_row['destination']})
    """)


def main():
    """Главная функция"""
    # Хедер
    st.markdown("""
    <div style="display: flex; align-items: center; margin-bottom: 2rem;">
        <h1 style="margin: 0;">✈️ SkyStream</h1>
        <span style="color: #e0e0e0; margin-left: 1rem; font-size: 1.2rem;">Мониторинг авиабилетов по России</span>
    </div>
    """, unsafe_allow_html=True)

    # Форма поиска
    origin, destination, departure_date, days_back, search_clicked, anywhere_clicked = render_search_box()

    # Обработка поиска "Куда угодно"
    if anywhere_clicked:
        origin_filter = origin if origin != "Все города" else None

        if not origin_filter:
            st.warning("Выберите город вылета")
            return

        with st.spinner("🎲 Поиск самых дешевых билетов по всем направлениям на выбранную дату..."):
            df = fetch_cheapest_flights(origin_filter, departure_date)

        if df is None or df.empty:
            st.warning("🔍 По вашему запросу билетов не найдено. Попробуйте другие города или даты.")
        else:
            st.success(f"✅ Найдено {len(df)} самых дешевых билетов на {departure_date.strftime('%d.%m.%Y')}")

            # Метрики
            render_metrics(df)
            st.markdown("---")

            # График
            render_chart(df)
            st.markdown("---")

            # Таблица рейсов
            render_flights_table(df)

            # Рекомендация
            render_recommendation(df)

    # Обработка обычного поиска
    elif search_clicked:
        # Фильтруем "Все города"
        origin_filter = origin if origin != "Все города" else None
        destination_filter = destination if destination != "Все города" else None

        # Если выбрано "Все города" в поле "Куда", запускаем поиск дешевых билетов
        if destination_filter is None and origin_filter:
            with st.spinner("🎲 Поиск самых дешевых билетов по всем направлениям на выбранную дату..."):
                df = fetch_cheapest_flights(origin_filter, departure_date)

            if df is None or df.empty:
                st.warning("🔍 По вашему запросу билетов не найдено. Попробуйте другие города или даты.")
            else:
                st.success(f"✅ Найдено {len(df)} самых дешевых билетов на {departure_date.strftime('%d.%m.%Y')}")

                # Метрики
                render_metrics(df)
                st.markdown("---")

                # График
                render_chart(df)
                st.markdown("---")

                # Таблица рейсов
                render_flights_table(df)

                # Рекомендация
                render_recommendation(df)
            return

        if not origin_filter or not destination_filter:
            st.warning("Выберите город вылета")
            return

        with st.spinner("🔍 Парсинг билетов (выбранная дата + 3 дня вперед)..."):
            df = fetch_data_from_api(origin_filter, destination_filter, departure_date)

        if df is None or df.empty:
            st.warning("🔍 По вашему запросу билетов не найдено. Попробуйте другие города или даты.")
        else:
            st.success(f"✅ Найдено {len(df)} билетов на период {departure_date.strftime('%d.%m.%Y')} - {(departure_date + timedelta(days=3)).strftime('%d.%m.%Y')}")

            # Метрики
            render_metrics(df)
            st.markdown("---")

            # График
            render_chart(df)
            st.markdown("---")

            # Таблица рейсов
            render_flights_table(df)

            # Рекомендация
            render_recommendation(df)


if __name__ == "__main__":
    main()
