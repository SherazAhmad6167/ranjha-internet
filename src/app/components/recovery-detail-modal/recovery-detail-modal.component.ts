import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrModule, ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-recovery-detail-modal',
  imports: [CommonModule, ReactiveFormsModule, ToastrModule],
  templateUrl: './recovery-detail-modal.component.html',
  styleUrl: './recovery-detail-modal.component.scss',
})
export class RecoveryDetailModalComponent {
  expenseForm!: FormGroup;
  @Input() editMode = false;
  @Input() userData: any;
  isLoading = false;
  isSaving = false;
  internetAreas: any[] = [];
  internetOperators: any[] = [];
  recievedByList: string[] = [
    'Saqib Ranjha',
    'Qaisar Abbas',
    'Saqib Ranjha-Jazz Cash',
    'Qaisar Abbas- Jazz Cash',
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private modalService: NgbModal,
  ) {
    this.expenseForm = this.fb.group({
      date: ['', Validators.required],
      operator_name: ['', [Validators.required]],
      total_recovery: [, Validators.required],
      total_expenses: [''],
      remaining_amount: [''],
      recieved_by: [''],
      sublocality: [''],
      // isActive: [true],
      createdAt: [new Date()],
    });
  }

  ngOnInit() {
    this.editForm();
    this.loadInternetAreas();
    this.loadOperatorName();
  }

  async loadOperatorName() {
    try {
      const ref = doc(this.firestore, 'operatorName', 'operatorNameDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.internetOperators = snap.data()?.['operatorNames'] || [];

        this.internetOperators.sort((a: any, b: any) => {
          return a.operator_name.localeCompare(b.operator_name);
        });
      }
    } catch (error) {
      console.error('Error loading operators', error);
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

  editForm() {
    if (this.editMode && this.userData) {
      this.expenseForm.patchValue({
        date: this.userData.date,
        operator_name: this.userData.operator_name,
        sublocality: this.userData.sublocality,
        total_recovery: this.userData.total_recovery,
        total_expenses: this.userData.total_expenses,
        remaining_amount: this.userData.remaining_amount,
        recieved_by: this.userData.recieved_by,
        createdAt: this.userData.createdAt ?? new Date(),
      });
    }
  }

  async onSubmit() {
    if (this.expenseForm.invalid) {
      this.toastr.error('Please fill all required fields');
      this.expenseForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    try {
      const payload = {
        ...this.expenseForm.getRawValue(), // 🔥 important for disabled fields
        updatedAt: new Date(),
      };

      if (this.editMode && this.userData?.id) {
        // 🔁 UPDATE EXISTING USER
        const userDocRef = doc(
          this.firestore,
          'recoveryDetails',
          this.userData.id,
        );

        updateDoc(userDocRef, payload);
        if (!navigator.onLine) {
          this.toastr.info(
            'Saved offline. Will sync when connection is restored.',
          );
        } else {
          this.toastr.success('Recovery detail saved successfully');
        }
      } else {
        addDoc(collection(this.firestore, 'recoveryDetails'), {
          ...payload,
          createdAt: new Date(),
        });
        if (!navigator.onLine) {
          this.toastr.info(
            'Saved offline. Will sync when connection is restored.',
          );
        } else {
          this.toastr.success('Recovery detail saved successfully');
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
