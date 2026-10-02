/** A curtain of rain round a cylinder: u runs round it, v from the sea (0) up to the cloud (1). */
export const RAIN_VERTEX = /* glsl */ `
varying vec2 vCurtain;
void main() {
  vCurtain = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Streaks falling down the curtain, each lane at its own pace, through a grey veil of falling
 * water, fading out at the top and the sea.
 */
export const RAIN_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uOpacity;
uniform float uFlash;
uniform float uVeil;
uniform vec3 uColour;
varying vec2 vCurtain;

float rainHash(float lane) {
  return fract(sin(lane * 91.345) * 47453.5453);
}

void main() {
  float lanes = vCurtain.x * 110.0;
  float lane = floor(lanes);
  float pace = rainHash(lane);
  float fall = fract(vCurtain.y * 2.5 + uTime * uSpeed * (0.8 + 0.4 * pace) + pace * 7.0);
  float streak = smoothstep(0.0, 0.06, fall) * (1.0 - smoothstep(0.3, 0.45, fall));
  float thin = smoothstep(0.35, 0.0, abs(fract(lanes) - 0.5));
  float ends = smoothstep(0.0, 0.12, vCurtain.y) * (1.0 - smoothstep(0.82, 1.0, vCurtain.y));
  float mist = uVeil * (0.6 + 0.4 * (1.0 - vCurtain.y));
  float alpha = max(streak * thin * step(0.3, pace) * uOpacity, mist) * ends;
  if (alpha < 0.01) discard;
  vec3 colour = mix(uColour * 0.55, uColour, streak * thin);
  gl_FragColor = vec4(colour + uFlash * 0.5, alpha);
  #include <colorspace_fragment>
}
`;
