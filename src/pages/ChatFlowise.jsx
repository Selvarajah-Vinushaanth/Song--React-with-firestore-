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
                    chatflowConfig={{
                        /* Chatflow Config */
                    }}
                    observersConfig={{
                        /* Observers Config */
                    }}
                    theme={{
                        button: {
                            backgroundColor: '#3B81F6',
                            right: 20,
                            bottom: 20,
                            size: 48,
                            dragAndDrop: true,
                            iconColor: 'white',
                            customIconSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                            autoWindowOpen: {
                                autoOpen: true,
                                openDelay: 2,
                                autoOpenOnMobile: false
                            }
                        },
                        tooltip: {
                            showTooltip: true,
                            tooltipMessage: 'Hi There 👋!',
                            tooltipBackgroundColor: 'black',
                            tooltipTextColor: 'white',
                            tooltipFontSize: 16
                        },
                        disclaimer: {
                            title: 'Disclaimer',
                            message: "By using this chatbot, you agree to the <a target=\"_blank\" href=\"https://flowiseai.com/terms\">Terms & Condition</a>",
                            textColor: 'white',
                            buttonColor: '#3b82f6',
                            buttonText: 'Start Chatting',
                            buttonTextColor: 'white',
                            blurredBackgroundColor: 'rgba(0, 0, 0, 0.6)',
                            backgroundColor: '#18181b'
                        },
                        customCSS: `
                            .flowise-chat-window {
                                border-radius: 0 !important;
                                box-shadow: none !important;
                                background: linear-gradient(135deg, #18181b 80%, #23272f 100%) !important;
                                min-height: 100vh !important;
                                height: 100vh !important;
                            }
                        `,
                        chatWindow: {
                            showTitle: true,
                            showAgentMessages: true,
                            title: 'Flowise Bot',
                            titleAvatarSrc: 'https://raw.githubusercontent.com/walkxcode/dashboard-icons/main/svg/google-messages.svg',
                            welcomeMessage: 'Hello! This is custom welcome message',
                            errorMessage: 'This is a custom error message',
                            backgroundColor: '#18181b',
                            backgroundImage: '',
                            height: '100vh',
                            width: '100vw',
                            fontSize: 16,
                            starterPrompts: [
                                "What is a bot?",
                                "Who are you?"
                            ],
                            starterPromptFontSize: 15,
                            clearChatOnReload: false,
                            sourceDocsTitle: 'Sources:',
                            renderHTML: true,
                            botMessage: {
                                backgroundColor: '#23272f',
                                textColor: '#a5b4fc',
                                showAvatar: true,
                                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/parroticon.png'
                            },
                            userMessage: {
                                backgroundColor: '#3B81F6',
                                textColor: '#ffffff',
                                showAvatar: true,
                                avatarSrc: 'https://raw.githubusercontent.com/zahidkhawaja/langchain-chat-nextjs/main/public/usericon.png'
                            },
                            textInput: {
                                placeholder: 'Type your question',
                                backgroundColor: '#23272f',
                                textColor: '#a5b4fc',
                                sendButtonColor: '#3B81F6',
                                maxChars: 50,
                                maxCharsWarningMessage: 'You exceeded the characters limit. Please input less than 50 characters.',
                                autoFocus: true,
                                sendMessageSound: true,
                                receiveMessageSound: true,
                            },
                            feedback: {
                                color: '#a5b4fc'
                            },
                            dateTimeToggle: {
                                date: true,
                                time: true
                            },
                            footer: {
                                textColor: '#a5b4fc',
                                text: 'Powered by',
                                company: 'Flowise',
                                companyLink: 'https://flowiseai.com'
                            }
                        }
                    }}
                />
            </div>
        </div>
    )
}

export default ChatFlowise;
