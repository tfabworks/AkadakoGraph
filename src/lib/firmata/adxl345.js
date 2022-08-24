const address = 0x53
const DATA_FORMAT = 0x31
const POWER_CTL = 0x2D
const DATA_X0 = 0x32
const FULL_RES_16G = 0x0B
const MEASURE = 0x08

const getAcceleration = async (firmata) => {
  let acceleration = {
    x: 0,
    y: 0,
    z: 0
  }

  firmata.i2cWrite(address, DATA_FORMAT, FULL_RES_16G)
  firmata.i2cWrite(address, POWER_CTL, MEASURE)

  await new Promise((resolve) => {
    firmata.i2cReadOnce(this.address, DATA_X0, 6, (v) => {
      const dataView = new DataView(new Uint8Array(v).buffer)
      acceleration.x = dataView.getInt16(0, true) * 0.0392266
      acceleration.y = dataView.getInt16(2, true) * 0.0392266
      acceleration.z = dataView.getInt16(4, true) * 0.0392266
      resolve()
    })
  })

  return acceleration
}

const getAccelerationValue = async (firmata, axis) => {
  const acceleration = await getAcceleration(firmata)
  if (axis === 'absolute') {
    return Math.round(
      Math.sqrt(
        (acceleration.x ** 2) +
        (acceleration.y ** 2) +
        (acceleration.z ** 2)
      ) * 100) / 100
  } else if (axis === 'x' || axis === 'y' || axis === 'z') {
    return acceleration[axis]
  } else {
    return null
  }
}

const getRoll = async (firmata) => {
  const acceleration = await getAcceleration(firmata)
  return Math.atan2(acceleration.y, acceleration.z) * 180.0 / Math.PI
}

const getPitch = async (firmata) => {
  const acceleration = await getAcceleration(firmata)

  const angle = Math.atan2(
    acceleration.x,
    Math.sqrt((acceleration.y * acceleration.y) + (acceleration.z * acceleration.z))
  ) *
    180.0 / Math.PI
  if (acceleration.z > 0) return angle
  return ((angle > 0) ? 180 : -180) - angle
}

export {
  getAccelerationValue,
  getRoll,
  getPitch
}