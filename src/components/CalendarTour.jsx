import React, { useState, useEffect, useCallback, useRef } from 'react';
import './CalendarTour.css';

/**
 * CalendarTour – guided onboarding overlay for calendar users.
 *
 * Renders a **member tour** for regular users and a separate **admin tour**
 * for users with elevated calendar permissions (schedule_generate,
 * assignments_edit, templates_manage, schedule_export, or full admin).
 *
 * Props:
 *   userId            – current user id (used for localStorage key)
 *   isAdmin           – full admin flag
 *   googleConnected   – whether Google Calendar is already connected
 *   permissions       – object of boolean permission flags:
 *     { isScheduleGenerate, isAssignmentsEdit, isTemplatesManage, isScheduleExport }
 */

// ─── Member Tour Steps ──────────────────────────────────────────────────────
const MEMBER_STEPS = [
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
        placement: 'center',
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
        conditional: 'google',
    },
];

// ─── Admin Tour Steps ───────────────────────────────────────────────────────
const ADMIN_STEPS = [
    {
        target: '#calendar-page-title',
        icon: '🛡️',
        title: 'Calendar Admin Overview',
        body: 'As a calendar admin, you have extra tools to manage the schedule. This tour will walk you through the features available to you beyond the standard member view.',
        placement: 'bottom',
    },
    {
        target: '#calendar-grid',
        icon: '📅',
        title: 'The Schedule Grid',
        body: 'The calendar displays all sessions for the month. Just like members, you can see your own assignments and availability here. The admin tools below help you manage the overall schedule.',
        placement: 'center',
    },
    {
        target: '#btn-multi-select',
        icon: '✅',
        title: 'Availability Management',
        body: 'Select individual or multiple days to manage your own availability. Members also use this to indicate when they\'re unavailable.',
        placement: 'bottom',
    },
    {
        target: '#btn-auto-generate',
        icon: '🤖',
        title: 'Auto Generate Assignments',
        body: 'Automatically generate role assignments for an entire month based on member availability and roles. You can review and tweak the draft before saving.',
        placement: 'bottom',
        conditional: 'scheduleGenerate',
    },
    {
        target: '#btn-recurring',
        icon: '🔄',
        title: 'Recurring Sessions',
        body: 'Set up recurring session templates (weekly rehearsals, services, etc.) and generate sessions for any month in one click. No more creating sessions one by one!',
        placement: 'bottom',
        conditional: 'templatesManage',
    },
    {
        target: '#btn-save-schedule',
        icon: '💾',
        title: 'Save & Publish',
        body: 'After generating or editing assignments, click "Save Schedule" to publish them. Once saved, members will see their assignments and availability locks in.',
        placement: 'bottom',
        conditional: 'saveSchedule',
    },
    {
        target: '#btn-export-csv',
        icon: '📊',
        title: 'Export Reports',
        body: 'Export the schedule as CSV or PDF for printing, sharing in group chats, or archiving. Great for distributing the monthly schedule to the team.',
        placement: 'bottom',
        conditional: 'scheduleExport',
    },
    {
        target: '#btn-export-ics',
        icon: '📤',
        title: 'Calendar Sync',
        body: 'Export an .ics file for syncing the schedule with external calendar apps. Members can also do this from their own view.',
        placement: 'bottom',
    },
    {
        target: '#btn-connect-google',
        icon: '🔗',
        title: 'Google Calendar Integration',
        body: 'Link your Google Calendar to see your personal events alongside the schedule. This helps you spot your own conflicts when marking your own availability.',
        placement: 'bottom',
        conditional: 'google',
    },
];

// ─── Storage Key Helpers ────────────────────────────────────────────────────
const STORAGE_PREFIX = 'calendarTourCompleted_';
const DISMISSED_PREFIX = 'calendarTourDismissed_';

function getStorageKey(userId, variant) {
    return `${STORAGE_PREFIX}${variant}_${userId}`;
}

function getDismissedKey(userId, variant) {
    return `${DISMISSED_PREFIX}${variant}_${userId}`;
}

/**
 * Calculate the best position for the tooltip relative to target element.
 */
function computePosition(targetRect, placement, tooltipWidth = 360) {
    const pad = 16;
    const arrowGap = 14;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const tw = Math.min(tooltipWidth, vw - pad * 2);
    let top, left;

    if (placement === 'center') {
        // Center the tooltip in the viewport, overlaid on the target
        const estimatedHeight = 220;
        top = Math.max(pad, (vh - estimatedHeight) / 2);
        left = Math.max(pad, (vw - tw) / 2);
        return { top, left, width: tw };
    }

    if (placement === 'bottom') {
        top = targetRect.bottom + arrowGap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
    } else {
        top = targetRect.top - arrowGap;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
    }

    if (left < pad) left = pad;
    if (left + tw > vw - pad) left = vw - pad - tw;

    const estimatedHeight = 220;
    if (placement === 'bottom' && top + estimatedHeight > vh - pad) {
        top = targetRect.top - arrowGap - estimatedHeight;
        if (top < pad) top = pad;
    } else if (placement === 'top') {
        top = top - estimatedHeight;
        if (top < pad) {
            top = targetRect.bottom + arrowGap;
        }
    }

    return { top, left, width: tw };
}

