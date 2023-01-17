const pins = [];
[6, 9, 10, 11, 14, 15, 16, 17]
  .forEach(pin => {
    pins[pin] = {}
  })

const analogReadInterval = 20
const updateAnalogInputWaitingTime = 100
const digitalReadInterval = 20
const updateDigitalInputWaitingTime = 100
const sendingInterval = 10
const oneWireReadWaitingTime = 100
let oneWireDevices = null
let waterTempA = null
let waterTempB = null
let waterTempAUpdatedTime = 0
let waterTempBUpdatedTime = 0
let waterTempUpdateIntervalTime = 100

const timeoutReject = delay => new Promise((_, reject) => setTimeout(() => reject(`timeout ${delay}ms`), delay))

const sendOneWireReset = (firmata, pin) => {
  return new Promise(resolve => {
    firmata.sendOneWireReset(pin)
    setTimeout(() => resolve(), sendingInterval)
  })
}

const oneWireWrite = (firmata, pin, data) => {
  return searchOneWireDevices(firmata, pin)
    .then(devices => {
      firmata.sendOneWireWrite(pin, devices[0], data)
    })
}

const searchOneWireDevices = (firmata, pin) => {
  return new Promise((resolve, reject) => {
    if (firmata.pins[pin].mode !== firmata.MODES.ONEWIRE) {
      firmata.sendOneWireConfig(pin, true)
      return firmata.sendOneWireSearch(pin, (error, founds) => {
        if (error) return reject(error)
        if (founds.length < 1) return reject(new Error('no device'))
        firmata.pinMode(pin, firmata.MODES.ONEWIRE)
        oneWireDevices = founds
        firmata.sendOneWireDelay(pin, 1)
        resolve(oneWireDevices)
      })
    }
    resolve(oneWireDevices)
  })
}

const oneWireWriteAndRead = (firmata, pin, data, readLength) => {
  const request = searchOneWireDevices(firmata, pin)
    .then(devices =>
      new Promise((resolve, reject) => {
        firmata.sendOneWireWriteAndRead(
          pin,
          devices[0],
          data,
          readLength,
          (readError, readData) => {
            if (readError) return reject(readError)
            resolve(readData)
          }
        )
      })
    )
  return Promise.race([request, timeoutReject(oneWireReadWaitingTime)])
}

const decodeInt16FromTwo7bitBytes = bytes => {
  const lsb = (bytes[0] | (bytes[1] << 7)) & 0xFF
  const msb = ((bytes[1] >> 1) | ((bytes[1] >> 6) ? 0b11000000 : 0)) // two's complement
  const dataView = new DataView((new Uint8Array([lsb, msb])).buffer)
  const result = dataView.getInt16(0, true)
  return result
}

const getTemperatureDS18B20 = (firmata, pin) => {
  return sendOneWireReset(firmata, pin)
    .then(() => oneWireWrite(firmata, pin, 0x44))
    .then(() => sendOneWireReset(firmata, pin))
    .then(() => oneWireWriteAndRead(firmata, pin, 0xBE, 9))
    .then(data => {
      const buffer = new Uint8Array(data).buffer
      const dataView = new DataView(buffer)
      const rawTemp = dataView.getInt16(0, true)
      return Math.round((rawTemp / 16) * 10) / 10
    })
}

const getWaterTemp = (firmata, pin) => {
  const event = `water-temp-reply-${pin}`
  const request = new Promise((resolve, reject) => {
    firmata.once(event,
      data => {
        if (data.length === 0) return reject('not available')
        resolve(decodeInt16FromTwo7bitBytes(data) / 10)
      })
    firmata.sysexCommand([2, pin])
  })
  return Promise.race([request, timeoutReject(1000)])
    .catch(reason => {
      firmata.removeAllListeners(event)
      return Promise.reject(reason)
    })
}

const getWaterTemperatureA = (firmata, version) => {
  if (version.type === 0) {
    return getTemperatureDS18B20(firmata, 10)
      .catch((e) => {
        console.error(e)
        return null
      })
  }

  let getter = Promise.resolve(waterTempA)
  if ((Date.now() - waterTempAUpdatedTime) > waterTempUpdateIntervalTime) {
    getter = getter
      .then(() => getWaterTemp(firmata, 10))
      .then((res) => {
        waterTempA = res
        waterTempAUpdatedTime = Date.now()
        return res
      })
  }
  return getter
    .catch((err) => {
      console.error(`getting water temperature A was rejected by ${err}`)
      waterTempA = null
      return ''
    })
}

