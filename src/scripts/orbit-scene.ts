import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Euler,
  FogExp2,
  Group,
  LineBasicMaterial,
  LineSegments,
  LinearFilter,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import type { OrbitNode } from "../lib/orbitNodes";
import type { createOrbitIntro, OrbitIntroFrame } from "./orbit-intro";

type IntroController = ReturnType<typeof createOrbitIntro>;

interface OrbitSceneOptions {
  root: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  avatarProxy: HTMLElement;
  nodes: OrbitNode[];
  intro: IntroController;
  mobile: boolean;
  reducedMotion: boolean;
  onFrame?: (frame: OrbitIntroFrame, elapsed: number) => void;
}

interface NodeVisual {
  node: OrbitNode;
  points: Points;
  connections: LineSegments;
  core: Mesh;
  halo: Mesh;
  satellites: Mesh[];
  rings: Mesh[];
  trackArc: Mesh | null;
  proxy: Mesh;
  curve: CatmullRomCurve3;
  orbitPosition: number;
  startPosition: Vector3;
  finalPosition: Vector3;
  baseOpacity: number;
  baseScale: number;
  phase: number;
}

interface OrbitTrackVisual {
  curve: CatmullRomCurve3;
  mesh: Mesh;
  sparks: Points;
  glints: Mesh[];
  baseOpacity: number;
  sparkOpacity: number;
  speed: number;
}

interface OrbitSpec {
  radiusX: number;
  radiusY: number;
  depthRadius: number;
  rotation: number;
  tiltX: number;
  tiltY: number;
  center: [number, number, number];
  color: number;
  tube: number;
  opacity: number;
  sparkOpacity: number;
  sparkSize: number;
  speed: number;
  startAngle: number;
  endAngle: number;
  highlightZones: Array<[number, number]>;
  layer: "core" | "content" | "far";
}

interface MeteorVisual {
  group: Group;
  tail: Mesh;
  glow: Mesh;
  head: Mesh;
  start: Vector3;
  end: Vector3;
  speed: number;
  delay: number;
  strength: number;
}

interface OrbitSignalVisual {
  curve: CatmullRomCurve3;
  beads: Mesh[];
  trail: LineSegments;
  offset: number;
  speed: number;
  strength: number;
}

interface CoreSignalVisual {
  beads: Mesh[];
  trail: LineSegments;
  phase: number;
  speed: number;
  radiusX: number;
  radiusY: number;
  depth: number;
  tilt: Euler;
  direction: number;
}

const clamp = MathUtils.clamp;
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 3);

function createRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createPointField(count: number, bounds: [number, number, number], seed: number) {
  const random = createRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (random() - 0.5) * bounds[0];
    positions[index * 3 + 1] = (random() - 0.5) * bounds[1];
    positions[index * 3 + 2] = (random() - 0.5) * bounds[2];
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  return geometry;
}

function createOrbitCurve(spec: OrbitSpec) {
  const points: Vector3[] = [];
  const planeRotation = spec.rotation;
  const cosRotation = Math.cos(planeRotation);
  const sinRotation = Math.sin(planeRotation);
  const tilt = new Euler(spec.tiltX, spec.tiltY, 0);
  const center = new Vector3(...spec.center);
  for (let step = 0; step <= 160; step += 1) {
    const progress = step / 160;
    const angle = MathUtils.lerp(spec.startAngle, spec.endAngle, progress);
    const ellipseX = Math.cos(angle) * spec.radiusX;
    const ellipseY = Math.sin(angle) * spec.radiusY;
    const point = new Vector3(
      ellipseX * cosRotation - ellipseY * sinRotation,
      ellipseX * sinRotation + ellipseY * cosRotation,
      Math.sin(angle) * spec.depthRadius,
    );
    point.applyEuler(tilt);
    point.add(center);
    points.push(point);
  }
  return new CatmullRomCurve3(points, false, "centripetal", 0.22);
}

function circularTexture(src: string, size = 512) {
  return new Promise<CanvasTexture>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      const surface = document.createElement("canvas");
      surface.width = size;
      surface.height = size;
      const context = surface.getContext("2d");
      if (!context) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(size / 2, size / 2, size * 0.492, 0, Math.PI * 2);
      context.clip();
      const sourceRatio = image.naturalWidth / Math.max(1, image.naturalHeight);
      const targetRatio = 1;
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;
      let sourceX = 0;
      let sourceY = 0;
      if (sourceRatio > targetRatio) {
        sourceWidth = image.naturalHeight;
        sourceX = (image.naturalWidth - sourceWidth) / 2;
      } else {
        sourceHeight = image.naturalWidth;
        sourceY = (image.naturalHeight - sourceHeight) / 2;
      }
      context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);
      context.restore();
      const texture = new CanvasTexture(surface);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.needsUpdate = true;
      resolve(texture);
    };
    image.onerror = () => reject(new Error(`Unable to load ${src}`));
    image.src = src;
  });
}

function radialGlowTexture(size = 128) {
  const surface = document.createElement("canvas");
  surface.width = size;
  surface.height = size;
  const context = surface.getContext("2d");
  if (!context) return new CanvasTexture(surface);
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.52)");
  gradient.addColorStop(0.52, "rgba(255,255,255,0.13)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(surface);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSignalTrail(beadCount: number, color: number) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(Math.max(1, beadCount - 1) * 6), 3));
  const trail = new LineSegments(
    geometry,
    new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: true,
    }),
  );
  trail.renderOrder = 4;
  return trail;
}

function updateSignalTrail(trail: LineSegments, beads: Mesh[]) {
  const position = trail.geometry.getAttribute("position") as BufferAttribute;
  for (let index = 0; index < beads.length - 1; index += 1) {
    position.setXYZ(index * 2, beads[index].position.x, beads[index].position.y, beads[index].position.z);
    position.setXYZ(index * 2 + 1, beads[index + 1].position.x, beads[index + 1].position.y, beads[index + 1].position.z);
  }
  position.needsUpdate = true;
}

