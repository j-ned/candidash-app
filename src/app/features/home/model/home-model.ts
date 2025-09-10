export interface PageButton {
  label: string;
  color: 'primary' | 'secondary' | 'accent' | 'red';
  customClass?: string;
  action?: () => void;
  routerLink?: string;
}
