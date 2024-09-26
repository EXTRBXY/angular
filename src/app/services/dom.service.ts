// src/app/services/dom.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DomService {
  private textureSelectSubject = new BehaviorSubject<string>('');
  private tilingSubject = new BehaviorSubject<number>(1);

  constructor(private ngZone: NgZone) {}

  getTextureSelectObservable(): Observable<string> {
    return this.textureSelectSubject.asObservable();
  }

  getTilingObservable(): Observable<number> {
    return this.tilingSubject.asObservable();
  }

  updateTextureSelect(value: string): void {
    this.ngZone.run(() => {
      this.textureSelectSubject.next(value);
    });
  }

  updateTiling(value: number): void {
    this.ngZone.run(() => {
      this.tilingSubject.next(value);
    });
  }
}
