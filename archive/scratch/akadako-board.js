import {EventEmitter} from 'events'
import bindTransport from 'firmata-io'
import SerialPort from '@serialport/stream'
import WSABinding from 'web-serial-binding'
import {
  FIRMATA_7BIT_MASK,
  COLOR_ORDER,
  PIXEL_COMMAND,
  PIXEL_CONFIG,
  PIXEL_SET_PIXEL,
  PIXEL_SHOW
} from './node-pixel-constants'

const PING_SENSOR_COMMAND = 0x01

const BOARD_VERSION_QUERY = 0x0F

/**
 * Returns a Promise which will reject after the delay time passed.
 * @param {number} delay - waiting time to reject in milliseconds
 * @returns {Promise<string>} Promise which will reject with reason after the delay.
 */
const timeoutReject = delay => new Promise((_, reject) => setTimeout(() => reject(`timeout ${delay}ms`), delay))

// Setup transport of Firmata.
SerialPort.Binding = WSABinding
const Firmata = bindTransport(SerialPort)

// eslint-disable-next-line prefer-const
export let DEBUG = false

/**
 * Gamma values table for NeoPixel.
 * @type {Array<number>}
 */
const neoPixelGammaTable = ((steps, gamma) => {
  const gammaTable = new Array(steps)
  for (let i = 0; i < steps; i++) {
    gammaTable[i] = Math.floor((Math.pow((i / 255.0), gamma) * 255) + 0.5)
  }
  return gammaTable
})(256, 2.8)

/**
 * Convert colors to gamma corrected value for NeoPixel.
 * @param {Array<number>} colors - color values [red, green, blue]
 * @param {Array<number>} gammaTable - gamma values
 * @returns {number} value for NeoPixel
 */
const neoPixelColorValue = (colors, gammaTable) => {
  // colors are assumed to be an array of [r, g, b] bytes
  // colorValue returns a packed value able to be pushed to firmata rather than
  // text values.
  // if gammaTable is passed then it should use the supplied gamma
  // correction table to correct the received value.

  // before sending, account for gamma correction.
  const gammaCorrectedColor = Object.assign({}, colors)
  gammaCorrectedColor[0] = gammaTable[gammaCorrectedColor[0]]
  gammaCorrectedColor[1] = gammaTable[gammaCorrectedColor[1]]
  gammaCorrectedColor[2] = gammaTable[gammaCorrectedColor[2]]
  return (
    (gammaCorrectedColor[0] << 16) +
        (gammaCorrectedColor[1] << 8) +
        (gammaCorrectedColor[2])
  )
}

/**
 * This class represents a board communicating with Firmata protocol.
 */
class AkaDakoBoard extends EventEmitter {

  /**
     * Event name for reporting that this board has been released.
     * @const {string}
     */
  static get RELEASED () {
    return 'RELEASED'
  }

  /**
     * Construct a AkaDako board object.
     * @param {Runtime} runtime - the Scratch runtime
     */
  constructor (runtime) {
    super()

    this.name = 'AkaDakoBoard'

    /**
         * The Scratch runtime to register event listeners.
         * @type {Runtime}
         * @private
         */
    this.runtime = runtime

    /**
         * State of this board
         * @type {string}
         */
    this.state = 'disconnect'

    /**
         * The Firmata for reading/writing peripheral data.
         * @type {Firmata}
         * @private
         */
    this.firmata = null

    /**
         * The serial port for transporting of Firmata.
         * @type {SerialPort}
         */
    this.port = null

    /**
         * ID of the extension which requested to open port.
         * @type {string}
         */
    this.extensionId = null

    /**
         * shortest interval time between digital input readings
         * @type {number}
         */
    this.digitalReadInterval = 20

    /**
         * Waiting time to connect the board in milliseconds.
         * @type {number}
         */
    this.connectingWaitingTime = 1000

    /**
         * shortest interval time between analog input readings
         * @type {number}
         */
    this.analogReadInterval = 20

    /**
         * shortest interval time between message sending
         * @type {number}
         */
    this.sendingInterval = 10

    /**
         * Waiting time for response of digital input reading in milliseconds.
         * @type {number}
         */
    this.updateDigitalInputWaitingTime = 100

    /**
         * Waiting time for response of analog input reading in milliseconds.
         * @type {number}
         */
    this.updateAnalogInputWaitingTime = 100

    /**
         * Waiting time for response of I2C reading in milliseconds.
         * @type {number}
         */
    this.i2cReadWaitingTime = 100

    /**
         * Waiting time for response of OneWire reading in milliseconds.
         * @type {number}
         */
    this.oneWireReadWaitingTime = 100

    /**
         * Waiting time for response of ping sensor reading in milliseconds.
         * @type {number}
         */
    this.pingSensorWaitingTime = 100

    /**
         * Port information of the connected serial port.
         * @type {object}
         */
    this.portInfo = null

    /**
         * Parameters of the NeoPixel strips.
         * @type {Array<object>}
         */
    this.neoPixel = []

    /**
         * Default length for NeoPixel module.
         * @type {number}
         */
    this.defaultNeoPixelLength = 32
  }

