import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import globals from 'rollup-plugin-node-globals';
import builtins from 'rollup-plugin-node-builtins';
import svelte from "rollup-plugin-svelte";
import copy from 'rollup-plugin-copy';

export default [
    {
        input: 'src/inject/index.es6',
        output: {
            file: 'dist/inject/index.js',
            format: 'iife',
            name: 'RoboFill'
        },
        plugins: [
            builtins(),
            svelte({
                include: 'src/inject/ui/*.html',
                generate: 'iife',
                css: true,
                cascade: false
            }),
            resolve({
                jsnext: true,
                main: true,
                browser: true
            }),
            commonjs({
                include: [
                    'node_modules/**',
                    'src/shared/lib/**'
                ],
                ignoreGlobal: false
            }),
            globals(),
            babel({
                exclude: [
                    'node_modules/**',
                    'src/shared/lib/**'
                ]
            })
        ]
    },
    {
        input: 'src/spa/index.es6',
        output: {
            file: 'dist/spa/index.js',
            format: 'iife',
            name: 'RoboFillSpa'
        },
        plugins: [
            copy({
                'src/spa/scaffold/index.html' : 'dist/spa/index.html'
            }),
            builtins(),
            svelte({
                include: 'src/spa/ui/*.html',
                generate: 'iife',
                css: true,
                cascade: false
            }),
            resolve({
                jsnext: true,
                main: true,
                browser: true
            }),
            commonjs({
                include: [
                    'node_modules/**',
                    'src/shared/lib/**'
                ],
                ignoreGlobal: false
            }),
            globals(),
            babel({
                exclude: [
                    'node_modules/**',
                    'src/shared/lib/**'
                ]
            })
        ]
    },
    {
        input: 'src/bookmarklet/index.es6',
        output: {
            file: 'dist/index.js',
            format: 'iife',
            name: 'BookmarkletSpa'
        },
        plugins: [
            copy({
                'src/bookmarklet/scaffold/index.html' : 'dist/index.html'
            }),
            builtins(),
            svelte({
                include: 'src/bookmarklet/ui/*.html',
                generate: 'iife',
                css: true,
                cascade: false
            }),
            resolve({
                jsnext: true,
                main: true,
                browser: true
            }),
            commonjs({
                include: [
                    'node_modules/**',
                    'src/bookmarklet/lib/uglify.js',
                    'src/shared/lib/**'
                ],
                ignoreGlobal: false
            }),
            globals(),
            babel({
                exclude: [
                    'node_modules/**',
                    'src/shared/lib/**'
                ]
            })
        ]
    }

]