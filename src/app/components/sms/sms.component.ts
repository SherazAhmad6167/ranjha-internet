import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { TemplateMapperService } from '../../shared/template-mapper.service';

@Component({
  selector: 'app-sms',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './sms.component.html',
  styleUrl: './sms.component.scss',
})
export class SmsComponent {
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;
  @ViewChild('broadcastConfirmModal') broadcastConfirmModal!: TemplateRef<any>;
  @ViewChild('viewModal') viewModal!: TemplateRef<any>;
  selectedSms: any = null;
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

  // ── Broadcast ─────────────────────────────────
  areas: any[] = [];
  smsTemplates: any[] = [];
  allUsers: any[] = [];
  broadcastArea = 'all';
  broadcastTemplateId = '';
  broadcastMessage = '';
  broadcastUsers: any[] = [];
  isBroadcasting = false;
  broadcastSent = 0;
  broadcastTotal = 0;
  broadcastDataLoaded = false;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private templateMapper: TemplateMapperService,
  ) {
    this.smsForm = this.fb.group({
      phone: ['+92', [Validators.required, Validators.pattern(/^\+92\d{10}$/)]],
      message: ['', [Validators.required, Validators.minLength(1)]],
      status: [{ value: 'pending', disabled: true }],
    });
  }

  ngOnInit() {
    this.loadSms();
    this.loadBroadcastData();
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

  get pendingCount(): number {
    return this.smsList.filter(s => s.status === 'pending').length;
  }

  get sentCount(): number {
    return this.smsList.filter(s => s.status === 'sent').length;
  }

  get failedCount(): number {
    return this.smsList.filter(s => s.status === 'failed').length;
  }

  openViewModal(sms: any) {
    this.selectedSms = sms;
    this.modalService.open(this.viewModal, { centered: true, size: 'md' });
  }

  // ── Broadcast Logic ────────────────────────────

  async loadBroadcastData() {
    if (this.broadcastDataLoaded) return;
    try {
      const [areaSnap, tmplSnap, usersSnap] = await Promise.all([
        getDoc(doc(this.firestore, 'internetArea', 'internetAreaDoc')),
        getDocs(collection(this.firestore, 'messageTemplates')),
        getDocs(collection(this.firestore, 'users')),
      ]);

      if (areaSnap.exists()) {
        this.areas = (areaSnap.data()?.['internetAreas'] || [])
          .sort((a: any, b: any) => a.sublocality.localeCompare(b.sublocality));
      }

      this.smsTemplates = tmplSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(t => t.message)
        .sort((a: any, b: any) => a.title?.localeCompare(b.title));

      this.allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      this.broadcastDataLoaded = true;
      this.onBroadcastAreaChange();
    } catch {
      this.toastr.error('Failed to load broadcast data');
    }
  }

  onBroadcastAreaChange() {
    const source = this.broadcastArea === 'all'
      ? this.allUsers
      : this.allUsers.filter(u => (u as any).sublocality === this.broadcastArea);

    this.broadcastUsers = source.filter(u => !!this.formatUserPhone((u as any).mobile_no || (u as any).phone_no));
  }

  onBroadcastTemplateChange() {
    const tmpl = this.smsTemplates.find(t => t.id === this.broadcastTemplateId);
    if (tmpl) this.broadcastMessage = tmpl.message;
  }

  formatUserPhone(raw: string): string | null {
    if (!raw) return null;
    const cleaned = raw.toString().trim().replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+92') && cleaned.length === 13) return cleaned;
    if (cleaned.startsWith('92') && cleaned.length === 12) return '+' + cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 11) return '+92' + cleaned.slice(1);
    if (cleaned.length === 10) return '+92' + cleaned;
    return null;
  }

  mapTemplate(message: string, user: any): string {
    // Broadcast has no bill context, so amounts fall back to the monthly fee.
    return this.templateMapper.map(message, user, {
      amount: user?.internet_package_fee,
      overdueAmount: user?.internet_package_fee,
    });
  }

  get broadcastProgress(): number {
    if (!this.broadcastTotal) return 0;
    return Math.round((this.broadcastSent / this.broadcastTotal) * 100);
  }

  get broadcastParts(): number {
    return Math.ceil(this.broadcastMessage.length / 153);
  }

  openBroadcastConfirm() {
    if (!this.broadcastMessage.trim() || this.broadcastUsers.length === 0) return;
    this.modalService.open(this.broadcastConfirmModal, {
      centered: true,
      size: 'md',
      windowClass: 'broadcast-confirm-modal',
    });
  }

  async sendBroadcast(modal: any) {
    modal.close();

    this.isBroadcasting = true;
    this.broadcastSent = 0;
    this.broadcastTotal = this.broadcastUsers.length;

    const areaLabel = this.broadcastArea === 'all' ? 'All Areas' : this.broadcastArea;

    try {
      const smsCol = collection(this.firestore, 'sms');

      for (const user of this.broadcastUsers) {
        const phone = this.formatUserPhone((user as any).mobile_no || (user as any).phone_no)!;
        const message = this.mapTemplate(this.broadcastMessage, user);

        await addDoc(smsCol, {
          phone,
          message,
          status: 'pending',
          createdAt: new Date().toISOString(),
          source: 'broadcast',
          area: areaLabel,
        });

        this.broadcastSent++;
      }

      this.toastr.success(`${this.broadcastTotal} SMS queued successfully`);
      this.broadcastMessage = '';
      this.broadcastTemplateId = '';
    } catch {
      this.toastr.error('Failed to queue some broadcast SMS');
    } finally {
      this.isBroadcasting = false;
    }
  }
}
