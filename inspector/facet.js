!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.facet=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var HigherObject = require("higher-object");
var q = require("q");
var Q = q;
var async = require("async");
var chronology = require("chronology");
var Chronology = chronology;
var dummyObject = {};
var objectHasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, key) {
    return objectHasOwnProperty.call(obj, key);
}
function concatMap(arr, fn) {
    return Array.prototype.concat.apply([], arr.map(fn));
}
var Core;
(function (Core) {
    Core.expressionParser = require("../parser/expression");
    Core.isInstanceOf = HigherObject.isInstanceOf;
    Core.isHigherObject = HigherObject.isHigherObject;
    Core.Timezone = Chronology.Timezone;
    Core.Duration = Chronology.Duration;
})(Core || (Core = {}));
var Legacy;
(function (Legacy) {
    Legacy.filterParser = require("../parser/filter");
    Legacy.applyParser = require("../parser/apply");
    Legacy.isInstanceOf = HigherObject.isInstanceOf;
    Legacy.Timezone = Chronology.Timezone;
    Legacy.Duration = Chronology.Duration;
})(Legacy || (Legacy = {}));
var Core;
(function (Core) {
    function getType(value) {
        var typeofValue = typeof value;
        if (typeofValue === 'object') {
            if (value === null) {
                return 'NULL';
            }
            else if (value.toISOString) {
                return 'TIME';
            }
            else {
                var type = value.constructor.type;
                if (!type) {
                    if (Core.Expression.isExpression(value)) {
                        throw new Error("expression used as datum value " + value.toString());
                    }
                    else {
                        throw new Error("can not have an object without a type: " + JSON.stringify(value));
                    }
                }
                if (type === 'SET') {
                    type += '/' + value.setType;
                }
                return type;
            }
        }
        else {
            if (typeofValue !== 'boolean' && typeofValue !== 'number' && typeofValue !== 'string') {
                throw new TypeError('unsupported JS type ' + typeofValue);
            }
            return typeofValue.toUpperCase();
        }
    }
    Core.getType = getType;
    function getFullType(value) {
        var myType = getType(value);
        return myType === 'DATASET' ? value.getFullType() : { type: myType };
    }
    Core.getFullType = getFullType;
    function valueFromJS(v, type) {
        if (type === void 0) { type = null; }
        if (v == null) {
            return null;
        }
        else if (Array.isArray(v)) {
            return Core.NativeDataset.fromJS({
                source: 'native',
                data: v
            });
        }
        else if (typeof v === 'object') {
            switch (type || v.type) {
                case 'NUMBER':
                    var n = Number(v.value);
                    if (isNaN(n))
                        throw new Error("bad number value '" + String(v.value) + "'");
                    return n;
                case 'NUMBER_RANGE':
                    return Core.NumberRange.fromJS(v);
                case 'TIME':
                    return type ? v : new Date(v.value);
                case 'TIME_RANGE':
                    return Core.TimeRange.fromJS(v);
                case 'SHAPE':
                    return Core.Shape.fromJS(v);
                case 'SET':
                    return Core.Set.fromJS(v);
                default:
                    if (v.toISOString) {
                        return v;
                    }
                    else {
                        throw new Error('can not have an object without a `type` as a datum value');
                    }
            }
        }
        else if (typeof v === 'string' && type === 'TIME') {
            return new Date(v);
        }
        return v;
    }
    Core.valueFromJS = valueFromJS;
    function valueToJS(v) {
        if (v == null) {
            return null;
        }
        else {
            var typeofV = typeof v;
            if (typeofV === 'object') {
                if (v.toISOString) {
                    return v;
                }
                else {
                    return v.toJS();
                }
            }
            else if (typeofV === 'number' && !isFinite(v)) {
                return String(v);
            }
        }
        return v;
    }
    Core.valueToJS = valueToJS;
    function valueToJSInlineType(v) {
        if (v == null) {
            return null;
        }
        else {
            var typeofV = typeof v;
            if (typeofV === 'object') {
                if (v.toISOString) {
                    return { type: 'TIME', value: v };
                }
                else {
                    var js = v.toJS();
                    if (!Array.isArray(js)) {
                        js.type = v.constructor.type;
                    }
                    return js;
                }
            }
            else if (typeofV === 'number' && !isFinite(v)) {
                return { type: 'NUMBER', value: String(v) };
            }
        }
        return v;
    }
    Core.valueToJSInlineType = valueToJSInlineType;
    function datumHasRemote(datum) {
        for (var applyName in datum) {
            var applyValue = datum[applyName];
            if (applyName === '$def') {
                for (var defName in applyValue) {
                    var defValue = applyValue[defName];
                    if (defValue instanceof Core.Dataset && defValue.hasRemote())
                        return true;
                }
            }
            else if (applyValue instanceof Core.Dataset && applyValue.hasRemote()) {
                return true;
            }
        }
        return false;
    }
    Core.datumHasRemote = datumHasRemote;
    function introspectDatum(datum) {
        return Q.all(Object.keys(datum).map(function (applyName) {
            var applyValue = datum[applyName];
            if (applyValue instanceof Core.RemoteDataset && applyValue.needsIntrospect()) {
                return applyValue.introspect().then(function (newRemoteDataset) {
                    datum[applyName] = newRemoteDataset;
                });
            }
            return null;
        }).filter(Boolean)).then(function () { return datum; });
    }
    Core.introspectDatum = introspectDatum;
})(Core || (Core = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Core;
(function (Core) {
    function isInteger(n) {
        return !isNaN(n) && n % 1 === 0;
    }
    function isPositiveInteger(n) {
        return isInteger(n) && 0 < n;
    }
    function repeatString(str, times) {
        if (times <= 0)
            return "";
        return new Array(times + 1).join(str);
    }
    var check;
    var AttributeInfo = (function () {
        function AttributeInfo(parameters) {
            if (parameters.special)
                this.special = parameters.special;
            if (hasOwnProperty(parameters, 'type') && typeof parameters.type !== "string") {
                throw new Error("type must be a string");
            }
            this.type = parameters.type;
            this.datasetType = parameters.datasetType;
            this.filterable = hasOwnProperty(parameters, 'filterable') ? Boolean(parameters.filterable) : true;
            this.splitable = hasOwnProperty(parameters, 'splitable') ? Boolean(parameters.splitable) : true;
        }
        AttributeInfo.isAttributeInfo = function (candidate) {
            return Core.isInstanceOf(candidate, AttributeInfo);
        };
        AttributeInfo.register = function (ex) {
            var op = ex.name.replace('AttributeInfo', '').replace(/^\w/, function (s) { return s.toLowerCase(); });
            AttributeInfo.classMap[op] = ex;
        };
        AttributeInfo.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable attributeMeta");
            }
            if (!hasOwnProperty(parameters, 'special')) {
                return new AttributeInfo(parameters);
            }
            var Class = AttributeInfo.classMap[parameters.special];
            if (!Class) {
                throw new Error("unsupported special attributeInfo '" + parameters.special + "'");
            }
            return Class.fromJS(parameters);
        };
        AttributeInfo.prototype._ensureSpecial = function (special) {
            if (!this.special) {
                this.special = special;
                return;
            }
            if (this.special !== special) {
                throw new TypeError("incorrect attributeInfo `special` '" + this.special + "' (needs to be: '" + special + "')");
            }
        };
        AttributeInfo.prototype._ensureType = function (myType) {
            if (!this.type) {
                this.type = myType;
                return;
            }
            if (this.type !== myType) {
                throw new TypeError("incorrect attributeInfo `type` '" + this.type + "' (needs to be: '" + myType + "')");
            }
        };
        AttributeInfo.prototype.toString = function () {
            var special = this.special || 'basic';
            return "" + special + "(" + this.type + ")";
        };
        AttributeInfo.prototype.valueOf = function () {
            var value = {
                type: this.type,
                filterable: this.filterable,
                splitable: this.splitable
            };
            if (this.special)
                value.special = this.special;
            if (this.datasetType)
                value.datasetType = this.datasetType;
            return value;
        };
        AttributeInfo.prototype.toJS = function () {
            var js = { type: this.type };
            if (!this.filterable)
                js.filterable = false;
            if (!this.splitable)
                js.splitable = false;
            if (this.special)
                js.special = this.special;
            if (this.datasetType)
                js.datasetType = this.datasetType;
            return js;
        };
        AttributeInfo.prototype.toJSON = function () {
            return this.toJS();
        };
        AttributeInfo.prototype.equals = function (other) {
            return AttributeInfo.isAttributeInfo(other) && this.special === other.special && this.type === other.type;
        };
        AttributeInfo.prototype.serialize = function (value) {
            return value;
        };
        AttributeInfo.classMap = {};
        return AttributeInfo;
    })();
    Core.AttributeInfo = AttributeInfo;
    check = AttributeInfo;
    var RangeAttributeInfo = (function (_super) {
        __extends(RangeAttributeInfo, _super);
        function RangeAttributeInfo(parameters) {
            _super.call(this, parameters);
            this.separator = parameters.separator;
            this.rangeSize = parameters.rangeSize;
            this.digitsBeforeDecimal = parameters.digitsBeforeDecimal;
            this.digitsAfterDecimal = parameters.digitsAfterDecimal;
            this._ensureSpecial("range");
            this._ensureType('NUMBER_RANGE');
            this.separator || (this.separator = ";");
            if (!(typeof this.separator === "string" && this.separator.length)) {
                throw new TypeError("`separator` must be a non-empty string");
            }
            if (typeof this.rangeSize !== "number") {
                throw new TypeError("`rangeSize` must be a number");
            }
            if (this.rangeSize > 1) {
                if (!isInteger(this.rangeSize)) {
                    throw new Error("`rangeSize` greater than 1 must be an integer");
                }
            }
            else {
                if (!isInteger(1 / this.rangeSize)) {
                    throw new Error("`rangeSize` less than 1 must divide 1");
                }
            }
            if (this.digitsBeforeDecimal != null) {
                if (!isPositiveInteger(this.digitsBeforeDecimal)) {
                    throw new Error("`digitsBeforeDecimal` must be a positive integer");
                }
            }
            else {
                this.digitsBeforeDecimal = null;
            }
            if (this.digitsAfterDecimal != null) {
                if (!isPositiveInteger(this.digitsAfterDecimal)) {
                    throw new Error("`digitsAfterDecimal` must be a positive integer");
                }
                var digitsInSize = (String(this.rangeSize).split(".")[1] || "").length;
                if (this.digitsAfterDecimal < digitsInSize) {
                    throw new Error("`digitsAfterDecimal` must be at least " + digitsInSize + " to accommodate for a `rangeSize` of " + this.rangeSize);
                }
            }
            else {
                this.digitsAfterDecimal = null;
            }
        }
        RangeAttributeInfo.fromJS = function (parameters) {
            return new RangeAttributeInfo(parameters);
        };
        RangeAttributeInfo.prototype.valueOf = function () {
            var attributeMetaSpec = _super.prototype.valueOf.call(this);
            if (this.separator !== ";") {
                attributeMetaSpec.separator = this.separator;
            }
            attributeMetaSpec.rangeSize = this.rangeSize;
            if (this.digitsBeforeDecimal !== null) {
                attributeMetaSpec.digitsBeforeDecimal = this.digitsBeforeDecimal;
            }
            if (this.digitsAfterDecimal !== null) {
                attributeMetaSpec.digitsAfterDecimal = this.digitsAfterDecimal;
            }
            return attributeMetaSpec;
        };
        RangeAttributeInfo.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.separator === other.separator && this.rangeSize === other.rangeSize && this.digitsBeforeDecimal === other.digitsBeforeDecimal && this.digitsAfterDecimal === other.digitsAfterDecimal;
        };
        RangeAttributeInfo.prototype._serializeNumber = function (value) {
            if (value === null)
                return "";
            var valueStr = String(value);
            if (this.digitsBeforeDecimal === null && this.digitsAfterDecimal === null) {
                return valueStr;
            }
            var valueStrSplit = valueStr.split(".");
            var before = valueStrSplit[0];
            var after = valueStrSplit[1];
            if (this.digitsBeforeDecimal) {
                before = repeatString("0", this.digitsBeforeDecimal - before.length) + before;
            }
            if (this.digitsAfterDecimal) {
                after || (after = "");
                after += repeatString("0", this.digitsAfterDecimal - after.length);
            }
            valueStr = before;
            if (after)
                valueStr += "." + after;
            return valueStr;
        };
        RangeAttributeInfo.prototype.serialize = function (range) {
            if (!(Array.isArray(range) && range.length === 2))
                return null;
            return this._serializeNumber(range[0]) + this.separator + this._serializeNumber(range[1]);
        };
        RangeAttributeInfo.prototype.getMatchingRegExpString = function () {
            var separatorRegExp = this.separator.replace(/[.$^{[(|)*+?\\]/g, function (c) { return "\\" + c; });
            var beforeRegExp = this.digitsBeforeDecimal ? "-?\\d{" + this.digitsBeforeDecimal + "}" : "(?:-?[1-9]\\d*|0)";
            var afterRegExp = this.digitsAfterDecimal ? "\\.\\d{" + this.digitsAfterDecimal + "}" : "(?:\\.\\d*[1-9])?";
            var numberRegExp = beforeRegExp + afterRegExp;
            return "/^(" + numberRegExp + ")" + separatorRegExp + "(" + numberRegExp + ")$/";
        };
        return RangeAttributeInfo;
    })(AttributeInfo);
    Core.RangeAttributeInfo = RangeAttributeInfo;
    AttributeInfo.register(RangeAttributeInfo);
    var UniqueAttributeInfo = (function (_super) {
        __extends(UniqueAttributeInfo, _super);
        function UniqueAttributeInfo(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters);
            this._ensureSpecial("unique");
            this._ensureType('NUMBER');
        }
        UniqueAttributeInfo.fromJS = function (parameters) {
            return new UniqueAttributeInfo(parameters);
        };
        UniqueAttributeInfo.prototype.serialize = function (value) {
            throw new Error("can not serialize an approximate unique value");
        };
        return UniqueAttributeInfo;
    })(AttributeInfo);
    Core.UniqueAttributeInfo = UniqueAttributeInfo;
    var HistogramAttributeInfo = (function (_super) {
        __extends(HistogramAttributeInfo, _super);
        function HistogramAttributeInfo(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters);
            this._ensureSpecial("histogram");
            this._ensureType('NUMBER');
        }
        HistogramAttributeInfo.fromJS = function (parameters) {
            return new HistogramAttributeInfo(parameters);
        };
        HistogramAttributeInfo.prototype.serialize = function (value) {
            throw new Error("can not serialize a histogram value");
        };
        return HistogramAttributeInfo;
    })(AttributeInfo);
    Core.HistogramAttributeInfo = HistogramAttributeInfo;
    AttributeInfo.register(UniqueAttributeInfo);
    AttributeInfo.UNIQUE = new UniqueAttributeInfo();
    AttributeInfo.HISTOGRAM = new HistogramAttributeInfo();
})(Core || (Core = {}));
var Core;
(function (Core) {
    function mergeRemoteDatasets(remoteGroups) {
        var seen = {};
        remoteGroups.forEach(function (remoteGroup) {
            remoteGroup.forEach(function (remote) {
                var hash = remote.toHash();
                if (seen[hash])
                    return;
                seen[hash] = remote;
            });
        });
        return Object.keys(seen).sort().map(function (k) { return seen[k]; });
    }
    Core.mergeRemoteDatasets = mergeRemoteDatasets;
    var check;
    var Dataset = (function () {
        function Dataset(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.attributes = null;
            this.source = parameters.source;
            if (dummy !== dummyObject) {
                throw new TypeError("can not call `new Dataset` directly use Dataset.fromJS instead");
            }
            if (parameters.attributes) {
                this.attributes = parameters.attributes;
            }
        }
        Dataset.jsToValue = function (parameters) {
            var value = {
                source: parameters.source
            };
            var attributes = parameters.attributes;
            if (attributes) {
                if (typeof attributes !== 'object') {
                    throw new TypeError("invalid attributes");
                }
                else {
                    var newAttributes = Object.create(null);
                    for (var k in attributes) {
                        if (!hasOwnProperty(attributes, k))
                            continue;
                        newAttributes[k] = Core.AttributeInfo.fromJS(attributes[k]);
                    }
                    value.attributes = newAttributes;
                }
            }
            return value;
        };
        Dataset.isDataset = function (candidate) {
            return Core.isInstanceOf(candidate, Dataset);
        };
        Dataset.register = function (ex) {
            var op = ex.name.replace('Dataset', '').replace(/^\w/, function (s) { return s.toLowerCase(); });
            Dataset.classMap[op] = ex;
        };
        Dataset.fromJS = function (datasetJS, requester) {
            if (requester === void 0) { requester = null; }
            if (Array.isArray(datasetJS)) {
                datasetJS = {
                    source: 'native',
                    data: datasetJS
                };
            }
            else if (typeof datasetJS === 'function') {
                datasetJS = {
                    source: 'remote',
                    driver: datasetJS
                };
            }
            if (!hasOwnProperty(datasetJS, "source")) {
                throw new Error("dataset `source` must be defined");
            }
            var source = datasetJS.source;
            if (typeof source !== "string") {
                throw new Error("dataset must be a string");
            }
            var ClassFn = Dataset.classMap[source];
            if (!ClassFn) {
                throw new Error("unsupported dataset '" + source + "'");
            }
            return ClassFn.fromJS(datasetJS, requester);
        };
        Dataset.prototype._ensureSource = function (source) {
            if (!this.source) {
                this.source = source;
                return;
            }
            if (this.source !== source) {
                throw new TypeError("incorrect dataset '" + this.source + "' (needs to be: '" + source + "')");
            }
        };
        Dataset.prototype.valueOf = function () {
            var value = {
                source: this.source
            };
            if (this.attributes) {
                value.attributes = this.attributes;
            }
            return value;
        };
        Dataset.prototype.toJS = function () {
            var js = {
                source: this.source
            };
            var attributes = this.attributes;
            if (attributes) {
                var attributesJS = {};
                for (var k in attributes) {
                    attributesJS[k] = attributes[k].toJS();
                }
                js.attributes = attributesJS;
            }
            return js;
        };
        Dataset.prototype.toString = function () {
            return "Dataset(" + this.source + ")";
        };
        Dataset.prototype.toJSON = function () {
            return this.toJS();
        };
        Dataset.prototype.equals = function (other) {
            return Dataset.isDataset(other) && this.source === other.source;
        };
        Dataset.prototype.toHash = function () {
            return this.source;
        };
        Dataset.prototype.basis = function () {
            return false;
        };
        Dataset.prototype.getFullType = function () {
            var attributes = this.attributes;
            if (!attributes)
                throw new Error("dataset has not been introspected");
            var remote = this.source === 'native' ? null : [this.toHash()];
            var myDatasetType = {};
            for (var attrName in attributes) {
                if (!hasOwnProperty(attributes, attrName))
                    continue;
                var attrType = attributes[attrName];
                if (attrType.type === 'DATASET') {
                    myDatasetType[attrName] = {
                        type: 'DATASET',
                        datasetType: attrType.datasetType
                    };
                }
                else {
                    myDatasetType[attrName] = {
                        type: attrType.type
                    };
                }
                if (remote) {
                    myDatasetType[attrName].remote = remote;
                }
            }
            var myFullType = {
                type: 'DATASET',
                datasetType: myDatasetType
            };
            if (remote) {
                myFullType.remote = remote;
            }
            return myFullType;
        };
        Dataset.prototype.hasRemote = function () {
            return false;
        };
        Dataset.prototype.getRemoteDatasets = function () {
            throw new Error("can not call this directly");
        };
        Dataset.type = 'DATASET';
        Dataset.classMap = {};
        return Dataset;
    })();
    Core.Dataset = Dataset;
    check = Dataset;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var directionFns = {
        ascending: function (a, b) {
            if (a.compare)
                return a.comapre(b);
            return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        },
        descending: function (a, b) {
            if (b.compare)
                return b.comapre(a);
            return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
        }
    };
    function isDate(dt) {
        return Boolean(dt.toISOString);
    }
    function isNumber(n) {
        return !isNaN(Number(n));
    }
    function isString(str) {
        return typeof str === "string";
    }
    function getAttributeInfo(attributeValue) {
        if (isDate(attributeValue)) {
            return new Core.AttributeInfo({ type: 'TIME' });
        }
        else if (isNumber(attributeValue)) {
            return new Core.AttributeInfo({ type: 'NUMBER' });
        }
        else if (isString(attributeValue)) {
            return new Core.AttributeInfo({ type: 'STRING' });
        }
        else if (attributeValue instanceof Core.Dataset) {
            return new Core.AttributeInfo(attributeValue.getFullType());
        }
        else {
            throw new Error("Could not introspect");
        }
    }
    function datumFromJS(js) {
        if (typeof js !== 'object')
            throw new TypeError("datum must be an object");
        var datum = Object.create(null);
        for (var k in js) {
            if (!hasOwnProperty(js, k))
                continue;
            datum[k] = Core.valueFromJS(js[k]);
        }
        return datum;
    }
    function datumToJS(datum) {
        var js = {};
        for (var k in datum) {
            if (k === '$def')
                continue;
            js[k] = Core.valueToJSInlineType(datum[k]);
        }
        return js;
    }
    var NativeDataset = (function (_super) {
        __extends(NativeDataset, _super);
        function NativeDataset(parameters) {
            _super.call(this, parameters, dummyObject);
            this.data = parameters.data;
            this._ensureSource("native");
            if (!Array.isArray(this.data)) {
                throw new TypeError("must have a `data` array");
            }
        }
        NativeDataset.fromJS = function (datasetJS, requester) {
            if (requester === void 0) { requester = null; }
            var value = Core.Dataset.jsToValue(datasetJS);
            value.data = datasetJS.data.map(datumFromJS);
            return new NativeDataset(value);
        };
        NativeDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.data = this.data;
            return value;
        };
        NativeDataset.prototype.toJS = function () {
            return this.data.map(datumToJS);
        };
        NativeDataset.prototype.toString = function () {
            return "NativeDataset(" + this.data.length + ")";
        };
        NativeDataset.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.data.length === other.data.length;
        };
        NativeDataset.prototype.basis = function () {
            var data = this.data;
            return data.length === 1 && Object.keys(data[0]).length === 0;
        };
        NativeDataset.prototype.hasRemote = function () {
            if (!this.data.length)
                return false;
            return Core.datumHasRemote(this.data[0]);
        };
        NativeDataset.prototype.apply = function (name, exFn) {
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                var datum = data[i];
                datum[name] = exFn(datum);
            }
            this.attributes = null;
            return this;
        };
        NativeDataset.prototype.applyPromise = function (name, exFn) {
            var _this = this;
            var ds = this;
            var promises = this.data.map(exFn);
            return Q.all(promises).then(function (values) {
                var data = ds.data;
                var n = data.length;
                for (var i = 0; i < n; i++)
                    data[i][name] = values[i];
                _this.attributes = null;
                return ds;
            });
        };
        NativeDataset.prototype.def = function (name, exFn) {
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                var datum = data[i];
                datum.$def = datum.$def || Object.create(null);
                datum.$def[name] = exFn(datum);
            }
            this.attributes = null;
            return this;
        };
        NativeDataset.prototype.filter = function (exFn) {
            return new NativeDataset({
                source: 'native',
                data: this.data.filter(function (datum) { return exFn(datum); })
            });
        };
        NativeDataset.prototype.sort = function (exFn, direction) {
            var directionFn = directionFns[direction];
            this.data.sort(function (a, b) { return directionFn(exFn(a), exFn(b)); });
            return this;
        };
        NativeDataset.prototype.limit = function (limit) {
            if (this.data.length <= limit)
                return this;
            return new NativeDataset({
                source: 'native',
                data: this.data.slice(0, limit)
            });
        };
        NativeDataset.prototype.count = function () {
            return this.data.length;
        };
        NativeDataset.prototype.sum = function (attrFn) {
            var sum = 0;
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                sum += attrFn(data[i]);
            }
            return sum;
        };
        NativeDataset.prototype.min = function (attrFn) {
            var min = Infinity;
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                var v = attrFn(data[i]);
                if (v < min)
                    min = v;
            }
            return min;
        };
        NativeDataset.prototype.max = function (attrFn) {
            var max = Infinity;
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                var v = attrFn(data[i]);
                if (max < v)
                    max = v;
            }
            return max;
        };
        NativeDataset.prototype.group = function (attrFn, attribute) {
            var splits = {};
            var data = this.data;
            var n = data.length;
            for (var i = 0; i < n; i++) {
                var datum = data[i];
                var v = attrFn(datum);
                splits[v] = v;
            }
            return Core.Set.fromJS({
                setType: attribute.type,
                elements: Object.keys(splits).map(function (k) { return splits[k]; })
            });
        };
        NativeDataset.prototype.introspect = function () {
            if (this.attributes)
                return;
            var data = this.data;
            if (!data.length) {
                this.attributes = {};
                return;
            }
            var datum = data[0];
            var attributes = {};
            Object.keys(datum).forEach(function (applyName) {
                var applyValue = datum[applyName];
                if (applyName !== '$def') {
                    attributes[applyName] = getAttributeInfo(applyValue);
                }
                else {
                    Object.keys(applyValue).forEach(function (defName) {
                        var defValue = applyValue[defName];
                        attributes[defName] = getAttributeInfo(defValue);
                    });
                }
            });
            this.attributes = attributes;
        };
        NativeDataset.prototype.getFullType = function () {
            this.introspect();
            return _super.prototype.getFullType.call(this);
        };
        NativeDataset.prototype.getRemoteDatasets = function () {
            if (this.data.length === 0)
                return [];
            var datum = this.data[0];
            var remoteDatasets = [];
            Object.keys(datum).forEach(function (applyName) {
                var applyValue = datum[applyName];
                if (applyName !== '$def') {
                    if (applyValue instanceof Core.Dataset) {
                        remoteDatasets.push(applyValue.getRemoteDatasets());
                    }
                }
                else {
                    Object.keys(applyValue).forEach(function (defName) {
                        var defValue = applyValue[defName];
                        if (defValue instanceof Core.Dataset) {
                            remoteDatasets.push(defValue.getRemoteDatasets());
                        }
                    });
                }
            });
            return Core.mergeRemoteDatasets(remoteDatasets);
        };
        NativeDataset.type = 'DATASET';
        return NativeDataset;
    })(Core.Dataset);
    Core.NativeDataset = NativeDataset;
    Core.Dataset.register(NativeDataset);
})(Core || (Core = {}));
var Core;
(function (Core) {
    function getSampleValue(valueType, ex) {
        switch (valueType) {
            case 'BOOLEAN':
                return true;
            case 'NUMBER':
                return 4;
            case 'NUMBER_RANGE':
                if (ex instanceof Core.NumberBucketExpression) {
                    return new Core.NumberRange({ start: ex.offset, end: ex.offset + ex.size });
                }
                else {
                    return new Core.NumberRange({ start: 0, end: 1 });
                }
            case 'TIME':
                return new Date('2015-03-14T00:00:00');
            case 'TIME_RANGE':
                if (ex instanceof Core.TimeBucketExpression) {
                    var start = ex.duration.floor(new Date('2015-03-14T00:00:00'), ex.timezone);
                    return new Core.TimeRange({ start: start, end: ex.duration.move(start, ex.timezone, 1) });
                }
                else {
                    return new Core.TimeRange({ start: new Date('2015-03-14T00:00:00'), end: new Date('2015-03-15T00:00:00') });
                }
            case 'STRING':
                if (ex instanceof Core.RefExpression) {
                    return 'some_' + ex.name;
                }
                else {
                    return 'something';
                }
            default:
                throw new Error("unsupported simulation on: " + valueType);
        }
    }
    var RemoteDataset = (function (_super) {
        __extends(RemoteDataset, _super);
        function RemoteDataset(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            _super.call(this, parameters, dummyObject);
            this.requester = parameters.requester;
            this.mode = parameters.mode || 'raw';
            this.derivedAttributes = parameters.derivedAttributes || [];
            this.filter = parameters.filter || Core.Expression.TRUE;
            this.split = parameters.split;
            this.label = parameters.label;
            this.defs = parameters.defs;
            this.applies = parameters.applies;
            this.sort = parameters.sort;
            this.sortOrigin = parameters.sortOrigin;
            this.limit = parameters.limit;
            this.havingFilter = parameters.havingFilter;
            if (this.mode !== 'raw') {
                this.defs = this.defs || [];
                this.applies = this.applies || [];
                if (this.mode === 'split') {
                    if (!this.split)
                        throw new Error('must have split in split mode');
                    if (!this.label)
                        throw new Error('must have label in split mode');
                    this.havingFilter = this.havingFilter || Core.Expression.TRUE;
                }
            }
        }
        RemoteDataset.jsToValue = function (parameters) {
            var value = Core.Dataset.jsToValue(parameters);
            if (parameters.requester)
                value.requester = parameters.requester;
            value.filter = parameters.filter || Core.Expression.TRUE;
            return value;
        };
        RemoteDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            if (this.requester) {
                value.requester = this.requester;
            }
            value.mode = this.mode;
            value.derivedAttributes = this.derivedAttributes;
            value.filter = this.filter;
            if (this.split) {
                value.split = this.split;
                value.label = this.label;
            }
            if (this.defs) {
                value.defs = this.defs;
            }
            if (this.applies) {
                value.applies = this.applies;
            }
            if (this.sort) {
                value.sort = this.sort;
                value.sortOrigin = this.sortOrigin;
            }
            if (this.limit) {
                value.limit = this.limit;
            }
            if (this.havingFilter) {
                value.havingFilter = this.havingFilter;
            }
            return value;
        };
        RemoteDataset.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            if (this.requester) {
                js.requester = this.requester;
            }
            if (!this.filter.equals(Core.Expression.TRUE)) {
                js.filter = this.filter.toJS();
            }
            return js;
        };
        RemoteDataset.prototype.toString = function () {
            switch (this.mode) {
                case 'raw':
                    return "RemoteRaw(" + this.filter.toString() + ")";
                case 'total':
                    return "RemoteTotal(" + this.applies.length + ")";
                case 'split':
                    return "RemoteSplit(" + this.applies.length + ")";
                default:
                    return 'Remote()';
            }
        };
        RemoteDataset.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.filter.equals(other.filter);
        };
        RemoteDataset.prototype.hasRemote = function () {
            return true;
        };
        RemoteDataset.prototype.getRemoteDatasets = function () {
            return [this];
        };
        RemoteDataset.prototype.canHandleFilter = function (ex) {
            throw new Error("must implement canHandleFilter");
        };
        RemoteDataset.prototype.canHandleTotal = function () {
            throw new Error("must implement canHandleTotal");
        };
        RemoteDataset.prototype.canHandleSplit = function (ex) {
            throw new Error("must implement canHandleSplit");
        };
        RemoteDataset.prototype.canHandleSort = function (sortAction) {
            throw new Error("must implement canHandleSort");
        };
        RemoteDataset.prototype.canHandleLimit = function (limitAction) {
            throw new Error("must implement canHandleLimit");
        };
        RemoteDataset.prototype.canHandleHavingFilter = function (ex) {
            throw new Error("must implement canHandleHavingFilter");
        };
        RemoteDataset.prototype.makeTotal = function () {
            if (this.mode !== 'raw')
                return null;
            if (!this.canHandleTotal())
                return null;
            var value = this.valueOf();
            value.mode = 'total';
            return (new (Core.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.addSplit = function (splitExpression, label) {
            if (this.mode !== 'raw')
                return null;
            if (!this.canHandleSplit(splitExpression))
                return null;
            var value = this.valueOf();
            value.mode = 'split';
            value.split = splitExpression;
            value.label = label;
            return (new (Core.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.addAction = function (action) {
            var value = this.valueOf();
            var expression = action.expression;
            if (action instanceof Core.FilterAction) {
                if (!expression.resolved())
                    return null;
                switch (this.mode) {
                    case 'raw':
                        if (!this.canHandleFilter(expression))
                            return null;
                        value.filter = value.filter.and(expression).simplify();
                        break;
                    case 'split':
                        if (!this.canHandleHavingFilter(expression))
                            return null;
                        value.havingFilter = value.havingFilter.and(expression).simplify();
                        break;
                    default:
                        return null;
                }
            }
            else if (action instanceof Core.DefAction) {
                if (expression.type !== 'DATASET')
                    return null;
                switch (this.mode) {
                    case 'total':
                        if (expression instanceof Core.LiteralExpression) {
                            var otherDataset = expression.value;
                            value.derivedAttributes = otherDataset.derivedAttributes;
                            value.filter = otherDataset.filter;
                            value.defs = value.defs.concat(action);
                        }
                        else {
                            return null;
                        }
                        break;
                    case 'split':
                        var defExpression = action.expression;
                        if (defExpression instanceof Core.ActionsExpression && defExpression.actions.length === 1 && defExpression.actions[0].action === 'filter' && defExpression.actions[0].expression.equals(this.split.is(new Core.RefExpression({ op: 'ref', name: '^' + this.label, type: this.split.type })))) {
                            value.defs = value.defs.concat(action);
                        }
                        else {
                            return null;
                        }
                        break;
                    default:
                        return null;
                }
            }
            else if (action instanceof Core.ApplyAction) {
                if (expression.type !== 'NUMBER')
                    return null;
                if (this.mode === 'raw') {
                    value.derivedAttributes = value.derivedAttributes.concat(action);
                }
                else {
                    if (action.name === this.label)
                        return null;
                    value.applies = value.applies.concat(action);
                }
            }
            else if (action instanceof Core.SortAction) {
                if (!this.canHandleSort(action))
                    return null;
                value.sort = action;
            }
            else if (action instanceof Core.LimitAction) {
                if (!this.canHandleLimit(action))
                    return null;
                value.limit = action;
            }
            else {
                return null;
            }
            return (new (Core.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.simulate = function () {
            var datum = {};
            if (this.mode === 'raw') {
                var attributes = this.attributes;
                for (var attributeName in attributes) {
                    if (!attributes.hasOwnProperty(attributeName))
                        continue;
                    datum[attributeName] = getSampleValue(attributes[attributeName].type, null);
                }
            }
            else {
                if (this.mode === 'split') {
                    datum[this.label] = getSampleValue(this.split.type, this.split);
                }
                var applies = this.applies;
                for (var i = 0; i < applies.length; i++) {
                    var apply = applies[i];
                    datum[apply.name] = getSampleValue(apply.expression.type, apply.expression);
                }
            }
            return new Core.NativeDataset({
                source: 'native',
                data: [datum]
            });
        };
        RemoteDataset.prototype.getQueryAndPostProcess = function () {
            throw new Error("can not call getQueryAndPostProcess directly");
        };
        RemoteDataset.prototype.queryValues = function () {
            if (!this.requester) {
                return Q.reject(new Error('must have a requester to make queries'));
            }
            try {
                var queryAndPostProcess = this.getQueryAndPostProcess();
            }
            catch (e) {
                return Q.reject(e);
            }
            if (!hasOwnProperty(queryAndPostProcess, 'query') || typeof queryAndPostProcess.postProcess !== 'function') {
                return Q.reject(new Error('no error query or postProcess'));
            }
            return this.requester({ query: queryAndPostProcess.query }).then(queryAndPostProcess.postProcess);
        };
        RemoteDataset.prototype.needsIntrospect = function () {
            return !this.attributes;
        };
        RemoteDataset.prototype.getIntrospectQueryAndPostProcess = function () {
            throw new Error("can not call getIntrospectQueryAndPostProcess directly");
        };
        RemoteDataset.prototype.introspect = function () {
            if (this.attributes) {
                return Q(this);
            }
            if (!this.requester) {
                return Q.reject(new Error('must have a requester to introspect'));
            }
            try {
                var queryAndPostProcess = this.getIntrospectQueryAndPostProcess();
            }
            catch (e) {
                return Q.reject(e);
            }
            if (!hasOwnProperty(queryAndPostProcess, 'query') || typeof queryAndPostProcess.postProcess !== 'function') {
                return Q.reject(new Error('no error query or postProcess'));
            }
            var value = this.valueOf();
            var ClassFn = Core.Dataset.classMap[this.source];
            return this.requester({ query: queryAndPostProcess.query }).then(queryAndPostProcess.postProcess).then(function (attributes) {
                value.attributes = attributes;
                return (new ClassFn(value));
            });
        };
        RemoteDataset.type = 'DATASET';
        return RemoteDataset;
    })(Core.Dataset);
    Core.RemoteDataset = RemoteDataset;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function numberToJS(n) {
        return isFinite(n) ? n : String(n);
    }
    var check;
    var NumberRange = (function () {
        function NumberRange(parameters) {
            this.start = parameters.start;
            this.end = parameters.end;
            if (isNaN(this.start))
                throw new TypeError('`start` must be a number');
            if (isNaN(this.end))
                throw new TypeError('`end` must be a number');
        }
        NumberRange.isNumberRange = function (candidate) {
            return Core.isInstanceOf(candidate, NumberRange);
        };
        NumberRange.fromNumber = function (num, size, offset) {
            var start = Math.floor((num - offset) / size) * size + offset;
            return new NumberRange({
                start: start,
                end: start + size
            });
        };
        NumberRange.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable numberRange");
            }
            return new NumberRange({
                start: Number(parameters.start),
                end: Number(parameters.end)
            });
        };
        NumberRange.prototype.valueOf = function () {
            return {
                start: this.start,
                end: this.end
            };
        };
        NumberRange.prototype.toJS = function () {
            return {
                start: numberToJS(this.start),
                end: numberToJS(this.end)
            };
        };
        NumberRange.prototype.toJSON = function () {
            return this.toJS();
        };
        NumberRange.prototype.toString = function () {
            return "[" + this.start + ',' + this.end + ")";
        };
        NumberRange.prototype.equals = function (other) {
            return NumberRange.isNumberRange(other) && this.start === other.start && this.end === other.end;
        };
        NumberRange.prototype.union = function (other) {
            if ((this.start < other.start && (this.end <= other.start)) || (other.start < this.start) && (other.end <= this.start)) {
                return null;
            }
            var start = Math.min(this.start, other.start);
            var end = Math.max(this.end, other.end);
            return new NumberRange({ start: start, end: end });
        };
        NumberRange.prototype.intersect = function (other) {
            if ((this.start < other.start && (this.end <= other.start)) || (other.start < this.start) && (other.end <= this.start)) {
                return null;
            }
            var start = Math.max(this.start, other.start);
            var end = Math.min(this.end, other.end);
            return new NumberRange({ start: start, end: end });
        };
        NumberRange.prototype.test = function (val) {
            return this.start <= val && val < this.end;
        };
        NumberRange.type = 'NUMBER_RANGE';
        return NumberRange;
    })();
    Core.NumberRange = NumberRange;
    check = NumberRange;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function dateString(date) {
        return date.toISOString();
    }
    function hashFromJS(xs, setType) {
        var keyFn = setType === 'TIME' ? dateString : String;
        var hash = Object.create(null);
        for (var i = 0; i < xs.length; i++) {
            var x = Core.valueFromJS(xs[i], setType);
            hash[keyFn(x)] = x;
        }
        return hash;
    }
    function hashToValues(hash) {
        return Object.keys(hash).sort().map(function (k) { return hash[k]; });
    }
    function guessSetType(thing) {
        var typeofThing = typeof thing;
        switch (typeofThing) {
            case 'boolean':
            case 'string':
            case 'number':
                return typeofThing.toUpperCase();
            default:
                if (thing.toISOString)
                    return 'TIME';
                throw new Error("Could not guess the setType of the set. Please specify explicit setType");
        }
    }
    var check;
    var Set = (function () {
        function Set(parameters) {
            this.setType = parameters.setType;
            this.elements = parameters.elements;
        }
        Set.isSet = function (candidate) {
            return Core.isInstanceOf(candidate, Set);
        };
        Set.fromJS = function (parameters) {
            if (Array.isArray(parameters)) {
                parameters = { elements: parameters };
            }
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable set");
            }
            if (!parameters.setType) {
                parameters.setType = guessSetType(parameters.elements[0]);
            }
            return new Set({
                setType: parameters.setType,
                elements: hashFromJS(parameters.elements, parameters.setType)
            });
        };
        Set.prototype.valueOf = function () {
            return {
                setType: this.setType,
                elements: this.elements
            };
        };
        Set.prototype.getValues = function () {
            return hashToValues(this.elements);
        };
        Set.prototype.toJS = function () {
            return {
                setType: this.setType,
                elements: this.getValues().map(Core.valueToJS)
            };
        };
        Set.prototype.toJSON = function () {
            return this.toJS();
        };
        Set.prototype.toString = function () {
            return 'Set_' + this.setType + '(' + Object.keys(this.elements).length + ')';
        };
        Set.prototype.equals = function (other) {
            return Set.isSet(other) && this.setType === other.setType && Object.keys(this.elements).sort().join('') === Object.keys(other.elements).sort().join('');
        };
        Set.prototype.empty = function () {
            return this.toJS().elements.length === 0;
        };
        Set.prototype.union = function (other) {
            if (this.setType !== other.setType) {
                throw new TypeError("can not union sets of different types");
            }
            var thisValues = this.elements;
            var otherValues = other.elements;
            var newValues = {};
            for (var k in thisValues) {
                if (!hasOwnProperty(thisValues, k))
                    continue;
                newValues[k] = thisValues[k];
            }
            for (var k in otherValues) {
                if (!hasOwnProperty(otherValues, k))
                    continue;
                newValues[k] = otherValues[k];
            }
            return new Set({
                setType: this.setType,
                elements: newValues
            });
        };
        Set.prototype.intersect = function (other) {
            if (this.setType !== other.setType) {
                throw new TypeError("can not intersect sets of different types");
            }
            var thisValues = this.elements;
            var otherValues = other.elements;
            var newValues = {};
            for (var k in thisValues) {
                if (hasOwnProperty(thisValues, k) && hasOwnProperty(otherValues, k)) {
                    newValues[k] = thisValues[k];
                }
            }
            return new Set({
                setType: this.setType,
                elements: newValues
            });
        };
        Set.prototype.test = function (value) {
            return hasOwnProperty(this.elements, String(value));
        };
        Set.prototype.add = function (value) {
            var elements = this.elements;
            var newValues = {};
            newValues[String(value)] = value;
            for (var k in elements) {
                if (!hasOwnProperty(elements, k))
                    continue;
                newValues[k] = elements[k];
            }
            return new Set({
                setType: this.setType,
                elements: newValues
            });
        };
        Set.prototype.label = function (name) {
            return new Core.NativeDataset({
                source: 'native',
                data: this.getValues().map(function (v) {
                    var datum = {};
                    datum[name] = v;
                    return datum;
                })
            });
        };
        Set.type = 'SET';
        return Set;
    })();
    Core.Set = Set;
    check = Set;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function margin1d(left, width, right, parentWidth) {
        if (left != null) {
            if (width != null) {
                if (right != null)
                    throw new Error("over-constrained");
                return [left, width];
            }
            else {
                return [left, parentWidth - left - (right || 0)];
            }
        }
        else {
            if (width != null) {
                if (right != null) {
                    return [parentWidth - width - right, width];
                }
                else {
                    return [(parentWidth + width) / 2, width];
                }
            }
            else {
                return [0, parentWidth - right];
            }
        }
    }
    var check;
    var Shape = (function () {
        function Shape(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            if (dummy !== dummyObject) {
                throw new TypeError("can not call `new Shape` directly use Shape.fromJS instead");
            }
            this.x = parameters.x;
            this.y = parameters.y;
        }
        Shape.isShape = function (candidate) {
            return Core.isInstanceOf(candidate, Shape);
        };
        Shape.rectangle = function (width, height) {
            return new RectangleShape({
                x: 0,
                y: 0,
                width: width,
                height: height
            });
        };
        Shape.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable shape");
            }
            if (!hasOwnProperty(parameters, "shape")) {
                throw new Error("shape must be defined");
            }
            if (typeof parameters.shape !== "string") {
                throw new Error("shape must be a string");
            }
            var ClassFn = Shape.classMap[parameters.shape];
            if (!ClassFn) {
                throw new Error("unsupported shape '" + parameters.shape + "'");
            }
            return ClassFn.fromJS(parameters);
        };
        Shape.prototype._ensureShape = function (shape) {
            if (!this.shape) {
                this.shape = shape;
                return;
            }
            if (this.shape !== shape) {
                throw new TypeError("incorrect shape '" + this.shape + "' (needs to be: '" + shape + "')");
            }
        };
        Shape.prototype.valueOf = function () {
            return {
                shape: this.shape,
                x: this.x,
                y: this.y
            };
        };
        Shape.prototype.toJS = function () {
            return this.valueOf();
        };
        Shape.prototype.toJSON = function () {
            return this.valueOf();
        };
        Shape.prototype.toString = function () {
            return "Shape(" + this.x + ',' + this.y + ")";
        };
        Shape.prototype.equals = function (other) {
            return Shape.isShape(other) && this.shape === other.shape && this.x === other.x && this.y === other.y;
        };
        Shape.type = 'SHAPE';
        Shape.classMap = {};
        return Shape;
    })();
    Core.Shape = Shape;
    check = Shape;
    var RectangleShape = (function (_super) {
        __extends(RectangleShape, _super);
        function RectangleShape(parameters) {
            _super.call(this, parameters, dummyObject);
            this.width = parameters.width;
            this.height = parameters.height;
            this._ensureShape('rectangle');
        }
        RectangleShape.fromJS = function (parameters) {
            return new RectangleShape(parameters);
        };
        RectangleShape.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.width = this.width;
            value.height = this.height;
            return value;
        };
        RectangleShape.prototype.toString = function () {
            return "RectangleShape(" + this.width + ',' + this.height + ")";
        };
        RectangleShape.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.width === other.width && this.height === other.height;
        };
        RectangleShape.prototype.margin = function (parameters) {
            var left = parameters.left;
            var width = parameters.width;
            var right = parameters.right;
            var top = parameters.top;
            var height = parameters.height;
            var bottom = parameters.bottom;
            var xw = margin1d(left, width, right, this.width);
            var yh = margin1d(top, height, bottom, this.height);
            return new RectangleShape({
                x: xw[0],
                y: yh[0],
                width: xw[1],
                height: yh[1]
            });
        };
        RectangleShape.type = 'SHAPE';
        return RectangleShape;
    })(Shape);
    Core.RectangleShape = RectangleShape;
    Shape.classMap['rectangle'] = RectangleShape;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function toDate(date, name) {
        if (typeof date === "undefined" || date === null)
            throw new TypeError('timeRange must have a `' + name + '`');
        if (typeof date === 'string' || typeof date === 'number')
            date = new Date(date);
        if (!date.getDay)
            throw new TypeError('timeRange must have a `' + name + '` that is a Date');
        return date;
    }
    function dateToIntervalPart(date) {
        return date.toISOString().replace("Z", "").replace(".000", "").replace(/:00$/, "").replace(/:00$/, "").replace(/T00$/, "");
    }
    var check;
    var TimeRange = (function () {
        function TimeRange(parameters) {
            this.start = parameters.start;
            this.end = parameters.end;
        }
        TimeRange.isTimeRange = function (candidate) {
            return Core.isInstanceOf(candidate, TimeRange);
        };
        TimeRange.fromDate = function (date, duration, timezone) {
            var start = duration.floor(date, timezone);
            return new TimeRange({
                start: start,
                end: duration.move(start, timezone, 1)
            });
        };
        TimeRange.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable timeRange");
            }
            return new TimeRange({
                start: toDate(parameters.start, 'start'),
                end: toDate(parameters.end, 'end')
            });
        };
        TimeRange.prototype.valueOf = function () {
            return {
                start: this.start,
                end: this.end
            };
        };
        TimeRange.prototype.toJS = function () {
            return {
                start: this.start,
                end: this.end
            };
        };
        TimeRange.prototype.toJSON = function () {
            return this.toJS();
        };
        TimeRange.prototype.toString = function () {
            return "[" + this.start.toISOString() + ',' + this.end.toISOString() + ")";
        };
        TimeRange.prototype.equals = function (other) {
            return TimeRange.isTimeRange(other) && this.start.valueOf() === other.start.valueOf() && this.end.valueOf() === other.end.valueOf();
        };
        TimeRange.prototype.toInterval = function () {
            return dateToIntervalPart(this.start) + "/" + dateToIntervalPart(this.end);
        };
        TimeRange.prototype.union = function (other) {
            if ((this.start < other.start && (this.end <= other.start)) || (other.start < this.start) && (other.end <= this.start)) {
                return null;
            }
            var start = Math.min(this.start.valueOf(), other.start.valueOf());
            var end = Math.max(this.end.valueOf(), other.end.valueOf());
            return new TimeRange({ start: new Date(start), end: new Date(end) });
        };
        TimeRange.prototype.intersect = function (other) {
            if ((this.start < other.start && (this.end <= other.start)) || (other.start < this.start) && (other.end <= this.start)) {
                return null;
            }
            var start = Math.max(this.start.valueOf(), other.start.valueOf());
            var end = Math.min(this.end.valueOf(), other.end.valueOf());
            return new TimeRange({ start: new Date(start), end: new Date(end) });
        };
        TimeRange.prototype.test = function (val) {
            return this.start.valueOf() <= val.valueOf() && val.valueOf() < this.end.valueOf();
        };
        TimeRange.type = 'TIME_RANGE';
        return TimeRange;
    })();
    Core.TimeRange = TimeRange;
    check = TimeRange;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function correctTimeseriesResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0].result === 'object');
    }
    function correctTopNResult(result) {
        return Array.isArray(result) && (result.length === 0 || Array.isArray(result[0].result));
    }
    function correctGroupByResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0].event === 'object');
    }
    function postProcessTotal(res) {
        if (!correctTimeseriesResult(res)) {
            var err = new Error("unexpected result from Druid (all)");
            err.result = res;
            throw err;
        }
        return new Core.NativeDataset({ source: 'native', data: [res[0].result] });
    }
    function makePostProcessTimeseries(duration, timezone, label) {
        return function (res) {
            if (!correctTimeseriesResult(res)) {
                var err = new Error("unexpected result from Druid (timeseries)");
                err.result = res;
                throw err;
            }
            var canonicalDurationLengthAndThenSome = duration.getCanonicalLength() * 1.5;
            return new Core.NativeDataset({
                source: 'native',
                data: res.map(function (d, i) {
                    var rangeStart = new Date(d.timestamp);
                    var next = res[i + 1];
                    var nextTimestamp;
                    if (next) {
                        nextTimestamp = new Date(next.timestamp);
                    }
                    var rangeEnd = (nextTimestamp && rangeStart.valueOf() < nextTimestamp.valueOf() && nextTimestamp.valueOf() - rangeStart.valueOf() < canonicalDurationLengthAndThenSome) ? nextTimestamp : duration.move(rangeStart, timezone, 1);
                    var datum = d.result;
                    datum[label] = new Core.TimeRange({ start: rangeStart, end: rangeEnd });
                    return datum;
                })
            });
        };
    }
    function postProcessNumberBucketFactory(rangeSize) {
        return function (v) {
            var start = Number(v);
            return new Core.NumberRange({
                start: start,
                end: Legacy.driverUtil.safeAdd(start, rangeSize)
            });
        };
    }
    function postProcessTopNFactory(labelProcess, label) {
        return function (res) {
            if (!correctTopNResult(res)) {
                var err = new Error("unexpected result from Druid (topN)");
                err.result = res;
                throw err;
            }
            var data = res.length ? res[0].result : [];
            if (labelProcess) {
                return new Core.NativeDataset({
                    source: 'native',
                    data: data.map(function (d) {
                        var v = d[label];
                        if (String(v) === "null") {
                            v = null;
                        }
                        else {
                            v = labelProcess(v);
                        }
                        d[label] = v;
                        return d;
                    })
                });
            }
            else {
                return new Core.NativeDataset({ source: 'native', data: data });
            }
        };
    }
    function postProcessGroupBy(res) {
        if (!correctGroupByResult(res)) {
            var err = new Error("unexpected result from Druid (groupBy)");
            err.result = res;
            throw err;
        }
        return new Core.NativeDataset({
            source: 'native',
            data: res.map(function (r) { return r.event; })
        });
    }
    function postProcessIntrospectFactory(timeAttribute) {
        return function (res) {
            var attributes = Object.create(null);
            attributes[timeAttribute] = new Core.AttributeInfo({ type: 'TIME' });
            res.dimensions.forEach(function (dimension) {
                attributes[dimension] = new Core.AttributeInfo({ type: 'STRING' });
            });
            res.metrics.forEach(function (metric) {
                attributes[metric] = new Core.AttributeInfo({ type: 'NUMBER', filterable: false, splitable: false });
            });
            return attributes;
        };
    }
    var DruidDataset = (function (_super) {
        __extends(DruidDataset, _super);
        function DruidDataset(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureSource("druid");
            this.dataSource = parameters.dataSource;
            this.timeAttribute = parameters.timeAttribute;
            if (typeof this.timeAttribute !== 'string')
                throw new Error("must have a timeAttribute");
            this.forceInterval = parameters.forceInterval;
            this.approximate = parameters.approximate;
            this.context = parameters.context;
        }
        DruidDataset.fromJS = function (datasetJS) {
            var value = Core.RemoteDataset.jsToValue(datasetJS);
            value.dataSource = datasetJS.dataSource;
            value.timeAttribute = datasetJS.timeAttribute;
            value.forceInterval = datasetJS.forceInterval;
            value.approximate = datasetJS.approximate;
            value.context = datasetJS.context;
            return new DruidDataset(value);
        };
        DruidDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.dataSource = this.dataSource;
            value.timeAttribute = this.timeAttribute;
            value.forceInterval = this.forceInterval;
            value.approximate = this.approximate;
            value.context = this.context;
            return value;
        };
        DruidDataset.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.dataSource = this.dataSource;
            js.timeAttribute = this.timeAttribute;
            js.forceInterval = this.forceInterval;
            js.approximate = this.approximate;
            js.context = this.context;
            return js;
        };
        DruidDataset.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && String(this.dataSource) === String(other.dataSource) && this.timeAttribute === other.timeAttribute && this.forceInterval === other.forceInterval && this.approximate === other.approximate && this.context === other.context;
        };
        DruidDataset.prototype.toHash = function () {
            return _super.prototype.toHash.call(this) + ':' + this.dataSource;
        };
        DruidDataset.prototype.canHandleFilter = function (ex) {
            return true;
        };
        DruidDataset.prototype.canHandleTotal = function () {
            return true;
        };
        DruidDataset.prototype.canHandleSplit = function (ex) {
            return true;
        };
        DruidDataset.prototype.canHandleSort = function (sortAction) {
            if (this.split instanceof Core.TimeBucketExpression) {
                var sortExpression = sortAction.expression;
                if (sortExpression instanceof Core.RefExpression) {
                    return sortExpression.name === this.label;
                }
                else {
                    return false;
                }
            }
            else {
                return true;
            }
        };
        DruidDataset.prototype.canHandleLimit = function (limitAction) {
            return !(this.split instanceof Core.TimeBucketExpression);
        };
        DruidDataset.prototype.canHandleHavingFilter = function (ex) {
            return !this.limit;
        };
        DruidDataset.prototype.canUseNativeAggregateFilter = function (filterExpression) {
            if (filterExpression.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            return filterExpression.every(function (ex) {
                if (ex instanceof Core.IsExpression) {
                    return ex.lhs.isOp('ref') && ex.rhs.isOp('literal');
                }
                else if (ex instanceof Core.InExpression) {
                    return ex.lhs.isOp('ref') && ex.rhs.isOp('literal');
                }
                else if (ex.isOp('not') || ex.isOp('and') || ex.isOp('or')) {
                    return null;
                }
                return false;
            });
        };
        DruidDataset.prototype.timelessFilterToDruid = function (filter) {
            if (filter.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            var attributeInfo;
            if (filter instanceof Core.LiteralExpression) {
                if (filter.value === true) {
                    return null;
                }
                else {
                    throw new Error("should never get here");
                }
            }
            else if (filter instanceof Core.IsExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    attributeInfo = this.attributes[lhs.name];
                    return {
                        type: "selector",
                        dimension: lhs.name,
                        value: attributeInfo.serialize(rhs.value)
                    };
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid filter");
                }
            }
            else if (filter instanceof Core.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    attributeInfo = this.attributes[lhs.name];
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/STRING') {
                        return {
                            type: "or",
                            fields: rhs.value.getValues().map(function (value) {
                                return {
                                    type: "selector",
                                    dimension: lhs.name,
                                    value: attributeInfo.serialize(value)
                                };
                            })
                        };
                    }
                    else if (rhsType === 'NUMBER_RANGE') {
                        var range = rhs.value;
                        var r0 = range.start;
                        var r1 = range.end;
                        return {
                            type: "javascript",
                            dimension: lhs.name,
                            "function": "function(a) { a = Number(a); return " + r0 + " <= a && a < " + r1 + "; }"
                        };
                    }
                    else if (rhsType === 'TIME_RANGE') {
                        throw new Error("can not time filter on non-primary time dimension");
                    }
                    else {
                        throw new Error("not supported " + rhsType);
                    }
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid filter");
                }
            }
            else if (filter instanceof Core.NotExpression) {
                return {
                    type: "not",
                    field: this.timelessFilterToDruid(filter.operand)
                };
            }
            else if (filter instanceof Core.AndExpression || filter instanceof Core.OrExpression) {
                return {
                    type: filter.op,
                    fields: filter.operands.map(this.timelessFilterToDruid, this)
                };
            }
            else {
                throw new Error("could not convert filter " + filter.toString() + " to Druid filter");
            }
        };
        DruidDataset.prototype.timeFilterToIntervals = function (filter) {
            if (filter.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            if (filter instanceof Core.LiteralExpression) {
                return filter.value ? DruidDataset.TRUE_INTERVAL : DruidDataset.FALSE_INTERVAL;
            }
            else if (filter instanceof Core.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    var timeRanges;
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/TIME_RANGE') {
                        timeRanges = rhs.value.getValues();
                    }
                    else if (rhsType === 'TIME_RANGE') {
                        timeRanges = [rhs.value];
                    }
                    else {
                        throw new Error("not supported " + rhsType + " for time filtering");
                    }
                    return timeRanges.map(function (timeRange) { return timeRange.toInterval(); });
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid interval");
                }
            }
            else {
                throw new Error("can not convert " + filter.toString() + " to Druid interval");
            }
        };
        DruidDataset.prototype.filterToDruid = function (filter) {
            if (filter.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            if (filter.equals(Core.Expression.FALSE)) {
                return {
                    intervals: DruidDataset.FALSE_INTERVAL,
                    filter: null
                };
            }
            else {
                var sep = filter.separateViaAnd(this.timeAttribute);
                if (!sep)
                    throw new Error("could not separate time filter in " + filter.toString());
                return {
                    intervals: this.timeFilterToIntervals(sep.included),
                    filter: this.timelessFilterToDruid(sep.excluded)
                };
            }
        };
        DruidDataset.prototype.getBucketingDimension = function (attributeInfo, numberBucket) {
            var regExp = attributeInfo.getMatchingRegExpString();
            if (numberBucket && numberBucket.offset === 0 && numberBucket.size === attributeInfo.rangeSize)
                numberBucket = null;
            var bucketing = '';
            if (numberBucket) {
                bucketing = 's=' + Legacy.driverUtil.continuousFloorExpression('s', 'Math.floor', numberBucket.size, numberBucket.offset) + ';';
            }
            return {
                type: "javascript",
                'function': "function(d) {\nvar m = d.match(" + regExp + ");\nif(!m) return 'null';\nvar s = +m[1];\nif(!(Math.abs(+m[2] - s - " + attributeInfo.rangeSize + ") < 1e-6)) return 'null'; " + bucketing + "\nvar parts = String(Math.abs(s)).split('.');\nparts[0] = ('000000000' + parts[0]).substr(-10);\nreturn (start < 0 ?'-':'') + parts.join('.');\n}"
            };
        };
        DruidDataset.prototype.splitToDruid = function () {
            var splitExpression = this.split;
            var label = this.label;
            var queryType;
            var dimension = null;
            var dimensions = null;
            var granularity = 'all';
            var postProcess = null;
            if (splitExpression instanceof Core.RefExpression) {
                var dimensionSpec = (splitExpression.name === label) ? label : { type: "default", dimension: splitExpression.name, outputName: label };
                if (this.havingFilter.equals(Core.Expression.TRUE) && this.limit) {
                    var attributeInfo = this.attributes[splitExpression.name];
                    queryType = 'topN';
                    if (attributeInfo instanceof Core.RangeAttributeInfo) {
                        dimension = {
                            type: "extraction",
                            dimension: splitExpression.name,
                            outputName: label,
                            dimExtractionFn: this.getBucketingDimension(attributeInfo, null)
                        };
                        postProcess = postProcessTopNFactory(postProcessNumberBucketFactory(attributeInfo.rangeSize), label);
                    }
                    else {
                        dimension = dimensionSpec;
                        postProcess = postProcessTopNFactory(null, null);
                    }
                }
                else {
                    queryType = 'groupBy';
                    dimensions = [dimensionSpec];
                    postProcess = postProcessGroupBy;
                }
            }
            else if (splitExpression instanceof Core.TimeBucketExpression) {
                var refExpression = splitExpression.operand;
                if (refExpression instanceof Core.RefExpression) {
                    if (refExpression.name === this.timeAttribute) {
                        queryType = 'timeseries';
                        granularity = {
                            type: "period",
                            period: splitExpression.duration.toString(),
                            timeZone: splitExpression.timezone.toString()
                        };
                        postProcess = makePostProcessTimeseries(splitExpression.duration, splitExpression.timezone, label);
                    }
                    else {
                        throw new Error('can not time bucket non time dimension: ' + refExpression.toString());
                    }
                }
                else {
                    throw new Error('can not convert complex time bucket: ' + refExpression.toString());
                }
            }
            else if (splitExpression instanceof Core.NumberBucketExpression) {
                var refExpression = splitExpression.operand;
                if (refExpression instanceof Core.RefExpression) {
                    var attributeInfo = this.attributes[refExpression.name];
                    queryType = "topN";
                    switch (attributeInfo.type) {
                        case 'NUMBER':
                            var floorExpression = Legacy.driverUtil.continuousFloorExpression("d", "Math.floor", splitExpression.size, splitExpression.offset);
                            dimension = {
                                type: "extraction",
                                dimension: refExpression.name,
                                outputName: label,
                                dimExtractionFn: {
                                    type: "javascript",
                                    'function': "function(d){d=Number(d); if(isNaN(d)) return 'null'; return " + floorExpression + ";}"
                                }
                            };
                            postProcess = postProcessTopNFactory(Number, label);
                            break;
                        case 'NUMBER_RANGE':
                            dimension = {
                                type: "extraction",
                                dimension: refExpression.name,
                                outputName: label,
                                dimExtractionFn: this.getBucketingDimension(attributeInfo, splitExpression)
                            };
                            postProcess = postProcessTopNFactory(postProcessNumberBucketFactory(splitExpression.size), label);
                            break;
                        default:
                            throw new Error("can not number bucket an attribute of type: " + attributeInfo.type);
                    }
                }
                else {
                    throw new Error('can not convert complex number bucket: ' + refExpression.toString());
                }
            }
            else {
                throw new Error('can not convert expression: ' + splitExpression.toString());
            }
            return {
                queryType: queryType,
                granularity: granularity,
                dimension: dimension,
                dimensions: dimensions,
                postProcess: postProcess
            };
        };
        DruidDataset.prototype.expressionToPostAggregation = function (ex) {
            if (ex instanceof Core.RefExpression) {
                return {
                    type: 'fieldAccess',
                    fieldName: ex.name
                };
            }
            else if (ex instanceof Core.LiteralExpression) {
                if (ex.type !== 'NUMBER')
                    throw new Error("must be a NUMBER type");
                return {
                    type: 'constant',
                    value: ex.value
                };
            }
            else if (ex instanceof Core.AddExpression) {
                return {
                    type: 'arithmetic',
                    fn: '+',
                    fields: ex.operands.map(this.expressionToPostAggregation, this)
                };
            }
            else if (ex instanceof Core.MultiplyExpression) {
                return {
                    type: 'arithmetic',
                    fn: '*',
                    fields: ex.operands.map(this.expressionToPostAggregation, this)
                };
            }
            else {
                throw new Error("can not convert expression to post agg: " + ex.toString());
            }
        };
        DruidDataset.prototype.actionToPostAggregation = function (action) {
            if (action instanceof Core.ApplyAction || action instanceof Core.DefAction) {
                var postAgg = this.expressionToPostAggregation(action.expression);
                postAgg.name = action.name;
                return postAgg;
            }
            else {
                throw new Error("must be a def or apply action");
            }
        };
        DruidDataset.prototype.actionToAggregation = function (action) {
            if (action instanceof Core.ApplyAction || action instanceof Core.DefAction) {
                var aggregateExpression = action.expression;
                if (aggregateExpression instanceof Core.AggregateExpression) {
                    var attribute = aggregateExpression.attribute;
                    var aggregation = {
                        name: action.name,
                        type: aggregateExpression.fn === "sum" ? "doubleSum" : aggregateExpression.fn
                    };
                    if (aggregateExpression.fn !== 'count') {
                        if (attribute instanceof Core.RefExpression) {
                            aggregation.fieldName = attribute.name;
                        }
                        else if (attribute) {
                            throw new Error('can not support derived attributes (yet)');
                        }
                    }
                    var aggregateOperand = aggregateExpression.operand;
                    if (aggregateOperand instanceof Core.ActionsExpression && aggregateOperand.actions.length === 1 && aggregateOperand.actions[0] instanceof Core.FilterAction && this.canUseNativeAggregateFilter(aggregateOperand.actions[0].expression)) {
                        aggregation = {
                            type: "filtered",
                            name: action.name,
                            filter: this.timelessFilterToDruid(aggregateOperand.actions[0].expression),
                            aggregator: aggregation
                        };
                    }
                    return aggregation;
                }
                else {
                    throw new Error('can not support non aggregate aggregateExpression');
                }
            }
            else {
                throw new Error("must be a def or apply action");
            }
        };
        DruidDataset.prototype.breakUpApplies = function (applies) {
            var knownExpressions = {};
            var actions = [];
            var nameIndex = 0;
            applies.forEach(function (apply) {
                actions.push(new Core.ApplyAction({
                    action: 'apply',
                    name: apply.name,
                    expression: apply.expression.substitute(function (ex, depth) {
                        if (ex instanceof Core.AggregateExpression) {
                            var key = ex.toString();
                            if (depth === 0) {
                                knownExpressions[key] = apply.name;
                                return null;
                            }
                            var name;
                            if (hasOwnProperty(knownExpressions, key)) {
                                name = knownExpressions[key];
                            }
                            else {
                                name = '_sd_' + nameIndex;
                                nameIndex++;
                                actions.push(new Core.DefAction({
                                    action: 'def',
                                    name: name,
                                    expression: ex
                                }));
                                knownExpressions[key] = name;
                            }
                            return new Core.RefExpression({
                                op: 'ref',
                                name: name,
                                type: 'NUMBER'
                            });
                        }
                    })
                }));
            });
            return actions;
        };
        DruidDataset.prototype.applyToDruid = function (applies) {
            var _this = this;
            var aggregations = [];
            var postAggregations = [];
            this.breakUpApplies(applies).forEach(function (action) {
                if (action.expression instanceof Core.AggregateExpression) {
                    aggregations.push(_this.actionToAggregation(action));
                }
                else {
                    postAggregations.push(_this.actionToPostAggregation(action));
                }
            });
            return {
                aggregations: aggregations,
                postAggregations: postAggregations
            };
        };
        DruidDataset.prototype.havingFilterToDruid = function (filter) {
            if (filter instanceof Core.LiteralExpression) {
                if (filter.value === true) {
                    return null;
                }
                else {
                    throw new Error("should never get here");
                }
            }
            else if (filter instanceof Core.IsExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    return {
                        type: "equalTo",
                        aggregation: lhs.name,
                        value: rhs.value
                    };
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid filter");
                }
            }
            else if (filter instanceof Core.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/STRING') {
                        return {
                            type: "or",
                            fields: rhs.value.getValues().map(function (value) {
                                return {
                                    type: "equalTo",
                                    aggregation: lhs.name,
                                    value: value
                                };
                            })
                        };
                    }
                    else if (rhsType === 'NUMBER_RANGE') {
                        throw new Error("to do");
                    }
                    else if (rhsType === 'TIME_RANGE') {
                        throw new Error("can not time filter on non-primary time dimension");
                    }
                    else {
                        throw new Error("not supported " + rhsType);
                    }
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid having filter");
                }
            }
            else if (filter instanceof Core.LessThanExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Core.RefExpression && rhs instanceof Core.LiteralExpression) {
                    return {
                        type: "lessThan",
                        aggregation: lhs.name,
                        value: rhs.value
                    };
                }
                if (lhs instanceof Core.LiteralExpression && rhs instanceof Core.RefExpression) {
                    return {
                        type: "greaterThan",
                        aggregation: rhs.name,
                        value: lhs.value
                    };
                }
            }
            else if (filter instanceof Core.NotExpression) {
                return {
                    type: "not",
                    field: this.havingFilterToDruid(filter.operand)
                };
            }
            else if (filter instanceof Core.AndExpression || filter instanceof Core.OrExpression) {
                return {
                    type: filter.op,
                    fields: filter.operands.map(this.havingFilterToDruid, this)
                };
            }
            else {
                throw new Error("could not convert filter " + filter.toString() + " to Druid filter");
            }
        };
        DruidDataset.prototype.getQueryAndPostProcess = function () {
            var druidQuery = {
                queryType: 'timeseries',
                dataSource: this.dataSource,
                intervals: null,
                granularity: 'all'
            };
            switch (this.mode) {
                case 'total':
                    var filterAndIntervals = this.filterToDruid(this.filter);
                    druidQuery.intervals = filterAndIntervals.intervals;
                    if (filterAndIntervals.filter) {
                        druidQuery.filter = filterAndIntervals.filter;
                    }
                    var aggregationsAndPostAggregations = this.applyToDruid(this.applies);
                    if (aggregationsAndPostAggregations.aggregations.length) {
                        druidQuery.aggregations = aggregationsAndPostAggregations.aggregations;
                    }
                    if (aggregationsAndPostAggregations.postAggregations.length) {
                        druidQuery.postAggregations = aggregationsAndPostAggregations.postAggregations;
                    }
                    return {
                        query: druidQuery,
                        postProcess: postProcessTotal
                    };
                case 'split':
                    var filterAndIntervals = this.filterToDruid(this.filter);
                    druidQuery.intervals = filterAndIntervals.intervals;
                    if (filterAndIntervals.filter) {
                        druidQuery.filter = filterAndIntervals.filter;
                    }
                    var aggregationsAndPostAggregations = this.applyToDruid(this.applies);
                    if (aggregationsAndPostAggregations.aggregations.length) {
                        druidQuery.aggregations = aggregationsAndPostAggregations.aggregations;
                    }
                    if (aggregationsAndPostAggregations.postAggregations.length) {
                        druidQuery.postAggregations = aggregationsAndPostAggregations.postAggregations;
                    }
                    var splitSpec = this.splitToDruid();
                    druidQuery.queryType = splitSpec.queryType;
                    druidQuery.granularity = splitSpec.granularity;
                    if (splitSpec.dimension)
                        druidQuery.dimension = splitSpec.dimension;
                    if (splitSpec.dimensions)
                        druidQuery.dimensions = splitSpec.dimensions;
                    var postProcess = splitSpec.postProcess;
                    switch (druidQuery.queryType) {
                        case 'timeseries':
                            var split = this.split;
                            if (this.sort && (this.sort.direction !== 'ascending' || this.sort.refName() !== this.label)) {
                                throw new Error('can not sort within timeseries query');
                            }
                            if (this.limit) {
                                throw new Error('can not limit within timeseries query');
                            }
                            break;
                        case 'topN':
                            var sortAction = this.sort;
                            var metric = sortAction.expression.name;
                            if (this.sortOrigin === 'label') {
                                metric = { type: 'lexicographic' };
                            }
                            if (sortAction.direction === 'ascending') {
                                metric = { type: "inverted", metric: metric };
                            }
                            druidQuery.metric = metric;
                            if (this.limit) {
                                druidQuery.threshold = this.limit.limit;
                            }
                            break;
                        case 'groupBy':
                            var sortAction = this.sort;
                            druidQuery.limitSpec = {
                                type: "default",
                                limit: 500000,
                                columns: [sortAction ? sortAction.expression.name : this.label]
                            };
                            if (this.limit) {
                                druidQuery.limitSpec.limit = this.limit.limit;
                            }
                            if (!this.havingFilter.equals(Core.Expression.TRUE)) {
                                druidQuery.having = this.havingFilterToDruid(this.havingFilter);
                            }
                            break;
                    }
                    return {
                        query: druidQuery,
                        postProcess: postProcess
                    };
                default:
                    throw new Error("can not get query for: " + this.mode);
            }
        };
        DruidDataset.prototype.getIntrospectQueryAndPostProcess = function () {
            return {
                query: {
                    queryType: 'introspect',
                    dataSource: this.dataSource
                },
                postProcess: postProcessIntrospectFactory(this.timeAttribute)
            };
        };
        DruidDataset.type = 'DATASET';
        DruidDataset.TRUE_INTERVAL = ["1000-01-01/3000-01-01"];
        DruidDataset.FALSE_INTERVAL = ["1000-01-01/1000-01-02"];
        return DruidDataset;
    })(Core.RemoteDataset);
    Core.DruidDataset = DruidDataset;
    Core.Dataset.register(DruidDataset);
})(Core || (Core = {}));
var Core;
(function (Core) {
    function makeFacetFilter(expression) {
        if (expression.type !== 'BOOLEAN')
            return null;
        if (expression instanceof Core.LiteralExpression) {
            return {
                type: String(expression.value)
            };
        }
        else if (expression instanceof Core.IsExpression) {
            if (expression.lhs.isOp('ref') && expression.rhs.isOp('literal')) {
                return {
                    type: 'is',
                    attribute: expression.lhs.name,
                    value: expression.rhs.value
                };
            }
            else {
                return null;
            }
        }
        else if (expression instanceof Core.InExpression) {
            if (expression.lhs.isOp('ref') && expression.rhs.isOp('literal')) {
                if (expression.rhs.type === 'SET') {
                    return {
                        type: 'in',
                        attribute: expression.lhs.name,
                        values: expression.rhs.value.toJS().values
                    };
                }
                else if (expression.rhs.type === 'TIME_RANGE' || expression.rhs.type === 'NUMBER_RANGE') {
                    var timeRange = expression.rhs.value;
                    return {
                        type: 'within',
                        attribute: expression.lhs.name,
                        range: [timeRange.start, timeRange.end]
                    };
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
        }
        else if (expression instanceof Core.NotExpression) {
            var subFilter = makeFacetFilter(expression.operand);
            if (subFilter) {
                return {
                    type: 'not',
                    filter: subFilter
                };
            }
            else {
                return null;
            }
        }
        else if (expression instanceof Core.AndExpression) {
            var subFilters = expression.operands.map(makeFacetFilter);
            if (subFilters.every(Boolean)) {
                return {
                    type: 'and',
                    filters: subFilters
                };
            }
            else {
                return null;
            }
        }
        else if (expression instanceof Core.OrExpression) {
            var subFilters = expression.operands.map(makeFacetFilter);
            if (subFilters.every(Boolean)) {
                return {
                    type: 'or',
                    filters: subFilters
                };
            }
            else {
                return null;
            }
        }
        return null;
    }
    function makeFacetApply(expression) {
        if (expression.type !== 'NUMBER')
            return null;
        if (expression instanceof Core.LiteralExpression) {
            return {
                aggregate: 'constant',
                value: expression.value
            };
        }
        else if (expression instanceof Core.AggregateExpression) {
            if (expression.fn === 'count') {
                return { aggregate: 'count' };
            }
            var attribute = expression.attribute;
            if (attribute instanceof Core.RefExpression) {
                return {
                    aggregate: expression.fn,
                    attribute: attribute.name
                };
            }
            else {
                return null;
            }
        }
        return null;
    }
    function makeFacetSplit(expression, datasetName) {
        if (expression.type !== 'DATASET')
            return null;
        if (expression instanceof Core.LabelExpression) {
            var name = expression.name;
            var splitAgg = expression.operand;
            if (splitAgg instanceof Core.AggregateExpression) {
                var datasetRef = splitAgg.operand;
                if (datasetRef instanceof Core.RefExpression) {
                    if (datasetRef.name !== datasetName)
                        return null;
                }
                else {
                    return null;
                }
                var attr = splitAgg.attribute;
                if (attr instanceof Core.RefExpression) {
                    return {
                        name: name,
                        bucket: 'identity',
                        attribute: attr.name
                    };
                }
                else if (attr instanceof Core.NumberBucketExpression) {
                    var subAttr = attr.operand;
                    if (subAttr instanceof Core.RefExpression) {
                        return {
                            name: name,
                            bucket: 'continuous',
                            attribute: subAttr.name,
                            size: attr.size,
                            offset: attr.offset
                        };
                    }
                    else {
                        return null;
                    }
                }
                else if (attr instanceof Core.TimeBucketExpression) {
                    var subAttr = attr.operand;
                    if (subAttr instanceof Core.RefExpression) {
                        return {
                            name: name,
                            bucket: 'timePeriod',
                            attribute: subAttr.name,
                            period: attr.duration,
                            timezone: attr.timezone
                        };
                    }
                    else {
                        return null;
                    }
                }
            }
            else {
                return null;
            }
        }
        else {
            return null;
        }
    }
    function getFilter(expression) {
        if (expression.type !== 'DATASET')
            return null;
        if (expression instanceof Core.LiteralExpression) {
            return { type: 'true' };
        }
        else if (expression instanceof Core.ActionsExpression) {
            var actions = expression.actions;
            if (actions.some(function (action) { return action.action !== 'filter'; }))
                return null;
            return makeFacetFilter(actions[0].expression);
        }
        else {
            return null;
        }
    }
    function legacyTranslator(expression) {
        if (expression instanceof Core.ActionsExpression) {
            if (!expression.operand.isOp('literal') || expression.operand.type !== 'DATASET') {
                return null;
            }
            var query = [];
            var datasetName;
            var actions = expression.actions;
            var action = actions[0];
            if (action instanceof Core.DefAction) {
                if (action.expression.type !== 'DATASET')
                    throw new Error("can not have non DATASET def actions");
                var filter = getFilter(action.expression);
                if (filter) {
                    datasetName = action.name;
                    if (filter.type !== 'true') {
                        filter.operation = 'filter';
                        query.push(filter);
                    }
                }
                else {
                    throw new Error('unsupported filter');
                }
            }
            else {
                throw new Error('must have dataset');
            }
            var splitPart = null;
            for (var i = 1; i < actions.length; i++) {
                var action = actions[i];
                if (action instanceof Core.ApplyAction) {
                    if (action.expression.type === 'NUMBER') {
                        var apply = makeFacetApply(action.expression);
                        if (apply) {
                            apply.operation = 'apply';
                            apply.name = action.name;
                            query.push(apply);
                        }
                        else {
                            throw new Error('unsupported apply');
                        }
                    }
                    else if (action.expression.type === 'DATASET') {
                        if (splitPart)
                            throw new Error("Can have at most one split");
                        splitPart = legacyTranslatorSplit(action.expression, datasetName);
                    }
                    else {
                        throw new Error("can not have non NUMBER or DATASET apply actions");
                    }
                }
            }
        }
        else {
            return null;
        }
        return Legacy.FacetQuery.fromJS(query.concat(splitPart || []));
    }
    Core.legacyTranslator = legacyTranslator;
    function legacyTranslatorSplit(expression, datasetName) {
        var query = [];
        if (expression instanceof Core.ActionsExpression) {
            var split = makeFacetSplit(expression.operand, datasetName);
            if (split) {
                split.operation = 'split';
                query.push(split);
            }
            else {
                throw new Error('unsupported split');
            }
            var actions = expression.actions;
            var action = actions[0];
            if (action instanceof Core.DefAction) {
                if (action.expression.type !== 'DATASET')
                    throw new Error("must be filtered on the datasource");
            }
            else {
                throw new Error('must have dataset');
            }
            var combine = {
                operation: 'combine'
            };
            var splitPart = null;
            for (var i = 1; i < actions.length; i++) {
                var action = actions[i];
                if (action instanceof Core.ApplyAction) {
                    if (action.expression.type === 'NUMBER') {
                        var apply = makeFacetApply(action.expression);
                        if (apply) {
                            apply.operation = 'apply';
                            apply.name = action.name;
                            query.push(apply);
                        }
                        else {
                            throw new Error('unsupported apply');
                        }
                    }
                    else if (action.expression.type === 'DATASET') {
                        if (splitPart)
                            throw new Error("Can have at most one split");
                        splitPart = legacyTranslatorSplit(action.expression, datasetName);
                    }
                    else {
                        throw new Error("can not have non NUMBER or DATASET apply actions");
                    }
                }
                else if (action instanceof Core.SortAction) {
                    var sortExpression = action.expression;
                    if (sortExpression instanceof Core.RefExpression) {
                        combine.method = 'slice';
                        combine.sort = {
                            compare: 'natural',
                            prop: sortExpression.name,
                            direction: action.direction
                        };
                    }
                }
                else if (action instanceof Core.LimitAction) {
                    combine.limit = action.limit;
                }
            }
            return query.concat([combine], splitPart || []);
        }
        else {
            throw new Error('must split on actions');
        }
    }
    function segmentTreesToDataset(segmentTrees, splitNames) {
        var splitName = splitNames[0];
        var splitNamesTail = splitNames.slice(1);
        return new Core.NativeDataset({
            source: 'native',
            data: segmentTrees.map(function (segmentTree) {
                var prop = segmentTree.prop;
                var datum = {};
                for (var k in prop) {
                    var v = prop[k];
                    if (!Array.isArray(v)) {
                        datum[k] = v;
                    }
                    else if (typeof v[0] === 'number') {
                        datum[k] = Core.NumberRange.fromJS({ start: v[0], end: v[1] });
                    }
                    else {
                        datum[k] = Core.TimeRange.fromJS({ start: v[0], end: v[1] });
                    }
                }
                if (segmentTree.splits) {
                    datum[splitName] = segmentTreesToDataset(segmentTree.splits, splitNamesTail);
                }
                return datum;
            })
        });
    }
    function legacyConverter(legacyDriver) {
        return function (ex) {
            var legacyQuery = legacyTranslator(ex);
            return legacyDriver({
                query: legacyQuery
            }).then(function (segmentTree) {
                var splitNames = legacyQuery.getSplits().map(function (split) { return split.name; });
                return segmentTreesToDataset([segmentTree], splitNames);
            });
        };
    }
    Core.legacyConverter = legacyConverter;
})(Core || (Core = {}));
var Core;
(function (Core) {
    function mergeRemotes(remotes) {
        var lookup = {};
        for (var i = 0; i < remotes.length; i++) {
            var remote = remotes[i];
            if (!remote)
                continue;
            for (var j = 0; j < remote.length; j++) {
                lookup[remote[j]] = true;
            }
        }
        var merged = Object.keys(lookup);
        return merged.length ? merged.sort() : null;
    }
    Core.mergeRemotes = mergeRemotes;
    function dedupSort(a) {
        a = a.sort();
        var newA = [];
        var last = null;
        for (var i = 0; i < a.length; i++) {
            var v = a[i];
            if (v !== last)
                newA.push(v);
            last = v;
        }
        return newA;
    }
    Core.dedupSort = dedupSort;
    function checkArrayEquality(a, b) {
        return a.length === b.length && a.every(function (item, i) { return (item === b[i]); });
    }
    Core.checkArrayEquality = checkArrayEquality;
    function facet(input) {
        if (input === void 0) { input = null; }
        if (input) {
            if (typeof input === 'string') {
                var parts = input.split(':');
                var refValue = {
                    op: 'ref',
                    name: parts[0]
                };
                if (parts.length > 1)
                    refValue.type = parts[1];
                return new Core.RefExpression(refValue);
            }
            else {
                return new Core.LiteralExpression({ op: 'literal', value: input });
            }
        }
        else {
            return new Core.LiteralExpression({
                op: 'literal',
                value: new Core.NativeDataset({ source: 'native', data: [{}] })
            });
        }
    }
    Core.facet = facet;
    function parseExpression(str) {
        try {
            return Core.expressionParser.parse(str);
        }
        catch (e) {
            throw new Error('Parse error ' + e.message + ' on `' + str + '`');
        }
    }
    var check;
    var Expression = (function () {
        function Expression(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.op = parameters.op;
            if (dummy !== dummyObject) {
                throw new TypeError("can not call `new Expression` directly use Expression.fromJS instead");
            }
            if (parameters.simple)
                this.simple = true;
        }
        Expression.isExpression = function (candidate) {
            return Core.isInstanceOf(candidate, Expression);
        };
        Expression.parse = function (str) {
            return Expression.fromJS(parseExpression(str));
        };
        Expression.fromJSLoose = function (param) {
            var expressionJS;
            switch (typeof param) {
                case 'object':
                    if (Expression.isExpression(param)) {
                        return param;
                    }
                    else if (Core.isHigherObject(param)) {
                        if (param.constructor.type) {
                            expressionJS = { op: 'literal', value: param };
                        }
                        else {
                            throw new Error("unknown object");
                        }
                    }
                    else if (param.op) {
                        expressionJS = param;
                    }
                    else if (Array.isArray(param)) {
                        expressionJS = { op: 'literal', value: Core.Set.fromJS(param) };
                    }
                    else if (hasOwnProperty(param, 'start') && hasOwnProperty(param, 'end')) {
                        if (typeof param.start === 'number') {
                            expressionJS = { op: 'literal', value: Core.NumberRange.fromJS(param) };
                        }
                        else {
                            expressionJS = { op: 'literal', value: Core.TimeRange.fromJS(param) };
                        }
                    }
                    else {
                        throw new Error('unknown parameter');
                    }
                    break;
                case 'number':
                    expressionJS = { op: 'literal', value: param };
                    break;
                case 'string':
                    if (/^\w+$/.test(param)) {
                        expressionJS = { op: 'literal', value: param };
                    }
                    else {
                        expressionJS = parseExpression(param);
                    }
                    break;
                default:
                    throw new Error("unrecognizable expression");
            }
            return Expression.fromJS(expressionJS);
        };
        Expression.register = function (ex) {
            var op = ex.name.replace('Expression', '').replace(/^\w/, function (s) { return s.toLowerCase(); });
            Expression.classMap[op] = ex;
        };
        Expression.fromJS = function (expressionJS) {
            if (!hasOwnProperty(expressionJS, "op")) {
                throw new Error("op must be defined");
            }
            var op = expressionJS.op;
            if (typeof op !== "string") {
                throw new Error("op must be a string");
            }
            var ClassFn = Expression.classMap[op];
            if (!ClassFn) {
                throw new Error("unsupported expression op '" + op + "'");
            }
            return ClassFn.fromJS(expressionJS);
        };
        Expression.prototype._ensureOp = function (op) {
            if (!this.op) {
                this.op = op;
                return;
            }
            if (this.op !== op) {
                throw new TypeError("incorrect expression op '" + this.op + "' (needs to be: '" + op + "')");
            }
        };
        Expression.prototype.valueOf = function () {
            var value = { op: this.op };
            if (this.simple)
                value.simple = true;
            return value;
        };
        Expression.prototype.toJS = function () {
            return {
                op: this.op
            };
        };
        Expression.prototype.toJSON = function () {
            return this.toJS();
        };
        Expression.prototype.equals = function (other) {
            return Expression.isExpression(other) && this.op === other.op && this.type === other.type;
        };
        Expression.prototype.canHaveType = function (wantedType) {
            if (!this.type)
                return true;
            if (wantedType === 'SET') {
                return this.type.indexOf('SET/') === 0;
            }
            else {
                return this.type === wantedType;
            }
        };
        Expression.prototype.getComplexity = function () {
            return 1;
        };
        Expression.prototype.isOp = function (op) {
            return this.op === op;
        };
        Expression.prototype.hasRemote = function () {
            return this.some(function (ex) {
                if (ex instanceof Core.LiteralExpression || ex instanceof Core.RefExpression)
                    return ex.isRemote();
                return null;
            });
        };
        Expression.prototype.getRemoteDatasets = function () {
            var remoteDatasets = [];
            this.forEach(function (ex) {
                if (ex instanceof Core.LiteralExpression && ex.type === 'DATASET') {
                    remoteDatasets.push(ex.value.getRemoteDatasets());
                }
            });
            return Core.mergeRemoteDatasets(remoteDatasets);
        };
        Expression.prototype.getReferences = function () {
            throw new Error('can not call on base');
        };
        Expression.prototype.getOperandOfType = function (type) {
            throw new Error('can not call on base');
        };
        Expression.prototype.mergeAnd = function (a) {
            throw new Error('can not call on base');
        };
        Expression.prototype.mergeOr = function (a) {
            throw new Error('can not call on base');
        };
        Expression.prototype.simplify = function () {
            return this;
        };
        Expression.prototype.containsDataset = function () {
            return this.type === 'DATASET';
        };
        Expression.prototype.every = function (iter) {
            throw new Error('can not call on base');
        };
        Expression.prototype.some = function (iter) {
            return !this.every(function (ex) {
                var v = iter(ex);
                return (v == null) ? null : !v;
            });
        };
        Expression.prototype.forEach = function (iter) {
            throw new Error('can not call on base');
        };
        Expression.prototype.substitute = function (substitutionFn) {
            return this._substituteHelper(substitutionFn, 0, 0);
        };
        Expression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            return this;
        };
        Expression.prototype.getFn = function () {
            throw new Error('should never be called directly');
        };
        Expression.prototype._getRawFnJS = function () {
            throw new Error('should never be called directly');
        };
        Expression.prototype.getFnJS = function (wrap) {
            if (wrap === void 0) { wrap = true; }
            var rawFnJS = this._getRawFnJS();
            if (wrap) {
                return 'function(d){return ' + rawFnJS + ';}';
            }
            else {
                return rawFnJS;
            }
        };
        Expression.prototype.separateViaAnd = function (refName) {
            if (typeof refName !== 'string')
                throw new Error('must have refName');
            if (this.type !== 'BOOLEAN')
                return null;
            var myRef = this.getReferences();
            if (myRef.length > 1 && myRef.indexOf(refName) !== -1)
                return null;
            if (myRef[0] === refName) {
                return {
                    included: this,
                    excluded: Expression.TRUE
                };
            }
            else {
                return {
                    included: Expression.TRUE,
                    excluded: this
                };
            }
        };
        Expression.prototype._performAction = function (action) {
            return new Core.ActionsExpression({
                op: 'actions',
                operand: this,
                actions: [action]
            });
        };
        Expression.prototype.apply = function (name, ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this._performAction(new Core.ApplyAction({ name: name, expression: ex }));
        };
        Expression.prototype.def = function (name, ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this._performAction(new Core.DefAction({ name: name, expression: ex }));
        };
        Expression.prototype.filter = function (ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this._performAction(new Core.FilterAction({ expression: ex }));
        };
        Expression.prototype.sort = function (ex, direction) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this._performAction(new Core.SortAction({ expression: ex, direction: direction }));
        };
        Expression.prototype.limit = function (limit) {
            return this._performAction(new Core.LimitAction({ limit: limit }));
        };
        Expression.prototype._performUnaryExpression = function (newValue) {
            newValue.operand = this;
            return new (Expression.classMap[newValue.op])(newValue);
        };
        Expression.prototype.not = function () {
            return this._performUnaryExpression({ op: 'not' });
        };
        Expression.prototype.match = function (re) {
            return this._performUnaryExpression({ op: 'match', regexp: re });
        };
        Expression.prototype.negate = function () {
            return this._performUnaryExpression({ op: 'negate' });
        };
        Expression.prototype.reciprocate = function () {
            return this._performUnaryExpression({ op: 'reciprocate' });
        };
        Expression.prototype.numberBucket = function (size, offset) {
            if (offset === void 0) { offset = 0; }
            return this._performUnaryExpression({ op: 'numberBucket', size: size, offset: offset });
        };
        Expression.prototype.timeBucket = function (duration, timezone) {
            if (!Core.Duration.isDuration(duration))
                duration = Core.Duration.fromJS(duration);
            if (!Core.Timezone.isTimezone(timezone))
                timezone = Core.Timezone.fromJS(timezone);
            return this._performUnaryExpression({ op: 'timeBucket', duration: duration, timezone: timezone });
        };
        Expression.prototype._performAggregate = function (fn, attribute) {
            if (!Expression.isExpression(attribute))
                attribute = Expression.fromJSLoose(attribute);
            return this._performUnaryExpression({
                op: 'aggregate',
                fn: fn,
                attribute: attribute
            });
        };
        Expression.prototype.count = function () {
            return this._performUnaryExpression({ op: 'aggregate', fn: 'count' });
        };
        Expression.prototype.sum = function (attr) {
            return this._performAggregate('sum', attr);
        };
        Expression.prototype.min = function (attr) {
            return this._performAggregate('min', attr);
        };
        Expression.prototype.max = function (attr) {
            return this._performAggregate('max', attr);
        };
        Expression.prototype.group = function (attr) {
            return this._performAggregate('group', attr);
        };
        Expression.prototype.label = function (name) {
            return this._performUnaryExpression({
                op: 'label',
                name: name
            });
        };
        Expression.prototype.split = function (attribute, name, dataName) {
            if (dataName === void 0) { dataName = null; }
            if (!Expression.isExpression(attribute))
                attribute = Expression.fromJSLoose(attribute);
            if (!dataName) {
                if (this.isOp('ref')) {
                    dataName = this.name;
                }
                else {
                    throw new Error("could not guess data name in `split`, please provide one explicitly");
                }
            }
            return this.group(attribute).label(name).def(dataName, facet('^' + dataName).filter(attribute.is(facet('^' + name))));
        };
        Expression.prototype._performBinaryExpression = function (newValue, otherEx) {
            if (typeof otherEx === 'undefined')
                new Error('must have argument');
            if (!Expression.isExpression(otherEx))
                otherEx = Expression.fromJSLoose(otherEx);
            newValue.lhs = this;
            newValue.rhs = otherEx;
            return new (Expression.classMap[newValue.op])(newValue);
        };
        Expression.prototype.is = function (ex) {
            return this._performBinaryExpression({ op: 'is' }, ex);
        };
        Expression.prototype.in = function (ex) {
            return this._performBinaryExpression({ op: 'in' }, ex);
        };
        Expression.prototype.lessThan = function (ex) {
            return this._performBinaryExpression({ op: 'lessThan' }, ex);
        };
        Expression.prototype.lessThanOrEqual = function (ex) {
            return this._performBinaryExpression({ op: 'lessThanOrEqual' }, ex);
        };
        Expression.prototype.greaterThan = function (ex) {
            return this._performBinaryExpression({ op: 'greaterThan' }, ex);
        };
        Expression.prototype.greaterThanOrEqual = function (ex) {
            return this._performBinaryExpression({ op: 'greaterThanOrEqual' }, ex);
        };
        Expression.prototype._performNaryExpression = function (newValue, otherExs) {
            if (!otherExs.length)
                throw new Error('must have at least one argument');
            for (var i = 0; i < otherExs.length; i++) {
                var otherEx = otherExs[i];
                if (Expression.isExpression(otherEx))
                    continue;
                otherExs[i] = Expression.fromJSLoose(otherEx);
            }
            newValue.operands = [this].concat(otherExs);
            return new (Expression.classMap[newValue.op])(newValue);
        };
        Expression.prototype.add = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            return this._performNaryExpression({ op: 'add' }, exs);
        };
        Expression.prototype.subtract = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            if (!exs.length)
                throw new Error('must have at least one argument');
            for (var i = 0; i < exs.length; i++) {
                var ex = exs[i];
                if (Expression.isExpression(ex))
                    continue;
                exs[i] = Expression.fromJSLoose(ex);
            }
            var newExpression = exs.length === 1 ? exs[0] : new Core.AddExpression({ op: 'add', operands: exs });
            return this._performNaryExpression({ op: 'add' }, [new Core.NegateExpression({ op: 'negate', operand: newExpression })]);
        };
        Expression.prototype.multiply = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            return this._performNaryExpression({ op: 'multiply' }, exs);
        };
        Expression.prototype.divide = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            if (!exs.length)
                throw new Error('must have at least one argument');
            for (var i = 0; i < exs.length; i++) {
                var ex = exs[i];
                if (Expression.isExpression(ex))
                    continue;
                exs[i] = Expression.fromJSLoose(ex);
            }
            var newExpression = exs.length === 1 ? exs[0] : new Core.MultiplyExpression({ op: 'add', operands: exs });
            return this._performNaryExpression({ op: 'multiply' }, [new Core.ReciprocateExpression({ op: 'reciprocate', operand: newExpression })]);
        };
        Expression.prototype.and = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            return this._performNaryExpression({ op: 'and' }, exs);
        };
        Expression.prototype.or = function () {
            var exs = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                exs[_i - 0] = arguments[_i];
            }
            return this._performNaryExpression({ op: 'or' }, exs);
        };
        Expression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            return typeContext;
        };
        Expression.prototype.referenceCheck = function (context) {
            var datasetType = {};
            for (var k in context) {
                if (!hasOwnProperty(context, k))
                    continue;
                datasetType[k] = Core.getFullType(context[k]);
            }
            var typeContext = {
                type: 'DATASET',
                datasetType: datasetType
            };
            var alterations = [];
            this._fillRefSubstitutions(typeContext, alterations);
            if (!alterations.length)
                return this;
            function substitutionFn(ex) {
                if (!ex.isOp('ref'))
                    return null;
                for (var i = 0; i < alterations.length; i++) {
                    var alteration = alterations[i];
                    if (ex === alteration.from)
                        return alteration.to;
                }
                return null;
            }
            return this.substitute(substitutionFn);
        };
        Expression.prototype.resolve = function (context, leaveIfNotFound) {
            if (leaveIfNotFound === void 0) { leaveIfNotFound = false; }
            return this.substitute(function (ex, depth, genDiff) {
                if (ex instanceof Core.RefExpression) {
                    var refGen = ex.generations.length;
                    if (genDiff === refGen) {
                        var foundValue = null;
                        var valueFound = false;
                        if (hasOwnProperty(context, ex.name)) {
                            foundValue = context[ex.name];
                            valueFound = true;
                        }
                        else if (context.$def && hasOwnProperty(context.$def, ex.name)) {
                            foundValue = context.$def[ex.name];
                            valueFound = true;
                        }
                        else {
                            if (leaveIfNotFound) {
                                valueFound = false;
                            }
                            else {
                                throw new Error('could not resolve ' + ex.toString() + ' because is was not in the context');
                            }
                        }
                        if (valueFound) {
                            return new Core.LiteralExpression({ op: 'literal', value: foundValue });
                        }
                    }
                    else if (genDiff < refGen) {
                        throw new Error('went too deep during resolve on: ' + ex.toString());
                    }
                }
                return null;
            });
        };
        Expression.prototype.resolved = function () {
            return this.every(function (ex) {
                return (ex instanceof Core.RefExpression) ? ex.generations.length === 0 : null;
            });
        };
        Expression.prototype._computeNativeResolved = function (queries) {
            throw new Error("can not call this directly");
        };
        Expression.prototype._computeResolved = function () {
            throw new Error("can not call this directly");
        };
        Expression.prototype.simulateQueryPlan = function (context) {
            var generatedQueries = [];
            this.referenceCheck(context).resolve(context).simplify()._computeNativeResolved(generatedQueries);
            return generatedQueries;
        };
        Expression.prototype.computeNative = function (context) {
            if (context === void 0) { context = {}; }
            return this.referenceCheck(context).resolve(context).simplify()._computeNativeResolved(null);
        };
        Expression.prototype.compute = function (context) {
            if (context === void 0) { context = {}; }
            if (!Core.datumHasRemote(context) && !this.hasRemote()) {
                return Q(this.computeNative(context));
            }
            var ex = this;
            return Core.introspectDatum(context).then(function (introspectedContext) {
                return ex.referenceCheck(introspectedContext).resolve(introspectedContext).simplify()._computeResolved();
            });
        };
        Expression.classMap = {};
        return Expression;
    })();
    Core.Expression = Expression;
    check = Expression;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var UnaryExpression = (function (_super) {
        __extends(UnaryExpression, _super);
        function UnaryExpression(parameters, dummyObject) {
            _super.call(this, parameters, dummyObject);
            this.operand = parameters.operand;
        }
        UnaryExpression.jsToValue = function (parameters) {
            var value = {
                op: parameters.op
            };
            if (parameters.operand) {
                value.operand = Core.Expression.fromJSLoose(parameters.operand);
            }
            else {
                throw new TypeError("must have a operand");
            }
            return value;
        };
        UnaryExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.operand = this.operand;
            return value;
        };
        UnaryExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.operand = this.operand.toJS();
            return js;
        };
        UnaryExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.operand.equals(other.operand);
        };
        UnaryExpression.prototype.getComplexity = function () {
            return 1 + this.operand.getComplexity();
        };
        UnaryExpression.prototype._specialSimplify = function (simpleOperand) {
            return null;
        };
        UnaryExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperand = this.operand.simplify();
            var special = this._specialSimplify(simpleOperand);
            if (special)
                return special;
            if (simpleOperand.isOp('literal')) {
                return new Core.LiteralExpression({
                    op: 'literal',
                    value: this._makeFn(simpleOperand.getFn())(null)
                });
            }
            var simpleValue = this.valueOf();
            simpleValue.operand = simpleOperand;
            simpleValue.simple = true;
            return new (Core.Expression.classMap[this.op])(simpleValue);
        };
        UnaryExpression.prototype.containsDataset = function () {
            return this.operand.containsDataset();
        };
        UnaryExpression.prototype.getReferences = function () {
            return this.operand.getReferences();
        };
        UnaryExpression.prototype.getOperandOfType = function (type) {
            if (this.operand.isOp(type)) {
                return [this.operand];
            }
            else {
                return [];
            }
        };
        UnaryExpression.prototype._specialEvery = function (iter) {
            return true;
        };
        UnaryExpression.prototype.every = function (iter) {
            var pass = iter(this);
            if (pass != null)
                return pass;
            return this.operand.every(iter) && this._specialEvery(iter);
        };
        UnaryExpression.prototype._specialForEach = function (iter) {
        };
        UnaryExpression.prototype.forEach = function (iter) {
            iter(this);
            this.operand.forEach(iter);
            this._specialForEach(iter);
        };
        UnaryExpression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            var subOperand = this.operand._substituteHelper(substitutionFn, depth + 1, genDiff);
            if (this.operand === subOperand)
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            delete value.simple;
            return new (Core.Expression.classMap[this.op])(value);
        };
        UnaryExpression.prototype._makeFn = function (operandFn) {
            throw new Error("should never be called directly");
        };
        UnaryExpression.prototype.getFn = function () {
            return this._makeFn(this.operand.getFn());
        };
        UnaryExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("should never be called directly");
        };
        UnaryExpression.prototype._getRawFnJS = function () {
            return this._makeFnJS(this.operand._getRawFnJS());
        };
        UnaryExpression.prototype._checkTypeOfOperand = function (wantedType) {
            if (!this.operand.canHaveType(wantedType)) {
                throw new TypeError(this.op + ' expression must have an operand of type ' + wantedType);
            }
        };
        UnaryExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var operandFullType = this.operand._fillRefSubstitutions(typeContext, alterations);
            return {
                type: this.type,
                remote: operandFullType.remote
            };
        };
        return UnaryExpression;
    })(Core.Expression);
    Core.UnaryExpression = UnaryExpression;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var BinaryExpression = (function (_super) {
        __extends(BinaryExpression, _super);
        function BinaryExpression(parameters, dummyObject) {
            _super.call(this, parameters, dummyObject);
            this.lhs = parameters.lhs;
            this.rhs = parameters.rhs;
        }
        BinaryExpression.jsToValue = function (parameters) {
            var op = parameters.op;
            var value = {
                op: op
            };
            if (typeof parameters.lhs !== 'undefined' && parameters.lhs !== null) {
                value.lhs = Core.Expression.fromJSLoose(parameters.lhs);
            }
            else {
                throw new TypeError("must have a lhs");
            }
            if (typeof parameters.rhs !== 'undefined' && parameters.rhs !== null) {
                value.rhs = Core.Expression.fromJSLoose(parameters.rhs);
            }
            else {
                throw new TypeError("must have a rhs");
            }
            return value;
        };
        BinaryExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.lhs = this.lhs;
            value.rhs = this.rhs;
            return value;
        };
        BinaryExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.lhs = this.lhs.toJS();
            js.rhs = this.rhs.toJS();
            return js;
        };
        BinaryExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.lhs.equals(other.lhs) && this.rhs.equals(other.rhs);
        };
        BinaryExpression.prototype.getComplexity = function () {
            return 1 + this.lhs.getComplexity() + this.rhs.getComplexity();
        };
        BinaryExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            return null;
        };
        BinaryExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleLhs = this.lhs.simplify();
            var simpleRhs = this.rhs.simplify();
            var special = this._specialSimplify(simpleLhs, simpleRhs);
            if (special)
                return special;
            if (simpleLhs.isOp('literal') && simpleRhs.isOp('literal')) {
                return new Core.LiteralExpression({
                    op: 'literal',
                    value: this._makeFn(simpleLhs.getFn(), simpleRhs.getFn())(null)
                });
            }
            var simpleValue = this.valueOf();
            simpleValue.lhs = simpleLhs;
            simpleValue.rhs = simpleRhs;
            simpleValue.simple = true;
            return new (Core.Expression.classMap[this.op])(simpleValue);
        };
        BinaryExpression.prototype.containsDataset = function () {
            return this.lhs.containsDataset() || this.rhs.containsDataset();
        };
        BinaryExpression.prototype.getOperandOfType = function (type) {
            var ret = [];
            if (this.lhs.isOp(type))
                ret.push(this.lhs);
            if (this.rhs.isOp(type))
                ret.push(this.rhs);
            return ret;
        };
        BinaryExpression.prototype.checkLefthandedness = function () {
            if (this.lhs instanceof Core.RefExpression && this.rhs instanceof Core.RefExpression)
                return null;
            if (this.lhs instanceof Core.RefExpression)
                return true;
            if (this.rhs instanceof Core.RefExpression)
                return false;
            return null;
        };
        BinaryExpression.prototype.getReferences = function () {
            return Core.dedupSort(this.lhs.getReferences().concat(this.rhs.getReferences()));
        };
        BinaryExpression.prototype.every = function (iter) {
            var pass = iter(this);
            if (pass != null)
                return pass;
            return this.lhs.every(iter) && this.rhs.every(iter);
        };
        BinaryExpression.prototype.forEach = function (iter) {
            iter(this);
            this.lhs.forEach(iter);
            this.rhs.forEach(iter);
        };
        BinaryExpression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            var subLhs = this.lhs._substituteHelper(substitutionFn, depth, genDiff);
            var subRhs = this.rhs._substituteHelper(substitutionFn, depth, genDiff);
            if (this.lhs === subLhs && this.rhs === subRhs)
                return this;
            var value = this.valueOf();
            value.lhs = subLhs;
            value.rhs = subRhs;
            delete value.simple;
            return new (Core.Expression.classMap[this.op])(value);
        };
        BinaryExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            throw new Error("should never be called directly");
        };
        BinaryExpression.prototype.getFn = function () {
            return this._makeFn(this.lhs.getFn(), this.rhs.getFn());
        };
        BinaryExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            throw new Error("should never be called directly");
        };
        BinaryExpression.prototype._getRawFnJS = function () {
            return this._makeFnJS(this.lhs._getRawFnJS(), this.rhs._getRawFnJS());
        };
        BinaryExpression.prototype._checkTypeOf = function (lhsRhs, wantedType) {
            var operand = this[lhsRhs];
            if (!operand.canHaveType(wantedType)) {
                throw new TypeError(this.op + ' ' + lhsRhs + ' must be of type ' + wantedType);
            }
        };
        BinaryExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var lhsFullType = this.lhs._fillRefSubstitutions(typeContext, alterations);
            var rhsFullType = this.rhs._fillRefSubstitutions(typeContext, alterations);
            return {
                type: this.type,
                remote: Core.mergeRemotes([lhsFullType.remote, rhsFullType.remote])
            };
        };
        return BinaryExpression;
    })(Core.Expression);
    Core.BinaryExpression = BinaryExpression;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var NaryExpression = (function (_super) {
        __extends(NaryExpression, _super);
        function NaryExpression(parameters, dummyObject) {
            _super.call(this, parameters, dummyObject);
            this.operands = parameters.operands;
        }
        NaryExpression.jsToValue = function (parameters) {
            var op = parameters.op;
            var value = {
                op: op
            };
            if (Array.isArray(parameters.operands)) {
                value.operands = parameters.operands.map(function (operand) { return Core.Expression.fromJSLoose(operand); });
            }
            else {
                throw new TypeError("must have a operands");
            }
            return value;
        };
        NaryExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.operands = this.operands;
            return value;
        };
        NaryExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.operands = this.operands.map(function (operand) { return operand.toJS(); });
            return js;
        };
        NaryExpression.prototype.equals = function (other) {
            if (!(_super.prototype.equals.call(this, other) && this.operands.length === other.operands.length))
                return false;
            var thisOperands = this.operands;
            var otherOperands = other.operands;
            for (var i = 0; i < thisOperands.length; i++) {
                if (!thisOperands[i].equals(otherOperands[i]))
                    return false;
            }
            return true;
        };
        NaryExpression.prototype.getComplexity = function () {
            var complexity = 1;
            var operands = this.operands;
            for (var i = 0; i < operands.length; i++) {
                complexity += operands[i].getComplexity();
            }
            return complexity;
        };
        NaryExpression.prototype._specialSimplify = function (simpleOperands) {
            return null;
        };
        NaryExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperands = this.operands.map(function (operand) { return operand.simplify(); });
            var special = this._specialSimplify(simpleOperands);
            if (special)
                return special;
            var literalOperands = simpleOperands.filter(function (operand) { return operand.isOp('literal'); });
            var nonLiteralOperands = simpleOperands.filter(function (operand) { return !operand.isOp('literal'); });
            var literalExpression = new Core.LiteralExpression({
                op: 'literal',
                value: this._makeFn(literalOperands.map(function (operand) { return operand.getFn(); }))(null)
            });
            if (nonLiteralOperands.length) {
                nonLiteralOperands.push(literalExpression);
                var simpleValue = this.valueOf();
                simpleValue.operands = nonLiteralOperands;
                simpleValue.simple = true;
                return new (Core.Expression.classMap[this.op])(simpleValue);
            }
            else {
                return literalExpression;
            }
        };
        NaryExpression.prototype.containsDataset = function () {
            return this.operands.some(function (operand) { return operand.containsDataset(); });
        };
        NaryExpression.prototype.getReferences = function () {
            return Core.dedupSort(Array.prototype.concat.apply([], this.operands.map(function (operand) { return operand.getReferences(); })));
        };
        NaryExpression.prototype.getOperandOfType = function (type) {
            return this.operands.filter(function (operand) { return operand.isOp(type); });
        };
        NaryExpression.prototype.every = function (iter) {
            var pass = iter(this);
            if (pass != null)
                return false;
            return this.operands.every(function (operand) { return operand.every(iter); });
        };
        NaryExpression.prototype.forEach = function (iter) {
            iter(this);
            this.operands.forEach(function (operand) { return operand.forEach(iter); });
        };
        NaryExpression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            var subOperands = this.operands.map(function (operand) { return operand._substituteHelper(substitutionFn, depth + 1, genDiff); });
            if (this.operands.every(function (op, i) { return op === subOperands[i]; }))
                return this;
            var value = this.valueOf();
            value.operands = subOperands;
            delete value.simple;
            return new (Core.Expression.classMap[this.op])(value);
        };
        NaryExpression.prototype._makeFn = function (operandFns) {
            throw new Error("should never be called directly");
        };
        NaryExpression.prototype.getFn = function () {
            return this._makeFn(this.operands.map(function (operand) { return operand.getFn(); }));
        };
        NaryExpression.prototype._makeFnJS = function (operandFnJSs) {
            throw new Error("should never be called directly");
        };
        NaryExpression.prototype._getRawFnJS = function () {
            return this._makeFnJS(this.operands.map(function (operand) { return operand._getRawFnJS(); }));
        };
        NaryExpression.prototype._checkTypeOfOperands = function (wantedType) {
            var operands = this.operands;
            for (var i = 0; i < operands.length; i++) {
                if (!operands[i].canHaveType(wantedType)) {
                    throw new TypeError(this.op + ' must have an operand of type ' + wantedType + ' at position ' + i);
                }
            }
        };
        NaryExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var remotes = this.operands.map(function (operand) { return operand._fillRefSubstitutions(typeContext, alterations).remote; });
            return {
                type: this.type,
                remote: Core.mergeRemotes(remotes)
            };
        };
        return NaryExpression;
    })(Core.Expression);
    Core.NaryExpression = NaryExpression;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var ActionsExpression = (function (_super) {
        __extends(ActionsExpression, _super);
        function ActionsExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.actions = parameters.actions;
            this._ensureOp("actions");
            this._checkTypeOfOperand('DATASET');
            this.type = 'DATASET';
        }
        ActionsExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.actions = parameters.actions.map(Core.Action.fromJS);
            return new ActionsExpression(value);
        };
        ActionsExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.actions = this.actions;
            return value;
        };
        ActionsExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.actions = this.actions.map(function (action) { return action.toJS(); });
            return js;
        };
        ActionsExpression.prototype.toString = function () {
            return this.operand.toString() + this.actions.map(function (action) { return action.toString(); }).join('\n  ');
        };
        ActionsExpression.prototype._getSimpleActions = function () {
            var filters;
            var previousSortAction;
            var references;
            var rootNode;
            var rootNodes;
            var simplifiedActions;
            var sortLimitMap;
            var thisAction;
            var topologicallySortedActions;
            simplifiedActions = this.actions.slice();
            filters = simplifiedActions.filter(function (action) { return action instanceof Core.FilterAction; });
            if (filters.length > 0) {
                simplifiedActions = simplifiedActions.filter(function (action) { return !(action instanceof Core.FilterAction); });
                simplifiedActions.push(new Core.FilterAction({
                    expression: new Core.AndExpression({
                        op: 'and',
                        operands: filters.map(function (filterAction) { return filterAction.expression; })
                    })
                }));
            }
            simplifiedActions = simplifiedActions.map(function (action) { return action.simplify(); });
            sortLimitMap = {};
            for (var i = 0; i < simplifiedActions.length; i++) {
                var simplifiedAction = simplifiedActions[i];
                if (simplifiedAction instanceof Core.SortAction)
                    previousSortAction = simplifiedAction;
                if ((simplifiedAction instanceof Core.LimitAction) && previousSortAction) {
                    sortLimitMap[previousSortAction.toString()] = simplifiedAction;
                    previousSortAction = null;
                }
            }
            var seen = {};
            var referenceMap = {};
            var alphabeticallySortedActions = simplifiedActions.filter(function (action) { return !(action instanceof Core.LimitAction); });
            for (var i = 0; i < alphabeticallySortedActions.length; i++) {
                thisAction = alphabeticallySortedActions[i];
                references = thisAction.expression.getReferences();
                if (thisAction instanceof Core.DefAction || thisAction instanceof Core.ApplyAction) {
                    seen["$" + thisAction.name] = true;
                }
                for (var j = 0; j < references.length; j++) {
                    if (!referenceMap[references[j]]) {
                        referenceMap[references[j]] = 1;
                    }
                    else {
                        referenceMap[references[j]]++;
                    }
                }
            }
            for (var k in referenceMap) {
                if (!seen[k]) {
                    referenceMap[k] = 0;
                }
            }
            rootNodes = alphabeticallySortedActions.filter(function (thisAction) {
                return (thisAction.expression.getReferences().every(function (ref) { return referenceMap[ref] === 0; }));
            });
            alphabeticallySortedActions = alphabeticallySortedActions.filter(function (thisAction) {
                return !(thisAction.expression.getReferences().every(function (ref) { return !referenceMap[ref]; }));
            });
            topologicallySortedActions = [];
            while (rootNodes.length > 0) {
                rootNodes.sort(Core.Action.compare);
                topologicallySortedActions.push(rootNode = rootNodes.shift());
                if ((rootNode instanceof Core.DefAction) || (rootNode instanceof Core.ApplyAction)) {
                    referenceMap["$" + rootNode.name]--;
                }
                var i = 0;
                while (i < alphabeticallySortedActions.length) {
                    var thisAction = alphabeticallySortedActions[i];
                    references = thisAction.expression.getReferences();
                    if (references.every(function (ref) { return referenceMap[ref] === 0; })) {
                        rootNodes.push(alphabeticallySortedActions.splice(i, 1)[0]);
                    }
                    else {
                        i++;
                    }
                }
            }
            if (alphabeticallySortedActions.length)
                throw new Error('topological sort error, circular dependency detected');
            var actionsWithLimits = [];
            for (var i = 0; i < topologicallySortedActions.length; i++) {
                thisAction = topologicallySortedActions[i];
                actionsWithLimits.push(thisAction);
                if (thisAction instanceof Core.SortAction && sortLimitMap[thisAction.toString()]) {
                    actionsWithLimits.push(sortLimitMap[thisAction.toString()]);
                }
            }
            return actionsWithLimits;
        };
        ActionsExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperand = this.operand.simplify();
            var simpleActions = this.actions.map(function (action) { return action.simplify(); });
            function isRemoteNumericApply(action) {
                return action instanceof Core.ApplyAction && action.expression.hasRemote() && action.expression.type === 'NUMBER';
            }
            var remoteDatasets = this.getRemoteDatasets();
            if (simpleOperand instanceof Core.LiteralExpression && remoteDatasets.length) {
                var remoteDataset;
                if (simpleOperand.isRemote()) {
                    remoteDataset = simpleOperand.value;
                }
                else if (simpleActions.some(isRemoteNumericApply)) {
                    if (remoteDatasets.length === 1) {
                        remoteDataset = remoteDatasets[0].makeTotal();
                    }
                    else {
                        throw new Error('not done yet');
                    }
                }
                if (remoteDataset) {
                    while (simpleActions.length) {
                        var action = simpleActions[0];
                        var newRemoteDataset = remoteDataset.addAction(action);
                        if (!newRemoteDataset)
                            break;
                        simpleActions.shift();
                        remoteDataset = newRemoteDataset;
                    }
                    if (simpleOperand.value !== remoteDataset) {
                        simpleOperand = new Core.LiteralExpression({
                            op: 'literal',
                            value: remoteDataset
                        });
                        if (simpleActions.length) {
                            simpleActions = remoteDataset.defs.concat(simpleActions);
                        }
                    }
                }
            }
            if (simpleActions.length === 0)
                return simpleOperand;
            var simpleValue = this.valueOf();
            simpleValue.operand = simpleOperand;
            simpleValue.actions = simpleActions;
            simpleValue.simple = true;
            return new ActionsExpression(simpleValue);
        };
        ActionsExpression.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var thisActions = this.actions;
            var otherActions = other.actions;
            if (thisActions.length !== otherActions.length)
                return false;
            for (var i = 0; i < thisActions.length; i++) {
                if (!thisActions[i].equals(otherActions[i]))
                    return false;
            }
            return true;
        };
        ActionsExpression.prototype._specialEvery = function (iter) {
            return this.actions.every(function (action) { return action.every(iter); });
        };
        ActionsExpression.prototype._specialForEach = function (iter) {
            return this.actions.forEach(function (action) { return action.forEach(iter); });
        };
        ActionsExpression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            var subOperand = this.operand._substituteHelper(substitutionFn, depth + 1, genDiff);
            var subActions = this.actions.map(function (action) { return action._substituteHelper(substitutionFn, depth + 1, genDiff + 1); });
            if (this.operand === subOperand && this.actions.every(function (action, i) { return action === subActions[i]; }))
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            value.actions = subActions;
            delete value.simple;
            return new ActionsExpression(value);
        };
        ActionsExpression.prototype._makeFn = function (operandFn) {
            throw new Error("can not call makeFn on actions");
        };
        ActionsExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        ActionsExpression.prototype._performAction = function (action) {
            return new ActionsExpression({
                op: 'actions',
                operand: this.operand,
                actions: this.actions.concat(action)
            });
        };
        ActionsExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            typeContext = this.operand._fillRefSubstitutions(typeContext, alterations);
            var actions = this.actions;
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (action instanceof Core.DefAction || action instanceof Core.ApplyAction) {
                    typeContext.datasetType[action.name] = action.expression._fillRefSubstitutions(typeContext, alterations);
                }
                else if (action instanceof Core.SortAction || action instanceof Core.FilterAction) {
                    action.expression._fillRefSubstitutions(typeContext, alterations);
                }
            }
            return typeContext;
        };
        ActionsExpression.prototype._computeNativeResolved = function (queries) {
            var dataset = this.operand._computeNativeResolved(queries);
            var actions = this.actions;
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                var actionExpression = action.expression;
                if (action instanceof Core.FilterAction) {
                    dataset = dataset.filter(action.expression.getFn());
                }
                else if (action instanceof Core.ApplyAction) {
                    if (actionExpression instanceof Core.LiteralExpression) {
                        var v = actionExpression._computeNativeResolved(queries);
                        dataset = dataset.apply(action.name, function () { return v; });
                    }
                    else if (actionExpression instanceof ActionsExpression) {
                        dataset = dataset.apply(action.name, function (d) {
                            return actionExpression.resolve(d).simplify()._computeNativeResolved(queries);
                        });
                    }
                    else {
                        dataset = dataset.apply(action.name, actionExpression.getFn());
                    }
                }
                else if (action instanceof Core.DefAction) {
                    if (actionExpression instanceof ActionsExpression) {
                        dataset = dataset.def(action.name, function (d) {
                            var simple = actionExpression.resolve(d).simplify();
                            if (simple instanceof Core.LiteralExpression) {
                                return simple.value;
                            }
                            else {
                                return simple._computeNativeResolved(queries);
                            }
                        });
                    }
                    else {
                        dataset = dataset.def(action.name, actionExpression.getFn());
                    }
                }
                else if (action instanceof Core.SortAction) {
                    dataset = dataset.sort(actionExpression.getFn(), action.direction);
                }
                else if (action instanceof Core.LimitAction) {
                    dataset = dataset.limit(action.limit);
                }
            }
            return dataset;
        };
        ActionsExpression.prototype._computeResolved = function () {
            var actions = this.actions;
            function execAction(i) {
                return function (dataset) {
                    var action = actions[i];
                    var actionExpression = action.expression;
                    if (action instanceof Core.FilterAction) {
                        return dataset.filter(action.expression.getFn());
                    }
                    else if (action instanceof Core.ApplyAction) {
                        if (actionExpression instanceof ActionsExpression) {
                            return dataset.applyPromise(action.name, function (d) {
                                return actionExpression.resolve(d).simplify()._computeResolved();
                            });
                        }
                        else {
                            return dataset.apply(action.name, actionExpression.getFn());
                        }
                    }
                    else if (action instanceof Core.DefAction) {
                        if (actionExpression instanceof ActionsExpression) {
                            return dataset.def(action.name, function (d) {
                                var simple = actionExpression.resolve(d).simplify();
                                if (simple instanceof Core.LiteralExpression) {
                                    return simple.value;
                                }
                                else {
                                    return simple._computeResolved();
                                }
                            });
                        }
                        else {
                            return dataset.def(action.name, actionExpression.getFn());
                        }
                    }
                    else if (action instanceof Core.SortAction) {
                        return dataset.sort(actionExpression.getFn(), action.direction);
                    }
                    else if (action instanceof Core.LimitAction) {
                        return dataset.limit(action.limit);
                    }
                };
            }
            var promise = this.operand._computeResolved();
            for (var i = 0; i < actions.length; i++) {
                promise = promise.then(execAction(i));
            }
            return promise;
        };
        return ActionsExpression;
    })(Core.UnaryExpression);
    Core.ActionsExpression = ActionsExpression;
    Core.Expression.register(ActionsExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var AddExpression = (function (_super) {
        __extends(AddExpression, _super);
        function AddExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("add");
            this._checkTypeOfOperands('NUMBER');
            this.type = 'NUMBER';
        }
        AddExpression.fromJS = function (parameters) {
            return new AddExpression(Core.NaryExpression.jsToValue(parameters));
        };
        AddExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' + ') + ')';
        };
        AddExpression.prototype._makeFn = function (operandFns) {
            return function (d) {
                var res = 0;
                for (var i = 0; i < operandFns.length; i++) {
                    res += operandFns[i](d) || 0;
                }
                return res;
            };
        };
        AddExpression.prototype._makeFnJS = function (operandFnJSs) {
            return '(' + operandFnJSs.join('+') + ')';
        };
        return AddExpression;
    })(Core.NaryExpression);
    Core.AddExpression = AddExpression;
    Core.Expression.register(AddExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var AggregateExpression = (function (_super) {
        __extends(AggregateExpression, _super);
        function AggregateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.fn = parameters.fn;
            this.attribute = parameters.attribute;
            this._ensureOp("aggregate");
            this._checkTypeOfOperand('DATASET');
            if (this.fn !== 'count' && !this.attribute) {
                throw new Error(this.fn + " aggregate must have an 'attribute'");
            }
            if (this.fn === 'group') {
                var attrType = this.attribute.type;
                this.type = attrType ? ('SET/' + attrType) : null;
            }
            else {
                this.type = 'NUMBER';
            }
        }
        AggregateExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.fn = parameters.fn;
            if (parameters.attribute) {
                value.attribute = Core.Expression.fromJSLoose(parameters.attribute);
            }
            return new AggregateExpression(value);
        };
        AggregateExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.fn = this.fn;
            if (this.attribute) {
                value.attribute = this.attribute;
            }
            return value;
        };
        AggregateExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            if (this.fn) {
                js.fn = this.fn;
            }
            if (this.attribute) {
                js.attribute = this.attribute.toJS();
            }
            return js;
        };
        AggregateExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.fn === other.fn && Boolean(this.attribute) === Boolean(other.attribute) && (!this.attribute || this.attribute.equals(other.attribute));
        };
        AggregateExpression.prototype._specialEvery = function (iter) {
            return this.attribute ? this.attribute.every(iter) : true;
        };
        AggregateExpression.prototype._specialForEach = function (iter) {
            if (this.attribute)
                this.attribute.forEach(iter);
        };
        AggregateExpression.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            var sub = substitutionFn(this, depth, genDiff);
            if (sub)
                return sub;
            var subOperand = this.operand._substituteHelper(substitutionFn, depth + 1, genDiff);
            var subAttribute = null;
            if (this.attribute) {
                subAttribute = this.attribute._substituteHelper(substitutionFn, depth + 1, genDiff + 1);
            }
            if (this.operand === subOperand && this.attribute === subAttribute)
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            value.attribute = subAttribute;
            delete value.simple;
            return new AggregateExpression(value);
        };
        AggregateExpression.prototype.toString = function () {
            return this.operand.toString() + '.' + this.fn + '(' + (this.attribute ? this.attribute.toString() : '') + ')';
        };
        AggregateExpression.prototype.getComplexity = function () {
            return 1 + this.operand.getComplexity() + (this.attribute ? this.attribute.getComplexity() : 0);
        };
        AggregateExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperand = this.operand.simplify();
            if (simpleOperand instanceof Core.LiteralExpression && !simpleOperand.isRemote()) {
                return new Core.LiteralExpression({
                    op: 'literal',
                    value: this._makeFn(simpleOperand.getFn())(null)
                });
            }
            var simpleValue = this.valueOf();
            simpleValue.operand = simpleOperand;
            if (this.attribute) {
                simpleValue.attribute = this.attribute.simplify();
            }
            simpleValue.simple = true;
            return new AggregateExpression(simpleValue);
        };
        AggregateExpression.prototype.containsDataset = function () {
            return true;
        };
        AggregateExpression.prototype._makeFn = function (operandFn) {
            var fn = this.fn;
            var attribute = this.attribute;
            var attributeFn = attribute ? attribute.getFn() : null;
            return function (d) { return operandFn(d)[fn](attributeFn, attribute); };
        };
        AggregateExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        AggregateExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var datasetContext = this.operand._fillRefSubstitutions(typeContext, alterations);
            var attributeType = 'NUMBER';
            if (this.attribute) {
                attributeType = this.attribute._fillRefSubstitutions(datasetContext, alterations).type;
            }
            return {
                type: this.fn === 'group' ? ('SET/' + attributeType) : this.type,
                remote: datasetContext.remote
            };
        };
        return AggregateExpression;
    })(Core.UnaryExpression);
    Core.AggregateExpression = AggregateExpression;
    Core.Expression.register(AggregateExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var AndExpression = (function (_super) {
        __extends(AndExpression, _super);
        function AndExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("and");
            this._checkTypeOfOperands('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        AndExpression.fromJS = function (parameters) {
            return new AndExpression(Core.NaryExpression.jsToValue(parameters));
        };
        AndExpression._mergeExpressions = function (expressions) {
            return expressions.reduce(function (expression, reducedExpression) {
                if (typeof reducedExpression === 'undefined')
                    return expression;
                if (reducedExpression === null)
                    return null;
                if (reducedExpression instanceof Core.LiteralExpression) {
                    if (reducedExpression.value === true) {
                        return expression;
                    }
                    else if (reducedExpression.value === false) {
                        return reducedExpression;
                    }
                }
                return expression.mergeAnd(reducedExpression);
            });
        };
        AndExpression.prototype.toString = function () {
            return 'and(' + this.operands.map(function (operand) { return operand.toString(); }) + ')';
        };
        AndExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var finalOperands;
            var groupedOperands;
            var mergedExpression;
            var mergedSimplifiedOperands;
            var referenceGroup;
            var simplifiedOperands;
            var sortedReferenceGroups;
            var thisOperand;
            mergedSimplifiedOperands = [];
            simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            for (var i = 0; i < simplifiedOperands.length; i++) {
                var simplifiedOperand = simplifiedOperands[i];
                if (simplifiedOperand instanceof AndExpression) {
                    mergedSimplifiedOperands = mergedSimplifiedOperands.concat((simplifiedOperand).operands);
                }
                else {
                    mergedSimplifiedOperands.push(simplifiedOperand);
                }
            }
            groupedOperands = {};
            for (var j = 0; j < mergedSimplifiedOperands.length; j++) {
                thisOperand = mergedSimplifiedOperands[j];
                referenceGroup = thisOperand.getReferences().toString();
                if (groupedOperands[referenceGroup]) {
                    groupedOperands[referenceGroup].push(thisOperand);
                }
                else {
                    groupedOperands[referenceGroup] = [thisOperand];
                }
            }
            finalOperands = [];
            sortedReferenceGroups = Object.keys(groupedOperands).sort();
            for (var k = 0; k < sortedReferenceGroups.length; k++) {
                mergedExpression = AndExpression._mergeExpressions(groupedOperands[sortedReferenceGroups[k]]);
                if (mergedExpression === null) {
                    finalOperands = finalOperands.concat(groupedOperands[sortedReferenceGroups[k]]);
                }
                else {
                    finalOperands.push(mergedExpression);
                }
            }
            finalOperands = finalOperands.filter(function (operand) { return !(operand.isOp('literal') && operand.value === true); });
            if (finalOperands.some(function (operand) { return operand.isOp('literal') && operand.value === false; })) {
                return Core.Expression.FALSE;
            }
            if (finalOperands.length === 0) {
                return Core.Expression.TRUE;
            }
            else if (finalOperands.length === 1) {
                return finalOperands[0];
            }
            else {
                var simpleValue = this.valueOf();
                simpleValue.operands = finalOperands;
                simpleValue.simple = true;
                return new AndExpression(simpleValue);
            }
        };
        AndExpression.prototype.separateViaAnd = function (refName) {
            if (typeof refName !== 'string')
                throw new Error('must have refName');
            var includedExpressions = [];
            var excludedExpressions = [];
            var operands = this.operands;
            for (var i = 0; i < operands.length; i++) {
                var operand = operands[i];
                var sep = operand.separateViaAnd(refName);
                if (sep === null)
                    return null;
                includedExpressions.push(sep.included);
                excludedExpressions.push(sep.excluded);
            }
            return {
                included: new AndExpression({ op: 'and', operands: includedExpressions }).simplify(),
                excluded: new AndExpression({ op: 'and', operands: excludedExpressions }).simplify()
            };
        };
        AndExpression.prototype._makeFn = function (operandFns) {
            throw new Error("should never be called directly");
        };
        AndExpression.prototype._makeFnJS = function (operandFnJSs) {
            throw new Error("should never be called directly");
        };
        return AndExpression;
    })(Core.NaryExpression);
    Core.AndExpression = AndExpression;
    Core.Expression.register(AndExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var ConcatExpression = (function (_super) {
        __extends(ConcatExpression, _super);
        function ConcatExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("concat");
            this._checkTypeOfOperands('STRING');
            this.type = 'STRING';
        }
        ConcatExpression.fromJS = function (parameters) {
            return new ConcatExpression(Core.NaryExpression.jsToValue(parameters));
        };
        ConcatExpression.prototype.toString = function () {
            return this.operands.map(function (operand) { return operand.toString(); }).join(' ++ ');
        };
        ConcatExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            var hasLiteralOperandsOnly = simplifiedOperands.every(function (operand) { return operand.isOp('literal'); });
            if (hasLiteralOperandsOnly) {
                return new Core.LiteralExpression({
                    op: 'literal',
                    value: this._makeFn(simplifiedOperands.map(function (operand) { return operand.getFn(); }))(null)
                });
            }
            var i = 0;
            while (i < simplifiedOperands.length - 2) {
                if (simplifiedOperands[i].isOp('literal') && simplifiedOperands[i + 1].isOp('literal')) {
                    var mergedValue = simplifiedOperands[i].value + simplifiedOperands[i + 1].value;
                    simplifiedOperands.splice(i, 2, new Core.LiteralExpression({
                        op: 'literal',
                        value: mergedValue
                    }));
                }
                else {
                    i++;
                }
            }
            var simpleValue = this.valueOf();
            simpleValue.operands = simplifiedOperands;
            simpleValue.simple = true;
            return new ConcatExpression(simpleValue);
        };
        ConcatExpression.prototype._makeFn = function (operandFns) {
            return function (d) {
                return operandFns.map(function (operandFn) { return operandFn(d); }).join('');
            };
        };
        ConcatExpression.prototype._makeFnJS = function (operandFnJSs) {
            return '(' + operandFnJSs.join('+') + ')';
        };
        return ConcatExpression;
    })(Core.NaryExpression);
    Core.ConcatExpression = ConcatExpression;
    Core.Expression.register(ConcatExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var GreaterThanExpression = (function (_super) {
        __extends(GreaterThanExpression, _super);
        function GreaterThanExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("greaterThan");
            this._checkTypeOf('lhs', 'NUMBER');
            this._checkTypeOf('rhs', 'NUMBER');
            this.type = 'BOOLEAN';
        }
        GreaterThanExpression.fromJS = function (parameters) {
            return new GreaterThanExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        GreaterThanExpression.prototype.toString = function () {
            return this.lhs.toString() + ' > ' + this.rhs.toString();
        };
        GreaterThanExpression.prototype.simplify = function () {
            return (new Core.LessThanExpression({
                op: 'lessThan',
                lhs: this.rhs,
                rhs: this.lhs
            })).simplify();
        };
        GreaterThanExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) > rhsFn(d); };
        };
        GreaterThanExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            throw '(' + lhsFnJS + '>' + rhsFnJS + ')';
        };
        return GreaterThanExpression;
    })(Core.BinaryExpression);
    Core.GreaterThanExpression = GreaterThanExpression;
    Core.Expression.register(GreaterThanExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var GreaterThanOrEqualExpression = (function (_super) {
        __extends(GreaterThanOrEqualExpression, _super);
        function GreaterThanOrEqualExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("greaterThanOrEqual");
            this._checkTypeOf('lhs', 'NUMBER');
            this._checkTypeOf('rhs', 'NUMBER');
            this.type = 'BOOLEAN';
        }
        GreaterThanOrEqualExpression.fromJS = function (parameters) {
            return new GreaterThanOrEqualExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        GreaterThanOrEqualExpression.prototype.toString = function () {
            return this.lhs.toString() + ' = ' + this.rhs.toString();
        };
        GreaterThanOrEqualExpression.prototype.simplify = function () {
            return (new Core.LessThanOrEqualExpression({
                op: 'lessThanOrEqual',
                lhs: this.rhs,
                rhs: this.lhs
            })).simplify();
        };
        GreaterThanOrEqualExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) >= rhsFn(d); };
        };
        GreaterThanOrEqualExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            throw '(' + lhsFnJS + '>=' + rhsFnJS + ')';
        };
        return GreaterThanOrEqualExpression;
    })(Core.BinaryExpression);
    Core.GreaterThanOrEqualExpression = GreaterThanOrEqualExpression;
    Core.Expression.register(GreaterThanOrEqualExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var InExpression = (function (_super) {
        __extends(InExpression, _super);
        function InExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("in");
            var lhs = this.lhs;
            var rhs = this.rhs;
            if (!(rhs.canHaveType('SET') || (lhs.canHaveType('NUMBER') && rhs.canHaveType('NUMBER_RANGE')) || (lhs.canHaveType('TIME') && rhs.canHaveType('TIME_RANGE')))) {
                throw new TypeError('in expression has a bad type combo');
            }
            this.type = 'BOOLEAN';
        }
        InExpression.fromJS = function (parameters) {
            return new InExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        InExpression.prototype.toString = function () {
            return this.lhs.toString() + ' = ' + this.rhs.toString();
        };
        InExpression.prototype.mergeAnd = function (exp) {
            if (!this.checkLefthandedness())
                return null;
            if (!Core.checkArrayEquality(this.getReferences(), exp.getReferences()))
                return null;
            if (exp instanceof Core.IsExpression) {
                return exp.mergeAnd(this);
            }
            else if (exp instanceof InExpression) {
                if (!exp.checkLefthandedness())
                    return null;
                var rhsType = this.rhs.type;
                if (rhsType !== exp.rhs.type)
                    return Core.Expression.FALSE;
                if (rhsType === 'TIME_RANGE' || rhsType === 'NUMBER_RANGE' || rhsType.indexOf('SET/') === 0) {
                    var intersect = this.rhs.value.intersect(exp.rhs.value);
                    if (intersect === null)
                        return Core.Expression.FALSE;
                    return new InExpression({
                        op: 'in',
                        lhs: this.lhs,
                        rhs: new Core.LiteralExpression({
                            op: 'literal',
                            value: intersect
                        })
                    }).simplify();
                }
                return null;
            }
            return exp;
        };
        InExpression.prototype.mergeOr = function (exp) {
            if (!this.checkLefthandedness())
                return null;
            if (!Core.checkArrayEquality(this.getReferences(), exp.getReferences()))
                return null;
            if (exp instanceof Core.IsExpression) {
                return exp.mergeOr(this);
            }
            else if (exp instanceof InExpression) {
                if (!exp.checkLefthandedness())
                    return null;
                var rhsType = this.rhs.type;
                if (rhsType !== exp.rhs.type)
                    return Core.Expression.FALSE;
                if (rhsType === 'TIME_RANGE' || rhsType === 'NUMBER_RANGE' || rhsType.indexOf('SET/') === 0) {
                    var intersect = this.rhs.value.union(exp.rhs.value);
                    if (intersect === null)
                        return null;
                    return new InExpression({
                        op: 'in',
                        lhs: this.lhs,
                        rhs: new Core.LiteralExpression({
                            op: 'literal',
                            value: intersect
                        })
                    }).simplify();
                }
                return null;
            }
            return exp;
        };
        InExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return rhsFn(d).test(lhsFn(d)); };
        };
        InExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            throw new Error("implement me!");
        };
        InExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs instanceof Core.RefExpression && simpleRhs instanceof Core.LiteralExpression && simpleRhs.type.indexOf('SET/') === 0 && simpleRhs.value.empty())
                return Core.Expression.FALSE;
            return null;
        };
        return InExpression;
    })(Core.BinaryExpression);
    Core.InExpression = InExpression;
    Core.Expression.register(InExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var IsExpression = (function (_super) {
        __extends(IsExpression, _super);
        function IsExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("is");
            var lhsType = this.lhs.type;
            var rhsType = this.rhs.type;
            if (lhsType && rhsType && lhsType !== rhsType) {
                throw new TypeError('is expression must have matching types, (are: ' + lhsType + ', ' + rhsType + ')');
            }
            this.type = 'BOOLEAN';
        }
        IsExpression.fromJS = function (parameters) {
            return new IsExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        IsExpression.prototype.toString = function () {
            return this.lhs.toString() + ' = ' + this.rhs.toString();
        };
        IsExpression.prototype.getComplexity = function () {
            return 1 + this.lhs.getComplexity() + this.rhs.getComplexity();
        };
        IsExpression.prototype.mergeAnd = function (exp) {
            var references = this.getReferences();
            if (!Core.checkArrayEquality(references, exp.getReferences()))
                return null;
            if (this.type !== exp.type)
                return null;
            if (exp instanceof IsExpression) {
                if (references.length === 2)
                    return this;
                if (!(this.lhs instanceof Core.RefExpression && exp.lhs instanceof Core.RefExpression))
                    return null;
                if ((this.rhs).value.valueOf && (exp).rhs.value.valueOf && (exp).rhs.value.valueOf() === (this.rhs).value.valueOf())
                    return this;
                if ((this.rhs).value === (exp).rhs.value)
                    return this;
                return Core.Expression.FALSE;
            }
            else if (exp instanceof Core.InExpression) {
                if (references.length === 2)
                    return null;
                if (!(this.lhs instanceof Core.RefExpression && exp.lhs instanceof Core.RefExpression))
                    return null;
                var expRhs = exp.rhs;
                var thisValue = (this.rhs).value;
                if (expRhs instanceof Core.LiteralExpression) {
                    var rValue = expRhs.value;
                    if (rValue instanceof Core.Set || rValue instanceof Core.TimeRange || rValue instanceof Core.NumberRange) {
                        if (rValue.test(thisValue)) {
                            return this;
                        }
                        else {
                            return Core.Expression.FALSE;
                        }
                    }
                }
                return null;
            }
            else {
                return null;
            }
        };
        IsExpression.prototype.mergeOr = function (exp) {
            var references = this.getReferences();
            if (!Core.checkArrayEquality(references, exp.getReferences()))
                return null;
            if (this.type !== exp.type)
                return null;
            if (exp instanceof IsExpression) {
                if (references.length === 2)
                    return this;
                if (!(this.lhs instanceof Core.RefExpression && exp.lhs instanceof Core.RefExpression))
                    return null;
                var thisValue = (this.rhs).value;
                var expValue = (exp.rhs).value;
                if (thisValue.valueOf && expValue.valueOf && expValue.valueOf() === thisValue.valueOf())
                    return this;
                if (thisValue === expValue)
                    return this;
                return new Core.InExpression({
                    op: 'in',
                    lhs: this.lhs,
                    rhs: new Core.LiteralExpression({
                        op: 'literal',
                        value: Core.Set.fromJS([thisValue, expValue])
                    })
                });
            }
            else if (exp instanceof Core.InExpression) {
                if (references.length === 2)
                    return null;
                if (!(this.lhs instanceof Core.RefExpression && exp.lhs instanceof Core.RefExpression))
                    return null;
                var expRhs = exp.rhs;
                var thisValue = (this.rhs).value;
                if (expRhs instanceof Core.LiteralExpression) {
                    var rValue = expRhs.value;
                    if (rValue instanceof Core.Set) {
                        if (rValue.test(thisValue)) {
                            return exp;
                        }
                        else {
                            return new Core.InExpression({
                                op: 'in',
                                lhs: this.lhs,
                                rhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: rValue.add(thisValue)
                                })
                            });
                        }
                    }
                    else if (rValue instanceof Core.TimeRange || rValue instanceof Core.NumberRange) {
                        if (rValue.test(thisValue)) {
                            return exp;
                        }
                        else {
                            return null;
                        }
                    }
                }
                return null;
            }
            else {
                return null;
            }
        };
        IsExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) === rhsFn(d); };
        };
        IsExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            return '(' + lhsFnJS + '===' + rhsFnJS + ')';
        };
        IsExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs.equals(simpleRhs))
                return Core.Expression.TRUE;
            if (simpleLhs instanceof Core.TimeBucketExpression && simpleRhs instanceof Core.LiteralExpression) {
                var duration = simpleLhs.duration;
                var value = simpleRhs.value;
                var start = value.start;
                var end = value.end;
                if (duration.isSimple()) {
                    if (duration.floor(start, simpleLhs.timezone).valueOf() === start.valueOf() && duration.move(start, simpleLhs.timezone, 1).valueOf() === end.valueOf()) {
                        return new Core.InExpression({
                            op: 'in',
                            lhs: simpleLhs.operand,
                            rhs: simpleRhs
                        });
                    }
                    else {
                        return Core.Expression.FALSE;
                    }
                }
            }
            return null;
        };
        return IsExpression;
    })(Core.BinaryExpression);
    Core.IsExpression = IsExpression;
    Core.Expression.register(IsExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var LabelExpression = (function (_super) {
        __extends(LabelExpression, _super);
        function LabelExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.name = parameters.name;
            this._ensureOp("label");
            this._checkTypeOfOperand('SET');
            if (!this.name)
                throw new Error('split must have a name');
            this.type = 'DATASET';
        }
        LabelExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.name = parameters.name;
            return new LabelExpression(value);
        };
        LabelExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.name = this.name;
            return value;
        };
        LabelExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.name = this.name;
            return js;
        };
        LabelExpression.prototype.toString = function () {
            return this.operand.toString() + ".label('" + this.name + "')";
        };
        LabelExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name;
        };
        LabelExpression.prototype._makeFn = function (operandFn) {
            var name = this.name;
            return function (d) {
                var mySet = operandFn(d);
                if (!mySet)
                    return null;
                return mySet.label(name);
            };
        };
        LabelExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        LabelExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof Core.AggregateExpression && simpleOperand.fn === 'group') {
                var remoteDatasetLiteral = simpleOperand.operand;
                if (remoteDatasetLiteral instanceof Core.LiteralExpression && remoteDatasetLiteral.isRemote()) {
                    var remoteDataset = remoteDatasetLiteral.value;
                    var newRemoteDataset = remoteDataset.addSplit(simpleOperand.attribute, this.name);
                    if (!newRemoteDataset)
                        return null;
                    return new Core.LiteralExpression({
                        op: 'literal',
                        value: newRemoteDataset
                    });
                }
            }
            return null;
        };
        LabelExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var setFullType = this.operand._fillRefSubstitutions(typeContext, alterations);
            var newDatasetType = {};
            newDatasetType[this.name] = {
                type: setFullType.type.substring(4),
                remote: setFullType.remote
            };
            return {
                parent: typeContext,
                type: 'DATASET',
                datasetType: newDatasetType,
                remote: setFullType.remote
            };
        };
        return LabelExpression;
    })(Core.UnaryExpression);
    Core.LabelExpression = LabelExpression;
    Core.Expression.register(LabelExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var LessThanExpression = (function (_super) {
        __extends(LessThanExpression, _super);
        function LessThanExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("lessThan");
            this._checkTypeOf('lhs', 'NUMBER');
            this._checkTypeOf('rhs', 'NUMBER');
            this.type = 'BOOLEAN';
        }
        LessThanExpression.fromJS = function (parameters) {
            return new LessThanExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        LessThanExpression.prototype.toString = function () {
            return this.lhs.toString() + ' < ' + this.rhs.toString();
        };
        LessThanExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) < rhsFn(d); };
        };
        LessThanExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            return '(' + lhsFnJS + '<' + rhsFnJS + ')';
        };
        LessThanExpression.prototype.mergeAnd = function (exp) {
            var expLeftHanded;
            var expVal;
            var thisLeftHanded;
            var thisVal;
            thisLeftHanded = this.checkLefthandedness();
            if (thisLeftHanded === null)
                return null;
            if (exp instanceof Core.BinaryExpression) {
                expLeftHanded = exp.checkLefthandedness();
                expVal = exp.getOperandOfType('literal')[0].value;
                thisVal = this.getOperandOfType('literal')[0].value;
                if (exp instanceof Core.IsExpression) {
                    if (thisLeftHanded) {
                        if (expVal < thisVal) {
                            return exp;
                        }
                        else {
                            return Core.Expression.FALSE;
                        }
                    }
                    else {
                        if (expVal > thisVal) {
                            return exp;
                        }
                        else {
                            return Core.Expression.FALSE;
                        }
                    }
                }
                else if (exp instanceof LessThanExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            return new LessThanExpression({
                                op: 'lessThan',
                                lhs: this.lhs,
                                rhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.min(thisVal, expVal)
                                })
                            });
                        }
                        else {
                            if (thisVal <= expVal) {
                                return Core.Expression.FALSE;
                            }
                            else {
                                return null;
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal <= expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.FALSE;
                            }
                        }
                        else {
                            return new LessThanExpression({
                                op: 'lessThan',
                                lhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.max(thisVal, expVal)
                                }),
                                rhs: this.rhs
                            });
                        }
                    }
                }
                else if (exp instanceof Core.LessThanOrEqualExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            if (thisVal <= expVal) {
                                return new LessThanExpression({
                                    op: 'lessThan',
                                    lhs: this.lhs,
                                    rhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: thisVal
                                    })
                                });
                            }
                            else {
                                return new Core.LessThanOrEqualExpression({
                                    op: 'lessThanOrEqual',
                                    lhs: this.lhs,
                                    rhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: expVal
                                    })
                                });
                            }
                        }
                        else {
                            if (thisVal <= expVal) {
                                return Core.Expression.FALSE;
                            }
                            else {
                                return new Core.InExpression({
                                    op: 'in',
                                    lhs: this.lhs,
                                    rhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: new Core.NumberRange({ start: expVal, end: thisVal })
                                    })
                                });
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal < expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.FALSE;
                            }
                        }
                        else {
                            if (thisVal >= expVal) {
                                return new LessThanExpression({
                                    op: 'lessThan',
                                    lhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: thisVal
                                    }),
                                    rhs: this.rhs
                                });
                            }
                            else {
                                return new Core.LessThanOrEqualExpression({
                                    op: 'lessThanOrEqual',
                                    lhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: expVal
                                    }),
                                    rhs: this.rhs
                                });
                            }
                        }
                    }
                }
            }
            return null;
        };
        LessThanExpression.prototype.mergeOr = function (exp) {
            var expLeftHanded;
            var expVal;
            var thisLeftHanded;
            var thisVal;
            thisLeftHanded = this.checkLefthandedness();
            if (thisLeftHanded === null)
                return null;
            if (exp instanceof Core.BinaryExpression) {
                expLeftHanded = exp.checkLefthandedness();
                expVal = exp.getOperandOfType('literal')[0].value;
                thisVal = this.getOperandOfType('literal')[0].value;
                if (exp instanceof Core.IsExpression) {
                    if (thisLeftHanded) {
                        if (expVal < thisVal) {
                            return this;
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        if (expVal > thisVal) {
                            return this;
                        }
                        else {
                            return null;
                        }
                    }
                }
                else if (exp instanceof LessThanExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            return new LessThanExpression({
                                op: 'lessThan',
                                lhs: this.lhs,
                                rhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.max(thisVal, expVal)
                                })
                            });
                        }
                        else {
                            if (thisVal < expVal) {
                                return null;
                            }
                            else if (thisVal === expVal) {
                                return new Core.NotExpression({
                                    op: 'not',
                                    operand: new Core.IsExpression({
                                        op: 'is',
                                        lhs: this.lhs,
                                        rhs: new Core.LiteralExpression({
                                            op: 'literal',
                                            value: thisVal
                                        })
                                    })
                                });
                            }
                            else {
                                return Core.Expression.TRUE;
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal < expVal) {
                                return Core.Expression.TRUE;
                            }
                            else if (thisVal === expVal) {
                                return new Core.NotExpression({
                                    op: 'not',
                                    operand: new Core.IsExpression({
                                        op: 'is',
                                        lhs: this.rhs,
                                        rhs: new Core.LiteralExpression({
                                            op: 'literal',
                                            value: thisVal
                                        })
                                    })
                                });
                            }
                            else {
                                return null;
                            }
                        }
                        else {
                            return new LessThanExpression({
                                op: 'lessThan',
                                lhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.min(thisVal, expVal)
                                }),
                                rhs: this.rhs
                            });
                        }
                    }
                }
                else if (exp instanceof Core.LessThanOrEqualExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            if (thisVal <= expVal) {
                                return new Core.LessThanOrEqualExpression({
                                    op: 'lessThanOrEqual',
                                    lhs: this.lhs,
                                    rhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: expVal
                                    })
                                });
                            }
                            else {
                                return new LessThanExpression({
                                    op: 'lessThan',
                                    lhs: this.lhs,
                                    rhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: thisVal
                                    })
                                });
                            }
                        }
                        else {
                            if (thisVal < expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.TRUE;
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal <= expVal) {
                                return Core.Expression.TRUE;
                            }
                            else {
                                return null;
                            }
                        }
                        else {
                            if (thisVal >= expVal) {
                                return new Core.LessThanOrEqualExpression({
                                    op: 'lessThanOrEqual',
                                    lhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: expVal
                                    }),
                                    rhs: this.rhs
                                });
                            }
                            else {
                                return new LessThanExpression({
                                    op: 'lessThan',
                                    lhs: new Core.LiteralExpression({
                                        op: 'literal',
                                        value: thisVal
                                    }),
                                    rhs: this.rhs
                                });
                            }
                        }
                    }
                }
            }
            return null;
        };
        return LessThanExpression;
    })(Core.BinaryExpression);
    Core.LessThanExpression = LessThanExpression;
    Core.Expression.register(LessThanExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var LessThanOrEqualExpression = (function (_super) {
        __extends(LessThanOrEqualExpression, _super);
        function LessThanOrEqualExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("lessThanOrEqual");
            this._checkTypeOf('lhs', 'NUMBER');
            this._checkTypeOf('rhs', 'NUMBER');
            this.type = 'BOOLEAN';
        }
        LessThanOrEqualExpression.fromJS = function (parameters) {
            return new LessThanOrEqualExpression(Core.BinaryExpression.jsToValue(parameters));
        };
        LessThanOrEqualExpression.prototype.toString = function () {
            return this.lhs.toString() + ' <= ' + this.rhs.toString();
        };
        LessThanOrEqualExpression.prototype._makeFn = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) <= rhsFn(d); };
        };
        LessThanOrEqualExpression.prototype._makeFnJS = function (lhsFnJS, rhsFnJS) {
            return '(' + lhsFnJS + '<=' + rhsFnJS + ')';
        };
        LessThanOrEqualExpression.prototype.mergeAnd = function (exp) {
            var expLeftHanded;
            var expVal;
            var thisLeftHanded;
            var thisVal;
            thisLeftHanded = this.checkLefthandedness();
            if (thisLeftHanded === null)
                return null;
            if (exp instanceof Core.BinaryExpression) {
                expLeftHanded = exp.checkLefthandedness();
                expVal = exp.getOperandOfType('literal')[0].value;
                thisVal = this.getOperandOfType('literal')[0].value;
                if (exp instanceof Core.IsExpression) {
                    if (thisLeftHanded) {
                        if (expVal < thisVal) {
                            return exp;
                        }
                        else {
                            return Core.Expression.FALSE;
                        }
                    }
                    else {
                        if (expVal > thisVal) {
                            return exp;
                        }
                        else {
                            return Core.Expression.FALSE;
                        }
                    }
                }
                else if (exp instanceof Core.LessThanExpression) {
                    return exp.mergeAnd(this);
                }
                else if (exp instanceof LessThanOrEqualExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            return new LessThanOrEqualExpression({
                                op: 'lessThanOrEqual',
                                lhs: this.lhs,
                                rhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.min(thisVal, expVal)
                                })
                            });
                        }
                        else {
                            if (thisVal < expVal) {
                                return Core.Expression.FALSE;
                            }
                            else {
                                return null;
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal > expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.FALSE;
                            }
                        }
                        else {
                            return new LessThanOrEqualExpression({
                                op: 'lessThanOrEqual',
                                lhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.max(thisVal, expVal)
                                }),
                                rhs: this.rhs
                            });
                        }
                    }
                }
            }
            return null;
        };
        LessThanOrEqualExpression.prototype.mergeOr = function (exp) {
            var expLeftHanded;
            var expVal;
            var thisLeftHanded;
            var thisVal;
            thisLeftHanded = this.checkLefthandedness();
            if (thisLeftHanded === null)
                return null;
            if (exp instanceof Core.BinaryExpression) {
                expLeftHanded = exp.checkLefthandedness();
                expVal = exp.getOperandOfType('literal')[0].value;
                thisVal = this.getOperandOfType('literal')[0].value;
                if (exp instanceof Core.IsExpression) {
                    if (thisLeftHanded) {
                        if (expVal <= thisVal) {
                            return this;
                        }
                        else {
                            return null;
                        }
                    }
                    else {
                        if (expVal >= thisVal) {
                            return this;
                        }
                        else {
                            return null;
                        }
                    }
                }
                else if (exp instanceof Core.LessThanExpression) {
                    return exp.mergeOr(this);
                }
                else if (exp instanceof LessThanOrEqualExpression) {
                    if (thisLeftHanded) {
                        if (expLeftHanded) {
                            return new LessThanOrEqualExpression({
                                op: 'lessThanOrEqual',
                                lhs: this.lhs,
                                rhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.max(thisVal, expVal)
                                })
                            });
                        }
                        else {
                            if (thisVal < expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.TRUE;
                            }
                        }
                    }
                    else {
                        if (expLeftHanded) {
                            if (thisVal > expVal) {
                                return null;
                            }
                            else {
                                return Core.Expression.TRUE;
                            }
                        }
                        else {
                            return new LessThanOrEqualExpression({
                                op: 'lessThanOrEqual',
                                lhs: new Core.LiteralExpression({
                                    op: 'literal',
                                    value: Math.min(thisVal, expVal)
                                }),
                                rhs: this.rhs
                            });
                        }
                    }
                }
            }
            return null;
        };
        return LessThanOrEqualExpression;
    })(Core.BinaryExpression);
    Core.LessThanOrEqualExpression = LessThanOrEqualExpression;
    Core.Expression.register(LessThanOrEqualExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var LiteralExpression = (function (_super) {
        __extends(LiteralExpression, _super);
        function LiteralExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            var value = parameters.value;
            this.value = value;
            this._ensureOp("literal");
            if (typeof this.value === 'undefined') {
                throw new TypeError("must have a `value`");
            }
            this.type = Core.getType(value);
            this.simple = true;
        }
        LiteralExpression.fromJS = function (parameters) {
            var value = {
                op: parameters.op,
                type: parameters.type
            };
            var v = parameters.value;
            if (Core.isHigherObject(v)) {
                value.value = v;
            }
            else {
                value.value = Core.valueFromJS(v, parameters.type);
            }
            return new LiteralExpression(value);
        };
        LiteralExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.value = this.value;
            if (this.type)
                value.type = this.type;
            return value;
        };
        LiteralExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            if (this.value && this.value.toJS) {
                js.value = this.value.toJS();
                js.type = (this.type.indexOf('SET/') === 0) ? 'SET' : this.type;
            }
            else {
                js.value = this.value;
            }
            return js;
        };
        LiteralExpression.prototype.toString = function () {
            var value = this.value;
            if (value instanceof Core.Dataset && value.basis()) {
                return 'facet()';
            }
            else if (this.type === 'STRING') {
                return JSON.stringify(value);
            }
            else {
                return String(value);
            }
        };
        LiteralExpression.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other) || this.type !== other.type)
                return false;
            if (this.value && this.value.equals) {
                return this.value.equals(other.value);
            }
            else {
                return this.value === other.value;
            }
        };
        LiteralExpression.prototype.getReferences = function () {
            return [];
        };
        LiteralExpression.prototype.getFn = function () {
            var value = this.value;
            return function () { return value; };
        };
        LiteralExpression.prototype.every = function (iter) {
            return iter(this) !== false;
        };
        LiteralExpression.prototype.forEach = function (iter) {
            iter(this);
        };
        LiteralExpression.prototype.isRemote = function () {
            return this.value instanceof Core.Dataset && this.value.source !== 'native';
        };
        LiteralExpression.prototype._getRawFnJS = function () {
            return JSON.stringify(this.value);
        };
        LiteralExpression.prototype.mergeAnd = function (exp) {
            if (this.value === false) {
                return this;
            }
            else if (this.value === true) {
                return exp;
            }
            else {
                return null;
            }
        };
        LiteralExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            if (this.type == 'DATASET') {
                var newTypeContext = this.value.getFullType();
                newTypeContext.parent = typeContext;
                return newTypeContext;
            }
            else {
                return { type: this.type };
            }
        };
        LiteralExpression.prototype._computeNativeResolved = function (queries) {
            var value = this.value;
            if (value instanceof Core.RemoteDataset) {
                if (queries)
                    queries.push(value.getQueryAndPostProcess().query);
                return value.simulate();
            }
            else {
                return this.value;
            }
        };
        LiteralExpression.prototype._computeResolved = function () {
            var value = this.value;
            if (value instanceof Core.RemoteDataset) {
                return value.queryValues();
            }
            else {
                return Q(this.value);
            }
        };
        return LiteralExpression;
    })(Core.Expression);
    Core.LiteralExpression = LiteralExpression;
    Core.Expression.FALSE = (new LiteralExpression({ op: 'literal', value: false }));
    Core.Expression.TRUE = (new LiteralExpression({ op: 'literal', value: true }));
    Core.Expression.register(LiteralExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var MatchExpression = (function (_super) {
        __extends(MatchExpression, _super);
        function MatchExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.regexp = parameters.regexp;
            this._ensureOp("match");
            this._checkTypeOfOperand('STRING');
            this.type = 'BOOLEAN';
        }
        MatchExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.regexp = parameters.regexp;
            return new MatchExpression(value);
        };
        MatchExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.regexp = this.regexp;
            return value;
        };
        MatchExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.regexp = this.regexp;
            return js;
        };
        MatchExpression.prototype.toString = function () {
            return this.operand.toString() + '.match(/' + this.regexp + '/)';
        };
        MatchExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.regexp === other.regexp;
        };
        MatchExpression.prototype._makeFn = function (operandFn) {
            var re = new RegExp(this.regexp);
            return function (d) { return re.test(operandFn(d)); };
        };
        MatchExpression.prototype._makeFnJS = function (operandFnJS) {
            return "/" + this.regexp + "/.test(" + operandFnJS + ")";
        };
        return MatchExpression;
    })(Core.UnaryExpression);
    Core.MatchExpression = MatchExpression;
    Core.Expression.register(MatchExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var MultiplyExpression = (function (_super) {
        __extends(MultiplyExpression, _super);
        function MultiplyExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("multiply");
            this._checkTypeOfOperands('NUMBER');
            this.type = 'NUMBER';
        }
        MultiplyExpression.fromJS = function (parameters) {
            return new MultiplyExpression(Core.NaryExpression.jsToValue(parameters));
        };
        MultiplyExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' * ') + ')';
        };
        MultiplyExpression.prototype._makeFn = function (operandFns) {
            return function (d) {
                var res = 1;
                for (var i = 0; i < operandFns.length; i++) {
                    res *= operandFns[i](d) || 0;
                }
                return res;
            };
        };
        MultiplyExpression.prototype._makeFnJS = function (operandFnJSs) {
            return '(' + operandFnJSs.join('*') + ')';
        };
        return MultiplyExpression;
    })(Core.NaryExpression);
    Core.MultiplyExpression = MultiplyExpression;
    Core.Expression.register(MultiplyExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var NegateExpression = (function (_super) {
        __extends(NegateExpression, _super);
        function NegateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("negate");
            this.type = 'NUMBER';
        }
        NegateExpression.fromJS = function (parameters) {
            return new NegateExpression(Core.UnaryExpression.jsToValue(parameters));
        };
        NegateExpression.prototype.toString = function () {
            return this.operand.toString() + '.negate()';
        };
        NegateExpression.prototype._makeFn = function (operandFn) {
            return function (d) { return -operandFn(d); };
        };
        NegateExpression.prototype._makeFnJS = function (operandFnJS) {
            return "-(" + operandFnJS + ")";
        };
        NegateExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof NegateExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return NegateExpression;
    })(Core.UnaryExpression);
    Core.NegateExpression = NegateExpression;
    Core.Expression.register(NegateExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var NotExpression = (function (_super) {
        __extends(NotExpression, _super);
        function NotExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("not");
            this._checkTypeOfOperand('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        NotExpression.fromJS = function (parameters) {
            return new NotExpression(Core.UnaryExpression.jsToValue(parameters));
        };
        NotExpression.prototype.toString = function () {
            return this.operand.toString() + '.not()';
        };
        NotExpression.prototype._makeFn = function (operandFn) {
            return function (d) { return !operandFn(d); };
        };
        NotExpression.prototype._makeFnJS = function (operandFnJS) {
            return "!(" + operandFnJS + ")";
        };
        NotExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof NotExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return NotExpression;
    })(Core.UnaryExpression);
    Core.NotExpression = NotExpression;
    Core.Expression.register(NotExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var NumberBucketExpression = (function (_super) {
        __extends(NumberBucketExpression, _super);
        function NumberBucketExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.size = parameters.size;
            this.offset = parameters.offset || 0;
            this._ensureOp("numberBucket");
            this.type = "NUMBER_RANGE";
        }
        NumberBucketExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.size = parameters.size;
            value.offset = parameters.offset;
            return new NumberBucketExpression(value);
        };
        NumberBucketExpression.prototype.toString = function () {
            return this.operand.toString() + '.numberBucket(' + this.size + (this.offset ? (', ' + this.offset) : '') + ')';
        };
        NumberBucketExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.size = this.size;
            value.offset = this.offset;
            return value;
        };
        NumberBucketExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.size = this.size;
            if (this.offset)
                js.offset = this.offset;
            return js;
        };
        NumberBucketExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.size === other.size && this.offset === other.offset;
        };
        NumberBucketExpression.prototype._makeFn = function (operandFn) {
            var size = this.size;
            var offset = this.offset;
            return function (d) {
                var num = operandFn(d);
                if (num === null)
                    return null;
                return Core.NumberRange.fromNumber(num, size, offset);
            };
        };
        NumberBucketExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        return NumberBucketExpression;
    })(Core.UnaryExpression);
    Core.NumberBucketExpression = NumberBucketExpression;
    Core.Expression.register(NumberBucketExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var OrExpression = (function (_super) {
        __extends(OrExpression, _super);
        function OrExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("or");
            this._checkTypeOfOperands('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        OrExpression.fromJS = function (parameters) {
            return new OrExpression(Core.NaryExpression.jsToValue(parameters));
        };
        OrExpression._mergeExpressions = function (expressions) {
            return expressions.reduce(function (expression, reducedExpression) {
                if (typeof reducedExpression === 'undefined')
                    return expression;
                if (reducedExpression === null)
                    return null;
                if (reducedExpression instanceof Core.LiteralExpression) {
                    if (reducedExpression.value === true) {
                        return reducedExpression;
                    }
                    else if (reducedExpression.value === false) {
                        return expression;
                    }
                }
                return expression.mergeOr(reducedExpression);
            });
        };
        OrExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join('or') + ')';
        };
        OrExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var finalOperands;
            var groupedOperands;
            var mergedExpression;
            var mergedSimplifiedOperands;
            var referenceGroup;
            var simplifiedOperands;
            var sortedReferenceGroups;
            var thisOperand;
            mergedSimplifiedOperands = [];
            simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            for (var i = 0; i < simplifiedOperands.length; i++) {
                if (simplifiedOperands[i].isOp('or')) {
                    mergedSimplifiedOperands = mergedSimplifiedOperands.concat(simplifiedOperands[i].operands);
                }
                else {
                    mergedSimplifiedOperands.push(simplifiedOperands[i]);
                }
            }
            groupedOperands = {};
            for (var j = 0; j < mergedSimplifiedOperands.length; j++) {
                thisOperand = mergedSimplifiedOperands[j];
                referenceGroup = thisOperand.getReferences().toString();
                if (groupedOperands[referenceGroup]) {
                    groupedOperands[referenceGroup].push(thisOperand);
                }
                else {
                    groupedOperands[referenceGroup] = [thisOperand];
                }
            }
            finalOperands = [];
            sortedReferenceGroups = Object.keys(groupedOperands).sort();
            for (var k = 0; k < sortedReferenceGroups.length; k++) {
                mergedExpression = OrExpression._mergeExpressions(groupedOperands[sortedReferenceGroups[k]]);
                if (mergedExpression === null) {
                    finalOperands = finalOperands.concat(groupedOperands[sortedReferenceGroups[k]]);
                }
                else {
                    finalOperands.push(mergedExpression);
                }
            }
            finalOperands = finalOperands.filter(function (operand) { return !(operand.isOp('literal') && operand.value === false); });
            if (finalOperands.some(function (operand) { return operand.isOp('literal') && operand.value === true; })) {
                return Core.Expression.TRUE;
            }
            if (finalOperands.length === 0) {
                return Core.Expression.FALSE;
            }
            else if (finalOperands.length === 1) {
                return finalOperands[0];
            }
            else {
                var simpleValue = this.valueOf();
                simpleValue.operands = finalOperands;
                simpleValue.simple = true;
                return new OrExpression(simpleValue);
            }
        };
        OrExpression.prototype._makeFn = function (operandFns) {
            throw new Error("should never be called directly");
        };
        OrExpression.prototype._makeFnJS = function (operandFnJSs) {
            throw new Error("should never be called directly");
        };
        return OrExpression;
    })(Core.NaryExpression);
    Core.OrExpression = OrExpression;
    Core.Expression.register(OrExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var ReciprocateExpression = (function (_super) {
        __extends(ReciprocateExpression, _super);
        function ReciprocateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("reciprocate");
            this.type = 'NUMBER';
        }
        ReciprocateExpression.fromJS = function (parameters) {
            return new ReciprocateExpression(Core.UnaryExpression.jsToValue(parameters));
        };
        ReciprocateExpression.prototype.toString = function () {
            return this.operand.toString() + '.reciprocate()';
        };
        ReciprocateExpression.prototype._makeFn = function (operandFn) {
            return function (d) { return 1 / operandFn(d); };
        };
        ReciprocateExpression.prototype._makeFnJS = function (operandFnJS) {
            return "1/(" + operandFnJS + ")";
        };
        ReciprocateExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof ReciprocateExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return ReciprocateExpression;
    })(Core.UnaryExpression);
    Core.ReciprocateExpression = ReciprocateExpression;
    Core.Expression.register(ReciprocateExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    function repeat(str, times) {
        return new Array(times + 1).join(str);
    }
    Core.possibleTypes = {
        'NULL': 1,
        'BOOLEAN': 1,
        'NUMBER': 1,
        'TIME': 1,
        'STRING': 1,
        'NUMBER_RANGE': 1,
        'TIME_RANGE': 1,
        'SET': 1,
        'SET/NULL': 1,
        'SET/BOOLEAN': 1,
        'SET/NUMBER': 1,
        'SET/TIME': 1,
        'SET/STRING': 1,
        'SET/NUMBER_RANGE': 1,
        'SET/TIME_RANGE': 1,
        'DATASET': 1
    };
    var RefExpression = (function (_super) {
        __extends(RefExpression, _super);
        function RefExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("ref");
            var match = parameters.name.match(RefExpression.NAME_REGEXP);
            if (match) {
                this.generations = match[1];
                this.name = match[2];
            }
            else {
                throw new Error("invalid name '" + parameters.name + "'");
            }
            if (typeof this.name !== 'string' || this.name.length === 0) {
                throw new TypeError("must have a nonempty `name`");
            }
            if (parameters.type) {
                if (!hasOwnProperty(Core.possibleTypes, parameters.type)) {
                    throw new TypeError("unsupported type '" + parameters.type + "'");
                }
                this.type = parameters.type;
            }
            if (parameters.remote)
                this.remote = parameters.remote;
            this.simple = true;
        }
        RefExpression.fromJS = function (parameters) {
            return new RefExpression(parameters);
        };
        RefExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.name = this.generations + this.name;
            if (this.type)
                value.type = this.type;
            if (this.remote)
                value.remote = this.remote;
            return value;
        };
        RefExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.name = this.generations + this.name;
            if (this.type)
                js.type = this.type;
            return js;
        };
        RefExpression.prototype.toString = function () {
            return '$' + this.generations + this.name + (this.type ? ':' + this.type : '');
        };
        RefExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name && this.generations === other.generations;
        };
        RefExpression.prototype.isRemote = function () {
            return Boolean(this.remote && this.remote.length);
        };
        RefExpression.prototype.getReferences = function () {
            return [this.name];
        };
        RefExpression.prototype.getFn = function () {
            if (this.generations.length)
                throw new Error("can not call getFn on unresolved expression");
            var name = this.name;
            return function (d) {
                if (hasOwnProperty(d, name)) {
                    return d[name];
                }
                else if (d.$def && hasOwnProperty(d.$def, name)) {
                    return d.$def[name];
                }
                else {
                    return null;
                }
            };
        };
        RefExpression.prototype._getRawFnJS = function () {
            if (this.generations.length)
                throw new Error("can not call getRawFnJS on unresolved expression");
            return 'd.' + this.name;
        };
        RefExpression.prototype.every = function (iter) {
            return iter(this) !== false;
        };
        RefExpression.prototype.forEach = function (iter) {
            iter(this);
        };
        RefExpression.prototype._fillRefSubstitutions = function (typeContext, alterations) {
            var numGenerations = this.generations.length;
            var myTypeContext = typeContext;
            while (numGenerations--) {
                myTypeContext = myTypeContext.parent;
                if (!myTypeContext)
                    throw new Error('went too deep on ' + this.toString());
            }
            var genBack = 0;
            while (myTypeContext && !myTypeContext.datasetType[this.name]) {
                myTypeContext = myTypeContext.parent;
                genBack++;
            }
            if (!myTypeContext) {
                throw new Error('could not resolve ' + this.toString());
            }
            var myFullType = myTypeContext.datasetType[this.name];
            var myType = myFullType.type;
            var myRemote = myFullType.remote;
            if (this.type && this.type !== myType) {
                throw new TypeError("type mismatch in " + this.toString() + " (has: " + this.type + " needs: " + myType + ")");
            }
            if (!this.type || genBack > 0 || String(this.remote) !== String(myRemote)) {
                var newGenerations = this.generations + repeat('^', genBack);
                alterations.push({
                    from: this,
                    to: new RefExpression({
                        op: 'ref',
                        name: newGenerations + this.name,
                        type: myType,
                        remote: myRemote
                    })
                });
            }
            if (myType === 'DATASET') {
                return {
                    parent: typeContext,
                    type: 'DATASET',
                    datasetType: myFullType.datasetType,
                    remote: myFullType.remote
                };
            }
            return myFullType;
        };
        RefExpression.NAME_REGEXP = /^(\^*)([a-z_]\w*)$/i;
        return RefExpression;
    })(Core.Expression);
    Core.RefExpression = RefExpression;
    Core.Expression.register(RefExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var TimeBucketExpression = (function (_super) {
        __extends(TimeBucketExpression, _super);
        function TimeBucketExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.duration = parameters.duration;
            this.timezone = parameters.timezone;
            this._ensureOp("timeBucket");
            if (!Core.Duration.isDuration(this.duration)) {
                throw new Error("`duration` must be a Duration");
            }
            if (!Core.Timezone.isTimezone(this.timezone)) {
                throw new Error("`timezone` must be a Timezone");
            }
            this.type = 'TIME_RANGE';
        }
        TimeBucketExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.duration = Core.Duration.fromJS(parameters.duration);
            value.timezone = Core.Timezone.fromJS(parameters.timezone);
            return new TimeBucketExpression(value);
        };
        TimeBucketExpression.prototype.toString = function () {
            return this.operand.toString() + '.timeBucket(' + this.duration.toString() + ', ' + this.timezone.toString() + ')';
        };
        TimeBucketExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.duration = this.duration;
            value.timezone = this.timezone;
            return value;
        };
        TimeBucketExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.duration = this.duration.toJS();
            js.timezone = this.timezone.toJS();
            return js;
        };
        TimeBucketExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.duration.equals(other.duration) && this.timezone.equals(other.timezone);
        };
        TimeBucketExpression.prototype._makeFn = function (operandFn) {
            var duration = this.duration;
            var timezone = this.timezone;
            return function (d) {
                var date = operandFn(d);
                if (date === null)
                    return null;
                return Core.TimeRange.fromDate(date, duration, timezone);
            };
        };
        TimeBucketExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        return TimeBucketExpression;
    })(Core.UnaryExpression);
    Core.TimeBucketExpression = TimeBucketExpression;
    Core.Expression.register(TimeBucketExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var TimeOffsetExpression = (function (_super) {
        __extends(TimeOffsetExpression, _super);
        function TimeOffsetExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.duration = parameters.duration;
            this._ensureOp("timeOffset");
            this._checkTypeOfOperand('TIME');
            if (!Core.Duration.isDuration(this.duration)) {
                throw new Error("`duration` must be a Duration");
            }
            this.type = 'TIME';
        }
        TimeOffsetExpression.fromJS = function (parameters) {
            var value = Core.UnaryExpression.jsToValue(parameters);
            value.duration = Core.Duration.fromJS(parameters.duration);
            return new TimeOffsetExpression(value);
        };
        TimeOffsetExpression.prototype.toString = function () {
            return this.operand.toString() + '.timeOffset(' + this.duration.toString() + ')';
        };
        TimeOffsetExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.duration = this.duration;
            return value;
        };
        TimeOffsetExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.duration = this.duration.toJS();
            return js;
        };
        TimeOffsetExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.duration.equals(other.duration);
        };
        TimeOffsetExpression.prototype._makeFn = function (operandFn) {
            var duration = this.duration;
            return function (d) {
                var date = operandFn(d);
                if (date === null)
                    return null;
                return duration.move(date, Core.Timezone.UTC(), 1);
            };
        };
        TimeOffsetExpression.prototype._makeFnJS = function (operandFnJS) {
            throw new Error("implement me");
        };
        return TimeOffsetExpression;
    })(Core.UnaryExpression);
    Core.TimeOffsetExpression = TimeOffsetExpression;
    Core.Expression.register(TimeOffsetExpression);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var checkAction;
    var Action = (function () {
        function Action(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.action = parameters.action;
            this.expression = parameters.expression;
            if (dummy !== dummyObject) {
                throw new TypeError("can not call `new Action` directly use Action.fromJS instead");
            }
        }
        Action.isAction = function (candidate) {
            return Core.isInstanceOf(candidate, Action);
        };
        Action.register = function (act) {
            var action = act.name.replace('Action', '').replace(/^\w/, function (s) { return s.toLowerCase(); });
            Action.classMap[action] = act;
        };
        Action.fromJS = function (actionJS) {
            if (!hasOwnProperty(actionJS, "action")) {
                throw new Error("action must be defined");
            }
            var action = actionJS.action;
            if (typeof action !== "string") {
                throw new Error("action must be a string");
            }
            var ClassFn = Action.classMap[action];
            if (!ClassFn) {
                throw new Error("unsupported action '" + action + "'");
            }
            return ClassFn.fromJS(actionJS);
        };
        Action.getPrecedenceOrder = function (action) {
            var orders = [Core.FilterAction, Core.SortAction, Core.LimitAction, Core.DefAction, Core.ApplyAction];
            for (var i = 0; i < orders.length; i++) {
                if (action instanceof orders[i])
                    return i;
            }
            return orders.length;
        };
        Action.compare = function (a, b) {
            if (Action.getPrecedenceOrder(a) > Action.getPrecedenceOrder(b)) {
                return 1;
            }
            else if (Action.getPrecedenceOrder(a) < Action.getPrecedenceOrder(b)) {
                return -1;
            }
            var aReferences = a.expression.getReferences();
            var bReferences = b.expression.getReferences();
            if (aReferences.length < bReferences.length) {
                return -1;
            }
            else if (aReferences.length > bReferences.length) {
                return 1;
            }
            else {
                if (bReferences.toString() !== aReferences.toString()) {
                    return aReferences.toString().localeCompare(bReferences.toString());
                }
                return a.name.localeCompare(b.name);
            }
        };
        Action.prototype._ensureAction = function (action) {
            if (!this.action) {
                this.action = action;
                return;
            }
            if (this.action !== action) {
                throw new TypeError("incorrect action '" + this.action + "' (needs to be: '" + action + "')");
            }
        };
        Action.prototype.valueOf = function () {
            var value = {
                action: this.action
            };
            if (this.expression) {
                value.expression = this.expression;
            }
            return value;
        };
        Action.prototype.toJS = function () {
            var js = {
                action: this.action
            };
            if (this.expression) {
                js.expression = this.expression.toJS();
            }
            return js;
        };
        Action.prototype.toJSON = function () {
            return this.toJS();
        };
        Action.prototype.equals = function (other) {
            return Action.isAction(other) && this.action === other.action;
        };
        Action.prototype.getComplexity = function () {
            return 1 + (this.expression ? this.expression.getComplexity() : 0);
        };
        Action.prototype.simplify = function () {
            if (!this.expression)
                return this;
            var value = this.valueOf();
            value.expression = this.expression.simplify();
            return new (Action.classMap[this.action])(value);
        };
        Action.prototype.every = function (iter) {
            return this.expression ? this.expression.every(iter) : true;
        };
        Action.prototype.forEach = function (iter) {
            if (this.expression)
                this.expression.forEach(iter);
        };
        Action.prototype._substituteHelper = function (substitutionFn, depth, genDiff) {
            if (!this.expression)
                return this;
            var subExpression = this.expression._substituteHelper(substitutionFn, depth, genDiff);
            if (this.expression === subExpression)
                return this;
            var value = this.valueOf();
            value.expression = subExpression;
            return new (Action.classMap[this.action])(value);
        };
        Action.classMap = {};
        return Action;
    })();
    Core.Action = Action;
    checkAction = Action;
})(Core || (Core = {}));
var Core;
(function (Core) {
    var ApplyAction = (function (_super) {
        __extends(ApplyAction, _super);
        function ApplyAction(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, dummyObject);
            this.name = parameters.name;
            this._ensureAction("apply");
        }
        ApplyAction.fromJS = function (parameters) {
            return new ApplyAction({
                action: parameters.action,
                name: parameters.name,
                expression: Core.Expression.fromJS(parameters.expression)
            });
        };
        ApplyAction.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.name = this.name;
            return value;
        };
        ApplyAction.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.name = this.name;
            return js;
        };
        ApplyAction.prototype.toString = function () {
            return ".apply('" + this.name + "', " + this.expression.toString() + ')';
        };
        ApplyAction.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name;
        };
        return ApplyAction;
    })(Core.Action);
    Core.ApplyAction = ApplyAction;
    Core.Action.register(ApplyAction);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var DefAction = (function (_super) {
        __extends(DefAction, _super);
        function DefAction(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, dummyObject);
            this.name = parameters.name;
            this._ensureAction("def");
        }
        DefAction.fromJS = function (parameters) {
            return new DefAction({
                action: parameters.action,
                name: parameters.name,
                expression: Core.Expression.fromJS(parameters.expression)
            });
        };
        DefAction.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.name = this.name;
            return value;
        };
        DefAction.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.name = this.name;
            return js;
        };
        DefAction.prototype.toString = function () {
            return ".def('" + this.name + "', " + this.expression.toString() + ')';
        };
        DefAction.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name;
        };
        return DefAction;
    })(Core.Action);
    Core.DefAction = DefAction;
    Core.Action.register(DefAction);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var FilterAction = (function (_super) {
        __extends(FilterAction, _super);
        function FilterAction(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, dummyObject);
            this._ensureAction("filter");
            if (this.expression.type !== 'BOOLEAN') {
                throw new TypeError('must be a boolean expression');
            }
        }
        FilterAction.fromJS = function (parameters) {
            return new FilterAction({
                action: parameters.action,
                name: parameters.name,
                expression: Core.Expression.fromJS(parameters.expression)
            });
        };
        FilterAction.prototype.toString = function () {
            return '.filter(' + this.expression.toString() + ')';
        };
        return FilterAction;
    })(Core.Action);
    Core.FilterAction = FilterAction;
    Core.Action.register(FilterAction);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var LimitAction = (function (_super) {
        __extends(LimitAction, _super);
        function LimitAction(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, dummyObject);
            this.limit = parameters.limit;
            this._ensureAction("limit");
        }
        LimitAction.fromJS = function (parameters) {
            return new LimitAction({
                action: parameters.action,
                limit: parameters.limit
            });
        };
        LimitAction.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.limit = this.limit;
            return value;
        };
        LimitAction.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.limit = this.limit;
            return js;
        };
        LimitAction.prototype.toString = function () {
            return '.limit(' + this.limit + ')';
        };
        LimitAction.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.limit === other.limit;
        };
        return LimitAction;
    })(Core.Action);
    Core.LimitAction = LimitAction;
    Core.Action.register(LimitAction);
})(Core || (Core = {}));
var Core;
(function (Core) {
    var SortAction = (function (_super) {
        __extends(SortAction, _super);
        function SortAction(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, dummyObject);
            this.direction = parameters.direction;
            this._ensureAction("sort");
            if (this.direction !== 'descending' && this.direction !== 'ascending') {
                throw new Error("direction must be 'descending' or 'ascending'");
            }
            if (!this.expression.isOp('ref')) {
                throw new Error("must be a reference expression (for now): " + this.toString());
            }
        }
        SortAction.fromJS = function (parameters) {
            return new SortAction({
                action: parameters.action,
                expression: Core.Expression.fromJS(parameters.expression),
                direction: parameters.direction
            });
        };
        SortAction.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.direction = this.direction;
            return value;
        };
        SortAction.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.direction = this.direction;
            return js;
        };
        SortAction.prototype.toString = function () {
            return '.sort(' + this.expression.toString() + ', ' + this.direction + ')';
        };
        SortAction.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.direction === other.direction;
        };
        SortAction.prototype.refName = function () {
            var expression = this.expression;
            return (expression instanceof Core.RefExpression) ? expression.name : null;
        };
        return SortAction;
    })(Core.Action);
    Core.SortAction = SortAction;
    Core.Action.register(SortAction);
})(Core || (Core = {}));
var Extra;
(function (Extra) {
    var integerRegExp = /^\d+$/;
    function simpleLocator(parameters) {
        if (typeof parameters === "string")
            parameters = { resource: parameters };
        var resource = parameters.resource;
        var defaultPort = parameters.defaultPort;
        if (!resource)
            throw new Error("must have resource");
        var locations = resource.split(";").map(function (locationString) {
            var parts = locationString.split(":");
            if (parts.length > 2)
                throw new Error("invalid resource part '" + locationString + "'");
            var location = {
                hostname: parts[0]
            };
            if (parts.length === 2) {
                if (!integerRegExp.test(parts[1])) {
                    throw new Error("invalid port in resource '" + parts[1] + "'");
                }
                location.port = Number(parts[1]);
            }
            else if (defaultPort) {
                location.port = defaultPort;
            }
            return location;
        });
        return function () { return Q(locations[Math.floor(Math.random() * locations.length)]); };
    }
    Extra.simpleLocator = simpleLocator;
})(Extra || (Extra = {}));
var Extra;
(function (Extra) {
    function retryRequester(parameters) {
        var requester = parameters.requester;
        var delay = parameters.delay || 500;
        var retry = parameters.retry || 3;
        var retryOnTimeout = parameters.retryOnTimeout;
        if (typeof delay !== "number")
            throw new TypeError("delay should be a number");
        if (typeof retry !== "number")
            throw new TypeError("retry should be a number");
        return function (request) {
            var tries = 1;
            function handleError(err) {
                if (tries > retry)
                    throw err;
                tries++;
                if (err.message === "timeout" && !retryOnTimeout)
                    throw err;
                return Q.delay(delay).then(function () { return requester(request); }).catch(handleError);
            }
            return requester(request).catch(handleError);
        };
    }
    Extra.retryRequester = retryRequester;
})(Extra || (Extra = {}));
var Legacy;
(function (Legacy) {
    function specialJoin(array, sep, lastSep) {
        var lengthMinus1 = array.length - 1;
        return array.reduce(function (prev, now, index) { return prev + (index < lengthMinus1 ? sep : lastSep) + now; });
    }
    Legacy.specialJoin = specialJoin;
    function find(array, fn) {
        for (var i = 0, len = array.length; i < len; i++) {
            var a = array[i];
            if (fn.call(array, a, i, array))
                return a;
        }
        return null;
    }
    Legacy.find = find;
    Legacy.dummyObject = {};
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var DEFAULT_DATASET = "main";
    function convertToValue(js, datasetContext) {
        var value = {
            name: js.name,
            aggregate: js.aggregate,
            arithmetic: js.arithmetic,
            dataset: js.dataset,
            attribute: js.attribute,
            value: js.value,
            quantile: js.quantile
        };
        if (datasetContext === DEFAULT_DATASET && js.dataset)
            datasetContext = js.dataset;
        if (js.operands)
            value.operands = js.operands.map(function (operand) { return FacetApply.fromJS(operand, datasetContext); });
        if (js.filter)
            value.filter = Legacy.FacetFilter.fromJS(js.filter);
        if (js.options)
            value.options = Legacy.FacetOptions.fromJS(js.options);
        return value;
    }
    var check;
    var FacetApply = (function () {
        function FacetApply(parameters, datasetContext, dummy) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            if (dummy === void 0) { dummy = null; }
            if (parameters.name)
                this.name = parameters.name;
            if (parameters.aggregate)
                this.aggregate = parameters.aggregate;
            if (parameters.arithmetic)
                this.arithmetic = parameters.arithmetic;
            if (parameters.attribute)
                this.attribute = parameters.attribute;
            if (parameters.options)
                this.options = parameters.options;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new FacetApply` directly use FacetApply.fromJS instead");
            }
            var dataset = parameters.dataset;
            var operands = parameters.operands;
            if (operands) {
                if (!(Array.isArray(operands) && operands.length === 2)) {
                    throw new TypeError("operands must be an array of length 2");
                }
                this.operands = operands;
                var seenDataset = {};
                operands.forEach(function (operand) {
                    operand.getDatasets().forEach(function (ds) {
                        seenDataset[ds] = 1;
                    });
                });
                var datasets = Object.keys(seenDataset).sort();
                if (dataset && dataset !== DEFAULT_DATASET) {
                    if (datasets.length > 1 || (datasets[0] !== dataset && datasets[0] !== DEFAULT_DATASET)) {
                        var otherDatasets = datasets.filter(function (d) { return d !== dataset; });
                        throw new Error("dataset conflict between '" + dataset + "' and '" + otherDatasets.join(', ') + "'");
                    }
                    this.dataset = dataset;
                }
                else if (datasets.length === 1) {
                    this.dataset = datasets[0];
                }
                this.datasets = datasets;
            }
            else {
                this.dataset = dataset || datasetContext;
            }
        }
        FacetApply.isFacetApply = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetApply);
        };
        FacetApply.parse = function (str) {
            return FacetApply.fromJS(Legacy.applyParser.parse(str));
        };
        FacetApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            if (typeof parameters !== "object")
                throw new Error("unrecognizable apply");
            var ApplyConstructor;
            if (hasOwnProperty(parameters, "aggregate")) {
                if (typeof parameters.aggregate !== "string") {
                    throw new Error("aggregate must be a string");
                }
                ApplyConstructor = FacetApply.aggregateClassMap[parameters.aggregate];
                if (!ApplyConstructor) {
                    throw new Error("unsupported aggregate '" + parameters.aggregate + "'");
                }
            }
            else if (hasOwnProperty(parameters, "arithmetic")) {
                if (typeof parameters.arithmetic !== "string") {
                    throw new Error("arithmetic must be a string");
                }
                ApplyConstructor = FacetApply.arithmeticClassMap[parameters.arithmetic];
                if (!ApplyConstructor) {
                    throw new Error("unsupported arithmetic '" + parameters.arithmetic + "'");
                }
            }
            else {
                throw new Error("must have an aggregate or arithmetic");
            }
            return ApplyConstructor.fromJS(parameters, datasetContext);
        };
        FacetApply.prototype._ensureAggregate = function (aggregate) {
            if (!this.aggregate) {
                this.aggregate = aggregate;
                return;
            }
            if (this.aggregate !== aggregate) {
                throw new TypeError("incorrect apply aggregate '" + this.aggregate + "' (needs to be: '" + aggregate + "')");
            }
        };
        FacetApply.prototype._ensureArithmetic = function (arithmetic) {
            if (!this.arithmetic) {
                this.arithmetic = arithmetic;
                return;
            }
            if (this.arithmetic !== arithmetic) {
                throw new TypeError("incorrect apply arithmetic '" + this.arithmetic + "' (needs to be: '" + arithmetic + "')");
            }
        };
        FacetApply.prototype._verifyName = function () {
            if (!this.name) {
                return;
            }
            if (typeof this.name !== "string") {
                throw new TypeError("apply name must be a string");
            }
        };
        FacetApply.prototype._verifyAttribute = function () {
            if (typeof this.attribute !== "string") {
                throw new TypeError("attribute must be a string");
            }
        };
        FacetApply.prototype._addNameToString = function (str) {
            if (!this.name)
                return str;
            return this.name + " <- " + str;
        };
        FacetApply.prototype._datasetOrNothing = function () {
            if (this.dataset === DEFAULT_DATASET) {
                return "";
            }
            else {
                return this.dataset;
            }
        };
        FacetApply.prototype._datasetWithAttribute = function () {
            if (this.dataset === DEFAULT_DATASET) {
                return this.attribute;
            }
            else {
                return this.dataset + "@" + this.attribute;
            }
        };
        FacetApply.prototype.toString = function (from) {
            return this._addNameToString("base apply");
        };
        FacetApply.prototype.toHash = function () {
            throw new Error("can not call FacetApply.toHash directly");
        };
        FacetApply.prototype.valueOf = function () {
            var applySpec = {};
            if (this.name) {
                applySpec.name = this.name;
            }
            if (this.filter) {
                applySpec.filter = this.filter;
            }
            if (this.options) {
                applySpec.options = this.options;
            }
            if (this.arithmetic) {
                applySpec.arithmetic = this.arithmetic;
                var myDataset = this.dataset;
                applySpec.operands = this.operands;
                if (myDataset) {
                    applySpec.dataset = myDataset;
                }
            }
            else {
                applySpec.aggregate = this.aggregate;
                if (this.attribute) {
                    applySpec.attribute = this.attribute;
                }
                if (this.dataset) {
                    applySpec.dataset = this.dataset;
                }
            }
            return applySpec;
        };
        FacetApply.prototype.toJS = function (datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            var applySpec = {};
            if (this.name) {
                applySpec.name = this.name;
            }
            if (this.filter) {
                applySpec.filter = this.filter.toJS();
            }
            if (this.options) {
                applySpec.options = this.options.toJS();
            }
            if (this.arithmetic) {
                applySpec.arithmetic = this.arithmetic;
                var myDataset = this.dataset;
                applySpec.operands = this.operands.map(function (operand) { return operand.toJS(myDataset); });
                if (myDataset && myDataset !== datasetContext) {
                    applySpec.dataset = myDataset;
                }
            }
            else {
                applySpec.aggregate = this.aggregate;
                if (this.attribute) {
                    applySpec.attribute = this.attribute;
                }
                if (this.dataset && this.dataset !== datasetContext) {
                    applySpec.dataset = this.dataset;
                }
            }
            return applySpec;
        };
        FacetApply.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetApply.prototype.equals = function (other) {
            if (!FacetApply.isFacetApply(other))
                return false;
            if (this.operands) {
                return this.arithmetic === other.arithmetic && this.operands.every(function (op, i) { return op.equals(other.operands[i]); });
            }
            else {
                return this.aggregate === other.aggregate && this.attribute === other.attribute && this.dataset === other.dataset && Boolean(this.filter) === Boolean(other.filter) && (!this.filter || this.filter.equals(other.filter)) && Boolean(this.options) === Boolean(other.options) && (!this.options || this.options.equals(other.options));
            }
        };
        FacetApply.prototype.isAdditive = function () {
            return false;
        };
        FacetApply.prototype.addName = function (name) {
            var applySpec = this.toJS();
            applySpec.name = name;
            return FacetApply.fromJS(applySpec);
        };
        FacetApply.prototype.getDataset = function () {
            if (this.operands) {
                return this.datasets[0];
            }
            else {
                return this.dataset;
            }
        };
        FacetApply.prototype.getDatasets = function () {
            if (this.operands) {
                return this.datasets;
            }
            else {
                return [this.dataset];
            }
        };
        FacetApply.prototype.getAttributes = function () {
            var attributeCollection = {};
            this._collectAttributes(attributeCollection);
            return Object.keys(attributeCollection).sort();
        };
        FacetApply.prototype._collectAttributes = function (attributes) {
            if (this.operands) {
                this.operands[0]._collectAttributes(attributes);
                this.operands[1]._collectAttributes(attributes);
            }
            else {
                if (this.attribute) {
                    attributes[this.attribute] = 1;
                }
            }
        };
        return FacetApply;
    })();
    Legacy.FacetApply = FacetApply;
    check = FacetApply;
    var ConstantApply = (function (_super) {
        __extends(ConstantApply, _super);
        function ConstantApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            if (typeof parameters === 'number')
                parameters = { value: parameters };
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var value = parameters.value;
            this.dataset = null;
            this._ensureAggregate("constant");
            this._verifyName();
            if (typeof value === "string") {
                value = Number(value);
            }
            if (typeof value !== "number" || isNaN(value)) {
                throw new Error("constant apply must have a numeric value");
            }
            this.value = value;
        }
        ConstantApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new ConstantApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        ConstantApply.prototype.toString = function () {
            return this._addNameToString(String(this.value));
        };
        ConstantApply.prototype.toHash = function () {
            var hashStr = "C:" + this.value;
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        ConstantApply.prototype.valueOf = function () {
            var apply = _super.prototype.valueOf.call(this);
            apply.value = this.value;
            return apply;
        };
        ConstantApply.prototype.toJS = function () {
            var apply = _super.prototype.toJS.call(this);
            apply.value = this.value;
            return apply;
        };
        ConstantApply.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.value === other.value;
        };
        ConstantApply.prototype.isAdditive = function () {
            return true;
        };
        ConstantApply.prototype.getDatasets = function () {
            return [];
        };
        return ConstantApply;
    })(FacetApply);
    Legacy.ConstantApply = ConstantApply;
    var CountApply = (function (_super) {
        __extends(CountApply, _super);
        function CountApply(parameters, datasetContext) {
            if (parameters === void 0) { parameters = {}; }
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("count");
            this._verifyName();
        }
        CountApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new CountApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        CountApply.prototype.toString = function () {
            return this._addNameToString("count()");
        };
        CountApply.prototype.toHash = function () {
            var hashStr = "CT" + (this._datasetOrNothing());
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        CountApply.prototype.isAdditive = function () {
            return true;
        };
        return CountApply;
    })(FacetApply);
    Legacy.CountApply = CountApply;
    var SumApply = (function (_super) {
        __extends(SumApply, _super);
        function SumApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            if (typeof parameters === 'string')
                parameters = { attribute: parameters };
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("sum");
            this._verifyName();
            this._verifyAttribute();
        }
        SumApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new SumApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        SumApply.prototype.toString = function () {
            return this._addNameToString(this.aggregate + "(`" + this.attribute + "`)");
        };
        SumApply.prototype.toHash = function () {
            var hashStr = "SM:" + (this._datasetWithAttribute());
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        SumApply.prototype.isAdditive = function () {
            return true;
        };
        return SumApply;
    })(FacetApply);
    Legacy.SumApply = SumApply;
    var AverageApply = (function (_super) {
        __extends(AverageApply, _super);
        function AverageApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("average");
            this._verifyName();
            this._verifyAttribute();
        }
        AverageApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new AverageApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        AverageApply.prototype.toString = function () {
            return this._addNameToString(this.aggregate + "(`" + this.attribute + "`)");
        };
        AverageApply.prototype.toHash = function () {
            var hashStr = "AV:" + (this._datasetWithAttribute());
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        AverageApply.prototype.decomposeAverage = function () {
            return DivideApply.fromJS({
                name: this.name,
                dataset: this.dataset,
                operands: [
                    { aggregate: 'sum', attribute: this.attribute },
                    { aggregate: 'count' }
                ]
            });
        };
        return AverageApply;
    })(FacetApply);
    Legacy.AverageApply = AverageApply;
    var MinApply = (function (_super) {
        __extends(MinApply, _super);
        function MinApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("min");
            this._verifyName();
            this._verifyAttribute();
        }
        MinApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new MinApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        MinApply.prototype.toString = function () {
            return this._addNameToString(this.aggregate + "(`" + this.attribute + "`)");
        };
        MinApply.prototype.toHash = function () {
            var hashStr = "MN:" + (this._datasetWithAttribute());
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        MinApply.prototype.valueOf = function () {
            var apply = _super.prototype.valueOf.call(this);
            apply.attribute = this.attribute;
            return apply;
        };
        return MinApply;
    })(FacetApply);
    Legacy.MinApply = MinApply;
    var MaxApply = (function (_super) {
        __extends(MaxApply, _super);
        function MaxApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("max");
            this._verifyName();
            this._verifyAttribute();
        }
        MaxApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new MaxApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        MaxApply.prototype.toString = function () {
            return this._addNameToString(this.aggregate + "(`" + this.attribute + "`)");
        };
        MaxApply.prototype.toHash = function () {
            var hashStr = "MX:" + (this._datasetWithAttribute());
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        return MaxApply;
    })(FacetApply);
    Legacy.MaxApply = MaxApply;
    var UniqueCountApply = (function (_super) {
        __extends(UniqueCountApply, _super);
        function UniqueCountApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var filter = parameters.filter;
            if (filter) {
                this.filter = Legacy.FacetFilter.fromJS(filter);
            }
            this._ensureAggregate("uniqueCount");
            this._verifyName();
            this._verifyAttribute();
        }
        UniqueCountApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new UniqueCountApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        UniqueCountApply.prototype.toString = function () {
            return this._addNameToString(this.aggregate + "(`" + this.attribute + "`)");
        };
        UniqueCountApply.prototype.toHash = function () {
            var hashStr = "UC:" + (this._datasetWithAttribute());
            if (this.filter)
                hashStr += "/" + this.filter.toHash();
            return hashStr;
        };
        return UniqueCountApply;
    })(FacetApply);
    Legacy.UniqueCountApply = UniqueCountApply;
    var QuantileApply = (function (_super) {
        __extends(QuantileApply, _super);
        function QuantileApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var quantile = parameters.quantile;
            if (typeof quantile !== "number") {
                throw new TypeError("quantile must be a number");
            }
            if (quantile < 0 || 1 < quantile) {
                throw new Error("quantile must be between 0 and 1 (is: " + quantile + ")");
            }
            this.quantile = quantile;
            this._ensureAggregate("quantile");
            this._verifyName();
            this._verifyAttribute();
        }
        QuantileApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new QuantileApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        QuantileApply.prototype.toString = function () {
            return this._addNameToString("quantile(" + this.attribute + ", " + this.quantile + ")");
        };
        QuantileApply.prototype.toHash = function () {
            var hashStr = "QT:" + this.attribute + ":" + this.quantile;
            if (this.filter) {
                hashStr += "/" + this.filter.toHash();
            }
            return hashStr;
        };
        QuantileApply.prototype.valueOf = function () {
            var apply = _super.prototype.valueOf.call(this);
            apply.quantile = this.quantile;
            return apply;
        };
        QuantileApply.prototype.toJS = function () {
            var apply = _super.prototype.toJS.call(this);
            apply.quantile = this.quantile;
            return apply;
        };
        QuantileApply.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.quantile === other.quantile;
        };
        QuantileApply.prototype.isAdditive = function () {
            return true;
        };
        return QuantileApply;
    })(FacetApply);
    Legacy.QuantileApply = QuantileApply;
    var AddApply = (function (_super) {
        __extends(AddApply, _super);
        function AddApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            this.arithmetic = parameters.arithmetic;
            this.operands = parameters.operands;
            this._verifyName();
            this._ensureArithmetic("add");
        }
        AddApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new AddApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        AddApply.prototype.toString = function (from) {
            if (from === void 0) { from = "add"; }
            var expr = (this.operands[0].toString(this.arithmetic)) + " + " + (this.operands[1].toString(this.arithmetic));
            if (from === "divide" || from === "multiply") {
                expr = "(" + expr + ")";
            }
            return this._addNameToString(expr);
        };
        AddApply.prototype.toHash = function () {
            return (this.operands[0].toHash()) + "+" + (this.operands[1].toHash());
        };
        AddApply.prototype.isAdditive = function () {
            return this.operands[0].isAdditive() && this.operands[1].isAdditive();
        };
        return AddApply;
    })(FacetApply);
    Legacy.AddApply = AddApply;
    var SubtractApply = (function (_super) {
        __extends(SubtractApply, _super);
        function SubtractApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            var name = parameters.name;
            this.arithmetic = parameters.arithmetic;
            this.operands = parameters.operands;
            if (name)
                this.name = name;
            this._verifyName();
            this._ensureArithmetic("subtract");
        }
        SubtractApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new SubtractApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        SubtractApply.prototype.toString = function (from) {
            if (from === void 0) { from = "add"; }
            var expr = (this.operands[0].toString(this.arithmetic)) + " - " + (this.operands[1].toString(this.arithmetic));
            if (from === "divide" || from === "multiply")
                expr = "(" + expr + ")";
            return this._addNameToString(expr);
        };
        SubtractApply.prototype.toHash = function () {
            return (this.operands[0].toHash()) + "-" + (this.operands[1].toHash());
        };
        SubtractApply.prototype.isAdditive = function () {
            return this.operands[0].isAdditive() && this.operands[1].isAdditive();
        };
        return SubtractApply;
    })(FacetApply);
    Legacy.SubtractApply = SubtractApply;
    var MultiplyApply = (function (_super) {
        __extends(MultiplyApply, _super);
        function MultiplyApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            this.arithmetic = parameters.arithmetic;
            this.operands = parameters.operands;
            this._verifyName();
            this._ensureArithmetic("multiply");
        }
        MultiplyApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new MultiplyApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        MultiplyApply.prototype.toString = function (from) {
            if (from === void 0) { from = "add"; }
            var expr = (this.operands[0].toString(this.arithmetic)) + " * " + (this.operands[1].toString(this.arithmetic));
            if (from === "divide") {
                expr = "(" + expr + ")";
            }
            return this._addNameToString(expr);
        };
        MultiplyApply.prototype.toHash = function () {
            return (this.operands[0].toHash()) + "*" + (this.operands[1].toHash());
        };
        MultiplyApply.prototype.isAdditive = function () {
            return (Legacy.isInstanceOf(this.operands[0], ConstantApply) && this.operands[1].isAdditive()) || (this.operands[0].isAdditive() && Legacy.isInstanceOf(this.operands[1], ConstantApply));
        };
        return MultiplyApply;
    })(FacetApply);
    Legacy.MultiplyApply = MultiplyApply;
    var DivideApply = (function (_super) {
        __extends(DivideApply, _super);
        function DivideApply(parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            _super.call(this, parameters, datasetContext, Legacy.dummyObject);
            this.arithmetic = parameters.arithmetic;
            this.operands = parameters.operands;
            this._verifyName();
            this._ensureArithmetic("divide");
        }
        DivideApply.fromJS = function (parameters, datasetContext) {
            if (datasetContext === void 0) { datasetContext = DEFAULT_DATASET; }
            return new DivideApply(convertToValue(parameters, datasetContext), datasetContext);
        };
        DivideApply.prototype.toString = function (from) {
            if (from === void 0) { from = "add"; }
            var expr = (this.operands[0].toString(this.arithmetic)) + " / " + (this.operands[1].toString(this.arithmetic));
            if (from === "divide")
                expr = "(" + expr + ")";
            return this._addNameToString(expr);
        };
        DivideApply.prototype.toHash = function () {
            return (this.operands[0].toHash()) + "/" + (this.operands[1].toHash());
        };
        DivideApply.prototype.isAdditive = function () {
            return this.operands[0].isAdditive() && Legacy.isInstanceOf(this.operands[1], ConstantApply);
        };
        return DivideApply;
    })(FacetApply);
    Legacy.DivideApply = DivideApply;
    FacetApply.aggregateClassMap = {
        "constant": ConstantApply,
        "count": CountApply,
        "sum": SumApply,
        "average": AverageApply,
        "min": MinApply,
        "max": MaxApply,
        "uniqueCount": UniqueCountApply,
        "quantile": QuantileApply
    };
    FacetApply.arithmeticClassMap = {
        "add": AddApply,
        "subtract": SubtractApply,
        "multiply": MultiplyApply,
        "divide": DivideApply
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var ApplySimplifier = (function () {
        function ApplySimplifier(parameters) {
            this.separateApplyGetters = [];
            this.postProcess = [];
            this.nameIndex = 0;
            this.postProcessorScheme = parameters.postProcessorScheme;
            if (!this.postProcessorScheme)
                throw new TypeError("Must have a postProcessorScheme");
            this.namePrefix = parameters.namePrefix || "_S";
            this.topLevelConstant = parameters.topLevelConstant || "process";
            this.breakToSimple = Boolean(parameters.breakToSimple);
            this.breakAverage = Boolean(parameters.breakAverage);
        }
        ApplySimplifier.prototype._getNextName = function (sourceApplyName) {
            this.nameIndex++;
            return this.namePrefix + this.nameIndex + "_" + sourceApplyName;
        };
        ApplySimplifier.prototype._addBasicApply = function (apply, sourceApplyName) {
            if (apply.aggregate === "constant") {
                return this.postProcessorScheme.constant(apply);
            }
            if (apply.aggregate === "average" && this.breakAverage) {
                return this._addArithmeticApply(apply.decomposeAverage(), sourceApplyName);
            }
            if (apply.name) {
                var myApplyGetter = {
                    apply: apply,
                    getter: this.postProcessorScheme.getter(apply),
                    sourceApplyNames: {}
                };
                this.separateApplyGetters.push(myApplyGetter);
            }
            else {
                apply = apply.addName(this._getNextName(sourceApplyName));
                myApplyGetter = Legacy.find(this.separateApplyGetters, function (ag) { return ag.apply.equals(apply); });
                if (!myApplyGetter) {
                    myApplyGetter = {
                        apply: apply,
                        getter: this.postProcessorScheme.getter(apply),
                        sourceApplyNames: {}
                    };
                    this.separateApplyGetters.push(myApplyGetter);
                }
            }
            myApplyGetter.sourceApplyNames[sourceApplyName] = 1;
            return myApplyGetter.getter;
        };
        ApplySimplifier.prototype._addArithmeticApply = function (apply, sourceApplyName) {
            var operands = apply.operands;
            var op1 = operands[0];
            var op2 = operands[1];
            var lhs = op1.arithmetic ? this._addArithmeticApply(op1, sourceApplyName) : this._addBasicApply(op1, sourceApplyName);
            var rhs = op2.arithmetic ? this._addArithmeticApply(op2, sourceApplyName) : this._addBasicApply(op2, sourceApplyName);
            return this.postProcessorScheme.arithmetic(apply.arithmetic, lhs, rhs);
        };
        ApplySimplifier.prototype._addSingleDatasetApply = function (apply, sourceApplyName) {
            if (apply.aggregate === "constant") {
                return this.postProcessorScheme.constant(apply);
            }
            if (this.breakToSimple) {
                if (apply.aggregate === "average" && this.breakAverage) {
                    apply = apply.decomposeAverage();
                }
                if (apply.arithmetic) {
                    return this._addArithmeticApply(apply, sourceApplyName);
                }
                else {
                    return this._addBasicApply(apply, sourceApplyName);
                }
            }
            else {
                return this._addBasicApply(apply, sourceApplyName);
            }
        };
        ApplySimplifier.prototype._addMultiDatasetApply = function (apply, sourceApplyName) {
            var operands = apply.operands;
            var op1 = operands[0];
            var op2 = operands[1];
            var op1Datasets = op1.getDatasets();
            var op2Datasets = op2.getDatasets();
            var lhs = op1Datasets.length <= 1 ? this._addSingleDatasetApply(op1, sourceApplyName) : this._addMultiDatasetApply(op1, sourceApplyName);
            var rhs = op2Datasets.length <= 1 ? this._addSingleDatasetApply(op2, sourceApplyName) : this._addMultiDatasetApply(op2, sourceApplyName);
            return this.postProcessorScheme.arithmetic(apply.arithmetic, lhs, rhs);
        };
        ApplySimplifier.prototype.addApplies = function (applies) {
            var _this = this;
            var multiDatasetApplies = [];
            applies.forEach(function (apply) {
                var applyName = apply.name;
                var getter;
                switch (apply.getDatasets().length) {
                    case 0:
                        getter = _this.postProcessorScheme.constant(apply);
                        switch (_this.topLevelConstant) {
                            case "process":
                                return _this.postProcess.push(_this.postProcessorScheme.finish(applyName, getter));
                            case "leave":
                                return _this.separateApplyGetters.push({
                                    apply: apply,
                                    getter: getter,
                                    sourceApplyName: applyName
                                });
                            case "ignore":
                                return null;
                            default:
                                throw new Error("unknown topLevelConstant");
                        }
                        break;
                    case 1:
                        getter = _this._addSingleDatasetApply(apply, applyName);
                        if (_this.breakToSimple && (apply.arithmetic || (apply.aggregate === "average" && _this.breakAverage))) {
                            return _this.postProcess.push(_this.postProcessorScheme.finish(applyName, getter));
                        }
                        break;
                    default:
                        multiDatasetApplies.push(apply);
                }
            });
            multiDatasetApplies.forEach(function (apply) {
                var applyName = apply.name;
                var getter = _this._addMultiDatasetApply(apply, applyName);
                return _this.postProcess.push(_this.postProcessorScheme.finish(applyName, getter));
            });
            return this;
        };
        ApplySimplifier.prototype.getSimpleApplies = function () {
            return this.separateApplyGetters.map(function (parameters) { return parameters.apply; });
        };
        ApplySimplifier.prototype.getSimpleAppliesByDataset = function () {
            var appliesByDataset = {};
            var separateApplyGetters = this.separateApplyGetters;
            for (var i = 0; i < separateApplyGetters.length; i++) {
                var apply = separateApplyGetters[i].apply;
                var dataset = apply.getDataset();
                appliesByDataset[dataset] || (appliesByDataset[dataset] = []);
                appliesByDataset[dataset].push(apply);
            }
            return appliesByDataset;
        };
        ApplySimplifier.prototype.getPostProcessors = function () {
            return this.postProcess;
        };
        ApplySimplifier.prototype.getApplyComponents = function (applyName) {
            return this.separateApplyGetters.filter(function (parameters) {
                var sourceApplyNames = parameters.sourceApplyNames;
                return sourceApplyNames[applyName];
            }).map(function (parameters) {
                return parameters.apply;
            });
        };
        ApplySimplifier.JS_POST_PROCESSOR_SCHEME = {
            constant: function (parameters) {
                var value = parameters.value;
                return function () { return value; };
            },
            getter: function (parameters) {
                var name = parameters.name;
                return function (prop) { return prop[name]; };
            },
            arithmetic: function (arithmetic, lhs, rhs) {
                switch (arithmetic) {
                    case "add":
                        return function (prop) { return lhs(prop) + rhs(prop); };
                    case "subtract":
                        return function (prop) { return lhs(prop) - rhs(prop); };
                    case "multiply":
                        return function (prop) { return lhs(prop) * rhs(prop); };
                    case "divide":
                        return function (prop) {
                            var rv = rhs(prop);
                            if (rv === 0) {
                                return 0;
                            }
                            else {
                                return lhs(prop) / rv;
                            }
                        };
                    default:
                        throw new Error("Unknown arithmetic '" + arithmetic + "'");
                }
            },
            finish: function (name, getter) { return function (prop) { return prop[name] = getter(prop); }; }
        };
        return ApplySimplifier;
    })();
    Legacy.ApplySimplifier = ApplySimplifier;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function isInteger(n) {
        return !isNaN(n) && n % 1 === 0;
    }
    function isPositiveInteger(n) {
        return isInteger(n) && 0 < n;
    }
    function repeatString(str, times) {
        if (times <= 0)
            return "";
        return new Array(times + 1).join(str);
    }
    var check;
    var AttributeMeta = (function () {
        function AttributeMeta(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.type = parameters.type;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new AttributeMeta` directly use AttributeMeta.fromJS instead");
            }
        }
        AttributeMeta.isAttributeMeta = function (candidate) {
            return Legacy.isInstanceOf(candidate, AttributeMeta);
        };
        AttributeMeta.fromJS = function (parameters) {
            if (parameters.type === "range" && !hasOwnProperty(parameters, 'rangeSize')) {
                parameters.rangeSize = parameters.size;
            }
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable attributeMeta");
            }
            if (!hasOwnProperty(parameters, "type")) {
                throw new Error("type must be defined");
            }
            if (typeof parameters.type !== "string") {
                throw new Error("type must be a string");
            }
            var Class = AttributeMeta.classMap[parameters.type];
            if (!Class) {
                throw new Error("unsupported attributeMeta type '" + parameters.type + "'");
            }
            return Class.fromJS(parameters);
        };
        AttributeMeta.prototype._ensureType = function (attributeMetaType) {
            if (!this.type) {
                this.type = attributeMetaType;
                return;
            }
            if (this.type !== attributeMetaType) {
                throw new TypeError("incorrect attributeMeta `type` '" + this.type + "' (needs to be: '" + attributeMetaType + "')");
            }
        };
        AttributeMeta.prototype.toString = function () {
            return 'Meta(' + this.type + ')';
        };
        AttributeMeta.prototype.valueOf = function () {
            return {
                type: this.type
            };
        };
        AttributeMeta.prototype.toJS = function () {
            return this.valueOf();
        };
        AttributeMeta.prototype.toJSON = function () {
            return this.valueOf();
        };
        AttributeMeta.prototype.equals = function (other) {
            return AttributeMeta.isAttributeMeta(other) && this.type === other.type;
        };
        AttributeMeta.prototype.serialize = function (value) {
            return value;
        };
        return AttributeMeta;
    })();
    Legacy.AttributeMeta = AttributeMeta;
    check = AttributeMeta;
    var DefaultAttributeMeta = (function (_super) {
        __extends(DefaultAttributeMeta, _super);
        function DefaultAttributeMeta(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("default");
        }
        DefaultAttributeMeta.fromJS = function (parameters) {
            return new DefaultAttributeMeta(parameters);
        };
        return DefaultAttributeMeta;
    })(AttributeMeta);
    Legacy.DefaultAttributeMeta = DefaultAttributeMeta;
    var LargeAttributeMeta = (function (_super) {
        __extends(LargeAttributeMeta, _super);
        function LargeAttributeMeta(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("large");
        }
        LargeAttributeMeta.fromJS = function (parameters) {
            return new LargeAttributeMeta(parameters);
        };
        return LargeAttributeMeta;
    })(AttributeMeta);
    Legacy.LargeAttributeMeta = LargeAttributeMeta;
    var RangeAttributeMeta = (function (_super) {
        __extends(RangeAttributeMeta, _super);
        function RangeAttributeMeta(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.separator = parameters.separator;
            this.rangeSize = parameters.rangeSize;
            this.digitsBeforeDecimal = parameters.digitsBeforeDecimal;
            this.digitsAfterDecimal = parameters.digitsAfterDecimal;
            this._ensureType("range");
            this.separator || (this.separator = ";");
            if (!(typeof this.separator === "string" && this.separator.length)) {
                throw new TypeError("`separator` must be a non-empty string");
            }
            if (typeof this.rangeSize !== "number") {
                throw new TypeError("`rangeSize` must be a number");
            }
            if (this.rangeSize > 1) {
                if (!isInteger(this.rangeSize)) {
                    throw new Error("`rangeSize` greater than 1 must be an integer");
                }
            }
            else {
                if (!isInteger(1 / this.rangeSize)) {
                    throw new Error("`rangeSize` less than 1 must divide 1");
                }
            }
            if (this.digitsBeforeDecimal != null) {
                if (!isPositiveInteger(this.digitsBeforeDecimal)) {
                    throw new Error("`digitsBeforeDecimal` must be a positive integer");
                }
            }
            else {
                this.digitsBeforeDecimal = null;
            }
            if (this.digitsAfterDecimal != null) {
                if (!isPositiveInteger(this.digitsAfterDecimal)) {
                    throw new Error("`digitsAfterDecimal` must be a positive integer");
                }
                var digitsInSize = (String(this.rangeSize).split(".")[1] || "").length;
                if (this.digitsAfterDecimal < digitsInSize) {
                    throw new Error("`digitsAfterDecimal` must be at least " + digitsInSize + " to accommodate for a `rangeSize` of " + this.rangeSize);
                }
            }
            else {
                this.digitsAfterDecimal = null;
            }
        }
        RangeAttributeMeta.fromJS = function (parameters) {
            return new RangeAttributeMeta(parameters);
        };
        RangeAttributeMeta.prototype.valueOf = function () {
            var attributeMetaSpec = _super.prototype.valueOf.call(this);
            if (this.separator !== ";") {
                attributeMetaSpec.separator = this.separator;
            }
            attributeMetaSpec.rangeSize = this.rangeSize;
            if (this.digitsBeforeDecimal !== null) {
                attributeMetaSpec.digitsBeforeDecimal = this.digitsBeforeDecimal;
            }
            if (this.digitsAfterDecimal !== null) {
                attributeMetaSpec.digitsAfterDecimal = this.digitsAfterDecimal;
            }
            return attributeMetaSpec;
        };
        RangeAttributeMeta.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.separator === other.separator && this.rangeSize === other.rangeSize && this.digitsBeforeDecimal === other.digitsBeforeDecimal && this.digitsAfterDecimal === other.digitsAfterDecimal;
        };
        RangeAttributeMeta.prototype._serializeNumber = function (value) {
            if (value === null)
                return "";
            var valueStr = String(value);
            if (this.digitsBeforeDecimal === null && this.digitsAfterDecimal === null) {
                return valueStr;
            }
            var valueStrSplit = valueStr.split(".");
            var before = valueStrSplit[0];
            var after = valueStrSplit[1];
            if (this.digitsBeforeDecimal) {
                before = repeatString("0", this.digitsBeforeDecimal - before.length) + before;
            }
            if (this.digitsAfterDecimal) {
                after || (after = "");
                after += repeatString("0", this.digitsAfterDecimal - after.length);
            }
            valueStr = before;
            if (after)
                valueStr += "." + after;
            return valueStr;
        };
        RangeAttributeMeta.prototype.serialize = function (range) {
            if (!(Array.isArray(range) && range.length === 2))
                return null;
            return this._serializeNumber(range[0]) + this.separator + this._serializeNumber(range[1]);
        };
        RangeAttributeMeta.prototype.getMatchingRegExpString = function () {
            var separatorRegExp = this.separator.replace(/[.$^{[(|)*+?\\]/g, function (c) { return "\\" + c; });
            var beforeRegExp = this.digitsBeforeDecimal ? "-?\\d{" + this.digitsBeforeDecimal + "}" : "(?:-?[1-9]\\d*|0)";
            var afterRegExp = this.digitsAfterDecimal ? "\\.\\d{" + this.digitsAfterDecimal + "}" : "(?:\\.\\d*[1-9])?";
            var numberRegExp = beforeRegExp + afterRegExp;
            return "/^(" + numberRegExp + ")" + separatorRegExp + "(" + numberRegExp + ")$/";
        };
        return RangeAttributeMeta;
    })(AttributeMeta);
    Legacy.RangeAttributeMeta = RangeAttributeMeta;
    var UniqueAttributeMeta = (function (_super) {
        __extends(UniqueAttributeMeta, _super);
        function UniqueAttributeMeta(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("unique");
        }
        UniqueAttributeMeta.fromJS = function (parameters) {
            return new UniqueAttributeMeta(parameters);
        };
        UniqueAttributeMeta.prototype.serialize = function (value) {
            throw new Error("can not serialize an approximate unique value");
        };
        return UniqueAttributeMeta;
    })(AttributeMeta);
    Legacy.UniqueAttributeMeta = UniqueAttributeMeta;
    var HistogramAttributeMeta = (function (_super) {
        __extends(HistogramAttributeMeta, _super);
        function HistogramAttributeMeta(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("histogram");
        }
        HistogramAttributeMeta.fromJS = function (parameters) {
            return new HistogramAttributeMeta(parameters);
        };
        HistogramAttributeMeta.prototype.serialize = function (value) {
            throw new Error("can not serialize a histogram value");
        };
        return HistogramAttributeMeta;
    })(AttributeMeta);
    Legacy.HistogramAttributeMeta = HistogramAttributeMeta;
    AttributeMeta.classMap = {
        "default": DefaultAttributeMeta,
        large: LargeAttributeMeta,
        range: RangeAttributeMeta,
        unique: UniqueAttributeMeta,
        histogram: HistogramAttributeMeta
    };
    AttributeMeta.DEFAULT = new DefaultAttributeMeta();
    AttributeMeta.UNIQUE = new UniqueAttributeMeta();
    AttributeMeta.HISTOGRAM = new HistogramAttributeMeta();
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var check;
    var FacetCombine = (function () {
        function FacetCombine(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.method = parameters.method;
            this.sort = parameters.sort;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new FacetCombine` directly use FacetCombine.fromJS instead");
            }
        }
        FacetCombine.isFacetCombine = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetCombine);
        };
        FacetCombine.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable combine");
            }
            if (parameters.method == null) {
                parameters.method = parameters['combine'];
            }
            if (!hasOwnProperty(parameters, "method")) {
                throw new Error("method not defined");
            }
            if (typeof parameters.method !== "string") {
                throw new Error("method must be a string");
            }
            var CombineConstructor = FacetCombine.classMap[parameters.method];
            if (!CombineConstructor) {
                throw new Error("unsupported method " + parameters.method);
            }
            return CombineConstructor.fromJS(parameters);
        };
        FacetCombine.prototype._ensureMethod = function (method) {
            if (!this.method) {
                this.method = method;
                return;
            }
            if (this.method !== method) {
                throw new TypeError("incorrect combine method '" + this.method + "' (needs to be: '" + method + "')");
            }
        };
        FacetCombine.prototype.toString = function () {
            return 'BaseCombine';
        };
        FacetCombine.prototype.valueOf = function () {
            return {
                method: this.method,
                sort: this.sort
            };
        };
        FacetCombine.prototype.toJS = function () {
            return {
                method: this.method,
                sort: this.sort.toJS()
            };
        };
        FacetCombine.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetCombine.prototype.equals = function (other) {
            return FacetCombine.isFacetCombine(other) && this.method === other.method && this.sort.equals(other.sort);
        };
        return FacetCombine;
    })();
    Legacy.FacetCombine = FacetCombine;
    check = FacetCombine;
    var SliceCombine = (function (_super) {
        __extends(SliceCombine, _super);
        function SliceCombine(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.sort = parameters.sort;
            var limit = parameters.limit;
            this._ensureMethod("slice");
            if (limit != null) {
                if (typeof limit !== 'number' || isNaN(limit)) {
                    throw new TypeError("limit must be a number");
                }
                this.limit = limit;
            }
        }
        SliceCombine.fromJS = function (parameters) {
            return new SliceCombine({
                sort: Legacy.FacetSort.fromJS(parameters.sort),
                limit: parameters.limit != null ? Number(parameters.limit) : null
            });
        };
        SliceCombine.prototype.toString = function () {
            return "SliceCombine";
        };
        SliceCombine.prototype.valueOf = function () {
            var combine = _super.prototype.valueOf.call(this);
            if (this.limit != null)
                combine.limit = this.limit;
            return combine;
        };
        SliceCombine.prototype.toJS = function () {
            var combine = _super.prototype.toJS.call(this);
            if (this.limit != null)
                combine.limit = this.limit;
            return combine;
        };
        SliceCombine.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.limit === other.limit;
        };
        return SliceCombine;
    })(FacetCombine);
    Legacy.SliceCombine = SliceCombine;
    var MatrixCombine = (function (_super) {
        __extends(MatrixCombine, _super);
        function MatrixCombine(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.sort = parameters.sort;
            this.limits = parameters.limits;
            this._ensureMethod("matrix");
            if (!Array.isArray(this.limits)) {
                throw new TypeError("limits must be an array");
            }
        }
        MatrixCombine.fromJS = function (parameters) {
            return new MatrixCombine({
                sort: Legacy.FacetSort.fromJS(parameters.sort),
                limits: parameters.limits.map(Number)
            });
        };
        MatrixCombine.prototype.toString = function () {
            return "MatrixCombine";
        };
        MatrixCombine.prototype.valueOf = function () {
            var combine = _super.prototype.valueOf.call(this);
            combine.limits = this.limits;
            return combine;
        };
        MatrixCombine.prototype.toJS = function () {
            var combine = _super.prototype.toJS.call(this);
            combine.limits = this.limits;
            return combine;
        };
        MatrixCombine.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.limits.join(";") === other.limits.join(";");
        };
        return MatrixCombine;
    })(FacetCombine);
    Legacy.MatrixCombine = MatrixCombine;
    FacetCombine.classMap = {
        "slice": SliceCombine,
        "matrix": MatrixCombine
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var CondensedCommand = (function () {
        function CondensedCommand() {
            this.knownProps = {};
            this.split = null;
            this.applies = [];
            this.combine = null;
        }
        CondensedCommand.prototype.setSplit = function (split) {
            if (this.split) {
                throw new Error("split already defined");
            }
            this.split = split;
            if (split.name) {
                this.knownProps[split.name] = split;
            }
        };
        CondensedCommand.prototype.addApply = function (apply) {
            this.applies.push(apply);
            return this.knownProps[apply.name] = apply;
        };
        CondensedCommand.prototype.setCombine = function (combine) {
            if (!this.split) {
                throw new Error("combine called without split");
            }
            if (this.combine) {
                throw new Error("can not combine more than once");
            }
            if (combine.sort && !this.knownProps[combine.sort.prop]) {
                throw new Error("sort on unknown prop '" + combine.sort.prop + "'");
            }
            this.combine = combine;
        };
        CondensedCommand.prototype.getDatasets = function () {
            if (this.split) {
                return this.split.getDatasets();
            }
            var datasets = [];
            var applies = this.applies;
            for (var i = 0; i < applies.length; i++) {
                var apply = applies[i];
                var applyDatasets = apply.getDatasets();
                for (var j = 0; j < applyDatasets.length; j++) {
                    var dataset = applyDatasets[j];
                    if (datasets.indexOf(dataset) >= 0)
                        continue;
                    datasets.push(dataset);
                }
            }
            return datasets;
        };
        CondensedCommand.prototype.getSplit = function () {
            return this.split;
        };
        CondensedCommand.prototype.getEffectiveSplit = function () {
            if (!this.split || this.split.bucket !== "parallel") {
                return this.split;
            }
            var split = this.split;
            var sortBy = this.getSortBy();
            if (Legacy.isInstanceOf(sortBy, Legacy.FacetSplit)) {
                return this.split;
            }
            var sortDatasets = sortBy.getDatasets();
            var effectiveSplits = split.splits.filter(function (split) {
                return sortDatasets.indexOf(split.getDataset()) >= 0;
            });
            switch (effectiveSplits.length) {
                case 0:
                    return split.splits[0];
                case 1:
                    return effectiveSplits[0].addName(split.name);
                default:
                    return new Legacy.ParallelSplit({
                        name: split.name,
                        splits: effectiveSplits,
                        segmentFilter: split.segmentFilter
                    });
            }
        };
        CondensedCommand.prototype.getApplies = function () {
            return this.applies;
        };
        CondensedCommand.prototype.getCombine = function () {
            if (this.combine) {
                return this.combine;
            }
            if (this.split) {
                return Legacy.SliceCombine.fromJS({
                    sort: {
                        compare: "natural",
                        prop: this.split.name,
                        direction: "ascending"
                    }
                });
            }
            else {
                return null;
            }
        };
        CondensedCommand.prototype.getSortBy = function () {
            return this.knownProps[this.getCombine().sort.prop];
        };
        CondensedCommand.prototype.getSortHash = function () {
            var combine = this.getCombine();
            var sort = combine.sort;
            return (this.knownProps[sort.prop].toHash()) + "#" + sort.direction;
        };
        CondensedCommand.prototype.getZeroProp = function () {
            var zeroProp = {};
            this.applies.forEach(function (apply) { return zeroProp[apply.name] = 0; });
            return zeroProp;
        };
        CondensedCommand.prototype.appendToSpec = function (spec) {
            if (this.split) {
                var splitJS = this.split.toJS();
                splitJS.operation = "split";
                spec.push(splitJS);
            }
            this.applies.forEach(function (apply) {
                var applyJS = apply.toJS();
                applyJS.operation = "apply";
                return spec.push(applyJS);
            });
            if (this.combine) {
                var combineJS = this.combine.toJS();
                combineJS.operation = "combine";
                spec.push(combineJS);
            }
        };
        return CondensedCommand;
    })();
    Legacy.CondensedCommand = CondensedCommand;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function smaller(a, b) {
        return a < b ? a : b;
    }
    function larger(a, b) {
        return a < b ? b : a;
    }
    function intersectRanges(range1, range2) {
        var s = larger(range1[0], range2[0]);
        var l = smaller(range1[1], range2[1]);
        return (s <= l) ? [s, l] : null;
    }
    function unionRanges(range1, range2) {
        if (!intersectRanges(range1, range2))
            return null;
        return [smaller(range1[0], range2[0]), larger(range1[1], range2[1])];
    }
    function intersectRangeSets(range1s, range2s) {
        var newRanges = [];
        for (var i = 0; i < range1s.length; i++) {
            var range1 = range1s[i];
            for (var j = 0; j < range2s.length; j++) {
                var range2 = range2s[j];
                var intersect = intersectRanges(range1, range2);
                if (intersect) {
                    newRanges.push(intersect);
                }
            }
        }
        return newRanges;
    }
    function union() {
        var arraySets = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            arraySets[_i - 0] = arguments[_i];
        }
        var ret = [];
        var seen = {};
        for (var i = 0; i < arraySets.length; i++) {
            var arraySet = arraySets[i];
            for (var j = 0; j < arraySet.length; j++) {
                var value = arraySet[j];
                if (seen[value])
                    continue;
                seen[value] = true;
                ret.push(value);
            }
        }
        return ret;
    }
    function intersection(set1, set2) {
        return set1.filter(function (value) { return set2.indexOf(value) !== -1; });
    }
    function getOredRanges(filter) {
        if (filter.type === 'within') {
            return [filter.range];
        }
        else if (filter.type === 'or') {
            var commonAttribute = null;
            var allWithins = filter.filters.every(function (f) {
                if (f.type !== 'within')
                    return false;
                commonAttribute = commonAttribute || f.attribute;
                return commonAttribute === f.attribute;
            });
            if (!allWithins)
                return null;
            return filter.filters.map(function (wf) { return wf.range; });
        }
        return null;
    }
    function compare(a, b) {
        if (a < b)
            return -1;
        if (a > b)
            return +1;
        return 0;
    }
    function arrayCompare(arr1, arr2) {
        var arr1Length = arr1.length;
        var arr2Length = arr2.length;
        var lengthDiff = arr1Length - arr2Length;
        if (lengthDiff !== 0 || arr1Length === 0) {
            return lengthDiff;
        }
        for (var i = 0; i < arr1Length; i++) {
            var x1 = arr1[i];
            var diff = compare(x1, arr2[i]);
            if (diff !== 0) {
                return diff;
            }
        }
        return 0;
    }
    var filterSortTypePrecedence = {
        "true": -2,
        "false": -1,
        "within": 0,
        "in": 0,
        "not in": 0,
        "contains": 0,
        "match": 0,
        "not": 1,
        "and": 2,
        "or": 3
    };
    var filterSortTypeSubPrecedence = {
        "within": 0,
        "in": 1,
        "not in": 2,
        "contains": 3,
        "match": 4
    };
    var defaultStringifier = {
        stringify: function (filter) {
            switch (filter.type) {
                case "true":
                    return "None";
                case "false":
                    return "Nothing";
                case "is":
                    var isValue = filter.value;
                    return filter.attribute + " is " + isValue;
                case "in":
                    var values = filter.values.map(String);
                    switch (values.length) {
                        case 0:
                            return "Nothing";
                        case 1:
                            return filter.attribute + " is " + values[0];
                        case 2:
                            return filter.attribute + " is either " + values[0] + " or " + values[1];
                        default:
                            return filter.attribute + " is one of: " + Legacy.specialJoin(values, ", ", ", or ");
                    }
                    break;
                case "contains":
                    var containsValue = filter.value;
                    return filter.attribute + " contains '" + containsValue + "'";
                case "match":
                    var expression = filter.expression;
                    return filter.attribute + " matches /" + expression + "/";
                case "within":
                    var range = filter.range;
                    var r0 = range[0];
                    var r1 = range[1];
                    if (r0.toISOString)
                        r0 = r0.toISOString();
                    if (r1.toISOString)
                        r1 = r1.toISOString();
                    return filter.attribute + " is within " + r0 + " and " + r1;
                case "not":
                    var notFilter = String(filter.filter);
                    return "not (" + notFilter + ")";
                case "and":
                    var andFilters = filter.filters.map(String);
                    return andFilters.length > 1 ? "(" + andFilters.join(") and (") + ")" : andFilters[0];
                case "or":
                    var orFilters = filter.filters.map(String);
                    return orFilters.length > 1 ? "(" + orFilters.join(") or (") + ")" : orFilters[0];
                default:
                    throw new Error("unknown filter type " + filter.type);
            }
        }
    };
    var check;
    var FacetFilter = (function () {
        function FacetFilter(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.type = parameters.type;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new FacetFilter` directly use FacetFilter.fromJS instead");
            }
        }
        FacetFilter.filterDiff = function (subFilter, superFilter) {
            subFilter = subFilter.simplify();
            superFilter = superFilter.simplify();
            var subFilters = subFilter.type === "true" ? [] : subFilter.type === "and" ? subFilter.filters : [subFilter];
            var superFilters = superFilter.type === "true" ? [] : superFilter.type === "and" ? superFilter.filters : [superFilter];
            function filterInSuperFilter(filter) {
                for (var i = 0; i < superFilters.length; i++) {
                    var sf = superFilters[i];
                    if (filter.equals(sf)) {
                        return true;
                    }
                }
                return false;
            }
            var diff = [];
            var numFoundInSubFilters = 0;
            subFilters.forEach(function (subFilterFilter) {
                if (filterInSuperFilter(subFilterFilter)) {
                    return numFoundInSubFilters++;
                }
                else {
                    return diff.push(subFilterFilter);
                }
            });
            if (numFoundInSubFilters === superFilters.length) {
                return diff;
            }
            else {
                return null;
            }
        };
        FacetFilter.filterSubset = function (subFilter, superFilter) {
            return Boolean(FacetFilter.filterDiff(subFilter, superFilter));
        };
        FacetFilter.andFiltersByDataset = function (filters1, filters2) {
            var resFilters = {};
            for (var dataset in filters1) {
                if (!hasOwnProperty(filters1, dataset))
                    continue;
                var filter1 = filters1[dataset];
                var filter2 = filters2[dataset];
                if (!filter2)
                    throw new Error("unmatched datasets");
                resFilters[dataset] = new AndFilter([filter1, filter2]).simplify();
            }
            return resFilters;
        };
        FacetFilter.compare = function (filter1, filter2) {
            var filter1SortType = filter1._getSortType();
            var filter2SortType = filter2._getSortType();
            var precedence1 = filterSortTypePrecedence[filter1SortType];
            var precedence2 = filterSortTypePrecedence[filter2SortType];
            var precedenceDiff = precedence1 - precedence2;
            if (precedenceDiff !== 0 || precedence1 > 0) {
                return precedenceDiff;
            }
            var attributeDiff = compare(filter1.attribute, filter2.attribute);
            if (attributeDiff !== 0) {
                return attributeDiff;
            }
            precedenceDiff = filterSortTypeSubPrecedence[filter1SortType] - filterSortTypeSubPrecedence[filter2SortType];
            if (precedenceDiff !== 0) {
                return precedenceDiff;
            }
            switch (filter1SortType) {
                case "within":
                    return arrayCompare(filter1.range, filter2.range);
                case "in":
                case "not in":
                    return arrayCompare(filter1._getInValues(), filter2._getInValues());
                case "contains":
                    return compare(filter1.value, filter2.value);
                case "match":
                    return compare(filter1.expression, filter2.expression);
            }
            return 0;
        };
        FacetFilter.isFacetFilter = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetFilter);
        };
        FacetFilter.parse = function (str) {
            return FacetFilter.fromJS(Legacy.filterParser.parse(str));
        };
        FacetFilter.fromJS = function (filterSpec) {
            if (typeof filterSpec !== "object") {
                throw new Error("unrecognizable filter");
            }
            if (!hasOwnProperty(filterSpec, "type")) {
                throw new Error("type must be defined");
            }
            if (typeof filterSpec.type !== "string") {
                throw new Error("type must be a string");
            }
            var FilterConstructor = FacetFilter.classMap[filterSpec.type];
            if (!FilterConstructor) {
                throw new Error("unsupported filter type '" + filterSpec.type + "'");
            }
            return FilterConstructor.fromJS(filterSpec);
        };
        FacetFilter.setStringifier = function (defaultStringifier) {
            this.defaultStringifier = defaultStringifier;
        };
        FacetFilter.prototype.setStringifier = function (stringifier) {
            this.stringifier = stringifier;
            return this;
        };
        FacetFilter.prototype._ensureType = function (filterType) {
            if (!this.type) {
                this.type = filterType;
                return;
            }
            if (this.type !== filterType) {
                throw new TypeError("incorrect filter type '" + this.type + "' (needs to be: '" + filterType + "')");
            }
        };
        FacetFilter.prototype._validateAttribute = function () {
            if (typeof this.attribute !== "string") {
                throw new TypeError("attribute must be a string");
            }
        };
        FacetFilter.prototype._getSortType = function () {
            return this.type;
        };
        FacetFilter.prototype._getInValues = function () {
            return [];
        };
        FacetFilter.prototype.valueOf = function () {
            return {
                type: this.type
            };
        };
        FacetFilter.prototype.toJS = function () {
            return {
                type: this.type
            };
        };
        FacetFilter.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetFilter.prototype.equals = function (other) {
            return FacetFilter.isFacetFilter(other) && this.type === other.type && this.attribute === other.attribute;
        };
        FacetFilter.prototype.getComplexity = function () {
            return 1;
        };
        FacetFilter.prototype.simplify = function () {
            return this;
        };
        FacetFilter.prototype.extractFilterByAttribute = function (attribute) {
            if (typeof attribute !== "string") {
                throw new TypeError("must have an attribute");
            }
            if (!this.attribute || this.attribute !== attribute) {
                return [this, FacetFilter.TRUE];
            }
            else {
                return [FacetFilter.TRUE, this];
            }
        };
        FacetFilter.prototype.toString = function () {
            var stringifier = this.stringifier || FacetFilter.defaultStringifier;
            return stringifier.stringify(this);
        };
        FacetFilter.prototype.toHash = function () {
            throw new Error("can not call FacetFilter.toHash directly");
        };
        FacetFilter.prototype.getFilterFn = function () {
            throw new Error("can not call FacetFilter.getFilterFn directly");
        };
        FacetFilter.defaultStringifier = defaultStringifier;
        return FacetFilter;
    })();
    Legacy.FacetFilter = FacetFilter;
    check = FacetFilter;
    var TrueFilter = (function (_super) {
        __extends(TrueFilter, _super);
        function TrueFilter(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("true");
        }
        TrueFilter.fromJS = function (parameters) {
            return new TrueFilter(parameters);
        };
        TrueFilter.prototype.getFilterFn = function () {
            return function () { return true; };
        };
        TrueFilter.prototype.toHash = function () {
            return "T";
        };
        return TrueFilter;
    })(FacetFilter);
    Legacy.TrueFilter = TrueFilter;
    var FalseFilter = (function (_super) {
        __extends(FalseFilter, _super);
        function FalseFilter(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("false");
        }
        FalseFilter.fromJS = function (parameters) {
            return new FalseFilter(parameters);
        };
        FalseFilter.prototype.getFilterFn = function () {
            return function () { return false; };
        };
        FalseFilter.prototype.toHash = function () {
            return "F";
        };
        return FalseFilter;
    })(FacetFilter);
    Legacy.FalseFilter = FalseFilter;
    var IsFilter = (function (_super) {
        __extends(IsFilter, _super);
        function IsFilter(parameters) {
            this.attribute = parameters.attribute;
            this.value = parameters.value;
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("is");
            this._validateAttribute();
        }
        IsFilter.fromJS = function (parameters) {
            return new IsFilter(parameters);
        };
        IsFilter.prototype._getSortType = function () {
            return "in";
        };
        IsFilter.prototype._getInValues = function () {
            return [this.value];
        };
        IsFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.attribute = this.attribute;
            filter.value = this.value;
            return filter;
        };
        IsFilter.prototype.toJS = function () {
            return this.valueOf();
        };
        IsFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.value === other.value;
        };
        IsFilter.prototype.getFilterFn = function () {
            var attribute = this.attribute;
            var value = this.value;
            return function (d) { return d[attribute] === value; };
        };
        IsFilter.prototype.toHash = function () {
            return "IS:" + this.attribute + ":" + this.value;
        };
        return IsFilter;
    })(FacetFilter);
    Legacy.IsFilter = IsFilter;
    var InFilter = (function (_super) {
        __extends(InFilter, _super);
        function InFilter(parameters) {
            this.attribute = parameters.attribute;
            this.values = parameters.values;
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("in");
            this._validateAttribute();
            if (!Array.isArray(this.values)) {
                throw new TypeError("`values` must be an array");
            }
        }
        InFilter.fromJS = function (parameters) {
            return new InFilter(parameters);
        };
        InFilter.prototype._getInValues = function () {
            return this.values;
        };
        InFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.attribute = this.attribute;
            filter.values = this.values;
            return filter;
        };
        InFilter.prototype.toJS = function () {
            var filter = _super.prototype.toJS.call(this);
            filter.attribute = this.attribute;
            filter.values = this.values;
            return filter;
        };
        InFilter.prototype.simplify = function () {
            if (this.simple)
                return this;
            var vs = union(this.values);
            switch (vs.length) {
                case 0:
                    return FacetFilter.FALSE;
                case 1:
                    return new IsFilter({
                        attribute: this.attribute,
                        value: vs[0]
                    });
                default:
                    vs.sort();
                    var simpleFilter = new InFilter({
                        attribute: this.attribute,
                        values: vs
                    });
                    simpleFilter.simple = true;
                    return simpleFilter;
            }
        };
        InFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.values.join(";") === other.values.join(";");
        };
        InFilter.prototype.getFilterFn = function () {
            var attribute = this.attribute;
            var values = this.values;
            return function (d) {
                return values.indexOf(d[attribute]) >= 0;
            };
        };
        InFilter.prototype.toHash = function () {
            return "IN:" + this.attribute + ":" + (this.values.join(";"));
        };
        return InFilter;
    })(FacetFilter);
    Legacy.InFilter = InFilter;
    var ContainsFilter = (function (_super) {
        __extends(ContainsFilter, _super);
        function ContainsFilter(parameters) {
            this.attribute = parameters.attribute;
            this.value = parameters.value;
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("contains");
            this._validateAttribute();
            if (typeof this.value !== "string")
                throw new TypeError("contains must be a string");
        }
        ContainsFilter.fromJS = function (parameters) {
            return new ContainsFilter(parameters);
        };
        ContainsFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.attribute = this.attribute;
            filter.value = this.value;
            return filter;
        };
        ContainsFilter.prototype.toJS = function () {
            var filter = _super.prototype.toJS.call(this);
            filter.attribute = this.attribute;
            filter.value = this.value;
            return filter;
        };
        ContainsFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.value === other.value;
        };
        ContainsFilter.prototype.getFilterFn = function () {
            var attribute = this.attribute;
            var value = this.value;
            return function (d) { return String(d[attribute]).indexOf(value) !== -1; };
        };
        ContainsFilter.prototype.toHash = function () {
            return "C:" + this.attribute + ":" + this.value;
        };
        return ContainsFilter;
    })(FacetFilter);
    Legacy.ContainsFilter = ContainsFilter;
    var MatchFilter = (function (_super) {
        __extends(MatchFilter, _super);
        function MatchFilter(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.attribute = parameters.attribute;
            this.expression = parameters.expression;
            this._ensureType("match");
            this._validateAttribute();
            if (!this.expression) {
                throw new Error("must have an expression");
            }
            try {
                new RegExp(this.expression);
            }
            catch (e) {
                throw new Error("expression must be a valid regular expression");
            }
        }
        MatchFilter.fromJS = function (parameters) {
            return new MatchFilter(parameters);
        };
        MatchFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.attribute = this.attribute;
            filter.expression = this.expression;
            return filter;
        };
        MatchFilter.prototype.toJS = function () {
            var filter = _super.prototype.toJS.call(this);
            filter.attribute = this.attribute;
            filter.expression = this.expression;
            return filter;
        };
        MatchFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.expression === other.expression;
        };
        MatchFilter.prototype.getFilterFn = function () {
            var attribute = this.attribute;
            var expression = new RegExp(this.expression);
            return function (d) { return expression.test(d[attribute]); };
        };
        MatchFilter.prototype.toHash = function () {
            return "F:" + this.attribute + ":" + this.expression;
        };
        return MatchFilter;
    })(FacetFilter);
    Legacy.MatchFilter = MatchFilter;
    var WithinFilter = (function (_super) {
        __extends(WithinFilter, _super);
        function WithinFilter(parameters) {
            this.attribute = parameters.attribute;
            this.range = parameters.range;
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("within");
            this._validateAttribute();
            if (!(Array.isArray(this.range) && this.range.length === 2)) {
                throw new TypeError("range must be an array of length 2");
            }
            if (isNaN(this.range[0]) || isNaN(this.range[1])) {
                throw new Error("invalid range");
            }
        }
        WithinFilter.fromJS = function (parameters) {
            var range = parameters.range;
            var r0 = range[0];
            var r1 = range[1];
            if (typeof r0 === "string" && typeof r1 === "string") {
                return new WithinFilter({
                    attribute: parameters.attribute,
                    range: [new Date(r0), new Date(r1)]
                });
            }
            else {
                return new WithinFilter(parameters);
            }
        };
        WithinFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.attribute = this.attribute;
            filter.range = this.range;
            return filter;
        };
        WithinFilter.prototype.toJS = function () {
            var filterJS = _super.prototype.toJS.call(this);
            filterJS.attribute = this.attribute;
            filterJS.range = this.range;
            return filterJS;
        };
        WithinFilter.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var otherRange = other.range;
            return this.range[0].valueOf() === otherRange[0].valueOf() && this.range[1].valueOf() === otherRange[1].valueOf();
        };
        WithinFilter.prototype.getFilterFn = function () {
            var attribute = this.attribute;
            var range = this.range;
            var r0 = range[0];
            var r1 = range[1];
            if (Legacy.isInstanceOf(r0, Date)) {
                return function (d) {
                    var v = new Date(d[attribute]);
                    return r0 <= v && v < r1;
                };
            }
            else {
                return function (d) {
                    var v = Number(d[attribute]);
                    return r0 <= v && v < r1;
                };
            }
        };
        WithinFilter.prototype.toHash = function () {
            return "W:" + this.attribute + ":" + (this.range[0].valueOf()) + ":" + (this.range[1].valueOf());
        };
        return WithinFilter;
    })(FacetFilter);
    Legacy.WithinFilter = WithinFilter;
    var NotFilter = (function (_super) {
        __extends(NotFilter, _super);
        function NotFilter(parameters) {
            if (!Legacy.isInstanceOf(parameters, FacetFilter)) {
                _super.call(this, parameters, Legacy.dummyObject);
                this.filter = parameters.filter;
            }
            else {
                this.filter = parameters;
            }
            this._ensureType("not");
        }
        NotFilter.fromJS = function (parameters) {
            return new NotFilter(FacetFilter.fromJS(parameters.filter));
        };
        NotFilter.prototype._getSortType = function () {
            var filterSortType = this.filter._getSortType();
            return filterSortType === "in" ? "not in" : "not";
        };
        NotFilter.prototype._getInValues = function () {
            return this.filter._getInValues();
        };
        NotFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.filter = this.filter;
            return filter;
        };
        NotFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filter = this.filter.toJS();
            return spec;
        };
        NotFilter.prototype.getComplexity = function () {
            return 1 + this.filter.getComplexity();
        };
        NotFilter.prototype.simplify = function () {
            if (this.simple)
                return this;
            switch (this.filter.type) {
                case "true":
                    return FacetFilter.FALSE;
                case "false":
                    return FacetFilter.TRUE;
                case "not":
                    return this.filter.filter.simplify();
                case "and":
                    return new OrFilter(this.filter.filters.map(function (filter) { return new NotFilter(filter); })).simplify();
                case "or":
                    return new AndFilter(this.filter.filters.map(function (filter) { return new NotFilter(filter); })).simplify();
                default:
                    var simpleFilter = new NotFilter(this.filter.simplify());
                    simpleFilter.simple = true;
                    return simpleFilter;
            }
        };
        NotFilter.prototype.extractFilterByAttribute = function (attribute) {
            if (typeof attribute !== "string") {
                throw new TypeError("must have an attribute");
            }
            if (!this.simple) {
                return this.simplify().extractFilterByAttribute(attribute);
            }
            if (!this.filter.attribute) {
                return null;
            }
            if (this.filter.attribute === attribute) {
                return [FacetFilter.TRUE, this];
            }
            else {
                return [this, FacetFilter.TRUE];
            }
        };
        NotFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.filter.equals(other.filter);
        };
        NotFilter.prototype.getFilterFn = function () {
            var filter = this.filter.getFilterFn();
            return function (d) { return !filter(d); };
        };
        NotFilter.prototype.toHash = function () {
            return "N(" + (this.filter.toHash()) + ")";
        };
        return NotFilter;
    })(FacetFilter);
    Legacy.NotFilter = NotFilter;
    var AndFilter = (function (_super) {
        __extends(AndFilter, _super);
        function AndFilter(parameters) {
            if (Array.isArray(parameters))
                parameters = { filters: parameters };
            _super.call(this, parameters, Legacy.dummyObject);
            if (!Array.isArray(parameters.filters))
                throw new TypeError("filters must be an array");
            this.filters = parameters.filters;
            this._ensureType("and");
        }
        AndFilter.fromJS = function (parameters) {
            return new AndFilter(parameters.filters.map(FacetFilter.fromJS));
        };
        AndFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.filters = this.filters;
            return filter;
        };
        AndFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filters = this.filters.map(function (filter) { return filter.toJS(); });
            return spec;
        };
        AndFilter.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var otherFilters = other.filters;
            return this.filters.length === otherFilters.length && this.filters.every(function (filter, i) { return filter.equals(otherFilters[i]); });
        };
        AndFilter.prototype.getComplexity = function () {
            var complexity = 1;
            this.filters.forEach(function (filter) { return complexity += filter.getComplexity(); });
            return complexity;
        };
        AndFilter.prototype._mergeFilters = function (filter1, filter2) {
            var filter1SortType = filter1._getSortType();
            var filter2SortType = filter2._getSortType();
            if (filter1SortType === "false" || filter2SortType === "false")
                return FacetFilter.FALSE;
            if (filter1SortType === "true")
                return filter2;
            if (filter2SortType === "true")
                return filter1;
            if (filter1.equals(filter2))
                return filter1;
            var oredRanges1 = getOredRanges(filter1);
            var oredRanges2 = getOredRanges(filter2);
            if (oredRanges1 && oredRanges2) {
                var ranges = intersectRangeSets(oredRanges1, oredRanges2);
                var sampleWithin = (filter1.type === 'or' ? filter1.filters[0] : filter1);
                var attribute = sampleWithin ? sampleWithin.attribute : null;
                switch (ranges.length) {
                    case 0:
                        return FacetFilter.FALSE;
                    case 1:
                        return new WithinFilter({ attribute: attribute, range: ranges[0] });
                    default:
                        return new OrFilter(ranges.map(function (range) { return new WithinFilter({ attribute: attribute, range: range }); }));
                }
            }
            if (filter1SortType !== filter2SortType)
                return;
            if (!((filter1.attribute != null) && (filter1.attribute === filter2.attribute)))
                return;
            var attribute = filter1.attribute;
            switch (filter1SortType) {
                case "within":
                    var filter1Range = filter1.range;
                    var filter2Range = filter2.range;
                    var intersectRange = intersectRanges(filter1Range, filter2Range);
                    if (!intersectRange)
                        return FacetFilter.FALSE;
                    return new WithinFilter({ attribute: attribute, range: intersectRange });
                    break;
                case "in":
                    return new InFilter({
                        attribute: attribute,
                        values: intersection(filter1._getInValues(), filter2._getInValues())
                    }).simplify();
                case "not in":
                    return new NotFilter(new InFilter({
                        attribute: attribute,
                        values: intersection(filter1._getInValues(), filter2._getInValues())
                    })).simplify();
            }
        };
        AndFilter.prototype.simplify = function () {
            if (this.simple) {
                return this;
            }
            var newFilters = [];
            this.filters.forEach(function (filter) {
                filter = filter.simplify();
                if (filter.type === "and") {
                    return Array.prototype.push.apply(newFilters, filter.filters);
                }
                else {
                    return newFilters.push(filter);
                }
            });
            newFilters.sort(FacetFilter.compare);
            if (newFilters.length > 1) {
                var mergedFilters = [];
                var acc = newFilters[0];
                var i = 1;
                while (i < newFilters.length) {
                    var currentFilter = newFilters[i];
                    var merged = this._mergeFilters(acc, currentFilter);
                    if (merged) {
                        acc = merged;
                    }
                    else {
                        mergedFilters.push(acc);
                        acc = currentFilter;
                    }
                    i++;
                }
                if (acc.type === "false")
                    return FacetFilter.FALSE;
                if (acc.type !== "true")
                    mergedFilters.push(acc);
                newFilters = mergedFilters;
            }
            switch (newFilters.length) {
                case 0:
                    return FacetFilter.TRUE;
                case 1:
                    return newFilters[0];
                default:
                    var simpleFilter = new AndFilter(newFilters);
                    simpleFilter.simple = true;
                    return simpleFilter;
            }
        };
        AndFilter.prototype.extractFilterByAttribute = function (attribute) {
            if (typeof attribute !== "string") {
                throw new TypeError("must have an attribute");
            }
            if (!this.simple) {
                return this.simplify().extractFilterByAttribute(attribute);
            }
            var remainingFilters = [];
            var extractedFilters = [];
            var filters = this.filters;
            for (var i = 0; i < filters.length; i++) {
                var filter = filters[i];
                var extract = filter.extractFilterByAttribute(attribute);
                if (extract === null)
                    return null;
                remainingFilters.push(extract[0]);
                extractedFilters.push(extract[1]);
            }
            return [new AndFilter(remainingFilters).simplify(), new AndFilter(extractedFilters).simplify()];
        };
        AndFilter.prototype.getFilterFn = function () {
            var filters = this.filters.map(function (f) { return f.getFilterFn(); });
            return function (d) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (!filter(d))
                        return false;
                }
                return true;
            };
        };
        AndFilter.prototype.toHash = function () {
            return "(" + (this.filters.map(function (filter) { return filter.toHash(); }).join(")^(")) + ")";
        };
        return AndFilter;
    })(FacetFilter);
    Legacy.AndFilter = AndFilter;
    var OrFilter = (function (_super) {
        __extends(OrFilter, _super);
        function OrFilter(parameters) {
            if (Array.isArray(parameters))
                parameters = { filters: parameters };
            _super.call(this, parameters, Legacy.dummyObject);
            if (!Array.isArray(parameters.filters))
                throw new TypeError("filters must be an array");
            this.filters = parameters.filters;
            this._ensureType("or");
        }
        OrFilter.fromJS = function (parameters) {
            return new OrFilter(parameters.filters.map(FacetFilter.fromJS));
        };
        OrFilter.prototype.valueOf = function () {
            var filter = _super.prototype.valueOf.call(this);
            filter.filters = this.filters;
            return filter;
        };
        OrFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filters = this.filters.map(function (filter) { return filter.toJS(); });
            return spec;
        };
        OrFilter.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var otherFilters = other.filters;
            return this.filters.length === otherFilters.length && this.filters.every(function (filter, i) { return filter.equals(otherFilters[i]); });
        };
        OrFilter.prototype.getComplexity = function () {
            var complexity = 1;
            this.filters.forEach(function (filter) {
                complexity += filter.getComplexity();
            });
            return complexity;
        };
        OrFilter.prototype._mergeFilters = function (filter1, filter2) {
            var filter1SortType = filter1._getSortType();
            var filter2SortType = filter2._getSortType();
            if (filter1SortType === "true" || filter2SortType === "true")
                return FacetFilter.TRUE;
            if (filter1SortType === "false")
                return filter2;
            if (filter2SortType === "false")
                return filter1;
            if (!((filter1.attribute != null) && (filter1.attribute === filter2.attribute))) {
                return null;
            }
            var attribute = filter1.attribute;
            if (filter1.equals(filter2)) {
                return filter1;
            }
            if (filter1SortType !== filter2SortType) {
                return null;
            }
            switch (filter1SortType) {
                case "within":
                    var filter1Range = filter1.range;
                    var filter2Range = filter2.range;
                    var unionRange = unionRanges(filter1Range, filter2Range);
                    if (!unionRange)
                        return;
                    return new WithinFilter({ attribute: filter1.attribute, range: unionRange });
                case "in":
                    return new InFilter({
                        attribute: attribute,
                        values: union(filter1._getInValues(), filter2._getInValues())
                    }).simplify();
                case "not in":
                    return new NotFilter(new InFilter({
                        attribute: attribute,
                        values: union(filter1._getInValues(), filter2._getInValues())
                    })).simplify();
            }
        };
        OrFilter.prototype.simplify = function () {
            if (this.simple)
                return this;
            var newFilters = [];
            this.filters.forEach(function (filter) {
                filter = filter.simplify();
                if (filter.type === "or") {
                    return Array.prototype.push.apply(newFilters, filter.filters);
                }
                else {
                    return newFilters.push(filter);
                }
            });
            newFilters.sort(FacetFilter.compare);
            if (newFilters.length > 1) {
                var mergedFilters = [];
                var acc = newFilters[0];
                var i = 1;
                while (i < newFilters.length) {
                    var currentFilter = newFilters[i];
                    var merged = this._mergeFilters(acc, currentFilter);
                    if (merged) {
                        acc = merged;
                    }
                    else {
                        mergedFilters.push(acc);
                        acc = currentFilter;
                    }
                    i++;
                }
                if (acc.type === "true")
                    return FacetFilter.TRUE;
                if (acc.type !== "false")
                    mergedFilters.push(acc);
                newFilters = mergedFilters;
            }
            switch (newFilters.length) {
                case 0:
                    return FacetFilter.FALSE;
                case 1:
                    return newFilters[0];
                default:
                    var simpleFilter = new OrFilter(newFilters);
                    simpleFilter.simple = true;
                    return simpleFilter;
            }
        };
        OrFilter.prototype.extractFilterByAttribute = function (attribute) {
            if (typeof attribute !== "string")
                throw new TypeError("must have an attribute");
            if (!this.simple)
                return this.simplify().extractFilterByAttribute(attribute);
            var hasRemaining = false;
            var hasExtracted = false;
            var filters = this.filters;
            for (var i = 0; i < filters.length; i++) {
                var filter = filters[i];
                var extracts = filter.extractFilterByAttribute(attribute);
                if (!extracts) {
                    return null;
                }
                hasRemaining || (hasRemaining = extracts[0].type !== "true");
                hasExtracted || (hasExtracted = extracts[1].type !== "true");
            }
            if (hasRemaining) {
                if (hasExtracted) {
                    return null;
                }
                else {
                    return [this, FacetFilter.TRUE];
                }
            }
            else {
                if (!hasExtracted) {
                    throw new Error("something went wrong");
                }
                return [FacetFilter.TRUE, this];
            }
        };
        OrFilter.prototype.getFilterFn = function () {
            var filters = this.filters.map(function (f) { return f.getFilterFn(); });
            return function (d) {
                for (var i = 0, len = filters.length; i < len; i++) {
                    var filter = filters[i];
                    if (filter(d)) {
                        return true;
                    }
                }
                return false;
            };
        };
        OrFilter.prototype.toHash = function () {
            return "(" + (this.filters.map(function (filter) { return filter.toHash(); }).join(")v(")) + ")";
        };
        return OrFilter;
    })(FacetFilter);
    Legacy.OrFilter = OrFilter;
    FacetFilter.TRUE = new TrueFilter();
    FacetFilter.FALSE = new FalseFilter();
    FacetFilter.classMap = {
        "true": TrueFilter,
        "false": FalseFilter,
        "is": IsFilter,
        "in": InFilter,
        "contains": ContainsFilter,
        "match": MatchFilter,
        "within": WithinFilter,
        "not": NotFilter,
        "or": OrFilter,
        "and": AndFilter
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var check;
    var FacetDataset = (function () {
        function FacetDataset(parameters) {
            this.name = parameters.name;
            this.source = parameters.source;
            if (typeof this.name !== "string") {
                throw new TypeError("dataset name must be a string");
            }
            if (typeof this.source !== "string") {
                throw new TypeError("dataset source must be a string");
            }
            if (!Legacy.FacetFilter.isFacetFilter(parameters.filter)) {
                throw new TypeError("filter must be a FacetFilter");
            }
            this.filter = parameters.filter;
        }
        FacetDataset.isFacetDataset = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetDataset);
        };
        FacetDataset.fromJS = function (parameters) {
            return new FacetDataset({
                name: parameters.name,
                source: parameters.source,
                filter: parameters.filter ? Legacy.FacetFilter.fromJS(parameters.filter) : Legacy.FacetFilter.TRUE
            });
        };
        FacetDataset.prototype.toString = function () {
            return "Dataset:" + this.name;
        };
        FacetDataset.prototype.getFilter = function () {
            return this.filter;
        };
        FacetDataset.prototype.and = function (filter) {
            var value = this.valueOf();
            value.filter = new Legacy.AndFilter([value.filter, filter]).simplify();
            return new FacetDataset(value);
        };
        FacetDataset.prototype.valueOf = function () {
            var spec = {
                name: this.name,
                source: this.source,
                filter: this.filter
            };
            return spec;
        };
        FacetDataset.prototype.toJS = function () {
            var spec = {
                source: this.source
            };
            if (this.name) {
                spec.name = this.name;
            }
            if (this.filter.type !== 'true') {
                spec.filter = this.filter.toJS();
            }
            return spec;
        };
        FacetDataset.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetDataset.prototype.equals = function (other) {
            return FacetDataset.isFacetDataset(other) && this.source === other.source && this.getFilter().equals(other.getFilter());
        };
        return FacetDataset;
    })();
    Legacy.FacetDataset = FacetDataset;
    check = FacetDataset;
    FacetDataset.BASE = new FacetDataset({
        name: "main",
        source: "base",
        filter: Legacy.FacetFilter.TRUE
    });
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var check;
    var FacetOptions = (function () {
        function FacetOptions(options) {
            for (var k in options) {
                if (!hasOwnProperty(options, k))
                    continue;
                var v = options[k];
                var typeofV = typeof (v);
                if (typeofV !== "string" && typeofV !== "number") {
                    throw new TypeError("bad option value type (key: " + k + ")");
                }
                this[k] = v;
            }
        }
        FacetOptions.isFacetOptions = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetOptions);
        };
        FacetOptions.fromJS = function (options) {
            return new FacetOptions(options);
        };
        FacetOptions.prototype.toString = function () {
            var parts = [];
            for (var k in this) {
                if (!hasOwnProperty(this, k))
                    continue;
                parts.push(k + ":" + this[k]);
            }
            return "[" + (parts.sort().join("; ")) + "]";
        };
        FacetOptions.prototype.valueOf = function () {
            var value = {};
            for (var k in this) {
                if (!hasOwnProperty(this, k))
                    continue;
                value[k] = this[k];
            }
            return value;
        };
        FacetOptions.prototype.toJS = function () {
            return this.valueOf();
        };
        FacetOptions.prototype.toJSON = function () {
            return this.valueOf();
        };
        FacetOptions.prototype.equals = function (other) {
            return FacetOptions.isFacetOptions(other) && this.toString() === other.toString();
        };
        return FacetOptions;
    })();
    Legacy.FacetOptions = FacetOptions;
    check = FacetOptions;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var FacetQuery = (function () {
        function FacetQuery(commands) {
            if (!Array.isArray(commands)) {
                throw new TypeError("query spec must be an array");
            }
            var numCommands = commands.length;
            this.datasets = [];
            var i = 0;
            while (i < numCommands) {
                var command = commands[i];
                if (command.operation !== "dataset") {
                    break;
                }
                this.datasets.push(Legacy.FacetDataset.fromJS(command));
                i++;
            }
            if (this.datasets.length === 0) {
                this.datasets.push(Legacy.FacetDataset.BASE);
            }
            this.filter = null;
            if (i < numCommands && commands[i].operation === "filter") {
                this.filter = Legacy.FacetFilter.fromJS(command);
                i++;
            }
            var hasDataset = {};
            this.datasets.forEach(function (dataset) { return hasDataset[dataset.name] = true; });
            this.condensedCommands = [new Legacy.CondensedCommand()];
            while (i < numCommands) {
                command = commands[i];
                var curGroup = this.condensedCommands[this.condensedCommands.length - 1];
                switch (command.operation) {
                    case "dataset":
                    case "filter":
                        throw new Error(command.operation + " not allowed here");
                        break;
                    case "split":
                        var split = Legacy.FacetSplit.fromJS(command);
                        split.getDatasets().forEach(function (dataset) {
                            if (!hasDataset[dataset]) {
                                throw new Error("split dataset '" + dataset + "' is not defined");
                            }
                        });
                        curGroup = new Legacy.CondensedCommand();
                        curGroup.setSplit(split);
                        this.condensedCommands.push(curGroup);
                        break;
                    case "apply":
                        var apply = Legacy.FacetApply.fromJS(command);
                        if (!apply.name) {
                            throw new Error("base apply must have a name");
                        }
                        var datasets = apply.getDatasets();
                        datasets.forEach(function (dataset) {
                            if (!hasDataset[dataset]) {
                                throw new Error("apply dataset '" + dataset + "' is not defined");
                            }
                        });
                        curGroup.addApply(apply);
                        break;
                    case "combine":
                        curGroup.setCombine(Legacy.FacetCombine.fromJS(command));
                        break;
                    default:
                        if (typeof command !== "object") {
                            throw new Error("unrecognizable command");
                        }
                        if (!hasOwnProperty(command, "operation")) {
                            throw new Error("operation not defined");
                        }
                        if (typeof command.operation !== "string") {
                            throw new Error("invalid operation");
                        }
                        throw new Error("unknown operation '" + command.operation + "'");
                }
                i++;
            }
        }
        FacetQuery.isFacetQuery = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetQuery);
        };
        FacetQuery.fromJS = function (commands) {
            return new FacetQuery(commands);
        };
        FacetQuery.prototype.toString = function () {
            return "FacetQuery";
        };
        FacetQuery.prototype.valueOf = function () {
            var spec = [];
            if (!(this.datasets.length === 1 && this.datasets[0] === Legacy.FacetDataset.BASE)) {
                this.datasets.forEach(function (dataset) {
                    var datasetSpec = dataset.toJS();
                    datasetSpec.operation = "dataset";
                    return spec.push(datasetSpec);
                });
            }
            if (this.filter) {
                var filterSpec = this.filter.toJS();
                filterSpec.operation = "filter";
                spec.push(filterSpec);
            }
            this.condensedCommands.forEach(function (condensedCommand) { return condensedCommand.appendToSpec(spec); });
            return spec;
        };
        FacetQuery.prototype.toJS = function () {
            return this.valueOf();
        };
        FacetQuery.prototype.toJSON = function () {
            return this.valueOf();
        };
        FacetQuery.prototype.getDatasets = function () {
            return this.datasets;
        };
        FacetQuery.prototype.getDatasetFilter = function (datasetName) {
            var datasets = this.datasets;
            for (var i = 0; i < datasets.length; i++) {
                var dataset = datasets[i];
                if (dataset.name === datasetName) {
                    return dataset.getFilter();
                }
            }
            return null;
        };
        FacetQuery.prototype.getFilter = function () {
            return this.filter || Legacy.FacetFilter.TRUE;
        };
        FacetQuery.prototype.getFiltersByDataset = function (extraFilter) {
            if (extraFilter === void 0) { extraFilter = null; }
            extraFilter || (extraFilter = Legacy.FacetFilter.TRUE);
            if (!Legacy.FacetFilter.isFacetFilter(extraFilter)) {
                throw new TypeError("extra filter should be a FacetFilter");
            }
            var commonFilter = new Legacy.AndFilter([this.getFilter(), extraFilter]).simplify();
            var filtersByDataset = {};
            this.datasets.forEach(function (dataset) { return filtersByDataset[dataset.name] = new Legacy.AndFilter([commonFilter, dataset.getFilter()]).simplify(); });
            return filtersByDataset;
        };
        FacetQuery.prototype.getFilterComplexity = function () {
            var complexity = this.getFilter().getComplexity();
            this.datasets.forEach(function (dataset) { return complexity += dataset.getFilter().getComplexity(); });
            return complexity;
        };
        FacetQuery.prototype.getCondensedCommands = function () {
            return this.condensedCommands;
        };
        FacetQuery.prototype.getSplits = function () {
            var splits = this.condensedCommands.map(function (parameters) { return parameters.split; });
            splits.shift();
            return splits;
        };
        FacetQuery.prototype.getApplies = function () {
            var applies = [];
            var condensedCommands = this.condensedCommands;
            for (var i = 0; i < condensedCommands.length; i++) {
                var condensedCommand = condensedCommands[i];
                var commandApplies = condensedCommand.applies;
                for (var j = 0; j < commandApplies.length; j++) {
                    var apply = commandApplies[j];
                    var alreadyListed = Legacy.find(applies, function (existingApply) { return existingApply.name === apply.name && existingApply.equals(apply); });
                    if (alreadyListed) {
                        continue;
                    }
                    applies.push(apply);
                }
            }
            return applies;
        };
        FacetQuery.prototype.getCombines = function () {
            var combines = this.condensedCommands.map(function (parameters) { return parameters.combine; });
            combines.shift();
            return combines;
        };
        return FacetQuery;
    })();
    Legacy.FacetQuery = FacetQuery;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function parseValue(value) {
        if (!Array.isArray(value)) {
            return value;
        }
        if (value.length !== 2) {
            throw new Error("bad range has length of " + value.length);
        }
        var start = value[0];
        var end = value[1];
        if (typeof start === "string") {
            start = new Date(start);
        }
        if (typeof end === "string") {
            end = new Date(end);
        }
        return [start, end];
    }
    var check;
    var FacetSegmentFilter = (function () {
        function FacetSegmentFilter(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.type = parameters.type;
            this.prop = parameters.prop;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new FacetSegmentFilter` directly use FacetSegmentFilter.fromJS instead");
            }
        }
        FacetSegmentFilter.isFacetSegmentFilter = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetSegmentFilter);
        };
        FacetSegmentFilter.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable segment filter");
            }
            if (!hasOwnProperty(parameters, "type")) {
                throw new Error("type must be defined");
            }
            if (typeof parameters.type !== "string") {
                throw new Error("type must be a string");
            }
            var SegmentFilterConstructor = FacetSegmentFilter.classMap[parameters.type];
            if (!SegmentFilterConstructor) {
                throw new Error("unsupported segment filter type '" + parameters.type + "'");
            }
            return SegmentFilterConstructor.fromJS(parameters);
        };
        FacetSegmentFilter.prototype._ensureType = function (filterType) {
            if (!this.type) {
                this.type = filterType;
                return;
            }
            if (this.type !== filterType) {
                throw new TypeError("incorrect segment filter type '" + this.type + "' (needs to be: '" + filterType + "')");
            }
        };
        FacetSegmentFilter.prototype._validateProp = function () {
            if (typeof this.prop !== "string") {
                throw new TypeError("prop must be a string");
            }
        };
        FacetSegmentFilter.prototype.valueOf = function () {
            return {
                type: this.type
            };
        };
        FacetSegmentFilter.prototype.toJS = function () {
            return {
                type: this.type
            };
        };
        FacetSegmentFilter.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetSegmentFilter.prototype.equals = function (other) {
            return FacetSegmentFilter.isFacetSegmentFilter(other) && this.type === other.type && this.prop === other.prop;
        };
        FacetSegmentFilter.prototype.getFilterFn = function () {
            throw new Error("this must never be called directly");
        };
        return FacetSegmentFilter;
    })();
    Legacy.FacetSegmentFilter = FacetSegmentFilter;
    check = FacetSegmentFilter;
    var TrueSegmentFilter = (function (_super) {
        __extends(TrueSegmentFilter, _super);
        function TrueSegmentFilter(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureType("true");
        }
        TrueSegmentFilter.fromJS = function (parameters) {
            return new TrueSegmentFilter(parameters);
        };
        TrueSegmentFilter.prototype.toString = function () {
            return "Every segment";
        };
        TrueSegmentFilter.prototype.getFilterFn = function () {
            return function () { return true; };
        };
        return TrueSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.TrueSegmentFilter = TrueSegmentFilter;
    var FalseSegmentFilter = (function (_super) {
        __extends(FalseSegmentFilter, _super);
        function FalseSegmentFilter(parameters) {
            if (parameters === void 0) { parameters = {}; }
            _super.call(this, parameters, Legacy.dummyObject);
            this.type = parameters.type;
            this._ensureType("false");
        }
        FalseSegmentFilter.fromJS = function (parameters) {
            return new FalseSegmentFilter(parameters);
        };
        FalseSegmentFilter.prototype.toString = function () {
            return "No segment";
        };
        FalseSegmentFilter.prototype.getFilterFn = function () {
            return function () { return false; };
        };
        return FalseSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.FalseSegmentFilter = FalseSegmentFilter;
    var IsSegmentFilter = (function (_super) {
        __extends(IsSegmentFilter, _super);
        function IsSegmentFilter(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.prop = parameters.prop;
            var value = parameters.value;
            this._ensureType("is");
            this._validateProp();
            this.value = parseValue(value);
        }
        IsSegmentFilter.fromJS = function (parameters) {
            return new IsSegmentFilter(parameters);
        };
        IsSegmentFilter.prototype.toString = function () {
            return "seg#" + this.prop + " is " + this.value;
        };
        IsSegmentFilter.prototype.valueOf = function () {
            var spec = _super.prototype.valueOf.call(this);
            spec.prop = this.prop;
            spec.value = this.value;
            return spec;
        };
        IsSegmentFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.prop = this.prop;
            spec.value = this.value;
            return spec;
        };
        IsSegmentFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.value === other.value;
        };
        IsSegmentFilter.prototype.getFilterFn = function () {
            var myProp = this.prop;
            var myValue = this.value;
            if (Array.isArray(this.value)) {
                var start = myValue[0];
                var end = myValue[1];
                return function (segment) {
                    var propValue = segment.getProp(myProp);
                    if ((propValue != null ? propValue.length : void 0) !== 2) {
                        return false;
                    }
                    var segStart = propValue[0];
                    var segEnd = propValue[1];
                    return segStart.valueOf() === start.valueOf() && segEnd.valueOf() === end.valueOf();
                };
            }
            else {
                return function (segment) { return segment.getProp(myProp) === myValue; };
            }
        };
        return IsSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.IsSegmentFilter = IsSegmentFilter;
    var InSegmentFilter = (function (_super) {
        __extends(InSegmentFilter, _super);
        function InSegmentFilter(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.prop = parameters.prop;
            var values = parameters.values;
            this._ensureType("in");
            this._validateProp();
            if (!Array.isArray(values))
                throw new TypeError("values must be an array");
            this.values = values.map(parseValue);
        }
        InSegmentFilter.fromJS = function (parameters) {
            return new InSegmentFilter(parameters);
        };
        InSegmentFilter.prototype.toString = function () {
            switch (this.values.length) {
                case 0:
                    return "No segment";
                case 1:
                    return "seg#" + this.prop + " is " + this.values[0];
                case 2:
                    return "seg#" + this.prop + " is either " + this.values[0] + " or " + this.values[1];
                default:
                    return "seg#" + this.prop + " is one of: " + (Legacy.specialJoin(this.values, ", ", ", or "));
            }
        };
        InSegmentFilter.prototype.valueOf = function () {
            var spec = _super.prototype.valueOf.call(this);
            spec.prop = this.prop;
            spec.values = this.values;
            return spec;
        };
        InSegmentFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.prop = this.prop;
            spec.values = this.values;
            return spec;
        };
        InSegmentFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.values.join(";") === other.values.join(";");
        };
        InSegmentFilter.prototype.getFilterFn = function () {
            var myProp = this.prop;
            var myValues = this.values;
            return function (segment) {
                return myValues.indexOf(segment.getProp(myProp)) !== -1;
            };
        };
        return InSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.InSegmentFilter = InSegmentFilter;
    var NotSegmentFilter = (function (_super) {
        __extends(NotSegmentFilter, _super);
        function NotSegmentFilter(parameters) {
            if (Legacy.isInstanceOf(parameters, FacetSegmentFilter))
                parameters = { filter: parameters };
            _super.call(this, parameters, Legacy.dummyObject);
            this.filter = parameters.filter;
            this._ensureType("not");
        }
        NotSegmentFilter.fromJS = function (parameters) {
            return new NotSegmentFilter(FacetSegmentFilter.fromJS(parameters.filter));
        };
        NotSegmentFilter.prototype.toString = function () {
            return "not (" + this.filter + ")";
        };
        NotSegmentFilter.prototype.valueOf = function () {
            var spec = _super.prototype.valueOf.call(this);
            spec.filter = this.filter;
            return spec;
        };
        NotSegmentFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filter = this.filter.toJS();
            return spec;
        };
        NotSegmentFilter.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.filter.equals(other.filter);
        };
        NotSegmentFilter.prototype.getFilterFn = function () {
            var filterFn = this.filter.getFilterFn();
            return function (segment) { return !filterFn(segment); };
        };
        return NotSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.NotSegmentFilter = NotSegmentFilter;
    var AndSegmentFilter = (function (_super) {
        __extends(AndSegmentFilter, _super);
        function AndSegmentFilter(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            if (Array.isArray(parameters))
                parameters = { filters: parameters };
            this.type = parameters.type;
            this.filters = parameters.filters;
            if (!Array.isArray(this.filters)) {
                throw new TypeError("filters must be an array");
            }
            this._ensureType("and");
        }
        AndSegmentFilter.fromJS = function (parameters) {
            return new AndSegmentFilter(parameters.filters.map(FacetSegmentFilter.fromJS));
        };
        AndSegmentFilter.prototype.toString = function () {
            if (this.filters.length > 1) {
                return "(" + (this.filters.join(") and (")) + ")";
            }
            else {
                return String(this.filters[0]);
            }
        };
        AndSegmentFilter.prototype.valueOf = function () {
            var spec = _super.prototype.valueOf.call(this);
            spec.filters = this.filters;
            return spec;
        };
        AndSegmentFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filters = this.filters.map(function (filter) { return filter.toJS(); });
            return spec;
        };
        AndSegmentFilter.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var otherFilters = other.filters;
            return this.filters.length === otherFilters.length && this.filters.every(function (filter, i) { return filter.equals(otherFilters[i]); });
        };
        AndSegmentFilter.prototype.getFilterFn = function () {
            var filterFns = this.filters.map(function (filter) { return filter.getFilterFn(); });
            return function (segment) {
                for (var i = 0; i < filterFns.length; i++) {
                    var filterFn = filterFns[i];
                    if (!filterFn(segment)) {
                        return false;
                    }
                }
                return true;
            };
        };
        return AndSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.AndSegmentFilter = AndSegmentFilter;
    var OrSegmentFilter = (function (_super) {
        __extends(OrSegmentFilter, _super);
        function OrSegmentFilter(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            if (Array.isArray(parameters))
                parameters = { filters: parameters };
            this.type = parameters.type;
            this.filters = parameters.filters;
            if (!Array.isArray(this.filters)) {
                throw new TypeError("filters must be an array");
            }
            this._ensureType("or");
        }
        OrSegmentFilter.fromJS = function (parameters) {
            return new OrSegmentFilter(parameters.filters.map(FacetSegmentFilter.fromJS));
        };
        OrSegmentFilter.prototype.toString = function () {
            if (this.filters.length > 1) {
                return "(" + (this.filters.join(") or (")) + ")";
            }
            else {
                return String(this.filters[0]);
            }
        };
        OrSegmentFilter.prototype.valueOf = function () {
            var spec = _super.prototype.valueOf.call(this);
            spec.filters = this.filters;
            return spec;
        };
        OrSegmentFilter.prototype.toJS = function () {
            var spec = _super.prototype.toJS.call(this);
            spec.filters = this.filters.map(function (filter) { return filter.toJS(); });
            return spec;
        };
        OrSegmentFilter.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other))
                return false;
            var otherFilters = other.filters;
            return this.filters.length === otherFilters.length && this.filters.every(function (filter, i) { return filter.equals(otherFilters[i]); });
        };
        OrSegmentFilter.prototype.getFilterFn = function () {
            var filterFns = this.filters.map(function (filter) { return filter.getFilterFn(); });
            return function (segment) {
                for (var i = 0; i < filterFns.length; i++) {
                    var filterFn = filterFns[i];
                    if (filterFn(segment)) {
                        return true;
                    }
                }
                return false;
            };
        };
        return OrSegmentFilter;
    })(FacetSegmentFilter);
    Legacy.OrSegmentFilter = OrSegmentFilter;
    FacetSegmentFilter.classMap = {
        "true": TrueSegmentFilter,
        "false": FalseSegmentFilter,
        "is": IsSegmentFilter,
        "in": InSegmentFilter,
        "not": NotSegmentFilter,
        "and": AndSegmentFilter,
        "or": OrSegmentFilter
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function cleanProp(prop) {
        for (var key in prop) {
            var value = prop[key];
            if (key[0] === "_") {
                delete prop[key];
            }
            else if (Array.isArray(value) && typeof value[0] === "string") {
                value[0] = new Date((value[0]));
                value[1] = new Date((value[1]));
            }
        }
    }
    var check;
    var SegmentTree = (function () {
        function SegmentTree(parameters, meta) {
            if (meta === void 0) { meta = null; }
            var prop = parameters.prop;
            var splits = parameters.splits;
            var loading = parameters.loading;
            var isOthers = parameters.isOthers;
            this.parent = parameters.parent || null;
            this.meta = meta;
            if (prop) {
                this.setProps(prop);
            }
            else if (splits) {
                throw new Error("can not initialize splits without prop");
            }
            if (splits)
                this.splits = splits;
            if (loading)
                this.loading = true;
            if (isOthers)
                this.isOthers = true;
        }
        SegmentTree.isPropValueEqual = function (pv1, pv2) {
            if (Array.isArray(pv1) && pv1.length === 2) {
                if (!(Array.isArray(pv2) && pv2.length === 2))
                    return false;
                return pv1[0].valueOf() === pv2[0].valueOf() && pv1[1].valueOf() === pv2[1].valueOf();
            }
            else {
                return pv1 === pv2;
            }
        };
        SegmentTree.isPropValueIn = function (propValue, propValueList) {
            var isPropValueEqual = SegmentTree.isPropValueEqual;
            return propValueList.some(function (pv) { return isPropValueEqual(propValue, pv); });
        };
        SegmentTree.isPropEqual = function (prop1, prop2) {
            var propNames = Object.keys(prop1);
            if (propNames.length !== Object.keys(prop2).length)
                return false;
            var isPropValueEqual = SegmentTree.isPropValueEqual;
            for (var i = 0; i < propNames.length; i++) {
                var propName = propNames[i];
                if (!isPropValueEqual(prop1[propName], prop2[propName]))
                    return false;
            }
            return true;
        };
        SegmentTree.isSegmentTree = function (candidate) {
            return Legacy.isInstanceOf(candidate, SegmentTree);
        };
        SegmentTree.fromJS = function (parameters, parent) {
            if (parent === void 0) { parent = null; }
            var newSegmentTree = new SegmentTree({
                parent: parent,
                prop: parameters.prop,
                loading: parameters.loading,
                isOthers: parameters.isOthers
            });
            if (parameters.splits) {
                newSegmentTree.splits = parameters.splits.map(function (st) { return SegmentTree.fromJS(st, newSegmentTree); });
            }
            return newSegmentTree;
        };
        SegmentTree.prototype.valueOf = function () {
            var spec = {};
            if (this.parent) {
                spec.parent = this.parent;
            }
            if (this.prop) {
                spec.prop = this.prop;
            }
            if (this.splits) {
                spec.splits = this.splits;
            }
            if (this.loading) {
                spec.loading = true;
            }
            if (this.isOthers) {
                spec.isOthers = true;
            }
            return spec;
        };
        SegmentTree.prototype.toJS = function () {
            var spec = {};
            if (this.prop) {
                spec.prop = this.prop;
            }
            if (this.splits) {
                spec.splits = this.splits.map(function (split) { return split.toJS(); });
            }
            if (this.loading) {
                spec.loading = true;
            }
            if (this.isOthers) {
                spec.isOthers = true;
            }
            return spec;
        };
        SegmentTree.prototype.toJSON = function () {
            return this.toJS();
        };
        SegmentTree.prototype.equals = function (other) {
            return SegmentTree.isSegmentTree(other) && SegmentTree.isPropEqual(this.prop, other.prop) && this.loading === other.loading && this.isOthers === other.isOthers && Boolean(this.splits) === Boolean(other.splits);
        };
        SegmentTree.prototype.toString = function () {
            return JSON.stringify(this.prop);
        };
        SegmentTree.prototype.selfClean = function () {
            for (var k in this) {
                if (!hasOwnProperty(this, k))
                    continue;
                if (k[0] === "_") {
                    delete this[k];
                }
            }
            if (this.splits) {
                this.splits.forEach(function (split) { return split.selfClean(); });
            }
            return this;
        };
        SegmentTree.prototype.setProps = function (prop) {
            cleanProp(prop);
            this.prop = prop;
            return this;
        };
        SegmentTree.prototype.setSplits = function (splits) {
            var _this = this;
            splits.forEach(function (split) { return split.parent = _this; });
            this.splits = splits;
            return this;
        };
        SegmentTree.prototype.markLoading = function () {
            this.loading = true;
            return this;
        };
        SegmentTree.prototype.hasLoading = function () {
            if (this.loading) {
                return true;
            }
            if (this.splits) {
                var splits = this.splits;
                for (var i = 0; i < splits.length; i++) {
                    var segment = splits[i];
                    if (segment.hasLoading()) {
                        return true;
                    }
                }
            }
            return false;
        };
        SegmentTree.prototype.hasProp = function (propName) {
            if (!this.prop) {
                return false;
            }
            return hasOwnProperty(this.prop, propName);
        };
        SegmentTree.prototype.getProp = function (propName) {
            var segmentProp = this.prop;
            if (!segmentProp) {
                return null;
            }
            if (this.hasProp(propName)) {
                return segmentProp[propName];
            }
            if (this.parent) {
                return this.parent.getProp(propName);
            }
            else {
                return null;
            }
        };
        SegmentTree.prototype.getParentDepth = function () {
            var depth = 0;
            var node = this;
            while (node = node.parent) {
                depth++;
            }
            return depth;
        };
        SegmentTree.prototype.getMaxDepth = function () {
            var maxDepth = 1;
            if (this.splits) {
                this.splits.forEach(function (segment) { return maxDepth = Math.max(maxDepth, segment.getMaxDepth() + 1); });
            }
            return maxDepth;
        };
        SegmentTree.prototype.specToMaxDepth = function (maxDepth) {
            var spec = {};
            if (this.prop) {
                spec.prop = this.prop;
            }
            if (this.splits && maxDepth > 1) {
                var newMaxDepth = maxDepth - 1;
                spec.splits = this.splits.map(function (split) { return split.specToMaxDepth(newMaxDepth); });
            }
            if (this.loading) {
                spec.loading = true;
            }
            if (this.isOthers) {
                spec.isOthers = true;
            }
            return spec;
        };
        SegmentTree.prototype.trimToMaxDepth = function (maxDepth) {
            if (maxDepth < 1)
                return null;
            var spec = this.specToMaxDepth(maxDepth);
            return SegmentTree.fromJS(spec);
        };
        SegmentTree.prototype.isSubTreeOf = function (subTree) {
            while (subTree) {
                if (this.prop === subTree.prop) {
                    return true;
                }
                subTree = subTree.parent;
            }
            return false;
        };
        SegmentTree.prototype._flattenHelper = function (order, result) {
            if (order === "preorder" || !this.splits) {
                result.push(this);
            }
            if (this.splits) {
                this.splits.forEach(function (split) { return split._flattenHelper(order, result); });
            }
            if (order === "postorder") {
                result.push(this);
            }
        };
        SegmentTree.prototype.flatten = function (order) {
            if (order === void 0) { order = "preorder"; }
            if (order !== "preorder" && order !== "postorder" && order !== "none") {
                throw new TypeError("order must be on of preorder, postorder, or none");
            }
            var result;
            this._flattenHelper(order, result = []);
            return result;
        };
        SegmentTree.prototype.hasOthers = function () {
            return this.splits.some(function (segmentTree) {
                return segmentTree.isOthers;
            });
        };
        return SegmentTree;
    })();
    Legacy.SegmentTree = SegmentTree;
    check = SegmentTree;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var directionFns = {
        ascending: function (a, b) {
            if (Array.isArray(a))
                a = a[0];
            if (Array.isArray(b))
                b = b[0];
            return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
        },
        descending: function (a, b) {
            if (Array.isArray(a))
                a = a[0];
            if (Array.isArray(b))
                b = b[0];
            return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
        }
    };
    var check;
    var FacetSort = (function () {
        function FacetSort(parameters) {
            this.compare = parameters.compare;
            this.prop = parameters.prop;
            this.direction = parameters.direction;
            this._verifyProp();
            this._verifyDirection();
        }
        FacetSort.isFacetSort = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetSort);
        };
        FacetSort.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable sort");
            }
            if (!hasOwnProperty(parameters, "compare")) {
                throw new Error("compare must be defined");
            }
            if (typeof parameters.compare !== "string") {
                throw new Error("compare must be a string");
            }
            var SortConstructor = FacetSort.classMap[parameters.compare];
            if (!SortConstructor) {
                throw new Error("unsupported compare '" + parameters.compare + "'");
            }
            return SortConstructor.fromJS(parameters);
        };
        FacetSort.prototype._ensureCompare = function (compare) {
            if (!this.compare) {
                this.compare = compare;
                return;
            }
            if (this.compare !== compare) {
                throw new TypeError("incorrect sort compare '" + this.compare + "' (needs to be: '" + compare + "')");
            }
        };
        FacetSort.prototype._verifyProp = function () {
            if (typeof this.prop !== "string") {
                throw new TypeError("sort prop must be a string");
            }
        };
        FacetSort.prototype._verifyDirection = function () {
            if (!directionFns[this.direction]) {
                throw new Error("direction must be 'descending' or 'ascending'");
            }
        };
        FacetSort.prototype.toString = function () {
            return "base sort";
        };
        FacetSort.prototype.valueOf = function () {
            return {
                compare: this.compare,
                prop: this.prop,
                direction: this.direction
            };
        };
        FacetSort.prototype.toJS = function () {
            return this.valueOf();
        };
        FacetSort.prototype.toJSON = function () {
            return this.valueOf();
        };
        FacetSort.prototype.getDirectionFn = function () {
            return directionFns[this.direction];
        };
        FacetSort.prototype.getCompareFn = function () {
            throw new Error("can not call FacetSort.getCompareFn directly");
        };
        FacetSort.prototype.getSegmentCompareFn = function () {
            var compareFn = this.getCompareFn();
            return function (a, b) { return compareFn(a.prop, b.prop); };
        };
        FacetSort.prototype.equals = function (other) {
            return FacetSort.isFacetSort(other) && this.compare === other.compare && this.prop === other.prop && this.direction === other.direction;
        };
        return FacetSort;
    })();
    Legacy.FacetSort = FacetSort;
    check = FacetSort;
    var NaturalSort = (function (_super) {
        __extends(NaturalSort, _super);
        function NaturalSort(parameters) {
            _super.call(this, parameters);
            this._ensureCompare("natural");
        }
        NaturalSort.fromJS = function (parameters) {
            return new NaturalSort(parameters);
        };
        NaturalSort.prototype.toString = function () {
            return this.compare + "(" + this.prop + ", " + this.direction + ")";
        };
        NaturalSort.prototype.getCompareFn = function () {
            var directionFn = this.getDirectionFn();
            var prop = this.prop;
            return function (a, b) { return directionFn(a[prop], b[prop]); };
        };
        return NaturalSort;
    })(FacetSort);
    Legacy.NaturalSort = NaturalSort;
    var CaseInsensitiveSort = (function (_super) {
        __extends(CaseInsensitiveSort, _super);
        function CaseInsensitiveSort(parameters) {
            _super.call(this, parameters);
            this._ensureCompare("caseInsensitive");
        }
        CaseInsensitiveSort.fromJS = function (parameters) {
            return new CaseInsensitiveSort(parameters);
        };
        CaseInsensitiveSort.prototype.toString = function () {
            return this.compare + "(" + this.prop + ", " + this.direction + ")";
        };
        CaseInsensitiveSort.prototype.getCompareFn = function () {
            var directionFn = this.getDirectionFn();
            var prop = this.prop;
            return function (a, b) { return directionFn(a[prop].toLowerCase(), b[prop].toLowerCase()); };
        };
        return CaseInsensitiveSort;
    })(FacetSort);
    Legacy.CaseInsensitiveSort = CaseInsensitiveSort;
    FacetSort.classMap = {
        "natural": NaturalSort,
        "caseInsensitive": CaseInsensitiveSort
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function convertToValue(js) {
        var value = {
            name: js.name,
            bucket: js.bucket,
            attribute: js.attribute,
            dataset: js.dataset
        };
        if (js.segmentFilter)
            value.segmentFilter = Legacy.FacetSegmentFilter.fromJS(js.segmentFilter);
        if (js.options)
            value.options = Legacy.FacetOptions.fromJS(js.options);
        return value;
    }
    var check;
    var FacetSplit = (function () {
        function FacetSplit(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.operation = "split";
            this.bucket = parameters.bucket;
            this.dataset = parameters.dataset;
            if (dummy !== Legacy.dummyObject) {
                throw new TypeError("can not call `new FacetSplit` directly use FacetSplit.fromJS instead");
            }
            if (parameters.name) {
                this.name = parameters.name;
            }
            if (parameters.attribute) {
                this.attribute = parameters.attribute;
            }
            if (parameters.segmentFilter) {
                this.segmentFilter = parameters.segmentFilter;
            }
            if (parameters.options) {
                this.options = parameters.options;
            }
        }
        FacetSplit.isFacetSplit = function (candidate) {
            return Legacy.isInstanceOf(candidate, FacetSplit);
        };
        FacetSplit.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable split");
            }
            if (!hasOwnProperty(parameters, "bucket")) {
                throw new Error("bucket must be defined");
            }
            if (typeof parameters.bucket !== "string") {
                throw new Error("bucket must be a string");
            }
            var SplitConstructor = FacetSplit.classMap[parameters.bucket];
            if (!SplitConstructor) {
                throw new Error("unsupported bucket '" + parameters.bucket + "'");
            }
            return SplitConstructor.fromJS(parameters);
        };
        FacetSplit.prototype._ensureBucket = function (bucket) {
            if (!this.bucket) {
                this.bucket = bucket;
                return;
            }
            if (this.bucket !== bucket) {
                throw new TypeError("incorrect split bucket '" + this.bucket + "' (needs to be: '" + bucket + "')");
            }
        };
        FacetSplit.prototype._verifyName = function () {
            if (!this.name)
                return;
            if (typeof this.name !== "string") {
                throw new TypeError("split name must be a string");
            }
        };
        FacetSplit.prototype._verifyAttribute = function () {
            if (typeof this.attribute !== "string") {
                throw new TypeError("attribute must be a string");
            }
        };
        FacetSplit.prototype._addName = function (str) {
            if (!this.name) {
                return str;
            }
            return str + " -> " + this.name;
        };
        FacetSplit.prototype.addName = function (name) {
            var splitJS = this.toJS();
            splitJS.name = name;
            return FacetSplit.fromJS(splitJS);
        };
        FacetSplit.prototype.toString = function () {
            return this._addName("base split");
        };
        FacetSplit.prototype.toHash = function () {
            throw new Error("can not call FacetSplit.toHash directly");
        };
        FacetSplit.prototype.valueOf = function () {
            var split = {
                bucket: this.bucket
            };
            if (this.name) {
                split.name = this.name;
            }
            if (this.attribute) {
                split.attribute = this.attribute;
            }
            if (this.dataset) {
                split.dataset = this.dataset;
            }
            if (this.segmentFilter) {
                split.segmentFilter = this.segmentFilter;
            }
            if (this.options) {
                split.options = this.options;
            }
            return split;
        };
        FacetSplit.prototype.toJS = function () {
            var split = {
                bucket: this.bucket
            };
            if (this.name) {
                split.name = this.name;
            }
            if (this.attribute) {
                split.attribute = this.attribute;
            }
            if (this.dataset) {
                split.dataset = this.dataset;
            }
            if (this.segmentFilter) {
                split.segmentFilter = this.segmentFilter.toJS();
            }
            if (this.options) {
                split.options = this.options.toJS();
            }
            return split;
        };
        FacetSplit.prototype.toJSON = function () {
            return this.toJS();
        };
        FacetSplit.prototype.getDataset = function () {
            return this.dataset || "main";
        };
        FacetSplit.prototype.getDatasets = function () {
            return [this.dataset || "main"];
        };
        FacetSplit.prototype.getFilterFor = function (prop, fallbackName) {
            if (fallbackName === void 0) { fallbackName = null; }
            throw new Error("this method should never be called directly");
        };
        FacetSplit.prototype.getFilterByDatasetFor = function (prop) {
            var filterByDataset = {};
            filterByDataset[this.getDataset()] = this.getFilterFor(prop);
            return filterByDataset;
        };
        FacetSplit.prototype.equals = function (other, compareSegmentFilter) {
            if (compareSegmentFilter === void 0) { compareSegmentFilter = false; }
            return FacetSplit.isFacetSplit(other) && this.bucket === other.bucket && this.attribute === other.attribute && Boolean(this.options) === Boolean(other.options) && (!this.options || this.options.equals(other.options)) && (!compareSegmentFilter || (Boolean(this.segmentFilter) === Boolean(other.segmentFilter && this.segmentFilter.equals(other.segmentFilter))));
        };
        FacetSplit.prototype.getAttributes = function () {
            return [this.attribute];
        };
        FacetSplit.prototype.withoutSegmentFilter = function () {
            if (!this.segmentFilter)
                return this;
            var spec = this.toJS();
            delete spec.segmentFilter;
            return FacetSplit.fromJS(spec);
        };
        return FacetSplit;
    })();
    Legacy.FacetSplit = FacetSplit;
    check = FacetSplit;
    var IdentitySplit = (function (_super) {
        __extends(IdentitySplit, _super);
        function IdentitySplit(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this._ensureBucket("identity");
            this._verifyName();
            this._verifyAttribute();
        }
        IdentitySplit.fromJS = function (parameters) {
            return new IdentitySplit(convertToValue(parameters));
        };
        IdentitySplit.prototype.toString = function () {
            return this._addName(this.bucket + "(`" + this.attribute + "`)");
        };
        IdentitySplit.prototype.toHash = function () {
            return "ID:" + this.attribute;
        };
        IdentitySplit.prototype.getFilterFor = function (prop, fallbackName) {
            if (fallbackName === void 0) { fallbackName = null; }
            var name = this.name || fallbackName;
            return new Legacy.IsFilter({
                attribute: this.attribute,
                value: (prop[name])
            });
        };
        return IdentitySplit;
    })(FacetSplit);
    Legacy.IdentitySplit = IdentitySplit;
    var ContinuousSplit = (function (_super) {
        __extends(ContinuousSplit, _super);
        function ContinuousSplit(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.size = parameters.size;
            this.offset = parameters.offset;
            var lowerLimit = parameters.lowerLimit;
            var upperLimit = parameters.upperLimit;
            if (this.offset == null) {
                this.offset = 0;
            }
            if (lowerLimit != null) {
                this.lowerLimit = lowerLimit;
            }
            if (upperLimit != null) {
                this.upperLimit = upperLimit;
            }
            if (typeof this.size !== "number") {
                throw new TypeError("size must be a number");
            }
            if (this.size <= 0) {
                throw new Error("size must be positive (is: " + this.size + ")");
            }
            if (typeof this.offset !== "number") {
                throw new TypeError("offset must be a number");
            }
            this._ensureBucket("continuous");
            this._verifyName();
            this._verifyAttribute();
        }
        ContinuousSplit.fromJS = function (parameters) {
            var splitValue = convertToValue(parameters);
            splitValue.offset = parameters.offset;
            splitValue.size = parameters.size;
            splitValue.lowerLimit = parameters.lowerLimit;
            splitValue.upperLimit = parameters.upperLimit;
            return new ContinuousSplit(splitValue);
        };
        ContinuousSplit.prototype.toString = function () {
            return this._addName(this.bucket + "(`" + this.attribute + "`, " + this.size + ", " + this.offset + ")");
        };
        ContinuousSplit.prototype.toHash = function () {
            return "CT:" + this.attribute + ":" + this.size + ":" + this.offset;
        };
        ContinuousSplit.prototype.valueOf = function () {
            var split = _super.prototype.valueOf.call(this);
            split.size = this.size;
            split.offset = this.offset;
            if (this.lowerLimit != null)
                split.lowerLimit = this.lowerLimit;
            if (this.upperLimit != null)
                split.upperLimit = this.upperLimit;
            return split;
        };
        ContinuousSplit.prototype.toJS = function () {
            var split = _super.prototype.toJS.call(this);
            split.size = this.size;
            split.offset = this.offset;
            if (this.lowerLimit != null)
                split.lowerLimit = this.lowerLimit;
            if (this.upperLimit != null)
                split.upperLimit = this.upperLimit;
            return split;
        };
        ContinuousSplit.prototype.getFilterFor = function (prop, fallbackName) {
            if (fallbackName === void 0) { fallbackName = null; }
            var name = this.name || fallbackName;
            var propRange = prop[name];
            return new Legacy.WithinFilter({
                attribute: this.attribute,
                range: propRange
            });
        };
        ContinuousSplit.prototype.equals = function (other, compareSegmentFilter) {
            if (compareSegmentFilter === void 0) { compareSegmentFilter = false; }
            return _super.prototype.equals.call(this, other, compareSegmentFilter) && this.size === other.size && this.offset === other.offset && this.lowerLimit === other.lowerLimit && this.upperLimit === other.upperLimit;
        };
        return ContinuousSplit;
    })(FacetSplit);
    Legacy.ContinuousSplit = ContinuousSplit;
    var TimePeriodSplit = (function (_super) {
        __extends(TimePeriodSplit, _super);
        function TimePeriodSplit(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.period = parameters.period;
            this.timezone = parameters.timezone;
            this.warp = parameters.warp;
            this.warpDirection = parameters.warpDirection;
            if (!Legacy.Duration.isDuration(this.period)) {
                throw new TypeError("must have period");
            }
            if (!this.period.isSimple()) {
                throw new TypeError("the period must be in simple");
            }
            if (!Legacy.Timezone.isTimezone(this.timezone)) {
                throw new TypeError("must have timezone");
            }
            if (this.warp) {
                if (!Legacy.Duration.isDuration(this.warp)) {
                    throw new TypeError("warp must be a duration");
                }
                if (Math.abs(this.warpDirection) !== 1) {
                    throw new TypeError("warpDirection must be 1 or -1");
                }
            }
            this._ensureBucket("timePeriod");
            this._verifyName();
            this._verifyAttribute();
        }
        TimePeriodSplit.fromJS = function (parameters) {
            var splitValue = convertToValue(parameters);
            if (parameters.period) {
                splitValue.period = Legacy.Duration.fromJS(parameters.period);
            }
            else {
                throw new Error("Must have period");
            }
            if (parameters.warp) {
                splitValue.warp = Legacy.Duration.fromJS(parameters.warp);
                splitValue.warpDirection = parameters.warpDirection || 1;
            }
            if (parameters.timezone) {
                splitValue.timezone = Legacy.Timezone.fromJS(parameters.timezone);
            }
            else {
                splitValue.timezone = Legacy.Timezone.UTC();
            }
            return new TimePeriodSplit(splitValue);
        };
        TimePeriodSplit.prototype._warpString = function () {
            return (this.warpDirection > 0 ? '+' : '-') + this.warp.toString();
        };
        TimePeriodSplit.prototype.toString = function () {
            var warpStr = this.warp ? (', ' + this._warpString()) : '';
            return this._addName(this.bucket + "(`" + this.attribute + "`, " + this.period.toString() + warpStr + ", " + this.timezone + ")");
        };
        TimePeriodSplit.prototype.toHash = function () {
            var warpStr = this.warp ? (':' + this._warpString()) : '';
            return "TP:" + this.attribute + ":" + this.period + ":" + this.timezone + warpStr;
        };
        TimePeriodSplit.prototype.valueOf = function () {
            var split = _super.prototype.valueOf.call(this);
            split.period = this.period;
            split.timezone = this.timezone;
            if (this.warp) {
                split.warp = this.warp;
                if (this.warpDirection === -1)
                    split.warpDirection = -1;
            }
            return split;
        };
        TimePeriodSplit.prototype.toJS = function () {
            var split = _super.prototype.toJS.call(this);
            split.period = this.period.toJS();
            split.timezone = this.timezone.toJS();
            if (this.warp) {
                split.warp = this.warp.toJS();
                if (this.warpDirection === -1)
                    split.warpDirection = -1;
            }
            return split;
        };
        TimePeriodSplit.prototype.getFilterFor = function (prop, fallbackName) {
            var _this = this;
            if (fallbackName === void 0) { fallbackName = null; }
            var name = this.name || fallbackName;
            var propRange = (prop[name]);
            var warp = this.warp;
            if (warp) {
                var timezone = this.timezone;
                propRange = propRange.map(function (d) { return warp.move(d, timezone, _this.warpDirection); });
            }
            return new Legacy.WithinFilter({
                attribute: this.attribute,
                range: propRange
            });
        };
        TimePeriodSplit.prototype.equals = function (other, compareSegmentFilter) {
            if (compareSegmentFilter === void 0) { compareSegmentFilter = false; }
            return _super.prototype.equals.call(this, other, compareSegmentFilter) && this.period.equals(other.period) && this.timezone.equals(other.timezone) && Boolean(this.warp) === Boolean(other.warp) && (!this.warp || this.warp.equals(other.warp)) && this.warpDirection === other.warpDirection;
        };
        return TimePeriodSplit;
    })(FacetSplit);
    Legacy.TimePeriodSplit = TimePeriodSplit;
    var TupleSplit = (function (_super) {
        __extends(TupleSplit, _super);
        function TupleSplit(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.splits = parameters.splits;
            if (!(Array.isArray(this.splits) && this.splits.length)) {
                throw new TypeError("splits must be a non-empty array");
            }
            this.splits.forEach(function (split) {
                if (split.bucket === "tuple") {
                    throw new Error("tuple splits can not be nested");
                }
                if (!hasOwnProperty(split, "name")) {
                    throw new Error("a split within a tuple must have a name");
                }
                if (hasOwnProperty(split, "segmentFilter")) {
                    throw new Error("a split within a tuple should not have a segmentFilter");
                }
            });
            this._ensureBucket("tuple");
        }
        TupleSplit.fromJS = function (parameters) {
            var splitValue = convertToValue(parameters);
            splitValue.splits = parameters.splits.map(FacetSplit.fromJS);
            return new TupleSplit(splitValue);
        };
        TupleSplit.prototype.toString = function () {
            return this._addName("(" + (this.splits.join(" x ")) + ")");
        };
        TupleSplit.prototype.toHash = function () {
            return "(" + this.splits.map(function (split) { return split.toHash(); }).join(")*(") + ")";
        };
        TupleSplit.prototype.valueOf = function () {
            var split = _super.prototype.valueOf.call(this);
            split.splits = this.splits;
            return split;
        };
        TupleSplit.prototype.toJS = function () {
            var split = _super.prototype.toJS.call(this);
            split.splits = this.splits.map(function (split) { return split.toJS(); });
            return split;
        };
        TupleSplit.prototype.getFilterFor = function (prop) {
            var name = this.name;
            return new Legacy.AndFilter(this.splits.map(function (split) { return split.getFilterFor(prop, name); }));
        };
        TupleSplit.prototype.equals = function (other, compareSegmentFilter) {
            if (compareSegmentFilter === void 0) { compareSegmentFilter = false; }
            if (!_super.prototype.equals.call(this, other, compareSegmentFilter))
                return false;
            var otherSplits = other.splits;
            return this.splits.length === otherSplits.length && this.splits.every(function (split, i) { return split.equals(otherSplits[i], true); });
        };
        TupleSplit.prototype.getAttributes = function () {
            return this.splits.map(function (parameters) {
                return parameters.attribute;
            }).sort();
        };
        return TupleSplit;
    })(FacetSplit);
    Legacy.TupleSplit = TupleSplit;
    var ParallelSplit = (function (_super) {
        __extends(ParallelSplit, _super);
        function ParallelSplit(parameters) {
            _super.call(this, parameters, Legacy.dummyObject);
            this.splits = parameters.splits;
            if (!(Array.isArray(this.splits) && this.splits.length)) {
                throw new TypeError("splits must be a non-empty array");
            }
            this.splits.forEach(function (split) {
                if (split.bucket === "parallel") {
                    throw new Error("parallel splits can not be nested");
                }
                if (hasOwnProperty(split, "name")) {
                    throw new Error("a split within a parallel must not have a name");
                }
                if (hasOwnProperty(split, "segmentFilter")) {
                    throw new Error("a split within a parallel should not have a segmentFilter");
                }
            });
            this._ensureBucket("parallel");
        }
        ParallelSplit.fromJS = function (parameters) {
            var splitValue = convertToValue(parameters);
            splitValue.splits = parameters.splits.map(FacetSplit.fromJS);
            return new ParallelSplit(splitValue);
        };
        ParallelSplit.prototype.toString = function () {
            return this._addName(this.splits.join(" | "));
        };
        ParallelSplit.prototype.toHash = function () {
            return "(" + this.splits.map(function (split) { return split.toHash(); }).join(")|(") + ")";
        };
        ParallelSplit.prototype.valueOf = function () {
            var split = _super.prototype.valueOf.call(this);
            split.splits = this.splits;
            return split;
        };
        ParallelSplit.prototype.toJS = function () {
            var split = _super.prototype.toJS.call(this);
            split.splits = this.splits.map(function (split) { return split.toJS(); });
            return split;
        };
        ParallelSplit.prototype.getFilterFor = function (prop, fallbackName) {
            if (fallbackName === void 0) { fallbackName = null; }
            var name = this.name || fallbackName;
            var firstSplit = this.splits[0];
            var value = (prop[name]);
            switch (firstSplit.bucket) {
                case "identity":
                    return new Legacy.IsFilter({
                        attribute: firstSplit.attribute,
                        value: value
                    });
                case "continuous":
                case "timePeriod":
                    return new Legacy.WithinFilter({
                        attribute: firstSplit.attribute,
                        range: value
                    });
                default:
                    throw new Error("unsupported sub split '" + firstSplit.bucket + "'");
            }
        };
        ParallelSplit.prototype.getFilterByDatasetFor = function (prop) {
            var name = this.name;
            var filterByDataset = {};
            this.splits.forEach(function (split) { return filterByDataset[split.getDataset()] = split.getFilterFor(prop, name); });
            return filterByDataset;
        };
        ParallelSplit.prototype.equals = function (other, compareSegmentFilter) {
            if (compareSegmentFilter === void 0) { compareSegmentFilter = false; }
            if (!_super.prototype.equals.call(this, other, compareSegmentFilter))
                return false;
            var otherSplits = other.splits;
            return this.splits.length === otherSplits.length && this.splits.every(function (split, i) { return split.equals(otherSplits[i], true); });
        };
        ParallelSplit.prototype.getDataset = function () {
            throw new Error("getDataset not defined for ParallelSplit, use getDatasets");
        };
        ParallelSplit.prototype.getDatasets = function () {
            return this.splits.map(function (split) { return split.getDataset(); });
        };
        ParallelSplit.prototype.getAttributes = function () {
            var attributes = [];
            this.splits.forEach(function (split) {
                split.getAttributes().map(function (attribute) {
                    if (attributes.indexOf(attribute) < 0) {
                        return attributes.push(attribute);
                    }
                });
            });
            return attributes.sort();
        };
        return ParallelSplit;
    })(FacetSplit);
    Legacy.ParallelSplit = ParallelSplit;
    FacetSplit.classMap = {
        "identity": IdentitySplit,
        "continuous": ContinuousSplit,
        "timePeriod": TimePeriodSplit,
        "tuple": TupleSplit,
        "parallel": ParallelSplit
    };
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var driverUtil;
    (function (driverUtil) {
        function flatten(xss) {
            var flat = [];
            xss.forEach(function (xs) {
                if (!Array.isArray(xs)) {
                    throw new TypeError("bad value in list");
                }
                return xs.map(function (x) { return flat.push(x); });
            });
            return flat;
        }
        driverUtil.flatten = flatten;
        function inPlaceTrim(array, n) {
            if (array.length < n)
                return;
            array.splice(n, array.length - n);
        }
        driverUtil.inPlaceTrim = inPlaceTrim;
        function inPlaceFilter(array, fn) {
            var i = 0;
            while (i < array.length) {
                if (fn.call(array, array[i], i)) {
                    i++;
                }
                else {
                    array.splice(i, 1);
                }
            }
        }
        driverUtil.inPlaceFilter = inPlaceFilter;
        function safeAdd(num, delta) {
            var stringDelta = String(delta);
            var dotIndex = stringDelta.indexOf(".");
            if (dotIndex === -1 || stringDelta.length === 18) {
                return num + delta;
            }
            else {
                var scale = Math.pow(10, stringDelta.length - dotIndex - 1);
                return (num * scale + delta * scale) / scale;
            }
        }
        driverUtil.safeAdd = safeAdd;
        function dateToIntervalPart(date) {
            return date.toISOString().replace("Z", "").replace(".000", "").replace(/:00$/, "").replace(/:00$/, "").replace(/T00$/, "");
        }
        function datesToInterval(start, end) {
            return dateToIntervalPart(start) + "/" + dateToIntervalPart(end);
        }
        driverUtil.datesToInterval = datesToInterval;
        function timeFilterToIntervals(filter, forceInterval) {
            if (filter.type === "true") {
                if (forceInterval)
                    throw new Error("must have an interval");
                return ["1000-01-01/3000-01-01"];
            }
            var ors = filter.type === "or" ? filter.filters : [filter];
            return ors.map(function (filter) {
                var type = filter.type;
                if (type !== "within") {
                    throw new Error("can only time filter with a 'within' filter");
                }
                var range = filter.range;
                return datesToInterval(range[0], range[1]);
            });
        }
        driverUtil.timeFilterToIntervals = timeFilterToIntervals;
        function continuousFloorExpression(variable, floorFn, size, offset) {
            var expr = variable;
            if (offset !== 0) {
                expr = expr + " - " + offset;
            }
            if (offset !== 0 && size !== 1) {
                expr = "(" + expr + ")";
            }
            if (size !== 1) {
                expr = expr + " / " + size;
            }
            expr = floorFn + "(" + expr + ")";
            if (size !== 1) {
                expr = expr + " * " + size;
            }
            if (offset !== 0) {
                expr = expr + " + " + offset;
            }
            return expr;
        }
        driverUtil.continuousFloorExpression = continuousFloorExpression;
        function find(array, fn) {
            for (var i = 0; i < array.length; i++) {
                var a = array[i];
                if (fn.call(array, a, i))
                    return a;
            }
            return null;
        }
        driverUtil.find = find;
        function filterMap(array, fn) {
            var ret = [];
            for (var i = 0; i < array.length; i++) {
                var a = array[i];
                var v = fn.call(array, a, i);
                if (typeof v === "undefined")
                    continue;
                ret.push(v);
            }
            return ret;
        }
        driverUtil.filterMap = filterMap;
        function joinRows(rows) {
            var newRow = {};
            rows.forEach(function (row) {
                for (var prop in row) {
                    newRow[prop] = row[prop];
                }
            });
            return newRow;
        }
        driverUtil.joinRows = joinRows;
        function joinResults(splitNames, applyNames, results) {
            if (results.length <= 1) {
                return results[0];
            }
            if (splitNames.length === 0) {
                return [joinRows(results.map(function (result) { return result[0]; }))];
            }
            var zeroRow = {};
            applyNames.forEach(function (name) {
                zeroRow[name] = 0;
            });
            var mapping = {};
            for (var i = 0; i < results.length; i++) {
                var result = results[i];
                if (!result)
                    continue;
                result.forEach(function (row) {
                    var key = splitNames.map(function (splitName) { return row[splitName]; }).join("]#;{#");
                    if (!mapping[key]) {
                        mapping[key] = [zeroRow];
                    }
                    return mapping[key].push(row);
                });
            }
            var joinResult = [];
            for (var key in mapping) {
                var rows = mapping[key];
                joinResult.push(joinRows(rows));
            }
            return joinResult;
        }
        driverUtil.joinResults = joinResults;
        ;
        function createTabular(root, order, rangeFn) {
            if (!root)
                throw new TypeError("must have a tree");
            if (order == null)
                order = "none";
            if (order !== "prepend" && order !== "append" && order !== "none") {
                throw new TypeError("order must be on of prepend, append, or none");
            }
            if (rangeFn == null) {
                rangeFn = function (range) { return range; };
            }
            if (!(root != null ? root.prop : void 0)) {
                return [];
            }
            var result;
            createTabularHelper(root, order, rangeFn, {}, result = []);
            return result;
        }
        driverUtil.createTabular = createTabular;
        function createTabularHelper(root, order, rangeFn, context, result) {
            var k;
            var myProp = {};
            for (k in context) {
                myProp[k] = context[k];
            }
            var rootProp = root.prop;
            for (k in rootProp) {
                var v = rootProp[k];
                if (Array.isArray(v)) {
                    v = rangeFn(v);
                }
                myProp[k] = v;
            }
            if (order === "preorder" || !root.splits) {
                result.push(myProp);
            }
            if (root.splits) {
                root.splits.forEach(function (split) { return createTabularHelper(split, order, rangeFn, myProp, result); });
            }
            if (order === "postorder") {
                result.push(myProp);
            }
        }
        function csvEscape(str) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        var Table = (function () {
            function Table(parameters) {
                var root = parameters.root;
                var query = parameters.query;
                if (!query) {
                    throw new Error("query not supplied");
                }
                if (!Legacy.FacetQuery.isFacetQuery(query)) {
                    throw new TypeError("query must be a FacetQuery");
                }
                this.query = query;
                this.titleFn = function (op) { return op.name; };
                this.splitColumns = flatten(query.getSplits().map(function (split) { return [split]; }));
                this.applyColumns = query.getApplies();
                this.data = createTabular(root);
                this.translateFn = function (columnName, datum) { return datum; };
            }
            Table.prototype.toTabular = function (separator, lineBreak, rangeFn) {
                var columnNames = [];
                var header = [];
                var column;
                var splitColumns = this.splitColumns;
                for (var i = 0; i < splitColumns.length; i++) {
                    column = splitColumns[i];
                    var columnTitle = this.titleFn(column);
                    if (columnTitle == null) {
                        continue;
                    }
                    columnNames.push(column.name);
                    header.push(csvEscape(columnTitle));
                }
                var applyColumns = this.applyColumns;
                for (var j = 0; j < applyColumns.length; j++) {
                    column = applyColumns[j];
                    columnTitle = this.titleFn(column);
                    if (columnTitle == null) {
                        continue;
                    }
                    columnNames.push(column.name);
                    header.push(csvEscape(columnTitle));
                }
                rangeFn || (rangeFn = function (range) {
                    if (range[0] instanceof Date) {
                        range = range.map(function (r) { return r.toISOString(); });
                    }
                    return range.join("-");
                });
                var translate = this.translateFn;
                var lines = [header.join(separator)];
                this.data.forEach(function (row) { return lines.push(columnNames.map(function (columnName) {
                    var datum = row[columnName] || "";
                    datum = translate(columnName, datum);
                    if (Array.isArray(datum)) {
                        datum = rangeFn(datum);
                    }
                    return csvEscape(String(datum));
                }).join(separator)); });
                return lines.join(lineBreak);
            };
            Table.prototype.translate = function (fn) {
                if (arguments.length) {
                    this.translateFn = fn;
                    return;
                }
                return this.translateFn;
            };
            Table.prototype.columnTitle = function (v) {
                if (arguments.length) {
                    this.titleFn = v;
                    return;
                }
                return this.titleFn;
            };
            return Table;
        })();
        driverUtil.Table = Table;
        function addOthers(root, query) {
            var rootWithOthersValue = {};
            if (root.parent) {
                rootWithOthersValue.parent = root.parent;
            }
            if (root.prop) {
                rootWithOthersValue.prop = root.prop;
            }
            if (root.loading) {
                rootWithOthersValue.loading = root.loading;
            }
            var rootWithOthers = new Legacy.SegmentTree(rootWithOthersValue);
            if (root.splits) {
                var splitsWithOthers = root.splits.map(function (childSegmentTree) {
                    return addOthers(childSegmentTree, query);
                });
                var currentCommand = query.getCondensedCommands()[root.getParentDepth() + 1];
                var currentApplies = currentCommand.getApplies();
                var currentSplit = currentCommand.getSplit();
                var prop = {};
                prop[currentSplit.name] = null;
                for (var i = 0; i < currentApplies.length; i++) {
                    var apply = currentApplies[i];
                    if (root.hasProp(apply.name) && apply.isAdditive()) {
                        var splitSum = root.splits.reduce(function (sum, segmentTree) {
                            return sum + segmentTree.getProp(apply.name);
                        }, 0);
                        prop[apply.name] = root.getProp(apply.name) - splitSum;
                    }
                }
                splitsWithOthers.push(new Legacy.SegmentTree({
                    prop: prop,
                    loading: false,
                    isOthers: true
                }));
                rootWithOthers.setSplits(splitsWithOthers);
            }
            return rootWithOthers;
        }
        driverUtil.addOthers = addOthers;
    })(driverUtil = Legacy.driverUtil || (Legacy.driverUtil = {}));
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    function isString(str) {
        return typeof str === "string";
    }
    var arithmeticToDruidFn = {
        add: "+",
        subtract: "-",
        multiply: "*",
        divide: "/"
    };
    var druidPostProcessorScheme = {
        constant: function (constantApply) {
            var value = constantApply.value;
            return {
                type: "constant",
                value: value
            };
        },
        getter: function (aggregateApply) {
            var name = aggregateApply.name;
            var aggregate = aggregateApply.aggregate;
            return {
                type: aggregate === "uniqueCount" ? "hyperUniqueCardinality" : "fieldAccess",
                fieldName: name
            };
        },
        arithmetic: function (arithmetic, lhs, rhs) {
            var druidFn = arithmeticToDruidFn[arithmetic];
            if (!druidFn) {
                throw new Error("unsupported arithmetic '" + arithmetic + "'");
            }
            return {
                type: "arithmetic",
                fn: druidFn,
                fields: [lhs, rhs]
            };
        },
        finish: function (name, getter) {
            getter.name = name;
            return getter;
        }
    };
    var aggregateToJS = {
        count: ["0", function (a, b) { return a + " + " + b; }],
        sum: ["0", function (a, b) { return a + " + " + b; }],
        min: ["Infinity", function (a, b) { return "Math.min(" + a + ", " + b + ")"; }],
        max: ["-Infinity", function (a, b) { return "Math.max(" + a + ", " + b + ")"; }]
    };
    function correctSingletonDruidResult(result) {
        return Array.isArray(result) && result.length <= 1 && (result.length === 0 || result[0].result);
    }
    function emptySingletonDruidResult(result) {
        return result.length === 0;
    }
    var DruidQueryBuilder = (function () {
        function DruidQueryBuilder(parameters) {
            this.queryType = "timeseries";
            this.filter = null;
            this.aggregations = [];
            this.postAggregations = [];
            this.nameIndex = 0;
            this.jsCount = 0;
            this.setDataSource(parameters.dataSource);
            this.timeAttribute = parameters.timeAttribute || 'timestamp';
            if (!isString(this.timeAttribute))
                throw new Error("must have a timeAttribute");
            this.attributeMetas = parameters.attributeMetas;
            this.forceInterval = parameters.forceInterval;
            this.approximate = parameters.approximate;
            this.useDataSourceMetadata = parameters.useDataSourceMetadata;
            this.granularity = "all";
            this.intervals = null;
            var parametersContext = parameters.context;
            var context = {};
            for (var k in parametersContext) {
                if (!hasOwnProperty(parametersContext, k))
                    continue;
                context[k] = parametersContext[k];
            }
            this.context = context;
        }
        DruidQueryBuilder.makeSingleQuery = function (parameters, callback) {
            var condensedCommand = parameters.condensedCommand;
            var queryBuilder = parameters.queryBuilder;
            var timeAttribute = queryBuilder.timeAttribute;
            var approximate = queryBuilder.approximate;
            var queryFnName;
            var split = condensedCommand.getSplit();
            if (split) {
                switch (split.bucket) {
                    case "identity":
                        if (approximate) {
                            if ((condensedCommand.getCombine()).limit != null) {
                                queryFnName = "topN";
                            }
                            else {
                                queryFnName = "allData";
                            }
                        }
                        else {
                            queryFnName = "groupBy";
                        }
                        break;
                    case "timePeriod":
                        queryFnName = "timeseries";
                        break;
                    case "continuous":
                        var attributeMeta = queryBuilder.getAttributeMeta(split.attribute);
                        if (attributeMeta.type === "histogram") {
                            queryFnName = "histogram";
                        }
                        else {
                            queryFnName = "topN";
                        }
                        break;
                    case "tuple":
                        if (approximate && (split.splits).length === 2) {
                            queryFnName = "heatmap";
                        }
                        else {
                            queryFnName = "groupBy";
                        }
                        break;
                    default:
                        var err = new Error("unsupported split bucket");
                        err.split = split.valueOf();
                        callback(err);
                        return;
                }
            }
            else {
                if (condensedCommand.applies.some(function (apply) { return apply.attribute === timeAttribute && (apply.aggregate === "min" || apply.aggregate === "max"); })) {
                    queryFnName = "timeBoundary";
                }
                else {
                    queryFnName = "all";
                }
            }
            var queryFn = DruidQueryBuilder.queryFns[queryFnName];
            queryFn(parameters, callback);
        };
        DruidQueryBuilder.prototype.setDataSource = function (dataSource) {
            if (!(isString(dataSource) || (Array.isArray(dataSource) && dataSource.length && dataSource.every(isString)))) {
                throw new Error("`dataSource` must be a string or union array");
            }
            if (isString(dataSource)) {
                this.dataSource = dataSource;
            }
            else {
                this.dataSource = {
                    type: "union",
                    dataSources: dataSource
                };
            }
        };
        DruidQueryBuilder.prototype.getAttributeMeta = function (attribute) {
            if (this.attributeMetas[attribute]) {
                return this.attributeMetas[attribute];
            }
            if (/_hist$/.test(attribute)) {
                return Legacy.AttributeMeta.HISTOGRAM;
            }
            if (/^unique_/.test(attribute)) {
                return Legacy.AttributeMeta.UNIQUE;
            }
            return Legacy.AttributeMeta.DEFAULT;
        };
        DruidQueryBuilder.prototype.addToNamespace = function (namespace, attribute) {
            if (namespace[attribute]) {
                return namespace[attribute];
            }
            namespace[attribute] = "v" + this.jsCount;
            this.jsCount++;
            return namespace[attribute];
        };
        DruidQueryBuilder.prototype.filterToJSHelper = function (filter, namespace) {
            var _this = this;
            var attributeMeta;
            var varName;
            switch (filter.type) {
                case "true":
                case "false":
                    return filter.type;
                case "is":
                    if (filter.attribute === this.timeAttribute)
                        throw new Error("can not filter on specific time");
                    attributeMeta = this.getAttributeMeta(filter.attribute);
                    varName = this.addToNamespace(namespace, filter.attribute);
                    return varName + " === '" + (attributeMeta.serialize(filter.value)) + "'";
                case "in":
                    if (filter.attribute === this.timeAttribute)
                        throw new Error("can not filter on specific time");
                    attributeMeta = this.getAttributeMeta(filter.attribute);
                    varName = this.addToNamespace(namespace, filter.attribute);
                    return filter.values.map(function (value) {
                        return varName + " === '" + (attributeMeta.serialize(value)) + "'";
                    }).join("||");
                case "contains":
                    if (filter.attribute === this.timeAttribute)
                        throw new Error("can not filter on specific time");
                    varName = this.addToNamespace(namespace, filter.attribute);
                    return "String(" + varName + ").indexOf('" + filter.value + "') !== -1";
                case "not":
                    return "!(" + (this.filterToJSHelper(filter.filter, namespace)) + ")";
                case "and":
                    return filter.filters.map(function (filter) {
                        return "(" + (_this.filterToJSHelper(filter, namespace)) + ")";
                    }, this).join("&&");
                case "or":
                    return filter.filters.map(function (filter) {
                        return "(" + (_this.filterToJSHelper(filter, namespace)) + ")";
                    }, this).join("||");
                default:
                    throw new Error("unknown JS filter type '" + filter.type + "'");
            }
        };
        DruidQueryBuilder.prototype.filterToJS = function (filter) {
            var namespace = {};
            this.jsCount = 0;
            var jsFilter = this.filterToJSHelper(filter, namespace);
            return {
                jsFilter: jsFilter,
                namespace: namespace
            };
        };
        DruidQueryBuilder.prototype.timelessFilterToDruid = function (filter) {
            var attributeMeta;
            switch (filter.type) {
                case "true":
                    return null;
                case "false":
                    throw new Error("should never get here");
                    break;
                case "is":
                    attributeMeta = this.getAttributeMeta(filter.attribute);
                    return {
                        type: "selector",
                        dimension: filter.attribute,
                        value: attributeMeta.serialize(filter.value)
                    };
                case "in":
                    attributeMeta = this.getAttributeMeta(filter.attribute);
                    return {
                        type: "or",
                        fields: filter.values.map((function (value) { return ({
                            type: "selector",
                            dimension: filter.attribute,
                            value: attributeMeta.serialize(value)
                        }); }), this)
                    };
                case "contains":
                    return {
                        type: "search",
                        dimension: filter.attribute,
                        query: {
                            type: "fragment",
                            values: [filter.value]
                        }
                    };
                case "match":
                    return {
                        type: "regex",
                        dimension: filter.attribute,
                        pattern: filter.expression
                    };
                case "within":
                    var range = filter.range;
                    var r0 = range[0];
                    var r1 = range[1];
                    if (typeof r0 !== "number" || typeof r1 !== "number") {
                        throw new Error("apply within has to have a numeric range");
                    }
                    return {
                        type: "javascript",
                        dimension: filter.attribute,
                        "function": "function(a) { a = Number(a); return " + r0 + " <= a && a < " + r1 + "; }"
                    };
                case "not":
                    return {
                        type: "not",
                        field: this.timelessFilterToDruid(filter.filter)
                    };
                case "and":
                case "or":
                    return {
                        type: filter.type,
                        fields: filter.filters.map(this.timelessFilterToDruid, this)
                    };
                default:
                    throw new Error("filter type '" + filter.type + "' not defined");
            }
        };
        DruidQueryBuilder.prototype.addFilter = function (filter) {
            if (filter.type === "false") {
                this.intervals = DruidQueryBuilder.FALSE_INTERVALS;
                this.filter = null;
            }
            else {
                var extract = filter.extractFilterByAttribute(this.timeAttribute);
                if (!extract) {
                    throw new Error("could not separate time filter");
                }
                var timelessFilter = extract[0];
                var timeFilter = extract[1];
                this.intervals = Legacy.driverUtil.timeFilterToIntervals(timeFilter, this.forceInterval);
                this.filter = this.timelessFilterToDruid(timelessFilter);
            }
            return this;
        };
        DruidQueryBuilder.prototype.addSplit = function (split) {
            if (!Legacy.FacetSplit.isFacetSplit(split))
                throw new TypeError('must be a split');
            switch (split.bucket) {
                case "identity":
                    this.queryType = "groupBy";
                    var attributeMeta = this.getAttributeMeta(split.attribute);
                    if (attributeMeta.type === "range") {
                        var regExp = attributeMeta.getMatchingRegExpString();
                        this.dimension = {
                            type: "extraction",
                            dimension: split.attribute,
                            outputName: split.name,
                            dimExtractionFn: {
                                type: "javascript",
                                "function": "function(d) {" + "var match = d.match(" + regExp + ");" + "if(!match) return 'null';" + "var start = +match[1], end = +match[2];" + "if(!(Math.abs(end - start - " + attributeMeta.rangeSize + ") < 1e-6)) return 'null';" + "var parts = String(Math.abs(start)).split('.');" + "parts[0] = ('000000000' + parts[0]).substr(-10);" + "return (start < 0 ?'-':'') + parts.join('.');" + "}"
                            }
                        };
                    }
                    else {
                        this.dimension = {
                            type: "default",
                            dimension: split.attribute,
                            outputName: split.name
                        };
                    }
                    break;
                case "timePeriod":
                    if (split.attribute !== this.timeAttribute) {
                        throw new Error("timePeriod split can only work on '" + this.timeAttribute + "'");
                    }
                    this.granularity = {
                        type: "period",
                        period: split.period,
                        timeZone: split.timezone
                    };
                    break;
                case "continuous":
                    attributeMeta = this.getAttributeMeta(split.attribute);
                    if (attributeMeta.type === "histogram") {
                        if (!this.approximate) {
                            throw new Error("approximate queries not allowed");
                        }
                        var aggregation = {
                            type: "approxHistogramFold",
                            fieldName: split.attribute
                        };
                        if (split.lowerLimit != null) {
                            aggregation.lowerLimit = split.lowerLimit;
                        }
                        if (split.upperLimit != null) {
                            aggregation.upperLimit = split.upperLimit;
                        }
                        var options = split.options || {};
                        if (hasOwnProperty(options, 'druidResolution')) {
                            aggregation.resolution = options['druidResolution'];
                        }
                        this.addAggregation(aggregation);
                        var tempHistogramName = 'blah';
                        this.addPostAggregation({
                            type: "buckets",
                            name: "histogram",
                            fieldName: tempHistogramName,
                            bucketSize: split.size,
                            offset: split.offset
                        });
                    }
                    else if (attributeMeta.type === "range") {
                        throw new Error("not implemented yet");
                    }
                    else {
                        var floorExpression = Legacy.driverUtil.continuousFloorExpression("d", "Math.floor", split.size, split.offset);
                        this.queryType = "groupBy";
                        this.dimension = {
                            type: "extraction",
                            dimension: split.attribute,
                            outputName: split.name,
                            dimExtractionFn: {
                                type: "javascript",
                                "function": "function(d) {\nd = Number(d);\nif(isNaN(d)) return 'null';\nreturn " + floorExpression + ";\n}"
                            }
                        };
                    }
                    break;
                case "tuple":
                    var splits = split.splits;
                    if (splits.length !== 2)
                        throw new Error("only supported tuples of size 2 (is: " + splits.length + ")");
                    this.queryType = "heatmap";
                    this.dimensions = splits.map(function (split) { return ({
                        dimension: split.attribute,
                        threshold: 10
                    }); });
                    break;
                default:
                    throw new Error("unsupported bucketing function");
            }
            return this;
        };
        DruidQueryBuilder.prototype.addAggregation = function (aggregation) {
            var aggregations = this.aggregations;
            for (var i = 0; i < aggregations.length; i++) {
                var existingAggregation = aggregations[i];
                if (existingAggregation.name === aggregation.name)
                    return;
            }
            this.aggregations.push(aggregation);
        };
        DruidQueryBuilder.prototype.addPostAggregation = function (postAggregation) {
            this.postAggregations.push(postAggregation);
        };
        DruidQueryBuilder.prototype.canUseNativeAggregateFilter = function (filter) {
            var _this = this;
            if (!filter)
                return true;
            return filter.type === 'is' || filter.type === 'in' || (filter.type === 'not' && this.canUseNativeAggregateFilter(filter.filter)) || (filter.type === 'and' && filter.filters.every(function (filter) { return _this.canUseNativeAggregateFilter(filter); })) || (filter.type === 'or' && filter.filters.every(function (filter) { return _this.canUseNativeAggregateFilter(filter); }));
        };
        DruidQueryBuilder.prototype.addAggregateApply = function (apply) {
            if (apply.attribute === this.timeAttribute)
                throw new Error("can not aggregate apply on time attribute");
            var attributeMeta = this.getAttributeMeta(apply.attribute);
            var options = apply.options || {};
            switch (apply.aggregate) {
                case "count":
                case "sum":
                case "min":
                case "max":
                    if (this.approximate && apply.aggregate[0] === "m" && attributeMeta.type === "histogram") {
                        var histogramAggregationName = "_hist_" + apply.attribute;
                        var aggregation = {
                            name: histogramAggregationName,
                            type: "approxHistogramFold",
                            fieldName: apply.attribute
                        };
                        if (hasOwnProperty(options, 'druidLowerLimit'))
                            aggregation.lowerLimit = options['druidLowerLimit'];
                        if (hasOwnProperty(options, 'druidUpperLimit'))
                            aggregation.upperLimit = options['druidUpperLimit'];
                        if (hasOwnProperty(options, 'druidResolution'))
                            aggregation.resolution = options['druidResolution'];
                        this.addAggregation(aggregation);
                        this.addPostAggregation({
                            name: apply.name,
                            type: apply.aggregate,
                            fieldName: histogramAggregationName
                        });
                    }
                    else {
                        var applyFilter = apply.filter;
                        if (applyFilter)
                            applyFilter = applyFilter.simplify();
                        if (this.canUseNativeAggregateFilter(applyFilter)) {
                            var aggregation = {
                                name: apply.name,
                                type: apply.aggregate === "sum" ? "doubleSum" : apply.aggregate
                            };
                            if (apply.aggregate !== "count") {
                                aggregation.fieldName = apply.attribute;
                            }
                            if (apply.filter) {
                                aggregation = {
                                    type: "filtered",
                                    name: apply.name,
                                    filter: this.timelessFilterToDruid(applyFilter),
                                    aggregator: aggregation
                                };
                            }
                            this.addAggregation(aggregation);
                        }
                        else {
                            var jsFilterNamespace = this.filterToJS(apply.filter);
                            var jsFilter = jsFilterNamespace.jsFilter;
                            var namespace = jsFilterNamespace.namespace;
                            var fieldNames = [];
                            var varNames = [];
                            for (var fieldName in namespace) {
                                fieldNames.push(fieldName);
                                varNames.push(namespace[fieldName]);
                            }
                            var zeroJsArg = aggregateToJS[apply.aggregate];
                            var zero = zeroJsArg[0];
                            var jsAgg = zeroJsArg[1];
                            var jsIf;
                            if (apply.aggregate === "count") {
                                jsIf = "(" + jsFilter + "?1:" + zero + ")";
                            }
                            else {
                                fieldNames.push(apply.attribute);
                                varNames.push("a");
                                jsIf = "(" + jsFilter + "?a:" + zero + ")";
                            }
                            this.addAggregation({
                                name: apply.name,
                                type: "javascript",
                                fieldNames: fieldNames,
                                fnAggregate: "function(cur," + (varNames.join(",")) + "){return " + (jsAgg("cur", jsIf)) + ";}",
                                fnCombine: "function(pa,pb){return " + (jsAgg("pa", "pb")) + ";}",
                                fnReset: "function(){return " + zero + ";}"
                            });
                        }
                    }
                    break;
                case "uniqueCount":
                    if (!this.approximate) {
                        throw new Error("approximate queries not allowed");
                    }
                    if (apply.filter) {
                        throw new Error("filtering uniqueCount unsupported by driver");
                    }
                    if (attributeMeta.type === "unique") {
                        this.addAggregation({
                            name: apply.name,
                            type: "hyperUnique",
                            fieldName: apply.attribute
                        });
                    }
                    else {
                        this.addAggregation({
                            name: apply.name,
                            type: "cardinality",
                            fieldNames: [apply.attribute],
                            byRow: true
                        });
                    }
                    break;
                case "quantile":
                    if (!this.approximate) {
                        throw new Error("approximate queries not allowed");
                    }
                    var histogramAggregationName = "_hist_" + apply.attribute;
                    var aggregation = {
                        name: histogramAggregationName,
                        type: "approxHistogramFold",
                        fieldName: apply.attribute
                    };
                    if (hasOwnProperty(options, 'druidLowerLimit'))
                        aggregation.lowerLimit = options['druidLowerLimit'];
                    if (hasOwnProperty(options, 'druidUpperLimit'))
                        aggregation.upperLimit = options['druidUpperLimit'];
                    if (hasOwnProperty(options, 'druidResolution'))
                        aggregation.resolution = options['druidResolution'];
                    this.addAggregation(aggregation);
                    this.addPostAggregation({
                        name: apply.name,
                        type: "quantile",
                        fieldName: histogramAggregationName,
                        probability: apply.quantile
                    });
                    break;
                default:
                    throw new Error("unsupported aggregate '" + apply.aggregate + "'");
            }
        };
        DruidQueryBuilder.prototype.addApplies = function (applies) {
            var _this = this;
            if (applies.length === 0) {
                this.addAggregateApply(new Legacy.CountApply({ name: "_dummy" }));
            }
            else {
                var applySimplifier = new Legacy.ApplySimplifier({
                    postProcessorScheme: druidPostProcessorScheme,
                    breakToSimple: true,
                    breakAverage: true,
                    topLevelConstant: "process"
                });
                applySimplifier.addApplies(applies);
                applySimplifier.getSimpleApplies().forEach(function (apply) { return _this.addAggregateApply(apply); });
                applySimplifier.getPostProcessors().forEach(function (postAgg) { return _this.addPostAggregation(postAgg); });
            }
            return this;
        };
        DruidQueryBuilder.prototype.addCombine = function (combine) {
            if (!Legacy.FacetCombine.isFacetCombine(combine))
                throw new TypeError('Must be a combine');
            switch (combine.method) {
                case "slice":
                    var sort = combine.sort;
                    var limit = combine.limit;
                    if (this.queryType === "groupBy") {
                        if (sort && (limit != null)) {
                            if (!this.approximate) {
                                throw new Error("can not sort and limit on without approximate");
                            }
                            this.queryType = "topN";
                            this.threshold = limit;
                            if (this.getAttributeMeta(this.dimension.dimension).type === "large") {
                                this.context.doAggregateTopNMetricFirst = true;
                            }
                            if (sort.prop === this.dimension.outputName) {
                                if (sort.direction === "ascending") {
                                    this.metric = {
                                        type: "lexicographic"
                                    };
                                }
                                else {
                                    this.metric = {
                                        type: "inverted",
                                        metric: {
                                            type: "lexicographic"
                                        }
                                    };
                                }
                            }
                            else {
                                if (sort.direction === "descending") {
                                    this.metric = sort.prop;
                                }
                                else {
                                    this.metric = {
                                        type: "inverted",
                                        metric: sort.prop
                                    };
                                }
                            }
                        }
                        else if (sort) {
                            if (sort.prop !== this.dimension.outputName) {
                                throw new Error("can not do an unlimited sort on an apply");
                            }
                        }
                        else if (limit != null) {
                            throw new Error("handle this better");
                        }
                    }
                    break;
                case "matrix":
                    sort = combine.sort;
                    if (sort) {
                        if (sort.direction === "descending") {
                            this.metric = sort.prop;
                        }
                        else {
                            throw new Error("not supported yet");
                        }
                    }
                    var limits = combine.limits;
                    if (limits) {
                        var dimensions = this.dimensions;
                        for (var i = 0; i < dimensions.length; i++) {
                            var dim = dimensions[i];
                            if (limits[i] != null) {
                                dim.threshold = limits[i];
                            }
                        }
                    }
                    break;
                default:
                    throw new Error("unsupported method '" + combine.method + "'");
            }
            return this;
        };
        DruidQueryBuilder.prototype.hasContext = function () {
            return Boolean(Object.keys(this.context).length);
        };
        DruidQueryBuilder.prototype.getQuery = function () {
            var query = {
                queryType: this.queryType,
                dataSource: this.dataSource,
                granularity: this.granularity,
                intervals: this.intervals
            };
            if (this.hasContext()) {
                query.context = this.context;
            }
            if (this.filter) {
                query.filter = this.filter;
            }
            if (this.dimension) {
                if (this.queryType === "groupBy") {
                    query.dimensions = [this.dimension];
                }
                else {
                    query.dimension = this.dimension;
                }
            }
            else if (this.dimensions) {
                query.dimensions = this.dimensions;
            }
            if (this.aggregations.length) {
                query.aggregations = this.aggregations;
            }
            if (this.postAggregations.length) {
                query.postAggregations = this.postAggregations;
            }
            if (this.metric) {
                query.metric = this.metric;
            }
            if (this.threshold) {
                query.threshold = this.threshold;
            }
            return query;
        };
        DruidQueryBuilder.ALL_DATA_CHUNKS = 10000;
        DruidQueryBuilder.FALSE_INTERVALS = ["1000-01-01/1000-01-02"];
        return DruidQueryBuilder;
    })();
    Legacy.DruidQueryBuilder = DruidQueryBuilder;
    DruidQueryBuilder.queryFns = {
        all: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            try {
                queryBuilder.addFilter(filter).addApplies(condensedCommand.applies);
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (!correctSingletonDruidResult(ds)) {
                    var err = new Error("unexpected result from Druid (all)");
                    err.result = ds;
                    callback(err);
                    return;
                }
                if (emptySingletonDruidResult(ds)) {
                    callback(null, [condensedCommand.getZeroProp()]);
                }
                else {
                    var result = ds[0].result;
                    if (Array.isArray(result) && !result.length)
                        result = null;
                    callback(null, [result || condensedCommand.getZeroProp()]);
                }
            }, function (err) { return callback(err); });
        },
        timeBoundary: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            var applies = condensedCommand.applies;
            if (!applies.every(function (apply) {
                var aggregate = apply.aggregate;
                return apply.attribute === queryBuilder.timeAttribute && (aggregate === "min" || aggregate === "max");
            })) {
                callback(new Error("can not mix and match min / max time with other aggregates (for now)"));
                return;
            }
            var queryObj = {
                queryType: "timeBoundary",
                dataSource: queryBuilder.dataSource
            };
            if (queryBuilder.hasContext()) {
                queryObj.context = queryBuilder.context;
            }
            var maxTimeOnly = applies.length === 1 && applies[0].aggregate === "max";
            if (maxTimeOnly) {
                queryObj.queryType = "maxTime";
                if (queryBuilder.useDataSourceMetadata) {
                    queryObj.queryType = "dataSourceMetadata";
                }
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (!correctSingletonDruidResult(ds) || ds.length !== 1) {
                    var err = new Error("unexpected result from Druid (" + queryObj.queryType + ")");
                    err.result = ds;
                    callback(err);
                    return;
                }
                var result = ds[0].result;
                var prop = {};
                for (var i = 0; i < applies.length; i++) {
                    var apply = applies[i];
                    var name = apply.name;
                    var aggregate = apply.aggregate;
                    if (maxTimeOnly) {
                        prop[name] = (new Date(queryBuilder.useDataSourceMetadata ? result.maxIngestedEventTime : result));
                    }
                    else {
                        prop[name] = (new Date(result[aggregate + "Time"]));
                    }
                }
                callback(null, [prop]);
            }, function (err) { return callback(err); });
        },
        timeseries: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            try {
                queryBuilder.addFilter(filter).addSplit(condensedCommand.split).addApplies(condensedCommand.applies);
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (!Array.isArray(ds)) {
                    var err = new Error("unexpected result from Druid (timeseries)");
                    err.result = ds;
                    callback(err);
                    return;
                }
                var split = (condensedCommand.split);
                var timePropName = split.name;
                var timezone = split.timezone;
                var splitDuration = split.period;
                var warp = split.warp;
                var warpDirection = split.warpDirection;
                var canonicalDurationLengthAndThenSome = splitDuration.getCanonicalLength() * 1.5;
                var props = ds.map(function (d, i) {
                    var rangeStart = new Date(d.timestamp);
                    var next = ds[i + 1];
                    if (next) {
                        next = new Date(next.timestamp);
                    }
                    var rangeEnd = (next && rangeStart.valueOf() < next.valueOf() && next.valueOf() - rangeStart.valueOf() < canonicalDurationLengthAndThenSome) ? next : splitDuration.move(rangeStart, timezone, 1);
                    if (warp) {
                        rangeStart = warp.move(rangeStart, timezone, warpDirection);
                        rangeEnd = warp.move(rangeEnd, timezone, warpDirection);
                    }
                    var prop = d.result;
                    prop[timePropName] = [rangeStart, rangeEnd];
                    return prop;
                });
                var combine = (condensedCommand.getCombine());
                if (combine.sort) {
                    if (combine.sort.prop === timePropName) {
                        if (combine.sort.direction === "descending") {
                            props.reverse();
                        }
                    }
                    else {
                        props.sort(combine.sort.getCompareFn());
                    }
                }
                if (combine.limit != null) {
                    var limit = combine.limit;
                    Legacy.driverUtil.inPlaceTrim(props, limit);
                }
                callback(null, props);
            }, function (err) { return callback(err); });
        },
        topN: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            var split = condensedCommand.getSplit();
            try {
                queryBuilder.addFilter(filter).addSplit(split).addApplies(condensedCommand.applies).addCombine(condensedCommand.getCombine());
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (err) {
                    callback(err);
                    return;
                }
                if (!correctSingletonDruidResult(ds)) {
                    var err = new Error("unexpected result from Druid (topN)");
                    err.result = ds;
                    callback(err);
                    return;
                }
                ds = emptySingletonDruidResult(ds) ? [] : ds[0].result;
                var attributeMeta = queryBuilder.getAttributeMeta(split.attribute);
                if (attributeMeta.type === "range") {
                    var splitProp = split.name;
                    var rangeSize = attributeMeta.rangeSize;
                    ds.forEach(function (d) {
                        if (String(d[splitProp]) === "null") {
                            d[splitProp] = null;
                        }
                        else {
                            var start = Number(d[splitProp]);
                            d[splitProp] = [start, Legacy.driverUtil.safeAdd(start, rangeSize)];
                        }
                    });
                }
                else if (split.bucket === "continuous") {
                    splitProp = split.name;
                    var splitSize = split.size;
                    ds.forEach(function (d) {
                        if (String(d[splitProp]) === "null") {
                            d[splitProp] = null;
                        }
                        else {
                            var start = Number(d[splitProp]);
                            d[splitProp] = [start, Legacy.driverUtil.safeAdd(start, splitSize)];
                        }
                    });
                }
                callback(null, ds);
            }, function (err) { return callback(err); });
        },
        allData: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            var allDataChunks = DruidQueryBuilder.ALL_DATA_CHUNKS;
            var combine = condensedCommand.getCombine();
            try {
                queryBuilder.addFilter(filter).addSplit(condensedCommand.split).addApplies(condensedCommand.applies).addCombine(Legacy.SliceCombine.fromJS({
                    sort: {
                        compare: "natural",
                        prop: condensedCommand.split.name,
                        direction: combine.sort.direction || "ascending"
                    },
                    limit: allDataChunks
                }));
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            var props = [];
            var done = false;
            queryObj.metric.previousStop = null;
            async.whilst(function () { return !done; }, function (callback) {
                requester({
                    query: queryObj
                }).then(function (ds) {
                    if (!correctSingletonDruidResult(ds)) {
                        var err = new Error("unexpected result from Druid (topN/allData)");
                        err.result = ds;
                        callback(err);
                        return;
                    }
                    var myProps = emptySingletonDruidResult(ds) ? [] : ds[0].result;
                    props = props.concat(myProps);
                    if (myProps.length < allDataChunks) {
                        done = true;
                    }
                    else {
                        queryObj.metric.previousStop = myProps[allDataChunks - 1][condensedCommand.split.name];
                    }
                    return callback();
                }, function (err) { return callback(err); });
            }, function (err) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, props.length ? props : null);
            });
        },
        groupBy: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            try {
                queryBuilder.addFilter(filter).addSplit(condensedCommand.split).addApplies(condensedCommand.applies).addCombine(condensedCommand.getCombine());
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                callback(null, ds.map(function (d) { return d.event; }));
            }, function (err) { return callback(err); });
        },
        histogram: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            if (!condensedCommand.applies.every(function (apply) { return apply.aggregate === "count"; })) {
                callback(new Error("only count aggregated applies are supported"));
                return;
            }
            try {
                queryBuilder.addFilter(filter).addSplit(condensedCommand.split);
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (!correctSingletonDruidResult(ds)) {
                    var err = new Error("unexpected result from Druid (histogram)");
                    err.result = ds;
                    callback(err);
                    return;
                }
                if (emptySingletonDruidResult(ds)) {
                    callback(null, null);
                    return;
                }
                if (!ds[0].result || !ds[0].result.histogram) {
                    callback(new Error("invalid histogram result"), null);
                    return;
                }
                var histData = ds[0].result.histogram;
                var breaks = histData.breaks;
                var counts = histData.counts;
                var histName = condensedCommand.split.name;
                var countName = condensedCommand.applies[0].name;
                var props = [];
                for (var i = 0; i < counts.length; i++) {
                    var count = counts[i];
                    if (count === 0)
                        continue;
                    var range = [breaks[i], breaks[i + 1]];
                    var prop = {};
                    prop[histName] = range;
                    prop[countName] = count;
                    props.push(prop);
                }
                var combine = (condensedCommand.getCombine());
                if (combine.sort) {
                    if (combine.sort.prop === histName) {
                        if (combine.sort.direction === "descending") {
                            props.reverse();
                        }
                    }
                    else {
                        props.sort(combine.sort.getCompareFn());
                    }
                }
                if (combine.limit != null) {
                    Legacy.driverUtil.inPlaceTrim(props, combine.limit);
                }
                callback(null, props);
            }, function (err) { return callback(err); });
        },
        heatmap: function (parameters, callback) {
            var requester = parameters.requester;
            var queryBuilder = parameters.queryBuilder;
            var filter = parameters.filter;
            var condensedCommand = parameters.condensedCommand;
            try {
                queryBuilder.addFilter(filter).addSplit(condensedCommand.split).addApplies(condensedCommand.applies).addCombine(condensedCommand.getCombine());
                var queryObj = queryBuilder.getQuery();
            }
            catch (error) {
                callback(error);
                return;
            }
            requester({
                query: queryObj
            }).then(function (ds) {
                if (!correctSingletonDruidResult(ds)) {
                    var err = new Error("unexpected result from Druid (heatmap)");
                    err.result = ds;
                    callback(err);
                    return;
                }
                if (emptySingletonDruidResult(ds)) {
                    callback(null, null);
                    return;
                }
                var dimensionRenameNeeded = false;
                var dimensionRenameMap = {};
                var splits = (condensedCommand.split).splits;
                for (var i = 0; i < splits.length; i++) {
                    var split = splits[i];
                    if (split.name === split.attribute)
                        continue;
                    dimensionRenameMap[split.attribute] = split.name;
                    dimensionRenameNeeded = true;
                }
                var props = ds[0].result;
                if (dimensionRenameNeeded) {
                    props.forEach(function (prop) {
                        for (var v = 0; v < props.length; v++) {
                            var k = props[v];
                            var renameTo = dimensionRenameMap[k];
                            if (renameTo) {
                                props[renameTo] = v;
                            }
                        }
                    });
                }
                callback(null, props);
            }, function (err) { return callback(err); });
        }
    };
    function splitUpCondensedCommand(condensedCommand) {
        var datasets = condensedCommand.getDatasets();
        var combine = condensedCommand.getCombine();
        var perDatasetInfo = [];
        if (datasets.length <= 1) {
            if (datasets.length) {
                perDatasetInfo.push({
                    dataset: datasets[0],
                    condensedCommand: condensedCommand
                });
            }
            return {
                postProcessors: [],
                perDatasetInfo: perDatasetInfo
            };
        }
        for (var i = 0; i < datasets.length; i++) {
            var dataset = datasets[i];
            var datasetSplit = null;
            if (condensedCommand.split) {
                var splitName = condensedCommand.split.name;
                var _ref2 = condensedCommand.split.splits;
                for (var j = 0; j < _ref2.length; j++) {
                    var subSplit = _ref2[j];
                    if (subSplit.getDataset() !== dataset) {
                        continue;
                    }
                    datasetSplit = subSplit.addName(splitName);
                    break;
                }
            }
            var datasetCondensedCommand = new Legacy.CondensedCommand();
            if (datasetSplit) {
                datasetCondensedCommand.setSplit(datasetSplit);
            }
            perDatasetInfo.push({
                dataset: dataset,
                condensedCommand: datasetCondensedCommand
            });
        }
        var applySimplifier = new Legacy.ApplySimplifier({
            postProcessorScheme: Legacy.ApplySimplifier.JS_POST_PROCESSOR_SCHEME
        });
        applySimplifier.addApplies(condensedCommand.applies);
        var appliesByDataset = applySimplifier.getSimpleAppliesByDataset();
        var sortApplyComponents = applySimplifier.getApplyComponents(combine && combine.sort ? combine.sort.prop : null);
        perDatasetInfo.forEach(function (info) {
            var applies = appliesByDataset[info.dataset] || [];
            return applies.map(function (apply) { return info.condensedCommand.addApply(apply); });
        });
        if (combine) {
            var sort = combine.sort;
            if (sort) {
                splitName = condensedCommand.split.name;
                if (sortApplyComponents.length === 0) {
                    perDatasetInfo.forEach(function (info) { return info.condensedCommand.setCombine(combine); });
                }
                else if (sortApplyComponents.length === 1) {
                    var mainDataset = sortApplyComponents[0].getDataset();
                    perDatasetInfo.forEach(function (info) {
                        if (info.dataset === mainDataset) {
                            return info.condensedCommand.setCombine(combine);
                        }
                        else {
                            info.driven = true;
                            return info.condensedCommand.setCombine(Legacy.SliceCombine.fromJS({
                                sort: {
                                    compare: "natural",
                                    direction: "descending",
                                    prop: splitName
                                },
                                limit: combine.limit
                            }));
                        }
                    });
                }
                else {
                    perDatasetInfo.forEach(function (info) {
                        var infoApply = Legacy.driverUtil.find(sortApplyComponents, function (apply) { return apply.getDataset() === info.dataset; });
                        if (infoApply) {
                            var sortProp = infoApply.name;
                        }
                        else {
                            sortProp = splitName;
                            info.driven = true;
                        }
                        return info.condensedCommand.setCombine(Legacy.SliceCombine.fromJS({
                            sort: {
                                compare: "natural",
                                direction: "descending",
                                prop: sortProp
                            },
                            limit: 1000
                        }));
                    });
                }
            }
            else {
                null;
            }
        }
        else {
            null;
        }
        return {
            postProcessors: applySimplifier.getPostProcessors(),
            perDatasetInfo: perDatasetInfo
        };
    }
    function multiDatasetQuery(parameters, callback) {
        var requester = parameters.requester;
        var parentSegment = parameters.parentSegment;
        var condensedCommand = parameters.condensedCommand;
        var builderSettings = parameters.builderSettings;
        var datasets = condensedCommand.getDatasets();
        var split = condensedCommand.getSplit();
        var combine = condensedCommand.getCombine();
        if (datasets.length === 0) {
            callback(null, [{}]);
            return;
        }
        if (datasets.length === 1) {
            DruidQueryBuilder.makeSingleQuery({
                parentSegment: parentSegment,
                filter: parentSegment.meta['filtersByDataset'][datasets[0]],
                condensedCommand: condensedCommand,
                queryBuilder: new DruidQueryBuilder(builderSettings),
                requester: requester
            }, callback);
            return;
        }
        var splitUp = splitUpCondensedCommand(condensedCommand);
        var postProcessors = splitUp.postProcessors;
        var perDatasetInfo = splitUp.perDatasetInfo;
        function performApplyCombine(result) {
            postProcessors.forEach(function (postProcessor) { return result.forEach(postProcessor); });
            if (combine) {
                if (combine.sort) {
                    result.sort(combine.sort.getCompareFn());
                }
                var limit = combine.limit;
                if (limit != null) {
                    Legacy.driverUtil.inPlaceTrim(result, limit);
                }
            }
        }
        var hasDriven = false;
        var allApplyNames = [];
        perDatasetInfo.forEach(function (info) {
            hasDriven || (hasDriven = info.driven);
            return info.condensedCommand.applies.map(function (apply) { return allApplyNames.push(apply.name); });
        });
        var driverQueries = Legacy.driverUtil.filterMap(perDatasetInfo, function (info) {
            if (info.driven)
                return;
            return function (callback) { return DruidQueryBuilder.makeSingleQuery({
                parentSegment: parentSegment,
                filter: parentSegment.meta['filtersByDataset'][info.dataset],
                condensedCommand: info.condensedCommand,
                queryBuilder: new DruidQueryBuilder(builderSettings),
                requester: requester
            }, callback); };
        });
        async.parallel(driverQueries, function (err, driverResults) {
            if (err) {
                callback(err);
                return;
            }
            var driverResult = Legacy.driverUtil.joinResults(split ? [split.name] : [], allApplyNames, driverResults);
            if (hasDriven && split) {
                var splitName = split.name;
                var drivenQueries = Legacy.driverUtil.filterMap(perDatasetInfo, function (info) {
                    if (!info.driven)
                        return;
                    if (info.condensedCommand.split.bucket !== "identity") {
                        throw new Error("This (" + split.bucket + ") split not implemented yet");
                    }
                    var driverFilter = new Legacy.InFilter({
                        attribute: info.condensedCommand.split.attribute,
                        values: (driverResult.map(function (prop) { return prop[splitName]; }))
                    });
                    return function (callback) {
                        DruidQueryBuilder.makeSingleQuery({
                            parentSegment: parentSegment,
                            filter: new Legacy.AndFilter([parentSegment.meta['filtersByDataset'][info.dataset], driverFilter]),
                            condensedCommand: info.condensedCommand,
                            queryBuilder: new DruidQueryBuilder(builderSettings),
                            requester: requester
                        }, callback);
                    };
                });
                async.parallel(drivenQueries, function (err, drivenResults) {
                    var fullResult = Legacy.driverUtil.joinResults([splitName], allApplyNames, [driverResult].concat(drivenResults));
                    performApplyCombine(fullResult);
                    callback(null, fullResult);
                });
            }
            else {
                performApplyCombine(driverResult);
                callback(null, driverResult);
            }
        });
    }
    function druidDriver(parameters) {
        var requester = parameters.requester;
        var dataSource = parameters.dataSource;
        var timeAttribute = parameters.timeAttribute || "timestamp";
        var attributeMetas = parameters.attributeMetas || {};
        var approximate = Boolean(parameters.approximate);
        var useDataSourceMetadata = Boolean(parameters.useDataSourceMetadata);
        var filter = parameters.filter;
        var forceInterval = parameters.forceInterval;
        var concurrentQueryLimit = parameters.concurrentQueryLimit || 16;
        var queryLimit = parameters.queryLimit || Infinity;
        if (typeof requester !== "function") {
            throw new Error("must have a requester");
        }
        for (var k in attributeMetas) {
            if (!Legacy.AttributeMeta.isAttributeMeta(attributeMetas[k])) {
                throw new TypeError("`attributeMeta` for attribute '" + k + "' must be an AttributeMeta");
            }
        }
        var queriesMade = 0;
        var driver = function (request) {
            var deferred = Q.defer();
            if (!request) {
                deferred.reject(new Error("request not supplied"));
                return deferred.promise;
            }
            var context = request.context || {};
            var query = request.query;
            if (!query) {
                deferred.reject(new Error("query not supplied"));
                return deferred.promise;
            }
            if (!Legacy.FacetQuery.isFacetQuery(query)) {
                deferred.reject(new TypeError("query must be a FacetQuery"));
                return deferred.promise;
            }
            var init = true;
            var rootSegment = new Legacy.SegmentTree({
                prop: {}
            }, { filtersByDataset: query.getFiltersByDataset(filter) });
            var segments = [rootSegment];
            var condensedGroups = query.getCondensedCommands();
            function queryDruid(condensedCommand, lastCmd, callback) {
                if (condensedCommand.split && condensedCommand.split.segmentFilter) {
                    var segmentFilterFn = condensedCommand.split.segmentFilter.getFilterFn();
                    Legacy.driverUtil.inPlaceFilter(segments, segmentFilterFn);
                }
                async.mapLimit(segments, concurrentQueryLimit, function (parentSegment, callback) {
                    queriesMade++;
                    if (queryLimit < queriesMade) {
                        var err = new Error("query limit exceeded");
                        err.limit = queryLimit;
                        callback(err);
                        return;
                    }
                    multiDatasetQuery({
                        requester: requester,
                        builderSettings: {
                            dataSource: dataSource,
                            timeAttribute: timeAttribute,
                            attributeMetas: attributeMetas,
                            forceInterval: forceInterval,
                            approximate: approximate,
                            useDataSourceMetadata: useDataSourceMetadata,
                            context: context
                        },
                        parentSegment: parentSegment,
                        condensedCommand: condensedCommand
                    }, function (err, props) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        if (props === null) {
                            callback(null, null);
                            return;
                        }
                        if (condensedCommand.split) {
                            var propToSplit = lastCmd ? function (prop) {
                                return new Legacy.SegmentTree({ prop: prop });
                            } : function (prop) {
                                return new Legacy.SegmentTree({
                                    prop: prop
                                }, {
                                    filtersByDataset: Legacy.FacetFilter.andFiltersByDataset(parentSegment.meta['filtersByDataset'], condensedCommand.split.getFilterByDatasetFor(prop))
                                });
                            };
                            parentSegment.setSplits(props.map(propToSplit));
                        }
                        else {
                            var newSegmentTree = new Legacy.SegmentTree({
                                prop: props[0]
                            }, {
                                filtersByDataset: parentSegment.meta['filtersByDataset']
                            });
                            parentSegment.setSplits([newSegmentTree]);
                        }
                        callback(null, parentSegment.splits);
                    });
                }, function (err, results) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (results.some(function (result) { return result === null; })) {
                        rootSegment = null;
                    }
                    else {
                        segments = Legacy.driverUtil.flatten(results);
                        if (init) {
                            rootSegment = segments[0];
                            init = false;
                        }
                    }
                    callback();
                });
            }
            var cmdIndex = 0;
            async.whilst(function () { return cmdIndex < condensedGroups.length && rootSegment; }, function (callback) {
                var condensedGroup = condensedGroups[cmdIndex];
                cmdIndex++;
                var last = cmdIndex === condensedGroups.length;
                queryDruid(condensedGroup, last, callback);
            }, function (err) {
                if (err) {
                    deferred.reject(err);
                    return;
                }
                deferred.resolve((rootSegment || new Legacy.SegmentTree({})).selfClean());
            });
            return deferred.promise;
        };
        driver.introspect = function (opts) {
            return requester({
                query: {
                    queryType: "introspect",
                    dataSource: Array.isArray(dataSource) ? dataSource[0] : dataSource
                }
            }).then(function (ret) {
                var attributes = [{
                    name: timeAttribute,
                    time: true
                }];
                ret.dimensions.sort().forEach(function (dimension) {
                    attributes.push({
                        name: dimension,
                        categorical: true
                    });
                });
                var metrics = ret.metrics.sort();
                for (var i = 0; i < metrics.length; i++) {
                    var metric = metrics[i];
                    if (metric.indexOf("_hist") !== -1 || metric.indexOf("unique_") === 0) {
                        continue;
                    }
                    attributes.push({
                        name: metric,
                        numeric: true
                    });
                }
                return attributes;
            });
        };
        return driver;
    }
    Legacy.druidDriver = druidDriver;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var LRUCache = (function () {
        function LRUCache(parameters) {
            this.name = parameters.name || "nameless";
            this.keepFor = parameters.keepFor || (30 * 60 * 1000);
            this.currentTime = parameters.currentTime || (function () { return Date.now(); });
            if (typeof this.keepFor !== "number") {
                throw new TypeError("keepFor must be a number");
            }
            if (this.keepFor < 5 * 60 * 1000) {
                throw new Error("must keep for at least 5 minutes");
            }
            this.clear();
        }
        LRUCache.prototype.clear = function () {
            this.store = {};
            this.size = 0;
        };
        LRUCache.prototype.tidy = function () {
            var trimBefore = this.currentTime() - this.keepFor;
            var store = this.store;
            for (var hash in store) {
                var slot = store[hash];
                if (trimBefore <= slot.time)
                    continue;
                delete store[hash];
                this.size--;
            }
        };
        LRUCache.prototype.get = function (hash) {
            if (hasOwnProperty(this.store, hash)) {
                var storeSlot = this.store[hash];
                storeSlot.time = this.currentTime();
                return storeSlot.value;
            }
            else {
                return null;
            }
        };
        LRUCache.prototype.set = function (hash, value) {
            if (!hasOwnProperty(this.store, hash)) {
                this.size++;
            }
            this.store[hash] = {
                value: value,
                time: this.currentTime()
            };
        };
        LRUCache.prototype.getOrCreate = function (hash, createFn) {
            var ret = this.get(hash);
            if (!ret) {
                ret = createFn();
                this.set(hash, ret);
            }
            return ret;
        };
        LRUCache.prototype.toString = function () {
            return "[" + this.name + " cache, size: " + this.size + "]";
        };
        LRUCache.prototype.debug = function () {
            console.log(this.name + " cache");
            console.log("Size: " + this.size);
            var store = this.store;
            for (var hash in store) {
                var slot = store[hash];
                console.log(hash, JSON.stringify(slot));
            }
        };
        return LRUCache;
    })();
    var applySimplifierSettings = {
        namePrefix: "c_S",
        breakToSimple: true,
        topLevelConstant: "process",
        postProcessorScheme: Legacy.ApplySimplifier.JS_POST_PROCESSOR_SCHEME
    };
    function filterToHash(filter) {
        return filter.simplify().toHash();
    }
    function filterSplitToHash(datasetMap, filter, split) {
        var splits = split.bucket === "parallel" ? split.splits : [split];
        return splits.map(function (split) {
            var dataset = datasetMap[split.getDataset()];
            var andFilter = new Legacy.AndFilter([dataset.getFilter(), filter]);
            var extract = andFilter.extractFilterByAttribute(split.attribute);
            if (extract) {
                return dataset.source + "#" + (filterToHash(extract[0])) + "//" + (split.toHash());
            }
            else {
                return dataset.source + "#BAD//" + (split.toHash());
            }
        }).sort().join("*");
    }
    function applyToHash(apply, filter, datasetMap) {
        var dataset = datasetMap[apply.getDataset()];
        if (!dataset) {
            throw new Error("Something went wrong: could not find apply dataset");
        }
        var datasetFilter = dataset.getFilter();
        return {
            name: apply.name,
            apply: apply,
            applyHash: apply.toHash(),
            segmentHash: dataset.source + "#" + filterToHash(new Legacy.AndFilter([filter, datasetFilter]))
        };
    }
    function appliesToHashes(simpleApplies, filter, datasetMap) {
        return simpleApplies.map(function (apply) { return applyToHash(apply, filter, datasetMap); });
    }
    function makeDatasetMap(query) {
        var datasets = query.getDatasets();
        var map = {};
        datasets.forEach(function (dataset) { return map[dataset.name] = dataset; });
        return map;
    }
    function betterThanExistingSlot(sortSlot, givenFilter, givenCombine, givenSplitValues) {
        if (!sortSlot) {
            return true;
        }
        var givenComplete = givenCombine.limit != null ? givenSplitValues.length < givenCombine.limit : true;
        if (!sortSlot.splitValues) {
            return true;
        }
        if (!Legacy.FacetFilter.filterSubset(sortSlot.filter, givenFilter)) {
            return false;
        }
        return !sortSlot.complete || givenComplete;
    }
    function canServeFromSlot(sortSlot, givenFilter, givenCombine) {
        if (!(sortSlot && Legacy.FacetFilter.filterSubset(givenFilter, sortSlot.filter))) {
            return false;
        }
        if (sortSlot.complete) {
            return true;
        }
        if (!givenCombine.limit) {
            return false;
        }
        return givenCombine.limit <= sortSlot.limit;
    }
    function getFilteredValuesFromSlot(sortSlot, split, myFilter) {
        if (myFilter.type === "true") {
            return sortSlot.splitValues.slice();
        }
        var splitAttribute = split.attribute;
        var filterFn = myFilter.getFilterFn();
        return sortSlot.splitValues.filter(function (splitValue) {
            var row = {};
            row[splitAttribute] = splitValue;
            return filterFn(row);
        });
    }
    function isCompleteInput(givenFilter, givenCombine, givenSplitValues) {
        if (givenFilter.type !== "true") {
            return false;
        }
        if (givenCombine.limit != null) {
            return givenSplitValues.length < givenCombine.limit;
        }
        else {
            return true;
        }
    }
    function getRealSplit(split) {
        if (split.bucket === "parallel") {
            return split.splits[0];
        }
        else {
            return split;
        }
    }
    var IdentityCombineToSplitValues = (function () {
        function IdentityCombineToSplitValues() {
            this.bySort = {};
        }
        IdentityCombineToSplitValues.prototype.set = function (filter, condensedCommand, splitValues) {
            var split = getRealSplit(condensedCommand.split);
            var combine = (condensedCommand.combine);
            var filterExtract = filter.extractFilterByAttribute(split.attribute);
            if (!filterExtract)
                return;
            var myFilter = filterExtract[1];
            var sortHash = condensedCommand.getSortHash();
            var sortSlot = this.bySort[sortHash];
            if (betterThanExistingSlot(sortSlot, myFilter, combine, splitValues)) {
                sortSlot = {
                    filter: myFilter,
                    splitValues: splitValues
                };
                if (isCompleteInput(myFilter, combine, splitValues)) {
                    sortSlot.complete = true;
                }
                else {
                    sortSlot.limit = combine.limit;
                }
                this.bySort[sortHash] = sortSlot;
            }
        };
        IdentityCombineToSplitValues.prototype._findComplete = function () {
            var mySort = this.bySort;
            for (var k in mySort) {
                var slot = mySort[k];
                if (slot.complete)
                    return slot;
            }
            return null;
        };
        IdentityCombineToSplitValues.prototype.get = function (filter, condensedCommand, flags) {
            var split = getRealSplit(condensedCommand.split);
            var combine = (condensedCommand.combine);
            var filterExtract = filter.extractFilterByAttribute(split.attribute);
            if (!filterExtract) {
                flags.fullQuery = true;
                return null;
            }
            var myFilter = filterExtract[1];
            var sortHash = condensedCommand.getSortHash();
            var sortSlot = this.bySort[sortHash];
            if (canServeFromSlot(sortSlot, filter, combine)) {
                var filteredSplitValues = getFilteredValuesFromSlot(sortSlot, split, myFilter);
                if (sortSlot.complete || combine.limit <= filteredSplitValues.length) {
                    Legacy.driverUtil.inPlaceTrim(filteredSplitValues, combine.limit);
                    return filteredSplitValues;
                }
                else {
                    flags.fullQuery = true;
                    return filteredSplitValues;
                }
            }
            else {
                var completeSlot = this._findComplete();
                if (!completeSlot) {
                    return null;
                }
                return getFilteredValuesFromSlot(completeSlot, split, myFilter);
            }
        };
        return IdentityCombineToSplitValues;
    })();
    Legacy.IdentityCombineToSplitValues = IdentityCombineToSplitValues;
    var TimePeriodCombineToSplitValues = (function () {
        function TimePeriodCombineToSplitValues() {
            this.bySort = {};
        }
        TimePeriodCombineToSplitValues.prototype._getAllPossibleSplitValues = function (myFilter, split) {
            var range = myFilter.range;
            var start = range[0];
            var end = range[1];
            var duration = split.period;
            var timezone = split.timezone;
            var iter = duration.floor(start, timezone);
            var splitValues = [];
            var next = duration.move(iter, timezone, 1);
            while (next <= end) {
                splitValues.push([iter, next]);
                iter = next;
                next = duration.move(iter, timezone, 1);
            }
            return splitValues;
        };
        TimePeriodCombineToSplitValues.prototype._calculateKnownUnknowns = function (possibleSplitValues, splitValues) {
            var hasSplitValue = {};
            for (var i = 0; i < splitValues.length; i++) {
                var splitValue = splitValues[i];
                if (!splitValue)
                    continue;
                hasSplitValue[splitValue[0].toISOString()] = 1;
            }
            var knownUnknowns = {};
            possibleSplitValues.forEach(function (possibleSplitValue) {
                var possibleSplitValueKey = possibleSplitValue[0].toISOString();
                if (!hasSplitValue[possibleSplitValueKey]) {
                    return knownUnknowns[possibleSplitValueKey] = 1;
                }
            });
            this.knownUnknowns = knownUnknowns;
        };
        TimePeriodCombineToSplitValues.prototype._getPossibleKnownSplitValues = function (myFilter, split) {
            var splitValues = this._getAllPossibleSplitValues(myFilter, split);
            if (this.knownUnknowns) {
                var knownUnknowns = this.knownUnknowns;
                Legacy.driverUtil.inPlaceFilter(splitValues, function (splitValue) { return !knownUnknowns[splitValue[0].toISOString()]; });
            }
            return splitValues;
        };
        TimePeriodCombineToSplitValues.prototype._makeRange = function (split, splitValues) {
            var duration = split.period;
            var timezone = split.timezone;
            return splitValues.map(function (splitValue) { return [splitValue, duration.move(splitValue, timezone, 1)]; });
        };
        TimePeriodCombineToSplitValues.prototype.set = function (filter, condensedCommand, splitValues) {
            var split = getRealSplit(condensedCommand.split);
            var combine = (condensedCommand.combine);
            var filterExtract = filter.extractFilterByAttribute(split.attribute);
            if (!filterExtract)
                return;
            var myFilter = filterExtract[1];
            if (myFilter.type !== "within")
                return;
            var sort = combine.sort;
            if (sort.prop === split.name) {
                if (combine.limit != null) {
                    return;
                }
                var possibleSplitValues = this._getAllPossibleSplitValues(myFilter, split);
                if (splitValues.length >= possibleSplitValues.length)
                    return;
                this._calculateKnownUnknowns(possibleSplitValues, splitValues);
            }
            else {
                var sortHash = condensedCommand.getSortHash();
                var sortSlot = this.bySort[sortHash];
                if (betterThanExistingSlot(sortSlot, myFilter, combine, splitValues)) {
                    sortSlot = {
                        filter: myFilter,
                        splitValues: splitValues.map(function (parameters) {
                            var start = parameters[0];
                            return start;
                        })
                    };
                    if (isCompleteInput(myFilter, combine, splitValues)) {
                        sortSlot.complete = true;
                    }
                    else {
                        sortSlot.limit = combine.limit;
                    }
                    this.bySort[sortHash] = sortSlot;
                }
            }
        };
        TimePeriodCombineToSplitValues.prototype.get = function (filter, condensedCommand, flags) {
            var split = getRealSplit(condensedCommand.split);
            var combine = (condensedCommand.combine);
            var filterExtract = filter.extractFilterByAttribute(split.attribute);
            if (!filterExtract) {
                flags.fullQuery = true;
                return null;
            }
            var myFilter = filterExtract[1];
            if (myFilter.type !== "within") {
                flags.fullQuery = true;
                return null;
            }
            var sort = combine.sort;
            if (sort.prop === split.name) {
                var splitValues = this._getPossibleKnownSplitValues(myFilter, split);
                if (sort.direction === "descending") {
                    splitValues.reverse();
                }
                if (combine.limit != null) {
                    Legacy.driverUtil.inPlaceTrim(splitValues, combine.limit);
                }
                return splitValues;
            }
            else {
                var sortHash = condensedCommand.getSortHash();
                var sortSlot = this.bySort[sortHash];
                if (canServeFromSlot(sortSlot, filter, combine)) {
                    var filteredSplitValues = getFilteredValuesFromSlot(sortSlot, split, myFilter);
                    if ((combine.limit != null) && combine.limit <= filteredSplitValues.length) {
                        Legacy.driverUtil.inPlaceTrim(filteredSplitValues, combine.limit);
                    }
                    else {
                        flags.fullQuery = true;
                    }
                    return this._makeRange(split, filteredSplitValues);
                }
                else {
                    return this._getPossibleKnownSplitValues(myFilter, split);
                }
            }
        };
        return TimePeriodCombineToSplitValues;
    })();
    Legacy.TimePeriodCombineToSplitValues = TimePeriodCombineToSplitValues;
    var ContinuousCombineToSplitValues = (function () {
        function ContinuousCombineToSplitValues() {
        }
        ContinuousCombineToSplitValues.prototype.get = function (filter, condensedCommand, flags) {
            throw new Error("not implemented yet");
        };
        ContinuousCombineToSplitValues.prototype.set = function (filter, condensedCommand, splitValues) {
            throw new Error("not implemented yet");
        };
        return ContinuousCombineToSplitValues;
    })();
    Legacy.ContinuousCombineToSplitValues = ContinuousCombineToSplitValues;
    function sortedApplyValues(hashToApply) {
        if (hashToApply) {
            return Object.keys(hashToApply).sort().map(function (h) { return hashToApply[h]; });
        }
        else {
            return [];
        }
    }
    function addSortByIfNeeded(applies, sortBy) {
        if (Legacy.FacetApply.isFacetApply(sortBy) && !Legacy.driverUtil.find(applies, function (apply) { return apply.name === sortBy.name; })) {
            applies.push(sortBy);
        }
    }
    function nextLayer(segments) {
        return Legacy.driverUtil.flatten(Legacy.driverUtil.filterMap(segments, function (segment) { return segment.splits; }));
    }
    function nextLoadingLayer(segments) {
        return nextLayer(segments).filter(function (segment) { return segment.hasLoading(); });
    }
    function gatherMissingApplies(segments) {
        var totalMissingApplies = null;
        for (var i = 0; i < segments.length; i++) {
            var segment = segments[i];
            var segmentMissingApplies = segment.meta['missingApplies'];
            if (!segmentMissingApplies)
                continue;
            totalMissingApplies || (totalMissingApplies = {});
            for (var k in segmentMissingApplies) {
                totalMissingApplies[k] = segmentMissingApplies[k];
            }
        }
        return totalMissingApplies;
    }
    function jsWithOpperation(part, operation) {
        var js = part.toJS();
        js.operation = operation;
        return js;
    }
    function computeDeltaQuery(originalQuery, rootSegment) {
        var datasets = originalQuery.getDatasets();
        var andFilters = [originalQuery.getFilter()];
        var condensedCommands = originalQuery.getCondensedCommands();
        var newQuery = datasets.length === 1 && datasets[0].name === "main" ? [] : datasets.map(function (dataset) {
            return jsWithOpperation(dataset, 'dataset');
        });
        var i = 0;
        var dummySegmentTree = new Legacy.SegmentTree({ prop: {}, splits: [rootSegment] });
        var prevLayer = [dummySegmentTree];
        var currentLayer = nextLoadingLayer(prevLayer);
        var split;
        while ((!prevLayer[0].loading) && currentLayer.length === 1) {
            split = condensedCommands[i].split;
            if (split) {
                andFilters.push(split.getFilterFor(currentLayer[0].prop));
            }
            prevLayer = currentLayer;
            currentLayer = nextLoadingLayer(prevLayer);
            i++;
        }
        if (!prevLayer[0].meta['missingApplies'] && currentLayer.length && (split = condensedCommands[i].split)) {
            var currentFilter = new Legacy.OrFilter(currentLayer.map(function (segment) { return split.getFilterFor(segment.prop); })).simplify();
            if (currentFilter.type !== "or") {
                andFilters.push(currentFilter);
            }
        }
        var newFilter = new Legacy.AndFilter(andFilters).simplify();
        if (newFilter.type !== "true") {
            newQuery.push(jsWithOpperation(newFilter, 'filter'));
        }
        if (prevLayer[0].meta['missingApplies']) {
            var sortedMissingApplies = sortedApplyValues(gatherMissingApplies(prevLayer));
            newQuery = newQuery.concat(sortedMissingApplies.map(function (apply) { return jsWithOpperation(apply, 'apply'); }));
        }
        var noSegmentFilter = i > 1;
        var condensedCommand;
        while (condensedCommand = condensedCommands[i]) {
            if (noSegmentFilter) {
                newQuery.push(jsWithOpperation(condensedCommand.split.withoutSegmentFilter(), 'split'));
            }
            else {
                newQuery.push(jsWithOpperation(condensedCommand.split, 'split'));
            }
            if (currentLayer.length && prevLayer.every(function (segment) { return Boolean(segment.splits); })) {
                sortedMissingApplies = sortedApplyValues(gatherMissingApplies(currentLayer));
                addSortByIfNeeded(sortedMissingApplies, condensedCommand.getSortBy());
                newQuery = newQuery.concat(sortedMissingApplies.map(function (apply) { return jsWithOpperation(apply, 'apply'); }));
            }
            else {
                var applySimplifier = new Legacy.ApplySimplifier(applySimplifierSettings);
                applySimplifier.addApplies(condensedCommand.applies);
                var simpleApplies = applySimplifier.getSimpleApplies();
                addSortByIfNeeded(simpleApplies, condensedCommand.getSortBy());
                newQuery = newQuery.concat(simpleApplies.map(function (apply) { return jsWithOpperation(apply, 'apply'); }));
            }
            newQuery.push(jsWithOpperation(condensedCommand.combine, 'combine'));
            prevLayer = currentLayer;
            currentLayer = nextLoadingLayer(prevLayer);
            i++;
        }
        return Legacy.FacetQuery.fromJS(newQuery);
    }
    Legacy.computeDeltaQuery = computeDeltaQuery;
    var totalCacheError = 0;
    function getTotalCacheError() {
        return totalCacheError;
    }
    Legacy.getTotalCacheError = getTotalCacheError;
    function fractalCache(parameters) {
        var driver = parameters.driver;
        var keepFor = parameters.keepFor;
        var getCurrentTime = parameters.getCurrentTime || (function () { return Date.now(); });
        var debug = parameters.debug;
        var applyCache = new LRUCache({
            name: "apply",
            keepFor: keepFor,
            currentTime: getCurrentTime
        });
        var combineToSplitCache = new LRUCache({
            name: "splitCombine",
            keepFor: keepFor,
            currentTime: getCurrentTime
        });
        function cleanCacheProp(prop) {
            for (var key in prop) {
                if (key.substring(0, 3) === "c_S") {
                    delete prop[key];
                }
            }
        }
        function fillPropFromCache(prop, applyHashes) {
            var value;
            var missingApplies = null;
            for (var i = 0; i < applyHashes.length; i++) {
                var applyHashVal = applyHashes[i];
                var name = applyHashVal.name;
                var apply = applyHashVal.apply;
                var applyHash = applyHashVal.applyHash;
                var segmentHash = applyHashVal.segmentHash;
                var applyCacheSlot = applyCache.get(segmentHash);
                if (!applyCacheSlot || ((value = applyCacheSlot[applyHash]) == null)) {
                    missingApplies || (missingApplies = {});
                    missingApplies[applyHash] = apply;
                    continue;
                }
                prop[name] = value;
            }
            return missingApplies;
        }
        function constructSegmentProp(segment, datasetMap, simpleApplies, postProcessors) {
            var applyHashes = appliesToHashes(simpleApplies, segment.meta['filter'], datasetMap);
            var segmentProp = segment.prop;
            var missingApplies = fillPropFromCache(segmentProp, applyHashes);
            if (missingApplies) {
                cleanCacheProp(segmentProp);
                segment.markLoading();
                segment.meta['missingApplies'] = missingApplies;
            }
            else {
                postProcessors.forEach(function (postProcessor) { return postProcessor(segmentProp); });
                cleanCacheProp(segmentProp);
            }
        }
        function getQueryDataFromCache(query) {
            var datasetMap = makeDatasetMap(query);
            var rootSegment = new Legacy.SegmentTree({
                prop: {}
            }, {
                filter: query.getFilter()
            });
            var condensedCommands = query.getCondensedCommands();
            var currentLayerGroups = [
                [rootSegment]
            ];
            for (var i = 0; i < condensedCommands.length; i++) {
                var condensedCommand = condensedCommands[i];
                var applySimplifier = new Legacy.ApplySimplifier(applySimplifierSettings);
                applySimplifier.addApplies(condensedCommand.applies);
                var simpleApplies = applySimplifier.getSimpleApplies();
                var postProcessors = applySimplifier.getPostProcessors();
                currentLayerGroups.forEach(function (layerGroup) { return layerGroup.map(function (segment) { return constructSegmentProp(segment, datasetMap, simpleApplies, postProcessors); }); });
                var combine = (condensedCommand.getCombine());
                if (combine) {
                    var compareFn = combine.sort.getSegmentCompareFn();
                    currentLayerGroups.forEach(function (layerGroup) {
                        layerGroup.sort(compareFn);
                        if (combine.limit != null) {
                            Legacy.driverUtil.inPlaceTrim(layerGroup, combine.limit);
                        }
                        return layerGroup.$_parent.setSplits(layerGroup);
                    });
                }
                var nextCondensedCommand = condensedCommands[i + 1];
                if (nextCondensedCommand) {
                    var split = nextCondensedCommand.getEffectiveSplit();
                    var splitName = split.name;
                    var segmentFilterFn = split.segmentFilter ? split.segmentFilter.getFilterFn() : null;
                    var flatLayer = Legacy.driverUtil.flatten(currentLayerGroups);
                    if (segmentFilterFn) {
                        flatLayer = flatLayer.filter(segmentFilterFn);
                    }
                    if (flatLayer.length === 0) {
                        break;
                    }
                    currentLayerGroups = [];
                    for (var j = 0; j < flatLayer.length; j++) {
                        var segment = flatLayer[j];
                        var filterSplitHash = filterSplitToHash(datasetMap, segment.meta['filter'], split);
                        var combineToSplitsCacheSlot = combineToSplitCache.get(filterSplitHash);
                        var flags = {};
                        var splitValues;
                        if (!combineToSplitsCacheSlot || !(splitValues = combineToSplitsCacheSlot.get(segment.meta['filter'], nextCondensedCommand, flags))) {
                            if (flags.fullQuery) {
                                rootSegment.meta['fullQuery'] = true;
                            }
                            segment.markLoading();
                            continue;
                        }
                        if (flags.fullQuery) {
                            rootSegment.meta['fullQuery'] = true;
                        }
                        var layerGroup = splitValues.map(function (splitValue) {
                            var initProp = {};
                            initProp[splitName] = splitValue;
                            var childSegment = new Legacy.SegmentTree({
                                parent: segment,
                                prop: initProp
                            }, {
                                filter: new Legacy.AndFilter([segment.meta['filter'], split.getFilterFor(initProp)]).simplify()
                            });
                            return childSegment;
                        });
                        layerGroup.$_parent = segment;
                        currentLayerGroups.push(layerGroup);
                    }
                }
            }
            return rootSegment;
        }
        function propToCache(prop, applyHashes) {
            if (!applyHashes.length)
                return;
            for (var i = 0; i < applyHashes.length; i++) {
                var applyHashVal = applyHashes[i];
                var name = applyHashVal.name;
                var applyHash = applyHashVal.applyHash;
                var segmentHash = applyHashVal.segmentHash;
                var applyCacheSlot = applyCache.getOrCreate(segmentHash, function () { return ({}); });
                applyCacheSlot[applyHash] = prop[name];
            }
        }
        function saveSegmentProp(segment, datasetMap, simpleApplies) {
            if (!segment.prop)
                return;
            var applyHashes = appliesToHashes(simpleApplies, segment.meta['filter'], datasetMap);
            propToCache(segment.prop, applyHashes);
        }
        function saveQueryDataToCache(rootSegment, query) {
            var datasetMap = makeDatasetMap(query);
            var condensedCommands = query.getCondensedCommands();
            rootSegment.meta = {
                filter: query.getFilter()
            };
            var currentLayer = [rootSegment];
            for (var i = 0; i < condensedCommands.length; i++) {
                var condensedCommand = condensedCommands[i];
                var applySimplifier = new Legacy.ApplySimplifier(applySimplifierSettings);
                applySimplifier.addApplies(condensedCommand.applies);
                var simpleApplies = applySimplifier.getSimpleApplies();
                currentLayer.forEach(function (segment) { return saveSegmentProp(segment, datasetMap, simpleApplies); });
                var nextCondensedCommand = condensedCommands[i + 1];
                if (nextCondensedCommand) {
                    var split = nextCondensedCommand.getEffectiveSplit();
                    var splitName = split.name;
                    var realSplitBucket = getRealSplit(split).bucket;
                    currentLayer = Legacy.driverUtil.flatten(Legacy.driverUtil.filterMap(currentLayer, function (segment) {
                        if (!segment.splits)
                            return;
                        var filter = segment.meta['filter'];
                        var filterSplitHash = filterSplitToHash(datasetMap, filter, split);
                        var combineToSplitsCacheSlot = combineToSplitCache.getOrCreate(filterSplitHash, function () {
                            switch (realSplitBucket) {
                                case "identity":
                                    return new IdentityCombineToSplitValues();
                                case "timePeriod":
                                    return new TimePeriodCombineToSplitValues();
                                case "continuous":
                                    return new ContinuousCombineToSplitValues();
                            }
                        });
                        var splitValues = [];
                        segment.splits.forEach(function (childSegment) {
                            childSegment.meta = {
                                filter: new Legacy.AndFilter([filter, split.getFilterFor(childSegment.prop)]).simplify()
                            };
                            return splitValues.push(childSegment.prop[splitName]);
                        });
                        combineToSplitsCacheSlot.set(filter, nextCondensedCommand, splitValues);
                        return segment.splits;
                    }));
                }
            }
        }
        var cachedDriver = function (request, intermediate) {
            var deferred = Q.defer();
            if (!request) {
                deferred.reject(new Error("request not supplied"));
                return deferred.promise;
            }
            var context = request.context;
            var query = request.query;
            if (!query) {
                deferred.reject(new Error("query not supplied"));
                return deferred.promise;
            }
            if (!Legacy.FacetQuery.isFacetQuery(query)) {
                deferred.reject(new Error("query must be a FacetQuery"));
                return deferred.promise;
            }
            var avoidCache = (context && context['dontCache']) || query.getSplits().some(function (split) { return split.bucket === "tuple"; }) || query.getCombines().some(function (combine) { return combine && !Legacy.isInstanceOf(combine, Legacy.SliceCombine); });
            if (avoidCache) {
                return driver(request);
            }
            var rootSegment = getQueryDataFromCache(query);
            if (rootSegment.hasLoading() || rootSegment.meta['fullQuery']) {
                if (typeof intermediate === "function") {
                    intermediate(rootSegment);
                }
            }
            else {
                deferred.resolve(rootSegment);
                return deferred.promise;
            }
            var queryFilter = query.getFilter();
            var queryAndFilters = queryFilter.type === "true" ? [] : queryFilter.type === "and" ? queryFilter.filters : [queryFilter];
            var readOnlyCache = queryAndFilters.some(function (filter) {
                var type = filter.type;
                return type === "false" || type === "contains" || type === "match" || type === "or";
            });
            if (readOnlyCache) {
                return driver(request);
            }
            if (rootSegment.meta['fullQuery']) {
                return driver({
                    query: query,
                    context: context
                }).then(function (fullResult) {
                    saveQueryDataToCache(fullResult, query);
                    applyCache.tidy();
                    combineToSplitCache.tidy();
                    return fullResult;
                });
            }
            else {
                var deltaQuery = computeDeltaQuery(query, rootSegment);
                return driver({
                    query: deltaQuery,
                    context: context
                }).then(function (deltaResult) {
                    saveQueryDataToCache(deltaResult, deltaQuery);
                    rootSegment = getQueryDataFromCache(query);
                    if (rootSegment.hasLoading()) {
                        totalCacheError++;
                        if (debug) {
                            console.log("stillLoading", rootSegment.valueOf());
                            cachedDriver.debug();
                            throw new Error("total cache error");
                        }
                        else {
                            return driver(request);
                        }
                    }
                    else {
                        applyCache.tidy();
                        combineToSplitCache.tidy();
                        return rootSegment;
                    }
                });
            }
        };
        cachedDriver.introspect = function (opts) {
            return driver.introspect(opts);
        };
        cachedDriver.clear = function () {
            applyCache.clear();
            combineToSplitCache.clear();
        };
        cachedDriver.stats = function () { return ({
            applyCache: applyCache.size,
            combineToSplitCache: combineToSplitCache.size
        }); };
        cachedDriver.debug = function () {
            console.log("fractal cache debug:");
            applyCache.debug();
            combineToSplitCache.debug();
        };
        return cachedDriver;
    }
    Legacy.fractalCache = fractalCache;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var aggregateToSqlFn = {
        count: function (c) { return "COUNT(" + c + ")"; },
        sum: function (c) { return "SUM(" + c + ")"; },
        average: function (c) { return "AVG(" + c + ")"; },
        min: function (c) { return "MIN(" + c + ")"; },
        max: function (c) { return "MAX(" + c + ")"; },
        uniqueCount: function (c) { return "COUNT(DISTINCT " + c + ")"; }
    };
    var aggregateToZero = {
        count: "NULL",
        sum: "0",
        average: "NULL",
        min: "NULL",
        max: "NULL",
        uniqueCount: "NULL"
    };
    var arithmeticToSqlOp = {
        add: "+",
        subtract: "-",
        multiply: "*",
        divide: "/"
    };
    var directionMap = {
        ascending: "ASC",
        descending: "DESC"
    };
    var timeBucketing = {
        "PT1S": {
            select: "%Y-%m-%dT%H:%i:%SZ",
            group: "%Y-%m-%dT%H:%i:%SZ"
        },
        "PT1M": {
            select: "%Y-%m-%dT%H:%i:00Z",
            group: "%Y-%m-%dT%H:%i"
        },
        "PT1H": {
            select: "%Y-%m-%dT%H:00:00Z",
            group: "%Y-%m-%dT%H"
        },
        "P1D": {
            select: "%Y-%m-%dT00:00:00Z",
            group: "%Y-%m-%d"
        },
        "P1W": {
            select: "%Y-%m-%dT00:00:00Z",
            group: "%Y-%m/%u"
        },
        "P1M": {
            select: "%Y-%m-00T00:00:00Z",
            group: "%Y-%m"
        },
        "P1Y": {
            select: "%Y-00-00T00:00:00Z",
            group: "%Y"
        }
    };
    var SQLQueryBuilder = (function () {
        function SQLQueryBuilder(parameters) {
            this.commonSplitSelectParts = [];
            this.commonApplySelectParts = [];
            this.datasets = [];
            var datasetToTable = parameters.datasetToTable;
            if (typeof datasetToTable !== "object") {
                throw new Error("must have datasetToTable mapping");
            }
            this.datasetParts = {};
            for (var dataset in datasetToTable) {
                var table = datasetToTable[dataset];
                this.datasets.push(dataset);
                this.datasetParts[dataset] = {
                    splitSelectParts: [],
                    applySelectParts: [],
                    fromWherePart: this.escapeAttribute(table),
                    groupByParts: []
                };
            }
            this.orderByPart = null;
            this.limitPart = null;
        }
        SQLQueryBuilder.timeWarpToSQL = function (expression, warp, warpDirection) {
            var sqlFn = warpDirection > 0 ? "DATE_ADD(" : "DATE_SUB(";
            var spans = warp.valueOf();
            if (spans.week) {
                return sqlFn + expression + ", INTERVAL " + String(spans.week) + ' WEEK)';
            }
            if (spans.year || spans.month) {
                var expr = String(spans.year || 0) + "-" + String(spans.month || 0);
                expression = sqlFn + expression + ", INTERVAL '" + expr + "' YEAR_MONTH)";
            }
            if (spans.day || spans.hour || spans.minute || spans.second) {
                var expr = String(spans.day || 0) + " " + [spans.hour || 0, spans.minute || 0, spans.second || 0].join(':');
                expression = sqlFn + expression + ", INTERVAL '" + expr + "' DAY_SECOND)";
            }
            return expression;
        };
        SQLQueryBuilder.prototype.escapeAttribute = function (attribute) {
            if (isNaN(attribute)) {
                return "`" + attribute + "`";
            }
            else {
                return String(attribute);
            }
        };
        SQLQueryBuilder.prototype.escapeValue = function (value) {
            return '"' + value + '"';
        };
        SQLQueryBuilder.prototype.dateToSQL = function (date) {
            return date.toISOString().replace("T", " ").replace(/\.\d\d\dZ$/, "").replace(" 00:00:00", "");
        };
        SQLQueryBuilder.prototype.filterToSQL = function (filter) {
            switch (filter.type) {
                case "true":
                    return "1 = 1";
                case "false":
                    return "1 = 2";
                case "is":
                    return (this.escapeAttribute(filter.attribute)) + " = " + (this.escapeValue(filter.value));
                case "in":
                    return (this.escapeAttribute(filter.attribute)) + " IN (" + (filter.values.map(this.escapeValue, this).join(",")) + ")";
                case "contains":
                    return (this.escapeAttribute(filter.attribute)) + " LIKE \"%" + filter.value + "%\"";
                case "match":
                    return (this.escapeAttribute(filter.attribute)) + " REGEXP '" + filter.expression + "'";
                case "within":
                    var attribute = this.escapeAttribute(filter.attribute);
                    var range = filter.range;
                    var r0 = range[0];
                    var r1 = range[1];
                    if (Legacy.isInstanceOf(r0, Date) && Legacy.isInstanceOf(r1, Date)) {
                        return "'" + (this.dateToSQL(r0)) + "' <= " + attribute + " AND " + attribute + " < '" + (this.dateToSQL(r1)) + "'";
                    }
                    else {
                        return r0 + " <= " + attribute + " AND " + attribute + " < " + r1;
                    }
                    break;
                case "not":
                    return "NOT (" + (this.filterToSQL(filter.filter)) + ")";
                case "and":
                    return "(" + filter.filters.map(this.filterToSQL, this).join(") AND (") + ")";
                case "or":
                    return "(" + filter.filters.map(this.filterToSQL, this).join(") OR (") + ")";
                default:
                    throw new Error("filter type '" + filter.type + "' unsupported by driver");
            }
        };
        SQLQueryBuilder.prototype.addFilters = function (filtersByDataset) {
            var datasetParts = this.datasetParts;
            for (var dataset in datasetParts) {
                var datasetPart = datasetParts[dataset];
                var filter = filtersByDataset[dataset];
                if (!filter) {
                    throw new Error("must have filter for dataset '" + dataset + "'");
                }
                if (filter.type === "true") {
                    continue;
                }
                datasetPart.fromWherePart += " WHERE " + (this.filterToSQL(filter));
            }
            return this;
        };
        SQLQueryBuilder.prototype.splitToSQL = function (split, name) {
            var _this = this;
            switch (split.bucket) {
                case "identity":
                    var groupByPart = this.escapeAttribute(split.attribute);
                    return {
                        selectPart: groupByPart + " AS `" + name + "`",
                        groupByPart: groupByPart
                    };
                case "continuous":
                    groupByPart = Legacy.driverUtil.continuousFloorExpression(this.escapeAttribute(split.attribute), "FLOOR", split.size, split.offset);
                    return {
                        selectPart: groupByPart + " AS `" + name + "`",
                        groupByPart: groupByPart
                    };
                case "timePeriod":
                    var bucketSpec = timeBucketing[split.period.toString()];
                    if (!bucketSpec) {
                        throw new Error("unsupported timePeriod period '" + split.period + "'");
                    }
                    var bucketTimezone = split.timezone;
                    if (bucketTimezone.valueOf() === "Etc/UTC") {
                        var sqlAttribute = this.escapeAttribute(split.attribute);
                    }
                    else {
                        sqlAttribute = "CONVERT_TZ(" + (this.escapeAttribute(split.attribute)) + ", '+0:00', " + bucketTimezone + ")";
                    }
                    var warp = split.warp;
                    if (warp) {
                        sqlAttribute = SQLQueryBuilder.timeWarpToSQL(sqlAttribute, warp, split.warpDirection);
                    }
                    return {
                        selectPart: "DATE_FORMAT(" + sqlAttribute + ", '" + bucketSpec.select + "') AS `" + name + "`",
                        groupByPart: "DATE_FORMAT(" + sqlAttribute + ", '" + bucketSpec.group + "')"
                    };
                case "tuple":
                    var parts = split.splits.map(function (split) { return _this.splitToSQL(split, ''); }, this);
                    return {
                        selectPart: parts.map(function (part) { return part.selectPart; }).join(", "),
                        groupByPart: parts.map(function (part) { return part.groupByPart; }).join(", ")
                    };
                default:
                    throw new Error("bucket '" + split.bucket + "' unsupported by driver");
            }
        };
        SQLQueryBuilder.prototype.addSplit = function (split) {
            var _this = this;
            if (!Legacy.FacetSplit.isFacetSplit(split)) {
                throw new TypeError("split must be a FacetSplit");
            }
            var splits = split.bucket === "parallel" ? split.splits : [split];
            this.commonSplitSelectParts.push("`" + split.name + "`");
            splits.forEach(function (subSplit) {
                var datasetPart = _this.datasetParts[subSplit.getDataset()];
                var selectGroup = _this.splitToSQL(subSplit, split.name);
                var selectPart = selectGroup.selectPart;
                var groupByPart = selectGroup.groupByPart;
                datasetPart.splitSelectParts.push(selectPart);
                return datasetPart.groupByParts.push(groupByPart);
            });
            return this;
        };
        SQLQueryBuilder.prototype.applyToSQLExpression = function (apply) {
            if (apply.aggregate) {
                switch (apply.aggregate) {
                    case "constant":
                        var applyStr = this.escapeAttribute(apply.value);
                        break;
                    case "count":
                    case "sum":
                    case "average":
                    case "min":
                    case "max":
                    case "uniqueCount":
                        var expression = apply.aggregate === "count" ? "1" : this.escapeAttribute(apply.attribute);
                        if (apply.filter) {
                            var zero = aggregateToZero[apply.aggregate];
                            expression = "IF(" + (this.filterToSQL(apply.filter)) + ", " + expression + ", " + zero + ")";
                        }
                        applyStr = aggregateToSqlFn[apply.aggregate](expression);
                        break;
                    case "quantile":
                        throw new Error("not implemented yet");
                        break;
                    default:
                        throw new Error("unsupported aggregate '" + apply.aggregate + "'");
                }
                return applyStr;
            }
            var sqlOp = arithmeticToSqlOp[apply.arithmetic];
            if (!sqlOp) {
                throw new Error("unsupported arithmetic '" + apply.arithmetic + "'");
            }
            var operands = apply.operands;
            var op1SQL = this.applyToSQLExpression(operands[0]);
            var op2SQL = this.applyToSQLExpression(operands[1]);
            applyStr = "(" + op1SQL + " " + sqlOp + " " + op2SQL + ")";
            return applyStr;
        };
        SQLQueryBuilder.prototype.applyToSQL = function (apply) {
            return (this.applyToSQLExpression(apply)) + " AS `" + apply.name + "`";
        };
        SQLQueryBuilder.prototype.addApplies = function (applies) {
            var sqlProcessorScheme = {
                constant: function (apply) {
                    return String(apply.value);
                },
                getter: function (apply) {
                    return apply.name;
                },
                arithmetic: function (arithmetic, lhs, rhs) {
                    var sqlOp = arithmeticToSqlOp[arithmetic];
                    if (!sqlOp) {
                        throw new Error("unknown arithmetic");
                    }
                    return "(IFNULL(" + lhs + ", 0) " + sqlOp + " IFNULL(" + rhs + ", 0))";
                },
                finish: function (name, getter) { return getter + " AS `" + name + "`"; }
            };
            var applySimplifier = new Legacy.ApplySimplifier({
                postProcessorScheme: sqlProcessorScheme
            });
            applySimplifier.addApplies(applies);
            var appliesByDataset = applySimplifier.getSimpleAppliesByDataset();
            this.commonApplySelectParts = applySimplifier.getPostProcessors();
            for (var dataset in appliesByDataset) {
                var datasetApplies = appliesByDataset[dataset];
                this.datasetParts[dataset].applySelectParts = datasetApplies.map(this.applyToSQL, this);
            }
            return this;
        };
        SQLQueryBuilder.prototype.addSort = function (sort) {
            if (!sort)
                return;
            var sqlDirection = directionMap[sort.direction];
            switch (sort.compare) {
                case "natural":
                    this.orderByPart = "ORDER BY " + (this.escapeAttribute(sort.prop));
                    return this.orderByPart += " " + sqlDirection;
                case "caseInsensitive":
                    throw new Error("not implemented yet (ToDo)");
                    break;
                default:
                    throw new Error("compare '" + sort.compare + "' unsupported by driver");
            }
        };
        SQLQueryBuilder.prototype.addCombine = function (combine) {
            if (!Legacy.FacetCombine.isFacetCombine(combine)) {
                throw new TypeError("combine must be a FacetCombine");
            }
            switch (combine.method) {
                case "slice":
                    var sort = combine.sort;
                    if (sort) {
                        this.addSort(sort);
                    }
                    var limit = combine.limit;
                    if (limit != null) {
                        this.limitPart = "LIMIT " + limit;
                    }
                    break;
                case "matrix":
                    sort = combine.sort;
                    if (sort) {
                        this.addSort(sort);
                    }
                    break;
                default:
                    throw new Error("method '" + combine.method + "' unsupported by driver");
            }
            return this;
        };
        SQLQueryBuilder.prototype.getQueryForDataset = function (dataset, topLevel) {
            if (topLevel === void 0) { topLevel = false; }
            var datasetPart = this.datasetParts[dataset];
            var selectPartsParts = [datasetPart.splitSelectParts, datasetPart.applySelectParts];
            if (topLevel) {
                selectPartsParts.push(this.commonApplySelectParts);
            }
            var selectParts = Legacy.driverUtil.flatten(selectPartsParts);
            if (!selectParts.length) {
                return null;
            }
            var select = selectParts.join(", ");
            var groupBy = datasetPart.groupByParts.join(", ") || '""';
            return "SELECT " + select + " FROM " + datasetPart.fromWherePart + " GROUP BY " + groupBy;
        };
        SQLQueryBuilder.prototype.getQuery = function () {
            if (this.datasets.length > 1) {
                var partials = this.datasets.map((function (dataset) {
                    var selectParts = [].concat(this.commonSplitSelectParts.map(function (commonSplitSelectPart) { return "`" + dataset + "`." + commonSplitSelectPart; }), this.commonApplySelectParts);
                    if (!selectParts.length)
                        return null;
                    var select = selectParts.join(",\n    ");
                    var partialQuery = ["SELECT " + select, "FROM"];
                    var innerDataset = dataset;
                    var datasetPart = this.datasetParts[innerDataset];
                    partialQuery.push("  (" + (this.getQueryForDataset(innerDataset)) + ") AS `" + innerDataset + "`");
                    var datasets = this.datasets;
                    for (var i = 0; i < datasets.length; i++) {
                        innerDataset = datasets[i];
                        if (innerDataset === dataset) {
                            continue;
                        }
                        datasetPart = this.datasetParts[innerDataset];
                        partialQuery.push("LEFT JOIN");
                        partialQuery.push("  (" + (this.getQueryForDataset(innerDataset)) + ") AS `" + innerDataset + "`");
                        partialQuery.push("USING(" + (this.commonSplitSelectParts.join(", ")) + ")");
                    }
                    return "  " + partialQuery.join("\n  ");
                }), this);
                if (!partials.every(Boolean)) {
                    return null;
                }
                var query = [partials.join("\nUNION\n")];
            }
            else {
                var queryForOnlyDataset = this.getQueryForDataset(this.datasets[0], true);
                if (!queryForOnlyDataset) {
                    return null;
                }
                query = [queryForOnlyDataset];
            }
            if (this.orderByPart) {
                query.push(this.orderByPart);
            }
            if (this.limitPart) {
                query.push(this.limitPart);
            }
            return query.join("\n") + ";";
        };
        return SQLQueryBuilder;
    })();
    Legacy.SQLQueryBuilder = SQLQueryBuilder;
    function condensedCommandToSQL(properties, callback) {
        var requester = properties.requester;
        var queryBuilder = properties.queryBuilder;
        var parentSegment = properties.parentSegment;
        var condensedCommand = properties.condensedCommand;
        var filtersByDataset = parentSegment.meta['filtersByDataset'];
        var split = condensedCommand.getSplit();
        var combine = condensedCommand.getCombine();
        try {
            queryBuilder.addFilters(filtersByDataset);
            if (split) {
                queryBuilder.addSplit(split);
            }
            queryBuilder.addApplies(condensedCommand.applies);
            if (combine) {
                queryBuilder.addCombine(combine);
            }
        }
        catch (error) {
            callback(error);
            return;
        }
        var queryToRun = queryBuilder.getQuery();
        if (!queryToRun) {
            var newSegmentTree = new Legacy.SegmentTree({
                prop: {}
            }, {
                filtersByDataset: filtersByDataset
            });
            callback(null, [newSegmentTree]);
            return;
        }
        requester({
            query: queryToRun
        }).then(function (ds) {
            if (split) {
                var splitProp = split.name;
                var effectiveSplit = split;
                if (effectiveSplit.bucket === 'parallel')
                    effectiveSplit = effectiveSplit.splits[0];
                if (effectiveSplit.bucket === "continuous") {
                    var splitSize = effectiveSplit.size;
                    ds.forEach(function (d) {
                        var start = d[splitProp];
                        return d[splitProp] = [start, start + splitSize];
                    });
                }
                else if (effectiveSplit.bucket === "timePeriod") {
                    var timezone = effectiveSplit.timezone;
                    var splitDuration = effectiveSplit.period;
                    ds.forEach(function (d) {
                        var rangeStart = new Date(d[splitProp]);
                        var range = [rangeStart, splitDuration.move(rangeStart, timezone, 1)];
                        return d[splitProp] = range;
                    });
                }
                var splits = ds.map(function (prop) {
                    return new Legacy.SegmentTree({
                        prop: prop
                    }, {
                        filtersByDataset: Legacy.FacetFilter.andFiltersByDataset(filtersByDataset, split.getFilterByDatasetFor(prop))
                    });
                });
            }
            else {
                if (ds.length > 1) {
                    callback(new Error("unexpected result"));
                    return;
                }
                if (ds.length === 0) {
                    ds.push(condensedCommand.getZeroProp());
                }
                newSegmentTree = new Legacy.SegmentTree({
                    prop: ds[0]
                }, {
                    filtersByDataset: filtersByDataset
                });
                splits = [newSegmentTree];
            }
            callback(null, splits);
        }, function (err) { return callback(err); });
    }
    function mySqlDriver(parameters) {
        var requester = parameters.requester;
        var table = parameters.table;
        var filter = parameters.filter;
        if (typeof requester !== "function") {
            throw new Error("must have a requester");
        }
        if (typeof table !== "string") {
            throw new Error("must have table");
        }
        var driver = function (request) {
            var deferred = Q.defer();
            if (!request) {
                deferred.reject(new Error("request not supplied"));
                return deferred.promise;
            }
            var query = request.query;
            if (!query) {
                deferred.reject(new Error("query not supplied"));
                return deferred.promise;
            }
            if (!Legacy.FacetQuery.isFacetQuery(query)) {
                deferred.reject(new TypeError("query must be a FacetQuery"));
                return deferred.promise;
            }
            var datasetToTable = {};
            query.getDatasets().forEach(function (dataset) { return datasetToTable[dataset.name] = table; });
            var init = true;
            var rootSegment = new Legacy.SegmentTree({
                prop: {}
            }, {
                filtersByDataset: query.getFiltersByDataset(filter)
            });
            var segments = [rootSegment];
            var condensedGroups = query.getCondensedCommands();
            function querySQL(condensedCommand, callback) {
                var QUERY_LIMIT = 10;
                if (condensedCommand.split != null ? condensedCommand.split.segmentFilter : void 0) {
                    var segmentFilterFn = condensedCommand.split.segmentFilter.getFilterFn();
                    Legacy.driverUtil.inPlaceFilter(segments, segmentFilterFn);
                }
                async.mapLimit(segments, QUERY_LIMIT, function (parentSegment, callback) { return condensedCommandToSQL({
                    requester: requester,
                    queryBuilder: new SQLQueryBuilder({
                        datasetToTable: datasetToTable
                    }),
                    parentSegment: parentSegment,
                    condensedCommand: condensedCommand
                }, function (err, splits) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (splits === null) {
                        callback(null, null);
                        return;
                    }
                    parentSegment.setSplits(splits);
                    return callback(null, parentSegment.splits);
                }); }, function (err, results) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    if (results.some(function (result) { return result === null; })) {
                        rootSegment = null;
                    }
                    else {
                        segments = Legacy.driverUtil.flatten(results);
                        if (init) {
                            rootSegment = segments[0];
                            init = false;
                        }
                    }
                    callback();
                });
            }
            var cmdIndex = 0;
            async.whilst(function () { return cmdIndex < condensedGroups.length && rootSegment; }, function (callback) {
                var condensedGroup = condensedGroups[cmdIndex];
                cmdIndex++;
                querySQL(condensedGroup, callback);
            }, function (err) {
                if (err) {
                    deferred.reject(err);
                }
                else {
                    deferred.resolve((rootSegment || new Legacy.SegmentTree({})).selfClean());
                }
            });
            return deferred.promise;
        };
        driver.introspect = function (opt) {
            return requester({
                query: "DESCRIBE `" + table + "`"
            }).then(function (columns) {
                var attributes = columns.map(function (column) {
                    var attribute = {
                        name: column.Field
                    };
                    var sqlType = column.Type;
                    if (sqlType === "datetime") {
                        attribute.time = true;
                    }
                    else if (sqlType.indexOf("varchar(") === 0) {
                        attribute.categorical = true;
                    }
                    else if (sqlType.indexOf("int(") === 0 || sqlType.indexOf("bigint(") === 0) {
                        attribute.numeric = true;
                        attribute.integer = true;
                    }
                    else if (sqlType.indexOf("decimal(") === 0) {
                        attribute.numeric = true;
                    }
                    return attribute;
                });
                return attributes;
            });
        };
        return driver;
    }
    Legacy.mySqlDriver = mySqlDriver;
})(Legacy || (Legacy = {}));
var Legacy;
(function (Legacy) {
    var splitFnFactories = {};
    splitFnFactories['identity'] = function (split) {
        var attribute = split.attribute;
        return function (d) {
            var value = d[attribute];
            return value != null ? value : null;
        };
    };
    splitFnFactories['continuous'] = function (split) {
        var attribute = split.attribute;
        var size = split.size;
        var offset = split.offset;
        return function (d) {
            var num = Number(d[attribute]);
            if (isNaN(num)) {
                return null;
            }
            var b = Math.floor((num - offset) / size) * size + offset;
            return [b, b + size];
        };
    };
    splitFnFactories['timePeriod'] = function (split) {
        var attribute = split.attribute;
        var period = split.period;
        var timezone = split.timezone;
        var warp = split.warp;
        var warpDirection = split.warpDirection;
        return function (d) {
            var ds = new Date(d[attribute]);
            if (isNaN(ds.valueOf()))
                return null;
            ds = period.floor(ds, timezone);
            var de = period.move(ds, timezone, 1);
            if (warp) {
                ds = warp.move(ds, timezone, warpDirection);
                de = warp.move(de, timezone, warpDirection);
            }
            return [ds, de];
        };
    };
    splitFnFactories['tuple'] = function (split) {
        var splits = split.splits;
        var tupleSplits = splits.map(makeSplitFn);
        return function (d) { return tupleSplits.map(function (sf) { return sf(d); }); };
    };
    function makeSplitFn(split) {
        if (!Legacy.isInstanceOf(split, Legacy.FacetSplit)) {
            throw new TypeError("split must be a FacetSplit");
        }
        var splitFnFactory = splitFnFactories[split.bucket];
        if (!splitFnFactory) {
            throw new Error("split bucket '" + split.bucket + "' not supported by driver");
        }
        return splitFnFactory(split);
    }
    var aggregateFns = {
        constant: function (apply) {
            var value = apply.value;
            return function (ds) { return Number(value); };
        },
        count: function (apply) {
            return function (ds) { return ds.length; };
        },
        sum: function (apply) {
            var attribute = apply.attribute;
            return function (ds) {
                var sum = 0;
                ds.forEach(function (d) { return sum += Number(d[attribute]); });
                return sum;
            };
        },
        average: function (apply) {
            var attribute = apply.attribute;
            return function (ds) {
                var sum = 0;
                ds.forEach(function (d) { return sum += Number(d[attribute]); });
                return sum / ds.length;
            };
        },
        min: function (apply) {
            var attribute = apply.attribute;
            return function (ds) {
                var min = +Infinity;
                ds.forEach(function (d) { return min = Math.min(min, Number(d[attribute])); });
                if (isNaN(min)) {
                    min = +Infinity;
                    ds.forEach(function (d) { return min = Math.min(min, (new Date(d[attribute])).valueOf()); });
                }
                return min;
            };
        },
        max: function (apply) {
            var attribute = apply.attribute;
            return function (ds) {
                var max = -Infinity;
                ds.forEach(function (d) { return max = Math.max(max, Number(d[attribute])); });
                if (isNaN(max)) {
                    max = -Infinity;
                    ds.forEach(function (d) { return max = Math.max(max, (new Date(d[attribute])).valueOf()); });
                }
                return max;
            };
        },
        uniqueCount: function (apply) {
            var attribute = apply.attribute;
            return function (ds) {
                var seen = {};
                var count = 0;
                ds.forEach(function (d) {
                    var v = d[attribute];
                    if (!seen[v]) {
                        count++;
                        return seen[v] = 1;
                    }
                });
                return count;
            };
        },
        quantile: function (apply) {
            var attribute = apply.attribute;
            var quantile = apply.quantile;
            return function (ds) {
                if (!ds.length)
                    return null;
                var points = ds.map(function (d) { return Number(d[attribute]); });
                points.sort(function (a, b) { return a - b; });
                return points[Math.floor(points.length * quantile)];
            };
        }
    };
    var arithmeticFns = {
        add: function (lhs, rhs) {
            return function (x) { return lhs(x) + rhs(x); };
        },
        subtract: function (lhs, rhs) {
            return function (x) { return lhs(x) - rhs(x); };
        },
        multiply: function (lhs, rhs) {
            return function (x) { return lhs(x) * rhs(x); };
        },
        divide: function (lhs, rhs) {
            return function (x) { return lhs(x) / rhs(x); };
        }
    };
    function makeApplyFn(apply) {
        if (!Legacy.isInstanceOf(apply, Legacy.FacetApply)) {
            throw new TypeError("apply must be a FacetApply");
        }
        if (apply.aggregate) {
            var aggregateFn = aggregateFns[apply.aggregate];
            if (!aggregateFn) {
                throw new Error("aggregate '" + apply.aggregate + "' unsupported by driver");
            }
            var dataset = apply.getDataset();
            var rawApplyFn = aggregateFn(apply);
            if (apply.filter) {
                var filterFn = apply.filter.getFilterFn();
                return function (dss) { return rawApplyFn(dss[dataset].filter(filterFn)); };
            }
            else {
                return function (dss) { return rawApplyFn(dss[dataset]); };
            }
        }
        else if (apply.arithmetic) {
            var arithmeticFn = arithmeticFns[apply.arithmetic];
            if (!arithmeticFn) {
                throw new Error("arithmetic '" + apply.arithmetic + "' unsupported by driver");
            }
            var operands = apply.operands;
            return arithmeticFn(makeApplyFn(operands[0]), makeApplyFn(operands[1]));
        }
        else {
            throw new Error("apply must have an aggregate or an arithmetic");
        }
    }
    var combineFns = {
        slice: function (combine) {
            var sort = combine.sort;
            var limit = combine.limit;
            if (sort) {
                var segmentCompareFn = sort.getSegmentCompareFn();
            }
            return function (segments) {
                if (segmentCompareFn) {
                    segments.sort(segmentCompareFn);
                }
                if (limit != null) {
                    Legacy.driverUtil.inPlaceTrim(segments, limit);
                }
            };
        },
        matrix: function (combine) {
            return function (segments) {
                throw new Error("matrix combine not implemented yet");
            };
        }
    };
    function makeCombineFn(combine) {
        if (!Legacy.isInstanceOf(combine, Legacy.FacetCombine)) {
            throw new TypeError("combine must be a FacetCombine");
        }
        var combineFn = combineFns[combine.method];
        if (!combineFn) {
            throw new Error("method '" + combine.method + "' unsupported by driver");
        }
        return combineFn(combine);
    }
    function computeQuery(data, query) {
        var applyFn;
        var combineFn;
        var datasetName;
        var segmentFilterFn;
        var rootRaw = {};
        var filtersByDataset = query.getFiltersByDataset();
        for (datasetName in filtersByDataset) {
            var datasetFilter = filtersByDataset[datasetName];
            rootRaw[datasetName] = data.filter(datasetFilter.getFilterFn());
        }
        var rootSegment = new Legacy.SegmentTree({
            prop: {}
        }, { raws: rootRaw });
        var segmentGroups = [[rootSegment]];
        var originalSegmentGroups = segmentGroups;
        var groups = query.getCondensedCommands();
        groups.forEach(function (condensedCommand) {
            var split = condensedCommand.getSplit();
            var applies = condensedCommand.getApplies();
            var combine = condensedCommand.getCombine();
            if (split) {
                var propName = split.name;
                var parallelSplits = split.bucket === "parallel" ? split.splits : [split];
                var parallelSplitFns = {};
                parallelSplits.forEach(function (parallelSplit) {
                    parallelSplitFns[parallelSplit.getDataset()] = makeSplitFn(parallelSplit);
                });
                segmentFilterFn = split.segmentFilter ? split.segmentFilter.getFilterFn() : null;
                segmentGroups = Legacy.driverUtil.filterMap(Legacy.driverUtil.flatten(segmentGroups), function (segment) {
                    if (segmentFilterFn && !segmentFilterFn(segment)) {
                        return;
                    }
                    var keys = [];
                    var bucketsByDataset = {};
                    var bucketValue = {};
                    for (var dataset in parallelSplitFns) {
                        var parallelSplitFn = parallelSplitFns[dataset];
                        var buckets = {};
                        segment.meta['raws'][dataset].forEach(function (d) {
                            var key = parallelSplitFn(d);
                            var keyString = String(key);
                            if (!hasOwnProperty(bucketValue, keyString)) {
                                keys.push(keyString);
                                bucketValue[keyString] = key;
                            }
                            if (!buckets[keyString]) {
                                buckets[keyString] = [];
                            }
                            return buckets[keyString].push(d);
                        });
                        bucketsByDataset[dataset] = buckets;
                    }
                    segment.setSplits(keys.map(function (keyString) {
                        var prop = {};
                        prop[propName] = bucketValue[keyString];
                        var raws = {};
                        for (dataset in bucketsByDataset) {
                            buckets = bucketsByDataset[dataset];
                            raws[dataset] = buckets[keyString] || [];
                        }
                        var newSplit = new Legacy.SegmentTree({
                            prop: prop
                        }, { raws: raws });
                        return newSplit;
                    }));
                    return segment.splits;
                });
            }
            applies.forEach(function (apply) {
                propName = apply.name;
                var applyFn = makeApplyFn(apply);
                return segmentGroups.map(function (segmentGroup) {
                    segmentGroup.map(function (segment) {
                        segment.prop[propName] = applyFn(segment.meta['raws']);
                    });
                });
            });
            if (combine) {
                var combineFn = makeCombineFn(combine);
                segmentGroups.forEach(combineFn);
            }
        });
        return (originalSegmentGroups[0][0] || new Legacy.SegmentTree({})).selfClean();
    }
    function introspectData(data, options) {
        var maxSample = options.maxSample;
        var maxYear = options.maxYear || (new Date().getUTCFullYear() + 5);
        if (!data.length)
            return null;
        var sample = data.slice(0, maxSample);
        var attributeNames = [];
        for (var k in sample[0]) {
            if (k === "")
                continue;
            attributeNames.push(k);
        }
        attributeNames.sort();
        function isDate(dt) {
            dt = new Date(dt);
            if (isNaN(dt.valueOf()))
                return false;
            var year = dt.getUTCFullYear();
            return 1987 <= year && year <= maxYear;
        }
        function isNumber(n) {
            return !isNaN(Number(n));
        }
        function isInteger(n) {
            return Number(n) === parseInt(n, 10);
        }
        function isString(str) {
            return typeof str === "string";
        }
        return attributeNames.map(function (attributeName) {
            var attribute = {
                name: attributeName
            };
            var column = sample.map(function (d) { return d[attributeName]; }).filter(function (x) { return x !== null && x !== ""; });
            if (column.length) {
                if (column.every(isDate)) {
                    attribute.time = true;
                }
                if (column.every(isNumber)) {
                    attribute.numeric = true;
                    if (column.every(isInteger)) {
                        attribute.integer = true;
                    }
                }
                else {
                    if (column.every(isString)) {
                        attribute.categorical = true;
                    }
                }
            }
            return attribute;
        });
    }
    function nativeDriver(dataGetter) {
        var dataError = null;
        var dataArray = null;
        if (Array.isArray(dataGetter)) {
            dataArray = dataGetter;
        }
        else if (typeof dataGetter === "function") {
            var waitingQueries = [];
            dataGetter(function (err, data) {
                dataError = err;
                dataArray = data;
                waitingQueries.forEach(function (waitingQuery) { return waitingQuery(); });
                waitingQueries = null;
            });
        }
        else {
            throw new TypeError("dataGetter must be a function or raw data (array)");
        }
        var driver = function (request) {
            var deferred = Q.defer();
            if (!request) {
                deferred.reject(new Error("request not supplied"));
                return deferred.promise;
            }
            var query = request.query;
            if (!query) {
                deferred.reject(new Error("query not supplied"));
                return deferred.promise;
            }
            if (!Legacy.FacetQuery.isFacetQuery(query)) {
                deferred.reject(new TypeError("query must be a FacetQuery"));
                return deferred.promise;
            }
            function computeWithData() {
                if (dataError) {
                    deferred.reject(dataError);
                    return;
                }
                try {
                    var result = computeQuery(dataArray, query);
                }
                catch (error) {
                    deferred.reject(error);
                    return;
                }
                deferred.resolve(result);
            }
            if (waitingQueries) {
                waitingQueries.push(computeWithData);
            }
            else {
                computeWithData();
            }
            return deferred.promise;
        };
        driver.introspect = function (opts) {
            var maxSample = (opts || {}).maxSample;
            var deferred = Q.defer();
            function doIntrospect() {
                if (dataError) {
                    deferred.reject(dataError);
                    return;
                }
                var attributes = introspectData(dataArray, {
                    maxSample: maxSample || 1000
                });
                deferred.resolve(attributes);
            }
            if (waitingQueries) {
                waitingQueries.push(doIntrospect);
            }
            else {
                doIntrospect();
            }
            return deferred.promise;
        };
        return driver;
    }
    Legacy.nativeDriver = nativeDriver;
})(Legacy || (Legacy = {}));
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Core.facet;
    module.exports.core = Core;
    module.exports.extra = Extra;
    module.exports.legacy = Legacy;
}

},{"../parser/apply":10,"../parser/expression":11,"../parser/filter":12,"async":2,"chronology":4,"higher-object":8,"q":9}],2:[function(require,module,exports){
(function (process){
/*!
 * async
 * https://github.com/caolan/async
 *
 * Copyright 2010-2014 Caolan McMahon
 * Released under the MIT license
 */
/*jshint onevar: false, indent:4 */
/*global setImmediate: false, setTimeout: false, console: false */
(function () {

    var async = {};

    // global on the server, window in the browser
    var root, previous_async;

    root = this;
    if (root != null) {
      previous_async = root.async;
    }

    async.noConflict = function () {
        root.async = previous_async;
        return async;
    };

    function only_once(fn) {
        var called = false;
        return function() {
            if (called) throw new Error("Callback was already called.");
            called = true;
            fn.apply(root, arguments);
        }
    }

    //// cross-browser compatiblity functions ////

    var _toString = Object.prototype.toString;

    var _isArray = Array.isArray || function (obj) {
        return _toString.call(obj) === '[object Array]';
    };

    var _each = function (arr, iterator) {
        if (arr.forEach) {
            return arr.forEach(iterator);
        }
        for (var i = 0; i < arr.length; i += 1) {
            iterator(arr[i], i, arr);
        }
    };

    var _map = function (arr, iterator) {
        if (arr.map) {
            return arr.map(iterator);
        }
        var results = [];
        _each(arr, function (x, i, a) {
            results.push(iterator(x, i, a));
        });
        return results;
    };

    var _reduce = function (arr, iterator, memo) {
        if (arr.reduce) {
            return arr.reduce(iterator, memo);
        }
        _each(arr, function (x, i, a) {
            memo = iterator(memo, x, i, a);
        });
        return memo;
    };

    var _keys = function (obj) {
        if (Object.keys) {
            return Object.keys(obj);
        }
        var keys = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                keys.push(k);
            }
        }
        return keys;
    };

    //// exported async module functions ////

    //// nextTick implementation with browser-compatible fallback ////
    if (typeof process === 'undefined' || !(process.nextTick)) {
        if (typeof setImmediate === 'function') {
            async.nextTick = function (fn) {
                // not a direct alias for IE10 compatibility
                setImmediate(fn);
            };
            async.setImmediate = async.nextTick;
        }
        else {
            async.nextTick = function (fn) {
                setTimeout(fn, 0);
            };
            async.setImmediate = async.nextTick;
        }
    }
    else {
        async.nextTick = process.nextTick;
        if (typeof setImmediate !== 'undefined') {
            async.setImmediate = function (fn) {
              // not a direct alias for IE10 compatibility
              setImmediate(fn);
            };
        }
        else {
            async.setImmediate = async.nextTick;
        }
    }

    async.each = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        _each(arr, function (x) {
            iterator(x, only_once(done) );
        });
        function done(err) {
          if (err) {
              callback(err);
              callback = function () {};
          }
          else {
              completed += 1;
              if (completed >= arr.length) {
                  callback();
              }
          }
        }
    };
    async.forEach = async.each;

    async.eachSeries = function (arr, iterator, callback) {
        callback = callback || function () {};
        if (!arr.length) {
            return callback();
        }
        var completed = 0;
        var iterate = function () {
            iterator(arr[completed], function (err) {
                if (err) {
                    callback(err);
                    callback = function () {};
                }
                else {
                    completed += 1;
                    if (completed >= arr.length) {
                        callback();
                    }
                    else {
                        iterate();
                    }
                }
            });
        };
        iterate();
    };
    async.forEachSeries = async.eachSeries;

    async.eachLimit = function (arr, limit, iterator, callback) {
        var fn = _eachLimit(limit);
        fn.apply(null, [arr, iterator, callback]);
    };
    async.forEachLimit = async.eachLimit;

    var _eachLimit = function (limit) {

        return function (arr, iterator, callback) {
            callback = callback || function () {};
            if (!arr.length || limit <= 0) {
                return callback();
            }
            var completed = 0;
            var started = 0;
            var running = 0;

            (function replenish () {
                if (completed >= arr.length) {
                    return callback();
                }

                while (running < limit && started < arr.length) {
                    started += 1;
                    running += 1;
                    iterator(arr[started - 1], function (err) {
                        if (err) {
                            callback(err);
                            callback = function () {};
                        }
                        else {
                            completed += 1;
                            running -= 1;
                            if (completed >= arr.length) {
                                callback();
                            }
                            else {
                                replenish();
                            }
                        }
                    });
                }
            })();
        };
    };


    var doParallel = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.each].concat(args));
        };
    };
    var doParallelLimit = function(limit, fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [_eachLimit(limit)].concat(args));
        };
    };
    var doSeries = function (fn) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            return fn.apply(null, [async.eachSeries].concat(args));
        };
    };


    var _asyncMap = function (eachfn, arr, iterator, callback) {
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        if (!callback) {
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err) {
                    callback(err);
                });
            });
        } else {
            var results = [];
            eachfn(arr, function (x, callback) {
                iterator(x.value, function (err, v) {
                    results[x.index] = v;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };
    async.map = doParallel(_asyncMap);
    async.mapSeries = doSeries(_asyncMap);
    async.mapLimit = function (arr, limit, iterator, callback) {
        return _mapLimit(limit)(arr, iterator, callback);
    };

    var _mapLimit = function(limit) {
        return doParallelLimit(limit, _asyncMap);
    };

    // reduce only has a series version, as doing reduce in parallel won't
    // work in many situations.
    async.reduce = function (arr, memo, iterator, callback) {
        async.eachSeries(arr, function (x, callback) {
            iterator(memo, x, function (err, v) {
                memo = v;
                callback(err);
            });
        }, function (err) {
            callback(err, memo);
        });
    };
    // inject alias
    async.inject = async.reduce;
    // foldl alias
    async.foldl = async.reduce;

    async.reduceRight = function (arr, memo, iterator, callback) {
        var reversed = _map(arr, function (x) {
            return x;
        }).reverse();
        async.reduce(reversed, memo, iterator, callback);
    };
    // foldr alias
    async.foldr = async.reduceRight;

    var _filter = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.filter = doParallel(_filter);
    async.filterSeries = doSeries(_filter);
    // select alias
    async.select = async.filter;
    async.selectSeries = async.filterSeries;

    var _reject = function (eachfn, arr, iterator, callback) {
        var results = [];
        arr = _map(arr, function (x, i) {
            return {index: i, value: x};
        });
        eachfn(arr, function (x, callback) {
            iterator(x.value, function (v) {
                if (!v) {
                    results.push(x);
                }
                callback();
            });
        }, function (err) {
            callback(_map(results.sort(function (a, b) {
                return a.index - b.index;
            }), function (x) {
                return x.value;
            }));
        });
    };
    async.reject = doParallel(_reject);
    async.rejectSeries = doSeries(_reject);

    var _detect = function (eachfn, arr, iterator, main_callback) {
        eachfn(arr, function (x, callback) {
            iterator(x, function (result) {
                if (result) {
                    main_callback(x);
                    main_callback = function () {};
                }
                else {
                    callback();
                }
            });
        }, function (err) {
            main_callback();
        });
    };
    async.detect = doParallel(_detect);
    async.detectSeries = doSeries(_detect);

    async.some = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (v) {
                    main_callback(true);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(false);
        });
    };
    // any alias
    async.any = async.some;

    async.every = function (arr, iterator, main_callback) {
        async.each(arr, function (x, callback) {
            iterator(x, function (v) {
                if (!v) {
                    main_callback(false);
                    main_callback = function () {};
                }
                callback();
            });
        }, function (err) {
            main_callback(true);
        });
    };
    // all alias
    async.all = async.every;

    async.sortBy = function (arr, iterator, callback) {
        async.map(arr, function (x, callback) {
            iterator(x, function (err, criteria) {
                if (err) {
                    callback(err);
                }
                else {
                    callback(null, {value: x, criteria: criteria});
                }
            });
        }, function (err, results) {
            if (err) {
                return callback(err);
            }
            else {
                var fn = function (left, right) {
                    var a = left.criteria, b = right.criteria;
                    return a < b ? -1 : a > b ? 1 : 0;
                };
                callback(null, _map(results.sort(fn), function (x) {
                    return x.value;
                }));
            }
        });
    };

    async.auto = function (tasks, callback) {
        callback = callback || function () {};
        var keys = _keys(tasks);
        var remainingTasks = keys.length
        if (!remainingTasks) {
            return callback();
        }

        var results = {};

        var listeners = [];
        var addListener = function (fn) {
            listeners.unshift(fn);
        };
        var removeListener = function (fn) {
            for (var i = 0; i < listeners.length; i += 1) {
                if (listeners[i] === fn) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        };
        var taskComplete = function () {
            remainingTasks--
            _each(listeners.slice(0), function (fn) {
                fn();
            });
        };

        addListener(function () {
            if (!remainingTasks) {
                var theCallback = callback;
                // prevent final callback from calling itself if it errors
                callback = function () {};

                theCallback(null, results);
            }
        });

        _each(keys, function (k) {
            var task = _isArray(tasks[k]) ? tasks[k]: [tasks[k]];
            var taskCallback = function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (args.length <= 1) {
                    args = args[0];
                }
                if (err) {
                    var safeResults = {};
                    _each(_keys(results), function(rkey) {
                        safeResults[rkey] = results[rkey];
                    });
                    safeResults[k] = args;
                    callback(err, safeResults);
                    // stop subsequent errors hitting callback multiple times
                    callback = function () {};
                }
                else {
                    results[k] = args;
                    async.setImmediate(taskComplete);
                }
            };
            var requires = task.slice(0, Math.abs(task.length - 1)) || [];
            var ready = function () {
                return _reduce(requires, function (a, x) {
                    return (a && results.hasOwnProperty(x));
                }, true) && !results.hasOwnProperty(k);
            };
            if (ready()) {
                task[task.length - 1](taskCallback, results);
            }
            else {
                var listener = function () {
                    if (ready()) {
                        removeListener(listener);
                        task[task.length - 1](taskCallback, results);
                    }
                };
                addListener(listener);
            }
        });
    };

    async.retry = function(times, task, callback) {
        var DEFAULT_TIMES = 5;
        var attempts = [];
        // Use defaults if times not passed
        if (typeof times === 'function') {
            callback = task;
            task = times;
            times = DEFAULT_TIMES;
        }
        // Make sure times is a number
        times = parseInt(times, 10) || DEFAULT_TIMES;
        var wrappedTask = function(wrappedCallback, wrappedResults) {
            var retryAttempt = function(task, finalAttempt) {
                return function(seriesCallback) {
                    task(function(err, result){
                        seriesCallback(!err || finalAttempt, {err: err, result: result});
                    }, wrappedResults);
                };
            };
            while (times) {
                attempts.push(retryAttempt(task, !(times-=1)));
            }
            async.series(attempts, function(done, data){
                data = data[data.length - 1];
                (wrappedCallback || callback)(data.err, data.result);
            });
        }
        // If a callback is passed, run this as a controll flow
        return callback ? wrappedTask() : wrappedTask
    };

    async.waterfall = function (tasks, callback) {
        callback = callback || function () {};
        if (!_isArray(tasks)) {
          var err = new Error('First argument to waterfall must be an array of functions');
          return callback(err);
        }
        if (!tasks.length) {
            return callback();
        }
        var wrapIterator = function (iterator) {
            return function (err) {
                if (err) {
                    callback.apply(null, arguments);
                    callback = function () {};
                }
                else {
                    var args = Array.prototype.slice.call(arguments, 1);
                    var next = iterator.next();
                    if (next) {
                        args.push(wrapIterator(next));
                    }
                    else {
                        args.push(callback);
                    }
                    async.setImmediate(function () {
                        iterator.apply(null, args);
                    });
                }
            };
        };
        wrapIterator(async.iterator(tasks))();
    };

    var _parallel = function(eachfn, tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            eachfn.map(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            eachfn.each(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.parallel = function (tasks, callback) {
        _parallel({ map: async.map, each: async.each }, tasks, callback);
    };

    async.parallelLimit = function(tasks, limit, callback) {
        _parallel({ map: _mapLimit(limit), each: _eachLimit(limit) }, tasks, callback);
    };

    async.series = function (tasks, callback) {
        callback = callback || function () {};
        if (_isArray(tasks)) {
            async.mapSeries(tasks, function (fn, callback) {
                if (fn) {
                    fn(function (err) {
                        var args = Array.prototype.slice.call(arguments, 1);
                        if (args.length <= 1) {
                            args = args[0];
                        }
                        callback.call(null, err, args);
                    });
                }
            }, callback);
        }
        else {
            var results = {};
            async.eachSeries(_keys(tasks), function (k, callback) {
                tasks[k](function (err) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (args.length <= 1) {
                        args = args[0];
                    }
                    results[k] = args;
                    callback(err);
                });
            }, function (err) {
                callback(err, results);
            });
        }
    };

    async.iterator = function (tasks) {
        var makeCallback = function (index) {
            var fn = function () {
                if (tasks.length) {
                    tasks[index].apply(null, arguments);
                }
                return fn.next();
            };
            fn.next = function () {
                return (index < tasks.length - 1) ? makeCallback(index + 1): null;
            };
            return fn;
        };
        return makeCallback(0);
    };

    async.apply = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return function () {
            return fn.apply(
                null, args.concat(Array.prototype.slice.call(arguments))
            );
        };
    };

    var _concat = function (eachfn, arr, fn, callback) {
        var r = [];
        eachfn(arr, function (x, cb) {
            fn(x, function (err, y) {
                r = r.concat(y || []);
                cb(err);
            });
        }, function (err) {
            callback(err, r);
        });
    };
    async.concat = doParallel(_concat);
    async.concatSeries = doSeries(_concat);

    async.whilst = function (test, iterator, callback) {
        if (test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.whilst(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doWhilst = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (test.apply(null, args)) {
                async.doWhilst(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.until = function (test, iterator, callback) {
        if (!test()) {
            iterator(function (err) {
                if (err) {
                    return callback(err);
                }
                async.until(test, iterator, callback);
            });
        }
        else {
            callback();
        }
    };

    async.doUntil = function (iterator, test, callback) {
        iterator(function (err) {
            if (err) {
                return callback(err);
            }
            var args = Array.prototype.slice.call(arguments, 1);
            if (!test.apply(null, args)) {
                async.doUntil(iterator, test, callback);
            }
            else {
                callback();
            }
        });
    };

    async.queue = function (worker, concurrency) {
        if (concurrency === undefined) {
            concurrency = 1;
        }
        function _insert(q, data, pos, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  callback: typeof callback === 'function' ? callback : null
              };

              if (pos) {
                q.tasks.unshift(item);
              } else {
                q.tasks.push(item);
              }

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }

        var workers = 0;
        var q = {
            tasks: [],
            concurrency: concurrency,
            saturated: null,
            empty: null,
            drain: null,
            started: false,
            paused: false,
            push: function (data, callback) {
              _insert(q, data, false, callback);
            },
            kill: function () {
              q.drain = null;
              q.tasks = [];
            },
            unshift: function (data, callback) {
              _insert(q, data, true, callback);
            },
            process: function () {
                if (!q.paused && workers < q.concurrency && q.tasks.length) {
                    var task = q.tasks.shift();
                    if (q.empty && q.tasks.length === 0) {
                        q.empty();
                    }
                    workers += 1;
                    var next = function () {
                        workers -= 1;
                        if (task.callback) {
                            task.callback.apply(task, arguments);
                        }
                        if (q.drain && q.tasks.length + workers === 0) {
                            q.drain();
                        }
                        q.process();
                    };
                    var cb = only_once(next);
                    worker(task.data, cb);
                }
            },
            length: function () {
                return q.tasks.length;
            },
            running: function () {
                return workers;
            },
            idle: function() {
                return q.tasks.length + workers === 0;
            },
            pause: function () {
                if (q.paused === true) { return; }
                q.paused = true;
                q.process();
            },
            resume: function () {
                if (q.paused === false) { return; }
                q.paused = false;
                q.process();
            }
        };
        return q;
    };
    
    async.priorityQueue = function (worker, concurrency) {
        
        function _compareTasks(a, b){
          return a.priority - b.priority;
        };
        
        function _binarySearch(sequence, item, compare) {
          var beg = -1,
              end = sequence.length - 1;
          while (beg < end) {
            var mid = beg + ((end - beg + 1) >>> 1);
            if (compare(item, sequence[mid]) >= 0) {
              beg = mid;
            } else {
              end = mid - 1;
            }
          }
          return beg;
        }
        
        function _insert(q, data, priority, callback) {
          if (!q.started){
            q.started = true;
          }
          if (!_isArray(data)) {
              data = [data];
          }
          if(data.length == 0) {
             // call drain immediately if there are no tasks
             return async.setImmediate(function() {
                 if (q.drain) {
                     q.drain();
                 }
             });
          }
          _each(data, function(task) {
              var item = {
                  data: task,
                  priority: priority,
                  callback: typeof callback === 'function' ? callback : null
              };
              
              q.tasks.splice(_binarySearch(q.tasks, item, _compareTasks) + 1, 0, item);

              if (q.saturated && q.tasks.length === q.concurrency) {
                  q.saturated();
              }
              async.setImmediate(q.process);
          });
        }
        
        // Start with a normal queue
        var q = async.queue(worker, concurrency);
        
        // Override push to accept second parameter representing priority
        q.push = function (data, priority, callback) {
          _insert(q, data, priority, callback);
        };
        
        // Remove unshift function
        delete q.unshift;

        return q;
    };

    async.cargo = function (worker, payload) {
        var working     = false,
            tasks       = [];

        var cargo = {
            tasks: tasks,
            payload: payload,
            saturated: null,
            empty: null,
            drain: null,
            drained: true,
            push: function (data, callback) {
                if (!_isArray(data)) {
                    data = [data];
                }
                _each(data, function(task) {
                    tasks.push({
                        data: task,
                        callback: typeof callback === 'function' ? callback : null
                    });
                    cargo.drained = false;
                    if (cargo.saturated && tasks.length === payload) {
                        cargo.saturated();
                    }
                });
                async.setImmediate(cargo.process);
            },
            process: function process() {
                if (working) return;
                if (tasks.length === 0) {
                    if(cargo.drain && !cargo.drained) cargo.drain();
                    cargo.drained = true;
                    return;
                }

                var ts = typeof payload === 'number'
                            ? tasks.splice(0, payload)
                            : tasks.splice(0, tasks.length);

                var ds = _map(ts, function (task) {
                    return task.data;
                });

                if(cargo.empty) cargo.empty();
                working = true;
                worker(ds, function () {
                    working = false;

                    var args = arguments;
                    _each(ts, function (data) {
                        if (data.callback) {
                            data.callback.apply(null, args);
                        }
                    });

                    process();
                });
            },
            length: function () {
                return tasks.length;
            },
            running: function () {
                return working;
            }
        };
        return cargo;
    };

    var _console_fn = function (name) {
        return function (fn) {
            var args = Array.prototype.slice.call(arguments, 1);
            fn.apply(null, args.concat([function (err) {
                var args = Array.prototype.slice.call(arguments, 1);
                if (typeof console !== 'undefined') {
                    if (err) {
                        if (console.error) {
                            console.error(err);
                        }
                    }
                    else if (console[name]) {
                        _each(args, function (x) {
                            console[name](x);
                        });
                    }
                }
            }]));
        };
    };
    async.log = _console_fn('log');
    async.dir = _console_fn('dir');
    /*async.info = _console_fn('info');
    async.warn = _console_fn('warn');
    async.error = _console_fn('error');*/

    async.memoize = function (fn, hasher) {
        var memo = {};
        var queues = {};
        hasher = hasher || function (x) {
            return x;
        };
        var memoized = function () {
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            var key = hasher.apply(null, args);
            if (key in memo) {
                async.nextTick(function () {
                    callback.apply(null, memo[key]);
                });
            }
            else if (key in queues) {
                queues[key].push(callback);
            }
            else {
                queues[key] = [callback];
                fn.apply(null, args.concat([function () {
                    memo[key] = arguments;
                    var q = queues[key];
                    delete queues[key];
                    for (var i = 0, l = q.length; i < l; i++) {
                      q[i].apply(null, arguments);
                    }
                }]));
            }
        };
        memoized.memo = memo;
        memoized.unmemoized = fn;
        return memoized;
    };

    async.unmemoize = function (fn) {
      return function () {
        return (fn.unmemoized || fn).apply(null, arguments);
      };
    };

    async.times = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.map(counter, iterator, callback);
    };

    async.timesSeries = function (count, iterator, callback) {
        var counter = [];
        for (var i = 0; i < count; i++) {
            counter.push(i);
        }
        return async.mapSeries(counter, iterator, callback);
    };

    async.seq = function (/* functions... */) {
        var fns = arguments;
        return function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            async.reduce(fns, args, function (newargs, fn, cb) {
                fn.apply(that, newargs.concat([function () {
                    var err = arguments[0];
                    var nextargs = Array.prototype.slice.call(arguments, 1);
                    cb(err, nextargs);
                }]))
            },
            function (err, results) {
                callback.apply(that, [err].concat(results));
            });
        };
    };

    async.compose = function (/* functions... */) {
      return async.seq.apply(null, Array.prototype.reverse.call(arguments));
    };

    var _applyEach = function (eachfn, fns /*args...*/) {
        var go = function () {
            var that = this;
            var args = Array.prototype.slice.call(arguments);
            var callback = args.pop();
            return eachfn(fns, function (fn, cb) {
                fn.apply(that, args.concat([cb]));
            },
            callback);
        };
        if (arguments.length > 2) {
            var args = Array.prototype.slice.call(arguments, 2);
            return go.apply(this, args);
        }
        else {
            return go;
        }
    };
    async.applyEach = doParallel(_applyEach);
    async.applyEachSeries = doSeries(_applyEach);

    async.forever = function (fn, callback) {
        function next(err) {
            if (err) {
                if (callback) {
                    return callback(err);
                }
                throw err;
            }
            fn(next);
        }
        next();
    };

    // Node.js
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = async;
    }
    // AMD / RequireJS
    else if (typeof define !== 'undefined' && define.amd) {
        define([], function () {
            return async;
        });
    }
    // included directly via <script> tag
    else {
        root.async = async;
    }

}());

}).call(this,require('_process'))
},{"_process":3}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
/// <reference path="../definitions/require.d.ts" />
/// <reference path="../definitions/higher-object.d.ts" />
"use strict";
var Chronology;
(function (Chronology) {
    Chronology.HigherObject = require("higher-object");
    Chronology.WallTime = require("../lib/walltime");
    Chronology.dateMath = require("../lib/date-math");
    Chronology.isInstanceOf = Chronology.HigherObject.isInstanceOf;
    function isDate(d) {
        return typeof d === 'object' && d.constructor.name === 'Date';
    }
    Chronology.isDate = isDate;
})(Chronology || (Chronology = {}));
var Chronology;
(function (Chronology) {
    /**
     * Represents timezones
     */
    var check;
    var Timezone = (function () {
        /**
         * Constructs a timezone form the string representation by checking that it is defined
         */
        function Timezone(timezone) {
            if (typeof timezone !== 'string') {
                throw new TypeError("timezone description must be a string");
            }
            Chronology.WallTime.UTCToWallTime(new Date(0), timezone); // This will throw an error if timezone is not a real timezone
            this.timezone = timezone;
        }
        Timezone.UTC = function () {
            return new Timezone('Etc/UTC');
        };
        Timezone.isTimezone = function (candidate) {
            return Chronology.isInstanceOf(candidate, Timezone);
        };
        Timezone.fromJS = function (spec) {
            return new Timezone(spec);
        };
        Timezone.prototype.valueOf = function () {
            return this.timezone;
        };
        Timezone.prototype.toJS = function () {
            return this.timezone;
        };
        Timezone.prototype.toJSON = function () {
            return this.timezone;
        };
        Timezone.prototype.toString = function () {
            return this.timezone;
        };
        Timezone.prototype.equals = function (other) {
            return Timezone.isTimezone(other) && this.timezone === other.timezone;
        };
        return Timezone;
    })();
    Chronology.Timezone = Timezone;
    check = Timezone;
})(Chronology || (Chronology = {}));
var Chronology;
(function (Chronology) {
    var getWeekDay = function (dt, tz) {
        var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
        var utcOffset = wt.getTimezoneOffset();
        var tzOffset = dt.getTimezoneOffset();
        var weekDay = new Date(dt.getTime() + tzOffset * 60000 - utcOffset * 60000).getDay() - 1;
        if (weekDay < 0)
            weekDay += 7;
        return weekDay;
    };
    Chronology.second = {
        canonicalLength: 1000,
        floor: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Seconds do not actually need a timezone because all timezones align on seconds... for now...
            dt = new Date(dt.valueOf());
            dt.setUTCMilliseconds(0);
            return dt;
        },
        ceil: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Seconds do not actually need a timezone because all timezones align on seconds... for now...
            dt = new Date(dt.valueOf());
            if (dt.getUTCMilliseconds()) {
                dt.setUTCMilliseconds(1000);
            }
            return dt;
        },
        move: function (dt, tz, step) {
            dt = new Date(dt.valueOf());
            dt.setUTCSeconds(dt.getUTCSeconds() + step);
            return dt;
        }
    };
    Chronology.minute = {
        canonicalLength: 60000,
        floor: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Minutes do not actually need a timezone because all timezones align on minutes... for now...
            dt = new Date(dt.valueOf());
            dt.setUTCSeconds(0, 0);
            return dt;
        },
        ceil: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Minutes do not actually need a timezone because all timezones align on minutes... for now...
            dt = new Date(dt.valueOf());
            if (dt.getUTCMilliseconds() || dt.getUTCSeconds()) {
                dt.setUTCSeconds(60, 0);
            }
            return dt;
        },
        move: function (dt, tz, step) {
            dt = new Date(dt.valueOf());
            dt.setUTCMinutes(dt.getUTCMinutes() + step);
            return dt;
        }
    };
    Chronology.hour = {
        canonicalLength: 3600000,
        floor: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Not all timezones align on hours! (India)
            dt = new Date(dt.valueOf());
            dt.setUTCMinutes(0, 0, 0);
            return dt;
        },
        ceil: function (dt, tz) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError(tz + " is not a valid timezone");
            }
            // Not all timezones align on hours! (India)
            dt = new Date(dt.valueOf());
            if (dt.getUTCMilliseconds() || dt.getUTCSeconds() || dt.getUTCMinutes()) {
                dt.setUTCMinutes(60, 0, 0);
            }
            return dt;
        },
        move: function (dt, tz, step) {
            dt = new Date(dt.valueOf());
            dt.setUTCHours(dt.getUTCHours() + step);
            return dt;
        }
    };
    Chronology.day = {
        canonicalLength: 24 * 3600000,
        floor: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate(), 0, 0, 0, 0);
        },
        ceil: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            var date = wt.getDate();
            if (wt.getMilliseconds() || wt.getSeconds() || wt.getMinutes() || wt.getHours()) {
                date++;
            }
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), date, 0, 0, 0, 0);
        },
        move: function (dt, tz, step) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError("tz must be provided");
            }
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate() + step, wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds());
        }
    };
    Chronology.week = {
        canonicalLength: 7 * 24 * 3600000,
        floor: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate() - getWeekDay(dt, tz), 0, 0, 0, 0);
        },
        ceil: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate() + (7 - getWeekDay(dt, tz)), 0, 0, 0, 0);
        },
        move: function (dt, tz, step) {
            if (!Chronology.Timezone.isTimezone(tz))
                throw new TypeError("tz must be provided");
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), wt.getDate() + step * 7, wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds());
        }
    };
    Chronology.month = {
        canonicalLength: 30 * 24 * 3600000,
        floor: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth(), 1, 0, 0, 0, 0);
        },
        ceil: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            var month = wt.getMonth();
            if (wt.getMilliseconds() || wt.getSeconds() || wt.getMinutes() || wt.getHours() || wt.getDate() !== 1) {
                month++;
            }
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), month, 1, 0, 0, 0, 0);
        },
        move: function (dt, tz, step) {
            if (!Chronology.Timezone.isTimezone(tz)) {
                throw new TypeError("tz must be provided");
            }
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), wt.getMonth() + step, wt.getDate(), wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds());
        }
    };
    Chronology.year = {
        canonicalLength: 365 * 24 * 3600000,
        floor: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear(), 0, 1, 0, 0, 0, 0);
        },
        ceil: function (dt, tz) {
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            var year = wt.getFullYear();
            if (wt.getMilliseconds() || wt.getSeconds() || wt.getMinutes() || wt.getHours() || wt.getDate() !== 1 || wt.getMonth()) {
                year++;
            }
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), year, 0, 1, 0, 0, 0, 0);
        },
        move: function (dt, tz, step) {
            if (!Chronology.Timezone.isTimezone(tz))
                throw new TypeError("tz must be provided");
            var wt = Chronology.WallTime.UTCToWallTime(dt, tz.toString());
            return Chronology.WallTime.WallTimeToUTC(tz.toString(), wt.getFullYear() + step, wt.getMonth(), wt.getDate(), wt.getHours(), wt.getMinutes(), wt.getSeconds(), wt.getMilliseconds());
        }
    };
    Chronology.movers = {
        second: Chronology.second,
        minute: Chronology.minute,
        hour: Chronology.hour,
        day: Chronology.day,
        week: Chronology.week,
        month: Chronology.month,
        year: Chronology.year
    };
})(Chronology || (Chronology = {}));
var Chronology;
(function (Chronology) {
    /**
     * A representation of a date expression
     * Can be a literal date or something like
     * FLOOR_DAY($now)-P1D
     */
    var check;
    var DateExpression = (function () {
        function DateExpression(dateJS) {
            if (Chronology.isDate(dateJS)) {
                if (isNaN(dateJS.valueOf())) {
                    throw new Error("Date expression must have a valid date");
                }
                this._date = dateJS;
                return;
            }
            if (typeof dateJS.action !== 'string')
                throw new TypeError("Invalid expression spec");
            this._action = dateJS.action;
            this._param = dateJS.gran || dateJS.name;
            if (dateJS.action.length === 1) {
                this._duration = Chronology.Duration.fromJS(dateJS.duration);
            }
            if (dateJS.action !== 'lookup') {
                this._subExpression = new DateExpression(dateJS.date);
            }
        }
        DateExpression.fromJS = function (dateJS) {
            if (typeof dateJS === 'string')
                dateJS = Chronology.dateMath.parse(dateJS);
            return new DateExpression(dateJS);
        };
        DateExpression.isDateExpression = function (candidate) {
            return Chronology.isInstanceOf(candidate, DateExpression);
        };
        DateExpression.prototype.valueOf = function () {
            if (this._date) {
                return this._date;
            }
            switch (this._action) {
                case '+':
                case '-':
                    return {
                        action: this._action,
                        date: this._subExpression.valueOf(),
                        duration: this._duration.toJS()
                    };
                case 'lookup':
                    return {
                        action: 'lookup',
                        name: this._param
                    };
                default:
                    return {
                        action: this._action,
                        gran: this._param,
                        date: this._subExpression.valueOf()
                    };
            }
        };
        /**
         * Produces the string form of the date expression
         */
        DateExpression.prototype.toString = function () {
            if (this._date)
                return this._date.toISOString().replace('.000Z', '');
            switch (this._action) {
                case '+':
                case '-':
                    return [
                        this._subExpression.toString(),
                        this._action,
                        this._duration.toString()
                    ].join('');
                case 'lookup':
                    return '$' + this._param;
                default:
                    return [
                        this._action.toUpperCase(),
                        '_',
                        this._param.toUpperCase(),
                        '(',
                        this._subExpression.toString(),
                        ')'
                    ].join('');
            }
        };
        /**
         * Produces the spec of the date expression
         */
        DateExpression.prototype.toJS = function () {
            if (this._date)
                return this._date;
            return this.toString();
        };
        /**
         * Produces the JSON of the date expression
         */
        DateExpression.prototype.toJSON = function () {
            if (this._date)
                return this._date.toISOString();
            return this.toString();
        };
        DateExpression.prototype.move = function (duration, tz, dir) {
            if (this.isLiteralDate()) {
                return new DateExpression(duration.move(this._date, tz, dir));
            }
            if (!this.hasDuration()) {
                return DateExpression.fromJS(this.toString() + (dir > 0 ? '+' : '-') + duration.toString());
            }
            var subExp = this._subExpression.toString();
            var newDuration;
            if ((this._action === '+' ? 1 : -1) === dir) {
                newDuration = this._duration.add(duration);
                return DateExpression.fromJS(subExp + this._action + newDuration.toString());
            }
            else {
                var offsetDurationCanonicalLength = duration.getCanonicalLength();
                var existingDurationCanonicalLength = this._duration.getCanonicalLength();
                if (offsetDurationCanonicalLength === existingDurationCanonicalLength) {
                    return DateExpression.fromJS(subExp);
                }
                else if (offsetDurationCanonicalLength < existingDurationCanonicalLength) {
                    newDuration = this._duration.subtract(duration);
                    return DateExpression.fromJS(subExp + this._action + newDuration.toString());
                }
                else {
                    newDuration = duration.subtract(this._duration);
                    return DateExpression.fromJS(subExp + (dir > 0 ? '+' : '-') + newDuration.toString());
                }
            }
        };
        DateExpression.prototype.add = function (duration, tz) {
            return this.move(duration, tz, 1);
        };
        DateExpression.prototype.subtract = function (duration, tz) {
            return this.move(duration, tz, -1);
        };
        /**
         * Checks if this date expression is equivalent to another date expression
         * @param other The other date expression to check
         */
        DateExpression.prototype.equals = function (other) {
            return Boolean(other) && this.toString() === other.toString();
        };
        /**
         * Checks if this date expression is just a date literal and not some fancy math
         */
        DateExpression.prototype.isLiteralDate = function () {
            return Boolean(this._date);
        };
        /**
         * Checks if this date expression has a duration to add/remove to its core expression
         */
        DateExpression.prototype.hasDuration = function () {
            return !!this._duration;
        };
        /**
         * Evaluates this expression for the given timezone and context
         * @param timezone the timezone within which to evaluate
         * @param context the date variables to substitute
         */
        DateExpression.prototype.evaluate = function (timezone, context) {
            if (context === void 0) { context = {}; }
            if (!Chronology.Timezone.isTimezone(timezone)) {
                throw new TypeError("Must have timezone");
            }
            if (this._date) {
                return this._date;
            }
            switch (this._action) {
                case '+':
                case '-':
                    return this._duration.move(this._subExpression.evaluate(timezone, context), timezone, this._action === "+" ? 1 : -1);
                case 'lookup':
                    if (!context.hasOwnProperty(this._param)) {
                        if (this._param === 'now')
                            return new Date();
                        throw new Error("Unknown lookup: '" + this._param + "'");
                    }
                    return context[this._param];
                default:
                    var intervalFloorMoveCeil = Chronology.movers[this._param];
                    return intervalFloorMoveCeil[this._action](this._subExpression.evaluate(timezone, context), timezone);
            }
        };
        return DateExpression;
    })();
    Chronology.DateExpression = DateExpression;
    check = DateExpression; // Check class type interface
})(Chronology || (Chronology = {}));
var Chronology;
(function (Chronology) {
    var spansWithWeek = ["year", "month", "week", "day", "hour", "minute", "second"];
    var spansWithoutWeek = ["year", "month", "day", "hour", "minute", "second"];
    var periodWeekRegExp = /^P(\d+)W$/;
    var periodRegExp = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
    //                   P   (year ) (month   ) (day     )    T(hour    ) (minute  ) (second  )
    function getSpansFromString(durationStr) {
        var spans = {};
        var matches;
        if (matches = periodWeekRegExp.exec(durationStr)) {
            spans.week = Number(matches[1]);
            if (!spans.week)
                throw new Error("Duration can not be empty");
        }
        else if (matches = periodRegExp.exec(durationStr)) {
            matches = matches.map(Number);
            for (var i = 0; i < spansWithoutWeek.length; i++) {
                var span = spansWithoutWeek[i];
                var value = matches[i + 1];
                if (value)
                    spans[span] = value;
            }
        }
        else {
            throw new Error("Can not parse duration '" + durationStr + "'");
        }
        return spans;
    }
    function getSpansFromStartEnd(start, end, timezone) {
        start = Chronology.second.floor(start, timezone);
        end = Chronology.second.floor(end, timezone);
        if (end <= start)
            throw new Error("start must come before end");
        var spans = {};
        var iterator = start;
        for (var i = 0; i < spansWithoutWeek.length; i++) {
            var span = spansWithoutWeek[i];
            var spanCount = 0;
            // Shortcut
            var length = end.valueOf() - iterator.valueOf();
            var canonicalLength = Chronology.movers[span].canonicalLength;
            if (length < canonicalLength / 4)
                continue;
            var numberToFit = Math.min(0, Math.floor(length / canonicalLength) - 1);
            var iteratorMove;
            if (numberToFit > 0) {
                // try to skip by numberToFit
                iteratorMove = Chronology.movers[span].move(iterator, timezone, numberToFit);
                if (iteratorMove <= end) {
                    spanCount += numberToFit;
                    iterator = iteratorMove;
                }
            }
            while (true) {
                iteratorMove = Chronology.movers[span].move(iterator, timezone, 1);
                if (iteratorMove <= end) {
                    iterator = iteratorMove;
                    spanCount++;
                }
                else {
                    break;
                }
            }
            if (spanCount) {
                spans[span] = spanCount;
            }
        }
        return spans;
    }
    function removeZeros(spans) {
        var newSpans = {};
        for (var i = 0; i < spansWithWeek.length; i++) {
            var span = spansWithWeek[i];
            if (spans[span] > 0) {
                newSpans[span] = spans[span];
            }
        }
        return newSpans;
    }
    /**
     * Represents an ISO duration like P1DT3H
     */
    var check;
    var Duration = (function () {
        function Duration(spans, end, timezone) {
            if (spans && end && timezone) {
                spans = getSpansFromStartEnd(spans, end, timezone);
            }
            else if (typeof spans === 'object') {
                spans = removeZeros(spans);
            }
            else {
                throw new Error("new Duration called with bad argument");
            }
            var usedSpans = Object.keys(spans);
            if (!usedSpans.length)
                throw new Error("Duration can not be empty");
            if (usedSpans.length === 1) {
                this.singleSpan = usedSpans[0];
            }
            else if (spans.week) {
                throw new Error("Can not mix 'week' and other spans");
            }
            this.spans = spans;
        }
        Duration.fromJS = function (durationStr) {
            if (typeof durationStr !== 'string')
                throw new TypeError("Duration JS must be a string");
            return new Duration(getSpansFromString(durationStr));
        };
        Duration.fromCanonicalLength = function (length) {
            var spans = {};
            for (var i = 0; i < spansWithWeek.length; i++) {
                var span = spansWithWeek[i];
                var spanLength = Chronology.movers[span].canonicalLength;
                var count = Math.floor(length / spanLength);
                length -= spanLength * count;
                spans[span] = count;
            }
            return new Duration(spans);
        };
        Duration.isDuration = function (candidate) {
            return Chronology.isInstanceOf(candidate, Duration);
        };
        Duration.prototype.toString = function () {
            var strArr = ["P"];
            var spans = this.spans;
            if (spans.week) {
                strArr.push(String(spans.week), 'W');
            }
            else {
                var addedT = false;
                for (var i = 0; i < spansWithoutWeek.length; i++) {
                    var span = spansWithoutWeek[i];
                    var value = spans[span];
                    if (!value)
                        continue;
                    if (!addedT && i >= 3) {
                        strArr.push("T");
                        addedT = true;
                    }
                    strArr.push(String(value), span[0].toUpperCase());
                }
            }
            return strArr.join("");
        };
        Duration.prototype.add = function (duration) {
            return Duration.fromCanonicalLength(this.getCanonicalLength() + duration.getCanonicalLength());
        };
        Duration.prototype.subtract = function (duration) {
            if (this.getCanonicalLength() - duration.getCanonicalLength() < 0) {
                throw new Error("A duration can not be negative.");
            }
            return Duration.fromCanonicalLength(this.getCanonicalLength() - duration.getCanonicalLength());
        };
        Duration.prototype.valueOf = function () {
            return this.spans;
        };
        Duration.prototype.toJS = function () {
            return this.toString();
        };
        Duration.prototype.toJSON = function () {
            return this.toString();
        };
        Duration.prototype.equals = function (other) {
            return Boolean(other) && this.toString() === other.toString();
        };
        Duration.prototype.isSimple = function () {
            return Boolean(this.singleSpan) && this.spans[this.singleSpan] === 1;
        };
        /**
         * Floors the date according to this duration.
         * @param date The date to floor
         * @param timezone The timezone within which to floor
         */
        Duration.prototype.floor = function (date, timezone) {
            if (!this.isSimple())
                throw new Error("Can not floor on a complex duration");
            return Chronology.movers[this.singleSpan].floor(date, timezone);
        };
        /**
         * Moves the given date by 'step' times of the duration
         * Negative step value will move back in time.
         * @param date The date to move
         * @param timezone The timezone within which to make the move
         * @param step The number of times to step by the duration
         */
        Duration.prototype.move = function (date, timezone, step) {
            if (step === void 0) { step = 1; }
            var spans = this.spans;
            for (var i = 0; i < spansWithWeek.length; i++) {
                var span = spansWithWeek[i];
                var value = spans[span];
                if (value)
                    date = Chronology.movers[span].move(date, timezone, step * value);
            }
            return date;
        };
        Duration.prototype.getCanonicalLength = function () {
            var spans = this.spans;
            var length = 0;
            for (var i = 0; i < spansWithWeek.length; i++) {
                var span = spansWithWeek[i];
                var value = spans[span];
                if (value)
                    length += value * Chronology.movers[span].canonicalLength;
            }
            return length;
        };
        Duration.prototype.canonicalLength = function () {
            // This method is deprecated
            console.warn("The method 'canonicalLength()' is deprecated. Please use 'getCanonicalLength()' instead.");
            return this.getCanonicalLength();
        };
        Duration.prototype.getDescription = function () {
            var spans = this.spans;
            var description = [];
            for (var i = 0; i < spansWithWeek.length; i++) {
                var span = spansWithWeek[i];
                var value = spans[span];
                if (value) {
                    if (value === 1) {
                        description.push(span);
                    }
                    else {
                        description.push(String(value) + ' ' + span + 's');
                    }
                }
            }
            return description.join(', ');
        };
        return Duration;
    })();
    Chronology.Duration = Duration;
    check = Duration;
})(Chronology || (Chronology = {}));
var Chronology;
(function (Chronology) {
    var check;
    var TimeRange = (function () {
        function TimeRange(parameters) {
            if (parameters.start) {
                if (!(parameters.start instanceof Chronology.DateExpression))
                    throw new TypeError("start must be a DateExpression");
                this.start = parameters.start;
            }
            if (parameters.duration) {
                if (!(parameters.duration instanceof Chronology.Duration))
                    throw new TypeError("duration must be a Duration");
                this.duration = parameters.duration;
            }
            if (parameters.end) {
                if (!(parameters.end instanceof Chronology.DateExpression))
                    throw new TypeError("end must be a DateExpression");
                this.end = parameters.end;
            }
            var paramNumber = Number(Boolean(this.start)) + Number(Boolean(this.duration)) + Number(Boolean(this.end));
            if (paramNumber > 2)
                throw new Error("Over constrained, can't have start, duration, and end");
            if (paramNumber < 2)
                throw new Error("Under constrained");
        }
        TimeRange.fromJS = function (spec) {
            return new TimeRange({
                start: spec.start ? Chronology.DateExpression.fromJS(spec.start) : void 0,
                duration: spec.duration ? Chronology.Duration.fromJS(spec.duration) : void 0,
                end: spec.end ? Chronology.DateExpression.fromJS(spec.end) : void 0
            });
        };
        TimeRange.isTimeRange = function (candidate) {
            return Chronology.isInstanceOf(candidate, TimeRange);
        };
        TimeRange.prototype.valueOf = function () {
            var spec = {};
            if (this.start) {
                spec.start = this.start;
            }
            if (this.duration) {
                spec.duration = this.duration;
            }
            if (this.end) {
                spec.end = this.end;
            }
            return spec;
        };
        TimeRange.prototype.toJS = function () {
            var spec = {};
            if (this.start) {
                spec.start = this.start.toJS();
            }
            if (this.duration) {
                spec.duration = this.duration.toJS();
            }
            if (this.end) {
                spec.end = this.end.toJS();
            }
            return spec;
        };
        TimeRange.prototype.toJSON = function () {
            return this.toJS();
        };
        TimeRange.prototype.toString = function () {
            return [
                this.start,
                this.duration,
                this.end
            ].filter(Boolean).join(';');
        };
        TimeRange.prototype.equals = function (other) {
            return TimeRange.isTimeRange(other) && (this.start != null ? this.start.toString() : '') === (other.start != null ? other.start.toString() : '') && (this.duration != null ? this.duration.toString() : '') === (other.duration != null ? other.duration.toString() : '') && (this.end != null ? this.end.toString() : '') === (other.end != null ? other.end.toString() : '');
        };
        /**
         * Evaluates this range for the given timezone and context
         * @param timezone the timezone within which to evaluate
         * @param context the date variables to substitute
         */
        TimeRange.prototype.evaluate = function (timezone, context) {
            if (context === void 0) { context = {}; }
            if (!Chronology.Timezone.isTimezone(timezone)) {
                throw new TypeError("Must have timezone");
            }
            var startDate;
            var endDate;
            if (this.start) {
                startDate = this.start.evaluate(timezone, context);
            }
            if (this.end) {
                endDate = this.end.evaluate(timezone, context);
            }
            if (this.duration) {
                if (startDate) {
                    endDate = this.duration.move(startDate, timezone, +1);
                }
                if (endDate) {
                    startDate = this.duration.move(endDate, timezone, -1);
                }
            }
            return [startDate, endDate];
        };
        /**
         * Get the duration for a given timezone and context
         * @param timezone the timezone within which to evaluate
         * @param context the date variables to substitute
         */
        TimeRange.prototype.getDuration = function (timezone, context) {
            if (context === void 0) { context = {}; }
            if (!Chronology.Timezone.isTimezone(timezone)) {
                throw new TypeError("Must have timezone");
            }
            if (this.duration)
                return this.duration;
            var range = this.evaluate(timezone, context);
            return new Chronology.Duration(range[0], range[1], timezone);
        };
        TimeRange.prototype.canMove = function () {
            return Number(Boolean(this.start && this.start.isLiteralDate())) + Number(Boolean(this.end && this.end.isLiteralDate())) + Number(Boolean(this.duration)) === 2;
        };
        TimeRange.prototype.move = function (moveDuration, timezone, step) {
            if (step === void 0) { step = 1; }
            if (!moveDuration) {
                throw new TypeError("Must have move duration");
            }
            if (!Chronology.Timezone.isTimezone(timezone)) {
                throw new TypeError("Must have timezone");
            }
            if (!this.canMove())
                return null;
            var newJS = {};
            if (this.duration) {
                newJS.duration = this.duration;
            }
            if (this.start) {
                newJS.start = new Chronology.DateExpression(moveDuration.move(this.start.evaluate(timezone, {}), timezone, step));
            }
            if (this.end) {
                newJS.end = new Chronology.DateExpression(moveDuration.move(this.end.evaluate(timezone, {}), timezone, step));
            }
            return new TimeRange(newJS);
        };
        TimeRange.prototype.add = function (duration, timezone) {
            var newJS = {};
            if (this.duration) {
                newJS.duration = this.duration;
            }
            if (this.start) {
                newJS.start = this.start.add(duration, timezone);
            }
            if (this.end) {
                newJS.end = this.end.add(duration, timezone);
            }
            return new TimeRange(newJS);
        };
        TimeRange.prototype.subtract = function (duration, timezone) {
            var newJS = {};
            if (this.duration) {
                newJS.duration = this.duration;
            }
            if (this.start) {
                newJS.start = this.start.subtract(duration, timezone);
            }
            if (this.end) {
                newJS.end = this.end.subtract(duration, timezone);
            }
            return new TimeRange(newJS);
        };
        return TimeRange;
    })();
    Chronology.TimeRange = TimeRange;
    check = TimeRange;
})(Chronology || (Chronology = {}));
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Chronology;
}

},{"../lib/date-math":5,"../lib/walltime":6,"higher-object":7}],5:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = function(date, op, duration) { return { date: date, action: op, duration: duration } },
        peg$c2 = "+",
        peg$c3 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c4 = "-",
        peg$c5 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c6 = "_",
        peg$c7 = { type: "literal", value: "_", description: "\"_\"" },
        peg$c8 = "(",
        peg$c9 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c10 = ")",
        peg$c11 = { type: "literal", value: ")", description: "\")\"" },
        peg$c12 = function(action, gran, date) { return { action: action, gran: gran, date: date } },
        peg$c13 = [],
        peg$c14 = /^[0-9\-T:.Z]/,
        peg$c15 = { type: "class", value: "[0-9\\-T:.Z]", description: "[0-9\\-T:.Z]" },
        peg$c16 = function(dt) {
              var date = new Date(dt);
              if (isNaN(date)) throw new Error("Invalid date: '" + dt + "'");
              return date;
            },
        peg$c17 = "$",
        peg$c18 = { type: "literal", value: "$", description: "\"$\"" },
        peg$c19 = /^[a-z_]/i,
        peg$c20 = { type: "class", value: "[a-z_]i", description: "[a-z_]i" },
        peg$c21 = function(name) { return { action: 'lookup', name: name }; },
        peg$c22 = "FLOOR",
        peg$c23 = { type: "literal", value: "FLOOR", description: "\"FLOOR\"" },
        peg$c24 = "CEIL",
        peg$c25 = { type: "literal", value: "CEIL", description: "\"CEIL\"" },
        peg$c26 = function(action) { return action.toLowerCase(); },
        peg$c27 = "SECOND",
        peg$c28 = { type: "literal", value: "SECOND", description: "\"SECOND\"" },
        peg$c29 = "MINUTE",
        peg$c30 = { type: "literal", value: "MINUTE", description: "\"MINUTE\"" },
        peg$c31 = "HOUR",
        peg$c32 = { type: "literal", value: "HOUR", description: "\"HOUR\"" },
        peg$c33 = "DAY",
        peg$c34 = { type: "literal", value: "DAY", description: "\"DAY\"" },
        peg$c35 = "WEEK",
        peg$c36 = { type: "literal", value: "WEEK", description: "\"WEEK\"" },
        peg$c37 = "MONTH",
        peg$c38 = { type: "literal", value: "MONTH", description: "\"MONTH\"" },
        peg$c39 = "YEAR",
        peg$c40 = { type: "literal", value: "YEAR", description: "\"YEAR\"" },
        peg$c41 = function(gran) { return gran.toLowerCase(); },
        peg$c42 = { type: "other", description: "Duration String" },
        peg$c43 = "P",
        peg$c44 = { type: "literal", value: "P", description: "\"P\"" },
        peg$c45 = /^[0-9WYMDTHS]/,
        peg$c46 = { type: "class", value: "[0-9WYMDTHS]", description: "[0-9WYMDTHS]" },
        peg$c47 = { type: "other", description: "Whitespace" },
        peg$c48 = /^[ \t\r\n]/,
        peg$c49 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseDate();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseOp();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseDuration();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c1(s1, s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseDate();
      }

      return s0;
    }

    function peg$parseOp() {
      var s0;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c2;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c3); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c4;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c5); }
        }
      }

      return s0;
    }

    function peg$parseDate() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$parseLiteral();
      if (s0 === peg$FAILED) {
        s0 = peg$parseVariable();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseAction();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 95) {
              s2 = peg$c6;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c7); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseGran();
              if (s3 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 40) {
                  s4 = peg$c8;
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c9); }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    s6 = peg$parseDate();
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 41) {
                          s8 = peg$c10;
                          peg$currPos++;
                        } else {
                          s8 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c11); }
                        }
                        if (s8 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c12(s1, s3, s6);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }

      return s0;
    }

    function peg$parseLiteral() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = [];
      if (peg$c14.test(input.charAt(peg$currPos))) {
        s3 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c15); }
      }
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          if (peg$c14.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
        }
      } else {
        s2 = peg$c0;
      }
      if (s2 !== peg$FAILED) {
        s2 = input.substring(s1, peg$currPos);
      }
      s1 = s2;
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c16(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseVariable() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 36) {
        s1 = peg$c17;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        if (peg$c19.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c20); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c19.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c20); }
            }
          }
        } else {
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          s3 = input.substring(s2, peg$currPos);
        }
        s2 = s3;
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c21(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseAction() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c22) {
        s1 = peg$c22;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c24) {
          s1 = peg$c24;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c25); }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c26(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseGran() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c27) {
        s1 = peg$c27;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 6) === peg$c29) {
          s1 = peg$c29;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c30); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c31) {
            s1 = peg$c31;
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c32); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c33) {
              s1 = peg$c33;
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c34); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c35) {
                s1 = peg$c35;
                peg$currPos += 4;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c36); }
              }
              if (s1 === peg$FAILED) {
                if (input.substr(peg$currPos, 5) === peg$c37) {
                  s1 = peg$c37;
                  peg$currPos += 5;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s1 === peg$FAILED) {
                  if (input.substr(peg$currPos, 4) === peg$c39) {
                    s1 = peg$c39;
                    peg$currPos += 4;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c40); }
                  }
                }
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c41(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseDuration() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 80) {
        s2 = peg$c43;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c45.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c46); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c45.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c46); }
            }
          }
        } else {
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c48.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c49); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c48.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c49); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c47); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],6:[function(require,module,exports){
/*
 *  WallTime 0.1.2
 *  Copyright (c) 2013 Sprout Social, Inc.
 *  Available under the MIT License (http://bit.ly/walltime-license)
 */

(function() {
  var Days, Milliseconds, Months, Time, helpers, _base;

  (_base = Array.prototype).indexOf || (_base.indexOf = function(item) {
    var i, x, _i, _len;
    for (i = _i = 0, _len = this.length; _i < _len; i = ++_i) {
      x = this[i];
      if (x === item) {
        return i;
      }
    }
    return -1;
  });

  Days = {
    DayShortNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    DayIndex: function(name) {
      return this.DayShortNames.indexOf(name);
    },
    DayNameFromIndex: function(dayIdx) {
      return this.DayShortNames[dayIdx];
    },
    AddToDate: function(dt, days) {
      return Time.MakeDateFromTimeStamp(dt.getTime() + (days * Milliseconds.inDay));
    }
  };

  Months = {
    MonthsShortNames: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    CompareRuleMatch: new RegExp("([a-zA-Z]*)([\\<\\>]?=)([0-9]*)"),
    MonthIndex: function(shortName) {
      return this.MonthsShortNames.indexOf(shortName.slice(0, 3));
    },
    IsDayOfMonthRule: function(str) {
      return str.indexOf(">") > -1 || str.indexOf("<") > -1 || str.indexOf("=") > -1;
    },
    IsLastDayOfMonthRule: function(str) {
      return str.slice(0, 4) === "last";
    },
    DayOfMonthByRule: function(str, year, month) {
      var compareFunc, compares, dateIndex, dayIndex, dayName, ruleParse, testDate, testPart, _ref;
      ruleParse = this.CompareRuleMatch.exec(str);
      if (!ruleParse) {
        throw new Error("Unable to parse the 'on' rule for " + str);
      }
      _ref = ruleParse.slice(1, 4), dayName = _ref[0], testPart = _ref[1], dateIndex = _ref[2];
      dateIndex = parseInt(dateIndex, 10);
      if (dateIndex === NaN) {
        throw new Error("Unable to parse the dateIndex of the 'on' rule for " + str);
      }
      dayIndex = helpers.Days.DayIndex(dayName);
      compares = {
        ">=": function(a, b) {
          return a >= b;
        },
        "<=": function(a, b) {
          return a <= b;
        },
        ">": function(a, b) {
          return a > b;
        },
        "<": function(a, b) {
          return a < b;
        },
        "=": function(a, b) {
          return a === b;
        }
      };
      compareFunc = compares[testPart];
      if (!compareFunc) {
        throw new Error("Unable to parse the conditional for " + testPart);
      }
      testDate = helpers.Time.MakeDateFromParts(year, month);
      while (!(dayIndex === testDate.getUTCDay() && compareFunc(testDate.getUTCDate(), dateIndex))) {
        testDate = helpers.Days.AddToDate(testDate, 1);
      }
      return testDate.getUTCDate();
    },
    LastDayOfMonthRule: function(str, year, month) {
      var dayIndex, dayName, lastDay;
      dayName = str.slice(4);
      dayIndex = helpers.Days.DayIndex(dayName);
      if (month < 11) {
        lastDay = helpers.Time.MakeDateFromParts(year, month + 1);
      } else {
        lastDay = helpers.Time.MakeDateFromParts(year + 1, 0);
      }
      lastDay = helpers.Days.AddToDate(lastDay, -1);
      while (lastDay.getUTCDay() !== dayIndex) {
        lastDay = helpers.Days.AddToDate(lastDay, -1);
      }
      return lastDay.getUTCDate();
    }
  };

  Milliseconds = {
    inDay: 86400000,
    inHour: 3600000,
    inMinute: 60000,
    inSecond: 1000
  };

  Time = {
    Add: function(dt, hours, mins, secs) {
      var newTs;
      if (hours == null) {
        hours = 0;
      }
      if (mins == null) {
        mins = 0;
      }
      if (secs == null) {
        secs = 0;
      }
      newTs = dt.getTime() + (hours * Milliseconds.inHour) + (mins * Milliseconds.inMinute) + (secs * Milliseconds.inSecond);
      return this.MakeDateFromTimeStamp(newTs);
    },
    ParseGMTOffset: function(str) {
      var isNeg, match, matches, reg, result;
      reg = new RegExp("(-)?([0-9]*):([0-9]*):?([0-9]*)?");
      matches = reg.exec(str);
      result = matches ? (function() {
        var _i, _len, _ref, _results;
        _ref = matches.slice(2);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          match = _ref[_i];
          _results.push(parseInt(match, 10));
        }
        return _results;
      })() : [0, 0, 0];
      isNeg = matches && matches[1] === "-";
      result.splice(0, 0, isNeg);
      return result;
    },
    ParseTime: function(str) {
      var match, matches, qual, reg, timeParts;
      reg = new RegExp("(\\d*)\\:(\\d*)([wsugz]?)");
      matches = reg.exec(str);
      if (!matches) {
        return [0, 0, ''];
      }
      timeParts = (function() {
        var _i, _len, _ref, _results;
        _ref = matches.slice(1, 3);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          match = _ref[_i];
          _results.push(parseInt(match, 10));
        }
        return _results;
      })();
      qual = matches[3] ? matches[3] : '';
      timeParts.push(qual);
      return timeParts;
    },
    ApplyOffset: function(dt, offset, reverse) {
      var offset_ms;
      offset_ms = (Milliseconds.inHour * offset.hours) + (Milliseconds.inMinute * offset.mins) + (Milliseconds.inSecond * offset.secs);
      if (!offset.negative) {
        offset_ms = offset_ms * -1;
      }
      if (reverse) {
        offset_ms = offset_ms * -1;
      }
      return this.MakeDateFromTimeStamp(dt.getTime() + offset_ms);
    },
    ApplySave: function(dt, save, reverse) {
      if (reverse !== true) {
        reverse = false;
      }
      return this.ApplyOffset(dt, {
        negative: true,
        hours: save.hours,
        mins: save.mins,
        secs: 0
      }, reverse);
    },
    UTCToWallTime: function(dt, offset, save) {
      var endTime;
      endTime = this.UTCToStandardTime(dt, offset);
      return this.ApplySave(endTime, save);
    },
    UTCToStandardTime: function(dt, offset) {
      return this.ApplyOffset(dt, offset, true);
    },
    UTCToQualifiedTime: function(dt, qualifier, offset, getSave) {
      var endTime;
      endTime = dt;
      switch (qualifier) {
        case "w":
          endTime = this.UTCToWallTime(endTime, offset, getSave());
          break;
        case "s":
          endTime = this.UTCToStandardTime(endTime, offset);
          break;
      }
      return endTime;
    },
    QualifiedTimeToUTC: function(dt, qualifier, offset, getSave) {
      var endTime;
      endTime = dt;
      switch (qualifier) {
        case "w":
          endTime = this.WallTimeToUTC(offset, getSave(), endTime);
          break;
        case "s":
          endTime = this.StandardTimeToUTC(offset, endTime);
          break;
      }
      return endTime;
    },
    StandardTimeToUTC: function(offset, y, m, d, h, mi, s, ms) {
      var dt;
      if (m == null) {
        m = 0;
      }
      if (d == null) {
        d = 1;
      }
      if (h == null) {
        h = 0;
      }
      if (mi == null) {
        mi = 0;
      }
      if (s == null) {
        s = 0;
      }
      if (ms == null) {
        ms = 0;
      }
      dt = typeof y === "number" ? this.MakeDateFromParts(y, m, d, h, mi, s, ms) : y;
      return this.ApplyOffset(dt, offset);
    },
    WallTimeToUTC: function(offset, save, y, m, d, h, mi, s, ms) {
      var dt;
      if (m == null) {
        m = 0;
      }
      if (d == null) {
        d = 1;
      }
      if (h == null) {
        h = 0;
      }
      if (mi == null) {
        mi = 0;
      }
      if (s == null) {
        s = 0;
      }
      if (ms == null) {
        ms = 0;
      }
      dt = this.StandardTimeToUTC(offset, y, m, d, h, mi, s, ms);
      return this.ApplySave(dt, save, true);
    },
    MakeDateFromParts: function(y, m, d, h, mi, s, ms) {
      var dt;
      if (m == null) {
        m = 0;
      }
      if (d == null) {
        d = 1;
      }
      if (h == null) {
        h = 0;
      }
      if (mi == null) {
        mi = 0;
      }
      if (s == null) {
        s = 0;
      }
      if (ms == null) {
        ms = 0;
      }
      if (Date.UTC) {
        return new Date(Date.UTC(y, m, d, h, mi, s, ms));
      }
      dt = new Date;
      dt.setUTCFullYear(y);
      dt.setUTCMonth(m);
      dt.setUTCDate(d);
      dt.setUTCHours(h);
      dt.setUTCMinutes(mi);
      dt.setUTCSeconds(s);
      dt.setUTCMilliseconds(ms);
      return dt;
    },
    LocalDate: function(offset, save, y, m, d, h, mi, s, ms) {
      if (m == null) {
        m = 0;
      }
      if (d == null) {
        d = 1;
      }
      if (h == null) {
        h = 0;
      }
      if (mi == null) {
        mi = 0;
      }
      if (s == null) {
        s = 0;
      }
      if (ms == null) {
        ms = 0;
      }
      return this.WallTimeToUTC(offset, save, y, m, d, h, mi, s, ms);
    },
    MakeDateFromTimeStamp: function(ts) {
      return new Date(ts);
    },
    MaxDate: function() {
      return this.MakeDateFromTimeStamp(10000000 * 86400000);
    },
    MinDate: function() {
      return this.MakeDateFromTimeStamp(-10000000 * 86400000);
    }
  };

  helpers = {
    Days: Days,
    Months: Months,
    Milliseconds: Milliseconds,
    Time: Time,
    noSave: {
      hours: 0,
      mins: 0
    },
    noZone: {
      offset: {
        negative: false,
        hours: 0,
        mins: 0,
        secs: 0
      },
      name: "UTC"
    }
  };

  if (typeof window === 'undefined_') {
    module.exports = helpers;
  } else if (typeof define !== 'undefined') {
    define('olson/helpers',helpers);
  } else {
    this.WallTime || (this.WallTime = {});
    this.WallTime.helpers = helpers;
  }

}).call(this);

(function() {
  var init, req_helpers;

  init = function(helpers) {
    var TimeZoneTime;
    TimeZoneTime = (function() {
      function TimeZoneTime(utc, zone, save) {
        this.utc = utc;
        this.zone = zone;
        this.save = save;
        this.offset = this.zone.offset;
        this.wallTime = helpers.Time.UTCToWallTime(this.utc, this.offset, this.save);
      }

      TimeZoneTime.prototype.getFullYear = function() {
        return this.wallTime.getUTCFullYear();
      };

      TimeZoneTime.prototype.getMonth = function() {
        return this.wallTime.getUTCMonth();
      };

      TimeZoneTime.prototype.getDate = function() {
        return this.wallTime.getUTCDate();
      };

      TimeZoneTime.prototype.getDay = function() {
        return this.wallTime.getUTCDay();
      };

      TimeZoneTime.prototype.getHours = function() {
        return this.wallTime.getUTCHours();
      };

      TimeZoneTime.prototype.getMinutes = function() {
        return this.wallTime.getUTCMinutes();
      };

      TimeZoneTime.prototype.getSeconds = function() {
        return this.wallTime.getUTCSeconds();
      };

      TimeZoneTime.prototype.getMilliseconds = function() {
        return this.wallTime.getUTCMilliseconds();
      };

      TimeZoneTime.prototype.getUTCFullYear = function() {
        return this.utc.getUTCFullYear();
      };

      TimeZoneTime.prototype.getUTCMonth = function() {
        return this.utc.getUTCMonth();
      };

      TimeZoneTime.prototype.getUTCDate = function() {
        return this.utc.getUTCDate();
      };

      TimeZoneTime.prototype.getUTCDay = function() {
        return this.utc.getUTCDay();
      };

      TimeZoneTime.prototype.getUTCHours = function() {
        return this.utc.getUTCHours();
      };

      TimeZoneTime.prototype.getUTCMinutes = function() {
        return this.utc.getUTCMinutes();
      };

      TimeZoneTime.prototype.getUTCSeconds = function() {
        return this.utc.getUTCSeconds();
      };

      TimeZoneTime.prototype.getUTCMilliseconds = function() {
        return this.utc.getUTCMilliseconds();
      };

      TimeZoneTime.prototype.getTime = function() {
        return this.utc.getTime();
      };

      TimeZoneTime.prototype.getTimezoneOffset = function() {
        var base, dst;
        base = (this.offset.hours * 60) + this.offset.mins;
        dst = (this.save.hours * 60) + this.save.mins;
        if (!this.offset.negative) {
          base = -base;
        }
        return base - dst;
      };

      TimeZoneTime.prototype.toISOString = function() {
        return this.utc.toISOString();
      };

      TimeZoneTime.prototype.toUTCString = function() {
        return this.wallTime.toUTCString();
      };

      TimeZoneTime.prototype.toDateString = function() {
        var caps, utcStr;
        utcStr = this.wallTime.toUTCString();
        caps = utcStr.match("([a-zA-Z]*), ([0-9]+) ([a-zA-Z]*) ([0-9]+)");
        return [caps[1], caps[3], caps[2], caps[4]].join(" ");
      };

      TimeZoneTime.prototype.toFormattedTime = function(use24HourTime) {
        var hour, meridiem, min, origHour;
        if (use24HourTime == null) {
          use24HourTime = false;
        }
        hour = origHour = this.getHours();
        if (hour > 12 && !use24HourTime) {
          hour -= 12;
        }
        if (hour === 0) {
          hour = 12;
        }
        min = this.getMinutes();
        if (min < 10) {
          min = "0" + min;
        }
        meridiem = origHour > 11 ? ' PM' : ' AM';
        if (use24HourTime) {
          meridiem = '';
        }
        return "" + hour + ":" + min + meridiem;
      };

      TimeZoneTime.prototype.setTime = function(ms) {
        this.wallTime = helpers.Time.UTCToWallTime(new Date(ms), this.zone.offset, this.save);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setFullYear = function(y) {
        this.wallTime.setUTCFullYear(y);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setMonth = function(m) {
        this.wallTime.setUTCMonth(m);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setDate = function(utcDate) {
        this.wallTime.setUTCDate(utcDate);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setHours = function(hours) {
        this.wallTime.setUTCHours(hours);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setMinutes = function(m) {
        this.wallTime.setUTCMinutes(m);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setSeconds = function(s) {
        this.wallTime.setUTCSeconds(s);
        return this._updateUTC();
      };

      TimeZoneTime.prototype.setMilliseconds = function(ms) {
        this.wallTime.setUTCMilliseconds(ms);
        return this._updateUTC();
      };

      TimeZoneTime.prototype._updateUTC = function() {
        this.utc = helpers.Time.WallTimeToUTC(this.offset, this.save, this.getFullYear(), this.getMonth(), this.getDate(), this.getHours(), this.getMinutes(), this.getSeconds(), this.getMilliseconds());
        return this.utc.getTime();
      };

      return TimeZoneTime;

    })();
    return TimeZoneTime;
  };

  if (typeof window === 'undefined_') {
    req_helpers = require_("./helpers");
    module.exports = init(req_helpers);
  } else if (typeof define !== 'undefined') {
    define('olson/timezonetime',["olson/helpers"], init);
  } else {
    this.WallTime || (this.WallTime = {});
    this.WallTime.TimeZoneTime = init(this.WallTime.helpers);
  }

}).call(this);

(function() {
  var init, req_TimeZoneTime, req_helpers,
    __hasProp = {}.hasOwnProperty;

  init = function(helpers, TimeZoneTime) {
    var CompareOnFieldHandler, LastOnFieldHandler, NumberOnFieldHandler, Rule, RuleSet, lib;
    NumberOnFieldHandler = (function() {
      function NumberOnFieldHandler() {}

      NumberOnFieldHandler.prototype.applies = function(str) {
        return !isNaN(parseInt(str, 10));
      };

      NumberOnFieldHandler.prototype.parseDate = function(str) {
        return parseInt(str, 10);
      };

      return NumberOnFieldHandler;

    })();
    LastOnFieldHandler = (function() {
      function LastOnFieldHandler() {}

      LastOnFieldHandler.prototype.applies = helpers.Months.IsLastDayOfMonthRule;

      LastOnFieldHandler.prototype.parseDate = function(str, year, month, qualifier, gmtOffset, daylightOffset) {
        return helpers.Months.LastDayOfMonthRule(str, year, month);
      };

      return LastOnFieldHandler;

    })();
    CompareOnFieldHandler = (function() {
      function CompareOnFieldHandler() {}

      CompareOnFieldHandler.prototype.applies = helpers.Months.IsDayOfMonthRule;

      CompareOnFieldHandler.prototype.parseDate = function(str, year, month) {
        return helpers.Months.DayOfMonthByRule(str, year, month);
      };

      return CompareOnFieldHandler;

    })();
    Rule = (function() {
      function Rule(name, _from, _to, type, _in, on, at, _save, letter) {
        var saveHour, saveMinute, toYear, _ref;
        this.name = name;
        this._from = _from;
        this._to = _to;
        this.type = type;
        this["in"] = _in;
        this.on = on;
        this.at = at;
        this._save = _save;
        this.letter = letter;
        this.from = parseInt(this._from, 10);
        this.isMax = false;
        toYear = this.from;
        switch (this._to) {
          case "max":
            toYear = (helpers.Time.MaxDate()).getUTCFullYear();
            this.isMax = true;
            break;
          case "only":
            toYear = this.from;
            break;
          default:
            toYear = parseInt(this._to, 10);
        }
        this.to = toYear;
        _ref = this._parseTime(this._save), saveHour = _ref[0], saveMinute = _ref[1];
        this.save = {
          hours: saveHour,
          mins: saveMinute
        };
      }

      Rule.prototype.forZone = function(offset) {
        this.offset = offset;
        this.fromUTC = helpers.Time.MakeDateFromParts(this.from, 0, 1, 0, 0, 0);
        this.fromUTC = helpers.Time.ApplyOffset(this.fromUTC, offset);
        this.toUTC = helpers.Time.MakeDateFromParts(this.to, 11, 31, 23, 59, 59, 999);
        return this.toUTC = helpers.Time.ApplyOffset(this.toUTC, offset);
      };

      Rule.prototype.setOnUTC = function(year, offset, getPrevSave) {
        var atQualifier, onParsed, toDay, toHour, toMinute, toMonth, _ref,
          _this = this;
        toMonth = helpers.Months.MonthIndex(this["in"]);
        onParsed = parseInt(this.on, 10);
        toDay = !isNaN(onParsed) ? onParsed : this._parseOnDay(this.on, year, toMonth);
        _ref = this._parseTime(this.at), toHour = _ref[0], toMinute = _ref[1], atQualifier = _ref[2];
        this.onUTC = helpers.Time.MakeDateFromParts(year, toMonth, toDay, toHour, toMinute);
        this.onUTC.setUTCMilliseconds(this.onUTC.getUTCMilliseconds() - 1);
        this.atQualifier = atQualifier !== '' ? atQualifier : "w";
        this.onUTC = helpers.Time.QualifiedTimeToUTC(this.onUTC, this.atQualifier, offset, function() {
          return getPrevSave(_this);
        });
        return this.onSort = "" + toMonth + "-" + toDay + "-" + (this.onUTC.getUTCHours()) + "-" + (this.onUTC.getUTCMinutes());
      };

      Rule.prototype.appliesToUTC = function(dt) {
        return (this.fromUTC <= dt && dt <= this.toUTC);
      };

      Rule.prototype._parseOnDay = function(onStr, year, month) {
        var handler, handlers, _i, _len;
        handlers = [new NumberOnFieldHandler, new LastOnFieldHandler, new CompareOnFieldHandler];
        for (_i = 0, _len = handlers.length; _i < _len; _i++) {
          handler = handlers[_i];
          if (!handler.applies(onStr)) {
            continue;
          }
          return handler.parseDate(onStr, year, month);
        }
        throw new Error("Unable to parse 'on' field for " + this.name + "|" + this._from + "|" + this._to + "|" + onStr);
      };

      Rule.prototype._parseTime = function(atStr) {
        return helpers.Time.ParseTime(atStr);
      };

      return Rule;

    })();
    RuleSet = (function() {
      function RuleSet(rules, timeZone) {
        var beginYears, commonUpdateYearEnds, endYears, max, min, rule, _i, _len, _ref,
          _this = this;
        this.rules = rules != null ? rules : [];
        this.timeZone = timeZone;
        min = null;
        max = null;
        endYears = {};
        beginYears = {};
        _ref = this.rules;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          rule = _ref[_i];
          rule.forZone(this.timeZone.offset, function() {
            return helpers.noSave;
          });
          if (min === null || rule.from < min) {
            min = rule.from;
          }
          if (max === null || rule.to > max) {
            max = rule.to;
          }
          endYears[rule.to] = endYears[rule.to] || [];
          endYears[rule.to].push(rule);
          beginYears[rule.from] = beginYears[rule.from] || [];
          beginYears[rule.from].push(rule);
        }
        this.minYear = min;
        this.maxYear = max;
        commonUpdateYearEnds = function(end, years) {
          var lastRule, year, yearRules, _results;
          if (end == null) {
            end = "toUTC";
          }
          if (years == null) {
            years = endYears;
          }
          _results = [];
          for (year in years) {
            if (!__hasProp.call(years, year)) continue;
            rules = years[year];
            yearRules = _this.allThatAppliesTo(rules[0][end]);
            if (yearRules.length < 1) {
              continue;
            }
            rules = _this._sortRulesByOnTime(rules);
            lastRule = yearRules.slice(-1)[0];
            if (lastRule.save.hours === 0 && lastRule.save.mins === 0) {
              continue;
            }
            _results.push((function() {
              var _j, _len1, _results1;
              _results1 = [];
              for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
                rule = rules[_j];
                _results1.push(rule[end] = helpers.Time.ApplySave(rule[end], lastRule.save));
              }
              return _results1;
            })());
          }
          return _results;
        };
        commonUpdateYearEnds("toUTC", endYears);
        commonUpdateYearEnds("fromUTC", beginYears);
      }

      RuleSet.prototype.allThatAppliesTo = function(dt) {
        var rule, _i, _len, _ref, _results;
        _ref = this.rules;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          rule = _ref[_i];
          if (rule.appliesToUTC(dt)) {
            _results.push(rule);
          }
        }
        return _results;
      };

      RuleSet.prototype.getWallTimeForUTC = function(dt) {
        var appliedRules, getPrevRuleSave, lastSave, rule, rules, _i, _len;
        rules = this.allThatAppliesTo(dt);
        if (rules.length < 1) {
          return new TimeZoneTime(dt, this.timeZone, helpers.noSave);
        }
        rules = this._sortRulesByOnTime(rules);
        getPrevRuleSave = function(r) {
          var idx;
          idx = rules.indexOf(r);
          if (idx < 1) {
            if (rules.length < 1) {
              return helpers.noSave;
            }
            return rules.slice(-1)[0].save;
          }
          return rules[idx - 1].save;
        };
        for (_i = 0, _len = rules.length; _i < _len; _i++) {
          rule = rules[_i];
          rule.setOnUTC(dt.getUTCFullYear(), this.timeZone.offset, getPrevRuleSave);
        }
        appliedRules = (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
            rule = rules[_j];
            if (rule.onUTC.getTime() < dt.getTime()) {
              _results.push(rule);
            }
          }
          return _results;
        })();
        lastSave = rules.length < 1 ? helpers.noSave : rules.slice(-1)[0].save;
        if (appliedRules.length > 0) {
          lastSave = appliedRules.slice(-1)[0].save;
        }
        return new TimeZoneTime(dt, this.timeZone, lastSave);
      };

      RuleSet.prototype.getUTCForWallTime = function(dt) {
        var appliedRules, getPrevRuleSave, lastSave, rule, rules, utcStd, _i, _len;
        utcStd = helpers.Time.StandardTimeToUTC(this.timeZone.offset, dt);
        rules = (function() {
          var _i, _len, _ref, _results;
          _ref = this.rules;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            rule = _ref[_i];
            if (rule.appliesToUTC(utcStd)) {
              _results.push(rule);
            }
          }
          return _results;
        }).call(this);
        if (rules.length < 1) {
          return utcStd;
        }
        rules = this._sortRulesByOnTime(rules);
        getPrevRuleSave = function(r) {
          var idx;
          idx = rules.indexOf(r);
          if (idx < 1) {
            if (rules.length < 1) {
              return helpers.noSave;
            }
            return rules.slice(-1)[0].save;
          }
          return rules[idx - 1].save;
        };
        for (_i = 0, _len = rules.length; _i < _len; _i++) {
          rule = rules[_i];
          rule.setOnUTC(utcStd.getUTCFullYear(), this.timeZone.offset, getPrevRuleSave);
        }
        appliedRules = (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
            rule = rules[_j];
            if (rule.onUTC.getTime() < utcStd.getTime()) {
              _results.push(rule);
            }
          }
          return _results;
        })();
        lastSave = rules.length < 1 ? helpers.noSave : rules.slice(-1)[0].save;
        if (appliedRules.length > 0) {
          lastSave = appliedRules.slice(-1)[0].save;
        }
        return helpers.Time.WallTimeToUTC(this.timeZone.offset, lastSave, dt);
      };

      RuleSet.prototype.getYearEndDST = function(dt) {
        var appliedRules, getPrevRuleSave, lastSave, rule, rules, utcStd, year, _i, _len;
        year = typeof dt === number ? dt : dt.getUTCFullYear();
        utcStd = helpers.Time.StandardTimeToUTC(this.timeZone.offset, year, 11, 31, 23, 59, 59);
        rules = (function() {
          var _i, _len, _ref, _results;
          _ref = this.rules;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            rule = _ref[_i];
            if (rule.appliesToUTC(utcStd)) {
              _results.push(rule);
            }
          }
          return _results;
        }).call(this);
        if (rules.length < 1) {
          return helpers.noSave;
        }
        rules = this._sortRulesByOnTime(rules);
        getPrevRuleSave = function(r) {
          var idx;
          idx = rules.indexOf(r);
          if (idx < 1) {
            return helpers.noSave;
          }
          return rules[idx - 1].save;
        };
        for (_i = 0, _len = rules.length; _i < _len; _i++) {
          rule = rules[_i];
          rule.setOnUTC(utcStd.getUTCFullYear(), this.timeZone.offset, getPrevRuleSave);
        }
        appliedRules = (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
            rule = rules[_j];
            if (rule.onUTC.getTime() < utcStd.getTime()) {
              _results.push(rule);
            }
          }
          return _results;
        })();
        lastSave = helpers.noSave;
        if (appliedRules.length > 0) {
          lastSave = appliedRules.slice(-1)[0].save;
        }
        return lastSave;
      };

      RuleSet.prototype.isAmbiguous = function(dt) {
        var appliedRules, getPrevRuleSave, lastRule, makeAmbigRange, minsOff, prevSave, range, rule, rules, springForward, totalMinutes, utcStd, _i, _len;
        utcStd = helpers.Time.StandardTimeToUTC(this.timeZone.offset, dt);
        rules = (function() {
          var _i, _len, _ref, _results;
          _ref = this.rules;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            rule = _ref[_i];
            if (rule.appliesToUTC(utcStd)) {
              _results.push(rule);
            }
          }
          return _results;
        }).call(this);
        if (rules.length < 1) {
          return false;
        }
        rules = this._sortRulesByOnTime(rules);
        getPrevRuleSave = function(r) {
          var idx;
          idx = rules.indexOf(r);
          if (idx < 1) {
            return helpers.noSave;
          }
          return rules[idx - 1].save;
        };
        for (_i = 0, _len = rules.length; _i < _len; _i++) {
          rule = rules[_i];
          rule.setOnUTC(utcStd.getUTCFullYear(), this.timeZone.offset, getPrevRuleSave);
        }
        appliedRules = (function() {
          var _j, _len1, _results;
          _results = [];
          for (_j = 0, _len1 = rules.length; _j < _len1; _j++) {
            rule = rules[_j];
            if (rule.onUTC.getTime() <= utcStd.getTime() - 1) {
              _results.push(rule);
            }
          }
          return _results;
        })();
        if (appliedRules.length < 1) {
          return false;
        }
        lastRule = appliedRules.slice(-1)[0];
        prevSave = getPrevRuleSave(lastRule);
        totalMinutes = {
          prev: (prevSave.hours * 60) + prevSave.mins,
          last: (lastRule.save.hours * 60) + lastRule.save.mins
        };
        if (totalMinutes.prev === totalMinutes.last) {
          return false;
        }
        springForward = totalMinutes.prev < totalMinutes.last;
        makeAmbigRange = function(begin, minutesOff) {
          var ambigRange, tmp;
          ambigRange = {
            begin: helpers.Time.MakeDateFromTimeStamp(begin.getTime() + 1)
          };
          ambigRange.end = helpers.Time.Add(ambigRange.begin, 0, minutesOff);
          if (ambigRange.begin.getTime() > ambigRange.end.getTime()) {
            tmp = ambigRange.begin;
            ambigRange.begin = ambigRange.end;
            ambigRange.end = tmp;
          }
          return ambigRange;
        };
        minsOff = springForward ? totalMinutes.last : -totalMinutes.prev;
        range = makeAmbigRange(lastRule.onUTC, minsOff);
        utcStd = helpers.Time.WallTimeToUTC(this.timeZone.offset, prevSave, dt);
        return (range.begin <= utcStd && utcStd <= range.end);
      };

      RuleSet.prototype._sortRulesByOnTime = function(rules) {
        return rules.sort(function(a, b) {
          return (helpers.Months.MonthIndex(a["in"])) - (helpers.Months.MonthIndex(b["in"]));
        });
      };

      return RuleSet;

    })();
    lib = {
      Rule: Rule,
      RuleSet: RuleSet,
      OnFieldHandlers: {
        NumberHandler: NumberOnFieldHandler,
        LastHandler: LastOnFieldHandler,
        CompareHandler: CompareOnFieldHandler
      }
    };
    return lib;
  };

  if (typeof window === 'undefined_') {
    req_helpers = require_("./helpers");
    req_TimeZoneTime = require_("./timezonetime");
    module.exports = init(req_helpers, req_TimeZoneTime);
  } else if (typeof define !== 'undefined') {
    define('olson/rule',["olson/helpers", "olson/timezonetime"], init);
  } else {
    this.WallTime || (this.WallTime = {});
    this.WallTime.rule = init(this.WallTime.helpers, this.WallTime.TimeZoneTime);
  }

}).call(this);

(function() {
  var init, req_TimeZoneTime, req_helpers, req_rule;

  init = function(helpers, rule, TimeZoneTime) {
    var Zone, ZoneSet, lib;
    Zone = (function() {
      function Zone(name, _offset, _rule, format, _until, currZone) {
        var begin, isNegative, offsetHours, offsetMins, offsetSecs, _ref;
        this.name = name;
        this._offset = _offset;
        this._rule = _rule;
        this.format = format;
        this._until = _until;
        _ref = helpers.Time.ParseGMTOffset(this._offset), isNegative = _ref[0], offsetHours = _ref[1], offsetMins = _ref[2], offsetSecs = _ref[3];
        this.offset = {
          negative: isNegative,
          hours: offsetHours,
          mins: offsetMins,
          secs: isNaN(offsetSecs) ? 0 : offsetSecs
        };
        begin = currZone ? helpers.Time.MakeDateFromTimeStamp(currZone.range.end.getTime() + 1) : helpers.Time.MinDate();
        this.range = {
          begin: begin,
          end: this._parseUntilDate(this._until)
        };
      }

      Zone.prototype._parseUntilDate = function(til) {
        var day, endTime, h, mi, month, monthName, neg, s, standardTime, time, year, _ref, _ref1;
        _ref = til.split(" "), year = _ref[0], monthName = _ref[1], day = _ref[2], time = _ref[3];
        _ref1 = time ? helpers.Time.ParseGMTOffset(time) : [false, 0, 0, 0], neg = _ref1[0], h = _ref1[1], mi = _ref1[2], s = _ref1[3];
        s = isNaN(s) ? 0 : s;
        if (!year || year === "") {
          return helpers.Time.MaxDate();
        }
        year = parseInt(year, 10);
        month = monthName ? helpers.Months.MonthIndex(monthName) : 0;
        day || (day = "1");
        if (helpers.Months.IsDayOfMonthRule(day)) {
          day = helpers.Months.DayOfMonthByRule(day, year, month);
        } else if (helpers.Months.IsLastDayOfMonthRule(day)) {
          day = helpers.Months.LastDayOfMonthRule(day, year, month);
        } else {
          day = parseInt(day, 10);
        }
        standardTime = helpers.Time.StandardTimeToUTC(this.offset, year, month, day, h, mi, s);
        endTime = helpers.Time.MakeDateFromTimeStamp(standardTime.getTime() - 1);
        return endTime;
      };

      Zone.prototype.updateEndForRules = function(getRulesNamed) {
        var endSave, hours, mins, rules, _ref;
        if (this._rule === "-" || this._rule === "") {
          return;
        }
        if (this._rule.indexOf(":") >= 0) {
          _ref = helpers.Time.ParseTime(this._rule), hours = _ref[0], mins = _ref[1];
          this.range.end = helpers.Time.ApplySave(this.range.end, {
            hours: hours,
            mins: mins
          });
        }
        rules = new rule.RuleSet(getRulesNamed(this._rule), this);
        endSave = rules.getYearEndDST(this.range.end);
        return this.range.end = helpers.Time.ApplySave(this.range.end, endSave);
      };

      Zone.prototype.UTCToWallTime = function(dt, getRulesNamed) {
        var hours, mins, rules, _ref;
        if (this._rule === "-" || this._rule === "") {
          return new TimeZoneTime(dt, this, helpers.noSave);
        }
        if (this._rule.indexOf(":") >= 0) {
          _ref = helpers.Time.ParseTime(this._rule), hours = _ref[0], mins = _ref[1];
          return new TimeZoneTime(dt, this, {
            hours: hours,
            mins: mins
          });
        }
        rules = new rule.RuleSet(getRulesNamed(this._rule), this);
        return rules.getWallTimeForUTC(dt);
      };

      Zone.prototype.WallTimeToUTC = function(dt, getRulesNamed) {
        var hours, mins, rules, _ref;
        if (this._rule === "-" || this._rule === "") {
          return helpers.Time.StandardTimeToUTC(this.offset, dt);
        }
        if (this._rule.indexOf(":") >= 0) {
          _ref = helpers.Time.ParseTime(this._rule), hours = _ref[0], mins = _ref[1];
          return helpers.Time.WallTimeToUTC(this.offset, {
            hours: hours,
            mins: mins
          }, dt);
        }
        rules = new rule.RuleSet(getRulesNamed(this._rule), this);
        return rules.getUTCForWallTime(dt, this.offset);
      };

      Zone.prototype.IsAmbiguous = function(dt, getRulesNamed) {
        var ambigCheck, hours, makeAmbigZone, mins, rules, utcDt, _ref, _ref1, _ref2;
        if (this._rule === "-" || this._rule === "") {
          return false;
        }
        if (this._rule.indexOf(":") >= 0) {
          utcDt = helpers.Time.StandardTimeToUTC(this.offset, dt);
          _ref = helpers.Time.ParseTime(this._rule), hours = _ref[0], mins = _ref[1];
          makeAmbigZone = function(begin) {
            var ambigZone, tmp;
            ambigZone = {
              begin: this.range.begin,
              end: helpers.Time.ApplySave(this.range.begin, {
                hours: hours,
                mins: mins
              })
            };
            if (ambigZone.end.getTime() < ambigZone.begin.getTime()) {
              tmp = ambigZone.begin;
              ambigZone.begin = ambigZone.end;
              ambigZone.end = tmp;
            }
            return ambigZone;
          };
          ambigCheck = makeAmbigZone(this.range.begin);
          if ((ambigCheck.begin.getTime() <= (_ref1 = utcDt.getTime()) && _ref1 < ambigCheck.end.getTime())) {
            return true;
          }
          ambigCheck = makeAmbigZone(this.range.end);
          (ambigCheck.begin.getTime() <= (_ref2 = utcDt.getTime()) && _ref2 < ambigCheck.end.getTime());
        }
        rules = new rule.RuleSet(getRulesNamed(this._rule), this);
        return rules.isAmbiguous(dt, this.offset);
      };

      return Zone;

    })();
    ZoneSet = (function() {
      function ZoneSet(zones, getRulesNamed) {
        var zone, _i, _len, _ref;
        this.zones = zones != null ? zones : [];
        this.getRulesNamed = getRulesNamed;
        if (this.zones.length > 0) {
          this.name = this.zones[0].name;
        } else {
          this.name = "";
        }
        _ref = this.zones;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          zone = _ref[_i];
          zone.updateEndForRules;
        }
      }

      ZoneSet.prototype.add = function(zone) {
        if (this.zones.length === 0 && this.name === "") {
          this.name = zone.name;
        }
        if (this.name !== zone.name) {
          throw new Error("Cannot add different named zones to a ZoneSet");
        }
        return this.zones.push(zone);
      };

      ZoneSet.prototype.findApplicable = function(dt, useOffset) {
        var findOffsetRange, found, range, ts, zone, _i, _len, _ref;
        if (useOffset == null) {
          useOffset = false;
        }
        ts = dt.getTime();
        findOffsetRange = function(zone) {
          return {
            begin: helpers.Time.UTCToStandardTime(zone.range.begin, zone.offset),
            end: helpers.Time.UTCToStandardTime(zone.range.end, zone.offset)
          };
        };
        found = null;
        _ref = this.zones;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          zone = _ref[_i];
          range = !useOffset ? zone.range : findOffsetRange(zone);
          if ((range.begin.getTime() <= ts && ts <= range.end.getTime())) {
            found = zone;
            break;
          }
        }
        return found;
      };

      ZoneSet.prototype.getWallTimeForUTC = function(dt) {
        var applicable;
        applicable = this.findApplicable(dt);
        if (!applicable) {
          return new TimeZoneTime(dt, helpers.noZone, helpers.noSave);
        }
        return applicable.UTCToWallTime(dt, this.getRulesNamed);
      };

      ZoneSet.prototype.getUTCForWallTime = function(dt) {
        var applicable;
        applicable = this.findApplicable(dt, true);
        if (!applicable) {
          return dt;
        }
        return applicable.WallTimeToUTC(dt, this.getRulesNamed);
      };

      ZoneSet.prototype.isAmbiguous = function(dt) {
        var applicable;
        applicable = this.findApplicable(dt, true);
        if (!applicable) {
          return false;
        }
        return applicable.IsAmbiguous(dt, this.getRulesNamed);
      };

      return ZoneSet;

    })();
    return lib = {
      Zone: Zone,
      ZoneSet: ZoneSet
    };
  };

  if (typeof window === 'undefined_') {
    req_helpers = require_("./helpers");
    req_rule = require_("./rule");
    req_TimeZoneTime = require_("./timezonetime");
    module.exports = init(req_helpers, req_rule, req_TimeZoneTime);
  } else if (typeof define !== 'undefined') {
    define('olson/zone',["olson/helpers", "olson/rule", "olson/timezonetime"], init);
  } else {
    this.WallTime || (this.WallTime = {});
    this.WallTime.zone = init(this.WallTime.helpers, this.WallTime.rule, this.WallTime.TimeZoneTime);
  }

}).call(this);

(function() {
  var api, init, key, req_help, req_rule, req_zone, val, _ref, _ref1, _ref2,
    __hasProp = {}.hasOwnProperty;

  init = function(helpers, rule, zone) {
    var WallTime;
    WallTime = (function() {
      function WallTime() {}

      WallTime.prototype.init = function(rules, zones) {
        if (rules == null) {
          rules = {};
        }
        if (zones == null) {
          zones = {};
        }
        this.zones = {};
        this.rules = {};
        this.addRulesZones(rules, zones);
        this.zoneSet = null;
        this.timeZoneName = null;
        return this.doneInit = true;
      };

      WallTime.prototype.addRulesZones = function(rules, zones) {
        var currZone, newRules, newZone, newZones, r, ruleName, ruleVals, z, zoneName, zoneVals, _i, _len, _results;
        if (rules == null) {
          rules = {};
        }
        if (zones == null) {
          zones = {};
        }
        currZone = null;
        for (zoneName in zones) {
          if (!__hasProp.call(zones, zoneName)) continue;
          zoneVals = zones[zoneName];
          newZones = [];
          currZone = null;
          for (_i = 0, _len = zoneVals.length; _i < _len; _i++) {
            z = zoneVals[_i];
            newZone = new zone.Zone(z.name, z._offset, z._rule, z.format, z._until, currZone);
            newZones.push(newZone);
            currZone = newZone;
          }
          this.zones[zoneName] = newZones;
        }
        _results = [];
        for (ruleName in rules) {
          if (!__hasProp.call(rules, ruleName)) continue;
          ruleVals = rules[ruleName];
          newRules = (function() {
            var _j, _len1, _results1;
            _results1 = [];
            for (_j = 0, _len1 = ruleVals.length; _j < _len1; _j++) {
              r = ruleVals[_j];
              _results1.push(new rule.Rule(r.name, r._from, r._to, r.type, r["in"], r.on, r.at, r._save, r.letter));
            }
            return _results1;
          })();
          _results.push(this.rules[ruleName] = newRules);
        }
        return _results;
      };

      WallTime.prototype.setTimeZone = function(name) {
        var matches,
          _this = this;
        if (!this.doneInit) {
          throw new Error("Must call init with rules and zones before setting time zone");
        }
        if (!this.zones[name]) {
          throw new Error("Unable to find time zone named " + (name || '<blank>'));
        }
        matches = this.zones[name];
        this.zoneSet = new zone.ZoneSet(matches, function(ruleName) {
          return _this.rules[ruleName];
        });
        return this.timeZoneName = name;
      };

      WallTime.prototype.Date = function(y, m, d, h, mi, s, ms) {
        if (m == null) {
          m = 0;
        }
        if (d == null) {
          d = 1;
        }
        if (h == null) {
          h = 0;
        }
        if (mi == null) {
          mi = 0;
        }
        if (s == null) {
          s = 0;
        }
        if (ms == null) {
          ms = 0;
        }
        y || (y = new Date().getUTCFullYear());
        return helpers.Time.MakeDateFromParts(y, m, d, h, mi, s, ms);
      };

      WallTime.prototype.UTCToWallTime = function(dt, zoneName) {
        if (zoneName == null) {
          zoneName = this.timeZoneName;
        }
        if (typeof dt === "number") {
          dt = new Date(dt);
        }
        if (zoneName !== this.timeZoneName) {
          this.setTimeZone(zoneName);
        }
        if (!this.zoneSet) {
          throw new Error("Must set the time zone before converting times");
        }
        return this.zoneSet.getWallTimeForUTC(dt);
      };

      WallTime.prototype.WallTimeToUTC = function(zoneName, y, m, d, h, mi, s, ms) {
        var wallTime;
        if (zoneName == null) {
          zoneName = this.timeZoneName;
        }
        if (m == null) {
          m = 0;
        }
        if (d == null) {
          d = 1;
        }
        if (h == null) {
          h = 0;
        }
        if (mi == null) {
          mi = 0;
        }
        if (s == null) {
          s = 0;
        }
        if (ms == null) {
          ms = 0;
        }
        if (zoneName !== this.timeZoneName) {
          this.setTimeZone(zoneName);
        }
        wallTime = typeof y === "number" ? helpers.Time.MakeDateFromParts(y, m, d, h, mi, s, ms) : y;
        return this.zoneSet.getUTCForWallTime(wallTime);
      };

      WallTime.prototype.IsAmbiguous = function(zoneName, y, m, d, h, mi) {
        var wallTime;
        if (zoneName == null) {
          zoneName = this.timeZoneName;
        }
        if (mi == null) {
          mi = 0;
        }
        if (zoneName !== this.timeZoneName) {
          this.setTimeZone(zoneName);
        }
        wallTime = typeof y === "number" ? helpers.Time.MakeDateFromParts(y, m, d, h, mi) : y;
        return this.zoneSet.isAmbiguous(wallTime);
      };

      return WallTime;

    })();
    return new WallTime;
  };

  if (typeof window === 'undefined_') {
    req_zone = require_("./olson/zone");
    req_rule = require_("./olson/rule");
    req_help = require_("./olson/helpers");
    module.exports = init(req_help, req_rule, req_zone);
  } else if (typeof define !== 'undefined') {
    if (!require.specified('walltime-data')) {
      if (typeof console !== "undefined" && console !== null) {
        if (typeof console.warn === "function") {
          console.warn("To use WallTime with requirejs please include the walltime-data.js script before requiring walltime");
        }
      }
      define('walltime-data', [], function() {
        return null;
      });
    }
    define('walltime',['olson/helpers', 'olson/rule', 'olson/zone', 'walltime-data'], function(req_zone, req_rule, req_help, WallTimeData) {
      var lib;
      lib = init(req_zone, req_rule, req_help);
      if (WallTimeData != null ? WallTimeData.zones : void 0) {
        lib.init(WallTimeData.rules, WallTimeData.zones);
      }
      return lib;
    });
  } else {
    this.WallTime || (this.WallTime = {});
    api = init(this.WallTime.helpers, this.WallTime.rule, this.WallTime.zone);
    _ref = this.WallTime;
    for (key in _ref) {
      if (!__hasProp.call(_ref, key)) continue;
      val = _ref[key];
      api[key] = val;
    }
    this.WallTime = api;
    if (this.WallTime.autoinit && ((_ref1 = this.WallTime.data) != null ? _ref1.rules : void 0) && ((_ref2 = this.WallTime.data) != null ? _ref2.zones : void 0)) {
      this.WallTime.init(this.WallTime.data.rules, this.WallTime.data.zones);
    }
  }

}).call(this);

module.exports = this.WallTime;


},{}],7:[function(require,module,exports){
"use strict";
/**
 * Checks to see if thing is an instance of the given constructor.
 * Works just like the native instanceof method but handles the case when
 * objects are coming from different frames or from different modules.
 * @param thing - the thing to test
 * @param constructor - the constructor class to check against
 * @returns {boolean}
 */
function isInstanceOf(thing, constructor) {
    if (typeof constructor !== 'function')
        throw new TypeError("constructor must be a function");
    if (thing instanceof constructor)
        return true;
    if (thing == null)
        return false;
    var constructorName = constructor.name;
    if (!constructorName)
        return false;
    var thingProto = thing.__proto__;
    while (thingProto && thingProto.constructor) {
        if (thingProto.constructor.name === constructorName)
            return true;
        thingProto = thingProto.__proto__;
    }
    return false;
}
exports.isInstanceOf = isInstanceOf;
/**
 * Check to see if things are an array of instances of the given constructor
 * Uses isInstanceOf internally
 * @param things - the array of things to test
 * @param constructor - the constructor class to check against
 * @returns {boolean}
 */
function isArrayOf(things, constructor) {
    if (!Array.isArray(things))
        return false;
    for (var i = 0, length = things.length; i < length; i++) {
        if (!isInstanceOf(things[i], constructor))
            return false;
    }
    return true;
}
exports.isArrayOf = isArrayOf;
/**
 * Does a quick 'duck typing' test to see if the given parameter is a Higher Object
 * @param thing - the thing to test
 * @returns {boolean}
 */
function isHigherObject(thing) {
    if (!thing || typeof thing !== 'object')
        return false;
    var ClassFn = thing.constructor;
    var className = ClassFn.name;
    return className.length > 1 && className[0].toUpperCase() === className[0] && typeof ClassFn['is' + className] === 'function' && typeof ClassFn.fromJS === 'function' && typeof thing.toJS === 'function' && typeof thing.equals === 'function'; // Has Class#equals
}
exports.isHigherObject = isHigherObject;
/**
 * Checks is two arrays have equal higher objects
 * @param arrayA - array to compare
 * @param arrayB - array to compare
 * @returns {boolean}
 */
function arraysEqual(arrayA, arrayB) {
    var length = arrayA.length;
    if (length !== arrayB.length)
        return false;
    for (var i = 0; i < length; i++) {
        var vA = arrayA[i];
        if (!isHigherObject(vA) || !vA.equals(arrayB[i]))
            return false;
    }
    return true;
}
exports.arraysEqual = arraysEqual;

},{}],8:[function(require,module,exports){
arguments[4][7][0].apply(exports,arguments)
},{"dup":7}],9:[function(require,module,exports){
(function (process){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    "use strict";

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object" && typeof module === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else if (typeof self !== "undefined") {
        self.Q = definition();

    } else {
        throw new Error("This environment was not anticiapted by Q. Please file a bug.");
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
        // working message ports the first time a page loads.
        channel.port1.onmessage = function () {
            requestTick = requestPortTick;
            channel.port1.onmessage = flush;
            flush();
        };
        var requestPortTick = function () {
            // Opera requires us to provide a message payload, regardless of
            // whether we use it.
            channel.port2.postMessage(0);
        };
        requestTick = function () {
            setTimeout(flush, 0);
            requestPortTick();
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this **might** have the nice side-effect of reducing the size of
// the minified code by reducing x.call() to merely x()
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (value instanceof Promise) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

// enable long stacks if Q_DEBUG is set
if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
    Q.longStackSupport = true;
}

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            Q.nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    };

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            Q.nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            Q.nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.Promise = promise; // ES6
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

promise.race = race; // ES6
promise.all = all; // ES6
promise.reject = reject; // ES6
promise.resolve = Q; // ES6

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become settled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be settled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        };
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    Q.nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

Q.tap = function (promise, callback) {
    return Q(promise).tap(callback);
};

/**
 * Works almost like "finally", but not called for rejections.
 * Original resolution value is passed through callback unaffected.
 * Callback may return a promise that will be awaited for.
 * @param {Function} callback
 * @returns {Q.Promise}
 * @example
 * doSomething()
 *   .then(...)
 *   .tap(console.log)
 *   .then(...);
 */
Promise.prototype.tap = function (callback) {
    callback = Q(callback);

    return this.then(function (value) {
        return callback.fcall(value).thenResolve(value);
    });
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return object instanceof Promise;
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var trackUnhandledRejections = true;

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== "undefined") {
        unhandledReasons.push(reason.stack);
    } else {
        unhandledReasons.push("(no stack) " + reason);
    }
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    Q.nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;

            // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
            // engine that has a deployed base of browsers that support generators.
            // However, SM's generators use the Python-inspired semantics of
            // outdated ES6 drafts.  We would like to support ES6, but we'd also
            // like to make it possible to use generators in deployed browsers, so
            // we also support Python-style generators.  At some point we can remove
            // this block.

            if (typeof StopIteration === "undefined") {
                // ES6 Generators
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return Q(result.value);
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // SpiderMonkey Generators
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return Q(exception.value);
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    Q.nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        Q.nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {Any*} custom error message or Error object (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, error) {
    return Q(object).timeout(ms, error);
};

Promise.prototype.timeout = function (ms, error) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        if (!error || "string" === typeof error) {
            error = new Error(error || "Timed out after " + ms + " ms");
            error.code = "ETIMEDOUT";
        }
        deferred.reject(error);
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            Q.nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            Q.nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

}).call(this,require('_process'))
},{"_process":3}],10:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = function(apply) { return apply; },
        peg$c2 = "<-",
        peg$c3 = { type: "literal", value: "<-", description: "\"<-\"" },
        peg$c4 = function(name, apply) {
              var namedApply = { name: name };
              for (var k in apply) { namedApply[k] = apply[k] }
              return namedApply;
            },
        peg$c5 = { type: "other", description: "Name" },
        peg$c6 = [],
        peg$c7 = /^[a-z0-9A-Z_]/,
        peg$c8 = { type: "class", value: "[a-z0-9A-Z_]", description: "[a-z0-9A-Z_]" },
        peg$c9 = { type: "other", description: "NotTick" },
        peg$c10 = /^[^`]/,
        peg$c11 = { type: "class", value: "[^`]", description: "[^`]" },
        peg$c12 = /^[+\-]/,
        peg$c13 = { type: "class", value: "[+\\-]", description: "[+\\-]" },
        peg$c14 = function(head, tail) {
              var lookup = { '+': 'add', "-": 'subtract' };
              var result = head;
              for (var i = 0; i < tail.length; i++) {
                result = {
                  arithmetic: lookup[tail[i][1]],
                  operands: [result, tail[i][3]]
                };
              }
              return result;
            },
        peg$c15 = /^[*\/]/,
        peg$c16 = { type: "class", value: "[*\\/]", description: "[*\\/]" },
        peg$c17 = function(head, tail) {
              var lookup = { "*": 'multiply', "/": 'divide' };
              var result = head;
              for (var i = 0; i < tail.length; i++) {
                result = {
                  arithmetic: lookup[tail[i][1]],
                  operands: [result, tail[i][3]]
                };
              }
              return result;
            },
        peg$c18 = "(",
        peg$c19 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c20 = ")",
        peg$c21 = { type: "literal", value: ")", description: "\")\"" },
        peg$c22 = { type: "other", description: "Aggregate" },
        peg$c23 = function(number) { return { aggregate: "constant", value: number }; },
        peg$c24 = function(aggregate) { return { aggregate: aggregate }; },
        peg$c25 = function(aggregate, attribute) { return { aggregate: aggregate, attribute:attribute }; },
        peg$c26 = { type: "other", description: "Aggregate Function" },
        peg$c27 = "count",
        peg$c28 = { type: "literal", value: "count", description: "\"count\"" },
        peg$c29 = "sum",
        peg$c30 = { type: "literal", value: "sum", description: "\"sum\"" },
        peg$c31 = "max",
        peg$c32 = { type: "literal", value: "max", description: "\"max\"" },
        peg$c33 = "min",
        peg$c34 = { type: "literal", value: "min", description: "\"min\"" },
        peg$c35 = "average",
        peg$c36 = { type: "literal", value: "average", description: "\"average\"" },
        peg$c37 = "uniqueCount",
        peg$c38 = { type: "literal", value: "uniqueCount", description: "\"uniqueCount\"" },
        peg$c39 = { type: "other", description: "Attribute" },
        peg$c40 = "`",
        peg$c41 = { type: "literal", value: "`", description: "\"`\"" },
        peg$c42 = function(chars) { return chars; },
        peg$c43 = function(chars) { throw new Error("Unmatched tickmark")},
        peg$c44 = { type: "other", description: "Number" },
        peg$c45 = null,
        peg$c46 = function(n) { return parseFloat(n); },
        peg$c47 = "-",
        peg$c48 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c49 = /^[1-9]/,
        peg$c50 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c51 = ".",
        peg$c52 = { type: "literal", value: ".", description: "\".\"" },
        peg$c53 = /^[eE]/,
        peg$c54 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c55 = /^[0-9]/,
        peg$c56 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c57 = { type: "other", description: "Whitespace" },
        peg$c58 = /^[ \t\r\n]/,
        peg$c59 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseNamedApply();
      if (s0 === peg$FAILED) {
        s0 = peg$parseApply();
      }

      return s0;
    }

    function peg$parseApply() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAdditiveArithmetic();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseNamedApply() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseName();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c2) {
              s4 = peg$c2;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c3); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseAdditiveArithmetic();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c4(s2, s6);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseName() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c7.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c8); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c7.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c5); }
      }

      return s0;
    }

    function peg$parseNotTick() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c10.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c11); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c10.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c11); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }

      return s0;
    }

    function peg$parseAdditiveArithmetic() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseMultiplicativeArithmetic();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (peg$c12.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c13); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseMultiplicativeArithmetic();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (peg$c12.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c13); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseMultiplicativeArithmetic();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c14(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseMultiplicativeArithmetic() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseFactor();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (peg$c15.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseFactor();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (peg$c15.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c16); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseFactor();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c17(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseFactor() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c18;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c19); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseAdditiveArithmetic();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c20;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c1(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseAggregate();
      }

      return s0;
    }

    function peg$parseAggregate() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$parseNumber();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c23(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseAggregateFn0();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s2 = peg$c18;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c19); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s4 = peg$c20;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c24(s1);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseAggregateFn1();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 40) {
              s2 = peg$c18;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c19); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parseAttribute();
              if (s3 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s4 = peg$c20;
                  peg$currPos++;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c21); }
                }
                if (s4 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c25(s1, s3);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c22); }
      }

      return s0;
    }

    function peg$parseAggregateFn0() {
      var s0, s1;

      peg$silentFails++;
      if (input.substr(peg$currPos, 5) === peg$c27) {
        s0 = peg$c27;
        peg$currPos += 5;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }

      return s0;
    }

    function peg$parseAggregateFn1() {
      var s0, s1;

      peg$silentFails++;
      if (input.substr(peg$currPos, 3) === peg$c29) {
        s0 = peg$c29;
        peg$currPos += 3;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c31) {
          s0 = peg$c31;
          peg$currPos += 3;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c33) {
            s0 = peg$c33;
            peg$currPos += 3;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 7) === peg$c35) {
              s0 = peg$c35;
              peg$currPos += 7;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c36); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 11) === peg$c37) {
                s0 = peg$c37;
                peg$currPos += 11;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c38); }
              }
            }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }

      return s0;
    }

    function peg$parseAttribute() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 96) {
        s1 = peg$c40;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNotTick();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 96) {
            s3 = peg$c40;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c42(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseName();
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 96) {
            s1 = peg$c40;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c41); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseNotTick();
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c43(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c39); }
      }

      return s0;
    }

    function peg$parseNumber() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      s3 = peg$parseInt();
      if (s3 !== peg$FAILED) {
        s4 = peg$parseFrac();
        if (s4 === peg$FAILED) {
          s4 = peg$c45;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExp();
          if (s5 === peg$FAILED) {
            s5 = peg$c45;
          }
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c0;
      }
      if (s2 !== peg$FAILED) {
        s2 = input.substring(s1, peg$currPos);
      }
      s1 = s2;
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c46(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }

      return s0;
    }

    function peg$parseInt() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s2 = peg$c47;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$c45;
      }
      if (s2 !== peg$FAILED) {
        if (peg$c49.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c50); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseDigits();
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c47;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c45;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseDigit();
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseFrac() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c51;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c52); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDigits();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseExp() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c53.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }
      if (s2 !== peg$FAILED) {
        if (peg$c12.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$c45;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseDigits();
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseDigits() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseDigit();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseDigit();
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseDigit() {
      var s0;

      if (peg$c55.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c56); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c58.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c59); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c58.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c57); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],11:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = function(ex) { return ex; },
        peg$c2 = [],
        peg$c3 = /^[+\-]/,
        peg$c4 = { type: "class", value: "[+\\-]", description: "[+\\-]" },
        peg$c5 = function(head, tail) {
              if (!tail.length) return head;
              var operands = [head];
              for (var i = 0; i < tail.length; i++) {
                if (tail[i][1] === '+') {
                  operands.push(tail[i][3]);
                } else {
                  operands.push({ op: 'negate', operand: tail[i][3] });
                }
              }
              return { op: 'add', operands: operands };
            },
        peg$c6 = /^[*\/]/,
        peg$c7 = { type: "class", value: "[*\\/]", description: "[*\\/]" },
        peg$c8 = function(head, tail) {
              if (!tail.length) return head;
              var operands = [head];
              for (var i = 0; i < tail.length; i++) {
                if (tail[i][1] === '*') {
                  operands.push(tail[i][3]);
                } else {
                  operands.push({ op: 'reciprocate', operand: tail[i][3] });
                }
              }
              return { op: 'multiply', operands: operands };
            },
        peg$c9 = "(",
        peg$c10 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c11 = ")",
        peg$c12 = { type: "literal", value: ")", description: "\")\"" },
        peg$c13 = ".",
        peg$c14 = { type: "literal", value: ".", description: "\".\"" },
        peg$c15 = null,
        peg$c16 = function(ex, fn, attr) { 
              var res = { op: "aggregate", fn: fn, operand: ex };
              if (attr) res.attribute = attr;
              return res; 
            },
        peg$c17 = ".label(",
        peg$c18 = { type: "literal", value: ".label(", description: "\".label(\"" },
        peg$c19 = function(ex, name) { return { op: 'label', operand: ex, name: name }; },
        peg$c20 = "$",
        peg$c21 = { type: "literal", value: "$", description: "\"$\"" },
        peg$c22 = ":",
        peg$c23 = { type: "literal", value: ":", description: "\":\"" },
        peg$c24 = function(name, type) { return { op: "ref", name: name, type: type }; },
        peg$c25 = function(name) { return { op: "ref", name: name }; },
        peg$c26 = function(number) { return { op: "literal", value: number }; },
        peg$c27 = function(string) { return { op: "literal", value: string }; },
        peg$c28 = { type: "other", description: "Aggregate Function" },
        peg$c29 = "count",
        peg$c30 = { type: "literal", value: "count", description: "\"count\"" },
        peg$c31 = "sum",
        peg$c32 = { type: "literal", value: "sum", description: "\"sum\"" },
        peg$c33 = "max",
        peg$c34 = { type: "literal", value: "max", description: "\"max\"" },
        peg$c35 = "min",
        peg$c36 = { type: "literal", value: "min", description: "\"min\"" },
        peg$c37 = "average",
        peg$c38 = { type: "literal", value: "average", description: "\"average\"" },
        peg$c39 = "uniqueCount",
        peg$c40 = { type: "literal", value: "uniqueCount", description: "\"uniqueCount\"" },
        peg$c41 = "group",
        peg$c42 = { type: "literal", value: "group", description: "\"group\"" },
        peg$c43 = { type: "other", description: "String" },
        peg$c44 = "'",
        peg$c45 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c46 = function(chars) { return chars; },
        peg$c47 = function(chars) { throw new Error("Unmatched single quote")},
        peg$c48 = "\"",
        peg$c49 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c50 = function(chars) { throw new Error("Unmatched double quote")},
        peg$c51 = { type: "other", description: "Number" },
        peg$c52 = function(n) { return parseFloat(n); },
        peg$c53 = "-",
        peg$c54 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c55 = /^[1-9]/,
        peg$c56 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c57 = /^[eE]/,
        peg$c58 = { type: "class", value: "[eE]", description: "[eE]" },
        peg$c59 = /^[0-9]/,
        peg$c60 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c61 = { type: "other", description: "Name" },
        peg$c62 = /^[a-z0-9A-Z_]/,
        peg$c63 = { type: "class", value: "[a-z0-9A-Z_]", description: "[a-z0-9A-Z_]" },
        peg$c64 = { type: "other", description: "RefName" },
        peg$c65 = "^",
        peg$c66 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c67 = { type: "other", description: "TypeName" },
        peg$c68 = /^[A-Z_\/]/,
        peg$c69 = { type: "class", value: "[A-Z_\\/]", description: "[A-Z_\\/]" },
        peg$c70 = { type: "other", description: "NotSQuote" },
        peg$c71 = /^[^']/,
        peg$c72 = { type: "class", value: "[^']", description: "[^']" },
        peg$c73 = { type: "other", description: "NotDQuote" },
        peg$c74 = /^[^"]/,
        peg$c75 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c76 = { type: "other", description: "Whitespace" },
        peg$c77 = /^[ \t\r\n]/,
        peg$c78 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseExpression();

      return s0;
    }

    function peg$parseExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAdditiveExpression();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseAdditiveExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseMultiplicativeExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (peg$c3.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c4); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseMultiplicativeExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (peg$c3.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c4); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseMultiplicativeExpression();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c5(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseMultiplicativeExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseFactor();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (peg$c6.test(input.charAt(peg$currPos))) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c7); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseFactor();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (peg$c6.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c7); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseFactor();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c0;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c0;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c0;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c8(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseFactor() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c9;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c10); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseExpression();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 41) {
            s3 = peg$c11;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c12); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c1(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseLabel();
        if (s0 === peg$FAILED) {
          s0 = peg$parseAggregate();
          if (s0 === peg$FAILED) {
            s0 = peg$parseLiteral();
            if (s0 === peg$FAILED) {
              s0 = peg$parseRef();
            }
          }
        }
      }

      return s0;
    }

    function peg$parseAggregate() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parseRef();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 46) {
          s2 = peg$c13;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c14); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseAggregateFn();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 40) {
              s4 = peg$c9;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c10); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseExpression();
                if (s6 === peg$FAILED) {
                  s6 = peg$c15;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s8 = peg$c11;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c12); }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c16(s1, s3, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseLabel() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseAggregate();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 7) === peg$c17) {
          s2 = peg$c17;
          peg$currPos += 7;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c18); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseString();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 41) {
                  s6 = peg$c11;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c12); }
                }
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c19(s1, s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }

      return s0;
    }

    function peg$parseRef() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 36) {
        s1 = peg$c20;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRefName();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c22;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c23); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseTypeName();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c24(s2, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 36) {
          s1 = peg$c20;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseRefName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c25(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }

      return s0;
    }

    function peg$parseLiteral() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseNumber();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c26(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseString();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c27(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseAggregateFn() {
      var s0, s1;

      peg$silentFails++;
      if (input.substr(peg$currPos, 5) === peg$c29) {
        s0 = peg$c29;
        peg$currPos += 5;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 3) === peg$c31) {
          s0 = peg$c31;
          peg$currPos += 3;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c32); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 3) === peg$c33) {
            s0 = peg$c33;
            peg$currPos += 3;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c34); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c35) {
              s0 = peg$c35;
              peg$currPos += 3;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c36); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c37) {
                s0 = peg$c37;
                peg$currPos += 7;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c38); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 11) === peg$c39) {
                  s0 = peg$c39;
                  peg$currPos += 11;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c40); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 5) === peg$c41) {
                    s0 = peg$c41;
                    peg$currPos += 5;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c42); }
                  }
                }
              }
            }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }

      return s0;
    }

    function peg$parseString() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c44;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c45); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNotSQuote();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c44;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c45); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c46(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
          s1 = peg$c44;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c45); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseNotSQuote();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c47(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 34) {
            s1 = peg$c48;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c49); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseNotDQuote();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 34) {
                s3 = peg$c48;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c49); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c46(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 34) {
              s1 = peg$c48;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c49); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseNotDQuote();
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c50(s2);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }

      return s0;
    }

    function peg$parseNumber() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      s3 = peg$parseInt();
      if (s3 !== peg$FAILED) {
        s4 = peg$parseFrac();
        if (s4 === peg$FAILED) {
          s4 = peg$c15;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExp();
          if (s5 === peg$FAILED) {
            s5 = peg$c15;
          }
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$c0;
      }
      if (s2 !== peg$FAILED) {
        s2 = input.substring(s1, peg$currPos);
      }
      s1 = s2;
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c52(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c51); }
      }

      return s0;
    }

    function peg$parseInt() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s2 = peg$c53;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c54); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$c15;
      }
      if (s2 !== peg$FAILED) {
        if (peg$c55.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c56); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseDigits();
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 45) {
          s2 = peg$c53;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c54); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c15;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseDigit();
          if (s3 !== peg$FAILED) {
            s2 = [s2, s3];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseFrac() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c13;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c14); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseDigits();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseExp() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c57.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c58); }
      }
      if (s2 !== peg$FAILED) {
        if (peg$c3.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c4); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$c15;
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parseDigits();
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c0;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseDigits() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseDigit();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseDigit();
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseDigit() {
      var s0;

      if (peg$c59.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c60); }
      }

      return s0;
    }

    function peg$parseName() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c62.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c63); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c62.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c63); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c61); }
      }

      return s0;
    }

    function peg$parseRefName() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = [];
      if (input.charCodeAt(peg$currPos) === 94) {
        s3 = peg$c65;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c66); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (input.charCodeAt(peg$currPos) === 94) {
          s3 = peg$c65;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c66); }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c62.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c63); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (peg$c62.test(input.charAt(peg$currPos))) {
              s4 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c63); }
            }
          }
        } else {
          s3 = peg$c0;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c0;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }

      return s0;
    }

    function peg$parseTypeName() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c68.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c69); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c68.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c69); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c67); }
      }

      return s0;
    }

    function peg$parseNotSQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c71.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c72); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c71.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c72); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c70); }
      }

      return s0;
    }

    function peg$parseNotDQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c74.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c75); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c74.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c75); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c73); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c77.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c78); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c77.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c78); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c76); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}],12:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = peg$FAILED,
        peg$c1 = "and",
        peg$c2 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c3 = function(left, right) {
            if (right.type === "and") {
              return {
                type: "and",
                filters: [left].concat(right.filters)
              };
            } else {
              return {
                type: "and",
                filters: [left].concat(right)
              };
            }
          },
        peg$c4 = "or",
        peg$c5 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c6 = function(left, right) {
            if (right.type === "or") {
              return {
                type: "or",
                filters: [left].concat(right.filters)
              };
            } else {
              return {
                type: "or",
                filters: [left].concat(right)
              };
            }
          },
        peg$c7 = "in",
        peg$c8 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c9 = function(attribute, values) {
            return {
              type: 'in',
              values: values,
              attribute: attribute
            };
          },
        peg$c10 = "is",
        peg$c11 = { type: "literal", value: "is", description: "\"is\"" },
        peg$c12 = function(attribute, value) {
            return {
              type: 'is',
              value: value,
              attribute: attribute
            };
          },
        peg$c13 = "not",
        peg$c14 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c15 = function(primary) {
            return {
              type: 'not',
              filter: primary
            };
          },
        peg$c16 = "(",
        peg$c17 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c18 = ")",
        peg$c19 = { type: "literal", value: ")", description: "\")\"" },
        peg$c20 = function(andFilter) { return andFilter; },
        peg$c21 = { type: "other", description: "Attribute" },
        peg$c22 = "`",
        peg$c23 = { type: "literal", value: "`", description: "\"`\"" },
        peg$c24 = function(prim) { return prim; },
        peg$c25 = [],
        peg$c26 = /^[a-zA-Z0-9_]/,
        peg$c27 = { type: "class", value: "[a-zA-Z0-9_]", description: "[a-zA-Z0-9_]" },
        peg$c28 = { type: "other", description: "Value" },
        peg$c29 = "\"",
        peg$c30 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c31 = { type: "other", description: "ValueList" },
        peg$c32 = ",",
        peg$c33 = { type: "literal", value: ",", description: "\",\"" },
        peg$c34 = function(body, tail) {
              return body.map(function(a) {return a[1];}).concat(tail);
            },
        peg$c35 = { type: "other", description: "NotQuote" },
        peg$c36 = /^[^"]/,
        peg$c37 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c38 = { type: "other", description: "NotTick" },
        peg$c39 = /^[^`]/,
        peg$c40 = { type: "class", value: "[^`]", description: "[^`]" },
        peg$c41 = { type: "other", description: "Whitespace" },
        peg$c42 = /^[ \t\n\r]/,
        peg$c43 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parseAndFilter();

      return s0;
    }

    function peg$parseAndFilter() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseOrFilter();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c1) {
              s4 = peg$c1;
              peg$currPos += 3;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c2); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseAndFilter();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c3(s2, s6);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseOrFilter();
      }

      return s0;
    }

    function peg$parseOrFilter() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseBasicFilter();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c4) {
              s4 = peg$c4;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c5); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseOrFilter();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c6(s2, s6);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseBasicFilter();
      }

      return s0;
    }

    function peg$parseBasicFilter() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAttribute();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c7) {
              s4 = peg$c7;
              peg$currPos += 2;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c8); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseValueList();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c9(s2, s6);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseAttribute();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c10) {
                s4 = peg$c10;
                peg$currPos += 2;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c11); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseValue();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c12(s2, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parse_();
          if (s1 !== peg$FAILED) {
            if (input.substr(peg$currPos, 3) === peg$c13) {
              s2 = peg$c13;
              peg$currPos += 3;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c14); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parseNotSuffix();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c15(s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            s1 = peg$parse_();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 40) {
                s2 = peg$c16;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c17); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseAndFilter();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 41) {
                        s6 = peg$c18;
                        peg$currPos++;
                      } else {
                        s6 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c19); }
                      }
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parse_();
                        if (s7 !== peg$FAILED) {
                          peg$reportedPos = s0;
                          s1 = peg$c20(s4);
                          s0 = s1;
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          }
        }
      }

      return s0;
    }

    function peg$parseNotSuffix() {
      var s0;

      s0 = peg$parseBasicFilter();
      if (s0 === peg$FAILED) {
        s0 = peg$parseAndFilter();
      }

      return s0;
    }

    function peg$parseAttribute() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 96) {
        s1 = peg$c22;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseNotTick();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 96) {
                s5 = peg$c22;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c23); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c24(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (peg$c26.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c26.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c27); }
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c21); }
      }

      return s0;
    }

    function peg$parseValue() {
      var s0, s1, s2, s3, s4, s5;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s1 = peg$c29;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c30); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseNotQuote();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 34) {
                s5 = peg$c29;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c30); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c24(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (peg$c26.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c26.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c27); }
            }
          }
        } else {
          s1 = peg$c0;
        }
        if (s1 !== peg$FAILED) {
          s1 = input.substring(s0, peg$currPos);
        }
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c28); }
      }

      return s0;
    }

    function peg$parseValueList() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c16;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c17); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseValue();
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s8 = peg$c32;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c33); }
                }
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$currPos;
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseValue();
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s8 = peg$c32;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c33); }
                  }
                  if (s8 !== peg$FAILED) {
                    s5 = [s5, s6, s7, s8];
                    s4 = s5;
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c0;
                  }
                } else {
                  peg$currPos = s4;
                  s4 = peg$c0;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c0;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c0;
            }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseValue();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 41) {
                    s7 = peg$c18;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c19); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c34(s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c31); }
      }

      return s0;
    }

    function peg$parseNotQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c36.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c37); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c36.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }

      return s0;
    }

    function peg$parseNotTick() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c39.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c39.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c42.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c43); }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (peg$c42.test(input.charAt(peg$currPos))) {
          s1 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c43); }
        }
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c41); }
      }

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{}]},{},[1])(1)
});