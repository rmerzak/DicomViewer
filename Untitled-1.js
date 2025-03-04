
// function BlindSweep({mode = BlindSweepMode.RECORD, uploader}: BlindSweep) {
//   const [sweeps, setSweeps] = useState<Sweep[]>([
//     { id: 'A', name: 'Sweep A', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//     { id: 'B', name: 'Sweep B', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//     { id: 'C', name: 'Sweep C', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//     { id: 'D', name: 'Sweep D', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//     { id: 'E', name: 'Sweep E', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//     { id: 'F', name: 'Sweep F', recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null },
//   ]);
//   const [activeSweep, setActiveSweep] = useState<string | null>(null);
//   const [stream, setStream] = useState<MediaStream | null>(null);
//   const [isRecording, setIsRecording] = useState(false);
//   const [selectedSweep, setSelectedSweep] = useState<string | null>(null);
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const recordedVideoRef = useRef<HTMLVideoElement>(null);
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordingChunksRef = useRef<Blob[]>([]);
//   const animationFrameRef = useRef<number | null>(null);
//   const timerEndTimeRef = useRef<number | null>(null);
//   const recordingStartTimeRef = useRef<number | null>(null);

//   useEffect(() => {
//     const initializeStream = async () => {
//       try {
//         const newStream = await navigator.mediaDevices.getDisplayMedia({
//           video: { frameRate: { ideal: 30 } },
//           audio: false,
//         });
//         setStream(newStream);
//         if (videoRef.current) {
//           videoRef.current.srcObject = newStream;
//         }
//       } catch (err) {
//         console.error('Error sharing screen:', err);
//       }
//     };
//     initializeStream();

//     return () => {
//       if (stream) {
//         stream.getTracks().forEach(track => track.stop());
//       }
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//         mediaRecorderRef.current.stop();
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (selectedSweep) {
//       const sweep = sweeps.find(s => s.id === selectedSweep);
//       if (sweep?.videoData && recordedVideoRef.current) {
//         recordedVideoRef.current.src = sweep.videoData;
//         recordedVideoRef.current.play().catch(err => console.error('Error playing video:', err));
//       }
//     }
//   }, [selectedSweep, sweeps]);

//   const startRecording = (id: string) => {
//     if (!stream) {
//       console.error('No stream available for recording');
//       return;
//     }
//     const sweep = sweeps.find(s => s.id === id);
//     if (!sweep) return;
//     const durationInSeconds = sweep.timer;
//     recordingStartTimeRef.current = performance.now();
//     recordingChunksRef.current = [];
//     try {
//       const mediaRecorder = new MediaRecorder(stream, {
//         mimeType: 'video/webm;codecs=vp8,opus',
//         videoBitsPerSecond: 1000000
//       });
//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data && event.data.size > 0) {
//           recordingChunksRef.current.push(event.data);
//         }
//       };
//       mediaRecorder.onstop = () => {
//         const videoBlob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
//         const videoUrl = URL.createObjectURL(videoBlob);
//         let actualDuration = 0;
//         if (recordingStartTimeRef.current) {
//           actualDuration = (performance.now() - recordingStartTimeRef.current) / 1000;
//           console.log(`Actual recording duration: ${actualDuration.toFixed(2)} seconds`);
//         }
//         setSweeps(prevSweeps =>
//           prevSweeps.map(s =>
//             s.id === id
//               ? { ...s, recording: false, completed: true, videoData: videoUrl, timer: 0, displayTimer: 0 }
//               : s
//           )
//         );
//         setIsRecording(false);
//         setActiveSweep(null);
//         if (animationFrameRef.current) {
//           cancelAnimationFrame(animationFrameRef.current);
//           animationFrameRef.current = null;
//         }
//         mediaRecorderRef.current = null;
//         timerEndTimeRef.current = null;
//         recordingStartTimeRef.current = null;
//       };
//       mediaRecorder.onerror = (event) => {
//         console.error('MediaRecorder error:', event);
//         stopRecording();
//       };
//       mediaRecorder.start(100);
//       mediaRecorderRef.current = mediaRecorder;
//       setSweeps(prevSweeps =>
//         prevSweeps.map(s => (s.id === id ? { ...s, recording: true, displayTimer: 10 } : s))
//       );
//       setActiveSweep(id);
//       setSelectedSweep(id);
//       setIsRecording(true);
//       const startTime = performance.now();
//       timerEndTimeRef.current = startTime + (durationInSeconds * 1000);
//       const updateTimer = (timestamp: number) => {
//         if (!timerEndTimeRef.current) return;
//         const remainingMs = timerEndTimeRef.current - timestamp;
//         const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
//         const displaySec = Math.max(0, remainingSec - 1);
//         setSweeps(prevSweeps =>
//           prevSweeps.map(sweep => {
//             if (sweep.id === id && sweep.recording) {
//               return { ...sweep, timer: remainingSec, displayTimer: displaySec };
//             }
//             return sweep;
//           })
//         );
//         if (remainingMs <= 0) {
//           if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//             mediaRecorderRef.current.stop();
//           }
//           return;
//         }
//         animationFrameRef.current = requestAnimationFrame(updateTimer);
//       };
//       animationFrameRef.current = requestAnimationFrame(updateTimer);
//       const exactDuration = durationInSeconds * 1000;
//       setTimeout(() => {
//         if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//           console.log(`Stopping recording after precise timing: ${exactDuration}ms`);
//           mediaRecorderRef.current.stop();
//         }
//       }, exactDuration);
//     } catch (error) {
//       console.error('Error setting up MediaRecorder:', error);
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//       mediaRecorderRef.current.stop();
//     }
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }
//     timerEndTimeRef.current = null;
//     recordingStartTimeRef.current = null;
//   };

