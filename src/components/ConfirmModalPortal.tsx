import React from 'react';
import ReactDOM from 'react-dom';

export default function ConfirmModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return null;
  return ReactDOM.createPortal(children, document.body);
} 