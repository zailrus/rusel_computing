// src/RUSLEApp.jsx — готовый компонент на чистом JS/JSX (без TypeScript)
// Вставь этот файл в проект Vite в папку src/ и подключи в App.jsx

import React, { useMemo, useState } from 'react'

// RUSLE Web Calculator — A = R * K * LS * C * P
// CSV: CRLF ("\r\n") + BOM ("\uFEFF") для Excel, корректное экранирование

// ---- Presets ----
const C_PRESETS = [
  { label: 'Лес', value: 0.003 },
  { label: 'Пастбище (хорошее)', value: 0.05 },
  { label: 'Пастбище (слабое)', value: 0.2 },
  { label: 'Пшеница (озимая)', value: 0.15 },
  { label: 'Кукуруза', value: 0.25 },
  { label: 'Картофель', value: 0.3 },
  { label: 'Голая почва', value: 1.0 },
]

const P_PRESETS = [
  { label: 'Без мер', value: 1.0 },
  { label: 'Контурная обработка', value: 0.8 },
  { label: 'Полосное земледелие', value: 0.6 },
  { label: 'Террасирование', value: 0.4 },
]

// ---- Utils ----
function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function parseNum(v) {
  if (v == null) return null
  const cleaned = String(v).trim().replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function formatNum(n, digits = 3) {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toFixed(digits)
}

function escapeCsv(s) {
  if (s == null) return ''
  const str = String(s)
  // проверяем именно символы \n и \r (а не реальные переводы строк в исходнике)
  if (str.includes(';') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function createCSV(rows, computeA) {
  const header = ['ID/Участок', 'Описание', 'R', 'K', 'LS', 'C', 'P', 'A(т/га/год)']
  const out = [header.join(',')]
  for (const r of rows) {
    const A = computeA(r)
    const line = [
      escapeCsv(r.name),
      escapeCsv(r.desc),
      r.R, r.K, r.LS, r.C, r.P,
      A == null ? '' : String(A),
    ].join(',')
    out.push(line)
  }
  return out.join('\r\n') + '\r\n' // CRLF + завершающий перевод строки
}

function downloadCSV(filename, content) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function RUSLEApp() {
  const [rows, setRows] = useState([
    { id: uid(), name: 'Поле-1', desc: '55.75, 37.62 (пример)', R: '250', K: '0.32', LS: '1.8', C: '0.25', P: '0.9' },
  ])
  const [search, setSearch] = useState('')
  const [tests, setTests] = useState(null)

  function computeA(r) {
    const R = parseNum(r.R)
    const K = parseNum(r.K)
    const LS = parseNum(r.LS)
    const C = parseNum(r.C)
    const P = parseNum(r.P)
    if ([R, K, LS, C, P].some(x => x == null)) return null
    return R * K * LS * C * P
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => [r.name, r.desc].some(x => (x || '').toLowerCase().includes(q)))
  }, [rows, search])

  const totals = useMemo(() => {
    const count = rows.length
    const vals = rows.map(computeA).filter(x => x != null)
    const avgA = vals.length ? vals.reduce((s, a) => s + a, 0) / vals.length : null
    return { count, avgA }
  }, [rows])

  function addRow() {
    setRows(rs => [...rs, { id: uid(), name: `Участок-${rs.length + 1}`, desc: '', R: '', K: '', LS: '', C: '', P: '' }])
  }

  function duplicateRow(id) {
    setRows(rs => {
      const i = rs.findIndex(r => r.id === id)
      if (i < 0) return rs
      const copy = { ...rs[i], id: uid(), name: rs[i].name + ' (копия)' }
      const out = [...rs]
      out.splice(i + 1, 0, copy)
      return out
    })
  }

  function deleteRow(id) {
    setRows(rs => rs.filter(r => r.id !== id))
  }

  function updateRow(id, patch) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)))
  }

  function exportCSV() {
    const csv = createCSV(rows, computeA)
    downloadCSV('rusle_export.csv', csv)
  }

  function runTests() {
    const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps
    const t = []

    // БАЗОВЫЕ ТЕСТЫ (не меняем смысл)
    t.push({ name: "parseNum('0,32') == 0.32", ok: approx((parseNum('0,32') ?? 0), 0.32) })
    t.push({ name: "parseNum(' 1.25 ') == 1.25", ok: approx((parseNum(' 1.25 ') ?? 0), 1.25) })
    const demo = { R: '250', K: '0.32', LS: '1.8', C: '0.25', P: '0.9' }
    t.push({ name: 'computeA(demo) ≈ 32.4', ok: approx(computeA(demo) ?? NaN, 32.4) })

    const csv = createCSV([
      { id: '1', name: 'X', desc: 'a,b\n"q"', R: '1', K: '2', LS: '3', C: '4', P: '5' },
    ], () => 1 * 2 * 3 * 4 * 5)
    t.push({ name: 'CSV содержит CRLF и ≥2 строк', ok: csv.includes('\r\n') && csv.split('\r\n').length >= 2 })

    const esc = escapeCsv('He said "hi", then left')
    t.push({ name: 'escapeCsv экранирует кавычки/запятые', ok: esc === '"He said ""hi"", then left"' })

    // ДОП. ТЕСТЫ
    t.push({ name: 'escapeCsv экранирует перевод строки', ok: /^"[\s\S]*"$/.test(escapeCsv('a\nb')) })
    t.push({ name: 'createCSV оканчивается на CRLF', ok: csv.endsWith('\r\n') })
    t.push({ name: 'computeA возвращает null при пустом поле', ok: computeA({ R: '1', K: '1', LS: '1', C: '1', P: '' }) == null })

    setTests(t)
    console.log('RUSLE tests:', t)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Калькулятор RUSLE</h1>
            <p className="text-sm text-gray-600">A = R · K · LS · C · P — среднегодовая потеря почвы (т/га/год)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={addRow} className="rounded-2xl bg-white px-4 py-2 shadow hover:shadow-md" type="button">+ Добавить строку</button>
            <button onClick={exportCSV} className="rounded-2xl bg-white px-4 py-2 shadow hover:shadow-md" type="button">⬇️ Экспорт CSV</button>
            <button onClick={runTests} className="rounded-2xl bg-white px-4 py-2 shadow hover:shadow-md" type="button">✅ Запустить тесты</button>
          </div>
        </header>

        <section className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="col-span-2 flex items-center gap-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по участкам/описанию" className="w-full rounded-xl border border-gray-200 px-3 py-2 outline-none focus:ring" />
            </div>
            <div className="flex items-center justify-end text-sm text-gray-600">
              <span className="mr-4">Строк: {totals.count}</span>
              <span>Среднее A: {formatNum(totals.avgA, 2) || '—'}</span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="w-full min-w-[900px] table-fixed border-separate border-spacing-0">
              <thead>
                <tr className="bg-gray-100 text-left text-sm text-gray-700">
                  {['ID/Участок','Описание','R (МДж·мм/(га·ч·год))','K (т·га·ч/(МДж·мм·га))','LS','C','P','A (т/га/год)',''].map((h, i) => (
                    <th key={i} className={`sticky top-0 border-b border-gray-200 px-3 py-2 ${i===0?'rounded-tl-2xl':''} ${i===8?'rounded-tr-2xl':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const A = computeA(r)
                  const invalid = [r.R, r.K, r.LS, r.C, r.P].some(v => v !== '' && parseNum(v) == null)
                  return (
                    <tr key={r.id} className="text-sm odd:bg-white even:bg-gray-50">
                      <td className="border-b border-gray-100 px-3 py-2 align-top">
                        <input value={r.name} onChange={e=>updateRow(r.id,{name:e.target.value})} className="w-full rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring" />
                      </td>
                      <td className="border-b border-gray-100 px-3 py-2 align-top">
                        <textarea value={r.desc} onChange={e=>updateRow(r.id,{desc:e.target.value})} className="w-full rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring" rows={2} />
                      </td>
                      {['R','K','LS','C','P'].map(key => (
                        <td key={key} className="border-b border-gray-100 px-3 py-2 align-top">
                          <input value={r[key]} onChange={e=>updateRow(r.id,{[key]: e.target.value})} placeholder="число" inputMode="decimal" className="w-full rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring" />
                          {key === 'C' && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {C_PRESETS.map(p => (
                                <button key={p.label} type="button" title={`${p.label}: ${p.value}`} className="rounded-full border border-gray-200 px-2 py-0.5 text-xs hover:bg-gray-50" onClick={()=>updateRow(r.id,{C: String(p.value)})}>{p.label}</button>
                              ))}
                            </div>
                          )}
                          {key === 'P' && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {P_PRESETS.map(p => (
                                <button key={p.label} type="button" title={`${p.label}: ${p.value}`} className="rounded-full border border-gray-200 px-2 py-0.5 text-xs hover:bg-gray-50" onClick={()=>updateRow(r.id,{P: String(p.value)})}>{p.label}</button>
                              ))}
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="border-b border-gray-100 px-3 py-2 align-top font-semibold">{formatNum(A,3)}</td>
                      <td className="border-b border-gray-100 px-3 py-2 align-top">
                        <div className="flex gap-2">
                          <button onClick={()=>duplicateRow(r.id)} className="rounded-xl border border-gray-200 px-2 py-1 hover:bg-gray-50" title="Дублировать" type="button">⧉</button>
                          <button onClick={()=>deleteRow(r.id)} className="rounded-xl border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50" title="Удалить" type="button">✕</button>
                        </div>
                        {invalid && <div className="mt-2 text-xs text-red-600">Некорректный формат числа</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Справка</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <InfoCard title="R — эрозионная опасность дождя" text="Берите из климатических рядов/карт. Единицы: МДж·мм/(га·ч·год)." />
            <InfoCard title="K — эродируемость почвы" text="По грансоставу/органическому веществу или из почвенных карт. Единицы: т·га·ч/(МДж·мм·га)." />
            <InfoCard title="LS — фактор рельефа" text="Из ЦМР (DEM): длина и крутизна склона. Вычисляется в ГИС по накоплению стока/уклону." />
            <InfoCard title="C — покров и управление" text="Сезонно зависит от культуры и стадии вегетации. См. пресеты выше для быстрых оценок." />
            <InfoCard title="P — противоэрозионные меры" text="Контурная обработка, полосы, террасы и т.д. Без мер: P = 1." />
            <InfoCard title="A — результат" text="Среднегодовая потеря почвы (т/га/год). Сравнивайте участки и сценарии." />
          </div>
        </section>

        {tests && (
          <section className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Результаты авто‑тестов</h2>
            <div className="text-sm text-gray-700">Пройдено {tests.filter(t=>t.ok).length} из {tests.length}</div>
            <ul className="list-disc pl-6 text-sm">
              {tests.map((t, i) => (
                <li key={i} className={t.ok ? 'text-green-700' : 'text-red-700'}>
                  {t.ok ? '✅' : '❌'} {t.name}{t.note ? ` — ${t.note}` : ''}
                </li>
              ))}
            </ul>
          </section>
        )}

      </div>
    </div>
  )
}

function InfoCard({ title, text }) {
  return (
    <div className="rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-sm text-gray-600">{text}</div>
    </div>
  )
}
