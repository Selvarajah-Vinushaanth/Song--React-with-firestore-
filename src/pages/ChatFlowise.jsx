import { FullPageChat } from 'flowise-embed-react'

const ChatFlowise = () => {
    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-gray-900 to-black relative overflow-hidden">
            {/* Decorative blurred gradient circles */}
            <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse opacity-70"></div>
            <div className="absolute bottom-40 right-20 w-80 h-80 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "2s" }}></div>
            <div className="absolute top-60 right-40 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse opacity-70" style={{ animationDelay: "1s" }}></div>
            {/* Full screen chat */}
            <div className="relative z-10 w-full h-full min-h-screen">
                <FullPageChat
            chatflowid="e802e2a8-3ee2-4469-b168-e3cdac9a204e"
            apiHost="https://cloud.flowiseai.com"
        />
            </div>
        </div>
    )
}

export default ChatFlowise;