//   const resetSweep = (id: string) => {
//     const sweep = sweeps.find(s => s.id === id);
//     if (sweep?.videoData) {
//       URL.revokeObjectURL(sweep.videoData);
//     }

//     setSweeps(prevSweeps =>
//       prevSweeps.map(sweep =>
//         sweep.id === id
//           ? { ...sweep, recording: false, timer: 11, displayTimer: 10, completed: false, videoData: null }
//           : sweep
//       )
//     );

//     if (activeSweep === id) {
//       stopRecording();
//     }

//     if (selectedSweep === id) {
//       setSelectedSweep(null);
//     }
//   };

//   const resetAll = () => {
//     sweeps.forEach(sweep => {
//       if (sweep.videoData) {
//         URL.revokeObjectURL(sweep.videoData);
//       }
//     });

//     stopRecording();

//     setSweeps(prevSweeps =>
//       prevSweeps.map(sweep => ({
//         ...sweep,
//         recording: false,
//         timer: 11,
//         displayTimer: 10,
//         completed: false,
//         videoData: null,
//       }))
//     );

//     setActiveSweep(null);
//     setSelectedSweep(null);
//     setIsRecording(false);
//   };

//   const toggleRecording = (id: string) => {
//     const sweep = sweeps.find(s => s.id === id);
//     if (!sweep || sweep.completed || isRecording) return;

//     startRecording(id);
//   };

//   const findNextAvailableSweep = () => {
//     return sweeps.find(s => !s.completed);
//   };

//   const startNextRecording = () => {
//     if (isRecording) {
//       stopRecording();
//       return;
//     }

//     const nextSweep = findNextAvailableSweep();
//     if (nextSweep) {
//       toggleRecording(nextSweep.id);
//     }
//   };

//   const allSweepsCompleted = !sweeps.some(s => !s.completed);

//   const currentSweep = selectedSweep ? sweeps.find(s => s.id === selectedSweep) : null;
//   const showRecordedVideo = selectedSweep && currentSweep?.videoData;

//   return (
//     <>
//       <div className="mx-auto flex h-full w-full flex-col bg-white rounded-lg shadow-lg p-6">
//       <div className="mb-4 flex h-16 justify-between">
//         <Button variant="outline" className="text-blue-600">
//           Return
//         </Button>
//         <div>
//           <Button variant="outline" className="text-blue-600 mx-2">
//             Exam Info
//           </Button>
//           <Button variant="outline" className="text-blue-600">
//             Report
//           </Button>
//         </div>
//       </div>

