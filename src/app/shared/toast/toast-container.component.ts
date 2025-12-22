import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService, Toast } from './toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.css']
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private toastService: ToastService) { }

  ngOnInit(): void {
    this.sub = this.toastService.toasts$.subscribe(list => this.toasts = list);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number) {
    this.toastService.dismiss(id);
  }

  icon(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'la la-check-circle';
      case 'error': return 'la la-times-circle';
      case 'info': return 'la la-info-circle';
      case 'warning': return 'la la-exclamation-circle';
      default: return 'la la-bell';
    }
  }
}
