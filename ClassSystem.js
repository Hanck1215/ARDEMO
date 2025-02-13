import { Video } from "./ClassVideo.js";
import { Viewer3D } from "./ClassViewer3D.js";
import { Cabinet3D } from "./ClassCabinet3D.js";
import { FeatureExtractor } from "./ClassFeatureExtractor.js";
import { PoseEstimator } from "./ClassPoseEstimator.js"
import { AngleLimiter } from "./ClassAngleLimiter.js";
import { THREE } from './module.js';

export class System {
	/** 使編譯器知道這些變數的類型
	 * @param {Video} video
	 * @param {Viewer3D} viewer3D
	 * @param {Cabinet3D} cabinet3D
	 * @param {FeatureExtractor} featureExtractor
	 * @param {PoseEstimator} poseEstimator
	 */
	constructor(video, viewer3D, cabinet3D, featureExtractor, poseEstimator) {
		this.mVideo = video;
		this.mViewer3D = viewer3D;
		this.mCabinet3D = cabinet3D;
		this.mFeatureExtractor = featureExtractor;
		this.maLandmarks3d = [];
		this.mPoseEstimator = poseEstimator;
		
		//建立夾角限制器
		this.mAngleLimiter = new AngleLimiter(60.0);
		
		//判斷系統是否已初始化 (需要三維面部特徵)
		this.mbInitial = false;
		this.mViewer3D.ctrlDisable(); //若未初始化則不能操作影像
		
		//FaceMesh 中較為重要的幾個點
		this.msKeyPoints = new Set([
		    10, 151, 337,
            107, 336, 46, 276,
            168, 33, 133, 263, 362,
            6, 195, 61, 291,
		    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 
			365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 
			58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
		]);
	}
	
	//檢查 "儲存櫃" 和 "3D檢視器" 的元素是否有對應
	checkElements() {
		//分別取得 "儲存櫃" 和 "3D檢視器" 擁有的 3D 物件
		let cObjs = this.mCabinet3D.maObjs;
		let vObjs = this.mViewer3D.maObjs;
		
		//判斷元素個數是否一樣
		let bSize = (cObjs.length == vObjs.length);
		
		//判斷儲存櫃中的物件是否都存在於 3D 檢視器
		let bCMatch = true;
		
		//遍歷儲存櫃的 3D 物件
		for(let i = 0; i < cObjs.length; i++) {
			let obj = cObjs[i];
			
			//判斷 3D 檢視器是否有一樣的物件
			let bInclude = vObjs.includes(obj);
			
			//如果 3D 檢視器沒有該物件
			if(!bInclude)
				bCMatch = false;
		}
		
		//判斷 3D 檢視器中的物件是否都存在於儲存櫃中
		let bVMatch = true;
		
		//遍歷 3D 檢視器的 3D 物件
		for(let i = 0; i < vObjs.length; i++) {
			let obj = vObjs[i];
			
			//判斷儲存櫃是否有一樣的物件
			let bInclude = cObjs.includes(obj);
			
			//如果儲存櫃沒有該物件
			if(!bInclude)
				bVMatch = false;
		}
		
		return bSize && bCMatch && bVMatch;
	}
	
	//檢查頭部和相機之間的夾角 (假設頭固定在原點)
	angleIsOutOfRange() {
		//取得相機光心位置 (Threejs 格式)
		let camPositionThreejs = this.mViewer3D.mCamera.position;
		
		//轉換為陣列
		let aCamPosition = [camPositionThreejs.x, camPositionThreejs.y, camPositionThreejs.z];
		
		//取得原點指向相機光心位置的向量 (OpenCV 格式)
		let vO2Cam = cv.matFromArray(1, 3, cv.CV_64F, aCamPosition);
		
		//取得指向正 Y 軸的單位向量 (OpenCV 格式、正臉朝向)
		let vO2Y = cv.matFromArray(1, 3, cv.CV_64F, [0, 1, 0]);
		
		//檢查夾角
		return this.mAngleLimiter.isOutOfRange(vO2Cam, vO2Y);
	}
	
