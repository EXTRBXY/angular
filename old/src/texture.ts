import * as THREE from 'three'
import { showLoadingBar, hideLoadingBar } from './scene'
import { models, selectedObject, currentModelIndex } from './model'

// Типы
type UploadedTextures = { [key: string]: THREE.Texture }

// Инициализация загрузчика текстур и переменных
const textureLoader = new THREE.TextureLoader()
let originalMaterials = new Map<string, THREE.Material | THREE.Material[]>()
let uploadedTextures: UploadedTextures = {}
export let componentTextures = new Map<string, string>()
const textureCache = new Map<string, THREE.Texture>()
const componentTiling = new Map<string, number>()

// Обработчики событий
document.getElementById('texture-select')?.addEventListener('change', (event) => {
	const target = event.target as HTMLSelectElement
	updateTexture(target.value)
})

document.getElementById('upload-texture-btn')?.addEventListener('click', () => {
	document.getElementById('texture-upload')?.click()
})

document.getElementById('texture-upload')?.addEventListener('change', onTextureUpload)

// Функция для загрузки текстуры из файла
function onTextureUpload(event: Event): void {
	const input = event.target as HTMLInputElement
	const file = input.files?.[0]
	if (file && file.type.startsWith('image/')) {
		const reader = new FileReader()
		reader.onload = (e) => {
			const result = e.target?.result
			if (typeof result === 'string') {
				const texture = textureLoader.load(result)
				const timestamp = Date.now()
				const optionValue = `uploaded-texture-${timestamp}`

				texture.userData.textureName = optionValue
				applyTexture(texture, selectedObject)

				uploadedTextures[optionValue] = texture

				const option = document.createElement('option')
				option.value = optionValue
				option.text = file.name
				option.setAttribute('data-is-uploaded', 'true')

				const textureSelect = document.getElementById('texture-select') as HTMLSelectElement
				textureSelect.appendChild(option)
				textureSelect.value = optionValue
			}
		}
		reader.readAsDataURL(file)
	}
}

// Функция обновления текстуры
export async function updateTexture(textureName: string): Promise<void> {
	if (textureName === 'default') {
		applyDefaultTexture()
	} else if (textureName.startsWith('uploaded-texture-')) {
		const texture = uploadedTextures[textureName]
		if (texture) {
			applyTexture(texture, selectedObject)
		}
	} else {
		await loadAndApplyTexture(textureName)
	}
}

// Функция загрузки и применения текстуры
async function loadAndApplyTexture(textureName: string): Promise<void> {
	showLoadingBar()
	const texturePath = `./textures/${textureName}.png`

	if (textureCache.has(textureName)) {
		const texture = textureCache.get(textureName)
		if (texture) {
			applyTexture(texture, selectedObject)
			hideLoadingBar()
		}
	} else {
		try {
			const texture = await loadTextureWithProgress(texturePath)
			textureCache.set(textureName, texture)
			applyTexture(texture, selectedObject)
		} catch (error) {
			console.error('Ошибка загрузки текстуры:', error)
		} finally {
			hideLoadingBar()
		}
	}
}

function loadTextureWithProgress(url: string): Promise<THREE.Texture> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest()
		xhr.open('GET', url, true)
		xhr.responseType = 'blob'

		xhr.onprogress = (event) => {
			if (event.lengthComputable) {
				const progress = (event.loaded / event.total) * 100
				showLoadingBar(progress)
			}
		}

		xhr.onload = () => {
			if (xhr.status === 200) {
				const blob = xhr.response
				const textureLoader = new THREE.TextureLoader()
				const objectURL = URL.createObjectURL(blob)

				textureLoader.load(
					objectURL,
					(texture) => {
						URL.revokeObjectURL(objectURL)
						resolve(texture)
					},
					undefined,
					(error) => {
						URL.revokeObjectURL(objectURL)
						reject(error)
					}
				)
			} else {
				reject(new Error(`Ошибка загрузки текстуры: ${xhr.status}`))
			}
		}

		xhr.onerror = () => {
			reject(new Error('Ошибка сети при загрузке текстуры'))
		}

		xhr.send()
	})
}

