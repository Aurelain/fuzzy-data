import fs from 'fs';
import fsExtra from 'fs-extra';
import esbuild from 'esbuild';
import open from 'open';
import process from 'node:process';
import {hashElement} from 'folder-hash';
import assume from '../utils/assume.js';
import projectRoot from '../utils/projectRoot.js';
import {execSync} from 'child_process';
import sleep from '../utils/sleep.js';
import EsbuildCleanConsole from './plugins/EsbuildCleanConsole.js';
import EsbuildEmotionPlugin from './plugins/EsbuildEmotionPlugin.js';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const BUILD_DIR = 'docs';
const MAIN_JS_PATH = 'src/main.jsx';
const MAIN_HTML_PATH = 'src/main.html';
const TARGET_TXT_PATH = projectRoot + '/target.txt';
const CLIENT_PATH_MARKER = '@CLIENT_PATH';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const build = async () => {
    const time = Date.now();
    const isDev = process.argv.includes('--dev');
    const outputDir = BUILD_DIR;
    let allPath;

    // Find entry point
    let entryPath = MAIN_JS_PATH;
    if (fs.existsSync(TARGET_TXT_PATH)) {
        entryPath = fs.readFileSync(TARGET_TXT_PATH, 'utf8');
    }
    assume(fs.existsSync(entryPath), `Invalid entry "${entryPath}"!`);
    const entryName = entryPath.replace(/.*\//, '');
    console.log('Building "' + entryName + '"...');

    // Build fresh:
    cleanDestination(outputDir);
    fsExtra.copySync(MAIN_HTML_PATH, outputDir + '/index.html');
    entryPath = wrapIief(entryPath);
    const clientBundle = await createBundle(entryPath, outputDir, isDev);

    // Rename `main.js`:
    const {hash} = await hashElement(outputDir);
    const cleanHash = hash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    renameClient(clientBundle, cleanHash);
    updateIndex(clientBundle, outputDir);

    // Write to disk the adapted main bundle:
    fs.writeFileSync(clientBundle.filePath, clientBundle.content);

    // Adapt the index title for dev environment:
    const indexPath = outputDir + '/index.html';
    if (isDev) {
        const index = fs.readFileSync(indexPath, 'utf8');
        const adapted = index.replace(/(<title.*?>).*?(<\/title>)/, '$1' + entryName + '$2');
        fs.writeFileSync(indexPath, adapted);
    }

    // Cleanup temporary files:
    entryPath.includes('.temp.') && fs.unlinkSync(entryPath);
    allPath && fs.unlinkSync(allPath);

    console.log(cleanHash);
    console.log(`Done in ${Date.now() - time} ms.`);
    await refreshBrowser(indexPath);
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanDestination = (dir) => {
    const list = fs.readdirSync(dir);
    for (const file of list) {
        if (file && file !== 'art') {
            fsExtra.removeSync(dir + '/' + file);
        }
    }
};

/**
 *
 */
const wrapIief = (entryPoint) => {
    if (entryPoint.match(/jsx$/)) {
        return entryPoint;
    }
    const content = fs.readFileSync(entryPoint, 'utf8');
    if (!content.includes('await')) {
        return entryPoint;
    }
    // TODO: add more conditions
    const importLines = Array.from(content.matchAll(/^import.*/gm));
    const lastImportLine = importLines.at(-1);
    const codeIndex = lastImportLine ? lastImportLine.index + lastImportLine[0].length : 0;
    const code = content.substring(codeIndex);
    const freshContent = content.substring(0, codeIndex) + '\n(async () => {\n' + code + '\n})();';
    if (entryPoint.includes('.test.')) {
        entryPoint = entryPoint.replace('.test.', '.temp.');
    } else {
        entryPoint = entryPoint.replace(/(\.[^.]*)$/, '.temp$1');
    }
    fs.writeFileSync(entryPoint, freshContent);
    return entryPoint;
};

/**
 *
 */
const createBundle = async (target, outputDir, isDev) => {
    await esbuild.build({
        banner: {js: '"use strict";'}, // https://github.com/evanw/esbuild/issues/2264
        entryPoints: [target],
        bundle: true,
        minify: !isDev,
        sourcemap: isDev,
        outdir: outputDir,
        loader: {'.jpg': 'file', '.png': 'file', '.woff': 'file', '.woff2': 'file'},
        assetNames: 'assets/[name]-[hash]',
        legalComments: 'none',
        jsx: 'automatic', // this option, along with the next one, avoids the jsx emotion pragma
        jsxImportSource: '@emotion/react', // allows using `css` in `<div css={}/>`
        plugins: [EsbuildEmotionPlugin, EsbuildCleanConsole],
    });

    const filePath = getOutputFilePath(outputDir);
    return {
        filePath,
        outputDir,
        content: fs.readFileSync(filePath, 'utf8'),
    };
};

/**
 *
 */
const getOutputFilePath = (outputDir) => {
    const fileNames = fs.readdirSync(outputDir);
    for (const fileName of fileNames) {
        if (fileName.endsWith('.js')) {
            return outputDir + '/' + fileName;
        }
    }
};

/**
 *
 */
const renameClient = (clientBundle, hash) => {
    const oldName = clientBundle.filePath.match(/[^\\/]*$/)[0];
    const freshName = oldName.replace('.js', `-${hash}.js`);

    const freshFilePath = clientBundle.filePath.replace(oldName, freshName);
    fs.renameSync(clientBundle.filePath, freshFilePath);

    const mapFilePath = clientBundle.filePath + '.map';
    if (fs.existsSync(mapFilePath)) {
        const freshMapFilePath = mapFilePath.replace(oldName, freshName);
        fs.renameSync(mapFilePath, freshMapFilePath);
    }

    clientBundle.filePath = freshFilePath;
    clientBundle.content = clientBundle.content.replace(oldName + '.map', freshName + '.map');
};

/**
 *
 */
const updateIndex = (clientBundle) => {
    const indexPath = clientBundle.outputDir + '/index.html';
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const relativePath = clientBundle.filePath.substring(clientBundle.outputDir.length + 1);
    const freshIndexContent = indexContent.replace(CLIENT_PATH_MARKER, relativePath);
    fs.writeFileSync(indexPath, freshIndexContent);
};

/**
 *
 */
const refreshBrowser = async (indexPath) => {
    let browserId = findBrowser();
    if (!browserId) {
        open(indexPath);
        await sleep(1000);
        browserId = findBrowser();
    }
    if (!browserId) {
        console.log('Could not find browser!');
        return;
    }
    try {
        const editorId = execSync(`xdotool getwindowfocus`).toString().match(/\w+/)[0];
        execSync(`xdotool windowactivate ${browserId}`);
        await sleep(100);
        execSync(`xdotool key ctrl+r`);
        await sleep(100);
        execSync(`xdotool windowactivate ${editorId}`);
    } catch (error) {
        console.error('Error:', error.message);
    }
};

/**
 *
 */
const findBrowser = () => {
    try {
        return execSync(`xdotool search --name " Chromium$"`).toString().match(/\w+/)[0];
    } catch (error) {
        // console.error('Error:', error.message);
    }
};

// =====================================================================================================================
//  R U N
// =====================================================================================================================
await build();