export async function createOrbitScene({
  root,
  stage,
  canvas,
  avatarProxy,
  nodes,
  intro,
  mobile,
  reducedMotion,
  onFrame,
}: OrbitSceneOptions) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: !mobile });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(mobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;

  const scene = new Scene();
  scene.fog = new FogExp2(0x03050b, mobile ? 0.0155 : 0.0115);

  const camera = new PerspectiveCamera(39, 1, 0.1, 180);
  const cameraLook = new Vector3();
  const cameraLookTarget = new Vector3();
  const cameraTarget = new Vector3();
  const pointer = new Vector2();
  const pointerTarget = new Vector2();

  const world = new Group();
  const orbitGroup = new Group();
  const avatarGroup = new Group();
  const farGroup = new Group();
  const foregroundGroup = new Group();
  world.add(orbitGroup, avatarGroup);
  scene.add(farGroup, world, foregroundGroup);
  const glowTexture = radialGlowTexture();

  scene.add(new AmbientLight(0x7894c2, 0.64));
  const coolLight = new PointLight(0x92c3ff, 44, 76, 2);
  coolLight.position.set(-8, 9, 18);
  scene.add(coolLight);
  const warmLight = new PointLight(0xf0aa68, 17, 58, 2);
  warmLight.position.set(12, -8, 12);
  scene.add(warmLight);

  const farStars = new Points(
    createPointField(mobile ? 820 : 2100, [82, 42, 28], 1947),
    new PointsMaterial({
      color: 0xdce8ff,
      size: mobile ? 0.082 : 0.096,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  farStars.position.z = -27;
  farGroup.add(farStars);

  const brightStars = new Points(
    createPointField(mobile ? 104 : 236, [70, 34, 22], 7811),
    new PointsMaterial({
      color: 0xf7f9ff,
      size: mobile ? 0.16 : 0.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  brightStars.position.z = -21;
  farGroup.add(brightStars);

  let foregroundDust: Points | null = null;
  if (!mobile) {
    foregroundDust = new Points(
      createPointField(240, [54, 26, 12], 4411),
      new PointsMaterial({
        color: 0x9cb8e6,
        size: 0.115,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: true,
      }),
    );
    foregroundDust.position.z = 13;
    foregroundGroup.add(foregroundDust);
  }

  const orbitSpecs = mobile
    ? [
        { radiusX: 5.8, radiusY: 2.15, depthRadius: 1.6, rotation: MathUtils.degToRad(-4), tiltX: 0.06, tiltY: 0.02, center: [0, 0, -2] as [number, number, number], color: 0xc7dcff, tube: 0.021, opacity: 0.46, sparkOpacity: 0.5, sparkSize: 0.1, speed: 0.04, startAngle: MathUtils.degToRad(196), endAngle: MathUtils.degToRad(498), highlightZones: [[0.52, 0.16]], layer: "core" as const },
        { radiusX: 7.2, radiusY: 2.8, depthRadius: 2.1, rotation: MathUtils.degToRad(8), tiltX: -0.04, tiltY: -0.02, center: [0, -0.1, -2.7] as [number, number, number], color: 0x91bfff, tube: 0.015, opacity: 0.34, sparkOpacity: 0.38, sparkSize: 0.088, speed: 0.031, startAngle: MathUtils.degToRad(122), endAngle: MathUtils.degToRad(382), highlightZones: [[0.18, 0.12], [0.76, 0.14]], layer: "core" as const },
        { radiusX: 8.8, radiusY: 4.1, depthRadius: 2.7, rotation: MathUtils.degToRad(-12), tiltX: 0.03, tiltY: 0.01, center: [0, 0, -3.2] as [number, number, number], color: 0xa9bceb, tube: 0.012, opacity: 0.4, sparkOpacity: 0.38, sparkSize: 0.078, speed: 0.025, startAngle: MathUtils.degToRad(116), endAngle: MathUtils.degToRad(340), highlightZones: [[0.17, 0.1], [0.9, 0.1]], layer: "content" as const },
        { radiusX: 10.2, radiusY: 4.8, depthRadius: 3.1, rotation: MathUtils.degToRad(-4), tiltX: -0.025, tiltY: -0.015, center: [-0.1, 0, -3.7] as [number, number, number], color: 0x7faed7, tube: 0.01, opacity: 0.36, sparkOpacity: 0.34, sparkSize: 0.072, speed: 0.021, startAngle: MathUtils.degToRad(-12), endAngle: MathUtils.degToRad(222), highlightZones: [[0.14, 0.11], [0.31, 0.11]], layer: "content" as const },
        { radiusX: 11.7, radiusY: 5.45, depthRadius: 3.5, rotation: MathUtils.degToRad(8), tiltX: 0.025, tiltY: 0.015, center: [-0.15, -0.1, -4.1] as [number, number, number], color: 0x8f9fc8, tube: 0.008, opacity: 0.3, sparkOpacity: 0.29, sparkSize: 0.066, speed: 0.018, startAngle: MathUtils.degToRad(144), endAngle: MathUtils.degToRad(346), highlightZones: [[0.34, 0.1], [0.6, 0.1]], layer: "content" as const },
        { radiusX: 13.1, radiusY: 6.1, depthRadius: 3.9, rotation: MathUtils.degToRad(18), tiltX: -0.02, tiltY: -0.02, center: [-0.48, -0.32, -4.5] as [number, number, number], color: 0x718caf, tube: 0.0065, opacity: 0.23, sparkOpacity: 0.22, sparkSize: 0.06, speed: 0.015, startAngle: MathUtils.degToRad(126), endAngle: MathUtils.degToRad(316), highlightZones: [[0.62, 0.12]], layer: "content" as const },
        { radiusX: 15.4, radiusY: 6.8, depthRadius: 4.5, rotation: MathUtils.degToRad(-12), tiltX: 0.015, tiltY: 0.01, center: [-0.25, 0.1, -5.4] as [number, number, number], color: 0x597393, tube: 0.004, opacity: 0.055, sparkOpacity: 0.07, sparkSize: 0.05, speed: 0.011, startAngle: MathUtils.degToRad(104), endAngle: MathUtils.degToRad(326), highlightZones: [], layer: "far" as const },
      ]
    : [
        { radiusX: 6.35, radiusY: 2.2, depthRadius: 1.8, rotation: MathUtils.degToRad(-4), tiltX: 0.07, tiltY: 0.02, center: [0, -0.05, -2.2] as [number, number, number], color: 0xdceaff, tube: 0.019, opacity: 0.46, sparkOpacity: 0.55, sparkSize: 0.112, speed: 0.05, startAngle: MathUtils.degToRad(198), endAngle: MathUtils.degToRad(500), highlightZones: [[0.52, 0.16]], layer: "core" as const },
        { radiusX: 8.45, radiusY: 3.05, depthRadius: 2.35, rotation: MathUtils.degToRad(8), tiltX: -0.05, tiltY: -0.02, center: [0, 0, -2.85] as [number, number, number], color: 0x8ebcf2, tube: 0.014, opacity: 0.34, sparkOpacity: 0.42, sparkSize: 0.098, speed: 0.039, startAngle: MathUtils.degToRad(122), endAngle: MathUtils.degToRad(382), highlightZones: [[0.18, 0.12], [0.76, 0.14]], layer: "core" as const },
        { radiusX: 13.5, radiusY: 5.3, depthRadius: 3.1, rotation: MathUtils.degToRad(-12), tiltX: 0.035, tiltY: 0.02, center: [-0.05, 0.1, -3.6] as [number, number, number], color: 0xa9b9e5, tube: 0.0115, opacity: 0.46, sparkOpacity: 0.48, sparkSize: 0.088, speed: 0.031, startAngle: MathUtils.degToRad(115), endAngle: MathUtils.degToRad(342), highlightZones: [[0.16, 0.1], [0.9, 0.1]], layer: "content" as const },
        { radiusX: 16.25, radiusY: 6.35, depthRadius: 3.8, rotation: MathUtils.degToRad(-4), tiltX: -0.03, tiltY: -0.02, center: [-0.12, 0.05, -4.3] as [number, number, number], color: 0x7faed7, tube: 0.0095, opacity: 0.42, sparkOpacity: 0.43, sparkSize: 0.08, speed: 0.025, startAngle: MathUtils.degToRad(-14), endAngle: MathUtils.degToRad(220), highlightZones: [[0.14, 0.11], [0.31, 0.1]], layer: "content" as const },
        { radiusX: 19.1, radiusY: 7.25, depthRadius: 4.45, rotation: MathUtils.degToRad(8), tiltX: 0.03, tiltY: 0.018, center: [-0.18, -0.08, -5] as [number, number, number], color: 0x8b99c1, tube: 0.0078, opacity: 0.34, sparkOpacity: 0.35, sparkSize: 0.072, speed: 0.02, startAngle: MathUtils.degToRad(145), endAngle: MathUtils.degToRad(345), highlightZones: [[0.36, 0.1], [0.56, 0.1]], layer: "content" as const },
        { radiusX: 21.6, radiusY: 8.15, depthRadius: 5.05, rotation: MathUtils.degToRad(18), tiltX: -0.025, tiltY: -0.02, center: [-0.72, -0.48, -5.6] as [number, number, number], color: 0x7190b2, tube: 0.0065, opacity: 0.28, sparkOpacity: 0.28, sparkSize: 0.066, speed: 0.017, startAngle: MathUtils.degToRad(126), endAngle: MathUtils.degToRad(316), highlightZones: [[0.62, 0.12]], layer: "content" as const },
        { radiusX: 26.2, radiusY: 9.65, depthRadius: 6.1, rotation: MathUtils.degToRad(-12), tiltX: 0.018, tiltY: 0.012, center: [-0.35, 0.15, -5.8] as [number, number, number], color: 0x587393, tube: 0.0042, opacity: 0.065, sparkOpacity: 0.085, sparkSize: 0.054, speed: 0.013, startAngle: MathUtils.degToRad(104), endAngle: MathUtils.degToRad(326), highlightZones: [], layer: "far" as const },
        { radiusX: 29.8, radiusY: 10.8, depthRadius: 6.9, rotation: MathUtils.degToRad(8), tiltX: -0.012, tiltY: -0.012, center: [-0.4, 0, -7.6] as [number, number, number], color: 0x77678e, tube: 0.0032, opacity: 0.042, sparkOpacity: 0.058, sparkSize: 0.05, speed: 0.01, startAngle: MathUtils.degToRad(118), endAngle: MathUtils.degToRad(302), highlightZones: [], layer: "far" as const },
      ];
  const orbitCount = orbitSpecs.length;
  const orbitCurves = orbitSpecs.map((spec) => createOrbitCurve(spec));
  const orbitTracks: OrbitTrackVisual[] = orbitCurves.map((curve, index) => {
    const spec = orbitSpecs[index];
    const tubularSegments = mobile ? 220 : 420;
    const radialSegments = 7;
    const geometry = new TubeGeometry(curve, tubularSegments, spec.tube, radialSegments, false);
    geometry.setDrawRange(0, 0);
    const positionAttribute = geometry.attributes.position;
    const trackColors = new Float32Array(positionAttribute.count * 3);
    const trackColor = new Color(spec.color);
    const coreLightColor = new Color(0xc5d8ff);
    for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += 1) {
      const progress = clamp(Math.floor(vertexIndex / (radialSegments + 1)) / tubularSegments, 0, 1);
      const edgeFade = MathUtils.smoothstep(progress, 0, 0.11) * (1 - MathUtils.smoothstep(progress, 0.89, 1));
      const zoneBoost = spec.highlightZones.reduce((boost, [center, radius]) => {
        const distance = Math.abs(progress - center);
        return Math.max(boost, 1 - MathUtils.smoothstep(distance, radius * 0.25, radius));
      }, 0);
      const relativeDepth = positionAttribute.getZ(vertexIndex) - spec.center[2];
      const depth = clamp((relativeDepth + spec.depthRadius) / Math.max(spec.depthRadius * 2, 0.01), 0, 1);
      const coreDistance = Math.hypot(positionAttribute.getX(vertexIndex), positionAttribute.getY(vertexIndex));
      const coreLight = spec.layer === "far" ? 0 : 1 - MathUtils.smoothstep(coreDistance, spec.layer === "core" ? 3.4 : 5, spec.layer === "core" ? 7.2 : 10.6);
      const layerLight = spec.layer === "far" ? 0.13 + Math.pow(depth, 1.8) * 0.45 : spec.layer === "core" ? 0.32 + Math.pow(depth, 1.7) * 0.94 : 0.26 + Math.pow(depth, 1.8) * 0.82;
      const brightness = edgeFade * layerLight * (1 + zoneBoost * (spec.layer === "content" ? 0.8 : 0.3) + coreLight * (spec.layer === "content" ? 0.48 : 0.24));
      const coreTint = coreLight * (spec.layer === "content" ? 0.48 : 0.28);
      trackColors[vertexIndex * 3] = MathUtils.lerp(trackColor.r, coreLightColor.r, coreTint) * brightness;
      trackColors[vertexIndex * 3 + 1] = MathUtils.lerp(trackColor.g, coreLightColor.g, coreTint) * brightness;
      trackColors[vertexIndex * 3 + 2] = MathUtils.lerp(trackColor.b, coreLightColor.b, coreTint) * brightness;
    }
    geometry.setAttribute("color", new BufferAttribute(trackColors, 3));
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: spec.opacity,
      depthTest: true,
      depthWrite: false,
      fog: true,
    });
    const mesh = new Mesh(geometry, material);
    mesh.userData.maxDrawCount = geometry.index?.count ?? geometry.attributes.position.count;
    mesh.renderOrder = spec.layer === "core" ? 3 : spec.layer === "content" ? 2 : 0;
    orbitGroup.add(mesh);

    const sparkCount = mobile ? 96 : 150 + index * 20;
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkColors = new Float32Array(sparkCount * 3);
    for (let pointIndex = 0; pointIndex < sparkCount; pointIndex += 1) {
      const progress = pointIndex / Math.max(1, sparkCount - 1);
      const point = curve.getPointAt(progress);
      sparkPositions[pointIndex * 3] = point.x;
      sparkPositions[pointIndex * 3 + 1] = point.y;
      sparkPositions[pointIndex * 3 + 2] = point.z;
      const edgeFade = MathUtils.smoothstep(progress, 0, 0.12) * (1 - MathUtils.smoothstep(progress, 0.88, 1));
      sparkColors[pointIndex * 3] = trackColor.r * edgeFade;
      sparkColors[pointIndex * 3 + 1] = trackColor.g * edgeFade;
      sparkColors[pointIndex * 3 + 2] = trackColor.b * edgeFade;
    }
    const sparkGeometry = new BufferGeometry();
    sparkGeometry.setAttribute("position", new BufferAttribute(sparkPositions, 3));
    sparkGeometry.setAttribute("color", new BufferAttribute(sparkColors, 3));
    const sparks = new Points(
      sparkGeometry,
      new PointsMaterial({
        color: 0xffffff,
        vertexColors: true,
        size: spec.sparkSize,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        fog: true,
      }),
    );
    orbitGroup.add(sparks);

    const glints = Array.from({ length: mobile ? 1 : index < 2 ? 3 : 2 }, (_, glintIndex) => {
      const glint = new Mesh(
        new SphereGeometry(index < 2 ? 0.086 : 0.066, 12, 8),
        new MeshBasicMaterial({
          color: index === 3 ? 0xffd5a0 : 0xe9f3ff,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: true,
        }),
      );
      glint.userData.offset = glintIndex / (mobile ? 1 : index < 2 ? 3 : 2) + index * 0.083;
      orbitGroup.add(glint);
      return glint;
    });

    return {
      curve,
      mesh,
      sparks,
      glints,
      baseOpacity: spec.opacity,
      sparkOpacity: spec.sparkOpacity,
      speed: spec.speed,
    };
  });

  const signalColors = [0x82d9ff, 0xaa8dff, 0xffc879, 0xff91bc, 0x80b5ff];
  const signalOrbitIndexes = mobile ? [1, 3, 4] : [1, 2, 3, 4, 5];
  const orbitSignals: OrbitSignalVisual[] = signalOrbitIndexes.map((orbitIndex, signalIndex) => {
    const beadCount = mobile ? 5 : 7;
    const color = signalColors[signalIndex % signalColors.length];
    const beads = Array.from({ length: beadCount }, (_, beadIndex) => {
      const radius = (mobile ? 0.075 : 0.1) * (beadIndex === 0 ? 1.55 : Math.max(0.5, 1 - beadIndex * 0.1));
      const bead = new Mesh(
        new SphereGeometry(radius, 10, 7),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: true,
        }),
      );
      bead.renderOrder = beadIndex === 0 ? 4 : 3;
      orbitGroup.add(bead);
      return bead;
    });
    const trail = createSignalTrail(beadCount, color);
    orbitGroup.add(trail);
    return {
      curve: orbitCurves[orbitIndex % orbitCount],
      beads,
      trail,
      offset: 0.08 + signalIndex * 0.173,
      speed: (mobile ? 0.018 : 0.022) + signalIndex * 0.0025,
      strength: 0.7 + (signalIndex % 3) * 0.11,
    };
  });

  const meteorGroup = new Group();
  scene.add(meteorGroup);
  const meteorCount = mobile ? 3 : 6;
  const meteorRandom = createRandom(72891);
  const meteors: MeteorVisual[] = Array.from({ length: meteorCount }, (_, index) => {
    const depth = -18 + meteorRandom() * 22;
    const skyBand = index < 2 ? 13.5 - index * 3.2 : -11.5 - (index - 2) * 2.6;
    const start = new Vector3(-28 - meteorRandom() * 8, skyBand + meteorRandom() * 2.5, depth);
    const end = new Vector3(24 + meteorRandom() * 10, skyBand - 2.4 - meteorRandom() * 2.2, depth + 2 + meteorRandom() * 4);
    const direction = end.clone().sub(start).normalize();
    const length = 2.6 + meteorRandom() * 2.8;
    const tailVector = direction.clone().multiplyScalar(-length);
    const makeTail = (radius: number, opacity: number) => {
      const tail = new Mesh(
        new CylinderGeometry(radius * 0.14, radius, length, 7, 1, true),
        new MeshBasicMaterial({
          color: index % 3 === 2 ? 0xffd7a6 : 0xc9e1ff,
          transparent: true,
          opacity,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: true,
        }),
      );
      tail.position.copy(tailVector).multiplyScalar(0.5);
      tail.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), tailVector.clone().normalize());
      return tail;
    };
    const tail = makeTail(0.022, 0);
    const glow = makeTail(0.07, 0);
    (glow.material as MeshBasicMaterial).color.multiplyScalar(0.48);
    const head = new Mesh(
      new SphereGeometry(0.055 + meteorRandom() * 0.04, 10, 7),
      new MeshBasicMaterial({
        color: 0xf5f9ff,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: true,
      }),
    );
    const group = new Group();
    group.add(glow, tail, head);
    meteorGroup.add(group);
    return {
      group,
      tail,
      glow,
      head,
      start,
      end,
      speed: 0.035 + meteorRandom() * 0.026,
      delay: meteorRandom(),
      strength: 0.52 + meteorRandom() * 0.34,
    };
  });

  const coreRing = new Mesh(
    new TorusGeometry(mobile ? 3.35 : 4.82, 0.058, 10, 180),
    new MeshPhysicalMaterial({
      color: 0xffedf6,
      emissive: 0xffb9d2,
      emissiveIntensity: 1.72,
      roughness: 0.25,
      metalness: 0.3,
      transparent: true,
      opacity: 0,
      depthWrite: true,
    }),
  );
  coreRing.rotation.x = 0.08;
  coreRing.position.z = 0.16;
  const coreRingIndexCount = coreRing.geometry.index?.count ?? 0;
  coreRing.geometry.setDrawRange(Math.floor(coreRingIndexCount * 0.06), Math.floor(coreRingIndexCount * 0.54));
  avatarGroup.add(coreRing);

  const coreHaloRing = new Mesh(
    new TorusGeometry(mobile ? 3.62 : 5.28, 0.03, 8, 190),
    new MeshPhysicalMaterial({
      color: 0xd7e8ff,
      emissive: 0x91bfff,
      emissiveIntensity: 1.46,
      roughness: 0.24,
      metalness: 0.18,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  coreHaloRing.rotation.set(0.18, -0.12, 0.34);
  coreHaloRing.position.z = 0.28;
  const coreHaloRingIndexCount = coreHaloRing.geometry.index?.count ?? 0;
  coreHaloRing.geometry.setDrawRange(Math.floor(coreHaloRingIndexCount * 0.22), Math.floor(coreHaloRingIndexCount * 0.44));
  avatarGroup.add(coreHaloRing);

  const coreOrbit = new Mesh(
    new TorusGeometry(mobile ? 4.1 : 5.88, 0.015, 8, 160),
    new MeshPhysicalMaterial({
      color: 0xf0c2d7,
      emissive: 0xd99ab8,
      emissiveIntensity: 0.72,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  coreOrbit.rotation.set(1.05, 0.2, -0.35);
  coreOrbit.position.z = -0.45;
  const coreOrbitIndexCount = coreOrbit.geometry.index?.count ?? 0;
  coreOrbit.geometry.setDrawRange(Math.floor(coreOrbitIndexCount * 0.1), Math.floor(coreOrbitIndexCount * 0.28));
  avatarGroup.add(coreOrbit);

  const coreOrbitBack = new Mesh(
    new TorusGeometry(mobile ? 4.3 : 6.34, 0.01, 8, 180),
    new MeshBasicMaterial({
      color: 0x76aef2,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: true,
    }),
  );
  coreOrbitBack.rotation.set(0.88, -0.46, 0.2);
  coreOrbitBack.position.z = -0.9;
  const coreOrbitBackIndexCount = coreOrbitBack.geometry.index?.count ?? 0;
  coreOrbitBack.geometry.setDrawRange(Math.floor(coreOrbitBackIndexCount * 0.34), Math.floor(coreOrbitBackIndexCount * 0.31));
  avatarGroup.add(coreOrbitBack);

  const coreOrbitFront = new Mesh(
    new TorusGeometry(mobile ? 3.75 : 5.42, 0.012, 8, 180),
    new MeshBasicMaterial({
      color: 0xa090eb,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
      fog: true,
    }),
  );
  coreOrbitFront.rotation.set(1.34, 0.16, 0.78);
  coreOrbitFront.position.z = 0.72;
  coreOrbitFront.renderOrder = 5;
  const coreOrbitFrontIndexCount = coreOrbitFront.geometry.index?.count ?? 0;
  coreOrbitFront.geometry.setDrawRange(
    Math.floor(coreOrbitFrontIndexCount * 0.58),
    Math.floor(coreOrbitFrontIndexCount * 0.16),
  );
  avatarGroup.add(coreOrbitFront);

  const coreSignalSpecs = [
    { color: 0xffcbdc, phase: 0.18, speed: 0.34, radiusX: mobile ? 3.54 : 5.04, radiusY: mobile ? 3.06 : 4.48, depth: 0.58, tilt: new Euler(0.16, -0.08, 0.18), direction: 1 },
    { color: 0x9ed5ff, phase: 2.44, speed: 0.27, radiusX: mobile ? 3.88 : 5.62, radiusY: mobile ? 2.42 : 3.52, depth: 0.82, tilt: new Euler(0.68, 0.18, -0.32), direction: -1 },
    { color: 0xb09cff, phase: 4.7, speed: 0.22, radiusX: mobile ? 4.2 : 6.18, radiusY: mobile ? 2.84 : 4.02, depth: 0.7, tilt: new Euler(0.92, -0.24, 0.46), direction: 1 },
  ];
  const coreSignals: CoreSignalVisual[] = coreSignalSpecs.map((spec) => {
    const beadCount = mobile ? 5 : 7;
    const beads = Array.from({ length: beadCount }, (_, beadIndex) => {
      const radius = (mobile ? 0.068 : 0.092) * (beadIndex === 0 ? 1.7 : Math.max(0.46, 1 - beadIndex * 0.1));
      const bead = new Mesh(
        new SphereGeometry(radius, 10, 7),
        new MeshBasicMaterial({
          color: spec.color,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: true,
        }),
      );
      bead.renderOrder = 6;
      avatarGroup.add(bead);
      return bead;
    });
    const trail = createSignalTrail(beadCount, spec.color);
    trail.renderOrder = 6;
    avatarGroup.add(trail);
    return { ...spec, beads, trail };
  });

  const avatarShade = new Mesh(
    new PlaneGeometry(mobile ? 9.2 : 14.6, mobile ? 7.2 : 11.2),
    new MeshBasicMaterial({ color: 0x050914, map: glowTexture, transparent: true, opacity: 0, depthWrite: false, fog: true }),
  );
  avatarShade.position.z = -2.6;
  avatarGroup.add(avatarShade);

  const avatarAura = new Mesh(
    new PlaneGeometry(mobile ? 7.9 : 13.55, mobile ? 7.9 : 13.55),
    new MeshBasicMaterial({ color: 0x8795f2, map: glowTexture, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
  );
  avatarAura.position.z = -0.82;
  avatarGroup.add(avatarAura);

  const avatarMistRandom = createRandom(91873);
  const avatarMistPositions = new Float32Array((mobile ? 70 : 126) * 3);
  for (let index = 0; index < avatarMistPositions.length / 3; index += 1) {
    const angle = avatarMistRandom() * Math.PI * 2;
    const radius = (mobile ? 3.1 : 4.25) + avatarMistRandom() * (mobile ? 1.8 : 3.35);
    avatarMistPositions[index * 3] = Math.cos(angle) * radius;
    avatarMistPositions[index * 3 + 1] = Math.sin(angle) * radius * 0.58;
    avatarMistPositions[index * 3 + 2] = -1.2 - avatarMistRandom() * 2.6;
  }
  const avatarMistGeometry = new BufferGeometry();
  avatarMistGeometry.setAttribute("position", new BufferAttribute(avatarMistPositions, 3));
  const avatarMist = new Points(
    avatarMistGeometry,
    new PointsMaterial({ color: 0xa3a5ff, size: mobile ? 0.095 : 0.13, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
  );
  avatarGroup.add(avatarMist);

  const avatarSize = mobile ? 5.8 : 9.48;
  const avatarFaceAngle = Math.PI;
  const avatarSources = [
    "/images/home/orbit-window-portrait.webp",
    "/images/home/orbit-radio-observatory.webp",
  ];
  const avatarMaterials = avatarSources.map(() => new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: true,
  }));
  const avatarGeometry = new PlaneGeometry(avatarSize, avatarSize);
  const avatarFaces = avatarMaterials.map((material, index) => {
    const face = new Mesh(avatarGeometry, material);
    face.rotation.y = index * avatarFaceAngle;
    return face;
  });
  avatarGroup.add(...avatarFaces);

  const textureReady = Promise.all(avatarSources.map((source) => circularTexture(source))).then((textures) => {
    textures.forEach((texture, index) => {
      avatarMaterials[index].map = texture;
      avatarMaterials[index].needsUpdate = true;
    });
  }).catch(() => {
    avatarMaterials.forEach((material) => material.color.set(0x16243a));
  });

  const nodeVisuals: NodeVisual[] = [];
  const proxyGeometry = new SphereGeometry(0.32, 12, 8);
  const hotspotTargets = new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-orbit-node-hotspot]"))
      .map((element) => [element.dataset.orbitNodeHotspot ?? "", element]),
  );
  const nodeOrbitAssignments: Record<string, { orbit: number; position: number; depthOffset?: number }> = {
    "category-web-development": { orbit: 2, position: 0.16 },
    "category-frontend": { orbit: 3, position: 0.31 },
    "category-deep-dives": { orbit: 3, position: mobile ? 0.22 : 0.14 },
    "category-design-ux": { orbit: 2, position: mobile ? 0.91 : 0.93 },
    "category-projects": { orbit: 4, position: mobile ? 0.44 : 0.36 },
    "category-tools-workflow": { orbit: 5, position: mobile ? 0.615 : 0.62 },
    "category-life-thinking": { orbit: 4, position: mobile ? 0.64 : 0.56 },
  };
  const constellationLayouts: Array<Array<[number, number, number]>> = [
    [[-0.62, -0.34, 0.1], [-0.08, -0.46, -0.08], [0.48, -0.32, 0.1], [-0.52, 0.18, -0.12], [0, 0.1, 0.18], [0.56, 0.24, -0.08], [-0.18, 0.58, 0.1], [0.38, 0.62, -0.12]],
    [[0.56, 0, 0.14], [0.26, 0.43, -0.1], [-0.2, 0.52, 0.12], [-0.52, 0.18, -0.16], [-0.42, -0.32, 0.14], [0.08, -0.52, -0.08], [0.42, -0.28, 0.18], [0.03, 0.04, 0.24]],
    [[-0.72, -0.12, -0.1], [-0.5, 0.08, 0.1], [-0.26, -0.06, 0], [0, 0.12, 0.2], [0.25, -0.08, -0.1], [0.48, 0.08, 0.15], [0.72, -0.04, -0.1], [0.22, 0.38, 0.2]],
    [[-0.58, 0, 0.05], [-0.3, 0.4, -0.1], [0, 0.58, 0.1], [0.3, 0.4, -0.1], [0.58, 0, 0.05], [0.3, -0.4, 0.1], [0, -0.58, -0.1], [-0.3, -0.4, 0.1]],
    [[-0.62, -0.32, 0], [-0.35, -0.05, 0.12], [-0.05, -0.2, -0.08], [0.22, 0.12, 0.16], [0.52, -0.05, -0.12], [0.18, 0.48, 0.08], [-0.15, 0.38, -0.15], [0.62, 0.34, 0.1]],
    [[0.66, 0, 0.08], [0.46, 0.36, -0.1], [0, 0.54, 0.12], [-0.46, 0.36, -0.08], [-0.66, 0, 0.1], [-0.46, -0.36, -0.12], [0, -0.54, 0.08], [0.46, -0.36, -0.06]],
    [[-0.6, -0.02, 0.08], [-0.32, 0.1, -0.08], [0, 0, 0.18], [0.26, 0.26, -0.1], [0.54, 0.5, 0.12], [0.28, -0.22, 0.08], [0.56, -0.48, -0.12], [-0.06, 0.48, 0.1]],
  ];
  const constellationEdges: Array<Array<[number, number]>> = [
    [[1, 2], [2, 3], [1, 4], [2, 5], [3, 6], [4, 5], [5, 6], [4, 7], [5, 7], [6, 8]],
    [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 2], [4, 5], [6, 7]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [4, 8], [6, 8]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [0, 3], [0, 7]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [4, 6], [6, 7], [5, 8], [6, 8]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [0, 2], [0, 6]],
    [[1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 7], [3, 8]],
  ];

  const visibleNodes = mobile ? nodes.filter((node) => node.type !== "link").slice(0, 7) : nodes;
  const sparseNodeLayout = visibleNodes.length <= 2;
  const sparseNodeSlots = mobile
    ? [
        { x: 0.5, y: 0.42 },
        { x: -0.48, y: -0.38 },
      ]
    : [
        { x: -0.32, y: 0.5 },
        { x: 0.56, y: -0.36 },
      ];
  visibleNodes.forEach((node, index) => {
    const assignment = nodeOrbitAssignments[node.id];
    const curve = orbitCurves[(assignment?.orbit ?? node.orbit) % orbitCount];
    const orbitPosition = assignment?.position ?? ((node.angleSeed + index * 0.071) % 1);
    const finalPosition = curve.getPointAt(orbitPosition);
    if (!sparseNodeLayout) {
      finalPosition.z += assignment?.depthOffset ?? ((index % 5) - 2) * 0.85;
    }
    const direction = index % 2 === 0 ? 1 : -1;
    const startPosition = new Vector3(
      finalPosition.x * 0.18 + Math.sin(index) * 1.2,
      finalPosition.y * 0.15 + Math.cos(index * 1.7) * 0.9,
      finalPosition.z + direction * (16 + (index % 4) * 3.5),
    );

    const count = sparseNodeLayout
      ? node.type === "project" ? (mobile ? 58 : 92) : node.type === "post" ? (mobile ? 48 : 76) : 56
      : node.type === "category" ? (mobile ? 26 : 56) : node.type === "project" ? 54 : node.type === "post" ? 30 : 22;
    const random = createRandom(3203 + index * 97);
    const positions = new Float32Array(count * 3);
    const clusterRadius = (0.5 + node.size * 0.46) * (sparseNodeLayout ? 1.36 : 1);
    const pattern = index % constellationLayouts.length;
    const anchors = constellationLayouts[pattern];
    anchors.forEach((anchor, anchorIndex) => {
      const pointIndex = anchorIndex + 1;
      if (pointIndex >= count) return;
      positions[pointIndex * 3] = anchor[0] * clusterRadius;
      positions[pointIndex * 3 + 1] = anchor[1] * clusterRadius;
      positions[pointIndex * 3 + 2] = anchor[2] * clusterRadius;
    });
    for (let pointIndex = Math.min(9, count); pointIndex < count; pointIndex += 1) {
      const anchor = anchors[Math.floor(random() * anchors.length)];
      const spread = clusterRadius * (0.045 + random() * 0.12);
      positions[pointIndex * 3] = anchor[0] * clusterRadius + (random() - 0.5) * spread;
      positions[pointIndex * 3 + 1] = anchor[1] * clusterRadius + (random() - 0.5) * spread;
      positions[pointIndex * 3 + 2] = anchor[2] * clusterRadius + (random() - 0.5) * spread * 1.6;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    const color = new Color(node.color);
    const trackArc = assignment && node.type === "category" ? (() => {
      const arcPoints = Array.from({ length: 22 }, (_, arcIndex) => {
        const offset = (arcIndex / 21 - 0.5) * 0.075;
        return curve.getPointAt(clamp(assignment.position + offset, 0, 1));
      });
      const arcCurve = new CatmullRomCurve3(arcPoints, false, "centripetal", 0.18);
      const arc = new Mesh(
        new TubeGeometry(arcCurve, 54, 0.012, 6, false),
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
          fog: true,
        }),
      );
      arc.renderOrder = 3;
      orbitGroup.add(arc);
      return arc;
    })() : null;
    const baseOpacity = node.type === "post" ? (sparseNodeLayout ? 1 : 0.76) : 1;
    const points = new Points(
      geometry,
      new PointsMaterial({
        color,
        size: sparseNodeLayout
          ? node.type === "project" ? 0.26 : 0.225
          : node.type === "category" ? 0.19 : node.type === "project" ? 0.155 : 0.12,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        fog: true,
      }),
    );
    points.position.copy(startPosition);
    orbitGroup.add(points);

    const edgePairs = node.type === "category" ? constellationEdges[pattern] : Array.from({ length: Math.min(10, count - 1) }, (_, edgeIndex) => [0, edgeIndex + 1] as [number, number]);
    const connectionCount = edgePairs.length;
    const connectionPositions = new Float32Array(connectionCount * 6);
    for (let connectionIndex = 0; connectionIndex < connectionCount; connectionIndex += 1) {
      const [fromIndex, toIndex] = edgePairs[connectionIndex];
      connectionPositions[connectionIndex * 6] = positions[fromIndex * 3];
      connectionPositions[connectionIndex * 6 + 1] = positions[fromIndex * 3 + 1];
      connectionPositions[connectionIndex * 6 + 2] = positions[fromIndex * 3 + 2];
      connectionPositions[connectionIndex * 6 + 3] = positions[toIndex * 3];
      connectionPositions[connectionIndex * 6 + 4] = positions[toIndex * 3 + 1];
      connectionPositions[connectionIndex * 6 + 5] = positions[toIndex * 3 + 2];
    }
    const connectionGeometry = new BufferGeometry();
    connectionGeometry.setAttribute("position", new BufferAttribute(connectionPositions, 3));
    const connections = new LineSegments(
      connectionGeometry,
      new LineBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    );
    connections.position.copy(startPosition);
    orbitGroup.add(connections);

    const core = new Mesh(
      new SphereGeometry(node.type === "category" ? 0.205 : sparseNodeLayout ? 0.16 : 0.1, 12, 8),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    );
    core.position.copy(startPosition);
    orbitGroup.add(core);

    const halo = new Mesh(
      new PlaneGeometry(clusterRadius * 3.8, clusterRadius * 3.8),
      new MeshBasicMaterial({ color, map: glowTexture, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    );
    halo.position.copy(startPosition);
    halo.position.z -= 0.28;
    orbitGroup.add(halo);

    const satelliteCount = node.type === "category" ? 8 : sparseNodeLayout ? (node.type === "project" ? 6 : 5) : 0;
    const satellites = Array.from({ length: satelliteCount }, (_, satelliteIndex) => {
      const positionIndex = 1 + satelliteIndex;
      const offset = new Vector3(
        positions[positionIndex * 3],
        positions[positionIndex * 3 + 1],
        positions[positionIndex * 3 + 2],
      );
      const satellite = new Mesh(
        new SphereGeometry((sparseNodeLayout ? 0.098 : 0.076) + (satelliteIndex % 3) * 0.021, 9, 6),
        new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
      );
      satellite.userData.offset = offset;
      satellite.position.copy(startPosition).add(offset);
      orbitGroup.add(satellite);
      return satellite;
    });

    const ringCount = node.type === "category" ? [0, 1, 0, 1, 0, 2, 1][pattern] : sparseNodeLayout ? 1 : 0;
    const rings = Array.from({ length: ringCount }, (_, ringIndex) => {
      const ring = new Mesh(
        new TorusGeometry(clusterRadius * (0.48 + ringIndex * 0.25), 0.009, 6, 64),
        new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
      );
      ring.rotation.set(0.8 + ringIndex * 0.42, index * 0.17, -0.22 + ringIndex * 0.34);
      ring.position.copy(startPosition);
      orbitGroup.add(ring);
      return ring;
    });

    const proxy = new Mesh(
      proxyGeometry,
      new MeshPhysicalMaterial({ color, transparent: true, opacity: 0, depthWrite: false }),
    );
    proxy.position.copy(startPosition);
    proxy.visible = false;
    orbitGroup.add(proxy);

    nodeVisuals.push({
      node,
      points,
      connections,
      core,
      halo,
      satellites,
      rings,
      trackArc,
      proxy,
      curve,
      orbitPosition,
      startPosition,
      finalPosition,
      baseOpacity,
      baseScale: node.size,
      phase: node.angleSeed * Math.PI * 2,
    });
  });

  let activeNodeId = "";
  let running = true;
  let heroVisible = true;
  let pageVisible = document.visibilityState !== "hidden";
  let frameRequest = 0;
  let lastFrame = performance.now();
  let settledElapsed = 0;
  let avatarRestStep = 0;
  let avatarTargetStep = 0;
  let stageWidth = 1;
  let stageHeight = 1;
  let sparsePlacementLocked = false;
  const tempWorld = new Vector3();
  const tempScreen = new Vector3();
  const sparseOrbitPoint = new Vector3();
  const sparseProjectedPoint = new Vector3();
  const signalPoint = new Vector3();

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    stageWidth = width;
    stageHeight = height;
    sparsePlacementLocked = false;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const projectElement = (position: Vector3, element: HTMLElement, size: number) => {
    const rect = stage.getBoundingClientRect();
    tempScreen.copy(position).project(camera);
    const x = (tempScreen.x * 0.5 + 0.5) * rect.width;
    const y = (-tempScreen.y * 0.5 + 0.5) * rect.height;
    const visible = tempScreen.z > -1 && tempScreen.z < 1 && x > -80 && x < rect.width + 80 && y > -80 && y < rect.height + 80;
    element.style.setProperty("--hit-size", `${size}px`);
    element.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    element.toggleAttribute("data-orbit-target-visible", visible);
  };

  const updateHitTargets = () => {
    avatarGroup.getWorldPosition(tempWorld);
    projectElement(tempWorld, avatarProxy, mobile ? 118 : 154);
    for (const visual of nodeVisuals) {
      const target = hotspotTargets.get(visual.node.id);
      if (!target) continue;
      visual.points.getWorldPosition(tempWorld);
    projectElement(tempWorld, target, mobile ? 52 : clamp(44 + visual.node.size * 18, 48, 74));
    }
  };

  const setActiveNode = (nodeId: string | null) => {
    activeNodeId = nodeId ?? "";
    wake();
  };

  const flipAvatar = () => {
    avatarRestStep += 1;
    avatarTargetStep = avatarRestStep;
    wake();
  };

  const render = (now: number) => {
    const minFrameDuration = mobile && !reducedMotion ? 1000 / 45 : 0;
    if (minFrameDuration && now - lastFrame < minFrameDuration) {
      frameRequest = window.requestAnimationFrame(render);
      return;
    }
    const delta = Math.min(48, now - lastFrame);
    lastFrame = now;
    if (!running || !heroVisible || !pageVisible) return;

    const frame = intro.update(now);
    const motion = reducedMotion ? 0 : 1;
    if (frame.phase === "settled") settledElapsed += delta * 0.001;

    const coreEase = easeOut(frame.core);
    const cameraProgress = easeOut(Math.max(frame.core, frame.orbit * 0.85));
    const aspectCompensation = mobile ? 1 : clamp(1.82 / Math.max(camera.aspect, 1), 1, 1.22);
    const cameraZ = MathUtils.lerp(64 * aspectCompensation, mobile ? 51 : 43 * aspectCompensation, cameraProgress);
    const legacyHeroHeight = clamp(window.innerHeight * 0.82, 720, 860);
    const centerShift = Math.max(0, (stageHeight - legacyHeroHeight) * 0.5 - 28);
    const verticalCompensation = mobile ? 0 : centerShift * 12 / Math.max(stageHeight, 1);
    const layoutStretch = mobile ? 1 : clamp(stageWidth / 1500, 1, 1.24);
    pointer.x = MathUtils.lerp(pointer.x, pointerTarget.x, 0.045);
    pointer.y = MathUtils.lerp(pointer.y, pointerTarget.y, 0.045);
    camera.position.set(pointer.x * (mobile ? 0.18 : 1.65), 0.72 + pointer.y * (mobile ? 0.12 : 0.92), cameraZ);
    cameraTarget.set(mobile ? 0 : -6.55, mobile ? -0.55 : -2.15 - verticalCompensation, 0);
    cameraLookTarget.copy(cameraTarget);
    cameraLookTarget.x += pointer.x * 0.44;
    cameraLookTarget.y += pointer.y * 0.32;
    cameraLook.lerp(cameraLookTarget, 0.055);
    camera.lookAt(cameraLook);

    farGroup.position.set(pointer.x * -0.22, pointer.y * -0.14, 0);
    foregroundGroup.position.set(pointer.x * 0.82, pointer.y * 0.5, 0);
    meteorGroup.position.set(pointer.x * 0.34, pointer.y * 0.22, 0);
    orbitGroup.scale.set(mobile ? 1 : 1.08 * layoutStretch, mobile ? 1 : 1.03 * (1 + (layoutStretch - 1) * 0.46), mobile ? 1 : 1.08);
    orbitGroup.rotation.y = motion ? Math.sin(settledElapsed * 0.14) * 0.04 + pointer.x * 0.045 : 0;
    orbitGroup.rotation.x = motion ? Math.sin(settledElapsed * 0.11) * 0.026 + pointer.y * 0.032 : 0;

    if (sparseNodeLayout && !sparsePlacementLocked) {
      camera.updateMatrixWorld();
      world.updateMatrixWorld(true);
      nodeVisuals.forEach((visual, index) => {
        const slot = sparseNodeSlots[index] ?? sparseNodeSlots[sparseNodeSlots.length - 1];
        let bestPosition = visual.orbitPosition;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let sample = 0; sample <= 180; sample += 1) {
          const orbitPosition = sample / 180;
          sparseOrbitPoint.copy(visual.curve.getPointAt(orbitPosition));
          sparseProjectedPoint.copy(sparseOrbitPoint);
          orbitGroup.localToWorld(sparseProjectedPoint);
          sparseProjectedPoint.project(camera);

          if (sparseProjectedPoint.z < -1 || sparseProjectedPoint.z > 1) continue;

          const dx = sparseProjectedPoint.x - slot.x;
          const dy = sparseProjectedPoint.y - slot.y;
          let score = dx * dx + dy * dy;

          const horizontalOverflow = Math.max(0, Math.abs(sparseProjectedPoint.x) - 0.9);
          const verticalOverflow = Math.max(0, Math.abs(sparseProjectedPoint.y) - 0.82);
          score += horizontalOverflow * horizontalOverflow * 14;
          score += verticalOverflow * verticalOverflow * 14;

          const overlapsCopy = mobile
            ? sparseProjectedPoint.x < 0.12
              && sparseProjectedPoint.y > -0.3
              && sparseProjectedPoint.y < 0.68
            : sparseProjectedPoint.x < -0.2
              && sparseProjectedPoint.y > -0.34
              && sparseProjectedPoint.y < 0.42;
          const overlapsAvatar = mobile
            ? Math.abs(sparseProjectedPoint.x) < 0.42
              && sparseProjectedPoint.y > -0.28
              && sparseProjectedPoint.y < 0.5
            : sparseProjectedPoint.x > -0.08
              && sparseProjectedPoint.x < 0.43
              && sparseProjectedPoint.y > -0.42
              && sparseProjectedPoint.y < 0.56;

          if (overlapsCopy) score += 2.6;
          if (overlapsAvatar) score += 2.4;

          if (score < bestScore) {
            bestScore = score;
            bestPosition = orbitPosition;
          }
        }

        visual.orbitPosition = bestPosition;
        visual.finalPosition.copy(visual.curve.getPointAt(visual.orbitPosition));
      });
      sparsePlacementLocked = frame.phase === "settled";
    }

    const starMaterial = farStars.material as PointsMaterial;
    starMaterial.opacity = Math.min(1, 0.94 * frame.background);
    farStars.rotation.y = settledElapsed * 0.006 * motion;
    const brightStarMaterial = brightStars.material as PointsMaterial;
    brightStarMaterial.opacity = (0.78 + Math.sin(settledElapsed * 0.42) * 0.12 * motion) * frame.background;
    brightStars.rotation.y = settledElapsed * -0.004 * motion;
    brightStars.rotation.z = settledElapsed * 0.002 * motion;
    if (foregroundDust) {
      const dustMaterial = foregroundDust.material as PointsMaterial;
      dustMaterial.opacity = 0.56 * frame.nodes;
      foregroundDust.rotation.z = settledElapsed * 0.012 * motion;
    }

    avatarGroup.scale.setScalar(Math.max(0.001, coreEase));
    avatarGroup.rotation.y = reducedMotion
      ? -avatarTargetStep * avatarFaceAngle
      : MathUtils.lerp(avatarGroup.rotation.y, -avatarTargetStep * avatarFaceAngle, 0.09);
    avatarMaterials.forEach((material) => {
      material.opacity = coreEase;
    });
    (coreRing.material as MeshPhysicalMaterial).opacity = 0.84 * coreEase;
    (coreHaloRing.material as MeshPhysicalMaterial).opacity = 0.56 * coreEase;
    (coreOrbit.material as MeshPhysicalMaterial).opacity = 0.23 * coreEase;
    (coreOrbitBack.material as MeshBasicMaterial).opacity = 0.28 * coreEase;
    (coreOrbitFront.material as MeshBasicMaterial).opacity = 0.64 * coreEase;
    (avatarShade.material as MeshBasicMaterial).opacity = 0.64 * coreEase;
    (avatarAura.material as MeshBasicMaterial).opacity = 0.46 * coreEase;
    (avatarMist.material as PointsMaterial).opacity = 0.44 * coreEase;
    avatarMist.rotation.z = settledElapsed * 0.008 * motion;
    coreRing.scale.setScalar(1 + Math.sin(settledElapsed * 1.35) * 0.025 * motion);
    coreHaloRing.rotation.z -= 0.001 * motion;
    coreOrbit.rotation.z += 0.0018 * motion;
    coreOrbitBack.rotation.z -= 0.0012 * motion;
    coreOrbitFront.rotation.z += 0.0015 * motion;
    const activeEnergy = activeNodeId ? 1.24 : 1;
    coreSignals.forEach((signal, signalIndex) => {
      const angle = signal.phase + settledElapsed * signal.speed * signal.direction * motion;
      signal.beads.forEach((bead, beadIndex) => {
        const beadAngle = angle - signal.direction * beadIndex * (mobile ? 0.09 : 0.075);
        signalPoint.set(
          Math.cos(beadAngle) * signal.radiusX,
          Math.sin(beadAngle) * signal.radiusY,
          Math.sin(beadAngle * 1.35 + signalIndex) * signal.depth,
        );
        signalPoint.applyEuler(signal.tilt);
        bead.position.copy(signalPoint);
        const tailFade = 1 - beadIndex / (signal.beads.length + 0.8);
        const shimmer = 0.82 + Math.sin(settledElapsed * 3.2 + signalIndex * 1.7 - beadIndex * 0.42) * 0.18 * motion;
        (bead.material as MeshBasicMaterial).opacity = coreEase * tailFade * shimmer * activeEnergy * (beadIndex === 0 ? 1 : 0.58);
        bead.scale.setScalar((beadIndex === 0 ? 1.18 : 1) * (1 + Math.sin(settledElapsed * 2.4 + signalIndex) * 0.08 * motion));
      });
      updateSignalTrail(signal.trail, signal.beads);
      (signal.trail.material as LineBasicMaterial).opacity = coreEase * activeEnergy * (0.26 + signalIndex * 0.035);
    });

    orbitTracks.forEach((track, index) => {
      const stagger = clamp((frame.orbit - index * 0.1) / Math.max(0.1, 1 - index * 0.1), 0, 1);
      track.mesh.geometry.setDrawRange(0, Math.floor(track.mesh.userData.maxDrawCount * easeOut(stagger)));
      (track.mesh.material as MeshBasicMaterial).opacity = Math.min(1, track.baseOpacity * 1.38) * (0.22 + stagger * 0.78);
      (track.sparks.material as PointsMaterial).opacity = Math.min(1, track.sparkOpacity * 1.34) * stagger * (0.8 + Math.sin(settledElapsed * 0.8 + index) * 0.16 * motion);
      track.glints.forEach((glint, glintIndex) => {
        const travel = (glint.userData.offset + settledElapsed * track.speed * motion) % 1;
        glint.position.copy(track.curve.getPointAt(travel));
        const pulse = 0.72 + Math.sin(settledElapsed * 3.1 + glintIndex * 2.4 + index) * 0.28 * motion;
        glint.scale.setScalar((1 + index * 0.08) * pulse);
        (glint.material as MeshBasicMaterial).opacity = stagger * (0.62 + pulse * 0.55);
      });
    });

    orbitSignals.forEach((signal, signalIndex) => {
      const headTravel = (signal.offset + settledElapsed * signal.speed * motion) % 1;
      signal.beads.forEach((bead, beadIndex) => {
        const travel = clamp(headTravel - beadIndex * (mobile ? 0.012 : 0.009), 0, 1);
        bead.position.copy(signal.curve.getPointAt(travel));
        const envelope = Math.pow(Math.sin(Math.PI * headTravel), 0.72);
        const tailFade = 1 - beadIndex / (signal.beads.length + 0.4);
        const shimmer = 0.78 + Math.sin(settledElapsed * 3.7 + signalIndex * 1.9 - beadIndex * 0.46) * 0.22 * motion;
        (bead.material as MeshBasicMaterial).opacity = frame.orbit * envelope * tailFade * shimmer * signal.strength * activeEnergy * (beadIndex === 0 ? 1 : 0.52);
        bead.scale.setScalar((beadIndex === 0 ? 1.25 : 1) * (1 + Math.sin(settledElapsed * 2.8 + signalIndex) * 0.1 * motion));
      });
      updateSignalTrail(signal.trail, signal.beads);
      (signal.trail.material as LineBasicMaterial).opacity = frame.orbit * Math.pow(Math.sin(Math.PI * headTravel), 0.72) * signal.strength * activeEnergy * 0.38;
    });

    meteors.forEach((meteor, index) => {
      const phase = (meteor.delay + settledElapsed * meteor.speed * motion) % 1;
      meteor.group.position.lerpVectors(meteor.start, meteor.end, phase);
      const envelope = motion ? Math.pow(Math.sin(Math.PI * phase), 3.4) : 0;
      const depthFactor = clamp((meteor.group.position.z + 18) / 34, 0, 1);
      const meteorOpacity = (0.08 + envelope * 0.92) * meteor.strength * frame.background;
      meteor.group.scale.setScalar(0.72 + depthFactor * 0.62);
      (meteor.tail.material as MeshBasicMaterial).opacity = meteorOpacity * 0.84;
      (meteor.glow.material as MeshBasicMaterial).opacity = meteorOpacity * 0.16;
      (meteor.head.material as MeshBasicMaterial).opacity = meteorOpacity;
      meteor.group.visible = meteorOpacity > 0.015;
      meteor.group.renderOrder = index % 2 === 0 ? 0 : 4;
    });

    nodeVisuals.forEach((visual, index) => {
      const delayed = clamp((frame.nodes - (index % 7) * 0.035) / 0.78, 0, 1);
      const nodeEase = easeOut(delayed);
      visual.points.position.lerpVectors(visual.startPosition, visual.finalPosition, nodeEase);
      visual.connections.position.copy(visual.points.position);
      visual.core.position.copy(visual.points.position);
      visual.halo.position.copy(visual.points.position);
      visual.halo.position.z -= 0.28;
      visual.halo.quaternion.copy(camera.quaternion);
      visual.satellites.forEach((satellite) => satellite.position.copy(visual.points.position).add(satellite.userData.offset));
      visual.rings.forEach((ring) => ring.position.copy(visual.points.position));
      visual.proxy.position.copy(visual.points.position);
      const selected = visual.node.id === activeNodeId;
      visual.points.getWorldPosition(tempWorld);
      const nearFactor = clamp((tempWorld.z + 13) / 28, 0, 1);
      const breathe = 1 + Math.sin(settledElapsed * 1.7 + visual.phase) * 0.035 * motion;
      visual.points.scale.setScalar((0.82 + nearFactor * 0.38) * visual.baseScale * breathe * (selected ? 1.36 : 1));
      const material = visual.points.material as PointsMaterial;
      material.opacity = Math.min(1, visual.baseOpacity * 1.16) * (0.52 + nearFactor * 0.48) * nodeEase;
      material.size = (sparseNodeLayout
        ? visual.node.type === "project" ? 0.28 : 0.24
        : visual.node.type === "category" ? 0.205 : visual.node.type === "project" ? 0.16 : 0.12)
        * (0.84 + nearFactor * 0.36) * (selected ? 1.2 : 1);
      visual.points.rotation.y = settledElapsed * (0.07 + nearFactor * 0.08) * motion + visual.phase;
      visual.connections.rotation.copy(visual.points.rotation);
      (visual.connections.material as LineBasicMaterial).opacity = nodeEase * (selected ? 0.94 : 0.72) * (0.6 + nearFactor * 0.4);
      (visual.core.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 1 : 0.94);
      visual.core.scale.setScalar((selected ? 1.55 : 1) * (0.92 + Math.sin(settledElapsed * 1.9 + visual.phase) * 0.08 * motion));
      const selectionPulse = selected ? 1 + Math.sin(settledElapsed * 3.4 + visual.phase) * 0.08 * motion : 1;
      (visual.halo.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.58 : (sparseNodeLayout ? 0.32 : 0.18) + nearFactor * 0.06);
      visual.halo.scale.setScalar((selected ? 1.44 : 1.08) * selectionPulse);
      visual.satellites.forEach((satellite, satelliteIndex) => {
        (satellite.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 1 : 0.84 + (satelliteIndex % 3) * 0.06);
        satellite.scale.setScalar(selected ? 1.3 : 1);
      });
      visual.rings.forEach((ring, ringIndex) => {
        (ring.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.78 : 0.42 - ringIndex * 0.07);
        ring.rotation.z += (ringIndex ? -0.0011 : 0.0016) * motion;
        ring.scale.setScalar(selected ? 1.22 + Math.sin(settledElapsed * 3.1 + ringIndex) * 0.1 * motion : 1);
      });
      if (visual.trackArc) {
        const lowerOrbitNode = visual.node.id === "category-projects"
          || visual.node.id === "category-tools-workflow"
          || visual.node.id === "category-life-thinking";
        const restingOpacity = (lowerOrbitNode ? 0.46 : 0.4) + nearFactor * 0.09;
        (visual.trackArc.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.6 : restingOpacity);
      }
    });

    root.style.setProperty("--intro-interface", String(frame.interface));
    root.style.setProperty("--intro-background", String(frame.background));
    document.documentElement.style.setProperty("--orbit-interface", String(frame.interface));
    updateHitTargets();
    onFrame?.(frame, settledElapsed);
    renderer.render(scene, camera);
    frameRequest = reducedMotion && frame.phase === "settled"
      ? 0
      : window.requestAnimationFrame(render);
  };

  const wake = () => {
    if (!running || !heroVisible || !pageVisible || frameRequest) return;
    lastFrame = performance.now();
    frameRequest = window.requestAnimationFrame(render);
  };

  const pause = () => {
    if (!frameRequest) return;
    window.cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  };

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    heroVisible = entry?.isIntersecting ?? true;
    if (heroVisible) wake();
    else pause();
  }, { threshold: 0.02 });
  visibilityObserver.observe(root);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  root.addEventListener("pointermove", (event) => {
    const rect = root.getBoundingClientRect();
    pointerTarget.x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    pointerTarget.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2);
  }, { passive: true });
  root.addEventListener("pointerleave", () => pointerTarget.set(0, 0));

  document.addEventListener("visibilitychange", () => {
    pageVisible = document.visibilityState !== "hidden";
    if (pageVisible) wake();
    else pause();
  });

  await textureReady;

  scene.traverse((object) => {
    if (!(object instanceof Mesh || object instanceof Points || object instanceof LineSegments)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material.name) material.name = `orbit-${object.geometry.type.toLowerCase()}`;
    });
  });

  resize();
  await renderer.compileAsync(scene, camera);
  intro.start();
  frameRequest = window.requestAnimationFrame(render);

  return {
    setActiveNode,
    flipAvatar,
    textureReady,
    replay: () => {
      settledElapsed = 0;
      intro.replay();
      wake();
    },
    skip: () => intro.skip(),
    dispose: () => {
      running = false;
      pause();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
      glowTexture.dispose();
      scene.traverse((object) => {
        if (object instanceof Mesh || object instanceof Points || object instanceof LineSegments) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    },
  };
}
