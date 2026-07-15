import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SmsService {

  private apiUrl = 'https://api.smsmobileapi.com/sendsms/';
  private apiKey = '7dd5aab90ec2c5a28b79b593a439e6dc8e99f2c8e4525fda'; 

  constructor(private http: HttpClient) {}

  sendSMS(recipient: string, message: string): Observable<any> {
    const params = new HttpParams()
      .set('apikey', this.apiKey)
      .set('recipients', recipient)
      .set('message', message);

    return this.http.get(this.apiUrl, { params });
  }
}