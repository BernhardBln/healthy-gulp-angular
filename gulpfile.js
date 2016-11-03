// Gulpfile v0.2.0

var gulp = require('gulp'),
    plugins = require('gulp-load-plugins')(),
    del = require('del'),
    es = require('event-stream'),
    bowerFiles = require('main-bower-files'),
    Q = require('q'),
    map = require('map-stream'),
    Server = require('karma').Server,
    fs = require('fs'),
    _ = require('lodash');

// == PATH STRINGS ========

var paths = {
    scripts: 'app/**/*.js',
    jsTests: 'app-test/',
    styles: ['./app/**/*.css', './app/**/*.scss'],
    images: './app/images/**/*',
    fonts: './app/fonts/**/*',
    index: './app/index.html',
    partials: ['app/**/*.html', '!app/index.html'],
    distDev: './dist.dev',
    distTest: './dist.test',
    distProd: './dist.prod',
    distScriptsTest: './dist.test/scripts',
    distScriptsProd: './dist.prod/scripts',
    scriptsDevServer: 'devServer/**/*.js'
};

var angularTemplatesModuleName = 'healthyGulpAngularAppComponents';

// copy special images referenced by css into a subfolder of /styles
var specialImageTreatment = [
    // {pattern: /leaflet\/dist\/images\/.+\.png$/i, target: 'images'},
];

var jsScriptsRegex = /\.js$/i,
    pngImagesRegex = /\.png$/i,
    cssStylesRegex = /\.css$/i,
    lessStylesRegex = /\.less$/i,
    fontsStylesRegex = /\.(ttf|woff|eot|svg|woff2)$/i;

// == PIPE SEGMENTS ========

var pipes = {};

// can be used in a pipe to print out the names of the files sent through the pipe. Use like this:
// .pipe(map(logFilenames('Add to bundle')))
var logFilenames = function(title) {
    return function(file, cb) {
        console.log('-> ' + title + ': ' + file.path);
        cb(null, file);
    };
};

this.vendorScriptsOrder = [
    // non-angular dependencies
    'moment.js', 'de.js', 'jquery.js', 'Chart.js', 'daterangepicker.js',
    // angular
    'angular.js', 'angular-*.js', 'ui-bootstrap*.js'];

var self = this;

pipes.orderedVendorScripts = function() {
    return plugins.order(self.vendorScriptsOrder);
};


pipes.orderedAppScripts = function() {
    return plugins.angularFilesort();
};

pipes.minifiedFileName = function() {
    return plugins.rename(function(path) {
        path.extname = '.min' + path.extname;
    });
};

pipes.validatedAppScripts = function() {

    return gulp.src(paths.scripts)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail', {verbose: true}))
        .pipe(plugins.jscs())
        .pipe(plugins.jscs.reporter())
        .pipe(plugins.jsvalidate())
        .pipe(gulp.dest(paths.distDev));
};

pipes.builtAppScriptsDev = function() {
    return pipes.validatedAppScripts()
        .pipe(gulp.dest(paths.distDev));
};

pipes.builtAppScriptsTest = function() {
    return pipes.validatedAppScripts()
        .pipe(gulp.dest(paths.distScriptsTest));
};
pipes.builtAppScriptsProd = function() {
    return pipes.validatedAppScripts()
     .pipe(pipes.orderedAppScripts())
        .pipe(plugins.ngAnnotate())
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.concat('app.min.js'))
        .pipe(plugins.uglify())
        .pipe(plugins.sourcemaps.write())
        .pipe(gulp.dest(paths.distScriptsProd));
};

pipes.builtVendorScriptsDev = function() {
    return gulp.src(bowerFiles({
            includeDev: true,
            filter: function(e) {
                return jsScriptsRegex.test(e);
            }
        })
    )
        .pipe(map(logFilenames('adding vendor script for dev')))
        .pipe(gulp.dest('dist.dev/bower_components'));
};

