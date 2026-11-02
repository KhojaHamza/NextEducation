import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';

import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/atkinson-hyperlegible/400.css';
import '@fontsource/atkinson-hyperlegible/700.css';
import './index.css';
import { AuthProvider } from './features/auth/AuthContext.jsx';


import { queryClient } from './app/queryClient.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>,
);