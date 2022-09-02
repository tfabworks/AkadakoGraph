/* eslint-disable no-undef */
import Cast from '../../util/cast'

import Long from 'long'

import {AkaDakoConnector, getAkaDakoConnector} from './akadako-connector'
import VL53L0X from './vl53l0x'
import ADXL345 from './adxl345'
import BME280 from './bme280'

import store from '@/store'

/**
 * Returns a Long Integer converted from the value.
 * @param {number|string} value - value to be converted
 * @param {boolean} unsigned - true for unsigned long
 * @returns {Long} converted Long value
 */
const integer64From = (value, unsigned) => {
  if (!value) return (unsigned ? Long.UZERO : Long.ZERO)
  let radix = 10
  if (typeof value === 'string'){
    value = value.trim()
    if (value.length === 0) return (unsigned ? Long.UZERO : Long.ZERO)
    let sign = ''
    if (value[0] === '-') {
      sign = '-'
      value = value.slice(1).trim()
    }
    if (value.includes('0x')) {
      radix = 16
      value = value.slice(2)
    }
    if (value.includes('0b')) {
      radix = 2
      value = value.slice(2)
    }
    return Long.fromString((sign + value), unsigned, radix)
  }
  return Long.fromValue(value, unsigned)
}

/**
 * Make a String separated with ',' from a numeric Array
 * @param {Array} array - numeric array to be converted
 * @returns {string} converted string
 */
const numericArrayToString = array => array.join(', ')

/**
 * Returns a numeric Array made from the string expression.
 * @param {string} stringExp - string to be converted
 * @returns {Array} numeric array from the string
 */
