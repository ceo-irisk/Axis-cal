import { ThemeProvider as NextThemesProvider } from 'next-themes';

export const ThemeProvider = ({ children }) => {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
};

export { useTheme } from 'next-themes';
