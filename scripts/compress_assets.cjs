const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { optimize } = require('svgo');

async function getFiles(dir, matchExts) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'nm_bak', 'build', '.gradle'].includes(item)) continue;
        files = files.concat(await getFiles(full, matchExts));
      } else {
        const ext = path.extname(full).toLowerCase();
        if (matchExts.includes(ext)) {
          files.push({ path: full, size: stat.size, ext });
        }
      }
    } catch(e) {}
  }
  return files;
}

async function compressImage(filePath) {
  const originalSize = fs.statSync(filePath).size;
  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    
    let maxWidth = 1280;
    let maxHeight = 1280;
    
    const fileName = path.basename(filePath).toLowerCase();
    if (fileName.includes('logo') || fileName.includes('avatar') || fileName.includes('tier-') || filePath.includes('avatars')) {
      maxWidth = 400;
      maxHeight = 400;
    }
    
    let pipeline = sharp(filePath);
    if (meta.width > maxWidth || meta.height > maxHeight) {
      pipeline = pipeline.resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true });
    }
    
    let outBuffer;
    if (meta.format === 'png') {
      outBuffer = await pipeline
        .png({ quality: 80, compressionLevel: 9, palette: true })
        .toBuffer();
    } else if (meta.format === 'jpeg' || meta.format === 'jpg') {
      outBuffer = await pipeline
        .jpeg({ quality: 78, mozjpeg: true })
        .toBuffer();
    } else if (meta.format === 'webp') {
      outBuffer = await pipeline
        .webp({ quality: 78, effort: 6 })
        .toBuffer();
    }
    
    if (outBuffer && outBuffer.length < originalSize) {
      fs.writeFileSync(filePath, outBuffer);
      return { originalSize, newSize: outBuffer.length, saved: originalSize - outBuffer.length };
    }
  } catch (err) {}
  return { originalSize, newSize: originalSize, saved: 0 };
}

async function compressSvg(filePath) {
  const originalSize = fs.statSync(filePath).size;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const result = optimize(raw, {
      multipass: true,
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              cleanupNumericValues: { floatPrecision: 1 },
              convertPathData: { floatPrecision: 1, transformPrecision: 1 }
            }
          }
        }
      ]
    });
    
    if (result.data && result.data.length < originalSize) {
      fs.writeFileSync(filePath, result.data, 'utf8');
      return { originalSize, newSize: result.data.length, saved: originalSize - result.data.length };
    }
  } catch (err) {}
  return { originalSize, newSize: originalSize, saved: 0 };
}

function minifyJson(filePath) {
  const originalSize = fs.statSync(filePath).size;
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const minified = JSON.stringify(parsed);
    if (minified.length < originalSize) {
      fs.writeFileSync(filePath, minified, 'utf8');
      return { originalSize, newSize: minified.length, saved: originalSize - minified.length };
    }
  } catch (err) {}
  return { originalSize, newSize: originalSize, saved: 0 };
}

async function mapConcurrent(items, limit, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

async function main() {
  console.log('🚀 Starting Ultra-High-Compression Tool...\n');
  
  // 1. Remove public/svg-br if it exists
  const svgBrPath = path.join(__dirname, '..', 'public', 'svg-br');
  if (fs.existsSync(svgBrPath)) {
    fs.rmSync(svgBrPath, { recursive: true, force: true });
    console.log('✅ Removed unused svg-br directory');
  }

  const androidSvgBr = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'public', 'svg-br');
  if (fs.existsSync(androidSvgBr)) {
    fs.rmSync(androidSvgBr, { recursive: true, force: true });
    console.log('✅ Removed android svg-br assets');
  }

  // 2. Compress all PNG / JPG / WEBP images
  console.log('🖼️ Compressing PNG / JPG images...');
  const imageDirs = [
    path.join(__dirname, '..', 'public'),
    path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'drawable')
  ];
  
  let allImages = [];
  for (const dir of imageDirs) {
    allImages = allImages.concat(await getFiles(dir, ['.png', '.jpg', '.jpeg', '.webp']));
  }
  
  const imgResults = await mapConcurrent(allImages, 12, (img) => compressImage(img.path));
  const totalImgOriginal = imgResults.reduce((a, b) => a + b.originalSize, 0);
  const totalImgNew = imgResults.reduce((a, b) => a + b.newSize, 0);
  
  console.log(`✅ Processed ${allImages.length} images.`);
  console.log(`   Images Size: ${(totalImgNew / (1024 * 1024)).toFixed(2)} MB (Saved ${((totalImgOriginal - totalImgNew) / (1024 * 1024)).toFixed(2)} MB)\n`);

  // 3. Minify JSON files
  console.log('📄 Minifying JSON data files in public/json...');
  const jsonFiles = await getFiles(path.join(__dirname, '..', 'public', 'json'), ['.json']);
  let totalJsonOriginal = 0;
  let totalJsonNew = 0;
  for (const jf of jsonFiles) {
    const res = minifyJson(jf.path);
    totalJsonOriginal += res.originalSize;
    totalJsonNew += res.newSize;
  }
  console.log(`✅ Minified ${jsonFiles.length} JSON files.`);
  console.log(`   JSON Size: ${(totalJsonNew / (1024 * 1024)).toFixed(2)} MB (Saved ${((totalJsonOriginal - totalJsonNew) / (1024 * 1024)).toFixed(2)} MB)\n`);

  // 4. Ultra-compress SVGs in public/svg
  console.log('📜 Ultra-optimizing Quran SVG pages (precision-1 vectorized paths)...');
  const svgDir = path.join(__dirname, '..', 'public', 'svg');
  const svgFiles = await getFiles(svgDir, ['.svg']);
  
  let completed = 0;
  const svgResults = await mapConcurrent(svgFiles, 16, async (file) => {
    const res = await compressSvg(file.path);
    completed++;
    if (completed % 100 === 0 || completed === svgFiles.length) {
      process.stdout.write(`   Progress: ${completed}/${svgFiles.length} SVGs compressed...\r`);
    }
    return res;
  });
  
  const totalSvgOriginal = svgResults.reduce((a, b) => a + b.originalSize, 0);
  const totalSvgNew = svgResults.reduce((a, b) => a + b.newSize, 0);
  
  console.log(`\n✅ Ultra-optimized ${svgFiles.length} SVG files.`);
  console.log(`   Original SVGs Size: ${(totalSvgOriginal / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Ultra-Compressed SVGs Size: ${(totalSvgNew / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   Saved: ${((totalSvgOriginal - totalSvgNew) / (1024 * 1024)).toFixed(2)} MB (${(((totalSvgOriginal - totalSvgNew) / (totalSvgOriginal || 1)) * 100).toFixed(1)}% reduction)\n`);

  console.log('🎉 Ultra Compression Completed Successfully!');
}

main().catch(console.error);
