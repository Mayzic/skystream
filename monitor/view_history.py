#!/usr/bin/env python3
"""
View and analyze saved flight prices from CSV
Shows price trends over time
"""

import csv
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def main():
    script_dir = Path(__file__).parent
    csv_file = script_dir / 'flight_prices.csv'

    try:
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except FileNotFoundError:
        print(f"❌ No price data found at {csv_file}")
        print("   Run ./monitor.sh first to collect data")
        return

    if not rows:
        print("No data in CSV file")
        return

    print("="*80)
    print(f"📊 FLIGHT PRICE HISTORY")
    print(f"   Total records: {len(rows)}")
    print("="*80)

    # Group by timestamp
    by_timestamp = defaultdict(list)
    for row in rows:
        by_timestamp[row['timestamp']].append(row)

    timestamps = sorted(by_timestamp.keys())

    print(f"\n📅 Data collected at {len(timestamps)} different times:\n")

    for ts in timestamps:
        tickets = by_timestamp[ts]
        prices = [float(t['price']) for t in tickets]

        print(f"⏰ {ts}")
        print(f"   Tickets found: {len(tickets)}")
        print(f"   Price range: {min(prices):,.0f} ₽ - {max(prices):,.0f} ₽")
        print(f"   Average: {sum(prices)/len(prices):,.0f} ₽")

        # Show cheapest flight for this timestamp
        cheapest = min(tickets, key=lambda x: float(x['price']))
        print(f"   Cheapest: {cheapest['airline']} - {cheapest['price']} ₽ ({cheapest['stops']} stops)")
        print()

    # Price trends across time
    if len(timestamps) > 1:
        print("\n" + "="*80)
        print("📈 PRICE TRENDS")
        print("="*80)

        for airline in set(row['airline'] for row in rows):
            airline_data = [(ts, [float(t['price']) for t in by_timestamp[ts]
                            if t['airline'] == airline])
                           for ts in timestamps]
            airline_data = [(ts, prices) for ts, prices in airline_data if prices]

            if len(airline_data) > 1:
                first_avg = sum(airline_data[0][1]) / len(airline_data[0][1])
                last_avg = sum(airline_data[-1][1]) / len(airline_data[-1][1])
                change = last_avg - first_avg
                percent = (change / first_avg) * 100 if first_avg > 0 else 0

                arrow = "📈" if change > 0 else "📉" if change < 0 else "➡️"
                print(f"{arrow} {airline}: {first_avg:,.0f} ₽ → {last_avg:,.0f} ₽ ({percent:+.1f}%)")

    # Show sample data
    print("\n" + "="*80)
    print("📋 SAMPLE DATA (latest 5 tickets)")
    print("="*80)

    for i, row in enumerate(rows[-5:], 1):
        print(f"\n{i}. {row['airline']} - {row['price']} ₽")
        print(f"   {row['route']}")
        print(f"   {row['departure_time']} → {row['arrival_time']} ({row['duration']})")
        print(f"   Stops: {row['stops']} | Recorded: {row['timestamp']}")

    print(f"\n💾 Full data available in: {csv_file}")
    print(f"   You can open this file in Excel, Google Sheets, or any spreadsheet app")


if __name__ == "__main__":
    main()
