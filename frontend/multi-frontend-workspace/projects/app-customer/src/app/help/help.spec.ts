import { TestBed } from '@angular/core/testing';
import { Help } from './help';

describe('Help', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Help],
    }).compileComponents();
  });

  it('should render support questions', () => {
    const fixture = TestBed.createComponent(Help);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Help and support');
    expect(element.querySelectorAll('details')).toHaveLength(3);
  });
});
