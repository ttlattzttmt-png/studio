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

const AdminQuizQuestionGeneratorInputSchema = z.object({
  topic: z.string().describe('The topic or subject to generate questions for.'),
  questionType: z.enum(['MCQ', 'ESSAY', 'BOTH']).default('BOTH'),
  numberOfQuestions: z.number().int().min(1).max(10).default(5),
});

export type AdminQuizQuestionGeneratorInput = z.infer<typeof AdminQuizQuestionGeneratorInputSchema>;

const QuestionSchema = z.object({
  type: z.enum(['MCQ', 'ESSAY']),
  questionText: z.string(),
  options: z.array(z.string()).optional().describe('Exactly 4 options for MCQ'),
  correctAnswer: z.string().optional().describe('The correct option text for MCQ'),
  suggestedAnswerOutline: z.string().optional().describe('Outline for Essay questions'),
});

const AdminQuizQuestionGeneratorOutputSchema = z.array(QuestionSchema);

export type AdminQuizQuestionGeneratorOutput = z.infer<typeof AdminQuizQuestionGeneratorOutputSchema>;

const adminQuizQuestionGeneratorPrompt = ai.definePrompt({
  name: 'adminQuizQuestionGeneratorPrompt',
  input: {schema: AdminQuizQuestionGeneratorInputSchema},
  output: {schema: AdminQuizQuestionGeneratorOutputSchema},
  prompt: `You are an expert educational content creator.
Generate {{numberOfQuestions}} high-quality quiz questions in Arabic about the topic: "{{topic}}".

Instructions:
1. Question Type: {{questionType}}.
2. For MCQ: Provide exactly 4 options and the correct answer text.
3. For ESSAY: Provide the question text and a suggested answer outline.
4. Language: All content must be in Arabic.`,
});

const adminQuizQuestionGeneratorFlow = ai.defineFlow(
  {
    name: 'adminQuizQuestionGeneratorFlow',
    inputSchema: AdminQuizQuestionGeneratorInputSchema,
    outputSchema: AdminQuizQuestionGeneratorOutputSchema,
  },
  async input => {
    const {output} = await adminQuizQuestionGeneratorPrompt(input);
    if (!output) throw new Error("AI failed to generate questions");
    return output;
  }
);

export async function generateQuizQuestions(
  input: AdminQuizQuestionGeneratorInput
): Promise<AdminQuizQuestionGeneratorOutput> {
  return adminQuizQuestionGeneratorFlow(input);
}
