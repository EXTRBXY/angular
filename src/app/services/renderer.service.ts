// src/app/services/renderer.service.ts

import { Injectable } from '@angular/core';
import { SceneService } from './scene.service';
import { ModelService } from './model.service';
import { EnvironmentService } from './environment.service';
import { TextureService } from './texture.service';
import { TabsService } from './tabs.service';
import { AppStateService } from './app-state.service';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class RendererService {
  private isLightTheme: boolean = true;

  constructor(
    private sceneService: SceneService,
    private modelService: ModelService,
    private environmentService: EnvironmentService,
    private textureService: TextureService,
    private tabsService: TabsService,
    private appStateService: AppStateService
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.tabsService.initTabs();
    this.sceneService.initScene();

    // Подписка на изменения выбранного объекта
    this.appStateService.selectedObject$.subscribe((mesh) => {
      this.textureService.applyTextureToSelected(mesh);
    });

    // Запуск анимации
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.sceneService.render();
  }

  // Метод для переключения темы
  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    this.sceneService.toggleTheme(this.isLightTheme);
  }

  // Экспортируемые функции для использования в других модулях
  updateTexture(textureName: string): void {
    this.textureService.updateTexture(textureName);
  }

  applyTexture(texture: THREE.Texture, object: THREE.Object3D | null): void {
    this.textureService.applyTexture(texture, object);
  }

  updateEnvironment(hdriName: string): void {
    this.environmentService.updateEnvironment(hdriName);
  }
}
