export class FeatureExtractor {
	constructor() {
		this.maLandmarks = [];
		
		this.mFaceMesh = new FaceMesh({locateFile: (file) => {
			console.log(`./${file}`);
		    return `./${file}`;
		}});
		
		this.mFaceMesh.setOptions({
		    maxNumFaces: 1,
		    refineLandmarks: true,
		    minDetectionConfidence: 0.7,
		    minTrackingConfidence: 0.7
		});
		
		this.mFaceMesh.onResults(this.onResults);
	}
	
	//影像辨識完的處理函式
	onResults = (results) => {
		if(results.multiFaceLandmarks.length > 0) {
			for(let aLandmarks of results.multiFaceLandmarks) {
				this.maLandmarks = aLandmarks;
			}
		}
	}
	
	//輸入待辨識影像
	async input(image) {
		await this.mFaceMesh.send({image: image});
	}
}