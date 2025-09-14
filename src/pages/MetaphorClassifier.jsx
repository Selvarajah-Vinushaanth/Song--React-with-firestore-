import { useState, useMemo, useRef, useEffect } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import Plot from "react-plotly.js"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import Swal from "sweetalert2"
import { FiCopy } from "react-icons/fi"
import { AiOutlineCheck } from "react-icons/ai"
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
  where,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore"

export default function MetaphorClassifier() {
  const { currentUser } = useAuth()
  const { remainingTokens: tokens, checkTokensAvailable, consumeTokens } = usePayment()
  const [inputText, setInputText] = useState("")
  const [results, setResults] = useState([])
  const [stats, setStats] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [filterLabel, setFilterLabel] = useState("all")
  const [filterConfidence, setFilterConfidence] = useState([0, 1])
  const [viewMode, setViewMode] = useState("card") // 'card' or 'table'
  const [page, setPage] = useState(1)
  const [copied, setCopied] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState("") // for keyword search
  const [copyStatus, setCopyStatus] = useState(false) // for copy feedback
  const [recentSearches, setRecentSearches] = useState([])
  const [searchHistory, setSearchHistory] = useState([]) // Firestore search history
  const [feedback, setFeedback] = useState("")
  const [copiedIndex, setCopiedIndex] = useState(null)
  const pdfRef = useRef()

  // Calculate dynamic token cost based on number of lines
  const calculateTokenCost = (text) => {
    if (!text.trim()) return 1 // Minimum 1 token
    const lines = text.trim().split('\n').filter(line => line.trim() !== '')
    return Math.max(1, lines.length) // At least 1 token, 1 token per line
  }

  const currentTokenCost = calculateTokenCost(inputText)

  const pageSize = 5

  const examples = [
    {
      text: "அந்த பெண்ணின் கண்கள் நட்சத்திரங்கள் போல மின்னின.",
      label: "Metaphor (Likely)",
      description: "Eyes compared to stars",
    },
    {
      text: "அவர் நேற்று சாப்பிட்டார்.",
      label: "Literal (Likely)",
      description: "Simple statement of fact",
    },
    {
      text: "காலம் ஒரு ஆறு போல ஓடுகிறது.",
      label: "Metaphor (Likely)",
      description: "Time compared to a river",
    },
    {
      text: "அவரது வார்த்தைகள் என் இதயத்தை துளைத்தன.",
      label: "Metaphor (Likely)",
      description: "Words described as piercing the heart",
    },
  ]
  const funFacts = [
    "காலம் ஒரு ஆறு போல ஓடுகிறது. (Time flows like a river.)",
    "அந்த பெண்ணின் கண்கள் நட்சத்திரங்கள் போல மின்னின. (Her eyes sparkled like stars.)",
    "Words are the dress of thoughts.",
  ]
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

    console.log("Feedback submitted:", feedback)
    toast.success("Thank you for your feedback!", {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
    })
  }
  const handleInputChange = (e) => {
    setInputText(e.target.value)
  }
  const handleExampleClick = (example) => {
    setInputText(example.text)
  }

  // Firestore functions for search history
  const fetchSearchHistory = async () => {
    if (!currentUser) {
      console.log("No current user, skipping fetch")
      return
    }
    
    console.log("Fetching search history for user:", currentUser.uid)
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "searchHistory")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(5))
      const querySnapshot = await getDocs(q)
      
      console.log("Query snapshot size:", querySnapshot.size)
      
      const history = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Document data:", data)
        history.push({
          id: doc.id,
          query: data.query,
          results: data.results,
          timestamp: data.timestamp?.toDate(),
        })
      })
      
      console.log("Processed history:", history)
      setSearchHistory(history)
      // Update local recentSearches for backward compatibility
      setRecentSearches(history.map(item => item.query))
    } catch (error) {
      console.error("Error fetching search history:", error)
    }
  }

  const saveToHistory = async (searchQuery, analysisResults, analysisStats) => {
    if (!currentUser || !searchQuery.trim()) {
      console.log("Cannot save to history - missing currentUser or searchQuery")
      return
    }
    
    console.log("Saving to history:", { searchQuery, resultsCount: analysisResults?.length })
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "searchHistory")
      
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
      
      // Add new search entry
      const docRef = await addDoc(historyRef, {
        query: searchQuery,
        results: analysisResults,
        stats: analysisStats,
        timestamp: serverTimestamp(),
        type: "metaphor_search"
      })
      
      console.log("Added new search with ID:", docRef.id)
      
      // Refresh the search history
      await fetchSearchHistory()
    } catch (error) {
      console.error("Error saving to history:", error)
    }
  }

  const loadFromHistory = async (historyItem) => {
    try {
      setInputText(historyItem.query)
      setResults(historyItem.results || [])
      
      // If stats exist, use them; otherwise calculate from results
      if (historyItem.stats) {
        setStats(historyItem.stats)
      } else if (historyItem.results && historyItem.results.length > 0) {
        // Calculate stats from results if not stored
        const results = historyItem.results
        const metaphorCount = results.filter((r) => r.label === "Metaphor").length
        const literalCount = results.filter((r) => r.label === "Literal").length
        
        // Calculate average confidence considering literal confidence transformation
        const avgConfidence = results.length
          ? results.reduce((sum, r) => {
              const adjustedConfidence = r.label === "Literal" ? (1 - (r.confidence || 0)) : (r.confidence || 0)
              return sum + adjustedConfidence
            }, 0) / results.length
          : 0
        
        const highConfidenceCount = results.filter((r) => {
          const adjustedConfidence = r.label === "Literal" ? (1 - (r.confidence || 0)) : (r.confidence || 0)
          return adjustedConfidence > 0.85
        }).length

        setStats({
          total_sentences: results.length,
          metaphor_count: metaphorCount,
          literal_count: literalCount,
          average_confidence: avgConfidence,
          high_confidence_count: highConfidenceCount,
        })
      } else {
        setStats(null)
      }
      
      toast.success("Search history loaded!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error loading from history:", error)
      toast.error("Error loading search history")
    }
  }

  const clearAllSearchHistory = async () => {
    if (!currentUser) return
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "searchHistory")
      const querySnapshot = await getDocs(historyRef)
      
      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      
      setSearchHistory([])
      setRecentSearches([])
      
      toast.success("Search history cleared!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error clearing search history:", error)
      toast.error("Error clearing search history")
    }
  }

  const deleteHistoryItem = async (historyId) => {
    if (!currentUser) return
    
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "searchHistory", historyId))
      await fetchSearchHistory()
      
      toast.success("Search deleted!", {
        position: "top-right",
        autoClose: 1500,
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast.error("Error deleting search")
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

  // Helper to split Tamil text into sentences (handles newlines and punctuation)
  function splitSentences(text) {
    // Split by newline, then by Tamil/English sentence-ending punctuation
    return text.split("\n").flatMap((line) =>
      line
        .split(/(?<=[.!?।]|[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean),
    )
  }

  const handleAnalyzeClick = async () => {
    if (!inputText.trim()) {
      setError("Please enter some Tamil text to analyze")
      return
    }

    // Calculate token cost based on number of lines
    const lines = inputText.trim().split('\n').filter(line => line.trim() !== '')
    const tokenCost = lines.length
    
    // Check if user has enough tokens (1 token per line)
    if (!checkTokensAvailable(tokenCost)) {
      setError(`Insufficient tokens. You need ${tokenCost} tokens (1 per line) but only have ${tokens} tokens. Please upgrade your plan to continue.`)
      return
    }

    setIsLoading(true)
    setError("")
    setResults([])
    setStats(null)

    try {
      // Split input into sentences
      const sentences = splitSentences(inputText)

      // Analyze each sentence (parallel requests)
      const promises = sentences.map((sentence) =>
        axios
          .post("http://localhost:5000/api/predict", { text: sentence })
          .then((response) => {
            // Normalize response
            if (response.data.results) {
              return response.data.results[0]
            } else if (typeof response.data.is_metaphor !== "undefined") {
              return {
                text: sentence,
                label: response.data.is_metaphor ? "Metaphor" : "Literal",
                confidence: response.data.confidence,
              }
            } else {
              return {
                text: sentence,
                label: "Unknown",
                confidence: 0,
              }
            }
          })
          .catch(() => ({
            text: sentence,
            label: "Error",
            confidence: 0,
          })),
      )

      const allResults = await Promise.all(promises)

      // Compute stats
      const metaphorCount = allResults.filter((r) => r.label === "Metaphor").length
      const literalCount = allResults.filter((r) => r.label === "Literal").length
      
      // Calculate average confidence considering literal confidence transformation
      const avgConfidence = allResults.length
        ? allResults.reduce((sum, r) => {
            const adjustedConfidence = r.label === "Literal" ? (1 - (r.confidence || 0)) : (r.confidence || 0)
            return sum + adjustedConfidence
          }, 0) / allResults.length
        : 0
      
      const highConfidenceCount = allResults.filter((r) => {
        const adjustedConfidence = r.label === "Literal" ? (1 - (r.confidence || 0)) : (r.confidence || 0)
        return adjustedConfidence > 0.85
      }).length

      const finalStats = {
        total_sentences: allResults.length,
        metaphor_count: metaphorCount,
        literal_count: literalCount,
        average_confidence: avgConfidence,
        high_confidence_count: highConfidenceCount,
      }

      setResults(allResults)
      setStats(finalStats)

      // Save to Firestore history
      await saveToHistory(inputText, allResults, finalStats)

      // Consume tokens after successful analysis (1 token per line)
      await consumeTokens(tokenCost, 'MetaphorClassifier')

    } catch (error) {
      setError("Failed to analyze text. Please try again or check if the server is running.")

      // Fallback demo results for testing UI when server is not available
      if (inputText.includes("கண்") || inputText.includes("eyes")) {
        const demoResults = [
          {
            text: inputText,
            label: "Metaphor",
            confidence: 0.92,
          },
        ]
        const demoStats = {
          total_sentences: 1,
          metaphor_count: 1,
          literal_count: 0,
          average_confidence: 0.92,
          high_confidence_count: 1,
        }
        setResults(demoResults)
        setStats(demoStats)
        
        // Save demo results to history
        await saveToHistory(inputText, demoResults, demoStats)
      } else {
        const sentences = inputText.split("\n").filter((s) => s.trim())
        const demoResults = sentences.map((sentence) => ({
          text: sentence,
          label: Math.random() > 0.5 ? "Metaphor" : "Literal",
          confidence: 0.7 + Math.random() * 0.25,
        }))

        const metaphorCount = demoResults.filter((r) => r.label === "Metaphor").length
        const demoStats = {
          total_sentences: sentences.length,
          metaphor_count: metaphorCount,
          literal_count: sentences.length - metaphorCount,
          average_confidence: 0.85,
          high_confidence_count: Math.floor(sentences.length * 0.7),
        }
        
        setResults(demoResults)
        setStats(demoStats)
        
        // Save demo results to history
        await saveToHistory(inputText, demoResults, demoStats)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Filtering logic
  // Filtering logic
  const filteredResults = results.filter((r) => {
    const labelMatch =
      filterLabel === "all" ||
      (filterLabel === "metaphor" && r.label === "Metaphor") ||
      (filterLabel === "literal" && r.label === "Literal")
    const conf = r.confidence || 0
    const confMatch = conf >= filterConfidence[0] && conf <= filterConfidence[1]
    const searchMatch = r.text.toLowerCase().includes(searchKeyword.toLowerCase()) // Check if the text includes the search keyword
    return labelMatch && confMatch && searchMatch
  })
  const searchAnalytics = useMemo(() => {
    const totalSearches = searchHistory.length
    const uniqueSearches = new Set(searchHistory.map(item => item.query)).size

    // Count frequency of each search
    const searchFrequency = searchHistory.reduce((acc, item) => {
      acc[item.query] = (acc[item.query] || 0) + 1
      return acc
    }, {})

    // Sort searches by frequency
    const mostSearched = Object.entries(searchFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Top 5 most searched phrases

    return { totalSearches, uniqueSearches, mostSearched }
  }, [searchHistory])
  // Pagination logic

  // Table sorting
  const [sortCol, setSortCol] = useState("index")
  const [sortDir, setSortDir] = useState("asc")
  // Sorting logic
  // Sorting logic
  const sortedResults = useMemo(() => {
    const arr = [...filteredResults]

    if (sortCol === "confidence") {
      // Sort by confidence
      arr.sort((a, b) =>
        sortDir === "asc" ? (a.confidence || 0) - (b.confidence || 0) : (b.confidence || 0) - (a.confidence || 0),
      )
    } else if (sortCol === "label") {
      // Sort by label
      arr.sort((a, b) => (sortDir === "asc" ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)))
    }

    return arr
  }, [filteredResults, sortCol, sortDir])

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedResults.length / pageSize)) // Use sortedResults for total pages
  const pagedResults = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedResults.slice(start, start + pageSize) // Use sortedResults for pagination
  }, [sortedResults, page, pageSize])

  // Helper function to calculate 4-axis metaphor dimensions
  const calculateMetaphorDimensions = (results, stats) => {
    if (!results || results.length === 0) return { literalness: 0, figurativeStrength: 0, concreteness: 0, emotionalIntensity: 0 }

    const totalSentences = results.length
    const metaphorCount = stats?.metaphor_count || 0
    const avgConfidence = stats?.average_confidence || 0

    // Literalness: 0 = fully metaphorical → 10 = fully literal
    const literalness = ((stats?.literal_count || 0) / totalSentences) * 10

    // Figurative Strength: How strong the metaphorical mapping is (inverse of literalness for metaphors)
    const metaphorRatio = metaphorCount / totalSentences
    const figurativeStrength = metaphorRatio * avgConfidence * 10

    // Concreteness: Based on confidence and metaphor presence (metaphors often use concrete imagery)
    const concreteness = (avgConfidence * 10) * (metaphorRatio * 0.7 + 0.3)

    // Emotional Intensity: Higher for metaphors with high confidence
    const emotionalIntensity = (metaphorRatio * avgConfidence + (1 - metaphorRatio) * 0.3) * 10

    return {
      literalness: Math.min(10, Math.max(0, literalness)),
      figurativeStrength: Math.min(10, Math.max(0, figurativeStrength)),
      concreteness: Math.min(10, Math.max(0, concreteness)),
      emotionalIntensity: Math.min(10, Math.max(0, emotionalIntensity))
    }
  }

  const metaphorDimensions = useMemo(() => {
    return calculateMetaphorDimensions(results, stats)
  }, [results, stats])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 text-gray-100 relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8b5cf612_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf612_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Decorative gradient circles (violet/purple theme) */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-purple-600/20 to-violet-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>

      <ToastContainer />
      <header className="bg-gradient-to-r from-violet-900/90 via-purple-800/90 to-violet-900/90 backdrop-blur-xl text-white p-6 shadow-2xl border-b border-violet-700/30">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
              Tamil Metaphor <span className="text-violet-300">Classifier</span>
            </h1>
            <Link
              to="/"
              className="bg-violet-900/30 hover:bg-violet-800/40 px-6 py-3 rounded-xl transition-all duration-300 border border-violet-600/30 shadow-lg hover:shadow-violet-500/20 backdrop-blur-sm"
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Home</span>
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Token Display and Cost Banner */}
      

      <div className="max-w-full mx-auto p-6 space-y-8 relative z-10">
        {error && (
          <div className="bg-red-900/80 border-l-4 border-red-400 text-red-100 p-4 mb-6 rounded-xl backdrop-blur-sm animate-pulse shadow-lg">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-800/80 via-violet-900/40 to-purple-900/60 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-8 mb-8 transition-all duration-300 hover:shadow-violet-500/20 hover:border-violet-600/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-violet-100 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path
                        fillRule="evenodd"
                        d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  Enter Tamil Text
                </h2>
                {isLoading && (
                  <span className="text-xs bg-violet-800/40 text-violet-200 px-3 py-2 rounded-full animate-pulse border border-violet-600/30 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"></div>
                      <span>Processing...</span>
                    </div>
                  </span>
                )}
              </div>
              <textarea
                className="w-full border border-violet-600/30 bg-slate-800/70 text-violet-50 rounded-xl p-6 h-80 font-tamil focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all shadow-inner backdrop-blur-sm placeholder-violet-300/50"
                value={inputText}
                onChange={handleInputChange}
                placeholder="Enter Tamil text to analyze for metaphors..."
              />
              <p className="text-xs text-violet-300/70 mt-3 mb-6 italic">
                You can enter multiple lines of text. Each line will be analyzed separately. 
                <span className="text-violet-200 font-medium">Cost: 1 token per line</span>
                {inputText.trim() && (
                  <span className="ml-2 text-violet-100 bg-violet-800/40 px-2 py-1 rounded">
                    Current cost: {currentTokenCost} token{currentTokenCost !== 1 ? 's' : ''}
                  </span>
                )}
              </p>

              <button
                className={`px-8 py-4 rounded-xl transition-all duration-300 shadow-lg flex items-center justify-center font-medium text-lg hover:scale-105 transform ${
                  tokens >= currentTokenCost 
                    ? 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white hover:shadow-violet-500/30' 
                    : 'bg-gradient-to-r from-red-600 to-red-700 text-white cursor-not-allowed opacity-75'
                }`}
                onClick={handleAnalyzeClick}
                disabled={isLoading || tokens < currentTokenCost}
              >
                {isLoading ? (
                  <span className="flex items-center">
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
                    Analyzing...
                  </span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-3"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {tokens >= currentTokenCost 
                      ? `Analyze Text (${currentTokenCost} token${currentTokenCost !== 1 ? 's' : ''})`
                      : `Insufficient Tokens (need ${currentTokenCost})`
                    }
                  </>
                )}
              </button>
              <div className="relative z-10 px-6 pt-4">
        <div className="max-w-7xl mx-auto">
          <TokenDisplay />
          <TokenCostBanner 
            serviceName="Metaphor Classifier" 
            cost={currentTokenCost}
            description={`Cost: ${currentTokenCost} token${currentTokenCost !== 1 ? 's' : ''} (1 per line)`}
          />
        </div>
      </div>
            </div>

            {results.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl rounded-2xl border border-violet-700/30 shadow-2xl">
                <div className="flex flex-wrap gap-6 items-center justify-between">
                  {/* Filter by Label */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">Filter by Label</label>
                    <select
                      className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg px-4 py-2 shadow-inner focus:ring-2 focus:ring-violet-500 focus:border-violet-400 backdrop-blur-sm"
                      value={filterLabel}
                      onChange={(e) => setFilterLabel(e.target.value)}
                    >
                      <option value="all">All Labels</option>
                      <option value="metaphor">Metaphor Only</option>
                      <option value="literal">Literal Only</option>
                    </select>
                  </div>

                  {/* Confidence Range Filter */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">Confidence Range</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={filterConfidence[0]}
                        onChange={(e) => setFilterConfidence([Number.parseFloat(e.target.value), filterConfidence[1]])}
                        className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg px-3 py-2 w-20 shadow-inner backdrop-blur-sm focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-violet-300">—</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={filterConfidence[1]}
                        onChange={(e) => setFilterConfidence([filterConfidence[0], Number.parseFloat(e.target.value)])}
                        className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg px-3 py-2 w-20 shadow-inner backdrop-blur-sm focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>

                  {/* Search by Keyword */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">Search</label>
                    <input
                      type="text"
                      placeholder="Search sentences..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg px-4 py-2 shadow-inner w-48 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 backdrop-blur-sm placeholder-violet-300/50"
                    />
                  </div>

                  {/* Sort Controls */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">Sort By</label>
                    <div className="flex bg-slate-800/80 rounded-lg p-1 shadow-inner border border-violet-600/30">
                      <button
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${sortCol === "confidence" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" : "text-violet-200 hover:bg-violet-800/50"}`}
                        onClick={() => {
                          setSortCol("confidence")
                          setSortDir(sortDir === "asc" ? "desc" : "asc")
                        }}
                      >
                        Confidence
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${sortCol === "label" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" : "text-violet-200 hover:bg-violet-800/50"}`}
                        onClick={() => {
                          setSortCol("label")
                          setSortDir(sortDir === "asc" ? "desc" : "asc")
                        }}
                      >
                        Label
                      </button>
                    </div>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">View Mode</label>
                    <div className="flex bg-slate-800/80 rounded-lg p-1 shadow-inner border border-violet-600/30">
                      <button
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${viewMode === "card" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" : "text-violet-200 hover:bg-violet-800/50"}`}
                        onClick={() => setViewMode("card")}
                      >
                        Card
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${viewMode === "table" ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg" : "text-violet-200 hover:bg-violet-800/50"}`}
                        onClick={() => setViewMode("table")}
                      >
                        Table
                      </button>
                    </div>
                  </div>

                  {/* Page Navigation */}
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm text-violet-200 font-medium">Page</label>
                    <div className="flex items-center space-x-3">
                      <button
                        className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-800/50 transition-all"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        ◀
                      </button>
                      <span className="text-violet-200 text-sm font-medium">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        className="bg-slate-800/80 border border-violet-600/30 text-violet-100 rounded-lg p-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-800/50 transition-all"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Summary & Reset/Copy */}
                <div className="mt-6 pt-4 border-t border-violet-700/30 flex flex-wrap justify-between items-center gap-4">
                  <div className="text-sm text-violet-200">
                    Showing <span className="font-bold text-violet-300">{pagedResults.length}</span> of{" "}
                    <span className="font-bold text-white">{filteredResults.length}</span> sentences
                    {filteredResults.length < results.length && <span> (filtered from {results.length} total)</span>}
                  </div>

                  <div className="flex gap-3">
                    {filteredResults.length > 0 && (
                      <>
                        <button
                          className="text-sm bg-violet-700/50 hover:bg-violet-600/60 text-violet-100 px-4 py-2 rounded-lg flex items-center transition-all duration-300 border border-violet-600/30"
                          onClick={() => {
                            setFilterLabel("all")
                            setFilterConfidence([0, 1])
                            setSearchKeyword("")
                            setPage(1)
                          }}
                        >
                          Reset Filters
                        </button>

                        <button
                          className="text-sm bg-gradient-to-r from-emerald-600/50 to-teal-600/50 hover:from-emerald-500/60 hover:to-teal-500/60 text-emerald-100 px-4 py-2 rounded-lg flex items-center transition-all duration-300 border border-emerald-500/30"
                          onClick={() => {
                            const textToCopy = filteredResults.map((r) => r.text).join("\n")
                            navigator.clipboard.writeText(textToCopy)
                            setCopyStatus(true)
                            setTimeout(() => setCopyStatus(false), 1500)
                          }}
                        >
                          {copyStatus ? (
                            <AiOutlineCheck className="text-emerald-300 text-lg mr-2" />
                          ) : (
                            <FiCopy className="text-emerald-200 hover:text-emerald-100 text-lg mr-2" />
                          )}
                          <span>{copyStatus ? "Copied All" : "Copy All "}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {viewMode === "card" && Array.isArray(pagedResults) && pagedResults.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:shadow-violet-500/20">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent flex items-center">
                    Analysis Results
                  </h2>
                  <div className="text-sm text-violet-200 flex space-x-3">
                    <span className="bg-violet-800/40 text-violet-200 px-3 py-1 rounded-lg border border-violet-600/30">
                      {stats?.metaphor_count || 0} Metaphors
                    </span>
                    <span className="bg-slate-700/50 text-slate-200 px-3 py-1 rounded-lg border border-slate-600/30">
                      {stats?.literal_count || 0} Literal
                    </span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {pagedResults.map((result, index) => {
                    const handleCopy = () => {
                      navigator.clipboard.writeText(result.text)
                      setCopiedIndex(index)
                      setTimeout(() => setCopiedIndex(null), 1500)
                    }

                    return (
                      <div
                        key={index}
                        className={`border-l-4 p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm
        ${
          result.label === "Metaphor"
            ? "border-violet-400 bg-gradient-to-br from-violet-900/40 to-purple-800/30 hover:border-violet-300"
            : "border-slate-400 bg-slate-800/40 hover:border-slate-300"
        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <p className="font-tamil text-violet-50 leading-relaxed flex-1">{result.text}</p>
                          <button
                            onClick={handleCopy}
                            className="ml-4 text-violet-300 hover:text-violet-200 transition-colors flex items-center p-2 rounded-lg hover:bg-violet-800/30"
                            title="Copy sentence"
                          >
                            {copiedIndex === index ? (
                              <AiOutlineCheck className="text-emerald-400 text-lg" />
                            ) : (
                              <FiCopy className="text-violet-300 hover:text-violet-200 text-lg" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span
                              className={`px-3 py-1 rounded-lg font-medium text-sm border ${result.label === "Metaphor" ? "bg-violet-800/50 text-violet-200 border-violet-600/30" : "bg-slate-600/50 text-slate-200 border-slate-500/30"}`}
                            >
                              {result.label}
                            </span>

                            <div className="flex items-center space-x-3">
                              <div className="w-28 h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-3 rounded-full transition-all duration-500 ${
                                    result.label === "Literal"
                                      ? 100 - result.confidence * 100 > 70
                                        ? "bg-gradient-to-r from-red-500 to-red-600"
                                        : 100 - result.confidence * 100 > 40
                                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                          : "bg-gradient-to-r from-emerald-500 to-green-500"
                                      : result.confidence > 0.7
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                        : result.confidence > 0.4
                                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                          : "bg-gradient-to-r from-red-500 to-red-600"
                                  }`}
                                  style={{
                                    width: `${
                                      result.label === "Literal"
                                        ? 100 - result.confidence * 100
                                        : result.confidence * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-violet-200 font-medium">
                                {result.label === "Literal"
                                  ? (100 - result.confidence * 100).toFixed(1) + "%"
                                  : (result.confidence * 100).toFixed(1) + "%"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {viewMode === "table" && Array.isArray(sortedResults) && sortedResults.length > 0 && (
              <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-8 overflow-x-auto transition-all duration-300 hover:shadow-violet-500/20">
                <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent flex items-center">
                  Tabular View
                </h2>

                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-violet-800/50 to-purple-800/50 text-violet-100 border-b border-violet-700/30">
                      <th className="px-6 py-4 text-left font-semibold">#</th>
                      <th className="px-6 py-4 text-left font-semibold">Sentence</th>
                      <th className="px-6 py-4 text-left font-semibold">Label</th>
                      <th className="px-6 py-4 text-left font-semibold">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-700/30">
                    {sortedResults.slice((page - 1) * pageSize, page * pageSize).map((result, idx) => {
                      const globalIndex = (page - 1) * pageSize + idx

                      const handleCopy = () => {
                        navigator.clipboard.writeText(result.text)
                        setCopiedIndex(globalIndex)
                        setTimeout(() => setCopiedIndex(null), 1500)
                      }

                      return (
                        <tr
                          key={idx}
                          className={`${result.label === "Metaphor" ? "bg-violet-900/20 hover:bg-violet-800/30" : "hover:bg-slate-800/50"} transition-all duration-300`}
                        >
                          <td className="px-6 py-4 font-semibold text-violet-200">{(page - 1) * pageSize + idx + 1}</td>
                          <td className="px-6 py-4 font-tamil text-violet-50 flex justify-between items-center">
                            <span>{result.text}</span>
                            <button
                              onClick={handleCopy}
                              className="ml-3 text-violet-300 hover:text-violet-200 transition-colors p-1 rounded"
                            >
                              {copiedIndex === globalIndex ? (
                                <AiOutlineCheck className="text-emerald-400 text-lg" />
                              ) : (
                                <FiCopy className="text-violet-300 hover:text-violet-200 text-lg" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${result.label === "Metaphor" ? "bg-violet-800/50 text-violet-200 border-violet-600/30" : "bg-slate-600/50 text-slate-200 border-slate-500/30"}`}
                            >
                              {result.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-28 h-3 bg-slate-700 rounded-full overflow-hidden shadow-inner">
                                <div
                                  className={`h-3 rounded-full transition-all duration-500 ${
                                    result.label === "Literal"
                                      ? 100 - result.confidence * 100 > 70
                                        ? "bg-gradient-to-r from-red-500 to-red-600"
                                        : 100 - result.confidence * 100 > 40
                                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                          : "bg-gradient-to-r from-emerald-500 to-green-500"
                                      : result.confidence > 0.7
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500"
                                        : result.confidence > 0.4
                                          ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                          : "bg-gradient-to-r from-red-500 to-red-600"
                                  }`}
                                  style={{
                                    width: `${
                                      result.label === "Literal"
                                        ? 100 - result.confidence * 100
                                        : result.confidence * 100
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm text-violet-200 font-medium">
                                {result.label === "Literal"
                                  ? (100 - result.confidence * 100).toFixed(1) + "%"
                                  : (result.confidence * 100).toFixed(1) + "%"}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {stats && (
              <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-8 transition-all duration-300 hover:shadow-violet-500/20 mt-8">
                <h2 className="text-3xl font-bold mb-8 text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-4 shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                        <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                      </svg>
                    </div>
                    <span className="bg-gradient-to-r from-violet-200 to-purple-200 bg-clip-text text-transparent">
                      Analysis Dashboard
                    </span>
                  </span>
                  <span className="text-sm text-violet-300 bg-violet-900/30 px-3 py-1 rounded-lg border border-violet-600/30">
                    Updated {new Date().toLocaleDateString()}
                  </span>
                </h2>

                <div className="space-y-10">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-violet-800/40 to-purple-900/40 rounded-xl p-6 border border-violet-600/30 hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-4xl font-bold text-violet-200">{stats?.metaphor_count || 0}</div>
                      <div className="text-sm text-violet-300/80">Metaphors</div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-xl p-6 border border-slate-600/30 hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-4xl font-bold text-slate-200">{stats?.literal_count || 0}</div>
                      <div className="text-sm text-slate-300/80">Literal</div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-800/40 to-purple-900/40 rounded-xl p-6 border border-indigo-600/30 hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-4xl font-bold text-indigo-200">{stats?.total_sentences || 0}</div>
                      <div className="text-sm text-indigo-300/80">Total Sentences</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-800/40 to-teal-900/40 rounded-xl p-6 border border-emerald-600/30 hover:scale-105 transition-all duration-300 shadow-lg">
                      <div className="text-4xl font-bold text-emerald-200">
                        {((stats?.average_confidence || 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-emerald-300/80">Avg. Confidence</div>
                    </div>
                  </div>

                  {/* Charts with updated colors */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    {/* Enhanced 4-axis metaphor analysis radar chart */}
                    <div className="flex flex-col bg-slate-800/30 rounded-xl p-6 border border-violet-600/20">
                      <h3 className="font-semibold text-violet-200 mb-4 text-lg">Metaphor Analysis Dimensions</h3>
                      <div className="flex-1 h-[500px]">
                        <Plot
                          data={[
                            {
                              type: "scatterpolar",
                              r: [
                                metaphorDimensions.literalness,
                                metaphorDimensions.figurativeStrength,
                                metaphorDimensions.concreteness,
                                metaphorDimensions.emotionalIntensity,
                              ],
                              theta: ["Literalness", "Figurative Strength", "Concreteness", "Emotional Intensity"],
                              fill: "toself",
                              line: { color: "#8b5cf6", width: 3 },
                              fillcolor: "rgba(139, 92, 246, 0.2)",
                              marker: { color: "#8b5cf6", size: 8 },
                              name: "Analysis Profile"
                            },
                          ]}
                          layout={{
                            polar: {
                              radialaxis: {
                                visible: true,
                                range: [0, 10],
                                tickmode: "linear",
                                tick0: 0,
                                dtick: 2,
                                gridcolor: "#3730a3",
                                linecolor: "#8b5cf6",
                                tickcolor: "#8b5cf6",
                                tickfont: { color: "#c4b5fd", size: 10 }
                              },
                              angularaxis: {
                                gridcolor: "#3730a3",
                                linecolor: "#8b5cf6",
                                tickcolor: "#8b5cf6",
                                tickfont: { color: "#c4b5fd", size: 12, family: "Arial, sans-serif" }
                              },
                              bgcolor: "rgba(0,0,0,0)"
                            },
                            paper_bgcolor: "rgba(0,0,0,0)",
                            plot_bgcolor: "rgba(0,0,0,0)",
                            font: { color: "#8b5cf6" },
                            margin: { t: 20, r: 20, b: 20, l: 20 },
                            showlegend: false
                          }}
                          config={{ displayModeBar: false }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-violet-300">
                        <div className="bg-violet-900/20 p-2 rounded">
                          <strong>Literalness:</strong> {metaphorDimensions.literalness.toFixed(1)}/10
                          <div className="text-violet-400 text-xs">0=metaphorical → 10=literal</div>
                        </div>
                        <div className="bg-violet-900/20 p-2 rounded">
                          <strong>Figurative Strength:</strong> {metaphorDimensions.figurativeStrength.toFixed(1)}/10
                          <div className="text-violet-400 text-xs">0=no figures → 10=strong metaphors</div>
                        </div>
                        <div className="bg-violet-900/20 p-2 rounded">
                          <strong>Concreteness:</strong> {metaphorDimensions.concreteness.toFixed(1)}/10
                          <div className="text-violet-400 text-xs">0=abstract → 10=tangible imagery</div>
                        </div>
                        <div className="bg-violet-900/20 p-2 rounded">
                          <strong>Emotional Intensity:</strong> {metaphorDimensions.emotionalIntensity.toFixed(1)}/10
                          <div className="text-violet-400 text-xs">0=neutral → 10=highly emotional</div>
                        </div>
                      </div>
                    </div>

                    {/* pie chart */}
                    <div className="flex flex-col bg-slate-800/30 rounded-xl p-6 border border-violet-600/20">
                      <h3 className="font-semibold text-violet-200 mb-4 text-lg">Metaphor vs Literal Distribution</h3>
                      <div className="flex-1 h-[500px]">
                        <Plot
                          data={[
                            {
                              type: "pie",
                              values: [stats?.metaphor_count || 0, stats?.literal_count || 0],
                              labels: ["Metaphor", "Literal"],
                              marker: { colors: ["#8b5cf6", "#64748b"] },
                              hole: 0.4,
                              textfont: { color: "#e2e8f0" },
                            },
                          ]}
                          layout={{
                            margin: { t: 10, r: 0, l: 0, b: 0 },
                            showlegend: true,
                            legend: { font: { color: "#e2e8f0" } },
                            paper_bgcolor: "rgba(0,0,0,0)",
                            plot_bgcolor: "rgba(0,0,0,0)",
                          }}
                          config={{ displayModeBar: false }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Explanatory Analysis Table */}
                  <div className="my-8">
                    <h3 className="text-2xl font-bold text-violet-100 mb-6 border-b border-violet-600/30 pb-3">
                      Detailed Analysis
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      {/* Traditional Stats Table */}
                      <div className="overflow-x-auto rounded-2xl shadow-xl bg-slate-800/50 border border-violet-600/20">
                        <h4 className="text-lg font-semibold text-violet-200 p-4 bg-violet-800/30 border-b border-violet-600/20">
                          Classification Summary
                        </h4>
                        <table className="min-w-full text-left text-violet-100 text-sm">
                          <tbody>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Total Sentences</td>
                              <td className="px-6 py-3 font-bold text-violet-300">{stats?.total_sentences || 0}</td>
                            </tr>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Metaphors</td>
                              <td className="px-6 py-3 font-bold text-indigo-300">{stats?.metaphor_count || 0}</td>
                            </tr>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Literal Sentences</td>
                              <td className="px-6 py-3 font-bold text-emerald-300">{stats?.literal_count || 0}</td>
                            </tr>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Average Confidence</td>
                              <td className="px-6 py-3 font-bold text-yellow-300">
                                {((stats?.average_confidence || 0) * 100).toFixed(1)}%
                              </td>
                            </tr>
                            <tr className="hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">High Confidence (&gt;85%)</td>
                              <td className="px-6 py-3 font-bold text-orange-300">{stats?.high_confidence_count || 0}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Metaphor Dimensions Table */}
                      <div className="overflow-x-auto rounded-2xl shadow-xl bg-slate-800/50 border border-violet-600/20">
                        <h4 className="text-lg font-semibold text-violet-200 p-4 bg-violet-800/30 border-b border-violet-600/20">
                          Linguistic Dimensions
                        </h4>
                        <table className="min-w-full text-left text-violet-100 text-sm">
                          <tbody>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Literalness</td>
                              <td className="px-6 py-3 font-bold text-violet-300">
                                {metaphorDimensions.literalness.toFixed(1)}/10
                              </td>
                            </tr>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Figurative Strength</td>
                              <td className="px-6 py-3 font-bold text-indigo-300">
                                {metaphorDimensions.figurativeStrength.toFixed(1)}/10
                              </td>
                            </tr>
                            <tr className="border-b border-violet-700/30 hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Concreteness</td>
                              <td className="px-6 py-3 font-bold text-emerald-300">
                                {metaphorDimensions.concreteness.toFixed(1)}/10
                              </td>
                            </tr>
                            <tr className="hover:bg-violet-800/20 transition-all">
                              <td className="px-6 py-3">Emotional Intensity</td>
                              <td className="px-6 py-3 font-bold text-yellow-300">
                                {metaphorDimensions.emotionalIntensity.toFixed(1)}/10
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        <div className="p-4 text-xs text-violet-300/70 bg-violet-900/10 border-t border-violet-600/20">
                          <p><strong>Note:</strong> These dimensions provide deeper insight into the linguistic characteristics of your text beyond simple metaphor/literal classification.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Export Data */}
                  <div className="flex justify-end mt-6">
                    <button
                      onClick={() => {
                        const csv = results
                          .map((r, i) => `S${i + 1},${r.label},${(r.confidence * 100).toFixed(1)}`)
                          .join("\n")
                        const blob = new Blob([`Sentence,Label,Confidence\n${csv}`], { type: "text/csv" })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = "analysis.csv"
                        link.click()
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-500 hover:to-purple-500 transition-all duration-300 shadow-lg hover:shadow-violet-500/30 flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20 sticky top-6">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                Examples
              </h2>
              <div className="space-y-4">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="border border-violet-600/30 rounded-xl p-4 cursor-pointer hover:bg-violet-800/20 transition-all duration-300 hover:shadow-lg hover:border-violet-500/50 hover:scale-105 transform"
                    onClick={() => handleExampleClick(example)}
                  >
                    <p className="font-tamil text-violet-50 leading-relaxed">{example.text}</p>
                    <div className="flex justify-between items-center mt-3 text-sm">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                          example.label.includes("Metaphor")
                            ? "bg-violet-800/50 text-violet-200 border-violet-600/30"
                            : "bg-slate-600/50 text-slate-200 border-slate-500/30"
                        }`}
                      >
                        {example.label}
                      </span>
                      <span className="text-violet-300/70 text-xs">{example.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                    <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                  </svg>
                </div>
                Quick Summary
              </h2>
              {stats ? (
                <ul className="space-y-3 text-violet-200 text-sm">
                  <li className="flex justify-between items-center p-2 rounded-lg bg-violet-800/20">
                    <span>Total Sentences:</span>
                    <span className="font-bold text-violet-300">{stats.total_sentences}</span>
                  </li>
                  <li className="flex justify-between items-center p-2 rounded-lg bg-indigo-800/20">
                    <span>Metaphors:</span>
                    <span className="font-bold text-indigo-300">{stats.metaphor_count}</span>
                  </li>
                  <li className="flex justify-between items-center p-2 rounded-lg bg-emerald-800/20">
                    <span>Literals:</span>
                    <span className="font-bold text-emerald-300">{stats.literal_count}</span>
                  </li>
                  <li className="flex justify-between items-center p-2 rounded-lg bg-yellow-800/20">
                    <span>Avg. Confidence:</span>
                    <span className="font-bold text-yellow-300">{(stats.average_confidence * 100).toFixed(1)}%</span>
                  </li>
                </ul>
              ) : (
                <p className="text-violet-300/70">No analysis data available.</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M3 3a1 1 0 000 2h14a1 1 0 100-2H3zM3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                Recent Searches
              </h2>
              
              {currentUser ? (
                searchHistory.length > 0 ? (
                  <>
                    <ul className="space-y-3 text-violet-200 text-sm">
                      {searchHistory.map((historyItem, index) => (
                        <li
                          key={historyItem.id}
                          className="flex flex-col bg-slate-700/30 hover:bg-violet-800/30 transition-all duration-300 rounded-lg px-4 py-3 border border-violet-600/20"
                        >
                          <div className="flex justify-between items-start">
                            <span
                              className="cursor-pointer hover:text-violet-300 transition flex-1 mr-3 font-medium"
                              onClick={() => loadFromHistory(historyItem)}
                              title="Click to load this search"
                            >
                              {historyItem.query.length > 30 ? `${historyItem.query.slice(0, 30)}...` : historyItem.query}
                            </span>
                            <button
                              className="text-red-400 hover:text-red-300 transition text-sm p-1 rounded hover:bg-red-900/20"
                              onClick={() => deleteHistoryItem(historyItem.id)}
                              title="Delete this search"
                            >
                              ✖
                            </button>
                          </div>
                          <div className="flex justify-between items-center mt-2 text-xs text-violet-300/70">
                            <span>
                              {historyItem.results?.length || 0} results • {historyItem.timestamp?.toLocaleDateString()}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="mt-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 w-full shadow-lg"
                      onClick={() => {
                        Swal.fire({
                          title: "Are you sure?",
                          text: "This will clear all recent searches!",
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
                      Clear All
                    </button>
                  </>
                ) : (
                  <p className="text-violet-300/70">No recent searches. Start analyzing text to see your search history here!</p>
                )
              ) : (
                <p className="text-violet-300/70">Please log in to see your search history.</p>
              )}
            </div>

            {/* Enhanced search analytics with violet-to-purple theme */}
            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M3 3a1 1 0 000 2h14a1 1 0 100-2H3zM3 7a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM2 11a2 2 0 002-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                </div>
                Search Analytics
              </h2>
              <ul className="space-y-3 text-violet-200 text-sm">
                <li className="flex justify-between items-center p-2 rounded-lg bg-violet-800/20">
                  <span>Total Searches:</span>
                  <span className="font-bold text-violet-300">{searchAnalytics.totalSearches}</span>
                </li>
                <li className="flex justify-between items-center p-2 rounded-lg bg-indigo-800/20">
                  <span>Unique Searches:</span>
                  <span className="font-bold text-indigo-300">{searchAnalytics.uniqueSearches}</span>
                </li>
                <li>Most Searched Phrases:</li>
                <ul className="ml-6 space-y-2">
                  {searchAnalytics.mostSearched.map(([phrase, count], index) => (
                    <li key={index} className="flex justify-between items-center p-2 rounded-lg bg-slate-700/30">
                      <span className="flex-1">{phrase.length > 30 ? `${phrase.slice(0, 30)}...` : phrase}</span>
                      <span className="text-violet-300">{count} times</span>
                    </li>
                  ))}
                </ul>
              </ul>
            </div>

            {/* Enhanced tips section with violet-to-purple theme */}
            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13 7H7v6h6V7z" />
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                Tips for Using
              </h2>
              <ul className="space-y-3 text-violet-200 text-sm">
                <li className="flex items-center p-2 rounded-lg bg-violet-800/20">
                  Enter one or more Tamil sentences for analysis.
                </li>
                <li className="flex items-center p-2 rounded-lg bg-indigo-800/20">
                  Use filters to narrow down results by label or confidence.
                </li>
                <li className="flex items-center p-2 rounded-lg bg-emerald-800/20">
                  Click "Copy All" to copy filtered results to your clipboard.
                </li>
                <li className="flex items-center p-2 rounded-lg bg-yellow-800/20">
                  Switch between "Card" and "Table" views for different layouts.
                </li>
              </ul>
            </div>

            {/* Enhanced feedback section with violet-to-purple theme */}
            <div className="bg-gradient-to-br from-slate-800/70 via-violet-900/30 to-purple-900/50 backdrop-blur-xl border border-violet-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-violet-500/20">
              <h2 className="text-xl font-bold mb-6 text-violet-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mr-3 shadow-lg">
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
                className="w-full bg-slate-800/70 border border-violet-600/30 text-violet-50 rounded-xl p-4 text-sm shadow-inner backdrop-blur-sm placeholder-violet-300/50 focus:ring-2 focus:ring-violet-500 focus:border-violet-400 transition-all duration-300 h-40 resize-none"
                placeholder="Share your feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button
                className="mt-6 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-violet-500/30 flex items-center justify-center font-medium text-lg hover:scale-105 transform"
                onClick={() => submitFeedback(feedback)}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 text-center text-violet-200/70 text-sm border-t border-violet-700/30 bg-slate-900/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6">
            {/* <div className="flex flex-col md:flex-row items-center justify-center mb-6 space-y-4 md:space-y-0 md:space-x-8">
      {examples.map((example, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded-full bg-violet-600"></div>
          <span className="text-xs">{example.label}</span>
        </div>
      ))}
    </div> */}

            <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-violet-400 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Tamil Metaphor Classifier &copy; 2025</span>
              </div>
              <span className="hidden md:inline">|</span>
              <div>Created by Group-23</div>
            </div>
            <p className="mt-3 text-violet-300/70 text-xs">Powered by natural language processing</p>

            <div className="mt-6 flex justify-center space-x-4">
              <button className="text-violet-300/70 hover:text-violet-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </button>
              <button className="text-violet-300/70 hover:text-violet-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.037 10.037 0 01-3.127 1.195 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.16a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.054 0 13.999-7.496 13.999-13.986 0-.209 0-.42-.015-.63a9.936 9.936 0 002.46-2.548l-.047-.02z" />
                </svg>
              </button>
              <button className="text-violet-300/70 hover:text-violet-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
