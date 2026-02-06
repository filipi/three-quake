// WebXR support for Three-Quake
// Provides VR rendering via Three.js WebXR integration

import * as THREE from 'three';
import { renderer } from './vid.js';

//============================================================================
// Constants
//============================================================================

// Quake units per meter. Quake uses ~1 unit ≈ 1 inch, so 1 meter ≈ 39.37 units.
// We use 40 for a round number. This scales controller positions from XR meters
// to Quake world units. The camera rig itself is NOT scaled (to preserve the view).
export const XR_SCALE = 40;

//============================================================================
// State
//============================================================================

let xrSessionActive = false;
let xrRig = null; // THREE.Group — positioned at vieworg each frame
let xrOffset = null; // THREE.Group — child of rig, offset up by XR_SCALE
let controllerGripRight = null; // right controller grip space

// Input state — polled each frame by XR_PollInput(), consumed by IN_Move()
export const xrInput = {
	moveX: 0,       // left thumbstick X (-1 to 1)
	moveY: 0,       // left thumbstick Y (-1 to 1)
	lookX: 0,       // right thumbstick X (-1 to 1)
	leftTrigger: 0, // left trigger (0 to 1)
	rightTrigger: 0 // right trigger (0 to 1)
};

//============================================================================
// Public API
//============================================================================

export function isXRActive() {

	return xrSessionActive;

}

export function getXRRig() {

	return xrRig;

}

export function getControllerGripRight() {

	return controllerGripRight;

}

//============================================================================
// XR_Init
//
// Called after Host_Init when renderer and scene are ready.
// Creates the camera rig, sets up controllers, and offers VR session.
//============================================================================

export function XR_Init( scene ) {

	if ( renderer == null ) return;

	// Enable XR on the renderer
	renderer.xr.enabled = true;
	renderer.xr.setReferenceSpaceType( 'local-floor' );

	// Create camera rig — positioned at player vieworg each frame.
	// With local-floor, the headset is ~1.7m above origin.
	// Offset the rig up by XR_SCALE so the floor aligns with feet.
	xrRig = new THREE.Group();
	scene.add( xrRig );

	xrOffset = new THREE.Group();
	xrOffset.position.z = XR_SCALE;
	xrRig.add( xrOffset );

	// Right controller grip space (for weapon attachment)
	controllerGripRight = renderer.xr.getControllerGrip( 0 );
	xrOffset.add( controllerGripRight );

	// Session lifecycle
	renderer.xr.addEventListener( 'sessionstart', function () {

		xrSessionActive = true;

	} );

	renderer.xr.addEventListener( 'sessionend', function () {

		xrSessionActive = false;

		_offerSession();

	} );

	_offerSession();

}

//============================================================================
// XR_SetCamera
//
// Parents the camera to the XR rig. Called once when the camera is first
// created in R_SetupGL. In non-XR mode the parent doesn't matter because
// camera.matrixAutoUpdate is false and matrixWorld is set directly.
// In XR mode, Three.js composes: rig.matrixWorld × camera.matrix (from headset).
//============================================================================

export function XR_SetCamera( camera ) {

	if ( xrRig != null && camera != null && camera.parent !== xrOffset ) {

		xrOffset.add( camera );

	}

}


//============================================================================
// XR_PollInput
//
// Reads controller gamepad state each frame. Called from IN_Move().
// Left controller: thumbstick → movement, trigger → jump
// Right controller: trigger → attack
//============================================================================

export function XR_PollInput() {

	xrInput.moveX = 0;
	xrInput.moveY = 0;
	xrInput.lookX = 0;
	xrInput.leftTrigger = 0;
	xrInput.rightTrigger = 0;

	if ( xrSessionActive === false ) return;

	const session = renderer.xr.getSession();
	if ( session == null ) return;

	for ( const source of session.inputSources ) {

		if ( source.gamepad == null ) continue;

		const gp = source.gamepad;

		if ( source.handedness === 'left' ) {

			// Thumbstick axes (xr-standard: axes[2]=X, axes[3]=Y)
			// Some controllers use axes[0]/[1] instead
			if ( gp.axes.length >= 4 ) {

				xrInput.moveX = gp.axes[ 2 ];
				xrInput.moveY = gp.axes[ 3 ];

			} else if ( gp.axes.length >= 2 ) {

				xrInput.moveX = gp.axes[ 0 ];
				xrInput.moveY = gp.axes[ 1 ];

			}

			// Trigger (buttons[0] in xr-standard)
			if ( gp.buttons.length > 0 ) {

				xrInput.leftTrigger = gp.buttons[ 0 ].value;

			}

		} else if ( source.handedness === 'right' ) {

			// Thumbstick X axis (horizontal look)
			if ( gp.axes.length >= 4 ) {

				xrInput.lookX = gp.axes[ 2 ];

			} else if ( gp.axes.length >= 2 ) {

				xrInput.lookX = gp.axes[ 0 ];

			}

			// Trigger
			if ( gp.buttons.length > 0 ) {

				xrInput.rightTrigger = gp.buttons[ 0 ].value;

			}

		}

	}

}

//============================================================================
// Internal: Offer VR session via browser-native UI
//============================================================================

const _sessionInit = {
	requiredFeatures: [ 'local-floor' ]
};

function _offerSession() {

	if ( ! ( 'xr' in navigator ) ) return;
	if ( navigator.xr.offerSession == null ) return;

	navigator.xr.offerSession( 'immersive-vr', _sessionInit )
		.then( _onSessionStarted );

}

function _onSessionStarted( session ) {

	renderer.xr.setSession( session );

}
