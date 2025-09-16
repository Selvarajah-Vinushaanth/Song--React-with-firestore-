import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { useAuth } from '../context/AuthContext'
import { usePayment } from '../context/PaymentContext'
import { db } from '../context/AuthContext'
import TokenDisplay from '../components/TokenDisplay'
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white ">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
          {/* Token Display Card */}
          <div className="col-span-1">
            <TokenDisplay />
          </div>
          
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
              <Link to="/subscription" className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-900/30 to-pink-900/30 hover:from-purple-800/40 hover:to-pink-800/40 border border-purple-700/40">
                <span className="flex items-center gap-3"><span>👑</span> Subscription & Billing</span>
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
      <footer className="relative text-center py-16 text-gray-400 border-t border-gray-800/50 mt-auto backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        <div className="relative z-10">
          <p className="mb-6 text-lg font-medium">
            <span className="text-white">Tamil AI Models</span> &copy; 2025 | Created by
            <span className="text-violet-400 font-semibold"> Group-23</span>
          </p>
          <div className="flex justify-center space-x-8 mt-8">
            {[
              {
                icon: "M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z",
                color: "hover:text-violet-400",
                label: "GitHub",
              },
              {
                icon: "M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84",
                color: "hover:text-emerald-400",
                label: "Twitter",
              },
              {
                icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
                color: "hover:text-pink-400",
                label: "Instagram",
              },
            ].map((social, idx) => (
              <a
                key={idx}
                href="#"
                className={`group text-gray-500 ${social.color} transition-all duration-300 transform hover:scale-110`}
              >
                <span className="sr-only">{social.label}</span>
                <div className="relative">
                  <div className="absolute inset-0 bg-current opacity-20 rounded-full blur-lg scale-150 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <svg className="relative h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d={social.icon} clipRule="evenodd" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
