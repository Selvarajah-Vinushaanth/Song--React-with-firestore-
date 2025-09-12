import { useState, useEffect } from "react"
import { Pie, Bar } from "react-chartjs-2"
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"
import axios from "axios"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import Swal from "sweetalert2"
import { useAuth } from "../context/AuthContext"
import { db } from "../context/AuthContext"
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore"
Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

export default function MetaphorCreator() {
  const { currentUser } = useAuth()
  const [source, setSource] = useState("")
  const [target, setTarget] = useState("")
  const [style, setStyle] = useState("poetic")
  const [generatedMetaphors, setGeneratedMetaphors] = useState([])
  const [history, setHistory] = useState([])
  const [metaphorHistory, setMetaphorHistory] = useState([]) // Firestore history
  const [favorites, setFavorites] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState("history")
  const [count, setCount] = useState(2) // Add count state

  // Firestore functions for metaphor history
  const fetchMetaphorHistory = async () => {
    if (!currentUser) {
      console.log("No current user, skipping fetch")
      return
    }
    
    console.log("Fetching metaphor history for user:", currentUser.uid)
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "metaphorHistory")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(5))
      const querySnapshot = await getDocs(q)
      
      console.log("Query snapshot size:", querySnapshot.size)
      
      const firestoreHistory = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Document data:", data)
        firestoreHistory.push({
          id: doc.id,
          source: data.source,
          target: data.target,
          style: data.style,
          results: data.metaphors || [],
          timestamp: data.timestamp?.toDate(),
        })
      })
      
      console.log("Processed history:", firestoreHistory)
      setMetaphorHistory(firestoreHistory)
      // Update local history for backward compatibility
      setHistory(firestoreHistory)
    } catch (error) {
      console.error("Error fetching metaphor history:", error)
    }
  }

  const saveToHistory = async (sourceText, targetText, selectedStyle, metaphors) => {
    if (!currentUser || !sourceText.trim() || !targetText.trim()) {
      console.log("Cannot save to history - missing currentUser or inputs")
      return
    }
    
    console.log("Saving to history:", { sourceText, targetText, selectedStyle, metaphorCount: metaphors?.length })
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "metaphorHistory")
      
      // First, get current history to check if we need to delete old entries
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)
      
      console.log("Current history size:", querySnapshot.size)
      
      // If we have 5 or more entries, delete the oldest ones
      if (querySnapshot.size >= 5) {
        const batch = writeBatch(db)
        const docsToDelete = []
        querySnapshot.forEach((doc) => {
          docsToDelete.push(doc)
        })
        
        // Delete all but the 4 most recent (so we can add 1 new one)
        for (let i = 4; i < docsToDelete.length; i++) {
          batch.delete(docsToDelete[i].ref)
        }
        await batch.commit()
        console.log("Deleted old entries")
      }
      
      // Add new metaphor entry
      const docRef = await addDoc(historyRef, {
        source: sourceText,
        target: targetText,
        style: selectedStyle,
        metaphors: metaphors,
        timestamp: serverTimestamp(),
        type: "metaphor_creation"
      })
      
      console.log("Added new metaphor with ID:", docRef.id)
      
      // Refresh the metaphor history
      await fetchMetaphorHistory()
    } catch (error) {
      console.error("Error saving to history:", error)
    }
  }

  const loadFromHistory = async (historyItem) => {
    try {
      setSource(historyItem.source || "")
      setTarget(historyItem.target || "")
      setStyle(historyItem.style || "poetic")
      setGeneratedMetaphors(historyItem.results || [])
      
      toast.success("Metaphor history loaded!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error loading from history:", error)
      toast.error("Error loading metaphor history")
    }
  }

  const clearAllMetaphorHistory = async () => {
    if (!currentUser) return
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "metaphorHistory")
      const querySnapshot = await getDocs(historyRef)
      
      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      
      setMetaphorHistory([])
      setHistory([])
      
      toast.success("Metaphor history cleared!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error clearing metaphor history:", error)
      toast.error("Error clearing metaphor history")
    }
  }

  const deleteHistoryItem = async (historyId) => {
    if (!currentUser) return
    
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "metaphorHistory", historyId))
      await fetchMetaphorHistory()
      
      toast.success("Metaphor deleted!", {
        position: "top-right",
        autoClose: 1500,
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast.error("Error deleting metaphor")
    }
  }

  // Load metaphor history when user changes
  useEffect(() => {
    console.log("useEffect triggered, currentUser:", currentUser?.uid || "null")
    if (currentUser) {
      fetchMetaphorHistory()
      fetchFavorites()
    } else {
      setMetaphorHistory([])
      setHistory([])
      setFavorites([])
    }
  }, [currentUser])

  // Firestore functions for favorites
  const fetchFavorites = async () => {
    if (!currentUser) {
      console.log("No current user, skipping favorites fetch")
      return
    }
    
    try {
      const favoritesRef = collection(db, "users", currentUser.uid, "metaphorFavorites")
      const querySnapshot = await getDocs(favoritesRef)
      
      const userFavorites = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        userFavorites.push(data.metaphor)
      })
      
      setFavorites(userFavorites)
    } catch (error) {
      console.error("Error fetching favorites:", error)
    }
  }

  const saveToFavorites = async (metaphor) => {
    if (!currentUser) return
    
    try {
      const favoritesRef = collection(db, "users", currentUser.uid, "metaphorFavorites")
      await addDoc(favoritesRef, {
        metaphor: metaphor,
        timestamp: serverTimestamp(),
        type: "metaphor_favorite"
      })
      
      console.log("Added to favorites:", metaphor)
    } catch (error) {
      console.error("Error saving to favorites:", error)
    }
  }

  const removeFromFavorites = async (metaphor) => {
    if (!currentUser) return
    
    try {
      const favoritesRef = collection(db, "users", currentUser.uid, "metaphorFavorites")
      const q = query(favoritesRef)
      const querySnapshot = await getDocs(q)
      
      querySnapshot.forEach(async (docSnapshot) => {
        const data = docSnapshot.data()
        if (data.metaphor === metaphor) {
          await deleteDoc(docSnapshot.ref)
        }
      })
      
      console.log("Removed from favorites:", metaphor)
    } catch (error) {
      console.error("Error removing from favorites:", error)
    }
  }

  const handleGenerateMetaphors = async () => {
    if (!source.trim() || !target.trim()) {
      setError("Please fill both source and target words.")
      return
    }
    setIsLoading(true)
    setError("")

    try {
      // Call backend API endpoint
      const response = await axios.post("http://localhost:5000/api/create-metaphors", {
        source,
        target,
        style,
        count, // Include count in the request
      })

      // Process the response
      if (response.data && response.data.metaphors) {
        setGeneratedMetaphors(response.data.metaphors)
        setHistory([{ source, target, style, results: response.data.metaphors }, ...history])
        
        // Save to Firestore history
        await saveToHistory(source, target, style, response.data.metaphors)
      } else {
        throw new Error("Invalid response format from server")
      }
    } catch (err) {
      console.error("Error generating metaphors:", err)
      setError(err.response?.data?.message || "Failed to generate metaphors. Please try again.")

      // Fallback to client-side generation if API fails
      const fallbackExamples = [
        `${source} is like a shining ${target}`,
        `${target} holds the soul of a ${source}`,
        `a ${source} reborn inside an ${target}`,
      ]
      setGeneratedMetaphors(fallbackExamples)
      setHistory([{ source, target, style, results: fallbackExamples }, ...history])
      
      // Save fallback to history too
      await saveToHistory(source, target, style, fallbackExamples)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = () => {
    const textToCopy = generatedMetaphors.join("\n")
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleFavorite = async (m) => {
    if (favorites.includes(m)) {
      // Remove from favorites
      setFavorites(favorites.filter((f) => f !== m))
      await removeFromFavorites(m)
      
      toast.success("Removed from favorites!", {
        position: "top-right",
        autoClose: 1500,
      })
    } else {
      // Add to favorites
      setFavorites([...favorites, m])
      await saveToFavorites(m)
      
      toast.success("Added to favorites!", {
        position: "top-right",
        autoClose: 1500,
      })
    }
  }

  // Add this new function to handle example clicks
  const handleExampleClick = (source, target) => {
    setSource(source)
    setTarget(target)
    // Optional: Scroll to the input fields for better UX
    document.querySelector('input[placeholder*="source"]')?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Chart Data Helpers
  function getStyleChartData() {
    const styleCounts = {}
    history.forEach((h) => {
      styleCounts[h.style] = (styleCounts[h.style] || 0) + 1
    })
    return {
      labels: Object.keys(styleCounts),
      datasets: [
        {
          data: Object.values(styleCounts),
          backgroundColor: ["#ec4899", "#f43f5e", "#fb7185", "#fda4af", "#fecaca"],
        },
      ],
    }
  }

  function getSourceChartData() {
    const sourceCounts = {}
    history.forEach((h) => {
      sourceCounts[h.source] = (sourceCounts[h.source] || 0) + 1
    })
    const sorted = Object.entries(sourceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          label: "Sources",
          data: sorted.map(([_, v]) => v),
          backgroundColor: "#ec4899",
        },
      ],
    }
  }

  function getTargetChartData() {
    const targetCounts = {}
    history.forEach((h) => {
      targetCounts[h.target] = (targetCounts[h.target] || 0) + 1
    })
    const sorted = Object.entries(targetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
    return {
      labels: sorted.map(([k]) => k),
      datasets: [
        {
          label: "Targets",
          data: sorted.map(([_, v]) => v),
          backgroundColor: "#f43f5e",
        },
      ],
    }
  }

  function getFavoritesChartData() {
    // Count by style for favorites
    const styleCounts = {}
    favorites.forEach((f) => {
      const h = history.find((h) => h.results.includes(f))
      if (h) {
        styleCounts[h.style] = (styleCounts[h.style] || 0) + 1
      }
    })
    return {
      labels: Object.keys(styleCounts),
      datasets: [
        {
          data: Object.values(styleCounts),
          backgroundColor: ["#ec4899", "#f43f5e", "#fb7185", "#fda4af", "#fecaca"],
        },
      ],
    }
  }

  // Export/Share Helpers
  function exportMetaphors(type) {
    let content = ""
    const filename = "metaphors." + type
    if (type === "txt") {
      content = generatedMetaphors.join("\n")
    } else if (type === "csv") {
      content = "Metaphor\n" + generatedMetaphors.map((m) => `"${m.replace(/"/g, '""')}"`).join("\n")
    } else if (type === "json") {
      content = JSON.stringify(generatedMetaphors, null, 2)
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function shareMetaphors() {
    const text = generatedMetaphors.join("\n")
    if (navigator.share) {
      navigator.share({
        title: "My Metaphors",
        text,
      })
    } else {
      copyToClipboard()
      alert("Metaphors copied! Paste them to share on social media.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 relative overflow-hidden">

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.15),transparent_50%)] animate-pulse"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(244,63,94,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(236,72,153,0.03)_49%,rgba(236,72,153,0.03)_51%,transparent_52%)] bg-[length:20px_20px]"></div>

      <ToastContainer />
      <header className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-6 shadow-2xl backdrop-blur-sm border-b border-pink-500/20 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/90 to-rose-600/90 backdrop-blur-sm"></div>
        <div className="max-w-full mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3 backdrop-blur-sm">
                <svg className="w-6 h-6 text-pink-100" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.739 9 11 5.16-1.261 9-5.45 9-11V7l-10-5z" />
                </svg>
              </div>
              Metaphor <span className="text-pink-200 ml-2">Creator</span>
            </h1>
            <Link
              to="/"
              className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-all duration-300 border border-white/20 shadow-lg backdrop-blur-sm hover:scale-105 font-medium"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row w-full min-h-screen relative z-10">
        {/* Main Content */}
        <div className="w-full md:w-3/4 p-6 md:p-10 order-2 md:order-1">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-pink-500/20 rounded-2xl shadow-2xl p-8 space-y-6 backdrop-blur-lg mb-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-rose-500/5 rounded-2xl"></div>

            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 flex items-center relative z-10">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mr-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              Create New Metaphor
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 relative z-10">
              <div>
                <label className="block text-sm font-medium text-pink-200 mb-2">Source</label>
                <input
                  type="text"
                  placeholder="Enter source (ex: pearl)"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-pink-500/30 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all duration-300 backdrop-blur-sm text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-pink-200 mb-2">Target</label>
                <input
                  type="text"
                  placeholder="Enter target (ex: eye)"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-pink-500/30 focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all duration-300 backdrop-blur-sm text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6 items-start md:items-end relative z-10">
              <div className="w-full md:w-60">
                <label className="block text-sm font-medium text-pink-200 mb-2">Style</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-pink-500/30 text-sm focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all duration-300 backdrop-blur-sm text-white"
                >
                  <option value="poetic">✨ Poetic</option>
                  <option value="short">⚡ Short</option>
                  <option value="romantic">💖 Romantic</option>
                  <option value="philosophical">🧠 Philosophical</option>
                  <option value="humorous">😄 Humorous</option>
                </select>
              </div>

              <div className="w-full md:w-60">
                <label className="block text-sm font-medium text-pink-200 mb-2">Number of Metaphors</label>
                <select
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="w-full p-4 rounded-xl bg-slate-800/50 border border-pink-500/30 text-sm focus:ring-2 focus:ring-pink-400 focus:border-pink-400 outline-none transition-all duration-300 backdrop-blur-sm text-white"
                >
                  <option value={1}>1 Metaphor</option>
                  <option value={2}>2 Metaphors</option>
                  <option value={3}>3 Metaphors</option>
                  <option value={4}>4 Metaphors</option>
                  <option value={5}>5 Metaphors</option>
                </select>
              </div>

              <motion.button
                onClick={handleGenerateMetaphors}
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-xl text-white font-semibold hover:from-pink-600 hover:to-rose-700 transition-all duration-300 disabled:opacity-50 shadow-xl hover:shadow-2xl w-full md:w-auto relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-rose-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                {isLoading ? (
                  <div className="flex items-center justify-center relative z-10">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Generating...
                  </div>
                ) : (
                  <span className="relative z-10">Generate Metaphors</span>
                )}
              </motion.button>
            </div>

            {error && (
              <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300 text-sm mb-6 backdrop-blur-sm relative z-10">
                {error}
              </div>
            )}
          </motion.div>

          {generatedMetaphors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-pink-500/20 rounded-2xl shadow-2xl p-8 backdrop-blur-lg relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 rounded-2xl"></div>

              <div className="flex justify-between items-center mb-4 relative z-10">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  Generated Metaphors
                </h2>
                <button
                  onClick={copyToClipboard}
                  className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl text-sm text-pink-200 transition-all duration-300 flex items-center gap-2 border border-pink-500/30 backdrop-blur-sm hover:scale-105"
                >
                  {copied ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6L9 17l-5-5"></path>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                      </svg>
                      Copy All
                    </>
                  )}
                </button>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => exportMetaphors("txt")}
                    className="px-3 py-2 bg-pink-600/20 hover:bg-pink-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-pink-500/30"
                  >
                    Export TXT
                  </button>
                  <button
                    onClick={() => exportMetaphors("csv")}
                    className="px-3 py-2 bg-pink-600/20 hover:bg-pink-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-pink-500/30"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => exportMetaphors("json")}
                    className="px-3 py-2 bg-pink-600/20 hover:bg-pink-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-pink-500/30"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <div className="bg-slate-900/40 rounded-xl p-6 space-y-4 backdrop-blur-sm border border-pink-500/10 relative z-10">
                {generatedMetaphors.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex justify-between items-center p-4 rounded-xl hover:bg-pink-500/10 transition-all duration-300 border border-transparent hover:border-pink-500/20 group"
                  >
                    <p className="text-gray-100 font-medium text-lg">{m}</p>
                    <button
                      onClick={() => toggleFavorite(m)}
                      className={`ml-4 p-3 rounded-full transition-all duration-300 ${
                        favorites.includes(m)
                          ? "bg-pink-600/30 text-pink-300 scale-110"
                          : "bg-slate-700/50 text-gray-400 hover:bg-pink-600/20 hover:text-pink-300 hover:scale-110"
                      }`}
                      title={favorites.includes(m) ? "Remove from favorites" : "Add to favorites"}
                    >
                      {favorites.includes(m) ? "★" : "☆"}
                    </button>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 relative z-10">
                <h3 className="text-lg font-bold mb-4 text-pink-300 flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-md flex items-center justify-center mr-2">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                    </svg>
                  </div>
                  Metaphor Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm border border-pink-500/20">
                    <h4 className="text-sm font-semibold mb-4 text-pink-300">Style Distribution</h4>
                    <Pie data={getStyleChartData()} />
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm border border-pink-500/20">
                    <h4 className="text-sm font-semibold mb-4 text-pink-300">Most Used Sources</h4>
                    <Bar data={getSourceChartData()} />
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm border border-pink-500/20">
                    <h4 className="text-sm font-semibold mb-4 text-pink-300">Most Used Targets</h4>
                    <Bar data={getTargetChartData()} />
                  </div>
                
                {favorites.length > 0 && (
                  <div className="mt-6 bg-slate-900/50 rounded-xl p-6 backdrop-blur-sm border border-pink-500/20">
                    <h4 className="text-sm font-semibold mb-4 text-pink-300">Favorites Breakdown</h4>
                    <Pie data={getFavoritesChartData()} />
                  </div>
                )}
              </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="w-full md:w-1/4 px-6 py-8 bg-slate-900/60 border-l border-pink-500/20 order-1 md:order-2 md:overflow-y-auto backdrop-blur-lg">
          <h3 className="text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-rose-300 text-center flex items-center justify-center">
            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-md flex items-center justify-center mr-2">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            Inspiration & History
          </h3>

          <div className="space-y-6">
            <div className="bg-white/5 rounded-2xl p-6 border border-pink-500/20 shadow-xl backdrop-blur-sm">
              <h4 className="font-semibold mb-4 flex items-center text-pink-300">
                <span className="mr-2">🌟</span> Example Pairs
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("முத்து", "கண்")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">முத்து</div>
                  <div className="text-gray-400 group-hover:text-gray-300">கண்</div>
                </div>
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("தீ", "ஆர்வம்")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">தீ</div>
                  <div className="text-gray-400 group-hover:text-gray-300">ஆர்வம்</div>
                </div>
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("சந்திரன்", "கனவு")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">சந்திரன்</div>
                  <div className="text-gray-400 group-hover:text-gray-300">கனவு</div>
                </div>
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("மரம்", "மனம்")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">மரம்</div>
                  <div className="text-gray-400 group-hover:text-gray-300">மனம்</div>
                </div>
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("நட்சத்திரம்", "ஒளி")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">நட்சத்திரம்</div>
                  <div className="text-gray-400 group-hover:text-gray-300">ஒளி</div>
                </div>
                <div
                  className="p-3 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group hover:scale-105"
                  onClick={() => handleExampleClick("கடல்", "நிழல்")}
                >
                  <div className="font-medium text-pink-300 group-hover:text-pink-200">கடல்</div>
                  <div className="text-gray-400 group-hover:text-gray-300">நிழல்</div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-pink-500/20 shadow-xl backdrop-blur-sm">
              <div className="flex border-b border-pink-500/30 mb-4">
                <button
                  className={`py-3 px-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === "history"
                      ? "text-pink-300 border-b-2 border-pink-400"
                      : "text-gray-400 hover:text-pink-300"
                  }`}
                  onClick={() => setActiveTab("history")}
                >
                  History
                </button>
                <button
                  className={`py-3 px-4 text-sm font-medium transition-all duration-300 ${
                    activeTab === "favorites"
                      ? "text-pink-300 border-b-2 border-pink-400"
                      : "text-gray-400 hover:text-pink-300"
                  }`}
                  onClick={() => setActiveTab("favorites")}
                >
                  Favorites
                </button>
              </div>

              {activeTab === "history" && (
                <>
                  {currentUser ? (
                    metaphorHistory.length === 0 ? (
                      <div className="text-sm text-gray-400 bg-slate-800/30 p-4 rounded-xl border border-pink-500/20 text-center">
                        No history yet. Generate your first metaphor!
                      </div>
                    ) : (
                      <>
                        <ul className="space-y-3 text-sm max-h-60 overflow-y-auto pr-1">
                          {metaphorHistory.map((h, i) => (
                            <li
                              key={h.id}
                              className="p-4 bg-slate-800/40 rounded-xl border border-pink-500/20 hover:border-pink-400/50 hover:bg-pink-500/10 transition-all duration-300 cursor-pointer group"
                              onClick={() => loadFromHistory(h)}
                            >
                              <div className="flex justify-between mb-2">
                                <span className="font-medium text-pink-300 group-hover:text-pink-200">
                                  {h.source} → {h.target}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-pink-600/20 px-2 py-1 rounded-lg text-pink-300 border border-pink-500/30">
                                    {h.style}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteHistoryItem(h.id)
                                    }}
                                    className="text-red-400 hover:text-red-300 transition text-sm p-1 rounded hover:bg-red-900/20"
                                    title="Delete this metaphor"
                                  >
                                    ✖
                                  </button>
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 line-clamp-1 group-hover:text-gray-300">
                                {h.results[0]}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {h.timestamp?.toLocaleDateString()}
                              </div>
                            </li>
                          ))}
                        </ul>
                        <button
                          className="mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 w-full shadow-lg"
                          onClick={() => {
                            Swal.fire({
                              title: "Are you sure?",
                              text: "This will clear all metaphor history!",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#dc2626",
                              cancelButtonColor: "#3b82f6",
                              confirmButtonText: "Yes, clear all!",
                              cancelButtonText: "Cancel",
                            }).then((result) => {
                              if (result.isConfirmed) {
                                clearAllMetaphorHistory()
                              }
                            })
                          }}
                        >
                          Clear All History
                        </button>
                      </>
                    )
                  ) : (
                    <div className="text-sm text-gray-400 bg-slate-800/30 p-4 rounded-xl border border-pink-500/20 text-center">
                      Please log in to see your metaphor history.
                    </div>
                  )}
                </>
              )}

              {activeTab === "favorites" && (
                <>
                  {favorites.length === 0 ? (
                    <div className="text-sm text-gray-400 bg-slate-800/30 p-4 rounded-xl border border-pink-500/20 text-center">
                      No favorites yet. Click the star icon to save a metaphor!
                    </div>
                  ) : (
                    <ul className="space-y-3 text-sm max-h-60 overflow-y-auto pr-1">
                      {favorites.map((f, i) => (
                        <li
                          key={i}
                          className="p-4 bg-slate-800/40 rounded-xl border border-pink-500/20 group hover:bg-pink-500/10 transition-all duration-300"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-gray-200 group-hover:text-gray-100">{f}</p>
                            <button
                              onClick={() => toggleFavorite(f)}
                              className="opacity-0 group-hover:opacity-100 text-pink-400 hover:text-pink-300 transition-all duration-300 p-1 rounded-full hover:bg-pink-500/20"
                              title="Remove from favorites"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 18L18 6M6 6l12 12"></path>
                              </svg>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="text-xs text-pink-300/70 text-center mt-6 bg-pink-500/10 p-3 rounded-xl border border-pink-500/20">
            Click any example to use it as your source and target!
          </div>
        </div>
      </div>

      <footer className="mt-12 py-8 text-center text-gray-400 text-sm border-t border-pink-500/20 bg-slate-900/60 backdrop-blur-lg relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-900/20 to-rose-900/20"></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <span className="text-pink-300">Metaphor Creator &copy; 2025</span>
            </div>
            <span className="hidden md:inline text-pink-500">|</span>
            <div className="text-pink-300">Created by Group-23</div>
          </div>
          <p className="mt-3 text-pink-400/70 text-xs">Powered by creative language processing</p>

          <div className="mt-6 flex justify-center space-x-4">
            <button className="text-gray-500 hover:text-pink-400 transition-all duration-300 p-2 rounded-full hover:bg-pink-500/20 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-pink-400 transition-all duration-300 p-2 rounded-full hover:bg-pink-500/20 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.037 10.037 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.16a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z" />
              </svg>
            </button>
            <button className="text-gray-500 hover:text-pink-400 transition-all duration-300 p-2 rounded-full hover:bg-pink-500/20 hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}
