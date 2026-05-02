import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { installApiFetch, bootstrapCsrf } from './lib/installApiFetch';
import App from './App.jsx';
import { AppErrorBoundary } from './components/system/AppErrorBoundary.jsx';
import './index.css';

installApiFetch();

async function startApp() {
  try {
    await bootstrapCsrf();
  } catch {
    /* offline — user may refresh; mutating calls can retry after reconnect */
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
      </BrowserRouter>
    </React.StrictMode>
  );
}

void startApp();
