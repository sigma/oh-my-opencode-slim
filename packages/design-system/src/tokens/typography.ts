/**
 * Pantheon Design System - Typography Tokens
 */

export const typography = {
  fonts: {
    // Characterful, tight-tracking sans for headers
    display: '"Cal Sans", "Inter", system-ui, sans-serif',
    // Refined, readable sans for body
    body: '"Inter", system-ui, sans-serif',
    // Precision mono for technical data
    mono: '"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace',
  },
  
  sizes: {
    xs: '0.75rem',    // 12px - Metadata
    sm: '0.875rem',   // 14px - Body small
    base: '1rem',      // 16px - Body regular
    lg: '1.125rem',   // 18px - Sub-headers
    xl: '1.25rem',    // 20px - Section headers
    '2xl': '1.5rem',  // 24px - Large headers
    '3xl': '1.875rem',// 30px - Page titles
    '4xl': '2.25rem', // 36px - Display
  },

  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
} as const;
