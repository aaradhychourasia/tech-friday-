import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

const CodeBlock = ({ language, children, ...props }: any) => {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden my-4 shadow-lg border border-slate-700 group">
      <div className="bg-slate-800 px-4 py-2 text-xs text-slate-400 font-mono border-b border-slate-700 flex justify-between items-center">
        <span>{language}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0 }}
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-invert max-w-none text-slate-200 text-sm md:text-base leading-relaxed"
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <CodeBlock language={match[1]} children={children} {...props} />
          ) : (
            <code className="bg-slate-700 text-slate-200 px-1 py-0.5 rounded font-mono text-sm" {...props}>
              {children}
            </code>
          );
        },
        a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors" />
        ),
        ul: ({node, ...props}) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
        ol: ({node, ...props}) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
        h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white" {...props} />,
        h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-5 mb-3 text-white" {...props} />,
        h3: ({node, ...props}) => <h3 className="text-lg font-medium mt-4 mb-2 text-white" {...props} />,
        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 py-1 italic text-slate-400 bg-slate-800/50 rounded-r my-4" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;