import { useState, useEffect } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import Swal from "sweetalert2"
import { useAuth } from "../context/AuthContext"
import { usePayment } from "../context/PaymentContext"
import TokenDisplay from "../components/TokenDisplay"
import TokenCostBanner from "../components/TokenCostBanner"
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

export default function LyricGenerator() {
  const { currentUser } = useAuth()
  const { remainingTokens: tokens, checkTokensAvailable, consumeTokens } = usePayment()
  const [motion, setMotion] = useState("calm")
  const [seed, setSeed] = useState("")
  const [generatedLyrics, setGeneratedLyrics] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [parsedLyrics, setParsedLyrics] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [selectedLyric, setSelectedLyric] = useState(0)
  const [recentSearches, setRecentSearches] = useState([])
  const [searchHistory, setSearchHistory] = useState([]) // Firestore search history
  const [viewMode, setViewMode] = useState("cards") // 'cards', 'list', or 'focus'
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [count, setCount] = useState(3) // Add count state with default value
  const [feedback, setFeedback] = useState("") // Add feedback state

  // Remove local moodUsage state - we'll calculate from Firestore data

  const motions = [
    { value: "அமைதி", label: "Calm / அமைதி", color: "bg-blue-900", icon: "🌊" },
    { value: "சந்தோஷம்", label: "Happy / சந்தோஷம்", color: "bg-yellow-500", icon: "😊" },
    { value: "கவலை", label: "Sad / கவலை", color: "bg-purple-900", icon: "😢" },
    { value: "காதல்", label: "Romantic / காதல்", color: "bg-pink-500", icon: "💖" },
    { value: "உற்சாகம்", label: "Energetic / உற்சாகம்", color: "bg-red-500", icon: "⚡" },
  ]

  // Function to calculate mood usage from Firestore data
  const calculateMoodUsage = () => {
    const moodCounts = {
      அமைதி: 0,
      சந்தோஷம்: 0,
      கவலை: 0,
      காதல்: 0,
      உற்சாகம்: 0,
    }
    
    searchHistory.forEach((item) => {
      if (item.motion && moodCounts.hasOwnProperty(item.motion)) {
        moodCounts[item.motion]++
      }
    })
    
    return moodCounts
  }

  // Firestore functions for search history
  const fetchSearchHistory = async () => {
    if (!currentUser) {
      console.log("No current user, skipping fetch")
      return
    }
    
    console.log("Fetching search history for user:", currentUser.uid)
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "lyricHistory")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(5))
      const querySnapshot = await getDocs(q)
      
      console.log("Query snapshot size:", querySnapshot.size)
      
      const history = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Document data:", data)
        history.push({
          id: doc.id,
          seed: data.seed,
          motion: data.motion,
          lyrics: data.lyrics,
          timestamp: data.timestamp?.toDate(),
        })
      })
      
      console.log("Processed history:", history)
      setSearchHistory(history)
      // Update local recentSearches for backward compatibility
      setRecentSearches(history.map(item => item.seed).filter(Boolean))
    } catch (error) {
      console.error("Error fetching search history:", error)
    }
  }

  const saveToHistory = async (seedText, selectedMotion, generatedLyrics, lyricCount) => {
    if (!currentUser) {
      console.log("Cannot save to history - missing currentUser")
      return
    }
    
    console.log("Saving to history:", { seedText, selectedMotion, lyricsCount: generatedLyrics?.length, count: lyricCount })
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "lyricHistory")
      
      // First, get current history to check if we need to delete old entries
      const q = query(historyRef, orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)
      
      console.log("Current history size:", querySnapshot.size)
      
      // If we have 5 or more entries, delete the oldest ones
      // if (querySnapshot.size >= 5) {
      //   const batch = writeBatch(db)
      //   const docsToDelete = []
      //   querySnapshot.forEach((doc) => {
      //     docsToDelete.push(doc)
      //   })
        
      //   // Delete all but the 4 most recent (so we can add 1 new one)
      //   for (let i = 4; i < docsToDelete.length; i++) {
      //     batch.delete(docsToDelete[i].ref)
      //   }
      //   await batch.commit()
      //   console.log("Deleted old entries")
      // }
      
      // Add new search entry
      const docRef = await addDoc(historyRef, {
        seed: seedText,
        motion: selectedMotion,
        lyrics: generatedLyrics,
        count: lyricCount, // Save count to history
        timestamp: serverTimestamp(),
        type: "lyric_generation"
      })
      
      console.log("Added new generation with ID:", docRef.id)
      
      // Refresh the search history
      await fetchSearchHistory()
    } catch (error) {
      console.error("Error saving to history:", error)
    }
  }

  const loadFromHistory = async (historyItem) => {
    try {
      setSeed(historyItem.seed || "")
      setMotion(historyItem.motion || "அமைதி")
      setGeneratedLyrics(historyItem.lyrics || "")
      
      toast.success("Generation history loaded!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error loading from history:", error)
      toast.error("Error loading generation history")
    }
  }

  const clearAllSearchHistory = async () => {
    if (!currentUser) return
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "lyricHistory")
      const querySnapshot = await getDocs(historyRef)
      
      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      
      setSearchHistory([])
      setRecentSearches([])
      
      toast.success("Generation history cleared!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error clearing generation history:", error)
      toast.error("Error clearing generation history")
    }
  }

  const deleteHistoryItem = async (historyId) => {
    if (!currentUser) return
    
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "lyricHistory", historyId))
      await fetchSearchHistory()
      
      toast.success("Generation deleted!", {
        position: "top-right",
        autoClose: 1500,
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast.error("Error deleting generation")
    }
  }

  // Load search history when user changes
  useEffect(() => {
    console.log("useEffect triggered, currentUser:", currentUser?.uid || "null")
    if (currentUser) {
      fetchSearchHistory()
    } else {
      setSearchHistory([])
      setRecentSearches([])
    }
  }, [currentUser])

  useEffect(() => {
    // Reset copied state when lyrics change
    setCopied(false)

    // Parse lyrics into sentences when generatedLyrics changes
    if (generatedLyrics) {
      // Check if generatedLyrics is already an array
      if (Array.isArray(generatedLyrics)) {
        setParsedLyrics(generatedLyrics)
        setSelectedLyric(0)
      } else {
        // If it's a string, split it as before
        const sentences = generatedLyrics
          .split(".")
          .map((sentence) => sentence.trim())
          .filter((sentence) => sentence.length > 0)
          .map((sentence) => (sentence.endsWith(".") ? sentence : sentence + "."))

        setParsedLyrics(sentences)
        setSelectedLyric(0)
      }
    } else {
      setParsedLyrics([])
    }
  }, [generatedLyrics])
