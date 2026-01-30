import { Component } from '@angular/core';
import { collection, deleteDoc, doc, Firestore, getDocs } from '@angular/fire/firestore';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { RecoveryOfficerModalComponent } from '../recovery-officer-modal/recovery-officer-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-recovery-officer',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './recovery-officer.component.html',
  styleUrl: './recovery-officer.component.scss'
})
export class RecoveryOfficerComponent {

   isLoading = false;
    isDeleting = false;
    searchTerm = '';
    users: any[] = [];
    filteredUsers: any[] = [];
    selectedDeleteId: string | null = null;
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
  
    constructor(
      private modalService: NgbModal,
      private firestore: Firestore,
      private toastr: ToastrService
    ) {}
  
    ngOnInit(): void {
      this.loadUsers();
    }
  
    get pagedUsers() {
      const start = (this.currentPage - 1) * this.pageSize;
      const end = start + this.pageSize;
      return this.filteredUsers.slice(start, end);
    }
  
    async loadUsers() {
      this.isLoading = true;
  
      try {
        const usersRef = collection(this.firestore, 'recoveryOfficer');
        const snapshot = await getDocs(usersRef);
  
        this.users = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
  
        this.filteredUsers = this.users;
        this.updateTotalPages();
  
        console.log('Fetched area:', this.users);
      } catch (error) {
        console.error('Error fetching area:', error);
        this.toastr.error('Failed to load Recovery Officer');
      } finally {
        this.isLoading = false;
      }
    }
  
    onSearch() {
      const term = this.searchTerm.toLowerCase();
  
      this.filteredUsers = this.users.filter(
        (user) =>
          user.name?.toLowerCase().includes(term) ||
          user.cnic?.toLowerCase().includes(term) ||
          user.phone?.includes(term)
      );
  
      this.currentPage = 1; // reset to first page after search
      this.updateTotalPages();
    }
  
    openUserModal(userData?: any) {
      const modalRef = this.modalService.open(RecoveryOfficerModalComponent, {
        size: 'xl',
        backdrop: 'static',
      });
  
      if (userData) {
        modalRef.componentInstance.editMode = true;
        modalRef.componentInstance.userData = userData;
      }
  
      modalRef.closed.subscribe((result) => {
        if (result) {
          this.loadUsers();
        }
      });
    }
  
    editUser(user: any) {
      this.openUserModal(user);
    }
  
    openDeleteModal(id: string, modal: any) {
      this.selectedDeleteId = id;
      this.modalService.open(modal, { centered: true });
    }
  
    async confirmDelete(modal: any) {
      if (!this.selectedDeleteId) return;
  
      this.isDeleting = true;
  
      try {
        await deleteDoc(doc(this.firestore, 'recoveryOfficer', this.selectedDeleteId));
        this.toastr.success('Recovery Officer deleted');
        this.loadUsers();
        modal.close();
      } catch (err) {
        this.toastr.error('Delete Recovery Officer failed');
      } finally {
        this.isDeleting = false;
        this.selectedDeleteId = null;
      }
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
}
