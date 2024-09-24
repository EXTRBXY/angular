import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RendererService } from './services/renderer.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  isLightTheme: boolean = true;

  @ViewChild('uploadModelBtn', { static: true })
  uploadModelBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('modelUploadInput', { static: true })
  modelUploadInput!: ElementRef<HTMLInputElement>;

  constructor(private rendererService: RendererService) {}

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

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    document.body.classList.toggle('light-theme', this.isLightTheme);
    document.body.classList.toggle('dark-theme', !this.isLightTheme);

    // Обновляем цвет фона канваса
    this.rendererService.sceneService.onThemeSwitch();
  }
}
