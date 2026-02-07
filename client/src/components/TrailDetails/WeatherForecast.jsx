import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, CloudLightning, Wind } from 'lucide-react';

const WeatherForecast = ({ lat, lng }) => {
    const [forecast, setForecast] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async () => {
            if (!lat || !lng) return;

            setLoading(true);
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`
                );

                if (!response.ok) throw new Error('Weather data unavailable');

                const data = await response.json();
                setForecast(data);
            } catch (err) {
                console.error("Weather fetch error:", err);
                setError("Could not load weather.");
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [lat, lng]);

    // WMO Weather interpretation codes
    const getWeatherIcon = (code) => {
        if (code === 0) return <Sun className="w-6 h-6 text-yellow-500" />;
        if (code >= 1 && code <= 3) return <Cloud className="w-6 h-6 text-gray-400" />;
        if (code >= 45 && code <= 48) return <Cloud className="w-6 h-6 text-gray-500" />;
        if (code >= 51 && code <= 67) return <CloudRain className="w-6 h-6 text-blue-400" />;
        if (code >= 71 && code <= 77) return <CloudSnow className="w-6 h-6 text-cyan-200" />;
        if (code >= 80 && code <= 82) return <CloudRain className="w-6 h-6 text-blue-600" />;
        if (code >= 85 && code <= 86) return <CloudSnow className="w-6 h-6 text-cyan-400" />;
        if (code >= 95 && code <= 99) return <CloudLightning className="w-6 h-6 text-purple-500" />;
        return <Sun className="w-6 h-6 text-yellow-500" />;
    };

    const getWeatherLabel = (code) => {
        if (code === 0) return "Clear";
        if (code <= 3) return "Partly Cloudy";
        if (code <= 48) return "Fog";
        if (code <= 67) return "Rain";
        if (code <= 77) return "Snow";
        if (code <= 82) return "Showers";
        if (code <= 86) return "Snow Showers";
        if (code <= 99) return "Thunderstorm";
        return "Clear";
    };

    if (loading) return <div className="animate-pulse h-32 bg-gray-100 rounded-xl"></div>;

    if (error || !forecast || !forecast.daily) {
        return (
            <div className="bg-red-50 p-4 rounded-xl text-center text-red-500 text-sm">
                Unable to load weather forecast.
            </div>
        );
    }

    const { daily } = forecast;

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-orange-500" />
                7-Day Weather Forecast
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {daily.time.map((date, index) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                    const code = daily.weathercode[index];
                    const maxTemp = daily.temperature_2m_max[index];
                    const minTemp = daily.temperature_2m_min[index];
                    const isToday = index === 0;

                    return (
                        <div
                            key={date}
                            className={`flex flex-col items-center p-3 border rounded-xl shadow-sm transition-all
                                ${isToday
                                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100 scale-105 z-10'
                                    : 'bg-white border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                {isToday ? 'Today' : dayName}
                            </span>
                            <div className="mb-2 transform scale-110">{getWeatherIcon(code)}</div>
                            <span className="text-xs text-center text-gray-500 mb-1">{getWeatherLabel(code)}</span>
                            <div className="flex gap-2 text-sm font-medium">
                                <span className="text-gray-900">{Math.round(maxTemp)}°</span>
                                <span className="text-gray-400">{Math.round(minTemp)}°</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeatherForecast;
