import React from 'react';
import { Message } from '../types';
import MarkdownRenderer from './MarkdownRenderer';
import { Bot, User, Globe, ExternalLink, Box } from 'lucide-react';
import ModelViewer from './ModelViewer';
import clsx from 'clsx';

interface ChatBubbleProps {
  message: Message;
  isLightMode?: boolean;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isLightMode = false }) => {
  const isUser = message.role === 'user';
  const hasGrounding = message.groundingMetadata?.groundingChunks && message.groundingMetadata.groundingChunks.length > 0;
  
  const is3DModel = message.content.startsWith("::3D_MODEL::");
  let modelUrl = "";
  let displayText = message.content;

  if (is3DModel) {
    const parts = message.content.split('|||');
    modelUrl = parts[1];
    displayText = parts[2] || ""; 
  }

  return (
    <div className={clsx("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[90%] md:max-w-[80%] lg:max-w-[70%]", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {/* Avatar */}
        <div className={clsx(
            "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center shadow-md",
            isUser ? "ml-3 bg-indigo-600 text-white" : "mr-3 bg-gradient-to-br from-purple-600 to-blue-500 text-white"
        )}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>

        {/* Bubble */}
        <div className="flex flex-col gap-2 w-full">
            <div className={clsx(
            "px-5 py-4 rounded-2xl shadow-sm border",
            isUser ? "bg-indigo-600 rounded-tr-sm text-white border-indigo-500" : (isLightMode ? "bg-white text-slate-800 border-slate-200" : "bg-slate-800 rounded-tl-sm text-slate-100 border-white/5")
            )}>
                {is3DModel && modelUrl ? (
                    <div className="mb-3">
                         <div className="h-64 w-full bg-black/20 rounded-lg overflow-hidden border border-white/10">
                            <ModelViewer url={modelUrl} className="w-full h-full" isLightMode={isLightMode} />
                         </div>
                         {displayText && <div className={clsx("mt-3 pt-2", isLightMode ? "border-t border-slate-100" : "border-t border-white/10")}><MarkdownRenderer content={displayText} /></div>}
                    </div>
                ) : message.attachment && message.attachment.type === 'image' ? (
                     <div className="flex flex-col gap-3">
                        <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg">
                             <img 
                                src={message.attachment.previewUrl} 
                                alt="Generated" 
                                className="w-full h-auto object-cover max-h-[400px]"
                             />
                        </div>
                        {message.content && <MarkdownRenderer content={message.content} />}
                     </div>
                ) : (
                    <MarkdownRenderer content={message.content} />
                )}
            </div>

            {/* Citations / Grounding */}
            {!isUser && hasGrounding && (
                <div className={clsx("border rounded-xl p-3 text-xs mt-1", isLightMode ? "bg-slate-100 border-slate-200" : "bg-slate-900/50 border-slate-700/50")}>
                    <div className={clsx("flex items-center gap-2 mb-2 uppercase font-bold tracking-wider", isLightMode ? "text-slate-500" : "text-slate-400")}>
                        <Globe size={12} />
                        <span>Sources</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {message.groundingMetadata?.groundingChunks?.map((chunk, idx) => {
                            if (!chunk.web) return null;
                            return (
                                <a 
                                    key={idx}
                                    href={chunk.web.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors border", 
                                        isLightMode ? "bg-white hover:bg-slate-50 text-blue-600 border-slate-200" : "bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700"
                                    )}
                                >
                                    <span className="truncate max-w-[150px]">{chunk.web.title}</span>
                                    <ExternalLink size={10} />
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;