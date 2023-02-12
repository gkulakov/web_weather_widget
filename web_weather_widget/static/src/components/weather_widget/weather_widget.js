/** @odoo-module **/

import { registry } from "@web/core/registry";

const { Component, useState, onMounted, onWillStart, OwlError, EventBus } = owl;

const systrayRegistry = registry.category("systray");

class WeatherWidget extends Component {
    setup() {
        super.setup();
        this.state = useState({
            current_temp: 0,
            weather_icon: "ban",
        });
        this.latitude = 0;
        this.longitude = 0;
        this.env.bus.addEventListener("update_widget_states", ({detail}) => {
            this.updateWeatherInformation(detail.latitude, detail.longitude);
        });
        onWillStart(async () => {
            this.getCoordinates();
            setInterval(async () => {
                this.getWeatherInfo();
            }, 5*60*1000);
        })
    }

    /**
     * Match weather icon from weather code
     */
    getWeatherIcon(code) {
        let weather_code = {icon: "thermometer-half", description: "Default"}
        if ([1, 2, 3].includes(code)) {
            weather_code = {icon: "sun-o", description: "Clear sky, mainly clear, partly cloudy, and overcast"};
        } else if ([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
            weather_code = {icon: "umbrella", description: "Rain"};
        } else if ([56, 57, 71, 73, 75, 77, 85, 86].includes(code)) {
            weather_code = {icon: "snowflake-o", description: "Snow"};
        } else if ([95, 96, 99].includes(code)) {
            weather_code = {icon: "bolt", description: "Thunderstorm"};
        }
        return weather_code.icon;
    }

    /**
     * Run `update_widget_states` trigger
     */
    getWeatherInfo() {
        this.env.bus.trigger("update_widget_states", {
            latitude: this.latitude,
            longitude: this.longitude,
        });
    }

    /**
     * Requesting geolocation from a browser
     * Save coordinates if success and call getWeatherInfo()
     */
    getCoordinates() {
        const self = this;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                    const { latitude, longitude } = position.coords;
                    self.latitude = latitude;
                    self.longitude = longitude;
                    self.getWeatherInfo();
                }
            )
        }
    }
    
    async updateWeatherInformation(latitude, longitude) {
        const base_url = "https://api.open-meteo.com/v1/forecast"
        const api_url = `${base_url}?latitude=${latitude}&longitude=${longitude}&current_weather=1`
        const response = await fetch(api_url);
        if (!response.ok) {
            throw new OwlError("Cannot get weather information from weather API");
        }
        const { current_weather: { temperature, weathercode } } = await response.json()
        this.state.current_temp = temperature;
        this.state.weather_icon = this.getWeatherIcon(weathercode)
}

WeatherWidget.template = "web_weather_widget.WeatherWidget";

systrayRegistry.add(
    "web_weather_widget.WeatherWidget",
    {Component: WeatherWidget},
    { sequence: 0 },
    );
