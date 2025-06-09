
'use server';
/**
 * @fileOverview A flow for generating a response from a user prompt, potentially with a screenshot,
 * and enabling coordinate-based movement of an interactive element and an arrow pointer.
 *
 * - generateResponse - A function that takes a user prompt and an optional screenshot, then returns an AI-generated response,
 *   potentially including x/y coordinates for orb movement and arrow targeting.
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

const CoordinateSchema = z.object({
  x: z.number().describe('The x-coordinate.'),
  y: z.number().describe('The y-coordinate.'),
});

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated textual response.'),
  orbMoveTarget: CoordinateSchema.optional().describe(
    "The target top-left x,y coordinates for the orb's movement, relative to the screenshot's top-left (0,0)."
  ),
  arrowTarget: CoordinateSchema.optional().describe(
    "The target x,y coordinates for an arrow to point to, relative to the screenshot's top-left (0,0)."
  ),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const generateResponsePrompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `You are an interactive AI orb assisting a user on their computer screen. The orb itself is approximately 90x90 pixels.

User Prompt: {{{prompt}}}
{{#if screenshotDataUri}}
Current Screen (screenshot):
{{media url=screenshotDataUri}}
{{/if}}

Your Task:
1.  Analyze the user's prompt in conjunction with the screenshot (if provided).
2.  If the prompt refers to a specific element, area, or concept visible on the screen (e.g., "What's that button?", "Tell me about the text in the top right", "Can you see the chart?", "Point to the logo"), determine the x, y coordinates of that *element of interest* within the screenshot. These coordinates will be used for an arrow to point at. Output these as \`arrowTarget.x\` and \`arrowTarget.y\`. (0,0) is the top-left of the screenshot.
3.  Based on the element of interest (if any), decide on new x, y coordinates for the orb *itself* to move to. The orb should generally move to be near the element of interest, but try not to obscure it. The coordinates you provide for \`orbMoveTarget.x\` and \`orbMoveTarget.y\` should be for the *top-left corner* of where the orb should be placed.
4.  If the user's prompt is a general question not tied to a specific visual element, or if no screenshot is provided, or if the visual reference is too vague to pinpoint, do not output \`arrowTarget\` or \`orbMoveTarget\`.
5.  Always provide a textual \`response\` to the user's prompt.

Coordinate System & Orb Size:
-   All coordinates you output (\`orbMoveTarget\`, \`arrowTarget\`) MUST be relative to the top-left (0,0) of the provided screenshot.
-   \`orbMoveTarget.x\` and \`orbMoveTarget.y\` are for the top-left corner of the orb. The orb is roughly 90x90 pixels. Consider this size when deciding where it should move so it doesn't cover the \`arrowTarget\`.
-   \`arrowTarget.x\` and \`arrowTarget.y\` are for the point the arrow should aim at (e.g., the center of the element of interest).

Example 1 (Visual Query):
User Prompt: "What is the blue icon near the bottom-left?"
(Screenshot shows a blue icon whose center is at approximately x:150, y:900 in a 1920x1080 screenshot)
Expected Output:
{
  "response": "That blue icon appears to be the settings shortcut.",
  "orbMoveTarget": { "x": 100, "y": 800 },
  "arrowTarget": { "x": 150, "y": 900 }
}

Example 2 (Direct Orb Movement - if user explicitly asks, but prefer implicit):
User Prompt: "Move yourself to the very top-left corner of the screen."
Expected Output:
{
  "response": "Okay, moving to the top-left corner!",
  "orbMoveTarget": { "x": 0, "y": 0 }
}

Example 3 (General Question):
User Prompt: "What's the weather like today?"
Expected Output:
{
  "response": "I'm sorry, I don't have access to real-time weather information."
}

Example 4 (Vague Visual Query):
User Prompt: "Look at that thing."
Expected Output:
{
  "response": "Could you be more specific about what 'thing' you're referring to on the screen?"
}

Important: If you decide to provide coordinates, try to be as accurate as possible based on the visual information. If a user asks to move the orb, provide \`orbMoveTarget\`. If they ask about something on screen, provide both \`orbMoveTarget\` (to position orb nearby) and \`arrowTarget\` (to point at the item).
`,
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
