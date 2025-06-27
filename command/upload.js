

const fmtDate = (date) => {
    const y = date.getFullYear();
    const m = ('0' + (date.getMonth() + 1)).slice(-2);
    const d = ('0' + date.getDate()).slice(-2);
    const h = ('0' + date.getHours()).slice(-2);
    const mi = ('0' + date.getMinutes()).slice(-2);
    const s = ('0' + date.getSeconds()).slice(-2);
  
    return y + m + d + h + mi + s;
};

const getDuration = (() => {
    const mp3Duration = require('mp3-duration');
    const path = require('path');

    return (filePath) => {
        return new Promise((resolve, reject) => {
            const fullPath = path.resolve(filePath);

            mp3Duration(fullPath, function (err, duration) {
                if (err) return reject(err);
                resolve({
                    path : fullPath,
                    duration : duration,
                    extention : path.extname(fullPath)
                });
            });
        });
    };
})();

const encodeString = (text) => {
    return text;
};

const download = (() => {
    const process = require('child_process');

    return (url) => {
        return new Promise((resolve) => {
            const result = process.spawn('yt-dlp -x --audio-format mp3 '+ url +' -o "work/output.%(ext)s" --write-thumbnail', [], { shell: true, stdio: 'inherit' });
            result.on('close', (code) => {resolve()});
        });
    };
})();

const tumbnail = (() => {
    const sharp = require('sharp');
    const fs = require("fs");
    return async () => {
        if(fs.existsSync("work/output.jpg") ) {
            return true;
        }

        if(fs.existsSync("work/output.webp") ) {
            const image = await sharp("work/output.webp").jpeg().toFile("work/output.jpg");
            return true;
        }

        return false;
    };
})();

const md5hex = (() => {
    const crypto = require('crypto');
    return  (str) => {
        const md5 = crypto.createHash('md5')
        return md5.update(str, 'binary').digest('hex')
    };
})();

const clean = (() => {
    const fs = require("fs");
    return () => {
        try {fs.unlinkSync("work/output.mp3");} catch(e) {}
        try {fs.unlinkSync("work/output.webp");} catch(e) {}
        try {fs.unlinkSync("work/output.jpg");} catch(e) {}
    }
})();

module.exports = async () => {
    return async (context) => {
        const url = context.args[0];

        const keyStr = md5hex(url);

        await clean();
        await download(url);
        await tumbnail();

        const duration = await getDuration('work/output.mp3');
        const artist = context.readConsole('artist name', true);
        const music = context.readConsole('music name', true);
        const date = fmtDate(new Date());
        const index = '1';
        const uploadname_mp3 = keyStr + '__' + date +'__' + index + '__' + encodeString(artist) + '__' + encodeString(music) + '__' + duration.duration + duration.extention;
        const uploadname_jpg = keyStr + ".jpg";

        await context.ftpClient.uploadFile('work/output.mp3', uploadname_mp3);
        await context.ftpClient.uploadFile('work/output.jpg', uploadname_jpg);
    };
};