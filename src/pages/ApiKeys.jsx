import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db, useAuth } from "../context/AuthContext";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { nanoid } from "nanoid";
import Header from "../components/Header";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState([]);
  const [keyName, setKeyName] = useState("");
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copyStatus, setCopyStatus] = useState({});
  const [activeExample, setActiveExample] = useState("mask");
  const { currentUser } = useAuth();
  
  // API Test state
  const [testEndpoint, setTestEndpoint] = useState("/api/v1/predict-mask");
  const [testPayload, setTestPayload] = useState('{\n  "text": "நான் [mask] வீட்டிற்கு செல்கிறேன்",\n  "top_k": 3\n}');
  const [testApiKey, setTestApiKey] = useState("");
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState(null);
  const [testing, setTesting] = useState(false);
  
  // API Usage Statistics state
  const [apiStats, setApiStats] = useState({
    totalCalls: 0,
    successRate: 0,
    avgLatency: 0,
    loading: true
  });

  useEffect(() => {
    if (currentUser) {
      fetchApiKeys();
      fetchApiStats();
    }
  }, [currentUser]);

  async function fetchApiKeys() {
    if (!currentUser) return;
    
    setLoadingKeys(true);
    try {
      const apiKeysQuery = query(
        collection(db, "apiKeys"),
        where("userId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(apiKeysQuery);
      const keys = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setApiKeys(keys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
    } finally {
      setLoadingKeys(false);
    }
  }

  async function fetchApiStats() {
    if (!currentUser) return;
    
    try {
      // Fetch API request logs for this user
      const apiLogsQuery = query(
        collection(db, "apiRequests_test"),
        where("userId", "==", currentUser.uid)
      );
      const logsSnapshot = await getDocs(apiLogsQuery);
      const logs = logsSnapshot.docs.map(doc => doc.data());

      // Calculate statistics
      const totalCalls = logs.length;
      const successfulCalls = logs.filter(log => log.status >= 200 && log.status < 300).length;
      const successRate = totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(1) : 0;
      
      // Calculate average latency
      const latencies = logs.filter(log => log.latency).map(log => log.latency);
      const avgLatency = latencies.length > 0 
        ? Math.round(latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length)
        : 0;

      setApiStats({
        totalCalls,
        successRate,
        avgLatency,
        loading: false
      });
    } catch (error) {
      console.error("Error fetching API stats:", error);
      setApiStats(prev => ({ ...prev, loading: false }));
    }
  }

  async function generateApiKey() {
    if (!keyName.trim() || !currentUser) return;
    
    setCreating(true);
    try {
      const newKey = nanoid(32);
      const docRef = await addDoc(collection(db, "apiKeys"), {
        name: keyName,
        key: newKey,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
      });
      setApiKeys((prev) => [
        ...prev,
        { id: docRef.id, name: keyName, key: newKey },
      ]);
      setKeyName("");
    } catch (error) {
      console.error("Error generating API key:", error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteApiKey(keyId) {
    if (!currentUser) return;
    
    setDeleting(true);
    try {
      // First verify that this key belongs to the current user
      const apiKeysQuery = query(
        collection(db, "apiKeys"),
        where("userId", "==", currentUser.uid)
      );
      const querySnapshot = await getDocs(apiKeysQuery);
      const keyExists = querySnapshot.docs.some(doc => doc.id === keyId);
      
      if (!keyExists) {
        toast.error("You don't have permission to delete this key");
        return;
      }
      
      await deleteDoc(doc(db, "apiKeys", keyId));
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
      toast.success("API key deleted successfully");
    } catch (error) {
      console.error("Error deleting API key:", error);
      toast.error("Failed to delete API key");
    } finally {
      setDeleting(false);
    }
  }

  function copyToClipboard(key, id) {
    navigator.clipboard.writeText(key);
    setCopyStatus((prev) => ({ ...prev, [id]: true }));
    toast.success("API key copied to clipboard!");
    setTimeout(
      () => setCopyStatus((prev) => ({ ...prev, [id]: false })),
      2000
    );
  }
  
  function copyExample(code) {
    navigator.clipboard.writeText(code);
    toast.success("Example code copied to clipboard!");
  }

  // Test API Call function
  async function testApiCall() {
    if (!testApiKey || !testEndpoint || !testPayload) {
      toast.error("API key, endpoint, and payload are required");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);
    const startTime = Date.now();

    try {
      // Parse the JSON payload
      const payload = JSON.parse(testPayload);
      
      // Make the API request
      const response = await fetch(`http://127.0.0.1:5000${testEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': testApiKey
        },
        body: JSON.stringify(payload)
      });
      
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Get the response data
      const data = await response.json();
      
      // Check if the response is an error
      if (!response.ok) {
        setTestError({
          status: response.status,
          message: data.detail || "An error occurred",
          data,
          latency: `${latency}ms`
        });
      } else {
        setTestResult({
          status: response.status,
          data,
          time: new Date().toLocaleTimeString(),
          latency: `${latency}ms`
        });
        toast.success("API test successful!");
        
        // Refresh stats after successful test
        fetchApiStats();
      }
    } catch (error) {
      console.error("API test error:", error);
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      setTestError({
        message: error.message || "Failed to make API request",
        error: String(error),
        latency: `${latency}ms`
      });
    } finally {
      setTesting(false);
    }
  }

  function setTestDefaults(example) {
    setActiveExample(example);
    setTestEndpoint(apiExamples[example].endpoint);
    setTestPayload(JSON.stringify(apiExamples[example].request, null, 2));
  }

  // API examples data
  const apiExamples = {
    mask: {
      title: "Masking Predict",
      description: "Predict masked tokens in Tamil sentences",
      endpoint: "/api/v1/predict-mask",
      code: `fetch('http://127.0.0.1:5000/api/v1/predict-mask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    text: 'நான் [mask] வீட்டிற்கு செல்கிறேன்',
    top_k: 3
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
      request: {
        text: "நான் [mask] வீட்டிற்கு செல்கிறேன்",
        top_k: 3
      },
      response: {
        suggestions: ["என்", "இன்று", "நேற்று"]
      },
      color: "from-emerald-500 to-green-500"
    },
    metaphor: {
      title: "Metaphor Creator",
      description: "Generate creative metaphors for a given topic",
      endpoint: "/api/v1/create-metaphors",
      code: `fetch('http://127.0.0.1:5000/api/v1/create-metaphors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    source: 'விழி',
    target: 'மனம்',
    context: 'பார்வை',
    count: 2
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
      request: {
        source: "விழி",
        target: "மனம்",
        context: "பார்வை",
        count : 2
      },
      response: {
        metaphors: [
          "உன் பார்வை ஒளி போல, இருண்ட மனதை பிரகாசமாக மாற்றுகிறது",
          "விழியின் நிழல் மனதை ஒட்டி, காதலின் நதி போல ஓடுகிறது"
        ]
      },
      color: "from-violet-500 to-purple-500"
    },
    classifier: {
      title: "Metaphor Classifier",
      description: "Classify metaphors in Tamil text",
      endpoint: "/api/v1/classify-metaphor",
      code: `fetch('http://127.0.0.1:5000/api/v1/classify-metaphor', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    text: 'அவன் ஒரு சிங்கம் போல் போராடினான்'
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
      request: {
        text: "அவன் ஒரு சிங்கம் போல் போராடினான்"
      },
      response: {
        is_metaphor: true,
        confidence: 0.92
      },
      color: "from-orange-500 to-amber-500"
    },
    lyrics: {
      title: "Lyric Generator",
      description: "Generate Tamil song lyrics",
      endpoint: "/api/v1/generate-lyrics",
      code: `fetch('http://127.0.0.1:5000/api/v1/generate-lyrics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY_HERE'
  },
  body: JSON.stringify({
    motion: 'காதல்',
    seed: 'மழை',
    count: 1
  })
})
.then(response => response.json())
.then(data => console.log(data));`,
      request: {
        motion: "காதல்",
        seed: "மழை",
        count: 1
      },
      response: {
        lyrics: [
          "மழையில் நனைந்த நினைவுகள் போல் உன் காதல் என்னை சூழ்ந்தது இதயத்தின் துடிப்பு போல் உன் நினைவு என்னுள் இருக்கிறது"
        ]
      },
      color: "from-blue-500 to-cyan-500"
    }
  };

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white relative overflow-hidden">
    {/* Decorative elements */}
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
    <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl"></div>
    <div className="absolute top-1/4 right-0 w-80 h-80 bg-pink-600/20 rounded-full blur-3xl"></div>
    <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl"></div>
    
    <Header />
    <ToastContainer position="top-right" theme="dark" />

    <div className="max-w-[95vw] 2xl:max-w-[90vw] mx-auto px-6 sm:px-8 lg:px-12 py-12 relative z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 drop-shadow-sm mb-3">
            API Keys Management
          </h1>
          <p className="text-lg text-gray-400 font-light">Manage your API access and documentation</p>
        </div>
        <Link
          to="/"
          className="group bg-slate-800/80 backdrop-blur hover:bg-slate-700/80 px-6 py-3 rounded-xl transition-all duration-300 flex items-center gap-3 border border-slate-700/50 shadow-lg hover:shadow-purple-500/10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      {!currentUser ? (
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-xl shadow-xl p-10 text-center border border-slate-700/50 max-w-2xl mx-auto">
          <div className="text-5xl mb-6 bg-gradient-to-br from-purple-500 to-pink-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/20">🔐</div>
          <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Authentication Required</h2>
          <p className="text-gray-300 mb-8 max-w-md mx-auto">
            Please log in to manage your API keys and access the API documentation.
          </p>
          <Link
            to="/login"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-7 py-3 rounded-xl font-medium shadow-lg hover:shadow-purple-500/20 transition-all inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Go to Login
          </Link>
        </div>
      ) : (
        <div>
          <div className="flex justify-center">
  <p className="text-gray-300 mb-8 max-w-4xl leading-relaxed bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-5 rounded-xl border border-slate-700/50 shadow-lg text-center">
    Generate and manage API keys to access Tamil AI Tools services programmatically. These keys allow you
    to integrate our advanced Tamil language AI capabilities into your own applications.
  </p>
</div>


          {/* API Usage Statistics Dashboard */}
          <div className="bg-slate-800/50 rounded-xl border border-gray-700/50 p-8 mb-10 shadow-lg">
            <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center">
              <span className="bg-purple-500/20 p-3 rounded-lg mr-3">📊</span>
              API Usage Statistics
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-purple-900/40 to-fuchsia-900/40 p-8 rounded-xl border border-purple-700/40 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm">Total API Calls</p>
                    <h3 className="text-4xl font-bold">
                      {apiStats.loading ? (
                        <div className="animate-pulse bg-purple-600/30 h-10 w-16 rounded"></div>
                      ) : (
                        apiStats.totalCalls
                      )}
                    </h3>
                  </div>
                  <div className="bg-purple-600/30 p-4 rounded-lg">📊</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-indigo-900/40 to-blue-900/40 p-8 rounded-xl border border-indigo-700/40 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-indigo-300 text-sm">Success Rate</p>
                    <h3 className="text-4xl font-bold">
                      {apiStats.loading ? (
                        <div className="animate-pulse bg-indigo-600/30 h-10 w-20 rounded"></div>
                      ) : (
                        `${apiStats.successRate}%`
                      )}
                    </h3>
                  </div>
                  <div className="bg-indigo-600/30 p-4 rounded-lg">✅</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 p-8 rounded-xl border border-emerald-700/40 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-300 text-sm">Avg Latency</p>
                    <h3 className="text-4xl font-bold">
                      {apiStats.loading ? (
                        <div className="animate-pulse bg-emerald-600/30 h-10 w-16 rounded"></div>
                      ) : (
                        `${apiStats.avgLatency}ms`
                      )}
                    </h3>
                  </div>
                  <div className="bg-emerald-600/30 p-4 rounded-lg">⚡</div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 bg-slate-800/90 rounded-lg p-6 text-center border border-slate-700/40 shadow-inner">
              <p className="text-gray-400 text-sm">Access detailed API usage analytics and logs from your <Link to="/dashboard" className="text-purple-400 hover:text-purple-300 underline">Dashboard</Link></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              {/* generate + your api keys */}
              <div className="lg:col-span-1">
  <div className="bg-slate-800/90 rounded-xl shadow-xl p-6 mb-8 border border-slate-700/50">
    <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
      Generate API Key
    </h2>
    <p className="text-gray-300 mb-6">
      Create a new API key to authenticate your requests to our services.
    </p>

    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={keyName}
        onChange={(e) => setKeyName(e.target.value)}
        placeholder="API Key Name (e.g., Production, Testing)"
        className="w-full px-4 py-3 bg-slate-700/70 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all shadow-inner"
      />
      <button
        onClick={generateApiKey}
        disabled={creating || !keyName.trim()}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-3 rounded-lg font-medium shadow-md hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {creating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Generating...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Generate New Key
          </>
        )}
      </button>
    </div>
  </div>

  <div className="bg-slate-800/90 rounded-xl shadow-xl p-6 border border-slate-700/50">
    <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
      Your API Keys
    </h2>
    <p className="text-gray-300 mb-6">
      Manage your existing API keys. Keep these secure and never share them publicly.
    </p>

    {loadingKeys ? (
      <div className="flex items-center justify-center py-8">
        <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    ) : apiKeys.length === 0 ? (
      <div className="text-center py-8 text-gray-400 border border-dashed border-gray-700 rounded-lg">
        <div className="text-4xl mb-3">🔑</div>
        <p>No API keys found. Generate your first key to get started.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <div
            key={apiKey.id}
            className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50 hover:bg-slate-700/70 transition-colors duration-200"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-purple-300">{apiKey.name}</h3>
                <p className="text-xs text-gray-400">
                  Created: {apiKey.createdAt ? new Date(apiKey.createdAt.seconds * 1000).toLocaleDateString() : 'Recently'}
                </p>
              </div>
              <button
                onClick={() => deleteApiKey(apiKey.id)}
                disabled={deleting}
                className="bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-300 p-1.5 rounded-lg transition duration-200"
                title="Delete API Key"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center mt-2 bg-slate-800 p-2 rounded-lg">
              <code className="font-mono text-sm text-green-300 truncate flex-1">{apiKey.key}</code>
              <button
                onClick={() => copyToClipboard(apiKey.key, apiKey.id)}
                className="ml-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                title="Copy API Key"
              >
                {copyStatus[apiKey.id] ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
  <div className="bg-slate-800/90 rounded-xl shadow-xl p-6 mt-8 border border-slate-700/50">
    <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
      Getting Started
    </h2>
    <div className="space-y-4">
      <div className="flex items-start">
        <div className="bg-purple-500/20 rounded-full p-2 mr-4 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Generate an API Key</h3>
          <p className="text-gray-300">Create a new API key with a descriptive name to help you identify its usage.</p>
        </div>
      </div>

      <div className="flex items-start">
        <div className="bg-purple-500/20 rounded-full p-2 mr-4 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Make API Requests</h3>
          <p className="text-gray-300">Include your API key in the X-API-Key header with every request to our endpoints.</p>
        </div>
      </div>

      <div className="flex items-start">
        <div className="bg-purple-500/20 rounded-full p-2 mr-4 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-medium text-white mb-1">Security Best Practices</h3>
          <p className="text-gray-300">Keep your API keys secure. Never expose them in client-side code or public repositories.</p>
        </div>
      </div>
    </div>
  </div>
</div>

            </div>

            <div className="lg:col-span-2">
              {/* api documentation + getting started */}
              <div className="lg:col-span-2">
  <div className="bg-slate-800/90 rounded-xl shadow-xl p-6 border border-slate-700/50">
    <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
      API Documentation
    </h2>
    <p className="text-gray-300 mb-6">
      Our API offers four powerful Tamil language AI services. Select a service below to view example code.
    </p>

    <div className="flex flex-wrap gap-2 mb-8">
      {Object.keys(apiExamples).map((key) => (
        <button
          key={key}
          onClick={() => setActiveExample(key)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 ${
            activeExample === key
              ? `bg-gradient-to-r ${apiExamples[key].color} text-white shadow-md`
              : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          {apiExamples[key].title}
        </button>
      ))}
    </div>

    <div className="bg-slate-900/80 rounded-xl p-6 border border-slate-700/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className={`text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${apiExamples[activeExample].color}`}>
            {apiExamples[activeExample].title}
          </h3>
          <p className="text-gray-300 mt-1">{apiExamples[activeExample].description}</p>
        </div>
        <div className="bg-slate-800 px-3 py-1 rounded-lg font-mono text-sm text-gray-300">
          {apiExamples[activeExample].endpoint}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-2">Request Body</h4>
          <div className="bg-slate-800 p-4 rounded-lg">
            <pre className="text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(apiExamples[activeExample].request, null, 2)}
            </pre>
          </div>
        </div>
        <div>
          <h4 className="text-sm uppercase tracking-wider text-gray-500 mb-2">Response</h4>
          <div className="bg-slate-800 p-4 rounded-lg">
            <pre className="text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(apiExamples[activeExample].response, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-sm uppercase tracking-wider text-gray-500">Example Code</h4>
          <button
            onClick={() => copyExample(apiExamples[activeExample].code)}
            className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded transition-colors text-gray-300 hover:text-white flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Copy Code
          </button>
        </div>
        <div className="bg-slate-800 p-4 rounded-lg">
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
            {apiExamples[activeExample].code}
          </pre>
        </div>
      </div>
    </div>
  </div>

  

  {/* API test section */}
  <div className="bg-slate-800/90 rounded-xl shadow-xl p-6 mt-8 border border-slate-700/50">
    <h2 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 flex items-center">
      <span className="bg-purple-500/20 p-2 rounded-lg mr-3">🧪</span>
      Test API
    </h2>
    <p className="text-gray-300 mb-6">
      Test your API key with any endpoint to verify it works correctly before using it in your application.
    </p>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">API Key</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={testApiKey}
              onChange={(e) => setTestApiKey(e.target.value)}
              placeholder="Your API key"
              className="w-full px-4 py-3 bg-slate-700/70 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all shadow-inner font-mono text-sm"
            />
            <div className="relative">
              <select 
                className="h-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none pr-8 cursor-pointer"
                onChange={(e) => setTestApiKey(e.target.value)}
                value=""
              >
                <option value="" disabled>Select a key</option>
                {apiKeys.map(key => (
                  <option key={key.id} value={key.key}>{key.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-300">Endpoint</label>
            <div className="flex gap-2">
              {Object.keys(apiExamples).map((key) => (
                <button
                  key={key}
                  onClick={() => setTestDefaults(key)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                    activeExample === key
                      ? `bg-gradient-to-r ${apiExamples[key].color} text-white shadow-sm`
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700'
                  }`}
                >
                  {apiExamples[key].title}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={testEndpoint}
            onChange={(e) => setTestEndpoint(e.target.value)}
            placeholder="/api/v1/predict-mask"
            className="w-full px-4 py-3 bg-slate-700/70 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all shadow-inner font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Request Body (JSON)</label>
          <textarea
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            rows={5}
            className="w-full px-4 py-3 bg-slate-700/70 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all shadow-inner font-mono text-sm"
          />
        </div>

        <button
          onClick={testApiCall}
          disabled={testing || !testApiKey || !testEndpoint || !testPayload}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-5 py-3 rounded-lg font-medium shadow-md hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {testing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Test API Call
            </>
          )}
        </button>
      </div>

      <div>
        <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Response</h3>
        <div className="bg-slate-900/80 rounded-lg border border-slate-700/50 h-[calc(100%-2rem)] min-h-[300px] overflow-auto">
          {testing ? (
            <div className="flex items-center justify-center h-full">
              <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : testResult ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-400 text-sm font-medium">
                    Status: {testResult.status} OK
                  </span>
                </div>
                <span className="text-xs text-gray-500">{testResult.time}</span>
              </div>
              <pre className="text-sm text-gray-300 font-mono overflow-auto whitespace-pre-wrap bg-slate-800 p-3 rounded-lg">
                {JSON.stringify(testResult.data, null, 2)}
              </pre>
            </div>
          ) : testError ? (
            <div className="p-4">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-red-400 text-sm font-medium">
                    Error: {testError.status || 'Request failed'}
                  </span>
                </div>
              </div>
              <pre className="text-sm text-red-300 font-mono overflow-auto whitespace-pre-wrap bg-red-900/20 p-3 rounded-lg border border-red-900/40">
                {JSON.stringify(testError, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-gray-400 mb-2">No response yet</p>
              <p className="text-gray-500 text-sm">Test your API to see the response here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
</div>

            </div>
          </div>
        </div>
      )}
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

export default ApiKeyManager;
