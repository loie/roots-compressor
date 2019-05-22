const fs = require("fs")

const imagemin = require('imagemin');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const imageminWebp = require('imagemin-webp');
const sharp = require('sharp');

const { spawn } = require( 'child_process')


const deleteFolderRecursive = function(path) {
	if (fs.existsSync(path)) {
    	fs.readdirSync(path).forEach(function(file, index){
      		const curPath = path + "/" + file;
      		if (fs.lstatSync(curPath).isDirectory()) { // recurse
        		deleteFolderRecursive(curPath);
      		} else { // delete file
        		fs.unlinkSync(curPath);
      		}
    	});
    	fs.rmdirSync(path);
  	}
}

const sizes = [320, 480, 720, 1024, 1280, 1500, 1920, 2500]

const folder = process.argv.slice(2)[0]
const folderOpt = folder + "/optimized"
const folderResizedJPGs = folder + "/resizedJPGs"
const folderResizedPNGs = folder + "/resizedPNGs"
const folderResizedJPGsToWebP = folder + "/resizedJPGsToWebP"
const folderResizedPNGsToWebP = folder + "/resizedPNGsToWebP"
const folderResizedWebPs = folder + "/resizedWebPs"

const files = fs.readdirSync(folder)
const jpgs = files
		.filter(file => file.endsWith(".jpg") || file.endsWith(".jpeg"))
		.map(file => {
			return {
				name: file.split(".").filter((_, i, f) => i < f.length -1).join("."),
				file: file,
				path: folder + "/",
				fullPath: folder + "/" + file
			}
		})
const pngs = files
		.filter(file => file.endsWith(".png"))
		.map(file => {
				return {
				name: file.split(".").filter((_, i, f) => i < f.length -1).join("."),
				file: file,
				path: folder + "/",
				fullPath: folder + "/" + file
			}
		})
const webps = files
		.filter(file => file.endsWith(".webp"))
		.map(file => {
			return {
				name: file.split(".").filter((_, i, f) => i < f.length -1).join("."),
				file: file,
				path: folder + "/",
				fullPath: folder + "/" + file
			}
		})

const resizeImageToSize = (inputFile, size, outputFolder, type) => {
	const outputFilename = outputFolder + "/" + inputFile.name + "_" + size + "." + type
	// console.info("Scaling " + inputFile.file + " to " + type + " with width of " + size + "px width")
	return sharp(inputFile.fullPath)
  		.resize({ width: size })
  		.toFile(outputFilename)
  	}

const resizeImage = (inputFile, outputFolder, type) => {
	return Promise.all(sizes.map(size => {
		return resizeImageToSize(inputFile, size, outputFolder, type)
	}))
}


const optimizeImages = (images, tmpResizeFolder, type, plugins) => {
	const promise = new Promise((resolve, reject) => {
		if (!fs.existsSync(tmpResizeFolder)) {
			fs.mkdirSync(tmpResizeFolder)
		}
		Promise
			.all(images.map(image => resizeImage(image, tmpResizeFolder, type)))
			.then(_ => {
				const imageFiles = fs
					.readdirSync(tmpResizeFolder)
					.filter(file => file.endsWith("." + type))
					.map(file => {
						return {
							name: file.split(".").filter((_, i, f) => i < f.length -1).join("."),
							file: file,
							path: tmpResizeFolder + "/",
							fullPath: tmpResizeFolder + "/" + file
						}
					})
				return imagemin(
					imageFiles.map(imageFile => imageFile.path), folderOpt, {
						"plugins": plugins
		    		})
			})
			.then(() => {
				console.log("Resized and optimized " + images.length + " " + type + " images")
				deleteFolderRecursive(tmpResizeFolder)
				return setTimeout(resolve, 0)
			})
	})
	return promise

}



/* resize JPGs */
optimizeImages(jpgs, folderResizedJPGs, "jpg", [imageminMozjpeg({ quality: 75 })])
	.then(optimizeImages(jpgs, folderResizedJPGsToWebP, "webp", [imageminWebp({quality: 75, method: 6, lossless: false})]))
	.then(optimizeImages(pngs, folderResizedPNGs, "png", [imageminPngquant({speed: 1, strip: true, quality: [0.6, 0.8]})]))
	.then(optimizeImages(pngs, folderResizedPNGsToWebP, "webp", [imageminWebp({quality: 75, method: 6, lossless: true})]))