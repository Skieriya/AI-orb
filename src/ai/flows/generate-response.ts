
'use server';
/**
 * @fileOverview A flow for generating a response from a user prompt, potentially with a screenshot,
 * and enabling coordinate-based movement of an interactive element.
 *
 * - generateResponse - A function that takes a user prompt and an optional screenshot, then returns an AI-generated response,
 *   potentially including x/y coordinates for movement.
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
  response: z.string().describe('The AI-generated textual response.'),
  x: z.number().optional().describe('The target x-coordinate for orb movement, relative to the screenshot top-left corner.'),
  y: z.number().optional().describe('The target y-coordinate for orb movement, relative to the screenshot top-left corner.'),
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

Movement Instructions:
If the user asks you to move the orb (e.g., "move to the center", "put yourself near the bottom right", "drag to 100, 200 pixels", "go to top left"), you should determine the target coordinates based on the screenshot.
- The 'x' and 'y' coordinates you return should be for the **top-left corner** of where the orb should be placed within the screenshot.
- (0,0) is the top-left of the screenshot.
- Example: If the user says 'move to top-left of the screen', you should respond with x: 0, y: 0 and a text confirmation like "Moving to the top left!".
- Example: If the user says 'move to center of screen' and the screenshot is 1920x1080, you should aim to provide coordinates that would center the orb. Assuming an orb size of roughly 90x90 pixels, the top-left coordinates for centering it would be approximately x: (1920/2 - 90/2) = 870, y: (1080/2 - 90/2) = 495. Provide a text confirmation like "Okay, centering myself."
- If you determine coordinates, include them in your 'x' and 'y' output fields. Also, provide a textual response confirming the action.
- If no movement is requested, or if the movement command is too vague to determine coordinates, do not include 'x' and 'y' fields in your output. Just provide a textual response.

For all other prompts, provide a helpful and concise answer.`,
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

