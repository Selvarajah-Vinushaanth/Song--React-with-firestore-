import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import Swal from "sweetalert2"
import { FiCopy } from "react-icons/fi"
import { AiOutlineCheck } from "react-icons/ai"
import { useAuth } from "../context/AuthContext"
import { useKeyboardShortcuts } from "../context/KeyboardShortcutsContext"
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

export default function MaskingPredict() {
  const { currentUser } = useAuth()
  const [inputText, setInputText] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [multipleMaskSuggestions, setMultipleMaskSuggestions] = useState([]) // New state for multiple masks
  const [selectedWords, setSelectedWords] = useState([]) // Track selected words for each mask
  const [previewSentence, setPreviewSentence] = useState("") // Preview sentence with selections
  const [isLoading, setIsLoading] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [maskingHistory, setMaskingHistory] = useState([]) // Firestore history
  const [feedback, setFeedback] = useState("")
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [copyAllStatus, setCopyAllStatus] = useState(false)
  const [count, setCount] = useState(4) // Add count state with default value

  const examples = [
  "நான் [mask] வீட்டிற்கு செல்கிறேன்",
  "அவர் [mask] உணவு சாப்பிட்டார்",
  "அவர்கள் [mask] பாடசாலைக்கு போனார்கள்",
  "அவள் [mask] பாடலை பாடினாள்",
  "நாம் [mask] [mask] விளையாடுகிறோம்",
  "நான் [mask] பள்ளிக்குச் [mask] நண்பர்களுடன் [mask] போகிறேன்"
]

  // Firestore functions for masking history
  const fetchMaskingHistory = async () => {
    if (!currentUser) {
      console.log("No current user, skipping fetch")
      return
    }
    
    console.log("Fetching masking history for user:", currentUser.uid)
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "maskingHistory")
      const q = query(historyRef, orderBy("timestamp", "desc"), limit(5))
      const querySnapshot = await getDocs(q)
      
      console.log("Query snapshot size:", querySnapshot.size)
      
      const history = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log("Document data:", data)
        
        // Process the data to handle both old and new formats
        let processedData = {
          id: doc.id,
          inputText: data.inputText,
          timestamp: data.timestamp?.toDate(),
          isMultipleMask: data.isMultipleMask || false,
          maskCount: data.maskCount || 1
        }
        
        // Handle suggestions based on format
        if (data.isMultipleMask && data.suggestions && typeof data.suggestions === 'object') {
          // New format with flattened structure
          processedData.suggestions = data.suggestions
        } else if (Array.isArray(data.suggestions)) {
          // Old format or single mask
          processedData.suggestions = data.suggestions
        } else {
          processedData.suggestions = []
        }
        
        history.push(processedData)
      })
      
      console.log("Processed history:", history)
      setMaskingHistory(history)
      // Update local recentSearches for backward compatibility
      setRecentSearches(history.map(item => item.inputText).filter(Boolean))
    } catch (error) {
      console.error("Error fetching masking history:", error)
    }
  }

  const saveToHistory = async (text, suggestionResults) => {
    if (!currentUser || !text.trim()) {
      console.log("Cannot save to history - missing currentUser or text")
      return
    }
    
    console.log("Saving to history:", { text, suggestionsCount: suggestionResults?.length })
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "maskingHistory")
      
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
      
      // Prepare data for Firestore (handle both single and multiple mask scenarios)
      let dataToSave = {
        inputText: text,
        timestamp: serverTimestamp(),
        type: "masking_prediction"
      }
      
      // Check if suggestionResults is a nested array (multiple masks) or simple array (single mask)
      if (Array.isArray(suggestionResults) && suggestionResults.length > 0) {
        if (Array.isArray(suggestionResults[0])) {
          // Multiple masks - flatten the structure
          const maskCount = suggestionResults.length
          dataToSave.maskCount = maskCount
          dataToSave.isMultipleMask = true
          
          // Flatten nested arrays into a single object with indexed keys
          const flattenedSuggestions = {}
          suggestionResults.forEach((maskSuggestions, maskIndex) => {
            flattenedSuggestions[`mask_${maskIndex}`] = maskSuggestions
          })
          dataToSave.suggestions = flattenedSuggestions
        } else {
          // Single mask - simple array
          dataToSave.maskCount = 1
          dataToSave.isMultipleMask = false
          dataToSave.suggestions = suggestionResults
        }
      } else {
        // Fallback
        dataToSave.maskCount = 1
        dataToSave.isMultipleMask = false
        dataToSave.suggestions = suggestionResults || []
      }
      
      // Add new masking entry
      const docRef = await addDoc(historyRef, dataToSave)
      
      console.log("Added new masking prediction with ID:", docRef.id)
      
      // Refresh the masking history
      await fetchMaskingHistory()
    } catch (error) {
      console.error("Error saving to history:", error)
    }
  }

  const loadFromHistory = async (historyItem) => {
    try {
      setInputText(historyItem.inputText || "")
      
      // Handle both single and multiple mask data
      if (historyItem.isMultipleMask && historyItem.suggestions && historyItem.maskCount > 1) {
        // Multiple masks - reconstruct the nested array structure
        const reconstructedSuggestions = []
        for (let i = 0; i < historyItem.maskCount; i++) {
          const maskKey = `mask_${i}`
          if (historyItem.suggestions[maskKey]) {
            reconstructedSuggestions.push(historyItem.suggestions[maskKey])
          }
        }
        
        setMultipleMaskSuggestions(reconstructedSuggestions)
        setSuggestions([])
        setSelectedWords(new Array(historyItem.maskCount).fill(null))
        setPreviewSentence(historyItem.inputText)
      } else {
        // Single mask
        setSuggestions(historyItem.suggestions || [])
        setMultipleMaskSuggestions([])
        setSelectedWords([])
        setPreviewSentence("")
      }
      
      toast.success("Masking history loaded!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error loading from history:", error)
      toast.error("Error loading masking history")
    }
  }

  const clearAllMaskingHistory = async () => {
    if (!currentUser) return
    
    try {
      const historyRef = collection(db, "users", currentUser.uid, "maskingHistory")
      const querySnapshot = await getDocs(historyRef)
      
      const batch = writeBatch(db)
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
      
      setMaskingHistory([])
      setRecentSearches([])
      
      toast.success("Masking history cleared!", {
        position: "top-right",
        autoClose: 2000,
      })
    } catch (error) {
      console.error("Error clearing masking history:", error)
      toast.error("Error clearing masking history")
    }
  }

  const deleteHistoryItem = async (historyId) => {
    if (!currentUser) return
    
    try {
      await deleteDoc(doc(db, "users", currentUser.uid, "maskingHistory", historyId))
      await fetchMaskingHistory()
      
      toast.success("Prediction deleted!", {
        position: "top-right",
        autoClose: 1500,
      })
    } catch (error) {
      console.error("Error deleting history item:", error)
      toast.error("Error deleting prediction")
    }
  }

  // Load masking history when user changes
  useEffect(() => {
    console.log("useEffect triggered, currentUser:", currentUser?.uid || "null")
    if (currentUser) {
      fetchMaskingHistory()
    } else {
      setMaskingHistory([])
      setRecentSearches([])
    }
  }, [currentUser])

  // Update preview sentence when selections change
  useEffect(() => {
  if (multipleMaskSuggestions.length > 0) {
    const preview = replaceMaskAtIndex(inputText, selectedWords)
    setPreviewSentence(preview)
  }
}, [selectedWords, inputText, multipleMaskSuggestions])



  function handleExampleClick(example) {
    setInputText(example)
  }

  // Copy functions
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!", {
      position: "top-right",
      autoClose: 1500,
    })
  }

  const copyAllSuggestions = () => {
    if (suggestions.length === 0) {
      toast.error("No suggestions to copy", {
        position: "top-right",
        autoClose: 2000,
      })
      return
    }
    
    const allSuggestions = suggestions.map((word, index) => 
      `${index + 1}. ${inputText.replace("[mask]", word)}`
    ).join("\n")
    
    navigator.clipboard.writeText(allSuggestions)
    setCopyAllStatus(true)
    setTimeout(() => setCopyAllStatus(false), 2000)
    
    toast.success("All suggestions copied!", {
      position: "top-right",
      autoClose: 2000,
    })
  }

  const copyIndividualSuggestion = (word, index) => {
    const completeSentence = inputText.replace("[mask]", word)
    copyToClipboard(completeSentence)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  // Export functions
  const exportSuggestions = (format) => {
    if (suggestions.length === 0) {
      toast.error("No suggestions to export", {
        position: "top-right",
        autoClose: 2000,
      })
      return
    }

    let content = ""
    let filename = ""
    
    const timestamp = new Date().toLocaleDateString()
    const completeSuggestions = suggestions.map((word, index) => ({
      index: index + 1,
      suggestion: word,
      completeSentence: inputText.replace("[mask]", word)
    }))

    switch (format) {
      case "txt":
        content = [
          `Tamil Masking Predictions - ${timestamp}`,
          `================================`,
          ``,
          `Original Sentence: ${inputText}`,
          ``,
          `Suggestions:`,
          ...completeSuggestions.map(item => `${item.index}. ${item.completeSentence}`)
        ].join("\n")
        filename = `masking_predictions_${Date.now()}.txt`
        break
        
      case "csv":
        content = [
          "Index,Suggestion,Complete Sentence",
          ...completeSuggestions.map(item => 
            `${item.index},"${item.suggestion}","${item.completeSentence}"`
          )
        ].join("\n")
        filename = `masking_predictions_${Date.now()}.csv`
        break
        
      case "json":
        content = JSON.stringify({
          timestamp,
          originalSentence: inputText,
          suggestions: completeSuggestions
        }, null, 2)
        filename = `masking_predictions_${Date.now()}.json`
        break
        
      default:
        return
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    toast.success(`Exported as ${format.toUpperCase()}!`, {
      position: "top-right",
      autoClose: 2000,
    })
  }

  // Helper function to count masks in text
  const countMasks = (text) => {
    const matches = text.match(/\[mask\]/g)
    return matches ? matches.length : 0
  }

  // Helper function to replace specific mask occurrence
 const replaceMaskAtIndex = (text, words) => {
  let currentIndex = 0
  return text.replace(/\[mask\]/g, (match) => {
    if (words[currentIndex]) {
      const replacement = words[currentIndex]
      currentIndex++
      return replacement
    } else {
      currentIndex++
      return match
    }
  })
}



  // Handle word selection for specific mask
 const handleWordSelection = (maskIndex, word) => {
  // Make a copy of the current state
  const newSelectedWords = [...selectedWords]

  // Ensure the array is long enough
  while (newSelectedWords.length < multipleMaskSuggestions.length) {
    newSelectedWords.push(null)
  }

  // Update only the clicked mask
  newSelectedWords[maskIndex] = word

  // Update state
  setSelectedWords(newSelectedWords)

  toast.success(`Selected "${word}" for mask ${maskIndex + 1}`, {
    position: "top-right",
    autoClose: 1500,
  })
}



  // Clear selection for specific mask
  const clearSelection = (maskIndex) => {
    const currentLength = multipleMaskSuggestions.length
    const newSelectedWords = Array(currentLength).fill(null)
    
    // Copy existing selections except for the cleared index
    selectedWords.forEach((existingWord, index) => {
      if (index < currentLength && index !== maskIndex && existingWord !== null) {
        newSelectedWords[index] = existingWord
      }
    })
    
    setSelectedWords(newSelectedWords)
  }

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedWords(new Array(multipleMaskSuggestions.length).fill(null))
    setPreviewSentence(inputText)
  }

  function handlePredict() {
    if (!inputText.includes("[mask]")) {
      toast.error("Please include [mask] in your sentence", {
        position: "top-right",
        autoClose: 3000,
      })
      return
    }
    
    const maskCount = countMasks(inputText)
    
    setIsLoading(true)
    setRecentSearches((prev) => [inputText, ...prev.filter((s) => s !== inputText)].slice(0, 5))
    
    if (maskCount === 1) {
      // Handle single mask (existing logic)
      const API_URL = "http://localhost:5000/api/predict-mask";

      fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: inputText,
          top_k: count
        }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok")
          }
          return response.json()
        })
        .then(async (data) => {
          setSuggestions(data.suggestions)
          setMultipleMaskSuggestions([]) // Clear multiple mask suggestions
          setSelectedWords([])
          setPreviewSentence("")
          setIsLoading(false)
          
          await saveToHistory(inputText, data.suggestions)
        })
        .catch(async (error) => {
          console.error("Error:", error)
          toast.error("Failed to get predictions. Using fallback suggestions.", {
            position: "top-right",
            autoClose: 3000,
          })
          const allFallbackSuggestions = ["walk", "go", "run", "travel", "drive", "move", "fly", "swim"]
          const fallbackSuggestions = allFallbackSuggestions.slice(0, count)
          setSuggestions(fallbackSuggestions)
          setMultipleMaskSuggestions([])
          setSelectedWords([])
          setPreviewSentence("")
          setIsLoading(false)
          
          await saveToHistory(inputText, fallbackSuggestions)
        })
    } else {
      // Handle multiple masks
      const API_URL = "http://localhost:5000/api/predict-mask";
      const maskPromises = []
      
      // Create separate requests for each mask position
      for (let i = 0; i < maskCount; i++) {
        // Replace all masks except the current one with a placeholder
        let tempText = inputText
        let currentMaskIndex = 0
        tempText = tempText.replace(/\[mask\]/g, (match) => {
          if (currentMaskIndex === i) {
            currentMaskIndex++
            return "[mask]"
          } else {
            currentMaskIndex++
            return "___PLACEHOLDER___"
          }
        })
        
        const promise = fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: tempText,
            top_k: Math.min(count, 6) // Limit suggestions for multiple masks
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok")
            }
            return response.json()
          })
          .then((data) => ({
            maskIndex: i,
            suggestions: data.suggestions
          }))
          .catch((error) => {
            console.error(`Error for mask ${i}:`, error)
            return {
              maskIndex: i,
              suggestions: ["word", "item", "thing", "element"].slice(0, Math.min(count, 4))
            }
          })
        
        maskPromises.push(promise)
      }
      
      Promise.all(maskPromises)
        .then(async (results) => {
          // Sort results by mask index to ensure correct order
          results.sort((a, b) => a.maskIndex - b.maskIndex)
          
          const allSuggestions = results.map(result => result.suggestions)
          setMultipleMaskSuggestions(allSuggestions)
          setSuggestions([]) // Clear single mask suggestions
          setSelectedWords(new Array(allSuggestions.length).fill(null)) // Reset selections
          setPreviewSentence(inputText)
          setIsLoading(false)
          
          // Save to history with multiple mask format
          await saveToHistory(inputText, allSuggestions)
        })
        .catch(async (error) => {
          console.error("Error with multiple masks:", error)
          toast.error("Failed to get predictions for multiple masks.", {
            position: "top-right",
            autoClose: 3000,
          })
          
          // Fallback for multiple masks
          const fallbackSuggestions = Array(maskCount).fill().map(() => 
            ["word", "item", "thing", "element"].slice(0, Math.min(count, 4))
          )
          setMultipleMaskSuggestions(fallbackSuggestions)
          setSuggestions([])
          setSelectedWords(new Array(maskCount).fill(null)) // Initialize with correct length
          setPreviewSentence(inputText)
          setIsLoading(false)
          
          await saveToHistory(inputText, fallbackSuggestions)
        })
    }
  }

  const handleFeedbackSubmit = () => {
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
    setFeedback("")
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-lime-900 to-black text-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      {/* Decorative gradient circles */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-green-600/20 to-lime-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
      <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-lime-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
      <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-green-600/20 to-lime-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>

      <ToastContainer />
      <header className="bg-gradient-to-r from-green-900/90 via-lime-800/90 to-green-900/90 backdrop-blur-xl text-white p-6 shadow-2xl border-b border-green-700/30">
        <div className="max-w-full mx-auto px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-green-200 to-lime-200 bg-clip-text text-transparent">
              Masking <span className="text-lime-300">Predict</span>
            </h1>
            <Link
              to="/"
              className="bg-green-900/30 hover:bg-green-800/40 px-6 py-3 rounded-xl transition-all duration-300 border border-green-600/30 shadow-lg hover:shadow-green-500/20 backdrop-blur-sm"
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

      <div className="max-w-full mx-auto p-6 space-y-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="bg-gradient-to-br from-slate-800/80 via-green-900/40 to-lime-900/60 backdrop-blur-xl border border-green-700/30 rounded-2xl shadow-2xl p-8 mb-8 transition-all duration-300 hover:shadow-green-500/20 hover:border-green-600/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-lime-100 flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                    <span className="text-2xl">🕵️‍♂️</span>
                  </div>
                  Enter Sentence with [mask]
                </h2>
                {isLoading && (
                  <span className="text-xs bg-green-800/40 text-lime-200 px-3 py-2 rounded-full animate-pulse border border-green-600/30 backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-lime-400 rounded-full animate-bounce"></div>
                      <span>Processing...</span>
                    </div>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                {/* Input field */}
                <div className="md:col-span-3 space-y-2">
                  <label className="block text-sm font-medium text-lime-200">Sentence with [mask]</label>
                  <input
                    className="w-full border border-green-600/30 bg-slate-800/70 text-lime-50 rounded-xl p-4 font-tamil focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all shadow-inner backdrop-blur-sm placeholder-lime-300/50 text-lg"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Type a sentence with [mask]..."
                  />
                </div>

                {/* Count Selection */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-lime-200">Number of Suggestions</label>
                  <select
                    className="w-full bg-slate-800/70 text-lime-50 rounded-xl border border-green-600/30 px-4 py-4 focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all shadow-inner backdrop-blur-sm"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                  >
                    <option value={2}>2 Suggestions</option>
                    <option value={4}>4 Suggestions</option>
                    <option value={6}>6 Suggestions</option>
                    {/* <option value={6}>6 Suggestions</option>
                    <option value={7}>7 Suggestions</option> */}
                    <option value={8}>8 Suggestions</option>
                    {/* <option value={9}>9 Suggestions</option> */}
                    <option value={10}>10 Suggestions</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-lime-300/70 mt-3 mb-6 italic">
                Example: "I [mask] to school" or "She [mask] the book". Select how many word suggestions you want.
              </p>

              <button
                className="bg-gradient-to-r from-green-600 to-lime-700 hover:from-green-500 hover:to-lime-600 text-white px-8 py-4 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/30 flex items-center justify-center font-medium text-lg hover:scale-105 transform"
                onClick={handlePredict}
                disabled={isLoading || !inputText.includes("[mask]")}
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
                    Predicting...
                  </span>
                ) : (
                  <>
                    <span className="text-2xl mr-3">🕵️‍♂️</span>
                    Get Suggestions
                  </>
                )}
              </button>
            </div>

            {/* Multiple Mask Preview Section */}
            {multipleMaskSuggestions.length > 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl rounded-2xl border border-green-700/30 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-green-200 to-lime-200 bg-clip-text text-transparent flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                      <span className="text-xl">🎯</span>
                    </div>
                    Preview & Select Words
                  </h2>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={clearAllSelections}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg text-red-200 text-sm transition-all duration-200 border border-red-500/30"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        if (previewSentence && !previewSentence.includes('[mask]')) {
                          navigator.clipboard.writeText(previewSentence)
                          toast.success("Complete sentence copied!", {
                            position: "top-right",
                            autoClose: 2000,
                          })
                        }
                      }}
                      disabled={previewSentence.includes('[mask]')}
                      className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/40 rounded-lg text-emerald-200 text-sm transition-all duration-200 border border-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Copy Complete
                    </button>
                  </div>
                </div>

                {/* Preview Sentence */}
                <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-green-600/30">
                  <label className="block text-sm font-medium text-lime-200 mb-2">Preview Sentence:</label>
                  <p className="text-xl font-tamil text-lime-50 leading-relaxed">
                    {previewSentence || inputText}
                  </p>
                  <div className="mt-2 text-xs text-lime-300/70">
                    Click on suggestions below to fill in the masks
                  </div>
                </div>

                {/* Multiple Mask Suggestions */}
                <div className="space-y-6">
                  {multipleMaskSuggestions.map((maskSuggestions, maskIndex) => (
                    <div key={`mask-section-${maskIndex}`} className="border border-green-700/30 rounded-xl p-4 bg-gradient-to-br from-green-900/20 to-lime-800/20">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-lime-100">
                          Mask {maskIndex + 1} Suggestions
                          {selectedWords[maskIndex] && (
                            <span className="ml-2 text-sm bg-emerald-800/50 text-emerald-200 px-2 py-1 rounded-lg">
                              Selected: "{selectedWords[maskIndex]}"
                            </span>
                          )}
                        </h3>
                        {selectedWords[maskIndex] && (
                          <button
                            onClick={() => clearSelection(maskIndex)}
                            className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded hover:bg-red-900/20 transition-all"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {maskSuggestions.map((word, wordIndex) => (
                          <button
                            key={`mask-${maskIndex}-word-${wordIndex}-${word}`}
              
                            onClick={() => handleWordSelection(maskIndex, word)}
                            className={`p-3 rounded-lg border transition-all duration-300 text-left ${
                              selectedWords[maskIndex] === word
                                ? 'bg-emerald-700/50 border-emerald-500 text-emerald-100 shadow-lg'
                                : 'bg-slate-700/30 border-lime-600/30 text-lime-200 hover:bg-lime-800/30 hover:border-lime-500/50 hover:scale-105'
                            }`}
                          >
                            <div className="font-medium">{word}</div>
                            <div className="text-xs opacity-70 mt-1">
                              Click to select for mask {maskIndex + 1}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="mt-6 pt-4 border-t border-green-700/30">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-lime-200">
                      Progress: <span className="font-bold text-lime-300">
                        {selectedWords.filter(word => word !== null).length}
                      </span> of <span className="font-bold text-white">{multipleMaskSuggestions.length}</span> masks filled
                    </div>
                    <div className="text-xs text-lime-300/70">
                      {selectedWords.filter(word => word !== null).length === multipleMaskSuggestions.length 
                        ? "✅ All masks completed!" 
                        : `${multipleMaskSuggestions.length - selectedWords.filter(word => word !== null).length} masks remaining`
                      }
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-lime-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(selectedWords.filter(word => word !== null).length / multipleMaskSuggestions.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Single Mask Suggestions (existing code) */}
            {suggestions.length > 0 && multipleMaskSuggestions.length === 0 && (
              <div className="mb-8 p-6 bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl rounded-2xl border border-green-700/30 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-green-200 to-lime-200 bg-clip-text text-transparent flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                      <span className="text-2xl">🎯</span>
                    </div>
                    Suggestions
                  </h2>
                  
                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={copyAllSuggestions}
                      className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600/50 to-teal-600/50 hover:from-emerald-500/60 hover:to-teal-500/60 text-emerald-100 px-4 py-2 rounded-lg transition-all duration-300 border border-emerald-500/30 text-sm"
                    >
                      {copyAllStatus ? (
                        <AiOutlineCheck className="text-emerald-300 text-lg" />
                      ) : (
                        <FiCopy className="text-emerald-200 hover:text-emerald-100 text-lg" />
                      )}
                      <span>{copyAllStatus ? "Copied All!" : "Copy All"}</span>
                    </button>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => exportSuggestions("txt")}
                        className="px-3 py-2 bg-green-600/20 hover:bg-green-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-green-500/30 text-green-200"
                      >
                        Export TXT
                      </button>
                      <button
                        onClick={() => exportSuggestions("csv")}
                        className="px-3 py-2 bg-green-600/20 hover:bg-green-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-green-500/30 text-green-200"
                      >
                        Export CSV
                      </button>
                      <button
                        onClick={() => exportSuggestions("json")}
                        className="px-3 py-2 bg-green-600/20 hover:bg-green-600/40 rounded-lg text-xs hover:scale-105 transition-all duration-200 border border-green-500/30 text-green-200"
                      >
                        Export JSON
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {suggestions.map((word, idx) => (
                    <div
                      key={idx}
                      className="border-l-4 p-6 rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl backdrop-blur-sm border-lime-400 bg-gradient-to-br from-green-900/40 to-lime-800/30 hover:border-lime-300"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <p className="font-tamil text-lime-50 leading-relaxed flex-1 text-lg">
                          {inputText.replace("[mask]", word)}
                        </p>
                        <button
                          onClick={() => copyIndividualSuggestion(word, idx)}
                          className="ml-4 text-lime-300 hover:text-lime-200 transition-colors flex items-center p-2 rounded-lg hover:bg-lime-800/30"
                          title="Copy complete sentence"
                        >
                          {copiedIndex === idx ? (
                            <AiOutlineCheck className="text-emerald-400 text-lg" />
                          ) : (
                            <FiCopy className="text-lime-300 hover:text-lime-200 text-lg" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 rounded-lg font-medium text-sm border bg-lime-800/50 text-lime-200 border-lime-600/30">
                          Suggestion {idx + 1}
                        </span>
                        <div className="text-xs text-lime-300/70 bg-green-800/30 px-2 py-1 rounded-lg border border-green-600/30">
                          "{word}"
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Summary section */}
                <div className="mt-6 pt-4 border-t border-green-700/30 flex justify-between items-center">
                  <div className="text-sm text-lime-200">
                    Showing <span className="font-bold text-lime-300">{suggestions.length}</span> suggestions for your masked sentence
                  </div>
                  <div className="text-xs text-lime-300/70">
                    Original: "{inputText}"
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-8">
            <div className="bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl border border-green-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-green-500/20 sticky top-6">
              <h2 className="text-xl font-bold mb-6 text-lime-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">🕵️‍♂️</span>
                </div>
                Examples
              </h2>
              <div className="space-y-4">
                {examples.map((example, index) => (
                  <div
                    key={index}
                    className="border border-lime-600/30 rounded-xl p-4 cursor-pointer hover:bg-lime-800/20 transition-all duration-300 hover:shadow-lg hover:border-lime-500/50 hover:scale-105 transform"
                    onClick={() => handleExampleClick(example)}
                  >
                    <p className="font-tamil text-lime-50 leading-relaxed">{example}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl border border-green-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-green-500/20">
              <h2 className="text-xl font-bold mb-6 text-lime-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">🕵️‍♂️</span>
                </div>
                Recent Predictions
              </h2>
              {currentUser ? (
                maskingHistory.length > 0 ? (
                  <>
                    <ul className="space-y-3 text-lime-200 text-sm">
                      {maskingHistory.map((historyItem, index) => (
                        <li
                          key={historyItem.id}
                          className="flex justify-between items-center bg-slate-700/30 hover:bg-lime-800/30 transition-all duration-300 rounded-lg px-4 py-3 border border-lime-600/20 cursor-pointer"
                          onClick={() => loadFromHistory(historyItem)}
                        >
                          <div className="flex-1">
                            <span className="cursor-pointer hover:text-lime-300 transition flex-1 mr-3">
                              {historyItem.inputText.length > 30 ? `${historyItem.inputText.slice(0, 30)}...` : historyItem.inputText}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="text-xs text-lime-300/70">
                                {historyItem.timestamp?.toLocaleDateString()}
                              </div>
                              {historyItem.isMultipleMask && (
                                <span className="text-xs bg-emerald-800/50 text-emerald-200 px-2 py-1 rounded">
                                  {historyItem.maskCount} masks
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            className="text-red-400 hover:text-red-300 transition text-sm p-1 rounded hover:bg-red-900/20"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteHistoryItem(historyItem.id)
                            }}
                            title="Delete this prediction"
                          >
                            ✖
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-4 py-2 rounded-lg text-sm transition-all duration-300 w-full shadow-lg"
                      onClick={() => {
                        Swal.fire({
                          title: "Are you sure?",
                          text: "This will clear all prediction history!",
                          icon: "warning",
                          showCancelButton: true,
                          confirmButtonColor: "#dc2626",
                          cancelButtonColor: "#3b82f6",
                          confirmButtonText: "Yes, clear all!",
                          cancelButtonText: "Cancel",
                        }).then((result) => {
                          if (result.isConfirmed) {
                            clearAllMaskingHistory()
                          }
                        })
                      }}
                    >
                      Clear All History
                    </button>
                  </>
                ) : (
                  <p className="text-lime-300/70">No recent predictions. Start making predictions to see your history here!</p>
                )
              ) : (
                <p className="text-lime-300/70">Please log in to see your prediction history.</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl border border-green-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-green-500/20">
              <h2 className="text-xl font-bold mb-6 text-lime-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">🕵️‍♂️</span>
                </div>
                Tips for Using
              </h2>
              <ul className="space-y-3 text-lime-200 text-sm">
                <li className="flex items-center p-2 rounded-lg bg-lime-800/20">
                  Enter a sentence with [mask] to get suggestions.
                </li>
                <li className="flex items-center p-2 rounded-lg bg-green-800/20">
                  Click on examples to auto-fill the input.
                </li>
                <li className="flex items-center p-2 rounded-lg bg-yellow-800/20">
                  Suggestions are context-aware and may vary.
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-slate-800/70 via-green-900/30 to-lime-900/50 backdrop-blur-xl border border-green-700/30 rounded-2xl shadow-2xl p-6 transition-all duration-300 hover:shadow-green-500/20">
              <h2 className="text-xl font-bold mb-6 text-lime-100 flex items-center">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mr-3 shadow-lg">
                  <span className="text-2xl">🕵️‍♂️</span>
                </div>
                Feedback
              </h2>
              <textarea
                className="w-full bg-slate-800/70 border border-lime-600/30 text-lime-50 rounded-xl p-4 text-sm shadow-inner backdrop-blur-sm placeholder-lime-300/50 focus:ring-2 focus:ring-green-500 focus:border-green-400 transition-all duration-300 h-40 resize-none"
                placeholder="Share your feedback..."
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
              />
              <button
                className="mt-6 bg-gradient-to-r from-green-600 to-lime-700 hover:from-green-500 hover:to-lime-600 text-white px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/30 flex items-center justify-center font-medium text-lg hover:scale-105 transform"
                onClick={handleFeedbackSubmit}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>

        <footer className="mt-12 py-8 text-center text-lime-200/70 text-sm border-t border-green-700/30 bg-slate-900/30 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-center items-center space-y-2 md:space-y-0 md:space-x-4">
              <div className="flex items-center">
                <span className="text-lime-400 mr-2 text-xl">🕵️‍♂️</span>
                <span>Masking Predict &copy; 2025</span>
              </div>
              <span className="hidden md:inline">|</span>
              <div>Created by Group-23</div>
            </div>
            <p className="mt-3 text-lime-300/70 text-xs">Powered by context-aware AI</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
