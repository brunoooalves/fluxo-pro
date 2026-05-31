/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // =============================================
      // DESIGN TOKENS - Real State Portal
      // =============================================
      // Mude os valores aqui para alterar TODO o sistema
      // de uma vez. Cada componente referencia esses tokens.

      colors: {
        // Brand
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1', // primary
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Superfícies e backgrounds
        surface: {
          base:    '#F7F6F3',  // background geral
          card:    '#FFFFFF',  // cards e containers
          hover:   '#FAFAF8',  // hover em rows
          muted:   '#F3F2EE',  // inputs, tags inativas
          border:  '#E8E7E3',  // bordas
        },
        // Texto
        ink: {
          base:    '#1A1A1A',  // texto principal
          muted:   '#6B7280',  // texto secundário
          faint:   '#9CA3AF',  // texto terciário, placeholders
        },
        // Status semânticos
        status: {
          success:      '#10B981',
          'success-bg': '#D1FAE5',
          'success-text':'#065F46',
          warning:      '#F59E0B',
          'warning-bg': '#FEF3C7',
          'warning-text':'#92400E',
          error:        '#EF4444',
          'error-bg':   '#FEE2E2',
          'error-text': '#991B1B',
          info:         '#3B82F6',
          'info-bg':    '#DBEAFE',
          'info-text':  '#1E3A5F',
        },
      },

      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },

      fontSize: {
        'xs':   ['0.75rem',  { lineHeight: '1rem' }],     // 12px
        'sm':   ['0.8125rem',{ lineHeight: '1.25rem' }],   // 13px
        'base': ['0.875rem', { lineHeight: '1.5rem' }],    // 14px
        'lg':   ['1rem',     { lineHeight: '1.5rem' }],    // 16px
        'xl':   ['1.125rem', { lineHeight: '1.75rem' }],   // 18px
        '2xl':  ['1.25rem',  { lineHeight: '1.75rem' }],   // 20px
        '3xl':  ['1.75rem',  { lineHeight: '2.25rem' }],   // 28px
        '4xl':  ['2.125rem', { lineHeight: '2.5rem' }],    // 34px
      },

      borderRadius: {
        'sm':   '6px',
        'md':   '8px',
        'lg':   '12px',
        'xl':   '14px',
        '2xl':  '20px',
      },

      boxShadow: {
        'xs':    '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm':    '0 1px 4px rgba(0, 0, 0, 0.06)',
        'md':    '0 2px 12px rgba(0, 0, 0, 0.06)',
        'lg':    '0 8px 30px rgba(0, 0, 0, 0.08)',
        'xl':    '0 12px 40px rgba(0, 0, 0, 0.12)',
        'modal': '0 24px 80px rgba(0, 0, 0, 0.2)',
        'brand': '0 4px 20px rgba(99, 102, 241, 0.4)',
      },

      spacing: {
        '4.5': '1.125rem', // 18px
        '13':  '3.25rem',  // 52px
        '15':  '3.75rem',  // 60px
      },

      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'fade-up':    'fadeUp 0.4s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },

      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
