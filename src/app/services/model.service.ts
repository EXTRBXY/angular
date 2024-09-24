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
  private DRAG_OVER_CLASS = 'drag-over';
  private models: THREE.Group[] = [];
  private currentModelIndex = 0;
  private originalMaterials = new Map<
    string,
    THREE.Material | THREE.Material[]
  >();
  private modelFileName = '';
  private bbox = new THREE.Box3();
  private size = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private selectedObject: THREE.Mesh | null = null;
  private infoParams: InfoParams = {
    Name: '',
    Width: '',
    Height: '',
    Depth: '',
  };
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
    // Инициализация обработчиков событий
    const uploadModelBtn = document.getElementById(
      'upload-model-btn'
    ) as HTMLButtonElement;
    const modelUploadInput = document.getElementById(
      'model-upload'
    ) as HTMLInputElement;

    uploadModelBtn?.addEventListener('click', () => {
      modelUploadInput?.click();
    });

    modelUploadInput?.addEventListener('change', (event) =>
      this.onModelUpload(event)
    );

    document.addEventListener(
      'dragover',
      (event) => event.preventDefault(),
      false
    );
    document.addEventListener('drop', (event) => this.onDrop(event), false);
    document.addEventListener(
      'mousedown',
      (event) => this.onMouseDown(event),
      false
    );
    document.addEventListener(
      'mouseup',
      (event) => this.onMouseUp(event),
      false
    );
    document.addEventListener(
      'dragenter',
      (event) => this.onDragEnter(event),
      false
    );
    document.addEventListener(
      'dragleave',
      (event) => this.onDragLeave(event),
      false
    );

    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    meshList?.addEventListener('wheel', (event) => {
      const container = event.currentTarget as HTMLElement;
      container.scrollTop += event.deltaY;
    });
  }

  private async checkFileMimeType(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = function (e) {
        if (!e.target || !e.target.result) {
          resolve(false);
          return;
        }
        const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(
          0,
          20
        );
        let header = '';
        for (let i = 0; i < arr.length; i++) {
          header += arr[i].toString(16).padStart(2, '0');
        }
        console.log('Заголовок файла:', header);

        const validHeaders = [
          '4662780a',
          '46424380',
          '00000020',
          '4b617964',
          '2e464258',
          '4d5a',
          '4d534d',
        ];

        resolve(
          validHeaders.some((h) => header.startsWith(h)) ||
            header.toLowerCase().includes('fbx')
        );
      };
      reader.readAsArrayBuffer(file.slice(0, 20));
    });
  }

  private onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    if (this.dragCounter === 1) {
      document.body.classList.add(this.DRAG_OVER_CLASS);
    }
  }

  private onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter === 0) {
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
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files) {
      this.fileQueue = Array.from(files);
      this.processFileQueue();
    }
  }

  private async processFileQueue(): Promise<void> {
    if (this.fileQueue.length === 0) return;

    const file = this.fileQueue.shift();
    if (file) {
      try {
        console.log('Проверка файла:', file.name);
        const isValidFbx = await this.checkFileMimeType(file);
        console.log('Результат проверки:', isValidFbx);
        if (isValidFbx) {
          await this.loadModel(file);
        } else {
          alert(
            `Неверный формат файла: ${file.name}. Пожалуйста, загрузите файл FBX.`
          );
        }
      } catch (error) {
        console.error('Ошибка при проверке файла:', error);
        alert(
          'Произошла ошибка при проверке файла. Пожалуйста, попробуйте еще раз.'
        );
      }
      this.processFileQueue();
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

          const bbox = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          bbox.getSize(size);

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material, index) => {
                  const clonedMaterial = material.clone();
                  child.material[index] = clonedMaterial;
                  this.originalMaterials.set(
                    child.uuid + '_' + index,
                    clonedMaterial
                  );
                });
              } else if (child.material) {
                const clonedMaterial = child.material.clone();
                child.material = clonedMaterial;
                this.originalMaterials.set(child.uuid, clonedMaterial);
              }
              if (child.material instanceof THREE.MeshStandardMaterial) {
                child.material.emissive = new THREE.Color(0x000000);
              }
            }
          });

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => {
                  if (
                    material instanceof THREE.MeshStandardMaterial &&
                    material.map
                  ) {
                    material.map.repeat.set(1, 1);
                    material.needsUpdate = true;
                  }
                });
              } else if (
                child.material instanceof THREE.MeshStandardMaterial &&
                child.material.map
              ) {
                child.material.map.repeat.set(1, 1);
                child.material.needsUpdate = true;
              }
            }
          });

          const center = new THREE.Vector3();
          bbox.getCenter(center);

          const maxDimension = Math.max(size.x, size.y, size.z);
          const cameraDistance = maxDimension * 1.5;
          this.sceneService.camera.position.set(
            center.x + cameraDistance,
            center.y + cameraDistance,
            center.z + cameraDistance
          );
          this.sceneService.camera.lookAt(center);

          if (this.models[this.currentModelIndex]) {
            this.sceneService.scene.remove(this.models[this.currentModelIndex]);
          }

          this.models.push(model);
          this.currentModelIndex = this.models.length - 1;
          this.sceneService.scene.add(model);

          this.tabsService.createTab(this.modelFileName, (index: number) =>
            this.switchModel(index)
          );

          this.updateInfo();
          this.sceneService.controls.update();

          const box = new THREE.Box3().setFromObject(model);
          const newSize = box.getSize(new THREE.Vector3()).length();
          const centerModel = box.getCenter(new THREE.Vector3());

          this.sceneService.camera.near = newSize / 100;
          this.sceneService.camera.far = newSize * 10;
          this.sceneService.camera.updateProjectionMatrix();

          this.sceneService.controls.maxDistance = newSize * 10;
          this.sceneService.controls.target.copy(centerModel);
          this.sceneService.controls.update();
          this.sceneService.hideLoadingBar();

          const textureSelect = document.getElementById(
            'texture-select'
          ) as HTMLSelectElement;
          textureSelect.value = 'default';
          this.textureService.updateTexture(
            'default',
            this.getSelectedObject()
          );

          const tilingSlider = document.getElementById(
            'tiling-slider'
          ) as HTMLInputElement;
          const tilingValue = document.getElementById(
            'tiling-value'
          ) as HTMLSpanElement;
          tilingSlider.value = '1';
          tilingValue.textContent = '1';

          this.sceneService.updateModelMaterial(model);

          // Обновление списка мэшей
          this.updateMeshList(model);

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
    console.log('isMouseDown:', this.isMouseDown);
  }

  private handleClick(event: MouseEvent): void {
    if (!this.models[this.currentModelIndex]) return;

    const guiContainer = document.getElementById('gui-container');
    if (guiContainer?.contains(event.target as Node)) {
      return;
    }

    const rect = this.sceneService.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.sceneService.camera);
    const intersects = this.raycaster.intersectObject(
      this.models[this.currentModelIndex],
      true
    );

    if (intersects.length > 0) {
      const selected = intersects[0].object as THREE.Mesh;
      if (
        this.selectedObject &&
        this.selectedObject.material instanceof THREE.MeshStandardMaterial
      ) {
        this.selectedObject.material.emissive.set(0x000000);
      }
      this.selectedObject = selected;
      if (selected.material instanceof THREE.MeshStandardMaterial) {
        selected.material.emissive.set(0x000000);
      }

      this.sceneService.outlinePass.selectedObjects = [selected];

      this.updateInfo(selected);
      this.highlightSelectedMesh(selected);

      const textureValue = this.textureService.componentTextures.get(
        selected.uuid
      );
      const textureSelect = document.getElementById(
        'texture-select'
      ) as HTMLSelectElement;
      if (textureValue) {
        textureSelect.value = textureValue;
      } else {
        textureSelect.value = 'default';
      }

      const tiling = this.textureService.getObjectTiling(selected);
      const tilingSlider = document.getElementById(
        'tiling-slider'
      ) as HTMLInputElement;
      const tilingValue = document.getElementById(
        'tiling-value'
      ) as HTMLSpanElement;
      tilingSlider.value = tiling.toString();
      tilingValue.textContent = tiling.toString();
    } else {
      this.sceneService.outlinePass.selectedObjects = [];
      this.selectedObject = null;
      this.updateInfo();

      const textureSelect = document.getElementById(
        'texture-select'
      ) as HTMLSelectElement;
      textureSelect.selectedIndex = -1;
      textureSelect.value = '';

      const tilingSlider = document.getElementById(
        'tiling-slider'
      ) as HTMLInputElement;
      const tilingValue = document.getElementById(
        'tiling-value'
      ) as HTMLSpanElement;
      tilingSlider.value = '1';
      tilingValue.textContent = '1';

      // Сброс выделения в списке мэшей
      const meshList = document.getElementById('mesh-list') as HTMLUListElement;
      if (meshList) {
        Array.from(meshList.children).forEach((li) => {
          if (li instanceof HTMLLIElement) {
            li.classList.remove('selected');
          }
        });
      }
    }
  }

  private updateInfo(selected?: THREE.Object3D): void {
    if (this.models[this.currentModelIndex]) {
      if (selected) {
        this.infoParams.Name = selected.name;
        this.bbox.setFromObject(selected);
        this.size.copy(this.bbox.getSize(this.size));
        this.infoParams.Width = this.size.x.toFixed(2);
        this.infoParams.Height = this.size.y.toFixed(2);
        this.infoParams.Depth = this.size.z.toFixed(2);
      } else {
        this.infoParams.Name = 'Модель: ' + this.modelFileName;
        this.bbox.setFromObject(this.models[this.currentModelIndex]);
        this.size.copy(this.bbox.getSize(this.size));
        this.infoParams.Width = this.size.x.toFixed(2);
        this.infoParams.Height = this.size.y.toFixed(2);
        this.infoParams.Depth = this.size.z.toFixed(2);
      }
      this.updateMeshList(this.models[this.currentModelIndex]); // Обновление списка мэшей
    } else {
      this.infoParams = { Name: '', Width: '', Height: '', Depth: '' };
    }

    const infoName = document.getElementById('info-name') as HTMLInputElement;
    const infoDimensions = document.getElementById(
      'info-dimensions'
    ) as HTMLInputElement;

    infoName.value = this.infoParams.Name;
    infoDimensions.value = `${this.infoParams.Width} x ${this.infoParams.Height} x ${this.infoParams.Depth} см`;

    // Обновление списка мэшей
    if (selected && selected instanceof THREE.Mesh) {
      const model = this.models[this.currentModelIndex];
      this.updateMeshList(model);
    } else {
      // Сброс выделения в списке мэшей
      const meshList = document.getElementById('mesh-list') as HTMLUListElement;
      if (meshList) {
        Array.from(meshList.children).forEach((li) => {
          if (li instanceof HTMLLIElement) {
            li.classList.remove('selected');
          }
        });
      }
    }
  }

  public switchModel(index: number): void {
    if (index >= 0 && index < this.models.length) {
      if (this.models[this.currentModelIndex]) {
        this.sceneService.scene.remove(this.models[this.currentModelIndex]);
      }

      this.currentModelIndex = index;
      this.modelFileName = this.tabsService.tabs[index].name;

      this.sceneService.scene.add(this.models[this.currentModelIndex]);

      // Сброс выделенного объекта
      if (this.selectedObject) {
        this.sceneService.outlinePass.selectedObjects = [];
        this.selectedObject = null;
      }

      this.updateInfo();
      this.sceneService.controls.update();

      const bbox = new THREE.Box3().setFromObject(
        this.models[this.currentModelIndex]
      );
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      const maxDimension = Math.max(size.x, size.y, size.z);
      const cameraDistance = maxDimension * 1.5;
      this.sceneService.camera.position.set(
        center.x + cameraDistance,
        center.y + cameraDistance,
        center.z + cameraDistance
      );
      this.sceneService.camera.lookAt(center);

      this.sceneService.controls.target.copy(center);
      this.sceneService.controls.update();

      // Обновление списка мэшей для новой модели
      this.updateMeshList(this.models[this.currentModelIndex]);

      // Применение текстуры к новой модели
      this.textureService.updateTexture('default', this.getSelectedObject());
    }
  }

  // Функция для обновления списка мэшей
  private updateMeshList(model: THREE.Group): void {
    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    if (!meshList) return;

    meshList.innerHTML = '';

    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const meshBbox = new THREE.Box3().setFromObject(child);
        const meshSize = meshBbox.getSize(new THREE.Vector3());
        const meshDimensions = `${meshSize.x.toFixed(2)} x ${meshSize.y.toFixed(
          2
        )} x ${meshSize.z.toFixed(2)} см`;

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

        // Добавляем обработчик клика для выделения мэша
        listItem.onclick = (event) => {
          if (event.target !== visibilityToggle) {
            this.highlightSelectedMesh(child);
          }
        };

        meshList.appendChild(listItem);
      }
    });
  }

  // Функция для выделения выбранного мэша
  private highlightSelectedMesh(mesh: THREE.Mesh): void {
    this.selectedObject = mesh;
    this.updateInfo(mesh);

    // Обновление списка мэшей
    const meshList = document.getElementById('mesh-list') as HTMLUListElement;
    if (!meshList) return;

    Array.from(meshList.children).forEach((li) => {
      if (li instanceof HTMLLIElement) {
        li.classList.remove('selected');
        if (li.dataset['uuid'] === mesh.uuid) {
          li.classList.add('selected');
        }
      }
    });

    // Выделение мэша в сцене
    this.sceneService.outlinePass.selectedObjects = [mesh];

    // Применение текущей текстуры к выделенному мэшу
    const currentTextureName =
      this.textureService.componentTextures.get(mesh.uuid) || 'default';
    this.textureService.updateTexture(currentTextureName, mesh);
  }

  // Экспортируемые функции и переменные

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
