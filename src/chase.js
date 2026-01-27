// Ported from: WinQuake/chase.c -- chase camera code

import { PITCH, YAW, ROLL } from './quakedef.js';
import { cvar_t, Cvar_RegisterVariable } from './cvar.js';
import { VectorCopy, VectorSubtract, VectorMA, DotProduct,
	AngleVectors, M_PI } from './mathlib.js';
import { cl } from './client.js';
import { r_refdef } from './render.js';

export const chase_back = new cvar_t( 'chase_back', '100' );
export const chase_up = new cvar_t( 'chase_up', '16' );
export const chase_right = new cvar_t( 'chase_right', '0' );
export const chase_active = new cvar_t( 'chase_active', '0' );

const chase_pos = new Float32Array( 3 );
const chase_angles = new Float32Array( 3 );

const chase_dest = new Float32Array( 3 );
const chase_dest_angles = new Float32Array( 3 );

export function Chase_Init() {

	Cvar_RegisterVariable( chase_back );
	Cvar_RegisterVariable( chase_up );
	Cvar_RegisterVariable( chase_right );
	Cvar_RegisterVariable( chase_active );

}

export function Chase_Reset() {

	// for respawning and teleporting
	// start position 12 units behind head

}

function TraceLine( start, end, impact ) {

	// Simplified trace - the original calls SV_RecursiveHullCheck
	// In the full implementation, this would do BSP collision detection
	// For now, just copy end to impact
	VectorCopy( end, impact );

}

export function Chase_Update() {

	const forward = new Float32Array( 3 );
	const up = new Float32Array( 3 );
	const right = new Float32Array( 3 );
	const dest = new Float32Array( 3 );
	const stop = new Float32Array( 3 );

	// if can't see player, reset
	AngleVectors( cl.viewangles, forward, right, up );

	// calc exact destination
	for ( let i = 0; i < 3; i ++ )
		chase_dest[ i ] = r_refdef.vieworg[ i ]
		- forward[ i ] * chase_back.value
		- right[ i ] * chase_right.value;
	chase_dest[ 2 ] = r_refdef.vieworg[ 2 ] + chase_up.value;

	// find the spot the player is looking at
	VectorMA( r_refdef.vieworg, 4096, forward, dest );
	TraceLine( r_refdef.vieworg, dest, stop );

	// calculate pitch to look at the same spot from camera
	VectorSubtract( stop, r_refdef.vieworg, stop );
	let dist = DotProduct( stop, forward );
	if ( dist < 1 )
		dist = 1;
	r_refdef.viewangles[ PITCH ] = - Math.atan( stop[ 2 ] / dist ) / M_PI * 180;

	// move towards destination
	VectorCopy( chase_dest, r_refdef.vieworg );

}
