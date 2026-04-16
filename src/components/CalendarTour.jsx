import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CalendarTour.css';

/**
 * CalendarTour – guided onboarding overlay for non-admin users.
 *
 * Props:
 *   userId        – current user id (used for localStorage key)
 *   isAdmin       – if true the component renders nothing
 *   googleConnected – whether Google Calendar is already connected
 */
const TOUR_STEPS = [
    {
        target: '#calendar-page-title',
        icon: '👋',
        title: 'Welcome to the Calendar!',
        body: 'This is your scheduling hub. Here you can see all upcoming sessions, manage your availability, and sync events with your personal calendar. Let\'s walk through the key features.',
        placement: 'bottom',
    },
    {
        target: '#calendar-grid',
        icon: '📅',
        title: 'Your Schedule at a Glance',
        body: 'The calendar shows all scheduled sessions for the month. Sessions you\'re assigned to are highlighted in green. If you\'ve connected Google Calendar, your personal events will also appear here so you can easily spot conflicts.',
        placement: 'top',
    },
    {
        target: '.rbc-toolbar',
        icon: '🔀',
        title: 'Switch Views',
        body: 'Use these controls to switch between Month, Week, and Day views, and navigate between months. Find the view that works best for you!',
        placement: 'bottom',
    },
    {
        target: '#btn-multi-select',
        icon: '✅',
        title: 'Mark Your Availability',
        body: 'Click a day to set your availability, or use "Select Multiple Days" to mark several days at once. This helps the team know when you\'re available.',
        placement: 'bottom',
    },
    {
        target: '#btn-export-ics',
        icon: '📤',
        title: 'Export Your Schedule',
        body: 'Export the schedule as an .ics file to sync with Apple Calendar, Google Calendar, Outlook, or any calendar app on your phone.',
        placement: 'bottom',
    },
    {
        target: '#btn-connect-google',
        icon: '🔗',
        title: 'Connect Google Calendar',
        body: 'Link your Google Calendar to see your personal events alongside the schedule. This makes it easy to spot conflicts so you can mark those days as unavailable.',
        placement: 'bottom',
        // This step is conditionally shown only when Google is not connected
        conditional: 'google',
    },
];

const STORAGE_PREFIX = 'calendarTourCompleted_';
const DISMISSED_PREFIX = 'calendarTourDismissed_';

function getStorageKey(userId) {
    return `${STORAGE_PREFIX}${userId}`;
}

function getDismissedKey(userId) {
    return `${DISMISSED_PREFIX}${userId}`;
}

/**
 * Calculate the best position for the tooltip relative to target element.
 */
function computePosition(targetRect, placement, tooltipWidth = 360) {
    const pad = 16;
    const arrowGap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Clamp tooltip width for small screens
    const tw = Math.min(tooltipWidth, vw - pad * 2);

    let top, left;

    if (placement === 'bottom') {
        top = targetRect.bottom + arrowGap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
    } else {
        // top
        top = targetRect.top - arrowGap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
    }

    // Clamp horizontal
    if (left < pad) left = pad;
    if (left + tw > vw - pad) left = vw - pad - tw;

    // If tooltip below would overflow, flip to top (and vice versa). For 'top',
    // we need to subtract the tooltip height, but we don't know it yet so use
    // an estimate.
    const estimatedHeight = 220;
    if (placement === 'bottom' && top + estimatedHeight > vh - pad) {
        top = targetRect.top - arrowGap - estimatedHeight;
        if (top < pad) top = pad;
    } else if (placement === 'top') {
        top = top - estimatedHeight;
        if (top < pad) {
            // flip to bottom
            top = targetRect.bottom + arrowGap;
        }
    }

    return { top, left, width: tw };
}

