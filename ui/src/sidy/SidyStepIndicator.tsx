import * as React from 'react';

const STEP_LABELS = ['Tag', 'Start', 'Ende'];
const ACTIVE = '#8b5cf6';
const DONE = '#22c55e';
const PENDING = '#d1d5db';

export const SidyStepIndicator: React.FC<{step: number}> = ({step}) => {
    return (
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32}}>
            {STEP_LABELS.map((label, i) => {
                const idx = i + 1;
                const isDone = step > idx;
                const isActive = step === idx;
                const circleColor = isDone ? DONE : isActive ? ACTIVE : PENDING;
                return (
                    <React.Fragment key={idx}>
                        {i > 0 ? (
                            <div style={{
                                width: 60,
                                height: 3,
                                backgroundColor: step > idx ? DONE : '#e5e7eb',
                                borderRadius: 2,
                            }} />
                        ) : null}
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
                            <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: circleColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ffffff',
                                fontSize: 16,
                                fontWeight: 700,
                                transition: 'all 0.3s',
                            }}>
                                {isDone ? '✓' : idx}
                            </div>
                            <span style={{
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#1f2937' : isDone ? '#22c55e' : '#9ca3af',
                            }}>
                                {label}
                            </span>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};
