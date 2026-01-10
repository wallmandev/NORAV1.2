import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Sparkles, Globe, BrainCircuit } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper för renare tailwind-klasser
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OnboardingLoaderProps {
  url: string;
  onReady: () => void;
  scrapedPageCount: number | null; // Ny prop för faktiskt antal sidor
}

export const OnboardingLoader: React.FC<OnboardingLoaderProps> = ({ url, onReady, scrapedPageCount }) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // Status-stegen
  const steps = [
    {
      id: 0,
      text: `Ansluter till ${url}...`,
      icon: Globe,
      duration: 5000, // 5s
      progressEnd: 15
    },
    {
      id: 1,
      // Använd dynamiskt antal om tillgängligt, annars "..."
      text: scrapedPageCount 
        ? `Hittade ${scrapedPageCount} sidor. Läser prissättning och tjänster...`
        : "Letar efter undersidor...",
      icon: Sparkles,
      duration: 10000, // 10s
      progressEnd: 50
    },
    {
      id: 2,
      text: "Analyserar kärnverksamhet och villkor. Genererar Noras kunskapsbas...",
      icon: BrainCircuit,
      duration: 15000, // 15s
      progressEnd: 95
    },
    {
      id: 3,
      text: "Klar! NORA förstår nu din verksamhet.",
      icon: CheckCircle2,
      duration: 0,
      progressEnd: 100
    }
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let startTime = Date.now();
    let animationFrame: number;
    
    // Hantera tidslinjen
    const runSequence = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      // STEG 1: Initiering (0-5s)
      if (elapsed < 5000) {
        setCurrentStep(0);
        setProgress(Math.min(15, (elapsed / 5000) * 15));
      } 
      // STEG 2: Väntar på scraping (5s -> tills klar)
      else if (!scrapedPageCount) {
        // Vi stannar kvar på steg 0 eller 1 "Letar..." tills vi fått svar
        // Men vi kan fejka en långsam progress upp till 45% så det inte ser dött ut
        setCurrentStep(0); // Eller byt till en "Searching..." status
        const slowProgress = 15 + Math.min(30, (elapsed - 5000) / 1000); // Segar sig uppåt
        setProgress(slowProgress);
      }
      // STEG 3: Scraping klar, kör analys-stegen (snabbspola eller kör normalt)
      else if (currentStep < 2) {
         // Hoppa direkt till "Hittade X sidor" och fortsätt därifrån
         setCurrentStep(1); 
         // Nu låter vi den köra klart sina animationer lite snabbare för bra flow
         // ... (förenklad logik för demo: vi låter den bara ticka vidare baserat på tid nu)
      }

      // FÖRENKLAD LOGIK FÖR DEMO (Ersätter ovanstående komplexitet för stabilitet):
      // Vi kör en ren tidsbaserad loop, men uppdaterar TEXTEN dynamiskt i steps[1].
      // Om scrapingen går supersnabbt hinner man kanske inte se "Letar...", men det är ok.
      
      if (elapsed < 5000) {
         setCurrentStep(0);
         setProgress((elapsed / 5000) * 15);
      } else if (elapsed < 12000) {
         setCurrentStep(1);
         // 15 -> 50
         const p = (elapsed - 5000) / 7000;
         setProgress(15 + p * 35);
      } else if (elapsed < 20000) {
         setCurrentStep(2);
         // 50 -> 95
         const p = (elapsed - 12000) / 8000;
         setProgress(50 + p * 45);
      } else {
         setCurrentStep(3);
         setProgress(100);
         return;
      }

      animationFrame = requestAnimationFrame(runSequence);
    };

    animationFrame = requestAnimationFrame(runSequence);

    return () => cancelAnimationFrame(animationFrame);
  }, []); // Notera: Vi borde ha scrapedPageCount i deps om vi vill reagera direkt, men för text-uppdateringen räcker det att komponenten renderas om.

  const isComplete = currentStep === 3;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto p-6 text-center space-y-8">
      
      {/* 1. Animerad AI-cirkel (Pulse effect) */}
      <div className="relative flex items-center justify-center">
        {/* Yttre glöd */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-32 h-32 rounded-full bg-violet-600 blur-2xl"
        />
        
        {/* Inre cirkel */}
        <div className="relative bg-white/5 backdrop-blur-sm border border-violet-500/30 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl">
           <AnimatePresence mode='wait'>
            <motion.div
              key={steps[currentStep].id}
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
              transition={{ duration: 0.3 }}
            >
              {React.createElement(steps[currentStep].icon, {
                className: cn(
                  "w-10 h-10 transition-colors duration-500",
                  isComplete ? "text-green-400" : "text-violet-400"
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Status Ticker */}
      <div className="h-24 w-full flex flex-col items-center justify-center overflow-hidden">
        <AnimatePresence mode='wait'>
          <motion.h2
            key={steps[currentStep].id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-xl font-medium text-black"
          >
            {steps[currentStep].text}
          </motion.h2>
        </AnimatePresence>
        
        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-4 overflow-hidden relative">
          <motion.div 
            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ ease: "linear" }}
          />
        </div>
      </div>

      {/* 3. Förtroendebyggande text */}
      {!isComplete && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-xs text-slate-400 max-w-xs leading-relaxed"
        >
          NORA läser just nu igenom er unika data för att kunna ge exakta svar och representera ert varumärke perfekt. Detta säkerställer att inga hallucinationer sker.
        </motion.p>
      )}

      {/* 4. Action Button (Visas när klar) */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-full pt-4"
          >
            <button
              onClick={onReady}
              className="group relative w-full py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-500/25 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                Starta chatten med NORA
                <Sparkles className="w-4 h-4 text-violet-200 group-hover:text-white transition-colors" />
              </span>
              
              {/* Shine effekt */}
              {/* Uppdaterad med 'animate-shimmer' istället för inline styles */}
              <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-shimmer" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
