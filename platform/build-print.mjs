import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
for(const name of ['print-checkout','print-paid-background']){
 await build({entryPoints:[fileURLToPath(new URL('./functions/'+name+'.mjs',import.meta.url))],outfile:fileURLToPath(new URL('../netlify/functions/'+name+'.mjs',import.meta.url)),bundle:true,platform:'node',format:'esm',target:'node22',minify:false});
}
console.log('Built Print Studio checkout and payment worker.');
