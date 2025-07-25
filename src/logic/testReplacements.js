// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const testReplacements = (cMatrix, iMatrix, replacements) => {
    // Remove headers
    cMatrix.shift();
    iMatrix.shift();

    const output = [
        ['Nume original', 'Nume folosit la comparație'],
    ];

    for (const row of cMatrix) {
        const name = row[6];
        output.push([name, cleanName(name, replacements)]);
    }

    for (const row of iMatrix) {
        const name = row[3];
        output.push([name, cleanName(name, replacements)]);
    }

    return {matrix: output, summary:'Test'};
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanName = (name, replacements) => {
    let clean = applyReplacements(name, replacements);
    clean = clean.toLowerCase();
    return clean;
}

/**
 *
 */
const applyReplacements = (text, replacements) => {
    for (const {left, right} of replacements) {
        if (typeof left === 'string') {
            text = text.replaceAll(left, right);
        } else {
            text = text.replace(left, right);
        }
    }
    return text;
}

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default testReplacements;
