import { useRef, useEffect, useState } from "react";
import {
  RenderingEngine,
  init as coreInit,
  getRenderingEngine,
  Enums
} from "@cornerstonejs/core";
import type { Types } from '@cornerstonejs/core';
import createImageIdsAndCacheMetaData from "../../lib/createImageIdsAndCacheMetaData";

const { ViewportType, Events } = Enums;

function VideoStack() {
    const elementRef = useRef(null);
    const running = useRef(false);
    const renderingEngineId = "myRenderingEngine";
    const viewportId = "videoViewport";
    
    const [viewport, setViewport] = useState(null);
    const [rotation, setRotation] = useState(0);
    const [flipHorizontal, setFlipHorizontal] = useState(false);
    const [flipVertical, setFlipVertical] = useState(false);
  
    useEffect(() => {
      const setup = async () => {
        if (running.current) {
          return;
        }
        running.current = true;
  
        // Initialize Cornerstone and related libraries
        await coreInit();
        
        // Create element and add camera modified event listener
        const element = elementRef.current;
        element.addEventListener(Events.CAMERA_MODIFIED, (_) => {
          // Get the rendering engine
          const renderingEngine = getRenderingEngine(renderingEngineId);
  
          // Get the video viewport
          const viewport = renderingEngine.getViewport(viewportId) as Types.IVideoViewport;
  
          if (!viewport) {
            return;
          }
  
          const { flipHorizontal, flipVertical } = viewport.getCamera();
          
          // Get rotation safely
          let currentRotation = 0;
          try {
            const viewPresentation = viewport.getViewPresentation();
            currentRotation = viewPresentation?.rotation || 0;
          } catch (error) {
            console.warn("Could not get rotation, using default value");
          }
  
          setRotation(Math.round(currentRotation));
          setFlipHorizontal(flipHorizontal);
          setFlipVertical(flipVertical);
        });
  
        // Instantiate a rendering engine
        const renderingEngine = new RenderingEngine(renderingEngineId);
  
        // Create a video viewport
        const viewportInput = {
          viewportId,
          element,
          type: ViewportType.VIDEO,
          defaultOptions: {
            background: [0.2, 0, 0.2] as Types.Point3,
          },
        };
  
        renderingEngine.enableElement(viewportInput);
  
        // Get the video viewport that was created
        const viewport = renderingEngine.getViewport(viewportId) as Types.IVideoViewport;
        setViewport(viewport);
  
        try {
          // Try loading from DICOM web first
          const imageIds = await createImageIdsAndCacheMetaData({
            StudyInstanceUID: '2.25.96975534054447904995905761963464388233',
            SeriesInstanceUID: '2.25.15054212212536476297201250326674987992',
            wadoRsRoot:  'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
          });
  
          // Only one SOP instance is DICOM video, so find it
          const videoId = imageIds.find((it) =>
            it.includes('2.25.179478223177027022014772769075050874231')
          );
  
          if (videoId) {
            // Set the DICOM video
            await viewport.setVideo(videoId);
          } else {
            // Fallback to direct URL if DICOM video not found
            await viewport.setVideoURL(
              'https://ohif-assets.s3.us-east-2.amazonaws.com/video/rendered.mp4'
            );
          }
        } catch (error) {
          console.log("Error loading video:", error);
          // Fallback to direct URL if any error occurs
          await viewport.setVideoURL(
            'https://ohif-assets.s3.us-east-2.amazonaws.com/video/rendered.mp4'
          );
        }
  
        // Auto-play the video
        viewport.play();
      };
  
      setup();
      
      // Cleanup function
      return () => {
        if (elementRef.current) {
          elementRef.current.removeEventListener(Events.CAMERA_MODIFIED, () => {});
        }
        
        const renderingEngine = getRenderingEngine(renderingEngineId);
        if (renderingEngine) {
          renderingEngine.destroy();
        }
      };
    }, []);
  
    const handlePlay = async () => {
      if (viewport) {
        await viewport.play();
      }
    };
  
    const handlePause = async () => {
      if (viewport) {
        await viewport.pause();
      }
    };
  
    // Instead of using setViewPresentation directly, use setRotation which is safer
    const handleRotateRight = () => {
      if (viewport) {
        try {
          // Try to get the current rotation first
          let currentRotation = 0;
          try {
            currentRotation = viewport.getViewPresentation()?.rotation || 0;
          } catch (error) {
            console.warn("Could not get current rotation, using default");
          }
          
          // Calculate new rotation
          const newRotation = (currentRotation + 90) % 360;
          
          // Apply rotation directly using reset method
          viewport.resetCamera();
          setRotation(newRotation);
          
          // Apply rotation through camera transform
          const { flipHorizontal, flipVertical } = viewport.getCamera();
          
          // Use a matrix transform approach instead of setViewPresentation
          viewport.setCamera({
            flipHorizontal,
            flipVertical,
            rotationDegrees: newRotation // Some implementations use rotationDegrees instead
          });
          
          viewport.render();
        } catch (error) {
          console.error("Error rotating video:", error);
        }
      }
    };
  
    const handleRotateLeft = () => {
      if (viewport) {
        try {
          // Try to get the current rotation first
          let currentRotation = 0;
          try {
            currentRotation = viewport.getViewPresentation()?.rotation || 0;
          } catch (error) {
            console.warn("Could not get current rotation, using default");
          }
          
          // Calculate new rotation
          const newRotation = (currentRotation - 90 + 360) % 360;
          
          // Apply rotation directly using reset method
          viewport.resetCamera();
          setRotation(newRotation);
          
          // Apply rotation through camera transform
          const { flipHorizontal, flipVertical } = viewport.getCamera();
          
          // Use a matrix transform approach instead of setViewPresentation
          viewport.setCamera({
            flipHorizontal,
            flipVertical,
            rotationDegrees: newRotation // Some implementations use rotationDegrees instead
          });
          
          viewport.render();
        } catch (error) {
          console.error("Error rotating video:", error);
        }
      }
    };
  
    const handleFlipHorizontal = () => {
      if (viewport) {
        try {
          const camera = viewport.getCamera();
          viewport.setCamera({
            ...camera,
            flipHorizontal: !camera.flipHorizontal,
          });
          viewport.render();
        } catch (error) {
          console.error("Error flipping video horizontally:", error);
        }
      }
    };
  
    const handleFlipVertical = () => {
      if (viewport) {
        try {
          const camera = viewport.getCamera();
          viewport.setCamera({
            ...camera,
            flipVertical: !camera.flipVertical,
          });
          viewport.render();
        } catch (error) {
          console.error("Error flipping video vertically:", error);
        }
      }
    };
  
    return (
      <div className="video-stack-container">
        <div
          ref={elementRef}
          style={{
            width: "500px",
            height: "500px",
            position: "relative",
          }}
        ></div>
        
        <div className="controls">
          <div className="playback-controls">
            <button onClick={handlePlay}>Play</button>
            <button onClick={handlePause}>Pause</button>
          </div>
          
          <div className="transform-controls">
            <button onClick={handleRotateLeft}>Rotate Left</button>
            <button onClick={handleRotateRight}>Rotate Right</button>
            <button onClick={handleFlipHorizontal}>Flip Horizontal</button>
            <button onClick={handleFlipVertical}>Flip Vertical</button>
          </div>
          
          <div className="info-display">
            <div>Rotation: {rotation}°</div>
            <div>Flip Horizontal: {flipHorizontal ? "Yes" : "No"}</div>
            <div>Flip Vertical: {flipVertical ? "Yes" : "No"}</div>
          </div>
        </div>
      </div>
    );
  }
  
  export default VideoStack;