const getWaterTemperatureB = (firmata, version) => {
  if (version.type === 0) {
    return getTemperatureDS18B20(firmata, 6)
      .catch((e) => {
        console.error(e)
        return null
      })
  }

  let getter = Promise.resolve(waterTempB)
  if ((Date.now() - waterTempBUpdatedTime) > waterTempUpdateIntervalTime) {
    getter = getter
      .then(() => getWaterTemp(firmata, 6))
      .then((res) => {
        waterTempB = res
        waterTempBUpdatedTime = Date.now()
        return waterTempB
      })
  }
  return getter
    .catch((err) => {
      console.error(`getting water temperature B was rejected by ${err}`)
      waterTempB = null
      return null
    })
}

const getDigital = (firmata, pin) => {
  if (
    typeof pins[pin].mode !== 'undefined' &&
    pins[pin].mode !== firmata.MODES.INPUT &&
    pins[pin].mode !== firmata.MODES.PULLUP
  ) {
    return Promise.resolve(pins[pin].value)
  }
  if (pins[pin].updating ||
    (pins[pin].updateTime &&
      ((Date.now() - pins[pin].updateTime) < digitalReadInterval))) {
    return Promise.resolve(pins[pin].value)
  }
  pins[pin].updating = true
  const request = new Promise(resolve => {
    if (pins[pin].inputBias !== firmata.MODES.PULLUP) {
      pins[pin].inputBias = firmata.MODES.INPUT
    }
    firmata.pinMode(pin, pins[pin].inputBias)
    firmata.digitalRead(
      pin,
      value => {
        pins[pin].value = value
        pins[pin].updateTime = Date.now()
        resolve(pins[pin].value)
      })
  })
  return Promise.race([request, timeoutReject(updateDigitalInputWaitingTime)])
    .catch(reason => {
      pins[pin].value = 0
      return Promise.reject(reason)
    })
    .finally(() => {
      pins[pin].updating = false
    })
}

const getDigitalA1 = (firmata) => {
  return getDigital(firmata, 10)
}

const getDigitalA2 = (firmata) => {
  return getDigital(firmata, 11)
}

const getDigitalB1 = (firmata) => {
  return getDigital(firmata, 6)
}

const getDigitalB2 = (firmata) => {
  return getDigital(firmata, 9)
}

const updateAnalogInput = (firmata, analogPin) => {
  const pin = firmata.analogPins[analogPin]
  if (pins[pin].updating ||
    (pins[pin].updateTime &&
      ((Date.now() - pins[pin].updateTime) < analogReadInterval))) {
    return Promise.resolve(pins[pin].value)
  }
  pins[pin].updating = true
  const request = new Promise(resolve => {
    firmata.pinMode(analogPin, firmata.MODES.ANALOG)
    firmata.analogRead(
      analogPin,
      value => {
        pins[pin].value = value
        pins[pin].updateTime = Date.now()
        resolve(pins[pin].value)
      })
  })
  return Promise.race([request, timeoutReject(updateAnalogInputWaitingTime)])
    .catch(reason => {
      pins[pin].value = 0
      return Promise.reject(reason)
    })
    .finally(() => {
      pins[pin].updating = false
    })
}

const getAnalog = (firmata, pin) => {
  return updateAnalogInput(firmata, pin)
    .then((v) => (
      Math.round((v / 1023) * 1000) / 10
    ))
}

const getAnalogA1 = (firmata) => {
  return getAnalog(firmata, 0)
}

const getAnalogA2 = (firmata) => {
  return getAnalog(firmata, 1)
}

const getAnalogB1 = firmata => {
  return getAnalog(firmata, 2)
}

const getAnalogB2 = (firmata) => {
  return getAnalog(firmata, 3)
}

export {
  getWaterTemperatureA,
  getWaterTemperatureB,
  getAnalogA1,
  getAnalogA2,
  getAnalogB1,
  getAnalogB2,
  getDigitalA1,
  getDigitalA2,
  getDigitalB1,
  getDigitalB2
}