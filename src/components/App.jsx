import React from 'react';
import * as XLSX from 'xlsx';
import sampleC from '../samples/sample-c.xlsx';
import sampleI from '../samples/sample-i.xlsx';
import computeFinalMatrix from '../logic/computeFinalMatrix.js';
import assume from '../utils/assume.js';

// =====================================================================================================================
//  C O M P O N E N T
// =====================================================================================================================
class App extends React.PureComponent {
    state = {
        matrix: null,
    }

    render() {
        const {matrix} = this.state;
        return (
            <div>
                {matrix? this.renderMatrix(matrix) : 'Drop 2 files here...'}
            </div>
        );
    }

    renderMatrix(matrix) {
        const trs = [];
        const {length:rowsCount} = matrix;
        const columnCount = matrix[0].length;
        for (let i = 0; i < rowsCount; i++) {
            const tds = [
                <th key={i+'h'}>{i+1}</th>
            ];
            const row = matrix[i];
            for (let j = 0; j < columnCount; j++) {
                const cell = row[j];
                tds.push(<td key={i+'-' + j}>{cell}</td>)
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
            ths.push(<th key={'headerCell' + i}>{String.fromCharCode(65+i)}</th>);
        }
        return <tr key={'headerRow'}>{ths}</tr>;
    }

    componentDidMount() {
        window.addEventListener('dragover', (event) => event.preventDefault());
        window.addEventListener('drop', this.onWindowDrop);
        if (process.env?.NODE_ENV === 'development') {
            this.onWindowDrop({
                preventDefault: ()=>0,
                dataTransfer: {
                    files:[sampleC, sampleI]
                }
            })
        }
    }

    onWindowDrop = async (event) => {
        try {
            event.preventDefault();
            const {dataTransfer = {}} = event;
            const {files = []} = dataTransfer;
            assume(files.length === 2, 'Please input exactly 2 files!');
            const byType = {};
            for (const file of files) {
                const data = await getArrayBuffer(file);
                const workbook = XLSX.read(data, { type: 'array' });
                const result = analyzeWorkbook(workbook);
                assume(result, 'A file could not be recognized!');
                byType[result.type] = result.matrix;
            }
            this.setState({
                matrix: computeFinalMatrix(byType.c, byType.i),
            });
        } catch (error) {
            alert(error.message);
        }
    }



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
                matrix: buildMatrix(sheet),
            }
        } else if (header.includes('OTC3')) {
            return {
                type: 'i',
                matrix: buildMatrix(sheet),
            }
        }
    }
};

/**
 *
 */
const buildMatrix = (sheet) => {
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const firstInvalidIndex = matrix.findIndex(row => row.length === 0);
    if (firstInvalidIndex !== -1) {
        return matrix.slice(0, firstInvalidIndex);
    }
    return matrix;
};


// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default App;