pipes.builtVendorScriptsTest = function() {

    return gulp.src(bowerFiles({
            includeDev: true,
            filter: function(e) {
                return jsScriptsRegex.test(e);
            }
        })
    )
        .pipe(pipes.orderedVendorScripts())
        .pipe(plugins.stripComments())
        .pipe(map(logFilenames('adding vendor script for test')))
        .pipe(plugins.concat('vendor.js'))
        .pipe(gulp.dest(paths.distScriptsTest));
};

pipes.builtVendorScriptsProd = function() {
    return gulp.src(bowerFiles({
            filter: function(e) {
                return jsScriptsRegex.test(e);
            }
        })
    )
        .pipe(pipes.orderedVendorScripts())
        .pipe(plugins.concat('vendor.min.js'))
        .pipe(map(logFilenames('adding vendor script for prod')))
        .pipe(plugins.uglify())
        .pipe(gulp.dest(paths.distScriptsProd));
};

pipes.validatedDevServerScripts = function() {
    return gulp.src(paths.scriptsDevServer)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jscs())
        .pipe(plugins.jscs.reporter())
        .pipe(plugins.jsvalidate());
};

pipes.validatedTestScripts = function() {
    return gulp.src(paths.distScriptsTest)
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jscs())
        .pipe(plugins.jscs.reporter())
        .pipe(plugins.jsvalidate());
};

pipes.validatedPartials = function() {
    return gulp.src(paths.partials)
        .pipe(plugins.htmlhint({'doctype-first': false}))
        .pipe(plugins.htmlhint.reporter());
};

pipes.builtPartialsDev = function() {
    return pipes.validatedPartials()
        .pipe(gulp.dest(paths.distDev));
};

pipes.scriptedPartialsDev = function() {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: angularTemplatesModuleName
        }))
        .pipe(gulp.dest(paths.distDev + "/templates"));
};

pipes.scriptedPartialsTest = function() {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: angularTemplatesModuleName
        }))
        .pipe(plugins.concat('templates.min.js'))
        .pipe(gulp.dest(paths.distScriptsTest));
};
pipes.scriptedPartialsProd = function() {
    return pipes.validatedPartials()
        .pipe(plugins.htmlhint.failReporter())
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(plugins.ngHtml2js({
            moduleName: angularTemplatesModuleName
        }))
        .pipe(plugins.concat('templates.min.js'))
        .pipe(plugins.uglify())
        .pipe(gulp.dest(paths.distScriptsProd));
};

pipes.builtStylesDev = function() {
    return gulp.src(paths.styles)
        .pipe(plugins.sass())
        .pipe(gulp.dest(paths.distDev));
};

pipes.buildVendorStylesLess = function() {
    return gulp.src(bowerFiles({
            filter: function(e) {
                return lessStylesRegex.test(e);
            }
        })
    )
        .pipe(plugins.less({}));
};

pipes.builtVendorCssStyles = function() {
    return gulp.src(bowerFiles({
            filter: function(e) {
                return cssStylesRegex.test(e);
            }
        })
    );
};

pipes.builtVendorStylesDev = function() {
    return es.merge(pipes.buildVendorStylesLess(), pipes.builtVendorCssStyles())
        .pipe(gulp.dest(paths.distDev + "/styles"));
};

pipes.builtVendorStylesProd = function(outdir) {

    outdir = outdir || paths.distProd + "/styles";

    return es.merge(pipes.buildVendorStylesLess(), pipes.builtVendorCssStyles())
        .pipe(plugins.concat('vendor.min.css'))
        .pipe(plugins.minifyCss())
        .pipe(gulp.dest(outdir));
};

pipes.builtStylesProd = function(outdir) {

    outdir = outdir || paths.distProd;

    return gulp.src(paths.styles)
        .pipe(plugins.sourcemaps.init())
        .pipe(plugins.sass())
        .pipe(plugins.minifyCss())
        .pipe(plugins.sourcemaps.write())
        .pipe(pipes.minifiedFileName())
        .pipe(gulp.dest(outdir));
};

