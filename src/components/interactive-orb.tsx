
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
const SEQUENTIAL_PAUSE_MS = 2000; // Pause between sequential movements

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TargetPoint {
  x: number;
  y: number;
}

function Arrow({ x1, y1, x2, y2 }: ArrowProps) {
  if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
  if (x1 === x2 && y1 === y2) return null; 

  return (
    <svg
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 999 }} 
      aria-hidden="true"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="8" 
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
        strokeWidth="2.5" 
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

  const sequenceActiveRef = useRef(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setClientLoaded(true);
    if (typeof window !== 'undefined') {
      moveToCenter();
    }
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelCurrentSequence = () => {
    if (sequenceActiveRef.current) {
      console.log("Cancelling active sequence.");
      sequenceActiveRef.current = false;
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      orbControls.stop(); 
      setArrowData(null); 
    }
  };

  const handleOrbClick = async () => {
    if (isLoading) return;
    cancelCurrentSequence();
    setArrowData(null);

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

  const processSequentialTargets = async (
    orbTargets: TargetPoint[],
    arrowTargets: TargetPoint[] | undefined,
    imgDims: { width: number; height: number }
  ) => {
    sequenceActiveRef.current = true;

    for (let i = 0; i < orbTargets.length; i++) {
      if (!sequenceActiveRef.current) {
        console.log("Sequence processing cancelled before step", i);
        break;
      }

      const orbTarget = orbTargets[i];
      const arrowTarget = arrowTargets && arrowTargets.length > i ? arrowTargets[i] : null;

      let finalOrbX = window.innerWidth / 2 - ORB_SIZE / 2;
      let finalOrbY = window.innerHeight / 2 - ORB_SIZE / 2;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let scaledOrbX = orbTarget.x * (screenWidth / imgDims.width);
      let scaledOrbY = orbTarget.y * (screenHeight / imgDims.height);

      scaledOrbX = Math.max(TOP_LEFT_OFFSET, Math.min(scaledOrbX, screenWidth - ORB_SIZE - TOP_LEFT_OFFSET));
      scaledOrbY = Math.max(TOP_LEFT_OFFSET, Math.min(scaledOrbY, screenHeight - ORB_SIZE - TOP_LEFT_OFFSET));
      
      finalOrbX = scaledOrbX;
      finalOrbY = scaledOrbY;
      console.log(`Orb (Step ${i + 1}): Moving to AI specified orbMoveTarget. Target:`, { x: finalOrbX, y: finalOrbY });

      await orbControls.start({
        x: finalOrbX,
        y: finalOrbY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });

      if (!sequenceActiveRef.current) {
        console.log("Sequence processing cancelled after orb animation at step", i);
        break;
      }

      if (arrowTarget) {
        const scaledArrowX = arrowTarget.x * (screenWidth / imgDims.width);
        const scaledArrowY = arrowTarget.y * (screenHeight / imgDims.height);
        
        console.log(`Arrow (Step ${i + 1}): Targeting AI specified arrowTarget. Orb new center:`, { x: finalOrbX + ORB_SIZE / 2, y: finalOrbY + ORB_SIZE / 2 }, "Arrow tip:", { x: scaledArrowX, y: scaledArrowY });
        setArrowData({
          x1: finalOrbX + ORB_SIZE / 2,
          y1: finalOrbY + ORB_SIZE / 2,
          x2: scaledArrowX,
          y2: scaledArrowY,
        });
      } else {
        setArrowData(null);
      }

      if (i < orbTargets.length - 1) {
        if (!sequenceActiveRef.current) {
            console.log("Sequence processing cancelled before pause at step", i);
            break;
        }
        await new Promise(resolve => {
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = setTimeout(resolve, SEQUENTIAL_PAUSE_MS);
        });
        if (!sequenceActiveRef.current) {
            console.log("Sequence processing cancelled after pause at step", i);
            break;
        }
      }
    }

    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = null;
    sequenceActiveRef.current = false;
    console.log("Sequence processing finished.");
    // Optional: Clear arrow a bit after the sequence ends if desired
    // setTimeout(() => { if (!sequenceActiveRef.current) setArrowData(null); }, 3000);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    cancelCurrentSequence();
    setIsLoading(true);
    setAiResponse(null);
    setArrowData(null);
    setIsInputVisible(false);

    try {
      const result = await generateResponse({
        prompt: inputValue,
        screenshotDataUri: screenshotDataUri
      });
      setAiResponse(result);

      if (result.orbMoveTargets && result.orbMoveTargets.length > 0 && imageDimensions) {
        await processSequentialTargets(result.orbMoveTargets, result.arrowTargets, imageDimensions);
      } else {
        console.log("Orb: No valid targets from AI or no imageDimensions, moving to center.");
        moveToCenter();
        setArrowData(null);
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
      // If not in a sequence, clear arrow. If sequence just finished, it might still show last arrow.
      // User clicking orb again will clear it.
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
        onDragStart={cancelCurrentSequence} // Cancel sequence if user starts dragging
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
          {isLoading || sequenceActiveRef.current ? ( // Show Zap icon if loading OR sequence active
            <Zap className="w-7 h-7 text-primary-foreground animate-ping" />
          ) : isInputVisible ? (
            <Edit2 className="w-7 h-7 text-primary-foreground opacity-60" />
          ) : (
            <Smile className="w-7 h-7 text-primary-foreground opacity-70" />
          )}
        </motion.div>

        <AnimatePresence>
          {isInputVisible && !sequenceActiveRef.current && ( // Hide input if sequence active
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
