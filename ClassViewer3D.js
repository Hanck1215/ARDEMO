import { THREE, OrbitControls } from './module.js';

export class Viewer3D {
	constructor(viewerID, width, height, FOV) {
		this.mViewer = document.getElementById(viewerID);
		this.mRaycaster = new THREE.Raycaster();
		
		//長寬
		this.mWidth = width;
		this.mHeight = height;
		
		//場景、相機
		this.mScene = new THREE.Scene();
		this.mCamera = 
		new THREE.PerspectiveCamera(
			FOV, width/height, 0.1, 2000
		);
		
		//渲染器
		this.mRenderer = new THREE.WebGLRenderer({alpha: true});
		this.mRenderer.setSize(width, height);
		this.mRenderer.sortObjects = false;
		this.mRenderer.shadowMap.enabled = true; //啟用陰影
		this.mViewer.appendChild(this.mRenderer.domElement);
		
		//設定相機位置
		this.mCamera.position.y = 500;
		this.mCamera.up.set(0, 0, 1);
		
		//控制器
		this.mControler = 
		new OrbitControls(this.mCamera, this.mRenderer.domElement);
		this.mControler.target.set(0,0,0)
		this.mControler.enableDamping = true;
		this.mControler.dampingFactor = 0.25;
		this.mControler.screenSpacePanning = false;
		this.mControler.minDistance = 1;
		this.mControler.maxDistance = 1000;
		this.mControler.maxPolarAngle = Math.PI * 2;
		
		//控制器額外設定
		this.mControler.mouseButtons = {
		    LEFT: THREE.MOUSE.ROTATE,   //左鍵進行旋轉
		    MIDDLE: THREE.MOUSE.DOLLY,  //滾輪進行縮放
		    RIGHT: THREE.MOUSE.NONE     //禁用右鍵平移
		};
		
		//添加一些基礎的光源
		this.mLight = new THREE.AmbientLight(0x404040, 5.0);
		this.mDirLight_000 = new THREE.DirectionalLight(0xffffff, 1.5);
		this.mDirLight_001 = new THREE.DirectionalLight(0xffffff, 1.0);
		this.mDirLight_000.position.set(5, 5, 5).normalize();
		this.mDirLight_001.position.set(-5, -5, -5).normalize();
		this.mScene.add(this.mLight);
		this.mScene.add(this.mDirLight_000);
		this.mScene.add(this.mDirLight_001);
		
		//設定原點球體
		this.mSphere = 
		new THREE.Mesh(
			new THREE.SphereGeometry(5, 32, 32),
			new THREE.MeshBasicMaterial({color: 0xff0000})
		);
		
		//添加原點球體
		this.mScene.add(this.mSphere);
		
		//待在場景中的物件集合
		this.maObjs = [];
	}
	
	//顯示 3D 顯示器資訊
	info() {
		console.log("Viewer3D: " + this.mWidth + " x " + this.mHeight);
	}
	
	//添加物件
	sceneAdd(object) {
		if(!this.maObjs.includes(object))
			this.mScene.add(object);
			this.maObjs.push(object);
	}
	
	//移除物件
	sceneRemove(object) {
		if(this.maObjs.includes(object))
	    	this.mScene.remove(object);
	    	
	    	//從物件集合中移除該物件
	    	const index = this.maObjs.indexOf(object);
	    	this.maObjs.splice(index, 1);
	}
	
	//使用 Controller
	ctrlEnable() {
		this.mControler.enabled = true;
	}
	
	//不使用 Controller
	ctrlDisable() {
		this.mControler.enabled = false;
	}
	
	//轉換2維座標點，變成3為座標點
	pt2Dto3D(pt2d) {
		//設置光線起點和方向
		this.mRaycaster.setFromCamera(pt2d, this.mCamera);
		
		//測試光線與場景中的物體是否相交
		const intersects = 
		this.mRaycaster.intersectObjects(this.mScene.children);
		
		//如果有相交
		if(intersects.length > 0) {
			let pt3d = {
				x : intersects[0].point.x,
				y : intersects[0].point.y,
				z : intersects[0].point.z
			}
			return pt3d;
		}else {
			return null;
		}
	}
	
	//啟動 3D 顯示器
	async animate() {
		requestAnimationFrame(()=>this.animate());
		
		if(this.mControler.enabled)
			this.mControler.update(); //更新OrbitControls
		
		this.mRenderer.render(this.mScene, this.mCamera);
	}
}