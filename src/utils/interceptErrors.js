// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const DESTROY_TIMEOUT = 3000;
let queue;
let destroyTimeout;
let containerElement;
let isExpanded = false;
const listeners = new Map();

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const interceptErrors = () => {
    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection, true);
    navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage, true);
};

/**
 *
 */
const addErrorListener = (handler) => {
    listeners.set(handler, true);
};

/**
 *
 */
const removeErrorListener = (handler) => {
    listeners.remove(handler);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const onError = (event) => {
    panic(event.type, event);
};

/**
 *
 */
const onUnhandledRejection = (event) => {
    panic(event.type, event.reason);
};

/**
 *
 */
const onServiceWorkerMessage = (event) => {
    if (event.data?.type === 'PANIC') {
        // This message came from a service worker that panicked.
        const payload = event.data.panic || {};
        panic(payload.type + ' in SW', payload);
    }
};

/**
 *
 */
const panic = (type, {message, stack}) => {
    clearTimeout(destroyTimeout);
    if (!queue) {
        queue = [];
        containerElement = document.createElement('div');
        containerElement.style.cssText = `
            position:fixed;
            z-index:999999;
            inset:16px 16px auto 16px;
            padding: 8px;
            background:blackArmy;
            color:white;
            border-radius:4px;
            font-family:Arial, sans-serif;
            font-size:16px;
            white-space:pre-wrap;
            cursor:pointer;
        `;
        containerElement.addEventListener('click', onContainerClick);
        document.body.appendChild(containerElement);
    }
    if (!isExpanded) {
        destroyTimeout = setTimeout(onDestroyTimeout, DESTROY_TIMEOUT);
    }
    queue.push({type, message, stack});
    renderQueue();
};

/**
 *
 */
const renderQueue = () => {
    let items = [];
    for (const item of queue) {
        const {type, message, stack} = item;
        if (isExpanded) {
            items.push(type + '<br/>' + message + '<br/>' + stack);
        } else {
            items.push(message.match(/.*/)[0]);
        }
        for (const [handler] of listeners) {
            handler(item);
        }
    }
    containerElement.innerHTML = `<ul><li>${items.join('</li><li>')}</li></ul>`;
};

/**
 *
 */
const onDestroyTimeout = () => {
    destroyContainerElement();
};

/**
 *
 */
const onContainerClick = () => {
    if (!isExpanded) {
        isExpanded = true;
        clearTimeout(destroyTimeout);
        containerElement.style.fontFamily = 'monospace';
        renderQueue();
    } else {
        destroyContainerElement();
    }
};

/**
 *
 */
const destroyContainerElement = () => {
    queue = null;
    document.body.removeChild(containerElement);
    containerElement = null;
    isExpanded = false;
    clearTimeout(destroyTimeout);
};

// =====================================================================================================================
//  R U N
// =====================================================================================================================
export {addErrorListener, removeErrorListener};
interceptErrors();
