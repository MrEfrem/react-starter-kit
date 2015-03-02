/*
 * React.js Starter Kit
 * Copyright (c) 2014 Konstantin Tarkus (@koistya), KriaSoft LLC.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

'use strict';

import 'babel/polyfill';

import _ from 'lodash';
import fs from 'fs';
import path from 'path';
import express from 'express';
import React from 'react';
import Dispatcher from './core/Dispatcher';
import ActionTypes from './constants/ActionTypes';
import AppStore from './stores/AppStore';
import AppElem from './components/App';
import fm from 'front-matter';
import assign from 'react/lib/Object.assign';

var server = express();

server.set('port', (process.env.PORT || 5000));
server.use(express.static(path.join(__dirname)));

//
// Page API
// -----------------------------------------------------------------------------
server.get('/api/page/*', function (req, res) {
    var urlPath = req.path.substr(9);
    new Promise(resolve => {
        getPage(urlPath, resolve);
    }).then(page => {
            res.send(page);
        });
});

//
// Server-side rendering
// -----------------------------------------------------------------------------

// The top-level React component + HTML template for it
var App = React.createFactory(AppElem);
var templateFile = path.join(__dirname, 'templates/index.html');
var template = _.template(fs.readFileSync(templateFile, 'utf8'));

server.get('*', function (req, res) {
    var data = {description: ''};
    new Promise(resolve => {
        getPage(req.path, resolve);
    }).then(page => {
            var app = new App({
                page: page,
                onSetTitle: function (title) {
                    data.title = title;
                },
                onSetMeta: function (name, content) {
                    data[name] = content;
                },
                onPageNotFound: function () {
                    res.status(404);
                }
            });
            data.body = React.renderToString(app);
            var html = template(data);
            res.send(html);
        });
});

server.listen(server.get('port'), function () {
    if (process.send) {
        process.send('online');
    } else {
        console.log('The server is running at http://localhost:' + server.get('port'));
    }
});

//
// Get page
// -----------------------------------------------------------------------------
function getPage(url, cb) {
    var page = AppStore.getPage(url);
    if (undefined == page.path) {
        var pagePath = url;
        if ('/' == pagePath) {
            pagePath += 'index';
        }
        pagePath += '.html';
        var fileName = path.join(__dirname, './content', pagePath);
        new Promise((resolve, reject) => {
            fs.readFile(fileName, 'utf8', (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        }).then(source => {
                var content = fm(source);
                var page = assign({}, {path: url, body: content.body}, content.attributes);
                cb(page);
                Dispatcher.handleServerAction({
                    actionType: ActionTypes.LOAD_PAGE, path: url, page: page
                });
            }).catch(() => {
                cb({
                    title: 'Page Not Found',
                    type: 'notfound'
                });
            });
    } else {
        cb(page);
    }
}
