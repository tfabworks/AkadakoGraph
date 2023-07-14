import EnvSensorGetter from './envSensor'
import AccelerationGetter from './acceleration'
import DistanceGetter from './distance'
import WaterTempertureGetter from './waterTemperture'
import InputGetter from './input'

import LTR303 from '../ltr303'
import O2CO2Sensor from '../o2co2'

export default class DataGetter {
  constructor(board) {
    this.board = board

    if (this.board) {
      this.ltr303 = new LTR303(this.board)
      this.envSensorGetter = new EnvSensorGetter(this.board)
      this.accelerationGetter = new AccelerationGetter(this.board)
      this.distanceGetter = new DistanceGetter(this.board)
      this.waterTempertureGetter = new WaterTempertureGetter(this.board)
      this.inputGetter = new InputGetter(this.board)
      this.o2co2 = new O2CO2Sensor(this.board)
    }
  }

  async getData (kind) {
    try {
      if (kind === 1) {
        return await this.ltr303.getBrightness()
      } else if (kind === 2) { 
        return await this.envSensorGetter.getEvnTemperature()
      } else if (kind == 3) {
        return await this.envSensorGetter.getEnvPressure()
      } else if (kind === 4) {
        return await this.envSensorGetter.getEnvHumidity()
      } else if (kind === 5) {
        return await this.accelerationGetter.getAccelerationAbsolute()
      } else if (kind === 6) {
        return await this.accelerationGetter.getAccelerationX()
      } else if (kind === 7) {
        return await this.accelerationGetter.getAccelerationY()
      } else if (kind === 8) {
        return await this.accelerationGetter.getAccelerationZ()
      } else if (kind === 9) {
        return await this.accelerationGetter.getRoll()
      } else if (kind === 10) {
        return await this.accelerationGetter.getPitch()
      } else if (kind === 11) {
        return await this.distanceGetter.measureDistanceWithLight()
      } else if (kind === 12) {
        return await this.distanceGetter.measureDistanceWithUltrasonicA()
      } else if (kind === 13) {
        return await this.distanceGetter.measureDistanceWithUltrasonicB()
      } else if (kind === 14) {
        return await this.waterTempertureGetter.getWaterTemperatureA()
      } else if (kind === 15) {
        return await this.waterTempertureGetter.getWaterTemperatureB()
      } else if (kind === 16) {
        return await this.o2co2.getO2()
      } else if (kind === 17) {
        return await this.o2co2.getCO2()
      } else if (kind === 18) {
        return await this.o2co2.getTemperature()
      } else if (kind === 19) {
        return await this.o2co2.getHumidity()
      } else if (kind === 10000) {
        return this.inputGetter.analogLevelA1()
      } else if (kind === 10001) {
        return this.inputGetter.analogLevelA2()
      } else if (kind === 10002) {
        return this.inputGetter.analogLevelB1()
      } else if (kind === 10003) {
        return this.inputGetter.analogLevelB2()
      } else if (kind === 10100) {
        return this.inputGetter.digitalLevelA1()
      } else if (kind === 10101) {
        return this.inputGetter.digitalLevelA2()
      } else if (kind === 10102) {
        return this.inputGetter.digitalLevelB1()
      } else if (kind === 10103) {
        return this.inputGetter.digitalLevelB2()
      }
      return null
    } catch (e) {
      console.error(e)
      return null
    }
  }
}
