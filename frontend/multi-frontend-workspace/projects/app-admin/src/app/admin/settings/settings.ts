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
    admin_id?: string;
    adminId?: string;
    email?: string;
    EmailId?: string;
    full_name?: string;
  } | null {
    try {
      const storedUser = sessionStorage.getItem('admin_user');
      if (!storedUser) {
        return null;
      }

      const user = JSON.parse(storedUser);
      return {
        adminId: user.admin_id ?? user.adminId,
        EmailId: user.email ?? user.EmailId,
        full_name: user.full_name,
      };
    } catch {
      return null;
    }
  }
}
