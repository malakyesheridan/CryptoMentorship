'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  HelpCircle, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Send
} from 'lucide-react'
import { submitQuiz } from '@/lib/actions/learning'
import { validateQuizQuestions, validateQuizAnswers, type QuizQuestion, type QuizAnswer } from '@/lib/schemas/learning'

interface QuizProps {
  lessonId: string
  questions: QuizQuestion[]
  passPct: number
  existingSubmission?: {
    scorePct: number
    passed: boolean
    answers: string
  }
}

export function QuizComponent({ lessonId, questions, passPct, existingSubmission }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{
    scorePct: number
    passed: boolean
    correctAnswers: number
    totalQuestions: number
  } | null>(null)

  const handleAnswerChange = (questionId: string, optionIndex: number, checked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[questionId] || []
      if (checked) {
        return {
          ...prev,
          [questionId]: [...currentAnswers, optionIndex]
        }
      } else {
        return {
          ...prev,
          [questionId]: currentAnswers.filter(i => i !== optionIndex)
        }
      }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const answersArray: QuizAnswer[] = Object.entries(answers).map(([qId, selectedIndexes]) => ({
        qId,
        selectedIndexes
      }))

      const answersRecord = answersArray.reduce<Record<string, number[]>>((acc, entry) => {
        acc[entry.qId] = entry.selectedIndexes
        return acc
      }, {})

      const response = await submitQuiz({
        lessonId,
        answers: answersRecord,
      })

      if (response.ok) {
        setResult({
          scorePct: response.scorePct ?? 100,
          passed: response.passed ?? true,
          correctAnswers: answersArray.length,
          totalQuestions: answersArray.length,
        })
      }
    } catch (error) {
      console.error('Error submitting quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetake = () => {
    setAnswers({})
    setResult(null)
  }

  if (existingSubmission) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold-600" />
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border ${
            existingSubmission.passed 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {existingSubmission.passed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                existingSubmission.passed ? 'text-green-800' : 'text-red-800'
              }`}>
                {existingSubmission.passed ? 'Quiz Passed!' : 'Quiz Failed'}
              </span>
            </div>
            <p className={`text-sm ${
              existingSubmission.passed ? 'text-green-700' : 'text-red-700'
            }`}>
              Score: {existingSubmission.scorePct}% (Required: {passPct}%)
            </p>
            {!existingSubmission.passed && (
              <p className="text-sm text-red-600 mt-2">
                You can retake the quiz to pass and complete this lesson.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (result) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-gold-600" />
            Quiz Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border ${
            result.passed 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {result.passed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                result.passed ? 'text-green-800' : 'text-red-800'
              }`}>
                {result.passed ? 'Quiz Passed!' : 'Quiz Failed'}
              </span>
            </div>
            <p className={`text-sm ${
              result.passed ? 'text-green-700' : 'text-red-700'
            }`}>
              Score: {result.scorePct}% ({result.correctAnswers}/{result.totalQuestions} correct)
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Required to pass: {passPct}%
            </p>
            
            {!result.passed && (
              <div className="mt-4">
                <Button onClick={handleRetake} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-gold-600" />
          Quiz
        </CardTitle>
        <CardDescription>
          Answer all questions to complete this lesson. You need {passPct}% to pass.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <h4 className="font-medium text-slate-900">
                {index + 1}. {question.prompt}
              </h4>
              
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={(answers[question.id] || []).includes(optionIndex)}
                      onChange={(e) => handleAnswerChange(question.id, optionIndex, e.target.checked)}
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-slate-300 rounded"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {Object.keys(answers).length} of {questions.length} questions answered
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(answers).length !== questions.length}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
