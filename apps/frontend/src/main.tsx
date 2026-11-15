import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App.tsx';

// StrictMode celowo wyłączony (podwójne wywołania efektów kłóciły się z flow logowania Steam)
// <StrictMode>
//   <App />
// </StrictMode>

createRoot(document.getElementById('root')!).render(<App />);
