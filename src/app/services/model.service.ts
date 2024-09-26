import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SceneService } from './scene.service';
import { TextureService } from './texture.service';
import { TabsService } from './tabs.service';

type InfoParams = {
  Name: string;
  Width: string;
  Height: string;
  Depth: string;
};

@Injectable({
  providedIn: 'root',
})
export class ModelService {
  private readonly DRAG_OVER_CLASS = 'drag-over';
  private models: THREE.Group[] = [];
  private currentModelIndex = 0;
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private modelFileName = '';
  private bbox = new THREE.Box3();
  private size = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedObject: THREE.Mesh | null = null;
  private infoParams: InfoParams = { Name: '', Width: '', Height: '', Depth: '' };
  private dragCounter = 0;
  private isMouseDown = false;
  private mouseDownPosition = new THREE.Vector2();
  private mouseUpPosition = new THREE.Vector2();
  private fileQueue: File[] = [];

  constructor(
    private sceneService: SceneService,
    private textureService: TextureService,
    private tabsService: TabsService
  ) {
    this.initEventListeners();
  }

  private initEventListeners(): void {
    const uploadModelBtn = document.getElementById('upload-model-btn') as HTMLButtonElement;
    const modelUploadInput = document.getElementById('model-upload') as HTMLInputElement;

    uploadModelBtn?.addEventListener('click', () => modelUploadInput?.click());
    modelUploadInput?.addEventListener('change', (event) => this.onModelUpload(event));

    document.addEventListener('dragover', (event) => event.preventDefault(), false);
    document.addEventListener('drop', (event) => this.onDrop(event), false);
    document.addEventListener('mousedown', (event) => this.onMouseDown(event), false);
    document.addEventListener('mouseup', (event) => this.onMouseUp(event), false);
    document.addEventListener('dragenter', (event) => this.onDragEnter(event), false);
    document.addEventListener('dragleave', (event) => this.onDragLeave(event), false);

    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    meshList?.addEventListener('wheel', (event) => {
      (event.currentTarget as HTMLElement).scrollTop += event.deltaY;
    });
  }

  private async checkFileMimeType(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        if (!e.target?.result) {
          resolve(false);
          return;
        }
        const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 20);
        const header = Array.from(arr).map(byte => byte.toString(16).padStart(2, '0')).join('');
        console.log('Заголовок файла:', header);

