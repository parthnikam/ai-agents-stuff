import argparse
import json
import os
from typing import Any

import requests
import uvicorn
from mcp.server.fastmcp import FastMCP

API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyAL93fj-NIDdWAaJSdE_RqLUoap6VsaKEg")
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000

BUILTIN_CITIES = {
    "san francisco": (37.7749, -122.4194, "San Francisco, CA, USA"),
    "bangalore": (12.9716, 77.5946, "Bangalore, India"),
    "seattle": (47.6062, -122.3321, "Seattle, WA, USA"),
    "los angeles": (34.0522, -118.2437, "Los Angeles, CA, USA"),
    "new york": (40.7128, -74.0060, "New York, NY, USA"),
    "boston": (42.3601, -71.0589, "Boston, MA, USA"),
}


def get_city_coordinates(city: str) -> tuple[float, float, str]:
    normalized = city.strip().lower()
    if normalized not in BUILTIN_CITIES:
        supported = ", ".join([name.title() for name in BUILTIN_CITIES])
        raise ValueError(
            f"City '{city}' is not supported. Choose one of: {supported}."
        )
    return BUILTIN_CITIES[normalized]


def fetch_weather(latitude: float, longitude: float, api_key: str) -> dict[str, Any]:
    url = "https://weather.googleapis.com/v1/currentConditions:lookup"
    params = {
        "key": api_key,
        "location.latitude": str(latitude),
        "location.longitude": str(longitude),
    }
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    return response.json()


def format_weather(weather_data: dict[str, Any]) -> str:
    current = weather_data.get("currentConditions") or weather_data
    lines: list[str] = []

    if isinstance(current, dict):
        lines.append(f"Condition: {current.get('condition', 'N/A')}")
        temperature = current.get("temperature")
        temperature_unit = current.get("temperatureUnit", "")
        if temperature is not None:
            lines.append(f"Temperature: {temperature} {temperature_unit}".strip())
        lines.append(f"Humidity: {current.get('humidity', 'N/A')}")
        wind_speed = current.get("windSpeed")
        wind_unit = current.get("windSpeedUnit", "")
        if wind_speed is not None:
            lines.append(f"Wind speed: {wind_speed} {wind_unit}".strip())
        lines.append(f"Raw weather payload: {json.dumps(current, indent=2)}")
    else:
        lines.append(json.dumps(weather_data, indent=2))

    return "\n".join(lines)


def display_weather(city: str, latitude: float, longitude: float, place_name: str, weather_data: dict[str, Any]) -> None:
    print("=" * 60)
    print(f"Weather for: {place_name} ({city})")
    print(f"Latitude: {latitude}")
    print(f"Longitude: {longitude}")
    print("-" * 60)
    print(format_weather(weather_data))
    print("=" * 60)


def lookup_weather(city: str, api_key: str) -> dict[str, Any]:
    latitude, longitude, place_name = get_city_coordinates(city)
    weather_data = fetch_weather(latitude, longitude, api_key)
    return {
        "city": city,
        "place_name": place_name,
        "latitude": latitude,
        "longitude": longitude,
        "weather": weather_data,
    }


def run_cli(city: str | None, api_key: str) -> None:
    if not city:
        city = input("Enter a city name: ").strip()
    if not city:
        raise SystemExit("City name is required.")

    result = lookup_weather(city, api_key)
    display_weather(
        result["city"],
        result["latitude"],
        result["longitude"],
        result["place_name"],
        result["weather"],
    )


def run_server(api_key: str, host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    mcp = FastMCP(
        name="WeatherLookupServer",
        instructions="Use the lookup_weather tool to get current weather for a city name.",
    )

    def weather_tool(city: str) -> dict[str, Any]:
        return lookup_weather(city, api_key)

    mcp.add_tool(
        weather_tool,
        name="lookup_weather",
        title="Lookup Weather by City",
        description="Lookup current weather for a supported built-in city.",
    )

    print(f"Starting MCP server on http://{host}:{port}")
    print("Use the lookup_weather tool with a city name to get current weather data.")
    uvicorn.run(mcp.streamable_http_app(), host=host, port=port)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MCP weather server using built-in city coordinates and the Google Weather API"
    )
    parser.add_argument("--city", "-c", help="City name to look up")
    parser.add_argument("--serve", action="store_true", help="Run MCP server instead of terminal mode")
    parser.add_argument("--host", default=DEFAULT_HOST, help="Host for MCP server")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="Port for MCP server")
    parser.add_argument(
        "--key",
        help="Google API key; overrides the GOOGLE_API_KEY environment variable",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    api_key = "AIzaSyAL93fj-NIDdWAaJSdE_RqLUoap6VsaKEg" # args.key or os.environ.get("GOOGLE_API_KEY") or API_KEY
    if not api_key:
        raise SystemExit(
            "Google API key is required. Set GOOGLE_API_KEY or pass --key."
        )

    if args.serve:
        run_server(api_key, host=args.host, port=args.port)
    else:
        run_cli(args.city, api_key)


if __name__ == "__main__":
    main()
