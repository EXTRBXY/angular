// src/app/services/texture.service.ts
import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { DomService } from './dom.service';

type UploadedTextures = { [key: string]: THREE.Texture };

@Injectable({
  providedIn: 'root',
})
export class TextureService {
  private textureLoader = new THREE.TextureLoader();
  private originalMaterials = new Map<
    string,
    THREE.Material | THREE.Material[]
  >();
  private uploadedTextures: UploadedTextures = {};
  public componentTextures = new Map<string, string>();
  private textureCache = new Map<string, THREE.Texture>();
  private componentTiling = new Map<string, number>();

  constructor(
    private sceneService: SceneService,
    private domService: DomService
  ) {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.domService.getTextureSelectObservable().subscribe((textureName) => {
      this.updateTexture(textureName, null); // Здесь null нужно заменить на актуальный выбранный объект
    });

    this.domService.getTilingObservable().subscribe((tiling) => {
      // console.warn('Передайте выбранный объект модели при вызове updateTiling');
      // this.updateTiling(tiling, selectedObject);
    });

    // Добавьте слушатель для загрузки предопределённых текстур
    // Если у вас есть метод для загрузки предопределённых текстур, убедитесь, что они устанавливают textureName
  }

  private onTextureUpload(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const texture = this.textureLoader.load(result);
          const optionValue = `uploaded-texture-${Date.now()}`;
          texture.userData['textureName'] = optionValue;
          this.uploadedTextures[optionValue] = texture;
          this.addTextureOption(file.name, optionValue);
        }
      };
      reader.readAsDataURL(file);
    }
  }

  private addTextureOption(name: string, value: string): void {
    const textureSelect = document.getElementById(
      'texture-select'
    ) as HTMLSelectElement;
    const option = document.createElement('option');
    option.value = value;
    option.text = name;
    option.setAttribute('data-is-uploaded', 'true');
    textureSelect.appendChild(option);
    textureSelect.value = value;
  }

  public async updateTexture(
    textureName: string,
    object: THREE.Object3D | null
  ): Promise<void> {
    if (!object) return;

    if (textureName === 'default') {
      this.applyDefaultTexture(object);
    } else if (textureName.startsWith('uploaded-texture-')) {
      const texture = this.uploadedTextures[textureName];
      if (texture) this.applyTexture(texture, object);
    } else {
      await this.loadAndApplyTexture(textureName, object);
    }
  }

  private async loadAndApplyTexture(
    textureName: string,
    object: THREE.Object3D
  ): Promise<void> {
    this.sceneService.showLoadingBar();
    const texturePath = `/assets/textures/${textureName}.png`;

    try {
      const texture =
        this.textureCache.get(textureName) ||
        (await this.loadTextureWithProgress(texturePath));
      if (!this.textureCache.has(textureName)) {
        this.textureCache.set(textureName, texture);
        // Устанавливаем название текстуры для предопределённых текстур
        texture.userData['textureName'] = textureName;
      }
      this.applyTexture(texture, object);
    } catch (error) {
      console.error('Ошибка загрузки текстуры:', error);
    } finally {
      this.sceneService.hideLoadingBar();
    }
  }

  private loadTextureWithProgress(path: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', path, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          this.sceneService.showLoadingBar((event.loaded / event.total) * 100);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              const texture = this.textureLoader.load(reader.result);
              // Устанавливаем название текстуры для предопределённых текстур
              texture.userData['textureName'] =
                path.split('/').pop()?.replace('.png', '') || 'default';
              resolve(texture);
            } else {
              reject(new Error('Некорректный формат текстуры'));
            }
          };
          reader.onerror = () =>
            reject(new Error('Ошибка чтения файла текстуры'));
          reader.readAsDataURL(xhr.response);
        } else {
          reject(new Error(`Ошибка загрузки текстуры: ${xhr.status}`));
        }
      };

      xhr.onerror = () =>
        reject(new Error('Ошибка сети при загрузке текстуры'));
      xhr.send();
    });
  }

  public applyTexture(texture: THREE.Texture, object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material);
        }

        this.applyTextureToMaterial(child.material, texture);
        const textureName = texture.userData['textureName'] || 'default';
        this.componentTextures.set(child.uuid, textureName);
        this.updateTiling(this.getObjectTiling(child), child);
      }
    });
  }

  private applyTextureToMaterial(
    material: THREE.Material | THREE.Material[],
    texture: THREE.Texture
  ): void {
    const applyToMaterial = (mat: THREE.Material) => {
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.map = texture.clone();
        mat.map.needsUpdate = true;
        mat.needsUpdate = true;
      }
    };

    if (Array.isArray(material)) {
      material.forEach(applyToMaterial);
    } else {
      applyToMaterial(material);
    }
  }

  private applyDefaultTexture(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = this.originalMaterials.get(child.uuid);
        if (originalMaterial) {
          child.material =
            originalMaterial instanceof THREE.Material
              ? originalMaterial.clone()
              : (originalMaterial as THREE.Material[]).map((m) => m.clone());
        } else {
          child.material = new THREE.MeshStandardMaterial();
        }
        this.componentTextures.delete(child.uuid);
        child.material.needsUpdate = true;
      }
    });
  }

  public getObjectTiling(object: THREE.Object3D): number {
    return this.componentTiling.get(object.uuid) || 1;
  }

  public updateTiling(tiling: number, object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.componentTiling.set(child.uuid, tiling);
        if (
          child.material instanceof THREE.MeshStandardMaterial &&
          child.material.map
        ) {
          child.material.map.repeat.set(tiling, tiling);
          child.material.map.wrapS = child.material.map.wrapT =
            THREE.RepeatWrapping;
          child.material.needsUpdate = true;
        }
      }
    });

    const tilingValue = document.getElementById(
      'tiling-value'
    ) as HTMLSpanElement;
    if (tilingValue) tilingValue.textContent = tiling.toString();
  }

  public resetTilingForAllComponents(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.componentTiling.set(child.uuid, 1);
        if (
          child.material instanceof THREE.MeshStandardMaterial &&
          child.material.map
        ) {
          child.material.map.repeat.set(1, 1);
          child.material.needsUpdate = true;
        }
      }
    });

    const tilingSlider = document.getElementById(
      'tiling-slider'
    ) as HTMLInputElement;
    const tilingValue = document.getElementById(
      'tiling-value'
    ) as HTMLSpanElement;
    if (tilingSlider && tilingValue) {
      tilingSlider.value = '1';
      tilingValue.textContent = '1';
    }
  }
}
