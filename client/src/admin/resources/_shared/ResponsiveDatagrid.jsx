import { useMediaQuery } from '@mui/material';
import { Datagrid, SimpleList } from 'react-admin';

/**
 * On mobile (<md) renders a SimpleList with the provided primaryText/secondaryText/tertiaryText
 * (record => string|node). On desktop renders a Datagrid with the children fields.
 */
const ResponsiveDatagrid = ({
    children,
    primaryText,
    secondaryText,
    tertiaryText,
    leftAvatar,
    rightAvatar,
    linkType = 'show',
    rowClick,
    ...rest
}) => {
    const isMobile = useMediaQuery((t) => t.breakpoints.down('md'));

    if (isMobile) {
        return (
            <SimpleList
                primaryText={primaryText}
                secondaryText={secondaryText}
                tertiaryText={tertiaryText}
                leftAvatar={leftAvatar}
                rightAvatar={rightAvatar}
                linkType={rowClick ? false : linkType}
                rowClick={rowClick}
            />
        );
    }

    return (
        <Datagrid rowClick={rowClick || linkType} {...rest}>
            {children}
        </Datagrid>
    );
};

export default ResponsiveDatagrid;
