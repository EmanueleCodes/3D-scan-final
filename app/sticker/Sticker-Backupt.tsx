import React, { useEffect, useRef, useState, useCallback, useMemo } from "react"
import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { ComponentMessage } from "https://framer.com/m/Utils-FINc.js"

// Three.js imports from CDN
import {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    BoxGeometry,
    SkinnedMesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    Texture,
    Vector3,
    Bone,
    Skeleton,
    Float32BufferAttribute,
    Uint16BufferAttribute,
    DoubleSide,
    LinearFilter,
    SRGBColorSpace,
    RGBAFormat,
    Color,
    DirectionalLight,
    AmbientLight,
    PlaneGeometry,
    Mesh,
} from "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js"

// GSAP import from CDN
import gsap from "https://cdn.jsdelivr.net/npm/gsap@3.12.5/+esm"

// OrbitControls import from Three.js examples
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/framer-university/components/npm-bundles/3D-text-rug.js"

// ============================================================================
// TYPES
// ============================================================================

type ResponsiveImageSource =
    | string
    | {
          src?: string
          srcSet?: string | Array<{ src?: string }>
          url?: string
          default?: string
          asset?: { url?: string }
          alt?: string
      }
    | null
    | undefined

interface StickerProps {
    // Preview control (always first)
    preview: boolean
    // Main content
    image?: ResponsiveImageSource
    // Sticker settings
    curlAmount: number
    curlRadius: number
    curlStart: number
    borderColor: string
    boneSegments: number
    // Position controls
    rotXDeg: number
    rotYDeg: number
    rotZDeg: number
    // Lighting and shadows
    enableShadows: boolean
    shadowIntensity: number
    shadowPositionX: number
    shadowPositionY: number
    backgroundColor: string
    // Style (always last)
    style?: React.CSSProperties
}

// Simple image source resolution
const resolveImageSource = (
    input?: ResponsiveImageSource
): string | undefined => {
    if (!input) return undefined
    if (typeof input === "string") return input.trim() || undefined
    return input.src || undefined
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Camera settings
const CAMERA_DISTANCE = 1200
const CAMERA_NEAR = 100
const CAMERA_FAR = 2000

// Sticker geometry - same as Reference for smoothness
const STICKER_DEPTH = 0.003

// Canvas overscan - much larger for curl to extend beyond bounds
const CANVAS_SCALE = 2.5 // Large transparent space around sticker

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateCameraFov(
    width: number,
    height: number,
    distance: number
): number {
    const aspect = width / height
    return 2 * Math.atan(width / aspect / (2 * distance)) * (180 / Math.PI)
}

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

    // Handle rgba() format
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

    // Handle hex formats
    const hex = str.replace(/^#/, "")
    if (hex.length === 8) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: parseInt(hex.slice(6, 8), 16) / 255,
        }
    }
    if (hex.length === 6) {
        return {
            r: parseInt(hex.slice(0, 2), 16) / 255,
            g: parseInt(hex.slice(2, 4), 16) / 255,
            b: parseInt(hex.slice(4, 6), 16) / 255,
            a: 1,
        }
    }
    if (hex.length === 4) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: parseInt(hex[3] + hex[3], 16) / 255,
        }
    }
    if (hex.length === 3) {
        return {
            r: parseInt(hex[0] + hex[0], 16) / 255,
            g: parseInt(hex[1] + hex[1], 16) / 255,
            b: parseInt(hex[2] + hex[2], 16) / 255,
            a: 1,
        }
    }
    return { r: 0, g: 0, b: 0, a: 1 }
}

// ============================================================================
// FRAMER ANNOTATIONS
// ============================================================================

/**
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 400
 * @framerDisableUnlink
 */

