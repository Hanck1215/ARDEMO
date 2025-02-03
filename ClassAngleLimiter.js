export class AngleLimiter {
	constructor(th) {
		this.mbOut = false;
		this.mTh = th; //angle
	}
	
	//判斷兩向量角度是否超過預值
	isOutOfRange(vec_1, vec_2) {
		let dotProduct = vec_1.dot(vec_2);
		
		let norm_1 = cv.norm(vec_1, cv.NORM_L2);
		let norm_2 = cv.norm(vec_2, cv.NORM_L2);
		
		let cosTheta = dotProduct / (norm_1 * norm_2);
		
		let angleRad = Math.acos(cosTheta);
		
		let angleDeg = angleRad * (180 / Math.PI);
		
		return angleDeg > this.mTh;
	}
}