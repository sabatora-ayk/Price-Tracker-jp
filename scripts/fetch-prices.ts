// 価格データ取得スクリプト
// e-Stat API（総務省CPI）から13品目の価格データを取得してSupabaseに保存する

const ESTAT_API_KEY = process.env.ESTAT_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

// 追跡対象13品目のe-Stat統計コード
const ITEMS = [
  { code: '0001', name: '電気代',         unit: '円',  dependency: '中東LNG' },
  { code: '0002', name: '食パン',         unit: '円',  dependency: null },
  { code: '0003', name: '牛乳',           unit: '円',  dependency: null },
  { code: '0004', name: '卵',             unit: '円',  dependency: null },
  { code: '0005', name: '豆腐',           unit: '円',  dependency: '米・ブラジル大豆' },
  { code: '0006', name: 'マヨネーズ',     unit: '円',  dependency: null },
  { code: '0007', name: 'インスタント麺', unit: '円',  dependency: null },
  { code: '0008', name: 'ニンニク',       unit: '円',  dependency: '中国90%' },
  { code: '0009', name: 'たらこ',         unit: '円',  dependency: 'ロシア' },
  { code: '0010', name: '鶏もも肉',       unit: '円',  dependency: null },
  { code: '0011', name: '小麦粉',         unit: '円',  dependency: 'ロシア肥料経由' },
  { code: '0012', name: '肥料コスト指標', unit: '指数', dependency: 'ロシア' },
  { code: '0013', name: 'ペットボトル水', unit: '円',  dependency: null },
]

async function fetchCPI(itemCode: string): Promise<number | null> {
  // e-Stat APIから消費者物価指数を取得
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData?appId=${ESTAT_API_KEY}&statsDataId=0003427112&cdCat01=${itemCode}&limit=1`

  try {
    const res = await fetch(url)
    const json = await res.json()
    const value = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
    if (!value || value.length === 0) return null
    return parseFloat(value[0]['$'])
  } catch (err) {
    console.error(`取得失敗: ${itemCode}`, err)
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
    throw new Error(`Supabase保存失敗: ${res.status}`)
  }
}

async function main() {
  console.log('価格データ取得開始...')

  const today = new Date().toISOString().split('T')[0]
  const records = []

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

  if (records.length > 0) {
    await saveToSupabase(records)
    console.log(`保存完了: ${records.length}件`)
  } else {
    console.log('保存するデータがありませんでした')
  }
}

main().catch(console.error)
