import React, { useState, useRef, useEffect } from 'react';
import { generateQuestions } from '../gemini.js';

const PdfUploadLanding = ({ onNavigateBack }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState('');
  const fileInputRef = useRef(null);
  
  // Test-related states
  const [showTest, setShowTest] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [isTestCompleted, setIsTestCompleted] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const timerRef = useRef(null);
  const testStartTime = useRef(null);

  // Improved PDF text extraction with better filtering
  const tryExtractPDFText = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const arrayBuffer = e.target.result;
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to string for pattern matching
          const pdfContent = new TextDecoder('latin1').decode(uint8Array);
          let extractedText = '';
          
          // Method 1: Extract from stream objects (most common for text)
          const streamPattern = /stream\s*([\s\S]*?)\s*endstream/gi;
          const streamMatches = pdfContent.match(streamPattern);
          
          if (streamMatches) {
            streamMatches.forEach(match => {
              let streamContent = match.replace(/^stream\s*/i, '').replace(/\s*endstream$/i, '');
              
              // Try to decode if it's not compressed
              if (!streamContent.includes('FlateDecode') && !streamContent.includes('Filter')) {
                // Look for text commands in PDF streams
                const textPattern = /\((.*?)\)\s*Tj/g;
                const textMatches = streamContent.match(textPattern);
                if (textMatches) {
                  textMatches.forEach(textMatch => {
                    const text = textMatch.replace(/^\(/, '').replace(/\)\s*Tj$/, '');
                    if (text.length > 2 && /[a-zA-Z]/.test(text)) {
                      extractedText += text + ' ';
                    }
                  });
                }
                
                // Also look for simple text patterns
                const simpleTextPattern = /[A-Za-z][A-Za-z\s]{5,}/g;
                const simpleMatches = streamContent.match(simpleTextPattern);
                if (simpleMatches) {
                  simpleMatches.forEach(match => {
                    if (!match.includes('endobj') && !match.includes('Filter') && !match.includes('Length')) {
                      extractedText += match + ' ';
                    }
                  });
                }
              }
            });
          }
          
          // Method 2: Look for text outside of streams (sometimes text is stored directly)
          const directTextPattern = /\((.*?)\)/g;
          const directMatches = pdfContent.match(directTextPattern);
          if (directMatches) {
            directMatches.forEach(match => {
              const text = match.replace(/^\(/, '').replace(/\)$/, '');
              // Filter out PDF commands and metadata
              if (text.length > 5 && 
                  /[a-zA-Z]{3,}/.test(text) && 
                  !text.includes('endobj') && 
                  !text.includes('Filter') && 
                  !text.includes('FlateDecode') &&
                  !text.includes('Length') &&
                  !text.includes('stream') &&
                  !text.includes('/Type') &&
                  !text.includes('/Font') &&
                  !text.match(/^\d+\s+\d+\s+obj/)) {
                extractedText += text + ' ';
              }
            });
          }
          
          // Method 3: Look for readable text sequences in the binary data
          let textBuffer = '';
          for (let i = 0; i < uint8Array.length; i++) {
            const char = uint8Array[i];
            if (char >= 32 && char <= 126) { // Printable ASCII
              textBuffer += String.fromCharCode(char);
            } else if (char === 10 || char === 13) { // Newlines
              textBuffer += ' ';
            } else {
              // Process accumulated text if it's substantial
              if (textBuffer.length > 10) {
                const words = textBuffer.trim().split(/\s+/);
                const validWords = words.filter(word => 
                  word.length > 2 && 
                  /^[a-zA-Z]/.test(word) &&
                  !word.includes('endobj') &&
                  !word.includes('Filter') &&
                  !word.includes('FlateDecode') &&
                  !word.includes('Length') &&
                  !word.includes('stream')
                );
                if (validWords.length > 2) {
                  extractedText += textBuffer + ' ';
                }
              }
              textBuffer = '';
            }
          }
          
          // Final cleanup and validation
          if (extractedText.trim()) {
            // Remove PDF-specific patterns that might have slipped through
            extractedText = extractedText
              .replace(/\b\d+\s+\d+\s+obj\b/g, '')
              .replace(/\bendobj\b/g, '')
              .replace(/\bFilter\s+FlateDecode\b/g, '')
              .replace(/\bLength\s+\d+\b/g, '')
              .replace(/\bstream\b/g, '')
              .replace(/\bendstream\b/g, '')
              .replace(/\b\/Type\b/g, '')
              .replace(/\b\/Font\b/g, '')
              .replace(/\b\/Page\b/g, '')
              .replace(/\bxref\b/g, '')
              .replace(/\btrailer\b/g, '')
              .replace(/\bstartxref\b/g, '')
              .replace(/%%EOF/g, '')
              .replace(/\s{2,}/g, ' ') // Multiple spaces to single space
              .replace(/(.)\1{4,}/g, '$1$1') // Remove excessive repeated characters
              .trim();
            
            // Filter out lines that are mostly numbers or PDF metadata
            const lines = extractedText.split(/[.!?]+/).filter(line => {
              const words = line.trim().split(/\s+/);
              if (words.length < 3) return false;
              
              const textWords = words.filter(word => 
                /^[a-zA-Z]+$/.test(word) && 
                word.length > 2
              );
              
              // Keep lines that have at least 50% real words
              return textWords.length / words.length >= 0.5;
            });
            
            extractedText = lines.join('. ').trim();
          }
          
          resolve(extractedText);
        } catch (error) {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  };

  // Extract text from PDF using improved browser-based approach
  const extractTextFromPDF = async (file) => {
    setIsProcessing(true);
    setUploadProgress(0);
    setError(null);
    
    try {
      setUploadProgress(20);
      
      // Try to use improved PDF reading
      const text = await tryExtractPDFText(file);
      
      setUploadProgress(80);
      
      if (text && text.trim().length > 50) {
        const cleanText = text
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\s{2,}/g, ' ')
          .trim();

        setExtractedText(cleanText);
        setUploadProgress(100);
        setError(null);
      } else {
        // Fallback: Show instructions for manual text input
        setError(`⚠️ PDF Text Extraction Issue

The PDF appears to contain:
• Compressed/encoded content that requires special decoding
• Scanned images instead of selectable text
• Complex formatting that's difficult to parse
• Password protection or encryption

💡 Quick Solutions:
1. Try opening your PDF and copying the text manually (Ctrl+A, Ctrl+C)
2. Use a simpler PDF without complex formatting
3. Try the demo content below to test the system

Paste your content in the text area below:`);
        
        // Show a text area for manual input
        setShowManualInput(true);
        setUploadProgress(100);
      }
      
    } catch (err) {
      console.error('Error extracting text from PDF:', err);
      setError(`❌ PDF Processing Failed

This could be due to:
• Unsupported PDF format or version
• File corruption during upload
• Browser compatibility limitations
• Complex PDF structure

🔄 Try These Solutions:
1. Use the demo content below to test the system
2. Copy text manually from your PDF viewer
3. Try a different PDF file
4. Convert your PDF to a simpler format

Use the text area below to paste your content:`);
      setShowManualInput(true);
      setUploadProgress(100);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setShowManualInput(false);
      extractTextFromPDF(file);
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleManualTextSubmit = () => {
    if (manualText.trim().length > 100) {
      setExtractedText(manualText.trim());
      setShowManualInput(false);
      setError(null);
    } else {
      setError('Please enter at least 100 characters of text to generate a meaningful test.');
    }
  };

  const useDemoText = () => {
    const demoText = `
    Introduction to Machine Learning

    Machine Learning (ML) is a subset of artificial intelligence (AI) that focuses on the development of computer systems that can learn and adapt without following explicit instructions. Instead of being explicitly programmed to perform a task, machine learning systems use algorithms and statistical models to analyze and draw inferences from patterns in data.

    Types of Machine Learning:

    1. Supervised Learning: This type of learning uses labeled training data to learn a mapping function from input variables to output variables. Examples include classification and regression problems. Common algorithms include linear regression, decision trees, and support vector machines.

    2. Unsupervised Learning: This involves learning patterns from data without labeled examples. The system tries to learn the underlying structure of the data. Examples include clustering, association rule learning, and dimensionality reduction. K-means clustering and principal component analysis are popular techniques.

    3. Reinforcement Learning: This is about taking suitable actions to maximize reward in a particular situation. The algorithm learns through trial and error by interacting with an environment. It's commonly used in robotics, gaming, and navigation systems.

    Applications of Machine Learning:
    - Image and speech recognition
    - Natural language processing
    - Recommendation systems
    - Fraud detection
    - Autonomous vehicles
    - Medical diagnosis
    - Financial trading
    - Weather forecasting

    Key Concepts:
    Training Data: The dataset used to teach the machine learning algorithm
    Features: Individual measurable properties of observed phenomena
    Model: The mathematical representation of a real-world process
    Algorithm: The method used to build the model
    Prediction: The output of the model when given new data

    The field of machine learning continues to evolve rapidly, with new techniques and applications being developed constantly. Deep learning, a subset of machine learning based on neural networks, has been particularly successful in recent years for tasks involving image recognition, natural language processing, and game playing.
    `;
    
    setExtractedText(demoText.trim());
    setShowManualInput(false);
    setError(null);
  };

  const navigateToTest = async () => {
    if (!extractedText.trim()) {
      setError('No text available to generate test. Please upload a PDF or enter text manually.');
      return;
    }

    if (extractedText.trim().length < 100) {
      setError('Text is too short to generate a meaningful test. Please provide more content.');
      return;
    }

    setIsLoadingQuestions(true);
    try {
      const generatedQuestions = await generateQuestions(extractedText);
      setQuestions(generatedQuestions);
      setShowTest(true);
      enterFullscreen();
      startTimer();
      testStartTime.current = new Date();
    } catch (err) {
      setError('Failed to generate questions. Please try again.');
      console.error('Question generation error:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Test functions
  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      document.body.style.overflow = 'hidden';
      document.body.classList.add('test-mode');
    } catch (error) {
      console.log('Fullscreen not supported or denied');
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          submitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const submitTest = (autoSubmit = false) => {
    if (isTestCompleted) return;
    
    clearInterval(timerRef.current);
    setIsTestCompleted(true);
    
    const endTime = new Date();
    const timeTaken = Math.round((endTime - testStartTime.current) / 1000);
    
    // Calculate results
    let correctCount = 0;
    let totalQuestions = questions.length;
    
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        correctCount++;
      }
    });
    
    const results = {
      totalQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: totalQuestions - correctCount,
      score: Math.round((correctCount / totalQuestions) * 100),
      timeTaken,
      autoSubmitted: autoSubmit,
      submissionTime: endTime.toISOString(),
      answers: selectedAnswers
    };
    
    setTestResults(results);
    
    // Save to localStorage
    const existingHistory = JSON.parse(localStorage.getItem('testHistory') || '[]');
    existingHistory.push({
      ...results,
      testDate: endTime.toLocaleDateString(),
      testTime: endTime.toLocaleTimeString()
    });
    localStorage.setItem('testHistory', JSON.stringify(existingHistory));
    
    setShowResults(true);
    
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
    document.body.style.overflow = '';
    document.body.classList.remove('test-mode');
  };

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const restartTest = () => {
    setShowTest(false);
    setShowResults(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setTimeRemaining(15 * 60);
    setIsTestCompleted(false);
    setTestResults(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      {showResults ? (
        // Results Display
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              background: testResults.score >= 70 ? 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)' : 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '10px'
            }}>
              Test Completed! 🎉
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#666' }}>
              {testResults.autoSubmitted ? 'Auto-submitted due to time limit' : 'Successfully submitted'}
            </p>
          </div>

          {/* Score Display */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '40px'
          }}>
            <div style={{
              background: testResults.score >= 70 ? '#f0fff4' : '#fff5f5',
              border: `2px solid ${testResults.score >= 70 ? '#9ae6b4' : '#fed7d7'}`,
              borderRadius: '15px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: testResults.score >= 70 ? '#2f855a' : '#c53030', fontSize: '3rem', margin: '0 0 10px 0' }}>
                {testResults.score}%
              </h3>
              <p style={{ color: '#666', margin: '0' }}>Overall Score</p>
            </div>
            
            <div style={{
              background: '#f8f9ff',
              border: '2px solid #cbd5e0',
              borderRadius: '15px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#4a5568', fontSize: '2rem', margin: '0 0 10px 0' }}>
                {testResults.correctAnswers}/{testResults.totalQuestions}
              </h3>
              <p style={{ color: '#666', margin: '0' }}>Correct Answers</p>
            </div>
            
            <div style={{
              background: '#f8f9ff',
              border: '2px solid #cbd5e0',
              borderRadius: '15px',
              padding: '20px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#4a5568', fontSize: '2rem', margin: '0 0 10px 0' }}>
                {formatTime(testResults.timeTaken)}
              </h3>
              <p style={{ color: '#666', margin: '0' }}>Time Taken</p>
            </div>
          </div>

          {/* Performance Analysis */}
          <div style={{
            background: '#f8f9ff',
            borderRadius: '15px',
            padding: '30px',
            marginBottom: '30px'
          }}>
            <h3 style={{ color: '#4a5568', marginBottom: '20px' }}>Performance Analysis</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div>
                <h4 style={{ color: '#2d3748', marginBottom: '10px' }}>Grade: {testResults.score >= 90 ? 'A+' : testResults.score >= 80 ? 'A' : testResults.score >= 70 ? 'B' : testResults.score >= 60 ? 'C' : 'Need Improvement'}</h4>
                <p style={{ color: '#718096', fontSize: '14px' }}>
                  {testResults.score >= 90 ? 'Outstanding performance!' : 
                   testResults.score >= 80 ? 'Excellent work!' :
                   testResults.score >= 70 ? 'Good job!' :
                   testResults.score >= 60 ? 'Satisfactory, but room for improvement.' :
                   'Consider reviewing the material and retaking the test.'}
                </p>
              </div>
              <div>
                <h4 style={{ color: '#2d3748', marginBottom: '10px' }}>Time Management</h4>
                <p style={{ color: '#718096', fontSize: '14px' }}>
                  {testResults.timeTaken < 600 ? 'Completed quickly - great efficiency!' :
                   testResults.timeTaken < 900 ? 'Good time management.' :
                   'Used most of the allotted time.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={restartTest}
              style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              🔄 Take Another Test
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '15px 30px',
                backgroundColor: '#f8f9fa',
                color: '#495057',
                border: '2px solid #dee2e6',
                borderRadius: '10px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      ) : showTest ? (
        // Test Interface
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #1a202c 0%, #2d3748 100%)',
          padding: '20px',
          color: 'white'
        }}>
          {/* Test Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
            padding: '20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '15px'
          }}>
            <div>
              <h2 style={{ margin: '0', fontSize: '1.5rem' }}>AI Generated Test</h2>
              <p style={{ margin: '5px 0 0 0', opacity: '0.8' }}>
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '2rem',
                fontWeight: 'bold',
                color: timeRemaining < 300 ? '#f56565' : '#48bb78'
              }}>
                {formatTime(timeRemaining)}
              </div>
              <p style={{ margin: '5px 0 0 0', opacity: '0.8', fontSize: '14px' }}>
                Time Remaining
              </p>
            </div>
          </div>

          {questions.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 300px',
              gap: '30px',
              height: 'calc(100vh - 200px)'
            }}>
              {/* Question Area */}
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '40px',
                overflow: 'auto'
              }}>
                <h3 style={{
                  fontSize: '1.4rem',
                  marginBottom: '30px',
                  lineHeight: '1.6'
                }}>
                  {questions[currentQuestionIndex]?.question}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {questions[currentQuestionIndex]?.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(currentQuestionIndex, index)}
                      style={{
                        padding: '20px',
                        borderRadius: '12px',
                        border: selectedAnswers[currentQuestionIndex] === index ? 
                          '3px solid #48bb78' : '2px solid rgba(255,255,255,0.3)',
                        background: selectedAnswers[currentQuestionIndex] === index ? 
                          'rgba(72, 187, 120, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: 'white',
                        fontSize: '16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px'
                      }}
                    >
                      <span style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: selectedAnswers[currentQuestionIndex] === index ? 
                          '#48bb78' : 'rgba(255,255,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      {option}
                    </button>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '40px'
                }}>
                  <button
                    onClick={previousQuestion}
                    disabled={currentQuestionIndex === 0}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: currentQuestionIndex === 0 ? 
                        'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                      color: currentQuestionIndex === 0 ? 'rgba(255,255,255,0.4)' : 'white',
                      cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    ← Previous
                  </button>

                  <button
                    onClick={() => submitTest(false)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#f56565',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    Submit Test
                  </button>

                  <button
                    onClick={nextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      background: currentQuestionIndex === questions.length - 1 ? 
                        'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                      color: currentQuestionIndex === questions.length - 1 ? 'rgba(255,255,255,0.4)' : 'white',
                      cursor: currentQuestionIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Question Navigation Sidebar */}
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '20px',
                padding: '30px',
                overflow: 'auto'
              }}>
                <h4 style={{ marginBottom: '20px', textAlign: 'center' }}>Question Navigation</h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, 1fr)',
                  gap: '10px',
                  marginBottom: '30px'
                }}>
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToQuestion(index)}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 
                          index === currentQuestionIndex ? '#667eea' :
                          selectedAnswers[index] !== undefined ? '#48bb78' :
                          'rgba(255,255,255,0.2)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                      }}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div style={{ fontSize: '12px', opacity: '0.8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '20px', height: '20px', background: '#667eea', borderRadius: '4px' }}></div>
                    <span>Current</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '20px', height: '20px', background: '#48bb78', borderRadius: '4px' }}></div>
                    <span>Answered</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '20px', height: '20px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }}></div>
                    <span>Unanswered</span>
                  </div>
                </div>

                {/* Progress */}
                <div style={{ marginTop: '30px' }}>
                  <p style={{ fontSize: '14px', marginBottom: '10px' }}>
                    Progress: {Object.keys(selectedAnswers).length}/{questions.length}
                  </p>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${(Object.keys(selectedAnswers).length / questions.length) * 100}%`,
                      height: '100%',
                      background: '#48bb78',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Upload Interface (existing code)
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '10px'
          }}>
            AI Test Generator
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#666',
            margin: '0'
          }}>
            Upload your PDF to generate an intelligent test with 30 MCQ questions
          </p>
        </div>

        {/* Back Button */}
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f8f9fa',
              border: '2px solid #dee2e6',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ← Back to Home
          </button>
        )}

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `3px dashed ${isDragOver ? '#667eea' : '#ddd'}`,
            borderRadius: '15px',
            padding: '60px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragOver ? '#f8f9ff' : '#fafafa',
            transition: 'all 0.3s ease',
            marginBottom: '30px'
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>📄</div>
          <h3 style={{ color: '#333', marginBottom: '10px' }}>
            {selectedFile ? selectedFile.name : 'Drop your PDF here or click to browse'}
          </h3>
          <p style={{ color: '#666', margin: '0' }}>
            Supports PDF files with selectable text
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".pdf"
            style={{ display: 'none' }}
          />
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div style={{
            background: '#f8f9ff',
            border: '1px solid #667eea',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '1.5rem',
              marginBottom: '15px'
            }}>🔄</div>
            <h4 style={{ color: '#667eea', marginBottom: '10px' }}>
              Processing your PDF...
            </h4>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '10px'
            }}>
              <div style={{
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#667eea',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
            <p style={{ color: '#666', margin: '0' }}>
              Extracting text and preparing for AI analysis...
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div style={{
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.5rem' }}>⚠️</span>
              <div>
                <h4 style={{ color: '#c53030', marginBottom: '10px' }}>
                  Processing Error
                </h4>
                <p style={{ color: '#744c5e', margin: '0' }}>
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Text Input */}
        {showManualInput && (
          <div style={{
            background: '#f8f9ff',
            border: '1px solid #667eea',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <h4 style={{ color: '#667eea', marginBottom: '15px' }}>
              📝 Enter Text Manually
            </h4>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Copy and paste the text from your PDF document below:
            </p>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste your text content here... (minimum 100 characters)"
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '15px',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                marginBottom: '15px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                color: manualText.length < 100 ? '#e53e3e' : '#38a169',
                fontSize: '14px'
              }}>
                {manualText.length} characters (minimum 100 required)
              </span>
              <button
                onClick={handleManualTextSubmit}
                disabled={manualText.length < 100}
                style={{
                  padding: '10px 20px',
                  backgroundColor: manualText.length >= 100 ? '#667eea' : '#a0a0a0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: manualText.length >= 100 ? 'pointer' : 'not-allowed',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                Use This Text
              </button>
            </div>
          </div>
        )}

        {/* Extracted Text Preview */}
        {extractedText && (
          <div style={{
            background: '#f0fff4',
            border: '1px solid #9ae6b4',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h4 style={{ color: '#2f855a', marginBottom: '15px' }}>
              ✅ Text Extracted Successfully
            </h4>
            <div style={{
              maxHeight: '200px',
              overflow: 'auto',
              background: 'white',
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              lineHeight: '1.6',
              color: '#4a5568'
            }}>
              {extractedText.substring(0, 500)}
              {extractedText.length > 500 && '...'}
            </div>
            <p style={{
              color: '#2f855a',
              fontSize: '14px',
              margin: '10px 0 0 0'
            }}>
              {extractedText.split(' ').length} words extracted • Ready for AI processing
            </p>
          </div>
        )}

        {/* Question Generation Loading */}
        {isLoadingQuestions && (
          <div style={{
            background: '#f8f9ff',
            border: '1px solid #667eea',
            borderRadius: '10px',
            padding: '30px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '2rem',
              marginBottom: '20px'
            }}>🤖</div>
            <h4 style={{ color: '#667eea', marginBottom: '15px' }}>
              AI is generating your test questions...
            </h4>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e9ecef',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '15px'
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#667eea',
                borderRadius: '4px',
                animation: 'pulse 2s infinite'
              }}></div>
            </div>
            <p style={{ color: '#666', margin: '0', fontSize: '14px' }}>
              This may take a few moments... Please wait while we create 30 intelligent questions based on your content.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {extractedText && (
            <button
              onClick={navigateToTest}
              style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
              }}
            >
              🚀 Start AI Test Generation
            </button>
          )}

          {!extractedText && (
            <button
              onClick={useDemoText}
              style={{
                padding: '15px 30px',
                background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(72, 187, 120, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.4)';
              }}
            >
              📚 Try Demo (Machine Learning Content)
            </button>
          )}

          <button
            onClick={() => {
              setSelectedFile(null);
              setExtractedText('');
              setError(null);
              setShowManualInput(false);
              setManualText('');
              setUploadProgress(0);
            }}
            style={{
              padding: '15px 30px',
              backgroundColor: '#f8f9fa',
              color: '#495057',
              border: '2px solid #dee2e6',
              borderRadius: '10px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#e9ecef';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#f8f9fa';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            🔄 Reset
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          background: '#f8f9ff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          <h4 style={{ color: '#4a5568', marginBottom: '15px' }}>
            📋 How it works:
          </h4>
          <ul style={{
            color: '#718096',
            lineHeight: '1.8',
            paddingLeft: '20px',
            margin: '0'
          }}>
            <li>Upload a PDF file with selectable text content</li>
            <li>Our system extracts and analyzes the text content</li>
            <li>AI generates 30 intelligent multiple-choice questions</li>
            <li>Take a timed 15-minute test in fullscreen mode</li>
            <li>Get detailed results and performance analysis</li>
            <li>Access your test history anytime</li>
          </ul>
        </div>
        </div>
      )}
    </div>
  );
};

export default PdfUploadLanding;
