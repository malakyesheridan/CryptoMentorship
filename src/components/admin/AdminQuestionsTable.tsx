'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, ThumbsUp, Clock, CheckCircle, Archive, User, Edit } from 'lucide-react'
import { answerQuestion, archiveQuestion } from '@/lib/actions/questions'
import { timeago } from '@/lib/dates'

interface Question {
  id: string
  body: string
  createdAt: Date
  answeredAt?: Date | null
  answer?: string | null
  answeredBy?: string | null
  archivedAt?: Date | null
  userId: string
  eventId: string
  user: {
    id: string
    name: string | null
    email: string
  }
  _count?: {
    votes: number
  }
  voteCount?: number
}

interface AdminQuestionsTableProps {
  questions: Question[]
  eventId: string
}

export function AdminQuestionsTable({ questions, eventId }: AdminQuestionsTableProps) {
  const [questionsState, setQuestionsState] = useState(questions)
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnswerQuestion = async (questionId: string) => {
    if (!answerText.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await answerQuestion({
        questionId,
        answer: answerText.trim()
      })

      if (result.error) {
        setError(result.error)
      } else if (result.question) {
        setQuestionsState(prev => 
          prev.map(q => q.id === questionId ? result.question! : q)
        )
        setEditingQuestion(null)
        setAnswerText('')
      }
    } catch (err) {
      setError('Failed to answer question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchiveQuestion = async (questionId: string, archived: boolean) => {
    try {
      const result = await archiveQuestion({
        questionId,
        archived
      })

      if (result.error) {
        setError(result.error)
      } else if (result.question) {
        setQuestionsState(prev => 
          prev.map(q => q.id === questionId ? result.question! : q)
        )
      }
    } catch (err) {
      setError('Failed to update question status')
    }
  }

  const getStatusBadge = (question: Question) => {
    if (question.archivedAt) {
      return (
        <Badge variant="outline" className="text-slate-500 border-slate-200">
          <Archive className="h-3 w-3 mr-1" />
          Archived
        </Badge>
      )
    }
    
    if (question.answeredAt) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Answered
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="text-blue-600 border-blue-200">
        <Clock className="h-3 w-3 mr-1" />
        Open
      </Badge>
    )
  }

  if (questionsState.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No questions found</h3>
          <p className="text-slate-500">
            {questions.length === 0 
              ? 'No questions have been submitted for this event yet.'
              : 'No questions match your current filters.'
            }
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Questions List */}
      {questionsState.map((question) => (
        <Card key={question.id} className={`${question.archivedAt ? 'opacity-75' : ''}`}>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Question Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-800 mb-2 font-medium">{question.body}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {question.user.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeago(question.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {question._count?.votes || question.voteCount || 0} votes
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(question)}
                </div>
              </div>

              {/* Existing Answer */}
              {question.answer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Answer</span>
                  </div>
                  <p className="text-green-800">{question.answer}</p>
                </div>
              )}

              {/* Answer Form */}
              {editingQuestion === question.id ? (
                <div className="space-y-3">
                  <div>
                    <Textarea
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      placeholder="Write your answer..."
                      className="min-h-[100px]"
                      maxLength={2000}
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-slate-500">
                        {answerText.length}/2000 characters
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingQuestion(null)
                            setAnswerText('')
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAnswerQuestion(question.id)}
                          disabled={!answerText.trim() || isSubmitting}
                        >
                          {isSubmitting ? 'Saving...' : 'Save Answer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Actions */
                <div className="flex items-center gap-2">
                  {!question.answeredAt && !question.archivedAt && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingQuestion(question.id)
                        setAnswerText(question.answer || '')
                      }}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {question.answer ? 'Edit Answer' : 'Answer'}
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchiveQuestion(question.id, !question.archivedAt)}
                  >
                    <Archive className="h-3 w-3 mr-1" />
                    {question.archivedAt ? 'Restore' : 'Archive'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
