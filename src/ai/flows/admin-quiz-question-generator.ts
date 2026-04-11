'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating quiz questions (Multiple Choice and Essay) for admin users.
 * It allows admins to generate questions based on provided course content or a specific topic.
 *
 * - generateQuizQuestions - A function that handles the quiz question generation process.
 * - AdminQuizQuestionGeneratorInput - The input type for the generateQuizQuestions function.
 * - AdminQuizQuestionGeneratorOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminQuizQuestionGeneratorInputSchema = z
  .object({
    courseContent: z
      .string()
      .optional()
      .describe('The comprehensive text content from which questions should be generated.'),
    topic: z
      .string()
      .optional()
      .describe('A specific topic or keyword to base the questions on, used if course content is not provided.'),
    questionType: z
      .enum(['MCQ', 'ESSAY', 'BOTH'])
      .default('BOTH')
      .describe('The type of questions to generate: Multiple Choice (MCQ), Essay, or both.'),
    numberOfQuestions: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('The desired number of questions to generate (between 1 and 10).'),
  })
  .superRefine((data, ctx) => {
    if (!data.courseContent && !data.topic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either courseContent or topic must be provided.',
        path: ['courseContent', 'topic'],
      });
    }
  });

export type AdminQuizQuestionGeneratorInput = z.infer<typeof AdminQuizQuestionGeneratorInputSchema>;

const MCQQuestionSchema = z.object({
  type: z.literal('MCQ').describe('Indicates the question type is Multiple Choice.'),
  questionText: z.string().describe('The full text of the multiple-choice question.'),
  options: z
    .array(z.string())
    .length(4)
    .describe('An array of exactly four possible answer options for the MCQ, e.g., ["A) Option A", "B) Option B", ...].'),
  correctAnswer: z
    .string()
    .describe('The full text of the correct answer option, matching one of the options provided.'),
});

const EssayQuestionSchema = z.object({
  type: z.literal('ESSAY').describe('Indicates the question type is Essay.'),
  questionText: z.string().describe('The full text of the essay question.'),
  suggestedAnswerOutline: z
    .string()
    .optional()
    .describe('A brief outline or key points for the correct answer to the essay question, for admin reference.'),
});

const QuestionSchema = z.union([MCQQuestionSchema, EssayQuestionSchema]);

const AdminQuizQuestionGeneratorOutputSchema = z
  .array(QuestionSchema)
  .describe('An array containing the generated quiz questions, which can be a mix of MCQ and Essay types.');

export type AdminQuizQuestionGeneratorOutput = z.infer<typeof AdminQuizQuestionGeneratorOutputSchema>;

export async function generateQuizQuestions(
  input: AdminQuizQuestionGeneratorInput
): Promise<AdminQuizQuestionGeneratorOutput> {
  return adminQuizQuestionGeneratorFlow(input);
}

const adminQuizQuestionGeneratorPrompt = ai.definePrompt({
  name: 'adminQuizQuestionGeneratorPrompt',
  input: {schema: AdminQuizQuestionGeneratorInputSchema},
  output: {schema: AdminQuizQuestionGeneratorOutputSchema},
  prompt: `You are an expert educational content creator and quiz designer for "The Engineer" platform.
Your task is to generate high-quality quiz questions (multiple-choice and essay) based on the provided content or topic.

---START CONTENT/TOPIC---
{{#if courseContent}}
Course Content:
{{{courseContent}}}
{{else if topic}}
Topic: {{{topic}}}
{{else}}
No content or topic provided. Please specify.
{{/if}}
---END CONTENT/TOPIC---

Instructions:
1. Generate {{numberOfQuestions}} questions.
2. The questions should be of type "{{questionType}}".
   - If 'MCQ': Each question must have exactly 4 distinct options (labeled A, B, C, D) and clearly indicate the single correct answer.
   - If 'ESSAY': Provide the essay question text and a concise 'suggestedAnswerOutline' for the admin's reference.
   - If 'BOTH': Generate a mix of MCQ and Essay questions. If {{numberOfQuestions}} is odd, prioritize MCQs.
3. Ensure questions are clear, relevant to the provided content/topic, and suitable for high school students (years 1-3).
4. Your response must be a JSON array, strictly adhering to the following schema. Do not include any additional text or formatting outside the JSON.

{{jsonSchemaToMarkdown OutputSchema}}`,
});

const adminQuizQuestionGeneratorFlow = ai.defineFlow(
  {
    name: 'adminQuizQuestionGeneratorFlow',
    inputSchema: AdminQuizQuestionGeneratorInputSchema,
    outputSchema: AdminQuizQuestionGeneratorOutputSchema,
  },
  async input => {
    const {output} = await adminQuizQuestionGeneratorPrompt(input);
    return output!;
  }
);
