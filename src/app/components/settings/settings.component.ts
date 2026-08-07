import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  getDocs,
  setDoc,
} from '@angular/fire/firestore';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { SmsService } from '../../shared/sms.service';
import { MikrotikService, MikrotikError } from '../../shared/mikrotik.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, ToastrModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  templates: any[] = [
    { id: 'welcome', title: 'Welcome Message', message: '' },
    { id: 'complaint', title: 'Complaint Acknowledgment', message: '' },
    { id: 'paymentReminder', title: 'Payment Reminder', message: '' },
    { id: 'paymentReceived', title: 'Payment Received', message: '' },
    { id: 'overdue', title: 'Overdue Warning', message: '' },
    { id: 'maintenance', title: 'Maintenance Notice', message: '' },
    { id: 'upgrade', title: 'Upgrade Offer', message: '' },
    { id: 'restoration', title: 'Service Restoration', message: '' },
  ];
  singleSMSForm: FormGroup;
  bulkSMSForm: FormGroup;
  mikrotikForm!: FormGroup;

  mikrotikLoading = false;
  mikrotikMessage = '';
  mikrotikIsError = false;
  mikrotikIsCors = false;
  mikrotikResponseData: any = null;

  constructor(
    private firestore: Firestore,
    private toastr: ToastrService,
    private smsService: SmsService,
    private mikrotikService: MikrotikService,
    private fb: FormBuilder,
  ) {
    this.singleSMSForm = this.fb.group({
      phone: [''],
      message: [''],
    });

    this.bulkSMSForm = this.fb.group({
      phones: [''],
      message: [''],
    });

    this.mikrotikForm = this.fb.group({
      type: ['ppp', Validators.required],
      name: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]],
      groupOrProfile: ['default'],
    });
  }

  ngOnInit() {
    this.loadTemplates();
  }

  async loadTemplates() {
    for (let item of this.templates) {
      const ref = doc(this.firestore, `messageTemplates/${item.id}`);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        item.message = snap.data()['message'];
      }
    }
  }

  async saveTemplate(item: any) {
    const ref = doc(this.firestore, `messageTemplates/${item.id}`);

    await setDoc(ref, {
      title: item.title,
      message: item.message,
      updatedAt: new Date(),
    });
    this.loadTemplates();
    this.toastr.success('Saved successfully');
  }

  // 🔄 Reset (optional)
  resetTemplate(item: any) {
    item.message = '';
  }

  async deleteTemplate(id: string) {
    const confirmDelete = confirm('Are you sure?');

    if (!confirmDelete) return;

    const ref = doc(this.firestore, `messageTemplates/${id}`);
    await deleteDoc(ref);

    this.toastr.success('Deleted successfully');
  }

  sendTestSMS() {
    const phone = '+923704620052';
    const msg = 'welcome to ranjha7star';

    this.smsService.sendSMS(phone, msg).subscribe({
      next: (res) => {
        console.log('SMS Sent:', res);
        alert('SMS sent successfully');
      },
      error: (err) => {
        console.error('Error:', err);
        alert('SMS failed');
      },
    });
  }

  sendTestBulkSMS() {
    const phone = ['+923006362735', '+923008800263', '+923704620052'];
    const msg = 'welcome to ranjha7star';

    this.smsService.sendBulkSMS(phone, msg).subscribe({
      next: (res) => {
        console.log('SMS Sent:', res);
        alert('SMS sent successfully');
      },
      error: (err) => {
        console.error('Error:', err);
        alert('SMS failed');
      },
    });
  }

  //   sendBulkTestSMS() {
  //   const numbers = [
  //     '+923026167574',
  //     '+923008800263',
  //     '+923045945153'
  //   ];

  //   const msg = 'Welcome to Ranjha7Star';

  //   this.smsService.sendBulkSMS(numbers, msg).subscribe({
  //     next: (res) => {
  //       console.log('Bulk SMS Sent:', res);
  //       alert('Bulk SMS sent successfully');
  //     },
  //     error: (err) => {
  //       console.error('Error:', err);
  //       alert('Bulk SMS failed');
  //     }
  //   });
  // }

  // async removeBillsFromAllUsers() {
  //   const usersRef = collection(this.firestore, 'users');
  //   const snapshot = await getDocs(usersRef);

  //   const promises: any[] = [];

  //   snapshot.forEach((userDoc) => {
  //     const ref = doc(this.firestore, 'users', userDoc.id);

  //     promises.push(
  //       updateDoc(ref, {
  //         bills: deleteField(),
  //       }),
  //     );
  //   });

  //   await Promise.all(promises);
  //   console.log('Bills field removed from all users');
  //   alert('Bills field removed from all users');
  // }

  // openWhatsApp() {
  //   const phoneNumber = '923008800263';
  //   const message = 'Welcome to Ranjha7star';

  //   const encodedMessage = encodeURIComponent(message);

  //   const url = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  //   window.open(url, '_blank');
  // }

  sendSingleSMS() {
    const { phone, message } = this.singleSMSForm.value;

    if (!phone || !message) {
      alert('Please fill all fields');
      return;
    }

    this.smsService.sendSMS(phone, message).subscribe({
      next: () => alert('SMS sent successfully'),
      error: () => alert('SMS failed'),
    });
  }

  sendBulkSMS() {
    const { phones, message } = this.bulkSMSForm.value;

    if (!phones || !message) {
      alert('Please fill all fields');
      return;
    }

    const phoneArray = phones
      .split(/[\n,]+/)
      .map((p: string) => p.trim())
      .filter((p: string) => p);

    this.smsService.sendBulkSMS(phoneArray, message).subscribe({
      next: () => alert('Bulk SMS sent successfully'),
      error: () => alert('Bulk SMS failed'),
    });
  }

  createUser() {
    if (this.mikrotikForm.invalid) {
      this.mikrotikForm.markAllAsTouched();
      return;
    }

    this.mikrotikLoading = true;
    this.mikrotikMessage = '';
    this.mikrotikResponseData = null;
    this.mikrotikIsError = false;
    this.mikrotikIsCors = false;

    const { type, name, password, groupOrProfile } = this.mikrotikForm.value;

    this.mikrotikService.createUser(type, name, password, groupOrProfile).subscribe({
      next: (res) => {
        this.mikrotikLoading = false;
        this.mikrotikMessage = `User "${name}" created successfully in MikroTik.`;
        this.mikrotikResponseData = res;
        this.toastr.success(`MikroTik user "${name}" created`);
        this.mikrotikForm.patchValue({ name: '', password: '' });
        this.mikrotikForm.get('name')?.markAsUntouched();
        this.mikrotikForm.get('password')?.markAsUntouched();
      },
      error: (err: MikrotikError) => {
        this.mikrotikLoading = false;
        this.mikrotikIsError = true;
        this.mikrotikIsCors = err.isCors;
        this.mikrotikMessage = err.message;
        this.toastr.error(err.isCors ? 'CORS / SSL error — see details below' : 'Failed to create MikroTik user');
      },
    });
  }
}
