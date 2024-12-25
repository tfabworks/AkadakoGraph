#!/usr/bin/env bun
import * as path from 'node:path'
import { $ } from 'bun'
import Bun from 'bun'

// 作業ディレクトリメモ
// ROOM_DIR=$1
// OUT_DIR=$2
// ROOM_DIR/*/values.json ← 入力データ
// TMPDIR/csvzip-<UUID> ← 一時ディレクトリ作成＆プロセスのカレントディレクトリ移動先
// TMPDIR/csvzip-<UUID>/<zipDirName>/<csvFilename> ← CSVを出力
// OUT_DIR/<zipDirName>.zip ← ZIPファイルの出力先

const roomDirPath = path.resolve(process.argv[2])
const zipOutDir = path.resolve(process.argv[3])
const roomId = path.basename(roomDirPath)
const tmpDir = `${process.env.TMPDIR ?? '/tmp'}/csvzip-${crypto.randomUUID()}`
const nowString = getISOStringWithTimezone(new Date(), 'Asia/Tokyo', true).replace(/\D/g, '')
const zipNamePrefix = 'AkadakoGraph-'
const zipDirName = `${zipNamePrefix}${nowString}-${roomId}`
const csvOutDir = `${tmpDir}/${zipDirName}`
const zipPath = `${zipOutDir}/${zipDirName}.zip`
await $`mkdir -p ${csvOutDir} ${zipOutDir}`
// 作業の前についでに古いファイル削除も実行しとく
const deleteOldZipPromise = $`echo find ${zipOutDir} -name ${`${zipNamePrefix}*.zip`} -mtime +1 -delete`.quiet().nothrow()
await $.cwd(tmpDir)
for await (const jsonPath of $`ls ${roomDirPath}/*/values.json`.lines()) {
  const chartPath = jsonPath.replace('values.json', 'chart.json')
  const [charJson, valuesJson] = await Promise.all([Bun.file(chartPath).json(), Bun.file(jsonPath).json()]).catch((e) => [null, null])
  if (!charJson || !valuesJson) {
    continue
  }
  // 14日以上前のデータは無視
  if (14 * 86400 * 1000 < Date.now() - charJson.updated) {
    continue
  }
  const bom = '\uFEFF'
  const csvHeader = [
    `${bom}時間`,
    `${charJson.chartMainSensorID}.${charJson.chartMainSensorName}[${charJson.chartMainSensorUnit}]`,
    `${charJson.chartSubSensorID}.${charJson.chartSubSensorName}[${charJson.chartSubSensorUnit}]`,
  ]
  const csvFilename = `${charJson.chartID} ${safeFileName(charJson.userName)}.csv`
  const csvPath = `${csvOutDir}/${csvFilename}`
  const csvRowsMap = {} as Record<string, [string, string | number | null, string | number | null]>
  for (const [csvColumnIdx, kind] of [
    [1, 'main'],
    [2, 'sub'],
  ]) {
    const values = valuesJson.values[kind] ?? []
    for (const { x, y } of values) {
      const ts = getISOStringWithTimezone(new Date(x), 'Asia/Tokyo')
      const row = csvRowsMap[ts] ?? [ts, null, null]
      row[csvColumnIdx as number] = y
      csvRowsMap[ts] = row
    }
  }
  const csvRows = [csvHeader, ...Object.values(csvRowsMap)]
  await Bun.write(csvPath, csvRows.map((row) => row.join(',')).join('\n'))
}
await $`zip -r ${zipPath} ${zipDirName}`.quiet()
await $`rm -rf ${tmpDir}`.nothrow().quiet()
// 対類ファイル削除持つ
await deleteOldZipPromise

console.log(zipPath)

/**
 * タイムゾーンオフセット付きISO文字列を生成する関数
 * @param date 日付
 * @param timeZone タイムゾーン
 * @param disableTimezoneName タイムゾーン名を無効にするか
 * @returns タイムゾーンオフセット付きISO文字列
 */
function getISOStringWithTimezone(date: Date, timeZone: string, disableTimezoneName = false) {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset',
  })
  // 各パーツを取得
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]))
  // ISO 8601形式の文字列を組み立て
  const isoString = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${disableTimezoneName ? '' : parts.timeZoneName.replace('GMT', '')}`
  return isoString
}

/**
 * ファイル名を安全にする
 * @param filename ファイル名
 * @returns 安全なファイル名
 */
function safeFileName(filename: string) {
  return (
    filename
      // コントロール文字を削除（改行、タブ等）
      .replace(/[\x00-\x1F\x7F]/g, '')
      // 空白文字（全角空白含む）を削除
      .replace(/\s+/g, '')
      // 問題となりやすい半角記号を削除（ただし一般的なものは残す）
      .replace(/[<>:"\/\\|?*]/g, '')
      // ファイル名先頭のドットを削除
      .replace(/^\.+/, '')
      // 255文字に制限
      .slice(0, 255)
  )
}
