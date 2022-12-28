

const pathModule = require('path');
const crypto = require('crypto');

const decodeString = (str) => {
	return str;
};

const md5hex = (str) => {
	const md5 = crypto.createHash('md5')
	return md5.update(str, 'binary').digest('hex')
};



const createSummary = (data) => {
	const duration = (data.duration/60);
	const fixDuration = Math.floor(duration * Math.pow(10, 1) ) / Math.pow(10, 1);

	return data.artist + ' ' + data.music + '('+ fixDuration +'分)'; 
};

const entryData = (path, configure) => {
    const entries = path.split("__");

    const extention = pathModule.extname(entries[4]);
    const duration = pathModule.basename(entries[4],extention);
	const url = configure.website_url + path;

	const dateStr = entries[0];
	const pubslished = dateStr.substring(0,4) + '-' + dateStr.substring(4,6) + '-' + dateStr.substring(6,8);

    return {
        index : parseInt(entries[1]),
        artist : decodeString(entries[2]),
        music : decodeString(entries[3]),
        extention : extention,
        duration : parseFloat(duration),
        pubslished : pubslished,
        hash : md5hex(url),
        url : url,
    };
};

const writeXML = (config, articles, print) => {

	const categories = [];

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
	print("    <itunes:image href=\""+config.xml_image+"\" />");

	config.xml_categories.forEach(t => {
		print("    <itunes:category text=\""+t+"\"/>");
	});

	articles.forEach(a => {
		print("    <item>");
		print("        <title>"+a.music+"</title>");
		print("        <itunes:author>"+a.artist+"</itunes:author>");
		print("        <itunes:subtitle>"+"</itunes:subtitle>");
		print("        <itunes:summary><![CDATA["+createSummary(a)+"]]></itunes:summary>");
		print("        <itunes:image href=\""+"\" />");
		print("        <enclosure url=\""+a.url+"\" />");
		print("        <guid>"+a.hash+"</guid>");
		print("        <pubDate>"+a.pubslished+"</pubDate>");
		print("        <itunes:duration>"+a.duration+"</itunes:duration>");
		print("    </item>");
	});

	print("</channel>");
	print("</rss>");
};


module.exports = async () => {
    return async (context) => {
        const fileData = (await context.ftpClient.files()).filter(e => e != "podcast.xml");

		const colletion = fileData.map(e => entryData(e, context.configure));
		
        const entries = [];
		writeXML(context.configure, colletion, (text) => entries.push(text));

		const xml = entries.join("\r\n");
		await context.ftpClient.upload(xml, "podcast.xml");

		console.log(xml);
    };
};