/**
 * A stretch of lightning as a ribbon turned to face the camera, so it shows its full width from
 * any side: each corner knows its stretch's two ends, which end it is at (x, 0 or 1) and which
 * edge (y, -1 or 1), and how wide and bright the stretch is.
 */
export const BOLT_VERTEX = /* glsl */ `
attribute vec3 aTo;
attribute vec2 aCorner;
attribute float aWidth;
attribute float aGlow;
varying vec2 vCorner;
varying float vGlow;
void main() {
  vec3 middle = mix(position, aTo, aCorner.x);
  vec3 along = normalize(aTo - position);
  vec3 across = normalize(cross(along, cameraPosition - middle));
  vec3 world = middle + across * aCorner.y * aWidth + along * (aCorner.x * 2.0 - 1.0) * aWidth * 0.5;
  vCorner = aCorner;
  vGlow = aGlow;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

/** A white-hot core down the middle of the ribbon in a blue-white glow, added to what lies behind. */
export const BOLT_FRAGMENT = /* glsl */ `
varying vec2 vCorner;
varying float vGlow;
void main() {
  float off = abs(vCorner.y);
  float core = 1.0 - smoothstep(0.06, 0.2, off);
  float glow = (1.0 - off) * (1.0 - off) * 0.55;
  vec3 colour = vec3(0.62, 0.7, 1.0) * glow + vec3(1.0, 0.98, 0.95) * core;
  gl_FragColor = vec4(colour * vGlow, 1.0);
  #include <colorspace_fragment>
}
`;
