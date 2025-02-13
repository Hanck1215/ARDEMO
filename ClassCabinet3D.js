import { OBJLoader } from './module.js';

export class Cabinet3D {
	constructor(cabinetID, buttonID, inputID) {
		this.mCabinetElement = document.getElementById(cabinetID);
		this.mButtonElement = document.getElementById(buttonID);
		this.mInputElement = document.getElementById(inputID)
		
		this.maObjNames = [];
		this.maObjs = [];
		this.maObjDOMs = [];
		
		this.mSize = 0;
		
		//設定按鈕事件
		this.mButtonElement.addEventListener("click", ()=>{
			this.mInputElement.click();
		});
		
		//設定物件輸入事件
		this.mInputElement.addEventListener("change", e => {
			const files = e.target.files;
			
			//設定讀取完成後的處理函式
			let onread = (e, fileName) => {
				//檔案的文字內容
				const content = e.target.result;
				
				//使用 OBJLoader 解析純文字內容
				const loader = new OBJLoader();
				let obj = loader.parse(content);
				
				//設定 OBJ 物件
				obj.traverse((child) => {
					if(child.isMesh) { //確保子物件是 Mesh
						const material = child.material;
						if(material) {
						material.transparent = true; //啟用透明度
						
						let bHasColor = false;
						
						//動脈是紅色
						if(
						fileName.includes("artery") || 
						fileName.includes("arteries")
						) {
						material.color.set("#ff0000");
						bHasColor = true;
						}
						
						
						//靜脈是藍色
						if(fileName.includes("veins")) {
						material.color.set("#00BFFF");
						bHasColor = true;
						}
						
						//其他為白色
						if(!bHasColor)
							material.color.set("#ffffff");
						}
					}
				});
				
				//新建用於展示物件於儲存櫃的 DOM 元素
				let newDiv = document.createElement('div');
				newDiv.classList.add('Obj');
				
				//設定要顯示的物件名稱
				let newP = document.createElement('p');
				newP.textContent = fileName;
				
				//設定使用者可以調整的透明度拉桿
				let newInput = document.createElement('input');
				newInput.type = 'range';
				newInput.min = 0;
				newInput.max = 100;
				newInput.value = 100;
				
				//移除鍵區塊
				let newDel = document.createElement('div');
				newDel.classList.add('del');
				
				//設定移除標誌
				let newPDel = document.createElement('p');
				newPDel.textContent = "X";
				
				//組合 "移除鍵區塊" && "移除標誌"
				newDel.appendChild(newPDel);
				
				//組合名稱與拉桿、移除建
				newDiv.appendChild(newP);
				newDiv.appendChild(newInput);
				newDiv.appendChild(newDel);
				
				//將該 DOM 元素外觀放置到儲存櫃上展示
				this.mCabinetElement.appendChild(newDiv);
				
				//監聽 range 變化
				newInput.addEventListener("input", ()=>{
					//遍歷所有子物件並修改材質
					obj.traverse((child) => {
						//確保子物件是 Mesh
						if(child.isMesh) {
							const material = child.material;
							if(material) {
								material.opacity = newInput.value/100.0;
								if(material.opacity < 0.8) {
									material.depthWrite = false;
								}else {
									material.depthWrite = true;
								}
							}
						}
					});
				});
				
				//監聽移除鍵
				newDel.addEventListener("click", ()=>{
					this.objErase(fileName);
				});
				
				//額外儲存物件名稱與對應的物件實例
				this.maObjNames.push(fileName);
				this.maObjs.push(obj);
				this.maObjDOMs.push(newDiv);
				
				//資料大小更新
				this.mSize = this.maObjNames.length;
				this.info();
			}
			
			//遍歷 input 的檔案
			for(let i = 0; i < files.length; i++) {
				//使用 FileReader 讀取檔案
				const reader = new FileReader();
				let file = files[i];
				
				//讀取完成後的處理函式
				reader.onload = e => {
				    onread(e, file.name);
				};
				
				//如果還沒讀取過該檔案
				if(!this.maObjNames.includes(file.name)) {
					//讀取檔案
					reader.readAsText(file);
				}else {
					console.log("檔案已存在");
				}
			}
			
			//重置 InputElement
			this.mInputElement.value = "";
		});
	}
	
	info() {
		console.log("Cabinet3D size: " + this.mSize);
	}

	
	//根據物件名稱移除儲存櫃中的物件
	objErase(objName) {
		//若列表中包含該名稱
		if(this.maObjNames.includes(objName)) {
			//查詢該物件名稱在列表的索引
			const index = this.maObjNames.indexOf(objName);
			
			//移除物件、釋放資源
			if(this.maObjs[index].geometry) {
		        this.maObjs[index].geometry.dispose();
		        this.maObjs[index].geometry = null;
		    }
		    
		    if(this.maObjs[index].material) {
		    	this.maObjs[index].material.dispose();
		        this.maObjs[index].material = null;
		    }
			
			//移除對應的 DOM 元素
			this.mCabinetElement.removeChild(this.maObjDOMs[index]);
			
			//從陣列中移除該索引的元素
	        this.maObjNames.splice(index, 1);
	        this.maObjs.splice(index, 1);
	        this.maObjDOMs.splice(index, 1);
	        
	        //資料大小更新
			this.mSize = this.maObjNames.length;
		}
		
		this.info();
	};
}