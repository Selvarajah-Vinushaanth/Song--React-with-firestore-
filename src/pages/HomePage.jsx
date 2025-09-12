
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import Header from "../components/Header"

export default function HomePage() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [clickedCard, setClickedCard] = useState(null)

  // Function to navigate with animation
  function handleNavigate(route, cardId = null) {
    if (cardId) {
      setClickedCard(cardId)
      // Delay navigation to allow animation to play
      setTimeout(() => {
        navigate(route)
        window.scrollTo(0, 0)
      }, 400) // Match this with animation duration
    } else {
      navigate(route)
      // window.scrollTo(0, 0);
    }
  }

  const cards = [
    {
      id: "metaphor-classifier",
      title: "Metaphor Classifier",
      description: "Analyze Tamil text to identify metaphorical expressions with advanced AI algorithms",
      icon: "🎭",
      color: "from-violet-600 to-purple-600",
      route: "/metaphor-classifier",
      features: ["Detect metaphors in text", "Confidence scores", "Visual analysis"],
    },
    {
      id: "lyric-generator",
      title: "Lyric Generator",
      description: "Generate beautiful Tamil lyrics based on themes and emotions with creative AI",
      icon: "🎵",
      color: "from-blue-600 to-indigo-600",
      route: "/lyric-generator",
      features: ["Theme-based generation", "Continue lyrics", "Multiple variations"],
    },
    {
      id: "metaphor-creator",
      title: "Metaphor Creator",
      description: "Create custom metaphors by combining source and target concepts intelligently",
      icon: "✨",
      color: "from-pink-500 to-rose-600",
      route: "/metaphor-creator",
      features: ["Custom creation", "Source & target mapping", "Multiple styles"],
    },
    {
      id: "masking-predict",
      title: "Masking Predict",
      description: "Suggest words for masked positions in Tamil sentences (e.g., 'I [mask] to school')",
      icon: "🕵️‍♂️",
      color: "from-green-500 to-lime-500",
      route: "/masking-predict",
      features: ["Fill in the blank", "Multiple suggestions", "Context-aware"],
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <Header />

      <div className="relative overflow-hidden">
        {/* Enhanced background decorative elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
        <div
          className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70"
          style={{ animationDelay: "1s" }}
        ></div>

        <header className="relative pt-20 pb-16 px-6 text-center">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300 mb-4 tracking-tight leading-none">
              Tamil AI Tools
            </h1>
            <div className="w-32 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full"></div>
          </div>

          <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-12 leading-relaxed font-light">
            Discover the beauty of Tamil language with our cutting-edge AI-powered tools.
            <span className="text-white font-medium">
              {" "}
              Analyze metaphors, generate lyrics, and explore creative writing
            </span>{" "}
            with unprecedented ease and precision.
          </p>

          {currentUser && (
            <div className="mt-12 mb-8">
              <button
                onClick={() => handleNavigate("/chat")}
                className="group relative inline-flex items-center px-12 py-6 border-2 border-emerald-500/50 text-xl font-semibold rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-emerald-500/25"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 mr-4 relative z-10"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="relative z-10">Open Chat Assistant</span>
              </button>
            </div>
          )}
        </header>
      </div>

      <div className="relative mx-auto w-full max-w-7xl px-6 mb-32 mt-8">
        <div
          className={`group mb-20 rounded-3xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] transition-all duration-500 cursor-pointer transform hover:scale-[1.01] ${clickedCard === "chat" ? "animate-card-click" : ""}`}
          onClick={() => handleNavigate("/chat", "chat")}
        >
          <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"></div>

          <div className="md:flex">
            <div className="md:w-2/3 p-12 lg:p-16">
              <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold mb-8 backdrop-blur-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3 animate-pulse"></div>
                Featured Service
              </div>

              <h2 className="text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
                Tamil Chat Assistant
              </h2>
              <p className="text-gray-300 text-xl lg:text-2xl mb-12 leading-relaxed font-light">
                Engage in natural conversations with our advanced Tamil language AI assistant.
                <span className="text-white font-medium">
                  Get help with translations, cultural insights, and writing assistance
                </span>{" "}
                in real-time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                {[
                  "Natural conversations in Tamil",
                  "Language translation assistance",
                  "Cultural insights and explanations",
                  "24/7 available AI assistance",
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-start group/item">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg group-hover/item:scale-110 transition-transform duration-300">
                      <svg
                        className="h-5 w-5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="ml-4 text-gray-300 text-lg font-medium group-hover/item:text-white transition-colors duration-300">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleNavigate("/chat")
                }}
                className="group/btn relative px-12 py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-bold text-lg hover:shadow-2xl hover:shadow-emerald-500/30 transition-all duration-300 transform hover:translate-y-[-3px] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-300 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10">Start Chatting</span>
              </button>
            </div>

            <div className="md:w-1/3 bg-gradient-to-br from-emerald-500/10 via-teal-400/10 to-emerald-600/10 flex items-center justify-center p-16 relative overflow-hidden">
              <div className="absolute w-48 h-48 bg-emerald-400/20 rounded-full -top-12 -right-12 blur-2xl animate-pulse"></div>
              <div
                className="absolute w-48 h-48 bg-teal-400/20 rounded-full -bottom-12 -left-12 blur-2xl animate-pulse"
                style={{ animationDelay: "1s" }}
              ></div>
              <div className="text-[180px] relative animate-bounce" style={{ animationDuration: "3s" }}>
                💬
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-20">
          <div className="inline-block">
            <h2 className="text-5xl lg:text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
              Our Microservices
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full mb-6"></div>
          </div>
          <p className="mt-8 text-gray-300 max-w-3xl mx-auto text-xl font-light leading-relaxed">
            Specialized tools designed to enhance your Tamil language experience with
            <span className="text-white font-medium"> cutting-edge AI technology</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 ">
          {cards.map((card, index) => (
            <div
              key={card.id}
              className={`group bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-3xl shadow-2xl hover:shadow-[0_0_40px_rgba(139,92,246,0.3)] transform hover:-translate-y-4 transition-all duration-500 cursor-pointer overflow-hidden border border-gray-700/50 h-full flex flex-col ${clickedCard === card.id ? "animate-card-click" : ""}`}
              onClick={() => handleNavigate(card.route, card.id)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`bg-gradient-to-r ${card.color} h-1.5 w-full`}></div>

              <div className="p-10 lg:p-12 flex-grow flex flex-col">
                <div className="flex-grow">
                  <div className="relative mb-8">
                    <div
                      className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-20 rounded-2xl blur-xl scale-110`}
                    ></div>
                    <div className="relative text-8xl transform transition-transform group-hover:scale-110 group-hover:rotate-6 duration-500 flex justify-center items-center h-24">
                      {card.icon}
                    </div>
                  </div>

                  <h3 className="text-3xl font-bold mb-6 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                    {card.title}
                  </h3>
                  <p className="text-gray-300 mb-10 text-lg leading-relaxed font-light group-hover:text-gray-200 transition-colors duration-300">
                    {card.description}
                  </p>

                  <ul className="space-y-4 mb-10">
                    {card.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-center text-gray-400 text-lg group-hover:text-gray-300 transition-colors duration-300"
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-gradient-to-r ${card.color} mr-4 flex-shrink-0 shadow-lg`}
                        ></div>
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleNavigate(card.route)
                  }}
                  className={`group/btn relative w-full py-5 rounded-2xl bg-gradient-to-r ${card.color} text-white font-bold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10">Get Started</span>
                </button>
              </div>
            </div>
          ))}
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
