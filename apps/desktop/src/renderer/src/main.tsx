import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist/wght.css';
import '@oriel/ui/styles.css';
import '../styles/base.css';
import '../styles/shell.css';
import '../styles/features.css';
import '../styles/dialogs.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Oriel could not find its renderer root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
