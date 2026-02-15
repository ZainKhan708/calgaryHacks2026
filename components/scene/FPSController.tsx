"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 0.002;
const PI_2 = Math.PI / 2;

/**
 * Custom first-person controller using native Pointer Lock.
 * Click canvas to lock cursor, move mouse to look, WASD + Shift to move/sprint.
 */
export function FPSController({ initialPosition }: { initialPosition?: [number, number, number] }) {
  const { camera, gl } = useThree();
  const perspectiveCamera =
    (camera as THREE.PerspectiveCamera).isPerspectiveCamera
      ? (camera as THREE.PerspectiveCamera)
      : null;

  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const sprint = useRef(false);

  const velocity = useRef(new THREE.Vector2());
  const bobTime = useRef(0);
  const bobOffset = useRef(0);
  const lastFov = useRef(perspectiveCamera?.fov ?? 75);
  const didSetInitial = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  const baseEyeHeight = 1.7;

  useEffect(() => {
    if (didSetInitial.current) return;
    if (initialPosition) camera.position.set(initialPosition[0], initialPosition[1], initialPosition[2]);
    didSetInitial.current = true;
  }, [camera, initialPosition]);

  useEffect(() => {
    const canvas = gl.domElement;
    let lockCooldown = 0;

    const handleClick = () => {
      if (document.pointerLockElement === canvas) return;
      if (Date.now() < lockCooldown) return;
      try {
        canvas.requestPointerLock?.();
      } catch {
        // Ignore unsupported browser/runtime pointer-lock errors.
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) lockCooldown = Date.now() + 600;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;

      const next = euler.current;
      next.setFromQuaternion(camera.quaternion);
      next.y -= event.movementX * MOUSE_SENSITIVITY;
      next.x -= event.movementY * MOUSE_SENSITIVITY;
      next.x = Math.max(-PI_2, Math.min(PI_2, next.x));
      camera.quaternion.setFromEuler(next);
    };

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

    document.addEventListener("pointerlockchange", handlePointerLockChange);
    canvas.addEventListener("click", handleClick);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      canvas.removeEventListener("click", handleClick);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [camera, gl]);

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

    if (perspectiveCamera) {
      const targetFov = sprint.current && horizontalSpeed > 0.5 ? 81 : 75;
      const nextFov = THREE.MathUtils.lerp(perspectiveCamera.fov, targetFov, smoothing * 0.65);
      if (Math.abs(nextFov - lastFov.current) > 0.01) {
        perspectiveCamera.fov = nextFov;
        perspectiveCamera.updateProjectionMatrix();
        lastFov.current = nextFov;
      }
    }
  });

  return null;
}
