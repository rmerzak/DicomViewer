import React, { useEffect, useRef, useState } from 'react';
import { RenderingEngine, metaData, Enums, Types, init as csInit, } from '@cornerstonejs/core';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as cornerstoneTools from '@cornerstonejs/tools';
import { PanTool, WindowLevelTool, StackScrollTool, ZoomTool, ToolGroupManager, init as csToolsInit, } from '@cornerstonejs/tools';
import { initDemo } from '../../helpers';
import uids from './index';
import { PublicViewportInput } from '@cornerstonejs/core/types';

async function prefetchMetadataInformation(imageIdsToPrefetch) {
    for (let i = 0; i < imageIdsToPrefetch.length; i++) {
        await cornerstoneDICOMImageLoader.wadouri.loadImage(imageIdsToPrefetch[i])
            .promise;
    }
}

function getFrameInformation(imageId) {
    if (imageId.includes('wadors:')) {
        const frameIndex = imageId.indexOf('/frames/');
        const imageIdFrameless =
            frameIndex > 0 ? imageId.slice(0, frameIndex + 8) : imageId;
        return {
            frameIndex,
            imageIdFrameless,
        };
    } else {
        const frameIndex = imageId.indexOf('&frame=');
        let imageIdFrameless =
            frameIndex > 0 ? imageId.slice(0, frameIndex + 7) : imageId;
        if (!imageIdFrameless.includes('&frame=')) {
            imageIdFrameless = imageIdFrameless + '&frame=';
        }
        return {
            frameIndex,
            imageIdFrameless,
        };
    }
}

function convertMultiframeImageIds(imageIds) {
    const newImageIds = [];
    imageIds.forEach((imageId) => {
        const { imageIdFrameless } = getFrameInformation(imageId);
        const instanceMetaData = metaData.get('multiframeModule', imageId);
        if (
            instanceMetaData &&
            instanceMetaData.NumberOfFrames &&
            instanceMetaData.NumberOfFrames > 1
        ) {
            const NumberOfFrames = instanceMetaData.NumberOfFrames;
            for (let i = 0; i < NumberOfFrames; i++) {
                const newImageId = imageIdFrameless + (i + 1);
                newImageIds.push(newImageId);
            }
        } else {
            newImageIds.push(imageId);
        }
    });
    return newImageIds;
}

const {
    Enums: csToolsEnums,
    utilities: csToolsUtilities,
} = cornerstoneTools;
const { MouseBindings } = csToolsEnums;
const { ViewportType } = Enums;

const cineUtils = {
    playClip: (element, options = {}) => {
        if (!element) {
            throw new Error('playClip: element must not be undefined');
        }
        
        const enabledElement = cornerstone.getEnabledElement(element);
        if (!enabledElement) {
            throw new Error('playClip: element must be a valid Cornerstone enabled element');
        }
        
        const { viewport } = enabledElement;
        if (!viewport || !(viewport instanceof cornerstone.StackViewport)) {
            throw new Error('playClip: viewport must be a valid StackViewport');
        }
        
        // Stop any existing playback
        cineUtils.stopClip(element);
        
        // Get the stack size
        const stackSize = viewport.getImageIds().length;
        if (stackSize <= 1) {
            console.warn('CINE: Stack has only one frame, cannot play CINE');
            return;
        }
        
        // Store the interval ID on the element
        const framesPerSecond = options.framesPerSecond || 10;
        const intervalTime = 1000 / framesPerSecond;
        
        const intervalId = setInterval(() => {
            const currentIndex = viewport.getCurrentImageIdIndex();
            const newIndex = (currentIndex + 1) % stackSize;
            viewport.setImageIdIndex(newIndex);
            viewport.render();
            
            // Trigger a custom event that can be listened to
            const customEvent = new CustomEvent('cornerstonecineplay', {
                detail: {
                    element,
                    currentImageIdIndex: newIndex
                }
            });
            element.dispatchEvent(customEvent);
        }, intervalTime);
        
        // Store the interval ID on the element
        element.dataset.cineIntervalId = intervalId.toString();
        
        // Trigger a custom event for playback started
        const startEvent = new CustomEvent('cornerstonecinestart', {
            detail: {
                element,
                framesPerSecond
            }
        });
        element.dispatchEvent(startEvent);
        
        return framesPerSecond;
    },
    
    stopClip: (element) => {
        if (!element) {
            return;
        }
        
        // Clear the interval if it exists
        const intervalId = element.dataset.cineIntervalId;
        if (intervalId) {
            clearInterval(parseInt(intervalId, 10));
            delete element.dataset.cineIntervalId;
            
            // Trigger a custom event for playback stopped
            const stopEvent = new CustomEvent('cornerstone-cine-stop', {
                detail: { element }
            });
            element.dispatchEvent(stopEvent);
        }
    },
    
    isPlaying: (element) => {
        return !!element?.dataset.cineIntervalId;
    }
};

