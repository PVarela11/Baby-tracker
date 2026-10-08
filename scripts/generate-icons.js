const sharp = require('sharp');
const fs = require('fs');

// Generate PNG icons from SVG
async function generateIcons() {
  try {
    // Generate 192x192
    await sharp('public/icon.svg')
      .resize(192, 192)
      .png()
      .toFile('public/icon-192.png');
    console.log('Generated icon-192.png');

    // Generate 512x512
    await sharp('public/icon.svg')
      .resize(512, 512)
      .png()
      .toFile('public/icon-512.png');
    console.log('Generated icon-512.png');

    // Generate apple-touch-icon (180x180)
    await sharp('public/apple-touch-icon.svg')
      .resize(180, 180)
      .png()
      .toFile('public/apple-touch-icon.png');
    console.log('Generated apple-touch-icon.png');

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    console.log('Make sure sharp is installed: npm install sharp');
  }
}

generateIcons();
