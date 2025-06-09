
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
const TOP_LEFT_OFFSET = 16; // Used for padding/offset from screen edges

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function Arrow({ x1, y1, x2, y2 }: ArrowProps) {
  if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

  // Basic check to avoid drawing a zero-length line which might cause issues with marker
  if (x1 === x2 && y1 === y2) return null; 

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 999 }} // Ensure arrow is visible but below orb UI if necessary
      aria-hidden="true"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="8" // Adjust refX so arrowhead tip is at the line end
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" className="fill-primary" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="stroke-primary"
        strokeWidth="2.5" // Increased stroke width
        markerEnd="url(#arrowhead)"
      />
    </svg>
  );
}

export function InteractiveOrb() {
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [aiResponse, setAiResponse] = useState<GenerateResponseOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [screenshotDataUri, setScreenshotDataUri] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const orbControls = useAnimation();
  const [arrowData, setArrowData] = useState<ArrowProps | null>(null);

  const [clientLoaded, setClientLoaded] = useState(false);

  useEffect(() => {
    setClientLoaded(true);
    if (typeof window !== 'undefined') {
      moveToCenter();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOrbClick = async () => {
    if (isLoading) return;
    setArrowData(null); // Clear arrow when orb is clicked

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
        setImageDimensions({ width: canvas.width, height: canvas.height });
      } catch (error) {
        console.error("Error capturing screenshot:", error);
        setScreenshotDataUri(null);
        setImageDimensions(null);
      }
    } else {
      setScreenshotDataUri(null);
      setImageDimensions(null);
    }
    setIsInputVisible(prev => !prev);
    setAiResponse(null);
  };

  const moveToCenter = () => {
    if (typeof window !== 'undefined') {
      const centerX = window.innerWidth / 2 - ORB_SIZE / 2;
      const centerY = window.innerHeight / 2 - ORB_SIZE / 2;
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
    setArrowData(null); // Clear arrow on new submission
    setIsInputVisible(false);

    try {
      const result = await generateResponse({
        prompt: inputValue,
        screenshotDataUri: screenshotDataUri
      });
      setAiResponse(result);

      let finalOrbX = window.innerWidth / 2 - ORB_SIZE / 2;
      let finalOrbY = window.innerHeight / 2 - ORB_SIZE / 2;

      if (result.orbMoveTarget && imageDimensions) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        let scaledX = result.orbMoveTarget.x * (screenWidth / imageDimensions.width);
        let scaledY = result.orbMoveTarget.y * (screenHeight / imageDimensions.height);

        scaledX = Math.max(TOP_LEFT_OFFSET, Math.min(scaledX, screenWidth - ORB_SIZE - TOP_LEFT_OFFSET));
        scaledY = Math.max(TOP_LEFT_OFFSET, Math.min(scaledY, screenHeight - ORB_SIZE - TOP_LEFT_OFFSET));
        
        finalOrbX = scaledX;
        finalOrbY = scaledY;
        console.log("Orb: Moving to AI specified orbMoveTarget. Target:", { x: finalOrbX, y: finalOrbY });
      } else {
        console.log("Orb: No orbMoveTarget from AI or no imageDimensions, moving to center.");
      }
      
      orbControls.start({
        x: finalOrbX,
        y: finalOrbY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });

      if (result.arrowTarget && imageDimensions) {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const scaledArrowX = result.arrowTarget.x * (screenWidth / imageDimensions.width);
        const scaledArrowY = result.arrowTarget.y * (screenHeight / imageDimensions.height);
        
        console.log("Arrow: Targeting AI specified arrowTarget. Orb new center:", { x: finalOrbX + ORB_SIZE / 2, y: finalOrbY + ORB_SIZE / 2 }, "Arrow tip:", { x: scaledArrowX, y: scaledArrowY });
        setArrowData({
          x1: finalOrbX + ORB_SIZE / 2,
          y1: finalOrbY + ORB_SIZE / 2,
          x2: scaledArrowX,
          y2: scaledArrowY,
        });
      }

    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse({ response: "Oops! Something went wrong. Please try again." });
      moveToCenter();
      setArrowData(null);
    } finally {
      setIsLoading(false);
      setInputValue('');
      setScreenshotDataUri(null); 
      setImageDimensions(null);
    }
  };

  if (!clientLoaded) {
    return null;
  }

  return (
    <div ref={constraintsRef} className="w-full h-full relative overflow-hidden">
      {arrowData && <Arrow {...arrowData} />}
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        className="absolute cursor-grab"
        animate={orbControls}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        style={{ zIndex: 1000 }} // Orb on top
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
