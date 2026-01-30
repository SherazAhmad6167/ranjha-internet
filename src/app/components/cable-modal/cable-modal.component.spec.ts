import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CableModalComponent } from './cable-modal.component';

describe('CableModalComponent', () => {
  let component: CableModalComponent;
  let fixture: ComponentFixture<CableModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CableModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CableModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
