import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { ComplainModalComponent } from '../complain-modal/complain-modal.component';
import { TemplateMapperService } from '../../shared/template-mapper.service';

@Component({
  selector: 'app-complain-details',
  imports: [CommonModule, FormsModule, ToastrModule],
  templateUrl: './complain-details.component.html',
  styleUrl: './complain-details.component.scss',
})
export class ComplainDetailsComponent {
  isLoading = false;
  isDeleting = false;
  searchTerm = '';
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedDeleteId: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  sublocality: string = '';
  internetAreas: any[] = [];
  showReceiptModal = false;
  companyDetail: any = {};
  selectedDate: string = '';
  totalUsers: number = 0;
  totalRecovery: number = 0;
  totalExpenses: number = 0;
  totalProfit: number = 0;
  selectedStatus: 'all' | 'reopen' | 'close' = 'all';
  recievedByList: string[] = [];
  operatorList: string[] = [];
  selectOperator: string = '';
  selectedRecievedBy: string = '';

  constructor(
    private modalService: NgbModal,
    private firestore: Firestore,
    private toastr: ToastrService,
    private templateMapper: TemplateMapperService,
  ) {}

  async ngOnInit() {
    this.loadExpenses();
    this.loadInternetAreas();
    this.complainTemplate = await this.getTemplate('complaint');
  }

  async getTemplate(type: string): Promise<string> {
    const ref = doc(this.firestore, `messageTemplates/${type}`);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      return snap.data()['message'] || '';
    }

    return '';
  }

  async loadInternetAreas() {
    try {
      const ref = doc(this.firestore, 'internetArea', 'internetAreaDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.internetAreas = snap.data()?.['internetAreas'] || [];

        this.internetAreas.sort((a: any, b: any) => {
          return a.sublocality.localeCompare(b.sublocality);
        });
      }
    } catch (error) {
      console.error('Error loading internet areas', error);
    }
  }

  async loadExpenses() {
    this.isLoading = true;

    try {
      const usersRef = collection(this.firestore, 'complainDetails');
      const snapshot = await getDocs(usersRef);

      this.users = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      this.users.sort((a: any, b: any) => {
        return b.createdAt - a.createdAt;
      });

      this.filteredUsers = this.users;
      this.updateTotalPages();

      console.log('Fetched users:', this.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      this.toastr.error('Failed to load users');
    } finally {
      this.isLoading = false;
    }
  }

  get pagedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  updateTotalPages() {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }

  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  get visiblePages(): number[] {
    const pages: number[] = [];

    const startPage = Math.floor((this.currentPage - 1) / 5) * 5 + 1;

    const endPage = Math.min(startPage + 4, this.totalPages);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updateTotalPages();
  }

  onFilterChange() {
    const term = this.searchTerm.toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        user.user_name?.toLowerCase().includes(term) ||
        user.internet_id?.toLowerCase().includes(term) ||
        user.sublocality?.toLowerCase().includes(term) ||
        user.date?.includes(term);

      const matchesSublocality =
        !this.sublocality || user.sublocality === this.sublocality;

      return matchesSearch && matchesSublocality;
    });

    this.currentPage = 1;
    this.updateTotalPages();
  }

  openComplainModal(userData?: any) {
    const modalRef = this.modalService.open(ComplainModalComponent, {
      size: 'xl',
      backdrop: 'static',
    });

    if (userData) {
      modalRef.componentInstance.editMode = true;
      modalRef.componentInstance.userData = userData;
    }

    modalRef.closed.subscribe((result) => {
      if (result) {
        this.loadExpenses();
      }
    });
  }

  editUser(user: any) {
    this.openComplainModal(user);
  }

  openDeleteModal(id: string, modal: any) {
    this.selectedDeleteId = id;
    this.modalService.open(modal, { centered: true });
  }

  async confirmDelete(modal: any) {
    if (!this.selectedDeleteId) return;

    this.isDeleting = true;

    const userRef = doc(
      this.firestore,
      'complainDetails',
      this.selectedDeleteId,
    );

    try {
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        this.toastr.error('Customer Status not found');
        return;
      }

      const logData = {
        ...userSnap.data(),
        type: 'complainDetails',
        action: 'delete',
        originalId: this.selectedDeleteId,
        deletedAt: new Date(),
      };

      await addDoc(collection(this.firestore, 'logs'), logData);
      await addDoc(collection(this.firestore, 'logs'), {
        type: 'complainDetails',
        action: 'delete',
        targetId: this.selectedDeleteId,
        deletedAt: new Date(),
      });
      await deleteDoc(
        doc(this.firestore, 'complainDetails', this.selectedDeleteId),
      );
      this.toastr.success('Customer Status deleted');
      this.loadExpenses();
      modal.close();
    } catch (err) {
      this.toastr.error('Delete failed');
    } finally {
      this.isDeleting = false;
      this.selectedDeleteId = null;
    }
  }

  complainTemplate: any;

  async sendWhatsapp(user: any) {
    const formattedPhone = this.formatPhoneNumber(user.phone_number);

    const message = this.mapTemplate(this.complainTemplate, user);
    if (!message) {
      this.toastr.error('Message template not loaded');
      return;
    }

    this.sendWelcomeMessage(formattedPhone, message);
  }

  mapTemplate(template: any, data: any): string {
    return this.templateMapper.map(template, data, {
      supportNumber: this.companyDetail?.complain_no1 || undefined,
      complaintDate: data?.complain_date,
    });
  }

  formatPhoneNumber(phone: string): string {
    console.log('Phone Number:', phone);
    phone = phone.replace(/\D/g, ''); 

    if (phone.startsWith('03')) {
      return '92' + phone.substring(1);
    }

    if (phone.startsWith('3')) {
      return '92' + phone;
    }

    if (phone.startsWith('92')) {
      return phone;
    }

    if (phone.startsWith('+92')) {
      return phone.substring(1);
    }

    return phone;
  }

  sendWelcomeMessage(phone: string, message: string) {
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  }
}
