/*
Manages the browser's console:
- Depending on the value of the `console` localStorage key, the console can be:
    1. emulated (when `console=emulated`)
    2. muted (when `console=muted`)
    3. allowed (when `console` has any other value, including undefined)
*/

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const EMPTY_OBJECT = {};
const EMPTY_FUNCTION = () => 0;
const CONSOLE_HEIGHT = 300;
const PROPERTIES = ['memory'];
const METHODS = {
    assert: log,
    clear: log,
    count: log,
    debug: log,
    dir: log,
    dirxml: log,
    error: log,
    exception: log,
    group: log,
    groupCollapsed: log,
    groupEnd: log,
    info: EMPTY_FUNCTION,
    log: log,
    markTimeline: log,
    profile: log,
    profileEnd: log,
    profiles: log,
    show: log,
    table: log,
    time: log,
    timeEnd: log,
    timeline: log,
    timelineEnd: log,
    timeLog: log,
    timeStamp: log,
    trace: log,
    warn: log,
};
let isInitialized = false;
let emulatedConsole;
let consoleElement;
let linesElement;
let linesBuffer;
let initialConsoleHeight;
let initialPointerY;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const interceptConsole = () => {
    // Singleton:
    if (isInitialized) {
        return;
    }
    isInitialized = true;

    switch (localStorage.getItem('console')) {
        case 'emulated': {
            emulatedConsole = {};
            for (const property of PROPERTIES) {
                emulatedConsole[property] = EMPTY_OBJECT;
            }
            for (const name in METHODS) {
                emulatedConsole[name] = createHandler(name);
            }

            // nativeConsole = window.console;
            window.console = emulatedConsole;
            createConsoleElement();
            break;
        }

        case 'muted': {
            const noopConsole = {};
            for (const property of PROPERTIES) {
                noopConsole[property] = EMPTY_OBJECT;
            }
            for (const methodName in METHODS) {
                noopConsole[methodName] = EMPTY_FUNCTION;
            }

            window.console = noopConsole;
            return;
        }

        default: {
            // No changes to the console system.
        }
    }
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const createConsoleElement = () => {
    if (document.body) {
        const consoleMarkup = createConsoleMarkup();
        document.body.insertAdjacentHTML('beforeend', consoleMarkup);

        consoleElement = document.getElementById('emuc');
        const consoleHeight = localStorage.getItem('consoleHeight') || CONSOLE_HEIGHT;
        consoleElement.style.height = consoleHeight + 'px';

        linesElement = document.getElementById('emucLines');
        document.getElementById('emucClear').addEventListener('click', onClearClick);
        document.getElementById('emucClose').addEventListener('click', onCloseClick);
        document.getElementById('emucResize').addEventListener('pointerdown', onResizePointerDown);
    } else {
        linesBuffer = []; // temporarily store any incoming commands
        document.addEventListener('DOMContentLoaded', onDocumentDomContentLoaded);
    }
};

/**
 *
 */
const onDocumentDomContentLoaded = () => {
    document.removeEventListener('DOMContentLoaded', onDocumentDomContentLoaded);
    createConsoleElement();

    // Purge buffer:
    for (const line of linesBuffer) {
        addLine(line);
    }
    linesBuffer = null;
};

/**
 *
 */
const createConsoleMarkup = () => {
    return `
        <style>
            #emuc {
                position:fixed;
                bottom:0;
                left:0;
                right:0;
                background:#fff;
            }
            #emucBar {
                height: 28px;
                background: #f1f3f4;
                border:solid 1px #cacdd1;
                border-left:0;
                border-right:0;
                display: flex;
            }
            .emucButton {
                width:26px;
                height:26px;
                line-height: 26px;
                text-align: center;
                cursor:pointer;
                color:#6e6e6e;
                font-size:16px;
            }
            .emucButton:hover {
                color:#000;
                background: #dee1e6;
            }
            .emucButton:active {
                background: #cecece;
            }
            #emucResize {
                flex-grow:1;
                cursor:ns-resize;
                touch-action: none;
            }
            #emucLines {
                width:100%;
                height:calc(100% - 26px);
                overflow-y:scroll;
            }
            .emucLine {
                white-space: pre-wrap;
                border-bottom: solid 1px #f0f0f0;
                padding: 4px;
                font-family: Consolas, monospace;
                font-size:12px;
            }            
        </style>
        <div id='emuc'>
            <div id='emucBar'>
                <div id='emucClear' class='emucButton'>🚫</div>
                <div id='emucResize'></div>
                <div id='emucClose' class='emucButton'>✕</div>
            </div>
            <div id='emucLines'></div>
        </div>
    `;
};

/**
 *
 */
const createHandler = (name) => {
    return (...args) => {
        // nativeConsole[name].apply(null, args);
        METHODS[name].apply(null, args);
    };
};

/**
 * Called by most API methods to refresh the content of the textarea
 */
const addLine = (line) => {
    if (linesElement) {
        let safeLine = line;
        safeLine = safeLine.replaceAll('&', '&amp;');
        safeLine = safeLine.replaceAll('<', '&lt;');
        safeLine = safeLine.replaceAll('>', '&gt;');
        linesElement.insertAdjacentHTML('beforeend', `<div class='emucLine'>${safeLine}</div>`);
        linesElement.scrollTop = linesElement.scrollHeight;
    } else {
        linesBuffer.push(line);
    }
};

/**
 *
 */
const onClearClick = () => {
    linesElement.innerHTML = '';
};

/**
 *
 */
const onCloseClick = () => {
    localStorage.removeItem('console');
    window.location.reload();
};

/**
 *
 */
const onResizePointerDown = (event) => {
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    initialConsoleHeight = consoleElement.offsetHeight;
    initialPointerY = event.clientY;
};

/**
 *
 */
const onWindowPointerMove = (event) => {
    const deltaY = event.clientY - initialPointerY;
    const futureHeight = Math.max(initialConsoleHeight - deltaY, 50);
    localStorage.setItem('consoleHeight', String(futureHeight));
    consoleElement.style.height = futureHeight + 'px';
};

/**
 *
 */
const onWindowPointerUp = () => {
    window.removeEventListener('pointermove', onWindowPointerMove);
    window.removeEventListener('pointerup', onWindowPointerUp);
};

// =====================================================================================================================
//  A P I
// =====================================================================================================================
/**
 *
 */
function log(...args) {
    const parts = [];
    for (const item of args) {
        if (item && typeof item === 'object') {
            parts.push(JSON.stringify(item, null, 4));
        } else {
            parts.push(String(item));
        }
    }
    addLine(parts.join(' '));
}

// =====================================================================================================================
//  R U N
// =====================================================================================================================
interceptConsole();
