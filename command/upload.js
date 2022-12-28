



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

module.exports = async () => {
    return async (context) => {
        const duration = await getDuration(context.readConsole('file', true));
        const artist = context.readConsole('artist name', true);
        const music = context.readConsole('music name', true);
        const date = context.readConsole('date', false, fmtDate(new Date()));
        const index = context.readConsole('index (def:1)', false, '1');
        const uploadname = date +'__' + index + '__' + encodeString(artist) + '__' + encodeString(music) + '__' + duration.duration + duration.extention;
        await context.ftpClient.upload(duration.path, uploadname);
    };
};