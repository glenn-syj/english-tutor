"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const SpeechRecognition = getSpeechRecognition();

  const startListening = useCallback(() => {
    if (!SpeechRecognition) return;
    const recognizer = new SpeechRecognition();
    recognitionRef.current = recognizer;
    recognizer.lang = "en-US";
    recognizer.interimResults = true;
    recognizer.continuous = true;

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
      if (recognitionRef.current) {
        recognitionRef.current = null;
      }
      setIsListening(false);
    };

    recognizer.start();
  }, [SpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  return {
    text,
    isListening,
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognition,
  };
};

export const useTextToSpeech = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      cancel();
    };
  }, [cancel]);

  return { speak, cancel, isPlaying };
};