pipes.processedFonts = function(base_path) {

    var rename = function() {
        return plugins.rename(function(path) {
            var arrayPath = path.dirname.split("/");
            if (arrayPath.length > 1) {
                arrayPath.splice(0, 1);
                new_path = "../" + arrayPath.join('/');
            } else {
                new_path = "./"
            }
            path.dirname = new_path;
        });
    };

    return es.merge(
        gulp.src(paths.fonts)
            .pipe(rename())
            .pipe(gulp.dest(base_path + "/fonts")),
        gulp.src(bowerFiles({
                filter: function(e) {
                    return fontsStylesRegex.test(e);
                }
            }),
            {base: 'bower_components'}
        )
            .pipe(rename())
            .pipe(gulp.dest(base_path + "/styles")));
};

pipes.normalImages = function(outdirImg) {
    return gulp.src(paths.images)
        .pipe(gulp.dest(outdirImg));
};

var isSpecialImage = function(file) {
    return _.some(specialImageTreatment, function(specialImageDef) {
        return specialImageDef.pattern.test(file);
    });
};

pipes.vendorImages = function(outdirStyles) {
    return gulp.src(bowerFiles({
            filter: function(e) {
                return pngImagesRegex.test(e) && !isSpecialImage(e);
            }
        })
    )
    // most likely referenced from css files, e.g. dlx_icheck.png
        .pipe(gulp.dest(outdirStyles));
};

pipes.specialVendorImages = function(outdirStyles) {

    return es.merge(specialImageTreatment.map(function(specialImageDef) {
        return gulp.src(bowerFiles({
                filter: function(e) {
                    return specialImageDef.pattern.test(e);
                }
            })
        )
        // these need special treatment (output folder)
        // currently that's only the leaflet images that need to be under /styles/images
            .pipe(gulp.dest(outdirStyles + specialImageDef.target));
    }));


};

pipes.processedImages = function(outdirImg, outdirStyles) {
    return es.merge(
        pipes.normalImages(outdirImg),
        pipes.vendorImages(outdirStyles),
        pipes.specialVendorImages(outdirStyles));
};

pipes.processedImagesDev = function() {
    return pipes.processedImages(paths.distDev + '/images/', paths.distDev + '/styles/');
};

pipes.processedImagesTest = function() {
    return pipes.processedImages(paths.distTest + '/images/', paths.distTest + '/styles/');
};

pipes.processedImagesProd = function() {
    return pipes.processedImages(paths.distProd + '/images/', paths.distProd + '/styles/');
};

pipes.validatedIndex = function() {
    return gulp.src(paths.index)
        .pipe(plugins.htmlhint())
        .pipe(plugins.htmlhint.reporter());
};

pipes.builtIndexDev = function() {

    var orderedVendorScripts = pipes.builtVendorScriptsDev()
        .pipe(pipes.orderedVendorScripts());

    var orderedAppScripts = pipes.builtAppScriptsDev()
        .pipe(pipes.orderedAppScripts());

    var scriptedPartialsDev = pipes.scriptedPartialsDev();

    var appStyles = pipes.builtStylesDev();
    var vendorStyles = pipes.builtVendorStylesDev();

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distDev)) // write first to get relative path for inject
        .pipe(plugins.inject(orderedVendorScripts, {relative: true, name: 'bower'}))
        .pipe(plugins.inject(scriptedPartialsDev, {relative: true, name: 'templates'}))
        .pipe(plugins.inject(orderedAppScripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.inject(vendorStyles, {relative: true, name: 'bower'}))
        .pipe(gulp.dest(paths.distDev));
};

pipes.builtIndexTest = function() {

    var vendorScripts = pipes.builtVendorScriptsTest();
    var scriptedPartialsProd = pipes.scriptedPartialsTest();
    var appStyles = pipes.builtStylesProd(paths.distTest);
    var vendorStyles = pipes.builtVendorStylesProd(paths.distTest + "/styles");

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distTest)) // write first to get relative path for inject
        .pipe(plugins.inject(vendorScripts, {relative: true, name: 'bower'}))
        .pipe(plugins.inject(scriptedPartialsProd, {relative: true, name: 'templates'}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.inject(vendorStyles, {relative: true, name: 'bower'}))
        .pipe(gulp.dest(paths.distTest));
};

