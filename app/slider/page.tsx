'use client'

import React, { useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { Draggable } from 'gsap/Draggable';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

// Register GSAP plugins
gsap.registerPlugin(Draggable, InertiaPlugin);

// Type definitions
interface LoopConfig {
  paused?: boolean;
  draggable?: boolean;
  center?: boolean | HTMLElement | string;
  speed?: number;
  snap?: number | boolean;
  paddingRight?: string | number;
  reversed?: boolean;
  repeat?: number;
  onChange?: (element: HTMLElement, index: number) => void;
}

interface HorizontalLoopTimeline extends gsap.core.Timeline {
  toIndex: (index: number, vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  closestIndex: (setCurrent?: boolean) => number;
  current: () => number;
  next: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  previous: (vars?: gsap.TweenVars) => gsap.core.Tween | gsap.core.Timeline;
  times: number[];
  draggable?: any;
}

// Horizontal loop function (converted from reference.js) - simplified for useGSAP
function createHorizontalLoop(items: HTMLElement[], config: LoopConfig): HorizontalLoopTimeline | null {
  if (!items.length) return null;

  const onChange = config.onChange;
  let lastIndex = 0;
  const tl = gsap.timeline({
    repeat: config.repeat,
    onUpdate: onChange ? function() {
      const i = (tl as any).closestIndex();
      if (lastIndex !== i) {
        lastIndex = i;
        onChange(items[i], i);
      }
    } : undefined,
    paused: config.paused,
    defaults: { ease: "none" },
    onReverseComplete: () => {
      tl.totalTime(tl.rawTime() + tl.duration() * 100);
    }
  }) as HorizontalLoopTimeline;

  const length = items.length;
  const startX = items[0].offsetLeft;
  const times: number[] = [];
  const widths: number[] = [];
  const spaceBefore: number[] = [];
  const xPercents: number[] = [];
  let curIndex = 0;
  let indexIsDirty = false;
  const center = config.center;
  const pixelsPerSecond = (config.speed || 1) * 100;
  const snap = config.snap === false ? (v: number) => v : gsap.utils.snap(typeof config.snap === 'number' ? config.snap : 1);
  let timeOffset = 0;
  const container = center === true ? items[0].parentNode : (center ? (typeof center === 'string' ? gsap.utils.toArray(center)[0] : center) : null) || items[0].parentNode;
  let totalWidth: number;

  const getTotalWidth = () => items[length-1].offsetLeft + xPercents[length-1] / 100 * widths[length-1] - startX + spaceBefore[0] + items[length-1].offsetWidth * (gsap.getProperty(items[length-1], "scaleX") as number) + (parseFloat(String(config.paddingRight)) || 0);

  const populateWidths = () => {
    if (!container) return;
    let b1 = (container as Element).getBoundingClientRect();
    let b2: DOMRect;
    items.forEach((el, i) => {
      widths[i] = parseFloat(gsap.getProperty(el, "width", "px") as string);
      xPercents[i] = snap(parseFloat(gsap.getProperty(el, "x", "px") as string) / widths[i] * 100 + (gsap.getProperty(el, "xPercent") as number));
      b2 = el.getBoundingClientRect();
      spaceBefore[i] = b2.left - (i ? b1.right : b1.left);
      b1 = b2;
    });
    gsap.set(items, {
      xPercent: (i: number) => xPercents[i]
    });
    totalWidth = getTotalWidth();
  };

  let timeWrap: (time: number) => number;

  const populateOffsets = () => {
    if (!container) return;
    const containerWidth = (container as HTMLElement).offsetWidth;
    timeOffset = center ? tl.duration() * (containerWidth / 2) / totalWidth : 0;
    
    console.log('Centering debug:', {
      containerWidth,
      totalWidth,
      timeOffset,
      center: !!center
    });
    
    center && times.forEach((t, i) => {
      times[i] = timeWrap(tl.labels["label" + i] + tl.duration() * widths[i] / 2 / totalWidth - timeOffset);
    });
  };

  const getClosest = (values: number[], value: number, wrap: number) => {
    let i = values.length;
    let closest = 1e10;
    let index = 0;
    let d: number;
    while (i--) {
      d = Math.abs(values[i] - value);
      if (d > wrap / 2) {
        d = wrap - d;
      }
      if (d < closest) {
        closest = d;
        index = i;
      }
    }
    return index;
  };

  const populateTimeline = () => {
    let i: number, item: HTMLElement, curX: number, distanceToStart: number, distanceToLoop: number;
    tl.clear();
    for (i = 0; i < length; i++) {
      item = items[i];
      curX = xPercents[i] / 100 * widths[i];
      distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0];
      distanceToLoop = distanceToStart + widths[i] * (gsap.getProperty(item, "scaleX") as number);
      tl.to(item, {xPercent: snap((curX - distanceToLoop) / widths[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
        .fromTo(item, {xPercent: snap((curX - distanceToLoop + totalWidth) / widths[i] * 100)}, {xPercent: xPercents[i], duration: (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
        .add("label" + i, distanceToStart / pixelsPerSecond);
      times[i] = distanceToStart / pixelsPerSecond;
    }
    timeWrap = gsap.utils.wrap(0, tl.duration());
  };

  const refresh = (deep: boolean) => {
    const progress = tl.progress();
    tl.progress(0, true);
    populateWidths();
    deep && populateTimeline();
    populateOffsets();
    deep && tl.draggable && tl.paused() ? tl.time(times[curIndex], true) : tl.progress(progress, true);
  };

  const onResize = () => refresh(true);
  let proxy: HTMLElement;

  // Initial setup
  gsap.set(items, {x: 0});
  
  populateWidths();
  populateTimeline();
  populateOffsets();
  window.addEventListener("resize", onResize);

  function toIndex(index: number, vars: gsap.TweenVars = {}) {
    (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length);
    const newIndex = gsap.utils.wrap(0, length, index);
    let time = times[newIndex];
    if (time > tl.time() !== index > curIndex && index !== curIndex) {
      time += tl.duration() * (index > curIndex ? 1 : -1);
    }
    if (time < 0 || time > tl.duration()) {
      vars.modifiers = {time: timeWrap};
    }
    curIndex = newIndex;
    vars.overwrite = true;
    gsap.killTweensOf(proxy);
    return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
  }

  tl.toIndex = (index: number, vars?: gsap.TweenVars) => toIndex(index, vars);
  tl.closestIndex = (setCurrent: boolean = false) => {
    const index = getClosest(times, tl.time(), tl.duration());
    if (setCurrent) {
      curIndex = index;
      indexIsDirty = false;
    }
    return index;
  };
  tl.current = () => indexIsDirty ? tl.closestIndex(true) : curIndex;
  tl.next = (vars?: gsap.TweenVars) => toIndex(tl.current()+1, vars);
  tl.previous = (vars?: gsap.TweenVars) => toIndex(tl.current()-1, vars);
  tl.times = times;
  tl.progress(1, true).progress(0, true);

  if (config.reversed) {
    (tl.vars as any).onReverseComplete?.();
    tl.reverse();
  }

  if (config.draggable && typeof(Draggable) === "function") {
    proxy = document.createElement("div");
    const wrap = gsap.utils.wrap(0, 1);
    let ratio: number, startProgress: number, draggable: any, lastSnap: number, initChangeX: number, wasPlaying: boolean;
    
    const align = () => {
      tl.progress(wrap(startProgress + (draggable.startX - draggable.x) * ratio));
    };
    const syncIndex = () => tl.closestIndex(true);
    
    draggable = Draggable.create(proxy, {
      trigger: items[0].parentNode as Element,
      type: "x",
      onPressInit() {
        const x = this.x;
        gsap.killTweensOf(tl);
        wasPlaying = !tl.paused();
        tl.pause();
        startProgress = tl.progress();
        refresh(false);
        ratio = 1 / totalWidth;
        initChangeX = (startProgress / -ratio) - x;
        gsap.set(proxy, {x: startProgress / -ratio});
      },
      onDrag: align,
      onThrowUpdate: align,
      overshootTolerance: 0,
      inertia: true,
      snap(value: number) {
        if (Math.abs(startProgress / -ratio - this.x) < 10) {
          return lastSnap + initChangeX;
        }
        const time = -(value * ratio) * tl.duration();
        const wrappedTime = timeWrap(time);
        const snapTime = times[getClosest(times, wrappedTime, tl.duration())];
        let dif = snapTime - wrappedTime;
        Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
        lastSnap = (time + dif) / tl.duration() / -ratio;
        return lastSnap;
      },
      onRelease() {
        syncIndex();
        draggable.isThrowing && (indexIsDirty = true);
      },
      onThrowComplete: () => {
        syncIndex();
        wasPlaying && tl.play();
      }
    })[0];
    tl.draggable = draggable;
  }

  tl.closestIndex(true);
  lastIndex = curIndex;
  onChange && onChange(items[curIndex], curIndex);
  
  // Debug initial position
  console.log('Initial timeline state:', {
    progress: tl.progress(),
    time: tl.time(),
    duration: tl.duration(),
    currentIndex: tl.current(),
    times: times.slice(0, 5) // First 5 times for debugging
  });
  
  // Store cleanup function for later use
  (tl as any).cleanup = () => window.removeEventListener("resize", onResize);
  
  return tl;
}

export default function SliderPage() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const boxesRef = useRef<HTMLDivElement[]>([]);
  const [showOverflow, setShowOverflow] = useState(false);
  const [activeElement, setActiveElement] = useState<HTMLElement | null>(null);
  const loopRef = useRef<HorizontalLoopTimeline | null>(null);

  // CSS variables for gradients
  const cssVariables = {
    '--color-just-black': '#000000',
    '--color-surface50': '#808080',
    '--gradient-macha': 'linear-gradient(45deg, #4CAF50, #8BC34A)',
    '--gradient-summer-fair': 'linear-gradient(45deg, #FF9800, #FFC107)',
    '--gradient-orange-crush': 'linear-gradient(45deg, #FF5722, #FF9800)'
  };

  // Inline styles
  const styles = {
    body: {
      fontFamily: 'system-ui',
      background: cssVariables['--color-just-black'],
      color: 'white',
      textAlign: 'center' as const,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column' as const,
      height: '100vh',
      margin: 0,
      padding: 0
    },
    buttonCont: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexWrap: 'wrap' as const,
      marginBottom: '2rem',
      gap: '1rem'
    },
    button: {
      padding: '0.5rem 1rem',
      backgroundColor: 'transparent',
      color: 'white',
      border: '2px solid #808080',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'all 0.3s ease'
    },
    wrapper: {
      height: '300px',
      maxHeight: '50vh',
      width: '70%',
      borderLeft: 'dashed 2px #808080',
      borderRight: 'dashed 2px #808080',
      position: 'relative' as const,
      display: 'flex',
      alignItems: 'center',
      overflow: showOverflow ? 'visible' : 'hidden'
    },
    carousel: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: 'auto',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      flexDirection: 'row' as const,
      flexWrap: 'nowrap' as const
    },
    box: {
      padding: '0.5rem',
      flexShrink: 0,
      height: '80%',
      width: '150px', // Fixed width instead of percentage
      minWidth: '150px'
    },
    boxInner: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative' as const,
      fontSize: '21px',
      cursor: 'pointer',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(#000000, #000000) padding-box, var(--gradient) border-box',
      border: '3px solid transparent',
      borderRadius: '10px'
    },
    boxText: {
      WebkitTextFillColor: 'transparent',
      background: 'var(--gradient)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      fontSize: '3rem',
      margin: 0
    }
  };

  // Initialize the horizontal loop using useGSAP
  useGSAP(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(() => {
      if (boxesRef.current.length === 0) return;

      console.log('Initializing horizontal loop with', boxesRef.current.length, 'boxes');
      
      const loop = createHorizontalLoop(boxesRef.current, {
        paused: true,
        draggable: true,
        center: wrapperRef.current || true, // Pass the wrapper element for proper centering
      onChange: (element: HTMLElement, index: number) => {
        setActiveElement(element);
        // Remove active class from all boxes
        boxesRef.current.forEach(box => {
          if (box) box.classList.remove('active');
        });
        // Add active class to current element
        element.classList.add('active');
      }
    });

    if (loop) {
      loopRef.current = loop;

      // Add click handlers to boxes
      boxesRef.current.forEach((box, i) => {
        if (box) {
          const clickHandler = () => {
            if (loop && loop.toIndex) {
              loop.toIndex(i, { duration: 0.8, ease: "power1.inOut" });
            }
          };
          box.addEventListener('click', clickHandler);
          
          // Store the handler for cleanup
          (box as any).__clickHandler = clickHandler;
        }
      });

      // Return cleanup function - useGSAP will handle this automatically
      return () => {
        clearTimeout(timer);
        // Custom cleanup for event listeners
        boxesRef.current.forEach(box => {
          if (box && (box as any).__clickHandler) {
            box.removeEventListener('click', (box as any).__clickHandler);
          }
        });
        
        // Call the timeline's cleanup function
        if ((loop as any).cleanup) {
          (loop as any).cleanup();
        }
      };
    }
    }, 100); // 100ms delay
    
    return () => clearTimeout(timer);
  }, { scope: wrapperRef, dependencies: [] }); // Scope to wrapper element

  const handleNext = () => {
    if (loopRef.current && loopRef.current.next) {
      loopRef.current.next({ duration: 0.4, ease: "power1.inOut" });
    }
  };

  const handlePrev = () => {
    if (loopRef.current && loopRef.current.previous) {
      loopRef.current.previous({ duration: 0.4, ease: "power1.inOut" });
    }
  };

  const handleToggleOverflow = () => {
    setShowOverflow(!showOverflow);
  };

  // Generate boxes with different gradients
  const boxes = Array.from({ length: 11 }, (_, i) => {
    const gradientClass = i % 3 === 0 ? 'gradient-orange-crush' : 
                         i % 3 === 1 ? 'gradient-summer-fair' : 'gradient-macha';
    
    return (
      <div
        key={i}
        ref={el => {
          if (el) boxesRef.current[i] = el;
        }}
        className={`box ${gradientClass}`}
        style={{
          ...styles.box,
          width: i === 4 ? '350px' : '150px' // Special width for box 5, otherwise fixed width
        }}
      >
        <div className="box__inner" style={styles.boxInner}>
          <p style={styles.boxText}>{i + 1}</p>
        </div>
      </div>
    );
  });

  return (
    <div style={styles.body}>
      <style>
        {`
          .box.gradient-macha { --gradient: ${cssVariables['--gradient-macha']}; }
          .box.gradient-summer-fair { --gradient: ${cssVariables['--gradient-summer-fair']}; }
          .box.gradient-orange-crush { --gradient: ${cssVariables['--gradient-orange-crush']}; }
          .box.active .box__inner {
            transform: scale(1.1);
            transition: transform 0.3s ease;
          }
        `}
      </style>
      
      <div style={styles.buttonCont}>
        <button 
          style={styles.button} 
          onClick={handlePrev}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          prev
        </button>
        <button 
          style={styles.button} 
          onClick={handleToggleOverflow}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          toggle overflow
        </button>
        <button 
          style={styles.button} 
          onClick={handleNext}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          next
        </button>
      </div>
      
      <div ref={wrapperRef} style={styles.wrapper}>
        <div style={styles.carousel}>
          {boxes}
        </div>
      </div>
    </div>
  );
}