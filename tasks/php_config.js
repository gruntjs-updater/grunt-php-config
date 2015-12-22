/*
 * grunt-php-config
 * https://github.com/mothepro/grunt-php-config
 *
 * Copyright (c) 2015 Maurice Prosper
 * Licensed under the MIT license.
 */

'use strict';
Array.prototype.clone = function() {
    return this.slice(0);
};

module.exports = function(grunt) {
    var util = require('util');
    var _ = require('lodash');

    var constants = [];

    var makeConst = function(consts, parent, raw, allCaps) {
        var k, val, _raw, _allCaps, _parent, kind;

        for(k in consts) {
            if(!consts.hasOwnProperty(k)) continue;

            // props
            val         = consts[k].value || consts[k]; // for shorthand
            _raw        = consts[k].raw || raw; // override
            _allCaps    = consts[k].allCaps || allCaps; // override

            // add the constant if scalar
            kind = grunt.util.kindOf(val);
            if(['string', 'number', 'boolean', 'date', 'null'].indexOf(kind) >= 0) {
                var c = {
                    name: k,
                    value: val,
                    parent: parent,
                    raw: _raw,
                    allCaps: _allCaps,
                    kind: kind
                };
                constants.push(c);

                grunt.log.debug(c);
            }

            // loop through children
            if(grunt.util.kindOf(consts[k]) === 'object')
                if(_.without(Object.keys(consts[k]), 'value', 'raw', 'allCaps').length) {
                    _parent = parent.clone();
                    _parent.push(k);
                    makeConst(consts[k], _parent, _raw, _allCaps);
                }
        }
    };

    var write = function (type) {
        var data, name, value;

        switch(type) {
            case 'php':
                data = util.format('<?php // Generated on %s\n', grunt.template.today('mmmm dS yyyy @ h:MM:ss TT'));

                constants.forEach(function(v) {
                    name = v.name;
                    value = v.value;

                    // Namespace of parents, followed by another '\' for parents
                    name = v.parent.join('\\') + (v.parent.length ? '\\' : '') + name;

                    // standardize date string
                    if(v.kind === 'date') {
                        v.kind = 'string';
                        v.value = v.value.toString();
                    }

                    // escape strings
                    if(v.kind === 'string' && !v.raw)
                        value = util.format("'%s'", value.replace(/'/g, "\\'"));

                    if(v.allCaps)
                        name = name.toUpperCase();

                    data += util.format('define(\'%s\', %s);\n', name, value);
                });

                break;

            default:
                grunt.fail.fatal(util.format('Unknown type "%s".', type));
        }

        return data;
    };

    grunt.registerMultiTask('php_config', 'Builds a PHP config and constants file', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            type: 'php',
            allCaps: true,
            raw: false,

            constants: {}
        }), out = '';

        // reset array
        constants = [];

        grunt.log.debug(options.constants);

        if (options.constants)
            makeConst(options.constants, [], options.raw, options.allCaps);

        out = write(options.type);

        if (!this.errorCount)
            this.files.forEach(function (f) {
                grunt.file.write(f.dest, out);
                grunt.log.ok(util.format('%s %s saved in %s file %s.', constants.length.toString().cyan, grunt.util.pluralize(constants.length, "constant/constants"), options.type, f.dest.yellow));
            });

        return !this.errorCount;
    });
};