import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { db } from '../context/AuthContext'
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit
} from 'firebase/firestore'

// Charts
import { Chart, ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'
Chart.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function Dashboard() {
  const { currentUser } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    totalActivities: 0,
    classifier: 0,
    masking: 0,
    lyrics: 0,
    creator: 0,
    recent: []
  })

  // Fetch everything
  const loadData = async () => {
    if (!currentUser) {
      setError('Please log in to view your dashboard')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const uid = currentUser.uid

      // Read user sub-collections
      const classifierRef = collection(db, 'users', uid, 'searchHistory')
      const maskingRef = collection(db, 'users', uid, 'maskingHistory')
      const lyricsRef = collection(db, 'users', uid, 'lyricHistory')
      const creatorRef = collection(db, 'users', uid, 'metaphorHistory')

      const [classifierSnap, maskingSnap, lyricsSnap, creatorSnap] = await Promise.all([
        getDocs(query(classifierRef, orderBy('timestamp', 'desc'))),
        getDocs(query(maskingRef, orderBy('timestamp', 'desc'))),
        getDocs(query(lyricsRef, orderBy('timestamp', 'desc'))),
        getDocs(query(creatorRef, orderBy('timestamp', 'desc')))
      ])

      const safeTs = (ts) => {
        try {
          if (!ts) return new Date(0)
          if (typeof ts?.toDate === 'function') return ts.toDate()
          if (ts instanceof Date) return ts
          return new Date(ts)
        } catch (_) {
          return new Date(0)
        }
      }

      const classifier = classifierSnap.docs.map(d => ({ id: d.id, type: 'metaphor_search', ...d.data(), timestamp: safeTs(d.data().timestamp) }))
      const masking = maskingSnap.docs.map(d => ({ id: d.id, type: 'masking_prediction', ...d.data(), timestamp: safeTs(d.data().timestamp) }))
      const lyrics = lyricsSnap.docs.map(d => ({ id: d.id, type: 'lyric_generation', ...d.data(), timestamp: safeTs(d.data().timestamp) }))
      const creator = creatorSnap.docs.map(d => ({ id: d.id, type: 'metaphor_creation', ...d.data(), timestamp: safeTs(d.data().timestamp) }))

      const recent = [...classifier, ...masking, ...lyrics, ...creator]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10)

      setStats({
        totalActivities: classifier.length + masking.length + lyrics.length + creator.length,
        classifier: classifier.length,
        masking: masking.length,
        lyrics: lyrics.length,
        creator: creator.length,
        recent
      })
    } catch (e) {
      console.error(e)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid])

  // Build chart datasets
  const usageDoughnut = useMemo(() => ({
    labels: ['Classifier', 'Masking', 'Lyrics', 'Creator'],
    datasets: [{
      data: [stats.classifier, stats.masking, stats.lyrics, stats.creator],
      backgroundColor: ['#6366F1', '#10B981', '#F43F5E', '#F59E0B'],
      borderColor: 'rgba(255,255,255,0.06)'
    }]
  }), [stats])

  // Daily timeseries (last 14 days)
  const dailyLine = useMemo(() => {
    const days = [...Array(14)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      d.setHours(0, 0, 0, 0)
      return d
    })

    const counts = new Array(14).fill(0)
    stats.recent.forEach(item => {
      const d = new Date(item.timestamp)
      d.setHours(0, 0, 0, 0)
      const idx = days.findIndex(x => x.getTime() === d.getTime())
      if (idx >= 0) counts[idx] += 1
    })

    return {
      labels: days.map(d => d.toLocaleDateString()),
      datasets: [{
        label: 'Daily Activity',
        data: counts,
        borderColor: '#8B5CF6',
        backgroundColor: 'rgba(139,92,246,0.15)',
        tension: 0.35,
        fill: true,
        pointRadius: 2
      }]
    }
  }, [stats.recent])

  // Per-tool bar chart
  const perToolBar = useMemo(() => ({
    labels: ['Classifier', 'Masking', 'Lyrics', 'Creator'],
    datasets: [{
      label: 'Count',
      data: [stats.classifier, stats.masking, stats.lyrics, stats.creator],
      backgroundColor: ['#6366F1', '#10B981', '#F43F5E', '#F59E0B']
    }]
  }), [stats])

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#e5e7eb' }
      },
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.9)',
        titleColor: '#fff',
        bodyColor: '#e5e7eb',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#cbd5e1' },
        grid: { color: 'rgba(148,163,184,0.15)' }
      },
      y: {
        ticks: { color: '#cbd5e1' },
        grid: { color: 'rgba(148,163,184,0.15)' }
      }
    }
  }), [])

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        <Header />
        <div className="container mx-auto px-4 py-10">
          <div className="bg-red-900/30 border border-red-500/40 rounded-xl p-5 max-w-2xl mx-auto text-center">
            <p className="text-red-200">{error}</p>
            {!currentUser && (
              <Link to="/login" className="inline-block mt-4 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white relative overflow-hidden">
      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Accents */}
      <div className="absolute -top-10 -left-20 w-[32rem] h-[32rem] bg-purple-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-10 right-0 w-[24rem] h-[24rem] bg-emerald-600/20 rounded-full blur-3xl"></div>

      <Header />

      <div className="container mx-auto px-4 py-10 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Dashboard
          </h1>
          <button onClick={loadData} disabled={loading} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50 flex items-center">
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Loading
              </>
            ) : (
              <>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-2 text-white"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h5M20 20v-5h-5M4 9a7 7 0 0110-6.5M20 15a7 7 0 01-10 6.5"
    />
  </svg>
  Refresh
</>

            )}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 p-6 rounded-xl border border-purple-700/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-300 text-sm">Total Activity</p>
                <h3 className="text-3xl font-bold">{stats.totalActivities}</h3>
              </div>
              <div className="bg-purple-600/30 p-3 rounded-lg">🔮</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 p-6 rounded-xl border border-indigo-700/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-300 text-sm">Metaphor Classifier</p>
                <h3 className="text-3xl font-bold">{stats.classifier}</h3>
              </div>
              <div className="bg-indigo-600/30 p-3 rounded-lg">🎭</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-6 rounded-xl border border-emerald-700/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-300 text-sm">Masking Predict</p>
                <h3 className="text-3xl font-bold">{stats.masking}</h3>
              </div>
              <div className="bg-emerald-600/30 p-3 rounded-lg">🕵️‍♂️</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-rose-900/40 to-pink-900/40 p-6 rounded-xl border border-rose-700/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-rose-300 text-sm">Lyrics Generated</p>
                <h3 className="text-3xl font-bold">{stats.lyrics}</h3>
              </div>
              <div className="bg-rose-600/30 p-3 rounded-lg">🎵</div>
            </div>
          </div>     
          <div className="bg-gradient-to-br from-amber-900/40 to-yellow-900/40 p-6 rounded-xl border border-amber-700/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-300 text-sm">Metaphor Created</p>
                <h3 className="text-3xl font-bold">{stats.creator}</h3>
              </div>
              <div className="bg-amber-600/30 p-3 rounded-lg">✨</div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 min-h-[320px]">
            <h2 className="text-sm text-gray-300 mb-4">Usage Distribution</h2>
            <div className="h-[260px]">
              <Doughnut data={usageDoughnut} options={chartOptions} />
            </div>
          </div>
          <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 min-h-[320px]">
            <h2 className="text-sm text-gray-300 mb-4">Daily Activity (14 days)</h2>
            <div className="h-[260px]">
              <Line data={dailyLine} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
          <div className="lg:col-span-2 bg-gray-800/50 rounded-xl border border-gray-700/50 p-6 min-h-[320px]">
            <h2 className="text-sm text-gray-300 mb-4">Per Tool Summary</h2>
            <div className="h-[260px]">
              <Bar data={perToolBar} options={chartOptions} />
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
            <h2 className="text-sm text-gray-300 mb-4">Quick Access</h2>
            <div className="space-y-3">
              <Link to="/metaphor-classifier" className="flex items-center justify-between p-4 rounded-lg bg-indigo-900/30 hover:bg-indigo-800/40 border border-indigo-700/40">
                <span className="flex items-center gap-3"><span>🎭</span> Metaphor Classifier</span>
                <span>→</span>
              </Link>
              <Link to="/masking-predict" className="flex items-center justify-between p-4 rounded-lg bg-emerald-900/30 hover:bg-emerald-800/40 border border-emerald-700/40">
                <span className="flex items-center gap-3"><span>🕵️‍♂️</span> Masking Predict</span>
                <span>→</span>
              </Link>
              <Link to="/lyric-generator" className="flex items-center justify-between p-4 rounded-lg bg-rose-900/30 hover:bg-rose-800/40 border border-rose-700/40">
                <span className="flex items-center gap-3"><span>🎵</span> Lyric Generator</span>
                <span>→</span>
              </Link>
              <Link to="/metaphor-creator" className="flex items-center justify-between p-4 rounded-lg bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40">
                <span className="flex items-center gap-3"><span>✨</span> Metaphor Creator</span>
                <span>→</span>
              </Link>
              <Link to="/chat" className="flex items-center justify-between p-4 rounded-lg bg-blue-900/30 hover:bg-blue-800/40 border border-blue-700/40">
                <span className="flex items-center gap-3"><span>💬</span> AI Chat</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
          <h2 className="text-sm text-gray-300 mb-4">Recent Activity</h2>
          {stats.recent.length === 0 ? (
            <div className="text-gray-400 text-center py-8">No recent activity</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.recent.map((a) => (
                <div key={a.id} className="bg-gray-900/50 rounded-lg p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{a.timestamp?.toLocaleString?.() || ''}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      a.type === 'metaphor_search' ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700/40' :
                      a.type === 'masking_prediction' ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' :
                      a.type === 'lyric_generation' ? 'bg-rose-900/40 text-rose-300 border-rose-700/40' :
                      'bg-amber-900/40 text-amber-300 border-amber-700/40'
                    }`}>
                      {a.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-200 line-clamp-2">
                    {a.query || a.inputText || a.seed || (Array.isArray(a.metaphors) && a.metaphors[0]) || 'Activity'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
