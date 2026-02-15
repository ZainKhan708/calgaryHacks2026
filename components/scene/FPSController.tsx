"use client";

import { PointerLockControls } from "@react-three/drei";
import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * First-person controller with PointerLockControls (spec: "Movement is powered
 * by a character controller that handles physics, gravity simulation, and camera rotation").
 * WASD to move, mouse to look, ESC to unlock pointer.
 */
export function FPSController({ initialPosition }: { initialPosition?: [number, number, number] }) {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const sprint = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const didSetInitial = useRef(false);

  useEffect(() => {
    if (didSetInitial.current) return;
    if (initialPosition) {
      camera.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
    }
    didSetInitial.current = true;
  }, [camera, initialPosition]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          moveForward.current = true;
          break;
        case "ArrowLeft":
        case "KeyA":
          moveLeft.current = true;
          break;
        case "ArrowDown":
        case "KeyS":
          moveBackward.current = true;
          break;
        case "ArrowRight":
        case "KeyD":
          moveRight.current = true;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          sprint.current = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          moveForward.current = false;
          break;
        case "ArrowLeft":
        case "KeyA":
          moveLeft.current = false;
          break;
        case "ArrowDown":
        case "KeyS":
          moveBackward.current = false;
          break;
        case "ArrowRight":
        case "KeyD":
          moveRight.current = false;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          sprint.current = false;
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useFrame(() => {
    const time = performance.now();
    const delta = (time - prevTime.current) / 1000;

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    const baseSpeed = 9;
    const speed = sprint.current ? baseSpeed * 1.3 : baseSpeed;
    if (moveForward.current || moveBackward.current)
      velocity.current.z -= direction.current.z * speed * delta;
    if (moveLeft.current || moveRight.current)
      velocity.current.x += direction.current.x * speed * delta;

    camera.translateX(velocity.current.x * delta);
    camera.translateZ(velocity.current.z * delta);

    camera.position.y = 1.7;
    prevTime.current = time;
  });

  return <PointerLockControls />;
}
