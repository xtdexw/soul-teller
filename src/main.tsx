import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 检查 SDK 是否已加载
console.log('[main] App starting...');
console.log('[main] XmovAvatar available:', typeof (window as any).XmovAvatar !== 'undefined');

// 持续检查 SDK 加载状态
let checkCount = 0;
const checkInterval = setInterval(() => {
  checkCount++;
  const isAvailable = typeof (window as any).XmovAvatar !== 'undefined';
  if (isAvailable) {
    console.log('[main] XmovAvatar detected after', checkCount * 100, 'ms');
    clearInterval(checkInterval);
  } else if (checkCount >= 50) {
    console.warn('[main] XmovAvatar not detected after 5 seconds');
    clearInterval(checkInterval);
  }
}, 100);

createRoot(document.getElementById('root')!).render(
  <App />
)
