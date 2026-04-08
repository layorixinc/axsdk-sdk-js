'use client';

import { useState } from 'react';
import { AXSDK } from '@axsdk/core';
import { useAXTheme } from '../AXThemeContext';

export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
}

export interface QuestionTool {
  messageID: string;
  callID: string;
}

export interface AXQuestionDialogData {
  id: string;
  sessionID: string;
  questions: Question[];
  tool: QuestionTool;
}

export interface QuestionAnswer {
  questionIndex: number;
  selectedOption: number;
  label: string;
  customAnswer?: string;
}

export interface AXQuestionDialogProps {
  data: AXQuestionDialogData;
  onAnswer?: (questionIndex: number, selectedOption: number, label: string) => void;
  onSubmit?: (answers: QuestionAnswer[]) => void;
  onDecline?: () => void;
  visible?: boolean;
}

interface OptionCardProps {
  option: QuestionOption;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

function OptionCard({ option, index, isSelected, onSelect }: OptionCardProps) {
  const { theme } = useAXTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        textAlign: "left",
        background: isSelected
          ? `linear-gradient(135deg, rgba(var(--ax-color-primary-rgb, 124, 58, 237), 0.15) 0%, rgba(var(--ax-color-primary-rgb, 79, 70, 229), 0.15) 100%)`
          : hovered
          ? "var(--ax-bg-assistant-message, rgba(255, 255, 255, 0.08))"
          : "var(--ax-bg-input-textarea, rgba(255, 255, 255, 0.04))",
        border: isSelected
          ? "1.5px solid var(--ax-color-primary, rgba(124, 58, 237, 0.7))"
          : hovered
          ? "1.5px solid rgba(255, 255, 255, 0.2)"
          : "1.5px solid rgba(255, 255, 255, 0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        transition: "all 0.15s ease",
        outline: "none",
        boxShadow: isSelected
          ? "0 2px 12px var(--ax-color-primary, rgba(124, 58, 237, 0.2))"
          : "none",
        ...(isSelected ? theme.styles?.questionDialog?.optionSelected : theme.styles?.questionDialog?.optionUnselected),
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: isSelected
              ? "2px solid var(--ax-color-primary, rgba(124, 58, 237, 0.9))"
              : "2px solid rgba(255, 255, 255, 0.3)",
            background: isSelected
              ? "var(--ax-color-primary, rgba(124, 58, 237, 0.9))"
              : "transparent",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          {isSelected && (
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "white",
              }}
            />
          )}
        </div>

        <span
          style={{
            fontWeight: 600,
            fontSize: "0.95em",
            color: isSelected
              ? "var(--ax-color-primary-light, rgba(167, 139, 250, 1.0))"
              : "var(--ax-text-primary, rgba(255, 255, 255, 0.88))",
            transition: "color 0.15s ease",
          }}
        >
          {option.label}
        </span>
      </div>

      {option.description && (
        <div
          style={{
            fontSize: "0.8em",
            color: "var(--ax-text-dim, rgba(255, 255, 255, 0.45))",
            paddingLeft: 28,
            lineHeight: 1.4,
          }}
        >
          {option.description}
        </div>
      )}
    </button>
  );
}

interface QuestionPanelProps {
  question: Question;
  questionIndex: number;
  selectedOption: number | null;
  onSelect: (questionIndex: number, optionIndex: number) => void;
  customAnswer?: string;
  onCustomAnswerChange?: (value: string) => void;
}

function QuestionPanel({ question, questionIndex, selectedOption, onSelect, customAnswer, onCustomAnswerChange }: QuestionPanelProps) {
  const [textareaFocused, setTextareaFocused] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          fontSize: "0.75em",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--ax-color-primary-light, rgba(167, 139, 250, 0.85))",
          paddingBottom: 4,
          borderBottom: "1px solid var(--ax-border-surface, rgba(255, 255, 255, 0.08))",
          whiteSpace: "pre-wrap",
        }}
      >
        {question.header}
      </div>

      <div
        style={{
          fontSize: "1.05em",
          fontWeight: 500,
          color: "var(--ax-text-primary, rgba(255, 255, 255, 0.92))",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
        }}
      >
        {question.question}
      </div>

      <div
        className="ax-scrollbar-hidden"
        style={{
          overflowY: "auto",
          maxHeight: "40vh",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {question.options.map((option, optionIndex) => (
          <OptionCard
            key={optionIndex}
            option={option}
            index={optionIndex}
            isSelected={selectedOption === optionIndex}
            onSelect={(idx) => onSelect(questionIndex, idx)}
          />
        ))}

        <textarea
          value={customAnswer ?? ""}
          onChange={(e) => onCustomAnswerChange?.(e.target.value)}
          onFocus={() => setTextareaFocused(true)}
          onBlur={() => setTextareaFocused(false)}
          placeholder={AXSDK.t("questionDialog.customAnswerPlaceholder")}
          style={{
            width: "100%",
            minHeight: "60px",
            background: "var(--ax-bg-input-textarea, rgba(255,255,255,0.05))",
            border: textareaFocused
              ? "1px solid var(--ax-color-primary, rgba(124,58,237,0.6))"
              : "1px solid var(--ax-border-surface, rgba(255,255,255,0.1))",
            borderRadius: 8,
            color: "var(--ax-text-primary, rgba(255,255,255,0.85))",
            fontSize: "0.85em",
            padding: "0.5em 0.75em",
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            transition: "border-color 0.15s ease",
          }}
        />
      </div>
    </div>
  );
}

