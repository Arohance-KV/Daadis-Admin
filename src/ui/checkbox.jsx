// src/ui/checkbox.jsx

import * as React from 'react';
import { cn } from '../lib/utils'; // utility for conditional classNames

const Checkbox = React.forwardRef(({ className = '', checked, indeterminate, onCheckedChange, ...props }, ref) => {
  const inputRef = React.useRef(null);

  // Set indeterminate property manually on the input element
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <input
      type="checkbox"
      ref={node => {
        inputRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      checked={checked}
      onChange={e => {
        if (onCheckedChange) onCheckedChange(e.target.checked);
      }}
      className={cn(
        'h-4 w-4 rounded-[6px] border border-border accent-primary',
        className
      )}
      {...props}
    />
  );
});
Checkbox.displayName = 'Checkbox';

export default Checkbox;
