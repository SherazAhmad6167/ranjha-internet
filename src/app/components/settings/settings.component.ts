import { Component } from '@angular/core';
import { BluetoothService } from '../../shared/bluetooth.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  Firestore,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import { SmsService } from '../../shared/sms.service';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, ToastrModule],
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
    { id: 'restoration', title: 'Service Restoration', message: '' }
  ];

  constructor(private firestore: Firestore, private toastr: ToastrService, private smsService: SmsService) {}

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
      updatedAt: new Date()
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
    const phone = '+923026167574';
    const msg = 'welcome to ranjha7star ';

    this.smsService.sendSMS(phone, msg).subscribe({
      next: (res) => {
        console.log('SMS Sent:', res);
        alert('SMS sent successfully');
      },
      error: (err) => {
        console.error('Error:', err);
        alert('SMS failed');
      }
    });
  }

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
}
