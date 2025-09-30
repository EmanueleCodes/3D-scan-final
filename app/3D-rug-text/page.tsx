'use client'

import { useEffect, useRef, useState } from "react"
import {Scene, Color, OrthographicCamera, Raycaster, Vector2, WebGLRenderer, ShaderMaterial, TextureLoader, Vector3, PlaneGeometry, Mesh, MeshBasicMaterial, DoubleSide} from "three"
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 3D Rug Text Component
 * 
 * Interactive 3D text displacement effect using js and custom shaders.
 * Based on: https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/
 */
export default function page() {
    const mainTexture = "./mainTexture.png"
    const shadowTexture = "./shadowTexture.png"
    const displacementRadius = 3
    const displacementHeight = 1
    const backgroundColor = "#ffffff"

    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const cameraRef = useRef<OrthographicCamera | null>(null)
    const rendererRef = useRef<WebGLRenderer | null>(null)
    const controlsRef = useRef<OrbitControls | null>(null)
    const mainPlaneRef = useRef<Mesh | null>(null)
    const shadowPlaneRef = useRef<Mesh | null>(null)
    const sceneRef = useRef<Scene | null>(null)

    // UI state for perspective/orbit
    const [orbitEnabled, setOrbitEnabled] = useState(false)
    const [camX, setCamX] = useState(10)
    const [camY, setCamY] = useState(10)
    const [camZ, setCamZ] = useState(10)
    const [rotXDeg, setRotXDeg] = useState(0)
    const [rotYDeg, setRotYDeg] = useState(0)
    const [rotZDeg, setRotZDeg] = useState(0)

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Scene setup
        const scene = new Scene()
        scene.background = new Color(backgroundColor)
        sceneRef.current = scene

        // Orthographic camera for diagonal view
        const frustumSize = 20
        const aspect = container.clientWidth / container.clientHeight
        const camera = new OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        )
        camera.position.set(camX, camY, camZ)
        camera.lookAt(0, 0, 0)
        cameraRef.current = camera

        // Renderer
        const renderer = new WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        container.appendChild(renderer.domElement)
        rendererRef.current = renderer

        // Texture loader
        const textureLoader = new TextureLoader()

        // Load textures with error handling
        const mainTex = textureLoader.load(
            mainTexture,
            (texture) => {
                console.log("Main texture loaded successfully")
                texture.needsUpdate = true
            },
            undefined,
            (error) => {
                console.error("Error loading main texture:", error)
            }
        )

        const shadowTex = textureLoader.load(
            shadowTexture,
            (texture) => {
                console.log("Shadow texture loaded successfully")
                texture.needsUpdate = true
            },
            undefined,
            (error) => {
                console.error("Error loading shadow texture:", error)
            }
        )

        // Main displacement plane shader material
        const shaderMaterial = new ShaderMaterial({
            uniforms: {
                uTexture: { value: mainTex },
                uDisplacement: { value: new Vector3(0, 0, 0) },
                uRadius: { value: displacementRadius },
                uHeight: { value: displacementHeight },
            },
            vertexShader: `
                varying vec2 vUv;
                uniform vec3 uDisplacement;
                uniform float uRadius;
                uniform float uHeight;
                
                // Easing function for smooth displacement
                float easeInOutCubic(float x) {
                    return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
                }
                
                // Map function to remap values
                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }
                
                void main() {
                    vUv = uv;
                    vec3 newPosition = position;
                    
                    // Calculate world position
                    vec4 localPosition = vec4(position, 1.0);
                    vec4 worldPosition = modelMatrix * localPosition;
                    
                    // Calculate distance to displacement point
                    float dist = length(uDisplacement - worldPosition.xyz);
                    
                    // Apply displacement within radius
                    if (dist < uRadius) {
                        float distanceMapped = map(dist, 0.0, uRadius, 1.0, 0.0);
                        float val = easeInOutCubic(distanceMapped) * uHeight;
                        newPosition.z += val;
                    }
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform sampler2D uTexture;
                
                void main() {
                    vec4 color = texture2D(uTexture, vUv);
                    gl_FragColor = vec4(color);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
        })

        // Shadow plane shader material
        const shadowMaterial = new ShaderMaterial({
            uniforms: {
                uTexture: { value: shadowTex },
                uDisplacement: { value: new Vector3(0, 0, 0) },
                uRadius: { value: displacementRadius },
            },
            vertexShader: `
                varying vec2 vUv;
                varying float vDist;
                uniform vec3 uDisplacement;
                
                void main() {
                    vUv = uv;
                    
                    vec4 localPosition = vec4(position, 1.0);
                    vec4 worldPosition = modelMatrix * localPosition;
                    vDist = length(uDisplacement - worldPosition.xyz);
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                varying float vDist;
                uniform sampler2D uTexture;
                uniform float uRadius;
                
                float map(float value, float min1, float max1, float min2, float max2) {
                    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
                }
                
                void main() {
                    vec4 color = texture2D(uTexture, vUv);
                    
                    if (vDist < uRadius) {
                        float alpha = map(vDist, uRadius, 0.0, color.a, 0.0);
                        color.a = alpha;
                    }
                    
                    gl_FragColor = vec4(color);
                }
            `,
            transparent: true,
            depthWrite: false,
            side: DoubleSide,
        })

        // Create planes with higher subdivision for smooth displacement
        const geometry = new PlaneGeometry(15, 15, 100, 100)
        const mainPlane = new Mesh(geometry, shaderMaterial)
        const shadowPlane = new Mesh(geometry, shadowMaterial)
        shadowPlane.position.z = -0.1 // Slightly behind main plane
        
        scene.add(mainPlane)
        scene.add(shadowPlane)

        // Save refs for UI updates
        mainPlaneRef.current = mainPlane
        shadowPlaneRef.current = shadowPlane

        // Apply initial plane rotation from UI (degrees to radians)
        const rx = (rotXDeg * Math.PI) / 180
        const ry = (rotYDeg * Math.PI) / 180
        const rz = (rotZDeg * Math.PI) / 180
        mainPlane.rotation.x = rx
        mainPlane.rotation.y = ry
        mainPlane.rotation.z = rz
        shadowPlane.rotation.x = rx
        shadowPlane.rotation.y = ry
        shadowPlane.rotation.z = rz

        // Invisible hit plane for raycasting - must match the visual plane rotation
        const hitGeometry = new PlaneGeometry(20, 20)
        const hitMaterial = new MeshBasicMaterial({
            visible: false,
        })
        const hitPlane = new Mesh(hitGeometry, hitMaterial)
        hitPlane.name = "hit"
        
        // Apply the same rotation as the visual planes
        hitPlane.rotation.x = rx
        hitPlane.rotation.y = ry
        hitPlane.rotation.z = rz
        
        scene.add(hitPlane)

        // Raycaster setup
        const raycaster = new Raycaster()
        const pointer = new Vector2()

        // Mouse move handler
        const onPointerMove = (event: MouseEvent) => {
            const rect = container.getBoundingClientRect()
            pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
            pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

            raycaster.setFromCamera(pointer, camera)
            const intersects = raycaster.intersectObject(hitPlane)

            if (intersects.length > 0) {
                const point = intersects[0].point
                shaderMaterial.uniforms.uDisplacement.value = point
                shadowMaterial.uniforms.uDisplacement.value = point
            }
        }

        container.addEventListener("mousemove", onPointerMove)

        // Animation loop
        const animate = () => {
            animationRef.current = requestAnimationFrame(animate)
            if (controlsRef.current) controlsRef.current.update()
            renderer.render(scene, camera)
        }
        animate()

        // Handle resize
        const handleResize = () => {
            const width = container.clientWidth
            const height = container.clientHeight
            const aspect = width / height

            camera.left = (frustumSize * aspect) / -2
            camera.right = (frustumSize * aspect) / 2
            camera.top = frustumSize / 2
            camera.bottom = frustumSize / -2
            camera.updateProjectionMatrix()

            renderer.setSize(width, height)
        }

        window.addEventListener("resize", handleResize)

        // Cleanup
        return () => {
            container.removeEventListener("mousemove", onPointerMove)
            window.removeEventListener("resize", handleResize)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (controlsRef.current) {
                controlsRef.current.dispose()
                controlsRef.current = null
            }
            container.removeChild(renderer.domElement)
            renderer.dispose()
            rendererRef.current = null
            cameraRef.current = null
            mainPlaneRef.current = null
            shadowPlaneRef.current = null
            sceneRef.current = null
        }
    }, [])

    // Apply UI changes (camera position, plane rotation, orbit controls)
    useEffect(() => {
        const camera = cameraRef.current
        const mainPlane = mainPlaneRef.current
        const shadowPlane = shadowPlaneRef.current
        const renderer = rendererRef.current

        if (camera) {
            camera.position.set(camX, camY, camZ)
            camera.lookAt(0, 0, 0)
        }

        if (mainPlane && shadowPlane) {
            const rx = (rotXDeg * Math.PI) / 180
            const ry = (rotYDeg * Math.PI) / 180
            const rz = (rotZDeg * Math.PI) / 180
            mainPlane.rotation.x = rx
            mainPlane.rotation.y = ry
            mainPlane.rotation.z = rz
            shadowPlane.rotation.x = rx
            shadowPlane.rotation.y = ry
            shadowPlane.rotation.z = rz
            
            // Also update the invisible hit plane to match
            const scene = sceneRef.current
            if (scene) {
                const hitPlane = scene.children.find(child => child.name === "hit")
                if (hitPlane) {
                    hitPlane.rotation.x = rx
                    hitPlane.rotation.y = ry
                    hitPlane.rotation.z = rz
                }
            }
        }

        if (renderer && camera) {
            if (orbitEnabled && !controlsRef.current) {
                controlsRef.current = new OrbitControls(camera, renderer.domElement)
                controlsRef.current.enableDamping = true
            } else if (!orbitEnabled && controlsRef.current) {
                controlsRef.current.dispose()
                controlsRef.current = null
            }
        }
    }, [camX, camY, camZ, rotXDeg, rotYDeg, rotZDeg, orbitEnabled])

    // Presets for quick perspectives
    const applyIsometric = () => {
        setCamX(10)
        setCamY(10)
        setCamZ(10)
        setRotXDeg(0)
        setRotYDeg(0)
        setRotZDeg(0)
    }

    const applyHappyDays = () => {
        // Slightly lower camera and skew plane for a dramatic perspective
        setCamX(12)
        setCamY(6)
        setCamZ(20)
        setRotXDeg(-8)
        setRotYDeg(-35)
        setRotZDeg(0)
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
                background: "#ffffff",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    background: "rgba(255,255,255,0.9)",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    width: 260,
                    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
                    fontSize: 12,
                    color: "#111827",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong>Camera</strong>
                    <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input
                            type="checkbox"
                            checked={orbitEnabled}
                            onChange={(e) => setOrbitEnabled(e.target.checked)}
                        />
                        Orbit Controls
                    </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>X: {camX.toFixed(1)}</label>
                        <input 
                            type="range" 
                            min={-30} 
                            max={30} 
                            step={0.5} 
                            value={camX} 
                            onChange={(e) => setCamX(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>Y: {camY.toFixed(1)}</label>
                        <input 
                            type="range" 
                            min={-30} 
                            max={30} 
                            step={0.5} 
                            value={camY} 
                            onChange={(e) => setCamY(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>Z: {camZ.toFixed(1)}</label>
                        <input 
                            type="range" 
                            min={-30} 
                            max={30} 
                            step={0.5} 
                            value={camZ} 
                            onChange={(e) => setCamZ(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <strong>Plane Rotation (deg)</strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>RotX: {rotXDeg.toFixed(0)}°</label>
                        <input 
                            type="range" 
                            min={-180} 
                            max={180} 
                            step={1} 
                            value={rotXDeg} 
                            onChange={(e) => setRotXDeg(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>RotY: {rotYDeg.toFixed(0)}°</label>
                        <input 
                            type="range" 
                            min={-180} 
                            max={180} 
                            step={1} 
                            value={rotYDeg} 
                            onChange={(e) => setRotYDeg(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: 4, fontSize: 11 }}>RotZ: {rotZDeg.toFixed(0)}°</label>
                        <input 
                            type="range" 
                            min={-180} 
                            max={180} 
                            step={1} 
                            value={rotZDeg} 
                            onChange={(e) => setRotZDeg(parseFloat(e.target.value))} 
                            style={{ width: "100%" }} 
                        />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={applyIsometric} style={{ padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer" }}>Isometric</button>
                    <button onClick={applyHappyDays} style={{ padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", cursor: "pointer" }}>Happy Days</button>
                </div>
            </div>
        </div>
    )
}
