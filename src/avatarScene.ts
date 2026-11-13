import * as T from 'three';
import { avatarEquipment, hairColors, skinTones, type AvatarConfig } from './avatars';

// A shared, on-demand renderer produces stills. No permanent canvas or animation loop per avatar.
let renderer: T.WebGLRenderer | undefined;
let unavailable = false;
const images = new Map<string, string>();
const ballGeometry = new T.SphereGeometry(1, 32, 20);
type XYZ = [number, number, number];

export function createAvatarModel(config: AvatarConfig) {
  const root = new T.Group();
  const materials = new Map<string, T.MeshStandardMaterial>();
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .76, metalness: 0 }));
    return materials.get(color)!;
  };
  const skin = skinTones.find(item => item.id === config.skin)!.color;
  const hair = hairColors.find(item => item.id === config.hairColor)!.color;
  const shirt = avatarEquipment.shirt.find(item => item.id === config.shirt)!.color;
  const mesh = (geometry: T.BufferGeometry, color: string, position: XYZ, scale: XYZ = [1, 1, 1], parent: T.Object3D = root) => {
    const item = new T.Mesh(geometry, material(color)); item.position.set(...position); item.scale.set(...scale);
    item.castShadow = true; item.receiveShadow = true; parent.add(item); return item;
  };
  const ball = (color: string, position: XYZ, scale: XYZ, parent: T.Object3D = root) => mesh(ballGeometry, color, position, scale, parent);
  const limb = (color: string, from: XYZ, to: XYZ, radius: number) => {
    const a = new T.Vector3(...from), b = new T.Vector3(...to), delta = b.clone().sub(a);
    const item = mesh(new T.CapsuleGeometry(radius, Math.max(.01, delta.length() - radius * 2), 6, 18), color, a.add(b).multiplyScalar(.5).toArray() as XYZ);
    item.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); return item;
  };
  const tube = (color: string, points: XYZ[], radius: number, parent: T.Object3D = root) => mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point))), 24, radius, 8, false), color, [0, 0, 0], [1, 1, 1], parent);
  // Chunky white trainers, little socks and a soft sporting silhouette.
  for (const side of [-1, 1]) {
    ball('#F8FAFF', [side * .23, .15, .095], [.235, .15, .35]);
    ball('#E2E8F3', [side * .23, .07, .10], [.24, .055, .35]);
    limb('#F8FAFF', [side * .23, .21, .015], [side * .23, .40, .015], .142);
    limb(skin, [side * .23, .37, 0], [side * .23, .92, 0], .157);
    limb('#DFE6FA', [side * .427, .75, .238], [side * .427, 1.09, .238], .014);
  }
  const shorts = new T.Shape();
  shorts.moveTo(-.43, 1.13); shorts.lineTo(.43, 1.13); shorts.quadraticCurveTo(.46, 1.13, .46, 1.08);
  shorts.lineTo(.46, .74); shorts.quadraticCurveTo(.46, .7, .41, .7); shorts.lineTo(.105, .7);
  shorts.lineTo(.08, .84); shorts.quadraticCurveTo(0, .88, -.08, .84); shorts.lineTo(-.105, .7);
  shorts.lineTo(-.41, .7); shorts.quadraticCurveTo(-.46, .7, -.46, .74); shorts.lineTo(-.46, 1.08); shorts.closePath();
  mesh(new T.ExtrudeGeometry(shorts, { depth: .40, bevelEnabled: true, bevelThickness: .035, bevelSize: .025, bevelSegments: 3, steps: 1, curveSegments: 8 }), '#273961', [0, 0, -.22]);
  ball(shirt, [0, 1.45, -.015], [.48, .64, .31]);
  ball(skin, [0, 2.01, 0], [.16, .23, .16]);
  // Arms bend outward, with rounded hands resting at the hips.
  for (const side of [-1, 1]) {
    limb(skin, [side * .37, 1.88, .01], [side * .67, 1.49, .06], .148);
    limb(skin, [side * .67, 1.49, .06], [side * .43, 1.27, .27], .125);
    ball(skin, [side * .42, 1.27, .28], [.14, .16, .12]);
    if (config.extra !== 'none') {
      const color = avatarEquipment.extra.find(item => item.id === config.extra)!.color;
      limb(color, [side * .55, 1.38, .20], [side * .46, 1.29, .27], .143);
    }
  }
  // Face remains a single soft toy head, with restrained sculpted details.
  const head = new T.Group(); root.add(head);
  ball(skin, [0, 2.70, 0], [.665, .68, .565], head);
  for (const side of [-1, 1]) {
    ball(skin, [side * .659, 2.62, .005], [.135, .18, .125], head);
    ball('#362B32', [side * .215, 2.76, .535], [.049, .078, .034], head);
    ball('#FFFFFF', [side * .225 - .009, 2.786, .566], [.009, .013, .006], head);
    const brow = ball(hair, [side * .22, 2.96, .49], [.09, .024, .025], head); brow.rotation.z = side * -.15;
  }
  ball(skin, [0, 2.59, .565], [.075, .058, .062], head);
  tube('#754D40', [[-.103, 2.49, .548], [-.055, 2.455, .578], [.02, 2.454, .584], [.10, 2.495, .55]], .018, head);

  const cap = (size = 1, cutoff = .34) => mesh(new T.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * cutoff), hair, [0, 2.71, -.012], [.682 * size, .696 * size, .585 * size], head);
  const puff = (p: XYZ, s: XYZ, angle = 0) => { const item = ball(hair, p, s, head); item.rotation.z = angle; return item; };
  switch (config.hair) {
    case 'bald': break;
    case 'buzz': cap(1.005, .36); break;
    case 'short':
      cap(); [-.44, -.23, 0, .24, .44].forEach((x, i) => puff([x, 3.16 + (i % 2) * .035, .28], [.22, .19, .22])); break;
    case 'wavy':
      cap(); [-.49, -.27, -.02, .25, .46].forEach((x, i) => puff([x, 3.17 + Math.sin(i * 1.1) * .12, .24], [.26, .23, .25], -.15));
      puff([-.52, 2.96, .10], [.16, .24, .19]); break;
    case 'quiff':
      cap(); puff([-.23, 3.22, .27], [.36, .24, .29], -.4); puff([.15, 3.31, .17], [.35, .28, .31], -.3); puff([.44, 3.18, .10], [.22, .23, .24]); break;
    case 'side-part':
      cap(); puff([-.16, 3.15, .34], [.49, .17, .23], -.23); puff([.39, 3.14, .23], [.2, .19, .24], .25); break;
    case 'curly': case 'afro': {
      const afro = config.hair === 'afro'; cap(afro ? 1.12 : 1.02);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) {
        const angle = i / 9 * Math.PI * 2 + row * .3, radius = [afro ? .6 : .51, .37, .08][row];
        puff([Math.cos(angle) * radius, [3.06, 3.30, 3.40][row] + (afro ? .08 : 0), Math.sin(angle) * radius * .8], [afro ? .23 : .17, afro ? .24 : .18, afro ? .23 : .18]);
      } break;
    }
    case 'long': case 'bob': {
      const long = config.hair === 'long';
      // The rear hair goes behind the face; the face naturally occludes its front.
      const rear = puff([0, long ? 2.47 : 2.65, -.30], [.72, long ? .91 : .73, .4]); rear.renderOrder = -1;
      cap(1.015); for (const side of [-1, 1]) puff([side * .62, long ? 2.56 : 2.76, -.03], [.155, long ? .67 : .43, .25]);
      puff([-.20, 3.13, .36], [.39, .16, .2], -.12); break;
    }
    case 'bun':
      cap(); puff([0, 3.39, -.22], [.285, .26, .27]); puff([-.34, 3.12, .24], [.3, .14, .22], -.3); break;
    case 'ponytail':
      cap(); puff([.2, 3.14, -.50], [.24, .27, .23]); puff([.25, 2.88, -.67], [.22, .4, .22], -.18); puff([-.15, 3.13, .33], [.42, .14, .2], -.2); break;
  }
  if (config.head === 'headband' || config.head === 'visor') {
    const color = config.head === 'headband' ? '#FF947D' : '#80DDBB';
    const band = mesh(new T.TorusGeometry(.63, config.head === 'visor' ? .065 : .055, 10, 56), color, [0, 3.06, 0], [1, .92, 1], head); band.rotation.x = Math.PI / 2;
    if (config.head === 'headband') band.scale.z = 2;
    if (config.head === 'visor') ball(color, [0, 3.025, .49], [.62, .063, .34], head);
  } else if (config.head === 'cap') {
    mesh(new T.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * .47), '#6085F5', [0, 3.02, -.045], [config.hair === 'afro' ? .84 : .73, .66, .67], head);
    ball('#6085F5', [0, 3.05, .47], [.65, .065, .39], head);
    ball('#6085F5', [0, 3.67, -.045], [.06, .04, .06], head);
  } else if (config.head === 'headphones') {
    tube('#F6C65F', [[-.75, 2.67, 0], [-.73, 3.14, 0], [-.4, 3.46, -.01], [0, 3.53, -.01], [.4, 3.46, -.01], [.73, 3.14, 0], [.75, 2.67, 0]], .065, head);
    for (const side of [-1, 1]) { ball('#E3AD42', [side * .746, 2.72, 0], [.14, .25, .20], head); ball('#FFD77D', [side * .82, 2.72, .008], [.07, .22, .18], head); }
  }
  return root;
}

