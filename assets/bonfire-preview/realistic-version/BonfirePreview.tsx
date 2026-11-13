import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CelebrationScreen } from './StreakCelebration';

function Preview() {
  const [open, setOpen] = useState(true);
  return open ? <CelebrationScreen data={{ people: ['original'], count: 5, preview: true }} onClose={() => setOpen(false)} />
    : <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', color: '#e5c595', fontFamily: 'sans-serif' }}>
      <button onClick={() => setOpen(true)} style={{ padding: '16px 28px', background: '#2b2117', color: '#e5c595', border: '1px solid #a8793b', cursor: 'pointer' }}>Ver a fogueira novamente</button>
    </main>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
