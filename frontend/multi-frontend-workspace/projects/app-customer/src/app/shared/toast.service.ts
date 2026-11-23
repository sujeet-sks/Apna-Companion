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
  private readonly timeouts = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastMessage['type'] = 'success'): void {
    const toast: ToastMessage = {
      id: this.nextId++,
      message,
      type,
    };

    this.toasts.update((toasts) => [...toasts, toast]);
    const timeout = setTimeout(() => this.dismiss(toast.id), 4000);
    this.timeouts.set(toast.id, timeout);
  }

  dismiss(id: number): void {
    const timeout = this.timeouts.get(id);
    if (timeout !== undefined) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }
}
