
import React from 'react';
import './Button.css';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const classes = [
  'btn',
  `btn-${variant}`,
  `btn-${size}`,
  loading && 'btn-loading',
  fullWidth && 'btn-full',
  disabled && 'btn-disabled'].
  filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled || loading}
      type={type}
      {...props}>
      
            {loading && <span className="btn-spinner"></span>}
            {icon && iconPosition === 'left' && <span className="btn-icon-left">{icon}</span>}
            <span className="btn-text">{children}</span>
            {icon && iconPosition === 'right' && <span className="btn-icon-right">{icon}</span>}
        </button>);

};

export default Button;
