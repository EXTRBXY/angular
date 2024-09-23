// src/app/services/scene.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';

@Injectable({
  providedIn: 'root',
})
export class SceneService implements OnDestroy {
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  public composer!: EffectComposer;
  public outlinePass!: OutlinePass;
  private renderTarget!: THREE.WebGLRenderTarget;
  private currentBackgroundColor: number = 0xe3e3e3;

  constructor() {}

  initScene(): void {
    console.log('Инициализация сцены');
    this.scene = new THREE.Scene();

    // Инициализация камеры
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 10);

    // Инициализация рендерера
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    }) as THREE.WebGLRenderer & { shadowMap: { enabled: boolean; type: any } };
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(this.currentBackgroundColor);
    document.body.appendChild(this.renderer.domElement);

    // Инициализация EffectComposer
    this.renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth,
      window.innerHeight
    );
    this.composer = new EffectComposer(this.renderer, this.renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Инициализация OutlinePass
    this.outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.scene,
      this.camera
    );
    this.outlinePass.edgeStrength = 20.0;
    this.outlinePass.edgeThickness = 2.0;
    this.composer.addPass(this.outlinePass);
    this.outlinePass.renderToScreen = true;

    // Инициализация контролов
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Добавление источников света
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(
      0x3e3e3e,
      0.8
    ) as THREE.DirectionalLight & { position: THREE.Vector3 };
    directionalLight1.position.set(5, 10, 7.5);
    directionalLight1.castShadow = true;
    directionalLight1.shadow.mapSize.width = 1024;
    directionalLight1.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(
      0x3e3e3e,
      0.6
    ) as THREE.DirectionalLight & { position: THREE.Vector3 };
    directionalLight2.position.set(-5, 10, -7.5);
    directionalLight2.castShadow = true;
    directionalLight2.shadow.mapSize.width = 1024;
    directionalLight2.shadow.mapSize.height = 1024;
    this.scene.add(directionalLight2);

    const pointLight = new THREE.PointLight(
      0x3e3e3e,
      1.0
    ) as THREE.PointLight & { position: THREE.Vector3 };
    pointLight.position.set(0, 15, 0);
    this.scene.add(pointLight);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.onThemeSwitch();
    console.log('Сцена инициализирована');
  }

  render(): void {
    this.controls.update();
    this.composer.render();
  }

  // Метод для переключения темы
  toggleTheme(isLightTheme: boolean): void {
    const bodyElement = document.body;

    if (isLightTheme) {
      this.renderer.setClearColor(0xe3e3e3);
      this.currentBackgroundColor = 0xe3e3e3;
      bodyElement.classList.add('light-theme');
      bodyElement.classList.remove('dark-theme');
      this.outlinePass.visibleEdgeColor.set('#eda7a7');
      this.outlinePass.hiddenEdgeColor.set('#eda7a7');
    } else {
      this.renderer.setClearColor(0x303030);
      this.currentBackgroundColor = 0x303030;
      bodyElement.classList.remove('light-theme');
      bodyElement.classList.add('dark-theme');
      this.outlinePass.visibleEdgeColor.set('#ffff00');
      this.outlinePass.hiddenEdgeColor.set('#ffff00');
    }
    this.updateOutline();
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.outlinePass.setSize(window.innerWidth, window.innerHeight);
  }

  // Функция обновления контура
  private updateOutline(): void {
    if (this.outlinePass.selectedObjects.length > 0) {
      if (this.currentBackgroundColor === 0xe3e3e3) {
        this.outlinePass.visibleEdgeColor.set('#eda7a7');
        this.outlinePass.hiddenEdgeColor.set('#eda7a7');
      } else {
        this.outlinePass.visibleEdgeColor.set('#ffff00');
        this.outlinePass.hiddenEdgeColor.set('#ffff00');
      }
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
  }

  // Методы для отображения индикатора загрузки
  showLoadingBar(progress: number = 0): void {
    const loadingBar = document.getElementById('loading-bar') as HTMLElement;
    const loadingBarProgress = document.getElementById(
      'loading-bar-progress'
    ) as SVGCircleElement;
    const loadingBarText = document.getElementById(
      'loading-bar-text'
    ) as HTMLElement;

    if (loadingBar && loadingBarProgress && loadingBarText) {
      loadingBar.style.display = 'flex';
      const circumference = 2 * Math.PI * 40;
      const dashoffset = circumference - (progress / 100) * circumference;
      loadingBarProgress.setAttribute(
        'stroke-dashoffset',
        dashoffset.toString()
      );
      loadingBarText.textContent = `${Math.round(progress)}%`;
    }
  }

  hideLoadingBar(): void {
    const loadingBar = document.getElementById('loading-bar') as HTMLElement;
    if (loadingBar) {
      loadingBar.style.display = 'none';
    }
  }
}
