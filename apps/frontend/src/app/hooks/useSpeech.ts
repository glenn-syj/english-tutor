"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseSpeechRecognition {
  text: string;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
  hasRecognitionSupport: boolean;
}

const getSpeechRecognition = (): typeof window.SpeechRecognition | null => {
  if (typeof window !== "undefined") {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }
  return null;
};

export const useSpeechRecognition = (): UseSpeechRecognition => {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognition = getSpeechRecognition();

  const startListening = useCallback(() => {
    if (!recognition) return;
    const recognizer = new recognition();
    recognizer.lang = "en-US";
    recognizer.interimResults = true;
    recognizer.continuous = false;

    recognizer.onstart = () => {
      setIsListening(true);
    };

    recognizer.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join("");
      setText(transcript);
    };

    recognizer.onend = () => {
      setIsListening(false);
    };

    recognizer.start();
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    const recognizer = new recognition();
    recognizer.stop();
    setIsListening(false);
  }, [recognition]);

  return {
    text,
    isListening,
    startListening,
    stopListening,
    hasRecognitionSupport: !!recognition,
  };
};

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { isSpeaking, speak, cancel };
};
