import { GoogleGenerativeAI } from '@google/generative-ai';

// Replace with your actual Gemini API key
const apiKey = "AIzaSyCrD0b-qJXCuGVd5oxvcIL8gYeb0NSscHo";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 8000,
    topP: 0.9,
    topK: 40,
  },
});

// Function to generate MCQ questions from text
export async function generateQuestions(text) {
  try {
    const prompt = `You are an expert educational assessment creator. Based on the following text content, generate exactly 30 high-quality multiple choice questions that thoroughly test comprehension, analysis, and application of the material.

Requirements:
- Each question must have exactly 4 options (A, B, C, D) with only one correct answer
- Questions should vary in difficulty: 10 easy, 15 medium, 5 hard
- Cover different cognitive levels: recall, understanding, application, analysis
- Include questions about main concepts, details, implications, and connections
- Make incorrect options plausible but clearly wrong
- Provide clear, educational explanations for correct answers

Text content to analyze:
${text}

Format your response as a valid JSON array where each object has:
- question: Clear, specific question text
- options: Array of 4 answer choices
- correctAnswer: Index (0-3) of the correct option
- explanation: 2-3 sentence explanation of why the answer is correct
- difficulty: "easy", "medium", or "hard"

Example format:
[
  {
    "question": "What is the main argument presented in the text regarding...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "The text explicitly states that... This makes option A correct because...",
    "difficulty": "medium"
  }
]

Generate exactly 30 questions that comprehensively test understanding of the provided content.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text_response = await response.text();
    
    // Clean the response and parse JSON
    let cleanedResponse = text_response.trim();
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/```json\s*/, '').replace(/```\s*$/, '');
    }
    
    const questions = JSON.parse(cleanedResponse);
    
    // Validate that we have exactly 30 questions
    if (questions.length !== 30) {
      console.warn(`Generated ${questions.length} questions instead of 30`);
    }
    
    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    // Return sample questions as fallback
    return getSampleQuestions();
  }
}

// Fallback sample questions
function getSampleQuestions() {
  const sampleQuestions = [
    {
      question: "What is the primary purpose of the document?",
      options: ["To inform readers", "To entertain readers", "To persuade readers", "To confuse readers"],
      correctAnswer: 0,
      explanation: "The document's main purpose is to provide information to the reader.",
      difficulty: "easy"
    },
    {
      question: "Which key concept is emphasized throughout the text?",
      options: ["Historical events", "Scientific principles", "Main theme", "Secondary details"],
      correctAnswer: 2,
      explanation: "The main theme is consistently emphasized throughout the document.",
      difficulty: "medium"
    },
    {
      question: "What can be inferred from the author's tone?",
      options: ["Casual approach", "Professional expertise", "Personal opinion", "Uncertain knowledge"],
      correctAnswer: 1,
      explanation: "The author demonstrates professional expertise through their authoritative tone.",
      difficulty: "hard"
    }
  ];

  // Generate 30 questions by repeating and varying the samples
  return Array.from({ length: 30 }, (_, i) => {
    const base = sampleQuestions[i % 3];
    return {
      ...base,
      question: `Question ${i + 1}: ${base.question}`,
      explanation: `${base.explanation} This is question ${i + 1} of the assessment.`
    };
  });
}

export default { generateQuestions };
