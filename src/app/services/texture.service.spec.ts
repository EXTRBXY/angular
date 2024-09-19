import { TestBed } from '@angular/core/testing';

import { TextureService } from './texture.service';

describe('TextureService', () => {
  let service: TextureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TextureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
