import levenshtein from 'js-levenshtein';

const cleanToOriginal = {};
const NAME = 4;
const TAG = 5;
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
    const cup = iMatrix[0][NAME];
    iMatrix[0][NAME] = iMatrix[0][TAG];
    iMatrix[0][TAG] = cup;
    iMatrix[0].push('Distance', 'Comment', 'Candidates');
    cMatrix.shift();
    const iHeader = iMatrix.shift();

    // iMatrix = [iMatrix[7]];
    // cMatrix = [cMatrix[0],cMatrix[9]];

    validateCorporation(cMatrix, iMatrix, replacements);
    validateMan(cMatrix, iMatrix, replacements);
    validateCorMan(cMatrix, iMatrix, replacements);

    const iLen = iMatrix.length;
    const cUsed = {};
    let unknownSource=0;
    let found=0;
    let uncertain=0;

    for (let i = 0; i < iLen; i++) {
        const [, iCor, iMan, iName] = iMatrix[i];
        const iClean = cleanName(iName, replacements);
        const validCRows = findCRowsWithSameCorpAndMan(cMatrix, iCor, iMan, replacements);
        if (!validCRows.length) {
            iMatrix[i][DISTANCE] = '100';
            iMatrix[i][COMMENT] = 'Source?';
            unknownSource++;
            continue;
        }

        const candidates = computeDistances(iClean, validCRows, replacements);
        const [first] = candidates;
        const {distance, name, tag} = first;
        const isDupe = name in cUsed;
        cUsed[name] = true;
        iMatrix[i][NAME] = name;
        iMatrix[i][TAG] = tag;
        iMatrix[i][DISTANCE] = distance;
        if (isDupe) {
            iMatrix[i][COMMENT] = 'Dupe!';
        }
        if (distance < 4) {
            found++;
        } else {
            iMatrix[i][CANDIDATES] = printCandidates(candidates);
            uncertain++;
        }
    }

    iMatrix.unshift(iHeader);
    console.log(`Results:
    • Unknown source: ${unknownSource}
    • Found: ${found}
    • Uncertain: ${uncertain}
    `)
    return iMatrix;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const validateCorporation = (cMatrix, iMatrix, replacements) => {
    const cCors = consolidateColumn(cMatrix, 4, cleanCorporation, replacements);
    const iCors = consolidateColumn(iMatrix, 1, cleanCorporation, replacements);
    const matched = [];
    const iNew = [];
    const cNew = [];
    for (const iKey in iCors) {
        if (cCors[iKey]) {
            matched.push(iKey);
        } else {
            iNew.push(iKey);
        }
    }
    for (const cKey in cCors) {
        if (!iCors[cKey]) {
            cNew.push(cKey);
        }
    }
    print(`Matched ${matched.length} corporations`, restore(matched));
    print(`Found no match for ${iNew.length} i-corporations`, restore(iNew));
    print(`Found no match for ${cNew.length} c-corporations`, restore(cNew));
}

/**
 *
 */
const validateMan = (cMatrix, iMatrix, replacements) => {
    const cCors = consolidateColumn(cMatrix, 5, cleanCorporation, replacements);
    const iCors = consolidateColumn(iMatrix, 2, cleanCorporation, replacements);
    const matched = [];
    const iNew = [];
    const cNew = [];
    for (const iKey in iCors) {
        if (cCors[iKey]) {
            matched.push(iKey);
        } else {
            iNew.push(iKey);
        }
    }
    for (const cKey in cCors) {
        if (!iCors[cKey]) {
            cNew.push(cKey);
        }
    }
    print(`Matched ${matched.length} manufacturers`, restore(matched));
    print(`Found no match for ${iNew.length} i-manufacturers`, restore(iNew));
    print(`Found no match for ${cNew.length} c-manufacturers`, restore(cNew));
}

/**
 *
 */
const validateCorMan = (cMatrix, iMatrix) => {

}

/**
 *
 */
const cleanName = (name, replacements) => {
    let clean = applyReplacements(name, replacements);
    clean = clean.toLowerCase();
    clean = clean.replace(/x(\d)/g, '$1'); // 'foo x30' -> 'foo 30'
    clean = clean.replace(/(\d)([^\d\s])/g, '$1 $2'); // 4foo -> 4 foo
    cleanToOriginal[clean] = name;
    return clean;
}

/**
 *
 */
const cleanCorporation = (corporation, replacements) => {
    let clean = applyReplacements(corporation, replacements);
    clean = clean.toLowerCase();
    clean = clean.replace(/\W/g, '');
    cleanToOriginal[clean] = corporation;
    return clean;
}

/**
 *
 */
const consolidateColumn = (matrix, n, cleaner, replacements) => {
    const output = [];
    for (const row of matrix) {
        const clean = cleaner(row[n], replacements);
        output[clean] = row[n];
    }
    return output;
}

/**
 *
 */
const applyReplacements = (text, replacements) => {
    for (const replacement of replacements) {
        text = text.replaceAll(replacement.left, replacement.right);
    }
    return text;
}

/**
 *
 */
const restore = (list) => {
    const output = [];
    for (const item of list) {
        output.push(item in cleanToOriginal? cleanToOriginal[item] : item);
    }
    return output;
}

/**
 *
 */
const print = (text, value) => {
    console.groupCollapsed(text);
    console.log(value);
    console.groupEnd();
}

/**
 *
 */
const findCRowsWithSameCorpAndMan = (cMatrix, iCor, iMan, replacements) => {
    iCor = cleanCorporation(iCor, replacements);
    iMan = cleanCorporation(iMan, replacements);
    const output = [];
    for (const row of cMatrix) {
        const cCor = cleanCorporation(row[4], replacements);
        const cMan = cleanCorporation(row[5], replacements);
        if (cCor === iCor && cMan === iMan) {
            output.push(row);
        }
    }
    return output;
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