//       <div className="flex min-h-0 flex-1 gap-6">
//         <div className="flex h-full w-[300px] flex-col space-y-4">
//           <div className="flex-1 rounded-lg bg-blue-100 p-4">
//             <h2 className="mb-4 rounded bg-blue-200 py-2 text-center text-xl font-semibold text-blue-800">Sweeps</h2>
//             <div className="space-y-3">
//               {sweeps.map((sweep) => (
//                 <div
//                   key={sweep.id}
//                   className={`flex items-center justify-between rounded-lg bg-white p-3 ${
//                     selectedSweep === sweep.id ? "ring-2 ring-blue-500" : ""
//                   } ${sweep.completed ? "bg-blue-50" : ""}`}
//                 >
//                   <span
//                     className={`cursor-pointer text-lg ${sweep.completed ? "font-semibold" : ""}`}
//                     onClick={() => setSelectedSweep(sweep.id)}
//                   >
//                     {sweep.name} {sweep.completed && "✓"}
//                   </span>
//                   <div className="flex items-center gap-2">
//                     <Button size="sm" variant="outline" className="p-2" onClick={() => resetSweep(sweep.id)}>
//                       <RotateCcw className="h-4 w-4" />
//                     </Button>
//                     <Button
//                       size="sm"
//                       variant={sweep.completed || isRecording ? "secondary" : "default"}
//                       className="p-2"
//                       onClick={() => !sweep.completed && !isRecording && toggleRecording(sweep.id)}
//                       disabled={sweep.completed || isRecording}
//                     >
//                       {sweep.recording ? <Stop className="h-4 w-4" /> : <Play className="h-4 w-4" />}
//                     </Button>
//                     <span
//                       className={`w-12 text-center font-mono ${sweep.displayTimer === 0 ? "font-bold text-green-600" : ""}`}
//                     >
//                       {sweep.displayTimer.toString().padStart(2, "0")}s
//                     </span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <Button variant="outline" className="w-full flex items-center justify-center" icon={
//             <Rocket className="mr-2 h-4 w-4" />
//           }>
//             AI Predict
//           </Button>
//         </div>

//         <div className="flex h-full flex-1 flex-col space-y-4">
//           <div className="mb-2 flex justify-between">
//             <Button variant="outline" onClick={resetAll}>
//               Reset All
//             </Button>
//             <Button
//               variant={isRecording ? "destructive" : "default"}
//               onClick={startNextRecording}
//               disabled={allSweepsCompleted && !isRecording}
//             >
//               {isRecording ? "Stop Recording" : "Start Recording"}
//             </Button>
//           </div>
//           <div className="relative aspect-video flex-1 overflow-hidden rounded-lg bg-blue-50">
//             <div className="relative h-full w-full">
//               <video
//                 ref={recordedVideoRef}
//                 className="absolute inset-0 h-full w-full"
//                 controls
//                 crossOrigin="anonymous"
//                 playsInline
//                 style={{ display: showRecordedVideo ? "block" : "none" }}
//               />
//               <video
//                 ref={videoRef}
//                 className="absolute inset-0 h-full w-full"
//                 autoPlay
//                 muted
//                 style={{ display: !showRecordedVideo ? "block" : "none" }}
//               />
//             </div>
//             {isRecording && (
//                 <div className="absolute top-4 right-4 animate-pulse rounded-full bg-red-500 px-3 py-1 text-white">
//                   Recording {activeSweep && sweeps.find(s => s.id === activeSweep)?.name}
//                   <span className="ml-2 font-mono">
//                     {activeSweep && sweeps.find(s => s.id === activeSweep)?.displayTimer}s
//                   </span>
//                 </div>
//               )}
//           </div>
//           <div className="mt-4 flex justify-between">
//             <Button
//               variant="outline"
//               onClick={() => {
//                 if (selectedSweep) {
//                   const currentIndex = sweeps.findIndex((s) => s.id === selectedSweep)
//                   if (currentIndex > 0) {
//                     const prevSweep = sweeps[currentIndex - 1]
//                     setSelectedSweep(prevSweep.id)
//                   }
//                 }
//               }}
//               className='flex items-center justify-center'
//               disabled={!selectedSweep || sweeps.findIndex((s) => s.id === selectedSweep) === 0}
//             >
//               <ArrowLeft className="mr-2 h-4 w-4" />
//               Previous Sweep
//             </Button>
//             <Button
//               variant="outline"
//               onClick={() => {
//                 if (selectedSweep) {
//                   const currentIndex = sweeps.findIndex((s) => s.id === selectedSweep)
//                   if (currentIndex < sweeps.length - 1) {
//                     const nextSweep = sweeps[currentIndex + 1]
//                     setSelectedSweep(nextSweep.id)
//                   }
//                 }
//               }}
//               className='flex items-center justify-center'
//               disabled={!selectedSweep || sweeps.findIndex((s) => s.id === selectedSweep) === sweeps.length - 1}
//             >
//               Next Sweep
//               <ArrowRight className="ml-2 h-4 w-4" />
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//     </>
//   );
// }

// export default BlindSweep;
