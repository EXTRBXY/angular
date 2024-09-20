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
  constructor(private rendererService: RendererService) {}

  ngOnInit(): void {
    // Инициализация происходит в конструкторе RendererService
  }
}
