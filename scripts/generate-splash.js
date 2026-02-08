const sharp = require('sharp');
const path = require('path');

const SOURCE_IMAGE = path.join(__dirname, '../assets/characters/dodo.png');
const OUTPUT_PATH = path.join(__dirname, '../assets/splash.png');

async function generateSplash() {
  // Create splash screen: 1284x2778 (iPhone 14 Pro Max size)
  const width = 1284;
  const height = 2778;
  const logoSize = 400;

  // Create background
  const background = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 100, g: 181, b: 246, alpha: 1 } // #64B5F6
    }
  }).png().toBuffer();

  // Resize logo
  const logo = await sharp(SOURCE_IMAGE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Composite logo on background
  await sharp(background)
    .composite([{
      input: logo,
      top: Math.floor((height - logoSize) / 2) - 100, // Slightly above center
      left: Math.floor((width - logoSize) / 2),
    }])
    .png()
    .toFile(OUTPUT_PATH);

  console.log('✅ Splash screen generated:', OUTPUT_PATH);
}

generateSplash().catch(console.error);
