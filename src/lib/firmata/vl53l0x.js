const PING_SENSOR_COMMAND = 0x01
const pingSensorWaitingTime = 100

const SYSRANGE_START = 0x00
// const SYSTEM_THRESH_HIGH = 0x0C
// const SYSTEM_THRESH_LOW = 0x0E
const SYSTEM_SEQUENCE_CONFIG = 0x01
// const SYSTEM_RANGE_CONFIG = 0x09
const SYSTEM_INTERMEASUREMENT_PERIOD = 0x04
const SYSTEM_INTERRUPT_CONFIG_GPIO = 0x0A
const GPIO_HV_MUX_ACTIVE_HIGH = 0x84
const SYSTEM_INTERRUPT_CLEAR = 0x0B
const RESULT_INTERRUPT_STATUS = 0x13
const RESULT_RANGE_STATUS = 0x14
// const RESULT_CORE_AMBIENT_WINDOW_EVENTS_RTN = 0xBC
// const RESULT_CORE_RANGING_TOTAL_EVENTS_RTN = 0xC0
// const RESULT_CORE_AMBIENT_WINDOW_EVENTS_REF = 0xD0
// const RESULT_CORE_RANGING_TOTAL_EVENTS_REF = 0xD4
// const RESULT_PEAK_SIGNAL_RATE_REF = 0xB6
// const ALGO_PART_TO_PART_RANGE_OFFSET_MM = 0x28
const I2C_SLAVE_DEVICE_ADDRESS = 0x8A
const MSRC_CONFIG_CONTROL = 0x60
// const PRE_RANGE_CONFIG_MIN_SNR = 0x27
// const PRE_RANGE_CONFIG_VALID_PHASE_LOW = 0x56
// const PRE_RANGE_CONFIG_VALID_PHASE_HIGH = 0x57
// const PRE_RANGE_MIN_COUNT_RATE_RTN_LIMIT = 0x64
// const FINAL_RANGE_CONFIG_MIN_SNR = 0x67
// const FINAL_RANGE_CONFIG_VALID_PHASE_LOW = 0x47
// const FINAL_RANGE_CONFIG_VALID_PHASE_HIGH = 0x48
const FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT = 0x44
// const PRE_RANGE_CONFIG_SIGMA_THRESH_HI = 0x61
// const PRE_RANGE_CONFIG_SIGMA_THRESH_LO = 0x62
const PRE_RANGE_CONFIG_VCSEL_PERIOD = 0x50
const PRE_RANGE_CONFIG_TIMEOUT_MACROP_HI = 0x51
// const PRE_RANGE_CONFIG_TIMEOUT_MACROP_LO = 0x52
// const SYSTEM_HISTOGRAM_BIN = 0x81
// const HISTOGRAM_CONFIG_INITIAL_PHASE_SELECT = 0x33
// const HISTOGRAM_CONFIG_READOUT_CTRL = 0x55
const FINAL_RANGE_CONFIG_VCSEL_PERIOD = 0x70
const FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI = 0x71
// const FINAL_RANGE_CONFIG_TIMEOUT_MACROP_LO = 0x72
// const CROSSTALK_COMPENSATION_PEAK_RATE_MCPS = 0x20
const MSRC_CONFIG_TIMEOUT_MACROP = 0x46
// const SOFT_RESET_GO2_SOFT_RESET_N = 0xBF
// const IDENTIFICATION_MODEL_ID = 0xC0
// const IDENTIFICATION_REVISION_ID = 0xC2
const OSC_CALIBRATE_VAL = 0xF8
// const GLOBAL_CONFIG_VCSEL_WIDTH = 0x32
const GLOBAL_CONFIG_SPAD_ENABLES_REF_0 = 0xB0
// const GLOBAL_CONFIG_SPAD_ENABLES_REF_1 = 0xB1
// const GLOBAL_CONFIG_SPAD_ENABLES_REF_2 = 0xB2
// const GLOBAL_CONFIG_SPAD_ENABLES_REF_3 = 0xB3
// const GLOBAL_CONFIG_SPAD_ENABLES_REF_4 = 0xB4
// const GLOBAL_CONFIG_SPAD_ENABLES_REF_5 = 0xB5
const GLOBAL_CONFIG_REF_EN_START_SELECT = 0xB6
const DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD = 0x4E
const DYNAMIC_SPAD_REF_EN_START_OFFSET = 0x4F
// const POWER_MANAGEMENT_GO1_POWER_FORCE = 0x80
const VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV = 0x89
// const ALGO_PHASECAL_LIM = 0x30
// const ALGO_PHASECAL_CONFIG_TIMEOUT = 0x30
const VcselPeriodPreRange = 0
const VcselPeriodFinalRange = 1

