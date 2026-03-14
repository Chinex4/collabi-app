import { PRIMARY_COLOR, SECONDARY_COLOR } from '@/constants';

export const theme = {
  colors: {
    primary: PRIMARY_COLOR,
    primaryDark: SECONDARY_COLOR,
    accent: '#A25CDE',
    background: '#F6F4FB',
    surface: '#FFFFFF',
    surfaceMuted: '#F2EBFA',
    border: '#E5D8F4',
    text: '#1F1230',
    textMuted: '#6E5F83',
    success: '#1E9E63',
    warning: '#EFA72C',
    danger: '#D64550',
    info: '#2F80ED',
  },
  shadow: {
    card: {
      shadowColor: '#2A0B49',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
  },
};