// Функция применения текстуры
export function applyTexture(texture: THREE.Texture, object: THREE.Object3D | null): void {
	const targetObject = object || models[currentModelIndex]
	if (!targetObject) return

	targetObject.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			if (!originalMaterials.has(child.uuid)) {
				originalMaterials.set(child.uuid, child.material)
			}

			if (Array.isArray(child.material)) {
				child.material.forEach((material) => {
					if (material instanceof THREE.MeshStandardMaterial) {
						material.map = texture.clone()
						material.map.needsUpdate = true
						material.needsUpdate = true
					}
				})
			} else if (child.material instanceof THREE.MeshStandardMaterial) {
				child.material.map = texture.clone()
				child.material.map.needsUpdate = true
				child.material.needsUpdate = true
			}

			componentTextures.set(child.uuid, texture.userData.textureName || '')

			const tiling = getObjectTiling(child)
			updateTiling(tiling, child)
		}
	})
}

// Функция применения дефолтной текстуры
function applyDefaultTexture(): void {
	if (!models[currentModelIndex]) return

	models[currentModelIndex].traverse((child) => {
		if (child instanceof THREE.Mesh) {
			if (originalMaterials.has(child.uuid)) {
				const originalMaterial = originalMaterials.get(child.uuid)
				if (originalMaterial) {
					child.material =
						originalMaterial instanceof THREE.Material ? originalMaterial.clone() : originalMaterial.map((m) => m.clone())
				}
			} else {
				child.material = new THREE.MeshStandardMaterial()
			}
			componentTextures.delete(child.uuid)
		}
		if (child instanceof THREE.Mesh && child.material) {
			child.material.needsUpdate = true
		}
	})
}

// Функция получения тайлинга объекта
export function getObjectTiling(object: THREE.Object3D): number {
	return componentTiling.get(object.uuid) || 1
}

// Функция обновления тайлинга
export function updateTiling(tiling: number, object: THREE.Object3D | null): void {
	const targetObject = object || models[currentModelIndex]
	if (!targetObject) return

	targetObject.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			componentTiling.set(child.uuid, tiling)
			if (Array.isArray(child.material)) {
				child.material.forEach((material) => {
					if (material instanceof THREE.MeshStandardMaterial && material.map) {
						material.map.repeat.set(tiling, tiling)
						material.map.wrapS = THREE.RepeatWrapping
						material.map.wrapT = THREE.RepeatWrapping
						material.needsUpdate = true
					}
				})
			} else if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
				child.material.map.repeat.set(tiling, tiling)
				child.material.map.wrapS = THREE.RepeatWrapping
				child.material.map.wrapT = THREE.RepeatWrapping
				child.material.needsUpdate = true
			}
		}
	})

	const tilingValue = document.getElementById('tiling-value')
	if (tilingValue) {
		tilingValue.textContent = tiling.toString()
	}
}

// Функция для сброса тайлинга для всех компонентов
export function resetTilingForAllComponents(): void {
	if (models.length > 0 && models[currentModelIndex]) {
		models[currentModelIndex].traverse((child) => {
			if (child instanceof THREE.Mesh) {
				componentTiling.set(child.uuid, 1)
				if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
					child.material.map.repeat.set(1, 1)
					child.material.needsUpdate = true
				}
			}
		})
		const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement
		const tilingValue = document.getElementById('tiling-value')
		if (tilingSlider && tilingValue) {
			tilingSlider.value = '1'
			tilingValue.textContent = '1'
		}
	}
}

// Обработчик изменения значения слайдера тайлинга
document.getElementById('tiling-slider')?.addEventListener('input', (event) => {
	const target = event.target as HTMLInputElement
	const tiling = parseFloat(target.value)
	updateTiling(tiling, selectedObject)
})

const tilingValue = document.getElementById('tiling-value')
if (tilingValue) {
	tilingValue.textContent = '1'
}