        const validHeaders = ['4662780a', '46424380', '00000020', '4b617964', '2e464258', '4d5a', '4d534d'];
        resolve(validHeaders.some((h) => header.startsWith(h)) || header.toLowerCase().includes('fbx'));
      };
      reader.readAsArrayBuffer(file.slice(0, 20));
    });
  }

  private onDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (++this.dragCounter === 1) {
      document.body.classList.add(this.DRAG_OVER_CLASS);
    }
  }

  private onDragLeave(event: DragEvent): void {
    event.preventDefault();
    if (--this.dragCounter === 0) {
      document.body.classList.remove(this.DRAG_OVER_CLASS);
    }
  }

  private async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragCounter = 0;
    document.body.classList.remove(this.DRAG_OVER_CLASS);

    const files = event.dataTransfer?.files;
    if (files) {
      this.fileQueue = Array.from(files);
      this.processFileQueue();
    }
  }

  public async onModelUpload(event: Event): Promise<void> {
    const files = (event.target as HTMLInputElement).files;
    if (files) {
      this.fileQueue = Array.from(files);
      this.processFileQueue();
    }
  }

  private async processFileQueue(): Promise<void> {
    while (this.fileQueue.length > 0) {
      const file = this.fileQueue.shift();
      if (file) {
        try {
          console.log('Проверка файла:', file.name);
          const isValidFbx = await this.checkFileMimeType(file);
          console.log('Результат проверки:', isValidFbx);
          if (isValidFbx) {
            await this.loadModel(file);
          } else {
            alert(`Неверный формат файла: ${file.name}. Пожалуйста, загрузите файл FBX.`);
          }
        } catch (error) {
          console.error('Ошибка при проверке файла:', error);
          alert('Произошла ошибка при проверке файла. Пожалуйста, попробуйте еще раз.');
        }
      }
    }
  }

  private loadModel(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sceneService.showLoadingBar();
      const loader = new FBXLoader();
      loader.load(
        URL.createObjectURL(file),
        (fbx) => {
          const model = fbx as THREE.Group;
          this.modelFileName = file.name;

          this.prepareModel(model);
          this.setupCamera(model);
          this.addModelToScene(model);
          this.updateModelInfo();
          this.resetTextureAndTiling();

          resolve();
        },
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 100;
          this.sceneService.showLoadingBar(progress);
        },
        (error) => {
          console.error('Ошибка загрузки модели:', error);
          alert('Ошибка загрузки модели. Пожалуйста, попробуйте снова.');
          this.sceneService.hideLoadingBar();
          reject(error);
        }
      );
    });
  }

  private prepareModel(model: THREE.Group): void {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.cloneAndStoreMaterials(child);
        this.resetEmissiveColor(child);
        this.resetTextureRepeat(child);
      }
    });
  }

  private cloneAndStoreMaterials(mesh: THREE.Mesh): void {
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material, index) => {
        const clonedMaterial = material.clone();
        (mesh.material as THREE.Material[])[index] = clonedMaterial;
        this.originalMaterials.set(mesh.uuid + '_' + index, clonedMaterial);
      });
    } else if (mesh.material) {
      const clonedMaterial = mesh.material.clone();
      mesh.material = clonedMaterial;
      this.originalMaterials.set(mesh.uuid, clonedMaterial);
    }
  }

  private resetEmissiveColor(mesh: THREE.Mesh): void {
    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.emissive.set(0x000000);
    }
  }

  private resetTextureRepeat(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (material instanceof THREE.MeshStandardMaterial && material.map) {
        material.map.repeat.set(1, 1);
        material.needsUpdate = true;
      }
    });
  }

  private setupCamera(model: THREE.Group): void {
    const bbox = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const maxDimension = Math.max(size.x, size.y, size.z);
    const cameraDistance = maxDimension * 1.5;
    this.sceneService.camera.position.set(
      center.x + cameraDistance,
      center.y + cameraDistance,
      center.z + cameraDistance
    );
    this.sceneService.camera.lookAt(center);

    this.sceneService.camera.near = maxDimension / 100;
    this.sceneService.camera.far = maxDimension * 10;
    this.sceneService.camera.updateProjectionMatrix();

    this.sceneService.controls.maxDistance = maxDimension * 10;
    this.sceneService.controls.target.copy(center);
    this.sceneService.controls.update();
  }

  private addModelToScene(model: THREE.Group): void {
    if (this.models[this.currentModelIndex]) {
      this.sceneService.scene.remove(this.models[this.currentModelIndex]);
    }

    this.models.push(model);
    this.currentModelIndex = this.models.length - 1;
    this.sceneService.scene.add(model);

    this.tabsService.createTab(this.modelFileName, (index: number) => this.switchModel(index));
    this.sceneService.updateModelMaterial(model);
    this.updateMeshList(model);
  }

  private updateModelInfo(): void {
    this.updateInfo();
    this.sceneService.controls.update();
    this.sceneService.hideLoadingBar();
  }

  private resetTextureAndTiling(): void {
    const textureSelect = document.getElementById('texture-select') as HTMLSelectElement;
    textureSelect.value = 'default';
    this.textureService.updateTexture('default', this.getSelectedObject());

    const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement;
    const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement;
    tilingSlider.value = '1';
    tilingValue.textContent = '1';
  }

  private onMouseDown(event: MouseEvent): void {
    this.isMouseDown = true;
    this.mouseDownPosition.set(event.clientX, event.clientY);
  }

  private onMouseUp(event: MouseEvent): void {
    this.isMouseDown = false;
    this.mouseUpPosition.set(event.clientX, event.clientY);
    if (this.mouseDownPosition.distanceTo(this.mouseUpPosition) < 5) {
      this.handleClick(event);
    }
  }

  private handleClick(event: MouseEvent): void {
    if (!this.models[this.currentModelIndex]) return;

    const guiContainer = document.getElementById('gui-container');
    if (guiContainer?.contains(event.target as Node)) return;

    const rect = this.sceneService.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneService.camera);
    const intersects = this.raycaster.intersectObject(this.models[this.currentModelIndex], true);

    if (intersects.length > 0) {
      this.handleObjectSelection(intersects[0].object as THREE.Mesh);
    } else {
      this.handleNoSelection();
    }
  }

  private handleObjectSelection(selected: THREE.Mesh): void {
    if (this.selectedObject && this.selectedObject.material instanceof THREE.MeshStandardMaterial) {
      this.selectedObject.material.emissive.set(0x000000);
    }
    this.selectedObject = selected;
    if (selected.material instanceof THREE.MeshStandardMaterial) {
      selected.material.emissive.set(0x000000);
    }

    this.sceneService.outlinePass.selectedObjects = [selected];
    this.updateInfo(selected);
    this.highlightSelectedMesh(selected);
    this.updateTextureSelection(selected);
    this.updateTilingValues(selected);
  }

  private handleNoSelection(): void {
    this.sceneService.outlinePass.selectedObjects = [];
    this.selectedObject = null;
    this.updateInfo();
    this.resetTextureSelection();
    this.resetTilingValues();
    this.resetMeshListSelection();
  }

  private updateTextureSelection(selected: THREE.Mesh): void {
    const textureValue = this.textureService.componentTextures.get(selected.uuid);
    const textureSelect = document.getElementById('texture-select') as HTMLSelectElement;
    textureSelect.value = textureValue || 'default';
  }

  private updateTilingValues(selected: THREE.Mesh): void {
    const tiling = this.textureService.getObjectTiling(selected);
    const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement;
    const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement;
    tilingSlider.value = tiling.toString();
    tilingValue.textContent = tiling.toString();
  }

  private resetTextureSelection(): void {
    const textureSelect = document.getElementById('texture-select') as HTMLSelectElement;
    textureSelect.selectedIndex = -1;
    textureSelect.value = '';
  }

  private resetTilingValues(): void {
    const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement;
    const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement;
    tilingSlider.value = '1';
    tilingValue.textContent = '1';
  }

  private resetMeshListSelection(): void {
    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    if (meshList) {
      Array.from(meshList.children).forEach((li) => {
        if (li instanceof HTMLLIElement) {
          li.classList.remove('selected');
        }
      });
    }
  }

  private updateInfo(selected?: THREE.Object3D): void {
    if (this.models[this.currentModelIndex]) {
      this.updateInfoParams(selected);
      this.updateInfoDisplay();
      this.updateMeshList(this.models[this.currentModelIndex]);
    } else {
      this.resetInfoParams();
    }
  }

  private updateInfoParams(selected?: THREE.Object3D): void {
    const target = selected || this.models[this.currentModelIndex];
    this.infoParams.Name = selected ? selected.name : 'Модель: ' + this.modelFileName;
    this.bbox.setFromObject(target);
    this.size.copy(this.bbox.getSize(this.size));
    this.infoParams.Width = this.size.x.toFixed(2);
    this.infoParams.Height = this.size.y.toFixed(2);
    this.infoParams.Depth = this.size.z.toFixed(2);
  }

  private updateInfoDisplay(): void {
    const infoName = document.getElementById('info-name') as HTMLInputElement;
    const infoDimensions = document.getElementById('info-dimensions') as HTMLInputElement;

    infoName.value = this.infoParams.Name;
    infoDimensions.value = `${this.infoParams.Width} x ${this.infoParams.Height} x ${this.infoParams.Depth} см`;
  }

  private resetInfoParams(): void {
    this.infoParams = { Name: '', Width: '', Height: '', Depth: '' };
  }

  public switchModel(index: number): void {
    if (index < 0 || index >= this.models.length) return;

    if (this.models[this.currentModelIndex]) {
      this.sceneService.scene.remove(this.models[this.currentModelIndex]);
    }

    this.currentModelIndex = index;
    this.modelFileName = this.tabsService.tabs[index].name;

    const newModel = this.models[this.currentModelIndex];
    this.sceneService.scene.add(newModel);

    this.resetSelection();
    this.updateInfo();
    this.setupCamera(newModel);
    this.updateMeshList(newModel);
    this.textureService.updateTexture('default', this.getSelectedObject());
  }

  private resetSelection(): void {
    this.sceneService.outlinePass.selectedObjects = [];
    this.selectedObject = null;
  }

  private updateMeshList(model: THREE.Group): void {
    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    if (!meshList) return;

    meshList.innerHTML = '';

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshBbox = new THREE.Box3().setFromObject(child);
        const meshSize = meshBbox.getSize(new THREE.Vector3());
        const meshDimensions = `${meshSize.x.toFixed(2)} x ${meshSize.y.toFixed(2)} x ${meshSize.z.toFixed(2)} см`;

        const listItem = document.createElement('li');
        listItem.classList.add('mesh-item');

        const visibilityToggle = document.createElement('input');
        visibilityToggle.type = 'checkbox';
        visibilityToggle.checked = child.visible;
        visibilityToggle.onchange = () => {
          child.visible = visibilityToggle.checked;
          this.sceneService.render();
        };

        listItem.innerHTML = `
          <div class="mesh-name">Мэш: ${child.name || 'Без имени'}</div>
          <div class="mesh-dimensions">Габариты: ${meshDimensions}</div>
        `;
        listItem.dataset['uuid'] = child.uuid;
        listItem.prepend(visibilityToggle);

        listItem.onclick = (event) => {
          if (event.target !== visibilityToggle) {
            this.highlightSelectedMesh(child);
          }
        };

        meshList.appendChild(listItem);
      }
    });
  }

  private highlightSelectedMesh(mesh: THREE.Mesh): void {
    this.selectedObject = mesh;
    this.updateInfo(mesh);
    this.updateMeshListSelection(mesh);
    this.sceneService.outlinePass.selectedObjects = [mesh];
    this.applyTextureToMesh(mesh);
  }

  private updateMeshListSelection(mesh: THREE.Mesh): void {
    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    if (!meshList) return;

    Array.from(meshList.children).forEach((li) => {
      if (li instanceof HTMLLIElement) {
        li.classList.toggle('selected', li.dataset['uuid'] === mesh.uuid);
      }
    });
  }

  private applyTextureToMesh(mesh: THREE.Mesh): void {
    const currentTextureName = this.textureService.componentTextures.get(mesh.uuid) || 'default';
    this.textureService.updateTexture(currentTextureName, mesh);
  }

  getModels(): THREE.Group[] {
    return this.models;
  }

  getSelectedObject(): THREE.Mesh | null {
    return this.selectedObject;
  }

  getCurrentModelIndex(): number {
    return this.currentModelIndex;
  }

  removeModel(index: number): void {
    if (index < 0 || index >= this.models.length) return;

    const modelToRemove = this.models[index];
    this.sceneService.scene.remove(modelToRemove);
    this.models.splice(index, 1);
  }
}
