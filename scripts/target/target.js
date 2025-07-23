import fs from 'fs';
import assume from '../utils/assume.js';
import projectRoot from '../utils/projectRoot.js';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const TARGET_TXT_PATH = projectRoot + '/target.txt';

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 * Chooses an entry point for the build process and writes it into `target.txt`.
 * If the entry point is `/src/main.jsx`, the `target.txt` file is removed.
 */
const target = () => {
    let argument = process.argv.at(-1);
    assume(argument, 'Nothing to target!');

    if (argument === '--all') {
        fs.writeFileSync(TARGET_TXT_PATH, 'ALL');
        console.log(`OK, targeting ALL test files.`);
        return;
    }

    // Check if this is the main entry point:
    if (argument.match(/src\/main.jsx$/) || argument.match(/target.txt$/)) {
        fs.unlinkSync(TARGET_TXT_PATH);
        console.log('OK, removed special targeting.');
        return;
    }

    // Write to disk:
    fs.writeFileSync(TARGET_TXT_PATH, argument);
    console.log(`OK, targeting "${argument.match(/[^\\\/]*$/)[0]}".`);
    open(argument);
};

// =====================================================================================================================
//  R U N
// =====================================================================================================================
target();
