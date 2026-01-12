import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { addDoc, collection, doc, Firestore, updateDoc } from '@angular/fire/firestore';
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
  selector: 'app-user-modal',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './user-modal.component.html',
  styleUrl: './user-modal.component.scss',
})
export class UserModalComponent {
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
      internet_id: ['', [Validators.required]],
      user_name: ['', [Validators.required, Validators.maxLength(15)]],
      address: ['', Validators.required],
      phone_no: ['', [Validators.required]],
      sublocality: ['', [Validators.required]],
      installation_amount: ['', [Validators.required]],
      other_amount: ['', [Validators.required]],
      installation_date: ['', [Validators.required]],
      recharge_date: ['', [Validators.required]],
      connection_provider: [''],
      connection_type: ['', [Validators.required]],
      box_number: [''],
      pkg_cable: ['', [Validators.required]],
      discount: ['', [Validators.required]],
      select_package: ['', [Validators.required]],
      // isActive: [true],
      createdAt: [new Date()],
    });
  }


  ngOnInit() {
  if (this.editMode && this.userData) {
    this.userForm.patchValue({
      internet_id: this.userData.internet_id,
      user_name: this.userData.user_name,
      address: this.userData.address,
      phone_no: this.userData.phone_no,
      sublocality: this.userData.sublocality,
      installation_amount: this.userData.installation_amount,
      other_amount: this.userData.other_amount,
      installation_date: this.userData.installation_date,
      recharge_date: this.userData.recharge_date,
      connection_provider: this.userData.connection_provider,
      connection_type: this.userData.connection_type,
      box_number: this.userData.box_number,
      pkg_cable: this.userData.pkg_cable,
      discount: this.userData.discount,
      select_package: this.userData.select_package,
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
      ...this.userForm.getRawValue(), // 🔥 important for disabled fields
      updatedAt: new Date(),
    };

    if (this.editMode && this.userData?.id) {
      // 🔁 UPDATE EXISTING USER
      const userDocRef = doc(this.firestore, 'users', this.userData.id);
      await updateDoc(userDocRef, payload);
      this.toastr.success('User updated successfully');
    } else {
      // ➕ ADD NEW USER
      await addDoc(collection(this.firestore, 'users'), {
        ...payload,
        createdAt: new Date(),
      });
      this.toastr.success('User added successfully');
    }

    this.activeModal.close(true);
  } catch (error) {
    console.error(error);
    this.toastr.error('Failed to save user');
  } finally {
    this.isSaving = false;
  }
}

}
