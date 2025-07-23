import React from 'react';
import * as XLSX from 'xlsx';
import sampleC from '../samples/sample-c.xlsx';
import sampleI from '../samples/sample-i.xlsx';

// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const CSS = {
    root: {
        color: 'red',
    },
};

// =====================================================================================================================
//  C O M P O N E N T
// =====================================================================================================================
class App extends React.PureComponent {
    render() {
        return (
            <div css={CSS.root}>Hello, World!</div>
        );
    }

    componentDidMount() {
        window.addEventListener('dragover', (event) => event.preventDefault());
        window.addEventListener('drop', this.onWindowDrop);
        if (0) {
            this.onWindowDrop({
                preventDefault: ()=>0,
                dataTransfer: {
                    files:[sampleC, sampleI]
                }
            })
        }
    }

    onWindowDrop = async (event) => {
        event.preventDefault();
        const {dataTransfer = {}} = event;
        const {files = []} = dataTransfer;
        if (files.length !== 2) {
            alert('Please input exactly 2 files!');
            return;
        }
        for (const file of files) {
            const data = await getArrayBuffer(file);
            const workbook = XLSX.read(data, { type: 'array' });
            const about = analyzeWorkbook(workbook);
            if (!about) {
                alert('Unrecognized type of file!');
                return;
            }
            const matrix = XLSX.utils.sheet_to_json(about.sheet, { header: 1 });

            console.log('matrix:', matrix);
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
                sheet,
            }
        } else if (header.includes('OTC3')) {
            return {
                type: 'i',
                sheet,
            }
        }
    }
};

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default App;
