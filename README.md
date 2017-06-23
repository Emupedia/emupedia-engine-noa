
# noa-engine

An experimental voxel engine.

[Live demo of test app here!](http://andyhall.github.io/noa-testbed/)

### Usage

Under active development, best way to try it is to clone and hack on it:

```sh
(clone this repo)
cd noa
npm install
npm start       # runs /docs/hello-world
npm test        # runs /docs/test
```

Live versions of the test content: 
 * [hello-world example](http://andyhall.github.io/noa/hello-world/)
 * [test example](http://andyhall.github.io/noa/test/)

To build a new world app, use `noa` as a dependency:

```sh
npm install --save noa-engine
```

```js
var engine = require('noa-engine')
var noa = engine({
    inverseY: true,
    // see source or /docs/ examples for more options and usage
})
```

### Status, contributing, etc.

This library attempts to be something you can build a voxel game on top of. 
It's not a fully-featured game engine; it just tries to manage the painful parts 
of using voxels (e.g. chunking, meshing), and certain things that are 
tightly coupled to voxel implementation (e.g. physics), 
and otherwise stay out of your way.

Contributions are welcome! But please open an issue before building any 
nontrivial new features. I want to keep this library lean if I can, 
so if your idea could be done as a separate module then that's probably what I'll suggest.

### Docs

The source is pretty fully commented. There is a partial API reference 
at the end of this file, but I haven't been able to find a good way of 
generating JSDocs that I can live with, so for now it's best to consult 
the source.

### Recent changes:

 * 0.22.0
   * Removed redundant `player` component - use `noa.playerEntity` property
   * Added `showFPS` option
   * Many internal changes that hopefully didn't break compatibility
 * 0.21.0
   * Support unloading/reloading new world data.  
     Sample implementation in the `docs/test` app (hit "O" to swap world data)
 * 0.20.0
   * Near chunks get loaded and distant ones get unloaded faster and more sensibly
   * Greatly speeds up chunk init, meshing, and disposal (and fixes some new Chrome deopts)
 * 0.19.0
   * Revise per-block callbacks:
     * `onLoad` when a block is created as part of a newly-loaded chunk  
     * `onUnload` - when the block goes away because its chunk was unloaded
     * `onSet` - when a block gets set to that particular id
     * `onUnset` - when a block that had that id gets set to something else
     * `onCustomMeshCreate` - when that block's custom mesh is instantiated (either due to load or set)
 * 0.18.0
   * Simplifies block targeting. Instead of several accessor methods, now there's a persistent `noa.targetedBlock` with details on whatever block is currently targeted.
   * `noa` now emits `targetBlockChanged`
   * Built-in block highlighting can now be overridden or turned off with option `skipDefaultHighlighting`
 * 0.17.0
   * Adds per-block callbacks: `onCreate`, `onDestroy`, `onCustomMeshCreate`
 * 0.16.0
   * Simplifies block registration - now takes an options argument, and the same API is used for custom mesh blocks
   * Removes the idea of registration for meshes

----

## Partial API reference:


(docs currently broken by some weird npm+markdox issue..)


