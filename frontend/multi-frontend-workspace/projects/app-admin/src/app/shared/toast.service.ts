import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);
  private nextId = 1;

  show(message: string, type: ToastMessage['type'] = 'success'): void {
    const toast: ToastMessage = {
      id: this.nextId++,
      message,
      type,
    };

    this.toasts.update((toasts) => [...toasts, toast]);
    window.setTimeout(() => this.dismiss(toast.id), 4000);
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) =>
      toasts.filter((toast) => toast.id !== id),
    );
  }
}
