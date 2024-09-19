import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

// Объявление переменных
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer & { shadowMap: { enabled: boolean; type: any } }
let controls: OrbitControls
let composer: EffectComposer
let outlinePass: OutlinePass
let renderTarget: THREE.WebGLRenderTarget
let currentBackgroundColor = 0xe3e3e3

// Обработчик события переключения темы
document.getElementById('theme-switch')?.addEventListener('click', () => {
	onThemeSwitch()
})

// Функция переключения темы
function onThemeSwitch(): void {
	const bodyElement = document.body

	if (bodyElement.classList.contains('light-theme')) {
		renderer.setClearColor(0x303030)
		currentBackgroundColor = 0x303030
		bodyElement.classList.remove('light-theme')
		bodyElement.classList.add('dark-theme')
		outlinePass.visibleEdgeColor.set('#ffff00')
		outlinePass.hiddenEdgeColor.set('#ffff00')
	} else {
		renderer.setClearColor(0xe3e3e3)
		currentBackgroundColor = 0xe3e3e3
		bodyElement.classList.add('light-theme')
		bodyElement.classList.remove('dark-theme')
		outlinePass.visibleEdgeColor.set('#eda7a7')
		outlinePass.hiddenEdgeColor.set('#eda7a7')
	}
	updateOutline()
}

// Функция отображения индикатора загрузки
export function showLoadingBar(progress = 0): void {
	const loadingBar = document.getElementById('loading-bar')
	const loadingBarProgress = document.getElementById('loading-bar-progress')
	const loadingBarText = document.getElementById('loading-bar-text')

	if (loadingBar && loadingBarProgress && loadingBarText) {
		loadingBar.style.display = 'flex'
		const circumference = 2 * Math.PI * 40
		const dashoffset = circumference - (progress / 100) * circumference
		loadingBarProgress.setAttribute('stroke-dashoffset', dashoffset.toString())
		loadingBarText.textContent = Math.round(progress) + '%'
	}
}

// Функция скрытия индикатора загрузки
export function hideLoadingBar(): void {
	const loadingBar = document.getElementById('loading-bar')
	if (loadingBar) {
		loadingBar.style.display = 'none'
	}
}

// Функция инициализации сцены
export function initScene(): void {
	console.log('Инициализация сцены')
	scene = new THREE.Scene()
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000)
	renderer = new THREE.WebGLRenderer({ antialias: true }) as THREE.WebGLRenderer & { shadowMap: { enabled: boolean; type: any } }
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setSize(window.innerWidth, window.innerHeight)
	renderer.shadowMap.enabled = true
	renderer.shadowMap.type = THREE.PCFSoftShadowMap
	document.body.appendChild(renderer.domElement)

	const SSAA_FACTOR = 2
	renderTarget = new THREE.WebGLRenderTarget(window.innerWidth * SSAA_FACTOR, window.innerHeight * SSAA_FACTOR)

	controls = new OrbitControls(camera, renderer.domElement)

	const ambientLight = new THREE.AmbientLight(0xffffff, 1.0)
	scene.add(ambientLight)

	const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
	scene.add(hemisphereLight)

	const directionalLight1 = new THREE.DirectionalLight(0x3e3e3e, 0.8) as THREE.DirectionalLight & { position: THREE.Vector3 }
	directionalLight1.position.set(5, 10, 7.5)
	directionalLight1.castShadow = true
	directionalLight1.shadow.mapSize.width = 1024
	directionalLight1.shadow.mapSize.height = 1024
	scene.add(directionalLight1)

	const directionalLight2 = new THREE.DirectionalLight(0x3e3e3e, 0.6) as THREE.DirectionalLight & { position: THREE.Vector3 }
	directionalLight2.position.set(-5, 10, -7.5)
	directionalLight2.castShadow = true
	directionalLight2.shadow.mapSize.width = 1024
	directionalLight2.shadow.mapSize.height = 1024
	scene.add(directionalLight2)

	const pointLight = new THREE.PointLight(0x3e3e3e, 1.0) as THREE.PointLight & { position: THREE.Vector3 }
	pointLight.position.set(0, 15, 0)
	scene.add(pointLight)

	composer = new EffectComposer(renderer, renderTarget)
	composer.addPass(new RenderPass(scene, camera))
	outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)
	outlinePass.edgeStrength = 20.0
	outlinePass.edgeThickness = 2.0
	composer.addPass(outlinePass)
	outlinePass.renderToScreen = true

	window.addEventListener('resize', onWindowResize)
	onThemeSwitch()
	console.log('Сцена инициализирована')
}

// Функция обработки изменения размера окна
function onWindowResize(): void {
	camera.aspect = window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix()
	renderer.setSize(window.innerWidth, window.innerHeight)

	const SSAA_FACTOR = 2
	renderTarget.setSize(window.innerWidth * SSAA_FACTOR, window.innerHeight * SSAA_FACTOR)
	composer.setSize(window.innerWidth * SSAA_FACTOR, window.innerHeight * SSAA_FACTOR)
}

// Функция обновления контура
export function updateOutline(): void {
	if (outlinePass.selectedObjects.length > 0) {
		if (currentBackgroundColor === 0xe3e3e3) {
			outlinePass.visibleEdgeColor.set('#ffff00')
			outlinePass.hiddenEdgeColor.set('#ffff00')
		} else {
			outlinePass.visibleEdgeColor.set('#eda7a7')
			outlinePass.hiddenEdgeColor.set('#eda7a7')
		}
	}
}

// Функция обновления материала модели
export function updateModelMaterial(model: THREE.Object3D): void {
	model.traverse((child) => {
		if (child instanceof THREE.Mesh) {
			const currentEnvMap = child.material instanceof THREE.MeshStandardMaterial ? child.material.envMap : null
			const currentMap = child.material instanceof THREE.MeshStandardMaterial ? child.material.map : null

			child.material = new THREE.MeshStandardMaterial({
				color: 0xffffff,
				map: currentMap,
			})

			if (currentEnvMap) {
				child.material.envMap = currentEnvMap
				if (child.material instanceof THREE.MeshStandardMaterial) {
					child.material.envMapIntensity = 1
				}
			}

			child.castShadow = true
			child.receiveShadow = true
		}
	})
}

// Экспортируемые элементы
export { scene, camera, renderer, controls, composer, outlinePass }
