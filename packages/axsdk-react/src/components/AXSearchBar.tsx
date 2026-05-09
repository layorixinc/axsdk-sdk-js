'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AXSDK } from '@axsdk/core';
import { useAXTheme } from '../AXThemeContext';

interface AXSpeechRecognitionResultItem {
  transcript: string;
}

interface AXSpeechRecognitionResult {
  readonly length: number;
  item(index: number): AXSpeechRecognitionResultItem;
  [index: number]: AXSpeechRecognitionResultItem;
}

interface AXSpeechRecognitionResultList {
  readonly length: number;
  item(index: number): AXSpeechRecognitionResult;
  [index: number]: AXSpeechRecognitionResult;
}

interface AXSpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: AXSpeechRecognitionResultList;
}

interface AXSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message?: string;
}

interface AXSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: ((this: AXSpeechRecognition, event: Event) => void) | null;
  onerror: ((this: AXSpeechRecognition, event: AXSpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: AXSpeechRecognition, event: AXSpeechRecognitionEvent) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

interface AXSpeechRecognitionConstructor {
  new (): AXSpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: AXSpeechRecognitionConstructor;
    webkitSpeechRecognition?: AXSpeechRecognitionConstructor;
  }
}

function getAXSpeechRecognitionConstructor(): AXSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export interface AXSearchBarProps {
  onSearch: (query: string) => void;
  disabled?: boolean;
  placeholder?: string;
  buttonLabel?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  clearOnSubmit?: boolean;
  onFocusChange?: (focused: boolean, event: React.FocusEvent<HTMLFormElement>) => void;
  surface?: 'standalone' | 'embedded';
  autoFocus?: boolean;
  enableVoiceDictation?: boolean;
  voiceDictationLabel?: string;
  voiceDictationListeningLabel?: string;
  voiceDictationUnavailableLabel?: string;
}

export const DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL = 'Run';

