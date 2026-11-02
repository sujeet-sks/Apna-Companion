import { AuthService } from './auth.service';
describe('Mock authentication',()=>{
 it('requires a request and accepts only the preview code',()=>{const auth=new AuthService();expect(()=>auth.verify('012345')).toThrow();auth.beginReset('person@example.com');expect(()=>auth.verify('999999')).toThrow();expect(()=>auth.verify('012345')).not.toThrow();auth.clearRequest();expect(()=>auth.verify('012345')).toThrow();});
 it('expires email verification after ten minutes',()=>{const auth=new AuthService();auth.beginReset('person@example.com');const now=Date.now();const original=Date.now;Date.now=()=>now+600001;try{expect(()=>auth.verify('012345')).toThrow('This email code has expired. Start a new request.');}finally{Date.now=original;}});
 it('clears the session on logout',async()=>{const auth=new AuthService();await auth.login('person@example.com','preview');expect(auth.signedIn).toBe(true);auth.logout();expect(auth.signedIn).toBe(false);});
});
