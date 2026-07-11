'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MappingItem {
  id: number;
  raw: string;
  target: string;
  delay: number;
}

const mappingData: MappingItem[] = [
  { id: 1, raw: 'Contact No.', target: 'mobile_without_country_code', delay: 0.2 },
  { id: 2, raw: 'phn', target: 'mobile_without_country_code', delay: 1.0 },
  { id: 3, raw: 'Full Name', target: 'name', delay: 1.8 },
  { id: 4, raw: 'e-mail ID', target: 'email', delay: 2.6 },
  { id: 5, raw: 'Mobile#', target: 'mobile_without_country_code', delay: 3.4 }
];

export function SignatureHeroAnimation() {
  const prefersReducedMotion = useReducedMotion();
  const [snappedList, setSnappedList] = useState<Record<number, boolean>>({});
  const [activeLines, setActiveLines] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (prefersReducedMotion) return;

    const timers: NodeJS.Timeout[] = [];
    
    // Cycle the animation infinitely
    const runAnimationCycle = () => {
      setSnappedList({});
      setActiveLines({});

      mappingData.forEach((item) => {
        // Trigger snap event after travel duration (approx 1.2s travel time + delay)
        const snapTime = (item.delay + 1.2) * 1000;
        
        const snapTimer = setTimeout(() => {
          setSnappedList(prev => ({ ...prev, [item.id]: true }));
          setActiveLines(prev => ({ ...prev, [item.id]: true }));

          // Fade line after 1 second
          const lineTimer = setTimeout(() => {
            setActiveLines(prev => ({ ...prev, [item.id]: false }));
          }, 1000);
          timers.push(lineTimer);

        }, snapTime);
        
        timers.push(snapTimer);
      });

      // Restart cycle after 6.5s
      const restartTimer = setTimeout(() => {
        runAnimationCycle();
      }, 6500);
      timers.push(restartTimer);
    };

    runAnimationCycle();

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [prefersReducedMotion]);

  // Fallback for prefers-reduced-motion
  if (prefersReducedMotion) {
    return (
      <div className="flex flex-col space-y-6 p-6 border border-line rounded-2xl bg-line/10 w-full max-w-md mx-auto">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">Static Column Mapping Pairings</span>
        <div className="space-y-3">
          {mappingData.map(item => (
            <div key={item.id} className="flex items-center justify-between p-2.5 bg-paper rounded-lg border border-line shadow-xs">
              <span className="font-mono text-xs text-ink-muted">{item.raw}</span>
              <span className="text-xs font-mono font-semibold text-match">→</span>
              <span className="font-mono text-xs text-ink font-semibold">{item.target}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-lg h-[340px] border border-line rounded-2xl bg-line/10 p-6 flex items-center justify-between overflow-hidden shadow-xs">
      <div className="absolute top-4 left-6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-ink-muted">AI Mapping Pipeline</span>
      </div>

      {/* Raw Columns (Left) */}
      <div className="flex flex-col space-y-4 z-10 w-1/3">
        {mappingData.map((item) => (
          <div key={item.id} className="relative h-10 flex items-center">
            {/* The Floating Chip */}
            <motion.div
              initial={{ x: 0, opacity: 0.4 }}
              animate={{
                x: [0, 160, 220],
                y: [0, -10, 0], // subtle curve path
                opacity: [0.4, 1, 0]
              }}
              transition={{
                duration: 1.5,
                delay: item.delay,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatDelay: 5.0
              }}
              className="absolute font-mono text-[10px] text-ink-muted bg-paper border border-line/60 px-2.5 py-1.5 rounded shadow-xs whitespace-nowrap"
            >
              {item.raw}
            </motion.div>
            
            {/* Static Ghost Chip */}
            <div className="font-mono text-[10px] text-ink-muted/30 border border-dashed border-line/40 px-2.5 py-1.5 rounded whitespace-nowrap select-none">
              {item.raw}
            </div>
          </div>
        ))}
      </div>

      {/* Connection Lines Container */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full">
          {mappingData.map((item) => {
            const isActive = activeLines[item.id];
            // Y-coordinates roughly mapped to the rows
            const yStart = 64 + (item.id - 1) * 56;
            let yEnd = 80; // target 'mobile_without_country_code'
            if (item.target === 'name') yEnd = 160;
            if (item.target === 'email') yEnd = 240;

            return (
              <motion.path
                key={item.id}
                d={`M 140 ${yStart} C 200 ${yStart}, 220 ${yEnd}, 300 ${yEnd}`}
                fill="none"
                stroke="var(--match)"
                strokeWidth={1.5}
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{
                  opacity: isActive ? [0, 0.8, 0] : 0,
                  pathLength: isActive ? [0, 1, 1] : 0
                }}
                transition={{
                  duration: 1.0,
                  ease: 'easeInOut'
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Target CRM Slots (Right) */}
      <div className="flex flex-col space-y-8 z-10 w-[180px]">
        {/* Slot: mobile_without_country_code */}
        <motion.div
          animate={{
            borderColor: (snappedList[1] || snappedList[2] || snappedList[5]) ? 'var(--match)' : 'rgba(20,22,31,0.08)',
            boxShadow: (snappedList[1] || snappedList[2] || snappedList[5]) ? '0 0 10px rgba(47, 216, 149, 0.4)' : 'none'
          }}
          transition={{ duration: 0.3 }}
          className="bg-paper border px-3 py-2 rounded-lg flex flex-col justify-center min-h-[50px] relative"
        >
          <span className="text-[9px] font-mono text-ink-muted/60 uppercase">CRM Target Slot</span>
          <span className="font-mono text-xs font-semibold text-ink truncate mt-0.5">
            mobile_without_country_code
          </span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: (snappedList[1] || snappedList[2] || snappedList[5]) ? [1.2, 1] : 0 }}
            className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-match flex items-center justify-center border border-paper shadow-sm"
          />
        </motion.div>

        {/* Slot: name */}
        <motion.div
          animate={{
            borderColor: snappedList[3] ? 'var(--match)' : 'rgba(20,22,31,0.08)',
            boxShadow: snappedList[3] ? '0 0 10px rgba(47, 216, 149, 0.4)' : 'none'
          }}
          transition={{ duration: 0.3 }}
          className="bg-paper border px-3 py-2 rounded-lg flex flex-col justify-center min-h-[50px] relative"
        >
          <span className="text-[9px] font-mono text-ink-muted/60 uppercase">CRM Target Slot</span>
          <span className="font-mono text-xs font-semibold text-ink truncate mt-0.5">
            name
          </span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: snappedList[3] ? [1.2, 1] : 0 }}
            className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-match flex items-center justify-center border border-paper shadow-sm"
          />
        </motion.div>

        {/* Slot: email */}
        <motion.div
          animate={{
            borderColor: snappedList[4] ? 'var(--match)' : 'rgba(20,22,31,0.08)',
            boxShadow: snappedList[4] ? '0 0 10px rgba(47, 216, 149, 0.4)' : 'none'
          }}
          transition={{ duration: 0.3 }}
          className="bg-paper border px-3 py-2 rounded-lg flex flex-col justify-center min-h-[50px] relative"
        >
          <span className="text-[9px] font-mono text-ink-muted/60 uppercase">CRM Target Slot</span>
          <span className="font-mono text-xs font-semibold text-ink truncate mt-0.5">
            email
          </span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: snappedList[4] ? [1.2, 1] : 0 }}
            className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-match flex items-center justify-center border border-paper shadow-sm"
          />
        </motion.div>
      </div>
    </div>
  );
}