const address = 0x29
let firmata
let timeout_start_ms = Date.now()
let io_timeout = 500
let measurement_timing_budget_us = 0
let stop_variable = 0
// let did_timeout = false

const readReg = async (register) => {
  return await new Promise((resolve) => {
    firmata.i2cReadOnce(address, register, 1, v => {
      return resolve(v[0])
    })
  })
}

const readReg16Bit = async (register) => {
  return await new Promise((resolve) => {
    firmata.i2cReadOnce(address, register, 2, v => {
      return resolve(
        (v[0] << 8) | v[1]
      )
    })
  })
}

const readMulti = async (register, bytesToRead) => {
  return await new Promise((resolve) => {
    firmata.i2cReadOnce(address, register, bytesToRead, v => {
      return resolve(v)
    })
  })
}

const writeReg = (register, value) => {
  firmata.i2cWrite(address, register, value)
}

const writeReg16Bit = (register, value) => {
  const data = [
    (value >> 8) & 0xFF,
    value & 0xFF
  ]
  firmata.i2cWrite(address, register, data)
}

const writeReg32Bit = (register, value) => {
  const data = [
    (value >> 24) & 0xFF,
    (value >> 16) & 0xFF,
    (value >> 8) & 0xFF,
    value & 0xFF
  ]
  firmata.i2cWrite(address, register, data)
}

const writeMulti = (register, data) => {
  firmata.i2cWrite(address, register, data)
}

const setSignalRateLimit = (limitMCPS) => {
  if (limitMCPS < 0 || limitMCPS > 511.99) {
    return false
  }

  // Q9.7 fixed point format (9 integer bits, 7 fractional bits)
  writeReg16Bit(FINAL_RANGE_CONFIG_MIN_COUNT_RATE_RTN_LIMIT, limitMCPS * (1 << 7))
  return true
}

const getSequenceStepEnables = async (enables) => {
  const sequence_config = await readReg(SYSTEM_SEQUENCE_CONFIG)

  enables.tcc = (sequence_config >> 4) & 0x1
  enables.dss = (sequence_config >> 3) & 0x1
  enables.msrc = (sequence_config >> 2) & 0x1
  enables.pre_range = (sequence_config >> 6) & 0x1
  enables.final_range = (sequence_config >> 7) & 0x1
}

const decodeVcselPeriod = (reg_val) => (
  ((reg_val) + 1) << 1
)

const decodeTimeout = (reg_val) => {
  // format: "(LSByte * 2^MSByte) + 1"
  return ((reg_val & 0x00FF) <<
    ((reg_val & 0xFF00) >> 8)) + 1
}

const encodeTimeout = (timeout_mclks) => {
  // format: "(LSByte * 2^MSByte) + 1"

  let ls_byte = 0
  let ms_byte = 0

  if (timeout_mclks > 0) {
    ls_byte = timeout_mclks - 1

    while ((ls_byte & 0xFFFFFF00) > 0) {
      ls_byte >>= 1
      ms_byte++
    }

    return (ms_byte << 8) | (ls_byte & 0xFF)
  }
  return 0
}

const calcMacroPeriod = (vcsel_period_pclks) => (
  ((2304 * (vcsel_period_pclks) * 1655) + 500) / 1000
)

