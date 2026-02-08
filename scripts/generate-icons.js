const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_IMAGE = path.join(__dirname, '../assets/icons/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/icons');

// Android icon sizes
const ANDROID_SIZES = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon sizes
const IOS_SIZES = [
  { name: 'icon-20', size: 20 },
  { name: 'icon-20@2x', size: 40 },
  { name: 'icon-20@3x', size: 60 },
  { name: 'icon-29', size: 29 },
  { name: 'icon-29@2x', size: 58 },
  { name: 'icon-29@3x', size: 87 },
  { name: 'icon-40', size: 40 },
  { name: 'icon-40@2x', size: 80 },
  { name: 'icon-40@3x', size: 120 },
  { name: 'icon-60@2x', size: 120 },
  { name: 'icon-60@3x', size: 180 },
  { name: 'icon-76', size: 76 },
  { name: 'icon-76@2x', size: 152 },
  { name: 'icon-83.5@2x', size: 167 },
  { name: 'icon-1024', size: 1024 },
];

// Expo/Adaptive icon
const EXPO_SIZES = [
  { name: 'icon', size: 1024 },
  { name: 'adaptive-icon', size: 1024 },
  { name: 'favicon', size: 48 },
];

async function generateIcons() {
  // Create output directories
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const androidDir = path.join(OUTPUT_DIR, 'android');
  const iosDir = path.join(OUTPUT_DIR, 'ios');
  
  if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir, { recursive: true });
  if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });

  console.log('Generating icons from:', SOURCE_IMAGE);

  // Generate Android icons
  for (const { name, size } of ANDROID_SIZES) {
    const outputPath = path.join(androidDir, `${name}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 100, g: 181, b: 246, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }

  // Generate iOS icons
  for (const { name, size } of IOS_SIZES) {
    const outputPath = path.join(iosDir, `${name}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 100, g: 181, b: 246, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }

  // Generate Expo icons
  for (const { name, size } of EXPO_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `${name}.png`);
    await sharp(SOURCE_IMAGE)
      .resize(size, size, { fit: 'contain', background: { r: 100, g: 181, b: 246, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
