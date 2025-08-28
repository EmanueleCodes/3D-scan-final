import React, { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Triangle } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/blinds.js"
import { addPropertyControls, ControlType, RenderTarget } from "framer";

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicWidth 300
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */
interface GradientBlindsProps {
  className?: string;
  dpr?: number;
  paused?: boolean;
  colors?: {
    paletteCount?: number;
    bgColor?: string;
    color1?: string;
    color2?: string;
    color3?: string;
    color4?: string;
    color5?: string;
    color6?: string;
    color7?: string;
    color8?: string;
  };
  angle?: number;
  noise?: number;
  blindCount?: number;
  blindMinWidth?: number;
  mirrorGradient?: boolean;
  spotlight?: {
    radius?: number;
    softness?: number;
    opacity?: number;
    mouseDampening?: number;
  };
  distortAmount?: number;
  shineDirection?: "left" | "right";
  mixBlendMode?: string;
}

const MAX_COLORS = 8;

// CSS variable token and color parsing (hex/rgba/var())
const cssVariableRegex =
    /var\s*\(\s*(--[\w-]+)(?:\s*,\s*((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*))?\s*\)/

function extractDefaultValue(cssVar: string): string {
    if (!cssVar || !cssVar.startsWith("var(")) return cssVar
    const match = cssVariableRegex.exec(cssVar)
    if (!match) return cssVar
    const fallback = (match[2] || "").trim()
    if (fallback.startsWith("var(")) return extractDefaultValue(fallback)
    return fallback || cssVar
}

function resolveTokenColor(input: any): any {
    if (typeof input !== "string") return input
    if (!input.startsWith("var(")) return input
    return extractDefaultValue(input)
}

function parseColorToRgba(input: string): {
    r: number
    g: number
    b: number
    a: number
} {
    if (!input) return { r: 0, g: 0, b: 0, a: 1 }
    const str = input.trim()
    
    // rgba(R,G,B,A)
    const rgbaMatch = str.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i
    )
    if (rgbaMatch) {
        const r = Math.max(0, Math.min(255, parseFloat(rgbaMatch[1]))) / 255
        const g = Math.max(0, Math.min(255, parseFloat(rgbaMatch[2]))) / 255
        const b = Math.max(0, Math.min(255, parseFloat(rgbaMatch[3]))) / 255
        const a =
            rgbaMatch[4] !== undefined
                ? Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
                : 1
        return { r, g, b, a }
    }
    
    // #RRGGBBAA or #RRGGBB
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        const a = parseInt(hex.slice(6, 8), 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16) / 255
        const g = parseInt(hex.slice(2, 4), 16) / 255
        const b = parseInt(hex.slice(4, 6), 16) / 255
        return { r, g, b, a: 1 }
    }
    if (hex.length === 4) {
        // #RGBA
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        const a = parseInt(hex[3] + hex[3], 16) / 255
        return { r, g, b, a }
    }
    if (hex.length === 3) {
        // #RGB
        const r = parseInt(hex[0] + hex[0], 16) / 255
        const g = parseInt(hex[1] + hex[1], 16) / 255
        const b = parseInt(hex[2] + hex[2], 16) / 255
        return { r, g, b, a: 1 }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

const hexToRGB = (hex: string): [number, number, number] => {
  const c = hex.replace("#", "").padEnd(6, "0");
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return [r, g, b];
};
const prepStops = (stops?: string[], paletteCount?: number) => {
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('prepStops - Input stops:', stops);
    console.log('prepStops - Type of stops:', typeof stops);
    console.log('prepStops - Is array:', Array.isArray(stops));
  }
  
  // Ensure we have valid colors and handle edge cases
  let base: string[];
  
  if (stops && Array.isArray(stops) && stops.length > 0) {
    // Filter out invalid colors, resolve CSS variables, and ensure they have # prefix
    base = stops
      .filter(color => color && typeof color === 'string' && color.trim() !== '')
      .map(color => {
        const resolved = resolveTokenColor(color);
        const rgba = parseColorToRgba(resolved);
        // Convert back to hex for the shader
        const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
        return `#${toHex(rgba.r)}${toHex(rgba.g)}${toHex(rgba.b)}`;
      })
      .slice(0, MAX_COLORS);
    
    if (typeof window !== 'undefined') {
      console.log('prepStops - Filtered base colors:', base);
    }
  } else {
    base = ["#FF9FFC", "#5227FF"];
    if (typeof window !== 'undefined') {
      console.log('prepStops - Using default colors:', base);
    }
  }
  
  // Ensure we have at least 2 colors
  if (base.length === 0) {
    base = ["#FF9FFC", "#5227FF"];
  } else if (base.length === 1) {
    base.push(base[0]);
  }
  
  // Fill remaining slots with the last color
  while (base.length < MAX_COLORS) {
    base.push(base[base.length - 1]);
  }
  
  const arr: [number, number, number][] = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    arr.push(hexToRGB(base[i]));
  }
  
  // Use the actual number of colors provided, not the padded array length
  const actualCount = Math.max(1, Math.min(MAX_COLORS, paletteCount || stops?.length || 2));
  
  if (typeof window !== 'undefined') {
    console.log('prepStops - Final result:', { base, arr, count: actualCount });
  }
  
  return { arr, count: actualCount };
};

