
"use client";

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Send, Zap, Edit2, Smile } from 'lucide-react';
import html2canvas from 'html2canvas';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateResponse, type GenerateResponseOutput } from '@/ai/flows/generate-response';

const ORB_SIZE = 90;
const INPUT_BUBBLE_WIDTH = 280;
const BUBBLE_MARGIN = 12;
const TOP_LEFT_OFFSET = 16;

export function InteractiveOrb() {
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [aiResponse, setAiResponse] = useState<GenerateResponseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [screenshotDataUri, setScreenshotDataUri] = useState<string | null>(null);
  const orbControls = useAnimation();

  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
    if (typeof window !== 'undefined') {
      const initialOrbPos = {
        x: window.innerWidth / 2 - ORB_SIZE / 2,
        y: window.innerHeight / 2 - ORB_SIZE / 2,
      };
      orbControls.set(initialOrbPos);
    }
  }, [orbControls]);

  const handleOrbClick = async () => {
    if (isLoading) return;

    if (!isInputVisible) {
      try {
        const canvas = await html2canvas(document.documentElement, {
          useCORS: true,
          logging: false,
          scale: window.devicePixelRatio > 1 ? 1 : 1,
          backgroundColor: null,
        });
        const dataUri = canvas.toDataURL('image/png');
        setScreenshotDataUri(dataUri);
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        setScreenshotDataUri(null);
      }
    } else {
      setScreenshotDataUri(null);
    }
    setIsInputVisible(prev => !prev);
    setAiResponse(null); // Clear previous AI response when toggling input
  };

  const moveToCenter = () => {
    if (typeof window !== 'undefined') {
      const centerX = window.innerWidth / 2 - ORB_SIZE / 2;
      const centerY = window.innerHeight / 2 - ORB_SIZE / 2;
      console.log("Orb: Moving to center. Target coordinates:", { x: centerX, y: centerY });
      orbControls.start({
        x: centerX,
        y: centerY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setAiResponse(null);
    setIsInputVisible(false);

    try {
      const result = await generateResponse({
        prompt: inputValue,
        screenshotDataUri: screenshotDataUri
      });
      setAiResponse(result);

      if (result.response === "Moving to top left.") {
        console.log("Orb: Attempting to move to top left. Target coordinates:", { x: TOP_LEFT_OFFSET, y: TOP_LEFT_OFFSET });
        orbControls.start({
          x: TOP_LEFT_OFFSET,
          y: TOP_LEFT_OFFSET,
          transition: { type: "spring", stiffness: 200, damping: 20 }
        });
      } else {
        moveToCenter();
      }

    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse({ response: "Oops! Something went wrong. Please try again." });
      moveToCenter(); // Move to center on error as well
    } finally {
      setIsLoading(false);
      setInputValue('');
      setScreenshotDataUri(null);
    }
  };

  if (!clientLoaded) {
    return null;
  }

  return (
    <div ref={constraintsRef} className="w-full h-full relative overflow-hidden">
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        className="absolute cursor-grab"
        animate={orbControls}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ zIndex: 1000 }}
      >
        <AnimatePresence>
          {aiResponse && !isInputVisible && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute left-1/2 transform -translate-x-1/2 w-auto max-w-xs"
              style={{ bottom: `${ORB_SIZE + BUBBLE_MARGIN}px`, minWidth: `${INPUT_BUBBLE_WIDTH * 0.8}px` }}
            >
              <Card className="bg-accent text-accent-foreground shadow-xl rounded-lg">
                <CardContent className="p-3 text-sm break-words">
                  {aiResponse.response}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          onClick={handleOrbClick}
          className="orb-gradient rounded-full flex items-center justify-center shadow-2xl"
          style={{ width: ORB_SIZE, height: ORB_SIZE }}
          animate={{ scale: isLoading ? 1.02 : 1 }}
          whileHover={{ scale: isLoading ? 1.02 : 1.05 }}
          whileTap={{ scale: isLoading ? 1.02 : 0.95 }}
          aria-label="AI Orb"
        >
          {isLoading ? (
            <Zap className="w-7 h-7 text-primary-foreground animate-ping" />
          ) : isInputVisible ? (
            <Edit2 className="w-7 h-7 text-primary-foreground opacity-60" />
          ) : (
            <Smile className="w-7 h-7 text-primary-foreground opacity-70" />
          )}
        </motion.div>

        <AnimatePresence>
          {isInputVisible && (
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="absolute left-1/2 transform -translate-x-1/2 flex gap-2 items-center"
              style={{ top: `${ORB_SIZE + BUBBLE_MARGIN}px`, width: `${INPUT_BUBBLE_WIDTH}px` }}
            >
              <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask the orb..."
                className="flex-grow bg-card text-card-foreground placeholder:text-muted-foreground focus:ring-ring"
                autoFocus
                aria-label="Text input for AI"
              />
              <Button type="submit" size="icon" variant="default" className="bg-primary hover:bg-primary/90" aria-label="Send message">
                <Send className="w-4 h-4 text-primary-foreground" />
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
