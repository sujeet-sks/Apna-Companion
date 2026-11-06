import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-settings',
  styleUrl: './settings.css',
  templateUrl: './settings.html',
})
export class Settings {
  protected profileMessage = '';

  protected profileForm = new FormGroup({
    adminId: new FormControl(this.readStoredUser()?.adminId ?? ''),
    full_name: new FormControl(this.readStoredUser()?.full_name ?? '', Validators.required),
    EmailId: new FormControl(this.readStoredUser()?.EmailId ?? '', [
      Validators.required,
      Validators.email,
    ]),
  });

  constructor() {
    this.profileForm.disable({ emitEvent: false });
  }

  protected updateProfile(): void {
    return;
  }

  private readStoredUser(): {
    adminId?: string;
    EmailId?: string;
    full_name?: string;
  } | null {
    try {
      const storedUser = sessionStorage.getItem('admin_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  }
}
