import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SceneService } from './scene.service';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private hdriCache = new Map<string, THREE.Texture>();
  private rgbeLoader = new RGBELoader();

  constructor(private sceneService: SceneService) {
    document
      .getElementById('hdri-select')
      ?.addEventListener('change', (event) => {
        this.updateEnvironment((event.target as HTMLSelectElement).value);
      });
  }

  async updateEnvironment(hdriName: string): Promise<void> {
    this.sceneService.showLoadingBar();

    if (hdriName === 'none') {
      this.sceneService.scene.environment = null;
    } else {
      try {
        const texture = await this.getHDRITexture(hdriName);
        this.sceneService.scene.environment = texture;
      } catch (error) {
        console.error('Ошибка загрузки HDRI:', error);
        alert('Ошибка загрузки HDRI. Проверьте формат файла и путь к нему.');
      }
    }

    this.sceneService.hideLoadingBar();
  }

  private async getHDRITexture(hdriName: string): Promise<THREE.Texture> {
    if (this.hdriCache.has(hdriName)) {
      console.log('HDRI загружена из кэша:', hdriName);
      return this.hdriCache.get(hdriName)!;
    }

    const relativePath = `/assets/textures/equirectangular/${hdriName}`;
    const texture = await this.loadHDRI(relativePath);
    this.hdriCache.set(hdriName, texture);
    return texture;
  }

  private loadHDRI(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.rgbeLoader.load(
        path,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          resolve(texture);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            this.sceneService.showLoadingBar((xhr.loaded / xhr.total) * 100);
          }
        },
        reject
      );
    });
  }
}
