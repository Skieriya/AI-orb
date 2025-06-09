
'use server';
/**
 * @fileOverview A flow for generating a response from a user prompt, potentially with a screenshot,
 * and enabling coordinate-based movement of an interactive element and an arrow pointer,
 * potentially to multiple targets sequentially.
 *
 * - generateResponse - A function that takes a user prompt and an optional screenshot, then returns an AI-generated response,
 *   potentially including arrays of x/y coordinates for orb movement and arrow targeting.
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

const TargetPointSchema = z.object({
  x: z.number().describe('The x-coordinate.'),
  y: z.number().describe('The y-coordinate.'),
});

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI-generated textual response.'),
  orbMoveTargets: z.array(TargetPointSchema).optional().describe(
    "An array of target top-left x,y coordinates for the orb's sequential movements, relative to the screenshot's top-left (0,0)."
  ),
  arrowTargets: z.array(TargetPointSchema).optional().describe(
    "An array of target x,y coordinates for an arrow to point to sequentially, corresponding to orbMoveTargets, relative to the screenshot's top-left (0,0)."
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
2.  If the prompt refers to one or more specific elements, areas, or concepts visible on the screen:
    a.  For EACH such element of interest, determine its x, y coordinates within the screenshot. These coordinates will be used for an arrow to point at. Output these as an array of \`arrowTargets\`, e.g., \`"arrowTargets": [{"x": 150, "y": 900}, {"x": 500, "y": 200}]\`. (0,0) is the top-left of the screenshot. The coordinates should be for the center of the element of interest.
    b.  For EACH \`arrowTarget\`, decide on new x, y coordinates for the orb *itself* to move to. The orb should generally move to be near the corresponding element of interest, but try not to obscure it. The coordinates you provide for \`orbMoveTargets\` (an array, corresponding to \`arrowTargets\`) should be for the *top-left corner* of where the orb should be placed for that step.
    c.  The \`orbMoveTargets\` and \`arrowTargets\` arrays should be in the order you want the orb to address them. They should ideally be of the same length.
3.  If the user's prompt is a general question not tied to specific visual elements, or if no screenshot is provided, or if visual references are too vague, do not output \`orbMoveTargets\` or \`arrowTargets\`.
4.  Always provide a textual \`response\` to the user's prompt. This response should ideally address all identified points if multiple.

Coordinate System & Orb Size:
-   All coordinates you output (\`orbMoveTargets\`, \`arrowTargets\`) MUST be relative to the top-left (0,0) of the provided screenshot.
-   \`orbMoveTargets[i].x\` and \`orbMoveTargets[i].y\` are for the top-left corner of the orb. The orb is roughly 90x90 pixels.
-   \`arrowTargets[i].x\` and \`arrowTargets[i].y\` are for the point the arrow should aim at (e.g., the center of the element of interest).

Example 1 (Multiple Visual Queries):
User Prompt: "Tell me about the logo in the top-left and that button in the center."
(Screenshot shows logo center at x:50, y:50 and button center at x:960, y:540 in a 1920x1080 screenshot)
Expected Output:
{
  "response": "The logo is in the top-left. The button in the center appears to be a submit button.",
  "orbMoveTargets": [ { "x": 20, "y": 20 }, { "x": 900, "y": 480 } ],
  "arrowTargets": [ { "x": 50, "y": 50 }, { "x": 960, "y": 540 } ]
}

Example 2 (Single Visual Query):
User Prompt: "What is the blue icon near the bottom-left?"
(Screenshot shows a blue icon whose center is at x:150, y:900)
Expected Output:
{
  "response": "That blue icon appears to be the settings shortcut.",
  "orbMoveTargets": [ { "x": 100, "y": 800 } ],
  "arrowTargets": [ { "x": 150, "y": 900 } ]
}

Example 3 (General Question):
User Prompt: "What's the weather like today?"
Expected Output:
{
  "response": "I'm sorry, I don't have access to real-time weather information."
}

Important: Ensure \`orbMoveTargets\` and \`arrowTargets\` are arrays of objects if provided. If both are present for multiple points, they must correspond in order. If only one point, they will be arrays of length 1. If no visual elements are identified for movement or pointing, these arrays should be omitted or empty.
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
