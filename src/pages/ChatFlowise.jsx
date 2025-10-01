import { FullPageChat } from 'flowise-embed-react'
import { useState, useEffect } from 'react'

const ChatFlowise = () => {
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        // Add a loading delay for smooth animation
        const timer = setTimeout(() => setIsLoaded(true), 500)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex flex-col relative overflow-hidden">
            {/* Grid background - matching HomePage */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            {/* Enhanced decorative elements - matching HomePage style */}
            <div className="absolute inset-0">
                {/* Main gradient orbs - matching HomePage colors and positioning */}
                <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
                <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
                <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>
            </div>

            {/* Subtle top border gradient - matching HomePage style */}
            <div className="w-32 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
            
            {/* Loading overlay - matching HomePage background */}
            {!isLoaded && (
                <div className="absolute inset-0 z-50 bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                        <div className="w-12 h-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                        <p className="text-white/80 text-sm font-medium">Initializing Chat...</p>
                    </div>
                </div>
            )}

            {/* Chat container with enhanced styling - matching HomePage card style */}
            <div className={`relative z-10 w-full h-full min-h-screen transition-all duration-1000 ease-out ${
                isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}>
                {/* Container matching HomePage card style */}
                <div className="mx-auto w-full max-w-7xl px-6 py-6 h-full">
                    <div className="bg-gradient-to-br from-gray-800/95 via-gray-800/90 to-gray-900/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700/50 h-full min-h-screen overflow-hidden">
                        {/* Top gradient line matching HomePage cards */}
                        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500"></div>
                        
                        <div className="relative w-full h-full p-4">
                            <FullPageChat
                                chatflowid="e802e2a8-3ee2-4469-b168-e3cdac9a204e"
                                apiHost="https://cloud.flowiseai.com"
                                theme={{
                                    button: {
                                        backgroundColor: "#8b5cf6",
                                        right: 20,
                                        bottom: 20,
                                        size: "medium",
                                        iconColor: "white",
                                        customIconSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg"
                                    },
                                    chatWindow: {
                                        showTitle: true,
                                        title: "Tamil AI Song Writing Assistant",
                                        titleAvatarSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg",
                                        showAgentMessages: true,
                                        welcomeMessage: "Hello! I'm your Tamil AI song writing assistant. How can I help you create amazing music today? 🎵",
                                        backgroundColor: "rgba(17, 24, 39, 0.8)",
                                        height: "100%",
                                        width: "100%",
                                        fontSize: 16,
                                        botMessage: {
                                            backgroundColor: "#6d28d9",
                                            textColor: "#ffffff",
                                            showAvatar: true,
                                            avatarSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg"
                                        },
                                        userMessage: {
                                            backgroundColor: "#374151",
                                            textColor: "#ffffff",
                                            showAvatar: true,
                                            avatarSrc: "https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/user.svg"
                                        },
                                        textInput: {
                                            placeholder: "Type your message here...",
                                            backgroundColor: "rgba(55, 65, 81, 0.9)",
                                            textColor: "#ffffff",
                                            sendButtonColor: "#8b5cf6"
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ChatFlowise;
