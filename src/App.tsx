import { useEffect,  useRef } from "react"
import createImageIdsAndCacheMetaData  from "./lib/createImageIdsAndCacheMetaData"
import { RenderingEngine, Enums, type Types, volumeLoader, cornerstoneStreamingImageVolumeLoader } from "@cornerstonejs/core"
import {init as csRenderInit} from "@cornerstonejs/core"
import {init as csToolsInit} from "@cornerstonejs/tools"
import {init as dicomImageLoaderInit} from "@cornerstonejs/dicom-image-loader"
import VideoViewer from "./components/VideoViewer/VideoViewer"
import VideoStack from "./components/VideoStack/VideoStack"
import DicomStack from "./components/P10Stack/DicomStack"


volumeLoader.registerUnknownVolumeLoader(
  cornerstoneStreamingImageVolumeLoader 
)

function App() {
  return (
    <div>
      <DicomStack />
    </div>
  )
}

export default App
