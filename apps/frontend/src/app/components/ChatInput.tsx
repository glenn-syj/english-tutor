import { useState } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: Props) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-4xl mx-auto p-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={disabled}
        placeholder="Type your message..."
        className="flex-1 p-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400"
      >
        Send
      </button>
    </form>
  );
}
