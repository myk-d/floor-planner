import { Component, type ReactNode } from 'react';

/** Ловить помилки ініціалізації WebGL / three.js і показує повідомлення замість білого екрана. */
export class Canvas3DBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(err: unknown) {
		console.error('3D помилка:', err);
	}

	render() {
		if (this.state.failed) {
			return (
				<div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
					Не вдалося запустити 3D — імовірно, браузер без апаратного прискорення (WebGL).
					<br />
					Спробуйте інший браузер або увімкніть апаратне прискорення.
				</div>
			);
		}
		return this.props.children;
	}
}
