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
      let aiResponseText = "";
      let currentAssistantMessage = "";
      const systemMessagePrefix = "SYSTEM_MESSAGE::";
      const correctionMessagePrefix = "CORRECTION_MESSAGE::";
      let assistantMessageTimestamp: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        console.log("[Chat] Stream iteration:", { done, value });

        if (done) {
          if (currentAssistantMessage.trim() && assistantMessageTimestamp) {
            speak(currentAssistantMessage);
            setCurrentlyPlayingId(assistantMessageTimestamp);
          }
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log("[Chat] Decoded chunk:", chunk);

        let remainingChunk = chunk;

        // Check for our special system message at the beginning of the chunk
        if (remainingChunk.startsWith(systemMessagePrefix)) {
          const jsonStringStartIndex = systemMessagePrefix.length;
          let braceCount = 0;
          let jsonStringEndIndex = -1;

          // Find the end of the JSON object by counting braces
          for (let i = jsonStringStartIndex; i < remainingChunk.length; i++) {
            const char = remainingChunk[i];
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
            }
            // When braceCount is 0, we've found the end of the top-level object
            if (braceCount === 0 && i >= jsonStringStartIndex) {
              jsonStringEndIndex = i + 1;
              break;
            }
          }

          if (jsonStringEndIndex !== -1) {
            const systemMessageJson = remainingChunk.substring(
              jsonStringStartIndex,
              jsonStringEndIndex
            );
            console.log("[Chat] System message found:", systemMessageJson);

            try {
              const systemMessage = JSON.parse(systemMessageJson);
              setMessages((prev) => {
                console.log("[Chat] Adding system message to state.");
                return [...prev, systemMessage];
              });
            } catch (e) {
              console.error("Failed to parse system message", e);
            }
            // The rest of the chunk is the start of the AI's response
            remainingChunk = remainingChunk.substring(jsonStringEndIndex);
          }
        }

        // Check for our special correction message
        if (remainingChunk.startsWith(correctionMessagePrefix)) {
          const jsonStringStartIndex = correctionMessagePrefix.length;
          let braceCount = 0;
          let jsonStringEndIndex = -1;

          // Find the end of the JSON object by counting braces
          for (let i = jsonStringStartIndex; i < remainingChunk.length; i++) {
            const char = remainingChunk[i];
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
            }
            if (braceCount === 0 && i >= jsonStringStartIndex) {
              jsonStringEndIndex = i + 1;
              break;
            }
          }

          if (jsonStringEndIndex !== -1) {
            const correctionJson = remainingChunk.substring(
              jsonStringStartIndex,
              jsonStringEndIndex
            );
            console.log("[Chat] Correction message found:", correctionJson);
            try {
              const correction = JSON.parse(correctionJson);
              setMessages((prev) => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage?.sender === "user") {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMessage, correction: correction },
                  ];
                }
                return prev;
              });
            } catch (e) {
              console.error("Failed to parse correction message", e);
            }
            // The rest of the chunk might be the start of the AI's response
            remainingChunk = remainingChunk
              .substring(jsonStringEndIndex)
              .trimStart();
          }
        }

        if (remainingChunk) {
          aiResponseText += remainingChunk;
          currentAssistantMessage += remainingChunk;

          setMessages((prev) => {
            console.log(
              "[Chat] Updating assistant message state with chunk:",
              remainingChunk
            );
            const lastMessage = prev[prev.length - 1];
            // If the last message is from the assistant, update it.
            if (lastMessage?.sender === "assistant") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, text: lastMessage.text + remainingChunk },
              ];
            } else {
              // Otherwise, add a new assistant message.
              if (!assistantMessageTimestamp) {
                assistantMessageTimestamp = new Date().toISOString();
              }
              return [
                ...prev,
                {
                  sender: "assistant",
                  text: remainingChunk,
                  timestamp: assistantMessageTimestamp,
                },
              ];
            }
          });
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
