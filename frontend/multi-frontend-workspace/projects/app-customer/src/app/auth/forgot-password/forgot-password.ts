import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-forgot-password',
  styleUrls: ['../login-common.css', './forgot-password.css'],
  templateUrl: './forgot-password.html',
})
export class ForgotPassword {
  protected submitted = false;

  protected onSubmit(): void {
    this.submitted = true;
  }
}
