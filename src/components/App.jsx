import React from 'react';
import * as XLSX from 'xlsx';
import sampleC from '../samples/sample-c.xlsx';
import sampleI from '../samples/sample-i.xlsx';
import computeFinalMatrix from '../logic/computeFinalMatrix.js';
import assume from '../utils/assume.js';
import testReplacements from '../logic/testReplacements.js';

let xlsxFiles = [];
let cache;

// =====================================================================================================================
//  C O M P O N E N T
// =====================================================================================================================
class App extends React.PureComponent {
    textareaRef = React.createRef();
    state = {
        matrix: null,
        summary: ''
    };

    render() {
        const {matrix, summary} = this.state;
        return (
            <div>
                <textarea
                    ref={this.textareaRef}
                    onChange={this.onTextAreaChange}
                    onKeyDown={this.onTextAreaKeyDown}
                    defaultValue={localStorage.getItem('replacements') || ''}
                    autoComplete='off'
                    autoCorrect='off'
                    autoCapitalize='off'
                    spellCheck='false'
                />
                {summary &&
                    <>
                        <div dangerouslySetInnerHTML={{__html: summary}} />
                        <button onClick={this.onDownloadClick}>Download</button>
                        <button onClick={this.onRunClick}>Run</button>
                        <button onClick={this.onTestClick}>Test</button>
                    </>
                }

                {matrix && !!matrix.length && this.renderMatrix(matrix)}
                {matrix && !matrix.length && 'Loading...'}
                {!matrix && 'Drop 2 files here...'}
            </div>
        );
    }

    renderMatrix(matrix) {
        const trs = [];
        const {length: rowsCount} = matrix;
        const columnCount = matrix[0].length;
        for (let i = 0; i < rowsCount; i++) {
            const tds = [
                <th key={i + 'h'}>{i + 1}</th>
            ];
            const row = matrix[i];
            for (let j = 0; j < columnCount; j++) {
                const cell = row[j];
                tds.push(<td key={i + '-' + j} dangerouslySetInnerHTML={{__html: cell}} />);
            }
            trs.push(<tr key={i}>{tds}</tr>);
        }
        return (
            <table>
                <thead>
                    {this.renderHeader(columnCount)}
                </thead>
                <tbody>
                    {trs}
                </tbody>
            </table>
        );
    }

    renderHeader(columnCount) {
        const ths = [
            <th key={'header'}>&nbsp;</th>
        ];
        for (let i = 0; i < columnCount; i++) {
            ths.push(<th key={'headerCell' + i}>{String.fromCharCode(65 + i)}</th>);
        }
        return <tr key={'headerRow'}>{ths}</tr>;
    }

    // -----------------------------------------------------------------------------------------------------------------

    componentDidMount() {
        window.addEventListener('dragover', (event) => event.preventDefault());
        window.addEventListener('drop', this.onWindowDrop);
        if (1 && process.env?.NODE_ENV === 'development') {
            xlsxFiles = [sampleC, sampleI];
            this.parseXlsx();
        }
    }

    onTextAreaChange = () => {
        localStorage.setItem('replacements', this.textareaRef.current.value);
    };

    onTextAreaKeyDown = (event) => {
        if (event.key === 'Enter' && event.ctrlKey) {
            this.parseXlsx();
        }
    };

    onWindowDrop = (event) => {
        event.preventDefault();
        const {dataTransfer = {}} = event;
        xlsxFiles = dataTransfer.files || [];
        this.parseXlsx();
    };

