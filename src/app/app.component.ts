import { Component, OnInit } from '@angular/core';
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

  constructor(private rendererService: RendererService) {}

  ngOnInit(): void {
    // Применяем тему при загрузке страницы
    this.isLightTheme = document.body.classList.contains('light-theme');
    document.body.classList.toggle('light-theme', this.isLightTheme);
    document.body.classList.toggle('dark-theme', !this.isLightTheme);
  }

  toggleTheme(): void {
    this.isLightTheme = !this.isLightTheme;
    document.body.classList.toggle('light-theme', this.isLightTheme);
    document.body.classList.toggle('dark-theme', !this.isLightTheme);
    
    // Обновляем цвет фона канваса
    this.rendererService.sceneService.onThemeSwitch();
}
}
