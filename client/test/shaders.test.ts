import { DataTexture, Mesh, Scene, ShaderMaterial, Vector4 } from "three";
import { describe, expect, it } from "vitest";
import { addSky } from "../src/scene/sky-renderer.js";
import { SEA_FRAGMENT, SEA_VERTEX } from "../src/scene/sea-shader.js";
import { terrainMaterial } from "../src/scene/terrain-material.js";
import { FISH_FRAGMENT, FISH_VERTEX } from "../src/scene/fish-shader.js";
import {
  CLOUD_FRAGMENT,
  CLOUD_VERTEX,
  RAIN_FRAGMENT,
  RAIN_VERTEX,
} from "../src/scene/weather-shaders.js";

/** GLSL's built-in functions: a variable or parameter by one of these names fails to compile. */
const BUILT_INS = new Set(
  (
    "radians degrees sin cos tan asin acos atan pow exp log exp2 log2 sqrt inversesqrt abs sign " +
    "floor ceil fract mod min max clamp mix step smoothstep length distance dot cross normalize " +
    "faceforward reflect refract matrixCompMult lessThan lessThanEqual greaterThan " +
    "greaterThanEqual equal notEqual any all not texture2D textureCube round trunc"
  ).split(" "),
);

const DECLARED =
  /\b(?:float|int|bool|vec2|vec3|vec4|mat2|mat3|mat4)\s+([A-Za-z_]\w*)\s*(?=[=;,)[])/g;

function shadowingNames(source: string): string[] {
  return [...source.matchAll(DECLARED)]
    .map((match) => match[1])
    .filter((name) => BUILT_INS.has(name));
}

function builtShaders(): Readonly<Record<string, string>> {
  const shadows = { spots: [new Vector4()], shapes: [new Vector4()] };
  const terrain = terrainMaterial({ shadows, landUse: new DataTexture() });
  const scene = new Scene();
  addSky(scene);
  const sky = (scene.children[0] as Mesh).material as ShaderMaterial;
  return {
    terrainVertex: terrain.vertexShader,
    terrainFragment: terrain.fragmentShader,
    skyVertex: sky.vertexShader,
    skyFragment: sky.fragmentShader,
    seaVertex: SEA_VERTEX,
    seaFragment: SEA_FRAGMENT,
    fishVertex: FISH_VERTEX,
    fishFragment: FISH_FRAGMENT,
    cloudVertex: CLOUD_VERTEX,
    cloudFragment: CLOUD_FRAGMENT,
    rainVertex: RAIN_VERTEX,
    rainFragment: RAIN_FRAGMENT,
  };
}

/** A GLSL constant must name its type: "const float X = 1.0;", never "const X = 1.0;". */
const UNTYPED_CONSTANT = /\bconst\s+(?!(?:float|int|bool|vec[234]|mat[234])\b)[A-Za-z_]\w*\s*=/g;

describe("shaders", () => {
  it("give every constant its type, as GLSL requires", () => {
    const untyped = Object.entries(builtShaders()).flatMap(([shader, source]) =>
      [...source.matchAll(UNTYPED_CONSTANT)].map((match) => `${shader}: ${match[0]}`),
    );

    expect(untyped).toEqual([]);
  });

  it("name no variable or parameter after a GLSL built-in, which would not compile", () => {
    const clashes = Object.entries(builtShaders()).flatMap(([shader, source]) =>
      shadowingNames(source).map((name) => `${shader}: ${name}`),
    );

    expect(clashes).toEqual([]);
  });
});
