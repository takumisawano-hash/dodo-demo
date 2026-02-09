import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useColorScheme, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = '@dodo_theme_mode';

// Color definitions
const lightColors = {
  // Backgrounds
  background: '#FAFAFA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  
  // Text
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#888888',
  textInverse: '#FFFFFF',
  
  // Accent
  primary: '#FF9800',
  primaryLight: '#FFE0B2',
  primaryDark: '#F57C00',
  
  // Status
  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFC107',
  warningLight: '#FFF8E1',
  error: '#F44336',
  errorLight: '#FFEBEE',
  info: '#2196F3',
  infoLight: '#E3F2FD',
  
  // UI Elements
  border: '#E0E0E0',
  divider: '#EEEEEE',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000000',
  
  // Progress
  progressBackground: '#FFE0B2',
  progressFill: '#FF9800',
  
  // Cards
  tipBackground: '#FFF9C4',
  progressCardBackground: '#FFF3E0',
};

const darkColors = {
  // Backgrounds
  background: '#121212',
  surface: '#1E1E1E',
  card: '#2C2C2C',
  
  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',
  textInverse: '#121212',
  
  // Accent
  primary: '#FFB74D',
  primaryLight: '#3D2E1F',
  primaryDark: '#FF9800',
  
  // Status
  success: '#81C784',
  successLight: '#1B2E1B',
  warning: '#FFD54F',
  warningLight: '#2E2A1B',
  error: '#E57373',
  errorLight: '#2E1B1B',
  info: '#64B5F6',
  infoLight: '#1B2A3D',
  
  // UI Elements
  border: '#404040',
  divider: '#333333',
  overlay: 'rgba(0, 0, 0, 0.7)',
  shadow: '#000000',
  
  // Progress
  progressBackground: '#3D2E1F',
  progressFill: '#FFB74D',
  
  // Cards
  tipBackground: '#2E2A1B',
  progressCardBackground: '#3D2E1F',
};

export type ThemeColors = typeof lightColors;
export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeContextType {
  colors: ThemeColors;
  isDark: boolean;
  colorScheme: ColorSchemeName;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme && ['system', 'light', 'dark'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
      } catch (e) {
        // Ignore errors
      }
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      // Ignore errors
    }
  };

  // Determine actual dark mode based on themeMode
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  
  const colors = isDark ? darkColors : lightColors;
  const colorScheme: ColorSchemeName = isDark ? 'dark' : 'light';

  return (
    <ThemeContext.Provider value={{ colors, isDark, colorScheme, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback for components outside provider
    return {
      colors: lightColors,
      isDark: false,
      colorScheme: 'light',
      themeMode: 'system',
      setThemeMode: () => {},
    };
  }
  return context;
}

// Helper to get agent card background with transparency
export function getAgentCardBackground(color: string, isDark: boolean): string {
  return isDark ? color + '30' : color + '20';
}
