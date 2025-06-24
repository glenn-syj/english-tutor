import { useState, useEffect, useRef } from "react";
import { type ChatMessage } from "@/types";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      sender: "user",
      timestamp: new Date().toISOString(),
      text: content,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          history: messages,
          message: content,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let initialChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // SSE data is prefixed with "data: "
        const jsonStrings = chunk.match(/data: (.*)/g);
        if (!jsonStrings) continue;

        for (const jsonString of jsonStrings) {
          try {
            const data = JSON.parse(jsonString.substring(5)); // Remove "data: "
            if (data.type === "token" && data.content) {
              if (!initialChunkReceived) {
                initialChunkReceived = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    sender: "ai",
                    text: data.content,
                    timestamp: new Date().toISOString(),
                  },
                ]);
              } else {
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage.sender === "ai") {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMessage,
                        text: lastMessage.text + data.content,
                      },
                    ];
                  }
                  return prev;
                });
              }
            }
          } catch (e) {
            // Might receive incomplete JSON string, just ignore it and wait for the next chunk
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to send message:", error);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Start a conversation by typing a message below
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessageComponent key={index} message={message} />
          ))
        )}
      </div>
      <div className="border-t border-gray-200">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
