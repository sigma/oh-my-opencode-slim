/**
 * Pantheon Design System - Color Tokens
 * 
 * A high-contrast, tech-focused palette designed for clarity and visual impact.
 */

export const colors = {
  // Neutral Base
  obsidian: {
    DEFAULT: '#0A0A0B',
    soft: '#121214',
    surface: '#161618',
    muted: '#242427',
  },
  
  // Primary Accents
  cyan: {
    DEFAULT: '#00F5FF', // Orchestrator
    glow: 'rgba(0, 245, 255, 0.2)',
    dim: '#00A3AB',
  },
  
  purple: {
    DEFAULT: '#BD00FF', // Designer
    glow: 'rgba(189, 0, 255, 0.2)',
    dim: '#7D00A8',
  },
  
  // Status
  emerald: {
    DEFAULT: '#00FF94', // Success/Active
    glow: 'rgba(0, 255, 148, 0.2)',
  },
  
  amber: {
    DEFAULT: '#FFB800', // Warning/Thinking
    glow: 'rgba(255, 184, 0, 0.2)',
  },
  
  crimson: {
    DEFAULT: '#FF003D', // Error/Alert
    glow: 'rgba(255, 0, 61, 0.2)',
  },

  // Functional
  text: {
    primary: '#F8F8F8',
    secondary: '#A1A1AA',
    muted: '#71717A',
    disabled: '#3F3F46',
  }
} as const;
