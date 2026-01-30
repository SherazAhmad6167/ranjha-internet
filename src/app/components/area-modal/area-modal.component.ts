import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDoc,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-area-modal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './area-modal.component.html',
  styleUrl: './area-modal.component.scss',
})
export class AreaModalComponent {
  isLoading = false;
  isSaving = false;
  userName: any;
  @Input() editMode = false;
  @Input() userData: any;
  userForm: FormGroup;
  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private modalService: NgbModal,
  ) {
    this.userForm = this.fb.group({
      country: ['', [Validators.required]],
      city: ['', [Validators.required]],
      locality: ['', [Validators.required]],
      sublocality: ['', [Validators.required]],
      createdAt: [new Date()],
    });
  }

  ngOnInit() {
    if (this.editMode && this.userData) {
      this.userForm.patchValue({
        country: this.userData.country,
        city: this.userData.city,
        locality: this.userData.locality,
        sublocality: this.userData.sublocality,
        createdAt: this.userData.createdAt ?? new Date(),
      });
    }
  }

  async onSubmit() {
    if (this.userForm.invalid) {
      this.toastr.error('Please fill all required fields');
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const payload = {
        ...this.userForm.getRawValue(),
        updatedAt: new Date(),
      };

      const newSublocality = payload.sublocality;
      const oldSublocality = this.editMode ? this.userData?.sublocality : null;

      if (this.editMode && this.userData?.id) {
        // 🔁 UPDATE EXISTING USER
        const userDocRef = doc(this.firestore, 'area', this.userData.id);
        await updateDoc(userDocRef, payload);
        this.toastr.success('Area updated successfully');
      } else {
        // ➕ ADD NEW USER
        await addDoc(collection(this.firestore, 'area'), {
          ...payload,
          createdAt: new Date(),
        });
        this.toastr.success('Area added successfully');
      }

      await this.saveInternetArea(newSublocality, oldSublocality);
      this.activeModal.close(true);
    } catch (error) {
      console.error(error);
      this.toastr.error('Failed to save area');
    } finally {
      this.isSaving = false;
    }
  }

  async saveInternetArea(newSublocality: string, oldSublocality?: string) {
    const internetDocRef = doc(
      this.firestore,
      'internetArea',
      'internetAreaDoc',
    );
    const snap = await getDoc(internetDocRef);

    let internetAreas: any[] = [];

    if (snap.exists()) {
      internetAreas = snap.data()?.['internetAreas'] || [];
    }

    // 🔁 EDIT CASE → old sublocality exists
    if (oldSublocality) {
      const index = internetAreas.findIndex(
        (item) => item.sublocality === oldSublocality,
      );

      if (index > -1) {
        internetAreas[index] = {
          ...internetAreas[index],
          sublocality: newSublocality,
          updatedAt: new Date(),
        };
      }
    } else {
      // ➕ ADD CASE
      const exists = internetAreas.some(
        (item) => item.sublocality === newSublocality,
      );

      if (!exists) {
        internetAreas.push({
          sublocality: newSublocality,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    if (snap.exists()) {
      await updateDoc(internetDocRef, { internetAreas });
    } else {
      await setDoc(internetDocRef, { internetAreas });
    }
  }
}
