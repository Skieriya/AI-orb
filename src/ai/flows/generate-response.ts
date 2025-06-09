
'use server';
/**
 * @fileOverview A flow for generating a response from a user prompt, potentially with a screenshot.
 *
 * - generateResponse - A function that takes a user prompt and an optional screenshot, then returns an AI-generated response.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  prompt: z.string().describe('The prompt to generate a response for.'),
  screenshotDataUri: z.string().optional().describe(
    "A screenshot of the app's current view, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:image/png;base64,<encoded_data>'."
  ),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `You are an interactive AI orb. Respond to the user's prompt.
If a screenshot is provided, consider its content as part of the user's context.

User Prompt: {{{prompt}}}
{{#if screenshotDataUri}}
Current Screen (screenshot):
{{media url=screenshotDataUri}}
{{/if}}

If the user asks you to move to the top left corner (e.g., "drag yourself to the top left", "go to top left", "move to 0,0", "move to top-left"), you MUST respond with the exact phrase: "Moving to top left." and nothing else. For all other prompts, provide a helpful and concise answer.`,
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await generateResponsePrompt(input);
    return output!;
  }
);
