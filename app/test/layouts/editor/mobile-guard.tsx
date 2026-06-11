import React, { useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * MobileFullscreenWrapper
 * 
 * A wrapper component that detects mobile devices and prevents rendering of children
 * until the user enters fullscreen mode with landscape orientation.
 * 
 * @param children - The main app/content that requires fullscreen landscape experience
 */
interface MobileFullscreenWrapperProps {
    children: ReactNode;
    /**
     * Custom message to display on the overlay
     * @default "Go to full screen for the smooth experience"
     */
    message?: string;
    /**
     * Custom button text
     * @default "Enter Landscape Fullscreen"
     */
    buttonText?: string;
}

const MobileFullscreenWrapper: React.FC<MobileFullscreenWrapperProps> = ({
    children,
    message = "Go to full screen for the smooth experience",
    buttonText = "Enter Landscape Fullscreen"
}) => {
    const [isMobile, setIsMobile] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    // Utility: Detect mobile device (user agent + screen width fallback)
    const detectMobile = useCallback((): boolean => {
        // User agent detection for mobile devices
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
        const isMobileUA = mobileRegex.test(userAgent);

        // Width-based detection for tablets or smaller devices
        const isMobileWidth = window.innerWidth <= 768;

        // Also consider "pointer: coarse" for touch devices, but UA + width is sufficient
        return isMobileUA || isMobileWidth;
    }, []);

    // Update mobile state on mount and resize
    useEffect(() => {
        const updateMobile = () => {
            setIsMobile(detectMobile());
        };

        updateMobile();
        window.addEventListener('resize', updateMobile);

        return () => {
            window.removeEventListener('resize', updateMobile);
        };
    }, [detectMobile]);

    // Monitor fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreenElement = document.fullscreenElement;
            setIsFullscreen(!!fullscreenElement);

            // If fullscreen was exited, unlock orientation if needed
            if (!fullscreenElement && screen.orientation && screen.orientation.unlock) {
                try {
                    screen.orientation.unlock();
                } catch (err) {
                    console.warn("Failed to unlock orientation:", err);
                }
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        // For Safari vendor prefixes
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        // Initial check
        handleFullscreenChange();

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    // Request fullscreen and lock to landscape
    const enterLandscapeFullscreen = useCallback(async () => {
        try {
            const element = document.documentElement;

            // Request fullscreen mode
            if (element.requestFullscreen) {
                await element.requestFullscreen();
            } else if ((element as any).webkitRequestFullscreen) {
                await (element as any).webkitRequestFullscreen();
            } else if ((element as any).mozRequestFullScreen) {
                await (element as any).mozRequestFullScreen();
            } else if ((element as any).msRequestFullscreen) {
                await (element as any).msRequestFullscreen();
            } else {
                console.warn("Fullscreen API not supported");
                return;
            }

            // Lock orientation to landscape after entering fullscreen
            if (screen.orientation && screen.orientation.lock) {
                try {
                    await screen.orientation.lock('landscape');
                } catch (orientError) {
                    console.warn("Orientation lock not supported or failed:", orientError);
                    // Still proceed - user can rotate manually
                }
            } else {
                console.warn("Screen Orientation API not fully supported");
            }
        } catch (err) {
            console.error("Failed to enter fullscreen landscape:", err);
        }
    }, []);

    // For non-mobile devices, render children directly
    if (!isMobile) {
        return <>{children}</>;
    }

    // For mobile: show overlay if not in fullscreen mode
    if (!isFullscreen) {
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: '#0a0a2a',
                    backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(30,30,60,0.9) 0%, #0a0a2a 90%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    padding: '20px',
                    boxSizing: 'border-box',
                    color: 'white',
                    textAlign: 'center',
                }}
            >
                {/* Icon suggestion */}
                <div style={{ marginBottom: '32px' }}>
                    <svg
                        width="80"
                        height="80"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: '#ffaa44', marginBottom: '16px' }}
                    >
                        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                        <path d="M12 8v8" />
                        <path d="m8 12 4 4 4-4" />
                    </svg>
                    <h1 style={{ fontSize: '1.8rem', margin: '0 0 12px 0', fontWeight: '600' }}>
                        {message}
                    </h1>
                    <p style={{ fontSize: '1rem', opacity: 0.8, maxWidth: '280px', margin: '0 auto' }}>
                        Please switch to fullscreen landscape mode for the best experience.
                    </p>
                </div>

                <button
                    onClick={enterLandscapeFullscreen}
                    style={{
                        backgroundColor: '#ffaa44',
                        color: '#0a0a2a',
                        border: 'none',
                        borderRadius: '48px',
                        padding: '14px 32px',
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, background-color 0.2s ease',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                        marginTop: '24px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffcc66';
                        e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffaa44';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <span>🖥️</span>
                    {buttonText}
                    <span>↗️</span>
                </button>

                <p style={{ fontSize: '0.8rem', marginTop: '48px', opacity: 0.6 }}>
                    If fullscreen doesn't activate, check browser permissions.
                </p>
            </div>
        );
    }

    // Fullscreen is active on mobile - render actual content
    return <>{children}</>;
};

export default MobileFullscreenWrapper;
