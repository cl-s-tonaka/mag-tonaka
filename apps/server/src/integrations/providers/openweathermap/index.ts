/**
 * OpenWeatherMap統合モジュール
 * 天気情報を取得するAPI統合
 */

import type { IntegrationConfig } from '../../types';

export const openWeatherMapIntegration: IntegrationConfig = {
  id: 'openweathermap',
  displayName: 'OpenWeatherMap',
  description: '天気情報を取得するAPI統合。指定した都市の現在の天気、気温、湿度などを取得できます。',
  category: 'weather',
  documentationUrl: 'https://openweathermap.org/api',
  requiredEnvVars: ['OPENWEATHERMAP_API_KEY'],
  allowedDomains: ['api.openweathermap.org'],
  tools: [
    {
      name: 'get_current_weather',
      description: '指定した都市の現在の天気を取得します',
      parameters: [
        {
          name: 'city',
          type: 'string',
          description: '都市名（英語推奨、例: Tokyo, Osaka, New York）',
          optional: false,
        },
        {
          name: 'units',
          type: 'string',
          description: '温度の単位（metric: 摂氏, imperial: 華氏, standard: ケルビン）',
          optional: true,
          defaultValue: 'metric',
        },
      ],
      implementation: `
        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: 'OPENWEATHERMAP_API_KEY is not set',
          };
        }

        const city = encodeURIComponent(params.city);
        const units = params.units || 'metric';
        const url = \`https://api.openweathermap.org/data/2.5/weather?q=\${city}&appid=\${apiKey}&units=\${units}&lang=ja\`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.cod !== 200) {
            return {
              success: false,
              error: data.message || 'Failed to fetch weather data',
            };
          }

          return {
            success: true,
            city: data.name,
            country: data.sys.country,
            weather: {
              main: data.weather[0].main,
              description: data.weather[0].description,
              icon: data.weather[0].icon,
            },
            temperature: {
              current: data.main.temp,
              feelsLike: data.main.feels_like,
              min: data.main.temp_min,
              max: data.main.temp_max,
            },
            humidity: data.main.humidity,
            wind: {
              speed: data.wind.speed,
              deg: data.wind.deg,
            },
            visibility: data.visibility,
            clouds: data.clouds.all,
            timestamp: new Date(data.dt * 1000).toISOString(),
          };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Failed to fetch weather data',
          };
        }
      `,
    },
    {
      name: 'get_weather_forecast',
      description: '指定した都市の5日間の天気予報を取得します（3時間ごと）',
      parameters: [
        {
          name: 'city',
          type: 'string',
          description: '都市名（英語推奨、例: Tokyo, Osaka, New York）',
          optional: false,
        },
        {
          name: 'units',
          type: 'string',
          description: '温度の単位（metric: 摂氏, imperial: 華氏, standard: ケルビン）',
          optional: true,
          defaultValue: 'metric',
        },
      ],
      implementation: `
        const apiKey = process.env.OPENWEATHERMAP_API_KEY;
        if (!apiKey) {
          return {
            success: false,
            error: 'OPENWEATHERMAP_API_KEY is not set',
          };
        }

        const city = encodeURIComponent(params.city);
        const units = params.units || 'metric';
        const url = \`https://api.openweathermap.org/data/2.5/forecast?q=\${city}&appid=\${apiKey}&units=\${units}&lang=ja\`;

        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.cod !== '200') {
            return {
              success: false,
              error: data.message || 'Failed to fetch forecast data',
            };
          }

          const forecasts = data.list.map(item => ({
            datetime: new Date(item.dt * 1000).toISOString(),
            weather: {
              main: item.weather[0].main,
              description: item.weather[0].description,
            },
            temperature: {
              current: item.main.temp,
              feelsLike: item.main.feels_like,
              min: item.main.temp_min,
              max: item.main.temp_max,
            },
            humidity: item.main.humidity,
            wind: {
              speed: item.wind.speed,
              deg: item.wind.deg,
            },
            pop: item.pop, // Probability of precipitation
          }));

          return {
            success: true,
            city: data.city.name,
            country: data.city.country,
            forecasts: forecasts,
          };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Failed to fetch forecast data',
          };
        }
      `,
    },
  ],
};

export default openWeatherMapIntegration;