    parseXlsx = async () => {
        this.setState({
            matrix: []
        });
        try {
            if (!cache) {
                assume(xlsxFiles.length === 2, 'Please drop exactly 2 files!');
                const replacements = parseReplacements(this.textareaRef.current.value);
                const byType = {};
                for (const file of xlsxFiles) {
                    const data = await getArrayBuffer(file);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const result = analyzeWorkbook(workbook);
                    assume(result, 'A file could not be recognized!');
                    byType[result.type] = result.matrix;
                }
                cache = {c:byType.c, i:byType.i, replacements};
            }
            const {matrix, summary} = computeFinalMatrix(cache.c, cache.i, cache.replacements);
            this.setState({matrix, summary});
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };

    onDownloadClick = () => {
        const {matrix} = this.state;
        const preparedMatrix = prepareMatrixForDownload(matrix);
        downloadMatrixAsXLSX(preparedMatrix);
    };

    onRunClick = () => {
        this.parseXlsx();
    };

    onTestClick = () => {
        const {matrix, summary} = testReplacements(cache.c, cache.i, cache.replacements);
        this.setState({matrix, summary});
    };


}

// =====================================================================================================================
//  I N T E R N A L
// =====================================================================================================================
/**
 *
 */
const getArrayBuffer = async (source) => {
    if (typeof source === 'string') {
        const response = await fetch(source);
        return await response.arrayBuffer();
    } else {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(source);
        });
    }
};

/**
 *
 */
const analyzeWorkbook = (workbook) => {
    for (const key in workbook.Sheets) {
        const sheet = workbook.Sheets[key];
        const header = JSON.stringify(sheet.A1 || {});
        if (header.includes('ATC1')) {
            return {
                type: 'c',
                matrix: buildMatrix(sheet)
            };
        } else if (header.includes('OTC3')) {
            return {
                type: 'i',
                matrix: buildMatrix(sheet)
            };
        }
    }
};

/**
 *
 */
const parseReplacements = (textareaValue) => {
    textareaValue = textareaValue.replaceAll('\n', ',');
    const parts = textareaValue.split(',');
    const output = [];
    for (const part of parts) {
        const sides = part.split('=');
        if (sides.length !== 2) {
            continue;
        }
        const left = processPattern(sides[0]);
        if (!left) {
            continue;
        }
        const right = sides[1]?.trim() || '';
        output.push({left, right});
    }
    return output;
};

/**
 * Converts a string that looks like a regular expression (e.g., "/pattern/flags")
 * into a native JavaScript RegExp object.
 */
const processPattern = (text) => {
    text = text.trim();

    // Check if the string starts and ends with a slash
    if (!text || typeof text !== 'string' || text.length < 2 || text[0] !== '/') {
        return text;
    }

    // Find the index of the last slash
    const lastSlashIndex = text.lastIndexOf('/');

    // If there's no closing slash, or the closing slash is the first character (meaning just "/"), it's invalid
    if (lastSlashIndex <= 0) {
        return text;
    }

    // Extract the pattern and flags
    // The pattern is everything between the first slash and the last slash
    const pattern = text.substring(1, lastSlashIndex);
    // The flags are everything after the last slash
    const flags = text.substring(lastSlashIndex + 1);

    try {
        // Create and return the RegExp object
        return new RegExp(pattern, flags);
    } catch (e) {
        return text;
    }
};

/**
 *
 */
const buildMatrix = (sheet) => {
    let matrix = XLSX.utils.sheet_to_json(sheet, {header: 1});
    const firstInvalidIndex = matrix.findIndex(row => row.length === 0);
    if (firstInvalidIndex !== -1) {
        matrix = matrix.slice(0, firstInvalidIndex);
    }
    return matrix;
};


/**
 *
 */
const prepareMatrixForDownload = (matrix) => {
    const fresh = JSON.parse(JSON.stringify(matrix));
    for (const row of fresh) {
        const {length} = row;
        let value = row[length - 1];
        if (typeof value === 'string' && value.startsWith('<')) {
            value = value.replace(/<.?div>/g, '');
            value = value.replace(/<br.?>/g, '\n');
            value = value.replace(/•/g, '');
            row[length - 1] = value;
        }
    }
    return fresh;
};


/**
 *
 */
const downloadMatrixAsXLSX = (matrix, filename = 'result.xlsx') => {
    // Step 1: Convert the 2D array to a worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(matrix);

    // Step 2: Create a new workbook and append the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Step 3: Write the workbook to binary string
    const wbout = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});

    // Step 4: Trigger download in browser
    const blob = new Blob([wbout], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default App;
