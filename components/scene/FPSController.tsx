"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const MOUSE_SENSITIVITY = 0.002;
const PI_2 = Math.PI / 2;

/**
 * Custom first-person controller with native Pointer Lock API.
 * Avoids the three-stdlib console error from @react-three/drei's PointerLockControls.
 * Click canvas to lock, WASD to move, mouse to look, ESC to unlock.
 */
export function FPSController({ initialPosition }: { initialPosition?: [number, number, number] }) {
  const { camera, gl } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const sprint = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const prevTime = useRef(performance.now());
  const didSetInitial = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

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
      try { canvas.requestPointerLock?.(); } catch { /* ignore */ }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) lockCooldown = Date.now() + 600;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      const cur = euler.current;
      cur.setFromQuaternion(camera.quaternion);
      cur.y -= e.movementX * MOUSE_SENSITIVITY;
      cur.x -= e.movementY * MOUSE_SENSITIVITY;
      cur.x = Math.max(-PI_2, Math.min(PI_2, cur.x));
      camera.quaternion.setFromEuler(cur);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": moveForward.current = true; break;
        case "ArrowLeft": case "KeyA": moveLeft.current = true; break;
        case "ArrowDown": case "KeyS": moveBackward.current = true; break;
        case "ArrowRight": case "KeyD": moveRight.current = true; break;
        case "ShiftLeft": case "ShiftRight": sprint.current = true; break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "ArrowUp": case "KeyW": moveForward.current = false; break;
        case "ArrowLeft": case "KeyA": moveLeft.current = false; break;
        case "ArrowDown": case "KeyS": moveBackward.current = false; break;
        case "ArrowRight": case "KeyD": moveRight.current = false; break;
        case "ShiftLeft": case "ShiftRight": sprint.current = false; break;
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

  useFrame(() => {
    const time = performance.now();
    const delta = (time - prevTime.current) / 1000;

    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    const baseSpeed = 14;
    const speed = sprint.current ? baseSpeed * 1.35 : baseSpeed;
    if (moveForward.current || moveBackward.current) velocity.current.z -= direction.current.z * speed * delta;
    if (moveLeft.current || moveRight.current) velocity.current.x += direction.current.x * speed * delta;

    camera.translateX(velocity.current.x * delta);
    camera.translateZ(velocity.current.z * delta);
    camera.position.y = 1.7;
    prevTime.current = time;
  });

  return null;
}
