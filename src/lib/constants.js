export const VersionInfo = {
  build: new Date().toISOString(),
  commit: process.env.VUE_APP_GIT_COMMIT || null,
  commitDate: process.env.VUE_APP_GIT_COMMIT_DATE || null,
  branch: process.env.VUE_APP_GIT_BRANCH || null,
  tag: process.env.VUE_APP_GIT_TAG || null,
}

export const Sensors = [
  {
    id: 1,
    name: '明るさ',
    unit: 'lx',
  },
  {
    id: 2,
    name: '気温',
    unit: '℃',
  },
  {
    id: 3,
    name: '気圧',
    unit: 'hPa',
  },
  {
    id: 4,
    name: '湿度',
    unit: '%',
  },
  {
    id: 5,
    name: '加速度(絶対値)',
    unit: 'm/s^2',
  },
  {
    id: 6,
    name: '加速度(X)',
    unit: 'm/s^2',
  },
  {
    id: 7,
    name: '加速度(Y)',
    unit: 'm/s^2',
  },
  {
    id: 8,
    name: '加速度(Z)',
    unit: 'm/s^2',
  },
  {
    id: 9,
    name: '加速度(ロール)',
    unit: '°',
  },
  {
    id: 10,
    name: '加速度(ピッチ)',
    unit: '°',
  },
  {
    id: 11,
    name: '距離(レーザー)',
    unit: 'cm',
  },
  {
    id: 12,
    name: '距離(超音波A)',
    unit: 'cm',
  },
  {
    id: 13,
    name: '距離(超音波B)',
    unit: 'cm',
  },
  {
    id: 14,
    name: '水温(デジタルA1)',
    unit: '℃',
  },
  {
    id: 15,
    name: '水温(デジタルB1)',
    unit: '℃',
  },
  {
    id: 16,
    name: '酸素濃度',
    unit: '%',
    flactionDigits: 3,
    resolutuon: 0.1,
    targetValueForCorrectionOnStart: 20.9,
  },
  {
    id: 17,
    name: '二酸化炭素濃度',
    unit: '%',
    resolutuon: 0.0001,
    flactionDigits: 4,
  },
  {
    id: 18,
    name: '温度',
    unit: '℃',
    flactionDigits: 4,
    resolutuon: 175 / 2 ** 16,
  },
  {
    id: 19,
    name: '湿度',
    unit: '%',
    flactionDigits: 4,
    resolutuon: 100 / 2 ** 16,
  },
  {
    id: 20,
    name: '酸素濃度', //実はアナログA1
    unit: '%',
    flactionDigits: 2,
    targetValueForCorrectionOnStart: 20.9,
  },
  {
    id: 21,
    name: '明るさ', //実はアナログB2
  },
  {
    id: 22,
    name: '人感', //実はデジタルB2
  },
  {
    id: 23,
    name: '電圧', //実はアナログA1
    unit: 'V',
    flactionDigits: 2,
    correctionRate: 1 / 20, // 入力値を1/20にする
  },
  {
    id: 50,
    name: 'アナログA1',
  },
  {
    id: 51,
    name: 'アナログA2',
  },
  {
    id: 52,
    name: 'アナログB1',
  },
  {
    id: 53,
    name: 'アナログB2',
  },
  {
    id: 54,
    name: 'デジタルA1',
  },
  {
    id: 55,
    name: 'デジタルA2',
  },
  {
    id: 56,
    name: 'デジタルB1',
  },
  {
    id: 57,
    name: 'デジタルB2',
  },
  {
    id: 90001,
    name: 'ダミーデータ(ランダム)',
    flactionDigits: 4,
  },
  {
    id: 90002,
    name: 'ダミーデータ(sin)',
    flactionDigits: 4,
  },
  {
    id: 90003,
    name: 'ダミーデータ(cos)',
    flactionDigits: 4,
  },
].map((sensor) => {
  sensor.kind = sensor.name
  if (sensor.id < 10000) {
    sensor.kind = `${sensor.id}.${sensor.kind}`
  }
  if (typeof sensor.unit !== 'undefined') {
    sensor.kind = `${sensor.kind}[${sensor.unit}]`
  }
  return sensor
})

export const SensorMap = new Map(Sensors.map((sensor) => [sensor.id, sensor]))

export const migrateSensorKind20230714 = (kind) => {
  if (/^\d+$/.test(kind)) {
    return kind
  }
  const sensor = Sensors.find((sensor) => sensor.kind.replace(/^\d+\./, '') === kind)
  if (sensor) {
    return `${sensor.id}`
  }
  return ''
}