export function renderAvatar(config: AvatarConfig, portrait = false, angle = -.12) {
  const key = JSON.stringify([config, portrait, angle]);
  if (images.has(key)) return images.get(key)!;
  if (unavailable) return '';
  try { renderer ??= new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' }); } catch { unavailable = true; return ''; }
  renderer.setPixelRatio(1); renderer.setSize(portrait ? 220 : 480, portrait ? 220 : 560, false);
  renderer.setClearColor(0, 0); renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  scene.add(new T.HemisphereLight('#FFFFFF', '#B5BCE0', 1.35));
  const keyLight = new T.DirectionalLight('#FFF3E7', 2.8); keyLight.position.set(-3, 5, 5); keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(512, 512); keyLight.shadow.camera.left = -3; keyLight.shadow.camera.right = 3; keyLight.shadow.camera.top = 5; keyLight.shadow.camera.bottom = -1; keyLight.shadow.normalBias = .025; keyLight.shadow.bias = -.0002; keyLight.shadow.radius = 4; scene.add(keyLight);
  const fill = new T.DirectionalLight('#D6E3FF', .8); fill.position.set(3, 2, -2); scene.add(fill);
  const model = createAvatarModel(config); model.rotation.y = angle; scene.add(model);
  const floor = new T.Mesh(new T.PlaneGeometry(200, 200), new T.ShadowMaterial({ opacity: .1 })); floor.rotation.x = -Math.PI / 2; floor.position.y = .005; floor.receiveShadow = true; scene.add(floor);
  const aspect = portrait ? 1 : 480 / 560;
  const height = portrait ? 1.95 : 4.13;
  const target = portrait ? 2.75 : 1.78;
  const camera = new T.OrthographicCamera(-height * aspect / 2, height * aspect / 2, height / 2, -height / 2, .1, 50);
  camera.position.set(0, target + .25, 8); camera.lookAt(0, target, 0); renderer.render(scene, camera);
  const image = renderer.domElement.toDataURL('image/png');
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
  scene.traverse(node => { if (node instanceof T.Mesh) { if (node.geometry !== ballGeometry) geometries.add(node.geometry); (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => materials.add(m)); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); keyLight.shadow.map?.dispose();
  images.set(key, image); if (images.size > 100) images.delete(images.keys().next().value!);
  return image;
}
