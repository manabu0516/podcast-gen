
const args = process.argv.slice(2);
if(args.length < 1) {
    console.log('[usage] index.js [configure json path]');
    process.exit(1);
}

const configure = ((target) => {
    const fs = require('fs');
    const path = require('path');
    const confPath = target;
    const configure = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    return {
        configure:configure, dir : path.dirname(confPath),
        xmlpath :  path.dirname(confPath)+'/podcast.xml',
        jsonpath :  path.dirname(confPath)+'/podcast.json',
        m3u8path :  path.dirname(confPath)+'/podcast.m3u8'
    };
})(args[0]);

const convertTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return ('00' + hours).slice(-2) + ':' + ('00' + minutes).slice(-2) + ':' + ('00' + seconds).slice(-2);
};

const convertRSSDate = (() => {
    const dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthLabel = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    //Fri, 13 Nov 2015 16:16:47 +0900
    return (timestamp) => {
        const d = new Date(timestamp);

        const dow = dayOfWeek[d.getDay()];
        const day = d.getDate();
        const month = monthLabel[d.getMonth()];
        const year = d.getFullYear();

        const hh = ('00' + d.getHours()).slice(-2);
        const mm = ('00' + d.getMinutes()).slice(-2);
        const ss = ('00' + d.getSeconds()).slice(-2);

        return dow + ', ' + day + ' ' + month + ' ' + year + ' ' + hh+':'+mm+':'+ss + ' +0900';
    };
})();

const md5hex = (() => {
    const crypto = require('crypto');
    return (str) => {
        const md5 = crypto.createHash('md5')
        return md5.update(str, 'binary').digest('hex')
    };

})();

const createSummary = (data) => {
	const duration = (data.duration/60);
	const fixDuration = Math.floor(duration * Math.pow(10, 1) ) / Math.pow(10, 1);

    const entries = [];

    entries.push(data.author !== undefined ? data.author + ' ' : '');
    entries.push(data.title);
    entries.push('('+ fixDuration +'分)');

	return entries.join(''); 
};

const writeJSON = (config, articles) => {

    const xml_image = config.webroot + 'thumbnail.jpg';

    const result = {};
    result.rss = {}
    result.rss.categories = [];
    result.rss.items = [];
    result.rss.channel = {
        title : config.xml_title,
        link : config.xml_link,
        language : config.xml_locale,
        copyright : config.xml_copyright,

        subtitle : config.xml_subtitle,
        author : config.xml_author,
        summary : config.xml_summary,
        description : config.xml_description,
        owner : {name:config.xml_author, email:config.xml_email},
        image : xml_image
    };

    config.xml_categories.forEach(t => {
		result.rss.categories.push(t);
	});

	articles.forEach(a => {
        const url = encodeURIComponent(a.mp3file);
        const image = encodeURIComponent(a.thumbnail);
        const hash = md5hex(url);
        const author = a.author !== undefined && a.author !== null ? a.author : config.xml_author;

        result.rss.items.push({
            title : a.title,
            author : author,
            subtitle : '',
            summary : createSummary(a),
            url : url,
            guid : hash,
            image : image,
            pubDate : a.pubslished,
            duration : a.duration_disp
        });
	});
    return result;
};