export default function GradientBlinds ({
  className,
  dpr,
  paused = false,
  colors,
  angle = 0,
  noise = 0.3,
  blindCount = 16,
  blindMinWidth = 60,
  mirrorGradient = false,
  spotlight = { radius: 0.5, softness: 1, opacity: 1, mouseDampening: 0.3},
  distortAmount = 0,
  shineDirection = "left",
  mixBlendMode = "lighten",
}: GradientBlindsProps) {
  const bgColor = colors?.bgColor;
  const mouseDampening = spotlight?.mouseDampening || 0.3;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const programRef = useRef<typeof Program | null>(null);
  const meshRef = useRef<typeof Mesh | null>(null);
  const geometryRef = useRef<typeof Triangle | null>(null);
  const rendererRef = useRef<typeof Renderer | null>(null);
  const mouseTargetRef = useRef<[number, number]>([0, 0]);
  const lastTimeRef = useRef<number>(0);
  const firstResizeRef = useRef<boolean>(true);

  // Debug effect to monitor gradientColors changes
  useEffect(() => {
    if (RenderTarget.current() === RenderTarget.canvas) {
      console.log('GradientBlinds - gradientColors prop changed:', colors);
    }
  }, [colors]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      dpr:
        dpr ??
        (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
      alpha: true,
      antialias: true,
      background: null, // Ensure no background color is set
      premultipliedAlpha: false, // Important for proper alpha blending
    });
    rendererRef.current = renderer;
    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;

    // Ensure WebGL context is transparent
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.margin = "0";
    canvas.style.padding = "0";
    canvas.style.background = "transparent"; // Ensure canvas background is transparent
    canvas.style.backgroundColor = "transparent"; // Double-check canvas background
    container.appendChild(canvas);

    const vertex = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

    const fragment = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec3  iResolution;
uniform vec2  iMouse;
uniform float iTime;

uniform float uAngle;
uniform float uNoise;
uniform float uBlindCount;
uniform float uSpotlightRadius;
uniform float uSpotlightSoftness;
uniform float uSpotlightOpacity;
uniform float uMirror;
uniform float uDistort;
uniform float uShineFlip;
uniform vec3  uColor0;
uniform vec3  uColor1;
uniform vec3  uColor2;
uniform vec3  uColor3;
uniform vec3  uColor4;
uniform vec3  uColor5;
uniform vec3  uColor6;
uniform vec3  uColor7;
uniform int   uColorCount;

varying vec2 vUv;

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453);
}

vec2 rotate2D(vec2 p, float a){
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c) * p;
}

