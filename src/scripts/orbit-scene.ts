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
  proxy: Mesh;
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
  visibleFraction: number;
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

function createOrbitCurve(radius: number, index: number) {
  const points: Vector3[] = [];
  const tilt = new Euler(-0.42 + index * 0.15, index % 2 === 0 ? 0.12 : -0.14, -0.14 + index * 0.06);
  const verticalScale = 0.3 + index * 0.028;
  const depthScale = 0.82 - index * 0.06;
  const centerOffsets = [
    new Vector3(0.4, -0.3, 0.2),
    new Vector3(-0.6, 0.45, -0.35),
    new Vector3(0.85, -0.1, 0.5),
    new Vector3(-0.9, 0.65, -0.6),
    new Vector3(0.5, -0.5, 0.25),
  ];
  const centerOffset = centerOffsets[index] ?? new Vector3();
  for (let step = 0; step < 128; step += 1) {
    const angle = (step / 128) * Math.PI * 2;
    const point = new Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * verticalScale + Math.cos(angle * 2.4 + index) * (0.34 + index * 0.08),
      Math.sin(angle) * radius * depthScale + Math.sin(angle * 2.7 + index) * (0.72 + index * 0.1),
    );
    point.applyEuler(tilt);
    point.add(centerOffset);
    points.push(point);
  }
  return new CatmullRomCurve3(points, true, "centripetal", 0.4);
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
  renderer.toneMappingExposure = 1.08;

  const scene = new Scene();
  scene.fog = new FogExp2(0x05070d, mobile ? 0.018 : 0.014);

  const camera = new PerspectiveCamera(39, 1, 0.1, 180);
  const cameraLook = new Vector3();
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

  scene.add(new AmbientLight(0x6f87ad, 0.42));
  const coolLight = new PointLight(0x8db8ff, 28, 70, 2);
  coolLight.position.set(-8, 9, 18);
  scene.add(coolLight);
  const warmLight = new PointLight(0xd79a5a, 9, 54, 2);
  warmLight.position.set(12, -8, 12);
  scene.add(warmLight);

  const farStars = new Points(
    createPointField(mobile ? 420 : 980, [82, 42, 28], 1947),
    new PointsMaterial({
      color: 0xc9d9f5,
      size: mobile ? 0.055 : 0.065,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true,
    }),
  );
  farStars.position.z = -27;
  farGroup.add(farStars);

  let foregroundDust: Points | null = null;
  if (!mobile) {
    foregroundDust = new Points(
      createPointField(180, [54, 26, 12], 4411),
      new PointsMaterial({
        color: 0x9cb8e6,
        size: 0.085,
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
        { radius: 7.6, color: 0x8db8ff, tube: 0.026, opacity: 0.58, sparkOpacity: 0.68, sparkSize: 0.13, speed: 0.047 },
        { radius: 12.2, color: 0x8f82d9, tube: 0.016, opacity: 0.32, sparkOpacity: 0.42, sparkSize: 0.1, speed: 0.03 },
      ]
    : [
        { radius: 6.8, color: 0xcfe4ff, tube: 0.023, opacity: 0.58, sparkOpacity: 0.76, sparkSize: 0.145, speed: 0.056 },
        { radius: 9.8, color: 0x78b5ff, tube: 0.018, opacity: 0.46, sparkOpacity: 0.6, sparkSize: 0.125, speed: 0.043 },
        { radius: 13.2, color: 0xa995ef, tube: 0.013, opacity: 0.31, sparkOpacity: 0.46, sparkSize: 0.105, speed: 0.033 },
        { radius: 17.1, color: 0xe3a55f, tube: 0.01, opacity: 0.2, sparkOpacity: 0.34, sparkSize: 0.092, speed: 0.025 },
        { radius: 21.2, color: 0x5e85b5, tube: 0.007, opacity: 0.13, sparkOpacity: 0.23, sparkSize: 0.08, speed: 0.019 },
        { radius: 8.45, color: 0xc9b8ff, tube: 0.009, opacity: 0.19, sparkOpacity: 0.28, sparkSize: 0.086, speed: 0.039 },
        { radius: 15.4, color: 0x7aa7d6, tube: 0.006, opacity: 0.12, sparkOpacity: 0.2, sparkSize: 0.076, speed: 0.022 },
        { radius: 18.9, color: 0x6fa4c9, tube: 0.005, opacity: 0.09, sparkOpacity: 0.16, sparkSize: 0.07, speed: 0.017 },
        { radius: 24.3, color: 0xc69d67, tube: 0.004, opacity: 0.065, sparkOpacity: 0.12, sparkSize: 0.064, speed: 0.014 },
      ];
  const orbitCount = orbitSpecs.length;
  const orbitCurves = orbitSpecs.map((spec, index) => createOrbitCurve(spec.radius, index));
  const orbitTracks: OrbitTrackVisual[] = orbitCurves.map((curve, index) => {
    const spec = orbitSpecs[index];
    const geometry = new TubeGeometry(curve, mobile ? 220 : 420, spec.tube, 7, true);
    geometry.setDrawRange(0, 0);
    const positionAttribute = geometry.attributes.position;
    const trackColors = new Float32Array(positionAttribute.count * 3);
    const trackColor = new Color(spec.color);
    for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += 1) {
      const depth = clamp((positionAttribute.getZ(vertexIndex) + spec.radius * 0.72) / (spec.radius * 1.44), 0, 1);
      const brightness = 0.12 + Math.pow(depth, 1.9) * 0.98;
      trackColors[vertexIndex * 3] = trackColor.r * brightness;
      trackColors[vertexIndex * 3 + 1] = trackColor.g * brightness;
      trackColors[vertexIndex * 3 + 2] = trackColor.b * brightness;
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
    mesh.renderOrder = index < 2 ? 3 : 1;
    orbitGroup.add(mesh);

    const visibleFraction = mobile ? 0.72 : [0.68, 0.78, 0.58, 0.62, 0.45, 0.54, 0.42, 0.36, 0.31][index] ?? 0.48;
    const sparkCount = mobile ? 96 : 150 + index * 20;
    const sparkPositions = new Float32Array(sparkCount * 3);
    for (let pointIndex = 0; pointIndex < sparkCount; pointIndex += 1) {
      const point = curve.getPointAt(pointIndex / sparkCount);
      sparkPositions[pointIndex * 3] = point.x;
      sparkPositions[pointIndex * 3 + 1] = point.y;
      sparkPositions[pointIndex * 3 + 2] = point.z;
    }
    const sparkGeometry = new BufferGeometry();
    sparkGeometry.setAttribute("position", new BufferAttribute(sparkPositions, 3));
    sparkGeometry.setDrawRange(0, Math.floor(sparkCount * visibleFraction));
    const sparks = new Points(
      sparkGeometry,
      new PointsMaterial({
        color: spec.color,
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
      visibleFraction,
    };
  });

  const meteorGroup = new Group();
  scene.add(meteorGroup);
  const meteorCount = mobile ? 2 : 4;
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
      strength: 0.42 + meteorRandom() * 0.28,
    };
  });

  const coreRing = new Mesh(
    new TorusGeometry(mobile ? 3.35 : 4.46, 0.052, 10, 180),
    new MeshPhysicalMaterial({
      color: 0xc8ddff,
      emissive: 0x8db8ff,
      emissiveIntensity: 1.25,
      roughness: 0.25,
      metalness: 0.3,
      transparent: true,
      opacity: 0,
      depthWrite: true,
    }),
  );
  coreRing.rotation.x = 0.08;
  coreRing.position.z = 0.16;
  coreRing.geometry.setDrawRange(0, Math.floor((coreRing.geometry.index?.count ?? 0) * 0.62));
  avatarGroup.add(coreRing);

  const coreHaloRing = new Mesh(
    new TorusGeometry(mobile ? 3.62 : 4.88, 0.026, 8, 190),
    new MeshPhysicalMaterial({
      color: 0xf0e9ff,
      emissive: 0xb7a6ff,
      emissiveIntensity: 1.05,
      roughness: 0.24,
      metalness: 0.18,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  coreHaloRing.rotation.set(0.18, -0.12, 0.34);
  coreHaloRing.position.z = 0.28;
  coreHaloRing.geometry.setDrawRange(0, Math.floor((coreHaloRing.geometry.index?.count ?? 0) * 0.58));
  avatarGroup.add(coreHaloRing);

  const coreOrbit = new Mesh(
    new TorusGeometry(mobile ? 4.1 : 5.46, 0.018, 8, 160),
    new MeshPhysicalMaterial({
      color: 0xd79a5a,
      emissive: 0xd79a5a,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  coreOrbit.rotation.set(1.05, 0.2, -0.35);
  coreOrbit.position.z = -0.45;
  coreOrbit.geometry.setDrawRange(0, Math.floor((coreOrbit.geometry.index?.count ?? 0) * 0.44));
  avatarGroup.add(coreOrbit);

  const coreOrbitBack = new Mesh(
    new TorusGeometry(mobile ? 4.3 : 5.92, 0.012, 8, 180),
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
  coreOrbitBack.geometry.setDrawRange(0, Math.floor((coreOrbitBack.geometry.index?.count ?? 0) * 0.54));
  avatarGroup.add(coreOrbitBack);

  const coreOrbitFront = new Mesh(
    new TorusGeometry(mobile ? 3.75 : 5.02, 0.014, 8, 180),
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
  coreOrbitFront.geometry.setDrawRange(0, Math.floor((coreOrbitFront.geometry.index?.count ?? 0) * 0.36));
  avatarGroup.add(coreOrbitFront);

  const avatarShade = new Mesh(
    new PlaneGeometry(mobile ? 9.2 : 13.4, mobile ? 7.2 : 10.1),
    new MeshBasicMaterial({ color: 0x050914, map: glowTexture, transparent: true, opacity: 0, depthWrite: false, fog: true }),
  );
  avatarShade.position.z = -2.6;
  avatarGroup.add(avatarShade);

  const avatarAura = new Mesh(
    new PlaneGeometry(mobile ? 7.6 : 11.4, mobile ? 7.6 : 11.4),
    new MeshBasicMaterial({ color: 0x778bd4, map: glowTexture, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
  );
  avatarAura.position.z = -0.82;
  avatarGroup.add(avatarAura);

  const avatarMistRandom = createRandom(91873);
  const avatarMistPositions = new Float32Array((mobile ? 48 : 86) * 3);
  for (let index = 0; index < avatarMistPositions.length / 3; index += 1) {
    const angle = avatarMistRandom() * Math.PI * 2;
    const radius = (mobile ? 3.1 : 3.9) + avatarMistRandom() * (mobile ? 1.8 : 3.1);
    avatarMistPositions[index * 3] = Math.cos(angle) * radius;
    avatarMistPositions[index * 3 + 1] = Math.sin(angle) * radius * 0.58;
    avatarMistPositions[index * 3 + 2] = -1.2 - avatarMistRandom() * 2.6;
  }
  const avatarMistGeometry = new BufferGeometry();
  avatarMistGeometry.setAttribute("position", new BufferAttribute(avatarMistPositions, 3));
  const avatarMist = new Points(
    avatarMistGeometry,
    new PointsMaterial({ color: 0x8795e8, size: mobile ? 0.08 : 0.11, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
  );
  avatarGroup.add(avatarMist);

  const frontMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: true,
  });
  const backMaterial = frontMaterial.clone();
  const avatarSize = mobile ? 5.8 : 8.65;
  const avatarFront = new Mesh(new PlaneGeometry(avatarSize, avatarSize), frontMaterial);
  const avatarBack = new Mesh(new PlaneGeometry(avatarSize, avatarSize), backMaterial);
  avatarBack.rotation.y = Math.PI;
  avatarBack.position.z = -0.04;
  avatarGroup.add(avatarFront, avatarBack);

  const textureReady = Promise.all([
    circularTexture("/images/home/orbit-portrait.png"),
    circularTexture("/images/home/profile-front.jpg"),
  ]).then(([front, back]) => {
    frontMaterial.map = front;
    backMaterial.map = back;
    frontMaterial.needsUpdate = true;
    backMaterial.needsUpdate = true;
  }).catch(() => {
    frontMaterial.color.set(0x16243a);
    backMaterial.color.set(0x16243a);
  });

  const nodeVisuals: NodeVisual[] = [];
  const proxyGeometry = new SphereGeometry(0.32, 12, 8);
  const hotspotTargets = new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-orbit-node-hotspot]"))
      .map((element) => [element.dataset.orbitNodeHotspot ?? "", element]),
  );
  const nodeCompositionAnchors: Record<string, [number, number, number]> = {
    "category-web-development": [-9.5, 6.9, -1.2],
    "category-frontend": [9.2, 7, -2.2],
    "category-deep-dives": [15.4, 0.4, -0.4],
    "category-design-ux": [9.5, -6, 1.2],
    "category-tools-workflow": [-15.5, -8.2, 0.6],
    "category-life-thinking": [-3.5, -10, 2],
    "category-projects": [-19, -9, 1],
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
  visibleNodes.forEach((node, index) => {
    const curve = orbitCurves[node.orbit % orbitCount];
    const finalPosition = curve.getPointAt((node.angleSeed + index * 0.071) % 1);
    finalPosition.z += ((index % 5) - 2) * 0.85;
    const compositionAnchor = nodeCompositionAnchors[node.id];
    if (!mobile && compositionAnchor) finalPosition.set(...compositionAnchor);
    const direction = index % 2 === 0 ? 1 : -1;
    const startPosition = new Vector3(
      finalPosition.x * 0.18 + Math.sin(index) * 1.2,
      finalPosition.y * 0.15 + Math.cos(index * 1.7) * 0.9,
      finalPosition.z + direction * (16 + (index % 4) * 3.5),
    );

    const count = node.type === "category" ? (mobile ? 26 : 56) : node.type === "project" ? 54 : node.type === "post" ? 30 : 22;
    const random = createRandom(3203 + index * 97);
    const positions = new Float32Array(count * 3);
    const clusterRadius = 0.5 + node.size * 0.46;
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
    const baseOpacity = node.type === "post" ? 0.68 : 0.9;
    const points = new Points(
      geometry,
      new PointsMaterial({
        color,
        size: node.type === "category" ? 0.19 : node.type === "project" ? 0.155 : 0.12,
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
      new SphereGeometry(node.type === "category" ? 0.205 : 0.1, 12, 8),
      new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    );
    core.position.copy(startPosition);
    orbitGroup.add(core);

    const halo = new Mesh(
      new PlaneGeometry(clusterRadius * 3.2, clusterRadius * 3.2),
      new MeshBasicMaterial({ color, map: glowTexture, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
    );
    halo.position.copy(startPosition);
    halo.position.z -= 0.28;
    orbitGroup.add(halo);

    const satellites = node.type === "category" ? Array.from({ length: 8 }, (_, satelliteIndex) => {
      const positionIndex = 1 + satelliteIndex;
      const offset = new Vector3(
        positions[positionIndex * 3],
        positions[positionIndex * 3 + 1],
        positions[positionIndex * 3 + 2],
      );
      const satellite = new Mesh(
        new SphereGeometry(0.072 + (satelliteIndex % 3) * 0.019, 9, 6),
        new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: true }),
      );
      satellite.userData.offset = offset;
      satellite.position.copy(startPosition).add(offset);
      orbitGroup.add(satellite);
      return satellite;
    }) : [];

    const ringCount = node.type === "category" ? [0, 1, 0, 1, 0, 2, 1][pattern] : 0;
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
      proxy,
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
  let avatarFlipTarget = 0;
  let stageWidth = 1;
  let stageHeight = 1;
  const tempWorld = new Vector3();
  const tempScreen = new Vector3();

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    stageWidth = width;
    stageHeight = height;
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
      projectElement(tempWorld, target, mobile ? 44 : clamp(38 + visual.node.size * 18, 42, 68));
    }
  };

  const setActiveNode = (nodeId: string | null) => {
    activeNodeId = nodeId ?? "";
  };

  const flipAvatar = (flipped?: boolean) => {
    avatarFlipTarget = (flipped ?? avatarFlipTarget < Math.PI / 2) ? Math.PI : 0;
  };

  const render = (now: number) => {
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
    const verticalCompensation = mobile ? 0 : centerShift * 30 / Math.max(stageHeight, 1);
    const layoutStretch = mobile ? 1 : clamp(stageWidth / 1500, 1, 1.24);
    pointer.x = MathUtils.lerp(pointer.x, pointerTarget.x, 0.045);
    pointer.y = MathUtils.lerp(pointer.y, pointerTarget.y, 0.045);
    camera.position.set(pointer.x * (mobile ? 0.18 : 1.65), 0.72 + pointer.y * (mobile ? 0.12 : 0.92), cameraZ);
    cameraTarget.set(mobile ? 0 : -6.55, mobile ? -0.55 : -2.15 - verticalCompensation, 0);
    cameraLook.lerp(cameraTarget.clone().add(new Vector3(pointer.x * 0.44, pointer.y * 0.32, 0)), 0.055);
    camera.lookAt(cameraLook);

    farGroup.position.set(pointer.x * -0.22, pointer.y * -0.14, 0);
    foregroundGroup.position.set(pointer.x * 0.82, pointer.y * 0.5, 0);
    meteorGroup.position.set(pointer.x * 0.34, pointer.y * 0.22, 0);
    orbitGroup.scale.set(mobile ? 1 : 1.08 * layoutStretch, mobile ? 1 : 1.03 * (1 + (layoutStretch - 1) * 0.46), mobile ? 1 : 1.08);
    orbitGroup.rotation.y = motion ? Math.sin(settledElapsed * 0.14) * 0.04 + pointer.x * 0.045 : 0;
    orbitGroup.rotation.x = motion ? Math.sin(settledElapsed * 0.11) * 0.026 + pointer.y * 0.032 : 0;

    const starMaterial = farStars.material as PointsMaterial;
    starMaterial.opacity = 0.7 * frame.background;
    farStars.rotation.y = settledElapsed * 0.006 * motion;
    if (foregroundDust) {
      const dustMaterial = foregroundDust.material as PointsMaterial;
      dustMaterial.opacity = 0.24 * frame.nodes;
      foregroundDust.rotation.z = settledElapsed * 0.012 * motion;
    }

    avatarGroup.scale.setScalar(Math.max(0.001, coreEase));
    avatarGroup.rotation.y = MathUtils.lerp(avatarGroup.rotation.y, avatarFlipTarget, 0.09);
    frontMaterial.opacity = coreEase;
    backMaterial.opacity = coreEase;
    (coreRing.material as MeshPhysicalMaterial).opacity = 0.52 * coreEase;
    (coreHaloRing.material as MeshPhysicalMaterial).opacity = 0.38 * coreEase;
    (coreOrbit.material as MeshPhysicalMaterial).opacity = 0.17 * coreEase;
    (coreOrbitBack.material as MeshBasicMaterial).opacity = 0.18 * coreEase;
    (coreOrbitFront.material as MeshBasicMaterial).opacity = 0.38 * coreEase;
    (avatarShade.material as MeshBasicMaterial).opacity = 0.64 * coreEase;
    (avatarAura.material as MeshBasicMaterial).opacity = 0.17 * coreEase;
    (avatarMist.material as PointsMaterial).opacity = 0.21 * coreEase;
    avatarMist.rotation.z = settledElapsed * 0.008 * motion;
    coreRing.scale.setScalar(1 + Math.sin(settledElapsed * 1.35) * 0.025 * motion);
    coreHaloRing.rotation.z -= 0.001 * motion;
    coreOrbit.rotation.z += 0.0018 * motion;
    coreOrbitBack.rotation.z -= 0.0012 * motion;
    coreOrbitFront.rotation.z += 0.0015 * motion;

    orbitTracks.forEach((track, index) => {
      const stagger = clamp((frame.orbit - index * 0.1) / Math.max(0.1, 1 - index * 0.1), 0, 1);
      track.mesh.geometry.setDrawRange(0, Math.floor(track.mesh.userData.maxDrawCount * easeOut(stagger) * track.visibleFraction));
      (track.mesh.material as MeshBasicMaterial).opacity = track.baseOpacity * (0.2 + stagger * 0.8);
      (track.sparks.material as PointsMaterial).opacity = track.sparkOpacity * stagger * (0.78 + Math.sin(settledElapsed * 0.8 + index) * 0.14 * motion);
      track.glints.forEach((glint, glintIndex) => {
        const travel = (glint.userData.offset * track.visibleFraction + settledElapsed * track.speed * motion) % track.visibleFraction;
        glint.position.copy(track.curve.getPointAt(travel));
        const pulse = 0.72 + Math.sin(settledElapsed * 3.1 + glintIndex * 2.4 + index) * 0.28 * motion;
        glint.scale.setScalar((1 + index * 0.08) * pulse);
        (glint.material as MeshBasicMaterial).opacity = stagger * (0.42 + pulse * 0.46);
      });
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
      material.opacity = visual.baseOpacity * (0.48 + nearFactor * 0.52) * nodeEase;
      material.size = (visual.node.type === "category" ? 0.205 : visual.node.type === "project" ? 0.16 : 0.12) * (0.84 + nearFactor * 0.36) * (selected ? 1.2 : 1);
      visual.points.rotation.y = settledElapsed * (0.07 + nearFactor * 0.08) * motion + visual.phase;
      visual.connections.rotation.copy(visual.points.rotation);
      (visual.connections.material as LineBasicMaterial).opacity = nodeEase * (selected ? 0.76 : 0.5) * (0.58 + nearFactor * 0.42);
      (visual.core.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 1 : 0.94);
      visual.core.scale.setScalar((selected ? 1.55 : 1) * (0.92 + Math.sin(settledElapsed * 1.9 + visual.phase) * 0.08 * motion));
      (visual.halo.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.24 : 0.11 + nearFactor * 0.05);
      visual.halo.scale.setScalar(selected ? 1.2 : 1);
      visual.satellites.forEach((satellite, satelliteIndex) => {
        (satellite.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.98 : 0.78 + (satelliteIndex % 3) * 0.07);
        satellite.scale.setScalar(selected ? 1.3 : 1);
      });
      visual.rings.forEach((ring, ringIndex) => {
        (ring.material as MeshBasicMaterial).opacity = nodeEase * (selected ? 0.58 : 0.24 - ringIndex * 0.06);
        ring.rotation.z += (ringIndex ? -0.0011 : 0.0016) * motion;
        ring.scale.setScalar(selected ? 1.2 : 1);
      });
    });

    root.style.setProperty("--intro-interface", String(frame.interface));
    root.style.setProperty("--intro-background", String(frame.background));
    document.documentElement.style.setProperty("--orbit-interface", String(frame.interface));
    updateHitTargets();
    onFrame?.(frame, settledElapsed);
    renderer.render(scene, camera);
    frameRequest = window.requestAnimationFrame(render);
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
