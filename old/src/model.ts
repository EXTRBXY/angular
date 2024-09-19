import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { scene, camera, controls, outlinePass, renderer, showLoadingBar, hideLoadingBar } from './scene'
import { updateTexture, getObjectTiling, componentTextures } from './texture'
import { createTab, tabs } from './tabs'
import { updateModelMaterial } from './scene'

// Типы
type InfoParams = {
	Name: string
	Width: string
	Height: string
	Depth: string
}

// Константы
const DRAG_OVER_CLASS = 'drag-over'

// Переменные состояния
const models: THREE.Group[] = []
let currentModelIndex = 0
let originalMaterials = new Map<string, THREE.Material | THREE.Material[]>()
let modelFileName = ''
let bbox = new THREE.Box3()
let size = new THREE.Vector3()
let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()
let selectedObject: THREE.Mesh | null = null
let infoParams: InfoParams = { Name: '', Width: '', Height: '', Depth: '' }
let dragCounter = 0
let isMouseDown = false
let mouseDownPosition = new THREE.Vector2()
let mouseUpPosition = new THREE.Vector2()
let fileQueue: File[] = []

// Функции
function checkFileMimeType(file: File): Promise<boolean> {
	return new Promise((resolve) => {
		const reader = new FileReader()
		reader.onloadend = function (e) {
			if (!e.target || !e.target.result) {
				resolve(false)
				return
			}
			const arr = new Uint8Array(e.target.result as ArrayBuffer).subarray(0, 20)
			let header = ''
			for (let i = 0; i < arr.length; i++) {
				header += arr[i].toString(16).padStart(2, '0')
			}
			console.log('Заголовок файла:', header)

			const validHeaders = ['4662780a', '46424380', '00000020', '4b617964', '2e464258', '4d5a', '4d534d']

			resolve(validHeaders.some((h) => header.startsWith(h)) || header.toLowerCase().includes('fbx'))
		}
		reader.readAsArrayBuffer(file.slice(0, 20))
	})
}

function onDragEnter(event: DragEvent): void {
	event.preventDefault()
	dragCounter++
	if (dragCounter === 1) {
		document.body.classList.add(DRAG_OVER_CLASS)
	}
}

function onDragLeave(event: DragEvent): void {
	event.preventDefault()
	dragCounter--
	if (dragCounter === 0) {
		document.body.classList.remove(DRAG_OVER_CLASS)
	}
}

async function onDrop(event: DragEvent): Promise<void> {
	event.preventDefault()
	dragCounter = 0
	document.body.classList.remove(DRAG_OVER_CLASS)

	const files = event.dataTransfer?.files
	if (files) {
		fileQueue = Array.from(files)
		processFileQueue()
	}
}

async function onModelUpload(event: Event): Promise<void> {
	const input = event.target as HTMLInputElement
	const files = input.files
	if (files) {
		fileQueue = Array.from(files)
		processFileQueue()
	}
}

async function processFileQueue(): Promise<void> {
	if (fileQueue.length === 0) return

	const file = fileQueue.shift()
	if (file) {
		try {
			console.log('Проверка файла:', file.name)
			const isValidFbx = await checkFileMimeType(file)
			console.log('Результат проверки:', isValidFbx)
			if (isValidFbx) {
				await loadModel(file)
			} else {
				alert(`Неверный формат файла: ${file.name}. Пожалуйста, загрузите файл FBX.`)
			}
		} catch (error) {
			console.error('Ошибка при проверке файла:', error)
			alert('Произошла ошибка при проверке файла. Пожалуйста, попробуйте еще раз.')
		}
		processFileQueue()
	}
}

