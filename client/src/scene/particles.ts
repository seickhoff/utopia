import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  LinearFilter,
  NormalBlending,
  Points,
  PointsMaterial,
  RGBAFormat,
  type Scene,
} from "three";

const PUFF_TEXTURE_SIZE = 64;

/** A pool of billboard points, filled afresh every frame without allocating. */
export class PointPool {
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  private readonly geometry = new BufferGeometry();
  private count = 0;

  constructor(scene: Scene, look: { capacity: number; size: number; glowing: boolean }) {
    this.positions = new Float32Array(look.capacity * 3);
    this.colors = new Float32Array(look.capacity * 3);
    this.geometry.setAttribute("position", new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute("color", new BufferAttribute(this.colors, 3));
    const material = new PointsMaterial({
      size: look.size,
      map: softDot(),
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: look.glowing ? AdditiveBlending : NormalBlending,
    });
    scene.add(new Points(this.geometry, material));
  }

  begin(): void {
    this.count = 0;
  }

  add(point: { x: number; y: number; z: number; colour: readonly number[] }): void {
    if (this.count * 3 >= this.positions.length) return;
    this.positions.set([point.x, point.y, point.z], this.count * 3);
    this.colors.set(point.colour, this.count * 3);
    this.count += 1;
  }

  finish(): void {
    this.geometry.setDrawRange(0, this.count);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }
}

/** A round, soft-edged dot, for puffs of cloud and glints on the water. */
function softDot(): DataTexture {
  const size = PUFF_TEXTURE_SIZE;
  const pixels = new Uint8Array(size * size * 4);
  for (let index = 0; index < size * size; index += 1) {
    const x = (index % size) / (size - 1) - 0.5;
    const y = Math.floor(index / size) / (size - 1) - 0.5;
    const fade = Math.max(0, 1 - Math.hypot(x, y) * 2);
    pixels.set([255, 255, 255, Math.round(255 * Math.pow(fade, 1.4))], index * 4);
  }
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