const getVcselPulsePeriod = async (type) => {
  if (type === VcselPeriodPreRange) {
    return decodeVcselPeriod(await readReg(PRE_RANGE_CONFIG_VCSEL_PERIOD))
  } else if (type === VcselPeriodFinalRange) {
    return decodeVcselPeriod(await readReg(FINAL_RANGE_CONFIG_VCSEL_PERIOD))
  }
  return 255
}

const timeoutMclksToMicroseconds = (timeout_period_mclks, vcsel_period_pclks) => {
  const macro_period_ns = calcMacroPeriod(vcsel_period_pclks)

  return ((timeout_period_mclks * macro_period_ns) + 500) / 1000
}

const getSequenceStepTimeouts = async (enables, timeouts) => {
  timeouts.pre_range_vcsel_period_pclks = await getVcselPulsePeriod(VcselPeriodPreRange)

  timeouts.msrc_dss_tcc_mclks = await readReg(MSRC_CONFIG_TIMEOUT_MACROP) + 1
  timeouts.msrc_dss_tcc_us = timeoutMclksToMicroseconds(
    timeouts.msrc_dss_tcc_mclks,
    timeouts.pre_range_vcsel_period_pclks
  )

  timeouts.pre_range_mclks = decodeTimeout(await readReg16Bit(PRE_RANGE_CONFIG_TIMEOUT_MACROP_HI))
  timeouts.pre_range_us = timeoutMclksToMicroseconds(
    timeouts.pre_range_mclks,
    timeouts.pre_range_vcsel_period_pclks
  )

  timeouts.final_range_vcsel_period_pclks = await getVcselPulsePeriod(VcselPeriodFinalRange)

  timeouts.final_range_mclks = decodeTimeout(await readReg16Bit(FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI))

  if (enables.pre_range) {
    timeouts.final_range_mclks -= timeouts.pre_range_mclks
  }

  timeouts.final_range_us = timeoutMclksToMicroseconds(
    timeouts.final_range_mclks,
    timeouts.final_range_vcsel_period_pclks
  )
}

const getMeasurementTimingBudget = async () => {
  const enables = {
    tcc: false,
    msrc: false,
    dss: false,
    pre_range: false,
    final_range: false
  }
  const timeouts = {
    pre_range_vcsel_period_pclks: 0,
    final_range_vcsel_period_pclks: 0,
    msrc_dss_tcc_mclks: 0,
    pre_range_mclks: 0,
    final_range_mclks: 0,
    msrc_dss_tcc_us: 0,
    pre_range_us: 0,
    final_range_us: 0
  }

  const StartOverhead = 1910
  const EndOverhead = 960
  const MsrcOverhead = 660
  const TccOverhead = 590
  const DssOverhead = 690
  const PreRangeOverhead = 660
  const FinalRangeOverhead = 550

  // "Start and end overhead times always present"
  let budget_us = StartOverhead + EndOverhead

  await getSequenceStepEnables(enables)
  await getSequenceStepTimeouts(enables, timeouts)

  if (enables.tcc) {
    budget_us += (timeouts.msrc_dss_tcc_us + TccOverhead)
  }

  if (enables.dss) {
    budget_us += 2 * (timeouts.msrc_dss_tcc_us + DssOverhead)
  } else if (enables.msrc) {
    budget_us += (timeouts.msrc_dss_tcc_us + MsrcOverhead)
  }

  if (enables.pre_range) {
    budget_us += (timeouts.pre_range_us + PreRangeOverhead)
  }

  if (enables.final_range) {
    budget_us += (timeouts.final_range_us + FinalRangeOverhead)
  }

  measurement_timing_budget_us = budget_us // store for internal reuse
  return budget_us
}

const timeoutMicrosecondsToMclks = (timeout_period_us, vcsel_period_pclks) => {
  const macro_period_ns = calcMacroPeriod(vcsel_period_pclks)

  return (((timeout_period_us * 1000) + (macro_period_ns / 2)) / macro_period_ns)
}