  /**
     * Open a port to connect a AkaDako board.
     * @param {string} extensionId - ID of the extension which is requesting
     * @param {object} options - serial port options
     * @returns {Promise<AkaDakoBoard>} a Promise which resolves a connected AkaDako board or reject with reason
     */
  async requestPort (extensionId, options) {
    if (this.port) return Promise.resolve(this) // already opened
    this.state = 'portRequesting'
    this.extensionId = extensionId
    let nativePort = null
    const permittedPorts = await navigator.serial.getPorts()
    if ((permittedPorts !== null) && (Array.isArray(permittedPorts)) && (permittedPorts.length > 0)) {
      nativePort = permittedPorts[0]
    } else {
      nativePort = await navigator.serial.requestPort(options)
    }
    this.port = new SerialPort(nativePort, {
      baudRate: 57600, // firmata: 57600
      autoOpen: false
    })
    this.portInfo = this.port.path.getInfo()
    this.firmata = new Firmata(this.port, {reportVersionTimeout: 0})
    this.firmata.once('open', () => {
      this.state = 'connect'
    })
    this.firmata.once('close', () => {
      if (this.state === 'disconnect') return
      this.releaseBoard()
    })
    this.firmata.once('disconnect', error => {
      if (this.state === 'disconnect') return
      this.handleDisconnectError(error)
    })
    this.firmata.once('error', error => {
      if (this.state === 'disconnect') return
      this.handleDisconnectError(error)
    })
    if (DEBUG) {
      this.port.addListener('data', data => {
        console.log(data)
      })
    }
    const request = new Promise((resolve, reject) => {
      this.port.open(error => {
        if (error) {
          if (error.name !== 'InvalidStateError') {
            // fail by unknown reasons
            this.releaseBoard()
            reject(error)
            return
          }
          // this port was already opened
        }
        this.firmata.once('ready', () => {
          this.onBoarReady()
          resolve(this)
        })
      })
    })
    return Promise.race([request, timeoutReject(this.connectingWaitingTime)])
      .catch(reason => {
        this.releaseBoard()
        return Promise.reject(reason)
      })
  }

  /**
     * Called when a board was ready.
     */
  onBoarReady () {
    const firmInfo = this.firmata.firmware
    console.log(
      `${firmInfo.name}-${firmInfo.version.major}.${firmInfo.version.minor} on: ${JSON.stringify(this.portInfo)}`
    )
    this.firmata.i2cConfig()
    this.state = 'ready'
  }

  /**
     * Whether a board is connected.
     * @returns {boolean} true if a board is connected
     */
  isConnected () {
    return (this.state === 'connect' || this.state === 'ready')
  }

  /**
     * Whether the board is ready to operate.
     * @returns {boolean} true if the board is ready
     */
  isReady () {
    return this.state === 'ready'
  }