const CalendarTour = ({ userId, isAdmin, googleConnected }) => {
    const [isActive, setIsActive] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, width: 360 });
    const tooltipRef = useRef(null);
    const rafRef = useRef(null);

    // Determine filtered steps (exclude conditional steps that don't apply)
    const steps = TOUR_STEPS.filter(step => {
        if (step.conditional === 'google' && googleConnected) return false;
        return true;
    });

    // Check whether to show the prompt on mount
    useEffect(() => {
        if (isAdmin || !userId) return;
        const completed = localStorage.getItem(getStorageKey(userId));
        const dismissed = localStorage.getItem(getDismissedKey(userId));
        if (!completed && !dismissed) {
            // Small delay so the calendar has time to render
            const timer = setTimeout(() => setShowPrompt(true), 800);
            return () => clearTimeout(timer);
        }
    }, [userId, isAdmin]);

    // Scroll to and measure the current step's target element
    const measureTarget = useCallback(() => {
        if (!isActive || currentStep >= steps.length) return;

        const step = steps[currentStep];
        const el = document.querySelector(step.target);

        if (!el) {
            // If target not found, skip to next step
            if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            }
            return;
        }

        // Scroll element into view (centered)
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Allow scroll to settle, then measure
        rafRef.current = requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const padding = 8;
            const paddedRect = {
                top: rect.top - padding,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: rect.height + padding * 2,
                bottom: rect.bottom + padding,
                right: rect.right + padding,
            };
            setTargetRect(paddedRect);
            setTooltipPos(computePosition(paddedRect, step.placement));
        });
    }, [isActive, currentStep, steps]);

    useEffect(() => {
        measureTarget();

        // Re-measure on scroll/resize
        const handleReposition = () => measureTarget();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [measureTarget]);

    // After tooltip renders, re-adjust its position using the actual height
    useEffect(() => {
        if (!tooltipRef.current || !targetRect || !isActive) return;
        const th = tooltipRef.current.offsetHeight;
        const step = steps[currentStep];
        if (!step) return;

        const pad = 16;
        const arrowGap = 14;
        const vh = window.innerHeight;

        let top = tooltipPos.top;

        if (step.placement === 'top') {
            // Recalculate with real height
            top = targetRect.top - arrowGap - th;
            if (top < pad) {
                top = targetRect.bottom + arrowGap - (targetRect.height - targetRect.height); // flip
                top = targetRect.top + targetRect.height + arrowGap;
            }
        } else {
            // bottom – check overflow
            if (top + th > vh - pad) {
                top = targetRect.top - arrowGap - th;
                if (top < pad) top = pad;
            }
        }

        if (top !== tooltipPos.top) {
            setTooltipPos(prev => ({ ...prev, top }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStep, targetRect, isActive]);

    const startTour = () => {
        setShowPrompt(false);
        setCurrentStep(0);
        setIsActive(true);
    };

    const dismissPrompt = () => {
        setShowPrompt(false);
        localStorage.setItem(getDismissedKey(userId), 'true');
    };

    const endTour = (completed = false) => {
        setIsActive(false);
        setTargetRect(null);
        if (completed) {
            localStorage.setItem(getStorageKey(userId), 'true');
        }
        // Also mark dismissed so the prompt doesn't come back
        localStorage.setItem(getDismissedKey(userId), 'true');
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour(true);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const retakeTour = () => {
        localStorage.removeItem(getStorageKey(userId));
        localStorage.removeItem(getDismissedKey(userId));
        setCurrentStep(0);
        setIsActive(true);
    };

    // Don't render anything for admins
    if (isAdmin) return null;

    const completed = localStorage.getItem(getStorageKey(userId));
    const dismissed = localStorage.getItem(getDismissedKey(userId));
    const step = steps[currentStep];

    return (
        <>
            {/* ── Prompt Banner ── */}
            {showPrompt && !isActive && (
                <div className="tour-prompt" id="tour-prompt-banner">
                    <div className="tour-prompt-text">
                        <span>✨</span>
                        <span>New here? Take a quick tour of the calendar!</span>
                    </div>
                    <div className="tour-prompt-actions">
                        <button className="tour-prompt-start" onClick={startTour}>
                            Show Me Around
                        </button>
                        <button className="tour-prompt-dismiss" onClick={dismissPrompt} title="Dismiss">
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* ── Retake Tour button (shown when tour has been completed/dismissed and prompt is hidden) ── */}
            {!isActive && !showPrompt && (completed || dismissed) && (
                <button className="tour-retake" onClick={retakeTour} title="Retake the calendar tour">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Tour
                </button>
            )}

            {/* ── Active Tour Overlay ── */}
            {isActive && targetRect && step && (
                <div className="tour-overlay active">
                    {/* Spotlight cutout */}
                    <div
                        className="tour-spotlight"
                        style={{
                            top: targetRect.top,
                            left: targetRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                        }}
                    />

                    {/* Click-catcher for overlay area (clicking outside closes nothing — we force next/skip) */}
                    <div
                        className="tour-overlay-bg"
                        style={{ background: 'transparent' }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Tooltip */}
                    <div
                        className="tour-tooltip"
                        ref={tooltipRef}
                        key={currentStep} /* re-trigger animation on step change */
                        style={{
                            top: tooltipPos.top,
                            left: tooltipPos.left,
                            width: tooltipPos.width,
                        }}
                    >
                        <span className="tour-tooltip-icon">{step.icon}</span>
                        <h3 className="tour-tooltip-title">{step.title}</h3>
                        <p className="tour-tooltip-body">{step.body}</p>

                        {/* Progress dots */}
                        <div className="tour-progress">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`tour-dot ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                                />
                            ))}
                            <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>
                                {currentStep + 1} / {steps.length}
                            </span>
                        </div>

                        {/* Controls */}
                        <div className="tour-controls">
                            <button className="tour-btn tour-btn-skip" onClick={() => endTour(false)}>
                                Skip Tour
                            </button>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {currentStep > 0 && (
                                    <button className="tour-btn tour-btn-back" onClick={prevStep}>
                                        Back
                                    </button>
                                )}
                                {currentStep < steps.length - 1 ? (
                                    <button className="tour-btn tour-btn-next" onClick={nextStep}>
                                        Next
                                    </button>
                                ) : (
                                    <button className="tour-btn tour-btn-finish" onClick={() => endTour(true)}>
                                        Finish Tour ✓
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CalendarTour;
