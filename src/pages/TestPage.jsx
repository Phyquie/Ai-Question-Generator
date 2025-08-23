import React, { useState, useEffect, useRef } from 'react';
import { generateQuestions } from '../gemini.js';

const TestPage = ({ extractedText, onNavigateBack }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const timerRef = useRef(null);
  const testStartTime = useRef(null);

  // Enter fullscreen on component mount
  useEffect(() => {
    
    
    // Add fullscreen styles
    document.body.style.overflow = 'hidden';
    document.body.classList.add('test-mode');
    
    enterFullscreen();

    // Set test start time
    testStartTime.current = new Date();

    // Auto-submit on page unload/visibility change
    const handleBeforeUnload = (e) => {
      if (!isTestCompleted) {
        submitTest(true);
        // Show confirmation dialog
        e.preventDefault();
        e.returnValue = 'Your test will be automatically submitted if you leave. Are you sure?';
        return e.returnValue;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isTestCompleted) {
        console.warn('Tab switched - this may be flagged as suspicious activity');
        // You could implement cheating detection here
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.body.style.overflow = 'auto';
      document.body.classList.remove('test-mode');
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Exit fullscreen on cleanup
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.log);
      }
    };
  }, [isTestCompleted]);

  // Generate questions from extracted text
  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      try {
        const generatedQuestions = await generateQuestions(extractedText);
        setQuestions(generatedQuestions);
      } catch (error) {
        console.error('Failed to generate questions:', error);
        // Use sample questions as fallback
        setQuestions(getSampleQuestions());
      } finally {
        setIsLoading(false);
      }
    };

    if (extractedText) {
      loadQuestions();
    }
  }, [extractedText]);

  // Timer countdown
  useEffect(() => {
    if (!isLoading && questions.length > 0 && !isTestCompleted) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            submitTest(true); // Auto-submit when time runs out
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoading, questions.length, isTestCompleted]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getScoreGrade = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'average';
    if (score >= 60) return 'fair';
    return 'poor';
  };

  const handleAnswerSelect = (optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: optionIndex
    });
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitTest = (autoSubmit = false) => {
    if (isTestCompleted) return;

    const endTime = new Date();
    const timeTaken = Math.round((endTime - testStartTime.current) / 1000);
    
    // Calculate results
    let correctAnswers = 0;
    const detailedResults = questions.map((question, index) => {
      const userAnswer = selectedAnswers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      if (isCorrect) correctAnswers++;
      
      return {
        question: question.question,
        userAnswer: userAnswer !== undefined ? question.options[userAnswer] : 'Not answered',
        correctAnswer: question.options[question.correctAnswer],
        isCorrect,
        explanation: question.explanation
      };
    });

    const score = Math.round((correctAnswers / questions.length) * 100);
    
    const results = {
      totalQuestions: questions.length,
      correctAnswers,
      score,
      timeTaken,
      autoSubmitted: autoSubmit,
      completedAt: endTime.toISOString(),
      detailedResults
    };

    setTestResults(results);
    setIsTestCompleted(true);
    setShowResults(true);

    // Save to localStorage
    saveTestToLocalStorage(results);

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Exit fullscreen
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const saveTestToLocalStorage = (results) => {
    try {
      const existingTests = JSON.parse(localStorage.getItem('testAttempts') || '[]');
      const newTest = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        ...results
      };
      existingTests.push(newTest);
      localStorage.setItem('testAttempts', JSON.stringify(existingTests));
    } catch (error) {
      console.error('Failed to save test results:', error);
    }
  };

  const getSampleQuestions = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      question: `Sample Question ${i + 1}: What is the main concept discussed in the document?`,
      options: [
        "Option A - First choice",
        "Option B - Second choice", 
        "Option C - Third choice",
        "Option D - Fourth choice"
      ],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: `This is the explanation for question ${i + 1}.`
    }));
  };

  if (isLoading) {
    return (
      <div className="test-loading">
        <div className="loading-container">
          <div className="loading-animation">
            <div className="brain-icon">🧠</div>
            <div className="ai-sparks">
              <span className="spark">✨</span>
              <span className="spark">💫</span>
              <span className="spark">⭐</span>
            </div>
          </div>
          
          <div className="loading-content">
            <h2>🤖 AI is Generating Your Test</h2>
            <p className="loading-subtitle">Analyzing your content and creating personalized questions...</p>
            
            <div className="loading-steps">
              <div className="step active">
                <span className="step-icon">📖</span>
                <span className="step-text">Reading your content</span>
              </div>
              <div className="step active">
                <span className="step-icon">🔍</span>
                <span className="step-text">Identifying key concepts</span>
              </div>
              <div className="step active">
                <span className="step-icon">❓</span>
                <span className="step-text">Generating 30 questions</span>
              </div>
              <div className="step">
                <span className="step-icon">✅</span>
                <span className="step-text">Ready to start!</span>
              </div>
            </div>
            
            <div className="loading-progress">
              <div className="progress-spinner"></div>
              <p className="progress-text">This may take a few moments...</p>
            </div>
            
            <div className="loading-tips">
              <h4>💡 Test Tips:</h4>
              <ul>
                <li>Read each question carefully</li>
                <li>You have 15 minutes to complete all 30 questions</li>
                <li>Navigate freely between questions</li>
                <li>Test will auto-submit when time expires</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResults && testResults) {
    return (
      <div className="test-results">
        <div className="results-header">
          <div className="header-content">
            <h1>🎉 Test Completed!</h1>
            {testResults.autoSubmitted && (
              <p className="auto-submit-notice">⚠️ Test was automatically submitted due to time expiry or window close</p>
            )}
            <div className="completion-time">
              Completed on {new Date(testResults.completedAt).toLocaleDateString()} at{' '}
              {new Date(testResults.completedAt).toLocaleTimeString()}
            </div>
          </div>
        </div>
        
        <div className="results-summary">
          <div className="score-section">
            <div className={`score-card ${getScoreGrade(testResults.score)}`}>
              <div className="score-value">{testResults.score}%</div>
              <div className="score-grade">{getScoreGrade(testResults.score).toUpperCase()}</div>
            </div>
            <div className="score-breakdown">
              <div className="breakdown-item correct">
                <span className="icon">✅</span>
                <span className="count">{testResults.correctAnswers}</span>
                <span className="label">Correct</span>
              </div>
              <div className="breakdown-item incorrect">
                <span className="icon">❌</span>
                <span className="count">{testResults.totalQuestions - testResults.correctAnswers}</span>
                <span className="label">Incorrect</span>
              </div>
            </div>
          </div>
          
          <div className="performance-stats">
            <div className="stat-group">
              <h3>Performance Metrics</h3>
              <div className="stats-grid">
                <div className="stat">
                  <span className="stat-icon">⏱️</span>
                  <div className="stat-content">
                    <div className="stat-value">{formatTime(testResults.timeTaken)}</div>
                    <div className="stat-label">Time Taken</div>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon">⚡</span>
                  <div className="stat-content">
                    <div className="stat-value">{Math.round(testResults.timeTaken / testResults.totalQuestions)}s</div>
                    <div className="stat-label">Avg per Question</div>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon">📊</span>
                  <div className="stat-content">
                    <div className="stat-value">{Math.round((testResults.correctAnswers / testResults.totalQuestions) * 100)}%</div>
                    <div className="stat-label">Accuracy</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="results-actions">
          <button className="btn primary large" onClick={() => setShowResults(false)}>
            📝 Review All Answers
          </button>
          <button className="btn secondary" onClick={onNavigateBack}>
            🏠 Back to Home
          </button>
          <button className="btn secondary" onClick={() => window.print()}>
            🖨️ Print Results
          </button>
        </div>

        {!showResults && (
          <div className="detailed-results">
            <div className="results-header">
              <h3>📋 Detailed Answer Review</h3>
              <button className="btn secondary" onClick={() => setShowResults(true)}>
                Back to Summary
              </button>
            </div>
            
            <div className="results-filters">
              <button className="filter-btn active">All Questions</button>
              <button className="filter-btn">Correct Only</button>
              <button className="filter-btn">Incorrect Only</button>
            </div>
            
            {testResults.detailedResults.map((result, index) => (
              <div key={index} className={`question-result ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="question-header">
                  <div className="question-number">
                    <span>Q{index + 1}</span>
                    <span className={`result-icon ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                      {result.isCorrect ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
                
                <div className="question-content">
                  <div className="question-text">{result.question}</div>
                  
                  <div className="answers-section">
                    <div className="answer-row user-answer">
                      <span className="answer-label">Your Answer:</span>
                      <span className={`answer-value ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                        {result.userAnswer}
                      </span>
                    </div>
                    
                    {!result.isCorrect && (
                      <div className="answer-row correct-answer">
                        <span className="answer-label">Correct Answer:</span>
                        <span className="answer-value correct">{result.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="explanation">
                    <div className="explanation-header">💡 Explanation:</div>
                    <div className="explanation-text">{result.explanation}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="test-error">
        <h2>Unable to generate questions</h2>
        <p>Please go back and try again</p>
        <button className="btn primary" onClick={onNavigateBack}>
          Go Back
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="test-container fullscreen-test">
      {/* Test Header */}
      <div className="test-header">
        <div className="test-info">
          <div className="test-title">
            <h1>🧠 AI Generated Knowledge Test</h1>
            <div className="test-subtitle">AI-powered assessment based on your uploaded content</div>
          </div>
          <div className="test-progress">
            <div className="progress-info">
              <span className="current-q">Question {currentQuestionIndex + 1}</span>
              <span className="separator">of</span>
              <span className="total-q">{questions.length}</span>
            </div>
            <div className="answered-info">
              <span className="answered-count">{answeredCount} answered</span>
              <span className="remaining-count">{questions.length - answeredCount} remaining</span>
            </div>
          </div>
        </div>
        
        <div className="timer-section">
          <div className="timer-label">Time Remaining</div>
          <div className={`timer ${timeRemaining < 300 ? 'warning' : timeRemaining < 60 ? 'danger' : ''}`}>
            <div className="timer-icon">⏰</div>
            <div className="timer-text">{formatTime(timeRemaining)}</div>
          </div>
          {timeRemaining < 300 && (
            <div className="timer-warning">⚠️ Less than 5 minutes left!</div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="progress-text">{Math.round(progress)}% Complete</div>
      </div>

      {/* Main Content Area */}
      <div className="test-content">
        {/* Question Section */}
        <div className="question-section">
          <div className="question-header">
            <div className="question-number">
              <span className="q-label">Q</span>
              <span className="q-num">{currentQuestionIndex + 1}</span>
            </div>
            <div className="question-meta">
              <span className="difficulty">📊 AI Generated</span>
            </div>
          </div>
          
          <div className="question-content">
            <h2 className="question-text">{currentQuestion.question}</h2>
          </div>
          
          <div className="options-section">
            <div className="options-header">
              <span>Choose the best answer:</span>
            </div>
            <div className="options-container">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option ${selectedAnswers[currentQuestionIndex] === index ? 'selected' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <div className="option-marker">
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  </div>
                  <div className="option-content">
                    <span className="option-text">{option}</span>
                  </div>
                  <div className="option-check">
                    {selectedAnswers[currentQuestionIndex] === index && <span>✓</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Sidebar */}
        <div className="navigation-sidebar">
          <div className="nav-section">
            <h3>Navigation</h3>
            <div className="nav-buttons">
              <button 
                className="nav-btn prev" 
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <span>←</span> Previous
              </button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <button className="nav-btn submit" onClick={() => submitTest(false)}>
                  Submit Test <span>🚀</span>
                </button>
              ) : (
                <button className="nav-btn next" onClick={nextQuestion}>
                  Next <span>→</span>
                </button>
              )}
            </div>
          </div>

          <div className="question-navigation">
            <div className="nav-header">
              <span>All Questions</span>
              <span className="answered-count">{answeredCount}/{questions.length}</span>
            </div>
            <div className="question-grid">
              {questions.map((_, index) => (
                <button
                  key={index}
                  className={`question-nav-btn ${index === currentQuestionIndex ? 'active' : ''} ${
                    selectedAnswers[index] !== undefined ? 'answered' : ''
                  }`}
                  onClick={() => setCurrentQuestionIndex(index)}
                  title={`Question ${index + 1} ${selectedAnswers[index] !== undefined ? '(Answered)' : '(Not answered)'}`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="actions-header">
              <span>Quick Actions</span>
            </div>
            <div className="action-buttons">
              <button 
                className="action-btn review"
                onClick={() => {
                  const unanswered = questions.findIndex((_, i) => selectedAnswers[i] === undefined);
                  if (unanswered !== -1) setCurrentQuestionIndex(unanswered);
                }}
              >
                📝 Review Unanswered
              </button>
              <button 
                className="action-btn submit-early" 
                onClick={() => {
                  if (confirm('Are you sure you want to submit the test early? You can still change answers until you submit.')) {
                    submitTest(false);
                  }
                }}
              >
                ⚡ Submit Early
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPage;
