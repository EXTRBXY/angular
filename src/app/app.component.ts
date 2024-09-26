import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { DomService } from './services/dom.service';
import { RendererService } from './services/renderer.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  isLightTheme: boolean = true;

  @ViewChild('uploadModelBtn', { static: true })
  uploadModelBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('modelUploadInput', { static: true })
  modelUploadInput!: ElementRef<HTMLInputElement>;

  @ViewChild('textureSelect') textureSelect!: ElementRef<HTMLSelectElement>;
  @ViewChild('tilingSlider') tilingSlider!: ElementRef<HTMLInputElement>;

  constructor(
    private domService: DomService,
    private rendererService: RendererService
  ) {}

  ngOnInit(): void {
    // Применяем тему при загрузке страницы
    this.isLightTheme = document.body.classList.contains('light-theme');
    document.body.classList.toggle('light-theme', this.isLightTheme);
    document.body.classList.toggle('dark-theme', !this.isLightTheme);

    // Добавляем обработчики событий
    this.uploadModelBtn.nativeElement.addEventListener('click', () => {
      this.modelUploadInput.nativeElement.click();
    });

    this.modelUploadInput.nativeElement.addEventListener('change', (event) => {
      this.rendererService.modelService.onModelUpload(event);
    });
  }

  ngAfterViewInit() {
    this.textureSelect.nativeElement.addEventListener('change', (event) => {
      const selectedTexture = (event.target as HTMLSelectElement).value;
      this.domService.updateTextureSelect(selectedTexture);
    });

    this.tilingSlider.nativeElement.addEventListener('input', (event) => {
      const tiling = parseFloat((event.target as HTMLInputElement).value);
      this.domService.updateTiling(tiling);
    });
  }

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    document.body.classList.toggle('light-theme', this.isLightTheme);
    document.body.classList.toggle('dark-theme', !this.isLightTheme);

    // Обновляем цвет фона канваса
    this.rendererService.sceneService.onThemeSwitch();
  }
}
