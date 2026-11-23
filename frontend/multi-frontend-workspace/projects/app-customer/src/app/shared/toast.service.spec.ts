import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('adds and dismisses notifications', () => {
    TestBed.configureTestingModule({});
    const toastService = TestBed.inject(ToastService);

    toastService.show('Saved successfully.');
    const toast = toastService.toasts()[0];

    expect(toast).toEqual({
      id: 1,
      message: 'Saved successfully.',
      type: 'success',
    });

    toastService.dismiss(toast.id);
    expect(toastService.toasts()).toEqual([]);
  });
});
