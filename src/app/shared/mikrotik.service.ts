import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type MikrotikUserType = 'router' | 'hotspot' | 'ppp';

export interface MikrotikError {
  message: string;
  isCors: boolean;
  status: number;
}

@Injectable({ providedIn: 'root' })
export class MikrotikService {
  // ── Proxy URL ───────────────────────────────────────────────────────────────
  // Requests go to the Node.js proxy (backend/server.js) which forwards them
  // to MikroTik server-side, bypassing CORS and the self-signed SSL cert.
  //
  // Dev:  run `npm start` inside backend/ → http://localhost:3000
  // Prod: host the Node.js server on your LAN or a VPS, update the URL below.
  private readonly proxyBase = 'http://localhost:3000/mikrotik';

  constructor(private http: HttpClient) {}

  // ── Public API ───────────────────────────────────────────────────────────────

  createUser(
    type: MikrotikUserType,
    name: string,
    password: string,
    groupOrProfile: string,
  ): Observable<any> {
    switch (type) {
      case 'router':
        return this.createRouterUser(name, password, groupOrProfile || 'full');
      case 'hotspot':
        return this.createHotspotUser(name, password, groupOrProfile || 'default');
      case 'ppp':
        return this.createPppSecret(name, password, groupOrProfile || 'default');
    }
  }

  createRouterUser(name: string, password: string, group = 'full'): Observable<any> {
    return this.put('/user', { name, password, group });
  }

  createHotspotUser(name: string, password: string, profile = 'default'): Observable<any> {
    return this.put('/ip/hotspot/user', { name, password, profile });
  }

  createPppSecret(
    name: string,
    password: string,
    profile = 'default',
    service = 'pppoe',
  ): Observable<any> {
    return this.put('/ppp/secret', { name, password, profile, service });
  }

  getSystemResource(): Observable<any> {
    return this.get('/system/resource');
  }

  userExists(type: MikrotikUserType, name: string): Observable<boolean> {
    return this.get(this.endpointFor(type)).pipe(
      map((users: any[]) => users.some((u) => u.name === name)),
    );
  }

  // ── HTTP helpers ─────────────────────────────────────────────────────────────
  // No Authorization header needed — credentials live on the Node.js server.

  private get(path: string): Observable<any> {
    return this.http
      .get(`${this.proxyBase}${path}`)
      .pipe(catchError(this.mapError));
  }

  private put(path: string, body: object): Observable<any> {
    return this.http
      .put(`${this.proxyBase}${path}`, body)
      .pipe(catchError(this.mapError));
  }

  private mapError(err: HttpErrorResponse): Observable<never> {
    const isCors = err.status === 0;
    let message: string;

    if (isCors) {
      message =
        'Cannot reach the proxy server. Make sure the Node.js backend is running ' +
        '(cd backend && npm start) and accessible at the configured URL.';
    } else if (err.status === 400) {
      message = err.error?.detail || err.error?.message || 'Bad request';
    } else if (err.status === 401) {
      message = 'Authentication failed — check router credentials in backend/.env';
    } else if (err.status === 403) {
      message = 'Access denied — the router user lacks permission.';
    } else if (err.status === 409) {
      message = 'A user with this name already exists.';
    } else if (err.status === 503) {
      message = err.error?.message || 'Cannot connect to MikroTik router.';
    } else if (err.status === 504) {
      message = 'Connection to MikroTik timed out.';
    } else {
      message = err.error?.detail || err.error?.message || err.message || 'Unknown error';
      if (typeof message === 'string' && message.toLowerCase().includes('already')) {
        message = 'A user with this name already exists.';
      }
    }

    return throwError(() => ({ message, isCors, status: err.status } as MikrotikError));
  }

  private endpointFor(type: MikrotikUserType): string {
    switch (type) {
      case 'router':  return '/user';
      case 'hotspot': return '/ip/hotspot/user';
      case 'ppp':     return '/ppp/secret';
    }
  }
}
