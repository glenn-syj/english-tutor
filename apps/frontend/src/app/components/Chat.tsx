"use client";

import { useState, useEffect, useRef } from "react";
import { type ChatMessage } from "@/types";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useTextToSpeech } from "../hooks/useSpeech";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(
    null
  );
  const abortControllerRef = useRef<AbortController | null>(null);
  const { speak, cancel, isPlaying } = useTextToSpeech();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      setCurrentlyPlayingId(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    // Scroll to the bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handlePlayAudio = (message: ChatMessage) => {
    if (currentlyPlayingId === message.timestamp) {
      cancel();
    } else {
      speak(message.text);
      setCurrentlyPlayingId(message.timestamp);
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      sender: "user",
      text: content,
      timestamp: new Date().toISOString(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
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
          history: newMessages.slice(0, -1), // Send history WITHOUT the new user message
          message: content,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log(errorData);
        throw new Error(
          errorData.error?.message || "An unknown error occurred."
        );
      }

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentAssistantMessage = "";
      let assistantMessageTimestamp: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the potentially incomplete last line

        for (const line of lines) {
          if (!line) continue;

          try {
            const messageObject = JSON.parse(line);
            const { type, payload } = messageObject;

            switch (type) {
              case "system-article":
                setMessages((prev) => [...prev, payload]);
                break;
              case "correction":
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.sender === "user") {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, correction: payload },
                    ];
                  }
                  return prev;
                });
                break;
              case "chunk":
                currentAssistantMessage += payload;
                setMessages((prev) => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.sender === "assistant") {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMessage, text: lastMessage.text + payload },
                    ];
                  } else {
                    if (!assistantMessageTimestamp) {
                      assistantMessageTimestamp = new Date().toISOString();
                    }
                    return [
                      ...prev,
                      {
                        sender: "assistant",
                        text: payload,
                        timestamp: assistantMessageTimestamp,
                      },
                    ];
                  }
                });
                break;
              case "end":
                if (
                  currentAssistantMessage.trim() &&
                  assistantMessageTimestamp
                ) {
                  speak(currentAssistantMessage);
                  setCurrentlyPlayingId(assistantMessageTimestamp);
                }
                break;
              default:
                console.warn(`Unknown stream message type: ${type}`);
            }
          } catch (e) {
            console.error("Failed to parse stream line:", line, e);
          }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to send message:", error);
        const errorMessage: ChatMessage = {
          sender: "assistant",
          text: `Sorry, something went wrong: ${error.message}`,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
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
          <div>
            {messages
              .filter((msg) => msg.sender !== "system")
              .map((message, index) => (
                <ChatMessageComponent
                  key={index}
                  message={message}
                  onPlayAudio={() => handlePlayAudio(message)}
                  isPlaying={currentlyPlayingId === message.timestamp}
                />
              ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="border-t border-gray-200">
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
