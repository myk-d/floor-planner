import { OrbitControls } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { furnitureHeight, wallHeightAt } from '../../../domain/elevation';
import { hiddenInPhase } from '../../../domain/reconfig';
import { sceneBBox } from '../../../domain/geometry';
import type { Opening, Scene, Wall } from '../../../domain/scene';
import { floorHatch, floorTint, wallHatch, WALL_MATERIAL_COLOR } from '../render/hatch';
import { Canvas3DBoundary } from './Canvas3DBoundary';

const S = 0.01; // см → м

type ViewPreset = 'iso' | 'top' | 'front' | 'side';

function canvasTexture(cvs: HTMLCanvasElement | null, repeat: number): THREE.Texture | null {
	if (!cvs) return null;
	const t = new THREE.CanvasTexture(cvs);
	t.wrapS = t.wrapT = THREE.RepeatWrapping;
	t.repeat.set(repeat, repeat);
	t.colorSpace = THREE.SRGBColorSpace;
	return t;
}

function FloorPlane({ points, color, tex }: { points: { x: number; y: number }[]; color: string; tex: THREE.Texture | null }) {
	const geom = useMemo(() => {
		const shape = new THREE.Shape();
		points.forEach((p, i) => (i === 0 ? shape.moveTo(p.x * S, p.y * S) : shape.lineTo(p.x * S, p.y * S)));
		shape.closePath();
		const g = new THREE.ShapeGeometry(shape);
		g.rotateX(Math.PI / 2);
		return g;
	}, [points]);
	return (
		<mesh geometry={geom} position={[0, 0, 0]} receiveShadow>
			<meshStandardMaterial color={color} map={tex ?? undefined} roughness={0.85} side={THREE.DoubleSide} />
		</mesh>
	);
}

/** Стіна з отворами: розбивається на до 4 боксів. */
function WallMesh({ wall, openings, height }: { wall: Wall; openings: Opening[]; height: number }) {
	const len = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
	const angle = Math.atan2(wall.b.y - wall.a.y, wall.b.x - wall.a.x);
	const mid = { x: (wall.a.x + wall.b.x) / 2, y: (wall.a.y + wall.b.y) / 2 };
	const t = wall.thickness;
	const color = WALL_MATERIAL_COLOR[wall.material];
	const tex = useMemo(() => canvasTexture(wallHatch(wall.material, color, 'rgba(0,0,0,0.28)'), 3), [wall.material, color]);

	// сегменти вздовж стіни (у локальних координатах, центр 0)
	const segs: { x0: number; x1: number; y0: number; y1: number }[] = [];
	const sorted = [...openings].sort((a, b) => a.offset - b.offset);
	let cursor = 0;
	for (const o of sorted) {
		const ox0 = Math.max(0, o.offset - o.width / 2);
		const ox1 = Math.min(len, o.offset + o.width / 2);
		if (ox0 > cursor) segs.push({ x0: cursor, x1: ox0, y0: 0, y1: height });
		const sill = o.type === 'opening' ? 0 : (o.sill ?? (o.type === 'window' ? 90 : 0));
		const head = o.type === 'opening' ? height : (o.head ?? (o.type === 'window' ? 230 : 210));
		if (sill > 0) segs.push({ x0: ox0, x1: ox1, y0: 0, y1: sill });
		if (head < height) segs.push({ x0: ox0, x1: ox1, y0: head, y1: height });
		cursor = Math.max(cursor, ox1);
	}
	if (cursor < len) segs.push({ x0: cursor, x1: len, y0: 0, y1: height });
	if (segs.length === 0) segs.push({ x0: 0, x1: len, y0: 0, y1: height });

	return (
		<group position={[mid.x * S, 0, mid.y * S]} rotation={[0, -angle, 0]}>
			{segs.map((s2, i) => {
				const w = (s2.x1 - s2.x0) * S;
				const h = (s2.y1 - s2.y0) * S;
				if (w <= 0 || h <= 0) return null;
				return (
					<mesh key={i} position={[(s2.x0 + s2.x1) / 2 * S - (len * S) / 2, (s2.y0 + s2.y1) / 2 * S, 0]} castShadow receiveShadow>
						<boxGeometry args={[w, h, t * S]} />
						<meshStandardMaterial color={color} map={tex ?? undefined} roughness={0.9} />
					</mesh>
				);
			})}
		</group>
	);
}

function FurnitureMesh({ f }: { f: Scene['furniture'][number] }) {
	const h = furnitureHeight(f.kind, f.h);
	return (
		<mesh position={[f.x * S, (h * S) / 2, f.y * S]} rotation={[0, (-f.rotation * Math.PI) / 180, 0]} castShadow receiveShadow>
			<boxGeometry args={[f.w * S, h * S, f.d * S]} />
			<meshStandardMaterial color={f.color || '#b9c2cc'} roughness={0.7} />
		</mesh>
	);
}

function webglSupported(): boolean {
	try {
		const c = document.createElement('canvas');
		return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
	} catch {
		return false;
	}
}