export default function Sticker({
    preview = false,
    image,
    curlAmount = 0.3,
    curlRadius = 0.5,
    curlStart = 0.4,
    borderColor = "#ffffff",
    boneSegments = 30,
    rotXDeg = 0,
    rotYDeg = 0,
    rotZDeg = 0,
    enableShadows = true,
    shadowIntensity = 0.5,
    shadowPositionX = 200,
    shadowPositionY = 300,
    backgroundColor = "#ff9500",
    style,
}: StickerProps) {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const sceneRef = useRef<any>(null)
    const rendererRef = useRef<any>(null)
    const cameraRef = useRef<any>(null)
    const meshRef = useRef<any>(null)
    const bonesRef = useRef<any[]>([])
    const zoomProbeRef = useRef<HTMLDivElement>(null)
    const lastSizeRef = useRef({ width: 0, height: 0, zoom: 0 })
    const animationFrameRef = useRef<number | null>(null)
    const loadedImageRef = useRef<HTMLImageElement | null>(null)
    const animatedCurlRef = useRef({ amount: curlAmount }) // Animated curl value for GSAP
    const isHoveringRef = useRef(false) // Track if currently hovering over sticker
    const lightRef = useRef<any>(null)
    const ambientLightRef = useRef<any>(null)
    const backgroundPlaneRef = useRef<any>(null)

    // State
    const [textureLoaded, setTextureLoaded] = useState(false)

    // Detect environment
    const resolvedImageUrl = resolveImageSource(image)
    const isCanvas = RenderTarget.current() === RenderTarget.canvas
    const hasContent = !!resolvedImageUrl

    // ========================================================================
    // CREATE STICKER GEOMETRY WITH SKINNING (like Reference.tsx)
    // ========================================================================

    const createStickerGeometry = useCallback(
        (width: number, height: number, segments: number) => {
            // Create box geometry like the book page - segments along X for bending
            // Scale Y segments with X segments for smoother lighting (ratio ~15:1 like Reference)
            // More Y segments = smoother lighting but slightly slower
            const ySegments = Math.max(2, Math.floor(segments / 5))

            const geometry = new BoxGeometry(
                width,
                height,
                STICKER_DEPTH,
                segments, // X segments for bending
                ySegments, // Y segments scaled for smooth lighting
                1
            )

            // Translate so left edge is at origin (like book page)
            geometry.translate(width / 2, 0, 0)

            // Add skinning attributes (same as Reference.tsx)
            const position = geometry.attributes.position
            const vertex = new Vector3()
            const skinIndexes: number[] = []
            const skinWeights: number[] = []
            const segmentWidth = width / segments

            for (let i = 0; i < position.count; i++) {
                vertex.fromBufferAttribute(position, i)
                const x = vertex.x

                // Calculate bone index based on X position
                const skinIndex = Math.max(0, Math.floor(x / segmentWidth))
                let skinWeight = (x % segmentWidth) / segmentWidth

                skinIndexes.push(
                    skinIndex,
                    Math.min(skinIndex + 1, segments),
                    0,
                    0
                )
                skinWeights.push(1 - skinWeight, skinWeight, 0, 0)
            }

            geometry.setAttribute(
                "skinIndex",
                new Uint16BufferAttribute(skinIndexes, 4)
            )
            geometry.setAttribute(
                "skinWeight",
                new Float32BufferAttribute(skinWeights, 4)
            )

            // Compute smooth normals AFTER skinning attributes to eliminate striations
            // This makes lighting interpolate smoothly across segments
            geometry.computeVertexNormals()

            return geometry
        },
        []
    )

    // ========================================================================
    // SCENE SETUP
    // ========================================================================

    const setupScene = useCallback(() => {
        if (!canvasRef.current || !containerRef.current) return null

        const container = containerRef.current
        const width = container.clientWidth || container.offsetWidth || 1
        const height = container.clientHeight || container.offsetHeight || 1
        const dpr = Math.min(window.devicePixelRatio || 1, 2)

        const canvasWidth = width * CANVAS_SCALE
        const canvasHeight = height * CANVAS_SCALE

        // Create scene
        const scene = new Scene()
        sceneRef.current = scene

        // Create camera
        const camera = new PerspectiveCamera(
            calculateCameraFov(canvasWidth, canvasHeight, CAMERA_DISTANCE),
            canvasWidth / canvasHeight,
            CAMERA_NEAR,
            CAMERA_FAR
        )
        camera.position.set(0, 0, CAMERA_DISTANCE)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Create renderer
        const renderer = new WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: true,
        })
        renderer.setSize(
            Math.round(canvasWidth * dpr),
            Math.round(canvasHeight * dpr),
            false
        )
        renderer.setPixelRatio(1)

        // Enable shadow maps if shadows are enabled
        if (enableShadows) {
            renderer.shadowMap.enabled = true
            // Enable dithering to reduce shadow acne and banding
            renderer.dithering = true
        }

        rendererRef.current = renderer

        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`

        // Create geometry
        const geometry = createStickerGeometry(width, height, boneSegments)

        // Create bones along X axis (like book page)
        const bones: any[] = []
        const segmentWidth = width / boneSegments

        for (let i = 0; i <= boneSegments; i++) {
            const bone = new Bone()
            bone.position.x = i === 0 ? 0 : segmentWidth
            if (i > 0) {
                bones[i - 1].add(bone)
            }
            bones.push(bone)
        }

        bonesRef.current = bones
        const skeleton = new Skeleton(bones)

        // Create materials for front and back
        // Use MeshStandardMaterial with low roughness (0.1) like Reference.tsx for smoothness
        // This prevents striations while still casting shadows
        const resolvedBorderColor = resolveTokenColor(borderColor)
        const borderColorRgba = parseColorToRgba(resolvedBorderColor)

        let frontMaterial: any
        let backMaterial: any
        let sideMaterial: any

        if (enableShadows) {
            // All faces use MeshStandardMaterial with smooth roughness (like Reference.tsx)
            frontMaterial = new MeshStandardMaterial({
                color: 0xffffff,
                side: DoubleSide,
                transparent: true,
                roughness: 0.2, // Higher roughness = more diffuse, reduces contrast
                metalness: 0.4,
                // Add emissive to reduce lighting dependency and striations
                emissive: 0xffffff,
                emissiveIntensity: 0.8, // High emissive to reduce lighting contrast between segments
            })

            // Back face: transparent with image texture, but darker with shadow overlay
            backMaterial = new MeshStandardMaterial({
                color: 0xffffff, // White base to show image colors
                side: DoubleSide,
                transparent: true,
                roughness: 0.3, // Slightly rougher for subtle shadow effect
                metalness: 0.0,
                // Lower emissive than front to allow shadow/lighting overlay
                emissive: 0xffffff,
                emissiveIntensity: 0.3, // Lower emissive = more affected by lighting/shadows
            })

            // Side material is fully transparent to avoid visible striations from segments
            sideMaterial = new MeshStandardMaterial({
                color: new Color(
                    borderColorRgba.r,
                    borderColorRgba.g,
                    borderColorRgba.b
                ),
                transparent: true,
                opacity: 1, // Hide side faces completely (they're negligibly thin)
                roughness: 0.1,
                metalness: 0.0,
            })
        } else {
            // No shadows: use MeshBasicMaterial for all (simpler, no lighting needed)
            frontMaterial = new MeshBasicMaterial({
                color: 0xffffff,
                side: DoubleSide,
                transparent: true,
            })

            backMaterial = new MeshBasicMaterial({
                color: new Color(
                    borderColorRgba.r,
                    borderColorRgba.g,
                    borderColorRgba.b
                ),
                side: DoubleSide,
            })

            sideMaterial = new MeshBasicMaterial({
                color: new Color(
                    borderColorRgba.r,
                    borderColorRgba.g,
                    borderColorRgba.b
                ),
                transparent: true,
                opacity: 0,
            })
        }

        // Materials array for BoxGeometry faces
        // Order: +X, -X, +Y, -Y, +Z (front), -Z (back)
        const materials = [
            sideMaterial, // right
            sideMaterial, // left
            sideMaterial, // top
            sideMaterial, // bottom
            frontMaterial, // front (image side)
            backMaterial, // back (paper backing)
        ]

        // Create skinned mesh
        const mesh = new SkinnedMesh(geometry, materials)
        mesh.add(bones[0])
        mesh.bind(skeleton)
        mesh.frustumCulled = false

        // Enable shadows if configured
        // According to Three.js forum: setting both castShadow and receiveShadow can cause acne
        // The sticker casts shadows onto the background plane, but doesn't need to receive them
        if (enableShadows) {
            mesh.castShadow = true
            mesh.receiveShadow = false // Don't receive shadows to avoid acne
        }

        // Position mesh so it's centered
        mesh.position.set(-width / 2, 0, 0)

        meshRef.current = mesh
        scene.add(mesh)

        // Add lighting if shadows are enabled
        if (enableShadows) {
            // Calculate initial light intensities based on shadowIntensity
            // High shadowIntensity = strong directional, low ambient = dark shadows
            // At shadowIntensity = 1, make shadows very dramatic (strong directional, low ambient)
            const initialLightIntensity = 0.3 + shadowIntensity * 1.7 // 0.3 to 2.0 (more dramatic at max)
            const initialAmbientIntensity = Math.max(
                1.0 - shadowIntensity * 0.6,
                0.4
            ) // 1.0 to 0.4 (lower at max for drama)

            // Ambient light for overall scene illumination
            // Higher ambient reduces contrast between segments
            const ambientLight = new AmbientLight(0xffffff, 0.8)
            ambientLightRef.current = ambientLight
            scene.add(ambientLight)

            // Directional light for shadows (reduced intensity to minimize band contrast)
            const directionalLight = new DirectionalLight(
                0xffffff,
                initialLightIntensity
            )
            directionalLight.position.set(shadowPositionX, shadowPositionY, 400)
            directionalLight.castShadow = true

            // Configure shadow map
            directionalLight.shadow.mapSize.width = 2048
            directionalLight.shadow.mapSize.height = 2048
            directionalLight.shadow.camera.near = 100
            directionalLight.shadow.camera.far = 2000
            directionalLight.shadow.camera.left = -width * 2
            directionalLight.shadow.camera.right = width * 2
            directionalLight.shadow.camera.top = height * 2
            directionalLight.shadow.camera.bottom = -height * 2
            // Negative bias helps prevent shadow acne (per Three.js forum recommendations)
            // Small negative value prevents self-shadowing artifacts
            directionalLight.shadow.bias = -0.0001
            directionalLight.shadow.radius = 4

            lightRef.current = directionalLight
            scene.add(directionalLight)

            // Add background plane to receive shadows
            const resolvedBgColor = resolveTokenColor(backgroundColor)
            const bgColorRgba = parseColorToRgba(resolvedBgColor)
            const bgMaterial = new MeshStandardMaterial({
                color: new Color(bgColorRgba.r, bgColorRgba.g, bgColorRgba.b),
                roughness: 0.8,
                metalness: 0.0,
            })

            // Create large plane behind sticker
            const planeSize = Math.max(width, height) * 3
            const planeGeometry = new PlaneGeometry(planeSize, planeSize)
            const backgroundPlane = new Mesh(planeGeometry, bgMaterial)
            backgroundPlane.receiveShadow = true
            backgroundPlane.position.set(0, 0, -STICKER_DEPTH * 2)
            backgroundPlane.rotation.x = Math.PI // Face the sticker
            backgroundPlaneRef.current = backgroundPlane
            scene.add(backgroundPlane)
        }

        // Apply initial rotation from props (degrees to radians)
        const rx = (rotXDeg * Math.PI) / 180
        const ry = (rotYDeg * Math.PI) / 180
        const rz = (rotZDeg * Math.PI) / 180
        mesh.rotation.x = rx
        mesh.rotation.y = ry
        mesh.rotation.z = rz

        return { scene, camera, renderer, mesh, bones }
    }, [
        borderColor,
        createStickerGeometry,
        enableShadows,
        shadowIntensity,
        shadowPositionX,
        shadowPositionY,
        backgroundColor,
        boneSegments,
        rotXDeg,
        rotYDeg,
        rotZDeg,
    ])

    // ========================================================================
    // TEXTURE LOADING
    // ========================================================================

    const loadTexture = useCallback(() => {
        if (!resolvedImageUrl || !meshRef.current) {
            setTextureLoaded(false)
            return
        }

        setTextureLoaded(false)

        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
            if (!meshRef.current?.material) return

            // Store reference for border color updates
            loadedImageRef.current = img

            // Create main texture for front face
            const texture = new Texture(img)
            texture.needsUpdate = true
            texture.minFilter = LinearFilter
            texture.colorSpace = SRGBColorSpace
            texture.format = RGBAFormat

            // Create back face texture: use the actual image but darkened for shadow overlay effect
            const backCanvas = document.createElement("canvas")
            backCanvas.width = img.width
            backCanvas.height = img.height
            const backCtx = backCanvas.getContext("2d")

            let backTexture: any = null
            if (backCtx) {
                // Draw original image
                backCtx.drawImage(img, 0, 0)
                const imageData = backCtx.getImageData(
                    0,
                    0,
                    img.width,
                    img.height
                )

                // Darken the image slightly to create shadow overlay effect
                // Keep original colors but reduce brightness by ~30% for shadow effect
                for (let i = 0; i < imageData.data.length; i += 4) {
                    imageData.data[i] = Math.floor(imageData.data[i] * 0.7) // R - darker
                    imageData.data[i + 1] = Math.floor(
                        imageData.data[i + 1] * 0.7
                    ) // G - darker
                    imageData.data[i + 2] = Math.floor(
                        imageData.data[i + 2] * 0.7
                    ) // B - darker
                    // Keep original alpha (imageData.data[i + 3])
                }

                backCtx.putImageData(imageData, 0, 0)
                backTexture = new Texture(backCanvas)
                backTexture.needsUpdate = true
                backTexture.minFilter = LinearFilter
                backTexture.colorSpace = SRGBColorSpace
                backTexture.format = RGBAFormat
            }

            // Apply textures to materials
            const materials = meshRef.current.material as any[]
            if (Array.isArray(materials)) {
                // Front face: image texture, use alphaTest for clean cutout
                // When using MeshStandardMaterial, also set emissiveMap so colors stay bright
                if (materials[4]) {
                    materials[4].map = texture
                    materials[4].transparent = true
                    materials[4].alphaTest = 0.01 // Discard nearly-transparent pixels
                    // If MeshStandardMaterial, use emissiveMap to keep image bright and reduce striations
                    if (materials[4].emissiveIntensity !== undefined) {
                        materials[4].emissiveMap = texture // Emit the image colors
                        materials[4].emissive = new Color(0xffffff) // Allow full emissive color
                        // Increase emissive intensity to reduce lighting dependency and striations
                        materials[4].emissiveIntensity = 0.8
                    }
                    materials[4].needsUpdate = true
                }
                // Back face: solid color with same alpha shape as front
                if (materials[5] && backTexture) {
                    materials[5].map = backTexture
                    materials[5].transparent = true
                    materials[5].alphaTest = 0.01
                    materials[5].needsUpdate = true
                }
                // Side faces: use alpha map for clean edges
                for (let i = 0; i < 4; i++) {
                    if (materials[i] && backTexture) {
                        materials[i].map = backTexture
                        materials[i].transparent = true
                        materials[i].alphaTest = 0.01
                        materials[i].needsUpdate = true
                    }
                }
            }

            setTextureLoaded(true)
            renderFrame()
        }
        img.onerror = () => {
            console.error("Texture loading error")
            setTextureLoaded(false)
        }
        img.src = resolvedImageUrl
    }, [resolvedImageUrl])

    // ========================================================================
    // RENDERING
    // ========================================================================

    const renderFrame = useCallback(() => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current)
            return
        rendererRef.current.render(sceneRef.current, cameraRef.current)
    }, [])

    // ========================================================================
    // BONE ANIMATION (like book page flip)
    // ========================================================================

    const updateBones = useCallback(() => {
        if (!bonesRef.current.length || !meshRef.current) return

        const bones = bonesRef.current
        // Target rotation based on animated curl amount (updated by GSAP)
        // Max ~90 degrees (π/2) - single fold like paper, not rolling
        const targetRotation = animatedCurlRef.current.amount * Math.PI * 0.5

        // Curl start position - user controlled (0 = left edge, 1 = right edge)
        // 0 = entire image curls, 1 = just a small dent on the right
        const curlStartRatio = curlStart

        // Map radius to rotation behavior
        // Small radius (0.1) = tight fold: more rotation per bone, concentrated, sharp curve
        // Large radius (1.0) = loose roll: less rotation per bone, spread out, smooth curve
        //
        // For exponential curve: Math.pow(curlT, exponent)
        // - Low exponent (0.3) = gentle, smooth curve (large radius)
        // - High exponent (2.5) = steep, sharp curve (small radius)
        const radiusExponent = 0.3 + (1.0 - curlRadius) * 2.2 // 0.1 -> 2.48, 1.0 -> 0.3

        // Rotation intensity multiplier
        // Small radius needs more rotation overall (tight fold)
        // Large radius needs less rotation overall (loose roll)
        const radiusIntensity = 0.3 + (1.0 - curlRadius) * 1.2 // 0.1 -> 1.38, 1.0 -> 0.3

        // Curve strength - keep consistent for organic feel
        const insideCurveStrength = 0.35
        const outsideCurveStrength = 0.12
        const turningCurveStrength = 0.25

        for (let i = 0; i < bones.length; i++) {
            const bone = bones[i]

            // Normalized position: 0 = left edge, 1 = right edge
            const t = i / (bones.length - 1)

            // Left side: no rotation at all
            if (t < curlStartRatio) {
                bone.rotation.y = 0
                continue
            }

            // Right side: normalize t to [0, 1] for the curling portion only
            const curlT = (t - curlStartRatio) / (1 - curlStartRatio) // 0 = start of curl, 1 = right edge

            // Calculate curve intensities (like Reference.tsx)
            const insideCurveIntensity =
                curlT < 0.3 ? Math.sin((curlT / 0.3) * Math.PI * 0.5 + 0.25) : 0
            const outsideCurveIntensity =
                curlT >= 0.3
                    ? Math.cos(((curlT - 0.3) / 0.7) * Math.PI * 0.5 + 0.1)
                    : 0
            const turningIntensity = Math.sin(curlT * Math.PI)

            // Base rotation from curve effects
            let rotationAngle =
                insideCurveStrength * insideCurveIntensity * targetRotation -
                outsideCurveStrength * outsideCurveIntensity * targetRotation +
                turningCurveStrength * turningIntensity * targetRotation

            // Progressive rotation - radius controls curve steepness
            // Small radius (high exponent) = sharp, tight fold
            // Large radius (low exponent) = smooth, loose roll
            const progressiveFactor = Math.pow(curlT, radiusExponent)

            // Apply progressive factor and radius intensity
            // Small radius: high intensity + steep curve = tight fold
            // Large radius: low intensity + gentle curve = loose roll
            rotationAngle *= (0.2 + progressiveFactor * 0.8) * radiusIntensity

            bone.rotation.y = -rotationAngle // Negative to curl toward viewer
        }

        if (meshRef.current.skeleton) {
            meshRef.current.skeleton.update()
        }

        renderFrame()
    }, [curlAmount, curlRadius, curlStart, renderFrame])

    // ========================================================================
    // HOVER ANIMATION WITH GSAP
    // ========================================================================

    // Check if mouse is over non-transparent part of sticker
    const checkMouseOverSticker = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            if (
                !canvasRef.current ||
                !containerRef.current ||
                !loadedImageRef.current
            ) {
                return false
            }

            const canvas = canvasRef.current
            const container = containerRef.current
            const img = loadedImageRef.current
            const rect = canvas.getBoundingClientRect()

            // Get container dimensions (actual sticker size)
            const containerWidth =
                container.clientWidth || container.offsetWidth || 1
            const containerHeight =
                container.clientHeight || container.offsetHeight || 1

            // Calculate mouse position relative to canvas
            const canvasX = event.clientX - rect.left
            const canvasY = event.clientY - rect.top

            // Account for canvas scale offset (canvas is larger than container)
            const offsetX = (rect.width - containerWidth) / 2
            const offsetY = (rect.height - containerHeight) / 2

            // Convert to container-relative coordinates
            const containerX = canvasX - offsetX
            const containerY = canvasY - offsetY

            // Check if mouse is within container bounds
            if (
                containerX < 0 ||
                containerX > containerWidth ||
                containerY < 0 ||
                containerY > containerHeight
            ) {
                return false
            }

            // Map container coordinates to image coordinates
            const imageX = Math.floor((containerX / containerWidth) * img.width)
            const imageY = Math.floor(
                (containerY / containerHeight) * img.height
            )

            // Clamp coordinates to image bounds
            const clampedX = Math.max(0, Math.min(img.width - 1, imageX))
            const clampedY = Math.max(0, Math.min(img.height - 1, imageY))

            // Create temporary canvas to read pixel data
            const tempCanvas = document.createElement("canvas")
            tempCanvas.width = img.width
            tempCanvas.height = img.height
            const ctx = tempCanvas.getContext("2d")
            if (!ctx) return false

            ctx.drawImage(img, 0, 0)
            const imageData = ctx.getImageData(clampedX, clampedY, 1, 1)
            const alpha = imageData.data[3]

            // Return true if pixel is not transparent (alpha > threshold)
            return alpha > 10
        },
        []
    )

    // Mouse move handler: check if over sticker and trigger animations
    const handleMouseMove = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement>) => {
            const isOverSticker = checkMouseOverSticker(event)
            const wasHovering = isHoveringRef.current

            if (isOverSticker && !wasHovering) {
                // Entering sticker: animate to flat
                isHoveringRef.current = true
                gsap.to(animatedCurlRef.current, {
                    amount: 0,
                    duration: 0.6,
                    ease: "power2.out",
                    onUpdate: () => {
                        updateBones()
                    },
                })
            } else if (!isOverSticker && wasHovering) {
                // Leaving sticker: animate back to original curl
                isHoveringRef.current = false
                gsap.to(animatedCurlRef.current, {
                    amount: curlAmount,
                    duration: 0.6,
                    ease: "power2.out",
                    onUpdate: () => {
                        updateBones()
                    },
                })
            }
        },
        [checkMouseOverSticker, curlAmount, updateBones]
    )

    // Mouse leave handler: always reset when leaving canvas
    const handleMouseLeave = useCallback(() => {
        if (isHoveringRef.current) {
            isHoveringRef.current = false
            gsap.to(animatedCurlRef.current, {
                amount: curlAmount,
                duration: 0.6,
                ease: "power2.out",
                onUpdate: () => {
                    updateBones()
                },
            })
        }
    }, [curlAmount, updateBones])

    // ========================================================================
    // RESIZE HANDLING
    // ========================================================================

    const updateSize = useCallback((width: number, height: number) => {
        if (
            !cameraRef.current ||
            !rendererRef.current ||
            !meshRef.current ||
            !canvasRef.current
        )
            return

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const canvasWidth = width * CANVAS_SCALE
        const canvasHeight = height * CANVAS_SCALE

        cameraRef.current.aspect = canvasWidth / canvasHeight
        cameraRef.current.fov = calculateCameraFov(
            canvasWidth,
            canvasHeight,
            CAMERA_DISTANCE
        )
        cameraRef.current.updateProjectionMatrix()

        rendererRef.current.setSize(
            Math.round(canvasWidth * dpr),
            Math.round(canvasHeight * dpr),
            false
        )
        canvasRef.current.style.width = `${canvasWidth}px`
        canvasRef.current.style.height = `${canvasHeight}px`
    }, [])

    // ========================================================================
    // EFFECTS
    // ========================================================================

    // Initialize scene
    useEffect(() => {
        if (!hasContent) {
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            meshRef.current = null
            bonesRef.current = []
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
            return
        }

        setupScene()

        setTimeout(() => {
            updateBones()
            loadTexture()
        }, 0)

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
            if (rendererRef.current) {
                rendererRef.current.dispose()
                rendererRef.current = null
            }
            if (sceneRef.current) {
                sceneRef.current.clear()
                sceneRef.current = null
            }
            lightRef.current = null
            ambientLightRef.current = null
            backgroundPlaneRef.current = null
        }
    }, [hasContent, setupScene, loadTexture, updateBones])

    // Sync animated curl ref with prop changes
    useEffect(() => {
        animatedCurlRef.current.amount = curlAmount
    }, [curlAmount])

    // Update mesh rotation when position props change
    useEffect(() => {
        if (!meshRef.current) return

        const rx = (rotXDeg * Math.PI) / 180
        const ry = (rotYDeg * Math.PI) / 180
        const rz = (rotZDeg * Math.PI) / 180
        meshRef.current.rotation.x = rx
        meshRef.current.rotation.y = ry
        meshRef.current.rotation.z = rz

        renderFrame()
    }, [rotXDeg, rotYDeg, rotZDeg, renderFrame])

    // Update bones when curlRadius or curlStart changes
    // Note: curlAmount is handled by GSAP animations via animatedCurlRef
    useEffect(() => {
        updateBones()
    }, [curlRadius, curlStart, updateBones])

    // Update border color (back face and sides) - recreate textures with new color
    useEffect(() => {
        if (!meshRef.current?.material || !loadedImageRef.current) return

        const img = loadedImageRef.current
        const materials = meshRef.current.material as any[]
        if (!Array.isArray(materials)) return

        // Back face now uses darkened image texture (not border color)
        // Just update the texture if needed - the darkened image is created in loadTexture
        // Note: borderColor is no longer used for back face texture
        // Side faces still use the back texture for clean edges
        if (materials[5] && materials[5].map) {
            materials[5].needsUpdate = true
        }
        for (let i = 0; i < 4; i++) {
            if (materials[i] && materials[i].map) {
                materials[i].needsUpdate = true
            }
        }

        renderFrame()
    }, [borderColor, renderFrame])

    // Update shadow position when settings change
    useEffect(() => {
        if (!enableShadows || !lightRef.current) return

        lightRef.current.position.set(shadowPositionX, shadowPositionY, 400)
        lightRef.current.shadow.mapSize.width = 2048
        lightRef.current.shadow.mapSize.height = 2048
        lightRef.current.shadow.needsUpdate = true

        renderFrame()
    }, [enableShadows, shadowPositionX, shadowPositionY, renderFrame])

    // Update shadow intensity (darkness) when settings change
    useEffect(() => {
        if (!enableShadows || !lightRef.current || !ambientLightRef.current)
            return

        // Shadow darkness is controlled by the ratio of directional to ambient light
        // High shadowIntensity: strong directional light, low ambient = dark shadows
        // Low shadowIntensity: weaker directional, high ambient = soft/no shadows
        // At shadowIntensity = 1, make shadows very dramatic

        // Directional light: 0.3 to 2.0 (more dramatic at max)
        const adjustedLightIntensity = 0.3 + shadowIntensity * 1.7
        lightRef.current.intensity = adjustedLightIntensity

        // Ambient light: 1.0 to 0.4 (lower at max for dramatic shadows)
        const adjustedAmbientIntensity = 1.0 - shadowIntensity * 0.6
        ambientLightRef.current.intensity = Math.max(
            adjustedAmbientIntensity,
            0.4
        )

        renderFrame()
    }, [enableShadows, shadowIntensity, renderFrame])

    // Update background color
    useEffect(() => {
        if (!enableShadows || !backgroundPlaneRef.current) return

        const resolvedBgColor = resolveTokenColor(backgroundColor)
        const bgColorRgba = parseColorToRgba(resolvedBgColor)
        const material = backgroundPlaneRef.current.material

        if (material) {
            material.color.setRGB(bgColorRgba.r, bgColorRgba.g, bgColorRgba.b)
            material.needsUpdate = true
        }

        renderFrame()
    }, [enableShadows, backgroundColor, renderFrame])

    // Size monitoring
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleResize = () => {
            const width = container.clientWidth || container.offsetWidth || 1
            const height = container.clientHeight || container.offsetHeight || 1
            const last = lastSizeRef.current
            if (
                Math.abs(width - last.width) > 1 ||
                Math.abs(height - last.height) > 1
            ) {
                last.width = width
                last.height = height
                updateSize(width, height)
                renderFrame()
            }
        }

        handleResize()

        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(container)

        return () => {
            resizeObserver.disconnect()
        }
    }, [updateSize, renderFrame])

    // ========================================================================
    // RENDER
    // ========================================================================

    if (!hasContent) {
        return (
            <ComponentMessage
                style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: 0,
                    minHeight: 0,
                }}
                title="3D Sticker"
                subtitle="Add an image to see the sticker effect"
            />
        )
    }

    const offsetPercent = ((CANVAS_SCALE - 1) / 2) * 100

    return (
        <div
            ref={containerRef}
            style={{
                ...style,
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "visible",
                display: "block",
                margin: 0,
                padding: 0,
            }}
        >
            <div
                ref={zoomProbeRef}
                style={{
                    position: "absolute",
                    width: 20,
                    height: 20,
                    opacity: 0,
                    pointerEvents: "none",
                }}
            />
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: "absolute",
                    top: `-${offsetPercent}%`,
                    left: `-${offsetPercent}%`,
                    display: "block",
                    cursor: "pointer",
                }}
            />
        </div>
    )
}

// ============================================================================
// PROPERTY CONTROLS
// ============================================================================

addPropertyControls(Sticker, {
    preview: {
        type: ControlType.Boolean,
        title: "Preview",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    image: {
        type: ControlType.ResponsiveImage,
        title: "Image",
    },
    curlAmount: {
        type: ControlType.Number,
        title: "Curl",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.3,
    },
    curlRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0.1,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
    },
    curlStart: {
        type: ControlType.Number,
        title: "Start",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.4,
    },
    borderColor: {
        type: ControlType.Color,
        title: "Back Color",
        defaultValue: "#ffffff",
    },
    boneSegments: {
        type: ControlType.Number,
        title: "Smoothness",
        min: 30,
        max: 300,
        step: 5,
        defaultValue: 30,
        description:
            "Number of segments for smoother curves (higher = smoother but slower)",
    },
    rotXDeg: {
        type: ControlType.Number,
        title: "Rotate X",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: -90,
        unit: "°",
    },
    rotYDeg: {
        type: ControlType.Number,
        title: "Rotate Y",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 0,
        unit: "°",
    },
    rotZDeg: {
        type: ControlType.Number,
        title: "Rotate Z",
        min: -180,
        max: 180,
        step: 1,
        defaultValue: 90,
        unit: "°",
    },
    enableShadows: {
        type: ControlType.Boolean,
        title: "Shadows",
        defaultValue: true,
        enabledTitle: "On",
        disabledTitle: "Off",
    },
    shadowIntensity: {
        type: ControlType.Number,
        title: "Shadow Intensity",
        min: 0,
        max: 1,
        step: 0.05,
        defaultValue: 0.5,
        hidden: (props) => !props.enableShadows,
    },
    shadowPositionX: {
        type: ControlType.Number,
        title: "Shadow X",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: 200,
        hidden: (props) => !props.enableShadows,
    },
    shadowPositionY: {
        type: ControlType.Number,
        title: "Shadow Y",
        min: -500,
        max: 500,
        step: 10,
        defaultValue: 300,
        hidden: (props) => !props.enableShadows,
    },
    backgroundColor: {
        type: ControlType.Color,
        title: "Background",
        defaultValue: "#ff9500",
        hidden: (props) => !props.enableShadows,
        description:
            "More components at [Framer University](https://frameruni.link/cc).",
    },
})

// ============================================================================
// DISPLAY NAME
// ============================================================================

Sticker.displayName = "3D Sticker"
