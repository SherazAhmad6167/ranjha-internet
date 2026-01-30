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
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Toast, ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-bill-creator',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './bill-creator.component.html',
  styleUrl: './bill-creator.component.scss',
})
export class BillCreatorComponent {
  isLoading = false;
  isDeleting = false;
  searchTerm = '';
  bills: any[] = [];
  filteredBills: any[] = [];
  selectedDeleteId: string | null = null;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  internetAreas: any[] = [];
  sublocality: string = '';
  connection_type: string = '';
  selectedMonth: string = '';
  selectedYear: string = '';
  userName: string | null = '';
  constructor(
    private modalService: NgbModal,
    private firestore: Firestore,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.userName = localStorage.getItem('username');
    this.loadInternetAreas();
    this.loadBills();
  }

  async loadInternetAreas() {
    try {
      const ref = doc(this.firestore, 'internetArea', 'internetAreaDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.internetAreas = snap.data()?.['internetAreas'] || [];
      }
    } catch (error) {
      console.error('Error loading internet areas', error);
    }
  }

  get pagedUsers() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredBills.slice(start, end);
  }

  async loadBills() {
    this.isLoading = true;

    try {
      const billsRef = collection(this.firestore, 'billCreator');
      const snapshot = await getDocs(billsRef);

      this.bills = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      this.bills.sort((a, b) => {
        // Firestore Timestamp
        const timeA = a.createdAt?.toDate
          ? a.createdAt.toDate().getTime()
          : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toDate
          ? b.createdAt.toDate().getTime()
          : new Date(b.createdAt).getTime();
        return timeB - timeA; // descending
      });

      this.filteredBills = this.bills;
      this.updateTotalPages();

      console.log('Fetched bills:', this.bills);
    } catch (error) {
      console.error('Error fetching bills:', error);
      this.toastr.error('Failed to load Bills');
    } finally {
      this.isLoading = false;
    }
  }

  onSearch() {
    const term = this.searchTerm.toLowerCase();

    this.filteredBills = this.bills.filter(
      (bill) =>
        bill.month?.toLowerCase().includes(term) ||
        bill.year?.toLowerCase().includes(term) ||
        bill.sublocality?.toLowerCase().includes(term),
    );

    this.currentPage = 1; // reset to first page after search
    this.updateTotalPages();
  }

  openDeleteModal(id: string, modal: any) {
    this.selectedDeleteId = id;
    this.modalService.open(modal, { centered: true });
  }

  updateTotalPages() {
    this.totalPages = Math.ceil(this.filteredBills.length / this.pageSize) || 1;
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

  async createBill() {
    if (
      !this.selectedMonth ||
      !this.selectedYear ||
      !this.connection_type ||
      !this.sublocality
    ) {
      this.toastr.error('Please select all filters');
      return;
    }

    await this.checkDuplicateBill();
  }

  async checkDuplicateBill() {
    const billsRef = collection(this.firestore, 'billCreator');
    const snap = await getDocs(billsRef);

    const exists = snap.docs.some(
      (d) =>
        d.data()['month'] === this.selectedMonth &&
        d.data()['year'] === this.selectedYear &&
        d.data()['connection_type'] === this.connection_type &&
        d.data()['sublocality'] === this.sublocality,
    );

    if (exists) {
      this.toastr.error('Bill already created for this Month & Year');
      return;
    }

    await this.createBillForUsers();
  }

  async createBillForUsers() {
    this.isLoading = true;

    try {
      const usersSnap = await getDocs(collection(this.firestore, 'users'));

      const eligibleUsers = usersSnap.docs.filter((docSnap) => {
        const u = docSnap.data();
        return (
          u['connection_type'] === this.connection_type &&
          (this.sublocality === 'all' || u['sublocality'] === this.sublocality)
        );
      });

      if (!eligibleUsers.length) {
        this.toastr.warning('No users found');
        return;
      }

      const totalAmount = await this.updateUsersBills(eligibleUsers);

      await this.createBillCreatorDoc(eligibleUsers.length, totalAmount);

      this.toastr.success('Bill created successfully');
      this.loadBills();
    } catch (e) {
      console.error(e);
      this.toastr.error('Bill creation failed');
    } finally {
      this.isLoading = false;
    }
  }

  async updateUsersBills(users: any[]) {
    let totalAmount = 0;

    for (const u of users) {
      const ref = doc(this.firestore, 'users', u.id);
      const snap = await getDoc(ref);

      const userData = snap.data();
      let bills = userData?.['bills'] || [];

      const exists = (type: string) =>
        bills.some(
          (b: any) =>
            b.month === this.selectedMonth &&
            b.year === this.selectedYear &&
            b.type === type,
        );

      // ================= CABLE =================
      if (
        (this.connection_type === 'tv_cable' ||
          this.connection_type === 'both') &&
        userData?.['cable_package_fee']
      ) {
        if (!exists('cable')) {
          const amount = Number(userData['cable_package_fee']);

          bills.push({
            month: this.selectedMonth,
            year: this.selectedYear,
            type: 'cable',
            amount,
            status: 'unpaid',
            createdAt: new Date(),
          });

          totalAmount += amount;
        }
      }

      // ================= INTERNET =================
      if (
        (this.connection_type === 'internet' ||
          this.connection_type === 'both') &&
        userData?.['internet_package_fee']
      ) {
        if (!exists('internet')) {
          const amount = Number(userData['internet_package_fee']);

          bills.push({
            month: this.selectedMonth,
            year: this.selectedYear,
            type: 'internet',
            amount,
            status: 'unpaid',
            createdAt: new Date(),
          });

          totalAmount += amount;
        }
      }

      await updateDoc(ref, { bills });
    }

    return totalAmount;
  }

  async createBillCreatorDoc(totalUsers: number, totalAmount: number) {
    await addDoc(collection(this.firestore, 'billCreator'), {
      month: this.selectedMonth,
      year: this.selectedYear,
      connection_type: this.connection_type,
      sublocality: this.sublocality,
      amount: totalAmount,
      users: totalUsers,
      status: 'unpaid',
      createdAt: new Date(),
      created_by: this.userName || 'Unknown',
    });
  }

  async confirmDelete(modal: any) {
    if (!this.selectedDeleteId) return;

    this.isDeleting = true;

    try {
      const billRef = doc(this.firestore, 'billCreator', this.selectedDeleteId);
      const billSnap = await getDoc(billRef);
      const bill = billSnap.data();

       if (!billSnap.exists()) {
        this.toastr.error('Bill not found');
        return;
      }

      const logData = {
        ...billSnap.data(),
        type: 'bill',
        action: 'delete',
        originalId: this.selectedDeleteId,
        deletedAt: new Date(),
      };

      await addDoc(collection(this.firestore, 'logs'), logData);

      await deleteDoc(billRef);
      await this.removeBillFromUsers(bill);

      this.toastr.success('Bill deleted');
      this.loadBills();
      modal.close();
    } catch {
      this.toastr.error('Delete failed');
    } finally {
      this.isDeleting = false;
    }
  }

  async removeBillFromUsers(bill: any) {
    const usersSnap = await getDocs(collection(this.firestore, 'users'));

    for (const docSnap of usersSnap.docs) {
      const ref = doc(this.firestore, 'users', docSnap.id);
      const bills = docSnap.data()['bills'] || [];

      const updatedBills = bills.filter(
        (b: any) =>
          !(
            b.month === bill.month &&
            b.year === bill.year &&
            (bill.connection_type === 'both' || b.type === bill.connection_type)
          ),
      );

      if (updatedBills.length !== bills.length) {
        await updateDoc(ref, { bills: updatedBills });
      }
    }
  }
}
