import { THREE } from './module.js';
import KalmanFilter from "./kalman.js";

export class PoseEstimator {
	constructor(cvPoints3D, cvCameraMatrix, cvDistCoeffs) {
		this.mPoints3D = cvPoints3D;
		this.mCameraMatrix = cvCameraMatrix;
		this.mDistCoeffs = cvDistCoeffs;
		
		this.mbUseExtrinsicGuess = false;
		this.mRvecs = null;
		this.mTvecs = null;
		
		//判斷位姿的不確定性是否大
		this.mbChaos = false;
		
		//用於穩定相機位置 (較相信預測值)
		this.maTvecsStablizersPredict = [
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1})
		];
		
		//用於穩定相機位置 (較相信觀測值)
		this.maTvecsStablizersObserve = [
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1})
		];
		
		//用於穩定相機旋轉 (較相信預測值)
		this.maRvecsStablizersPredict = [
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.001, Q: 0.1, A: 1, B: 0, C: 1})
		];
		
		//用於穩定相機旋轉 (較相信觀測值)
		this.maRvecsStablizersObserve = [
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1}),
			new KalmanFilter({R: 0.01, Q: 0.1, A: 1, B: 0, C: 1})
		];
	}
	
	//使用 PnP 方法估計相機位姿
	estimate(cvPoints2D) {
		//如果設置要使用初始值
		if(this.mRvecs != null && this.mTvecs != null && this.mbUseExtrinsicGuess) { 
			return this.estimateOpt(cvPoints2D);
		}
		
		//"旋轉向量" && "平移向量"
		let rvecs = new cv.Mat(3, 1, cv.CV_64F);
		let tvecs = new cv.Mat(3, 1, cv.CV_64F);
		
		//估計位姿
		cv.solvePnP(this.mPoints3D, cvPoints2D, this.mCameraMatrix, this.mDistCoeffs, rvecs, tvecs);
		this.mRvecs = rvecs.clone();
		this.mTvecs = tvecs.clone();
		
		//轉換成適用於 Three.js 的版本
		rvecs.data64F[0] = -rvecs.data64F[0];
		tvecs.data64F[0] = -tvecs.data64F[0];
		
		//將旋轉向量轉換為旋轉矩陣
		let cvRotationMatrix = new cv.Mat();
		cv.Rodrigues(rvecs, cvRotationMatrix);
		
		//將旋轉矩陣轉換為 THREE.Matrix4 格式
		const rotationMatrix = new THREE.Matrix4();
		rotationMatrix.set(
		    cvRotationMatrix.data64F[0], cvRotationMatrix.data64F[1], cvRotationMatrix.data64F[2], 0,
		    cvRotationMatrix.data64F[3], cvRotationMatrix.data64F[4], cvRotationMatrix.data64F[5], 0,
		    cvRotationMatrix.data64F[6], cvRotationMatrix.data64F[7], cvRotationMatrix.data64F[8], 0,
		    0, 0, 0, 1
		);
		
		//平移矩陣
		const translationMatrix = new THREE.Matrix4().makeTranslation(tvecs.data64F[0], tvecs.data64F[1], tvecs.data64F[2]);
		
		//釋放 OpenCV 資源
		rvecs.delete();
		tvecs.delete();
		cvRotationMatrix.delete();
		cvPoints2D.delete();
		
		return [rotationMatrix, translationMatrix];
	}
	
	//使用 PnP 方法估計相機位姿 (提供初始值)
	estimateOpt(cvPoints2D) {
		//給定初始值
		let rvecs = this.mRvecs.clone();
		let tvecs = this.mTvecs.clone();
		
		//估計位姿
		cv.solvePnP(this.mPoints3D, cvPoints2D, this.mCameraMatrix, this.mDistCoeffs, rvecs, tvecs, true);
		
		//如果位姿的不確定性較大，就相信預測值
		if(this.mbChaos) {
			//穩定平移向量
			tvecs.data64F[0] = this.maTvecsStablizersPredict[0].filter(tvecs.data64F[0]);
			tvecs.data64F[1] = this.maTvecsStablizersPredict[1].filter(tvecs.data64F[1]);
			tvecs.data64F[2] = this.maTvecsStablizersPredict[2].filter(tvecs.data64F[2]);
			
			//穩定旋轉向量
			rvecs.data64F[0] = this.maRvecsStablizersPredict[0].filter(rvecs.data64F[0]);
			rvecs.data64F[1] = this.maRvecsStablizersPredict[1].filter(rvecs.data64F[1]);
			rvecs.data64F[2] = this.maRvecsStablizersPredict[2].filter(rvecs.data64F[2]);
		
		//如果位姿的不確定性較小，就相信觀測值
		}else {
			//穩定平移向量
			tvecs.data64F[0] = this.maTvecsStablizersObserve[0].filter(tvecs.data64F[0]);
			tvecs.data64F[1] = this.maTvecsStablizersObserve[1].filter(tvecs.data64F[1]);
			tvecs.data64F[2] = this.maTvecsStablizersObserve[2].filter(tvecs.data64F[2]);
			
			//穩定旋轉向量
			rvecs.data64F[0] = this.maRvecsStablizersObserve[0].filter(rvecs.data64F[0]);
			rvecs.data64F[1] = this.maRvecsStablizersObserve[1].filter(rvecs.data64F[1]);
			rvecs.data64F[2] = this.maRvecsStablizersObserve[2].filter(rvecs.data64F[2]);
		}
		
		//更新位姿
		this.mRvecs.data64F[0] = rvecs.data64F[0];
		this.mRvecs.data64F[1] = rvecs.data64F[1];
		this.mRvecs.data64F[2] = rvecs.data64F[2];
		this.mTvecs.data64F[0] = tvecs.data64F[0];
		this.mTvecs.data64F[1] = tvecs.data64F[1];
		this.mTvecs.data64F[2] = tvecs.data64F[2];
		
		//轉換成適用於 Three.js 的版本
		rvecs.data64F[0] = -rvecs.data64F[0];
		tvecs.data64F[0] = -tvecs.data64F[0];
		
		//將旋轉向量轉換為旋轉矩陣
		let cvRotationMatrix = new cv.Mat();
		cv.Rodrigues(rvecs, cvRotationMatrix);
		
		//將旋轉矩陣轉換為 THREE.Matrix4 格式
		const rotationMatrix = new THREE.Matrix4();
		rotationMatrix.set(
		    cvRotationMatrix.data64F[0], cvRotationMatrix.data64F[1], cvRotationMatrix.data64F[2], 0,
		    cvRotationMatrix.data64F[3], cvRotationMatrix.data64F[4], cvRotationMatrix.data64F[5], 0,
		    cvRotationMatrix.data64F[6], cvRotationMatrix.data64F[7], cvRotationMatrix.data64F[8], 0,
		    0, 0, 0, 1
		);
		
		//平移矩陣
		const translationMatrix = new THREE.Matrix4().makeTranslation(tvecs.data64F[0], tvecs.data64F[1], tvecs.data64F[2]);
		
		//釋放 OpenCV 資源
		rvecs.delete();
		tvecs.delete();
		cvRotationMatrix.delete();
		cvPoints2D.delete();
		
		return [rotationMatrix, translationMatrix];
	}
}