// components/ui/Card.jsx
import React from 'react';
import './Card.css';

const Card = ({ 
    children, 
    title, 
    subtitle,
    icon,
    actions,
    hoverable = false,
    loading = false,
    className = '',
    ...props 
}) => {
    return (
        <div className={`card ${hoverable ? 'card-hoverable' : ''} ${className}`} {...props}>
            {loading ? (
                <div className="card-skeleton">
                    <div className="skeleton-title"></div>
                    <div className="skeleton-content"></div>
                </div>
            ) : (
                <>
                    {(title || icon) && (
                        <div className="card-header">
                            {icon && <div className="card-icon">{icon}</div>}
                            <div className="card-header-text">
                                {title && <h3 className="card-title">{title}</h3>}
                                {subtitle && <p className="card-subtitle">{subtitle}</p>}
                            </div>
                            {actions && <div className="card-actions">{actions}</div>}
                        </div>
                    )}
                    <div className="card-content">{children}</div>
                </>
            )}
        </div>
    );
};

export default Card;