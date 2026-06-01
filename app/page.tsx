'use client'

import { useEffect, useState } from 'react'
import { supabase, PriceRecord } from '@/lib/supabase'
import Link from 'next/link'

const DEPENDENCY_COLORS: Record<string, string> = {
  '中東LNG': 'bg-orange-100 text-orange-800',
  '中国90%': 'bg-red-100 text-red-800',
  'ロシア': 'bg-red-100 text-red-800',
  'ロシア肥料経由': 'bg-red-100 text-red-800',
  '米・ブラジル大豆': 'bg-yellow-100 text-yellow-800',
}

const ITEMS = [
  { code: '3500', name: '電気代' },
  { code: '1021', name: '食パン' },
  { code: '1303', name: '牛乳' },
  { code: '1341', name: '卵' },
  { code: '1471', name: '豆腐' },
  { code: '1643', name: 'マヨネーズ' },
  { code: '1051', name: 'カップ麺' },
  { code: '0022', name: '生鮮野菜' },
  { code: '1142', name: 'たらこ' },
  { code: '1221', name: '鶏肉' },
  { code: '1071', name: '小麦粉' },
  { code: '1982', name: 'ミネラルウォーター' },
]

export default function Home() {
  const [records, setRecords] = useState<PriceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // 品目ごとに最新1件を取得
      const results = await Promise.all(
        ITEMS.map(item =>
          supabase
            .from('price_records')
            .select('*')
            .eq('item_code', item.code)
            .order('recorded_at', { ascending: false })
            .limit(1)
            .single()
        )
      )
      const data = results
        .map(r => r.data)
        .filter((r): r is PriceRecord => r !== null)
      setRecords(data)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">
        見えない価格変動トラッカー
      </h1>
      <p className="text-gray-500 mb-6">
        総務省CPI 2020年基準 / 全国平均 / 指数（2020年=100）
      </p>

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <Link key={r.id} href={`/item/${r.item_code}`}>
              <div className="border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="font-semibold text-lg">{r.item_name}</h2>
                  {r.dependency_country && (
                    <span className={`text-xs px-2 py-1 rounded-full ${DEPENDENCY_COLORS[r.dependency_country] ?? 'bg-gray-100 text-gray-800'}`}>
                      {r.dependency_country}
                    </span>
                  )}
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {r.price}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {r.recorded_at}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}