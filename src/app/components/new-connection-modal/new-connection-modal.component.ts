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
  selector: 'app-new-connection-modal',
  imports: [FormsModule, ReactiveFormsModule, CommonModule, ToastrModule],
  templateUrl: './new-connection-modal.component.html',
  styleUrl: './new-connection-modal.component.scss',
})
export class NewConnectionModalComponent {
  userForm!: FormGroup;
  @Input() editMode = false;
  @Input() userData: any;
  isLoading = false;
  isSaving = false;
  internetAreas: any[] = [];
  internetSubAreas: any[] = [];
  internetOperators: any[] = [];
  recievedByList: string[] = [
    'Saqib Ranjha',
    'Qaisar Abbas',
    'Saqib Ranjha-Jazz Cash',
    'Qaisar Abbas- Jazz Cash',
  ];
  companies: any[] = [];
  internetPackages: any[] = [];
  internetOriginalPrice = 0;
  cableOriginalPrice = 0;
  cablePackages: any[] = [];
  locationText = '';

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private modalService: NgbModal,
  ) {
    this.userForm = this.fb.group({
      installation_date: [''],
      address: [''],
      user_name: [''],
      father_name: [''],
      cnic: [''],
      mobile_no: [''],
      alter_mobile_no: [''],
      sublocality: [''],
      internet_id: [''],
      package_name: [''],
      installation_amount: [null],
      advance_paid: [null],
      balance: [null],
      // router_no: [''],
      monthly_fee: [null],
      operator_name: [''],
      recieved_by: [''],
      recieved_date: [''],
      // expenses: [null],
      recieved_amount: [null],
      isRecieved: [false],
      // mac_address: [''],
      // wifi: [''],
      // wifi_password: [''],
      remarks: [''],
      bank_name: [''],
      payment_method: [''],
      connection_payment: [''],
      cnic_front: [''],
      cnic_back: [''],
      connection_provider: [''],
      connection_type: ['', [Validators.required]],
      pkg_cable: [null, [Validators.required]],
      cable_discount: [null, [Validators.required]],
      internet_discount: [null, [Validators.required]],
      select_package: [null, [Validators.required]],
      internet_package_fee: [null, [Validators.required]],
      cable_package_fee: [null, [Validators.required]],
      sub_area: [null, [Validators.required]],
      createdAt: [new Date()],
    });
  }

  editForm() {
    if (this.editMode && this.userData) {
      this.userForm.patchValue({
        installation_date: this.userData.installation_date || '',
        address: this.userData.address || '',
        user_name: this.userData.user_name || '',
        father_name: this.userData.father_name || '',
        cnic: this.userData.cnic || '',
        mobile_no: this.userData.mobile_no || '',
        alter_mobile_no: this.userData.alter_mobile_no || '',
        sublocality: this.userData.sublocality || '',
        internet_id: this.userData.internet_id || '',
        package_name: this.userData.package_name || '',
        installation_amount: this.userData.installation_amount || null,
        advance_paid: this.userData.advance_paid || null,
        balance: this.userData.balance || null,
        // router_no: this.userData.router_no || '',
        monthly_fee: this.userData.monthly_fee || null,
        operator_name: this.userData.operator_name || '',
        recieved_by: this.userData.recieved_by || '',
        recieved_date: this.userData.recieved_date || '',
        // expenses: this.userData.expenses || null,
        recieved_amount: this.userData.recieved_amount || null,
        isRecieved: this.userData.isRecieved || false,
        sub_area: this.userData.sub_area || '',
        // mac_address: this.userData.mac_address || '',
        // wifi: this.userData.wifi || '',
        // wifi_password: this.userData.wifi_password || '',
        remarks: this.userData.remarks || '',
        bank_name: this.userData.bank_name || '',
        payment_method: this.userData.payment_method || '',
        connection_payment: this.userData.connection_payment || '',
        cnic_front: this.userData.cnic_front || '',
        cnic_back: this.userData.cnic_back || '',
        connection_provider: this.userData.connection_provider || '',
        connection_type: this.userData.connection_type || '',
        pkg_cable: this.userData.pkg_cable || null,
        cable_discount: this.userData.cable_discount || null,
        internet_discount: this.userData.internet_discount || null,
        select_package: this.userData.select_package || null,
        internet_package_fee: this.userData.internet_package_fee || null,
        cable_package_fee: this.userData.cable_package_fee || null,
      });

      this.onSublocalityChange(this.userData.sublocality);

      setTimeout(() => {
        this.userForm.get('sub_area')?.setValue(this.userData.sub_area);
      });
      this.cnicFrontPreview = this.userData.cnic_front || null;
      this.cnicBackPreview = this.userData.cnic_back || null;
    }
  }

  ngOnInit() {
    this.loadInternetAreas();
    this.loadOperatorName();
    this.loadCompanies();
    this.loadInternetPackages();
    this.loadCablePackages();
    this.userForm.get('sublocality')?.valueChanges.subscribe((value) => {
      this.onSublocalityChange(value);
    });

    this.userForm.get('select_package')?.valueChanges.subscribe((pkgName) => {
      const pkg = this.internetPackages.find((p) => p.package_name === pkgName);

      if (!pkg) return;

      this.internetOriginalPrice = Number(pkg.sales_price);

      this.userForm.patchValue({
        internet_package_fee: this.internetOriginalPrice,
        internet_discount: '',
      });
    });

    // INTERNET DISCOUNT
    this.userForm
      .get('internet_discount')
      ?.valueChanges.subscribe((discount) => {
        this.applyDiscount(
          this.internetOriginalPrice,
          discount,
          'internet_package_fee',
        );
      });

    // CABLE PACKAGE
    this.userForm.get('pkg_cable')?.valueChanges.subscribe((pkgName) => {
      const pkg = this.cablePackages.find((p) => p.package_name === pkgName);

      if (!pkg) return;

      this.cableOriginalPrice = Number(pkg.sales_price);

      this.userForm.patchValue({
        cable_package_fee: this.cableOriginalPrice,
        cable_discount: '',
      });
    });

    // CABLE DISCOUNT
    this.userForm.get('cable_discount')?.valueChanges.subscribe((discount) => {
      this.applyDiscount(
        this.cableOriginalPrice,
        discount,
        'cable_package_fee',
      );
    });

    this.userForm.get('connection_type')?.valueChanges.subscribe((type) => {
      this.updateValidators(type);
    });
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.toastr.error('Geolocation not supported');
      return;
    }
    this.isLoading = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // form values
        this.userForm.patchValue({
          latitude: lat,
          longitude: lng,
        });

        // Google Maps paste-ready format
        this.locationText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        this.isLoading = false;

        this.toastr.success('Location fetched successfully');
      },
      () => {
        this.toastr.error('Location permission denied');
        this.isLoading = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async loadCablePackages() {
    try {
      const ref = doc(this.firestore, 'cablePackage', 'cablePackageDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.cablePackages = snap.data()?.['cablePackage'] || [];
      }
    } catch (error) {
      console.error('Error loading cable packages', error);
    }
  }

  applyDiscount(originalPrice: number, discount: string, feeControl: string) {
    if (!originalPrice) return;

    let price = originalPrice;

    switch (discount) {
      case 'no_discount':
        price = originalPrice;
        break;
      case 'quarter':
        price = originalPrice * 0.75;
        break;
      case 'half':
        price = originalPrice * 0.5;
        break;
      case 'semi':
        price = originalPrice * 0.25;
        break;
      case 'full_free':
        price = 0;
        break;
      default:
        return;
    }

    this.userForm.patchValue({
      [feeControl]: Math.round(price),
    });
  }

  updateValidators(type: string) {
    const cableControls = ['pkg_cable', 'cable_discount', 'cable_package_fee'];
    const internetControls = [
      'select_package',
      'internet_discount',
      'internet_package_fee',
    ];

    if (type === 'internet') {
      this.enableControls(internetControls);
      this.disableControls(cableControls);
    } else if (type === 'tv_cable') {
      this.enableControls(cableControls);
      this.disableControls(internetControls);
    } else if (type === 'both') {
      this.enableControls([...cableControls, ...internetControls]);
    }
  }

  enableControls(controls: string[]) {
    controls.forEach((name) => {
      const ctrl = this.userForm.get(name);
      ctrl?.setValidators([Validators.required]);
      ctrl?.enable();
      ctrl?.updateValueAndValidity();
    });
  }

  disableControls(controls: string[]) {
    controls.forEach((name) => {
      const ctrl = this.userForm.get(name);
      ctrl?.clearValidators();
      ctrl?.setValue('');
      ctrl?.disable();
      ctrl?.updateValueAndValidity();
    });
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

        this.editForm();
      }
    } catch (error) {
      console.error('Error loading internet areas', error);
    }
  }

  onSublocalityChange(selectedSublocality: string) {
    const selected = this.internetAreas.find(
      (item) => item.sublocality === selectedSublocality,
    );

    this.internetSubAreas = (selected?.subAreas || []).map((sub: string) => ({
      name: sub,
    }));

    this.userForm.get('sub_area')?.reset();
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

  get isInternet() {
    return this.userForm.get('connection_type')?.value === 'internet';
  }

  get isCable() {
    return this.userForm.get('connection_type')?.value === 'tv_cable';
  }

  get isBoth() {
    return this.userForm.get('connection_type')?.value === 'both';
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

  async loadCompanies() {
    try {
      const ref = doc(this.firestore, 'company', 'companyDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.companies = snap.data()?.['companies'] || [];
      }
    } catch (error) {
      console.error('Error loading companies', error);
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

    if (this.editMode && this.userData?.id) {
      // 🔁 UPDATE

      const id = this.userData.id;

      const newConnectionRef = doc(this.firestore, 'newConnection', id);
      const usersRef = doc(this.firestore, 'users', id);

      // 🔍 check if users doc exists
      const userSnap = await getDoc(usersRef);

      if (userSnap.exists()) {
        // ✅ update both
        await Promise.all([
          updateDoc(newConnectionRef, payload),
          updateDoc(usersRef, payload),
        ]);
      } else {
        // ⚠️ users doc not found → only update newConnection
        await updateDoc(newConnectionRef, payload);

        console.warn('User doc not found, skipped users update for ID:', id);
      }

    } else {
      // ➕ ADD

      const dataToSave = {
        ...payload,
        createdAt: new Date(),
      };

      // 🔥 create ID manually
      const newDocRef = doc(collection(this.firestore, 'newConnection'));
      const id = newDocRef.id;

      // ✅ save in newConnection
      await setDoc(newDocRef, {
        ...dataToSave,
        id,
      });

      // ✅ save in users
      await setDoc(doc(this.firestore, 'users', id), {
        ...dataToSave,
        connectionId: id,
      });
    }

    // ✅ TOAST
    if (!navigator.onLine) {
      this.toastr.info(
        'Saved offline. Will sync when connection is restored.'
      );
    } else {
      this.toastr.success('Saved successfully');
    }

    this.activeModal.close(true);

  } catch (error: any) {
    console.error(error);

    if (
      error.code === 'unavailable' ||
      error.code === 'failed-precondition'
    ) {
      this.toastr.info(
        'Saved offline. Will sync when connection is restored.'
      );
      this.activeModal.close(true);
    } else {
      this.toastr.error('Failed to save user');
    }
  } finally {
    this.isSaving = false;
  }
}

  cnicFrontPreview: string | null = null;
  cnicBackPreview: string | null = null;

  onImageSelect(event: any, type: 'front' | 'back') {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Only image files allowed');
      return;
    }

    this.resizeAndConvertToBase64(file, 400, 400).then((base64) => {
      if (type === 'front') {
        this.cnicFrontPreview = base64;

        this.userForm.patchValue({
          cnic_front: base64,
        });
      } else {
        this.cnicBackPreview = base64;

        this.userForm.patchValue({
          cnic_back: base64,
        });
      }
    });
  }

  resizeAndConvertToBase64(
    file: File,
    maxWidth: number,
    maxHeight: number,
  ): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;

        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          } else if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);

          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          resolve(base64);
        };
      };
    });
  }

  imagePreview: string | null = null;
  showImageModal = false;

  selectedImage: string | null = null;

  openImageModal(type: 'front' | 'back') {
    if (type === 'front') {
      if (!this.cnicFrontPreview) return;
      this.selectedImage = this.cnicFrontPreview;
    } else {
      if (!this.cnicBackPreview) return;
      this.selectedImage = this.cnicBackPreview;
    }

    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
    this.selectedImage = null;
  }
}
