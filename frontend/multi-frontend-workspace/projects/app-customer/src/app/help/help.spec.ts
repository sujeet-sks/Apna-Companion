import { TestBed } from '@angular/core/testing';
import { Help } from './help';

describe('Help', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Help],
    }).compileComponents();
  });

  it('renders the support contact email addresses', () => {
    const fixture = TestBed.createComponent(Help);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Help and support');
    const emailLinks = element.querySelectorAll<HTMLAnchorElement>('.contact-emails a');
    expect(Array.from(emailLinks).map((link) => link.href)).toEqual([
      'mailto:sujeet.iitb@gmail.com',
      'mailto:shubham.paul2002@gmail.com',
      'mailto:mhhamid634@gmail.com',
    ]);
  });
});
