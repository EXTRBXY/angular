import { switchModel, removeModel, updateInfo } from './model'

interface Tab {
	id: string;
	name: string;
}

export let tabs: Tab[] = []
export let activeTabIndex = 0

export function createTab(name: string): void {
	const id = `tab-${Date.now()}`
	tabs.push({ id, name })
	renderTabs()
	switchToTab(tabs.length - 1)
}

function renderTabs(): void {
	const tabsContainer = document.getElementById('tabs-container')
	if (!tabsContainer) return

	tabsContainer.innerHTML = ''
	tabs.forEach((tab, index) => {
		const tabElement = document.createElement('div')
		tabElement.className = `tab ${index === activeTabIndex ? 'active' : ''}`
		tabElement.textContent = tab.name
		tabElement.onclick = () => switchToTab(index)
		tabElement.oncontextmenu = (event) => handleContextMenu(event, index)
		tabsContainer.appendChild(tabElement)
	})
}

function switchToTab(index: number): void {
	if (index < 0 || index >= tabs.length) return

	activeTabIndex = index
	renderTabs()
	switchModel(index)
	updateInfo()
}

export function getActiveTabIndex(): number {
	return activeTabIndex
}

export function removeTab(index: number): void {
	if (index < 0 || index >= tabs.length) return

	removeModel(index)

	tabs.splice(index, 1)
	if (activeTabIndex >= tabs.length) {
		activeTabIndex = Math.max(0, tabs.length - 1)
	}
	renderTabs()
	if (tabs.length > 0) {
		switchModel(activeTabIndex)
	}
}

// Инициализация обработчика событий для кнопки удаления вкладки
document.getElementById('remove-tab-btn')?.addEventListener('click', () => {
	removeTab(activeTabIndex)
})

export function initTabs(): void {
	renderTabs()
}

function handleContextMenu(event: MouseEvent, index: number): void {
	event.preventDefault()
	removeTab(index)
}

document.getElementById('tabs-container')?.addEventListener('wheel', (event) => {
	const container = event.currentTarget as HTMLElement;
	container.scrollLeft += event.deltaY;
});
