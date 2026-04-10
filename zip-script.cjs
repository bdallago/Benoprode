const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const output = fs.createWriteStream(__dirname + '/public/codigo-fuente-completo.zip');
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Add all files and directories, ignoring node_modules
archive.glob('**/*', {
  ignore: ['node_modules/**', 'public/codigo-fuente*.zip', '.git/**', 'dist/**']
});

archive.glob('.*', {
  ignore: ['.git/**', '.env']
});

archive.finalize();
