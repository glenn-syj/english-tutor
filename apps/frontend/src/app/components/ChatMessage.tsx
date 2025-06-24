import { type ChatMessage } from "@/types";

interface Props {
  message: ChatMessage;
}

export function ChatMessage({ message }: Props) {
  const isAI = message.role === "assistant";

  return (
    <div
      className={`flex w-full ${
        isAI ? "bg-gray-50" : "bg-white"
      } p-4 border-b border-gray-100`}
    >
      <div className="flex-1 max-w-4xl mx-auto">
        <div className="flex items-start">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isAI ? "bg-blue-500" : "bg-gray-500"
            }`}
          >
            <span className="text-white text-sm">{isAI ? "AI" : "You"}</span>
          </div>
          <div className="ml-4 flex-1">
            <div className="text-sm text-gray-900 whitespace-pre-wrap">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
