const sharp = require('sharp');
const path = require('path');

const SOURCE = path.join(__dirname, '../assets/characters/dodo.png');
const OUTPUT = path.join(__dirname, '../assets/icons/icon-dodo-face.png');

async function createFaceIcon() {
  const size = 1024;
  
  // 元画像を読み込み、白背景を透明に変換してから黄色背景に配置
  const original = await sharp(SOURCE)
    .resize(900, 900, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 黄色背景
  const background = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 213, b: 79, alpha: 1 }
    }
  }).png().toBuffer();

  // 配置（少し上にオフセットして顔を中心に）
  await sharp(background)
    .composite([{
      input: original,
      top: -150,  // 上にずらして顔を中心に
      left: Math.floor((size - 900) / 2),
    }])
    .png()
    .toFile(OUTPUT);

  console.log('✅ Icon created:', OUTPUT);
}

createFaceIcon().catch(console.error);