vec3 getGradientColor(float t){
  float tt = clamp(t, 0.0, 1.0);
  int count = uColorCount;
  if (count < 2) count = 2;
  float scaled = tt * float(count - 1);
  float seg = floor(scaled);
  float f = fract(scaled);

  if (seg < 1.0) return mix(uColor0, uColor1, f);
  if (seg < 2.0 && count > 2) return mix(uColor1, uColor2, f);
  if (seg < 3.0 && count > 3) return mix(uColor2, uColor3, f);
  if (seg < 4.0 && count > 4) return mix(uColor3, uColor4, f);
  if (seg < 5.0 && count > 5) return mix(uColor4, uColor5, f);
  if (seg < 6.0 && count > 6) return mix(uColor5, uColor6, f);
  if (seg < 7.0 && count > 7) return mix(uColor6, uColor7, f);
  if (count > 7) return uColor7;
  if (count > 6) return uColor6;
  if (count > 5) return uColor5;
  if (count > 4) return uColor4;
  if (count > 3) return uColor3;
  if (count > 2) return uColor2;
  return uColor1;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv0 = fragCoord.xy / iResolution.xy;

    float aspect = iResolution.x / iResolution.y;
    vec2 p = uv0 * 2.0 - 1.0;
    p.x *= aspect;
    vec2 pr = rotate2D(p, uAngle);
    pr.x /= aspect;
    vec2 uv = pr * 0.5 + 0.5;

    vec2 uvMod = uv;
    if (uDistort > 0.0) {
      float a = uvMod.y * 6.0;
      float b = uvMod.x * 6.0;
      float w = 0.01 * uDistort;
      uvMod.x += sin(a) * w;
      uvMod.y += cos(b) * w;
    }
    float t = uvMod.x;
    if (uMirror > 0.5) {
      t = 1.0 - abs(1.0 - 2.0 * fract(t));
    }
    vec3 base = getGradientColor(t);

    vec2 offset = vec2(iMouse.x/iResolution.x, iMouse.y/iResolution.y);
  float d = length(uv0 - offset);
  float r = max(uSpotlightRadius, 1e-4);
  float dn = d / r;
  float spot = (1.0 - 2.0 * pow(dn, uSpotlightSoftness)) * uSpotlightOpacity;
  vec3 cir = vec3(spot);
  float stripe = fract(uvMod.x * max(uBlindCount, 1.0));
  if (uShineFlip > 0.5) stripe = 1.0 - stripe;
    vec3 ran = vec3(stripe);

    vec3 col = cir + base - ran;
    col += (rand(gl_FragCoord.xy + iTime) - 0.5) * uNoise;

    // Calculate alpha based on content - transparent where there's no effect
    float alpha = max(max(col.r, col.g), col.b);
    alpha = clamp(alpha, 0.0, 1.0);
    
    fragColor = vec4(col, alpha);
}

