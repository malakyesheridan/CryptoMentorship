'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, ThumbsUp, Clock, CheckCircle, Archive } from 'lucide-react'
import { createQuestion, voteQuestion } from '@/lib/actions/questions'
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
  voteCount: number
  userVoted: boolean
  _count?: {
    votes: number
  }
}

interface QuestionsProps {
  eventId: string
  initialQuestions?: Question[]
}

export function Questions({ eventId, initialQuestions = [] }: QuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [newQuestion, setNewQuestion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newQuestion.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await createQuestion({
        eventId,
        body: newQuestion.trim()
      })

      if (result.error) {
        setError(result.error)
      } else if (result.question) {
        setQuestions(prev => [result.question!, ...prev])
        setNewQuestion('')
      }
    } catch (err) {
      setError('Failed to submit question')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVote = async (questionId: string) => {
    try {
      const result = await voteQuestion({ questionId })

      if (result.error) {
        setError(result.error)
      } else if (result.success) {
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId 
              ? { 
                  ...q, 
                  userVoted: result.voted!, 
                  voteCount: result.voteCount! 
                }
              : q
          )
        )
      }
    } catch (err) {
      setError('Failed to vote on question')
    }
  }

  const sortedQuestions = [...questions].sort((a, b) => {
    // Sort by votes descending, then by creation date descending
    if (a.voteCount !== b.voteCount) {
      return b.voteCount - a.voteCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Questions & Answers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Ask Question Form */}
        <form onSubmit={handleSubmitQuestion} className="space-y-4">
          <div>
            <Textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Ask a question about this event..."
              className="min-h-[100px]"
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-slate-500">
                {newQuestion.length}/1000 characters
              </span>
              <Button 
                type="submit" 
                disabled={!newQuestion.trim() || isSubmitting}
                size="sm"
              >
                {isSubmitting ? 'Submitting...' : 'Ask Question'}
              </Button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {sortedQuestions.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <p>No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            sortedQuestions.map((question) => (
              <div
                key={question.id}
                className={`border rounded-lg p-4 ${
                  question.archivedAt 
                    ? 'bg-slate-50 border-slate-200' 
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-slate-800 mb-2">{question.body}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>by {question.user.name}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeago(question.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Status Badges */}
                    {question.answeredAt && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Answered
                      </Badge>
                    )}
                    {question.archivedAt && (
                      <Badge variant="outline" className="text-slate-500 border-slate-200">
                        <Archive className="h-3 w-3 mr-1" />
                        Archived
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Answer */}
                {question.answer && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Answer</span>
                    </div>
                    <p className="text-green-800">{question.answer}</p>
                  </div>
                )}

                {/* Vote Button */}
                {!question.archivedAt && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant={question.userVoted ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleVote(question.id)}
                      className={`flex items-center gap-2 ${
                        question.userVoted 
                          ? 'bg-gold-600 hover:bg-gold-700' 
                          : ''
                      }`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                      {question.voteCount}
                    </Button>
                    <span className="text-sm text-slate-500">
                      {question.voteCount === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
