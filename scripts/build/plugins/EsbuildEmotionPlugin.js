import fs from 'fs';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CSS_PATTERN = /const CSS =[\s\S]*?;/;
const RULE_PATTERN = /([^\r\n]*):\s*{/g;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const EsbuildEmotionPlugin = {
    name: 'EsbuildEmotionPlugin',
    setup(build) {
        const isDev = build.initialOptions.sourcemap;
        if (isDev) {
            build.onLoad({filter: /\.jsx$/}, async (args) => {
                const code = await fs.promises.readFile(args.path, 'utf8');
                const fileName = args.path.match(/[^\\/]*$/)[0];
                const stem = fileName.replace(/\.jsx$/, '');
                const cssMatch = code.match(CSS_PATTERN);
                if (cssMatch) {
                    const cssWithLabels = cssMatch[0].replace(RULE_PATTERN, (found, ruleName) => {
                        const label = stem + '_' + ruleName.replace(/[^a-zA-Z0-9]/g, '');
                        return `${ruleName}:{label:'${label}',`;
                    });
                    return {
                        contents: code.replace(CSS_PATTERN, cssWithLabels),
                        loader: 'jsx',
                    };
                }
            });
        }
    },
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default EsbuildEmotionPlugin;
