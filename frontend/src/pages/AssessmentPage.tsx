import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { ProgressBar } from '../components/ProgressBar';
import { TimerDisplay } from '../components/TimerDisplay';
import { LikertQuestion } from '../components/QuestionRenderer/LikertQuestion';
import { ScenarioQuestion } from '../components/QuestionRenderer/ScenarioQuestion';
import type { SafeQuestionResponse } from '@pinnacle/shared';
import { ArrowRight, AlertCircle, RefreshCw, Send } from 'lucide-react';

export const AssessmentPage: React.FC = () => {
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<SafeQuestionResponse | null>(null);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  // Load or resume active attempt
  const initAttempt = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const attempt = await api.startOrResumeAttempt();
      setAttemptId(attempt.attempt_id);
      await loadQuestion(attempt.attempt_id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to start or resume assessment session. Please check your connection.');
      }
      setIsLoading(false);
    }
  };

  const loadQuestion = async (aid: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedRating(null);
    setSelectedOptionId(null);
    try {
      const q = await api.getCurrentQuestion(aid);
      setCurrentQuestion(q);
    } catch (err: any) {
      if (err instanceof ApiError) {
        // If all questions are already answered, auto-submit
        if (err.message.includes('submit') || err.message.includes('already been served')) {
          setIsFinished(true);
          await handleFinalSubmit(aid);
          return;
        }
        setError(err.message);
      } else {
        setError('Failed to load next question.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAttempt();
  }, []);

  const handleNextAnswer = async () => {
    if (!attemptId || !currentQuestion || isSubmitting) return;

    if (currentQuestion.type === 'SELF_REPORT' && selectedRating === null) {
      setError('Please select how much you agree with the statement before continuing.');
      return;
    }
    if (currentQuestion.type === 'SCENARIO' && selectedOptionId === null) {
      setError('Please choose one of the options before continuing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const answerPayload =
      currentQuestion.type === 'SELF_REPORT'
        ? { rating: selectedRating! }
        : { option_id: selectedOptionId! };

    try {
      const res = await api.submitAnswer(attemptId, {
        question_id: currentQuestion.question_id,
        answer: answerPayload
      });

      if (res.is_completed) {
        setIsFinished(true);
        await handleFinalSubmit(attemptId);
      } else {
        await loadQuestion(attemptId);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not save answer. Please retry.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Called when question timer expires on client
  const handleQuestionTimeout = useCallback(async () => {
    if (!attemptId || !currentQuestion || isSubmitting || isFinished) return;
    setIsSubmitting(true);
    try {
      // Send fallback rating 3 or dummy answer; server treats timed-out answers with rw=0
      const fallbackAnswer =
        currentQuestion.type === 'SELF_REPORT'
          ? { rating: selectedRating ?? 3 }
          : { option_id: selectedOptionId ?? currentQuestion.options[0]?.id };

      const res = await api.submitAnswer(attemptId, {
        question_id: currentQuestion.question_id,
        answer: fallbackAnswer
      });

      if (res.is_completed) {
        setIsFinished(true);
        await handleFinalSubmit(attemptId);
      } else {
        await loadQuestion(attemptId);
      }
    } catch {
      // If error, reload question state
      loadQuestion(attemptId);
    } finally {
      setIsSubmitting(false);
    }
  }, [attemptId, currentQuestion, isSubmitting, isFinished, selectedRating, selectedOptionId]);

  // Called when 25-minute total assessment expires
  const handleAssessmentTimeout = useCallback(async () => {
    if (!attemptId || isFinished) return;
    setIsFinished(true);
    await handleFinalSubmit(attemptId);
  }, [attemptId, isFinished]);

  const handleFinalSubmit = async (aid: string) => {
    setIsLoading(true);
    try {
      const outcome = await api.submitAttempt(aid);
      if (outcome.status === 'SCORED') {
        navigate('/result', { state: { outcome } });
      } else {
        navigate('/incomplete', { state: { outcome } });
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error submitting assessment attempt.');
      }
      setIsLoading(false);
    }
  };

  if (isLoading && !currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <RefreshCw className="spin" size={40} style={{ color: '#4f46e5', marginBottom: '1rem' }} />
        <h2>Loading your assessment question...</h2>
        <p style={{ color: '#64748b' }}>Connecting with MindBridge server</p>
      </div>
    );
  }

  if (error && !currentQuestion) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
        <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem auto' }} />
        <h2 style={{ marginBottom: '0.5rem' }}>Unable to Load Question</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
        <button type="button" className="btn btn-primary" onClick={initAttempt}>
          <RefreshCw size={18} />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  const isLastQuestion = currentQuestion.index >= currentQuestion.total;

  return (
    <div className="assessment-shell">
      {/* Header with Timers and Progress */}
      <div className="assessment-header">
        <TimerDisplay
          questionRemainingSec={currentQuestion.question_remaining_seconds}
          assessmentRemainingSec={currentQuestion.assessment_remaining_seconds}
          onQuestionTimeout={handleQuestionTimeout}
          onAssessmentTimeout={handleAssessmentTimeout}
        />
        <ProgressBar
          currentIndex={currentQuestion.index}
          totalQuestions={currentQuestion.total}
        />
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div>{error}</div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="question-card">
        <span className={`question-type-badge ${currentQuestion.type === 'SELF_REPORT' ? 'self-report' : 'scenario'}`}>
          {currentQuestion.type === 'SELF_REPORT' ? 'Preference Statement' : 'Learning Scenario'}
        </span>

        <h1 className="question-prompt">{currentQuestion.prompt}</h1>

        {/* Renderer by Question Type */}
        {currentQuestion.type === 'SELF_REPORT' ? (
          <LikertQuestion
            ratingScale={currentQuestion.rating_scale}
            selectedRating={selectedRating}
            onSelectRating={(r) => {
              setSelectedRating(r);
              setError(null);
            }}
            disabled={isSubmitting}
          />
        ) : (
          <ScenarioQuestion
            options={currentQuestion.options}
            selectedOptionId={selectedOptionId}
            onSelectOption={(oid) => {
              setSelectedOptionId(oid);
              setError(null);
            }}
            disabled={isSubmitting}
          />
        )}

        {/* Bottom Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleNextAnswer}
            disabled={
              isSubmitting ||
              (currentQuestion.type === 'SELF_REPORT' && selectedRating === null) ||
              (currentQuestion.type === 'SCENARIO' && selectedOptionId === null)
            }
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : isLastQuestion ? (
              <>
                <span>Complete Assessment</span>
                <Send size={20} />
              </>
            ) : (
              <>
                <span>Next Question</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
