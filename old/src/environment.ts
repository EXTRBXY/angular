import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { scene, showLoadingBar, hideLoadingBar } from './scene'

// Кэш для HDRI
const hdriCache = new Map<string, THREE.Texture>()

// Обработчик изменения выбора HDRI
document.getElementById('hdri-select')?.addEventListener('change', (event) => {
	const target = event.target as HTMLSelectElement
	updateEnvironment(target.value)
})

// Асинхронная функция обновления окружения
export async function updateEnvironment(hdriName: string): Promise<void> {
	showLoadingBar()

	if (hdriName === 'none') {
		scene.environment = null
		hideLoadingBar()
		return
	}

	try {
		let texture: THREE.Texture

		if (hdriCache.has(hdriName)) {
			console.log('HDRI загружена из кэша:', hdriName)
			texture = hdriCache.get(hdriName)!
		} else {
			const relativePath = `/textures/equirectangular/${hdriName}`
			texture = await loadHDRI(relativePath)
			hdriCache.set(hdriName, texture)
		}

		scene.environment = texture
	} catch (error) {
		console.error('Ошибка загрузки HDRI:', error)
		alert('Ошибка загрузки HDRI. Проверьте формат файла и путь к нему.')
	} finally {
		hideLoadingBar()
	}
}

// Функция загрузки HDRI
function loadHDRI(path: string): Promise<THREE.Texture> {
	return new Promise((resolve, reject) => {
		new RGBELoader().load(
			path,
			(texture) => {
				texture.mapping = THREE.EquirectangularReflectionMapping
				resolve(texture)
			},
			(xhr) => {
				if (xhr.lengthComputable) {
					const percentComplete = (xhr.loaded / xhr.total) * 100
					showLoadingBar(percentComplete)
				}
			},
			(error) => {
				reject(error)
			}
		)
	})
}
