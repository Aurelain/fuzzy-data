import './utils/interceptConsole.js';
import './utils/interceptErrors.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import GlobalStyles from './components/GlobalStyles.jsx';
import App from './components/App.jsx';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const run = async () => {
    // We're not using <React.StrictMode> because we dislike different behaviour in dev vs production.
    ReactDOM.createRoot(document.getElementById('root')).render(
        <GlobalStyles>
            <App />
        </GlobalStyles>
    );

    const loading = document.getElementById('loading');
    loading.parentNode.removeChild(loading);
};

// =====================================================================================================================
//  R U N
// =====================================================================================================================
run();
