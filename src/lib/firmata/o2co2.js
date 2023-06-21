/**
 * SCD4x API
 * 
 * 酸素＆二酸化炭素濃度取得のサンプルコード(Scratch)
 * https://xcratch.github.io/editor/#https://akadako.com/xcratch/files/06fe7b7680a26ce38389ac95d70b8fb9/5wgi0ik81sw0swcocg8og8go.sb3
 * 
 * データシート
 * https://files.seeedstudio.com/wiki/Grove-CO2&Temperature&HumiditySensor-SCD4/res/Sensirion_CO2_Sensors_SCD4x_Datasheet.pdf
 * https://www.winsen-sensor.com/sensors/o2-sensor/ze03-o2.html
 */

/**
 * default I2C address
 * @enum {number}
 */
const SCD4x_I2C_ADDRESS = 0x62 // Primary I2C Address for Seeed Grove module
const SCD4x_I2C_ADDRESS_O2 = 0x63 // O2センサーは独立している

const timeout_10ms = 10

export default class O2CO2Sensor {
  /**
     * Constructor of SCD4x instance.
     * @param {AkaDakoBoard} board - connecting AkaDako board
     */
  constructor(board) {

    /**
         * Connecting AkaDako board
         * @type {import('./akadako-board').default}
         */
    this.board = board

    /**
         * I2C address
         * @type {number}
         */
    this.address = SCD4x_I2C_ADDRESS

    // 計測データ
    this.measureCO2 = 0
    this.measureTemperature = 0
    this.measureHumidity = 0
    this.measureO2 = 0
    // データ取得間隔
    this.measureLastUpdated = 0
    this.measureInterval = 1000
    // 初期化フラグ
    this.initiated = false
    // データ取得が2重に行われないためのフラグ
    this.reading = false
  }

  /**
     * Initialize the sensor
     * @returns {Promise} a Promise which resolves when the sensor was initialized
     */
  async init() {
    if(this.initiated) {
      return
    }
    console.log('init 1')
    // get_serial_number
    await this.board.i2cWrite(0x62, 0x36, 0x82)
    console.log('init 1.2')
    const get_serial_number_data = await this.board.i2cReadOnce(0x62, 0x00, 9, timeout_10ms)
    console.log('init 3')
    const serial_number = [get_serial_number_data[0], get_serial_number_data[1], get_serial_number_data[3], get_serial_number_data[4], get_serial_number_data[6], get_serial_number_data[7]]
    console.log('init 4', serial_number)
    const serial_number_string = serial_number.map(u8 => u8.toString(16).padEnd(2,'0')).join('').toUpperCase()
    console.log('init 5')
    console.log('get_serial_number', serial_number_string)
    // start_periodic_mesurement
    await this.board.i2cWrite(0x62, 0x21, 0xb1)
    console.log('init 6')
    this.initiated = true
  }

  // データの準備ができるまで待つ
  async waitDataReady() {
    let isDataReady = false
    // Send the 'get_data_ready_status' command
    // 3バイトのデータを読み込んで、最初2バイトの下位11ビットが0になるまで待つ
    while (!isDataReady) {
      await this.board.i2cWrite(0x62, 0xe4, 0xb8)
      const data = await this.board.i2cReadOnce(0x62, 0x00, 3, timeout_10ms)
      isDataReady = ((data[0] << 8 + data[1]) & 0x07ff) == 0
      console.log('ready', isDataReady)
      if (!isDataReady) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  async readMeasurement() {
    if (this.reading) {
      return
    }
    if(Date.now() < this.measureLastUpdated + this.measureInterval) {
      return
    }
    this.reading = true
    console.log('readMeasurement 1')
    await this.init()
    console.log('readMeasurement 2')
    await this.waitDataReady()
    console.log('readMeasurement 3')
    // Send the '' command
    await this.board.i2cWrite(SCD4x_I2C_ADDRESS, 0xec, 0x05)
    const data = await this.board.i2cReadOnce(SCD4x_I2C_ADDRESS, 0x00, 9, timeout_10ms)
    this.measureCO2 = data[0] << 8 | data[1]
    this.measureTemperature = data[3] << 8 | data[4]
    this.measureHumidity = data[6] << 8 | data[7]
    // O2 だけ独立している
    console.log('readMeasurement 5')
    this.measureO2 = await this.board.i2cReadOnce(SCD4x_I2C_ADDRESS_O2, 0x00, 1, timeout_10ms).then(data => data[0] / 10)

    this.measureLastUpdated = Date.now()
    this.reading = false
  }

  async getCO2() {
    await this.readMeasurement()
    return this.measureCO2
  }

  async getO2() {
    await this.readMeasurement()
    return this.measureO2
  }

}
