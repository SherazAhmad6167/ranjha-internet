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
import { FormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import {
  NgbActiveModal,
  NgbModal,
  NgbModule,
} from '@ng-bootstrap/ng-bootstrap';
import { UserModalComponent } from '../user-modal/user-modal.component';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-user-details',
  imports: [CommonModule, FormsModule, ToastrModule],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss',
})
export class UserDetailsComponent {
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

  constructor(
    private modalService: NgbModal,
    private firestore: Firestore,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadInternetAreas();
    this.loadCompanyDetails();
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

  async loadCompanyDetails() {
    try {
      const ref = doc(this.firestore, 'companyDetail', 'companyDetail');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.companyDetail = snap.data();
      }
    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to load company details');
    }
  }

  get pagedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  async loadUsers() {
    this.isLoading = true;

    try {
      const usersRef = collection(this.firestore, 'users');
      const snapshot = await getDocs(usersRef);

      this.users = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      this.users.sort((a, b) => {
        const getNumericPrefix = (id: string) => {
          if (!id) return 0;
          const match = id.match(/^0*(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        };

        const numA = getNumericPrefix(a.internet_id);
        const numB = getNumericPrefix(b.internet_id);

        return numA - numB;
      });

      // this.filteredUsers = this.users;
      this.onFilterChange();
      this.updateTotalPages();

      console.log('Fetched users:', this.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      this.toastr.error('Failed to load users');
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase();

    this.filteredUsers = this.users.filter(
      (user) =>
        user.user_name?.toLowerCase().includes(term) ||
        user.internet_id?.toLowerCase().includes(term) ||
        user.sublocality?.toLowerCase().includes(term) ||
        user.phone_no?.includes(term),
    );

    this.currentPage = 1; // reset to first page after search
    this.updateTotalPages();
  }

  onFilterChange() {
    const term = this.searchTerm.toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        user.user_name?.toLowerCase().includes(term) ||
        user.internet_id?.toLowerCase().includes(term) ||
        user.address?.toLowerCase().includes(term) ||
        user.sublocality?.toLowerCase().includes(term) ||
        user.phone_no?.includes(term);

      const matchesSublocality =
        !this.sublocality || user.sublocality === this.sublocality;

      return matchesSearch && matchesSublocality;
    });

    this.currentPage = 1;
    this.updateTotalPages();
  }

  openUserModal(userData?: any) {
    const modalRef = this.modalService.open(UserModalComponent, {
      size: 'xl',
      backdrop: 'static',
    });

    if (userData) {
      modalRef.componentInstance.editMode = true;
      modalRef.componentInstance.userData = userData;
    }

    modalRef.closed.subscribe((result) => {
      if (result) {
        const prevPage = this.currentPage;

        this.loadUsers().then(() => {
          this.currentPage = prevPage;
        });
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

    const userRef = doc(this.firestore, 'users', this.selectedDeleteId);

    try {
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        this.toastr.error('User not found');
        return;
      }

      const logData = {
        ...userSnap.data(),
        type: 'users',
        action: 'delete',
        originalId: this.selectedDeleteId,
        deletedAt: new Date(),
      };

      await addDoc(collection(this.firestore, 'logs'), logData);
      await addDoc(collection(this.firestore, 'logs'), {
        type: 'users',
        action: 'delete',
        targetId: this.selectedDeleteId,
        deletedAt: new Date(),
      });
      await deleteDoc(doc(this.firestore, 'users', this.selectedDeleteId));
      this.toastr.success('User deleted');
      this.loadUsers();
      modal.close();
    } catch (err) {
      this.toastr.error('Delete failed');
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

  async deleteMotaUsers() {
    const confirmDelete = confirm(
      'Are you sure you want to delete all Mota users?',
    );
    if (!confirmDelete) return;

    try {
      const usersRef = collection(this.firestore, 'users');
      const q = query(usersRef, where('sublocality', '==', 'Lakhanwal'));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        this.toastr.info('No users found with sublocality Mota');
        return;
      }

      const deletePromises: Promise<any>[] = [];

      querySnapshot.forEach((docSnap) => {
        deletePromises.push(
          deleteDoc(doc(this.firestore, 'users', docSnap.id)),
        );
      });

      await Promise.all(deletePromises);

      this.toastr.success(
        `${deletePromises.length} Mota users deleted successfully`,
      );
      this.loadUsers();
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to delete Mota users');
    }
  }

  receiptData: any = null;

  openReceiptModal(user: any) {
    this.showReceiptModal = true;

    this.receiptData = {
      name: user.user_name,
      month: user.month,
      year: user.year,
      address: user.address,
      installationDate: user.installation_date,
      totalAmount: user.amount,
      internet_package_fee: user.internet_package_fee,
      internetId: user.internet_id,
      installation_amount: user.installation_amount,
      select_package: user.select_package,
    };
  }

  saveReceiptImage() {
    const receipt = document.getElementById('receipt');

    if (!receipt) return;

    html2canvas(receipt, { scale: 2 }).then((canvas) => {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `receipt_${Date.now()}.png`;
      link.click();
    });
  }

  printReceipt() {
    // Make sure modal is visible
    if (!this.showReceiptModal) {
      console.warn('Receipt modal is not visible');
      return;
    }

    // Target the modal body
    const receipt = document.getElementById('receipt');
    if (!receipt) {
      console.warn('Receipt element not found');
      return;
    }

    // Use html2canvas with proper options
    html2canvas(receipt, {
      scale: 2, // Higher resolution
      useCORS: true, // For external images, if any
      backgroundColor: '#fff', // Force white background
    })
      .then((canvas) => {
        const dataUrl = canvas.toDataURL('image/png');

        const printWindow = window.open('', '', 'height=600,width=400');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body { margin: 0; padding: 0; text-align: center; }
            img { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" />
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 200);
      })
      .catch((err) => {
        console.error('Error printing receipt:', err);
      });
  }

  shareReceiptImage() {
    const receipt = document.getElementById('receipt');

    if (!receipt) return;

    html2canvas(receipt, { scale: 2 }).then((canvas) => {
      canvas.toBlob((blob) => {
        if (!blob) return;

        const file = new File([blob], 'receipt.png', { type: 'image/png' });

        if ((navigator as any).share) {
          (navigator as any).share({
            files: [file],
            title: 'Payment Receipt',
          });
        } else {
          const url = URL.createObjectURL(blob);
          window.open(`https://wa.me/?text=Payment Receipt`, '_blank');
          URL.revokeObjectURL(url);
        }
      });
    });
  }
}