const readAsNumericArray = stringExp => {
  if (typeof stringExp !== 'string') return [Number(stringExp)]
  stringExp = stringExp.trim()
  if (stringExp.length === 0) return []
  stringExp = stringExp.replaceAll(/[[|\]|"]/g, '')
  const array = []
  if (stringExp.includes(',')) {
    stringExp.split(',')
      .forEach(numberString => {
        numberString = numberString.trim()
        // remove blank items
        if (numberString.length !== 0){
          array.push(Number(numberString))
        }
      })
  } else {
    stringExp.split(/\s+/)
      .forEach(item => {
        array.push(Number(item))
      })
  }
  return array
}

/**
 * Scratch 3.0 blocks for example of Xcratch.
 */
class ExtensionBlocks {
  /**
     * Construct a set of blocks for Grove.
     * @param {Runtime} runtime - the Scratch 3.0 runtime.
     */
  constructor (runtime) {
    /**
         * The Scratch 3.0 runtime.
         * @type {Runtime}
         */
    this.runtime = runtime

    /**
         * Current connected board object with AkaDako protocol
         * @type {AkaDakoBoard}
         */
    this.board = null

    /**
         * Distance sensor VL53L0X
         * @type {VL53L0X}
         */
    this.vl53l0x = null

    /**
         * Manager of AkaDako boards
         * @type {AkaDakoConnector}
         */
    this.boardConnector = getAkaDakoConnector(runtime)
    this.boardConnector.addListener(AkaDakoConnector.BOARD_ADDED, () => this.updateBoard())
    this.boardConnector.addListener(AkaDakoConnector.BOARD_REMOVED, () => this.updateBoard())

    /**
         * state holder of the all pins
         */
    this.pins = [];
    [6, 9, 10, 11, 14, 15, 16, 17]
      .forEach(pin => {
        this.pins[pin] = {}
      })

    this.serialPortOptions = {
      filters: [
        {usbVendorId: 0x04D8, usbProductId: 0xE83A}, // Licensed for AkaDako
        {usbVendorId: 0x04D8, usbProductId: 0x000A}, // Dev board
        {usbVendorId: 0x04D9, usbProductId: 0xB534} // Use in the future
      ]
    }
    this.runtime.on('PROJECT_STOP_ALL', () => {
      this.resetPinMode()
      this.neoPixelClearAll()
    })

    /**
         * Threshold value for shake event [m/s^2]
         * @type {number}
         */
    this.shakeEventThreshold = 4.0

    /**
         * Interval time to check shake event [milliseconds]
         * @type {number}
         */
    this.shakeEventInterval = 100

    // eslint-disable-next-line no-unused-vars
    window.addEventListener('beforeunload', e => {
      this.disconnectBoard()
    })
  }

  /**
     * Reset pin mode
     * @returns {undefined}
     */
  resetPinMode () {
    if (!this.isConnected()) return;
    [6, 9, 10, 11]
      .forEach(pin => {
        this.board.pinMode(pin, this.board.MODES.INPUT)
      })
  }

  /**
     * Turn off the all NeoPixel strips.
     */
  neoPixelClearAll () {
    if (!this.isConnected()) return
    this.neoPixelBusy = true
    this.board.neoPixelClearAll()
      .finally(() => {
        this.neoPixelBusy = false
      })
  }

  /**
     * Update connected board
     */
  updateBoard () {
    if (this.board && this.board.isConnected()) return
    const prev = this.board
    this.board = this.boardConnector.findBoard(this.serialPortOptions)
    if (prev === this.board) return
    this.vl53l0x = null
    this.adxl345 = null
    this.bme280 = null
  }

  /**
     * Called by the runtime when user wants to scan for a peripheral.
     * @returns {Promise} - a Promise which resolves when a board was connected
     */
  scan () {
    return this.connectBoard()
  }

  /**
     * Called by the runtime when user wants to cancel scanning or the peripheral was disconnected.
     */
  disconnect () {
    this.disconnectBoard()
  }

  /**
     * Return whether the board is ready to use or not.
     * @returns {boolean} true if the board is connected
     */
  isConnected () {
    if (!this.board) return false
    return this.board.isReady()
  }

  /**
     * Connect a AkaDako board.
     * @returns {Promise<string>} a promise which resolves the result of this command
     */
  connectBoard () {
    if (this.board && this.board.isConnected()) return // Already connected
    return this.boardConnector.connect(EXTENSION_ID, this.serialPortOptions)
      .then(connectedBoard => {
        this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTED, {
          name: connectedBoard.name,
          path: connectedBoard.portInfo
        })
        return `connected to ${JSON.stringify(connectedBoard.portInfo)}`
      })
      .catch(reason => {
        if (reason) {
          console.log(reason)
        } else {
          console.log(`fail to connect port: ${JSON.stringify(this.serialPortOptions)}`)
        }
        return Promise.reject(reason)
      })
  }

  /**
     * Disconnect from the current connected board.
     * @returns {undefined}
     */
  disconnectBoard () {
    if (!this.board) return
    return this.board.disconnect()
  }

  /**
     * Whether the current state is same as the argument state.
     * @param {object} args - the block's arguments.
     * @param {string} args.STATE - state to detect
     * @returns {boolean} true if the current state is same as the state
     */
  boardStateChanged (args) {
    return (args.STATE === 'connected') === this.isConnected()
  }

  /**
     * Return the version information of the connected board.
     * @returns {string} version info
     */
  boardVersion () {
    if (!this.isConnected()) return ''
    return this.board.boardVersion()
      .catch(reason => {
        console.log(`boardVersion() was rejected by ${reason}`)
        return Promise.reject(reason)
      })
  }

  /**
     * Get the digital level [0|1] of the pin.
     * @param {number} pin - pin number to get
     * @returns {Promise<number>} a Promise which resolves digital value of the pin
     */
  getDigitalLevel (pin) {
    if (!this.isConnected()) return Promise.resolve(0)
    return this.board.updateDigitalInput(pin)
      .catch(reason => {
        console.log(`digitalRead(${pin}) was rejected by ${reason}`)
        return 0
      })
  }

  /**
     * Whether the current level of the connector is HIGHT as digital input.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @returns {Promise<boolean>} a Promise which resolves boolean when the response was returned
     */
  digitalIsHigh (args) {
    if (!this.isConnected()) return Promise.resolve(false)
    const pin = parseInt(args.CONNECTOR, 10)
    return this.getDigitalLevel(pin)
      .then(readData => !!readData)
  }

  /**
     * The level [0|1] of digital A1 connector
     * @returns {Promise<number>} - a Promise which resolves digital level of the pin
     */
  digitalLevelA1 () {
    return this.getDigitalLevel(10)
  }

  /**
     * The level [0|1] of digital A2 connector
     * @returns {Promise<number>} - a Promise which resolves digital level of the pin
     */
  digitalLevelA2 () {
    return this.getDigitalLevel(11)
  }

  /**
     * The level [0|1] of digital B1 connector
     * @returns {Promise<number>} - a Promise which resolves digital level of the pin
     */
  digitalLevelB1 () {
    return this.getDigitalLevel(6)
  }

  /**
     * The level [0|1] of digital B2 connector
     * @returns {Promise<number>} - a Promise which resolves digital level of the pin
     */
  digitalLevelB2 () {
    return this.getDigitalLevel(9)
  }

  /**
     * Detect the edge as digital level of the connector for HAT block.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {boolean} args.LEVEL - level to detect edge
     * @returns {boolean} is the level same as the current of the connector
     */
  digitalLevelChanged (args) {
    if (!this.isConnected()) return false
    const pin = parseInt(args.CONNECTOR, 10)
    const rise = Cast.toBoolean(args.LEVEL)
    this.board.updateDigitalInput(pin) // update for the next call
      .catch(reason => {
        console.log(`digitalRead(${pin}) was rejected by ${reason}`)
      })
    return rise === !!this.board.pins[pin].value // Do NOT return Promise for the hat execute correctly.
  }

  /**
     * Set input bias of the connector.
     * @param {object} args - the block's arguments.
     * @param {string} args.PIN - number of the pin
     * @param {string} args.BIAS - input bias of the pin [none | pullUp]
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  inputBiasSet (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.PIN, 10)
    const pullUp = args.BIAS === 'pullUp'
    return this.board.setInputBias(pin, pullUp)
  }

  /**
     * Set the connector to the level as digital output.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {boolean | string | number} args.LEVEL - level to be set
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  digitalLevelSet (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    const value = Cast.toBoolean(args.LEVEL) ? this.board.HIGH : this.board.LOW
    this.board.pinMode(pin, this.board.MODES.OUTPUT)
    return this.board.digitalWrite(pin, value)
  }

  /**
     * The level of the connector as analog input.
     * @param {number} analogPin - pin number of the connector
     * @returns {Promise} - a Promise which resolves analog level when the response was returned
     */
  getAnalogLevel (analogPin) {
    if (!this.isConnected()) return Promise.resolve(0)
    return this.board.updateAnalogInput(analogPin)
      .then(raw => Math.round((raw / 1023) * 1000) / 10)
      .catch(reason => {
        console.log(`analogRead(${analogPin}) was rejected by ${reason}`)
        return 0
      })
  }

  /**
     * The level [%] of analog A1 connector
     * @returns {Promise<number>} - a Promise which resolves analog level when the response was returned
     */
  analogLevelA1 () {
    return this.getAnalogLevel(0)
  }

  /**
     * The level [%] of analog A2 connector
     * @returns {Promise<number>} - a Promise which resolves analog level when the response was returned
     */
  analogLevelA2 () {
    return this.getAnalogLevel(1)
  }

  /**
     * The level [%] of analog B1 connector
     * @returns {Promise<number>} - a Promise which resolves analog level when the response was returned
     */
  analogLevelB1 () {
    return this.getAnalogLevel(2)
  }

  /**
     * The level [%] of analog A1 connector
     * @returns {Promise<number>} - a Promise which resolves analog level when the response was returned
     */
  analogLevelB2 () {
    return this.getAnalogLevel(3)
  }

  /**
     * Set the connector to power [%] as PWM.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {string | number} args.LEVEL - power (%) of PWM
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  analogLevelSet (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    const percent = Math.min(Math.max(Cast.toNumber(args.LEVEL), 0), 100)
    const value = Math.round(this.board.RESOLUTION.PWM * (percent / 100))
    this.board.pinMode(pin, this.board.MODES.PWM)
    return this.board.pwmWrite(pin, value)
  }

  /**
     * Turn the servo motor to the degrees (-90...90).
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {number} args.ANGLE - degrees to the servo to turn
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  servoTurn (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    const angle = Cast.toNumber(args.ANGLE)
    let servoValue = 90 - angle // = 180 - (angle + 90)
    servoValue = Math.min(180, Math.max(0, servoValue))
    this.board.pinMode(pin, this.board.MODES.SERVO)
    return this.board.servoWrite(pin, servoValue)
  }

  /**
     * Write data to register
     * @param {object} args - the block's arguments.
     * @param {number} args.ADDRESS - I2C address
     * @param {number} args.REGISTER - register which write to
     * @param {Array<string>} args.DATA - bytes to be written
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  i2cWrite (args) {
    if (!this.isConnected()) return
    const address = Number(args.ADDRESS)
    const register = Number(args.REGISTER)
    const data = readAsNumericArray(args.DATA)
    return this.board.i2cWrite(address, register, data)
  }

  /**
     * Read data from I2C once.
     * @param {object} args - the block's arguments.
     * @param {number} args.ADDRESS - I2C address
     * @param {number} args.REGISTER - register to read
     * @returns {Promise<string>} a Promise which resolves read data
     */
  i2cReadOnce (args) {
    if (!this.isConnected()) return ''
    const address = Number(args.ADDRESS)
    const register = Number(args.REGISTER)
    const length = parseInt(Cast.toNumber(args.LENGTH), 10)
    return this.board.i2cReadOnce(address, register, length)
      .then(data => numericArrayToString(data))
      .catch(reason => {
        console.log(`i2cReadOnce(${address}, ${register}, ${length}) was rejected by ${reason}`)
        return ''
      })
  }

  /**
     * Reset OneWire modules on the pin
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  oneWireReset (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    return this.board.sendOneWireReset(pin)
  }

  /**
     * Writ data to the first OneWire module.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {Array<string>} args.DATA - bytes to be written
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  oneWireWrite (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    const data = readAsNumericArray(args.DATA)
    return this.board.oneWireWrite(pin, data)
      .catch(error => {
        console.log(error)
        return error.message ? error.message : error
      })
  }

  /**
     * Read on OneWire.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @returns {Promise<string>} return a Promise which will resolve with read data
     */
  oneWireRead (args) {
    if (!this.isConnected()) return Promise.resolve('')
    const pin = parseInt(args.CONNECTOR, 10)
    const length = parseInt(Cast.toNumber(args.LENGTH), 10)
    return this.board.oneWireRead(pin, length)
      .then(readData => numericArrayToString(readData))
      .catch(reason => {
        console.log(`oneWireRead(${pin}, ${length}) was rejected by ${reason}`)
        return ''
      })
  }

  /**
     * Write then read on OneWire.
     * @param {object} args - the block's arguments.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<string>} return a Promise which will resolve with read data
     */
  oneWireWriteAndRead (args) {
    if (!this.isConnected()) return Promise.resolve('')
    const pin = parseInt(args.CONNECTOR, 10)
    const data = readAsNumericArray(args.DATA)
    const readLength = parseInt(Cast.toNumber(args.LENGTH), 10)
    return this.board.oneWireWriteAndRead(pin, data, readLength)
      .then(readData => numericArrayToString(readData))
      .catch(reason => {
        console.log(`oneWireWriteAndRead(${pin}, ${data}, ${readLength}) was rejected by ${reason}`)
        return ''
      })
  }


  /**
     * Configure a NeoPixel module on the pin.
     * @param {object} args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @param {string} args.CONNECTOR - pin number of the connector
     * @param {string} args.LENGTH - length of LEDs on the module
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelConfigStrip (args, util) {
    if (!this.isConnected()) return
    if (this.neoPixelBusy) {
      if (util) {
        util.yield() // re-try this call after a while.
      }
      return // Do not return Promise.resolve() to re-try.
    }
    this.neoPixelBusy = true
    const pin = parseInt(args.CONNECTOR, 10)
    const length = parseInt(Cast.toNumber(args.LENGTH), 10)
    return this.board.neoPixelConfigStrip(pin, length)
      .finally(() => {
        this.neoPixelBusy = false
      })
  }

  /**
     * Update color of LEDs on the all of NeoPixel modules.
     * @param {object} _args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelShow (_args, util) {
    if (!this.isConnected()) return
    if (this.neoPixelBusy) {
      if (util) {
        util.yield() // re-try this call after a while.
      }
      return // Do not return Promise.resolve() to re-try.
    }
    this.neoPixelBusy = true
    return this.board.neoPixelShow()
      .finally(() => {
        this.neoPixelBusy = false
      })
  }

  /**
     * Set color of the LED
     * @param {object} args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @param {number} args.CONNECTOR - pin number of the connector
     * @param {string} args.POSITION - position of the LED on the module start at 1
     * @param {string} args.COLOR - color values [r, g, b]
     * @param {string} args.BRIGHTNESS - brightness fo the LED [%]
     */
  neoPixelSetColor (args, util) {
    if (!this.isConnected()) return
    if (this.neoPixelBusy) {
      if (util) {
        util.yield() // re-try this call after a while.
      }
      return // Do not return Promise.resolve() to re-try.
    }
    this.neoPixelBusy = true
    const pin = parseInt(args.CONNECTOR, 10)
    const index = Cast.toNumber(args.POSITION) - 1
    const brightness = Math.max(0, Math.min(100, Cast.toNumber(args.BRIGHTNESS))) / 100
    const color = readAsNumericArray(args.COLOR)
    const r = Math.round(Math.max(0, Math.min(255, color[0])) * brightness)
    const g = Math.round(Math.max(0, Math.min(255, color[1])) * brightness)
    const b = Math.round(Math.max(0, Math.min(255, color[2])) * brightness)
    this.board.neoPixelSetColor(pin, index, [r, g, b])
      .finally(() => {
        this.neoPixelBusy = false
      })
  }

  /**
     * Return color values for NeoPixel.
     * @param {object} args - the block's arguments.
     * @param {string} args.RED - value for red [0...255]
     * @param {string} args.GREEN - value for green [0...255]
     * @param {string} args.BLUE - value for blue [0...255]
     * @returns {string} color value [r, g, b] in string
     */
  neoPixelColor (args) {
    const r = Math.round(Math.max(0, Math.min(255, Cast.toNumber(args.RED))))
    const g = Math.round(Math.max(0, Math.min(255, Cast.toNumber(args.GREEN))))
    const b = Math.round(Math.max(0, Math.min(255, Cast.toNumber(args.BLUE))))
    return numericArrayToString([r, g, b])
  }

  /**
     * Turn off the all LEDs on the NeoPixel module on the pin.
     * @param {object} args - the block's arguments.
     * @param {string} args.CONNECTOR - pin number of the connector
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelClear (args) {
    if (!this.isConnected()) return
    const pin = parseInt(args.CONNECTOR, 10)
    return this.board.neoPixelClear(pin)
  }

  /**
     * Measure distance [mm] using ToF sensor VL53L0X.
     * @returns {Promise<number>} a Promise which resolves distance
     */
  async measureDistanceWithLight () {
    if (!this.isConnected()) return 0
    if (!this.vl53l0x) {
      let newSensor = new VL53L0X(this.board)
      const found = await newSensor.init(true)
      if (!found) return 0
      await newSensor.startContinuous()
        .catch(reason => {
          console.log(`fail to VL53L0X.startContinuous() by ${reason}`)
          newSensor = null
        })
      if (!newSensor) return 0
      this.vl53l0x = newSensor
    }
    const distance = await this.vl53l0x.readRangeContinuousMillimeters()
      .then(mm => mm / 10)
      .catch(reason => {
        console.log(`VL53L0X.readRangeContinuousMillimeters() was rejected by ${reason}`)
        this.vl53l0x = null
        return 0
      })
    return distance
  }

  /**
     * Measure distance [cm] using ultrasonic sensor HC-SR04.
     * @param {number} pin - pin number to trigger the sensor
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<number>} a Promise which resolves distance [cm]
     */
  measureDistanceWithUltrasonic (pin, util) {
    if (!this.isConnected()) return Promise.resolve(0)
    if (this.pingSensing) {
      util.yield() // re-try this call after a while.
      return // Do not return Promise.resolve() to re-try.
    }
    this.pingSensing = true
    return this.board.pingSensor(pin)
      .then(value => Math.round(value / 10))
      .catch(reason => {
        console.log(`pingSensor(${pin}) was rejected by ${reason}`)
        return 0
      })
      .finally(() => {
        this.pingSensing = false
      })
  }

  /**
     * Measure distance [cm] using ultrasonic sensor on Digital A.
     * @param {object} _args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<number>} a Promise which resolves distance [cm]
     */
  measureDistanceWithUltrasonicA (_args, util) {
    return this.measureDistanceWithUltrasonic(10, util)
  }

  /**
     * Measure distance [cm] using ultrasonic sensor on Digital B.
     * @param {object} _args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<number>} a Promise which resolves distance [cm]
     */
  measureDistanceWithUltrasonicB (_args, util) {
    return this.measureDistanceWithUltrasonic(6, util)
  }

  /**
     * Get acceleration [m/s^2] for the axis using ADXL345
     * @param {string} axis - axis to get
     * @returns {Promise<number>} return a Promise which resolves acceleration
     */
  async getAccelerationADXL345 (axis) {
    if (!this.isConnected()) return Promise.resolve(0)
    if (!this.adxl345) {
      const newSensor = new ADXL345(this.board)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return Promise.resolve(0)
      }
      this.adxl345 = newSensor
    }
    return this.adxl345.getAcceleration()
      .then(acceleration => {
        if (axis === 'absolute') {
          return Math.round(
            Math.sqrt(
              (acceleration.x ** 2) +
                            (acceleration.y ** 2) +
                            (acceleration.z ** 2)
            ) * 100) / 100
        }
        return acceleration[axis]
      })
      .catch(reason => {
        console.log(`ADXL345.getAcceleration() was rejected by ${reason}`)
        this.adxl345 = null
        return 0
      })
  }

  /**
     * Get acceleration [m/s^2] for axis X
     * @returns {Promise<number>} return a Promise which resolves acceleration
     */
  getAccelerationX () {
    return this.getAccelerationADXL345('x')
  }

  /**
     * Get acceleration [m/s^2] for axis Y
     * @returns {Promise<number>} return a Promise which resolves acceleration
     */
  getAccelerationY () {
    return this.getAccelerationADXL345('y')
  }

  /**
     * Get acceleration [m/s^2] for axis Z
     * @returns {Promise<number>} return a Promise which resolves acceleration
     */
  getAccelerationZ () {
    return this.getAccelerationADXL345('z')
  }

  /**
     * Get absolute acceleration [m/s^2]
     * @returns {Promise<number>} return a Promise which resolves acceleration
     */
  getAccelerationAbsolute () {
    return this.getAccelerationADXL345('absolute')
  }

  /**
     * Get roll [degree] using ADXL345.
     * @returns {Promise<number>} a Promise which resolves roll
     */
  async getRollADXL345 () {
    if (!this.isConnected()) return 0
    if (!this.adxl345) {
      const newSensor = new ADXL345(this.board)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return 0
      }
      this.adxl345 = newSensor
    }
    return this.adxl345.getAcceleration()
      .then(acceleration =>
        Math.atan2(acceleration.y, acceleration.z) * 180.0 / Math.PI
      )
      .catch(reason => {
        console.log(`ADXL345.getAcceleration() was rejected by ${reason}`)
        this.adxl345 = null
        return 0
      })
  }

  /**
     * Get pitch [degree] using ADXL345.
     * @returns {Promise<number>} a Promise which resolves pitch
     */
  async getPitchADXL345 () {
    if (!this.isConnected()) return 0
    if (!this.adxl345) {
      const newSensor = new ADXL345(this.board)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return 0
      }
      this.adxl345 = newSensor
    }
    return this.adxl345.getAcceleration()
      .then(acceleration => {
        const angle = Math.atan2(
          acceleration.x,
          Math.sqrt((acceleration.y * acceleration.y) + (acceleration.z * acceleration.z))
        ) *
                180.0 / Math.PI
        if (acceleration.z > 0) return angle
        return ((angle > 0) ? 180 : -180) - angle
      })
      .catch(reason => {
        console.log(`ADXL345.getAcceleration() was rejected by ${reason}`)
        this.adxl345 = null
        return 0
      })
  }

  /**
     * Get temperature from BME280
     * @returns {Promise<number>} a Promise which resolves value of temperature [℃]
     */
  async getTemperatureBME280 () {
    if (!this.isConnected()) return Promise.resolve(0)
    if (!this.bme280) {
      const b = store.state.serial.firmata
      console.log(b)
      const newSensor = new BME280(b)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return Promise.resolve(0)
      }
      this.bme280 = newSensor
    }
    return this.bme280.readTemperature()
      .then(temp => (Math.round(temp * 100) / 100))
      .catch(reason => {
        console.log(`BME280.readTemperature() was rejected by ${reason}`)
        this.bme280 = null
        return 0
      })
  }

  /**
     * Get pressure from BME280
     * @returns {Promise<number>} a Promise which resolves value of pressure [hPa]
     */
  async getPressureBME280 () {
    if (!this.isConnected()) return Promise.resolve(0)
    if (!this.bme280) {
      const newSensor = new BME280(this.board)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return Promise.resolve(0)
      }
      this.bme280 = newSensor
    }
    return this.bme280.readPressure()
      .then(press => (Math.round(press * 100) / 10000))
      .catch(reason => {
        console.log(`BME280.readPressure() was rejected by ${reason}`)
        this.bme280 = null
        return 0
      })
  }

  /**
     * Get humidity from BME280
     * @returns {Promise<number>} a Promise which resolves value of humidity [%]
     */
  async getHumidityBME280 () {
    if (!this.isConnected()) return Promise.resolve(0)
    if (!this.bme280) {
      const newSensor = new BME280(this.board)
      try {
        await newSensor.init()
      } catch (error) {
        // fail to create instance
        console.log(error)
        return Promise.resolve(0)
      }
      this.bme280 = newSensor
    }
    return this.bme280.readHumidity()
      .then(hum => (Math.round(hum * 100) / 100))
      .catch(reason => {
        console.log(`BME280.readHumidity() was rejected by ${reason}`)
        this.bme280 = null
        return 0
      })
  }

  /**
     * Get brightness from LTR-303 on I2C
     * @returns {Promise<number>} a Promise which resolves value of brightness [Lux]
     */
  async getBrightnessLTR303 () {
    if (!this.isConnected()) return Promise.resolve(0)
    const i2cAddr = 0x29
    const partIDReg = 0x86
    const partID = await this.board.i2cReadOnce(i2cAddr, partIDReg, 1)
    if ((partID[0] & 0xF0) !== 0xA0) {
      // no LTR-303 on I2C
      return 0
    }
    try {
      await this.board.i2cWrite(i2cAddr, 0x80, 1)
      const ch1data = await this.board.i2cReadOnce(i2cAddr, 0x88, 2)
      const ch1 = ch1data[0] | (ch1data[1] << 8)
      const ch0data = await this.board.i2cReadOnce(i2cAddr, 0x8A, 2)
      const ch0 = ch0data[0] | (ch0data[1] << 8)
      const ratio = ch1 / (ch0 + ch1)
      let lux = 0
      if (ratio < 0.45) {
        lux = ((1.7743 * ch0) + (1.1059 * ch1))
      } else if (ratio < 0.64 && ratio >= 0.45) {
        lux = ((4.2785 * ch0) - (1.9548 * ch1))
      } else if (ratio < 0.85 && ratio >= 0.64) {
        lux = ((0.5926 * ch0) + (0.1185 * ch1))
      }
      return Math.round(lux * 10) / 10
    } catch (error) {
      console.log(`Reading brightness from LTR-303 I2C was rejected by ${error}`)
      return 0
    }
  }

  /**
     * Get temperature using DS18B20 on the pin.
     * @param {number} pin - pin number to use
     * @returns {Promise<number>} a Promise which resolves value of temperature [℃]
     */
  getTemperatureDS18B20 (pin) {
    return this.board.sendOneWireReset(pin)
      .then(() => this.board.oneWireWrite(pin, 0x44))
      .then(() => this.board.sendOneWireReset(pin))
      .then(() => this.board.oneWireWriteAndRead(pin, 0xBE, 9))
      .then(readData => {
        const buffer = new Uint8Array(readData).buffer
        const dataView = new DataView(buffer)
        const rawTemp = dataView.getInt16(0, true)
        return Math.round((rawTemp / 16) * 10) / 10
      })
  }

  /**
     * Get water temperature on Digital A1.
     * Return 0 if it was not connected.
     * @param {object} _args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<number>} a Promise which resolves value of temperature [℃]
     */
  getWaterTemperatureA (_args, util) {
    if (!this.isConnected()) return Promise.resolve(0)
    if (this.waterTemperatureASensing) {
      util.yield() // re-try this call after a while.
      return // Do not return Promise.resolve() to re-try.
    }
    this.waterTemperatureASensing = true
    return this.getTemperatureDS18B20(10) // Digital A1: 10
      .catch(() => 0)
      .finally(() => {
        this. waterTemperatureASensing = false
      })
  }

  /**
     * Get water temperature on Digital B1.
     * Return 0 if it was not connected.
     * @param {object} _args - the block's arguments.
     * @param {BlockUtility} util - utility object provided by the runtime.
     * @returns {Promise<number>} a Promise which resolves value of temperature [℃]
     */
  async getWaterTemperatureB (_args, util) {
    if (!this.isConnected()) return Promise.resolve(0)
    if (this.waterTemperatureBSensing) {
      util.yield() // re-try this call after a while.
      return // Do not return Promise.resolve() to re-try.
    }
    this.waterTemperatureBSensing = true
    return this.getTemperatureDS18B20(6) // Digital B1: 6
      .catch(() => 0)
      .finally(() => {
        this. waterTemperatureBSensing = false
      })
  }

  /**
     * Return whether the accelerometer was shaken.
     * @returns {boolean} true when the accelerometer was shaken
     */
  whenShaken () {
    if (!this.resetShakeEventTimer) {
      this.getAccelerationADXL345('absolute')
        .then(prev => {
          setTimeout(() => {
            this.getAccelerationADXL345('absolute')
              .then(next => {
                this.shaken = ((next - prev) > this.shakeEventThreshold)
                this.resetShakeEventTimer = setTimeout(() => {
                  this.resetShakeEventTimer = null
                }, this.runtime.currentStepTime)
              })
          }, this.shakeEventInterval)
        })
    }
    return !!this.shaken
  }

  /**
     * Return a number at the index [one-based] in the numeric array.
     * @param {object} args - the block's arguments.
     * @param {string} args.ARRAY - numeric array
     * @returns {string} a number at the index
     */
  numberAtIndex (args) {
    const array = readAsNumericArray(args.ARRAY)
    let index = Number(args.INDEX)
    if (isNaN(index)) {
      index = 0
    }
    index = Math.min(array.length, Math.max(1, index))
    index = Math.floor(index)
    return array[index - 1]
  }

  /**
     * Remove or replace numbers and/or add new numbers at the index in the numeric array.
     * @param {object} args - the block's arguments.
     * @param {string} args.ARRAY - numeric array
     * @param {string} args.INDEX - index to operate
     * @param {string} args.DELETE - count to be deleted
     * @param {string} args.INSERT - numeric array to be inserted
     * @returns {string} the modified numeric array
     */
  spliceNumbers (args) {
    const array = readAsNumericArray(args.ARRAY)
    let index = Number(args.INDEX)
    if (isNaN(index)) {
      index = 0
    }
    index = Math.floor(index)
    let deleteCount = Number(args.DELETE)
    if (isNaN(deleteCount)) {
      deleteCount = 0
    }
    deleteCount = Math.min(array.length, Math.max(0, deleteCount))
    deleteCount = Math.floor(deleteCount)
    const newNumbers = readAsNumericArray(args.INSERT)
    array.splice(((index > 0) ? index - 1 : index), deleteCount, ...newNumbers)
    return numericArrayToString(array)
  }

  /**
     * Return the length of the numeric array.
     * @param {object} args - the block's arguments.
     * @param {string} args.ARRAY - numeric array
     * @returns {number} length of the numeric array
     */
  lengthOfNumbers (args) {
    const array = readAsNumericArray(args.ARRAY)
    return array.length
  }

  /**
     * Read numbers as the type and endian from the array of 8 bit data.
     * @param {object} args - the block's arguments.
     * @param {string} args.ARRAY - numeric array of 8 bit data
     * @param {string} args.ENDIAN - endian [little|big] of the number
     * @param {string} args.TYPE - type [Int16|Uint16] of the number
     * @returns {string} a numeric array of the converted numbers
     */
  readBytesAs (args) {
    try {
      const array = readAsNumericArray(args.ARRAY)
      const buffer = new Uint8Array(array).buffer
      const dataView = new DataView(buffer)
      const little = (args.ENDIAN === 'little')
      const result = []
      if (args.TYPE === 'Int16') {
        if (array.length < 2) return ''
        for (let index = 0; index < Math.floor(array.length / 2); index++) {
          const element = dataView.getInt16(index * 2, little)
          result[index] = element
        }
        return numericArrayToString(result)
      }
      if (args.TYPE === 'Uint16') {
        if (array.length < 2) return ''
        for (let index = 0; index < Math.floor(array.length / 2); index++) {
          const element = dataView.getUint16(index * 2, little)
          result[index] = element
        }
        return numericArrayToString(result)
      }
    } catch (error) {
      console.log(error)
    }
    return ''
  }

  /**
     * Do the arithmetic operator with the arguments in 64 bit integer.
     * @param {object} args - the block's arguments.
     * @param {string} args.OP - operator
     * @param {string} args.LEFT - left side value
     * @param {string} args.RIGHT - right side value
     * @returns {string} result of this operation
     */
  int64Operation (args) {
    const op = args.OP
    const left = integer64From(args.LEFT)
    const right = integer64From(args.RIGHT)
    if (op === '＋') {
      return left.add(right).toString(10)
    }
    if (op === '－') {
      return left.subtract(right).toString(10)
    }
    if (op === '✕') {
      return left.multiply(right).toString(10)
    }
    if (op === '÷') {
      return left.divide(right).toString(10)
    }
    if (op === 'mod') {
      return left.modulo(right).toString(10)
    }
  }

  /**
     * Do the bitwise operation with the arguments in 64 bit integer.
     * @param {object} args - the block's arguments.
     * @param {string} args.OP - operator
     * @param {string} args.LEFT - left side value
     * @param {string} args.RIGHT - right side value
     * @returns {string} result of this operation
     */
  bitOperation (args) {
    const op = args.OP
    const left = integer64From(args.LEFT)
    const right = integer64From(args.RIGHT)
    if (op === '<<') {
      return left.shiftLeft(right).toString(10)
    }
    if (op === '>>') {
      return left.shiftRight(right).toString(10)
    }
    if (op === '&') {
      return left.and(right).toString(10)
    }
    if (op === '|') {
      return left.or(right).toString(10)
    }
    if (op === '^') {
      return left.xor(right).toString(10)
    }
  }

  /**
     * Returns the bitwise NOT in 64 bit integer.
     * @param {object} args - the block's arguments.
     * @param {string} args.VALUE - value to be operated
     * @returns {string} result of this operation
     */
  bitNot (args) {
    const bits = integer64From(args.VALUE)
    return bits.not().toString()
  }
}

export {
  ExtensionBlocks as default,
  ExtensionBlocks as blockClass
}