pipes.builtIndexProd = function() {

    var vendorScripts = pipes.builtVendorScriptsProd();
    var scriptedPartialsProd = pipes.scriptedPartialsProd();
    var appScripts = pipes.builtAppScriptsProd();
    var appStyles = pipes.builtStylesProd();
    var vendorStyles = pipes.builtVendorStylesProd();

    return pipes.validatedIndex()
        .pipe(gulp.dest(paths.distProd)) // write first to get relative path for inject
        .pipe(plugins.inject(vendorScripts, {relative: true, name: 'bower'}))
        .pipe(plugins.inject(scriptedPartialsProd, {relative: true, name: 'templates'}))
        .pipe(plugins.inject(appScripts, {relative: true}))
        .pipe(plugins.inject(appStyles, {relative: true}))
        .pipe(plugins.inject(vendorStyles, {relative: true, name: 'bower'}))
        .pipe(plugins.htmlmin({collapseWhitespace: true, removeComments: true}))
        .pipe(gulp.dest(paths.distProd));
};

pipes.builtAppDev = function() {
    return es.merge(pipes.builtIndexDev(), pipes.processedFonts(paths.distDev), pipes.processedImagesDev());
};

pipes.builtAppTest = function() {
    return es.merge(pipes.builtIndexTest(),
        pipes.processedFonts(paths.distTest),
        pipes.processedImagesTest());
};

pipes.builtAppProd = function() {
    return es.merge(pipes.builtIndexProd(), pipes.processedFonts(paths.distProd), pipes.processedImagesProd());
};

// == TASKS ========

// removes all compiled dev files
gulp.task('clean-dev', function() {
    var deferred = Q.defer();
    del(paths.distDev, function() {
        deferred.resolve();
    });
    return deferred.promise;
});

// removes all compiled test files
gulp.task('clean-test', function() {
    var deferred = Q.defer();
    del(paths.distTest, function() {
        deferred.resolve();
    });
    return deferred.promise;
});

// removes all compiled production files
gulp.task('clean-prod', function() {
    var deferred = Q.defer();
    del(paths.distProd, function() {
        deferred.resolve();
    });
    return deferred.promise;
});

// checks html source files for syntax errors
gulp.task('validate-partials', pipes.validatedPartials);

// checks index.html for syntax errors
gulp.task('validate-index', pipes.validatedIndex);

// moves html source files into the dev environment
gulp.task('build-partials-dev', pipes.builtPartialsDev);

// converts partials to javascript using html2js
gulp.task('convert-partials-to-js', pipes.scriptedPartialsDev);

// runs jshint on the dev server scripts
gulp.task('validate-devserver-scripts', pipes.validatedDevServerScripts);

// runs jshint on the dev server scripts
gulp.task('validate-test-scripts', pipes.validatedTestScripts);

// runs jshint on the app scripts
gulp.task('validate-app-scripts', pipes.validatedAppScripts);

// moves app scripts into the dev environment
gulp.task('build-app-scripts-dev', pipes.builtAppScriptsDev);

// concatenates, uglifies, and moves app scripts and partials into the prod environment
gulp.task('build-app-scripts-prod', pipes.builtAppScriptsProd);

// compiles app sass and moves to the dev environment
gulp.task('build-styles-dev', pipes.builtStylesDev);

// compiles and minifies app sass to css and moves to the prod environment
gulp.task('build-styles-prod', pipes.builtStylesProd);

// moves vendor scripts into the dev environment
gulp.task('build-vendor-scripts-dev', pipes.builtVendorScriptsDev);

// concatenates, uglifies, and moves vendor scripts into the prod environment
gulp.task('build-vendor-scripts-prod', pipes.builtVendorScriptsProd);

// validates and injects sources into index.html and moves it to the dev environment
gulp.task('build-index-dev', pipes.builtIndexDev);

// validates and injects sources into index.html, minifies and moves it to the dev environment
gulp.task('build-index-prod', pipes.builtIndexProd);

// builds a complete dev environment
gulp.task('build-app-dev', pipes.builtAppDev);

// builds a complete prod environment
gulp.task('build-app-prod', pipes.builtAppProd);

// cleans and builds a complete dev environment
gulp.task('clean-build-app-dev', ['clean-dev'], pipes.builtAppDev);

