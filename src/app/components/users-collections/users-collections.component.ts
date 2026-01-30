import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-users-collections',
  imports: [CommonModule, FormsModule, ToastrModule],
  templateUrl: './users-collections.component.html',
  styleUrl: './users-collections.component.scss',
})
export class UsersCollectionsComponent {
  isLoading = false;
  isDeleting = false;
  searchTerm = '';
  users: any[] = [];
  filteredUsers: any[] = [];
  selectedDeleteId: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  selectedBill: any = null;
  showCollectModal = false;
  showReceiptModal = false;
  userName: string = '';

  collectionForm = {
    method: '',
    collected_id: '',
    collected_amount: '',
    bank_name: '',
  };

  receiptData: any = null;

  constructor(
    private firestore: Firestore,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('username') || '';
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
      const usersRef = collection(this.firestore, 'users');
      const snapshot = await getDocs(usersRef);

      const rows: any[] = [];

      snapshot.docs.forEach((docSnap) => {
        const user = docSnap.data();
        const bills = user['bills'] || [];

        bills.forEach((bill: any) => {
          rows.push({
            user_name: user['user_name'],
            internet_id: user['internet_id'],
            address: user['address'],
            connection_type: bill.type,
            month: bill.month,
            year: bill.year,
            amount: bill.amount,
            status: bill.status,
            createdAt: bill.createdAt,
          });
        });
      });

      this.users = rows;
      this.filteredUsers = rows;
      this.updateTotalPages();
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to load users bills');
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
        user.address?.toLowerCase().includes(term),
    );

    this.currentPage = 1;
    this.updateTotalPages();
  }

  openCollectModal(bill: any) {
    this.selectedBill = bill;
    this.collectionForm = {
      method: '',
      collected_id: '',
      collected_amount: bill.amount,
      bank_name: '',
    };
    this.showCollectModal = true;
  }

  async submitCollection() {
    try {
      const usersRef = collection(this.firestore, 'users');
      const snapshot = await getDocs(usersRef);

      snapshot.docs.forEach(async (docSnap) => {
        const userData = docSnap.data();
        const bills = userData['bills'] || [];

        bills.forEach((bill: any) => {
          if (
            bill.month === this.selectedBill.month &&
            bill.year === this.selectedBill.year &&
            bill.amount === this.selectedBill.amount &&
            bill.status === 'unpaid'
          ) {
            bill.status = 'paid';
            bill.collected_by = this.userName;
            bill.collected_date = new Date();
            bill.collected_method = this.collectionForm.method;
            bill.collected_id = this.collectionForm.collected_id;
            bill.collected_amount = this.collectionForm.collected_amount;
            bill.collected_bank =
              this.collectionForm.method === 'bank'
                ? this.collectionForm.bank_name
                : null;
          }
        });

        await updateDoc(docSnap.ref, { bills });
      });

      this.showCollectModal = false;
      this.prepareReceipt();
      this.showReceiptModal = true;
      this.toastr.success('Bill collected successfully');

      this.loadUsers();
    } catch (err) {
      console.error(err);
      this.toastr.error('Collection failed');
    }
  }

  prepareReceipt() {
    this.receiptData = {
      name: this.selectedBill.user_name,
      month: this.selectedBill.month,
      year: this.selectedBill.year,
      amount: this.collectionForm.collected_amount,
      method: this.collectionForm.method,
      date: new Date(),
      collectedBy: this.userName,
    };
  }

  saveReceiptImage() {
  const receipt = document.getElementById('receipt');

  if (!receipt) return;

  html2canvas(receipt, { scale: 2 }).then(canvas => {
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `receipt_${Date.now()}.png`;
    link.click();
  });
}

  shareReceiptImage() {
  const receipt = document.getElementById('receipt');

  if (!receipt) return;

  html2canvas(receipt, { scale: 2 }).then(canvas => {
    canvas.toBlob(blob => {
      if (!blob) return;

      const file = new File([blob], 'receipt.png', { type: 'image/png' });

      if ((navigator as any).share) {
        (navigator as any).share({
          files: [file],
          title: 'Payment Receipt'
        });
      } else {
        const url = URL.createObjectURL(blob);
        window.open(`https://wa.me/?text=Payment Receipt`, '_blank');
        URL.revokeObjectURL(url);
      }
    });
  });
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
