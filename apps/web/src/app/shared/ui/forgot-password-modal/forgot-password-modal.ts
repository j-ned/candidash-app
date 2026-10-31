export interface ForgotPasswordModalData {
  email?: string;
}

export interface ForgotPasswordModalResult {
  action: 'sent' | 'cancelled';
  email?: string;
}