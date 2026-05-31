const ESTAT_API_KEY = process.env.ESTAT_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL が未設定です')
if (!SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY が未設定です')
if (!ESTAT_API_KEY) throw new Error('ESTAT_API_KEY が未設定です')

const ITEMS = [
  { code: '3500', name: '電気代',           unit: '円',  dependency: '中東LNG' },
  { code: '1021', name: '食パン',           unit: '円',  dependency: null },
  { code: '1303', name: '牛乳',             unit: '円',  dependency: null },
  { code: '1341', name: '卵',               unit: '円',  dependency: null },
  { code: '1471', name: '豆腐',             unit: '円',  dependency: '米・ブラジル大豆' },
  { code: '1643', name: 'マヨネーズ',       unit: '円',  dependency: null },
  { code: '1051', name: 'カップ麺',         unit: '円',  dependency: null },
  { code: '0022', name: '生鮮野菜（ニンニク代替）', unit: '指数', dependency: '中国90%' },
  { code: '1142', name: 'たらこ',           unit: '円',  dependency: 'ロシア' },
  { code: '1221', name: '鶏肉',             unit: '円',  dependency: null },
  { code: '1071', name: '小麦粉',           unit: '円',  dependency: 'ロシア肥料経由' },
  { code: '1982', name: 'ミネラルウォーター', unit: '円', dependency: null },
]

async function fetchCPI(itemCode: string): Promise<number | null> {
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData` +
    `?appId=${ESTAT_API_KEY}` +
    `&statsDataId=0003427113` +
    `&cdCat01=${itemCode}` +
    `&cdArea=00000` +
    `&cdTime=2026000404` +
    `&limit=1`

  try {
    const res = await fetch(url)
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
    if (!values) return null
    const val = Array.isArray(values) ? values[0]['$'] : values['$']
    if (!val || val === '-') return null
    return parseFloat(val)
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
    const text = await res.text()
    throw new Error(`Supabase保存失敗: ${res.status} ${text}`)
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
      source: 'e-Stat CPI 2020年基準',
      dependency_country: item.dependency,
    })
    console.log(`✅ ${item.name}: ${price}`)
  }

  if (records.length > 0) {
    await saveToSupabase(records)
    console.log(`保存完了: ${records.length}件`)
  } else {
    console.log('保存するデータがありませんでした')
  }
}

main().catch(console.error)
