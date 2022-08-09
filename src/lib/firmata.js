import Long from 'long'

const getLux = async (firmata) => {
  const i2cAddr = 0x29
  firmata.i2cConfig()

  let ch0, ch1, lux = 0
  return await new Promise((resolveParent) => {
    new Promise((resolve) => {
      firmata.i2cWrite(i2cAddr, 0x80, 1)
      resolve()
    })
      .then(() => {
        return new Promise((resolve) => {
          firmata.i2cReadOnce(i2cAddr, 0x88, 2, arr => {
            ch1 = arr[0] | (arr[1] << 8)
            resolve()
          })
        })
      })
      .then(() => {
        return new Promise((resolve) => {
          firmata.i2cReadOnce(i2cAddr, 0x8A, 2, arr => {
            ch0 = arr[0] | (arr[1] << 8)
            resolve()
          })
        })
      })
      .then(() => {
        const ratio = ch1 / (ch0 + ch1)
        if (ratio < 0.45) {
          lux = ((1.7743 * ch0) + (1.1059 * ch1))
        } else if (ratio < 0.64 && ratio >= 0.45) {
          lux = ((4.2785 * ch0) - (1.9548 * ch1))
        } else if (ratio < 0.85 && ratio >= 0.64) {
          lux = ((0.5926 * ch0) + (0.1185 * ch1))
        }
        resolveParent(Math.round(lux * 10) / 10)
      })
  })
    .then((v) => {
      return v
    })
}

