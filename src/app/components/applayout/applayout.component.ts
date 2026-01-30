import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-applayout',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './applayout.component.html',
  styleUrl: './applayout.component.scss'
})
export class ApplayoutComponent {
 sidebarVisible = true;
 role: string | null = '';

 constructor(private route: Router){}

 ngOnInit() {
    this.role = localStorage.getItem('role');
  }

   toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
  }

  refreshApp() {
    window.location.reload();
  }

  onMenuClick() {
    if (window.innerWidth < 768) {
      this.sidebarVisible = false;
    }
  }

  logout(){
    localStorage.clear();
    this.route.navigate(['/login']);
  }
}
