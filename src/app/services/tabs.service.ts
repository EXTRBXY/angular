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
    const tabsContainer = document.getElementById(
      'tabs-container'
    ) as HTMLElement;

    tabsContainer?.addEventListener('wheel', (event) => {
      const container = event.currentTarget as HTMLElement;
      container.scrollLeft += event.deltaY;
    });
  }

  /**
   * Метод для создания новой вкладки
   * @param name Имя вкладки
   * @param onTabClick Callback-функция при клике на вкладку
   */
  public createTab(name: string, onTabClick: (index: number) => void): void {
    const id = `tab-${Date.now()}`;
    this.tabs.push({ id, name });
    this.renderTabs(onTabClick);
    this.switchToTab(this.tabs.length - 1, onTabClick);
  }

  /**
   * Рендеринг вкладок в DOM
   * @param onTabClick Callback-функция при клике на вкладку
   */
  private renderTabs(onTabClick: (index: number) => void): void {
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
      tabElement.onclick = () => this.switchToTab(index, onTabClick);
      tabElement.oncontextmenu = (event) =>
        this.handleContextMenu(event, index, onTabClick);
      tabsContainer.appendChild(tabElement);
    });
  }

  /**
   * Переключение на указанную вкладку
   * @param index Индекс вкладки
   * @param onTabClick Callback-функция при клике на вкладку
   */
  public switchToTab(index: number, onTabClick: (index: number) => void): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.activeTabIndex = index;
    this.renderTabs(onTabClick);
    onTabClick(index);
  }

  public getActiveTabIndex(): number {
    return this.activeTabIndex;
  }

  /**
   * Удаление вкладки
   * @param index Индекс вкладки для удаления
   * @param onTabClick Callback-функция при клике на вкладку
   */
  public removeTab(index: number, onTabClick: (index: number) => void): void {
    if (index < 0 || index >= this.tabs.length) return;

    this.tabs.splice(index, 1);
    if (this.activeTabIndex >= this.tabs.length) {
      this.activeTabIndex = Math.max(0, this.tabs.length - 1);
    }
    this.renderTabs(onTabClick);
    if (this.tabs.length > 0) {
      this.switchToTab(this.activeTabIndex, onTabClick);
    }
  }

  /**
   * Инициализация вкладок без зависимости от других сервисов
   */
  public initTabs(): void {
    // Инициализация начальных вкладок, если необходимо
    // Например, можно добавить стандартные вкладки или пустую коллекцию
  }

  /**
   * Обработка контекстного меню для удаления вкладок
   * @param event Событие контекстного меню
   * @param index Индекс вкладки
   * @param onTabClick Callback-функция при клике на вкладку
   */
  private handleContextMenu(
    event: MouseEvent,
    index: number,
    onTabClick: (index: number) => void
  ): void {
    event.preventDefault();
    this.removeTab(index, onTabClick);
  }
}