	//二維點集合轉換為世界座標
	lmks2Dto3D(aLandmarks2d) {
		let aLandmarks3d = [];
		let pt2d = new THREE.Vector2();
		
		for(let i = 0; i < aLandmarks2d.length; i++) {
			//如果不是關鍵點，就跳過
			if(!this.msKeyPoints.has(i)) {
				aLandmarks3d.push(null);
				continue; 
			}
			
			//正規化
			pt2d.x = aLandmarks2d[i].x * this.mViewer3D.mWidth;
			pt2d.y = aLandmarks2d[i].y * this.mViewer3D.mHeight;
			pt2d.x = (pt2d.x / this.mViewer3D.mWidth) * 2 - 1;
  			pt2d.y = - (pt2d.y / this.mViewer3D.mHeight) * 2 + 1;
  			
  			//2D轉3D
  			let pt3d = this.mViewer3D.pt2Dto3D(pt2d);
  			
  			aLandmarks3d.push(pt3d);
		}
		
		this.maLandmarks3d = aLandmarks3d;
	}
	
	//啟動系統
	active() {
		//啟動渲染器
		this.mViewer3D.animate();
		
		//標記函數是否在執行
		let bProccessing_000 = false;
		
		//該 ID 用於檢查儲存櫃有，但3D檢視器沒有的物件，並添加於場景中
		let ID_000 = setInterval(() => {
			//若有函數在執行，就取消
			if(bProccessing_000) { return; }
			bProccessing_000 = true;
			
			//分別取得 "儲存櫃" 和 "3D檢視器" 擁有的 3D 物件
			let cObjs = this.mCabinet3D.maObjs;
			let vObjs = this.mViewer3D.maObjs;
			
			//遍歷儲存櫃的 3D 物件
			for(let i = 0; i < cObjs.length; i++) {
				let obj = cObjs[i];
				
				//判斷 3D 檢視器是否有一樣的物件
				let bInclude = vObjs.includes(obj);
				
				//如果 3D 檢視器沒有該物件
				if(!bInclude) {
					this.mViewer3D.sceneAdd(obj); //添加物件於場景中
				
				//如果 3D 檢視器有該物件就跳過
				}else { 
					continue;
				}
			}
			
			//遍歷 3D 檢視器的 3D 物件
			for(let i = 0; i < vObjs.length; i++) {
				let obj = vObjs[i];
				
				//判斷儲存櫃是否有一樣的物件
				let bInclude = cObjs.includes(obj);
				
				//如果儲存櫃沒有該物件
				if(!bInclude) {
					this.mViewer3D.sceneRemove(obj); //於場景中移除該物件
				
				//如果儲存櫃有該物件就跳過
				}else {
					continue;
				}
			}
			
			//判斷元素狀態是否正確
			console.log("Elements State: " + this.checkElements());
			
			//結束函式
			bProccessing_000 = false;
		}, 1000);
		
		
		//標記函數是否在執行
		let bProccessing_001 = false;
		
		//該 ID 用於檢查是否有 FaceMesh，有的話就紀錄
		let ID_001 = setInterval(async () => {
			//若有函數在執行，就取消
			if(bProccessing_001) { return; }
			bProccessing_001 = true;
			
			//對三維影像進行辨識
			let image = this.mViewer3D.mRenderer.domElement;
			await this.mFeatureExtractor.input(image);
			
			//取得面部二維特徵點
			let aLandmarks2d = this.mFeatureExtractor.maLandmarks;
			
			//判斷系統是否偵測到面部二維特徵點
			let empty = (aLandmarks2d.length == 0);
			
			//如果有偵測到面部二維特徵點
			if(!empty) {
				this.lmks2Dto3D(aLandmarks2d);
				
				let aPts3d = [];
				
				for(let i = 0; i < this.maLandmarks3d.length; i++) {
					if(!this.msKeyPoints.has(i)) { continue; }
					aPts3d.push(this.maLandmarks3d[i].x);
					aPts3d.push(-this.maLandmarks3d[i].y);
					aPts3d.push(-this.maLandmarks3d[i].z);
				};
				aPts3d = cv.matFromArray(this.msKeyPoints.size, 3, cv.CV_64F, aPts3d);
				
				this.mPoseEstimator.mPoints3D = aPts3d;
				this.mViewer3D.ctrlEnable(); //允續操作三維物件
				this.mbInitial = true;       //初始化成功
				clearInterval(ID_001);
			}
			//結束函式
			bProccessing_001 = false;
		}, 1000);
		
		
		//標記函數是否在執行
		let bProccessing_002 = false;
		
		//紀錄上次的位姿
		let lastPose = null;
		
		//判斷是否要用初始位姿進行運算
		
		//初始化成功後，不斷觀測人臉特徵位置
		let ID_002 = setInterval(async () => {
			//若有函數在執行，就取消
			if(bProccessing_002) { return; }
			bProccessing_002 = true;
			
			//如果相機是開啟的
			if(this.mVideo.mbState) {
				this.mViewer3D.ctrlDisable(); //禁用控制器
			}else {
				//如果相機關閉，且已經完成初始化
				if(this.mbInitial) {
					this.mViewer3D.ctrlEnable();  //開啟控制器
					this.mPoseEstimator.mbUseExtrinsicGuess = false; //重新估計位姿
				}
			}
			
			//如果已經初始化而且沒有函數在執行而且相機開啟
			if(this.mbInitial && this.mVideo.mbState && this.mVideo.mVideoElement.readyState >= 2) {
				//對二維影像進行辨識
				let image = this.mVideo.mVideoElement;
				await this.mFeatureExtractor.input(image);
				
				//取得面部二維特徵點
				let aLandmarks2d = this.mFeatureExtractor.maLandmarks;
				
				//判斷系統是否偵測到面部二維特徵點
				let empty = (aLandmarks2d.length == 0);
				
				//如果有偵測到面部二維特徵點
				if(!empty) {
					//整理二維特徵點座標
					let aPts2d = []
			        for(let i = 0; i < aLandmarks2d.length; i++) {
						if(!this.msKeyPoints.has(i)) { continue; }
						aPts2d.push((aLandmarks2d[i].x * this.mViewer3D.mWidth));
						aPts2d.push((aLandmarks2d[i].y * this.mViewer3D.mHeight));
					}
					//轉換為
					aPts2d = cv.matFromArray(this.msKeyPoints.size, 2, cv.CV_64F, aPts2d);
					
					//估計位姿
					let aPose = this.mPoseEstimator.estimate(aPts2d);
					
					//轉換
					this.mViewer3D.mCamera.matrix.identity();//重置相機矩陣
					this.mViewer3D.mCamera.matrix.multiply(aPose[0].multiply(aPose[1]));
					this.mViewer3D.mCamera.rotation.setFromRotationMatrix(this.mViewer3D.mCamera.matrix);
					this.mViewer3D.mCamera.position.setFromMatrixPosition(this.mViewer3D.mCamera.matrix);
					
					//下次可以使用初始位姿來運算
					this.mPoseEstimator.mbUseExtrinsicGuess = true;
				}
			}
			//結束函式
			bProccessing_002 = false;
		}, 10);
		
		
		//標記函數是否在執行
		let bProccessing_003 = false;
		
		//該 ID 用於判斷追蹤過程中的不確定性大小
		let ID_003 = setInterval(() => {
			//若有函數在執行，就取消
			if(bProccessing_003) { return; }
			bProccessing_003 = true;
			
			//如果已經初始化而且沒有函數在執行而且相機開啟
			if(this.mbInitial && this.mVideo.mbState && this.mVideo.mVideoElement.readyState >= 2) {
				//如果頭的角度太大，代表位姿測量的不確定性增加
				if(this.angleIsOutOfRange()) {
					this.mPoseEstimator.mbChaos = true;
					console.log("不確定性高");
				}else {
					this.mPoseEstimator.mbChaos = false; //否則不確定性低
				}
			}
			
			//結束函式
			bProccessing_003 = false;
		}, 100);
	}
}