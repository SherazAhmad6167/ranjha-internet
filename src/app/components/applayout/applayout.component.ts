import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-applayout',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './applayout.component.html',
  styleUrl: './applayout.component.scss'
})
export class ApplayoutComponent {
 sidebarVisible = true;

   toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  refreshApp() {
    window.location.reload();
  }
}
