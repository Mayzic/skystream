#!/usr/bin/env python3
"""
Extract and display flight prices from Aviasales API data
Saves to CSV for trend analysis
"""

import json
import sys
import csv
import os
from datetime import datetime
from pathlib import Path
import glob


def format_time(timestamp):
    """Convert timestamp to readable time"""
    try:
        dt = datetime.fromtimestamp(timestamp)
        return dt.strftime("%H:%M")
    except:
        return str(timestamp)


def format_duration(minutes):
    """Convert minutes to hours and minutes"""
    try:
        hours = minutes // 60
        mins = minutes % 60
        if hours > 24:
            days = hours // 24
            hours = hours % 24
            return f"{days}d {hours}h {mins}m"
        return f"{hours}h {mins}m"
    except:
        return str(minutes)


def parse_ticket(ticket, flight_legs, places, airlines_data):
    """Parse a single ticket"""
    try:
        # Get price from proposals
        proposals = ticket.get('proposals', [])
        if not proposals:
            return None

        price = proposals[0].get('price', {}).get('value', 0)
        if price == 0:
            return None

        # Get segments
        segments = ticket.get('segments', [])
        if not segments:
            return None

        # Get first and last flights from segments
        first_segment = segments[0]
        last_segment = segments[-1]

        # Flight IDs
        first_flights = first_segment.get('flights', [])
        last_flights = last_segment.get('flights', [])

        if not first_flights or not last_flights:
            return None

        first_flight_id = first_flights[0]
        last_flight_id = last_flights[-1]

        # Get flight details from flight_legs
        first_flight = flight_legs.get(str(first_flight_id), {})
        last_flight = flight_legs.get(str(last_flight_id), {})

        # Get origin and destination
        origin = first_flight.get('origin', '')
        destination = last_flight.get('destination', '')

        # Get airline from first flight
        airline_code = first_flight.get('operating_carrier_designator', {}).get('carrier', '')
        if airline_code and airline_code in airlines_data:
            airline_info = airlines_data[airline_code].get('name', {})
            if isinstance(airline_info, dict) and 'ru' in airline_info:
                airline_name = airline_info['ru'].get('default', airline_code)
            else:
                airline_name = str(airline_info) if airline_info else airline_code
        else:
            airline_name = airline_code or 'Unknown'

        # Get place names
        if origin and origin in places:
            origin_info = places[origin].get('name', {})
            if isinstance(origin_info, dict) and 'ru' in origin_info:
                origin_name = origin_info['ru'].get('default', origin)
            else:
                origin_name = origin
        else:
            origin_name = origin or '?'

        if destination and destination in places:
            dest_info = places[destination].get('name', {})
            if isinstance(dest_info, dict) and 'ru' in dest_info:
                dest_name = dest_info['ru'].get('default', destination)
            else:
                dest_name = destination
        else:
            dest_name = destination or '?'

        # Times
        dep_time = format_time(first_flight.get('departure_unix_timestamp'))
        arr_time = format_time(last_flight.get('arrival_unix_timestamp'))

        # Duration
        if 'departure_unix_timestamp' in first_flight and 'arrival_unix_timestamp' in last_flight:
            duration_mins = (last_flight['arrival_unix_timestamp'] - first_flight['departure_unix_timestamp']) // 60
            duration_str = format_duration(duration_mins)
        else:
            duration_str = '?'

        # Number of stops
        total_flights = sum(len(seg.get('flights', [])) for seg in segments)
        stops = total_flights - 1

        return {
            'price': price,
            'route': f"{origin_name} → {dest_name}",
            'airlines': airline_name,
            'departure': dep_time,
            'arrival': arr_time,
            'duration': duration_str,
            'stops': stops,
        }
    except Exception as e:
        return None