const getSpadInfo = async (info) => {
  writeReg(0x80, 0x01)
  writeReg(0xFF, 0x01)
  writeReg(0x00, 0x00)

  writeReg(0xFF, 0x06)
  writeReg(0x83, await readReg(0x83) | 0x04)
  writeReg(0xFF, 0x07)
  writeReg(0x81, 0x01)

  writeReg(0x80, 0x01)

  writeReg(0x94, 0x6b)
  writeReg(0x83, 0x00)
  timeout_start_ms = Date.now()
  while (await readReg(0x83) === 0x00) {
    if (io_timeout > 0 && ((Date.now() - timeout_start_ms) > io_timeout)) {
      return false
    }
  }
  writeReg(0x83, 0x01)
  const tmp = await readReg(0x92)

  info.count = tmp & 0x7f
  info.isAperture = ((tmp >> 7) & 0x01) === 0x01

  writeReg(0x81, 0x00)
  writeReg(0xFF, 0x06)
  writeReg(0x83, await readReg(0x83) & ~0x04)
  writeReg(0xFF, 0x01)
  writeReg(0x00, 0x01)

  writeReg(0xFF, 0x00)
  writeReg(0x80, 0x00)

  return true
}

const setMeasurementTimingBudget = async (budget_us) => {
  const enables = { tcc: false, msrc: false, dss: false, pre_range: false, final_range: false }
  const timeouts = {
    pre_range_vcsel_period_pclks: 0,
    final_range_vcsel_period_pclks: 0,
    msrc_dss_tcc_mclks: 0,
    pre_range_mclks: 0,
    final_range_mclks: 0,
    msrc_dss_tcc_us: 0,
    pre_range_us: 0,
    final_range_us: 0
  }

  const StartOverhead = 1910
  const EndOverhead = 960
  const MsrcOverhead = 660
  const TccOverhead = 590
  const DssOverhead = 690
  const PreRangeOverhead = 660
  const FinalRangeOverhead = 550

  const MinTimingBudget = 20000

  if (budget_us < MinTimingBudget) {
    return false
  }

  let used_budget_us = StartOverhead + EndOverhead

  await getSequenceStepEnables(enables)
  await getSequenceStepTimeouts(enables, timeouts)

  if (enables.tcc) {
    used_budget_us += (timeouts.msrc_dss_tcc_us + TccOverhead)
  }

  if (enables.dss) {
    used_budget_us += 2 * (timeouts.msrc_dss_tcc_us + DssOverhead)
  } else if (enables.msrc) {
    used_budget_us += (timeouts.msrc_dss_tcc_us + MsrcOverhead)
  }

  if (enables.pre_range) {
    used_budget_us += (timeouts.pre_range_us + PreRangeOverhead)
  }

  if (enables.final_range) {
    used_budget_us += FinalRangeOverhead

    // "Note that the final range timeout is determined by the timing
    // budget and the sum of all other timeouts within the sequence.
    // If there is no room for the final range timeout, then an error
    // will be set. Otherwise the remaining time will be applied to
    // the final range."

    if (used_budget_us > budget_us) {
      // "Requested timeout too big."
      return false
    }

    const final_range_timeout_us = budget_us - used_budget_us

    // set_sequence_step_timeout() begin
    // (SequenceStepId == VL53L0X_SEQUENCESTEP_FINAL_RANGE)

    // "For the final range timeout, the pre-range timeout
    //  must be added. To do this both final and pre-range
    //  timeouts must be expressed in macro periods MClks
    //  because they have different vcsel periods."

    let final_range_timeout_mclks = timeoutMicrosecondsToMclks(
      final_range_timeout_us,
      timeouts.final_range_vcsel_period_pclks
    )

    if (enables.pre_range) {
      final_range_timeout_mclks += timeouts.pre_range_mclks
    }

    writeReg16Bit(
      FINAL_RANGE_CONFIG_TIMEOUT_MACROP_HI,
      encodeTimeout(final_range_timeout_mclks)
    )

    // set_sequence_step_timeout() end

    measurement_timing_budget_us = budget_us // store for internal reuse
  }
  return true
}

