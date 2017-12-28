'use strict';

var gulp = require('gulp'),
    pug = require('gulp-pug'),
    watch = require('gulp-watch'),
    prefixer = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    sass = require('gulp-sass'),
    sourcemaps = require('gulp-sourcemaps'),
    rigger = require('gulp-rigger'),
    cssmin = require('gulp-minify-css'),
    imagemin = require('gulp-imagemin'),
    pngquant = require('imagemin-pngquant'),
    rimraf = require('rimraf'),
    gulpIf = require('gulp-if'),
    debug = require('gulp-debug'),
    newer = require('gulp-newer'),
    notify = require('gulp-notify'),
    plumber = require('gulp-plumber'),
    browserSync = require("browser-sync"),
    reload = browserSync.reload,
    spritesmith = require('gulp.spritesmith');

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV  == 'development';

var path = {
    build: { // куда складывать готовые после сборки файлы
        html: 'build/',
        js: 'build/js/',
        css: 'build/css/',
        img: 'build/img/',
        fonts: 'build/fonts/'
    },
    src: { //Пути исходников
        html: 'src/*.html', //Синтаксис src/*.html говорит gulp что мы хотим взять все файлы с расширением .html
        pug: 'src/pug/pages/*.pug',
        js: 'src/js/main.js',//В стилях и скриптах нам понадобятся только main файлы
        style: 'src/style/main.scss',
        img: 'src/img/*.*', //Синтаксис img/**/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
        sprite: 'src/img/icons/*.*',
        fonts: 'src/fonts/**/*.*'
    },
    watch: { // за изменением каких файлов мы хотим наблюдать
        html: 'src/**/*.html',
        pug: 'src/pug/**/*.pug',
        js: 'src/js/**/*.js',
        style: 'src/style/**/*.scss',
        img: 'src/img/*.*',
        sprite: 'src/img/icons/*.*',
        fonts: 'src/fonts/**/*.*'
    },
    clean: './build'
};

var config = {
    server: {
        baseDir: "./build"
    },
    //tunnel: true,
    host: 'localhost',
    port: 3000,
    logPrefix: "DKlimchuk"
};


// --------- СБОРКА -------------------

// Работа с Pug
gulp.task('pug:build', function() {
    return gulp.src(path.src.pug)
        .pipe(plumber())
        .pipe(pug({
            pretty: true
        }))
        .on("error", notify.onError(function(error) {
            return "Message to the notifier: " + error.message;
        }))
        .pipe(gulp.dest(path.build.html))
        .pipe(reload({stream: true}));
});

gulp.task('js:build', function () {
    gulp.src(path.src.js) //Найдем наш main файл
        .pipe(rigger()) //Прогоним через rigger
        //.pipe(gulpIf(isDev, sourcemaps.init())) //Инициализируем sourcemap
        .pipe(uglify()) //Сожмем наш js
        //.pipe(gulpIf(isDev, sourcemaps.write())) //Пропишем карты
        .pipe(gulp.dest(path.build.js)) //Выплюнем готовый файл в build
        .pipe(reload({stream: true})); //И перезагрузим сервер
});

gulp.task('sprite:build', function () {
    var fileName = 'sprite';
    var spriteData = gulp.src(path.src.sprite).pipe(spritesmith({
        imgName: fileName + '.png',
        cssName: fileName + '.scss',
        cssFormat: 'scss',
        algorithm: 'top-down',
        padding: 100,
        imgPath: '../img/' + fileName + '.png',
        cssTemplate: 'scss.template.mustache',
        cssVarMap: function(sprite) {
            sprite.name = 's-' + sprite.name
        }
    }));

    spriteData.img.pipe(gulp.dest('./src/img/')); // путь, куда сохраняем картинку
    spriteData.css.pipe(gulp.dest('./src/style/partials/')); // путь, куда сохраняем стили
});

gulp.task('style:build', function () {
    gulp.src(path.src.style) //Выберем наш main.scss
        .pipe(plumber({
            errorHandler: notify.onError(function(err){
                return{
                    title: 'Styles',
                    message: err.message
                };
            })
        }))
        .pipe(gulpIf(isDev, sourcemaps.init())) //сборка
        .pipe(sass()) //Скомпилируем
        .pipe(prefixer()) //Добавим вендорные префиксы
        .pipe(cssmin()) //Сожмем
        .pipe(gulpIf(isDev, sourcemaps.write()))
        .pipe(gulp.dest(path.build.css)) //И в build
        .pipe(reload({stream: true}));
});

gulp.task('image:build', function () {
    gulp.src(path.src.img) //Выберем наши картинки
        .pipe(newer(path.build.img))
        .pipe(imagemin({ //Сожмем их
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()],
            interlaced: true
        }))
        .pipe(gulp.dest(path.build.img)) //И бросим в build
        .pipe(reload({stream: true}));
});

gulp.task('fonts:build', function() {
    gulp.src(path.src.fonts)
        .pipe(gulp.dest(path.build.fonts))
});


gulp.task('build', [
    'pug:build',
    'style:build',
    'sprite:build',
    'fonts:build',
    'image:build',
    'js:build'
]);

// end --------- СБОРКА -------------------

gulp.task('watch', function(){
    watch([path.watch.pug], function(event, cb) {
        gulp.start('pug:build');
    });
    watch([path.watch.style], function(event, cb) {
        gulp.start('style:build');
    });
    watch([path.watch.js], function(event, cb) {
        gulp.start('js:build');
    });
    watch([path.watch.img], function(event, cb) {
        gulp.start('image:build');
    });
    watch([path.watch.fonts], function(event, cb) {
        gulp.start('fonts:build');
    });
    watch([path.watch.sprite], function(event, cb) {
        gulp.start('sprite:build');
    });
});

gulp.task('webserver', function () {
    browserSync(config);
});

gulp.task('clean', function (cb) {
    rimraf(path.clean, cb);
});

gulp.task('default', ['build', 'webserver', 'watch']);
