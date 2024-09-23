import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class AppStateService {
  // Состояние выбранного объекта
  private selectedObjectSource = new BehaviorSubject<THREE.Mesh | null>(null);
  selectedObject$ = this.selectedObjectSource.asObservable();

  // Состояние текущей модели
  private currentModelIndexSource = new BehaviorSubject<number | null>(null);
  currentModelIndex$ = this.currentModelIndexSource.asObservable();

  setSelectedObject(mesh: THREE.Mesh | null): void {
    this.selectedObjectSource.next(mesh);
  }

  setCurrentModelIndex(index: number | null): void {
    this.currentModelIndexSource.next(index);
  }
}
