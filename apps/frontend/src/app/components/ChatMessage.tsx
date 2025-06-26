import { type ChatMessage, type Correction } from "@/types";
import { SpeakerLoudIcon, SpeakerOffIcon } from "@radix-ui/react-icons";

interface Props {
  message: ChatMessage;
  onPlayAudio: () => void;
  isPlaying: boolean;
}

export function ChatMessage({ message, onPlayAudio, isPlaying }: Props) {
  const isAssistant = message.sender === "assistant";

  return (
    <div
      className={`flex items-start gap-3 p-4 ${
        isAssistant ? "bg-gray-50" : ""
      }`}
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          isAssistant ? "bg-blue-500 text-white" : "bg-gray-300"
        }`}
      >
        {isAssistant ? "AI" : "You"}
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-gray-800">{message.text}</p>

        {message.correction && message.correction.has_suggestion && (
          <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-3">
            <h4 className="text-sm font-semibold text-yellow-800">
              Correction Suggestion ({message.correction.correction_type})
            </h4>
            <p className="text-sm text-yellow-700">
              <span className="font-medium">Original:</span>{" "}
              <span className="line-through">
                {message.correction.original}
              </span>
            </p>
            <p className="text-sm text-green-700">
              <span className="font-medium">Corrected:</span>{" "}
              {message.correction.corrected}
            </p>
            <p className="mt-1 text-xs text-yellow-600">
              {message.correction.explanation}
            </p>
            {message.correction.alternatives &&
              message.correction.alternatives.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs font-semibold text-yellow-800">
                    Alternatives:
                  </h5>
                  <ul className="list-disc pl-5 text-xs text-yellow-700">
                    {message.correction.alternatives.map((alt, index) => (
                      <li key={index}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}

        {isAssistant && (
          <button
            onClick={onPlayAudio}
            className="text-gray-500 hover:text-gray-700"
            aria-label={isPlaying ? "Stop audio" : "Play audio"}
          >
            {isPlaying ? (
              <SpeakerOffIcon className="h-5 w-5" />
            ) : (
              <SpeakerLoudIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
