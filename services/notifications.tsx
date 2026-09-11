import React from 'react';
import toast from 'react-hot-toast';

export type InAppNotificationType = 'success' | 'error' | 'loading' | 'info';

export function showInAppNotification(
  title: string,
  message: string,
  type: InAppNotificationType = 'info',
) {
  const content = (
    <div className="flex flex-col gap-1">
      <span className="font-bold text-sm leading-5">{title}</span>
      <span className="text-sm leading-5 opacity-80">{message}</span>
    </div>
  );

  if (type === 'success') {
    return toast.success(content);
  }

  if (type === 'error') {
    return toast.error(content);
  }

  if (type === 'loading') {
    return toast.loading(content);
  }

  return toast(content);
}
