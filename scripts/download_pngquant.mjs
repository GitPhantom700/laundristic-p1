import https from 'https';
import fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const file = fs.createWriteStream('pngquant.zip');
console.log('Starting download of pngquant-windows.zip...');
https
  .get('https://pngquant.org/pngquant-windows.zip', function (response) {
    if (response.statusCode !== 200) {
      console.error(
        `Failed to download: ${response.statusCode} ${response.statusMessage}`,
      );
      return;
    }
    response.pipe(file);
    file.on('finish', function () {
      file.close();
      console.log('Download completed successfully.');
    });
  })
  .on('error', function (err) {
    console.error('Error: ' + err.message);
  });
