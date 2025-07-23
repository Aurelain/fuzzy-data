import fs from 'fs';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const PATTERNS = [
    /console.info[^)]*You might need to use a local HTTP/, //
    /console.info[^)]*Download the React DevTools/,
];

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const EsbuildCleanConsole = {
    name: 'EsbuildCleanConsole',
    setup(build) {
        const isDev = build.initialOptions.sourcemap;
        if (isDev) {
            build.onLoad({filter: /\.js$/}, async (args) => {
                let code = await fs.promises.readFile(args.path, 'utf8');
                let isChanged = true;
                for (const pattern of PATTERNS) {
                    const found = code.match(pattern);
                    if (found) {
                        // console.log(code.substring(found.index, found.index + 200));
                        code = code.replace(pattern, 'false && ' + found[0]);
                        isChanged = true;
                    }
                }
                if (isChanged) {
                    return {
                        contents: code,
                        loader: 'js',
                    };
                }
            });
        }
    },
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default EsbuildCleanConsole;