function loadModel(file: File): Promise<void> {
	return new Promise((resolve, reject) => {
		showLoadingBar()
		const loader = new FBXLoader()
		loader.load(
			URL.createObjectURL(file),
			(fbx) => {
				const model = fbx as THREE.Group
				modelFileName = file.name

				const bbox = new THREE.Box3().setFromObject(model)
				const size = new THREE.Vector3()
				bbox.getSize(size)

				model.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						if (Array.isArray(child.material)) {
							child.material.forEach((material, index) => {
								const clonedMaterial = material.clone()
								child.material[index] = clonedMaterial
								originalMaterials.set(child.uuid + '_' + index, clonedMaterial)
							})
						} else if (child.material) {
							const clonedMaterial = child.material.clone()
							child.material = clonedMaterial
							originalMaterials.set(child.uuid, clonedMaterial)
						}
						if (child.material instanceof THREE.MeshStandardMaterial) {
							child.material.emissive = new THREE.Color(0x000000)
						}
					}
				})

				model.traverse((child) => {
					if (child instanceof THREE.Mesh) {
						if (Array.isArray(child.material)) {
							child.material.forEach((material) => {
								if (material instanceof THREE.MeshStandardMaterial && material.map) {
									material.map.repeat.set(1, 1)
									material.needsUpdate = true
								}
							})
						} else if (child.material instanceof THREE.MeshStandardMaterial && child.material.map) {
							child.material.map.repeat.set(1, 1)
							child.material.needsUpdate = true
						}
					}
				})

				const center = new THREE.Vector3()
				bbox.getCenter(center)

				const maxDimension = Math.max(size.x, size.y, size.z)
				const cameraDistance = maxDimension * 1.5
				camera.position.set(center.x + cameraDistance, center.y + cameraDistance, center.z + cameraDistance)
				camera.lookAt(center)

				if (models[currentModelIndex]) {
					scene.remove(models[currentModelIndex])
				}

				models.push(model)
				currentModelIndex = models.length - 1
				scene.add(model)

				createTab(modelFileName)

				updateInfo()
				controls.update()

				const box = new THREE.Box3().setFromObject(model)
				const newSize = box.getSize(new THREE.Vector3()).length()
				const centerModel = box.getCenter(new THREE.Vector3())

				camera.near = newSize / 100
				camera.far = newSize * 10
				camera.updateProjectionMatrix()

				controls.maxDistance = newSize * 10
				controls.target.copy(centerModel)
				controls.update()
				hideLoadingBar()

				const textureSelect = document.getElementById('texture-select') as HTMLSelectElement
				textureSelect.value = 'default'
				updateTexture('default')

				const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement
				const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement
				tilingSlider.value = '1'
				tilingValue.textContent = '1'

				updateModelMaterial(model)

				// Обновление списка мэшей
				updateMeshList(model)

				resolve()
			},
			(xhr) => {
				const progress = (xhr.loaded / xhr.total) * 100
				showLoadingBar(progress)
			},
			(error) => {
				console.error('Ошибка загрузки модели:', error)
				alert('Ошибка загрузки модели. Пожалуйста, попробуйте снова.')
				hideLoadingBar()
				reject(error)
			}
		)
	})
}

function onMouseDown(event: MouseEvent): void {
	isMouseDown = true
	mouseDownPosition.set(event.clientX, event.clientY)
}

function onMouseUp(event: MouseEvent): void {
	isMouseDown = false
	mouseUpPosition.set(event.clientX, event.clientY)
	if (mouseDownPosition.distanceTo(mouseUpPosition) < 5) {
		handleClick(event)
	}
	console.log('isMouseDown:', isMouseDown)
}

function handleClick(event: MouseEvent): void {
	if (!models[currentModelIndex]) return

	const guiContainer = document.getElementById('gui-container')
	if (guiContainer?.contains(event.target as Node)) {
		return
	}

	const rect = renderer.domElement.getBoundingClientRect()
	mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
	mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

	raycaster.setFromCamera(mouse, camera)
	const intersects = raycaster.intersectObject(models[currentModelIndex], true)

	if (intersects.length > 0) {
		const selected = intersects[0].object as THREE.Mesh
		if (selectedObject && selectedObject.material instanceof THREE.MeshStandardMaterial) {
			selectedObject.material.emissive.set(0x000000)
		}
		selectedObject = selected
		if (selected.material instanceof THREE.MeshStandardMaterial) {
			selected.material.emissive.set(0x000000)
		}

		outlinePass.selectedObjects = [selected]

		updateInfo(selected)
		highlightSelectedMesh(selected)

		const textureValue = componentTextures.get(selected.uuid)
		const textureSelect = document.getElementById('texture-select') as HTMLSelectElement
		if (textureValue) {
			textureSelect.value = textureValue
		} else {
			textureSelect.value = 'default'
		}

		const tiling = getObjectTiling(selected)
		const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement
		const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement
		tilingSlider.value = tiling.toString()
		tilingValue.textContent = tiling.toString()
	} else {
		outlinePass.selectedObjects = []
		selectedObject = null
		updateInfo()

		const textureSelect = document.getElementById('texture-select') as HTMLSelectElement
		textureSelect.selectedIndex = -1
		textureSelect.value = ''

		const tilingSlider = document.getElementById('tiling-slider') as HTMLInputElement
		const tilingValue = document.getElementById('tiling-value') as HTMLSpanElement
		tilingSlider.value = '1'
		tilingValue.textContent = '1'

		// Сброс выделения в списке мэшей
		const meshList = document.getElementById('mesh-list') as HTMLUListElement
		if (meshList) {
			Array.from(meshList.children).forEach((li) => {
				if (li instanceof HTMLLIElement) {
					li.classList.remove('selected')
				}
			})
		}
	}
}

