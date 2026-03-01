import { useLayoutEffect, useRef } from "react";
import { gsap } from "../lib/gsap.js";
import "./Preloader.css";

export default function Preloader({ ready, onDone }) {
    const rootRef = useRef(null);
    const timelineRef = useRef(null);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return undefined;

        const duration = 0.25;
        const delay = 1;

        const timeline = gsap.timeline({ repeat: -1, repeatDelay: delay });
        timelineRef.current = timeline;

        timeline
            .to(".loader-3", { duration, width: 35 })
            .set(".loader-2", { rotate: 90, transformOrigin: "45px 45px", marginLeft: 0 })
            .to(".loader-2", { duration, width: 90 })
            .set(".loader-2", { transformOrigin: "72px 17px", rotate: 270 })
            .to(".loader-2", { duration, width: 35 })
            .to(".loader-1", { duration, width: 90 })
            .set(".loader-1", { transformOrigin: "45px 17.5px", rotate: 180 })
            .to(".loader-1", { duration, width: 35 })
            .set(".loader-3", { transformOrigin: "45px 45px", rotate: 270, marginTop: 0 })
            .to(".loader-3", { duration, width: 90 })
            .set(".loader-3", { transformOrigin: "17.5px 17.5px", rotate: 90 })
            .to(".loader-3", { duration, width: 35 })
            .set(".loader-2", { transformOrigin: "45px 45px", rotate: 180 })
            .to(".loader-2", { duration, width: 90 })
            .set(".loader-2", { transformOrigin: "bottom center", marginTop: 20 })
            .to(".loader-2", { duration, width: 35 })
            .set(".loader-1", { transformOrigin: "45px 45px", rotate: 90 })
            .to(".loader-1", { duration, width: 90 })
            .set(".loader-1", { transformOrigin: "72px 17.5px", rotate: 270 })
            .to(".loader-1", { duration, width: 35 })
            .set(".loader-3", { rotate: 360 })
            .to(".loader-3", { duration, width: 90 })
            .set(".loader-3", { transformOrigin: "45px 17.5px", rotate: 180 })
            .to(".loader-3", { duration, width: 35 })
            .set(".loader-2", { transformOrigin: "45px 45px", rotate: 270, marginTop: 0 })
            .to(".loader-2", { duration, width: 90 })
            .set(".loader-2", { transformOrigin: "17.5px 17.5px", rotate: 90 })
            .to(".loader-2", { duration, width: 35 })
            .set(".loader-1", { transformOrigin: "45px 45px", rotate: 180 })
            .to(".loader-1", { duration, width: 90 })
            .set(".loader-1", { transformOrigin: "bottom center", marginTop: 20 })
            .to(".loader-1", { duration, width: 35 })
            .set(".loader-3", { transformOrigin: "45px 45px", rotate: 90 })
            .to(".loader-3", { duration, width: 90 })
            .set(".loader-3", { transformOrigin: "72px 17.5px", rotate: 270 })
            .to(".loader-3", { duration, width: 35 })
            .set(".loader-2", { transformOrigin: "45px 17.5px", rotate: 0 })
            .to(".loader-2", { duration, width: 90 })
            .set(".loader-2", { rotate: 180 })
            .to(".loader-2", { duration, width: 35 })
            .set(".loader-1", { transformOrigin: "45px 45px", rotate: 270, marginTop: 0 })
            .to(".loader-1", { duration, width: 90 })
            .set(".loader-1", { transformOrigin: "17.5px 17.5px", rotate: 90 })
            .to(".loader-1", { duration, width: 35 })
            .set(".loader-3", { transformOrigin: "45px 17.5px", rotate: 180, marginTop: 55 })
            .to(".loader-3", { duration, width: 90 })
            .set(".loader-2", { marginLeft: 55 });

        return () => {
            timeline.kill();
            timelineRef.current = null;
        };
    }, []);

    useLayoutEffect(() => {
        if (!ready) return undefined;
        const root = rootRef.current;
        if (!root) return undefined;

        timelineRef.current?.pause(0);

        const tween = gsap.to(root, {
            autoAlpha: 0,
            duration: 0.45,
            ease: "power2.out",
            onComplete: () => {
                timelineRef.current?.kill();
                timelineRef.current = null;
                onDone?.();
            }
        });

        return () => tween.kill();
    }, [ready, onDone]);

    return (
        <div ref={rootRef} className="preloader" aria-label="Loading">
            <div className="preloader__container">
                <div className="loader-wrapper">
                    <div className="loader-1" />
                    <div className="loader-2" />
                    <div className="loader-3" />
                </div>
                <div className="preloader__label">Loading dashboard…</div>
            </div>
        </div>
    );
}

