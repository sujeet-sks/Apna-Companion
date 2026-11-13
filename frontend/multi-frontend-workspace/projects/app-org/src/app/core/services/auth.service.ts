import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AuthSession {
  email: string;
  role: 'organization';
  account_id: string;
  approval_status: ApprovalStatus;
  expires_at: number;
}

interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  organization_id: string;
}

interface OrganizationIdentity {
  email: string;
  organization_id: string;
  approval_status: ApprovalStatus;
}

interface RequestResponse {
  request_id?: string;
  verification_id?: string;
}

const API_BASE_URL = 'http://localhost:8000/api/v1';
export const AUTH_TOKEN_STORAGE_KEY = 'apna-companion.organization.token';
const SESSION_STORAGE_KEY = 'apna-companion.organization.session';
const REGISTRATION_STORAGE_KEY = 'apna-companion.organization.registration';
const RESET_STORAGE_KEY = 'apna-companion.organization.reset';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<AuthSession | null>(this.restoreSession());

  constructor(private readonly http: HttpClient) {}

  get signedIn(): boolean {
    const session = this.session();
    return !!session && session.expires_at > Date.now();
  }

  async login(email: string, password: string): Promise<void> {
    this.clearSession();
    const token = await this.call(
      this.http.post<ApiEnvelope<TokenResponse>>(`${API_BASE_URL}/org/login/`, {
        email,
        password,
      }),
    );
    if (!token.access_token || !token.expires_in) {
      throw new Error('The server returned an invalid login response.');
    }

    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.access_token);
    try {
      const identity = await this.call(
        this.http.get<ApiEnvelope<OrganizationIdentity>>(`${API_BASE_URL}/org/me/`),
      );
      this.saveSession(identity, token.expires_in);
    } catch (error) {
      this.clearSession();
      throw error;
    }
  }

  async beginRegistration(input: {
    organization_name: string;
    organization_type: string;
    email: string;
    password: string;
    confirm_password: string;
    address: string;
    document_type: string;
    document_url: string;
    latitude: number;
    longitude: number;
  }): Promise<void> {
    const result = await this.call(
      this.http.post<ApiEnvelope<RequestResponse>>(
        `${API_BASE_URL}/org/register/start/`,
        input,
      ),
    );
    if (!result.verification_id) {
      throw new Error('The server did not return an email verification request.');
    }
    sessionStorage.setItem(REGISTRATION_STORAGE_KEY, result.verification_id);
  }

  async completeRegistration(email_code: string): Promise<void> {
    const verification_id = sessionStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!verification_id) {
      throw new Error('Start organization registration again to request a new code.');
    }
    await this.call(
      this.http.post<ApiEnvelope<unknown>>(`${API_BASE_URL}/org/register/complete/`, {
        verification_id,
        email_code,
      }),
    );
    sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
  }

  async beginReset(email: string): Promise<void> {
    const result = await this.call(
      this.http.post<ApiEnvelope<RequestResponse>>(
        `${API_BASE_URL}/org/forgot-password/request/`,
        { email },
      ),
    );
    if (!result.request_id) {
      throw new Error('The server did not return a password reset request.');
    }
    sessionStorage.setItem(RESET_STORAGE_KEY, result.request_id);
  }

  async completeReset(
    code: string,
    new_password: string,
    confirm_password: string,
  ): Promise<void> {
    const request_id = sessionStorage.getItem(RESET_STORAGE_KEY);
    if (!request_id) {
      throw new Error('Request a new password reset code first.');
    }
    await this.call(
      this.http.post<ApiEnvelope<unknown>>(
        `${API_BASE_URL}/org/forgot-password/complete/`,
        { request_id, code, new_password, confirm_password },
      ),
    );
    sessionStorage.removeItem(RESET_STORAGE_KEY);
  }

  async resubmit(input: {
    resubmission_token: string;
    address: string;
    document_type: string;
    document_url: string;
  }): Promise<void> {
    await this.call(
      this.http.post<ApiEnvelope<unknown>>(`${API_BASE_URL}/org/register/resubmit/`, input),
    );
  }

  async changePassword(
    current_password: string,
    new_password: string,
    confirm_password: string,
  ): Promise<void> {
    await this.call(
      this.http.patch<ApiEnvelope<unknown>>(`${API_BASE_URL}/org/change-password/`, {
        current_password,
        new_password,
        confirm_password,
      }),
    );
    this.clearSession();
  }

  async logout(): Promise<void> {
    try {
      await this.call(
        this.http.post<ApiEnvelope<unknown>>(`${API_BASE_URL}/org/logout/`, {}),
      );
    } finally {
      this.clearSession();
    }
  }

  private async call<T>(request: Observable<ApiEnvelope<T>>): Promise<T> {
    try {
      const response = await firstValueFrom(request);
      if (!response || !('data' in response)) {
        throw new Error('The server returned an unexpected response.');
      }
      return response.data;
    } catch (error) {
      if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
        throw error;
      }
      throw this.toAuthError(error);
    }
  }

  private toAuthError(error: unknown): Error {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new Error('Unable to reach the API at http://localhost:8000. Start the backend and try again.');
      }
      const body = error.error as { message?: unknown; detail?: unknown } | null;
      const message = body?.message ?? body?.detail;
      if (typeof message === 'string') {
        return new Error(message);
      }
      return new Error(`The request failed (${error.status}). Please try again.`);
    }
    return new Error('The request failed. Please try again.');
  }

  private saveSession(identity: OrganizationIdentity, expiresIn: number): void {
    const session: AuthSession = {
      email: identity.email,
      role: 'organization',
      account_id: identity.organization_id,
      approval_status: identity.approval_status,
      expires_at: Date.now() + expiresIn * 1000,
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    this.session.set(session);
  }

  private restoreSession(): AuthSession | null {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!token || !stored) {
      this.clearStoredSession();
      return null;
    }
    try {
      const session = JSON.parse(stored) as AuthSession;
      if (
        session.role !== 'organization' ||
        typeof session.email !== 'string' ||
        typeof session.account_id !== 'string' ||
        !['pending', 'approved', 'rejected'].includes(session.approval_status) ||
        !Number.isFinite(session.expires_at) ||
        session.expires_at <= Date.now()
      ) {
        this.clearStoredSession();
        return null;
      }
      return session;
    } catch {
      this.clearStoredSession();
      return null;
    }
  }

  private clearSession(): void {
    this.clearStoredSession();
    this.session.set(null);
  }

  private clearStoredSession(): void {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
