import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { MikrotikService, MikrotikError } from '../../shared/mikrotik.service';

@Component({
  selector: 'app-mikrotik-users',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './mikrotik-users.component.html',
  styleUrl: './mikrotik-users.component.scss',
})
export class MikrotikUsersComponent implements OnInit {
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  proxyError: string | null = null;
  proxyIsCors = false;

  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm = '';

  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  editMode = false;
  selectedUser: any = null;
  userToDelete: any = null;

  form!: FormGroup;
  readonly Math = Math;

  @ViewChild('userModal') userModal!: TemplateRef<any>;
  @ViewChild('deleteModal') deleteModal!: TemplateRef<any>;

  private modalRef?: NgbModalRef;
  private deleteModalRef?: NgbModalRef;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private mikrotikService: MikrotikService,
    private toastr: ToastrService,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      profile: ['default', Validators.required],
      service: ['pppoe', Validators.required],
      comment: [''],
    });
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading = true;
    this.proxyError = null;
    this.mikrotikService.getPppSecrets().subscribe({
      next: (data) => {
        this.users = data;
        this.applyFilter();
        this.isLoading = false;
      },
      error: (err: MikrotikError) => {
        this.proxyError = err.message;
        this.proxyIsCors = err.isCors;
        this.isLoading = false;
      },
    });
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = term
      ? this.users.filter(
          (u) =>
            u.name?.toLowerCase().includes(term) ||
            u.profile?.toLowerCase().includes(term) ||
            u.comment?.toLowerCase().includes(term),
        )
      : [...this.users];
    this.currentPage = 1;
    this.updatePagination();
  }

  get totalCount() {
    return this.users.length;
  }
  get activeCount() {
    return this.users.filter((u) => u.disabled !== 'true').length;
  }
  get disabledCount() {
    return this.users.filter((u) => u.disabled === 'true').length;
  }

  get pagedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  updatePagination() {
    this.totalPages =
      Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.floor((this.currentPage - 1) / 5) * 5 + 1;
    const end = Math.min(start + 4, this.totalPages);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  prevPage() {
    if (this.currentPage > 1) this.currentPage--;
  }
  nextPage() {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
  goToPage(p: number) {
    this.currentPage = p;
  }
  onPageSizeChange() {
    this.currentPage = 1;
    this.updatePagination();
  }

  openAddModal() {
    this.editMode = false;
    this.selectedUser = null;
    this.form.reset({ profile: 'default', service: 'pppoe', comment: '' });
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.form.get('password')?.updateValueAndValidity();
    this.modalRef = this.modalService.open(this.userModal, {
      size: 'md',
      backdrop: 'static',
    });
  }

  openEditModal(user: any) {
    this.editMode = true;
    this.selectedUser = user;
    this.form.patchValue({
      name: user.name,
      password: '',
      profile: user.profile || 'default',
      service: user.service || 'pppoe',
      comment: user.comment || '',
    });
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();
    this.modalRef = this.modalService.open(this.userModal, {
      size: 'md',
      backdrop: 'static',
    });
  }

  saveUser() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const { name, password, profile, service, comment } = this.form.value;

    if (this.editMode && this.selectedUser) {
      const updates: Record<string, string> = { profile, service, comment };
      if (password) updates['password'] = password;

      this.mikrotikService
        .updatePppSecret(this.selectedUser['.id'], updates)
        .subscribe({
          next: () => {
            this.toastr.success(`User "${this.selectedUser.name}" updated`);
            this.isSaving = false;
            this.modalRef?.close();
            this.loadUsers();
          },
          error: (err: MikrotikError) => {
            this.toastr.error(err.message || 'Failed to update user');
            this.isSaving = false;
          },
        });
    } else {
      this.mikrotikService
        .createPppSecret(name, password, profile, service)
        .subscribe({
          next: () => {
            this.toastr.success(`User "${name}" created`);
            this.isSaving = false;
            this.modalRef?.close();
            this.loadUsers();
          },
          error: (err: MikrotikError) => {
            this.toastr.error(err.message || 'Failed to create user');
            this.isSaving = false;
          },
        });
    }
  }

  openDeleteModal(user: any) {
    this.userToDelete = user;
    this.deleteModalRef = this.modalService.open(this.deleteModal, {
      centered: true,
    });
  }

  confirmDelete(modal: any) {
    if (!this.userToDelete) return;
    this.isDeleting = true;

    this.mikrotikService.deletePppSecret(this.userToDelete['.id']).subscribe({
      next: () => {
        this.toastr.success(`User "${this.userToDelete.name}" deleted`);
        this.isDeleting = false;
        this.userToDelete = null;
        modal.close();
        this.loadUsers();
      },
      error: (err: MikrotikError) => {
        this.toastr.error(err.message || 'Failed to delete user');
        this.isDeleting = false;
      },
    });
  }
}
