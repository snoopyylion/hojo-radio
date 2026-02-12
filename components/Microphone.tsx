import * as THREE from "three";
import React, { useRef, forwardRef, useImperativeHandle } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Base_metalDark_0: THREE.Mesh;
    Base_metalDark_0_1: THREE.Mesh;
    Bolt_BlackPlastic_0: THREE.Mesh;
    Cylinder005_BlackPlastic_0: THREE.Mesh;
    Micro_metalDark_0: THREE.Mesh;
    Micro_metalDark_0_1: THREE.Mesh;
    Micro_metalDark_0_2: THREE.Mesh;
    Micro_metalDark_0_3: THREE.Mesh;
    Micro_metalDark_0_4: THREE.Mesh;
    Micro_LightCircle_0: THREE.Mesh;
    Micro_Metal2_0: THREE.Mesh;
    Micro_Metal2_0_1: THREE.Mesh;
    Micro_Metal2_0_2: THREE.Mesh;
    Micro_Metal2_0_3: THREE.Mesh;
    Micro_Btn_0: THREE.Mesh;
    Micro_Btn_M_0: THREE.Mesh;
    Micro_GlowVolume_0: THREE.Mesh;
    Plane004_TopMirco_0: THREE.Mesh;
    Plane001_btn_G_0: THREE.Mesh;
    Plane002_TopMirco_0: THREE.Mesh;
    Plane003_btn_V_0: THREE.Mesh;
  };
  materials: {
    metalDark: THREE.MeshStandardMaterial;
    BlackPlastic: THREE.MeshStandardMaterial;
    LightCircle: THREE.MeshStandardMaterial;
    Metal2: THREE.MeshStandardMaterial;
    material: THREE.MeshStandardMaterial;
    Btn_M: THREE.MeshStandardMaterial;
    GlowVolume: THREE.MeshStandardMaterial;
    TopMirco: THREE.MeshStandardMaterial;
    btn_G: THREE.MeshStandardMaterial;
    btn_V: THREE.MeshStandardMaterial;
  };
};

export interface MicrophoneRefs {
  // Main structure
  container: React.RefObject<THREE.Group | null>;
  base: React.RefObject<THREE.Group | null>;
  microphone: React.RefObject<THREE.Group | null>;
  
  // Interactive elements
  buttons: {
    mute: React.RefObject<THREE.Mesh | null>;
    volume: React.RefObject<THREE.Mesh | null>;
    power: React.RefObject<THREE.Mesh | null>;
  };
  
  // Visual effects
  effects: {
    glow: React.RefObject<THREE.Mesh | null>;
    lightCircle: React.RefObject<THREE.Mesh | null>;
  };
  
  // Individual parts for detailed animations
  parts: {
    body: React.RefObject<THREE.Group | null>;
    grille: React.RefObject<THREE.Group | null>;
    controls: React.RefObject<THREE.Group | null>;
  };
}

interface MicrophoneProps extends React.ComponentProps<"group"> {
  metalColor?: string;
  accentColor?: string;
  glowColor?: string;
  glowIntensity?: number;
}

