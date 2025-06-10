
"use client"; // Required for hooks and event handlers

import * as React from 'react';
import { useState, useEffect, useRef, type FormEvent, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Send, Zap, Edit2, Smile } from 'lucide-react';
import html2canvas from 'html2canvas';
import { generateResponse, type GenerateResponseOutput } from '@/ai/flows/generate-response';
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// START: Inlined src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
// END: Inlined src/components/ui/button.tsx

// START: Inlined src/components/ui/card.tsx
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"
// END: Inlined src/components/ui/card.tsx

// START: Inlined src/components/ui/input.tsx
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
// END: Inlined src/components/ui/input.tsx


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

function InteractiveOrb() {
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
  const initialMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


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
    if (initialMoveTimeoutRef.current) clearTimeout(initialMoveTimeoutRef.current);
    initialMoveTimeoutRef.current = setTimeout(() => {
        moveToCenter();
    }, 0); 

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (initialMoveTimeoutRef.current) {
        clearTimeout(initialMoveTimeoutRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [moveToCenter]);


  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis && text) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel(); 
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
    console.log("Starting processSequentialTargets with orbTargets:", orbTargets, "arrowTargets:", arrowTargets, "imageDimensions:", imgDims);
    sequenceActiveRef.current = true;
    for (let i = 0; i < orbTargets.length; i++) {
      if (!sequenceActiveRef.current) {
        console.log("Sequence processing CANCELLED before step", i + 1);
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

      console.log(`Orb (Step ${i + 1}/${orbTargets.length}): Moving to AI specified orbMoveTarget. Original: {x: ${orbTarget.x}, y: ${orbTarget.y}}, Scaled & Clamped Target: {x: ${scaledOrbX}, y: ${scaledOrbY}}`);
      await orbControls.start({
        x: scaledOrbX,
        y: scaledOrbY,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      });

      if (!sequenceActiveRef.current) {
        console.log("Sequence processing CANCELLED after orb animation at step", i + 1);
        break;
      }

      if (arrowTarget) {
        const scaledArrowX = arrowTarget.x * (screenWidth / imgDims.width);
        const scaledArrowY = arrowTarget.y * (screenHeight / imgDims.height);

        console.log(`Arrow (Step ${i + 1}/${orbTargets.length}): Targeting AI specified arrowTarget. Original: {x: ${arrowTarget.x}, y: ${arrowTarget.y}}, Scaled Target: {x: ${scaledArrowX}, y: ${scaledArrowY}}. Orb new center for arrow start: {x: ${scaledOrbX + ORB_SIZE / 2}, y: ${scaledOrbY + ORB_SIZE / 2}}`);
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
          console.log("Sequence processing CANCELLED before pause at step", i + 1);
          break;
        }
        console.log(`Sequence (Step ${i + 1}/${orbTargets.length}): Pausing for ${SEQUENTIAL_PAUSE_MS}ms...`);
        await new Promise(resolve => {
          if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current);
          animationTimeoutRef.current = setTimeout(resolve, SEQUENTIAL_PAUSE_MS);
        });
        if (!sequenceActiveRef.current) { 
          console.log("Sequence processing CANCELLED after pause at step", i + 1);
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

export default function AiOrbPage() {
  return (
    <main className="relative w-screen h-screen overflow-hidden font-body">
      <InteractiveOrb />
    </main>
  );
}
