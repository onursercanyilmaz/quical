import React, { useState } from 'react';
import { ClipboardPaste, Send } from 'lucide-react';

interface TextInputZoneProps {
    onTextSubmit: (text: string) => void;
}

const TextInputZone: React.FC<TextInputZoneProps> = ({ onTextSubmit }) => {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (text.trim()) {
            onTextSubmit(text.trim());
        }
    };

    const handlePaste = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            setText(clipboardText);
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSubmit();
        }
    };

    return (
        <div className="w-full">
            <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Paste or type event details
                    </label>
                    <button
                        onClick={handlePaste}
                        className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        Paste from clipboard
                    </button>
                </div>

                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Example:&#10;Meeting with John on Friday at 3pm at Coffee Shop&#10;&#10;Or paste email/text containing event details..."
                    className="w-full min-h-[150px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white outline-none resize-y transition-all placeholder-gray-400 dark:placeholder-gray-500"
                />

                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Press Ctrl+Enter to submit
                    </p>
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim()}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all ${text.trim()
                            ? 'bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                            }`}
                    >
                        <Send className="w-4 h-4" />
                        Extract Events
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TextInputZone;
