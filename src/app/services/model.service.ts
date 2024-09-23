import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { SceneService } from './scene.service';
import { TextureService } from './texture.service';
import { AppStateService } from './app-state.service';
import { BehaviorSubject } from 'rxjs';

interface InfoParams {
  Name: string;
  Width: string;
  Height: string;
  Depth: string;
}

@Injectable({
  providedIn: 'root',
})
export class ModelService implements OnDestroy {
  private models: THREE.Group[] = [];
  private currentModelIndex: number = 0;
  private originalMaterials = new Map<
    string,
    THREE.Material | THREE.Material[]
  >();
  private modelFileName: string = '';
  private bbox = new THREE.Box3();
  private size = new THREE.Vector3();
  private infoParams: InfoParams = {
    Name: '',
    Width: '',
    Height: '',
    Depth: '',
  };
  private infoParamsSubject = new BehaviorSubject<InfoParams>({
    ...this.infoParams,
  });
  public infoParams$ = this.infoParamsSubject.asObservable();
  private dragCounter: number = 0;
  private readonly DRAG_OVER_CLASS = 'drag-over';

  constructor(
    private sceneService: SceneService,
    private textureService: TextureService,
    private appStateService: AppStateService
  ) {}

  // Метод для загрузки модели
  async loadModel(file: File): Promise<void> {
    const isValid = await this.checkFileMimeType(file);
    if (!isValid) {
      alert('Недопустимый формат файла. Пожалуйста, загрузите FBX файл.');
      return;
    }

    this.showLoadingBar(0);

    const loader = new FBXLoader();
    loader.load(
      URL.createObjectURL(file),
      (fbx) => {
        fbx.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.models.push(fbx);
        this.sceneService.scene.add(fbx);
        this.switchModel(this.models.length - 1);
        this.hideLoadingBar();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          this.showLoadingBar(percentComplete);
        }
      },
      (error) => {
        console.error('Ошибка загрузки модели:', error);
        alert('Ошибка загрузки модели. Пожалуйста, попробуйте ещё раз.');
        this.hideLoadingBar();
      }
    );
  }

  // Метод для проверки MIME-типа файла
  private checkFileMimeType(file: File): Promise<boolean> {
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

  // Метод для переключения модели
  switchModel(index: number): void {
    if (index >= 0 && index < this.models.length) {
      if (this.models[this.currentModelIndex]) {
        this.sceneService.scene.remove(this.models[this.currentModelIndex]);
      }

      this.currentModelIndex = index;

      this.sceneService.scene.add(this.models[this.currentModelIndex]);
      this.appStateService.setSelectedObject(null);
      this.updateInfo();

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

      this.updateMeshList(this.models[this.currentModelIndex]);
    }
  }

  // Обновление информации о модели
  private updateInfo(selected?: THREE.Object3D | null): void {
    if (this.models[this.currentModelIndex]) {
      if (selected && selected instanceof THREE.Mesh) {
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

    // Обновляем BehaviorSubject
    this.infoParamsSubject.next({ ...this.infoParams });
  }

  // Функция для обновления списка мэшей
  updateMeshList(model: THREE.Group): void {
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
            this.appStateService.setSelectedObject(child);
          }
        };

        meshList.appendChild(listItem);
      }
    });
  }

  removeModel(index: number): void {
    if (index < 0 || index >= this.models.length) return;

    const modelToRemove = this.models[index];
    this.sceneService.scene.remove(modelToRemove);
    this.models.splice(index, 1);
  }

  private onMouseDown(event: MouseEvent): void {
    // Реализация метода
  }

  private onMouseUp(event: MouseEvent): void {
    // Реализация метода
  }
}
