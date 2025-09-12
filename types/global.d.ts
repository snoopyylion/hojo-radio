// types/global.d.ts
import { Clerk } from "@clerk/types";

declare global {
  interface Window {
    Clerk: Clerk;
  }

  // Extend HTMLMediaElement with captureStream
  interface HTMLMediaElement {
    captureStream: () => MediaStream;
  }
}

export {};
