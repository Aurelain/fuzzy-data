import levenshtein from 'js-levenshtein';

const cleanToOriginal = {};
const TAG = 4;
const NAME = 5;
const DISTANCE = 6;
const COMMENT = 7;
const CANDIDATES = 8;

// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const computeFinalMatrix = (cMatrix, iMatrix, replacements) => {
    if (iMatrix[0].length < 7) {
        iMatrix[0].push('Distance', 'Comment', 'Candidates');
    }

    // Remove headers:
    const cHeader = cMatrix.shift();
    const iHeader = iMatrix.shift();

    const iLen = iMatrix.length;
    const cUsed = {};
    let totalDistance=0;
    let found=0;
    let uncertain=0;

    for (let i = 0; i < iLen; i++) {
        const [, iCor, iMan, iName] = iMatrix[i];
        const iClean = cleanName(iName, replacements);

        const candidates = computeDistances(iClean, cMatrix, replacements);
        const [first] = candidates;
        const {distance, name, tag} = first;
        const isDupe = name in cUsed;
        cUsed[name] = true;
        iMatrix[i][TAG] = tag;
        iMatrix[i][NAME] = name;
        iMatrix[i][DISTANCE] = distance;
        if (isDupe) {
            iMatrix[i][COMMENT] = 'Dupe!';
        }
        if (distance < 1) {
            found++;
        } else {
            iMatrix[i][CANDIDATES] = printCandidates(candidates);
            uncertain++;
            totalDistance+=distance;
        }
    }

    // Restore headers:
    cMatrix.unshift(cHeader);
    iMatrix.unshift(iHeader);

    const summary = `<ul>
        <li>Exact matches: ${found}</li>
        <li>Uncertain: ${uncertain} (average distance ${Math.round(totalDistance/uncertain)})</li>
    </ul>`;

    return {matrix: iMatrix, summary};
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
    cleanToOriginal[clean] = name;
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

/**
 *
 */
const computeDistances = (iName, cRows, replacements) => {
    const output = [];
    const {length} = cRows;
    for (let c = 0; c < length; c++) {
        const cName = cRows[c][6];
        const cClean = cleanName(cName, replacements);
        const distance = levenshtein(iName, cClean);
        output.push({
            name: cName,
            tag: cRows[c][7],
            distance: distance,
        });
    }
    output.sort(compareByDistance);
    return output;
}

/**
 *
 */
const compareByDistance = (a, b) => {
    return a.distance - b.distance;
}

/**
 *
 */
const printCandidates = (candidates) => {
    candidates = candidates.slice(0,20);
    const list = [];
    for (const candidate of candidates) {
        list.push('•'+candidate.name+'='+candidate.tag);
    }
    return '<div>' + list.join('<br/>') + '</div>';
}


// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default computeFinalMatrix;
