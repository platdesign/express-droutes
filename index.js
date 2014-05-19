var
		fs = require('fs')
	,	path = require('path')
	,	router
;

var exists = function(){
	return fs.existsSync( path.join.apply(path, arguments) );
};


module.exports = function(appRouter){
	router = appRouter;

	var service = {};


	service.scan = function(baseDir, baseRoute){

		scanDirForRoutes(baseDir, baseRoute, function(routePath, dir){
			var ctrl = getOrCreateCtrl(dir);

			ctrlByMethod(ctrl, 'ALL', dir);
			ctrlByMethod(ctrl, 'GET', dir);
			ctrlByMethod(ctrl, 'POST', dir);
			ctrlByMethod(ctrl, 'PUT', dir);
			ctrlByMethod(ctrl, 'DELETE', dir);

			registerCtrlAtRouter(routePath, ctrl);
		});

	};


	return service;
};


var ctrlByMethod = function(ctrl, method, dir) {
	method = method.toLowerCase();

	var methodFile = function(filename) {
		return path.join(dir, method + '.' + filename);
	}
	

	if( 
		!ctrl[method] && 
		(exists(methodFile('m.js')) || exists(methodFile('v.jade'))) 
	) {
		ctrl[method] = [function(req, res, next){
			res.scope = {};
			next();
		}];

		if( exists( methodFile('m.js') ) ) {
			ctrl[method].push( require( methodFile('m.js') ) );
		}
		if( exists( methodFile('v.jade') ) ) {
			ctrl[method].push( function(req, res){
				res.render(methodFile('v.jade'), res.scope);
			} );
		} else if( exists( methodFile('m.js') ) ) {
			ctrl[method].push( function(req, res){
				res.json(res.code || 200, res.scope);
			} );
		}
	}

};


var getOrCreateCtrl = function(dir) {

	var ctrlFile = path.join(dir, 'c.js');
	var ctrl;

	if( fs.existsSync(ctrlFile) ) {
		ctrl = require( ctrlFile );
	} else {
		ctrl = {};
	}

	var extendByMethod = function (method){
		method = method.toLowerCase();
		if(!ctrl[method]) {
			var file = path.join(dir, method + '.c.js');

			if( fs.existsSync(file) ) {
				ctrl[method] = require(file);
			}
		}
	};

	extendByMethod('all');
	extendByMethod('get');
	extendByMethod('post');
	extendByMethod('put');
	extendByMethod('delete');

	return ctrl;
};



var registerCtrlAtRouter = function(routePath, ctrl) {

	for(var method in ctrl) {
		if(method) {
			router[method].apply(router, [routePath, ctrl[method]]);
		}
	}

};




/* Helper */
var scanDirRecursive = function(dir, closure) {

	closure(dir);

	fs.readdirSync(dir).forEach(function(file){
		
		var filePath = path.join(dir, file);

		if( fs.statSync( filePath ).isDirectory() ) {
			scanDirRecursive( filePath , closure );
		}
	});
};



var scanDirForRoutes = function(baseDir, baseRoute, routeWorker) {
	baseDir = path.normalize(baseDir);
	baseRoute = baseRoute || '/';

	scanDirRecursive(baseDir, function(dir){
		var routePath = path.normalize(baseRoute + dir.replace(baseDir, ''));

		routeWorker(routePath, dir);
	});

};