const toolGroupId = 'myToolGroup';
const renderingEngineId = 'myRenderingEngine';
const viewportId = 'CT_STACK';
const defaultFramesPerSecond = 24;

function DicomStack() {
    const elementRef = useRef(null);
    const [viewportInstance, setViewportInstance] = useState(null);
    const [framesPerSecond, setFramesPerSecond] = useState(defaultFramesPerSecond);
    const [renderingEngine, setRenderingEngine] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentStackIndex, setCurrentStackIndex] = useState(0);
    const [stackSize, setStackSize] = useState(0);

    useEffect(() => {
        const element = elementRef.current;
        
        const run = async () => {
            await initDemo();

            cornerstoneTools.addTool(WindowLevelTool);
            cornerstoneTools.addTool(PanTool);
            cornerstoneTools.addTool(ZoomTool);
            cornerstoneTools.addTool(StackScrollTool);

            const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
            toolGroup.addTool(WindowLevelTool.toolName);
            toolGroup.addTool(PanTool.toolName);
            toolGroup.addTool(ZoomTool.toolName);
            toolGroup.addTool(StackScrollTool.toolName);

            toolGroup.setToolActive(WindowLevelTool.toolName, {
                bindings: [{ mouseButton: MouseBindings.Primary }],
            });
            toolGroup.setToolActive(PanTool.toolName, {
                bindings: [{ mouseButton: MouseBindings.Auxiliary }],
            });
            toolGroup.setToolActive(ZoomTool.toolName, {
                bindings: [{ mouseButton: MouseBindings.Secondary }],
            });
            toolGroup.setToolActive(StackScrollTool.toolName, {
                bindings: [{ mouseButton: MouseBindings.Wheel }],
            });

            const engine = new RenderingEngine(renderingEngineId);
            setRenderingEngine(engine);

            const viewportInput = {
                element: element,
                viewportId,
                type: ViewportType.STACK,
                defaultOptions: {
                    background: [0.2, 0, 0.2],
                },
            };

            engine.enableElement(viewportInput);
            const viewport = engine.getViewport(viewportId);
            setViewportInstance(viewport);
            toolGroup.addViewport(viewportId, renderingEngineId);
        };

        run();

        const handleFileSelect = async (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            const file = evt.dataTransfer.files[0];
            const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
            await loadAndViewImage(imageId);
        };

        const handleDragOver = (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            evt.dataTransfer.dropEffect = 'copy';
        };

        element.addEventListener('dragover', handleDragOver);
        element.addEventListener('drop', handleFileSelect);

        return () => {
            element.removeEventListener('dragover', handleDragOver);
            element.removeEventListener('drop', handleFileSelect);

            // Stop CINE playback if it's running
            if (isPlaying && element) {
                cineUtils.stopClip(element);
            }

            // Clean up rendering engine
            if (renderingEngine) {
                renderingEngine.disableElement(viewportId);
            }
        };
    }, [isPlaying]);

    const loadAndViewImage = async (imageId) => {
        if (!viewportInstance) return;

        // Stop any active playback
        stopPlayback();

        await prefetchMetadataInformation([imageId]);
        const stack = convertMultiframeImageIds([imageId]);
        await viewportInstance.setStack(stack);
        setStackSize(stack.length);
        setCurrentStackIndex(0);
        viewportInstance.render();

        const imageData = viewportInstance.getImageData();
        const imageMetadata = metaData.get('imagePixelModule', imageId);
        const voiLutModule = metaData.get('voiLutModule', imageId);
        const sopCommonModule = metaData.get('sopCommonModule', imageId);
        const transferSyntax = metaData.get('transferSyntax', imageId);

        // Update the DOM with metadata information
        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.innerHTML = value;
        };

        updateElement('transfersyntax', transferSyntax.transferSyntaxUID);
        updateElement('sopclassuid', `${sopCommonModule.sopClassUID} [${uids[sopCommonModule.sopClassUID]}]`);
        updateElement('sopinstanceuid', sopCommonModule.sopInstanceUID);
        updateElement('rows', imageData.dimensions[0]);
        updateElement('columns', imageData.dimensions[1]);
        updateElement('spacing', imageData.spacing.join('\\'));
        updateElement('direction', imageData.direction.map((x) => Math.round(x * 100) / 100).join(','));
        updateElement('origin', imageData.origin.map((x) => Math.round(x * 100) / 100).join(','));
        updateElement('modality', imageData.metadata.Modality);
        updateElement('pixelrepresentation', imageMetadata.pixelRepresentation);
        updateElement('bitsallocated', imageMetadata.bitsAllocated);
        updateElement('bitsstored', imageMetadata.bitsStored);
        updateElement('highbit', imageMetadata.highBit);
        updateElement('photometricinterpretation', imageMetadata.photometricInterpretation);
        updateElement('windowcenter', voiLutModule.windowCenter);
        updateElement('windowwidth', voiLutModule.windowWidth);
    };

    // CINE playback functions using our custom CINE utilities
    const startPlayback = () => {
        if (!elementRef.current || stackSize <= 1) return;

        try {
            console.log("Starting CINE playback at", framesPerSecond, "fps");
            cineUtils.playClip(elementRef.current, { framesPerSecond });
            setIsPlaying(true);
            
            // Add event listener to update the current index
            elementRef.current.addEventListener('cornerstonecineplay', (event) => {
                setCurrentStackIndex(event.detail.currentImageIdIndex);
            });
        } catch (error) {
            console.error("Error starting CINE playback:", error);
            setIsPlaying(false);
        }
    };

    const stopPlayback = () => {
        if (!elementRef.current) return;

        try {
            console.log("Stopping CINE playback");
            cineUtils.stopClip(elementRef.current);
            setIsPlaying(false);
            
            // Remove event listener
            elementRef.current.removeEventListener('cornerstonecineplay', null);
        } catch (error) {
            console.error("Error stopping CINE playback:", error);
        }
    };

    const handleFramesPerSecondChange = (value) => {
        setFramesPerSecond(value);
        
        // If already playing, update the playback speed
        if (isPlaying && elementRef.current) {
            try {
                // Restart with new framerate
                cineUtils.stopClip(elementRef.current);
                cineUtils.playClip(elementRef.current, { framesPerSecond: value });
            } catch (error) {
                console.error("Error updating CINE framerate:", error);
            }
        }
    };

    // When the viewport changes images, update our current index
    useEffect(() => {
        if (viewportInstance) {
            const updateCurrentIndex = () => {
                const index = viewportInstance.getCurrentImageIdIndex();
                if (index !== undefined && index !== null) {
                    setCurrentStackIndex(index);
                }
            };

            // Set up event listener for stack scroll
            const element = elementRef.current;
            if (element) {
                element.addEventListener('cornerstoneimagerendered', updateCurrentIndex);
            }

            return () => {
                if (element) {
                    element.removeEventListener('cornerstoneimagerendered', updateCurrentIndex);
                }
            };
        }
    }, [viewportInstance]);

    return (
        <div>
            <div
                id="cornerstone-element"
                ref={elementRef}
                style={{ width: '512px', height: '512px', position: 'relative' }}
            ></div>
            <input
                type="file"
                id="selectFile"
                onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
                        loadAndViewImage(imageId);
                    }
                }}
            />
            <div>
                <button
                    onClick={isPlaying ? stopPlayback : startPlayback}
                    disabled={stackSize <= 1}
                >
                    {isPlaying ? 'Stop Clip' : 'Play Clip'}
                </button>
                <input
                    type="range"
                    min="1"
                    max="60"
                    value={framesPerSecond}
                    onChange={(e) => handleFramesPerSecondChange(Number(e.target.value))}
                />
                <span>Frames per second: {framesPerSecond}</span>
                {stackSize > 0 && (
                    <div>
                        <span>Frame: {currentStackIndex + 1} / {stackSize}</span>
                    </div>
                )}
            </div>

            {/* Metadata display table */}
            <div style={{ marginTop: '20px' }}>
                <h3>DICOM Metadata</h3>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                    <tbody>
                        <tr><td>Transfer Syntax</td><td id="transfersyntax"></td></tr>
                        <tr><td>SOP Class UID</td><td id="sopclassuid"></td></tr>
                        <tr><td>SOP Instance UID</td><td id="sopinstanceuid"></td></tr>
                        <tr><td>Rows</td><td id="rows"></td></tr>
                        <tr><td>Columns</td><td id="columns"></td></tr>
                        <tr><td>Spacing</td><td id="spacing"></td></tr>
                        <tr><td>Direction</td><td id="direction"></td></tr>
                        <tr><td>Origin</td><td id="origin"></td></tr>
                        <tr><td>Modality</td><td id="modality"></td></tr>
                        <tr><td>Pixel Representation</td><td id="pixelrepresentation"></td></tr>
                        <tr><td>Bits Allocated</td><td id="bitsallocated"></td></tr>
                        <tr><td>Bits Stored</td><td id="bitsstored"></td></tr>
                        <tr><td>High Bit</td><td id="highbit"></td></tr>
                        <tr><td>Photometric Interpretation</td><td id="photometricinterpretation"></td></tr>
                        <tr><td>Window Center</td><td id="windowcenter"></td></tr>
                        <tr><td>Window Width</td><td id="windowwidth"></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default DicomStack;