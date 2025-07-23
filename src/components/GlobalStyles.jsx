import React from 'react';
import {Global, ThemeProvider} from '@emotion/react';

/*
<GlobalStyle>
    ...
</GlobalStyles>
 */
// =====================================================================================================================
//  D E C L A R A T I O N S
// =====================================================================================================================
const THEME = {};
const GLOBAL = [
    {
        html: {
            fontFamily: 'monospace',
        },
        table: {
            borderCollapse: 'collapse',
        },
        td: {
            border: 'solid 1px #000',
        },
        th: {
            border: 'solid 1px #000',
            userSelect: 'none',
        }
    },
];

// =====================================================================================================================
//  C O M P O N E N T
// =====================================================================================================================
class GlobalStyles extends React.PureComponent {
    render() {
        const {children} = this.props;
        return (
            <ThemeProvider theme={THEME}>
                <Global styles={GLOBAL} />
                {children}
            </ThemeProvider>
        );
    }
}

// =====================================================================================================================
//  E X P O R T
// =====================================================================================================================
export default GlobalStyles;
