import Konva from 'konva';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { wallElevation } from '../../domain/elevation';
import { formatLengthShort } from '../../domain/units';
import { usePlannerStore } from '../../store/usePlannerStore';
import Button from '../UI/Button';
import Modal from '../UI/Modal';

const PAD = 90; // px поля
const TARGET = 900; // px по довшій стороні креслення

export default function ElevationView() {
	const { scene, elevationWallId, closeElevation } = usePlannerStore();
	const stageRef = useRef<Konva.Stage | null>(null);

	const el = useMemo(() => (elevationWallId ? wallElevation(scene, elevationWallId) : null), [scene, elevationWallId]);
	const units = scene.settings.units;

	if (!elevationWallId) return null;
	if (!el) {
		return (
			<Modal open onClose={closeElevation} title="Розгортка стіни">
				<p className="text-sm text-muted">Стіну не знайдено.</p>
			</Modal>
		);
	}

	const s = TARGET / Math.max(el.length, el.height);
	const W = Math.round(el.length * s + PAD * 2);
	const H = Math.round(el.height * s + PAD * 2 + 40);
	const ox = PAD;
	const oy = PAD;
	// координати: y=0 підлога внизу → малюємо перевернуто (screenY = oy + (height - worldZ)*s)
	const sx = (x: number) => ox + x * s;
	const sz = (z: number) => oy + (el.height - z) * s;

	const download = async (kind: 'png' | 'pdf') => {
		const stage = stageRef.current;
		if (!stage) return;
		const url = stage.toDataURL({ pixelRatio: 2 });
		const base = `${(scene.settings.title || 'plan').replace(/[^\p{L}\p{N}_-]+/gu, '_')}_розгортка`;
		if (kind === 'png') {
			const a = document.createElement('a');
			a.href = url;
			a.download = `${base}.png`;
			a.click();
		} else {
			const pdf = new jsPDF({ orientation: W >= H ? 'landscape' : 'portrait', unit: 'px', format: [W * 2, H * 2], compress: true });
			pdf.addImage(url, 'PNG', 0, 0, W * 2, H * 2);
			pdf.save(`${base}.pdf`);
		}
	};

	return (
		<Modal open onClose={closeElevation} title="Розгортка стіни" className="max-w-3xl">
			<div className="space-y-3">
				<div className="max-h-[60vh] overflow-auto rounded border border-panel-border bg-white">
					<Stage ref={stageRef} width={W} height={H}>
						<Layer>
							<Rect x={0} y={0} width={W} height={H} fill="#ffffff" />
							{/* контур стіни */}
							<Rect x={sx(0)} y={sz(el.height)} width={el.length * s} height={el.height * s} stroke="#111" strokeWidth={1.5} />
							{/* підлога / стеля лінії */}
							<Line points={[sx(-20), sz(0), sx(el.length + 20), sz(0)]} stroke="#111" strokeWidth={2} />
							{/* меблі (силуети) */}
							{el.furniture.map((f, i) => (
								<Group key={i}>
									<Rect x={sx(f.x - f.w / 2)} y={sz(f.h)} width={f.w * s} height={f.h * s} stroke="#5b6472" strokeWidth={1} fill="rgba(140,169,196,0.15)" />
									<Text x={sx(f.x)} y={sz(f.h) - 14} text={f.label} fontSize={10} fill="#374151" offsetX={f.label.length * 2.6} />
								</Group>
							))}
							{/* отвори */}
							{el.openings.map((o, i) => (
								<Group key={i}>
									<Rect x={sx(o.x)} y={sz(o.head)} width={o.width * s} height={(o.head - o.sill) * s} stroke="#0b3d91" strokeWidth={1.5} fill={o.type === 'window' ? 'rgba(11,61,145,0.06)' : '#fff'} />
									{o.type === 'window' && (
										<>
											<Line points={[sx(o.x), sz((o.head + o.sill) / 2), sx(o.x + o.width), sz((o.head + o.sill) / 2)]} stroke="#0b3d91" strokeWidth={1} />
											<Line points={[sx(o.x + o.width / 2), sz(o.head), sx(o.x + o.width / 2), sz(o.sill)]} stroke="#0b3d91" strokeWidth={1} />
										</>
									)}
									<Text x={sx(o.x + o.width / 2)} y={sz(o.sill) + 6} text={`${formatLengthShort(o.width, units)} · h${formatLengthShort(o.head - o.sill, units)}`} fontSize={9} fill="#0b3d91" offsetX={20} />
								</Group>
							))}
							{/* габаритні розміри */}
							<Line points={[sx(0), sz(0) + 30, sx(el.length), sz(0) + 30]} stroke="#0b3d91" strokeWidth={1} />
							<Text x={sx(el.length / 2)} y={sz(0) + 16} text={`${formatLengthShort(el.length, units)}`} fontSize={11} fill="#0b3d91" offsetX={12} />
							<Line points={[sx(0) - 30, sz(0), sx(0) - 30, sz(el.height)]} stroke="#0b3d91" strokeWidth={1} />
							<Text x={sx(0) - 44} y={sz(el.height / 2)} text={`${formatLengthShort(el.height, units)}`} fontSize={11} fill="#0b3d91" rotation={-90} />
						</Layer>
					</Stage>
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" onClick={() => download('png')}>
						<Download className="h-4 w-4" /> PNG
					</Button>
					<Button onClick={() => download('pdf')}>
						<Download className="h-4 w-4" /> PDF
					</Button>
				</div>
			</div>
		</Modal>
	);
}
