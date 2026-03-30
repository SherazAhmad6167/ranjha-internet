import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { addDoc, collection, doc, Firestore, getDoc, updateDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-new-connection-modal',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, ToastrModule],
  templateUrl: './new-connection-modal.component.html',
  styleUrl: './new-connection-modal.component.scss'
})
export class NewConnectionModalComponent {
  userForm!: FormGroup;
  @Input() editMode = false;
  @Input() userData: any;
  isLoading = false;
  isSaving = false;
   internetAreas: any[] = [];
   recievedByList: string[] = [
  'Saqib Ranjha',
  'Qaisar Abbas',
  'Saqib Ranjha-Jazz Cash',
  'Qaisar Abbas- Jazz Cash'
];

   constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private modalService: NgbModal,
  ) {
    this.userForm = this.fb.group({
      installation_date: ['', Validators.required],
      address: ['', [Validators.required]],
      user_name: ['', [Validators.required]],
      sublocality: ['', [Validators.required]],
      internet_id: ['', [Validators.required]],
      package_name: ['', [Validators.required]],
      installation_amount: [null],
      operator_name: [''],
      recieved_by: [''],
      recieved_amount: [null],
      isRecieved: [false],
      createdAt: [new Date()],
    });


  }

  ngOnInit() {
    this.editForm();
     this.loadInternetAreas();
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

    editForm() {
    if (this.editMode && this.userData) {
      this.userForm.patchValue({
        installation_date: this.userData.installation_date,
        address: this.userData.address,
        user_name: this.userData.user_name,
        sublocality: this.userData.sublocality,
        internet_id: this.userData.internet_id,
        installation_amount: this.userData.installation_amount,
        package_name: this.userData.package_name,
        operator_name: this.userData.operator_name,
        recieved_by: this.userData.recieved_by,
        isRecieved: this.userData.isRecieved,
        recieved_amount: this.userData.recieved_amount,
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
          const userDocRef = doc(this.firestore, 'newConnection', this.userData.id);
        
          updateDoc(userDocRef, payload);
          if (!navigator.onLine) {
            this.toastr.info(
              'Saved offline. Will sync when connection is restored.',
            );
          } else {
            this.toastr.success('New Connection saved successfully');
          }
        } else {

          addDoc(collection(this.firestore, 'newConnection'), {
            ...payload,
            createdAt: new Date(),
          });
          if (!navigator.onLine) {
            this.toastr.info(
              'Saved offline. Will sync when connection is restored.',
            );
          } else {
            this.toastr.success('New Connection saved successfully');
          }
        }
  
        this.activeModal.close(true);
      } catch (error) {
        console.error(error);
        if (
          (error as any).code === 'unavailable' ||
          (error as any).code === 'failed-precondition'
        ) {
          this.toastr.info(
            'Saved offline. Will sync when connection is restored.',
          );
          this.activeModal.close(true); // still close the modal
        } else {
          console.error(error);
          this.toastr.error('Failed to save user');
        }
      } finally {
        this.isSaving = false;
      }
    }


}