// const userId=currentUser.uid
  const handleGenerateLyrics = async () => {
    // Check if user has enough tokens (1 token per lyric generated)
    if (!checkTokensAvailable(count)) {
      setError(`Insufficient tokens. You need ${count} tokens (1 per lyric) but only have ${tokens} tokens. Please upgrade your plan to continue.`)
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await axios.post("http://localhost:5000/api/generate-lyrics", {
        motion,
        seed,
        count, // Include count in the request
        userId: currentUser.uid // Include userId in the request
      })

      // Check if response.data.lyrics is an array or a string and set accordingly
      if (response.data && response.data.lyrics) {
        setGeneratedLyrics(response.data.lyrics)

        // Save to Firestore history
        await saveToHistory(seed, motion, response.data.lyrics, count) // Include count in history
        
        // Consume tokens after successful generation (1 token per lyric)
        await consumeTokens(count, 'LyricGenerator')
      } else {
        // Fallback in case of unexpected response format
        const fallbackLyrics = seed ? seed : "இங்கே உங்கள் பாடல் வரிகள் தோன்றும்..."
        setGeneratedLyrics(fallbackLyrics)
        
        // Save fallback to history too
        await saveToHistory(seed, motion, fallbackLyrics)
      }
    } catch (error) {
      console.error("Error generating lyrics:", error)
      setError("Failed to generate lyrics. Please try again.")
      const fallbackLyrics = seed ? seed : "இங்கே உங்கள் பாடல் வரிகள் தோன்றும்..."
      setGeneratedLyrics(fallbackLyrics)
      
      // Save even error cases to history
      await saveToHistory(seed, motion, fallbackLyrics)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text = null) => {
    const textToCopy = text || generatedLyrics
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const submitFeedback = (feedback) => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback before submitting.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      })
      return
    }

    console.log("Lyric Generator Feedback submitted:", feedback)
    toast.success("Thank you for your feedback!", {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    })
    setFeedback("") // Clear feedback after submission
  }

  const handleViewModeChange = (mode) => {
    setViewMode(mode)
  }

  const lyricExamples = [
    {
      mood: "அமைதி",
      text: "காற்று மெதுவாக வீசுகிறது, மனம் அமைதியாக இருக்கிறது.",
      label: "Calm Example",
    },
    {
      mood: "சந்தோஷம்",
      text: "இன்று என் மனதில் மகிழ்ச்சி பொங்குகிறது.",
      label: "Happy Example",
    },
    {
      mood: "கவலை",
      text: "மழை பொழிகிறது, என் மனதில் கவலை.",
      label: "Sad Example",
    },
    {
      mood: "காதல்",
      text: "உன் கண்கள் என் கனவுகளின் வெளிச்சம்.",
      label: "Romantic Example",
    },
    {
      mood: "உற்சாகம்",
      text: "வானம் கதிர்கள் வீசும், உற்சாகம் நிரம்பும்.",
      label: "Energetic Example",
    },
  ]

  const handleExampleClick = (example) => {
    setSeed(example.text)
    setMotion(example.mood)
  }

  const downloadGeneratedLyrics = () => {
    if (!generatedLyrics || parsedLyrics.length === 0) {
      alert("No lyrics generated to download. Please generate lyrics first.")
      return
    }

    // Create content with motion, seed, and all generated lyrics
    const content = [
      `Tamil Lyric Generator Results`,
      `========================`,
      ``,
      `Emotion/Motion: ${motion}`,
      `Initial Seed: ${seed || "None"}`,
      `Generated on: ${new Date().toLocaleString()}`,
      ``,
      `Generated Lyrics:`,
      `================`,
      ``,
      ...parsedLyrics.map((lyric, index) => `${index + 1}. ${lyric}`),
      ``,
      `--`,
      `Generated by Tamil Lyric Generator - Group-23`,
    ].join("\n")

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `tamil_lyrics_${motion}_${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 text-gray-100 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#3b82f612_1px,transparent_1px),linear-gradient(to_bottom,#3b82f612_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Decorative gradient circles (blue/indigo theme) */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-indigo-900/20 to-blue-900/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>

      <ToastContainer />
      {/* Header with enhanced gradient and glass effect */}
      <header className="relative bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 shadow-2xl backdrop-blur-sm border-b border-white/10">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight flex items-center">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mr-3 backdrop-blur-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              Tamil Lyric <span className="text-blue-200">Generator</span>
            </h1>
            <Link
              to="/"
              className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-xl transition-all duration-300 border border-white/20 shadow-lg backdrop-blur-sm hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </span>
            </Link>
          </div>
        </div>
      </header>

      

      <div className="flex w-full min-h-screen relative">
        {/* Main Content */}
        <div className="flex-1 p-6 relative z-10">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-100 p-4 mb-6 rounded-xl backdrop-blur-sm shadow-lg">
              <p className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            </div>
          )}

          <div className="bg-black/5 border border-gray-700 rounded-2xl shadow-2xl p-8 space-y-8 backdrop-blur-xl">
          
            <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
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
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
              </div>
              Generate Tamil Lyrics
            </h2>

            {/* Enhanced Motion Cards */}
            <div className="space-y-4">
              <label className="flex text-lg font-semibold text-blue-200 mb-4 items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z"
                  />
                </svg>
                Select Mood
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {motions.map((option) => (
                  <button
                    key={option.value}
                    className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 ${
                      motion === option.value
                        ? "ring-2 ring-blue-400 shadow-lg shadow-blue-500/30 bg-gradient-to-br from-blue-900 to-indigo-900"
                        : "bg-black/10 hover:bg-white/20 border border-white/20"
                    }`}
                    onClick={() => setMotion(option.value)}
                  >
                    <div className="relative z-10 text-center text-white">
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <div className="font-semibold text-sm">{option.label.split(" / ")[0]}</div>
                      <div className="text-xs mt-1 opacity-80 font-tamil">{option.label.split(" / ")[1]}</div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Seed Text Input */}
            <div className="space-y-3">
              <label className="flex items-center text-lg font-semibold text-blue-200 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Initial Sentence(Seed)
              </label>
              <textarea
                className="w-full border border-white/20 bg-black/5 text-white rounded-2xl p-6 h-40 font-tamil focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none shadow-inner backdrop-blur-sm placeholder-gray-400"
                placeholder="Enter an initial sentence to inspire your lyrics..."
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
              />
            </div>

            {/* Count Selection */}
            <div className="space-y-3">
              <label className="flex items-center text-lg font-semibold text-blue-200 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                  />
                </svg>
                Number of Lyrics
              </label>
              <select
                className="w-full border border-white/20 bg-black/5 text-white rounded-2xl p-4 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner backdrop-blur-sm"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value))}
              >
                <option value={1} className="bg-gray-900 text-white">1 Lyric</option>
                <option value={2} className="bg-gray-900 text-white">2 Lyrics</option>
                <option value={3} className="bg-gray-900 text-white">3 Lyrics</option>
                <option value={4} className="bg-gray-900 text-white">4 Lyrics</option>
                <option value={5} className="bg-gray-900 text-white">5 Lyrics</option>
              </select>
            </div>

            {/* Enhanced Generate Button */}
            <button
              className={`w-full ${
                isLoading
                  ? "bg-gray-900/50 cursor-not-allowed"
                  : tokens >= count
                  ? "bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02]"
                  : "bg-gradient-to-r from-red-900 to-red-700 cursor-not-allowed opacity-75"
              } text-white px-8 py-6 rounded-2xl transition-all duration-300 shadow-xl flex items-center justify-center space-x-3 font-semibold text-lg backdrop-blur-sm`}
              onClick={handleGenerateLyrics}
              disabled={isLoading || tokens < count}
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin h-6 w-6 text-white"
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
                  <span>Generating Beautiful Lyrics...</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    />
                  </svg>
                  <span>
                    {tokens >= count 
                      ? `Generate ${count} Lyric${count !== 1 ? 's' : ''} (${count} token${count !== 1 ? 's' : ''})`
                      : `Insufficient Tokens (need ${count})`
                    }
                  </span>
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                </>
              )}
            </button>
            {/* Token Display and Cost Banner */}
      <div className="relative z-10 px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <TokenDisplay />
          <TokenCostBanner 
            serviceName="Lyric Generator" 
            cost={count}
            description={`Cost: ${count} token${count !== 1 ? 's' : ''} (1 per lyric)`}
          />
        </div>
      </div>
          </div>

          {/* Enhanced Output Section */}
          <div className="bg-black/5 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-xl mt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 space-y-4 md:space-y-0 md:space-x-8">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
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
                Generated Lyrics
              </h2>

              {generatedLyrics && (
                <div className="flex flex-wrap gap-3">
                  {/* Enhanced View Mode Toggles */}
                  <div className="flex bg-black/10 rounded-xl p-1 backdrop-blur-sm border border-white/20">
                    <button
                      onClick={() => handleViewModeChange("cards")}
                      className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                        viewMode === "cards"
                          ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleViewModeChange("list")}
                      className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                        viewMode === "list"
                          ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleViewModeChange("focus")}
                      className={`py-2 px-4 rounded-lg transition-all duration-300 ${
                        viewMode === "focus"
                          ? "bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                      </svg>
                    </button>
                  </div>

                  {/* Enhanced Action Buttons */}
                  <button
                    onClick={() => copyToClipboard()}
                    className="text-white flex items-center space-x-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 border border-white/20 backdrop-blur-sm hover:shadow-lg"
                  >
                    {copied ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                        </svg>
                        <span>Copy All</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadGeneratedLyrics}
                    className="text-white flex items-center space-x-2 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 border border-white/20 backdrop-blur-sm hover:shadow-lg"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>Download</span>
                  </button>
                </div>
              )}
            </div>

            {/* Different View Modes for Lyrics */}
            {generatedLyrics ? (
              <>
                {/* Enhanced Cards View */}
                {viewMode === "cards" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {parsedLyrics.map((lyric, index) => (
                      <div
                        key={index}
                        className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                          index === selectedLyric
                            ? "bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border-2 border-blue-400 shadow-2xl shadow-blue-500/30"
                            : "bg-black/5 border border-white/20 hover:border-blue-400/50 hover:bg-white/10"
                        }`}
                        onClick={() => setSelectedLyric(index)}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                            {index + 1}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(lyric)
                            }}
                            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all duration-300"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-lg font-tamil leading-relaxed mb-4 text-white">{lyric}</p>

                        <div className="flex justify-between items-center pt-4 border-t border-white/20">
                          <div className="text-sm text-blue-300 font-medium">{motion}</div>
                          <div className="text-xl">{motions.find((m) => m.value === motion)?.icon || "🎵"}</div>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enhanced List View */}
                {viewMode === "list" && (
                  <div className="space-y-4 bg-black rounded-2xl p-6 border border-white/20 backdrop-blur-sm">
                    {parsedLyrics.map((lyric, index) => (
                      <div
                        key={index}
                        className={`group p-5 rounded-xl flex items-start space-x-4 transition-all duration-300 cursor-pointer ${
                          index === selectedLyric
                            ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-400/50 shadow-lg"
                            : "bg-black/5 border border-white/10 hover:border-blue-400/30 hover:bg-white/10"
                        }`}
                        onClick={() => setSelectedLyric(index)}
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-lg">
                          {index + 1}
                        </div>
                        <div className="flex-grow">
                          <p className="text-lg font-tamil leading-relaxed text-white">{lyric}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(lyric)
                          }}
                          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/20 flex-shrink-0 transition-all duration-300 opacity-0 group-hover:opacity-100"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                            <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Enhanced Focus View */}
                {viewMode === "focus" && parsedLyrics.length > 0 && (
                  <div className="bg-black/5 rounded-2xl border border-white/20 overflow-hidden backdrop-blur-sm shadow-2xl">
                    <div className="flex justify-between items-center bg-gradient-to-r from-blue-900/20 to-indigo-900/20 px-6 py-4 border-b border-white/20">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => setSelectedLyric((prev) => Math.max(0, prev - 1))}
                          disabled={selectedLyric === 0}
                          className={`p-2 rounded-full transition-all duration-300 ${selectedLyric === 0 ? "text-gray-900 cursor-not-allowed" : "text-gray-300 hover:text-white hover:bg-white/20"}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        <span className="text-sm font-medium text-blue-200">
                          Lyric {selectedLyric + 1} of {parsedLyrics.length}
                        </span>
                        <button
                          onClick={() => setSelectedLyric((prev) => Math.min(parsedLyrics.length - 1, prev + 1))}
                          disabled={selectedLyric === parsedLyrics.length - 1}
                          className={`p-2 rounded-full transition-all duration-300 ${selectedLyric === parsedLyrics.length - 1 ? "text-gray-900 cursor-not-allowed" : "text-gray-300 hover:text-white hover:bg-white/20"}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-sm px-3 py-1 rounded-full bg-white/20 text-blue-200 backdrop-blur-sm border border-white/30">
                          {motions.find((m) => m.value === motion)?.icon || "🎵"} {motion}
                        </div>
                        <button
                          onClick={() => copyToClipboard(parsedLyrics[selectedLyric])}
                          className="text-gray-300 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all duration-300"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                            <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="p-12 flex flex-col items-center justify-center min-h-[300px] relative">
                      <div className="absolute top-8 left-8 text-6xl text-blue-300/30 font-serif">"</div>
                      <p className="text-3xl text-center font-tamil leading-relaxed max-w-3xl text-white relative z-10 px-8">
                        {parsedLyrics[selectedLyric]}
                      </p>
                      <div className="absolute bottom-8 right-8 text-6xl text-blue-300/30 font-serif">"</div>
                    </div>

                    <div className="px-6 py-4 border-t border-white/20 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 flex justify-center space-x-2">
                      {parsedLyrics.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedLyric(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === selectedLyric
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 shadow-lg"
                              : "bg-white/30 hover:bg-white/50"
                          }`}
                          aria-label={`Go to lyric ${index + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="min-h-[400px] rounded-2xl bg-white/5 p-8 border border-white/20 flex flex-col items-center justify-center text-gray-400 space-y-6 backdrop-blur-sm">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-xl text-blue-200">Generated lyrics will appear here</p>
                  <p className="text-sm text-gray-400 max-w-md">
                    Select a mood, optionally provide an initial sentence, and click "Generate Lyrics" to create
                    beautiful Tamil lyrics
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Analytics Toggle Button */}
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center space-x-3 bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 backdrop-blur-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>{showAnalytics ? "Hide Analytics" : "Show Mood Analytics"}</span>
            </button>
          </div>

          {/* Enhanced Mood Distribution Chart */}
          {showAnalytics && (
            <div className="bg-black/5 border border-gray-700 rounded-2xl shadow-2xl p-8 backdrop-blur-xl mt-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  Mood Usage Distribution
                </h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/20 transition-all duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex justify-center">
                <div className="bg-black/5 rounded-2xl p-8 w-full max-w-2xl border border-gray-700 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold mb-6 text-center text-blue-200">Your Generation Preferences</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={Object.entries(calculateMoodUsage()).map(([mood, count]) => ({
                          name: motions.find((m) => m.value === mood)?.label.split(" / ")[0] || mood,
                          value: count,
                          icon: motions.find((m) => m.value === mood)?.icon || "🎵",
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent, value }) =>
                          value > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {Object.entries(calculateMoodUsage()).map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={["#3B82F6", "#EAB308", "#8B5CF6", "#EC4899", "#EF4444"][index]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${value} generations`, name]}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          borderRadius: "12px",
                          color: "#ffffff",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Enhanced Quick Stats */}
                  <div className="grid grid-cols-3 gap-6 mt-8">
                    <div className="bg-gradient-to-br from-blue-900/20 to-blue-900/20 rounded-xl p-4 text-center border border-blue-500/30 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-blue-300 mb-1">
                        {Object.values(calculateMoodUsage()).reduce((a, b) => a + b, 0)}
                      </div>
                      <div className="text-xs text-gray-300 uppercase tracking-wide">Total Generations</div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-4 text-center border border-gray-700/30 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-indigo-300 mb-1">
                        {
                          Object.entries(calculateMoodUsage()).reduce(
                            (maxEntry, [mood, count]) => (count > maxEntry[1] ? [mood, count] : maxEntry),
                            ["அமைதி", 0],
                          )[0]
                        }
                      </div>
                      <div className="text-xs text-gray-300 uppercase tracking-wide">Favorite Mood</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl p-4 text-center border border-purple-500/30 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-purple-300 mb-1">{parsedLyrics.length}</div>
                      <div className="text-xs text-gray-300 uppercase tracking-wide">Current Lyrics</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Right Sidebar for Examples and History */}
        <aside className="w-1/4 px-6 bg-black/5 border-l border-gray-700 rounded-l-2xl shadow-2xl overflow-y-auto backdrop-blur-xl">
          <div className="sticky top-0 bg-black/5 backdrop-blur-xl border-b border-black/10 pb-4 mb-6">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 text-center flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              Examples & History
            </h3>
          </div>

          {/* Generation History Section */}
          <div className="mb-8 bg-black/5 border border-gray-700 rounded-2xl shadow-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-300 mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
              Recent Generations
            </h3>
            
            {currentUser ? (
              searchHistory.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {searchHistory.map((historyItem, index) => (
                      <div
                        key={historyItem.id}
                        className="bg-black/5 rounded-xl p-4 border border-white/10 hover:border-blue-400/50 transition-all duration-300 cursor-pointer hover:bg-white/10"
                        onClick={() => loadFromHistory(historyItem)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{motions.find((m) => m.value === historyItem.motion)?.icon || "🎵"}</span>
                            <span className="text-xs text-blue-300 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                              {historyItem.motion}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteHistoryItem(historyItem.id)
                            }}
                            className="text-red-400 hover:text-red-300 transition text-sm p-1 rounded hover:bg-red-900/20"
                            title="Delete this generation"
                          >
                            ✖
                          </button>
                        </div>
                        {historyItem.seed && (
                          <p className="text-gray-300 text-sm mb-2 font-tamil leading-relaxed">
                            "{historyItem.seed.length > 40 ? `${historyItem.seed.slice(0, 40)}...` : historyItem.seed}"
                          </p>
                        )}
                        <div className="text-xs text-gray-400">
                          {historyItem.timestamp?.toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-4 bg-gradient-to-r from-red-900 to-red-700 hover:from-red-500 hover:to-red-900 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 w-full shadow-lg"
                    onClick={() => {
                      Swal.fire({
                        title: "Are you sure?",
                        text: "This will clear all generation history!",
                        icon: "warning",
                        showCancelButton: true,
                        confirmButtonColor: "#dc2626",
                        cancelButtonColor: "#3b82f6",
                        confirmButtonText: "Yes, clear all!",
                        cancelButtonText: "Cancel",
                      }).then((result) => {
                        if (result.isConfirmed) {
                          clearAllSearchHistory()
                        }
                      })
                    }}
                  >
                    Clear All History
                  </button>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No recent generations. Start creating lyrics to see your history here!</p>
              )
            ) : (
              <p className="text-gray-400 text-sm">Please log in to see your generation history.</p>
            )}
          </div>

          <div className="space-y-4">
            {lyricExamples.map((example, idx) => (
              <div
                key={idx}
                className="group bg-black/5 rounded-xl p-5 border border-gray-700 cursor-pointer hover:border-blue-400/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:bg-white/10 transform hover:scale-105"
                onClick={() => handleExampleClick(example)}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                    <span className="text-lg">{motions.find((m) => m.value === example.mood)?.icon || "🎵"}</span>
                  </div>
                  <span className="font-semibold text-blue-200">{example.label}</span>
                </div>
                <p className="font-tamil text-gray-200 leading-relaxed group-hover:text-white transition-colors duration-300">
                  {example.text}
                </p>

                <div className="mt-3 pt-3 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-xs text-blue-300">Click to use as seed</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-blue-900/10 to-indigo-900/10 rounded-xl text-center border border-blue-500/20">
            <p className="text-xs text-blue-300 font-medium">💡 Click any example to use it as your starting point!</p>
          </div>
      
          {/* Feedback Section */}
          <div className="bg-gradient-to-br from-slate-800/70 via-blue-950/30 to-indigo-950/50 backdrop-blur-xl border border-blue-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-blue-500/20 mt-8">
            <h2 className="text-xl font-bold mb-6 text-blue-100 flex items-center">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M18 13a1 1 0 01-1 1H5.414l2.293 2.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 12H17a1 1 0 011 1z" />
                </svg>
              </div>
              Feedback
            </h2>
            <textarea
              className="w-full bg-slate-800/70 border border-blue-600/30 text-blue-50 rounded-xl p-4 text-sm shadow-inner backdrop-blur-sm placeholder-blue-300/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 transition-all duration-300 h-32 resize-none"
              placeholder="Share your feedback about the lyric generation..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button
              className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/30 flex items-center justify-center font-medium text-lg hover:scale-105 transform w-full"
              onClick={() => submitFeedback(feedback)}
            >
              Submit Feedback
            </button>
          </div>

        </aside>

        
      </div>

      {/* Enhanced Footer */}
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
