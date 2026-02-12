"use client"

import { RadioHouse } from "@/components/RadioHouse";
import { Environment, PerspectiveCamera } from "@react-three/drei";
// import { useControls } from "leva"

export function RadioHouseScene() {

    // const { positionX, positionY, positionZ, rotationX, rotationY, rotationZ } = useControls({
    //     positionX: 0,
    //     positionY: -0.8, 
    //     positionZ: 2.0, 
    //     rotationX: 0,
    //     rotationY: 1.05, 
    //     rotationZ: 0, 
    // })


    return (
        <group>
            {/* <RadioHouse scale={0.4} position={[positionX, positionY, positionZ]} rotation={[rotationX, rotationY, rotationZ]} /> */}

            <PerspectiveCamera position={[0, 0, 4]} fov={50} makeDefault />

            <RadioHouse scale={0.4} position={[0, -0.8, 0.8]} rotation={[0, 1.05, 0]} />

            <Environment 
            files={["/hdr/blue-studio.hdr"]}
            environmentIntensity={0.08}
            />

            {/* Rim light - from behind to create edge definition */}
            <spotLight
                position={[-1, 3, -2]}
                intensity={0.6}
                angle={0.5}
                penumbra={0.5}
                shadow-bias={-0.0002}
                shadow-normalBias={0.002}
                shadow-mapSize={1024}
            />
        </group>
    )
}