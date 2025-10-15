import { z } from 'zod'

// Resource schema for lesson resources
export const ResourceSchema = z.object({
  title: z.string().min(1, 'Resource title is required'),
  url: z.string().url('Resource URL must be valid'),
})

export type Resource = z.infer<typeof ResourceSchema>

// Quiz question schema
export const QuizQuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  kind: z.literal('mc'),
  prompt: z.string().min(1, 'Question prompt is required'),
  options: z.array(z.string().min(1, 'Option cannot be empty')).min(2, 'At least 2 options required'),
  correctIndexes: z.array(z.number().int().min(0)).min(1, 'At least one correct answer required'),
})

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>

// Quiz answer schema
export const QuizAnswerSchema = z.object({
  qId: z.string().min(1, 'Question ID is required'),
  selectedIndexes: z.array(z.number().int().min(0)),
})

export type QuizAnswer = z.infer<typeof QuizAnswerSchema>

// Certificate metadata schema
export const CertificateMetaSchema = z.object({
  issuedAt: z.string().datetime(),
  trackVersion: z.string().optional(),
  additionalInfo: z.string().optional(),
})

export type CertificateMeta = z.infer<typeof CertificateMetaSchema>

// Validation functions
export function validateResources(resourcesJson: string | null): Resource[] {
  if (!resourcesJson) return []
  
  try {
    const parsed = JSON.parse(resourcesJson)
    return z.array(ResourceSchema).parse(parsed)
  } catch (error) {
    throw new Error('Invalid resources JSON format')
  }
}

export function validateQuizQuestions(questionsJson: string): QuizQuestion[] {
  try {
    const parsed = JSON.parse(questionsJson)
    return z.array(QuizQuestionSchema).parse(parsed)
  } catch (error) {
    throw new Error('Invalid quiz questions JSON format')
  }
}

export function validateQuizAnswers(answersJson: string): QuizAnswer[] {
  try {
    const parsed = JSON.parse(answersJson)
    return z.array(QuizAnswerSchema).parse(parsed)
  } catch (error) {
    throw new Error('Invalid quiz answers JSON format')
  }
}

export function validateCertificateMeta(metaJson: string | null): CertificateMeta | null {
  if (!metaJson) return null
  
  try {
    const parsed = JSON.parse(metaJson)
    return CertificateMetaSchema.parse(parsed)
  } catch (error) {
    throw new Error('Invalid certificate metadata JSON format')
  }
}

// Serialization functions
export function serializeResources(resources: Resource[]): string {
  return JSON.stringify(resources)
}

export function serializeQuizQuestions(questions: QuizQuestion[]): string {
  return JSON.stringify(questions)
}

export function serializeQuizAnswers(answers: QuizAnswer[]): string {
  return JSON.stringify(answers)
}

export function serializeCertificateMeta(meta: CertificateMeta): string {
  return JSON.stringify(meta)
}
