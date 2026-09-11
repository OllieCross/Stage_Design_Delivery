"use client";

/* eslint-disable react-hooks/immutability -- Three.js objects are mutated
   imperatively (uniform values); see beams.tsx for the same pattern. */

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useLoader } from "@react-three/fiber";
import { EXRLoader, RGBELoader } from "three-stdlib";

/**
 * The visible sky: a crossfade between the Day and Night HDRI on one big
 * backdrop sphere, sampling both textures in a single shader pass rather than
 * blending two full PMREM environment maps (which drei's <Environment> would
 * need to regenerate on every slider tick). Cheapest and most realistic of
 * the options considered - see hdri-panel.tsx for the mix control.
 *
 * Lighting/reflections are a separate, much cheaper concern: stage-viewer
 * points drei's <Environment> (background off) at whichever side of the mix
 * is nearer, since blending two environment maps for IBL isn't cheap and the
 * effect is subtle on stage-truss materials anyway.
 */

const RADIUS = 450; // inside the camera's far=500 clip, comfortably past any stage

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Flips the horizontal read rather than the geometry itself, so BackSide
    // (needed to view the sphere from inside) doesn't also have to fight a
    // winding flip from a negatively-scaled geometry.
    vUv = vec2(1.0 - uv.x, uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform float uMix;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec3 day = texture2D(uDayMap, vUv).rgb;
    vec3 night = texture2D(uNightMap, vUv).rgb;
    gl_FragColor = vec4(mix(day, night, uMix) * uIntensity, 1.0);
    // A hand-written ShaderMaterial's output isn't tonemapped/color-encoded
    // automatically the way three's built-in materials are - without these,
    // raw linear HDR radiance goes straight to the framebuffer and the image
    // reads as a blown-out, featureless wash rather than the actual photo.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function useEquirect(url: string) {
  const ext = url.split(".").pop();
  const Loader = ext === "exr" ? EXRLoader : RGBELoader;
  const texture = useLoader(Loader, url);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

export function HdriSky({
  dayUrl,
  nightUrl,
  mix,
  intensity,
}: {
  dayUrl: string;
  nightUrl: string;
  mix: number;
  intensity: number;
}) {
  const dayMap = useEquirect(dayUrl);
  const nightMap = useEquirect(nightUrl);

  const geometry = useMemo(() => new THREE.SphereGeometry(RADIUS, 64, 40), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        name: "hdri-sky",
        vertexShader,
        fragmentShader,
        uniforms: {
          uDayMap: { value: dayMap },
          uNightMap: { value: nightMap },
          uMix: { value: mix },
          uIntensity: { value: intensity },
        },
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once; uniforms are rebound below
    [],
  );

  // Sliders drive uniform values directly - no geometry/material rebuild, no
  // React re-render cost beyond this effect, matching beams.tsx's pattern.
  useLayoutEffect(() => {
    material.uniforms.uDayMap.value = dayMap;
    material.uniforms.uNightMap.value = nightMap;
    material.uniforms.uMix.value = mix;
    material.uniforms.uIntensity.value = intensity;
  }, [material, dayMap, nightMap, mix, intensity]);

  return <mesh geometry={geometry} material={material} renderOrder={-1} frustumCulled={false} />;
}
