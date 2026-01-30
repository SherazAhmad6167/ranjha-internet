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
  locationText = '';

  internetAreas: any[] = [];
  companies: any[] = [];
  internetPackages: any[] = [];
  cablePackages: any[] = [];
  imagePreview: string | null = null;
  showImageModal = false;
  internetOriginalPrice = 0;
  cableOriginalPrice = 0;

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private toastr: ToastrService,
    private firestore: Firestore,
    private modalService: NgbModal,
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
      connection_provider: ['', Validators.required],
      connection_type: ['', [Validators.required]],
      pkg_cable: [null, [Validators.required]],
      cable_discount: [null, [Validators.required]],
      internet_discount: [null, [Validators.required]],
      select_package: [null, [Validators.required]],
      internet_package_fee: [null, [Validators.required]],
      cable_package_fee: [null, [Validators.required]],
      photo: ['', [Validators.required]], // base64 string
      photoName: ['', [Validators.required]],
      latitude: ['', Validators.required],
      longitude: ['', Validators.required],
      static_ip: ['', Validators.required],
      // isActive: [true],
      createdAt: [new Date()],
    });
  }

  ngOnInit() {
    this.loadInternetAreas();
    this.loadCompanies();
    this.loadInternetPackages();
    this.loadCablePackages();
    this.editForm();
    // INTERNET PACKAGE
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

  editForm() {
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
        pkg_cable: this.userData.pkg_cable,
        cable_discount: this.userData.cable_discount,
        internet_discount: this.userData.internet_discount,
        select_package: this.userData.select_package,
        internet_package_fee: this.userData.internet_package_fee,
        cable_package_fee: this.userData.cable_package_fee,
        photo: this.userData.photo,
        photoName: this.userData.photoName,
        latitude: this.userData.latitude,
        longitude: this.userData.longitude,
        static_ip: this.userData.static_ip,
        createdAt: this.userData.createdAt ?? new Date(),
      });
      this.imagePreview = this.userData.photo;
      if (this.userData.latitude && this.userData.longitude) {
        this.locationText = `${this.userData.latitude}, ${this.userData.longitude}`;
      }
    }
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

  get isInternet() {
    return this.userForm.get('connection_type')?.value === 'internet';
  }

  get isCable() {
    return this.userForm.get('connection_type')?.value === 'tv_cable';
  }

  get isBoth() {
    return this.userForm.get('connection_type')?.value === 'both';
  }

  async loadInternetAreas() {
    try {
      const ref = doc(this.firestore, 'internetArea', 'internetAreaDoc');
      const snap = await getDoc(ref);

      if (snap.exists()) {
        this.internetAreas = snap.data()?.['internetAreas'] || [];
      }
    } catch (error) {
      console.error('Error loading internet areas', error);
    }
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

        // if (!this.editMode) {
        //   const formattedPhone = this.formatPhoneNumber(
        //     this.userForm.value.phone_no,
        //   );
        //   const hasWhatsApp = await this.checkWhatsAppNumber(formattedPhone);

        //   if (hasWhatsApp) {
        //     await this.sendWelcomeMessage(formattedPhone);
        //   }
        // }
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

  onImageSelect(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toastr.error('Only image files allowed');
      return;
    }

    this.resizeAndConvertToBase64(file, 400, 400).then((base64) => {
      this.imagePreview = base64;

      this.userForm.patchValue({
        photo: base64,
        photoName: file.name,
      });
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

  openImageModal() {
    if (!this.imagePreview) return;
    this.showImageModal = true;
  }

  closeImageModal() {
    this.showImageModal = false;
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

  private formatPhoneNumber(phone: string): string {
    phone = phone.trim();
    if (phone.startsWith('0')) {
      return '+92' + phone.substring(1);
    } else if (!phone.startsWith('+')) {
      return '+92' + phone; // fallback if user entered without 0 or +
    }
    return phone;
  }

  async checkWhatsAppNumber(phone: string) {
    const formattedNumber = this.formatPhoneNumber(phone);

    // Example: send POST request to WhatsApp Cloud API (replace TOKEN and YOUR_PHONE_NUMBER_ID)
    try {
      const response = await fetch(
        `https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/contacts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer YOUR_ACCESS_TOKEN`,
          },
          body: JSON.stringify({ contacts: [formattedNumber] }),
        },
      );

      const result = await response.json();
      console.log(result);
      return result.contacts?.[0]?.status === 'valid';
    } catch (err) {
      console.error('WhatsApp check failed', err);
      return false;
    }
  }

  async sendWelcomeMessage(phone: string) {
    const formattedNumber = this.formatPhoneNumber(phone);

    try {
      await fetch(
        `https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer YOUR_ACCESS_TOKEN`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: formattedNumber,
            type: 'text',
            text: { body: 'Welcome to our service! 🎉' },
          }),
        },
      );
    } catch (err) {
      console.error('Failed to send WhatsApp message', err);
    }
  }
}
