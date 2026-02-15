"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

export function PlayerController() {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    camera.position.set(0, 1.7, 8);

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    const onMouseDown = () => {
      dragging.current = true;
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      yaw.current -= e.movementX * 0.0025;
      pitch.current -= e.movementY * 0.0025;
      pitch.current = Math.max(-Math.PI / 2.4, Math.min(Math.PI / 2.4, pitch.current));
    };

    const node = gl.domElement;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    node.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      node.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [camera, gl.domElement]);

  useFrame((_, dt) => {
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;

    const speed = keys.current.shift ? 7 : 4;
    const velocity = new THREE.Vector3();
    if (keys.current.w) velocity.z -= 1;
    if (keys.current.s) velocity.z += 1;
    if (keys.current.a) velocity.x -= 1;
    if (keys.current.d) velocity.x += 1;

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(speed * dt);
      velocity.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
      camera.position.add(velocity);
    }

    camera.position.y = 1.7;
  });

  return null;
}
