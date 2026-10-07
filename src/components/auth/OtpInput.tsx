import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value = '',
  onChange,
  onComplete,
  disabled = false
}) => {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first empty box or box 0 on mount
    const firstEmpty = digits.findIndex(d => !d);
    const targetIdx = firstEmpty !== -1 ? firstEmpty : 0;
    inputRefs.current[targetIdx]?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;

    // Take last entered character if multiple typed
    const char = val[val.length - 1];

    const newDigits = [...digits];
    newDigits[idx] = char;
    const combined = newDigits.join('');

    onChange(combined);

    if (combined.length === 6 && onComplete) {
      onComplete(combined);
    } else if (idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[idx]) {
        newDigits[idx] = '';
        onChange(newDigits.join(''));
      } else if (idx > 0) {
        newDigits[idx - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (!pasted) return;

    onChange(pasted);
    if (pasted.length === 6 && onComplete) {
      onComplete(pasted);
    }
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 my-4" onPaste={handlePaste}>
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx]}
          disabled={disabled}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          className={`w-11 h-13 text-center text-xl font-bold rounded-xl transition-all outline-none shadow-sm ${
            digits[idx]
              ? 'bg-purple-500/20 text-purple-200 border-2 border-purple-500 shadow-purple-500/10'
              : 'bg-slate-900/70 text-white border border-slate-700/60 focus:border-purple-400 focus:bg-slate-800'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500'}`}
        />
      ))}
    </div>
  );
};
