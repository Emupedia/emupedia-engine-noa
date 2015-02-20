
var ndarray = require('ndarray')
var aabb = require('aabb-3d')
var vec3 = require('gl-vec3')
var createContainer = require('./lib/container')
var createRendering = require('./lib/rendering')
var createWorld = require('./lib/world')
var createMesher = require('./lib/mesher')
var createInputs = require('./lib/inputs')
var createPhysics = require('./lib/physics')
var createControls = require('./lib/controls')
var raycast = require('voxel-raycast')

module.exports = Engine

function Engine(opts) {
  if (!(this instanceof Engine)) return new Engine(opts)

  // container (html/div) manager
  this.container = createContainer(this, opts)

  // inputs manager - abstracts key/mouse input
  this.inputs = createInputs(this, opts, this.container._element)

  // create world manager
  this.world = createWorld( this, opts )

  // rendering manager - abstracts all draws to 3D context
  this.rendering = createRendering(this, opts, this.container.canvas)

  // mesh chunk of world data and hand off to renderer
  this.mesher = createMesher( this, opts )

  // physics engine - solves collisions, properties, etc.
  this.physics = createPhysics( this, opts )

  // controls - hooks up input events to physics of player, etc.
  this.controls = createControls( this, opts )




  // Set up plock picking and fire events
  this.blockTestDistance = opts.blockTestDistance || 10

  this._placeBlockID = 2
  this.inputs.down.on('fire',     handleFireEvent.bind(null, this, 1))
  this.inputs.down.on('mid-fire', handleFireEvent.bind(null, this, 2))
  this.inputs.down.on('alt-fire', handleFireEvent.bind(null, this, 3))




  // ad-hoc stuff to set up player and camera
  //  ..this should be modularized somewhere
  var pbox = new aabb( [0,30,0], [2/3, 3/2, 2/3] )
  this.playerBody = this.physics.addBody( {}, pbox )
  this.controls.setTarget( this.playerBody )

  var c = this.rendering._camera
  var accessor = {
    getRotationXY: function() {
      return [ c.rotation.x, c.rotation.y ]
    },
    setRotationXY: function(x,y) {
      c.rotation.x = x
      c.rotation.y = y
    }
  }
  this.controls.setCameraAccessor( accessor )




  // ad-hoc stuff for managing blockIDs and materials
  // this should be modularized into a registry of some kind


  // accessor for mapping block IDs to material ID of a given face
  // dir is a value 0..5: [ +x, -x, +y, -y, +z, -z ]
  this.blockToMaterial = function(id, dir) {
    var m = this.blockMaterialMap[id]
    return (m.length) ? m[dir] : m
  }

  // data structures mapping block IDs to materials/colors
  // array maps block ID to material by face: [ +x, -x, +y, -y, +z, -z ]
  this.blockMaterialMap = [ null ]  // 0: air
  this.materialColors =   [ null ]  // 0: air
  this.materialTextures = [ null ]  // 0: air

  // makeshift registry
  this.defineBlock = function( id, matID ) {
    this.blockMaterialMap[id] = matID
  }
  this.defineMaterial = function( id, col, tex ) {
    this.materialColors[id] = col
    this.materialTextures[id] = tex ? opts.texturePath+tex+'.png' : null
  }

  this.defineBlock( 1, 1 )    // dirt
  this.defineBlock( 2, [3,3,2,1,3,3] ) // grass
  this.defineBlock( 3, 4 )    // stone
  for (var i=4; i<30; i++) {
    this.defineBlock( i, i+1 )
  }

  this.defineMaterial( 1, [1,1,1], "dirt" )
  this.defineMaterial( 2, [1,1,1], "grass" )
  this.defineMaterial( 3, [1,1,1], "grass_dirt" )
  this.defineMaterial( 4, [1,1,1], "cobblestone" )
  for (i=5; i<30; i++) {
    this.defineMaterial( i, [ Math.random(), Math.random(), Math.random() ], null )
  }





  // temp hacks for development

  window.noa = this
  window.ndarray = ndarray
  window.vec3 = vec3
  var debug = false
  this.inputs.bind( 'debug', 'Z' )
  this.inputs.down.on('debug', function() {
    debug = !debug
    if (debug) scene.debugLayer.show(); else scene.debugLayer.hide();
  })



}




/*
 *   Engine API
*/ 




