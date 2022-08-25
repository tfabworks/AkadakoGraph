import {
  getLux,
  getTemperature,
  getPressure,
  getHumidity
} from './bme280'

import {
  getAccelerationValue,
  getRoll,
  getPitch
} from './adxl345'

import {
  getDistanceL,
  getDistanceA,
  getDistanceB
} from './vl53l0x'

import {
  getAnalogA1,
  getAnalogA2,
  getAnalogB1,
  getAnalogB2,
  getDigitalA1,
  getDigitalA2,
  getDigitalB1,
  getDigitalB2
} from './board'

export const getData = async (firmata, kind, Firmata) => {
  try {
    if (kind === '明るさ[lux]') {
      return await getLux(firmata)
    } else if (kind === '気温[℃]') {
      return await getTemperature(firmata, false)
    } else if (kind == '気圧[hPa]') {
      return await getPressure(firmata)
    } else if (kind === '湿度[%]') {
      return await getHumidity(firmata)
    } else if (kind === '加速度(絶対値)[m/s^2]') {
      return await getAccelerationValue(firmata, 'absolute')
    } else if (kind === '加速度(X)[m/s^2]') {
      return await getAccelerationValue(firmata, 'x')
    } else if (kind === '加速度(Y)[m/s^2]') {
      return await getAccelerationValue(firmata, 'y')
    } else if (kind === '加速度(Z)[m/s^2]') {
      return await getAccelerationValue(firmata, 'z')
    } else if (kind === '加速度(ロール)[°]') {
      return await getRoll(firmata)
    } else if (kind === '加速度(ピッチ)[°]') {
      return await getPitch(firmata)
    } else if (kind === '距離(レーザー)[cm]') {
      return await getDistanceL(firmata)
    } else if (kind === '距離(超音波A)[cm]') {
      return await getDistanceA(firmata, Firmata)
    } else if (kind === '距離(超音波B)[cm]') {
      return await getDistanceB(firmata, Firmata)
    } else if (kind === 'アナログA1') {
      return await getAnalogA1(firmata)
    } else if (kind === 'アナログA2') {
      return await getAnalogA2(firmata)
    } else if (kind === 'アナログB1') {
      return await getAnalogB1(firmata)
    } else if (kind === 'アナログB2') {
      return await getAnalogB2(firmata)
    } else if (kind === 'デジタルA1') {
      return await getDigitalA1(firmata)
    } else if (kind === 'デジタルA2') {
      return await getDigitalA2(firmata)
    } else if (kind === 'デジタルB1') {
      return await getDigitalB1(firmata)
    } else if (kind === 'デジタルB2') {
      return await getDigitalB2(firmata)
    }

    return null
  } catch (e) {
    console.error(e)
    return null
  }
}
