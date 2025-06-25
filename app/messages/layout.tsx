// app/messages/layout.tsx
import React from 'react';

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Simply return the children - the MessagingLayout will be handled by individual pages
  return <>{children}</>;
}