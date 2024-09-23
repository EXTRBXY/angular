import { Injectable } from '@angular/core';
import { SceneService } from './scene.service';
import { ModelService } from './model.service';
import { EnvironmentService } from './environment.service';
import { TextureService } from './texture.service';
import { TabsService } from './tabs.service';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class RendererService {
  constructor(
    private sceneService: SceneService,
    private modelService: ModelService,
    private environmentService: EnvironmentService,
    private textureService: TextureService,
    private tabsService: TabsService
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.sceneService.initScene();

    // Инициализация вкладок с необходимым callback
    this.tabsService.initTabs();

    // Экспорт функции переключения модели в глобальную область
    (window as any).switchModel = (index: number) =>
      this.modelService.switchModel(index);

    // Запуск анимации
    this.animate();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.sceneService.controls.update();
    this.sceneService.composer.render();
  }

  // Экспортируемые функции для использования в других модулях
  updateTexture = (textureName: string) =>
    this.textureService.updateTexture(
      textureName,
      this.modelService.getSelectedObject()
    );

  applyTexture = (texture: THREE.Texture, object: THREE.Object3D | null) =>
    this.textureService.applyTexture(texture, object);

  updateEnvironment = (hdriName: string) =>
    this.environmentService.updateEnvironment(hdriName);
}