export const Microphone = forwardRef<MicrophoneRefs, MicrophoneProps>(
  ({ metalColor, accentColor, glowColor, glowIntensity = 2, ...props }, ref) => {
    const { nodes } = useGLTF("/microphone.gltf") as unknown as GLTFResult;

    // Main structure refs
    const containerRef = useRef<THREE.Group>(null);
    const baseRef = useRef<THREE.Group>(null);
    const microphoneRef = useRef<THREE.Group>(null);

    // Parts refs for detailed animations
    const bodyRef = useRef<THREE.Group>(null);
    const grilleRef = useRef<THREE.Group>(null);
    const controlsRef = useRef<THREE.Group>(null);

    // Interactive element refs
    const buttonMuteRef = useRef<THREE.Mesh>(null);
    const buttonVolumeRef = useRef<THREE.Mesh>(null);
    const buttonPowerRef = useRef<THREE.Mesh>(null);

    // Visual effect refs
    const glowRef = useRef<THREE.Mesh>(null);
    const lightCircleRef = useRef<THREE.Mesh>(null);

    // Expose refs through imperative handle
    useImperativeHandle(ref, () => ({
      container: containerRef,
      base: baseRef,
      microphone: microphoneRef,
      buttons: {
        mute: buttonMuteRef,
        volume: buttonVolumeRef,
        power: buttonPowerRef,
      },
      effects: {
        glow: glowRef,
        lightCircle: lightCircleRef,
      },
      parts: {
        body: bodyRef,
        grille: grilleRef,
        controls: controlsRef,
      },
    }));

    // Enhanced materials with customization support
    const metalDarkMat = new THREE.MeshStandardMaterial({
      color: metalColor || "#2a2a2a",
      metalness: 0.9,
      roughness: 0.2,
    });

    const metal2Mat = new THREE.MeshStandardMaterial({
      color: "#505050",
      metalness: 0.95,
      roughness: 0.15,
    });

    const blackPlasticMat = new THREE.MeshStandardMaterial({
      color: "#1a1a1a",
      metalness: 0.1,
      roughness: 0.6,
    });

    const lightCircleMat = new THREE.MeshStandardMaterial({
      color: accentColor || "#00ffff",
      emissive: accentColor || "#00ffff",
      emissiveIntensity: glowIntensity,
      metalness: 0.3,
      roughness: 0.4,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: glowColor || "#00ffff",
      emissive: glowColor || "#00ffff",
      emissiveIntensity: glowIntensity * 0.75,
      transparent: true,
      opacity: 0.6,
      metalness: 0,
      roughness: 1,
    });

    const buttonMat = new THREE.MeshStandardMaterial({
      color: "#ff0000",
      emissive: "#ff0000",
      emissiveIntensity: 0.5,
      metalness: 0.2,
      roughness: 0.5,
    });

    const buttonMMat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      metalness: 0.1,
      roughness: 0.7,
    });

    const topMicroMat = new THREE.MeshStandardMaterial({
      color: "#3a3a3a",
      metalness: 0.8,
      roughness: 0.3,
    });

    const btnGMat = new THREE.MeshStandardMaterial({
      color: "#00ff00",
      emissive: "#00ff00",
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.5,
    });

    const btnVMat = new THREE.MeshStandardMaterial({
      color: "#4444ff",
      emissive: "#4444ff",
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.5,
    });

    return (
      <group {...props} ref={containerRef} dispose={null}>
        <group ref={baseRef} rotation={[-Math.PI / 2, 0, 0]} scale={9.832}>
          {/* Base meshes */}
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Base_metalDark_0.geometry}
            material={metalDarkMat}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Base_metalDark_0_1.geometry}
            material={metalDarkMat}
          />

          {/* Microphone main group */}
          <group
            ref={microphoneRef}
            position={[1.085, 0.007, 2.043]}
            rotation={[0, -Math.PI / 4, 0]}
          >
            {/* Body parts */}
            <group ref={bodyRef}>
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_metalDark_0.geometry}
                material={metalDarkMat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_metalDark_0_1.geometry}
                material={metalDarkMat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_metalDark_0_2.geometry}
                material={metalDarkMat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_metalDark_0_3.geometry}
                material={metalDarkMat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_metalDark_0_4.geometry}
                material={metalDarkMat}
              />
            </group>

            {/* Grille parts */}
            <group ref={grilleRef}>
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_Metal2_0.geometry}
                material={metal2Mat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_Metal2_0_1.geometry}
                material={metal2Mat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_Metal2_0_2.geometry}
                material={metal2Mat}
              />
              <mesh
                castShadow
                receiveShadow
                geometry={nodes.Micro_Metal2_0_3.geometry}
                material={metal2Mat}
              />
            </group>

            {/* Visual effects */}
            <mesh
              ref={lightCircleRef}
              castShadow
              receiveShadow
              geometry={nodes.Micro_LightCircle_0.geometry}
              material={lightCircleMat}
            />
            <mesh
              ref={glowRef}
              castShadow
              receiveShadow
              geometry={nodes.Micro_GlowVolume_0.geometry}
              material={glowMat}
            />

            {/* Controls group */}
            <group ref={controlsRef}>
              <mesh
                ref={buttonPowerRef}
                castShadow
                receiveShadow
                geometry={nodes.Micro_Btn_0.geometry}
                material={buttonMat}
              />
              <mesh
                ref={buttonMuteRef}
                castShadow
                receiveShadow
                geometry={nodes.Micro_Btn_M_0.geometry}
                material={buttonMMat}
              />
            </group>
          </group>

          {/* Base accessories */}
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Bolt_BlackPlastic_0.geometry}
            material={blackPlasticMat}
            position={[0, 0, 3.149]}
            rotation={[Math.PI / 2, 0, Math.PI / 4]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Cylinder005_BlackPlastic_0.geometry}
            material={blackPlasticMat}
            position={[0.861, 0, 3.177]}
            rotation={[0, Math.PI / 4, 0]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Plane004_TopMirco_0.geometry}
            material={topMicroMat}
            position={[-1.168, 0, 4.317]}
            rotation={[0, Math.PI / 4, 0]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Plane001_btn_G_0.geometry}
            material={btnGMat}
            position={[0.959, 0, 3.275]}
            rotation={[0, -Math.PI / 4, 0]}
          />
          <mesh
            castShadow
            receiveShadow
            geometry={nodes.Plane002_TopMirco_0.geometry}
            material={topMicroMat}
            position={[-1.269, -0.005, 4.411]}
            rotation={[0, -Math.PI / 4, Math.PI / 2]}
          />
          <mesh
            ref={buttonVolumeRef}
            castShadow
            receiveShadow
            geometry={nodes.Plane003_btn_V_0.geometry}
            material={btnVMat}
            position={[0.959, 0, 3.275]}
            rotation={[0, -Math.PI / 4, 0]}
          />
        </group>
      </group>
    );
  }
);

Microphone.displayName = "Microphone";

useGLTF.preload("/microphone.gltf");