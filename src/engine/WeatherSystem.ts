import { WeatherType } from './types'

interface WeatherInfo {
  name: string
  description: string
  signalModifier: number // 0.5 - 1.0
  visionModifier: number // 0.3 - 1.0
}

const WEATHER_DATA: Record<WeatherType, WeatherInfo> = {
  [WeatherType.CLEAR]: { name: 'Açık', description: 'Görüş mükemmel, radyo sinyali tam güç.', signalModifier: 1.0, visionModifier: 1.0 },
  [WeatherType.CLOUDY]: { name: 'Bulutlu', description: 'Görüş hafif kısıtlı, telsiz paraziti var.', signalModifier: 0.9, visionModifier: 0.9 },
  [WeatherType.FOGGY]: { name: 'Sisli', description: 'Yoğun sis! Görüş ve sinyal ciddi şekilde kısıtlandı.', signalModifier: 0.4, visionModifier: 0.4 },
  [WeatherType.RAINY]: { name: 'Yağmurlu', description: 'Yağış nedeniyle telsiz mesafesi düştü.', signalModifier: 0.7, visionModifier: 0.8 },
  [WeatherType.STORM]: { name: 'Fırtınalı', description: 'AŞIRI ŞARTLAR! Telsiz kesintileri ve zayıf görüş.', signalModifier: 0.2, visionModifier: 0.3 },
}

export class WeatherSystem {
  private current: WeatherType = WeatherType.CLEAR
  private ticksSinceChange: number = 0

  update(deltaTick: number): void {
    this.ticksSinceChange += deltaTick
  }

  rollForWeatherChange(): boolean {
    if (this.ticksSinceChange < 30) return false
    if (Math.random() > 0.05) return false // 5% chance per tick
    this.ticksSinceChange = 0
    const types = Object.values(WeatherType)
    this.current = types[Math.floor(Math.random() * types.length)] as WeatherType
    return true
  }

  setWeather(type: WeatherType): void {
    this.current = type
    this.ticksSinceChange = 0
  }

  getWeatherName(): string { return WEATHER_DATA[this.current].name }
  getWeatherDescription(): string { return WEATHER_DATA[this.current].description }
  getSignalModifier(): number { return WEATHER_DATA[this.current].signalModifier }
  getVisionModifier(): number { return WEATHER_DATA[this.current].visionModifier }
  getWeatherType(): WeatherType { return this.current }

  serialize(): object {
    return { current: this.current, ticksSinceChange: this.ticksSinceChange }
  }

  static deserialize(data: Record<string, unknown>): WeatherSystem {
    const w = new WeatherSystem()
    w.current = data.current as WeatherType
    w.ticksSinceChange = data.ticksSinceChange as number
    return w
  }
}
