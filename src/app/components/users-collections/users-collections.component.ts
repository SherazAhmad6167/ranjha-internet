import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  updateDoc,
} from '@angular/fire/firestore';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import html2canvas from 'html2canvas';
import { UserCollectionModalComponent } from '../user-collection-modal/user-collection-modal.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-users-collections',
  imports: [CommonModule, FormsModule, ToastrModule, ReactiveFormsModule],
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
  role: any;
  sublocality: string = '';
  internetAreas: any[] = [];
  collectionForm = {
    method: '',
    collected_id: '',
    collected_amount: '',
    bank_name: '',
  };

  receiptData: any = null;
  selectedStatus: 'paid' | 'unpaid' | 'advance' | 'remaining' = 'paid';
  nextMonths: { month: string; year: string }[] = [];
  operatorSublocalities: string[] = [];
  summary = {
    totalUsers: 0,
    totalBillAmount: 0,
    totalPaidUsers: 0,
    totalPaidAmount: 0,
    totalUnpaidUsers: 0,
    totalUnpaidAmount: 0,
    totalAdvanceUsers: 0,
    totalAdvanceAmount: 0,
    totalRemainingUsers: 0,
    totalRemainingAmount: 0,
  };
  companyDetail: any = {};
  showAdvanceModal = false;
  advanceForm = {
    method: '',
    collected_id: '',
    bank_name: '',
    amount: '',
    months: [] as { month: string; year: string }[],
  };
  isBulkMode = false;
  selectedBulkBills: any[] = [];
  isBulkSubmitting = false;
  userForm: FormGroup;
  internetOriginalPrice = 0;

  constructor(
    private firestore: Firestore,
    private toastr: ToastrService,
    private modalService: NgbModal,
    private fb: FormBuilder,
  ) {
    this.userForm = this.fb.group({
      select_package: [null, [Validators.required]],
      internet_package_fee: [null, [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.userName = localStorage.getItem('username') || '';
    this.role = localStorage.getItem('role') || '';

    if (this.role === 'operator') {
      this.operatorSublocalities = JSON.parse(
        localStorage.getItem('sublocality') || '[]',
      );
    }

    this.loadInternetAreas();
    this.loadUsers();
    this.loadCompanyDetails();
    this.loadInternetPackages();

    // INTERNET PACKAGE
    this.userForm.get('select_package')?.valueChanges.subscribe((pkgName) => {
      const pkg = this.internetPackages.find((p) => p.package_name === pkgName);

      if (!pkg) return;

      this.internetOriginalPrice = Number(pkg.sales_price);

      this.userForm.patchValue({
        internet_package_fee: this.internetOriginalPrice,
        internet_discount: '',
      });
    });
  }

  async loadInternetPackages() {
    try {
      const ref = doc(this.firestore, 'internetPackage', 'internetPackageDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.internetPackages = snap.data()?.['internetPackage'] || [];
      }
    } catch (error) {
      console.error('Error loading internet packages', error);
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

      const paidRows: any[] = [];
      const unpaidMap = new Map<string, any>();
      const advanceRows: any[] = [];

      snapshot.docs.forEach((docSnap) => {
        const user = docSnap.data();
        const userDocId = docSnap.id;

        const bills = user['bills'] || [];
        const advances = user['advancePayments'] || [];

        /* ================= BILLS ================= */
        bills.forEach((bill: any) => {
          const baseRow = {
            user_name: user['user_name'],
            internet_id: user['internet_id'],
            docId: userDocId,
            address: user['address'],
            sublocality: user['sublocality'] || '',
            connection_type: bill.type,
            createdAt: bill.createdAt,
            installationDate: user['installation_date'],
            advancePayments: advances || [],
            select_package: user['select_package'],
            internet_package_fee: user['internet_package_fee'],
          };

          if (bill.status === 'paid') {
            paidRows.push({
              ...baseRow,
              month: bill.month,
              year: bill.year,
              amount: bill.amount,
              status: 'paid',
              bill_id: bill.bill_id,
              collected_amount: bill.collected_amount,
              remaining_amount: bill.remaining_amount || 0,
              collected_method: bill.collected_method,
              collected_by: bill.collected_by,
              collected_date: bill.collected_date,
              collected_bank: bill.collected_bank,
              advancePayments: advances || [],
            });
          } else {
            const key = `${user['internet_id']}`;

            if (!unpaidMap.has(key)) {
              unpaidMap.set(key, {
                ...baseRow,
                status: 'unpaid',
                amount: bill.amount,
                months: [`${bill.month} ${bill.year}`],
                bills: [bill],
                advancePayments: advances || [],
              });
            } else {
              const existing = unpaidMap.get(key);
              existing.amount = bill.amount;
              existing.months.push(`${bill.month} ${bill.year}`);
              existing.bills.push(bill);
            }
          }
        });

        /* ================= ADVANCE PAYMENTS ================= */
        advances.forEach((adv: any) => {
          if (!adv.isAdvance) return;

          const advanceMonthText = (adv.advance_months || [])
            .map((m: any) => `${m.month} ${m.year}`)
            .join(', ');

          advanceRows.push({
            user_name: user['user_name'],
            internet_id: user['internet_id'],
            docId: userDocId,
            address: user['address'],
            sublocality: user['sublocality'] || '',
            connection_type: user['connection_type'],
            createdAt: adv.collected_date,

            month: advanceMonthText,
            year: '',
            extra_advance: user['extra_advance'] || 0,
            amount: adv.advance_amount + (user['extra_advance'] || 0),
            status: 'advance',

            advance_id: adv.advance_id,
            collected_amount: adv.advance_amount,
            collected_method: adv.collected_method,
            collected_by: adv.collected_by,
            collected_date: adv.collected_date,
            collected_bank: adv.collected_bank,
            advancePayments: [adv],
          });
        });
      });

      const unpaidRows = Array.from(unpaidMap.values()).map((u) => ({
        ...u,
        month: u.months.join(', '),
        year: '',
      }));

      /* 🔥 INCLUDE ADVANCE ROWS */
      this.users = [...paidRows, ...unpaidRows, ...advanceRows];

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

      this.filteredUsers = this.users;
      this.onFilterChange();
    } catch (err) {
      console.error(err);
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

  // in component
  getAdvanceButtonDisabled(row: any): boolean {
    const disabled = this.isAdvanceButtonDisabled(row);
    return disabled;
  }

  isAdvanceButtonDisabled(row: any): boolean {
    if (!row.advancePayments || row.advancePayments.length === 0) return false;

    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = Jan
    const currentYear = now.getFullYear();

    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    return row.advancePayments.some((adv: any) => {
      if (!adv.advance_months || adv.advance_months.length === 0) return false;

      return adv.advance_months.some((m: any) => {
        const monthIndex = monthNames.indexOf(m.month.toLowerCase());
        const yearNum = Number(m.year);
        if (monthIndex === -1 || isNaN(yearNum)) return false;

        // disable if advance for current month or future months
        if (yearNum > currentYear) return true;
        if (yearNum === currentYear && monthIndex >= currentMonth) return true;

        return false;
      });
    });
  }

  onFilterChange() {
    const term = this.searchTerm.toLowerCase();

    this.filteredUsers = this.users.filter((user) => {
      const matchesSearch =
        user.user_name?.toLowerCase().includes(term) ||
        user.internet_id?.toLowerCase().includes(term) ||
        user.address?.toLowerCase().includes(term);

      // const matchesStatus =
      //   !this.selectedStatus || user.status === this.selectedStatus;

      const matchesStatus =
        !this.selectedStatus ||
        (this.selectedStatus === 'remaining'
          ? user.status === 'paid' && (user.remaining_amount || 0) > 0
          : user.status === this.selectedStatus);

      // Normalize sublocality to an array
      const userSublocalities: string[] = Array.isArray(user.sublocality)
        ? user.sublocality
        : user.sublocality
          ? [user.sublocality]
          : [];

      let matchesSublocality = true;

      if (this.role === 'operator') {
        // Operator sees only their assigned sublocalities
        const overlap = userSublocalities.filter((sub) =>
          this.operatorSublocalities.includes(sub),
        );
        if (!overlap.length) return false; // no match, skip user

        // If operator also selected a sublocality from dropdown, filter further
        if (this.sublocality) {
          matchesSublocality = overlap.includes(this.sublocality);
        } else {
          matchesSublocality = true; // no dropdown selection, all operator sublocalities
        }
      } else {
        // Admin filter by dropdown if selected
        matchesSublocality =
          !this.sublocality || userSublocalities.includes(this.sublocality);
      }

      return matchesSearch && matchesStatus && matchesSublocality;
    });

    // this.currentPage = 1;
    this.updateTotalPages();

    const filtered = this.filteredUsers;

    this.summary.totalUsers = filtered.length;
    this.summary.totalBillAmount = filtered.reduce(
      (sum, u) => sum + (u.amount || 0),
      0,
    );

    const paidUsers = filtered.filter((u) => u.status === 'paid');

    this.summary.totalPaidUsers = paidUsers.length;

    this.summary.totalPaidAmount = paidUsers.reduce(
      (sum, u) => sum + (u.collected_amount || 0),
      0,
    );

    const unpaidUsers = filtered.filter((u) => u.status === 'unpaid');
    this.summary.totalUnpaidUsers = unpaidUsers.length;
    this.summary.totalUnpaidAmount = unpaidUsers.reduce(
      (sum, u) => sum + (u.amount || 0),
      0,
    );

    const advanceUsers = filtered.filter((u) => u.status === 'advance');

    this.summary.totalAdvanceUsers = advanceUsers.length;
    this.summary.totalAdvanceAmount = advanceUsers.reduce(
      (sum, u) => sum + (u.amount || 0),
      0,
    );

    const remainingUsers = filtered.filter(
      (u) => u.status === 'paid' && (u.remaining_amount || 0) > 0,
    );

    this.summary.totalRemainingUsers = remainingUsers.length;
    this.summary.totalRemainingAmount = remainingUsers.reduce(
      (sum, u) => sum + (u.remaining_amount || 0),
      0,
    );
  }

  async quickCashPay(bill: any) {
    if (this.isSubmitting) return;
    this.selectedBill = { ...bill, userDocId: bill.docId };

    this.collectionForm = {
      method: 'cash',
      collected_id: '',
      collected_amount:
        bill.remaining_amount > 0 ? bill.remaining_amount : bill.amount,
      bank_name: '',
    };

    await this.submitCollection();
  }

  openCollectModal(bill: any, userDocId: string) {
    this.selectedBill = { ...bill, userDocId };
    // this.nextMonths = this.getNextMonths(bill.month, bill.year, 12);
    this.collectionForm = {
      method: '',
      collected_id: '',
      collected_amount: bill.amount,
      bank_name: '',
    };
    this.showCollectModal = true;
  }
  isSubmitting = false;

  async revertBill(billRow: any) {
    try {
      // 🔹 Use doc() for a specific user
      const userDocRef = doc(this.firestore, 'users', billRow.docId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const bills = userData['bills'] || [];

      let updated = false;

      bills.forEach((bill: any) => {
        if (
          bill.status === 'paid' &&
          ((bill.bill_id && bill.bill_id === billRow.bill_id) ||
            (!bill.bill_id &&
              bill.amount === billRow.amount &&
              bill.month === billRow.month &&
              bill.year === billRow.year))
        ) {
          // 🔁 revert
          bill.status = 'unpaid';
          bill.collected_by = null;
          bill.collected_date = null;
          bill.collected_method = null;
          bill.collected_id = null;
          bill.collected_amount = null;
          bill.collected_bank = null;
          bill.remaining_amount = null;

          updated = true;
        }
      });

      if (updated) {
         updateDoc(userDocRef, { bills });
      }

      if (!navigator.onLine) {
        this.toastr.info(
          'Saved offline. Will sync when connection is restored.',
        );
      } else {
        this.toastr.success('Bill reverted to unpaid');
      }
      this.loadUsers();
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to revert bill');
    }
  }

  openReceiptModal(bill: any) {
    this.selectedBill = bill;

    this.receiptData = {
      name: bill.user_name,
      month: bill.month,
      year: bill.year,
      address: this.selectedBill.address,
      advance: '',
      totalAmount: bill.amount,
      method: bill.collected_method ?? 'cash',
      collectedAmount: bill.collected_amount ?? 0,
      remainingAmount: bill.remaining_amount ?? 0,
      date: bill.collected_date
        ? bill.collected_date.toDate?.() || bill.collected_date
        : new Date(),
      collectedBy: bill.collected_by ?? '—',
      bank: bill.collected_bank ?? '',
      internetId: bill.internet_id,
      installationDate: this.selectedBill.installationDate,
    };
    console.log('Receipt Data:', this.selectedBill);

    this.showReceiptModal = true;
  }

  prepareReceipt() {
    const bill = this.selectedBill;

    this.receiptData = {
      name: bill.user_name,
      month: bill.month,
      year: bill.year,
      address: this.selectedBill.address,
      advance: '',
      totalAmount: Number(bill.amount) || 0,
      collectedAmount: Number(bill.collected_amount) || 0,
      remainingAmount: Number(bill.remaining_amount) || 0,
      internetId: bill.internet_id,
      installationDate: this.selectedBill.installationDate,
      method: this.collectionForm.method,
      date: new Date(),
      collectedBy: this.userName,
      bank: this.collectionForm.bank_name || '',
    };

    console.log('Receipt Data:', this.receiptData);
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

  toggleAdvanceMonthSeparate(monthObj: { month: string; year: string }) {
    const index = this.advanceForm.months.findIndex(
      (m) => m.month === monthObj.month && m.year === monthObj.year,
    );

    if (index > -1) {
      this.advanceForm.months.splice(index, 1);
    } else {
      this.advanceForm.months.push(monthObj);
    }

    this.advanceForm.amount = String(
      this.advanceForm.months.length * this.packageFee,
    );
  }

  getNextMonths(startMonth: string, startYear?: string, count: number = 12) {
    const months = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];

    let result: { month: string; year: string }[] = [];

    // STEP 1: comma handle karo
    // "february 2026, january 2026" → "january 2026"
    const normalized = startMonth.includes(',')
      ? startMonth.split(',').pop()!.trim()
      : startMonth.trim();

    let monthName = '';
    let year: number;

    // STEP 2: check karo year string ke andar hai ya nahi
    const parts = normalized.split(' ');

    if (parts.length === 2) {
      // case: "february 2026"
      monthName = parts[0].toLowerCase();
      year = parseInt(parts[1], 10);
    } else if (parts.length === 1 && startYear) {
      // case: "february" + "2026"
      monthName = parts[0].toLowerCase();
      year = parseInt(startYear, 10);
    } else {
      console.error('Invalid month/year', startMonth, startYear);
      return [];
    }

    const mIndexStart = months.indexOf(monthName);
    if (mIndexStart === -1 || isNaN(year)) {
      console.error('Invalid month/year', startMonth, startYear);
      return [];
    }

    let mIndex = mIndexStart;

    for (let i = 1; i <= count; i++) {
      mIndex++;
      if (mIndex > 11) {
        mIndex = 0;
        year++;
      }
      result.push({ month: months[mIndex], year: year.toString() });
    }

    return result;
  }

  openUserDetails(docId: string) {
    const modalRef = this.modalService.open(UserCollectionModalComponent, {
      size: 'xl',
      scrollable: true,
    });
    modalRef.componentInstance.docId = docId;
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

  

  packageFee: any;
  openAdvanceModal(row: any) {
    this.selectedBill = row;

    this.packageFee = Number(row.internet_package_fee) || Number(row.cable_package_fee);
    console.log('Selected Bill MOnth:', row.month, row.year);
    this.nextMonths = this.getNextMonths(row.month, row.year, 12);

    this.advanceForm = {
      method: '',
      collected_id: '',
      bank_name: '',
      amount: '',
      months: [],
    };

    this.showAdvanceModal = true;
  }

  async submitAdvance() {
    this.isLoadingAdvance = true;
    try {
      const ref = doc(this.firestore, 'users', this.selectedBill.docId);
      const snap = await getDoc(ref);

      if (!snap.exists()) return;

      const userData = snap.data();
      const advancePayments = userData['advancePayments'] || [];

        const totalBill =
      this.advanceForm.months.length * this.packageFee;

    const paidAmount = Number(this.advanceForm.amount);

    // ✅ extra advance
    let extraAdvance = 0;

    if (paidAmount > totalBill) {
      extraAdvance = paidAmount - totalBill;
    }

    const advanceAmountToSave =
      paidAmount > totalBill ? totalBill : paidAmount;

    const existingExtraAdvance =
      Number(userData['extra_advance']) || 0;

      advancePayments.push({
        advance_id: crypto.randomUUID(),
        advance_amount: advanceAmountToSave,
        advance_months: this.advanceForm.months,
        collected_by: this.userName,
        collected_method: this.advanceForm.method,
        collected_id: this.advanceForm.collected_id || null,
        collected_bank:
          this.advanceForm.method === 'bank'
            ? this.advanceForm.bank_name
            : null,
        collected_date: new Date(),
        isAdvance: true,
      });

      updateDoc(ref, { advancePayments,
      extra_advance: existingExtraAdvance + extraAdvance, });

      this.showAdvanceModal = false;
      this.prepareAdvanceReceipt();
      this.showReceiptModal = true;

      if (!navigator.onLine) {
        this.toastr.info(
          'Saved offline. Will sync when connection is restored.',
        );
      } else {
        this.toastr.success('Advance payment saved');
      }
      this.loadUsers();
    } catch (err) {
      console.error(err);
      this.toastr.error('Advance failed');
    } finally {
      this.isLoadingAdvance = false;
    }
  }

  async revertAdvance(advanceRow: any) {
    if (!confirm('Are you sure you want to revert this advance?')) return;

    try {
      const ref = doc(this.firestore, 'users', advanceRow.docId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;

      const advancePayments = snap.data()['advancePayments'] || [];

      const updatedAdvances = advancePayments.filter(
        (adv: any) => adv.advance_id !== advanceRow.advance_id,
      );

      updateDoc(ref, { advancePayments: updatedAdvances });

      if (!navigator.onLine) {
        this.toastr.info(
          'Saved offline. Will sync when connection is restored.',
        );
      } else {
        this.toastr.success('Advance reverted successfully');
      }

      this.loadUsers();
    } catch (err) {
      console.error(err);
      this.toastr.error('Failed to revert advance');
    }
  }

  isLoadingAdvance = false;

  prepareAdvanceReceipt() {
    const monthsText = (this.advanceForm.months || [])
      .map((m: any) => `${m.month} ${m.year}`)
      .join(', ');
    this.receiptData = {
      name: this.selectedBill.user_name,
      month: monthsText,
      advance: 'Advance',
      totalAmount: this.advanceForm.amount,
      address: this.selectedBill.address,
      method: this.advanceForm.method,
      date: new Date(),
      collectedBy: this.userName,
      bank: this.advanceForm.bank_name,
      advanceMonths: this.advanceForm.months,
      internetId: this.selectedBill.internet_id,
      installationDate: this.selectedBill.installationDate,
    };
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

  startBulkMode() {
    this.isBulkMode = true;
    this.selectedBulkBills = [];
  }

  cancelBulkMode() {
    this.isBulkMode = false;
    this.selectedBulkBills = [];
  }

  toggleBulkSelection(row: any) {
    const index = this.selectedBulkBills.findIndex(
      (b) => b.docId === row.docId && b.month === row.month,
    );

    if (index > -1) {
      this.selectedBulkBills.splice(index, 1);
    } else {
      this.selectedBulkBills.push(row);
    }
  }

  isSelected(row: any): boolean {
    return this.selectedBulkBills.some(
      (b) => b.docId === row.docId && b.month === row.month,
    );
  }

  async submitCollection() {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    try {
      const userDocRef = doc(
        this.firestore,
        'users',
        this.selectedBill.userDocId,
      );
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const bills = userData['bills'] || [];
      let updatedSelectedBill: any = null;

      if (this.selectedBill.status === 'unpaid' && this.selectedBill.bills) {
        bills.forEach((bill: any) => {
          const match = this.selectedBill.bills.some((b: any) =>
            b.bill_id
              ? b.bill_id === bill.bill_id
              : b.month === bill.month &&
                b.year === bill.year &&
                b.amount === bill.amount,
          );

          if (match) {
            const paidNow = Number(this.collectionForm.collected_amount || 0);
            const total = Number(bill.amount);
            const alreadyPaid = Number(bill.collected_amount || 0);

            const newCollected = alreadyPaid + paidNow;
            const remaining = total - newCollected;

            bill.collected_amount = newCollected;
            bill.remaining_amount = remaining > 0 ? remaining : 0;
            bill.status = 'paid';
            bill.collected_by = this.userName;
            bill.collected_date = new Date();
            bill.collected_method = this.collectionForm.method;
            bill.collected_id = this.collectionForm.collected_id;
            bill.collected_bank =
              this.collectionForm.method === 'bank'
                ? this.collectionForm.bank_name
                : null;
            updatedSelectedBill = { ...bill };
            // 🔹 NEW ADDITION: adjust payment against previous pending bills
            let adjustAmount = Number(
              this.collectionForm.collected_amount || 0,
            );

            bills
              .filter(
                (b: any) =>
                  b.type === bill.type &&
                  b.remaining_amount > 0 &&
                  b.createdAt.toDate() < bill.createdAt.toDate(),
              )
              .sort(
                (a: any, b: any) => a.createdAt.toDate() - b.createdAt.toDate(),
              )
              .forEach((prevBill: any) => {
                if (adjustAmount <= 0) return;

                const reduce = Math.min(
                  prevBill.remaining_amount,
                  adjustAmount,
                );
                prevBill.remaining_amount -= reduce;
                adjustAmount -= reduce;

                if (prevBill.remaining_amount === 0) {
                  prevBill.status = 'paid';
                }
              });
          }
        });
      } else {
        bills.forEach((bill: any) => {
          if (
            bill.month === this.selectedBill.month &&
            bill.year === this.selectedBill.year &&
            bill.status === 'unpaid'
          ) {
            const paidNow = Number(this.collectionForm.collected_amount || 0);
            const total = Number(bill.amount);
            const alreadyPaid = Number(bill.collected_amount || 0);

            const newCollected = alreadyPaid + paidNow;
            const remaining = total - newCollected;

            bill.collected_amount = newCollected;
            bill.remaining_amount = remaining > 0 ? remaining : 0;

            bill.status = 'paid';

            bill.collected_by = this.userName;
            bill.collected_date = new Date();
            bill.collected_method = this.collectionForm.method;
            bill.collected_id = this.collectionForm.collected_id;
            bill.collected_bank =
              this.collectionForm.method === 'bank'
                ? this.collectionForm.bank_name
                : null;
            updatedSelectedBill = { ...bill };
            // 🔹 NEW ADDITION: adjust payment against previous pending bills
            let adjustAmount = Number(
              this.collectionForm.collected_amount || 0,
            );

            bills
              .filter(
                (b: any) =>
                  b.type === bill.type &&
                  b.remaining_amount > 0 &&
                  b.createdAt.toDate() < bill.createdAt.toDate(),
              )
              .sort(
                (a: any, b: any) => a.createdAt.toDate() - b.createdAt.toDate(),
              )
              .forEach((prevBill: any) => {
                if (adjustAmount <= 0) return;

                const reduce = Math.min(
                  prevBill.remaining_amount,
                  adjustAmount,
                );
                prevBill.remaining_amount -= reduce;
                adjustAmount -= reduce;

                if (prevBill.remaining_amount === 0) {
                  prevBill.status = 'paid';
                }
              });
          }
        });
      }

      updateDoc(userDocRef, { bills });

      if (updatedSelectedBill) {
        this.selectedBill = {
          ...this.selectedBill,
          ...updatedSelectedBill,
        };
      }

      this.showCollectModal = false;
      this.prepareReceipt();
      this.showReceiptModal = true;
      if (!navigator.onLine) {
        this.toastr.info(
          'Saved offline. Will sync when connection is restored.',
        );
      } else {
        this.toastr.success('Bill collected successfully');
      }
      const page = this.currentPage;
      console.log('before save', page);
      this.loadUsers();
      this.currentPage = page;
      console.log('after save', this.currentPage);
    } catch (err) {
      console.error(err);
      this.toastr.error('Collection failed');
    } finally {
      this.isSubmitting = false;
    }
  }

  async submitBulkCollection() {
    if (!this.selectedBulkBills.length) return;
    console.log('selectedBulkBills:', this.selectedBulkBills);

    this.isBulkSubmitting = true;

    try {
      for (const row of this.selectedBulkBills) {
        const userDocRef = doc(this.firestore, 'users', row.docId);
        const userSnap = await getDoc(userDocRef);
        if (!userSnap.exists()) continue;

        const userData = userSnap.data();
        const bills = userData['bills'] || [];

        bills.forEach((bill: any) => {
          const match = row.bills?.some(
            (selected: any) => selected.bill_id === bill.bill_id,
          );

          if (match && bill.status === 'unpaid') {
            const paidNow = Number(bill.amount);
            const total = Number(bill.amount);
            const alreadyPaid = Number(bill.collected_amount || 0);

            const newCollected = alreadyPaid + paidNow;
            const remaining = total - newCollected;

            bill.collected_amount = newCollected;
            bill.remaining_amount = remaining > 0 ? remaining : 0;
            bill.status = 'paid';

            bill.collected_by = this.userName;
            bill.collected_date = new Date();
            bill.collected_method = 'cash';
            bill.collected_id = '';
            bill.collected_bank = null;

            // 🔹 Same adjustment logic as submitCollection
            let adjustAmount = paidNow;

            bills
              .filter(
                (b: any) =>
                  b.type === bill.type &&
                  b.remaining_amount > 0 &&
                  b.createdAt.toDate() < bill.createdAt.toDate(),
              )
              .sort(
                (a: any, b: any) => a.createdAt.toDate() - b.createdAt.toDate(),
              )
              .forEach((prevBill: any) => {
                if (adjustAmount <= 0) return;

                const reduce = Math.min(
                  prevBill.remaining_amount,
                  adjustAmount,
                );

                prevBill.remaining_amount -= reduce;
                adjustAmount -= reduce;

                if (prevBill.remaining_amount === 0) {
                  prevBill.status = 'paid';
                }
              });
          }
        });

         updateDoc(userDocRef, { bills });
      }

       if (!navigator.onLine) {
          this.toastr.info(
            'Saved offline. Will sync when connection is restored.',
          );
        } else {
          this.toastr.success('Selected bills collected successfully');
        }

      this.isBulkMode = false;
      this.selectedBulkBills = [];
      await this.loadUsers();
    } catch (err) {
      console.error(err);
      this.toastr.error('Bulk collection failed');
    } finally {
      this.isBulkSubmitting = false;
    }
  }

  showUpdateModal = false;
  internetPackages: any[] = [];
  selectedRow: any;

  openUpdateModal(row: any) {
    console.log('update row data:', row);
    this.selectedRow = row;
    this.userForm.patchValue({
      select_package: row.select_package,
      internet_package_fee: row.internet_package_fee,
    });
    this.showUpdateModal = true;
  }

  async updateBill() {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    try {
      const newPackage = this.userForm.value.select_package;
      const newFee = Number(this.userForm.value.internet_package_fee);

      const oldFee = Number(this.selectedRow.internet_package_fee);

      // 🔥 Difference calculate karo
      const difference = newFee - oldFee;

      const userRef = doc(this.firestore, 'users', this.selectedRow.docId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const bills = userData['bills'] || [];

      // Bill find karo
      const updatedBills = bills.map((bill: any) => {
        if (bill.bill_id === this.selectedRow.bills[0].bill_id) {
          return {
            ...bill,
            amount: Number(bill.amount) + difference,
            remaining_amount: Number(bill.remaining_amount) + difference,
          };
        }
        return bill;
      });

      // 🔥 Firestore Update
       updateDoc(userRef, {
        select_package: newPackage,
        internet_package_fee: newFee,
        bills: updatedBills,
      });

       if (!navigator.onLine) {
          this.toastr.info(
            'Saved offline. Will sync when connection is restored.',
          );
        } else {
          this.toastr.success('Bill updated successfully');
        }

      this.showUpdateModal = false;
      this.loadUsers(); // reload list
    } catch (error) {
      console.error(error);
      this.toastr.error('Update failed');
    } finally {
      this.isSubmitting = false;
    }
  }
}
