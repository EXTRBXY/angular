import { Component, OnInit } from '@angular/core';
import { RendererService } from './services/renderer.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  constructor(private rendererService: RendererService) {}

  ngOnInit(): void {
    // Инициализация происходит в конструкторе RendererService
  }
}
