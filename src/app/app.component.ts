// src/app/app.component.ts

import { Component, OnInit } from '@angular/core';
import { RendererService } from './services/renderer.service';
import { ModelService } from './services/model.service';
import { TextureService } from './services/texture.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'fbxangular';

  // Свойства для информации о модели
  infoName: string = '';
  infoDimensions: string = '';
  tilingValue: string = '1';

  constructor(
    private rendererService: RendererService,
    private modelService: ModelService,
    private textureService: TextureService,
    private appStateService: AppStateService
  ) {}

  ngOnInit(): void {
    // Подписка на изменения информации о модели
    this.modelService.infoParams$.subscribe((info) => {
      this.infoName = info.Name;
      this.infoDimensions = `${info.Width} x ${info.Height} x ${info.Depth} см`;
    });

    // Подписка на выбранный объект для применения текстуры
    this.appStateService.selectedObject$.subscribe((mesh) => {
      this.textureService.applyTextureToSelected(mesh);
    });
  }

  // Метод для переключения темы
  toggleTheme(): void {
    this.rendererService.toggleTheme();
  }

  // Метод для инициации загрузки модели
  triggerModelUpload(): void {
    const modelInput = document.getElementById(
      'model-upload'
    ) as HTMLInputElement;
    modelInput.click();
  }

  // Метод обработки загрузки модели
  onModelUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.modelService.loadModel(file);
    }
  }

  // Метод для инициации загрузки текстуры
  triggerTextureUpload(): void {
    const textureInput = document.getElementById(
      'texture-upload'
    ) as HTMLInputElement;
    textureInput.click();
  }

  // Метод обработки загрузки текстуры
  onTextureUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.textureService.uploadTexture(file);
    }
  }

  // Метод обработки изменения тайлинга
  onTilingChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tiling = parseFloat(input.value);
    this.tilingValue = input.value;
    this.textureService.updateTiling(tiling);
  }
} // src/app/app.component.ts

import { Component, OnInit } from '@angular/core';
import { RendererService } from './services/renderer.service';
import { ModelService } from './services/model.service';
import { TextureService } from './services/texture.service';
import { AppStateService } from './services/app-state.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'fbxangular';

  // Свойства для информации о модели
  infoName: string = '';
  infoDimensions: string = '';
  tilingValue: string = '1';

  constructor(
    private rendererService: RendererService,
    private modelService: ModelService,
    private textureService: TextureService,
    private appStateService: AppStateService
  ) {}

  ngOnInit(): void {
    // Подписка на изменения информации о модели
    this.modelService.infoParams$.subscribe((info) => {
      this.infoName = info.Name;
      this.infoDimensions = `${info.Width} x ${info.Height} x ${info.Depth} см`;
    });

    // Подписка на выбранный объект для применения текстуры
    this.appStateService.selectedObject$.subscribe((mesh) => {
      this.textureService.applyTextureToSelected(mesh);
    });
  }

  // Метод для переключения темы
  toggleTheme(): void {
    this.rendererService.toggleTheme();
  }

  // Метод для инициации загрузки модели
  triggerModelUpload(): void {
    const modelInput = document.getElementById(
      'model-upload'
    ) as HTMLInputElement;
    modelInput.click();
  }

  // Метод обработки загрузки модели
  onModelUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.modelService.loadModel(file);
    }
  }

  // Метод для инициации загрузки текстуры
  triggerTextureUpload(): void {
    const textureInput = document.getElementById(
      'texture-upload'
    ) as HTMLInputElement;
    textureInput.click();
  }

  // Метод обработки загрузки текстуры
  onTextureUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.textureService.uploadTexture(file);
    }
  }

  // Метод обработки изменения тайлинга
  onTilingChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tiling = parseFloat(input.value);
    this.tilingValue = input.value;
    this.textureService.updateTiling(tiling);
  }
}
