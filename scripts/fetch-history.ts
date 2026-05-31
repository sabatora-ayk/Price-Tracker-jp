// 過去データ一括取得スクリプト
// e-Stat APIから1970年〜現在までの全履歴データを取得してSupabaseに保存する

const ESTAT_API_KEY = process.env.ESTAT_API_KEY
const SUPABASE_URL = 'https://sfsajsilmnlqwyzcbjyz.supabase.co'
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

if (!SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY が未設定です')
if (!ESTAT_API_KEY) throw new Error('ESTAT_API_KEY が未設定です')

const ITEMS = [
  { code: '3500', name: '電気代',                   unit: '指数', dependency: '中東LNG' },
  { code: '1021', name: '食パン',                   unit: '指数', dependency: null },
  { code: '1303', name: '牛乳',                     unit: '指数', dependency: null },
  { code: '1341', name: '卵',                       unit: '指数', dependency: null },
  { code: '1471', name: '豆腐',                     unit: '指数', dependency: '米・ブラジル大豆' },
  { code: '1643', name: 'マヨネーズ',               unit: '指数', dependency: null },
  { code: '1051', name: 'カップ麺',                 unit: '指数', dependency: null },
  { code: '0022', name: '生鮮野菜（ニンニク代替）', unit: '指数', dependency: '中国90%' },
  { code: '1142', name: 'たらこ',                   unit: '指数', dependency: 'ロシア' },
  { code: '1221', name: '鶏肉',                     unit: '指数', dependency: null },
  { code: '1071', name: '小麦粉',                   unit: '指数', dependency: 'ロシア肥料経由' },
  { code: '1982', name: 'ミネラルウォーター',       unit: '指数', dependency: null },
]

async function fetchAllHistory(itemCode: string): Promise<Array<{date: string, value: number}>> {
  const url = `https://api.e-stat.go.jp/rest/3.0/app/json/getStatsData` +
    `?appId=${ESTAT_API_KEY}` +
    `&statsDataId=0003427113` +
    `&cdCat01=${itemCode}` +
    `&cdArea=00000` +
    `&limit=2000`

  try {
    const res = await fetch(url)
    const json = await res.json()
    const values = json?.GET_STATS_DATA?.STATISTICAL_DATA?.DATA_INF?.VALUE
    if (!values) return []

    const arr = Array.isArray(values) ? values : [values]
    return arr
      .filter((v: Record<string, string>) => v['$'] && v['$'] !== '-')
      .map((v: Record<string, string>) => ({
        // 時間コード例：2026000404 → 2026-04
        date: parseTimeCode(v['@time']),
        value: parseFloat(v['$']),
      }))
      .filter((v: {date: string, value: number}) => v.date !== null)
  } catch (err) {
    console.error(`取得失敗: ${itemCode}`, err)
    return []
  }
}

function parseTimeCode(code: string): string {
  // 年次データ: 2025000000 → 2025-01-01
  // 月次データ: 2026000404 → 2026-04-01
  if (!code) return ''
  const year = code.substring(0, 4)
  const month = code.substring(7, 9)
  if (month === '00' || month === '') {
    return `${year}-01-01`
  }
  return `${year}-${month}-01`
}

async function saveToSupabase(records: object[]): Promise<void> {
  // 1000件ずつ分割して保存（APIの制限対策）
  const chunkSize = 500
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize)
    const res = await fetch(`${SUPABASE_URL}/rest/v1/price_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SECRET_KEY!,
        'Authorization': `Bearer ${SUPABASE_SECRET_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(chunk),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error(`保存失敗 chunk ${i}: ${res.status} ${text}`)
    } else {
      console.log(`✅ 保存済み: ${i + chunk.length}件`)
    }
  }
}

async function main() {
  console.log('過去データ一括取得開始（1970年〜現在）...')

  const allRecords = []

  for (const item of ITEMS) {
    console.log(`取得中: ${item.name}`)
    const history = await fetchAllHistory(item.code)

    for (const h of history) {
      allRecords.push({
        item_code: item.code,
        item_name: item.name,
        price: h.value,
        unit: item.unit,
        recorded_at: h.date,
        source: 'e-Stat CPI 2020年基準（履歴）',
        dependency_country: item.dependency,
      })
    }

    console.log(`  → ${history.length}件取得`)
    // API負荷軽減のため少し待つ
    await new Promise(r => setTimeout(r, 500))
  }

  console.log(`合計: ${allRecords.length}件 保存開始...`)
  await saveToSupabase(allRecords)
  console.log('完了')
}

main().catch(console.error)