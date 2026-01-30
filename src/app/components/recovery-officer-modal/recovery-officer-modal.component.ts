import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { addDoc, collection, doc, Firestore, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-recovery-officer-modal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './recovery-officer-modal.component.html',
  styleUrl: './recovery-officer-modal.component.scss'
})
export class RecoveryOfficerModalComponent {
  
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
    private modalService: NgbModal
  ) {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      cnic: ['', [Validators.required]],
      address: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      join_date: ['', [Validators.required]],
      status: ['', [Validators.required]],
      salary: ['', [Validators.required]],
      password: ['', [Validators.required]],
      user_name: ['', [Validators.required]],
      role: ['', [Validators.required]],
      createdAt: [new Date()],
    });
  }


  ngOnInit() {
  if (this.editMode && this.userData) {
    this.userForm.patchValue({
      name: this.userData.name,
      cnic: this.userData.cnic,
      address: this.userData.address,
      phone: this.userData.phone,
      join_date: this.userData.join_date,
      status: this.userData.status,
      salary: this.userData.salary,
      user_name: this.userData.user_name,
      password: this.userData.password,
      role: this.userData.role,
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
     const raw = this.userForm.getRawValue();

    const payload = {
      ...raw,
      user_name: raw.user_name.trim().toLowerCase(),
      updatedAt: new Date(),
    };

    if (this.editMode && this.userData?.id) {
      // 🔁 UPDATE EXISTING USER
      const userDocRef = doc(this.firestore, 'recoveryOfficer', this.userData.id);
      await updateDoc(userDocRef, payload);
      this.toastr.success('Recovery Officer updated successfully');
    } else {
      // ➕ ADD NEW USER
      await addDoc(collection(this.firestore, 'recoveryOfficer'), {
        ...payload,
        createdAt: new Date(),
      });
      this.toastr.success('Recovery Officer added successfully');
    }

    this.activeModal.close(true);
  } catch (error) {
    console.error(error);
    this.toastr.error('Failed to save Recovery Officer');
  } finally {
    this.isSaving = false;
  }
}
}
