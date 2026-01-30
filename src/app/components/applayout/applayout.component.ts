import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-applayout',
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './applayout.component.html',
  styleUrl: './applayout.component.scss',
})
export class ApplayoutComponent {
  sidebarVisible = true;
  role: string | null = '';
  @ViewChild('sidebar') sidebar!: ElementRef;
  @ViewChild('toggleBtn') toggleBtn!: ElementRef;

  constructor(private route: Router) {}

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

  logout() {
    localStorage.clear();
    this.route.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;

    if (window.innerWidth < 768 && this.sidebarVisible) {
      if (
        this.sidebar &&
        !this.sidebar.nativeElement.contains(target) &&
        this.toggleBtn &&
        !this.toggleBtn.nativeElement.contains(target)
      ) {
        this.sidebarVisible = false;
      }
    }
  }
}
