"use client";

/* eslint-disable react-hooks/immutability -- Three.js objects are mutated
   imperatively (uniform values, instance matrices); that is the intended
   react-three-fiber pattern and avoids rebuilding GPU resources per frame. */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { KIND_OPTICS, type FixtureKind } from "@/lib/fixture-kinds";
import type { Fixture, LightSettings } from "./types";

/**
 * Volumetric-looking beams without raymarching: a cone per fixture, drawn with
 * additive blending and a shader that fades toward the cone's edges and along
 * its length.
 *
 * Fixtures are batched into one InstancedMesh per kind rather than one mesh
 * each, because a rig is dominated by LED bars and pixel strips - this rig is
 * 24 bars out of 55 fixtures. Per-fixture meshes would mean a geometry, a
 * material and two draw calls each; instancing keeps it to one geometry, one
 * material and one draw call per kind no matter how many fixtures there are.
 * The beams are static, so there is no per-frame work at all once uploaded.
 */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

// The unit cone runs along -Y with its apex at the origin, so uv.y goes from
// the lens out to the end of the throw.
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    float lengthFade = pow(1.0 - vUv.y, 1.6);
    float edge = smoothstep(0.0, 0.35, abs(vUv.x - 0.5) * 2.0);
    float alpha = lengthFade * (1.0 - edge * 0.85) * uIntensity * 0.5;
    gl_FragColor = vec4(uColor * uIntensity, alpha);
  }
`;

const UP = new THREE.Vector3(0, 1, 0);

function KindBeams({
  kind,
  fixtures,
  settings,
}: {
  kind: FixtureKind;
  fixtures: Fixture[];
  settings: LightSettings;
}) {
  const optics = KIND_OPTICS[kind];
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);

  // A unit cone: radius 0.5, height 1, apex at the origin pointing down -Y.
  // Every instance reuses it, scaled per kind.
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.5, 1, 16, 1, true);
    g.translate(0, -0.5, 0);
    g.rotateX(Math.PI);
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        name: `beam-${kind}`,
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(optics.color) },
          uIntensity: { value: optics.intensity },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [kind, optics.color, optics.intensity],
  );

  // Brightness is a uniform, so the slider costs no geometry rebuild.
  useLayoutEffect(() => {
    material.uniforms.uIntensity.value = optics.intensity * settings.intensity;
  }, [material, optics.intensity, settings.intensity]);

  // Instance transforms are rebuilt only when the rig or the sliders change.
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const glow = glowRef.current;
    if (!mesh) return;

    const length = optics.length * settings.lengthScale;
    const angle = Math.min(179, optics.angle * settings.angleScale);
    const radius = Math.tan(THREE.MathUtils.degToRad(angle) / 2) * length;

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const direction = new THREE.Vector3();

    fixtures.forEach((f, i) => {
      direction.set(f.dirX, f.dirY, f.dirZ).normalize();
      // Cone apex sits at the fixture; +Y of the unit cone is the aim axis.
      quaternion.setFromUnitVectors(UP, direction);
      position.set(f.x, f.y, f.z);
      scale.set(radius * 2, length, radius * 2);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);

      if (glow) {
        scale.setScalar(1);
        matrix.compose(position, quaternion, scale);
        glow.setMatrixAt(i, matrix);
      }
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    if (glow) {
      glow.instanceMatrix.needsUpdate = true;
      glow.computeBoundingSphere();
    }
  }, [fixtures, optics.angle, optics.length, settings.angleScale, settings.lengthScale]);

  if (fixtures.length === 0) return null;

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, fixtures.length]}
        frustumCulled={false}
        renderOrder={2}
      />
      {/* Lens glow, also instanced: one extra draw call per kind, not per fixture. */}
      <instancedMesh
        ref={glowRef}
        args={[undefined, undefined, fixtures.length]}
        frustumCulled={false}
        renderOrder={3}
      >
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshBasicMaterial
          color={optics.color}
          transparent
          opacity={Math.min(1, 0.45 + settings.intensity * 0.45)}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}

export function Beams({ fixtures, settings }: { fixtures: Fixture[]; settings: LightSettings }) {
  // Group once per rig change; foggers, pyro and other non-emitting effects
  // are dropped entirely rather than drawn invisibly.
  const byKind = useMemo(() => {
    const groups = new Map<FixtureKind, Fixture[]>();
    for (const f of fixtures) {
      const kind = f.kind as FixtureKind;
      if (!KIND_OPTICS[kind]?.emits) continue;
      const list = groups.get(kind);
      if (list) list.push(f);
      else groups.set(kind, [f]);
    }
    return [...groups.entries()];
  }, [fixtures]);

  if (!settings.enabled) return null;

  return (
    <group>
      {byKind.map(([kind, list]) => (
        <KindBeams key={kind} kind={kind} fixtures={list} settings={settings} />
      ))}
    </group>
  );
}
