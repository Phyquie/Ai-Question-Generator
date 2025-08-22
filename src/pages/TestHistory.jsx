import React, { useState, useEffect } from 'react';

const TestHistory = ({ onNavigateBack }) => {
  const [testAttempts, setTestAttempts] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);

  useEffect(() => {
    loadTestHistory();
  }, []);

  const loadTestHistory = () => {
    try {
      const stored = localStorage.getItem('testAttempts');
      if (stored) {
        const attempts = JSON.parse(stored);
        // Sort by timestamp, newest first
        attempts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setTestAttempts(attempts);
      }
    } catch (error) {
      console.error('Failed to load test history:', error);
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all test history?')) {
      localStorage.removeItem('testAttempts');
      setTestAttempts([]);
      setSelectedTest(null);
    }
  };

  const deleteTest = (testId) => {
    if (confirm('Are you sure you want to delete this test attempt?')) {
      const updatedAttempts = testAttempts.filter(test => test.id !== testId);
      localStorage.setItem('testAttempts', JSON.stringify(updatedAttempts));
      setTestAttempts(updatedAttempts);
      if (selectedTest && selectedTest.id === testId) {
        setSelectedTest(null);
      }
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'poor';
  };

  if (selectedTest) {
    return (
      <div className="test-history">
        <div className="history-header">
          <button className="back-btn" onClick={() => setSelectedTest(null)}>
            ← Back to History
          </button>
          <h1>Test Details</h1>
          <button className="home-btn" onClick={onNavigateBack}>
            Home
          </button>
        </div>

        <div className="test-detail">
          <div className="test-summary">
            <div className="summary-header">
              <h2>Test Results</h2>
              <div className="test-date">
                {new Date(selectedTest.timestamp).toLocaleString()}
              </div>
            </div>

            <div className="summary-stats">
              <div className={`score-display ${getScoreColor(selectedTest.score)}`}>
                <div className="score-value">{selectedTest.score}%</div>
                <div className="score-label">Overall Score</div>
              </div>

              <div className="stats-grid">
                <div className="stat">
                  <div className="stat-value">{selectedTest.correctAnswers}</div>
                  <div className="stat-label">Correct</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{selectedTest.totalQuestions - selectedTest.correctAnswers}</div>
                  <div className="stat-label">Incorrect</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{formatTime(selectedTest.timeTaken)}</div>
                  <div className="stat-label">Time Taken</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{selectedTest.totalQuestions}</div>
                  <div className="stat-label">Total Questions</div>
                </div>
              </div>

              {selectedTest.autoSubmitted && (
                <div className="auto-submit-badge">
                  ⚠️ Auto-submitted (time expired or window closed)
                </div>
              )}
            </div>
          </div>

          <div className="detailed-review">
            <h3>Question by Question Review</h3>
            <div className="questions-list">
              {selectedTest.detailedResults.map((result, index) => (
                <div key={index} className={`question-review ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                  <div className="question-header">
                    <span className="question-num">Question {index + 1}</span>
                    <span className={`result-badge ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                      {result.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  
                  <div className="question-content">
                    <p className="question-text">{result.question}</p>
                    
                    <div className="answers">
                      <div className="answer-row">
                        <span className="answer-label">Your Answer:</span>
                        <span className={`answer-text ${result.isCorrect ? 'correct' : 'incorrect'}`}>
                          {result.userAnswer}
                        </span>
                      </div>
                      
                      {!result.isCorrect && (
                        <div className="answer-row">
                          <span className="answer-label">Correct Answer:</span>
                          <span className="answer-text correct">{result.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="explanation">
                      <strong>Explanation:</strong> {result.explanation}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="test-history">
      <div className="history-header">
        <button className="back-btn" onClick={onNavigateBack}>
          ← Back to Home
        </button>
        <h1>Test History</h1>
        {testAttempts.length > 0 && (
          <button className="clear-btn" onClick={clearHistory}>
            Clear All
          </button>
        )}
      </div>

      {testAttempts.length === 0 ? (
        <div className="empty-history">
          <div className="empty-icon">📊</div>
          <h2>No Test History</h2>
          <p>You haven't taken any tests yet. Upload a document to start your first test!</p>
        </div>
      ) : (
        <div className="history-content">
          <div className="history-stats">
            <div className="stat-card">
              <div className="stat-number">{testAttempts.length}</div>
              <div className="stat-label">Tests Taken</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.round(testAttempts.reduce((sum, test) => sum + test.score, 0) / testAttempts.length)}%
              </div>
              <div className="stat-label">Average Score</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">
                {Math.max(...testAttempts.map(test => test.score))}%
              </div>
              <div className="stat-label">Best Score</div>
            </div>
          </div>

          <div className="tests-grid">
            {testAttempts.map((test, index) => (
              <div key={test.id} className="test-card">
                <div className="card-header">
                  <div className="test-number">Test #{testAttempts.length - index}</div>
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTest(test.id);
                    }}
                  >
                    ×
                  </button>
                </div>
                
                <div className="card-content" onClick={() => setSelectedTest(test)}>
                  <div className={`score ${getScoreColor(test.score)}`}>
                    {test.score}%
                  </div>
                  
                  <div className="test-info">
                    <div className="info-row">
                      <span>{test.correctAnswers}/{test.totalQuestions} correct</span>
                    </div>
                    <div className="info-row">
                      <span>Time: {formatTime(test.timeTaken)}</span>
                    </div>
                    <div className="info-row date">
                      {new Date(test.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {test.autoSubmitted && (
                    <div className="auto-submit-indicator">Auto-submitted</div>
                  )}
                </div>
                
                <div className="card-footer">
                  <button className="view-btn">View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestHistory;