  /**
     * Release resources of the board then emit released-event.
     */
  releaseBoard () {
    this.state = 'disconnect'
    this.neoPixel = []
    if (this.port && this.port.isOpen) {
      this.port.close()
    }
    this.port = null
    this.oneWireDevices = null
    this.extensionId = null
    this.emit(AkaDakoBoard.RELEASED)
  }

  /**
     * Disconnect current connected board.
     */
  disconnect () {
    if (this.state === 'disconnect') return
    if (this.firmata && this.port && this.port.isOpen) {
      this.firmata.reset() // notify disconnection to board
    }
    this.releaseBoard()
  }

  /**
     * Handle an error resulting from losing connection to a peripheral.
     * This could be due to:
     * - unplug the connector
     * - being powered down
     *
     * Disconnect the device, and if the extension using this object has a
     * reset callback, call it.
     *
     * @param {string} error - cause of the error
     * @returns {undefined}
     */
  handleDisconnectError (error) {
    if (this.state === 'disconnect') return
    error = error ? error : 'Firmata was disconnected by device'
    console.error(error)
    this.runtime.emit(this.runtime.constructor.PERIPHERAL_CONNECTION_LOST_ERROR, {
      message: 'Scratch lost connection to',
      extensionId: this.extensionId
    })
    this.disconnect()
  }

  /**
     * Query the version information of the connected board.
     * @returns {string} version info
     */
  boardVersion () {
    const request = new Promise(resolve => {
      this.firmata.sysexResponse(BOARD_VERSION_QUERY, data => {
        const value = Firmata.decode([data[0], data[1]])
        const minor = value & 0x3F
        const major = (value >> 6) & 0x0F
        const type = (value >> 10) & 0x0F
        resolve(`${type}.${major}.${minor}`)
      })
      this.firmata.sysexCommand([BOARD_VERSION_QUERY])
    })
    return Promise.race([request, timeoutReject(100)])
      .finally(() => {
        this.firmata.clearSysexResponse(BOARD_VERSION_QUERY)
      })
  }

  /**
     * Asks the board to set the pin to a certain mode.
     * @param {number} pin - The pin you want to change the mode of.
     * @param {number} mode - The mode you want to set. Must be one of board.MODES
     * @returns {undefined}
     */
  pinMode (pin, mode) {
    return this.firmata.pinMode(pin, mode)
  }

  /**
     * Update pin value as a digital input when the last update was too old.
     * @param {number} pin - pin number to read
     * @returns {Promise<boolean>} a Promise which resolves boolean when the response was returned
     */
  updateDigitalInput (pin) {
    if (
      typeof this.pins[pin].mode !== 'undefined' &&
            this.pins[pin].mode !== this.firmata.MODES.INPUT &&
            this.pins[pin].mode !== this.firmata.MODES.PULLUP
    ) {
      return Promise.resolve(this.pins[pin].value)
    }
    if (this.pins[pin].updating ||
             (this.pins[pin].updateTime &&
                ((Date.now() - this.pins[pin].updateTime) < this.digitalReadInterval))) {
      return Promise.resolve(this.pins[pin].value)
    }
    this.pins[pin].updating = true
    const request = new Promise(resolve => {
      if (this.pins[pin].inputBias !== this.firmata.MODES.PULLUP) {
        this.pins[pin].inputBias = this.firmata.MODES.INPUT
      }
      this.firmata.pinMode(pin, this.pins[pin].inputBias)
      this.firmata.digitalRead(
        pin,
        value => {
          this.pins[pin].value = value
          this.pins[pin].updateTime = Date.now()
          resolve(this.pins[pin].value)
        })
    })
    return Promise.race([request, timeoutReject(this.updateDigitalInputWaitingTime)])
      .catch(reason => {
        this.pins[pin].value = 0
        return Promise.reject(reason)
      })
      .finally(() => {
        this.pins[pin].updating = false
      })
  }

