export const movingAverageFilter = (windowSize) => (v, i, data) => {
  // ウィンドウの半径を計算
  const radius = Math.floor(windowSize / 2)
  // ウィンドウの開始と終了のインデックスを計算
  const start = Math.max(0, i - radius)
  const end = Math.min(data.length, i + radius + 1)
  // ウィンドウ内の要素の合計を計算
  const sum = data.slice(start, end).reduce((acc, curr) => acc + curr, 0)
  // 平均値を計算して返す
  return sum / (end - start)
}

export const medianFilter =
  ({ windowSize }) =>
  (v, i, data) => {
    // ウィンドウの半径を計算
    const radius = Math.floor(windowSize / 2)
    // ウィンドウ内のデータを取得
    const window = data.slice(Math.max(0, i - radius), Math.min(data.length, i + radius + 1))
    // ウィンドウ内のデータをソート
    const sorted = [...window].sort((a, b) => a - b)
    // 中央値を返す
    return sorted[Math.floor(sorted.length / 2)]
  }

export const deviationFilter = (windowSize = 5, deviationThreshold = 3) => {
  return (data) => {
    const excludeSelf = true
    const keepWindowSize = true
    const radius = Math.floor(windowSize / 2)
    const getWindow = (data, i) => {
      const minEnd = keepWindowSize ? data.length : 0
      const maxStart = keepWindowSize ? data.length - 1 - windowSize : data.length - 1
      const start = Math.max(0, Math.min(i - radius, maxStart))
      const end = Math.min(data.length, Math.max(i + radius + 1, minEnd))
      const window = excludeSelf
        ? [...data.slice(start, i), ...data.slice(i + 1, end)] // 自分自身を除いたウィンドウを取得
        : data.slice(start, end) // 自分を含むウィンドウを取得
      return window
    }
    const filteredIndex = []
    const filter = (v, i, data) => {
      const window = getWindow(data, i)
      const stats = getDataStatistics(window)
      const { mean, std } = stats
      // 自分の値と平均との差を標準偏差で割って、標準化偏差を計算
      const standardizedDeviation = Math.abs(v - mean) / std
      // 許容範囲内なら元の値を返す
      if (standardizedDeviation <= deviationThreshold) {
        return v
      }
      filteredIndex.push(i)
      // 許容範囲外ならnullを返す（または他の適切な値）
      return null
    }
    console.log('data', data)
    const filteredData = data.map(filter)
    return {
      filteredData,
      filteredIndex,
    }
  }
}

const getDataStatistics = (data) => {
  const count = data.length
  const sum = data.reduce((acc, val) => acc + val, 0)
  const avg = sum / count
  const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count
  const sortedData = [...data].sort((a, b) => a - b)
  const median = count % 2 === 0 ? (sortedData[count / 2 - 1] + sortedData[count / 2]) / 2 : sortedData[Math.floor(count / 2)]
  return {
    count,
    sum,
    avg,
    mean: avg,
    variance,
    std: Math.sqrt(variance),
    median,
    min: sortedData[0],
    max: sortedData[count - 1],
  }
}
