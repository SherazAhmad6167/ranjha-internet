import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, Validators,
  ReactiveFormsModule, FormsModule
} from '@angular/forms';
import {
  Firestore, collection, doc, setDoc, updateDoc
} from '@angular/fire/firestore';
import { ToastrService } from 'ngx-toastr';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-router-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './router-modal.component.html',
  styleUrl: './router-modal.component.scss'
})
export class RouterModalComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  editMode      = false;
  routerData: any = null;
  operators: { id: string; operator_name: string }[] = [];
  prefillBarcode = '';

  routerForm!: FormGroup;
  isSubmitting = false;

  cameraActive  = false;
  stream: MediaStream | null = null;

  // Native BarcodeDetector (non-Windows Chrome / Android / macOS)
  private nativeInterval: any = null;

  // ZXing fallback (Windows Chrome, Firefox, etc.)
  private zxingControls: { stop: () => void } | null = null;

  useNativeDetector = false;

  constructor(
    private fb: FormBuilder,
    private firestore: Firestore,
    private toastr: ToastrService,
    public activeModal: NgbActiveModal,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.useNativeDetector = 'BarcodeDetector' in window;
    this.initForm();
    if (this.editMode && this.routerData) {
      this.routerForm.patchValue({
        date:     this.routerData.date,
        barcode:  this.routerData.barcode,
        operator: this.routerData.operator,
        givenBy:  this.routerData.givenBy
      });
    } else if (this.prefillBarcode) {
      this.routerForm.get('barcode')?.setValue(this.prefillBarcode);
    }
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.routerForm = this.fb.group({
      date:     [today, Validators.required],
      barcode:  ['',    Validators.required],
      operator: ['',    Validators.required],
      givenBy:  ['',    Validators.required]
    });
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  async openCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      this.cameraActive = true;

      // Give Angular time to render the <video> element
      setTimeout(async () => {
        const video = this.videoEl?.nativeElement;
        if (!video) return;
        video.srcObject = this.stream;
        await video.play();

        if (this.useNativeDetector) {
          this.startNativeDetection(video);
        } else {
          this.startZXingDetection(video);
        }
      }, 250);

    } catch (err: any) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Allow camera permission in your browser settings.'
        : 'Camera is not available on this device.';
      this.toastr.error(msg);
    }
  }

  // Native BarcodeDetector (Chrome/Edge on non-Windows)
  private startNativeDetection(video: HTMLVideoElement) {
    const BarcodeDetector = (window as any).BarcodeDetector;
    const detector = new BarcodeDetector({
      formats: ['code_128', 'code_39', 'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix']
    });
    this.nativeInterval = setInterval(async () => {
      if (video.readyState < 2) return;
      try {
        const results = await detector.detect(video);
        if (results.length > 0) {
          this.zone.run(() => this.onDetected(results[0].rawValue));
        }
      } catch {}
    }, 300);
  }

  // ZXing fallback (Windows Chrome, Firefox, Safari)
  private async startZXingDetection(video: HTMLVideoElement) {
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      this.zxingControls = await reader.decodeFromVideoElement(
        video,
        (result, _err) => {
          if (result) {
            this.zone.run(() => this.onDetected(result.getText()));
          }
        }
      );
    } catch (e) {
      console.warn('ZXing scanning error:', e);
    }
  }

  private onDetected(value: string) {
    this.routerForm.get('barcode')?.setValue(value);
    this.stopCamera();
    this.toastr.success(`Barcode scanned: ${value}`);
  }

  stopCamera() {
    // Stop native interval
    if (this.nativeInterval) {
      clearInterval(this.nativeInterval);
      this.nativeInterval = null;
    }
    // Stop ZXing continuous reader
    if (this.zxingControls) {
      try { this.zxingControls.stop(); } catch {}
      this.zxingControls = null;
    }
    // Release camera tracks
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    this.cameraActive = false;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async onSubmit() {
    if (this.routerForm.invalid) {
      this.routerForm.markAllAsTouched();
      this.toastr.error('Please fill all required fields');
      return;
    }
    this.isSubmitting = true;
    const payload = { ...this.routerForm.value, updatedAt: new Date() };
    try {
      if (this.editMode && this.routerData?.id) {
        await updateDoc(doc(this.firestore, 'router', this.routerData.id), payload);
        this.toastr.success('Router record updated');
      } else {
        const ref = doc(collection(this.firestore, 'router'));
        await setDoc(ref, { ...payload, id: ref.id, createdAt: new Date() });
        this.toastr.success('Router record saved');
      }
      this.activeModal.close(true);
    } catch {
      this.toastr.error('Failed to save record');
    } finally {
      this.isSubmitting = false;
    }
  }

  isInvalid(name: string) {
    const c = this.routerForm.get(name);
    return c?.invalid && c?.touched;
  }
}
