export type ToastType = 'success' | 'warning' | 'danger';

export type ToastData = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
}

export type ToastConfig = {
  position?:
    | 'top-right'
    | 'top-left'
    | 'bottom-right'
    | 'bottom-left'
    | 'top-center'
    | 'bottom-center';
  defaultDuration?: number;
  maxToasts?: number;
}
