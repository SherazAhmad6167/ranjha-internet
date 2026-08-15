import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  doc,
  Firestore,
  getDoc,
  deleteDoc,
  setDoc,
} from '@angular/fire/firestore';
import { FormsModule } from '@angular/forms';
import { ToastrModule, ToastrService } from 'ngx-toastr';

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
    { id: 'restoration', title: 'Service Restoration', message: '' },
  ];

  constructor(
    private firestore: Firestore,
    private toastr: ToastrService,
  ) {}

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
}
