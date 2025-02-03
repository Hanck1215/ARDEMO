export class Video {
	constructor(videoID, switchID) {
		this.mVideoElement = document.getElementById(videoID);
		this.mSwitchElement = document.getElementById(switchID);
		this.mCheckbox = this.mSwitchElement.getElementsByTagName('input')[0];
		this.mCameraElement = null;
		this.mbState = false;
		
		if(window.Camera) {
			this.mCameraElement = new window.Camera(this.mVideoElement, {
				facingMode: "environment",
				onFrame: async () => {}
			});
		
		}else {
			console.error('Camera not found');
		}
		
		//監聽 checkbox 的 change 事件
		this.mCheckbox.addEventListener("change", () => {
		    if(this.mCheckbox.checked) {
		        this.startVideo(); // 啟動攝像頭
		    } else {
		        this.stopVideo(); // 停止攝像頭
		    }
		});
	}
	
	//啟動攝像頭
	startVideo() {
		if(this.mCameraElement) {
			this.mCameraElement.start();
			this.mbState = true;
		}	
	}
	
	//停止攝像頭
    stopVideo() {
        if(this.mCameraElement) {
            this.mCameraElement.stop(); //停止 Camera 物件

            //釋放影片串流資源
            const stream = this.mVideoElement.srcObject;
            if(stream) {
                stream.getTracks().forEach(track => track.stop());
                this.mVideoElement.srcObject = null; //清除影片來源
            }
            
            this.mbState = false;
        }
    }
}