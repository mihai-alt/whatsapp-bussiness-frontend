import { useEffect, useRef, useState } from 'react';
import { Moon, Sun } from '../lib/lucideIcons';
import { useTheme } from '../context/ThemeContext';
import SafeIcon from './SafeIcon';

const THEME_DELAY_MS = 220;

/**
 * Sun/moon toggle: icon style flips first, then the app theme follows
 * (matches the recorded light ↔ dark interaction).
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme();
  const [displayTheme, setDisplayTheme] = useState(theme);
  const [pressed, setPressed] = useState(false);
  const busyRef = useRef(false);
  const timersRef = useRef([]);

  useEffect(() => {
    if (!busyRef.current) setDisplayTheme(theme);
  }, [theme]);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    []
  );

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const schedule = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const onToggle = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    clearTimers();

    const next = displayTheme === 'dark' ? 'light' : 'dark';

    setPressed(true);
    // 1) Button style / icon first
    setDisplayTheme(next);

    // 2) Then apply the page theme
    schedule(() => {
      setTheme(next);
      setPressed(false);
      busyRef.current = false;
    }, THEME_DELAY_MS);
  };

  const isDarkIcon = displayTheme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDarkIcon ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDarkIcon ? 'Light theme' : 'Dark theme'}
      className={`theme-toggle ${pressed ? 'is-pressed' : ''} ${isDarkIcon ? 'is-dark' : 'is-light'} ${className}`}
    >
      <span className="theme-toggle__glow" aria-hidden />
      {isDarkIcon ? (
        <SafeIcon icon={Moon} size={18} strokeWidth={1.75} className="theme-toggle__icon" />
      ) : (
        <SafeIcon icon={Sun} size={18} strokeWidth={1.75} className="theme-toggle__icon" />
      )}
    </button>
  );
}
