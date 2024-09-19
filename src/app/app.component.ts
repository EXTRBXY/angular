import { Component, OnInit } from '@angular/core';
import { RendererService } from '../old/renderer.service';

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