export function AXSearchBar({
  onSearch,
  disabled = false,
  placeholder,
  buttonLabel = DEFAULT_AX_SEARCH_BAR_BUTTON_LABEL,
  defaultValue = '',
  value,
  onValueChange,
  clearOnSubmit = true,
  onFocusChange,
  surface = 'standalone',
  autoFocus = false,
  enableVoiceDictation = false,
  voiceDictationLabel = 'Start voice dictation',
  voiceDictationListeningLabel = 'Stop voice dictation',
  voiceDictationUnavailableLabel = 'Voice dictation is not available in this browser',
}: AXSearchBarProps) {
  const { theme } = useAXTheme();
  const [localQuery, setLocalQuery] = useState(defaultValue);
  const [isDictating, setIsDictating] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<AXSpeechRecognition | null>(null);
  const voiceBaseQueryRef = useRef('');
  const query = value ?? localQuery;
  const trimmedQuery = query.trim();
  const hasQuery = query.length > 0;
  const submitDisabled = disabled || !trimmedQuery;
  const isEmbedded = surface === 'embedded';
  const voiceRecognitionSupported = enableVoiceDictation && getAXSpeechRecognitionConstructor() !== null;

  function setQuery(nextQuery: string) {
    if (value === undefined) setLocalQuery(nextQuery);
    onValueChange?.(nextQuery);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitDisabled) return;
    onSearch(trimmedQuery);
    if (clearOnSubmit) setQuery('');
  }

  function handleClearInput() {
    setQuery('');
  }

  function finishDictation() {
    recognitionRef.current = null;
    setIsDictating(false);
  }

  function handleVoiceDictationClick() {
    if (!enableVoiceDictation || disabled) return;
    if (isDictating) {
      recognitionRef.current?.stop();
      finishDictation();
      return;
    }

    const Recognition = getAXSpeechRecognitionConstructor();
    if (!Recognition) {
      setVoiceStatus(voiceDictationUnavailableLabel);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = typeof navigator === 'undefined' ? '' : navigator.language;
    recognition.maxAlternatives = 1;
    voiceBaseQueryRef.current = query.trim();
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? '';
      }
      const recognizedText = transcript.trim();
      if (!recognizedText) return;
      const baseQuery = voiceBaseQueryRef.current;
      setQuery(baseQuery ? `${baseQuery} ${recognizedText}` : recognizedText);
      setVoiceStatus(recognizedText);
    };
    recognition.onerror = (event) => {
      setVoiceStatus(event.message || event.error || voiceDictationUnavailableLabel);
      finishDictation();
    };
    recognition.onend = () => {
      finishDictation();
    };

    recognitionRef.current = recognition;
    setVoiceStatus(voiceDictationListeningLabel);
    setIsDictating(true);
    try {
      recognition.start();
    } catch (error) {
      const message = error instanceof Error ? error.message : voiceDictationUnavailableLabel;
      setVoiceStatus(message);
      finishDictation();
    }
  }

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRef.current?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      onFocus={(event) => onFocusChange?.(true, event)}
      onBlur={(event) => {
        const nextFocusTarget = event.relatedTarget;
        if (nextFocusTarget instanceof Node && event.currentTarget.contains(nextFocusTarget)) return;
        onFocusChange?.(false, event);
      }}
      style={{
        width: '100%',
        maxWidth: isEmbedded ? undefined : '680px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5em',
        padding: isEmbedded ? '0.45em 0.5em' : '0.5em',
        border: isEmbedded ? 'none' : '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
        borderRadius: isEmbedded ? '1em' : '999px',
        background: isEmbedded ? 'transparent' : 'var(--ax-bg-popover)',
        boxShadow: isEmbedded ? 'none' : '0 8px 32px rgba(0,0,0,0.28)',
        pointerEvents: 'auto',
        position: 'relative',
        ...(isEmbedded ? undefined : theme.styles?.input?.card),
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder ?? AXSDK.t('chatInput')}
        aria-label={placeholder ?? AXSDK.t('chatInput')}
        onChange={(event) => setQuery(event.currentTarget.value)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: 'var(--ax-text-primary)',
          caretColor: 'var(--ax-text-caret, var(--ax-color-primary-light))',
          fontSize: '1em',
          lineHeight: 1.4,
          padding: '0.55em 0.75em',
          ...theme.styles?.input?.textarea,
        }}
      />
      {hasQuery && (
        <button
          type="button"
          aria-label="Clear search input"
          data-ax-search-bar="clear-button"
          disabled={disabled}
          onClick={handleClearInput}
          style={{
            flexShrink: 0,
            width: '2.2em',
            height: '2.2em',
            border: '1px solid var(--ax-border-surface, rgba(255,255,255,0.14))',
            borderRadius: '999px',
            background: 'var(--ax-bg-input-textarea, rgba(255,255,255,0.08))',
            color: disabled ? 'var(--ax-text-dim)' : 'var(--ax-text-muted, var(--ax-text-primary))',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: 0,
            padding: 0,
            font: 'inherit',
            lineHeight: 1,
            opacity: disabled ? 0.64 : 1,
            transition: 'background 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.12s ease',
            ...theme.styles?.input?.clearButton,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      )}
      {enableVoiceDictation && (
        <>
          <button
            type="button"
            aria-label={voiceRecognitionSupported ? (isDictating ? voiceDictationListeningLabel : voiceDictationLabel) : voiceDictationUnavailableLabel}
            aria-pressed={isDictating}
            data-ax-search-bar="voice-dictation"
            disabled={disabled || !voiceRecognitionSupported}
            title={voiceRecognitionSupported ? (isDictating ? voiceDictationListeningLabel : voiceDictationLabel) : voiceDictationUnavailableLabel}
            onClick={handleVoiceDictationClick}
            style={{
              flexShrink: 0,
              width: '2.45em',
              height: '2.45em',
              border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.45))',
              borderRadius: '999px',
              background: isDictating
                ? 'color-mix(in srgb, var(--ax-color-primary, #00b8db) 24%, var(--ax-bg-input-textarea, transparent))'
                : 'var(--ax-bg-input-textarea, rgba(255,255,255,0.08))',
              color: voiceRecognitionSupported ? 'var(--ax-text-primary)' : 'var(--ax-text-dim)',
              cursor: disabled || !voiceRecognitionSupported ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 0,
              padding: 0,
              opacity: disabled || !voiceRecognitionSupported ? 0.64 : 1,
              transition: 'background 0.15s ease, color 0.15s ease, opacity 0.15s ease, transform 0.12s ease',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" />
              <path d="M12 18v3" />
              <path d="M8 21h8" />
            </svg>
          </button>
          <span
            role="status"
            aria-live="polite"
            data-ax-search-bar="voice-status"
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: 'hidden',
              clip: 'rect(0 0 0 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            {voiceStatus || (voiceRecognitionSupported ? '' : voiceDictationUnavailableLabel)}
          </span>
        </>
      )}
      <button
        type="submit"
        disabled={submitDisabled}
        style={{
          flexShrink: 0,
          border: '1px solid var(--ax-border-primary, rgba(0,212,255,0.45))',
          borderRadius: '999px',
          padding: '0.55em 1em',
          background: submitDisabled
            ? 'var(--ax-bg-input-textarea, rgba(255,255,255,0.08))'
            : 'var(--ax-color-primary, #00b8db)',
          color: submitDisabled ? 'var(--ax-text-dim)' : 'var(--ax-text-primary)',
          cursor: submitDisabled ? 'not-allowed' : 'pointer',
          fontSize: '0.92em',
          fontWeight: 700,
          transition: 'filter 0.15s ease, opacity 0.15s ease',
          opacity: submitDisabled ? 0.7 : 1,
          ...theme.styles?.input?.sendButton,
        }}
      >
        {buttonLabel}
      </button>
    </form>
  );
}