const writeXML = (config, articles, print) => {

	const categories = [];

    const xml_image = config.webroot + 'thumbnail.jpg';

	print("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
	print("<rss xmlns:itunes=\"http://www.itunes.com/dtds/podcast-1.0.dtd\" version=\"2.0\">");
	print("<channel>");
	print("    <title>"+config.xml_title+"</title>");
	print("    <link>"+config.xml_link+"</link>");
	print("    <language>"+config.xml_locale+"</language>");
	print("    <copyright>"+config.xml_copyright+"</copyright>");
	print("");
	print("    <itunes:subtitle>"+config.xml_subtitle+"</itunes:subtitle>");
	print("    <itunes:author>"+config.xml_author+"</itunes:author>");
	print("    <itunes:summary>"+config.xml_summary+"</itunes:summary>");
	print("    <description>"+config.xml_description+"</description>");
	print("    <itunes:owner>");
	print("        <itunes:name>"+config.xml_author+"</itunes:name>");
	print("        <itunes:email>"+config.xml_email+"</itunes:email>");
	print("    </itunes:owner>");
	print("");
	print("    <itunes:image href=\""+xml_image+"\" />");

	config.xml_categories.forEach(t => {
		print("    <itunes:category text=\""+t+"\"/>");
	});

	articles.forEach(a => {
        const url = config.webroot + encodeURIComponent(a.mp3file);
        const image = config.webroot + encodeURIComponent(a.thumbnail);
        const hash = md5hex(url);
        const author = a.author !== undefined && a.author !== null ? a.author : config.xml_author;

		print("    <item>");
		print("        <title>"+a.title+"</title>");
		print("        <itunes:author>"+author+"</itunes:author>");
		print("        <itunes:subtitle>"+"</itunes:subtitle>");
		print("        <itunes:summary><![CDATA["+createSummary(a)+"]]></itunes:summary>");
		print("        <itunes:image href=\""+image+"\" />");
		print("        <enclosure url=\""+url+"\" />");
		print("        <guid>"+hash+"</guid>");
		print("        <pubDate>"+a.pubslished+"</pubDate>");
		print("        <itunes:duration>"+a.duration_disp+"</itunes:duration>");
		print("    </item>");
	});

	print("</channel>");
	print("</rss>");
};

const writeM3U8 = (config, articles, print) => {
	const output = ['#EXTM3U', '#EXT-X-VERSION:3', '#PLAYLIST:' + (config.xml_title)];

    const context = {
        entries : [],
        duration : 0
    };

	articles.forEach(a => {
        const url = config.intraroot + encodeURIComponent(a.mp3file);
        context.entries.push('#EXTINF:' + a.duration + ',' + (a.title) + '\r\n' + url);
        if(context.duration < a.duration) {
            context.duration = a.duration;
        }
	});

    output.push('#EXT-X-TARGETDURATION:' + (context.duration));
    output.push('#EXT-X-MEDIA-SEQUENCE:0');
    output.push('#EXT-X-PLAYLIST-TYPE:VOD');

    const text = context.entries.join('\r\n#EXT-X-DISCONTINUITY\r\n');
    output.push(text);

    output.push('#EXT-X-ENDLIST');
    return output.join('\r\n');
};


const run = async () => {
    const exlucdeTarget = ['configure.json', 'podcast.xml', 'thumbnail.jpg', 'podcast.json', 'podcast.m3u8'];
    const fs = require('fs').promises;

    const entryMap = {};

    (await fs.readdir(configure.dir)).filter(e => exlucdeTarget.indexOf(e) === -1).forEach(e => {
        const pos = e.lastIndexOf('.');

        const ext = e.slice(pos + 1);
        const basename = e.substring(0, pos);

        if(entryMap[basename] === undefined) {
            entryMap[basename] = {};
        }

        entryMap[basename][ext] = {ext : ext,path: e};
    });

    const entries = [];

    const keys = Object.keys(entryMap)
    for (let i = 0; i < keys.length; i++) {
        const basename = keys[i];
        const data = entryMap[basename];
        
        if(data['mp3'] === undefined) {
            continue;
        }

        const entry = {};
        entry.mp3file = data['mp3'].path;

        const stats = await fs.stat(configure.dir + '/' +entry.mp3file);
        const parts = basename.split('_');

        entry.timestamp = stats.mtime.getTime();
        entry.title = parts[1];
        entry.duration = parseInt(parts[0].replaceAll('s', ''));
        entry.duration_min = Math.ceil(entry.duration / 60);
        entry.duration_disp = convertTime(entry.duration);
        entry.pubslished = convertRSSDate(entry.timestamp);

	
        if(data['webp'] !== undefined) {
            entry.thumbnail = data['webp'].path;
        }
	if(data['jpg'] !== undefined) {
	    entry.thumbnail = data['jpg'].path;
	}
	
        entries.push(entry);
    }

    entries.sort((a, b) => {
        return b.timestamp - a.timestamp;
    });

    const output = [];
    writeXML(configure.configure, entries, (text) => {
        output.push(text);
    });
    const json = writeJSON(configure.configure, entries);
    const m3u8 = writeM3U8(configure.configure, entries);

    await fs.writeFile(configure.xmlpath, output.join('\r\n'), 'utf8');
    await fs.writeFile(configure.jsonpath, JSON.stringify(json), 'utf8');
    await fs.writeFile(configure.m3u8path, m3u8, 'utf8');
};

run();
