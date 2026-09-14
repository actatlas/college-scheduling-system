import Swal, { type SweetAlertIcon, type SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

function isDarkMode(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    return (
      document.documentElement?.getAttribute('data-theme') === 'dark' ||
      document.documentElement?.classList.contains('dark') ||
      Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  } catch {
    return false;
  }
}

function getSwalThemeOptions(): SweetAlertOptions {
  const dark = isDarkMode();
  return {
    background: dark ? '#181920' : '#ffffff',
    color: dark ? '#f1f5f9' : '#1e293b',
    confirmButtonColor: '#2563eb',
    cancelButtonColor: dark ? '#334155' : '#94a3b8',
    customClass: {
      popup: 'srcb-swal-popup',
      title: 'srcb-swal-title',
      htmlContainer: 'srcb-swal-html',
      confirmButton: 'srcb-swal-btn-confirm',
      cancelButton: 'srcb-swal-btn-cancel',
    },
  };
}

/**
 * Centered Success Alert Modal
 */
export async function showSuccessAlert(title: string, message?: string, timer = 2200): Promise<void> {
  const theme = getSwalThemeOptions();
  await Swal.fire({
    ...theme,
    icon: 'success',
    title,
    text: message,
    timer,
    timerProgressBar: Boolean(timer),
    showConfirmButton: !timer,
    confirmButtonText: 'OK',
  });
}

/**
 * Centered Error Alert Modal
 */
export async function showErrorAlert(title: string, message?: string): Promise<void> {
  const theme = getSwalThemeOptions();
  await Swal.fire({
    ...theme,
    icon: 'error',
    title,
    text: message,
    confirmButtonText: 'Understood',
    confirmButtonColor: '#ef4444',
  });
}

/**
 * Centered Warning Alert Modal
 */
export async function showWarningAlert(title: string, message?: string): Promise<void> {
  const theme = getSwalThemeOptions();
  await Swal.fire({
    ...theme,
    icon: 'warning',
    title,
    text: message,
    confirmButtonText: 'OK',
    confirmButtonColor: '#f59e0b',
  });
}

/**
 * Centered Confirmation Dialog (e.g. for destructive actions)
 */
export async function showConfirmDialog({
  title,
  text,
  confirmButtonText = 'Yes, Confirm',
  cancelButtonText = 'Cancel',
  isDestructive = false,
  icon = 'warning',
}: {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
  icon?: SweetAlertIcon;
}): Promise<boolean> {
  const theme = getSwalThemeOptions();
  const result = await Swal.fire({
    ...theme,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    confirmButtonColor: isDestructive ? '#dc2626' : '#2563eb',
    reverseButtons: true,
    focusCancel: isDestructive,
  });

  return result.isConfirmed;
}

/**
 * Quick, non-blocking toast alert (top-right)
 */
export function showToast(title: string, icon: SweetAlertIcon = 'success', timer = 3000): void {
  const dark = isDarkMode();
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: dark ? '#1e2029' : '#ffffff',
    color: dark ? '#f8fafc' : '#0f172a',
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    },
  });

  Toast.fire({
    icon,
    title,
  });
}

export const alerts = {
  success: showSuccessAlert,
  error: showErrorAlert,
  warning: showWarningAlert,
  confirm: showConfirmDialog,
  toast: showToast,
};
