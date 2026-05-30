'use client'

import { useEffect, useState } from 'react'
import { supabase, PriceRecord } from '@/lib/supabase'

export default function Home() {
  const [records, setRecords] = useState<PriceRecord[]>([])
  const [status, setStatus] = useState<string>('接続確認中...')

  useEffect(() => {
    async function checkConnection() {
      const { data, error } = await supabase
        .from('price_records')
        .select('*')
        .limit(1)

      if (error) {
        setStatus(`❌ 接続失敗: ${error.message}`)
      } else {
        setStatus('✅ Supabase接続成功')
        setRecords(data || [])
      }
    }
    checkConnection()
  }, [])

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        見えない価格変動トラッカー
      </h1>
      <p className="text-lg mb-4">{status}</p>
      <p className="text-gray-500">
        データ件数: {records.length}件
      </p>
    </main>
  )
}
