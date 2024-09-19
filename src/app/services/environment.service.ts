import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SceneService } from './scene.service';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  // Кэш для HDRI
  private hdriCache = new Map<string, THREE.Texture>();

  constructor(private sceneService: SceneService) {
    const hdriSelect = document.getElementById(
      'hdri-select'
    ) as HTMLSelectElement;
    hdriSelect?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      this.updateEnvironment(target.value);
    });
  }

  // Асинхронная функция обновления окружения
  async updateEnvironment(hdriName: string): Promise<void> {
    this.sceneService.showLoadingBar();

    if (hdriName === 'none') {
      this.sceneService.scene.environment = null;
      this.sceneService.hideLoadingBar();
      return;
    }

    try {
      let texture: THREE.Texture;

      if (this.hdriCache.has(hdriName)) {
        console.log('HDRI загружена из кэша:', hdriName);
        texture = this.hdriCache.get(hdriName)!;
      } else {
        const relativePath = `/assets/textures/equirectangular/${hdriName}`;
        texture = await this.loadHDRI(relativePath);
        this.hdriCache.set(hdriName, texture);
      }

      this.sceneService.scene.environment = texture;
    } catch (error) {
      console.error('Ошибка загрузки HDRI:', error);
      alert('Ошибка загрузки HDRI. Проверьте формат файла и путь к нему.');
    } finally {
      this.sceneService.hideLoadingBar();
    }
  }

  // Функция загрузки HDRI
  private loadHDRI(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      new RGBELoader().load(
        path,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          resolve(texture);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            this.sceneService.showLoadingBar(percentComplete);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }
}
