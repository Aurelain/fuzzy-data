import React from 'react';
import * as XLSX from 'xlsx';
import sampleC from '../samples/sample-c.xlsx';
import sampleI from '../samples/sample-i.xlsx';
import computeFinalMatrix from '../logic/computeFinalMatrix.js';
import assume from '../utils/assume.js';

let xlsxFiles = [];

// =====================================================================================================================
//  C O M P O N E N T
// =====================================================================================================================
class App extends React.PureComponent {
    textareaRef = React.createRef();
    state = {
        matrix: null
    };

    render() {
        const {matrix} = this.state;
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
        console.log('___________');
        this.setState({
            matrix: []
        });
        try {
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
            this.setState({
                matrix: computeFinalMatrix(byType.c, byType.i, replacements)
            });
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
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
        const left = sides[0].trim();
        const right = sides[1].trim();
        if (left && right) {
            output.push({left, right});
        }
    }
    return output;
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


// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default App;
