import { useEffect, useRef, useState } from 'react';

const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';

let googleIdentityScriptPromise = null;

function loadGoogleIdentityScript() {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Google auth is only available in the browser'));
    }

    if (window.google?.accounts?.id) {
        return Promise.resolve(window.google);
    }

    if (!googleIdentityScriptPromise) {
        googleIdentityScriptPromise = new Promise((resolve, reject) => {
            const existingScript = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
            if (existingScript) {
                existingScript.addEventListener('load', () => resolve(window.google), { once: true });
                existingScript.addEventListener('error', () => reject(new Error('Failed to load Google auth')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = GOOGLE_IDENTITY_SCRIPT;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(window.google);
            script.onerror = () => reject(new Error('Failed to load Google auth'));
            document.head.appendChild(script);
        });
    }

    return googleIdentityScriptPromise;
}

export default function GoogleAuthButton({
    mode = 'signin',
    disabled = false,
    onCredential,
    onError,
}) {
    const containerRef = useRef(null);
    const onCredentialRef = useRef(onCredential);
    const onErrorRef = useRef(onError);
    const [loadError, setLoadError] = useState('');
    const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

    useEffect(() => {
        onCredentialRef.current = onCredential;
    }, [onCredential]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    useEffect(() => {
        if (!clientId || !containerRef.current) {
            return undefined;
        }

        let cancelled = false;

        void loadGoogleIdentityScript()
            .then(() => {
                if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
                    return;
                }

                setLoadError('');
                containerRef.current.innerHTML = '';
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: (response) => {
                        const credential = String(response?.credential || '').trim();
                        if (!credential) {
                            const error = new Error('Google authentication failed');
                            onErrorRef.current?.(error);
                            return;
                        }
                        void onCredentialRef.current?.(credential);
                    },
                    auto_select: false,
                    cancel_on_tap_outside: true,
                });
                window.google.accounts.id.renderButton(containerRef.current, {
                    theme: 'outline',
                    size: 'large',
                    shape: 'rectangular',
                    text: mode === 'signup' ? 'signup_with' : 'signin_with',
                    width: 320,
                    logo_alignment: 'left',
                });
            })
            .catch((error) => {
                const nextError = error?.message || 'Failed to load Google authentication';
                setLoadError(nextError);
                onErrorRef.current?.(new Error(nextError));
            });

        return () => {
            cancelled = true;
        };
    }, [clientId, mode]);

    if (!clientId) {
        return (
            <div className="w-full rounded-lg border border-[var(--c-border)] bg-white px-3 py-2 text-sm text-[var(--c-text-muted)]">
                Google authentication is unavailable. Set <code>VITE_GOOGLE_CLIENT_ID</code> to enable it.
            </div>
        );
    }

    return (
        <div className={`w-full ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
            <div ref={containerRef} className="flex justify-center" />
            {loadError ? <p className="mt-2 text-sm text-[var(--c-error)]">{loadError}</p> : null}
        </div>
    );
}
