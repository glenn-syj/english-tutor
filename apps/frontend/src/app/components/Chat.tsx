"use client";

import { useState, useEffect, useRef } from "react";
import { type ChatMessage } from "@/types";
import { ChatMessage as ChatMessageComponent } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { useTextToSpeech } from "../hooks/useSpeech";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { speak } = useTextToSpeech();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to the bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          history: newMessages.slice(0, -1), // Send history without the new user message
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
      let initialChunkReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          speak(aiResponseText);
          break;
        }

        const content = decoder.decode(value, { stream: true });
        aiResponseText += content;

        if (!initialChunkReceived) {
          initialChunkReceived = true;
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: content,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else {
          setMessages((prev) => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.sender === "ai") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, text: lastMessage.text + content },
              ];
            }
            return prev;
          });
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Failed to send message:", error);
        const errorMessage: ChatMessage = {
          sender: "ai",
          text: `Sorry, something went wrong: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true,
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
            {messages.map((message, index) => (
              <ChatMessageComponent
                key={index}
                message={message}
                onPlayAudio={speak}
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
