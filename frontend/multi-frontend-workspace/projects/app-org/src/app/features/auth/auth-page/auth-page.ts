import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
@Component({selector:'app-auth-page', standalone:true, imports:[FormsModule,RouterLink], templateUrl:'./auth-page.html', styleUrl:'./auth-page.css'})
export class AuthPage {
 readonly auth=inject(AuthService); readonly router=inject(Router); readonly route=inject(ActivatedRoute);
 readonly organization: boolean=true;
 get page():string { return this.route.snapshot.data['page'] || 'login'; }
 get title():string { return ({login:'Welcome back',register:'Register your organization',verify:'Check your inbox',forgot:'Forgot your password?',reset:'Choose a new password',approval:'Your organization account',resubmit:'Resubmit for review',account:'You’re signed in',password:'Change your password'} as Record<string,string>)[this.page]; }
 get description():string { return ({login:'Sign in to continue making everyday life a little easier.',register:'Tell us about your organization. We’ll verify your email before submitting it for approval.',verify:'Enter the six-digit email code. Your request expires after 10 minutes.',forgot:'Enter your registered email to request a reset code.',reset:'Enter your email code and choose your new password.',approval:'Your approval status determines which features you can access.',resubmit:'Use the token from your review email to update your address and verification document.',account:'Your authentication preview is ready. Operational screens will be added next.',password:'Keep your account secure with a new password.'} as Record<string,string>)[this.page]; }
 email=''; password=''; confirm=''; current=''; code=''; name=''; type='bank'; address=''; documentType='registration_certificate'; file=''; token=''; error=''; message=''; busy=false; show=false;
 selectFile(event:Event){this.file=(event.target as HTMLInputElement).files?.[0]?.name || '';}
 async submit(){
 this.error='';this.message='';
 if(['register','reset','password'].includes(this.page) && this.password!==this.confirm){this.error='Passwords must match.';return;}
 if(['verify','reset'].includes(this.page) && !/^\d{6}$/.test(this.code)){this.error='Enter a six-digit code.';return;}
 this.busy=true;
 try {
 switch(this.page){
 case 'login': await this.auth.login(this.email,this.password); await this.router.navigateByUrl(this.organization?'/approval':'/account');break;
 case 'register': this.auth.beginRegistration(this.email);await this.router.navigateByUrl('/verify-email');break;
 case 'verify': this.auth.verify(this.code);this.auth.clearRequest();this.message='Email verified. Registration submitted for admin approval. You can now sign in.';break;
 case 'forgot': this.auth.beginReset(this.email);await this.router.navigateByUrl('/reset-password');break;
 case 'reset': this.auth.verify(this.code);this.auth.clearRequest();this.password='';this.confirm='';this.message='Password updated in this preview. Return to login to continue.';break;
 case 'resubmit': if(!this.token.trim()) throw Error('Enter the resubmission token from your email.');this.auth.setStatus('pending');this.message='Resubmitted for review. Your status is now pending.';break;
 case 'password':this.password='';this.confirm='';this.current='';this.message='Password changed in this preview.';break;
 }
 }catch(e){this.error=e instanceof Error?e.message:'Please try again.';}finally{this.busy=false;}
 }
 logout(){this.auth.logout();void this.router.navigateByUrl('/login');}
}
