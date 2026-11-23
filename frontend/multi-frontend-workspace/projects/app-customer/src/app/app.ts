import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoadingService } from './loading/loading.service';
import { ToastComponent } from './shared/toast.component';

@Component({
  imports: [AsyncPipe, RouterOutlet, ToastComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  readonly isLoading$ = inject(LoadingService).isLoading$;
}
