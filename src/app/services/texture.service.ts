import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { ModelService } from './model.service';

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
    private modelService: ModelService
  ) {
    const textureSelect = document.getElementById(
      'texture-select'
    ) as HTMLSelectElement;
    textureSelect?.addEventListener('change', (event) => {
      const target = event.target as HTMLSelectElement;
      this.updateTexture(target.value);
    });

    const uploadTextureBtn = document.getElementById(
      'upload-texture-btn'
    ) as HTMLButtonElement;
    const textureUploadInput = document.getElementById(
      'texture-upload'
    ) as HTMLInputElement;

    uploadTextureBtn?.addEventListener('click', () => {
      textureUploadInput?.click();
    });

    textureUploadInput?.addEventListener('change', (event) =>
      this.onTextureUpload(event)
    );

    const tilingSlider = document.getElementById(
      'tiling-slider'
    ) as HTMLInputElement;
    tilingSlider?.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      const tiling = parseFloat(target.value);
      this.updateTiling(tiling, this.modelService.getSelectedObject());
    });

    const tilingValue = document.getElementById('tiling-value');
    if (tilingValue) {
      tilingValue.textContent = '1';
    }
  }

  private onTextureUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const texture = this.textureLoader.load(result);
          const timestamp = Date.now();
          const optionValue = `uploaded-texture-${timestamp}`;

          texture.userData['textureName'] = optionValue;
          this.applyTexture(texture, this.modelService.getSelectedObject());

          this.uploadedTextures[optionValue] = texture;

          const option = document.createElement('option');
          option.value = optionValue;
          option.text = file.name;
          option.setAttribute('data-is-uploaded', 'true');

          const textureSelect = document.getElementById(
            'texture-select'
          ) as HTMLSelectElement;
          textureSelect.appendChild(option);
          textureSelect.value = optionValue;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  async updateTexture(textureName: string): Promise<void> {
    if (textureName === 'default') {
      this.applyDefaultTexture();
    } else if (textureName.startsWith('uploaded-texture-')) {
      const texture = this.uploadedTextures[textureName];
      if (texture) {
        this.applyTexture(texture, this.modelService.getSelectedObject());
      }
    } else {
      await this.loadAndApplyTexture(textureName);
    }
  }

  private async loadAndApplyTexture(textureName: string): Promise<void> {
    this.sceneService.showLoadingBar();
    const texturePath = `assets/textures/${textureName}.png`;

    if (this.textureCache.has(textureName)) {
      const texture = this.textureCache.get(textureName);
      if (texture) {
        this.applyTexture(texture, this.modelService.getSelectedObject());
        this.sceneService.hideLoadingBar();
      }
    } else {
      try {
        const texture = await this.loadTextureWithProgress(texturePath);
        this.textureCache.set(textureName, texture);
        this.applyTexture(texture, this.modelService.getSelectedObject());
      } catch (error) {
        console.error('Ошибка загрузки текстуры:', error);
      } finally {
        this.sceneService.hideLoadingBar();
      }
    }
  }

  private loadTextureWithProgress(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          this.sceneService.showLoadingBar(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const blob = xhr.response;
          const objectURL = URL.createObjectURL(blob);

          this.textureLoader.load(
            objectURL,
            (texture) => {
              URL.revokeObjectURL(objectURL);
              resolve(texture);
            },
            undefined,
            (error) => {
              URL.revokeObjectURL(objectURL);
              reject(error);
            }
          );
        } else {
          reject(new Error(`Ошибка загрузки текстуры: ${xhr.status}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Ошибка сети при загрузке текстуры'));
      };

      xhr.send();
    });
  }

  applyTexture(texture: THREE.Texture, object: THREE.Object3D | null): void {
    const targetObject =
      object ||
      this.modelService.getModels()[this.modelService.getCurrentModelIndex()];
    if (!targetObject) return;

    targetObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material);
        }

        if (Array.isArray(child.material)) {
          child.material.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.map = texture.clone();
              material.map.needsUpdate = true;
              material.needsUpdate = true;
            }
          });
        } else if (child.material instanceof THREE.MeshStandardMaterial) {
          child.material.map = texture.clone();
          child.material.map.needsUpdate = true;
          child.material.needsUpdate = true;
        }

        this.componentTextures.set(
          child.uuid,
          texture.userData.textureName || ''
        );

        const tiling = this.getObjectTiling(child);
        this.updateTiling(tiling, child);
      }
    });
  }

  private applyDefaultTexture(): void {
    const models = this.modelService.getModels();
    if (!models.length) return;

    const currentModel = models[this.modelService.getCurrentModelIndex()];
    currentModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (this.originalMaterials.has(child.uuid)) {
          const originalMaterial = this.originalMaterials.get(child.uuid);
          if (originalMaterial) {
            child.material =
              originalMaterial instanceof THREE.Material
                ? originalMaterial.clone()
                : originalMaterial.map((m) => m.clone());
          }
        } else {
          child.material = new THREE.MeshStandardMaterial();
        }
        this.componentTextures.delete(child.uuid);
      }
      if (child instanceof THREE.Mesh && child.material) {
        child.material.needsUpdate = true;
      }
    });
  }

  getObjectTiling(object: THREE.Object3D): number {
    return this.componentTiling.get(object.uuid) || 1;
  }

  updateTiling(tiling: number, object: THREE.Object3D | null): void {
    const targetObject =
      object ||
      this.modelService.getModels()[this.modelService.getCurrentModelIndex()];
    if (!targetObject) return;

    targetObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.componentTiling.set(child.uuid, tiling);
        if (
          child.material instanceof THREE.MeshStandardMaterial &&
          child.material.map
        ) {
          child.material.map.repeat.set(tiling, tiling);
          child.material.map.wrapS = THREE.RepeatWrapping;
          child.material.map.wrapT = THREE.RepeatWrapping;
          child.material.needsUpdate = true;
        }
      }
    });

    const tilingValue = document.getElementById(
      'tiling-value'
    ) as HTMLSpanElement;
    if (tilingValue) {
      tilingValue.textContent = tiling.toString();
    }
  }

  resetTilingForAllComponents(): void {
    const models = this.modelService.getModels();
    if (models.length > 0) {
      const currentModel = models[this.modelService.getCurrentModelIndex()];
      currentModel.traverse((child) => {
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
}
