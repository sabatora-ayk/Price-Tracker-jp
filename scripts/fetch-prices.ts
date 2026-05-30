// 価格データ取得スクリプト
// e-Stat API（総務省CPI）から13品目の価格データを取得してSupabaseに保存する

const ESTAT_API_KEY = process.env.ESTAT_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

// 総務省CPI 統計表ID: 0003427112
// cdCat01は品目コード（CPI品目分類）
const ITEMS = [
  { code: '0001710',  name: '電気代',         unit: '円',   dependency: '中東LNG' },
  { code: '0001850',  name: '食パン',          unit: '円',   dependency: null },
  { code: '0001860',  name: '牛乳',            unit: '円',   dependency: null },
  { code: '0001870',  name: '卵',              unit: '円',   dependency: null },
  { code: '0001880',  name: '豆腐',            unit: '円',   dependency: '米・ブラジル大豆' },
  { code: '0002470',  name: 'マヨネーズ',      unit: '円',   dependency: null },
  { code: '0001930',  name: 'インスタント麺',  unit: '円',   dependency: null },
  { code: '0001920',  name: 'ニンニク',        unit: '円',   dependency: '中国90%' },
  { code: '0002120',  name: 'たらこ',          unit: '円',   dependency: 'ロシア' },
  { code: '0002050',  name: '鶏もも肉',        unit: '円',   dependency: null },
  { code: '0002480',  name: '小麦粉',          unit: '円',   dependency: 'ロシア肥料経由' },
  { code: '0001910',  name: 'ペットボトル水',  unit: '円',   dependency: null },
]

// 肥料コストは農水省の別APIから取得するため別処理
const FERTILIZER_ITEM = {
  code: 'fertilizer',
  name: '肥料コスト指標',
  unit: '指数',
  dependency: 'ロシア',
}

async function fetchCPI(itemCode: string): Promise<number | null> {
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData` +
    `?appId=${ESTAT_API_KEY}` +
    `&statsDataId=0003427112` +
    `&cdCat01=${itemCode}` +
    `&cdTime=2025000000` +
    `&limit=1`

  try {
    const res = await fetch(url)
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
    if (!values || values.length === 0) return null
    const val = Array.isArray(values) ? values[0]['$'] : values['$']
    return parseFloat(val)
  } catch (err) {
    console.error(`取得失敗: ${itemCode}`, err)
    return null
  }
}

async function fetchFertilizerIndex(): Promise<number | null> {
  // 農水省 肥料価格動向調査（公開統計）
  // 暫定値として農業物価指数（e-Stat）を使用
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData` +
    `?appId=${ESTAT_API_KEY}` +
    `&statsDataId=0003215690` +
    `&limit=1`

  try {
    const res = await fetch(url)
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
    if (!values || values.length === 0) return null
    const val = Array.isArray(values) ? values[0]['$'] : values['$']
    return parseFloat(val)
  } catch (err) {
    console.error('肥料指数取得失敗', err)
    return null
  }
}

async function saveToSupabase(records: object[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/price_records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SECRET_KEY!,
      'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(records),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase保存失敗: ${res.status} ${text}`)
  }
}

async function main() {
  console.log('価格データ取得開始...')

  const today = new Date().toISOString().split('T')[0]
  const records = []

  // CPI品目を取得
  for (const item of ITEMS) {
    const price = await fetchCPI(item.code)
    if (price === null) {
      console.log(`⚠️ スキップ: ${item.name}`)
      continue
    }
    records.push({
      item_code: item.code,
      item_name: item.name,
      price,
      unit: item.unit,
      recorded_at: today,
      source: 'e-Stat CPI',
      dependency_country: item.dependency,
    })
    console.log(`✅ ${item.name}: ${price}${item.unit}`)
  }

  // 肥料コスト指標を取得
  const fertilizerPrice = await fetchFertilizerIndex()
  if (fertilizerPrice !== null) {
    records.push({
      item_code: FERTILIZER_ITEM.code,
      item_name: FERTILIZER_ITEM.name,
      price: fertilizerPrice,
      unit: FERTILIZER_ITEM.unit,
      recorded_at: today,
      source: 'e-Stat 農業物価指数',
      dependency_country: FERTILIZER_ITEM.dependency,
    })
    console.log(`✅ 肥料コスト指標: ${fertilizerPrice}`)
  } else {
    console.log('⚠️ スキップ: 肥料コスト指標')
  }

  if (records.length > 0) {
    await saveToSupabase(records)
    console.log(`保存完了: ${records.length}件`)
  } else {
    console.log('保存するデータがありませんでした')
    console.log('e-Stat APIキーまたは統計IDを確認してください')
  }
}

main().catch(console.error)
