import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  imports: [FormsModule, RouterLink],
  selector: 'app-register',
  styleUrls: ['../login-common.css', './register.css'],
  templateUrl: './register.html',
})
export class Register {
  protected submitted = false;

  protected onSubmit(): void {
    this.submitted = true;
  }
}
