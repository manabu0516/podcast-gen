

const readConsole = (() => {
    const readlineSync = require('readline-sync');

    const parameter = (label, require, def) => {
        const value = readlineSync.question(label + ' > ').trim();
        
        if(value === '' && def !== undefined) {
            return def;
        }
        if(value === '' && require === true) {
            return parameter(label, require, def);
        }

        return value;
    }

    return parameter;

})();

const args = process.argv.slice(2);
if(args.length < 2) {
    console.log('invalid parameter : usage [configure] [command] ....[parameter]');
    process.exit(1);
}

const configure = ((target) => {
    const fs = require('fs');
    const confPath = "configure.d/"+ target + '.json';
    const configure = JSON.parse(fs.readFileSync(confPath, 'utf8'));
    return configure;
})(args[0]);

const createFtpClient = (() => {
    const ftp = require("basic-ftp");
    const stream = require('stream');

    const instanceManager = (ftpClient, configure) => {
        const manager = {};

        manager.files = async () => {
            return (await ftpClient.list(configure.ftp_root_dir)).map(e => e.name);
        };

        manager.upload = async (target, output) => {
            await ftpClient.upload(stream.Readable.from([target]), configure.ftp_root_dir + '/'+ output);
        };

        manager.close = () => {
            return ftpClient.close();
        };
        return manager;
    };


    return async (configure) => {
        const ftpClient = new ftp.Client();

        await ftpClient.access({
            host: configure.ftp_host,
            port:configure.ftp_port,
            user:configure.ftp_user,
            password:configure.ftp_password
        });
        return instanceManager(ftpClient, configure);
    };
})();

const command = (async (conf, name) => {
    const invoker = await require("./command/"+name+'.js')(conf);
    const ftpClient = await createFtpClient(conf);

    return async () => {
        await invoker({
            configure : conf,
            ftpClient : ftpClient,
            readConsole : readConsole,
            args : args.slice(2)
        });

        await ftpClient.close();
    };
})(configure, args[1]);

command.then(cmd => cmd()).then(() => console.log("-- command finish"));