import { Injectable } from '@angular/core';

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

  constructor() {
    this.initScrollListener();
  }

  private initScrollListener(): void {
    const tabsContainer = document.getElementById('tabs-container');
    tabsContainer?.addEventListener('wheel', this.handleScroll);
  }

  private handleScroll = (event: WheelEvent): void => {
    const container = event.currentTarget as HTMLElement;
    container.scrollLeft += event.deltaY;
  };

  public createTab(name: string, onTabClick: (index: number) => void): void {
    const id = `tab-${Date.now()}`;
    this.tabs.push({ id, name });
    this.renderTabs(onTabClick);
    this.switchToTab(this.tabs.length - 1, onTabClick);
  }

  private renderTabs(onTabClick: (index: number) => void): void {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;

    tabsContainer.innerHTML = '';
    this.tabs.forEach((tab, index) => {
      const tabElement = this.createTabElement(tab, index, onTabClick);
      tabsContainer.appendChild(tabElement);
    });
  }

  private createTabElement(
    tab: Tab,
    index: number,
    onTabClick: (index: number) => void
  ): HTMLDivElement {
    const tabElement = document.createElement('div');
    tabElement.className = `tab ${
      index === this.activeTabIndex ? 'active' : ''
    }`;
    tabElement.textContent = tab.name;
    tabElement.onclick = () => this.switchToTab(index, onTabClick);
    tabElement.oncontextmenu = (event) =>
      this.handleContextMenu(event, index, onTabClick);
    return tabElement;
  }

  public switchToTab(index: number, onTabClick: (index: number) => void): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.activeTabIndex = index;
    this.renderTabs(onTabClick);
    onTabClick(index);
  }

  public getActiveTabIndex(): number {
    return this.activeTabIndex;
  }

  public removeTab(index: number, onTabClick: (index: number) => void): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.tabs.splice(index, 1);
    this.activeTabIndex = Math.min(this.activeTabIndex, this.tabs.length - 1);
    this.renderTabs(onTabClick);
    if (this.tabs.length > 0) {
      this.switchToTab(this.activeTabIndex, onTabClick);
    }
  }

  public initTabs(): void {
    // Инициализация начальных вкладок, если необходимо
  }

  private handleContextMenu(
    event: MouseEvent,
    index: number,
    onTabClick: (index: number) => void
  ): void {
    event.preventDefault();
    this.removeTab(index, onTabClick);
  }
}