interface DeclineButtonProps {
  onDecline: () => void;
}

function DeclineButton({ onDecline }: DeclineButtonProps) {
  const { theme } = useAXTheme();
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onDecline}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={AXSDK.t("questionDialog.decline")}
      style={{
        position: "absolute",
        top: "0.5em",
        right: "0.75em",
        fontSize: "0.7em",
        padding: "0.25em 0.5em",
        borderRadius: 6,
        border: "1px solid var(--ax-border-error, rgba(248, 113, 113, 0.3))",
        background: hovered
          ? "var(--ax-bg-error, rgba(248, 113, 113, 0.08))"
          : "var(--ax-bg-error, rgba(248, 113, 113, 0.08))",
        color: "var(--ax-text-error, rgba(248, 113, 113, 0.7))",
        fontWeight: 600,
        cursor: "pointer",
        transition: "background 0.15s ease",
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        letterSpacing: "0.02em",
        ...theme.styles?.questionDialog?.declineButton,
      }}
    >
      {AXSDK.t("questionDialog.decline")}
    </button>
  );
}

export function AXQuestionDialog({
  data,
  onAnswer,
  onSubmit,
  onDecline,
  visible = true,
}: AXQuestionDialogProps) {
  const { theme } = useAXTheme();
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [customAnswers, setCustomAnswers] = useState<Map<number, string>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  if (!visible) return null;

  const totalQuestions = data.questions.length;
  const isMultiPage = totalQuestions > 1;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === totalQuestions - 1;
  const currentQuestion = data.questions[currentPage];
  const currentPageAnswer = answers.get(currentPage) ?? null;
  const currentCustomAnswer = customAnswers.get(currentPage) ?? "";
  const hasCurrentAnswer = currentPageAnswer !== null || currentCustomAnswer.trim().length > 0;

  function handleSelect(questionIndex: number, optionIndex: number) {
    const label = data.questions[questionIndex].options[optionIndex].label;
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(questionIndex, optionIndex);
      return next;
    });
    onAnswer?.(questionIndex, optionIndex, label);
  }

  function handleCustomAnswerChange(value: string) {
    setCustomAnswers((prev) => {
      const next = new Map(prev);
      next.set(currentPage, value);
      return next;
    });
  }

  function handleNext() {
    if (!hasCurrentAnswer) return;
    if (!isLastPage) {
      setCurrentPage((p) => p + 1);
    }
  }

  function handlePrev() {
    if (!isFirstPage) {
      setCurrentPage((p) => p - 1);
    }
  }

  function handleSubmit() {
    if (!hasCurrentAnswer) return;
    const allIndices = new Set<number>([
      ...Array.from(answers.keys()),
      ...Array.from(customAnswers.keys()).filter((k) => (customAnswers.get(k) ?? "").trim().length > 0),
    ]);
    const result: QuestionAnswer[] = Array.from(allIndices)
      .sort((a, b) => a - b)
      .map((questionIndex) => {
        const selectedOption = answers.get(questionIndex) ?? -1;
        const customText = customAnswers.get(questionIndex)?.trim() ?? undefined;
        const label =
          selectedOption >= 0
            ? data.questions[questionIndex].options[selectedOption].label
            : "";
        return {
          questionIndex,
          selectedOption,
          label,
          ...(customText ? { customAnswer: customText } : {}),
        };
      });
    setSubmitted(true);
    onSubmit?.(result);
  }

  function handleDecline() {
    setDeclined(true);
    onDecline?.();
  }

  return (
    <div
      role="dialog"
      aria-label="Question dialog"
      style={{
        position: "relative",
        background: "var(--ax-bg-question-dialog)",
        border: "1px solid var(--ax-color-primary-light, rgba(167, 139, 250, 0.2))",
        borderRadius: 20,
        padding: "24px 20px",
        boxShadow:
          "0 8px 40px rgba(0, 0, 0, 0.5), 0 2px 12px rgba(124, 58, 237, 0.15)",
        backdropFilter: "blur(16px)",
        animation: "axqdialog-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
        maxWidth: 540,
        width: "100%",
        ...theme.styles?.questionDialog?.card,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3), transparent 60%), " +
              `radial-gradient(circle at center, var(--ax-color-primary, #7c3aed), var(--ax-color-primary-dark, #1d4ed8))`,
            boxShadow: "0 0 12px var(--ax-color-primary, rgba(124, 58, 237, 0.4))",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "white",
              fontWeight: 700,
              fontSize: "0.6em",
              letterSpacing: "0.15em",
            }}
          >
            AX
          </span>
        </div>

        <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: "0.85em",
            fontWeight: 600,
            color: "var(--ax-text-primary, rgba(255, 255, 255, 0.88))",
          }}
        >
          {AXSDK.t("questionDialog.aiAssistant")}
        </div>
        <div
          style={{
            fontSize: "0.7em",
            color: "var(--ax-color-primary-light, rgba(167, 139, 250, 0.65))",
          }}
        >
          {AXSDK.t("questionDialog.title")}
        </div>
      </div>

        {isMultiPage && (
          <div
            style={{
              fontSize: "0.7em",
              color: "var(--ax-text-dim, rgba(255, 255, 255, 0.4))",
              fontWeight: 500,
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}
          >
            {AXSDK.t("questionDialog.pageIndicator")
              .replace("{current}", String(currentPage + 1))
              .replace("{total}", String(totalQuestions))}
          </div>
        )}
      </div>

      {!declined && !submitted && (
        <DeclineButton onDecline={handleDecline} />
      )}

      <QuestionPanel
        key={currentPage}
        question={currentQuestion}
        questionIndex={currentPage}
        selectedOption={currentPageAnswer}
        onSelect={handleSelect}
        customAnswer={currentCustomAnswer}
        onCustomAnswerChange={handleCustomAnswerChange}
      />

      <div style={{ marginTop: 20 }}>
        {submitted ? (
          <div
            style={{
              textAlign: "center",
              padding: "12px 0",
              color: "var(--ax-text-success)",
              fontSize: "0.9em",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>✓</span>
            <span>{AXSDK.t("questionDialog.submitted")}</span>
          </div>
        ) : declined ? (
          <div
            style={{
              textAlign: "center",
              padding: "12px 0",
              color: "var(--ax-text-error)",
              fontSize: "0.9em",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span>✗</span>
            <span>{AXSDK.t("questionDialog.declined")}</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "row", gap: 10 }}>
            {isMultiPage && (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isFirstPage}
                style={{
                  flexShrink: 0,
                  padding: "13px 16px",
                  borderRadius: 12,
                  border: "1.5px solid rgba(255, 255, 255, 0.18)",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "var(--ax-text-muted)",
                  fontWeight: 600,
                  fontSize: "0.9em",
                  cursor: isFirstPage ? "not-allowed" : "pointer",
                  opacity: isFirstPage ? 0.3 : 1,
                  transition: "all 0.2s ease",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap",
                }}
              >
                ← {AXSDK.t("questionDialog.prev")}
              </button>
            )}

            {isLastPage ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!hasCurrentAnswer}
                style={{
                  flex: 1,
                  padding: "13px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: hasCurrentAnswer
                    ? `linear-gradient(135deg, var(--ax-color-primary, rgba(124,58,237,1)) 0%, var(--ax-color-primary-dark, rgba(79,70,229,1)) 100%)`
                    : "rgba(255, 255, 255, 0.07)",
                  color: hasCurrentAnswer
                    ? "rgba(255, 255, 255, 0.95)"
                    : "var(--ax-text-dim)",
                  fontWeight: 600,
                  fontSize: "0.95em",
                  cursor: hasCurrentAnswer ? "pointer" : "not-allowed",
                  transition: "all 0.2s ease",
                  boxShadow: hasCurrentAnswer
                    ? "0 2px 12px rgba(124, 58, 237, 0.35)"
                    : "none",
                  letterSpacing: "0.01em",
                  ...theme.styles?.questionDialog?.submitButton,
                }}
              >
                {AXSDK.t("questionDialog.submit")}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={!hasCurrentAnswer}
                style={{
                  flex: 1,
                  padding: "13px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: hasCurrentAnswer
                    ? `linear-gradient(135deg, var(--ax-color-primary, rgba(124,58,237,1)) 0%, var(--ax-color-primary-dark, rgba(79,70,229,1)) 100%)`
                    : "rgba(255, 255, 255, 0.07)",
                  color: hasCurrentAnswer
                    ? "rgba(255, 255, 255, 0.95)"
                    : "var(--ax-text-dim)",
                  fontWeight: 600,
                  fontSize: "0.95em",
                  cursor: hasCurrentAnswer ? "pointer" : "not-allowed",
                  opacity: hasCurrentAnswer ? 1 : 0.5,
                  transition: "all 0.2s ease",
                  boxShadow: hasCurrentAnswer
                    ? "0 2px 12px rgba(124, 58, 237, 0.35)"
                    : "none",
                  letterSpacing: "0.01em",
                  ...theme.styles?.questionDialog?.submitButton,
                }}
              >
                {AXSDK.t("questionDialog.next")} →
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes axqdialog-in {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
