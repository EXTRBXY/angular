import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SceneService } from './scene.service';
import { DomService } from './dom.service';

@Injectable({
  providedIn: 'root',
})
export class EnvironmentService {
  private hdriCache = new Map<string, THREE.Texture>();
  private rgbeLoader = new RGBELoader();

  constructor(
    private sceneService: SceneService,
    private domService: DomService
  ) {
    this.domService.getHdriSelectObservable().subscribe((hdriName) => {
      this.updateEnvironment(hdriName);
    });
  }

  async updateEnvironment(hdriName: string): Promise<void> {
    this.sceneService.showLoadingBar();

    if (hdriName === 'none') {
      this.sceneService.scene.environment = null;
      this.sceneService.hideLoadingBar();
    } else {
      // Убрали обработку ошибок
      const texture = await this.getHDRITexture(hdriName);
      this.sceneService.scene.environment = texture;
      this.sceneService.hideLoadingBar();
    }
  }

  private async getHDRITexture(hdriName: string): Promise<THREE.Texture> {
    if (this.hdriCache.has(hdriName)) {
      console.log('HDRI загружена из кэша:', hdriName);
      return this.hdriCache.get(hdriName)!;
    }

    const relativePath = `assets/equirectangular/${hdriName}`;
    return new Promise((resolve) => {
      this.rgbeLoader.load(
        relativePath,
        (texture) => {
          texture.mapping = THREE.EquirectangularReflectionMapping;
          this.hdriCache.set(hdriName, texture);
          resolve(texture);
        },
        (xhr) => {
          if (xhr.lengthComputable) {
            this.sceneService.showLoadingBar((xhr.loaded / xhr.total) * 100);
          }
        },
        () => {
          // Убрали обработку ошибок
          resolve(new THREE.Texture()); // Возвращаем пустую текстуру в случае ошибки
        }
      );
    });
  }
}