const CalendarTour = ({ userId, isAdmin, googleConnected, permissions = {} }) => {
    const {
        isScheduleGenerate = false,
        isAssignmentsEdit = false,
        isTemplatesManage = false,
        isScheduleExport = false,
    } = permissions;

    // Determine which tour variant to show
    const hasAdminPerms = isAdmin || isScheduleGenerate || isAssignmentsEdit || isTemplatesManage || isScheduleExport;
    const tourVariant = hasAdminPerms ? 'admin' : 'member';
    const baseSteps = hasAdminPerms ? ADMIN_STEPS : MEMBER_STEPS;

    const [isActive, setIsActive] = useState(false);
    const [showPrompt, setShowPrompt] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, width: 360 });
    const tooltipRef = useRef(null);
    const rafRef = useRef(null);

    // Filter steps based on conditions
    const steps = baseSteps.filter(step => {
        if (step.conditional === 'google' && googleConnected) return false;
        if (step.conditional === 'scheduleGenerate' && !isScheduleGenerate && !isAdmin) return false;
        if (step.conditional === 'templatesManage' && !isTemplatesManage && !isAdmin) return false;
        if (step.conditional === 'saveSchedule' && !isAssignmentsEdit && !isScheduleGenerate && !isAdmin) return false;
        if (step.conditional === 'scheduleExport' && !isScheduleExport && !isAdmin) return false;
        return true;
    });

    // Check whether to show the prompt on mount
    useEffect(() => {
        if (!userId) return;
        const completed = localStorage.getItem(getStorageKey(userId, tourVariant));
        const dismissed = localStorage.getItem(getDismissedKey(userId, tourVariant));
        if (!completed && !dismissed) {
            const timer = setTimeout(() => setShowPrompt(true), 800);
            return () => clearTimeout(timer);
        }
    }, [userId, tourVariant]);

    // Scroll to and measure the current step's target element
    const measureTarget = useCallback(() => {
        if (!isActive || currentStep >= steps.length) return;

        const step = steps[currentStep];
        const el = document.querySelector(step.target);

        if (!el) {
            if (currentStep < steps.length - 1) {
                setCurrentStep(prev => prev + 1);
            }
            return;
        }

        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        rafRef.current = requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const padding = 8;

            // For elements taller than the viewport, clamp the spotlight
            // to the visible portion so it doesn't extend off-screen
            const clampedTop = Math.max(0, rect.top) - padding;
            const clampedBottom = Math.min(vh, rect.bottom) + padding;

            const paddedRect = {
                top: clampedTop,
                left: rect.left - padding,
                width: rect.width + padding * 2,
                height: clampedBottom - clampedTop,
                bottom: clampedBottom,
                right: rect.right + padding,
            };
            setTargetRect(paddedRect);
            setTooltipPos(computePosition(paddedRect, step.placement));
        });
    }, [isActive, currentStep, steps]);

    useEffect(() => {
        measureTarget();

        const handleReposition = () => measureTarget();
        window.addEventListener('resize', handleReposition);
        window.addEventListener('scroll', handleReposition, true);
        return () => {
            window.removeEventListener('resize', handleReposition);
            window.removeEventListener('scroll', handleReposition, true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [measureTarget]);

    // Re-adjust tooltip position using actual height
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
            top = targetRect.top - arrowGap - th;
            if (top < pad) {
                top = targetRect.top + targetRect.height + arrowGap;
            }
        } else {
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
        localStorage.setItem(getDismissedKey(userId, tourVariant), 'true');
    };

    const endTour = (completed = false) => {
        setIsActive(false);
        setTargetRect(null);
        if (completed) {
            localStorage.setItem(getStorageKey(userId, tourVariant), 'true');
        }
        localStorage.setItem(getDismissedKey(userId, tourVariant), 'true');
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
        localStorage.removeItem(getStorageKey(userId, tourVariant));
        localStorage.removeItem(getDismissedKey(userId, tourVariant));
        setCurrentStep(0);
        setIsActive(true);
    };

    if (!userId) return null;

    const completed = localStorage.getItem(getStorageKey(userId, tourVariant));
    const dismissed = localStorage.getItem(getDismissedKey(userId, tourVariant));
    const step = steps[currentStep];

    const promptMessage = hasAdminPerms
        ? 'New here? Take a quick tour of the calendar admin tools!'
        : 'New here? Take a quick tour of the calendar!';

    return (
        <>
            {/* ── Prompt Banner ── */}
            {showPrompt && !isActive && (
                <div className="tour-prompt" id="tour-prompt-banner">
                    <div className="tour-prompt-text">
                        <span>{hasAdminPerms ? '🛡️' : '✨'}</span>
                        <span>{promptMessage}</span>
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

            {/* ── Retake Tour button ── */}
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
                    <div
                        className="tour-spotlight"
                        style={{
                            top: targetRect.top,
                            left: targetRect.left,
                            width: targetRect.width,
                            height: targetRect.height,
                        }}
                    />

                    <div
                        className="tour-overlay-bg"
                        style={{ background: 'transparent' }}
                        onClick={(e) => e.stopPropagation()}
                    />

                    <div
                        className="tour-tooltip"
                        ref={tooltipRef}
                        key={`${tourVariant}-${currentStep}`}
                        style={{
                            top: tooltipPos.top,
                            left: tooltipPos.left,
                            width: tooltipPos.width,
                        }}
                    >
                        <span className="tour-tooltip-icon">{step.icon}</span>
                        <h3 className="tour-tooltip-title">{step.title}</h3>
                        <p className="tour-tooltip-body">{step.body}</p>

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