  /**
     * Set input bias of the connector.
     * @param {number} pin - number of the pin
     * @param {boolean} pullUp - input bias of the pin [none | pullUp]
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  setInputBias (pin, pullUp) {
    this.pins[pin].inputBias = (pullUp ? this.MODES.PULLUP : this.MODES.INPUT)
    return new Promise(resolve => {
      this.pinMode(pin, this.pins[pin].inputBias)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Update pin value as a analog input when the last update was too old.
     * @param {number} analogPin - pin number to read
     * @returns {Promise<boolean>} a Promise which resolves boolean when the response was returned
     */
  updateAnalogInput (analogPin) {
    const pin = this.firmata.analogPins[analogPin]
    if (this.pins[pin].updating ||
             (this.pins[pin].updateTime &&
                ((Date.now() - this.pins[pin].updateTime) < this.analogReadInterval))) {
      return Promise.resolve(this.pins[pin].value)
    }
    this.pins[pin].updating = true
    const request = new Promise(resolve => {
      this.firmata.pinMode(analogPin, this.MODES.ANALOG)
      this.firmata.analogRead(
        analogPin,
        value => {
          this.pins[pin].value = value
          this.pins[pin].updateTime = Date.now()
          resolve(this.pins[pin].value)
        })
    })
    return Promise.race([request, timeoutReject(this.updateAnalogInputWaitingTime)])
      .catch(reason => {
        this.pins[pin].value = 0
        return Promise.reject(reason)
      })
      .finally(() => {
        this.pins[pin].updating = false
      })
  }

  /**
     * Asks the board to read digital data.
     * @param {number} pin - pin number to read
     * @param {function(number)} callback - the function to call when data has been received
     * @returns {undefined}
     */
  digitalRead (pin, callback) {
    return this.firmata.digitalRead(pin, callback)
  }

  /**
     * Asks the board to write a value to a digital pin
     * @param {number} pin - The pin you want to write a value to.
     * @param {number} value - The value you want to write. Must be board.HIGH or board.LOW
     * @param {boolean} enqueue - When true, the local state is updated but the command is not sent to the board
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  digitalWrite (pin, value, enqueue) {
    return new Promise(resolve => {
      this.firmata.digitalWrite(pin, value, enqueue)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Set PWM to the value on the pin
     * @param {number} pin - pin number to set
     * @param {number} value - PWM level
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  pwmWrite (pin, value) {
    return new Promise(resolve => {
      this.firmata.pwmWrite(pin, value)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Asks the board to move a servo
     * @param {number} pin - the pin the servo is connected to
     * @param {number} value - the degrees to move the servo to.
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  servoWrite (...args) {
    return new Promise(resolve => {
      this.firmata.servoWrite(...args)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Asks the board to read digital data.
     * @param {number} pin - pin number to read
     * @param {function(number)} callback - the function to call when data has been received
     * @returns {undefined}
     */
  analogRead (pin, callback) {
    return this.firmata.analogRead(pin, callback)
  }

  /**
     * Write multiple bytes to an I2C module
     * @param {number} address - address of the I2C device.
     * @param {number} register - register to write
     * @param {Array<number>} inBytes - bytes to be wrote
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  i2cWrite (address, register, inBytes) {
    return new Promise(resolve => {
      this.firmata.i2cWrite(address, register, inBytes)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Read multiple bytes from an I2C module
     * @param {number} address - address of the I2C device
     * @param {number} register - register to write
     * @param {number} readLength - byte size to read
     * @param {number} timeout - time to abort [milliseconds]
     * @returns {Promise<Array<number>>} a Promise which resolves read data
     */
  i2cReadOnce (address, register, readLength, timeout) {
    timeout = timeout ? timeout : this.i2cReadWaitingTime
    const request = new Promise(resolve => {
      this.firmata.i2cReadOnce(
        address,
        register,
        readLength,
        data => {
          resolve(data)
        }
      )
    })
    return Promise.race([request, timeoutReject(timeout)])
  }

