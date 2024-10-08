// src/app/services/tabs.service.ts
import { Injectable } from '@angular/core';
import { AppStateService } from './app-state.service';

interface Tab {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class TabsService {
  public tabs: Tab[] = [];
  public activeTabIndex = 0;

  constructor(private appStateService: AppStateService) {
    const tabsContainer = document.getElementById(
      'tabs-container'
    ) as HTMLElement;

    tabsContainer?.addEventListener('wheel', (event) => {
      const container = event.currentTarget as HTMLElement;
      container.scrollLeft += event.deltaY;
    });
  }

  createTab(name: string): void {
    const id = `tab-${Date.now()}`;
    this.tabs.push({ id, name });
    this.renderTabs();
    this.switchToTab(this.tabs.length - 1);
  }

  private renderTabs(): void {
    const tabsContainer = document.getElementById(
      'tabs-container'
    ) as HTMLElement;
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';
    this.tabs.forEach((tab, index) => {
      const tabElement = document.createElement('div');
      tabElement.className = `tab ${
        index === this.activeTabIndex ? 'active' : ''
      }`;
      tabElement.textContent = tab.name;
      tabElement.onclick = () => this.switchToTab(index);
      tabElement.oncontextmenu = (event) =>
        this.handleContextMenu(event, index);
      tabsContainer.appendChild(tabElement);
    });
  }

  switchToTab(index: number): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.activeTabIndex = index;
    this.renderTabs();

    // Уведомляем AppStateService о смене модели
    this.appStateService.setCurrentModelIndex(index);
  }

  removeTab(index: number): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.appStateService.setCurrentModelIndex(null); // Можно установить как null или другой подходящий индекс
    this.tabs.splice(index, 1);
    if (this.activeTabIndex >= this.tabs.length) {
      this.activeTabIndex = Math.max(0, this.tabs.length - 1);
    }
    this.renderTabs();
    if (this.tabs.length > 0) {
      this.switchToTab(this.activeTabIndex);
    }
  }

  initTabs(): void {
    this.renderTabs();
  }

  private handleContextMenu(event: MouseEvent, index: number): void {
    event.preventDefault();
    this.removeTab(index);
  }
}
