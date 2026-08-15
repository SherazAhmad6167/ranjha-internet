import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, TemplateRef, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-applayout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './applayout.component.html',
  styleUrl: './applayout.component.scss',
})
export class ApplayoutComponent {
  sidebarVisible = true;
  role: string | null = '';
  @ViewChild('sidebar') sidebar!: ElementRef;
  @ViewChild('toggleBtn') toggleBtn!: ElementRef;
  isDashboard = false;

  expandedSections: Record<string, boolean> = {
    customers: true,
    finance: false,
    network: false,
    management: false,
    communication: false,
    system: false,
  };

  @ViewChild('logoutModal') logoutModal!: TemplateRef<any>;

  constructor(private route: Router, private modalService: NgbModal) {
    this.route.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isDashboard = this.route.url === '/dashboard';
        this.autoExpandSection(this.route.url);
      }
    });
  }

  ngOnInit() {
    this.role = localStorage.getItem('role');
  }

  toggleSection(key: string) {
    this.expandedSections[key] = !this.expandedSections[key];
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

  openLogoutModal() {
    this.modalService.open(this.logoutModal, { centered: true, windowClass: 'logout-modal-dialog' });
  }

  logout(modal: any) {
    modal.close();
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

  private autoExpandSection(url: string) {
    const sectionMap: Record<string, string[]> = {
      customers: ['/user-details', '/user-collections', '/new-connection', '/customer-status', '/defaulter-users', '/complain-details'],
      finance: ['/bill-creator', '/recovery-details', '/recovery-officer', '/ro-reports', '/expenses', '/borrow-details', '/payable-details'],
      network: ['/mikrotik-users', '/area-details', '/sub-area-details', '/city-details', '/package-details', '/operator-details', '/router-details'],
      management: ['/material-details', '/stock-details', '/company-detail'],
      communication: ['/sms'],
      system: ['/logs', '/upload-docs', '/settings'],
    };

    for (const [section, routes] of Object.entries(sectionMap)) {
      if (routes.some(r => url.startsWith(r))) {
        this.expandedSections[section] = true;
        break;
      }
    }
  }
}
