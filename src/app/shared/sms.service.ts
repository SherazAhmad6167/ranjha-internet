import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SmsService {
  private singleSMSUrl = 'https://whapiplus.com/api/send/sms';
  private singleBULKUrl = 'https://whapiplus.com/api/send/sms.bulk';
  // testing keys
  private apiKey = '461c854d79ade525a5aa66e419014598d3de0d53';
  private deviceId = '206a194f9b6bcdce';
  // real keys
  // private apiKey = '114c396cf496e5edabbf81e3e45dceb76b5d778f';
  // private deviceId = 'b69f16aa89d3b839';

  constructor(private http: HttpClient) {}

  sendSMS(phone: string, message: string): Observable<any> {
    const formData = new FormData();
    formData.append('secret', this.apiKey);
    formData.append('mode', 'devices');
    formData.append('phone', phone);
    formData.append('message', message);
    formData.append('device', this.deviceId);
    formData.append('sim', '1');
    return this.http.post(this.singleSMSUrl, formData);
  }

  sendBulkSMS(phone: string[], message: string): Observable<any> {
    const formData = new FormData();
    formData.append('secret', this.apiKey);
    formData.append('mode', 'devices');
    formData.append('campaign', 'Ranjha7star (itel S685LN)');
    formData.append('numbers', phone.join(','));
    formData.append('message', message);
    formData.append('device', this.deviceId);
    formData.append('sim', '1');
    return this.http.post(this.singleBULKUrl, formData);
  }
}
