'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import Link from 'next/link'

const ITEM_NAMES: Record<string, string> = {
  '3500': '電気代',
  '1021': '食パン',
  '1303': '牛乳',
  '1341': '卵',
  '1471': '豆腐',
  '1643': 'マヨネーズ',
  '1051': 'カップ麺',
  '0022': '生鮮野菜',
  '1142': 'たらこ',
  '1221': '鶏肉',
  '1071': '小麦粉',
  '1982': 'ミネラルウォーター',
}

interface ChartData {
  date: string
  price: number
}

export default function ItemPage() {
  const params = useParams()
  const code = params.code as string
  const itemName = ITEM_NAMES[code] ?? `品目コード ${code}`

  const [data, setData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

    supabase
      .from('price_records')
      .select('recorded_at, price')
      .eq('item_code', code)
      .order('recorded_at', { ascending: true })
      .then(({ data: rows, error: err }) => {
        if (err) {
          setError(err.message)
        } else {
          const formatted = (rows ?? [])
            .filter((r) => r.price > 0) // マイナス・ゼロ値を除外
            .map((r) => ({
              date: r.recorded_at.slice(0, 7),
              price: r.price,
            }))
          setData(formatted)
        }
        setLoading(false)
      })
  }, [code])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <p className="text-gray-400">読み込み中...</p>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <p className="text-red-400">エラー: {error}</p>
    </div>
  )

  // X軸ラベル：5年おきに表示
  const ticks = data
    .filter((d) => d.date.endsWith('-01') && Number(d.date.slice(0, 4)) % 5 === 0)
    .map((d) => d.date)

  return (
    <main className="w-full max-w-4xl mx-auto px-6 py-8 bg-gray-950 min-h-screen text-white">
      <div className="mb-6">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          ← トップへ戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-1">{itemName}</h1>
      <p className="text-gray-400 text-sm mb-8">
        消費者物価指数（CPI）推移 / 総務省e-Stat / 2020年=100
      </p>

      {data.length === 0 ? (
        <p className="text-gray-500">データがありません</p>
      ) : (
        <div className="w-full">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                ticks={ticks}
                tickFormatter={(v) => v.slice(0, 4)}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                stroke="#9ca3af"
                domain={['auto', 'auto']}
                tick={{ fontSize: 12 }}
                width={45}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb', marginBottom: '4px' }}
                formatter={(value) => [Number(value).toFixed(1), 'CPI']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-4">
        品目コード: {code} | {data.length}件
      </p>
    </main>
  )
}