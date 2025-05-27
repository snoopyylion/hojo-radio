"use client";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface AuthFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function AuthForm({ children, onSubmit }: AuthFormProps) {
  const formElementsRef = useRef<HTMLDivElement>(null);

  // Animate form elements on mount
  useEffect(() => {
    if (formElementsRef.current) {
      const inputGroups = formElementsRef.current.querySelectorAll('[data-animate="input"]');
      const buttons = formElementsRef.current.querySelectorAll('[data-animate="button"]');
      const dividers = formElementsRef.current.querySelectorAll('[data-animate="divider"]');
      const oauthSection = formElementsRef.current.querySelectorAll('[data-animate="oauth"]');
      
      // Set initial states
      gsap.set(inputGroups, { x: -30, opacity: 0 });
      gsap.set([...buttons, ...dividers, ...oauthSection], { y: 20, opacity: 0 });

      // Create timeline with delays to match original
      const tl = gsap.timeline({ delay: 0.6 }); // Start after logo/title animations

      tl.to(inputGroups, {
        x: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.1,
        ease: "power2.out"
      })
      .to([...dividers, ...oauthSection, ...buttons], {
        y: 0,
        opacity: 1,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
        // Add this to ensure events work after animation
        onComplete: () => {
          // Reset any pointer-events that might have been affected
          [...buttons, ...dividers, ...oauthSection].forEach(el => {
            (el as HTMLElement).style.pointerEvents = 'auto';
          });
        }
      }, "-=0.2");
    }
  }, []);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2" ref={formElementsRef}>
        {children}
      </div>
    </form>
  );
}