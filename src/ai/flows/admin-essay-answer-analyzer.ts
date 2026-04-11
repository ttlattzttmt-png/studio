'use server';
/**
 * @fileOverview An AI agent that summarizes student essay answers and highlights key concepts for admin review.
 *
 * - analyzeEssayAnswer - A function that handles the essay analysis process.
 * - AdminEssayAnswerAnalyzerInput - The input type for the analyzeEssayAnswer function.
 * - AdminEssayAnswerAnalyzerOutput - The return type for the analyzeEssayAnswer function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminEssayAnswerAnalyzerInputSchema = z.object({
  essayAnswer: z.string().describe("The student's essay answer."),
});
export type AdminEssayAnswerAnalyzerInput = z.infer<typeof AdminEssayAnswerAnalyzerInputSchema>;

const AdminEssayAnswerAnalyzerOutputSchema = z.object({
  summary: z.string().describe("A concise summary of the student's essay response."),
  keyConcepts: z
    .array(z.string())
    .describe('A list of key concepts identified in the essay response.'),
});
export type AdminEssayAnswerAnalyzerOutput = z.infer<typeof AdminEssayAnswerAnalyzerOutputSchema>;

export async function analyzeEssayAnswer(
  input: AdminEssayAnswerAnalyzerInput
): Promise<AdminEssayAnswerAnalyzerOutput> {
  return adminEssayAnswerAnalyzerFlow(input);
}

const adminEssayAnswerAnalyzerPrompt = ai.definePrompt({
  name: 'adminEssayAnswerAnalyzerPrompt',
  input: {schema: AdminEssayAnswerAnalyzerInputSchema},
  output: {schema: AdminEssayAnswerAnalyzerOutputSchema},
  prompt: `You are an AI assistant designed to help educators quickly assess student essay responses. Your task is to read the provided essay, summarize its main points, and identify the key concepts discussed by the student.

Student Essay:
{{{essayAnswer}}}`,
});

const adminEssayAnswerAnalyzerFlow = ai.defineFlow(
  {
    name: 'adminEssayAnswerAnalyzerFlow',
    inputSchema: AdminEssayAnswerAnalyzerInputSchema,
    outputSchema: AdminEssayAnswerAnalyzerOutputSchema,
  },
  async input => {
    const {output} = await adminEssayAnswerAnalyzerPrompt(input);
    return output!;
  }
);