  /**
     * Resets all devices on the OneWire bus.
     * @param {number} pin pin number to reset
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  sendOneWireReset (pin) {
    return new Promise(resolve => {
      this.firmata.sendOneWireReset(pin)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Return found IDs on the OneWire bus.
     * @param {number} pin - pin number to search
     * @returns {Promise<Array<number>>} a Promise which resolves found device IDs
     */
  searchOneWireDevices (pin) {
    return new Promise((resolve, reject) => {
      if (this.firmata.pins[pin].mode !== this.firmata.MODES.ONEWIRE) {
        this.firmata.sendOneWireConfig(pin, true)
        return this.firmata.sendOneWireSearch(pin, (error, founds) => {
          if (error) return reject(error)
          if (founds.length < 1) return reject(new Error('no device'))
          this.firmata.pinMode(pin, this.firmata.MODES.ONEWIRE)
          this.oneWireDevices = founds
          this.firmata.sendOneWireDelay(pin, 1)
          resolve(this.oneWireDevices)
        })
      }
      resolve(this.oneWireDevices)
    })
  }

  /**
     * Write bytes to the first OneWire module on the pin
     * @param {number} pin - pin number of the bus
     * @param {Array<number>} data - bytes to be wrote
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  oneWireWrite (pin, data) {
    return this.searchOneWireDevices(pin)
      .then(devices => {
        this.firmata.sendOneWireWrite(pin, devices[0], data)
      })
  }

  /**
     * Read bytes from the first OneWire module on the pin.
     * @param {number} pin - pin number of the bus
     * @param {number} length - byte size to read
     * @param {number} timeout - time to abort [milliseconds]
     * @returns {Promise<Array<number>>} a Promise which resolves read data
     */
  oneWireRead (pin, length, timeout) {
    timeout = timeout ? timeout : this.oneWireReadWaitingTime
    const request = this.searchOneWireDevices(pin)
      .then(devices =>
        new Promise((resolve, reject) => {
          this.firmata.sendOneWireRead(pin, devices[0], length, (readError, data) => {
            if (readError) return reject(readError)
            resolve(data)
          })
        }))
    return Promise.race([request, timeoutReject(timeout)])
  }

  /**
     * Write then read from the first OneWire module on the pin.
     * @param {number} pin - pin number of the bus
     * @param {Array<number>} data - bytes to read
     * @param {number} readLength - byte size to read
     * @param {number} timeout - time to abort [milliseconds]
     * @returns {Promise<Array<number>>} a Promise which resolves read data
     */
  oneWireWriteAndRead (pin, data, readLength, timeout) {
    timeout = timeout ? timeout : this.oneWireReadWaitingTime
    const request = this.searchOneWireDevices(pin)
      .then(devices =>
        new Promise((resolve, reject) => {
          this.firmata.sendOneWireWriteAndRead(
            pin,
            devices[0],
            data,
            readLength,
            (readError, readData) => {
              if (readError) return reject(readError)
              resolve(readData)
            })
        }))
    return Promise.race([request, timeoutReject(timeout)])
  }

