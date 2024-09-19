import { initScene, controls, composer } from './scene'
import { switchModel } from './model'
import { updateEnvironment } from './environment'
import { updateTexture, applyTexture } from './texture'
import { initTabs } from './tabs'

initTabs()

// Инициализация сцены
initScene()

// Экспорт функции переключения модели
;(window as any).switchModel = switchModel

// Анимация
function animate() {
	// console.log('Анимация кадра')
	requestAnimationFrame(animate)
	controls.update()
	composer.render()
}

// Запуск анимации
animate()

// Экспорт функций для использования в других модулях
export { updateTexture, applyTexture, updateEnvironment }