void main() {
    vec4 color;
    mainImage(color, vUv * iResolution.xy);
    gl_FragColor = color;
}
`;

    const { arr: colorArr, count: colorCount } = prepStops([
      colors?.color1, colors?.color2, colors?.color3, colors?.color4, colors?.color5, colors?.color6, colors?.color7, colors?.color8
    ].filter(Boolean) as string[], colors?.paletteCount);
    
    // Debug logging to help troubleshoot color issues
    if (RenderTarget.current() === RenderTarget.canvas) {
      console.log('GradientBlinds - Background color:', bgColor);
      console.log('GradientBlinds - Resolved background:', bgColor ? resolveTokenColor(bgColor) : null);
      console.log('GradientBlinds - Palette count:', colors?.paletteCount);
      console.log('GradientBlinds - Input colors:', [colors?.color1, colors?.color2, colors?.color3, colors?.color4, colors?.color5, colors?.color6, colors?.color7, colors?.color8]);
      console.log('GradientBlinds - Resolved colors:', [
        colors?.color1 ? resolveTokenColor(colors.color1) : null,
        colors?.color2 ? resolveTokenColor(colors.color2) : null,
        colors?.color3 ? resolveTokenColor(colors.color3) : null,
        colors?.color4 ? resolveTokenColor(colors.color4) : null,
        colors?.color5 ? resolveTokenColor(colors.color5) : null,
        colors?.color6 ? resolveTokenColor(colors.color6) : null,
        colors?.color7 ? resolveTokenColor(colors.color7) : null,
        colors?.color8 ? resolveTokenColor(colors.color8) : null,
      ]);
      console.log('GradientBlinds - Processed colors:', colorArr);
      console.log('GradientBlinds - Color count:', colorCount);
    }
    
    const uniforms: {
      iResolution: { value: [number, number, number] };
      iMouse: { value: [number, number] };
      iTime: { value: number };
      uAngle: { value: number };
      uNoise: { value: number };
      uBlindCount: { value: number };
      uSpotlightRadius: { value: number };
      uSpotlightSoftness: { value: number };
      uSpotlightOpacity: { value: number };
      uMirror: { value: number };
      uDistort: { value: number };
      uShineFlip: { value: number };
      uColor0: { value: [number, number, number] };
      uColor1: { value: [number, number, number] };
      uColor2: { value: [number, number, number] };
      uColor3: { value: [number, number, number] };
      uColor4: { value: [number, number, number] };
      uColor5: { value: [number, number, number] };
      uColor6: { value: [number, number, number] };
      uColor7: { value: [number, number, number] };
      uColorCount: { value: number };
    } = {
      iResolution: {
        value: [gl.drawingBufferWidth, gl.drawingBufferHeight, 1],
      },
      iMouse: { value: [0, 0] },
      iTime: { value: 0 },
      uAngle: { value: (angle * Math.PI) / 180 },
      uNoise: { value: noise },
      uBlindCount: { value: Math.max(1, blindCount) },
      uSpotlightRadius: { value: spotlight?.radius ?? 0.5 },
      uSpotlightSoftness: { value: spotlight?.softness ?? 1 },
      uSpotlightOpacity: { value: spotlight?.opacity ?? 1 },
      uMirror: { value: mirrorGradient ? 1 : 0 },
      uDistort: { value: distortAmount },
      uShineFlip: { value: shineDirection === "right" ? 1 : 0 },
      uColor0: { value: colorArr[0] },
      uColor1: { value: colorArr[1] },
      uColor2: { value: colorArr[2] },
      uColor3: { value: colorArr[3] },
      uColor4: { value: colorArr[4] },
      uColor5: { value: colorArr[5] },
      uColor6: { value: colorArr[6] },
      uColor7: { value: colorArr[7] },
      uColorCount: { value: colorCount },
    };

    // Debug logging for uniforms
    if (RenderTarget.current() === RenderTarget.canvas) {
      console.log('GradientBlinds - Spotlight values:', {
        radius: spotlight?.radius,
        softness: spotlight?.softness,
        opacity: spotlight?.opacity,
        mouseDampening: spotlight?.mouseDampening,
      });
      console.log('GradientBlinds - Uniforms:', {
        uSpotlightRadius: uniforms.uSpotlightRadius.value,
        uSpotlightSoftness: uniforms.uSpotlightSoftness.value,
        uSpotlightOpacity: uniforms.uSpotlightOpacity.value,
        uColorCount: uniforms.uColorCount.value,
        uColor0: uniforms.uColor0.value,
        uColor1: uniforms.uColor1.value,
        uColor2: uniforms.uColor2.value,
        uColor3: uniforms.uColor3.value,
      });
    }

    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms,
    });
    programRef.current = program;

    const geometry = new Triangle(gl);
    geometryRef.current = geometry;
    const mesh = new Mesh(gl, { geometry, program });
    meshRef.current = mesh;

    const resize = () => {
      // Use clientWidth/clientHeight for more reliable sizing in Framer Canvas
      const width = Math.max(container.clientWidth, 2);
      const height = Math.max(container.clientHeight, 2);
      renderer.setSize(width, height);
      uniforms.iResolution.value = [
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        1,
      ];

      if (blindMinWidth && blindMinWidth > 0) {
        const maxByMinWidth = Math.max(
          1,
          Math.floor(width / blindMinWidth)
        );

        const effective = blindCount
          ? Math.min(blindCount, maxByMinWidth)
          : maxByMinWidth;
        uniforms.uBlindCount.value = Math.max(1, effective);
      } else {
        uniforms.uBlindCount.value = Math.max(1, blindCount);
      }

      if (firstResizeRef.current) {
        firstResizeRef.current = false;
        const cx = gl.drawingBufferWidth / 2;
        const cy = gl.drawingBufferHeight / 2;
        uniforms.iMouse.value = [cx, cy];
        mouseTargetRef.current = [cx, cy];
      }
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // In Canvas mode, force extra resizes to settle layout and avoid padding issues
    if (RenderTarget.current() === RenderTarget.canvas) {
      setTimeout(resize, 50);
      setTimeout(resize, 150);
    }

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = (renderer as unknown as { dpr?: number }).dpr || 1;
      const x = (e.clientX - rect.left) * scale;
      const y = (rect.height - (e.clientY - rect.top)) * scale;
      mouseTargetRef.current = [x, y];
      if (mouseDampening <= 0) {
        uniforms.iMouse.value = [x, y];
      }
    };
    canvas.addEventListener("pointermove", onPointerMove);

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop);
      uniforms.iTime.value = t * 0.001;
      if (mouseDampening > 0) {
        if (!lastTimeRef.current) lastTimeRef.current = t;
        const dt = (t - lastTimeRef.current) / 1000;
        lastTimeRef.current = t;
        const tau = Math.max(1e-4, mouseDampening);
        let factor = 1 - Math.exp(-dt / tau);
        if (factor > 1) factor = 1;
        const target = mouseTargetRef.current;
        const cur = uniforms.iMouse.value;
        cur[0] += (target[0] - cur[0]) * factor;
        cur[1] += (target[1] - cur[1]) * factor;
      } else {
        lastTimeRef.current = t;
      }
      if (!paused && programRef.current && meshRef.current) {
        try {
          renderer.render({ scene: meshRef.current });
        } catch (e) {
          console.error(e);
        }
      }
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener("pointermove", onPointerMove);
      ro.disconnect();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
      const callIfFn = <T extends object, K extends keyof T>(
        obj: T | null,
        key: K
      ) => {
        if (obj && typeof obj[key] === "function") {
          (obj[key] as unknown as () => void).call(obj);
        }
      };
      callIfFn(programRef.current, "remove");
      callIfFn(geometryRef.current, "remove");
      callIfFn(meshRef.current as unknown as { remove?: () => void }, "remove");
      callIfFn(
        rendererRef.current as unknown as { destroy?: () => void },
        "destroy"
      );
      programRef.current = null;
      geometryRef.current = null;
      meshRef.current = null;
      rendererRef.current = null;
    };
  }, [
    dpr,
    paused,
    bgColor,
    colors,
    angle,
    noise,
    blindCount,
    blindMinWidth,
    mirrorGradient,
    spotlight,
    distortAmount,
    shineDirection,
  ]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
        background: bgColor || "#000000",
        ...(mixBlendMode && {
          mixBlendMode: mixBlendMode as React.CSSProperties["mixBlendMode"],
        }),
      }}
    >
      {/* WebGL canvas container */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
};

GradientBlinds.defaultProps = {
  paused: false,
  angle: 0,
  noise: 0.3,
  blindCount: 16,
  blindMinWidth: 60,
  mirrorGradient: false,
  spotlight: { radius: 0.5, softness: 1, opacity: 1, mouseDampening: 0.3 },
  distortAmount: 0,
  shineDirection: "left" as const,
  mixBlendMode: "lighten" as const,
  bgColor: "#000000",
  colors: {
    paletteCount: 2,
    color1: "#FF9FFC",
    color2: "#5227FF",
    color3: "#FF9FFC",
    color4: "#5227FF",
    color5: "#FF9FFC",
    color6: "#5227FF",
    color7: "#FF9FFC",
    color8: "#FF9FFC",
  },
};

addPropertyControls(GradientBlinds, {
  dpr: {
    type: ControlType.Number,
    title: "Resolution",
    min: 0.5,
    max: 3,
    step: 0.1,
    defaultValue:2
  },
  paused: {
    type: ControlType.Boolean,
    title: "paused",
    hidden:()=> true,
    defaultValue: true,
  },
  blindCount: {
    type: ControlType.Number,
    title: "Blinds",
    min: 1,
    max: 50,
    step: 1,
  },
  blindMinWidth: {
    type: ControlType.Number,
    title: "Min W",
    min: 10,
    max: 200,
    unit: "px",
  },
  angle: {
    type: ControlType.Number,
    title: "angle",
    min: 0,
    max: 360,
    unit: "°",
  },
  noise: {
    type: ControlType.Number,
    title: "noise",
    min: 0,
    max: 1,
    step: 0.1,
  },
  distortAmount: {
    type: ControlType.Number,
    title: "Waveness",
    min: 0,
    max: 10,
    step: 0.1,
  },
  shineDirection: {
    type: ControlType.Enum,
    title: "Direction",
    options: ["left", "right"],
  },
  mirrorGradient: {
    type: ControlType.Boolean,
    title: "Mirror",
  },
  mixBlendMode: {
    type: ControlType.Enum,
    title: "Blend Mode",
    options: ["Normal", "Multiply", "Screen", "Overlay", "Darken", "Lighten", "Color-dodge", "Color-burn", "Hard-light", "Soft-light", "Difference", "Exclusion", "Hue", "Saturation", "Color", "Luminosity"],
  },
  spotlight: {
    type: ControlType.Object,
    title: "spotlight",
    controls: {
      radius: {
        type: ControlType.Number,
        title: "radius",
        min: 0.1,
        max: 2,
        step: 0.1,
      },
      mouseDampening: {
        type: ControlType.Number,
        title: "Smoothing",
        min: 0.1,
        max: 1,
        step: 0.1,
        defaultValue: 0.3,
      },
      
      softness: {
        type: ControlType.Number,
        title: "Presence",
        min: 0.1,
        max: 3,
        step: 0.1,
      },
      opacity: {
        type: ControlType.Number,
        title: "opacity",
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 1,
        // Controls the intensity of the spotlight effect (0 = no spotlight, 1 = full spotlight)
      },
    },
  },
  
  colors: {
    type: ControlType.Object,
    title: "Colors",
    controls: {
      paletteCount: {
        type: ControlType.Number,
        title: "Palette Size",
        min: 1,
        max: 8,
        step: 1,
        defaultValue: 2,
      },
      bgColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#000000",
        // Supports Framer color tokens and opacity (e.g., var(--token-bg, #000000) or rgba(0,0,0,0.5))
      },
      color1: {
        type: ControlType.Color,
        title: "Color 1",
        defaultValue: "#FF9FFC",
      },
      color2: {
        type: ControlType.Color,
        title: "Color 2",
        defaultValue: "#5227FF",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 2,
      },
      color3: {
        type: ControlType.Color,
        title: "Color 3",
        defaultValue: "#FF9FFC",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 3,
      },
      color4: {
        type: ControlType.Color,
        title: "Color 4",
        defaultValue: "#5227FF",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 4,
      },
      color5: {
        type: ControlType.Color,
        title: "Color 5",
        defaultValue: "#FF9FFC",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 5,
      },
      color6: {
        type: ControlType.Color,
        title: "Color 6",
        defaultValue: "#5227FF",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 6,
      },
      color7: {
        type: ControlType.Color,
        title: "Color 7",
        defaultValue: "#FF9FFC",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 7,
      },
      color8: {
        type: ControlType.Color,
        title: "Color 8",
        defaultValue: "#FF9FFC",
        hidden: (props: any) => (props?.paletteCount ?? 2) < 8,
      },
    },
  },
});

