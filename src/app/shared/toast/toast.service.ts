import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  duration: number; // ms
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  toasts$ = this.toastsSubject.asObservable();
  private counter = 0;

  show(message: string, type: ToastType = 'info', title?: string, duration = 4000) {
    const id = ++this.counter;
    const toast: Toast = { id, type, title, message, duration };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);
    setTimeout(() => this.dismiss(id), duration);
  }

  showSuccess(message: string, title = 'Éxito', duration = 3500) {
    this.show(message, 'success', title, duration);
  }

  showError(message: string, title = 'Error', duration = 5000) {
    this.show(message, 'error', title, duration);
  }

  showInfo(message: string, title = 'Información', duration = 4000) {
    this.show(message, 'info', title, duration);
  }

  showWarning(message: string, title = 'Aviso', duration = 4000) {
    this.show(message, 'warning', title, duration);
  }

  dismiss(id: number) {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }
}
