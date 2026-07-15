import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { addDoc, collection, Firestore, serverTimestamp } from '@angular/fire/firestore';
import { ToastrModule, ToastrService } from 'ngx-toastr';
import * as Papa from 'papaparse';
@Component({
  selector: 'app-user-docs',
  imports: [CommonModule, ToastrModule],
  templateUrl: './user-docs.component.html',
  styleUrl: './user-docs.component.scss'
})
export class UserDocsComponent {
  isLoading = false;

  csvData: any[] = [];
  fileError: string = '';
  loading = false;

  constructor(private firestore: Firestore, private toastr: ToastrService,) {}

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');

    return `${y}-${m}-${d}`;
  }

  onFileChange(event: any) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      this.fileError = 'Only CSV file is allowed!';
      this.csvData = [];
      return;
    }

    this.fileError = '';

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: any) => {
        this.csvData = result.data.map((row: any) => ({
          photoName: '',
          internet_id: row['Internet ID'],
          sublocality: row['Sublocality'] || '',
          user_name: row['User Name'] || '',
          static_ip: row['Static IP'] || '0',
          address: row['Address'] || 'nil',
          mobile_no: row['Phone No'] || '0',
          installation_amount: row['Installation Amount'] || '0',
          other_amount: row['Other Amount'] || '0',
          installation_date: this.formatDate(row['Installation Date']),
          connection_provider: row['Connection Provider']?.toLowerCase() || '',
          connection_type: row['Connection Type']?.toLowerCase() || '',
          select_package: row['Select Internet Package']?.toLowerCase() || '',
          internet_package_fee: Number(row['Internet Package Fee'] || 0),
          cable_discount: row['Discount'] || '',
          cable_package_fee: row['Cable Package Fee'] || '',
          internet_discount: row['Discount'] || 'no_discount',
          sub_area:row['Sub Area'] || '',
          wire: row['Wire'] || '',
          // recharge_date: this.formatDate(row['Recharge Date']),
          latitude: row['Latitude'] ? Number(row['Latitude']) : 0,
          longitude: row['Longitude'] ? Number(row['Longitude']) : 0,
          photo: '',
          pkg_cable: row['Select Cable Package'] || '',
        }));
      }
    });
  }

  async uploadToFirestore() {
    if (this.csvData.length === 0) return;

    this.loading = true;

    try {
      const usersRef = collection(this.firestore, 'testingUser');

      for (const row of this.csvData) {
        await addDoc(usersRef, {
          ...row,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      this.toastr.success('Data uploaded successfully');
      this.csvData = [];

    } catch (error) {
      console.error(error);
      this.toastr.error('Upload failed');
    }

    this.loading = false;
  }

}
