

import initProviders from './initProviders';
import initVolumeLoader from './initVolumeLoader';
import {
    init as csRenderInit,
    imageLoader,
    volumeLoader,
    metaData,
} from '@cornerstonejs/core';
import * as cornerstoneTools from '@cornerstonejs/tools';
import * as cornerstone from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import * as polySeg from '@cornerstonejs/polymorphic-segmentation';

window.cornerstone = cornerstone;
window.cornerstoneTools = cornerstoneTools;

export default async function initDemo(config) {
    initProviders();
    cornerstoneDICOMImageLoader.init({
        maxWebWorkers: 4,
        decodeConfig: {
            usePDFJS: false,
            strict: false,
        }
      });
    initVolumeLoader();
    await csRenderInit({
        peerImport,
        ...(config?.core ? config.core : {}),
    });
    await csToolsInit({
        addons: {
            polySeg,
        },
    });
}

export async function peerImport(moduleId) {
    if (moduleId === 'dicom-microscopy-viewer') {
        return importGlobal(
            '/dicom-microscopy-viewer/dicomMicroscopyViewer.min.js',
            'dicomMicroscopyViewer'
        );
    }
}

async function importGlobal(path, globalName) {
    await import(/* @vite-ignore */ path);
    return window[globalName];
}