  /**
     * Configure a NeoPixel module which have several LEDs.
     * @param {number} pin - pin number of the module
     * @param {number} length - amount of LEDs
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelConfigStrip (pin, length) {
    this.pins[pin].mode = PIXEL_COMMAND
    this.neoPixel = this.neoPixel.filter(aStrip => aStrip.pin !== pin)
    this.neoPixel.push({pin: pin, length: length})
    const message = []
    message[0] = PIXEL_COMMAND
    message[1] = PIXEL_CONFIG
    this.neoPixel.forEach(aStrip => {
      message.push((COLOR_ORDER.GRB << 5) | aStrip.pin)
      message.push(aStrip.length & FIRMATA_7BIT_MASK)
      message.push((aStrip.length >> 7) & FIRMATA_7BIT_MASK)
    })
    return new Promise(resolve => {
      this.firmata.sysexCommand(message)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Set color to an LED on the current NeoPixel module.
     * LED does not change the actual color until neoPixelShow() was sent.
     * This method will configure a new module with default length if it hasn't done yet.
     * @param {number} pin - pin number of the module
     * @param {number} index - index of LED to be set
     * @param {Array<numbers>} color - color value to be set [r, g, b]
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  async neoPixelSetColor (pin, index, color) {
    let address = 0
    let prevStrip = true
    this.neoPixel.forEach(aStrip => {
      if (aStrip.pin === pin) {
        address += Math.max(0, index % aStrip.length)
        prevStrip = false
      }
      if (prevStrip) {
        address += aStrip.length
      }
    })
    if (prevStrip) {
      // A module at the pin has not configured yet.
      await this.neoPixelConfigStrip(pin, this.defaultNeoPixelLength)
    }
    const colorValue = neoPixelColorValue(color, neoPixelGammaTable)
    const message = new Array(8)
    message[0] = (PIXEL_COMMAND)
    message[1] = (PIXEL_SET_PIXEL)
    message[2] = (address & FIRMATA_7BIT_MASK)
    message[3] = ((address >> 7) & FIRMATA_7BIT_MASK)
    message[4] = (colorValue & FIRMATA_7BIT_MASK)
    message[5] = ((colorValue >> 7) & FIRMATA_7BIT_MASK)
    message[6] = ((colorValue >> 14) & FIRMATA_7BIT_MASK)
    message[7] = ((colorValue >> 21) & FIRMATA_7BIT_MASK)
    return new Promise(resolve => {
      this.firmata.sysexCommand(message)
      setTimeout(() => resolve(), this.sendingInterval)
    })
  }

  /**
     * Turn off the all LEDs on the NeoPixel module on the pin.
     * @param {number} pin - pin number of the module
     */
  async neoPixelClear (pin) {
    const strip = this.neoPixel.find(aStrip => aStrip.pin === pin)
    const length = strip ? strip.length : this.defaultNeoPixelLength
    for (let index = 0; index < length; index++) {
      await this.neoPixelSetColor(pin, index, [0, 0, 0])
    }
    return this.neoPixelShow()
  }

  /**
     * Clear all strips.
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelClearAll () {
    return Promise.all(
      this.neoPixel.map(
        aStrip => this.neoPixelClear(aStrip.pin)
      )
    )
  }

  /**
     * Update color of LEDs on the all of NeoPixel modules.
     * @returns {Promise} a Promise which resolves when the message was sent
     */
  neoPixelShow () {
    const message = new Array(2)
    message[0] = PIXEL_COMMAND
    message[1] = PIXEL_SHOW
    return new Promise(resolve => {
      this.firmata.sysexCommand(message)
      setTimeout(() => resolve(), this.sendingInterval)
    })

  }

  /**
     * Trigger the sensor to measure distance
     * @param {number} pin - trigger pin of the sensor
     * @param {number} timeout - waiting time for the response
     * @returns {Promise<number>} a Promise which resolves value from the sensor
     */
  pingSensor (pin, timeout) {
    timeout = timeout ? timeout : this.pingSensorWaitingTime
    this.firmata.pinMode(pin, this.firmata.MODES.PING_READ)
    const request = new Promise(resolve => {
      this.firmata.sysexResponse(PING_SENSOR_COMMAND, data => {
        const value = Firmata.decode([data[1], data[2]])
        resolve(value)
      })
      this.firmata.sysexCommand([PING_SENSOR_COMMAND, pin])
    })
    return Promise.race([request, timeoutReject(timeout)])
      .finally(() => {
        this.firmata.clearSysexResponse(PING_SENSOR_COMMAND)
      })
  }

  /**
     * State of the all pins
     */
  get pins () {
    return this.firmata.pins
  }

  /**
     * All pin mode types
     * @types {object<string, number>}
     */
  get MODES () {
    return this.firmata.MODES
  }

  /**
     * Value for hight in digital signal
     * @types {number}
     */
  get HIGH () {
    return this.firmata.HIGH
  }

  /**
     * Value for low in digital signal
     * @types {number}
     */
  get LOW () {
    return this.firmata.LOW
  }

  /**
     * Resolution values for ADC, DAC, PWA.
     * @types {object<string, number>}
     */
  get RESOLUTION () {
    return this.firmata.RESOLUTION
  }
}

export default AkaDakoBoard