const performSingleRefCalibration = async (vhv_init_byte) => {
  writeReg(SYSRANGE_START, 0x01 | vhv_init_byte) // VL53L0X_REG_SYSRANGE_MODE_START_STOP

  timeout_start_ms = Date.now()
  while ((await readReg(RESULT_INTERRUPT_STATUS) & 0x07) === 0) {
    if (io_timeout > 0 && ((Date.now() - timeout_start_ms) > io_timeout)) {
      return false
    }
  }

  writeReg(SYSTEM_INTERRUPT_CLEAR, 0x01)

  writeReg(SYSRANGE_START, 0x00)

  return true
}

const init = async (firmata_, io2v8) => {
  firmata = firmata_

  writeReg(I2C_SLAVE_DEVICE_ADDRESS, address)

  if (io2v8) {
    writeReg(VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV,
      await readReg(VHV_CONFIG_PAD_SCL_SDA__EXTSUP_HV) | 0x01) // set bit 0
  }

  // "Set I2C standard mode"
  writeReg(0x88, 0x00)

  writeReg(0x80, 0x01)
  writeReg(0xFF, 0x01)
  writeReg(0x00, 0x00)
  stop_variable = await readReg(0x91)
  writeReg(0x00, 0x01)
  writeReg(0xFF, 0x00)
  writeReg(0x80, 0x00)

  // disable SIGNAL_RATE_MSRC (bit 1) and SIGNAL_RATE_PRE_RANGE (bit 4) limit checks
  writeReg(MSRC_CONFIG_CONTROL, await readReg(MSRC_CONFIG_CONTROL) | 0x12)

  // set final range signal rate limit to 0.25 MCPS (million counts per second)
  setSignalRateLimit(0.25)

  writeReg(SYSTEM_SEQUENCE_CONFIG, 0xFF)

  // VL53L0X_DataInit() end

  // VL53L0X_StaticInit() begin

  const info = { count: 0, isAperture: false }
  if (!await getSpadInfo(info)) {
    return false
  }

  // The SPAD map (RefGoodSpadMap) is read by VL53L0X_get_info_from_device() in
  // the API, but the same data seems to be more easily readable from
  // GLOBAL_CONFIG_SPAD_ENABLES_REF_0 through _6, so read it from there
  const refSpadMap = await readMulti(GLOBAL_CONFIG_SPAD_ENABLES_REF_0, 6)
  console.log(refSpadMap)

  // -- VL53L0X_set_reference_spads() begin (assume NVM values are valid)

  writeReg(0xFF, 0x01)
  writeReg(DYNAMIC_SPAD_REF_EN_START_OFFSET, 0x00)
  writeReg(DYNAMIC_SPAD_NUM_REQUESTED_REF_SPAD, 0x2C)
  writeReg(0xFF, 0x00)
  writeReg(GLOBAL_CONFIG_REF_EN_START_SELECT, 0xB4)

  const firstSpadToEnable = info.isAperture ? 12 : 0 // 12 is the first aperture spad
  let spadsEnabled = 0

  for (let i = 0; i < 48; i++) {
    if (i < firstSpadToEnable || spadsEnabled === info.count) {
      // This bit is lower than the first one that should be enabled, or
      // (reference_spad_count) bits have already been enabled, so zero this bit
      refSpadMap[i / 8] &= ~(1 << (i % 8))
    } else if ((refSpadMap[i / 8] >> (i % 8)) & 0x1) {
      spadsEnabled++
    }
  }

  writeMulti(GLOBAL_CONFIG_SPAD_ENABLES_REF_0, refSpadMap, 6)

  // -- VL53L0X_set_reference_spads() end

  // -- VL53L0X_load_tuning_settings() begin
  // DefaultTuningSettings from vl53l0x_tuning.h

  writeReg(0xFF, 0x01)
  writeReg(0x00, 0x00)

  writeReg(0xFF, 0x00)
  writeReg(0x09, 0x00)
  writeReg(0x10, 0x00)
  writeReg(0x11, 0x00)

  writeReg(0x24, 0x01)
  writeReg(0x25, 0xFF)
  writeReg(0x75, 0x00)

  writeReg(0xFF, 0x01)
  writeReg(0x4E, 0x2C)
  writeReg(0x48, 0x00)
  writeReg(0x30, 0x20)

  writeReg(0xFF, 0x00)
  writeReg(0x30, 0x09)
  writeReg(0x54, 0x00)
  writeReg(0x31, 0x04)
  writeReg(0x32, 0x03)
  writeReg(0x40, 0x83)
  writeReg(0x46, 0x25)
  writeReg(0x60, 0x00)
  writeReg(0x27, 0x00)
  writeReg(0x50, 0x06)
  writeReg(0x51, 0x00)
  writeReg(0x52, 0x96)
  writeReg(0x56, 0x08)
  writeReg(0x57, 0x30)
  writeReg(0x61, 0x00)
  writeReg(0x62, 0x00)
  writeReg(0x64, 0x00)
  writeReg(0x65, 0x00)
  writeReg(0x66, 0xA0)

  writeReg(0xFF, 0x01)
  writeReg(0x22, 0x32)
  writeReg(0x47, 0x14)
  writeReg(0x49, 0xFF)
  writeReg(0x4A, 0x00)

  writeReg(0xFF, 0x00)
  writeReg(0x7A, 0x0A)
  writeReg(0x7B, 0x00)
  writeReg(0x78, 0x21)

  writeReg(0xFF, 0x01)
  writeReg(0x23, 0x34)
  writeReg(0x42, 0x00)
  writeReg(0x44, 0xFF)
  writeReg(0x45, 0x26)
  writeReg(0x46, 0x05)
  writeReg(0x40, 0x40)
  writeReg(0x0E, 0x06)
  writeReg(0x20, 0x1A)
  writeReg(0x43, 0x40)

  writeReg(0xFF, 0x00)
  writeReg(0x34, 0x03)
  writeReg(0x35, 0x44)

  writeReg(0xFF, 0x01)
  writeReg(0x31, 0x04)
  writeReg(0x4B, 0x09)
  writeReg(0x4C, 0x05)
  writeReg(0x4D, 0x04)

  writeReg(0xFF, 0x00)
  writeReg(0x44, 0x00)
  writeReg(0x45, 0x20)
  writeReg(0x47, 0x08)
  writeReg(0x48, 0x28)
  writeReg(0x67, 0x00)
  writeReg(0x70, 0x04)
  writeReg(0x71, 0x01)
  writeReg(0x72, 0xFE)
  writeReg(0x76, 0x00)
  writeReg(0x77, 0x00)

  writeReg(0xFF, 0x01)
  writeReg(0x0D, 0x01)

  writeReg(0xFF, 0x00)
  writeReg(0x80, 0x01)
  writeReg(0x01, 0xF8)

  writeReg(0xFF, 0x01)
  writeReg(0x8E, 0x01)
  writeReg(0x00, 0x01)
  writeReg(0xFF, 0x00)
  writeReg(0x80, 0x00)

  // -- VL53L0X_load_tuning_settings() end

  // "Set interrupt config to new sample ready"
  // -- VL53L0X_SetGpioConfig() begin

  writeReg(SYSTEM_INTERRUPT_CONFIG_GPIO, 0x04)
  writeReg(GPIO_HV_MUX_ACTIVE_HIGH, (await readReg(GPIO_HV_MUX_ACTIVE_HIGH)) & ~0x10) // active low
  writeReg(SYSTEM_INTERRUPT_CLEAR, 0x01)

  // -- VL53L0X_SetGpioConfig() end

  measurement_timing_budget_us = await getMeasurementTimingBudget()

  // "Disable MSRC and TCC by default"
  // MSRC = Minimum Signal Rate Check
  // TCC = Target CentreCheck
  // -- VL53L0X_SetSequenceStepEnable() begin

  writeReg(SYSTEM_SEQUENCE_CONFIG, 0xE8)

  // -- VL53L0X_SetSequenceStepEnable() end

  // "Recalculate timing budget"
  await setMeasurementTimingBudget(measurement_timing_budget_us)

  // VL53L0X_StaticInit() end

  // VL53L0X_PerformRefCalibration() begin (VL53L0X_perform_ref_calibration())

  // -- VL53L0X_perform_vhv_calibration() begin

  writeReg(SYSTEM_SEQUENCE_CONFIG, 0x01)
  if (!await performSingleRefCalibration(0x40)) {
    return false
  }

  // -- VL53L0X_perform_vhv_calibration() end

  // -- VL53L0X_perform_phase_calibration() begin

  writeReg(SYSTEM_SEQUENCE_CONFIG, 0x02)
  if (!await performSingleRefCalibration(0x00)) {
    return false
  }

  // -- VL53L0X_perform_phase_calibration() end

  // "restore the previous Sequence Config"
  writeReg(SYSTEM_SEQUENCE_CONFIG, 0xE8)

  // VL53L0X_PerformRefCalibration() end

  return true
}

