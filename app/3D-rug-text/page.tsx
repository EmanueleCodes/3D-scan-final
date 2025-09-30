'use client'

import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * 3D Rug Text Component
 * 
 * Interactive 3D text displacement effect using Three.js and custom shaders.
 * Based on: https://tympanus.net/codrops/2025/03/24/animating-letters-with-shaders-interactive-text-effect-with-three-js-glsl/
 */
export default function page() {
    const mainTexture = "./mainTexture.png"
    const shadowTexture = "./shadowTexture.png"
    const displacementRadius = 3
    const displacementHeight = 1
    const backgroundColor = "#ffffff"

    const containerRef = useRef<HTMLDivElement>(null)
    const sceneRef = useRef<any>(null)

    useEffect(() => {
        if (!containerRef.current) return

        const container = containerRef.current

        // Scene setup
        const scene = new THREE.Scene()
        scene.background = new THREE.Color(backgroundColor)

        // Orthographic camera for diagonal view
        const frustumSize = 20
        const aspect = container.clientWidth / container.clientHeight
        const camera = new THREE.OrthographicCamera(
            (frustumSize * aspect) / -2,
            (frustumSize * aspect) / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        )
        camera.position.set(10, 10, 10)
        camera.lookAt(0, 0, 0)

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true })
        renderer.setSize(container.clientWidth, container.clientHeight)
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        container.appendChild(renderer.domElement)

        // Texture loader
        const textureLoader = new THREE.TextureLoader()

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
        const shaderMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: mainTex },
                uDisplacement: { value: new THREE.Vector3(0, 0, 0) },
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
            side: THREE.DoubleSide,
        })

        // Shadow plane shader material
        const shadowMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: shadowTex },
                uDisplacement: { value: new THREE.Vector3(0, 0, 0) },
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
            side: THREE.DoubleSide,
        })

        // Create planes with higher subdivision for smooth displacement
        const geometry = new THREE.PlaneGeometry(15, 15, 100, 100)
        const mainPlane = new THREE.Mesh(geometry, shaderMaterial)
        const shadowPlane = new THREE.Mesh(geometry, shadowMaterial)
        shadowPlane.position.z = -0.1 // Slightly behind main plane
        
        scene.add(mainPlane)
        scene.add(shadowPlane)

        // Invisible hit plane for raycasting
        const hitGeometry = new THREE.PlaneGeometry(20, 20)
        const hitMaterial = new THREE.MeshBasicMaterial({
            visible: false,
        })
        const hitPlane = new THREE.Mesh(hitGeometry, hitMaterial)
        hitPlane.name = "hit"
        scene.add(hitPlane)

        // Raycaster setup
        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()

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
            sceneRef.current = requestAnimationFrame(animate)
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
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current)
            }
            container.removeChild(renderer.domElement)
            renderer.dispose()
        }
    }, [])

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                border:"1px solid green",
                height: "100vh",
                position: "relative",
                overflow: "hidden",
                background: "red",
                padding:100,
                display:"flex",
                flexDirection:"column",
                justifyContent:"center",
                alignItems:"center",
            }}
        />
    )
}