export default function Scene3D({ scene }: { scene: Scene }) {
	if (!webglSupported()) {
		return (
			<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
				3D недоступний — браузер без апаратного прискорення (WebGL). Спробуйте інший браузер.
			</div>
		);
	}
	return (
		<Canvas3DBoundary>
			<Scene3DInner scene={scene} />
		</Canvas3DBoundary>
	);
}

/** Розміщує камеру за пресетом; спрацьовує щоразу, коли змінюється `preset`/`nonce`. */
function CameraRig({
	preset,
	nonce,
	center,
	span,
	controls,
}: {
	preset: ViewPreset;
	nonce: number;
	center: [number, number];
	span: number;
	controls: React.RefObject<OrbitControlsImpl | null>;
}) {
	const camera = useThree((s) => s.camera);
	const [cx, cz] = center;
	useEffect(() => {
		const d = span;
		const pos: Record<ViewPreset, [number, number, number]> = {
			iso: [cx + d, d * 0.95, cz + d],
			top: [cx, d * 2.4, cz + 0.001],
			front: [cx, d * 0.45, cz + d * 1.9],
			side: [cx + d * 1.9, d * 0.45, cz],
		};
		camera.position.set(...pos[preset]);
		camera.up.set(0, 1, 0);
		camera.lookAt(cx, 0, cz);
		const c = controls.current;
		if (c) {
			c.target.set(cx, 0, cz);
			c.update();
		}
	}, [preset, nonce, cx, cz, span, camera, controls]);
	return null;
}

function Scene3DInner({ scene }: { scene: Scene }) {
	const bbox = sceneBBox(scene);
	const cx = ((bbox.minX + bbox.maxX) / 2 || 0) * S;
	const cz = ((bbox.minY + bbox.maxY) / 2 || 0) * S;
	const span = Math.max(bbox.maxX - bbox.minX, bbox.maxY - bbox.minY, 300) * S;
	const phase = scene.settings.planPhase ?? 'both';

	const controls = useRef<OrbitControlsImpl | null>(null);
	const [view, setView] = useState<{ preset: ViewPreset; nonce: number }>({ preset: 'iso', nonce: 0 });
	const go = (preset: ViewPreset) => setView((v) => ({ preset, nonce: v.nonce + 1 }));

	const btn = 'rounded-md bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-black/10 hover:bg-white';

	return (
		<div className="relative h-full w-full">
			<Canvas shadows camera={{ position: [cx + span, span * 0.95, cz + span], fov: 45, near: 0.05, far: span * 40 }} className="h-full w-full">
				<color attach="background" args={['#e9edf1']} />
				<ambientLight intensity={0.75} />
				<directionalLight position={[span, span * 1.5, span * 0.6]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
				<gridHelper args={[span * 4, 40, '#c2c8d0', '#dfe3e8']} position={[cx, -0.01, cz]} />

				{scene.rooms.map((r) => (
					<FloorPlane
						key={r.id}
						points={r.points}
						color={r.floor.kind === 'none' ? '#ded9d0' : floorTint(r.floor.kind, r.floor.color)}
						tex={canvasTexture(r.floor.kind === 'none' ? null : floorHatch(r.floor.kind, floorTint(r.floor.kind, r.floor.color), 'rgba(0,0,0,0.14)'), 4)}
					/>
				))}
				{scene.surfaces.map((sf) => (
					<FloorPlane key={sf.id} points={sf.points} color={sf.color} tex={canvasTexture(floorHatch(sf.kind === 'none' ? 'parquet' : sf.kind, sf.color, 'rgba(0,0,0,0.14)'), 4)} />
				))}

				{scene.walls.filter((w) => !hiddenInPhase(phase, w.status)).map((w) => (
					<WallMesh
						key={w.id}
						wall={w}
						openings={scene.openings.filter((o) => o.wallId === w.id && !hiddenInPhase(phase, o.status))}
						height={wallHeightAt(scene, { x: (w.a.x + w.b.x) / 2, y: (w.a.y + w.b.y) / 2 })}
					/>
				))}

				{scene.furniture.map((f) => (
					<FurnitureMesh key={f.id} f={f} />
				))}

				<CameraRig preset={view.preset} nonce={view.nonce} center={[cx, cz]} span={span} controls={controls} />
				<OrbitControls
					ref={controls}
					makeDefault
					enableDamping
					dampingFactor={0.08}
					enablePan
					panSpeed={0.9}
					zoomSpeed={0.9}
					rotateSpeed={0.9}
					minDistance={span * 0.15}
					maxDistance={span * 12}
					maxPolarAngle={Math.PI / 2.02}
					target={[cx, 0, cz]}
				/>
			</Canvas>

			<div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1.5">
				<div className="pointer-events-auto flex gap-1.5">
					<button className={btn} onClick={() => go('iso')}>
						3D
					</button>
					<button className={btn} onClick={() => go('top')}>
						Зверху
					</button>
					<button className={btn} onClick={() => go('front')}>
						Спереду
					</button>
					<button className={btn} onClick={() => go('side')}>
						Збоку
					</button>
				</div>
				<div className="rounded bg-white/75 px-2 py-0.5 text-[11px] text-slate-500">
					ЛКМ — обертати · ПКМ — переміщати · колесо — масштаб
				</div>
			</div>
		</div>
	);
}
