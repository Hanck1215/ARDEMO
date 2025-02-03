import { Video } from "./ClassVideo.js";
import { Viewer3D } from "./ClassViewer3D.js";
import { Cabinet3D } from "./ClassCabinet3D.js";
import { FeatureExtractor } from "./ClassFeatureExtractor.js";
import { PoseEstimator } from "./ClassPoseEstimator.js"
import { System } from "./ClassSystem.js"

//等待 OpenCV 載入
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
while(!opencv) { await sleep(1000); console.log("Waiting opencv..."); };

//videoID
const video = new Video("Video", "CameraSwitch");

//viewerID, width, height, FOV
const viewer3D = new Viewer3D("Viewer3DArea", 640, 480, 37.2);
viewer3D.info();

//cabinetID, buttonID, inputID
const cabinet3D = new Cabinet3D("Cabinet3D", "CabinetBTN", "InputFile");

const featureExtractor = new FeatureExtractor();

//設定相機參數
let cameraMatrix = [
     713.7906994392348, 0, 317.5506338116529, 0, 713.1397610667941, 240.3445337819322, 0, 0, 1
];
cameraMatrix = cv.matFromArray(3, 3, cv.CV_64F, cameraMatrix);

//畸變係數
let distCoeffs = [-0.04539245557760049, 1.36296925196101, -0.002927498547606124, 0.001369713340755179, -4.575335220358818];
distCoeffs = cv.matFromArray(5, 1, cv.CV_64F, distCoeffs);

//cvPoints3D, cvCameraMatrix, cvDistCoeffs
let poseEstimator = new PoseEstimator(null, cameraMatrix, distCoeffs);

//video, viewer3D, cabinet3D
const system = new System(video, viewer3D, cabinet3D, featureExtractor, poseEstimator);
system.active();