Engine.prototype.tick = function() {
  var dt = getTickTime(this)
  checkForPointerlock(this)
  this.world.tick(dt)        // chunk management
  this.controls.tick(dt)     // applies movement forces
  this.physics.tick(dt)      // iterates physics
  this.doBlockTargeting()    // raycasts to a target block and highlights it
  this.inputs.tick(dt)       // clears cumulative input values
}

Engine.prototype.render = function(dt) {
  this.rendering.render()
}



/*
 *   Utility APIs
*/ 

Engine.prototype.getPlayerPosition = function() {
  var offset = [ 1/3, 0, 1/3 ] // todo: get from entity props
  var pos = vec3.create()
  vec3.add( pos, this.playerBody.aabb.base, offset )
  return pos
}

Engine.prototype.getCameraPosition = function() {
  var offset = [ 1/3, 3/2, 1/3 ] // todo: get from entity props
  var pos = vec3.create()
  vec3.add( pos, this.playerBody.aabb.base, offset )
  return pos
}

Engine.prototype.getCameraVector = function() {
  var crot = this.rendering._camera.rotation
  var cvec = vec3.fromValues( 0,0,1 ) // +z is forward direction
  vec3.rotateX( cvec, cvec, [0,0,0], crot.x )
  vec3.rotateY( cvec, cvec, [0,0,0], crot.y )
  return cvec
}

// Determine which block if any is targeted and within range
Engine.prototype.pick = function(pos, vec, dist) {
  pos = pos || this.getCameraPosition()
  vec = vec || this.getCameraVector()
  dist = dist || this.blockTestDistance
  if (!this._traceRay) this._traceRay = raycast.bind({}, this.world)
  var hitNorm = []
  var hitPos = []
  var hitBlock = this._traceRay(pos, vec, dist, hitPos, hitNorm)
  if (hitBlock) return {
    block: hitBlock,
    position: hitPos,
    normal: hitNorm
  }
  return null
}


// Determine which block if any is targeted and within range
Engine.prototype.doBlockTargeting = function() {
  var result = this.pick()
  var loc = []
  // process and cache results
  if (result) {
    loc = result.position.map(Math.floor)
    var norm = result.normal
    this._blockTargetLoc = loc
    this._blockPlacementLoc = [ loc[0]+norm[0], loc[1]+norm[1], loc[2]+norm[2] ]
  } else {
    this._blockTargetLoc = this._blockPlacementLoc = null
  }
  // highlight block as needed
  this.rendering.highlightBlock( !!result, loc[0], loc[1], loc[2] )
}


// test if block loc is clear. TODO: move to entity manager
Engine.prototype.noCollisionsAt = function( loc ) {
  var pbb = this.playerBody.aabb
  var newbb = new aabb( loc, [1,1,1] )
  return ( ! pbb.intersects(newbb))
}


/*
 *   Internals
*/ 


// handle fire (usually mousebutton) events - place/pick/destroy blocks
function handleFireEvent( noa, type ) {
  var loc = noa._blockTargetLoc
  // no action if there's no target block
  if (!loc) return
  if (type==1) { // main fire - destroy block, i.e. set to air
    noa.world.setBlock( 0, loc[0], loc[1], loc[2] )
  }
  if (type==2) { // middle fire - pick block
    noa._placeBlockID = noa.world.getBlock( loc[0], loc[1], loc[2] )
  }
  if (type==3) { // alt-fire - place block, physics permitting
    var id = noa._placeBlockID
    var place = noa._blockPlacementLoc
    if (noa.noCollisionsAt(place)) {
      noa.world.setBlock( id, place[0], place[1], place[2] )
    }
  }
}




// Manually track tick times.. consider changing this to fixed timesteps?
var lastTick = 0
function getTickTime(noa) {
  var last = noa._lastTick || 0
  var d = new Date()
  var dt = d-last
  if (dt>100) dt=100 // clamp timestep to 100ms to prevent blowups
  noa._lastTick = d
  return dt
}



// this is a hack for now. TODO: find a more elegant approach
function checkForPointerlock(noa) {
  // prevent the camera from turning unless pointerlock or mouse is down
  var turn = noa.container._shell.pointerLock ||
      noa.inputs.state.fire
  if (!turn) {
    noa.inputs.state.dx = noa.inputs.state.dy = 0
  }
}



