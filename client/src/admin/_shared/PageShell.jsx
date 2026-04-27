import { Box, Stack, Typography } from '@mui/material';
import {
    cardHeaderSx,
    cardSx,
    cardTitleSx,
    pageDescriptionSx,
    pageHeaderSx,
    pageStackSx,
    pageTitleSx
} from './tokens';

export const PageShell = ({ title, description, actions, children, maxWidth = 1280 }) => (
    <Box sx={{ width: '100%', maxWidth, mx: 'auto' }}>
        {(title || actions) && (
            <Box sx={pageHeaderSx}>
                <Box sx={{ minWidth: 0 }}>
                    {title && (
                        <Typography component="h1" sx={pageTitleSx} noWrap={false}>
                            {title}
                        </Typography>
                    )}
                    {description && (
                        <Typography sx={pageDescriptionSx}>{description}</Typography>
                    )}
                </Box>
                {actions && (
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ flexWrap: 'wrap', alignItems: 'center', rowGap: 1 }}
                    >
                        {actions}
                    </Stack>
                )}
            </Box>
        )}
        <Stack sx={pageStackSx}>{children}</Stack>
    </Box>
);

export const PageSection = ({ title, description, actions, children, sx, padded = true, ...rest }) => (
    <Box sx={[padded ? cardSx : { ...cardSx, p: 0 }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>
        {(title || actions) && (
            <Box sx={cardHeaderSx}>
                <Box sx={{ minWidth: 0 }}>
                    {title && <Typography sx={cardTitleSx}>{title}</Typography>}
                    {description && (
                        <Typography sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.25 }}>
                            {description}
                        </Typography>
                    )}
                </Box>
                {actions && (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {actions}
                    </Stack>
                )}
            </Box>
        )}
        {children}
    </Box>
);

export default PageShell;
