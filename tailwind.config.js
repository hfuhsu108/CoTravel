/** @type {import('tailwindcss').Config} */
// 所有色彩/圓角/陰影都指向 index.css 的 CSS 變數（design tokens）。
// 雙色系（--primary / --pink）做成可換 theme：改 :root 變數即可全站連動，
// 其餘衍生色用 color-mix() 在 index.css 推導，這裡只負責把它們暴露成 utility。
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          deep: 'var(--primary-deep)',
          soft: 'var(--primary-soft)',
          softer: 'var(--primary-softer)',
        },
        pink: {
          DEFAULT: 'var(--pink)',
          deep: 'var(--pink-deep)',
          soft: 'var(--pink-soft)',
        },
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          soft: 'var(--ok-soft)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
        },
        danger: 'var(--danger)',
        map: {
          bg: 'var(--map-bg)',
          water: 'var(--map-water)',
          park: 'var(--map-park)',
          road: 'var(--map-road)',
          'road-minor': 'var(--map-road-minor)',
          block: 'var(--map-block)',
        },
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      boxShadow: {
        1: 'var(--sh-1)',
        2: 'var(--sh-2)',
        3: 'var(--sh-3)',
        pop: 'var(--sh-pop)',
      },
      fontFamily: {
        sans: 'var(--ff)',
        round: 'var(--ff-round)',
      },
      // prototype 的轉場：列表項淡入上移、sheet 由下滑入、遮罩淡入、通知橫幅落下
      keyframes: {
        fadeup: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideup: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        fade: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        dropin: {
          from: { opacity: '0', transform: 'translateY(-18px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        fadeup: 'fadeup 0.35s ease both',
        slideup: 'slideup 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
        fade: 'fade 0.2s ease forwards',
        dropin: 'dropin 0.35s cubic-bezier(0.2, 0.9, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
