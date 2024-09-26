import { Injectable } from '@angular/core';
import { SceneService } from './scene.service';
import { ModelService } from './model.service';
import { EnvironmentService } from './environment.service';
import { TextureService } from './texture.service';
import { TabsService } from './tabs.service';
import * as THREE from 'three';
import { DomService } from './dom.service';

@Injectable({
  providedIn: 'root',
})
export class RendererService {
  constructor(
    public sceneService: SceneService,
    public modelService: ModelService,
    private environmentService: EnvironmentService,
    private textureService: TextureService,
    private tabsService: TabsService,
    private domService: DomService
  ) {
    this.initialize();
  }

  private initialize(): void {
    this.sceneService.initScene();
    this.tabsService.initTabs();
    (window as any).switchModel = this.modelService.switchModel.bind(
      this.modelService
    );
    this.animate();

    this.domService.getTextureSelectObservable().subscribe((textureName) => {
      const selectedObject = this.modelService.getSelectedObject();
      if (selectedObject) {
        this.textureService.updateTexture(textureName, selectedObject);
      } else {
        this.modelService.getModels().forEach((model) => {
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              this.textureService.updateTexture(textureName, child);
            }
          });
        });
      }
    });

    this.domService.getTilingObservable().subscribe((tiling) => {
      const selectedObject = this.modelService.getSelectedObject();
      if (selectedObject) {
        this.textureService.updateTiling(tiling, selectedObject);
      } else {
        this.modelService.getModels().forEach((model) => {
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              this.textureService.updateTiling(tiling, child);
            }
          });
        });
      }
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.sceneService.controls.update();
    this.sceneService.composer.render();
  };
  updateTexture = async (textureName: string): Promise<void> => {
    const selectedObject = this.modelService.getSelectedObject();
    if (selectedObject) {
      await this.textureService.updateTexture(textureName, selectedObject);
    } else {
      console.warn('Не выбран объект для применения текстуры');
    }
  };

  applyTexture = (texture: THREE.Texture, object: THREE.Object3D): void => {
    this.textureService.applyTexture(texture, object);
  };
  updateEnvironment = async (hdriName: string): Promise<void> => {
    await this.environmentService.updateEnvironment(hdriName);
  };
}
