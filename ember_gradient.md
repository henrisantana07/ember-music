Documentation
Kawarp is a zero-dependency, WebGL-powered library for creating fluid, animated background effects similar to Apple Music's album art visualization. It uses Kawase blur for efficient, high-quality blurring and simplex noise-based domain warping for organic motion. The library is optimized for performance with blur operations running on small textures only when the image changes, while per-frame rendering is minimal.

Installation
npm
yarn
pnpm
bun
$
 
npm
 
install
 @kawarp/core

Quick Start
import { Kawarp } from '@kawarp/core';

const canvas = document.querySelector('canvas');
const kawarp = new Kawarp(canvas);

await kawarp.loadImage('path/to/image.jpg');
kawarp.start();

Options
Option	Type	Default	Description
warpIntensity	number	1.0	Warp effect strength (0-1)
blurPasses	number	8	Kawase blur passes (0-40, 0 skips the blur)
animationSpeed	number	1.0	Animation speed multiplier (0-16)
transitionDuration	number	1000	Crossfade duration in ms
saturation	number	1.5	Color saturation multiplier
tintColor	[r, g, b]	[0.16, 0.16, 0.24]	Tint color for dark areas (0-1)
tintIntensity	number	0.15	Tint effect strength (0-1)
dithering	number	0.008	Dithering strength (0-0.1)
scale	number	1.0	Overall zoom level of the effect (0.01-4)
highPrecisionInput	boolean	false	Float32 history for smoothed video (creation only)
highPrecisionOutput	boolean	false	Float16 drawing buffer (creation only)
Methods
loadImage(url)
Load image from URL
loadGradient(colors, angle?)
Load gradient as source
loadBlob(blob)
Load from Blob or File
loadVideo(video, options?)
Follow a playing video
unloadVideo()
Stop following, keep last frame
sampleSource(size?)
Small RGBA thumbnail of the source
start()
Start animation
stop()
Stop animation
resize()
Update dimensions
dispose()
Clean up resources
Still frames without WebGL
@kawarp/core/frame draws one frame on the CPU, for servers and build steps that have no WebGL. The output matches renderFrame(time).

import { frame } from '@kawarp/core/frame';

// RGBA pixels in, RGBA pixels out
const pixels = frame(rgba, width, height, 1200, 630, {
  warpIntensity: 0.9,
  saturation: 1.4,
  time: 12,
});

React
Angular
Installation
npm
yarn
pnpm
bun
$
 
npm
 
install
 @kawarp/react

Basic Usage
import { Kawarp } from '@kawarp/react';

function App() {
  return (
    <Kawarp
      src="/image.jpg"
      warpIntensity={0.8}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}

useKawarp Hook
For operations that can't be done via props—like loading from files, blobs, or gradients—use the useKawarp hook.

import { Kawarp, useKawarp } from '@kawarp/react';

function App() {
  const { ref, loadImage, loadBlob } = useKawarp();

  const handleUpload = async (file: File) => {
    await loadBlob(file);
  };

  return (
    <>
      <Kawarp ref={ref} src="/initial.jpg" />
      <button onClick={() => loadImage('/new.jpg')}>
        Load New Image
      </button>
    </>
  );
}

Component Props
All core options are available as props, plus React-specific ones:

Option	Type	Default	Description
src	string	-	Image URL (auto-loads on change)
video	HTMLVideoElement	-	Playing video to follow, takes precedence over src
videoOptions	KawarpVideoOptions	-	Sample size, frame rate, and smoothing
autoPlay	boolean	true	Auto-start animation
onLoad	() => void	-	Called when image loads
onError	(error) => void	-	Called on load error
className	string	-	Container class name
style	CSSProperties	-	Container styles