import { Copy, LogOut, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import { toast } from '../components/UI/toast';
import { totalAreaM2 } from '../domain/dimensions';
import { fromProjectFile } from '../domain/projectFile';
import { formatAreaM2 } from '../domain/units';
import { UrlConfig } from '../constants/urls';
import { useAuthStore } from '../store/useAuthStore';
import { useProjectsStore } from '../store/useProjectsStore';

export default function Projects() {
	const navigate = useNavigate();
	const { user, logout } = useAuthStore();
	const { list, isLoading, fetchAll, create, importFile, rename, remove, duplicate } = useProjectsStore();

	const [creating, setCreating] = useState(false);
	const [name, setName] = useState('');
	const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
	const fileRef = useRef<HTMLInputElement | null>(null);

	const onImport = async (file: File) => {
		try {
			const { name: n, scene, variants, activeVariantId } = fromProjectFile(await file.text());
			const doc = await importFile(n, scene, user?.email ?? '', variants, activeVariantId);
			if (doc) navigate(UrlConfig.editor(doc.id));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Не вдалося прочитати файл.');
		}
	};

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	const email = user?.email ?? '';

	const onCreate = async () => {
		const doc = await create(name || 'Нове планування', email);
		setCreating(false);
		setName('');
		if (doc) navigate(UrlConfig.editor(doc.id));
	};

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<header className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-xl font-semibold">Мої планування</h1>
					<p className="text-sm text-muted">{email}</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={() => setCreating(true)}>
						<Plus className="h-4 w-4" />
						Нове
					</Button>
					<Button variant="outline" onClick={() => fileRef.current?.click()}>
						<Upload className="h-4 w-4" />
						Імпорт
					</Button>
					<input
						ref={fileRef}
						type="file"
						accept=".floorplan,.json,application/json"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) onImport(f);
							e.target.value = '';
						}}
					/>
					<Button variant="outline" onClick={logout}>
						<LogOut className="h-4 w-4" />
						Вийти
					</Button>
				</div>
			</header>

			{isLoading && <p className="text-sm text-muted">Завантаження…</p>}

			{!isLoading && list.length === 0 && (
				<div className="rounded-lg border border-dashed border-panel-border bg-panel p-10 text-center text-sm text-muted">
					Ще немає жодного проєкту. Створіть перший.
				</div>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				{list.map((p) => (
					<div key={p.id} className="rounded-lg border border-panel-border bg-panel p-4 transition-shadow hover:shadow-sm">
						<button className="block w-full text-left" onClick={() => navigate(UrlConfig.editor(p.id))}>
							<h2 className="font-medium">{p.name}</h2>
							<p className="mt-1 text-xs text-muted">
								{p.scene.rooms.length} кімнат · {formatAreaM2(totalAreaM2(p.scene))} · {p.scene.furniture.length} меблів
							</p>
							<p className="mt-1 text-xs text-muted">
								Оновлено {new Date(p.updatedAt).toLocaleString('uk')}
							</p>
						</button>
						<div className="mt-3 flex gap-1 border-t border-panel-border pt-3">
							<Button size="sm" variant="ghost" onClick={() => setRenaming({ id: p.id, name: p.name })}>
								<Pencil className="h-3.5 w-3.5" />
							</Button>
							<Button size="sm" variant="ghost" onClick={() => duplicate(p.id, email)}>
								<Copy className="h-3.5 w-3.5" />
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="text-danger"
								onClick={() => {
									if (confirm(`Видалити «${p.name}»?`)) remove(p.id);
								}}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</div>
					</div>
				))}
			</div>

			<Modal open={creating} onClose={() => setCreating(false)} title="Новий проєкт">
				<Input
					autoFocus
					placeholder="Назва проєкту"
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === 'Enter' && onCreate()}
				/>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="outline" onClick={() => setCreating(false)}>
						Скасувати
					</Button>
					<Button onClick={onCreate}>Створити</Button>
				</div>
			</Modal>

			<Modal open={!!renaming} onClose={() => setRenaming(null)} title="Перейменувати">
				<Input
					autoFocus
					value={renaming?.name ?? ''}
					onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && renaming) {
							rename(renaming.id, renaming.name);
							setRenaming(null);
						}
					}}
				/>
				<div className="mt-4 flex justify-end gap-2">
					<Button variant="outline" onClick={() => setRenaming(null)}>
						Скасувати
					</Button>
					<Button
						onClick={() => {
							if (renaming) rename(renaming.id, renaming.name);
							setRenaming(null);
						}}
					>
						Зберегти
					</Button>
				</div>
			</Modal>
		</div>
	);
}
