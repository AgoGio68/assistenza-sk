import React from 'react';

interface ConfirmModalProps {
    /** Testo principale del messaggio di conferma */
    message: string;
    /** Testo del pulsante di conferma (default: "Continua") */
    confirmLabel?: string;
    /** Testo del pulsante di annullamento (default: "Annulla") */
    cancelLabel?: string;
    /** Variante visiva del pulsante di conferma */
    variant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Modal di conferma riutilizzabile — sostituisce window.confirm().
 * Non blocca il thread JS ed è stilizzato coerentemente con il resto dell'app.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    message,
    confirmLabel = 'Continua',
    cancelLabel = 'Annulla',
    variant = 'warning',
    onConfirm,
    onCancel,
}) => {
    const variantColors: Record<string, string> = {
        danger:  'var(--danger-color, #f43f5e)',
        warning: '#f59e0b',
        primary: 'var(--accent-teal, #0891b2)',
    };

    const confirmColor = variantColors[variant];

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(3px)',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--panel-bg, #1e293b)',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    borderRadius: '12px',
                    padding: '1.75rem 2rem',
                    maxWidth: '420px',
                    width: '90%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                }}
            >
                <p
                    style={{
                        color: 'var(--text-primary, #f1f5f9)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        margin: '0 0 1.5rem',
                        whiteSpace: 'pre-line',
                    }}
                >
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.55rem 1.2rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            background: 'transparent',
                            color: 'var(--text-secondary, #94a3b8)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.55rem 1.2rem',
                            borderRadius: '8px',
                            border: 'none',
                            background: confirmColor,
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                        }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
