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
        '*': {
            boxSizing: 'border-box',
            userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            WebkitTouchCallout: 'none',
        },
        html: {
            lineHeight: 1,
            textSizeAdjust: '100%',
        },
        '#root': {
            position: 'fixed',
            inset: 0,
        },
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
