
"use client";
import { useState, useEffect, useRef, type FormEvent, useCallback } from 'react';
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

  const moveToCenter = useCallback(() => {
    if (typeof window !== 'undefined') {
      const centerX = window.innerWidth / 2 - ORB_SIZE / 2;
      const centerY = window.innerHeight / 2 - ORB_SIZE / 2;
      console.log("moveToCenter called. Target:", { x: centerX, y: centerY });
      orbControls.start({
        x: centerX,
        y: centerY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });
    }
  }, [orbControls]);

  useEffect(() => {
    setClientLoaded(true);
    moveToCenter();

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [moveToCenter]);


  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); // Stop any previous speech
      }
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const cancelCurrentSequence = useCallback(() => {
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
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  }, [orbControls]);

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
    setIsInputVisible((prev) => !prev);
    setAiResponse(null);
  };

  const processSequentialTargets = useCallback(async (
    responseToSpeak: string,
    orbTargets: TargetPoint[],
    arrowTargets: TargetPoint[] | undefined,
    imgDims: { width: number; height: number }
  ) => {
    console.log("Starting processSequentialTargets with orbTargets:", orbTargets, "arrowTargets:", arrowTargets);
    sequenceActiveRef.current = true;
    for (let i = 0; i < orbTargets.length; i++) {
      if (!sequenceActiveRef.current) {
        console.log("Sequence processing cancelled before step", i + 1);
        break;
      }
      const orbTarget = orbTargets[i];
      const arrowTarget = arrowTargets && arrowTargets.length > i ? arrowTargets[i] : null;
      
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      let scaledOrbX = orbTarget.x * (screenWidth / imgDims.width);
      let scaledOrbY = orbTarget.y * (screenHeight / imgDims.height);
      
      scaledOrbX = Math.max(TOP_LEFT_OFFSET, Math.min(scaledOrbX, screenWidth - ORB_SIZE - TOP_LEFT_OFFSET));
      scaledOrbY = Math.max(TOP_LEFT_OFFSET, Math.min(scaledOrbY, screenHeight - ORB_SIZE - TOP_LEFT_OFFSET));

      console.log(`Orb (Step ${i + 1}/${orbTargets.length}): Moving to AI specified orbMoveTarget. Original: {x: ${orbTarget.x}, y: ${orbTarget.y}}, Scaled & Clamped Target:`, { x: scaledOrbX, y: scaledOrbY });
      await orbControls.start({
        x: scaledOrbX,
        y: scaledOrbY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });

      if (!sequenceActiveRef.current) {
        console.log("Sequence processing cancelled after orb animation at step", i + 1);
        break;
      }

      if (arrowTarget) {
        const scaledArrowX = arrowTarget.x * (screenWidth / imgDims.width);
        const scaledArrowY = arrowTarget.y * (screenHeight / imgDims.height);

        console.log(`Arrow (Step ${i + 1}/${orbTargets.length}): Targeting AI specified arrowTarget. Original: {x: ${arrowTarget.x}, y: ${arrowTarget.y}}, Orb new center:`, { x: scaledOrbX + ORB_SIZE / 2, y: scaledOrbY + ORB_SIZE / 2 }, "Arrow tip:", { x: scaledArrowX, y: scaledArrowY });
        setArrowData({
          x1: scaledOrbX + ORB_SIZE / 2,
          y1: scaledOrbY + ORB_SIZE / 2,
          x2: scaledArrowX,
          y2: scaledArrowY,
        });
      } else {
        console.log(`Arrow (Step ${i + 1}/${orbTargets.length}): No arrow target for this step.`);
        setArrowData(null);
      }

      if (i < orbTargets.length - 1) {
        if (!sequenceActiveRef.current) {
          console.log("Sequence processing cancelled before pause at step", i + 1);
          break;
        }
        console.log(`Sequence (Step ${i + 1}/${orbTargets.length}): Pausing for ${SEQUENTIAL_PAUSE_MS}ms...`);
        await new Promise(resolve => {
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = setTimeout(resolve, SEQUENTIAL_PAUSE_MS);
        });
        if (!sequenceActiveRef.current) {
          console.log("Sequence processing cancelled after pause at step", i + 1);
          break;
        }
      }
    }
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = null;

    if (sequenceActiveRef.current) { 
      sequenceActiveRef.current = false;
      console.log("Sequence processing naturally finished.");
      speakText(responseToSpeak);
    } else {
      console.log("Sequence processing was terminated early by another action.");
    }
  }, [orbControls, speakText]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    cancelCurrentSequence(); 
    
    setIsLoading(true);
    setAiResponse(null);
    setArrowData(null);
    setIsInputVisible(false); 

    try {
      console.log("Submitting prompt with screenshotDataUri:", screenshotDataUri ? "Present" : "Absent", "imageDimensions:", imageDimensions);
      const result = await generateResponse({
        prompt: inputValue,
        screenshotDataUri: screenshotDataUri || undefined 
      });
      console.log("AI Response received:", result);
      setAiResponse(result);

      if (result.orbMoveTargets && result.orbMoveTargets.length > 0 && imageDimensions) {
        await processSequentialTargets(result.response, result.orbMoveTargets, result.arrowTargets, imageDimensions);
      } else {
        console.log("Orb: No valid multi-targets from AI, or no imageDimensions, or empty targets array. Moving to center.");
        moveToCenter();
        setArrowData(null); 
        if (result.response) {
          speakText(result.response);
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage = "Oops! Something went wrong. Please try again.";
      setAiResponse({ response: errorMessage });
      moveToCenter();
      setArrowData(null);
      speakText(errorMessage);
    } finally {
      setIsLoading(false);
      setInputValue('');
      // Only clear screenshot if a sequence wasn't active (or finished)
      // If a sequence was cancelled, it might be better to keep the screenshot for a quick retry/follow-up.
      // For now, we clear it if no sequence is active, implying a full new interaction or completed old one.
      if (!sequenceActiveRef.current) {
          setScreenshotDataUri(null);
          setImageDimensions(null);
      }
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
        onDragStart={() => {
          console.log("Drag started, cancelling sequence.");
          cancelCurrentSequence();
        }}
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
          animate={{ scale: isLoading || sequenceActiveRef.current ? 1.02 : 1 }}
          whileHover={{ scale: isLoading || sequenceActiveRef.current ? 1.02 : 1.05 }}
          whileTap={{ scale: isLoading || sequenceActiveRef.current ? 1.02 : 0.95 }}
          aria-label="AI Orb"
        >
          {isLoading || sequenceActiveRef.current ? (
            <Zap className="w-7 h-7 text-primary-foreground animate-ping" />
          ) : isInputVisible ? (
            <Edit2 className="w-7 h-7 text-primary-foreground opacity-60" />
          ) : (
            <Smile className="w-7 h-7 text-primary-foreground opacity-70" />
          )}
        </motion.div>
        <AnimatePresence>
          {isInputVisible && !sequenceActiveRef.current && (
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
