import levenshtein from 'js-levenshtein';


// =====================================================================================================================
//  P U B L I C
// =====================================================================================================================
/**
 *
 */
const computeFinalMatrix = (cMatrix, iMatrix) => {
    // iMatrix = [iMatrix[0],iMatrix[8]];
    // cMatrix = [cMatrix[0],cMatrix[9]];

    const cLen = cMatrix.length;
    const iLen = iMatrix.length;
    const cUsed = {};


    for (let i = 1; i < iLen; i++) {
        const [, iCor, iMan, iName] = iMatrix[i];
        const iClean = cleanName(iName);
        // console.log('iClean:', iClean);

        let minDistance=Number.MAX_SAFE_INTEGER;
        let index = -1;

        for (let c = 1; c < cLen; c++) {
            const [,,,, cCor, cMan, cName, cAtc] = cMatrix[c];
            const cClean = cleanName(cName);
            // console.log('cClean:', cClean);

            const distance = levenshtein(iClean, cClean);
            if (distance < minDistance) {
                minDistance = distance;
                index = c;
            }
        }
        if (index >= 0) {
            cUsed[index] = true;
            iMatrix[i][4] = minDistance;
            iMatrix[i][5] = cMatrix[index][6];
        }
    }

    return iMatrix;
};

// =====================================================================================================================
//  P R I V A T E
// =====================================================================================================================
/**
 *
 */
const cleanName = (name) => {
    name = name.toLowerCase();
    name = name.replace(/x(\d)/g, '$1'); // 'foo x30' -> 'foo 30'
    name = name.replace(/(\d)([^\d\s])/g, '$1 $2'); // 4foo -> 4 foo
    return name;
}

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default computeFinalMatrix;