const startContinuous = async (period_ms) => {
  writeReg(0x80, 0x01)
  writeReg(0xFF, 0x01)
  writeReg(0x00, 0x00)
  writeReg(0x91, stop_variable)
  writeReg(0x00, 0x01)
  writeReg(0xFF, 0x00)
  writeReg(0x80, 0x00)

  if (period_ms) {
    // continuous timed mode

    // VL53L0X_SetInterMeasurementPeriodMilliSeconds() begin

    const osc_calibrate_val = await readReg16Bit(OSC_CALIBRATE_VAL)

    if (osc_calibrate_val !== 0) {
      period_ms *= osc_calibrate_val
    }

    writeReg32Bit(SYSTEM_INTERMEASUREMENT_PERIOD, period_ms)

    // VL53L0X_SetInterMeasurementPeriodMilliSeconds() end

    writeReg(SYSRANGE_START, 0x04) // VL53L0X_REG_SYSRANGE_MODE_TIMED
  } else {
    // continuous back-to-back mode
    writeReg(SYSRANGE_START, 0x02) // VL53L0X_REG_SYSRANGE_MODE_BACKTOBACK
  }
}

const timeoutReject = delay => new Promise((_, reject) => setTimeout(() => reject(`timeout ${delay}ms`), delay))

const pingSensor = (firmata, Firmata, pin, timeout) => {
  timeout = timeout ? timeout : pingSensorWaitingTime
  firmata.pinMode(pin, firmata.MODES.PING_READ)
  const request = new Promise(resolve => {
    firmata.sysexResponse(PING_SENSOR_COMMAND, (v) => {
      const value = Firmata.decode([v[1], v[2]])
      resolve(value)
    })
    firmata.sysexCommand([PING_SENSOR_COMMAND, pin])
  })
  return Promise.race([request, timeoutReject(timeout)])
    .finally(() => {
      firmata.clearSysexResponse(PING_SENSOR_COMMAND)
    })
}
const getDistanceL = async (firmata) => {
  await init(firmata, true)
  startContinuous()

  timeout_start_ms = Date.now()
  while ((await readReg(RESULT_INTERRUPT_STATUS) & 0x07) === 0) {
    if (io_timeout > 0 && ((Date.now() - timeout_start_ms) > io_timeout)) {
      // did_timeout = true
      return Promise.reject(`timeout read RESULT_INTERRUPT_STATUS: ${io_timeout}ms`)
    }
  }

  writeReg(SYSTEM_INTERRUPT_CLEAR, 0x01)
  return await readReg16Bit(RESULT_RANGE_STATUS + 10) / 10
}

const getDistanceA = async (firmata, Firmata) => {
  return pingSensor(firmata, Firmata, 10)
    .then((v) => (
      Math.round(v / 10)
    ))
    .catch(() => (0))
}

const getDistanceB = async (firmata, Firmata) => {
  return pingSensor(firmata, Firmata, 6)
    .then((v) => (
      Math.round(v / 10)
    ))
    .catch(() => (0))
}

export {
  getDistanceL,
  getDistanceA,
  getDistanceB
}