const getTemperature = async (firmata, noLoop) => {
  firmata.i2cConfig()

  const address = 118
  let adc = 0
  let dig_T1 = 0
  let dig_T2 = 0
  let dig_T3 = 0
  let tFine = 0

  return await new Promise((resolveParent) => {
    new Promise((resolve) => {
      firmata.i2cReadOnce(address, 250, 3, (v) => {
        adc = (v[0] << 16) | (v[1] << 8) | v[0]
        resolve()
      })
    })
      .then(() => {
        return Promise.all([
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 136, 2, v => {
              dig_T1 = new DataView(new Uint8Array(v).buffer).getUint16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 138, 2, v => {
              dig_T2 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 140, 2, v => {
              dig_T3 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          })
        ])
      })
      .then(() => {
        adc >>= 4
        const var1 = (((adc / 8) - (dig_T1 * 2)) * dig_T2) / 2048
        const var2 = (adc / 16) - dig_T1
        const var3 = (((var2 * var2) / 4096) * (dig_T3)) / 16384
        tFine = var1 + var3
        if (noLoop) {
          resolveParent(tFine)
          return
        }
        const temp = ((tFine * 5) + 128) / 256 / 100
        resolveParent(Math.round(temp * 100) / 100)
      })
  })
    .then((v) => {
      return v
    })
    .catch(() => {
      return 0
    })
}

const getPressure = async (firmata) => {
  const address = 118
  let adc = 0
  let dig_P1 = 0
  let dig_P2 = 0
  let dig_P3 = 0
  let dig_P4 = 0
  let dig_P5 = 0
  let dig_P6 = 0
  let dig_P7 = 0
  let dig_P8 = 0
  let dig_P9 = 0
  const tFine = await getTemperature(firmata, true)

  return await new Promise((resolveParent) => {
    new Promise((resolve) => {
      firmata.i2cReadOnce(address, 247, 3, (v) => {
        adc = (v[0] << 16) | (v[1] << 8) | v[0]
        resolve()
      })
    })
      .then(() => {
        return Promise.all([
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 142, 2, v => {
              dig_P1 = new DataView(new Uint8Array(v).buffer).getUint16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 144, 2, v => {
              dig_P2 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 146, 2, v => {
              dig_P3 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 148, 2, v => {
              dig_P4 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 150, 2, v => {
              dig_P5 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 152, 2, v => {
              dig_P6 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 154, 2, v => {
              dig_P7 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 156, 2, v => {
              dig_P8 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 158, 2, v => {
              dig_P9 = new DataView(new Uint8Array(v).buffer).getInt16(0, true)
              resolve()
            })
          })
        ])
      })
      .then(() => {
        adc >>= 4
        let var1 = (Long.fromValue(tFine)).subtract(128000)
        let var2 = var1.multiply(var1).multiply(dig_P6)
        var2 = var2.add((var1.multiply(dig_P5)).multiply(131072))
        var2 = var2.add(Long.fromValue(dig_P4).multiply(34359738368))
        var1 = ((var1.multiply(var1).multiply(dig_P3))
          .divide(256))
          .add((var1.multiply(dig_P2).multiply(4096)))
        const var3 = (Long.fromValue(1)).multiply(140737488355328)
        var1 = var3.add(var1).multiply(dig_P1)
          .divide(8589934592)


        let var4 = Long.fromValue(1048576).subtract(adc)
        var4 = (var4.multiply(2147483648)
          .subtract(var2)
          .multiply(3125))
          .divide(var1)
        var1 = Long.fromValue(dig_P9)
          .multiply(var4.divide(8192))
          .multiply(var4.divide(8192))
          .divide(33554432)
        var2 = Long.fromValue(dig_P8)
          .multiply(var4)
          .divide(524288)
        var4 = var4
          .add(var1)
          .add(var2)
          .divide(256)
          .add(Long.fromValue(dig_P7).multiply(16))

        resolveParent(Math.round(var4.divide(256.0).toNumber() * 100) / 10000)
      })
  })

}

const getHumidity = async (firmata) => {
  const address = 118
  let adc = 0
  let dig_H1 = 0
  let dig_H2 = 0
  let dig_H3 = 0
  let dig_H4 = 0
  let dig_H5 = 0
  let dig_H6 = 0
  let dig_H4_tmp = 0
  let dig_H5_tmp = 0

  const var1 = await getTemperature(firmata, true) - 76800

  return await new Promise((resolveParent) => {
    new Promise((resolve) => {
      firmata.i2cReadOnce(address, 253, 2, (v) => {
        adc = new DataView(new Uint8Array(v).buffer).getUint16(0, false)
        resolve()
      })
    })
      .then(() => {
        return Promise.all([
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 161, 1, (v) => {
              dig_H1 = v[0]
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 225, 2, (v) => {
              dig_H2 = new DataView(new Uint8Array(v).buffer).getUint16(0, true)
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 227, 1, (v) => {
              dig_H3 = v[0]
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 228, 1, (v) => {
              dig_H4_tmp = v[0]
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 229, 1, (v) => {
              dig_H5_tmp = v[0]
              resolve()
            })
          }),
          new Promise((resolve) => {
            firmata.i2cReadOnce(address, 231, 1, (v) => {
              dig_H6 = v[0]
              resolve()
            })
          }),
        ])
      })
      .then(() => {
        new Promise((resolve) => {
          firmata.i2cReadOnce(address, 230, 1, (v) => {
            dig_H5 = (v[0] << 4) | (0x0F & (dig_H5_tmp >> 4))
            resolve()
          })
        })
      })
      .then(async () => {
        dig_H4 = (dig_H4_tmp << 4) | (0x0F & dig_H5_tmp)

        let var2 = (adc * 16384)
        let var3 = (dig_H4 * 1048576)
        let var4 = dig_H5 * var1
        let var5 = (((var2 - var3) - var4) + 16384) / 32768
        var2 = (var1 * dig_H6) / 1024
        var3 = (var1 * dig_H3) / 2048
        var4 = ((var2 * (var3 + 32768)) / 1024) + 2097152
        var2 = ((var4 * dig_H2) + 8192) / 16384
        var3 = var5 * var2
        var4 = ((var3 / 32768) * (var3 / 32768)) / 128
        var5 = var3 - ((var4 * dig_H1) / 16)
        var5 = (var5 < 0 ? 0 : var5)
        var5 = (var5 > 419430400 ? 419430400 : var5)

        resolveParent(Math.round(var5 / 4096 / 1024.0 * 100) / 100)
      })
  })
}

export const getData = async (firmata, kind) => {
  try {
    if (kind == 'lux') {
      return await getLux(firmata)
    } else if (kind == 'temp') {
      return await getTemperature(firmata, false)
    } else if (kind == 'pres') {
      return await getPressure(firmata)
    } else if (kind == 'humi') {
      return await getHumidity(firmata)
    }
    return null
  } catch (e) {
    console.error(e)
    return null
  }
}
