import { Injectable, signal } from '@angular/core';
export type ApprovalStatus='pending'|'approved'|'rejected';
export interface AuthSession {email:string;role:'organization'|'companion';approval_status:ApprovalStatus;expires_at:number;}
/** Preview only: no real credentials, tokens or documents are sent or persisted. */
@Injectable({providedIn:'root'})
export class AuthService {
 readonly mock=true; readonly session=signal<AuthSession|null>(null);
 private request:{kind:'registration'|'reset';email:string;expires:number}|null=null;
 get signedIn(){const s=this.session();return !!s && s.expires_at>Date.now();}
 async login(email:string,password:string){if(!email||!password)throw Error('Enter your email and password.');this.session.set({email,role:'organization',approval_status:'pending',expires_at:Date.now()+43200000});}
 beginRegistration(email:string){this.request={kind:'registration',email,expires:Date.now()+600000};}
 beginReset(email:string){this.request={kind:'reset',email,expires:Date.now()+600000};}
 verify(code:string){if(!this.request)throw Error('Start a new registration or password reset first.');if(Date.now()>this.request.expires)throw Error('This email code has expired. Start a new request.');if(code!=='012345')throw Error('The code is incorrect. In mock mode use 012345.');}
 clearRequest(){this.request=null;}
 setStatus(status:ApprovalStatus){this.session.update(s=>s?{...s,approval_status:status}:s);}
 logout(){this.session.set(null);this.clearRequest();}
}
