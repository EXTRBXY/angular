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
    public sceneService: SceneService,
    public modelService: ModelService,
    private environmentService: EnvironmentService,
    private textureService: TextureService,
    private tabsService: TabsService
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.sceneService.initScene();
    this.tabsService.initTabs();
    (window as any).switchModel = this.modelService.switchModel.bind(this.modelService);
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.sceneService.controls.update();
    this.sceneService.composer.render();
  };
  updateTexture = async (textureName: string): Promise<void> => {
    await this.textureService.updateTexture(textureName, this.modelService.getSelectedObject());
  };

  applyTexture = (texture: THREE.Texture, object: THREE.Object3D): void => {
    this.textureService.applyTexture(texture, object);
  };
  updateEnvironment = async (hdriName: string): Promise<void> => {
    await this.environmentService.updateEnvironment(hdriName);
  };
}
