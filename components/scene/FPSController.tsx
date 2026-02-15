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
  const velocity = useRef(new THREE.Vector2());
  const bobTime = useRef(0);
  const bobOffset = useRef(0);
  const lastFov = useRef(camera.fov);
  const didSetInitial = useRef(false);
  const baseEyeHeight = 1.7;

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

  useFrame((_, frameDelta) => {
    const delta = Math.min(frameDelta, 0.05);

    const inputX = Number(moveRight.current) - Number(moveLeft.current);
    const inputZ = Number(moveBackward.current) - Number(moveForward.current);
    const input = new THREE.Vector2(inputX, inputZ);
    if (input.lengthSq() > 1) input.normalize();

    const walkSpeed = 14;
    const sprintSpeed = 20;
    const targetSpeed = sprint.current ? sprintSpeed : walkSpeed;
    const targetVelocity = input.multiplyScalar(targetSpeed);

    const smoothing = 1 - Math.exp(-14 * delta);
    velocity.current.x = THREE.MathUtils.lerp(velocity.current.x, targetVelocity.x, smoothing);
    velocity.current.y = THREE.MathUtils.lerp(velocity.current.y, targetVelocity.y, smoothing);

    camera.translateX(velocity.current.x * delta);
    camera.translateZ(velocity.current.y * delta);

    const horizontalSpeed = velocity.current.length();
    if (horizontalSpeed > 0.15) {
      const cycleSpeed = sprint.current ? 15 : 11;
      bobTime.current += delta * cycleSpeed * (horizontalSpeed / targetSpeed);
      bobOffset.current = Math.sin(bobTime.current) * 0.045 + Math.sin(bobTime.current * 2) * 0.012;
    } else {
      bobOffset.current = THREE.MathUtils.lerp(bobOffset.current, 0, smoothing);
    }
    camera.position.y = baseEyeHeight + bobOffset.current;

    const targetFov = sprint.current && horizontalSpeed > 0.5 ? 81 : 75;
    const nextFov = THREE.MathUtils.lerp(camera.fov, targetFov, smoothing * 0.65);
    if (Math.abs(nextFov - lastFov.current) > 0.01) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
      lastFov.current = nextFov;
    }
  });

  return <PointerLockControls />;
}