// cleans and builds a complete test environment
gulp.task('clean-build-app-test', ['clean-test'], pipes.builtAppTest);

// cleans and builds a complete prod environment
gulp.task('clean-build-app-prod', ['clean-prod'], pipes.builtAppProd);

// clean, build, and watch live changes to the dev environment
gulp.task('watch-dev', ['clean-build-app-dev', 'validate-devserver-scripts'], function() {

    // start nodemon to auto-reload the dev server
    plugins.nodemon({script: 'server.js', ext: 'js', watch: ['devServer/'], env: {NODE_ENV: 'development'}})
        .on('change', ['validate-devserver-scripts'])
        .on('restart', function() {
            console.log('[nodemon] restarted dev server');
        });

    // start live-reload server
    plugins.livereload.listen({start: true});

    // watch index
    gulp.watch(paths.index, function() {
        return pipes.builtIndexDev()
            .pipe(plugins.livereload());
    });

    // watch app coffee scripts
    gulp.watch(paths.coffee_scripts, function() {
        return pipes.builtAppScriptsDev()
            .pipe(plugins.livereload());
    });

    // watch app scripts
    gulp.watch(paths.scripts, function() {
        return pipes.builtAppScriptsDev()
            .pipe(plugins.livereload());
    });

    // watch html partials
    gulp.watch(paths.partials, function() {
        return pipes.scriptedPartialsDev()
            .pipe(plugins.livereload());
    });

    // watch styles
    gulp.watch(paths.styles, function() {
        return pipes.builtStylesDev()
            .pipe(plugins.livereload());
    });

});


// clean, build, and watch live changes to the prod environment
gulp.task('watch-prod', ['clean-build-app-prod', 'validate-devserver-scripts'], function() {

    // start nodemon to auto-reload the dev server
    plugins.nodemon({script: 'server.js', ext: 'js', watch: ['devServer/'], env: {NODE_ENV: 'production'}})
        .on('change', ['validate-devserver-scripts'])
        .on('restart', function() {
            console.log('[nodemon] restarted dev server');
        });

    // start live-reload server
    plugins.livereload.listen({start: true});

    // watch index
    gulp.watch(paths.index, function() {
        return pipes.builtIndexProd()
            .pipe(plugins.livereload());
    });

    // watch app coffee scripts
    gulp.watch(paths.coffee_scripts, function() {
        return pipes.builtAppScriptsProd()
            .pipe(plugins.livereload());
    });

    // watch app scripts
    gulp.watch(paths.scripts, function() {
        return pipes.builtAppScriptsProd()
            .pipe(plugins.livereload());
    });

    // watch hhtml partials
    gulp.watch(paths.partials, function() {
        return pipes.scriptedPartialsProd()
            .pipe(plugins.livereload());
    });

    // watch styles
    gulp.watch(paths.styles, function() {
        return pipes.builtStylesProd()
            .pipe(plugins.livereload());
    });

});

gulp.task('prepare-test', ['clean-build-app-test', 'validate-test-scripts']);

gulp.task('test', ['prepare-test'], function(done) {
    new Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});
gulp.task('tdd', ['prepare-test'], function(done) {
    new Server({
        configFile: __dirname + '/karma.conf.js'
    }, done).start();
});

gulp.task('watchTest', function() {
    gulp.run('test');
    gulp.watch(paths.js, ['test']);
    gulp.watch(paths.jsTest, ['test']);
});

gulp.task('doc', function() {
    gulp.src(paths.scripts, {read: false})
        .pipe(jsdoc({
            "opts": {
                "destination": "./docs/jsdoc"
            }
        }));
});

gulp.task('mockserver', function() {
    var mockserver = require('mockserver-grunt');
    mockserver.start_mockserver({
        // have server listen under 8081, and forward requests
        // that are not overriden to 8080
        // --> Set port in real server to 8081 in order to
        // use mock server
        serverPort: 8081,
        proxyPort: 8080,
        verbose: true
    });
});

gulp.task('build', ['clean-build-app-prod']);

// default task builds for prod
gulp.task('default', ['watch-dev']);
