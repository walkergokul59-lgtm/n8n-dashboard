import { useLayoutEffect } from "react";
import { gsap, Observer, ScrollTrigger } from "../lib/gsap.js";

export function useSmoothScroll(scrollerRef, options = {}) {
    const {
        duration = 0.7,
        ease = "power3.out",
        wheelMultiplier = 1,
        touchMultiplier = 1.2,
        enabled = true
    } = options;

    useLayoutEffect(() => {
        const scroller = scrollerRef?.current;
        if (!enabled || !scroller) return undefined;

        const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
        if (prefersReducedMotion) return undefined;

        let targetScrollTop = scroller.scrollTop;
        const maxScrollTop = () => Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const clampScrollTop = (value) => Math.min(maxScrollTop(), Math.max(0, value));

        const tweenTo = (value) => {
            targetScrollTop = clampScrollTop(value);
            gsap.to(scroller, {
                scrollTop: targetScrollTop,
                duration,
                ease,
                overwrite: true,
                onUpdate: ScrollTrigger.update
            });
        };

        const observer = Observer.create({
            target: scroller,
            type: "wheel,touch",
            preventDefault: true,
            allowClicks: true,
            onWheel: (self) => {
                tweenTo(targetScrollTop + self.deltaY * wheelMultiplier);
            },
            onChangeY: (self) => {
                tweenTo(targetScrollTop + self.deltaY * touchMultiplier);
            }
        });

        const onScroll = () => {
            targetScrollTop = scroller.scrollTop;
        };

        scroller.addEventListener("scroll", onScroll, { passive: true });

        return () => {
            scroller.removeEventListener("scroll", onScroll);
            observer.kill();
            gsap.killTweensOf(scroller);
        };
    }, [scrollerRef, duration, ease, wheelMultiplier, touchMultiplier, enabled]);
}

