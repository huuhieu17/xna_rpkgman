const express = require('express');
const request = require('request');
const path = require('path');
const JSON5 = require('json5');
const globby = require('globby');
require('dotenv').config();
const env = process.env;

const config = {
	pkgfolder: env.PKG_FOLDER || "/path/to/folder/with/pkg/files",
	myip: env.MYIP || "YOUR.SERVER.IP.ADDRESS",
	ps4ip: env.PS4IP || "YOUR.PS4.IP.ADDRESS",
	myport: env.MY_PORT || 9999,
	ps4port: env.PS4_PORT || 12800
}

const app = express();  


let myaddr = config.myip+":"+config.myport
let ps4addr = config.ps4ip+":"+config.ps4port
let root = config.pkgfolder


app.get('/', function(req, resp) {
    resp.sendFile(path.join(__dirname+'/index.html'));
});

app.get('/status', function(req, resp) {
    request.get('http://'+ps4addr, {timeout: 1500})
        .on('response', (response) => {
            resp.send(true);
        })
        .on('error', (err) => {
            resp.send(false);
    });
});

let handle_task = (req, resp, what) => {
    let taskid = req.params['taskid'];
    let data = {
        'task_id': Number(taskid)
    };
    let srv = {
        uri: 'http://'+ps4addr+'/api/'+what+'_task',
        body: JSON.stringify(data),
        method: 'POST'
    };

    request(srv, function (error, response) {
        if (response) {
            let obj = JSON5.parse(response.body);
            console.log(error, obj);
            resp.send(obj);
        }
    });
};

app.get('/pause/:taskid', function(req, resp) {
    handle_task(req, resp, 'pause');
});

app.get('/resume/:taskid', function(req, resp) {
    handle_task(req, resp, 'resume');
});

app.get('/stop/:taskid', function(req, resp) {
    handle_task(req, resp, 'stop');
});

app.get('/start/:taskid', function(req, resp) {
    handle_task(req, resp, 'start');
});

app.get('/remove/:taskid', function(req, resp) {
    handle_task(req, resp, 'unregister');
});

app.get('/progress/:taskid', function(req, resp) {
    let taskid = req.params['taskid'];
    let data = {
        'task_id': Number(taskid)
    };
    let srv = {
        uri: 'http://'+ps4addr+'/api/get_task_progress',
        body: JSON.stringify(data),
        method: 'POST'
    };

    request(srv, function (error, response) {
        if (response) {
            let obj = JSON5.parse(response.body);
            console.log(error, obj);
            resp.send(obj);
        }
    });
});

app.get('/listfiles', function(req, resp){
    let pkgs = [];
    let files = globby.sync(root+'/**/*.pkg');
    files.forEach(file => {
        pkgs.push(file.substring(root.length+1));
    });

    let dirs = [];
    pkgs.forEach(pkg => {
	dir = pkg.substring(0, pkg.lastIndexOf('/')+1);
	if (!dirs.includes(dir)) {
	    dirs.push(dir);
	}
    });
    pkgs = dirs.concat(pkgs)

    resp.send({'files': pkgs});
});

app.get('/install/:file', function(req, resp) {
    let filename = req.params['file'];
    console.log("Install: %s", filename);
    let data = {
        'type': 'direct',
        'packages': [
            'http://'+myaddr+'/serve/'+filename,
        ]
    };
    let srv = {
        uri: 'http://'+ps4addr+'/api/install',
        body: JSON.stringify(data),
        method: 'POST'
    }

    request(srv, function (error, response) {
        if (response) {
            let obj = JSON5.parse(response.body);
            console.log(error, obj);
            resp.send(obj);
        }
    });
});

app.get('/avail/:file', function(req, resp) {
    let filename = req.params['file'];
    let data = {
        'title_id': filename
    };
    let srv = {
        uri: 'http://'+ps4addr+'/api/is_exists',
        body: JSON.stringify(data),
        method: 'POST'
    }

    request(srv, function (error, response) {
        if (response) {
            let obj = JSON5.parse(response.body);
            console.log(error, obj);
            resp.send(obj);
        }
    });
});

app.get('/uninstall/:what/:file', function(req, resp) {
    let what = req.params['what'];
    let filename = req.params['file'];
    let data = {
        'title_id': filename
    };
    let srv = {
        uri: 'http://'+ps4addr+'/api/uninstall_'+what,
        body: JSON.stringify(data),
        method: 'POST'
    }

    request(srv, function (error, response) {
        if (response) {
            let obj = JSON5.parse(response.body);
            console.log(error, obj);
            resp.send(obj);
        }
    });
});

app.get('/serve/:file', function(req, resp){
    let filename = req.params['file'];
    //filename = filename.replace(/[^a-zA-Z0-9.-]/g);
    filename = filename.replace(/@S/g, '/');
    filename = filename.replace(/@W/g, ' ');
    let filepath = path.resolve(root, filename);
    console.log("Serving: %s", filepath);
    resp.status(200).download(filepath, "xna.pkg");
});

let server = app.listen(config.myport, function () {  
  console.log("App listening at http://%s", myaddr)  
})  
