"use client";

import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from 'three';

const AVATAR_URL = "https://models.readyplayer.me/693ae7c2fe6f676b66eeaf44.glb";

function Model({ isTalking }: { isTalking: boolean }) {
    const { scene, nodes } = useGLTF(AVATAR_URL) as any;
    const avatarRef = useRef<any>(null);
    const blinkRef = useRef(0);
    const nextBlinkTime = useRef(Date.now() + 2000);

    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }, [scene]);

    // EL BUCLE QUE SE EJECUTA 60 VECES POR SEGUNDO
    useFrame((state) => {
        if (!avatarRef.current) return;
        const time = state.clock.elapsedTime;


        if (nodes.RightForeArm && nodes.LeftForeArm) {
            // Codos rectos
            nodes.LeftForeArm.rotation.set(0, 0, 0);
            nodes.RightForeArm.rotation.set(0, 0, 0);
        }
        // ==========================================

        // 1. RESPIRACIÓN
        avatarRef.current.position.y = -1.5 + Math.sin(time * 1) * 0.003;

        // 2. HABLA (Lip Sync)
        const headMesh = nodes.Wolf3D_Head;
        const teethMesh = nodes.Wolf3D_Teeth;
        const mouthIdx = headMesh.morphTargetDictionary['viseme_aa'] ?? headMesh.morphTargetDictionary['mouthOpen'];
        const teethIdx = teethMesh?.morphTargetDictionary['viseme_aa'] ?? teethMesh?.morphTargetDictionary['mouthOpen'];

        if (mouthIdx !== undefined) {
            let targetOpen = 0;
            if (isTalking) {
                const syllableRhythm = Math.sin(time * 20) * 0.5 + 0.5;
                const wordBreaks = Math.sin(time * 8) > 0 ? 1 : 0.2;
                const randomness = (Math.random() * 0.3) + 0.7;
                targetOpen = syllableRhythm * wordBreaks * randomness * 0.7;
            }
            const smoothOpen = THREE.MathUtils.lerp(headMesh.morphTargetInfluences[mouthIdx], targetOpen, 0.4);
            headMesh.morphTargetInfluences[mouthIdx] = smoothOpen;
            if (teethMesh && teethIdx !== undefined) teethMesh.morphTargetInfluences[teethIdx] = smoothOpen;
        }

        // 3. PARPADEO
        const eyeLeftIdx = headMesh.morphTargetDictionary['eyeBlinkLeft'];
        const eyeRightIdx = headMesh.morphTargetDictionary['eyeBlinkRight'];
        if (eyeLeftIdx !== undefined) {
            const now = Date.now();
            if (now > nextBlinkTime.current) {
                blinkRef.current = 1;
                if (headMesh.morphTargetInfluences[eyeLeftIdx] > 0.9) {
                    nextBlinkTime.current = now + 2000 + Math.random() * 4000;
                    blinkRef.current = 0;
                }
            }
            const newBlink = THREE.MathUtils.lerp(headMesh.morphTargetInfluences[eyeLeftIdx], blinkRef.current, 0.6);
            headMesh.morphTargetInfluences[eyeLeftIdx] = newBlink;
            headMesh.morphTargetInfluences[eyeRightIdx] = newBlink;
        }

        // 4. MIRADA SUTIL
        const targetRotY = state.pointer.x * 0.05;
        const targetRotX = -state.pointer.y * 0.05;
        avatarRef.current.rotation.y = THREE.MathUtils.lerp(avatarRef.current.rotation.y, targetRotY, 0.05);
        avatarRef.current.rotation.x = THREE.MathUtils.lerp(avatarRef.current.rotation.x, targetRotX, 0.05);
    });

    return (
        <primitive
            object={scene}
            ref={avatarRef}
            scale={1.7}
            position={[0, -1.5, 0]}
        />
    );
}

export default function Avatar3D({ isTalking = false }: { isTalking?: boolean }) {
    return (
        <div className="w-full h-[450px] rounded-xl overflow-hidden shadow-2xl bg-gradient-to-b from-slate-900 to-slate-800 border border-slate-700 relative">

            {/* CÁMARA AJUSTADA */}
            <Canvas camera={{ position: [0, 1.4, 3.8], fov: 30 }} shadows>

                <ambientLight intensity={0.5} />
                <spotLight position={[2, 2, 4]} angle={0.3} penumbra={0.5} intensity={1.3} castShadow color="#fff5e6" />
                <pointLight position={[-3, 1, -3]} intensity={1.5} color="#6366f1" />

                <Model isTalking={isTalking} />

                <ContactShadows opacity={0.4} scale={5} blur={2} far={2} position={[0, -1.7, 0]} />
                <Environment preset="city" />

                {/* OBJETIVO AL CUELLO/PECHO */}
                <OrbitControls
                    target={[0, 1.25, 0]}
                    enableZoom={false}
                    enablePan={false}
                    minPolarAngle={Math.PI / 2.2}
                    maxPolarAngle={Math.PI / 1.9}
                />
            </Canvas>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
                <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg transition-all duration-300
          ${isTalking
                        ? "bg-green-500/20 border-green-500/50 text-green-300 scale-110"
                        : "bg-black/40 border-white/10 text-slate-400"}
        `}>
                    <div className={`w-2 h-2 rounded-full ${isTalking ? "bg-green-400 animate-ping" : "bg-slate-500"}`}></div>
                    <span className="text-xs font-semibold tracking-wide">
                        {isTalking ? "HABLANDO..." : "ESCUCHANDO"}
                    </span>
                </div>
            </div>
        </div>
    );
}

useGLTF.preload(AVATAR_URL);