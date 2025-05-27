import { useRef } from "react";
import { gsap } from "gsap";

export function useAuthAnimations() {
  const buttonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1.05,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const buttonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const buttonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });
  };

  // ADD: animateButtonClick function (this was missing)
  const animateButtonClick = (element: HTMLButtonElement | HTMLElement) => {
    gsap.to(element, {
      scale: 0.95,
      duration: 0.1,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut"
    });
  };

  const inputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1.02,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const inputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    gsap.to(e.target, {
      scale: 1,
      duration: 0.2,
      ease: "power2.out"
    });
  };

  const animateFormEntry = (elements: HTMLElement[], delay = 0.1) => {
    gsap.set(elements, { y: 20, opacity: 0 });
    
    const tl = gsap.timeline({ delay });
    tl.to(elements, {
      y: 0,
      opacity: 1,
      duration: 0.4,
      stagger: 0.05,
      ease: "power2.out"
    });
  };

  const animateError = (element: HTMLElement) => {
    gsap.fromTo(element,
      { x: -10, opacity: 0 },
      {
        x: 0,
        opacity: 1,
        duration: 0.3,
        ease: "power2.out"
      }
    );

    // Shake animation
    gsap.fromTo(element,
      { x: 0 },
      {
        x: 5,
        duration: 0.1,
        delay: 0.1,
        repeat: 5,
        yoyo: true,
        ease: "power2.inOut"
      }
    );
  };

  return {
    buttonHover,
    buttonLeave,
    buttonClick,
    inputFocus,
    inputBlur,
    animateFormEntry,
    animateError,
    animateButtonClick  // ADD: Export animateButtonClick
  };
}