export function updateInfo(selected?: THREE.Object3D): void {
	if (models[currentModelIndex]) {
		if (selected) {
			infoParams.Name = selected.name
			bbox.setFromObject(selected)
			size.copy(bbox.getSize(size))
			infoParams.Width = size.x.toFixed(2)
			infoParams.Height = size.y.toFixed(2)
			infoParams.Depth = size.z.toFixed(2)
		} else {
			infoParams.Name = 'Модель: ' + modelFileName
			bbox.setFromObject(models[currentModelIndex])
			size.copy(bbox.getSize(size))
			infoParams.Width = size.x.toFixed(2)
			infoParams.Height = size.y.toFixed(2)
			infoParams.Depth = size.z.toFixed(2)
		}
		updateMeshList(models[currentModelIndex]) // Обновление списка мэшей
	} else {
		infoParams = { Name: '', Width: '', Height: '', Depth: '' }
	}

	const infoName = document.getElementById('info-name') as HTMLInputElement
	const infoDimensions = document.getElementById('info-dimensions') as HTMLInputElement

	infoName.value = infoParams.Name
	infoDimensions.value = `${infoParams.Width} x ${infoParams.Height} x ${infoParams.Depth} см`

	// Обновление списка мэшей
	if (selected && selected instanceof THREE.Mesh) {
		const model = models[currentModelIndex]
		updateMeshList(model)
	} else {
		// Сброс выделения в списке мэшей
		const meshList = document.getElementById('mesh-list') as HTMLUListElement
		if (meshList) {
			Array.from(meshList.children).forEach((li) => {
				if (li instanceof HTMLLIElement) {
					li.classList.remove('selected')
				}
			})
		}
	}
}

export function switchModel(index: number): void {
	if (index >= 0 && index < models.length) {
		if (models[currentModelIndex]) {
			scene.remove(models[currentModelIndex])
		}

		currentModelIndex = index
		modelFileName = tabs[index].name

		scene.add(models[currentModelIndex])

		// Сброс выделенного объекта
		if (selectedObject) {
			outlinePass.selectedObjects = []
			selectedObject = null
		}

		updateInfo()
		controls.update()

		const bbox = new THREE.Box3().setFromObject(models[currentModelIndex])
		const size = new THREE.Vector3()
		bbox.getSize(size)
		const center = new THREE.Vector3()
		bbox.getCenter(center)

		const maxDimension = Math.max(size.x, size.y, size.z)
		const cameraDistance = maxDimension * 1.5
		camera.position.set(center.x + cameraDistance, center.y + cameraDistance, center.z + cameraDistance)
		camera.lookAt(center)

		controls.target.copy(center)
		controls.update()

		// Обновление списка мэшей для новой модели
		updateMeshList(models[currentModelIndex])
	}
}

// Инициализация обработчиков событий
document.getElementById('upload-model-btn')?.addEventListener('click', () => {
	document.getElementById('model-upload')?.click()
})

document.getElementById('model-upload')?.addEventListener('change', onModelUpload)

document.addEventListener('dragover', (event) => event.preventDefault(), false)
document.addEventListener('drop', onDrop, false)
document.addEventListener('mousedown', onMouseDown, false)
document.addEventListener('mouseup', onMouseUp, false)
document.addEventListener('dragenter', onDragEnter, false)
document.addEventListener('dragleave', onDragLeave, false)

document.getElementById('mesh-list')?.addEventListener('wheel', (event) => {
	const container = event.currentTarget as HTMLElement
	container.scrollTop += event.deltaY
})

export function removeModel(index: number): void {
	if (index < 0 || index >= models.length) return

	const modelToRemove = models[index]
	scene.remove(modelToRemove)
	models.splice(index, 1)
}

// Функция для обновления списка мэшей
function updateMeshList(model: THREE.Group): void {
	const meshList = document.getElementById('mesh-list') as HTMLUListElement
	if (!meshList) return

	meshList.innerHTML = ''

	model.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			const meshBbox = new THREE.Box3().setFromObject(child)
			const meshSize = meshBbox.getSize(new THREE.Vector3())
			const meshDimensions = `${meshSize.x.toFixed(2)} x ${meshSize.y.toFixed(2)} x ${meshSize.z.toFixed(2)} см`

			const listItem = document.createElement('li')
			listItem.classList.add('mesh-item')

			const visibilityToggle = document.createElement('input')
			visibilityToggle.type = 'checkbox'
			visibilityToggle.checked = child.visible
			visibilityToggle.onchange = () => {
				child.visible = visibilityToggle.checked
				renderer.render(scene, camera)
			}

			listItem.innerHTML = `
                <div class="mesh-name">Мэш: ${child.name || 'Без имени'}</div>
                <div class="mesh-dimensions">Габариты: ${meshDimensions}</div>
            `
			listItem.dataset.uuid = child.uuid
			listItem.prepend(visibilityToggle)

			// Добавляем обработчик клика для выделения мэша
			listItem.onclick = (event) => {
				if (event.target !== visibilityToggle) {
					highlightSelectedMesh(child)
				}
			}

			meshList.appendChild(listItem)
		}
	})
}

// Функция для выделения выбранного мэша
function highlightSelectedMesh(mesh: THREE.Mesh): void {
	selectedObject = mesh
	updateInfo(mesh)

	// Обновление списка мэшей
	const meshList = document.getElementById('mesh-list') as HTMLUListElement
	if (!meshList) return

	Array.from(meshList.children).forEach((li) => {
		if (li instanceof HTMLLIElement) {
			li.classList.remove('selected')
			if (li.dataset.uuid === mesh.uuid) {
				li.classList.add('selected')
			}
		}
	})

	// Выделение мэша в сцене
	outlinePass.selectedObjects = [mesh]
	// renderer.render(scene, camera)
}

export { loadModel, models, selectedObject, currentModelIndex, onDrop, onModelUpload }
