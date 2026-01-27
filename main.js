// Three-Quake entry point
// Equivalent to WinQuake/sys_win.c WinMain() + main()

import { Sys_Init, Sys_Printf, Sys_Error } from './src/sys.js';
import { COM_InitArgv } from './src/common.js';
import { Host_Init, Host_Frame, Host_Shutdown } from './src/host.js';
import { COM_FetchPak, COM_AddPack } from './src/pak.js';
import { Cbuf_AddText } from './src/cmd.js';
import { cls, cl } from './src/client.js';
import { sv } from './src/server.js';
import { scene, camera } from './src/gl_rmain.js';
import { renderer } from './src/vid.js';
import { Draw_CachePicFromPNG } from './src/gl_draw.js';

const parms = {
	basedir: '.',
	argc: 0,
	argv: []
};

async function main() {

	try {

		Sys_Init();

		COM_InitArgv( parms.argv );

		// Load pak0.pak from the same directory
		Sys_Printf( 'Loading pak0.pak...\\n' );
		const pak0 = await COM_FetchPak( 'pak0.pak', 'pak0.pak' );
		if ( pak0 ) {

			COM_AddPack( pak0 );
			Sys_Printf( 'pak0.pak loaded successfully\\n' );

		} else {

			Sys_Printf( 'Warning: pak0.pak not found - game data will be missing\\n' );

		}

		// Optionally load pak1.pak (registered version)
		try {

			const pak1 = await COM_FetchPak( 'pak1.pak', 'pak1.pak' );
			if ( pak1 ) {

				COM_AddPack( pak1 );
				Sys_Printf( 'pak1.pak loaded successfully\\n' );

			}

		} catch ( e ) {

			// pak1.pak is optional (shareware doesn't have it)

		}

		await Host_Init( parms );

		// Preload custom menu images
		try {

			await Draw_CachePicFromPNG( 'gfx/continue.lmp', 'img/continue.png' );
			Sys_Printf( 'Loaded custom menu images\\n' );

		} catch ( e ) {

			Sys_Printf( 'Warning: Could not load custom menu images\\n' );

		}

		// Expose for debugging
		window.Cbuf_AddText = Cbuf_AddText;
		window.cls = cls;
		window.cl = cl;
		window.sv = sv;
		window.scene = scene;
		Object.defineProperty( window, 'camera', { get: () => camera } );
		Object.defineProperty( window, 'renderer', { get: () => renderer } );

		let oldtime = performance.now() / 1000;

		function frame() {

			const newtime = performance.now() / 1000;
			const time = newtime - oldtime;
			oldtime = newtime;

			Host_Frame( time );

			requestAnimationFrame( frame );

		}

		requestAnimationFrame( frame );

	} catch ( e ) {

		console.error( 'Three-Quake Fatal Error:', e );
		Sys_Error( e.message );

	}

}

main();
