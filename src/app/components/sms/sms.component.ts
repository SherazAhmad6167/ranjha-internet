import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sms',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './sms.component.html',
  styleUrl: './sms.component.scss',
})
export class SmsComponent {
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;

  activeTab: 'compose' | 'inbox' = 'compose';
  isSaving = false;
  isLoading = false;
  isDeleting = false;
  searchTerm = '';
  smsList: any[] = [];
  filteredList: any[] = [];
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  selectedDeleteId: string | null = null;

  smsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private toastr: ToastrService,
    private modalService: NgbModal,
  ) {
    this.smsForm = this.fb.group({
      phone: ['+92', [Validators.required, Validators.pattern(/^\+92\d{10}$/)]],
      message: ['', [Validators.required, Validators.minLength(1)]],
      status: [{ value: 'pending', disabled: true }],
    });
  }

  ngOnInit() {
    this.loadSms();
  }

  switchTab(tab: 'compose' | 'inbox') {
    this.activeTab = tab;
    if (tab === 'inbox') this.loadSms();
  }

  get charCount() {
    return this.smsForm.get('message')?.value?.length ?? 0;
  }

  async onSubmit() {
    if (this.smsForm.invalid) {
      this.smsForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    try {
      const payload = {
        phone: this.smsForm.value.phone,
        message: this.smsForm.value.message,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(this.firestore, 'sms'), payload);
      this.toastr.success('SMS queued successfully');
      this.smsForm.reset();
      this.smsForm.patchValue({ phone: '+92', status: 'pending' });
    } catch {
      this.toastr.error('Failed to queue SMS');
    } finally {
      this.isSaving = false;
    }
  }

  async loadSms() {
    this.isLoading = true;
    try {
      const q = query(collection(this.firestore, 'sms'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      this.smsList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      this.filteredList = [...this.smsList];
      this.updateTotalPages();
    } catch {
      this.toastr.error('Failed to load SMS records');
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase();
    this.filteredList = this.smsList.filter(
      (s) =>
        s.phone?.toLowerCase().includes(term) ||
        s.message?.toLowerCase().includes(term) ||
        s.status?.toLowerCase().includes(term),
    );
    this.currentPage = 1;
    this.updateTotalPages();
  }

  updateTotalPages() {
    this.totalPages = Math.ceil(this.filteredList.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
  }

  onPageSizeChange() {
    this.currentPage = 1;
    this.updateTotalPages();
  }

  get pagedList() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredList.slice(start, start + this.pageSize);
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }

  get visiblePages(): number[] {
    const start = Math.floor((this.currentPage - 1) / 5) * 5 + 1;
    const end = Math.min(start + 4, this.totalPages);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  openDeleteModal(id: string) {
    this.selectedDeleteId = id;
    this.modalService.open(this.deleteModal, { centered: true, size: 'sm', windowClass: 'delete-confirm-modal' });
  }

  async confirmDelete(modal: any) {
    if (!this.selectedDeleteId) return;
    this.isDeleting = true;
    try {
      await deleteDoc(doc(this.firestore, 'sms', this.selectedDeleteId));
      this.toastr.success('SMS deleted');
      this.smsList = this.smsList.filter((s) => s.id !== this.selectedDeleteId);
      this.filteredList = this.filteredList.filter((s) => s.id !== this.selectedDeleteId);
      this.updateTotalPages();
      modal.close();
    } catch {
      this.toastr.error('Delete failed');
    } finally {
      this.isDeleting = false;
      this.selectedDeleteId = null;
    }
  }

  statusClass(status: string) {
    switch (status) {
      case 'sent':   return 'status-sent';
      case 'failed': return 'status-failed';
      default:       return 'status-pending';
    }
  }
}
