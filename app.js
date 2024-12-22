const express = require('express');
const multer = require('multer');
const getColors = require('get-image-colors');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);

    }
});
const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// get avg color
async function getAverageColor(imagePath) {
    const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });

    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 3) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }

    const pixelCount = data.length / 3;
    const averageColor = {
        r: Math.round(r / pixelCount),
        g: Math.round(g / pixelCount),
        b: Math.round(b / pixelCount),
    };
    const hex = `#${((1 << 24) + (averageColor.r << 16) + (averageColor.g << 8) + averageColor.b)
        .toString(16)
        .slice(1)
        .toUpperCase()}`;
    return { ...averageColor, hex };


}
app.post('/upload', upload.single('image'), async (req, res) => {
    try {
        const imagePath = path.join(__dirname, req.file.path);
        const colors = await getColors(imagePath);
        const palette = colors.map(color => color.hex());
        const averageColor = await getAverageColor(imagePath);
        const averageColorHex = `${averageColor.hex}`;
        const uploadedImageUrl = `/uploads/${req.file.filename}`;
        const paletteHtml = palette
            .map(color => `
                <div style="background-color: ${color}; width: 50px; height: 50px; margin: 5px; display: inline-block;"></div>
                <p style="display: inline-block; margin-right: 10px;">${color}</p>
            `)
            .join('');

        res.send(`
            <h1>Uploaded Image</h1>
            <img src="${uploadedImageUrl}" alt="Uploaded Image" style="max-width: 300px; border: 1px solid #ccc;" />
            
            <h2>Color Palette</h2>
            <div style="display: flex; flex-wrap: wrap;">${paletteHtml}</div>
            
            <h2>Average Color</h2>
            <div style="background-color: ${averageColorHex}; width: 100px; height: 100px; border: 1px solid #000; margin-top: 10px;"></div>
            <p>Average Color: ${averageColorHex}</p>
            
            <a href="/">Upload another image</a>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process the image.' });
    }
});


app.get('/', (req, res) => {
    res.send(`
    <h1>Upload an image to find color pallete and average color</h1>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/*" required />
      <button type="submit">Upload</button>
    </form>
  `);
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});