def main(filename=None):
    """Main function to parse and display prices"""

    if not filename:
        script_dir = Path(__file__).parent / 'data'
        files = list(script_dir.glob('api_responses_*.json'))
        if not files:
            print("❌ No API response files found!")
            print("   Run monitor_prices.py first to collect data")
            return
        filename = max(files)  # Get most recent

    print(f"📖 Reading {filename}...")
    with open(filename, 'r', encoding='utf-8') as f:
        responses = json.load(f)

    all_tickets = []
    places = {}
    airlines_data = {}
    flight_legs = {}

    # Find search results responses
    for resp in responses:
        if 'search' in resp['url']:
            data_list = resp['data'] if isinstance(resp['data'], list) else [resp['data']]

            for data in data_list:
                # Get places and airlines metadata
                if 'places' in data:
                    if 'airports' in data['places']:
                        places.update(data['places']['airports'])
                if 'airlines' in data:
                    airlines_data.update(data['airlines'])
                if 'flight_legs' in data:
                    fl_list = data['flight_legs']
                    for idx, fl in enumerate(fl_list):
                        flight_legs[str(idx)] = fl

                # Get tickets
                if 'tickets' in data:
                    tickets = data['tickets']
                    print(f"✈️  Found {len(tickets)} tickets in response")

                    if isinstance(tickets, dict):
                        tickets_list = list(tickets.values())
                    else:
                        tickets_list = tickets

                    for ticket in tickets_list:
                        parsed = parse_ticket(ticket, flight_legs, places, airlines_data)
                        if parsed and parsed['price'] > 0:
                            all_tickets.append(parsed)

    if not all_tickets:
        print("\n⚠️  No tickets found in API responses")
        return

    # Sort by price
    all_tickets.sort(key=lambda x: x['price'])

    # Display results
    print("\n" + "="*80)
    print(f"💰 FLIGHT PRICES")
    print(f"   Found {len(all_tickets)} flights")
    print("="*80)

    for i, ticket in enumerate(all_tickets[:15], 1):
        print(f"\n{i}. {ticket['price']:,.0f} ₽")
        print(f"   {ticket['route']}")
        print(f"   {ticket['airlines']}")
        print(f"   {ticket['departure']} → {ticket['arrival']} ({ticket['duration']})")
        print(f"   Stops: {ticket['stops']}")

    # Summary stats
    if all_tickets:
        cheapest = all_tickets[0]['price']
        most_expensive = all_tickets[-1]['price']
        average = sum(t['price'] for t in all_tickets) / len(all_tickets)

        print("\n" + "="*80)
        print("📊 PRICE SUMMARY")
        print("="*80)
        print(f"Cheapest:      {cheapest:,.0f} ₽")
        print(f"Most expensive: {most_expensive:,.0f} ₽")
        print(f"Average:       {average:,.0f} ₽")
        print(f"Total flights: {len(all_tickets)}")

    # Save to CSV file with timestamp
    if all_tickets:
        script_dir = Path(__file__).parent
        csv_file = script_dir / 'flight_prices.csv'
        file_exists = csv_file.exists()

        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        with open(csv_file, 'a', newline='', encoding='utf-8') as f:
            fieldnames = [
                'timestamp',
                'price',
                'route',
                'origin',
                'destination',
                'airline',
                'departure_time',
                'arrival_time',
                'duration',
                'stops'
            ]
            writer = csv.DictWriter(f, fieldnames=fieldnames)

            if not file_exists:
                writer.writeheader()

            for ticket in all_tickets:
                route_parts = ticket['route'].split(' → ')
                origin = route_parts[0] if len(route_parts) > 0 else ''
                destination = route_parts[1] if len(route_parts) > 1 else ''

                writer.writerow({
                    'timestamp': timestamp,
                    'price': ticket['price'],
                    'route': ticket['route'],
                    'origin': origin,
                    'destination': destination,
                    'airline': ticket['airlines'],
                    'departure_time': ticket['departure'],
                    'arrival_time': ticket['arrival'],
                    'duration': ticket['duration'],
                    'stops': ticket['stops']
                })

        print(f"\n💾 Saved {len(all_tickets)} tickets to {csv_file}")
        print(f"   Timestamp: {timestamp}")


if __name__ == "__main__":
    filename = sys.argv[1] if len(sys.argv) > 1 else None
    main(filename)
