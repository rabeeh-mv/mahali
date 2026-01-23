/**
 * Compresses an image file to be under a specified size limit (default 1MB).
 * @param {File} file - The image file to compress.
 * @param {number} maxSizeMB - The maximum file size in MB.
 * @param {number} maxWidthOrHeight - Max width or height to resize large images (optional).
 * @returns {Promise<File>} - A promise that resolves to the compressed File object.
 */
export const compressImage = async (file, maxSizeMB = 1, maxWidthOrHeight = 1920) => {
    // If file is already smaller than limit, return it
    if (file.size / 1024 / 1024 <= maxSizeMB) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Resize if dimensions are too large (helps with compression)
                if (width > height) {
                    if (width > maxWidthOrHeight) {
                        height = Math.round((height * maxWidthOrHeight) / width);
                        width = maxWidthOrHeight;
                    }
                } else {
                    if (height > maxWidthOrHeight) {
                        width = Math.round((width * maxWidthOrHeight) / height);
                        height = maxWidthOrHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Start compression iteration
                let quality = 0.9;

                const compress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('Canvas to Blob conversion failed'));
                                return;
                            }

                            if (blob.size / 1024 / 1024 <= maxSizeMB || quality <= 0.1) {
                                const compressedFile = new File([blob], file.name, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                quality -= 0.1;
                                compress();
                            }
                        },
                        'image/jpeg',
                        quality
                    );
                };

                compress();
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
