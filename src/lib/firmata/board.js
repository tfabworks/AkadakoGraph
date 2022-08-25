const pins = [];
[6, 9, 10, 11, 14, 15, 16, 17]
  .forEach(pin => {
    pins[pin] = {}
  })

const analogReadInterval = 20
const updateAnalogInputWaitingTime = 100
const digitalReadInterval = 20
const updateDigitalInputWaitingTime = 100

const timeoutReject = delay => new Promise((_, reject) => setTimeout(() => reject(`timeout ${delay}ms`), delay))

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
  getAnalogA1,
  getAnalogA2,
  getAnalogB1,
  getAnalogB2,
  getDigitalA1,
  getDigitalA2,
  getDigitalB1,
  getDigitalB2
}