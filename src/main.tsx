import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Toaster } from './components/UI/toast';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<BrowserRouter>
		<App />
		<Toaster />
	</BrowserRouter>,
);
