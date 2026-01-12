import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  errorMessage: string = '';

  // Hardcoded credentials
  private readonly validUsername = 'admin';
  private readonly validPassword = '1234';

  constructor(private router: Router) {}

  login() {
    if (
      this.username === this.validUsername &&
      this.password === this.validPassword
    ) {
      this.errorMessage = '';
      this.router.navigate(['/dashboard']); 
    } else {
      this.errorMessage = 'Invalid username or password!';
    }
  }
}
