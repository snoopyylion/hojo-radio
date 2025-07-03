// types/global.d.ts
import { Clerk } from '@clerk/types';

declare global {
  interface Window {
    Clerk: Clerk;
  }
}