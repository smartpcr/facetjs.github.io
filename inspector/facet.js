!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.facet=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var HigherObject = require("higher-object");
var q = require("q");
var Q = q;
var chronology = require("chronology");
var Chronology = chronology;
var dummyObject = {};
var objectHasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwnProperty(obj, key) {
    return objectHasOwnProperty.call(obj, key);
}
function repeat(str, times) {
    return new Array(times + 1).join(str);
}
function deduplicateSort(a) {
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
function multiMerge(elements, mergeFn) {
    var newElements = [];
    for (var i = 0; i < elements.length; i++) {
        var accumulator = elements[i];
        var tempElements = [];
        for (var j = 0; j < newElements.length; j++) {
            var newElement = newElements[j];
            var mergeElement = mergeFn(accumulator, newElement);
            if (mergeElement) {
                accumulator = mergeElement;
            }
            else {
                tempElements.push(newElement);
            }
        }
        tempElements.push(accumulator);
        newElements = tempElements;
    }
    return newElements;
}
function arraysEqual(a, b) {
    return a.length === b.length && a.every(function (item, i) { return (item === b[i]); });
}
var expressionParser;
var sqlParser;
var Facet;
(function (Facet) {
    Facet.version = '0.13.1';
    Facet.isInstanceOf = HigherObject.isInstanceOf;
    Facet.isHigherObject = HigherObject.isHigherObject;
    Facet.Timezone = Chronology.Timezone;
    Facet.Duration = Chronology.Duration;
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
    Facet.safeAdd = safeAdd;
    function find(array, fn) {
        for (var i = 0; i < array.length; i++) {
            var a = array[i];
            if (fn.call(array, a, i))
                return a;
        }
        return null;
    }
    Facet.find = find;
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
    Facet.continuousFloorExpression = continuousFloorExpression;
})(Facet || (Facet = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Facet;
(function (Facet) {
    var SQLDialect = (function () {
        function SQLDialect() {
        }
        SQLDialect.prototype.inExpression = function (operand, start, end, bounds) {
            var startSQL = null;
            if (start !== null) {
                startSQL = start + (bounds[0] === '[' ? '<=' : '<') + operand;
            }
            var endSQL = null;
            if (end !== null) {
                endSQL = operand + (bounds[1] === ']' ? '<=' : '<') + end;
            }
            if (startSQL) {
                return endSQL ? "(" + startSQL + " AND " + endSQL + ")" : startSQL;
            }
            else {
                return endSQL ? endSQL : 'TRUE';
            }
        };
        SQLDialect.prototype.offsetTimeExpression = function (operand, duration) {
            throw new Error('Must implement offsetTimeExpression');
        };
        return SQLDialect;
    })();
    Facet.SQLDialect = SQLDialect;
    var MySQLDialect = (function (_super) {
        __extends(MySQLDialect, _super);
        function MySQLDialect() {
            _super.call(this);
        }
        MySQLDialect.prototype.offsetTimeExpression = function (operand, duration) {
            var sqlFn = "DATE_ADD(";
            var spans = duration.valueOf();
            if (spans.week) {
                return sqlFn + operand + ", INTERVAL " + String(spans.week) + ' WEEK)';
            }
            if (spans.year || spans.month) {
                var expr = String(spans.year || 0) + "-" + String(spans.month || 0);
                operand = sqlFn + operand + ", INTERVAL '" + expr + "' YEAR_MONTH)";
            }
            if (spans.day || spans.hour || spans.minute || spans.second) {
                var expr = String(spans.day || 0) + " " + [spans.hour || 0, spans.minute || 0, spans.second || 0].join(':');
                operand = sqlFn + operand + ", INTERVAL '" + expr + "' DAY_SECOND)";
            }
            return operand;
        };
        return MySQLDialect;
    })(SQLDialect);
    Facet.MySQLDialect = MySQLDialect;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function getValueType(value) {
        var typeofValue = typeof value;
        if (typeofValue === 'object') {
            if (value === null) {
                return 'NULL';
            }
            else if (value.toISOString) {
                return 'TIME';
            }
            else {
                var ctrType = value.constructor.type;
                if (!ctrType) {
                    if (Facet.Expression.isExpression(value)) {
                        throw new Error("expression used as datum value " + value.toString());
                    }
                    else {
                        throw new Error("can not have an object without a type: " + JSON.stringify(value));
                    }
                }
                if (ctrType === 'SET')
                    ctrType += '/' + value.setType;
                return ctrType;
            }
        }
        else {
            if (typeofValue !== 'boolean' && typeofValue !== 'number' && typeofValue !== 'string') {
                throw new TypeError('unsupported JS type ' + typeofValue);
            }
            return typeofValue.toUpperCase();
        }
    }
    Facet.getValueType = getValueType;
    function getFullType(value) {
        var myType = getValueType(value);
        return myType === 'DATASET' ? value.getFullType() : { type: myType };
    }
    Facet.getFullType = getFullType;
    function valueFromJS(v, typeOverride) {
        if (typeOverride === void 0) { typeOverride = null; }
        if (v == null) {
            return null;
        }
        else if (Array.isArray(v)) {
            return Facet.NativeDataset.fromJS({
                source: 'native',
                data: v
            });
        }
        else if (typeof v === 'object') {
            switch (typeOverride || v.type) {
                case 'NUMBER':
                    var n = Number(v.value);
                    if (isNaN(n))
                        throw new Error("bad number value '" + String(v.value) + "'");
                    return n;
                case 'NUMBER_RANGE':
                    return Facet.NumberRange.fromJS(v);
                case 'TIME':
                    return typeOverride ? v : new Date(v.value);
                case 'TIME_RANGE':
                    return Facet.TimeRange.fromJS(v);
                case 'SHAPE':
                    return Facet.Shape.fromJS(v);
                case 'SET':
                    return Facet.Set.fromJS(v);
                default:
                    if (v.toISOString) {
                        return v;
                    }
                    else {
                        throw new Error('can not have an object without a `type` as a datum value');
                    }
            }
        }
        else if (typeof v === 'string' && typeOverride === 'TIME') {
            return new Date(v);
        }
        return v;
    }
    Facet.valueFromJS = valueFromJS;
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
    Facet.valueToJS = valueToJS;
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
    Facet.valueToJSInlineType = valueToJSInlineType;
    function numberToSQL(num) {
        if (num === null)
            return null;
        return String(num);
    }
    Facet.numberToSQL = numberToSQL;
    function timeToSQL(date) {
        if (!date)
            return null;
        var str = date.toISOString().replace("T", " ").replace(/\.\d\d\dZ$/, "").replace(" 00:00:00", "");
        return "'" + str + "'";
    }
    Facet.timeToSQL = timeToSQL;
    function datumHasRemote(datum) {
        for (var applyName in datum) {
            var applyValue = datum[applyName];
            if (applyName === '$def') {
                for (var defName in applyValue) {
                    var defValue = applyValue[defName];
                    if (defValue instanceof Facet.Dataset && defValue.hasRemote())
                        return true;
                }
            }
            else if (applyValue instanceof Facet.Dataset && applyValue.hasRemote()) {
                return true;
            }
        }
        return false;
    }
    Facet.datumHasRemote = datumHasRemote;
    function introspectDatum(datum) {
        return Q.all(Object.keys(datum).map(function (applyName) {
            var applyValue = datum[applyName];
            if (applyValue instanceof Facet.RemoteDataset && applyValue.needsIntrospect()) {
                return applyValue.introspect().then(function (newRemoteDataset) {
                    datum[applyName] = newRemoteDataset;
                });
            }
            return null;
        }).filter(Boolean)).then(function () { return datum; });
    }
    Facet.introspectDatum = introspectDatum;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            return Facet.isInstanceOf(candidate, AttributeInfo);
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
    Facet.AttributeInfo = AttributeInfo;
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
    Facet.RangeAttributeInfo = RangeAttributeInfo;
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
    Facet.UniqueAttributeInfo = UniqueAttributeInfo;
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
    Facet.HistogramAttributeInfo = HistogramAttributeInfo;
    AttributeInfo.register(UniqueAttributeInfo);
    AttributeInfo.UNIQUE = new UniqueAttributeInfo();
    AttributeInfo.HISTOGRAM = new HistogramAttributeInfo();
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function mergeRemoteDatasets(remoteGroups) {
        var seen = {};
        remoteGroups.forEach(function (remoteGroup) {
            remoteGroup.forEach(function (remote) {
                var id = remote.getId();
                if (seen[id])
                    return;
                seen[id] = remote;
            });
        });
        return Object.keys(seen).sort().map(function (k) { return seen[k]; });
    }
    Facet.mergeRemoteDatasets = mergeRemoteDatasets;
    var check;
    var Dataset = (function () {
        function Dataset(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            this.attributes = null;
            this.key = null;
            this.source = parameters.source;
            if (dummy !== dummyObject) {
                throw new TypeError("can not call `new Dataset` directly use Dataset.fromJS instead");
            }
            if (parameters.attributes) {
                this.attributes = parameters.attributes;
            }
            if (parameters.key) {
                this.key = parameters.key;
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
                        newAttributes[k] = Facet.AttributeInfo.fromJS(attributes[k]);
                    }
                    value.attributes = newAttributes;
                }
            }
            return value;
        };
        Dataset.isDataset = function (candidate) {
            return Facet.isInstanceOf(candidate, Dataset);
        };
        Dataset.register = function (ex, id) {
            if (id === void 0) { id = null; }
            if (!id)
                id = ex.name.replace('Dataset', '').replace(/^\w/, function (s) { return s.toLowerCase(); });
            Dataset.classMap[id] = ex;
        };
        Dataset.fromJS = function (datasetJS) {
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
            return ClassFn.fromJS(datasetJS);
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
            if (this.attributes)
                value.attributes = this.attributes;
            if (this.key)
                value.key = this.key;
            return value;
        };
        Dataset.prototype.toJS = function () {
            var js = {
                source: this.source
            };
            if (this.attributes)
                js.attributes = this.getAttributesJS();
            if (this.key)
                js.key = this.key;
            return js;
        };
        Dataset.prototype.getAttributesJS = function () {
            var attributesJS = {};
            var attributes = this.attributes;
            for (var k in attributes) {
                attributesJS[k] = attributes[k].toJS();
            }
            return attributesJS;
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
        Dataset.prototype.getId = function () {
            return this.source;
        };
        Dataset.prototype.basis = function () {
            return false;
        };
        Dataset.prototype.getFullType = function () {
            var attributes = this.attributes;
            if (!attributes)
                throw new Error("dataset has not been introspected");
            var remote = this.source === 'native' ? null : [this.getId()];
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
        Dataset.prototype.getRemoteDatasetIds = function () {
            throw new Error("can not call this directly");
        };
        Dataset.type = 'DATASET';
        Dataset.classMap = {};
        return Dataset;
    })();
    Facet.Dataset = Dataset;
    check = Dataset;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
    var typeOrder = {
        'TIME': 1,
        'TIME_RANGE': 2,
        'SET/TIME': 3,
        'SET/TIME_RANGE': 4,
        'STRING': 5,
        'SET/STRING': 6,
        'NUMBER': 7,
        'NUMBER_RANGE': 8,
        'SET/NUMBER': 9,
        'SET/NUMBER_RANGE': 10
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
            return new Facet.AttributeInfo({ type: 'TIME' });
        }
        else if (isNumber(attributeValue)) {
            return new Facet.AttributeInfo({ type: 'NUMBER' });
        }
        else if (isString(attributeValue)) {
            return new Facet.AttributeInfo({ type: 'STRING' });
        }
        else if (attributeValue instanceof Facet.Dataset) {
            return new Facet.AttributeInfo(attributeValue.getFullType());
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
            datum[k] = Facet.valueFromJS(js[k]);
        }
        return datum;
    }
    function datumToJS(datum) {
        var js = {};
        for (var k in datum) {
            if (k === '$def')
                continue;
            js[k] = Facet.valueToJSInlineType(datum[k]);
        }
        return js;
    }
    function joinDatums(datumA, datumB) {
        var newDatum = Object.create(null);
        for (var k in datumA) {
            newDatum[k] = datumA[k];
        }
        for (var k in datumB) {
            newDatum[k] = datumB[k];
        }
        if (datumA.$def && datumB.$def) {
            newDatum.$def = joinDatums(datumA.$def, datumB.$def);
        }
        return newDatum;
    }
    function copy(obj) {
        var newObj = {};
        var k;
        for (k in obj) {
            if (hasOwnProperty(obj, k))
                newObj[k] = obj[k];
        }
        return newObj;
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
        NativeDataset.fromJS = function (datasetJS) {
            var value = Facet.Dataset.jsToValue(datasetJS);
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
            return Facet.datumHasRemote(this.data[0]);
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
                datum.$def[name] = exFn(datum, true);
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
            return Facet.Set.fromJS({
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
                    if (applyValue instanceof Facet.Dataset) {
                        remoteDatasets.push(applyValue.getRemoteDatasets());
                    }
                }
                else {
                    Object.keys(applyValue).forEach(function (defName) {
                        var defValue = applyValue[defName];
                        if (defValue instanceof Facet.Dataset) {
                            remoteDatasets.push(defValue.getRemoteDatasets());
                        }
                    });
                }
            });
            return Facet.mergeRemoteDatasets(remoteDatasets);
        };
        NativeDataset.prototype.getRemoteDatasetIds = function () {
            if (this.data.length === 0)
                return [];
            var datum = this.data[0];
            var push = Array.prototype.push;
            var remoteDatasetIds = [];
            Object.keys(datum).forEach(function (applyName) {
                var applyValue = datum[applyName];
                if (applyName !== '$def') {
                    if (applyValue instanceof Facet.Dataset) {
                        push.apply(remoteDatasetIds, applyValue.getRemoteDatasets());
                    }
                }
                else {
                    Object.keys(applyValue).forEach(function (defName) {
                        var defValue = applyValue[defName];
                        if (defValue instanceof Facet.Dataset) {
                            push.apply(remoteDatasetIds, defValue.getRemoteDatasets());
                        }
                    });
                }
            });
            return deduplicateSort(remoteDatasetIds);
        };
        NativeDataset.prototype.join = function (other) {
            var thisKey = this.key;
            var otherKey = other.key;
            var thisData = this.data;
            var otherData = other.data;
            var datum;
            var k;
            var mapping = Object.create(null);
            for (var i = 0; i < thisData.length; i++) {
                datum = thisData[i];
                k = String(thisKey ? datum[thisKey] : i);
                mapping[k] = [datum];
            }
            for (var i = 0; i < otherData.length; i++) {
                datum = otherData[i];
                k = String(otherKey ? datum[otherKey] : i);
                if (!mapping[k])
                    mapping[k] = [];
                mapping[k].push(datum);
            }
            var newData = [];
            for (var j in mapping) {
                var datums = mapping[j];
                if (datums.length === 1) {
                    newData.push(datums[0]);
                }
                else {
                    newData.push(joinDatums(datums[0], datums[1]));
                }
            }
            return new NativeDataset({ source: 'native', data: newData });
        };
        NativeDataset.prototype.getFlattenedColumns = function () {
            this.introspect();
            var basicColumns = [];
            var attributes = this.attributes;
            var datasetAttribute = null;
            for (var attributeName in attributes) {
                if (!hasOwnProperty(attributes, attributeName))
                    continue;
                var attributeInfo = attributes[attributeName];
                if (attributeInfo.type === 'DATASET') {
                    if (!datasetAttribute) {
                        datasetAttribute = {
                            prefix: attributeName,
                            columns: this.data[0][attributeName].getFlattenedColumns()
                        };
                    }
                }
                else {
                    basicColumns.push({
                        name: attributeName,
                        type: attributeInfo.type
                    });
                }
            }
            var flattenedColumns = basicColumns.sort(function (a, b) { return typeOrder[a.type] - typeOrder[b.type]; }).map(function (c) { return c.name; });
            if (datasetAttribute)
                flattenedColumns.push(datasetAttribute);
            return flattenedColumns;
        };
        NativeDataset.prototype._flattenHelper = function (flattenedColumns, prefix, context, flat) {
            var data = this.data;
            for (var i = 0; i < data.length; i++) {
                var datum = data[i];
                var flatDatum = copy(context);
                for (var j = 0; j < flattenedColumns.length; j++) {
                    var flattenedColumn = flattenedColumns[j];
                    if (typeof flattenedColumn === 'string') {
                        flatDatum[prefix + flattenedColumn] = datum[flattenedColumn];
                    }
                    else {
                        datum[flattenedColumn.prefix]._flattenHelper(flattenedColumn.columns, prefix + flattenedColumn.prefix + '.', flatDatum, flat);
                    }
                }
                if (typeof flattenedColumns[flattenedColumns.length - 1] === 'string') {
                    flat.push(flatDatum);
                }
            }
        };
        NativeDataset.prototype.flatten = function () {
            var flattenedColumns = this.getFlattenedColumns();
            var flat = [];
            this._flattenHelper(flattenedColumns, '', {}, flat);
            return flat;
        };
        NativeDataset.type = 'DATASET';
        return NativeDataset;
    })(Facet.Dataset);
    Facet.NativeDataset = NativeDataset;
    Facet.Dataset.register(NativeDataset);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function getSampleValue(valueType, ex) {
        switch (valueType) {
            case 'BOOLEAN':
                return true;
            case 'NUMBER':
                return 4;
            case 'NUMBER_RANGE':
                if (ex instanceof Facet.NumberBucketExpression) {
                    return new Facet.NumberRange({ start: ex.offset, end: ex.offset + ex.size });
                }
                else {
                    return new Facet.NumberRange({ start: 0, end: 1 });
                }
            case 'TIME':
                return new Date('2015-03-14T00:00:00');
            case 'TIME_RANGE':
                if (ex instanceof Facet.TimeBucketExpression) {
                    var start = ex.duration.floor(new Date('2015-03-14T00:00:00'), ex.timezone);
                    return new Facet.TimeRange({ start: start, end: ex.duration.move(start, ex.timezone, 1) });
                }
                else {
                    return new Facet.TimeRange({ start: new Date('2015-03-14T00:00:00'), end: new Date('2015-03-15T00:00:00') });
                }
            case 'STRING':
                if (ex instanceof Facet.RefExpression) {
                    return 'some_' + ex.name;
                }
                else {
                    return 'something';
                }
            default:
                throw new Error("unsupported simulation on: " + valueType);
        }
    }
    function immutableAdd(obj, key, value) {
        var newObj = Object.create(null);
        for (var k in obj)
            newObj[k] = obj[k];
        newObj[key] = value;
        return newObj;
    }
    var RemoteDataset = (function (_super) {
        __extends(RemoteDataset, _super);
        function RemoteDataset(parameters, dummy) {
            if (dummy === void 0) { dummy = null; }
            _super.call(this, parameters, dummyObject);
            this.rawAttributes = null;
            this.rawAttributes = parameters.rawAttributes;
            this.requester = parameters.requester;
            this.mode = parameters.mode || 'raw';
            this.derivedAttributes = parameters.derivedAttributes || [];
            this.filter = parameters.filter || Facet.Expression.TRUE;
            this.split = parameters.split;
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
                    if (!this.key)
                        throw new Error('must have key in split mode');
                    this.havingFilter = this.havingFilter || Facet.Expression.TRUE;
                }
            }
        }
        RemoteDataset.jsToValue = function (parameters) {
            var value = Facet.Dataset.jsToValue(parameters);
            if (parameters.requester)
                value.requester = parameters.requester;
            value.filter = parameters.filter || Facet.Expression.TRUE;
            return value;
        };
        RemoteDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            if (this.rawAttributes) {
                value.rawAttributes = this.rawAttributes;
            }
            if (this.requester) {
                value.requester = this.requester;
            }
            value.mode = this.mode;
            value.derivedAttributes = this.derivedAttributes;
            value.filter = this.filter;
            if (this.split) {
                value.split = this.split;
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
            if (this.rawAttributes)
                js.rawAttributes = this.getRawAttributesJS();
            if (this.requester) {
                js.requester = this.requester;
            }
            if (!this.filter.equals(Facet.Expression.TRUE)) {
                js.filter = this.filter.toJS();
            }
            return js;
        };
        RemoteDataset.prototype.getRawAttributesJS = function () {
            var rawAttributesJS = {};
            var rawAttributes = this.rawAttributes;
            for (var k in rawAttributes) {
                rawAttributesJS[k] = rawAttributes[k].toJS();
            }
            return rawAttributesJS;
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
        RemoteDataset.prototype.getRemoteDatasetIds = function () {
            return [this.getId()];
        };
        RemoteDataset.prototype.getAttributesInfo = function (attributeName) {
            return this.rawAttributes ? this.rawAttributes[attributeName] : this.attributes[attributeName];
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
        RemoteDataset.prototype.canHandleApply = function (ex) {
            throw new Error("must implement canHandleApply");
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
        RemoteDataset.prototype.addFilter = function (expression) {
            if (!expression.resolved())
                return null;
            var value = this.valueOf();
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
            return (new (Facet.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.makeTotal = function () {
            if (this.mode !== 'raw')
                return null;
            if (!this.canHandleTotal())
                return null;
            var value = this.valueOf();
            value.mode = 'total';
            value.rawAttributes = value.attributes;
            value.attributes = {};
            return (new (Facet.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.addSplit = function (splitExpression, label) {
            if (this.mode !== 'raw')
                return null;
            if (!this.canHandleSplit(splitExpression))
                return null;
            var value = this.valueOf();
            value.mode = 'split';
            value.split = splitExpression;
            value.key = label;
            value.rawAttributes = value.attributes;
            value.attributes = Object.create(null);
            value.attributes[label] = new Facet.AttributeInfo({ type: splitExpression.type });
            return (new (Facet.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.addAction = function (action) {
            var expression = action.expression;
            if (action instanceof Facet.FilterAction) {
                return this.addFilter(expression);
            }
            var value = this.valueOf();
            if (action instanceof Facet.DefAction) {
                if (expression.type !== 'DATASET')
                    return null;
                switch (this.mode) {
                    case 'total':
                        if (expression instanceof Facet.LiteralExpression) {
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
                        if (defExpression instanceof Facet.ActionsExpression && defExpression.actions.length === 1 && defExpression.actions[0].action === 'filter' && defExpression.actions[0].expression.equals(this.split.is(new Facet.RefExpression({ op: 'ref', name: '^' + this.key, type: this.split.type })))) {
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
            else if (action instanceof Facet.ApplyAction) {
                if (expression.type !== 'NUMBER' && expression.type !== 'TIME')
                    return null;
                if (!this.canHandleApply(action.expression))
                    return null;
                if (this.mode === 'raw') {
                    value.derivedAttributes = value.derivedAttributes.concat(action);
                }
                else {
                    if (action.name === this.key)
                        return null;
                    value.applies = value.applies.concat(action);
                }
                value.attributes = immutableAdd(value.attributes, action.name, new Facet.AttributeInfo({ type: action.expression.type }));
            }
            else if (action instanceof Facet.SortAction) {
                if (this.limit)
                    return null;
                if (!this.canHandleSort(action))
                    return null;
                value.sort = action;
            }
            else if (action instanceof Facet.LimitAction) {
                if (!this.canHandleLimit(action))
                    return null;
                if (!value.limit || action.limit < value.limit.limit) {
                    value.limit = action;
                }
            }
            else {
                return null;
            }
            return (new (Facet.Dataset.classMap[this.source])(value));
        };
        RemoteDataset.prototype.simulate = function () {
            var datum = {};
            if (this.mode === 'raw') {
                var attributes = this.attributes;
                for (var attributeName in attributes) {
                    if (!hasOwnProperty(attributes, attributeName))
                        continue;
                    datum[attributeName] = getSampleValue(attributes[attributeName].type, null);
                }
            }
            else {
                if (this.mode === 'split') {
                    datum[this.key] = getSampleValue(this.split.type, this.split);
                }
                var applies = this.applies;
                for (var i = 0; i < applies.length; i++) {
                    var apply = applies[i];
                    datum[apply.name] = getSampleValue(apply.expression.type, apply.expression);
                }
            }
            return new Facet.NativeDataset({
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
            var ClassFn = Facet.Dataset.classMap[this.source];
            return this.requester({ query: queryAndPostProcess.query }).then(queryAndPostProcess.postProcess).then(function (attributes) {
                value.attributes = attributes;
                return (new ClassFn(value));
            });
        };
        RemoteDataset.prototype._joinDigestHelper = function (joinExpression, action) {
            var ids = action.expression.getRemoteDatasetIds();
            if (ids.length !== 1)
                throw new Error('must be single dataset');
            if (ids[0] === joinExpression.lhs.value.getId()) {
                var lhsDigest = this.digest(joinExpression.lhs, action);
                if (!lhsDigest)
                    return null;
                return new Facet.JoinExpression({
                    op: 'join',
                    lhs: lhsDigest.expression,
                    rhs: joinExpression.rhs
                });
            }
            else {
                var rhsDigest = this.digest(joinExpression.rhs, action);
                if (!rhsDigest)
                    return null;
                return new Facet.JoinExpression({
                    op: 'join',
                    lhs: joinExpression.lhs,
                    rhs: rhsDigest.expression
                });
            }
        };
        RemoteDataset.prototype.digest = function (expression, action) {
            if (expression instanceof Facet.LiteralExpression) {
                var remoteDataset = expression.value;
                if (remoteDataset instanceof RemoteDataset) {
                    var newRemoteDataset = remoteDataset.addAction(action);
                    if (!newRemoteDataset)
                        return null;
                    return {
                        undigested: null,
                        expression: new Facet.LiteralExpression({
                            op: 'literal',
                            value: newRemoteDataset
                        })
                    };
                }
                else {
                    return null;
                }
            }
            else if (expression instanceof Facet.JoinExpression) {
                var lhs = expression.lhs;
                var rhs = expression.rhs;
                if (lhs instanceof Facet.LiteralExpression && rhs instanceof Facet.LiteralExpression) {
                    var lhsValue = lhs.value;
                    var rhsValue = rhs.value;
                    if (lhsValue instanceof RemoteDataset && rhsValue instanceof RemoteDataset) {
                        var actionExpression = action.expression;
                        if (action instanceof Facet.DefAction) {
                            var actionDatasets = actionExpression.getRemoteDatasetIds();
                            if (actionDatasets.length !== 1)
                                return null;
                            newJoin = this._joinDigestHelper(expression, action);
                            if (!newJoin)
                                return null;
                            return {
                                expression: newJoin,
                                undigested: null
                            };
                        }
                        else if (action instanceof Facet.ApplyAction) {
                            var actionDatasets = actionExpression.getRemoteDatasetIds();
                            if (!actionDatasets.length)
                                return null;
                            var newJoin = null;
                            if (actionDatasets.length === 1) {
                                newJoin = this._joinDigestHelper(expression, action);
                                if (!newJoin)
                                    return null;
                                return {
                                    expression: newJoin,
                                    undigested: null
                                };
                            }
                            else {
                                var breakdown = actionExpression.breakdownByDataset('_br_');
                                var singleDatasetActions = breakdown.singleDatasetActions;
                                newJoin = expression;
                                for (var i = 0; i < singleDatasetActions.length && newJoin; i++) {
                                    newJoin = this._joinDigestHelper(newJoin, singleDatasetActions[i]);
                                }
                                if (!newJoin)
                                    return null;
                                return {
                                    expression: newJoin,
                                    undigested: new Facet.ApplyAction({
                                        action: 'apply',
                                        name: action.name,
                                        expression: breakdown.combineExpression
                                    })
                                };
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
                else {
                    return null;
                }
            }
            else {
                throw new Error("can not digest " + expression.op);
            }
        };
        RemoteDataset.type = 'DATASET';
        return RemoteDataset;
    })(Facet.Dataset);
    Facet.RemoteDataset = RemoteDataset;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var BOUNDS_REG_EXP = /^[\[(][\])]$/;
    var Range = (function () {
        function Range(start, end, bounds) {
            if (bounds) {
                if (!BOUNDS_REG_EXP.test(bounds)) {
                    throw new Error("invalid bounds " + bounds);
                }
            }
            else {
                bounds = Range.DEFAULT_BOUNDS;
            }
            if (start !== null && end !== null && this._endpointEqual(start, end)) {
                if (bounds !== '[]') {
                    start = end = this._zeroEndpoint();
                }
                if (bounds === '(]' || bounds === '()')
                    this.bounds = '[)';
            }
            else {
                if (start !== null && end !== null && end < start) {
                    throw new Error('must have start <= end');
                }
                if (start === null && bounds[0] === '[') {
                    bounds = '(' + bounds[1];
                }
                if (end === null && bounds[1] === ']') {
                    bounds = bounds[0] + ')';
                }
            }
            this.start = start;
            this.end = end;
            this.bounds = bounds;
        }
        Range.fromJS = function (parameters) {
            if (typeof parameters.start === 'number' || typeof parameters.end === 'number') {
                return Facet.NumberRange.fromJS(parameters);
            }
            else {
                return Facet.TimeRange.fromJS(parameters);
            }
        };
        Range.prototype._zeroEndpoint = function () {
            return 0;
        };
        Range.prototype._endpointEqual = function (a, b) {
            return a === b;
        };
        Range.prototype._endpointToString = function (a) {
            return String(a);
        };
        Range.prototype._equalsHelper = function (other) {
            return Boolean(other) && this.bounds === other.bounds && this._endpointEqual(this.start, other.start) && this._endpointEqual(this.end, other.end);
        };
        Range.prototype.toString = function () {
            var bounds = this.bounds;
            return bounds[0] + this._endpointToString(this.start) + ',' + this._endpointToString(this.end) + bounds[1];
        };
        Range.prototype.openStart = function () {
            return this.bounds[0] === '(';
        };
        Range.prototype.openEnd = function () {
            return this.bounds[1] === ')';
        };
        Range.prototype.empty = function () {
            return this._endpointEqual(this.start, this.end) && this.bounds === '[)';
        };
        Range.prototype.degenerate = function () {
            return this._endpointEqual(this.start, this.end) && this.bounds === '[]';
        };
        Range.prototype.contains = function (val) {
            if (val === null)
                return false;
            var start = this.start;
            var end = this.end;
            var bounds = this.bounds;
            if (bounds[0] === '[') {
                if (val < start)
                    return false;
            }
            else {
                if (start !== null && val <= start)
                    return false;
            }
            if (bounds[1] === ']') {
                if (end < val)
                    return false;
            }
            else {
                if (end !== null && end <= val)
                    return false;
            }
            return true;
        };
        Range.prototype.intersects = function (other) {
            return this.contains(other.start) || this.contains(other.end) || other.contains(this.start) || other.contains(this.end) || this._equalsHelper(other);
        };
        Range.prototype.adjacent = function (other) {
            return (this._endpointEqual(this.end, other.start) && this.openEnd() !== other.openStart()) || (this._endpointEqual(this.start, other.end) && this.openStart() !== other.openEnd());
        };
        Range.prototype.mergeable = function (other) {
            return this.intersects(other) || this.adjacent(other);
        };
        Range.prototype.union = function (other) {
            if (!this.mergeable(other))
                return null;
            return this.extend(other);
        };
        Range.prototype.extend = function (other) {
            var thisStart = this.start;
            var thisEnd = this.end;
            var otherStart = other.start;
            var otherEnd = other.end;
            var start;
            var startBound;
            if (thisStart === null || otherStart === null) {
                start = null;
                startBound = '(';
            }
            else if (thisStart < otherStart) {
                start = thisStart;
                startBound = this.bounds[0];
            }
            else {
                start = otherStart;
                startBound = other.bounds[0];
            }
            var end;
            var endBound;
            if (thisEnd === null || otherEnd === null) {
                end = null;
                endBound = ')';
            }
            else if (thisEnd < otherEnd) {
                end = otherEnd;
                endBound = other.bounds[1];
            }
            else {
                end = thisEnd;
                endBound = this.bounds[1];
            }
            return new this.constructor({ start: start, end: end, bounds: startBound + endBound });
        };
        Range.prototype.intersect = function (other) {
            if (!this.mergeable(other))
                return null;
            var thisStart = this.start;
            var thisEnd = this.end;
            var otherStart = other.start;
            var otherEnd = other.end;
            var start;
            var startBound;
            if (thisStart === null || otherStart === null) {
                if (otherStart === null) {
                    start = thisStart;
                    startBound = this.bounds[0];
                }
                else {
                    start = otherStart;
                    startBound = other.bounds[0];
                }
            }
            else if (otherStart < thisStart) {
                start = thisStart;
                startBound = this.bounds[0];
            }
            else {
                start = otherStart;
                startBound = other.bounds[0];
            }
            var end;
            var endBound;
            if (thisEnd === null || otherEnd === null) {
                if (thisEnd == null) {
                    end = otherEnd;
                    endBound = other.bounds[1];
                }
                else {
                    end = thisEnd;
                    endBound = this.bounds[1];
                }
            }
            else if (otherEnd < thisEnd) {
                end = otherEnd;
                endBound = other.bounds[1];
            }
            else {
                end = thisEnd;
                endBound = this.bounds[1];
            }
            return new this.constructor({ start: start, end: end, bounds: startBound + endBound });
        };
        Range.DEFAULT_BOUNDS = '[)';
        return Range;
    })();
    Facet.Range = Range;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function finiteOrNull(n) {
        return (isNaN(n) || isFinite(n)) ? n : null;
    }
    var check;
    var NumberRange = (function (_super) {
        __extends(NumberRange, _super);
        function NumberRange(parameters) {
            if (isNaN(parameters.start))
                throw new TypeError('`start` must be a number');
            if (isNaN(parameters.end))
                throw new TypeError('`end` must be a number');
            _super.call(this, parameters.start, parameters.end, parameters.bounds);
        }
        NumberRange.isNumberRange = function (candidate) {
            return Facet.isInstanceOf(candidate, NumberRange);
        };
        NumberRange.numberBucket = function (num, size, offset) {
            var start = Math.floor((num - offset) / size) * size + offset;
            return new NumberRange({
                start: start,
                end: start + size,
                bounds: Facet.Range.DEFAULT_BOUNDS
            });
        };
        NumberRange.fromNumber = function (n) {
            return new NumberRange({ start: n, end: n, bounds: '[]' });
        };
        NumberRange.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable numberRange");
            }
            var start = parameters.start;
            var end = parameters.end;
            return new NumberRange({
                start: start === null ? null : finiteOrNull(Number(start)),
                end: end === null ? null : finiteOrNull(Number(end)),
                bounds: parameters.bounds
            });
        };
        NumberRange.prototype.valueOf = function () {
            return {
                start: this.start,
                end: this.end,
                bounds: this.bounds
            };
        };
        NumberRange.prototype.toJS = function () {
            var js = {
                start: this.start,
                end: this.end
            };
            if (this.bounds !== Facet.Range.DEFAULT_BOUNDS)
                js.bounds = this.bounds;
            return js;
        };
        NumberRange.prototype.toJSON = function () {
            return this.toJS();
        };
        NumberRange.prototype.equals = function (other) {
            return NumberRange.isNumberRange(other) && this._equalsHelper(other);
        };
        NumberRange.type = 'NUMBER_RANGE';
        return NumberRange;
    })(Facet.Range);
    Facet.NumberRange = NumberRange;
    check = NumberRange;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function dateString(date) {
        return date.toISOString();
    }
    function hashFromJS(xs, setType) {
        var keyFn = setType === 'TIME' ? dateString : String;
        var hash = Object.create(null);
        for (var i = 0; i < xs.length; i++) {
            var x = Facet.valueFromJS(xs[i], setType);
            hash[keyFn(x)] = x;
        }
        return hash;
    }
    function hashToValues(hash) {
        return Object.keys(hash).sort().map(function (k) { return hash[k]; });
    }
    function unifyElements(elements) {
        var newElements = Object.create(null);
        for (var k in elements) {
            var accumulator = elements[k];
            var newElementsKeys = Object.keys(newElements);
            for (var i = 0; i < newElementsKeys.length; i++) {
                var newElementsKey = newElementsKeys[i];
                var newElement = newElements[newElementsKey];
                var unionElement = accumulator.union(newElement);
                if (unionElement) {
                    accumulator = unionElement;
                    delete newElements[newElementsKey];
                }
            }
            newElements[accumulator.toString()] = accumulator;
        }
        return newElements;
    }
    function intersectElements(elements1, elements2) {
        var newElements = Object.create(null);
        for (var k1 in elements1) {
            var element1 = elements1[k1];
            for (var k2 in elements2) {
                var element2 = elements2[k2];
                var intersect = element1.intersect(element2);
                if (intersect)
                    newElements[intersect.toString()] = intersect;
            }
        }
        return newElements;
    }
    var typeUpgrades = {
        'NUMBER': 'NUMBER_RANGE',
        'TIME': 'TIME_RANGE'
    };
    var check;
    var Set = (function () {
        function Set(parameters) {
            var setType = parameters.setType;
            this.setType = setType;
            var elements = parameters.elements;
            if (setType === 'NUMBER_RANGE' || setType === 'TIME_RANGE') {
                elements = unifyElements(elements);
            }
            this.elements = elements;
        }
        Set.isSet = function (candidate) {
            return Facet.isInstanceOf(candidate, Set);
        };
        Set.convertToSet = function (thing) {
            var thingType = Facet.getValueType(thing);
            if (thingType.indexOf('SET/') === 0)
                return thing;
            return Set.fromJS({ setType: thingType, elements: [thing] });
        };
        Set.generalUnion = function (a, b) {
            var aSet = Set.convertToSet(a);
            var bSet = Set.convertToSet(b);
            var aSetType = aSet.setType;
            var bSetType = bSet.setType;
            if (typeUpgrades[aSetType] === bSetType) {
                aSet = aSet.upgradeType();
            }
            else if (typeUpgrades[bSetType] === aSetType) {
                bSet = bSet.upgradeType();
            }
            else if (aSetType !== bSetType) {
                return null;
            }
            return aSet.union(bSet).simplify();
        };
        Set.generalIntersect = function (a, b) {
            var aSet = Set.convertToSet(a);
            var bSet = Set.convertToSet(b);
            var aSetType = aSet.setType;
            var bSetType = bSet.setType;
            if (typeUpgrades[aSetType] === bSetType) {
                aSet = aSet.upgradeType();
            }
            else if (typeUpgrades[bSetType] === aSetType) {
                bSet = bSet.upgradeType();
            }
            else if (aSetType !== bSetType) {
                return null;
            }
            return aSet.intersect(bSet).simplify();
        };
        Set.fromJS = function (parameters) {
            if (Array.isArray(parameters)) {
                parameters = { elements: parameters };
            }
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable set");
            }
            var setType = parameters.setType;
            var elements = parameters.elements;
            if (!setType) {
                setType = Facet.getValueType(elements.length ? elements[0] : null);
            }
            return new Set({
                setType: setType,
                elements: hashFromJS(elements, setType)
            });
        };
        Set.prototype.valueOf = function () {
            return {
                setType: this.setType,
                elements: this.elements
            };
        };
        Set.prototype.getElements = function () {
            return hashToValues(this.elements);
        };
        Set.prototype.toJS = function () {
            return {
                setType: this.setType,
                elements: this.getElements().map(Facet.valueToJS)
            };
        };
        Set.prototype.toJSON = function () {
            return this.toJS();
        };
        Set.prototype.toString = function () {
            return 'SET_' + this.setType + '(' + Object.keys(this.elements).length + ')';
        };
        Set.prototype.equals = function (other) {
            return Set.isSet(other) && this.setType === other.setType && Object.keys(this.elements).sort().join('') === Object.keys(other.elements).sort().join('');
        };
        Set.prototype.empty = function () {
            var elements = this.elements;
            for (var k in elements) {
                if (hasOwnProperty(elements, k))
                    return false;
            }
            return true;
        };
        Set.prototype.simplify = function () {
            var simpleSet = this.downgradeType();
            var simpleSetElements = simpleSet.getElements();
            return simpleSetElements.length === 1 ? simpleSetElements[0] : simpleSet;
        };
        Set.prototype.upgradeType = function () {
            if (this.setType === 'NUMBER') {
                return Set.fromJS({
                    setType: 'NUMBER_RANGE',
                    elements: this.getElements().map(Facet.NumberRange.fromNumber)
                });
            }
            else if (this.setType === 'TIME') {
                return Set.fromJS({
                    setType: 'TIME_RANGE',
                    elements: this.getElements().map(Facet.TimeRange.fromTime)
                });
            }
            else {
                return this;
            }
        };
        Set.prototype.downgradeType = function () {
            if (this.setType === 'NUMBER_RANGE' || this.setType === 'TIME_RANGE') {
                var elements = this.getElements();
                var simpleElements = [];
                for (var i = 0; i < elements.length; i++) {
                    var element = elements[i];
                    if (element.degenerate()) {
                        simpleElements.push(element.start);
                    }
                    else {
                        return this;
                    }
                }
                return Set.fromJS(simpleElements);
            }
            else {
                return this;
            }
        };
        Set.prototype.extent = function () {
            var setType = this.setType;
            if (hasOwnProperty(typeUpgrades, setType)) {
                return this.upgradeType().extent();
            }
            if (setType !== 'NUMBER_RANGE' && setType !== 'TIME_RANGE')
                return null;
            var elements = this.getElements();
            var extent = elements[0] || null;
            for (var i = 1; i < elements.length; i++) {
                extent = extent.extend(elements[i]);
            }
            return extent;
        };
        Set.prototype.union = function (other) {
            if (this.empty())
                return other;
            if (other.empty())
                return this;
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
            if (this.empty() || other.empty())
                return Set.EMPTY;
            var setType = this.setType;
            if (this.setType !== other.setType) {
                throw new TypeError("can not intersect sets of different types");
            }
            var thisValues = this.elements;
            var otherValues = other.elements;
            var newValues;
            if (setType === 'NUMBER_RANGE' || setType === 'TIME_RANGE') {
                newValues = intersectElements(thisValues, otherValues);
            }
            else {
                newValues = Object.create(null);
                for (var k in thisValues) {
                    if (hasOwnProperty(thisValues, k) && hasOwnProperty(otherValues, k)) {
                        newValues[k] = thisValues[k];
                    }
                }
            }
            return new Set({
                setType: this.setType,
                elements: newValues
            });
        };
        Set.prototype.contains = function (value) {
            return hasOwnProperty(this.elements, String(value));
        };
        Set.prototype.containsWithin = function (value) {
            var elements = this.elements;
            for (var k in elements) {
                if (!hasOwnProperty(elements, k))
                    continue;
                if (elements[k].contains(value))
                    return true;
            }
            return false;
        };
        Set.prototype.add = function (value) {
            var setType = this.setType;
            var valueType = Facet.getValueType(value);
            if (setType === 'NULL')
                setType = valueType;
            if (setType !== valueType)
                throw new Error('value type must match');
            var newValues = {};
            newValues[String(value)] = value;
            var elements = this.elements;
            for (var k in elements) {
                if (!hasOwnProperty(elements, k))
                    continue;
                newValues[k] = elements[k];
            }
            return new Set({
                setType: setType,
                elements: newValues
            });
        };
        Set.prototype.label = function (name) {
            return new Facet.NativeDataset({
                source: 'native',
                key: name,
                data: this.getElements().map(function (v) {
                    var datum = {};
                    datum[name] = v;
                    return datum;
                })
            });
        };
        Set.type = 'SET';
        return Set;
    })();
    Facet.Set = Set;
    check = Set;
    Set.EMPTY = Set.fromJS([]);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            return Facet.isInstanceOf(candidate, Shape);
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
    Facet.Shape = Shape;
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
            var xw = margin1d(parameters.left, parameters.width, parameters.right, this.width);
            var yh = margin1d(parameters.top, parameters.height, parameters.bottom, this.height);
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
    Facet.RectangleShape = RectangleShape;
    Shape.classMap['rectangle'] = RectangleShape;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function toDate(date, name) {
        if (date === null)
            return null;
        if (typeof date === "undefined")
            throw new TypeError("timeRange must have a " + name);
        if (typeof date === 'string' || typeof date === 'number')
            date = new Date(date);
        if (!date.getDay)
            throw new TypeError("timeRange must have a " + name + " that is a Date");
        return date;
    }
    function dateToIntervalPart(date) {
        return date.toISOString().replace('Z', '').replace('.000', '').replace(/:00$/, '').replace(/:00$/, '').replace(/T00$/, '');
    }
    var check;
    var TimeRange = (function (_super) {
        __extends(TimeRange, _super);
        function TimeRange(parameters) {
            _super.call(this, parameters.start, parameters.end, parameters.bounds);
        }
        TimeRange.isTimeRange = function (candidate) {
            return Facet.isInstanceOf(candidate, TimeRange);
        };
        TimeRange.timeBucket = function (date, duration, timezone) {
            if (!date)
                return null;
            var start = duration.floor(date, timezone);
            return new TimeRange({
                start: start,
                end: duration.move(start, timezone, 1),
                bounds: Facet.Range.DEFAULT_BOUNDS
            });
        };
        TimeRange.fromTime = function (t) {
            return new TimeRange({ start: t, end: t, bounds: '[]' });
        };
        TimeRange.fromJS = function (parameters) {
            if (typeof parameters !== "object") {
                throw new Error("unrecognizable timeRange");
            }
            return new TimeRange({
                start: toDate(parameters.start, 'start'),
                end: toDate(parameters.end, 'end'),
                bounds: parameters.bounds
            });
        };
        TimeRange.prototype._zeroEndpoint = function () {
            return new Date(0);
        };
        TimeRange.prototype._endpointEqual = function (a, b) {
            if (a === null) {
                return b === null;
            }
            else {
                return b !== null && a.valueOf() === b.valueOf();
            }
        };
        TimeRange.prototype._endpointToString = function (a) {
            if (!a)
                return 'null';
            return a.toISOString();
        };
        TimeRange.prototype.valueOf = function () {
            return {
                start: this.start,
                end: this.end,
                bounds: this.bounds
            };
        };
        TimeRange.prototype.toJS = function () {
            var js = {
                start: this.start,
                end: this.end
            };
            if (this.bounds !== Facet.Range.DEFAULT_BOUNDS)
                js.bounds = this.bounds;
            return js;
        };
        TimeRange.prototype.toJSON = function () {
            return this.toJS();
        };
        TimeRange.prototype.equals = function (other) {
            return TimeRange.isTimeRange(other) && this._equalsHelper(other);
        };
        TimeRange.prototype.toInterval = function () {
            var start = this.start;
            var end = this.end;
            var bounds = this.bounds;
            if (bounds[0] === '(')
                start = new Date(start.valueOf() + 1000);
            if (bounds[1] === ']')
                end = new Date(end.valueOf() + 1000);
            return dateToIntervalPart(start) + "/" + dateToIntervalPart(end);
        };
        TimeRange.type = 'TIME_RANGE';
        return TimeRange;
    })(Facet.Range);
    Facet.TimeRange = TimeRange;
    check = TimeRange;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var timePartToFormat = {
        SECOND_OF_MINUTE: "s",
        SECOND_OF_HOUR: "m'*60+'s",
        SECOND_OF_DAY: "H'*60+'m'*60+'s",
        SECOND_OF_WEEK: "e'*24+H'*60+'m'*60+'s",
        SECOND_OF_MONTH: "d'*24+H'*60+'m'*60+'s",
        SECOND_OF_YEAR: "D'*24+H'*60+'m'*60+'s",
        MINUTE_OF_HOUR: "m",
        MINUTE_OF_DAY: "H'*60+'m",
        MINUTE_OF_WEEK: "e'*24+H'*60+'m",
        MINUTE_OF_MONTH: "d'*24+H'*60+'m",
        MINUTE_OF_YEAR: "D'*24+H'*60+'m",
        HOUR_OF_DAY: "H",
        HOUR_OF_WEEK: "e'*24+H",
        HOUR_OF_MONTH: "d'*24+H",
        HOUR_OF_YEAR: "D'*24+H",
        DAY_OF_WEEK: "e",
        DAY_OF_MONTH: "d",
        DAY_OF_YEAR: "D",
        WEEK_OF_MONTH: null,
        WEEK_OF_YEAR: "w"
    };
    function simpleMath(exprStr) {
        if (String(exprStr) === 'null')
            return null;
        var parts = exprStr.split(/(?=[*+])/);
        var acc = parseInt(parts.shift(), 10);
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            var v = parseInt(p.substring(1), 10);
            acc = p[0] === '*' ? acc * v : acc + v;
        }
        return acc;
    }
    function correctTimeBoundaryResult(result) {
        return Array.isArray(result) && result.length === 1 && typeof result[0].result === 'object';
    }
    function correctTimeseriesResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0].result === 'object');
    }
    function correctTopNResult(result) {
        return Array.isArray(result) && (result.length === 0 || Array.isArray(result[0].result));
    }
    function correctGroupByResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0].event === 'object');
    }
    function correctSelectResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0].result === 'object');
    }
    function makePostProcessTimeBoundary(applies) {
        return function (res) {
            if (!correctTimeBoundaryResult(res)) {
                var err = new Error("unexpected result from Druid (timeBoundary)");
                err.result = res;
                throw err;
            }
            var result = res[0].result;
            var datum = {};
            for (var i = 0; i < applies.length; i++) {
                var apply = applies[i];
                var name = apply.name;
                var aggregate = apply.expression.fn;
                if (typeof result === 'string') {
                    datum[name] = new Date(result);
                }
                else {
                    if (aggregate === 'max') {
                        datum[name] = new Date((result['maxIngestedEventTime'] || result['maxTime']));
                    }
                    else {
                        datum[name] = new Date((result['minTime']));
                    }
                }
            }
            return new Facet.NativeDataset({ source: 'native', data: [datum] });
        };
    }
    function postProcessTotal(res) {
        if (!correctTimeseriesResult(res)) {
            var err = new Error("unexpected result from Druid (all)");
            err.result = res;
            throw err;
        }
        return new Facet.NativeDataset({ source: 'native', data: [res[0].result] });
    }
    function makePostProcessTimeseries(duration, timezone, label) {
        return function (res) {
            if (!correctTimeseriesResult(res)) {
                var err = new Error("unexpected result from Druid (timeseries)");
                err.result = res;
                throw err;
            }
            var canonicalDurationLengthAndThenSome = duration.getCanonicalLength() * 1.5;
            return new Facet.NativeDataset({
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
                    datum[label] = new Facet.TimeRange({ start: rangeStart, end: rangeEnd });
                    return datum;
                })
            });
        };
    }
    function postProcessNumberBucketFactory(rangeSize) {
        return function (v) {
            var start = Number(v);
            return new Facet.NumberRange({
                start: start,
                end: Facet.safeAdd(start, rangeSize)
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
                return new Facet.NativeDataset({
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
                return new Facet.NativeDataset({ source: 'native', data: data });
            }
        };
    }
    function postProcessGroupBy(res) {
        if (!correctGroupByResult(res)) {
            var err = new Error("unexpected result from Druid (groupBy)");
            err.result = res;
            throw err;
        }
        return new Facet.NativeDataset({
            source: 'native',
            data: res.map(function (r) { return r.event; })
        });
    }
    function postProcessSelect(res) {
        if (!correctSelectResult(res)) {
            var err = new Error("unexpected result from Druid (select)");
            err.result = res;
            throw err;
        }
        return new Facet.NativeDataset({
            source: 'native',
            data: res[0].result.events.map(function (event) { return event.event; })
        });
    }
    function postProcessIntrospectFactory(timeAttribute) {
        return function (res) {
            var attributes = Object.create(null);
            attributes[timeAttribute] = new Facet.AttributeInfo({ type: 'TIME' });
            res.dimensions.forEach(function (dimension) {
                attributes[dimension] = new Facet.AttributeInfo({ type: 'STRING' });
            });
            res.metrics.forEach(function (metric) {
                attributes[metric] = new Facet.AttributeInfo({ type: 'NUMBER', filterable: false, splitable: false });
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
            this.allowEternity = parameters.allowEternity;
            this.allowSelectQueries = parameters.allowSelectQueries;
            this.exactResultsOnly = parameters.exactResultsOnly;
            this.context = parameters.context;
        }
        DruidDataset.fromJS = function (datasetJS) {
            var value = Facet.RemoteDataset.jsToValue(datasetJS);
            value.dataSource = datasetJS.dataSource;
            value.timeAttribute = datasetJS.timeAttribute;
            value.allowEternity = Boolean(datasetJS.allowEternity);
            value.allowSelectQueries = Boolean(datasetJS.allowSelectQueries);
            value.exactResultsOnly = Boolean(datasetJS.exactResultsOnly);
            value.context = datasetJS.context;
            return new DruidDataset(value);
        };
        DruidDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.dataSource = this.dataSource;
            value.timeAttribute = this.timeAttribute;
            value.allowEternity = this.allowEternity;
            value.allowSelectQueries = this.allowSelectQueries;
            value.exactResultsOnly = this.exactResultsOnly;
            value.context = this.context;
            return value;
        };
        DruidDataset.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.dataSource = this.dataSource;
            js.timeAttribute = this.timeAttribute;
            if (this.allowEternity)
                js.allowEternity = true;
            if (this.allowSelectQueries)
                js.allowSelectQueries = true;
            if (this.exactResultsOnly)
                js.exactResultsOnly = true;
            js.context = this.context;
            return js;
        };
        DruidDataset.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && String(this.dataSource) === String(other.dataSource) && this.timeAttribute === other.timeAttribute && this.allowEternity === other.allowEternity && this.allowSelectQueries === other.allowSelectQueries && this.exactResultsOnly === other.exactResultsOnly && this.context === other.context;
        };
        DruidDataset.prototype.getId = function () {
            return _super.prototype.getId.call(this) + ':' + this.dataSource;
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
        DruidDataset.prototype.canHandleApply = function (ex) {
            return true;
        };
        DruidDataset.prototype.canHandleSort = function (sortAction) {
            if (this.split instanceof Facet.TimeBucketExpression) {
                var sortExpression = sortAction.expression;
                if (sortExpression instanceof Facet.RefExpression) {
                    return sortExpression.name === this.key;
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
            return !(this.split instanceof Facet.TimeBucketExpression);
        };
        DruidDataset.prototype.canHandleHavingFilter = function (ex) {
            return !this.limit;
        };
        DruidDataset.prototype.getDruidDataSource = function () {
            var dataSource = this.dataSource;
            if (Array.isArray(dataSource)) {
                return {
                    type: "union",
                    dataSources: dataSource
                };
            }
            else {
                return dataSource;
            }
        };
        DruidDataset.prototype.canUseNativeAggregateFilter = function (filterExpression) {
            if (filterExpression.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            return filterExpression.every(function (ex) {
                if (ex instanceof Facet.IsExpression) {
                    return ex.lhs.isOp('ref') && ex.rhs.isOp('literal');
                }
                else if (ex instanceof Facet.InExpression) {
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
            if (filter instanceof Facet.LiteralExpression) {
                if (filter.value === true) {
                    return null;
                }
                else {
                    throw new Error("should never get here");
                }
            }
            else if (filter instanceof Facet.IsExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
                    attributeInfo = this.getAttributesInfo(lhs.name);
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
            else if (filter instanceof Facet.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
                    attributeInfo = this.getAttributesInfo(lhs.name);
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/STRING') {
                        return {
                            type: "or",
                            fields: rhs.value.getElements().map(function (value) {
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
            else if (filter instanceof Facet.MatchExpression) {
                var operand = filter.operand;
                if (operand instanceof Facet.RefExpression) {
                    return {
                        type: "regex",
                        dimension: operand.name,
                        pattern: filter.regexp
                    };
                }
                else {
                    throw new Error("can not convert " + filter.toString() + " to Druid filter");
                }
            }
            else if (filter instanceof Facet.ContainsExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
                    return {
                        type: "search",
                        dimension: lhs.name,
                        query: {
                            type: "fragment",
                            values: [rhs.value]
                        }
                    };
                }
                else {
                    throw new Error("can not express " + rhs.toString() + " in SQL");
                }
            }
            else if (filter instanceof Facet.NotExpression) {
                return {
                    type: "not",
                    field: this.timelessFilterToDruid(filter.operand)
                };
            }
            else if (filter instanceof Facet.AndExpression || filter instanceof Facet.OrExpression) {
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
            if (filter instanceof Facet.LiteralExpression) {
                if (!filter.value)
                    return DruidDataset.FALSE_INTERVAL;
                if (!this.allowEternity)
                    throw new Error('must filter on time unless the allowEternity flag is set');
                return DruidDataset.TRUE_INTERVAL;
            }
            else if (filter instanceof Facet.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
                    var timeRanges;
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/TIME_RANGE') {
                        timeRanges = rhs.value.getElements();
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
            else if (filter instanceof Facet.AndExpression) {
                var mergedTimePart = Facet.AndExpression.mergeTimePart(filter);
                if (mergedTimePart) {
                    return this.timeFilterToIntervals(mergedTimePart);
                }
                else {
                    throw new Error("can not convert AND filter " + filter.toString() + " to Druid interval");
                }
            }
            else {
                throw new Error("can not convert " + filter.toString() + " to Druid interval");
            }
        };
        DruidDataset.prototype.filterToDruid = function (filter) {
            if (filter.type !== 'BOOLEAN')
                throw new Error("must be a BOOLEAN filter");
            if (filter.equals(Facet.Expression.FALSE)) {
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
                bucketing = 's=' + Facet.continuousFloorExpression('s', 'Math.floor', numberBucket.size, numberBucket.offset) + ';';
            }
            return {
                type: "javascript",
                'function': "function(d) {\nvar m = d.match(" + regExp + ");\nif(!m) return 'null';\nvar s = +m[1];\nif(!(Math.abs(+m[2] - s - " + attributeInfo.rangeSize + ") < 1e-6)) return 'null'; " + bucketing + "\nvar parts = String(Math.abs(s)).split('.');\nparts[0] = ('000000000' + parts[0]).substr(-10);\nreturn (start < 0 ?'-':'') + parts.join('.');\n}"
            };
        };
        DruidDataset.prototype.isTimeRef = function (ex) {
            return ex instanceof Facet.RefExpression && ex.name === this.timeAttribute;
        };
        DruidDataset.prototype.splitToDruid = function () {
            var splitExpression = this.split;
            var label = this.key;
            var queryType;
            var dimension = null;
            var dimensions = null;
            var granularity = 'all';
            var postProcess = null;
            if (splitExpression instanceof Facet.RefExpression) {
                var dimensionSpec = (splitExpression.name === label) ? label : { type: "default", dimension: splitExpression.name, outputName: label };
                if (this.havingFilter.equals(Facet.Expression.TRUE) && this.limit && !this.exactResultsOnly) {
                    var attributeInfo = this.getAttributesInfo(splitExpression.name);
                    queryType = 'topN';
                    if (attributeInfo instanceof Facet.RangeAttributeInfo) {
                        dimension = {
                            type: "extraction",
                            dimension: splitExpression.name,
                            outputName: label,
                            extractionFn: this.getBucketingDimension(attributeInfo, null)
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
            else if (splitExpression instanceof Facet.SubstrExpression) {
                var refExpression = splitExpression.operand;
                if (refExpression instanceof Facet.RefExpression) {
                    var substrDimension = {
                        type: "extraction",
                        dimension: refExpression.name,
                        outputName: label,
                        extractionFn: {
                            type: "javascript",
                            'function': "function(s){return s.substr(" + splitExpression.position + "," + splitExpression.length + ");}"
                        }
                    };
                    if (this.havingFilter.equals(Facet.Expression.TRUE) && this.limit && !this.exactResultsOnly) {
                        queryType = 'topN';
                        dimension = substrDimension;
                        postProcess = postProcessTopNFactory(null, null);
                    }
                    else {
                        queryType = 'groupBy';
                        dimensions = [substrDimension];
                        postProcess = postProcessGroupBy;
                    }
                }
                else {
                    throw new Error("can not convert complex substr: " + refExpression.toString());
                }
            }
            else if (splitExpression instanceof Facet.TimePartExpression) {
                var refExpression = splitExpression.operand;
                if (refExpression instanceof Facet.RefExpression) {
                    queryType = 'topN';
                    var format = timePartToFormat[splitExpression.part];
                    if (!format)
                        throw new Error("unsupported part in timePart expression " + splitExpression.part);
                    dimension = {
                        type: "extraction",
                        dimension: refExpression.name === this.timeAttribute ? '__time' : refExpression.name,
                        outputName: label,
                        extractionFn: {
                            type: "timeFormat",
                            format: format,
                            timeZone: splitExpression.timezone.toString(),
                            locale: "en-US"
                        }
                    };
                    postProcess = postProcessTopNFactory(simpleMath, label);
                }
                else {
                    throw new Error("can not convert complex time part: " + refExpression.toString());
                }
            }
            else if (splitExpression instanceof Facet.TimeBucketExpression) {
                if (this.isTimeRef(splitExpression.operand)) {
                    queryType = 'timeseries';
                    granularity = {
                        type: "period",
                        period: splitExpression.duration.toString(),
                        timeZone: splitExpression.timezone.toString()
                    };
                    postProcess = makePostProcessTimeseries(splitExpression.duration, splitExpression.timezone, label);
                }
                else {
                    throw new Error("can not convert complex time bucket: " + splitExpression.operand.toString());
                }
            }
            else if (splitExpression instanceof Facet.NumberBucketExpression) {
                var refExpression = splitExpression.operand;
                if (refExpression instanceof Facet.RefExpression) {
                    var attributeInfo = this.getAttributesInfo(refExpression.name);
                    queryType = "topN";
                    switch (attributeInfo.type) {
                        case 'NUMBER':
                            var floorExpression = Facet.continuousFloorExpression("d", "Math.floor", splitExpression.size, splitExpression.offset);
                            dimension = {
                                type: "extraction",
                                dimension: refExpression.name,
                                outputName: label,
                                extractionFn: {
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
                                extractionFn: this.getBucketingDimension(attributeInfo, splitExpression)
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
        DruidDataset.prototype.operandsToArithmetic = function (operands, fn) {
            if (operands.length === 1) {
                return this.expressionToPostAggregation(operands[0]);
            }
            else {
                return {
                    type: 'arithmetic',
                    fn: fn,
                    fields: operands.map(this.expressionToPostAggregation, this)
                };
            }
        };
        DruidDataset.prototype.expressionToPostAggregation = function (ex) {
            if (ex instanceof Facet.RefExpression) {
                return {
                    type: 'fieldAccess',
                    fieldName: ex.name
                };
            }
            else if (ex instanceof Facet.LiteralExpression) {
                if (ex.type !== 'NUMBER')
                    throw new Error("must be a NUMBER type");
                return {
                    type: 'constant',
                    value: ex.value
                };
            }
            else if (ex instanceof Facet.AddExpression || ex instanceof Facet.MultiplyExpression) {
                var fn;
                var antiFn;
                var opposite;
                var zero;
                if (ex instanceof Facet.AddExpression) {
                    fn = '+';
                    antiFn = '-';
                    opposite = 'negate';
                    zero = 0;
                }
                else {
                    fn = '*';
                    antiFn = '/';
                    opposite = 'reciprocate';
                    zero = 1;
                }
                var additive = ex.operands.filter(function (o) { return o.op !== opposite; });
                var subtractive = ex.operands.filter(function (o) { return o.op === opposite; });
                if (!additive.length)
                    additive.push(new Facet.LiteralExpression({ op: 'literal', value: zero }));
                if (subtractive.length) {
                    return {
                        type: 'arithmetic',
                        fn: antiFn,
                        fields: [
                            this.operandsToArithmetic(additive, fn),
                            this.operandsToArithmetic(subtractive.map(function (op) { return op.operand; }), fn)
                        ]
                    };
                }
                else {
                    return this.operandsToArithmetic(additive, fn);
                }
            }
            else {
                throw new Error("can not convert expression to post agg: " + ex.toString());
            }
        };
        DruidDataset.prototype.actionToPostAggregation = function (action) {
            if (action instanceof Facet.ApplyAction || action instanceof Facet.DefAction) {
                var postAgg = this.expressionToPostAggregation(action.expression);
                postAgg.name = action.name;
                return postAgg;
            }
            else {
                throw new Error("must be a def or apply action");
            }
        };
        DruidDataset.prototype.actionToAggregation = function (action) {
            if (action instanceof Facet.ApplyAction || action instanceof Facet.DefAction) {
                var aggregateExpression = action.expression;
                if (aggregateExpression instanceof Facet.AggregateExpression) {
                    var attribute = aggregateExpression.attribute;
                    var aggregation = {
                        name: action.name,
                        type: aggregateExpression.fn === "sum" ? "doubleSum" : aggregateExpression.fn
                    };
                    if (aggregateExpression.fn !== 'count') {
                        if (attribute instanceof Facet.RefExpression) {
                            aggregation.fieldName = attribute.name;
                        }
                        else if (attribute) {
                            throw new Error('can not support derived attributes (yet)');
                        }
                    }
                    var aggregateOperand = aggregateExpression.operand;
                    if (aggregateOperand instanceof Facet.ActionsExpression && aggregateOperand.actions.length === 1 && aggregateOperand.actions[0] instanceof Facet.FilterAction && this.canUseNativeAggregateFilter(aggregateOperand.actions[0].expression)) {
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
                var newExpression = apply.expression.substitute(function (ex, index) {
                    if (ex instanceof Facet.AggregateExpression) {
                        var key = ex.toString();
                        if (index === 0) {
                            if (hasOwnProperty(knownExpressions, key)) {
                                return new Facet.RefExpression({
                                    op: 'ref',
                                    name: knownExpressions[key]
                                });
                            }
                            else {
                                knownExpressions[key] = apply.name;
                                return null;
                            }
                        }
                        var name;
                        if (hasOwnProperty(knownExpressions, key)) {
                            name = knownExpressions[key];
                        }
                        else {
                            name = '_sd_' + nameIndex;
                            nameIndex++;
                            actions.push(new Facet.DefAction({
                                action: 'def',
                                name: name,
                                expression: ex
                            }));
                            knownExpressions[key] = name;
                        }
                        return new Facet.RefExpression({
                            op: 'ref',
                            name: name,
                            type: 'NUMBER'
                        });
                    }
                });
                if (!(newExpression instanceof Facet.RefExpression && newExpression.name === apply.name)) {
                    actions.push(new Facet.ApplyAction({
                        action: 'apply',
                        name: apply.name,
                        expression: newExpression
                    }));
                }
            });
            return actions;
        };
        DruidDataset.prototype.appliesToDruid = function (applies) {
            var _this = this;
            var aggregations = [];
            var postAggregations = [];
            this.breakUpApplies(applies).forEach(function (action) {
                if (action.expression instanceof Facet.AggregateExpression) {
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
        DruidDataset.prototype.makeHavingComparison = function (agg, op, value) {
            switch (op) {
                case '<': return { type: "lessThan", aggregation: agg, value: value };
                case '>': return { type: "greaterThan", aggregation: agg, value: value };
                case '<=': return { type: 'not', field: { type: "greaterThan", aggregation: agg, value: value } };
                case '>=': return { type: 'not', field: { type: "lessThan", aggregation: agg, value: value } };
                default: throw new Error('unknown op: ' + op);
            }
        };
        DruidDataset.prototype.inToHavingFilter = function (agg, range) {
            var fields = [];
            if (range.start !== null) {
                fields.push(this.makeHavingComparison(agg, (range.bounds[0] === '[' ? '>=' : '>'), range.start));
            }
            if (range.end !== null) {
                fields.push(this.makeHavingComparison(agg, (range.bounds[1] === ']' ? '<=' : '<'), range.end));
            }
            return fields.length === 1 ? fields[0] : { type: 'or', fields: fields };
        };
        DruidDataset.prototype.havingFilterToDruid = function (filter) {
            var _this = this;
            if (filter instanceof Facet.LiteralExpression) {
                if (filter.value === true) {
                    return null;
                }
                else {
                    throw new Error("should never get here");
                }
            }
            else if (filter instanceof Facet.IsExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
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
            else if (filter instanceof Facet.InExpression) {
                var lhs = filter.lhs;
                var rhs = filter.rhs;
                if (lhs instanceof Facet.RefExpression && rhs instanceof Facet.LiteralExpression) {
                    var rhsType = rhs.type;
                    if (rhsType === 'SET/STRING') {
                        return {
                            type: "or",
                            fields: rhs.value.getElements().map(function (value) {
                                return {
                                    type: "equalTo",
                                    aggregation: lhs.name,
                                    value: value
                                };
                            })
                        };
                    }
                    else if (rhsType === 'SET/NUMBER_RANGE') {
                        return {
                            type: "or",
                            fields: rhs.value.getElements().map(function (value) {
                                return _this.inToHavingFilter(lhs.name, value);
                            }, this)
                        };
                    }
                    else if (rhsType === 'NUMBER_RANGE') {
                        return this.inToHavingFilter(lhs.name, rhs.value);
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
            else if (filter instanceof Facet.NotExpression) {
                return {
                    type: "not",
                    field: this.havingFilterToDruid(filter.operand)
                };
            }
            else if (filter instanceof Facet.AndExpression || filter instanceof Facet.OrExpression) {
                return {
                    type: filter.op,
                    fields: filter.operands.map(this.havingFilterToDruid, this)
                };
            }
            else {
                throw new Error("could not convert filter " + filter.toString() + " to Druid filter");
            }
        };
        DruidDataset.prototype.isMinMaxTimeApply = function (apply) {
            var applyExpression = apply.expression;
            if (applyExpression instanceof Facet.AggregateExpression) {
                return this.isTimeRef(applyExpression.attribute) && (applyExpression.fn === "min" || applyExpression.fn === "max");
            }
            else {
                return false;
            }
        };
        DruidDataset.prototype.getTimeBoundaryQueryAndPostProcess = function () {
            var druidQuery = {
                queryType: "timeBoundary",
                dataSource: this.getDruidDataSource()
            };
            var applies = this.applies;
            if (applies.length === 1) {
                druidQuery.bound = applies[0].expression.fn + "Time";
            }
            return {
                query: druidQuery,
                postProcess: makePostProcessTimeBoundary(this.applies)
            };
        };
        DruidDataset.prototype.getQueryAndPostProcess = function () {
            if (this.applies && this.applies.every(this.isMinMaxTimeApply, this)) {
                return this.getTimeBoundaryQueryAndPostProcess();
            }
            var druidQuery = {
                queryType: 'timeseries',
                dataSource: this.getDruidDataSource(),
                intervals: null,
                granularity: 'all'
            };
            var filterAndIntervals = this.filterToDruid(this.filter);
            druidQuery.intervals = filterAndIntervals.intervals;
            if (filterAndIntervals.filter) {
                druidQuery.filter = filterAndIntervals.filter;
            }
            switch (this.mode) {
                case 'raw':
                    if (!this.allowSelectQueries) {
                        throw new Error("can issue make 'select' queries unless allowSelectQueries flag is set");
                    }
                    druidQuery.queryType = 'select';
                    druidQuery.dimensions = [];
                    druidQuery.metrics = [];
                    druidQuery.pagingSpec = {
                        "pagingIdentifiers": {},
                        "threshold": 10000
                    };
                    return {
                        query: druidQuery,
                        postProcess: postProcessSelect
                    };
                case 'total':
                    var aggregationsAndPostAggregations = this.appliesToDruid(this.applies);
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
                    var aggregationsAndPostAggregations = this.appliesToDruid(this.applies);
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
                            if (this.sort && (this.sort.direction !== 'ascending' || this.sort.refName() !== this.key)) {
                                throw new Error('can not sort within timeseries query');
                            }
                            if (this.limit) {
                                throw new Error('can not limit within timeseries query');
                            }
                            break;
                        case 'topN':
                            var sortAction = this.sort;
                            var metric;
                            if (sortAction) {
                                metric = sortAction.expression.name;
                                if (this.sortOrigin === 'label') {
                                    metric = { type: 'lexicographic' };
                                }
                                if (sortAction.direction === 'ascending') {
                                    metric = { type: "inverted", metric: metric };
                                }
                            }
                            else {
                                metric = { type: 'lexicographic' };
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
                                columns: [
                                    sortAction ? { dimension: sortAction.expression.name, direction: sortAction.direction } : this.key
                                ]
                            };
                            if (this.limit) {
                                druidQuery.limitSpec.limit = this.limit.limit;
                            }
                            if (!this.havingFilter.equals(Facet.Expression.TRUE)) {
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
                    dataSource: this.getDruidDataSource()
                },
                postProcess: postProcessIntrospectFactory(this.timeAttribute)
            };
        };
        DruidDataset.type = 'DATASET';
        DruidDataset.TRUE_INTERVAL = ["1000-01-01/3000-01-01"];
        DruidDataset.FALSE_INTERVAL = ["1000-01-01/1000-01-02"];
        return DruidDataset;
    })(Facet.RemoteDataset);
    Facet.DruidDataset = DruidDataset;
    Facet.Dataset.register(DruidDataset);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var mySQLDialect = new Facet.MySQLDialect();
    function correctResult(result) {
        return Array.isArray(result) && (result.length === 0 || typeof result[0] === 'object');
    }
    function postProcessFactory(split, label) {
        if (split instanceof Facet.TimeBucketExpression) {
            var duration = split.duration;
            var timezone = split.timezone;
        }
        else if (split instanceof Facet.NumberBucketExpression) {
            var size = split.size;
        }
        return function (res) {
            if (!correctResult(res)) {
                var err = new Error("unexpected result from MySQL");
                err.result = res;
                throw err;
            }
            if (duration || size) {
                res.forEach(function (d) {
                    var v = d[label];
                    if (duration) {
                        v = new Date(v);
                        d[label] = new Facet.TimeRange({ start: v, end: duration.move(v, timezone) });
                    }
                    else {
                        d[label] = new Facet.TimeRange({ start: v, end: v + size });
                    }
                    return d;
                });
            }
            return new Facet.NativeDataset({ source: 'native', data: res });
        };
    }
    function postProcessIntrospect(columns) {
        var attributes = Object.create(null);
        columns.forEach(function (column) {
            var sqlType = column.Type;
            if (sqlType === "datetime") {
                attributes[column.Field] = new Facet.AttributeInfo({ type: 'TIME' });
            }
            else if (sqlType.indexOf("varchar(") === 0) {
                attributes[column.Field] = new Facet.AttributeInfo({ type: 'STRING' });
            }
            else if (sqlType.indexOf("int(") === 0 || sqlType.indexOf("bigint(") === 0) {
                attributes[column.Field] = new Facet.AttributeInfo({ type: 'NUMBER' });
            }
            else if (sqlType.indexOf("decimal(") === 0) {
                attributes[column.Field] = new Facet.AttributeInfo({ type: 'NUMBER' });
            }
        });
        return attributes;
    }
    var MySQLDataset = (function (_super) {
        __extends(MySQLDataset, _super);
        function MySQLDataset(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureSource("mysql");
            this.table = parameters.table;
        }
        MySQLDataset.fromJS = function (datasetJS) {
            var value = Facet.RemoteDataset.jsToValue(datasetJS);
            value.table = datasetJS.table;
            return new MySQLDataset(value);
        };
        MySQLDataset.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.table = this.table;
            return value;
        };
        MySQLDataset.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.table = this.table;
            return js;
        };
        MySQLDataset.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.table === other.table;
        };
        MySQLDataset.prototype.getId = function () {
            return _super.prototype.getId.call(this) + ':' + this.table;
        };
        MySQLDataset.prototype.canHandleFilter = function (ex) {
            return true;
        };
        MySQLDataset.prototype.canHandleTotal = function () {
            return true;
        };
        MySQLDataset.prototype.canHandleSplit = function (ex) {
            return true;
        };
        MySQLDataset.prototype.canHandleApply = function (ex) {
            return true;
        };
        MySQLDataset.prototype.canHandleSort = function (sortAction) {
            return true;
        };
        MySQLDataset.prototype.canHandleLimit = function (limitAction) {
            return true;
        };
        MySQLDataset.prototype.canHandleHavingFilter = function (ex) {
            return true;
        };
        MySQLDataset.prototype.getQueryAndPostProcess = function () {
            var table = "`" + this.table + "`";
            var query = ['SELECT'];
            switch (this.mode) {
                case 'raw':
                    query.push('`' + Object.keys(this.attributes).join('`, `') + '`');
                    query.push('FROM ' + table);
                    if (!(this.filter.equals(Facet.Expression.TRUE))) {
                        query.push('WHERE ' + this.filter.getSQL(mySQLDialect));
                    }
                    break;
                case 'total':
                    query.push(this.applies.map(function (apply) { return apply.getSQL(mySQLDialect); }).join(',\n'));
                    query.push('FROM ' + table);
                    if (!(this.filter.equals(Facet.Expression.TRUE))) {
                        query.push('WHERE ' + this.filter.getSQL(mySQLDialect));
                    }
                    query.push("GROUP BY ''");
                    break;
                case 'split':
                    query.push([("" + this.split.getSQL(mySQLDialect) + " AS '" + this.key + "'")].concat(this.applies.map(function (apply) { return apply.getSQL(mySQLDialect); })).join(',\n'));
                    query.push('FROM ' + table);
                    if (!(this.filter.equals(Facet.Expression.TRUE))) {
                        query.push('WHERE ' + this.filter.getSQL(mySQLDialect));
                    }
                    query.push('GROUP BY ' + this.split.getSQL(mySQLDialect, true));
                    if (!(this.havingFilter.equals(Facet.Expression.TRUE))) {
                        query.push('HAVING ' + this.havingFilter.getSQL(mySQLDialect));
                    }
                    if (this.sort) {
                        query.push(this.sort.getSQL(mySQLDialect));
                    }
                    if (this.limit) {
                        query.push(this.limit.getSQL(mySQLDialect));
                    }
                    break;
                default:
                    throw new Error("can not get query for: " + this.mode);
            }
            return {
                query: query.join('\n'),
                postProcess: postProcessFactory(this.split, this.key)
            };
        };
        MySQLDataset.prototype.getIntrospectQueryAndPostProcess = function () {
            return {
                query: "DESCRIBE `" + this.table + "`",
                postProcess: postProcessIntrospect
            };
        };
        MySQLDataset.type = 'DATASET';
        return MySQLDataset;
    })(Facet.RemoteDataset);
    Facet.MySQLDataset = MySQLDataset;
    Facet.Dataset.register(MySQLDataset, 'mysql');
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    Facet.simulatedQueries = null;
    function getDataName(ex) {
        if (ex instanceof Facet.RefExpression) {
            return ex.name;
        }
        else if (ex instanceof Facet.ActionsExpression) {
            return getDataName(ex.operand);
        }
        else {
            return null;
        }
    }
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
    Facet.mergeRemotes = mergeRemotes;
    function $(input) {
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
                return new Facet.RefExpression(refValue);
            }
            else {
                return new Facet.LiteralExpression({ op: 'literal', value: input });
            }
        }
        else {
            return new Facet.LiteralExpression({
                op: 'literal',
                value: new Facet.NativeDataset({ source: 'native', data: [{}] })
            });
        }
    }
    Facet.$ = $;
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
            return Facet.isInstanceOf(candidate, Expression);
        };
        Expression.parse = function (str) {
            try {
                return expressionParser.parse(str);
            }
            catch (e) {
                throw new Error('Expression parse error ' + e.message + ' on `' + str + '`');
            }
        };
        Expression.parseSQL = function (str) {
            try {
                return sqlParser.parse(str);
            }
            catch (e) {
                throw new Error('SQL parse error ' + e.message + ' on `' + str + '`');
            }
        };
        Expression.fromJSLoose = function (param) {
            var expressionJS;
            switch (typeof param) {
                case 'object':
                    if (Expression.isExpression(param)) {
                        return param;
                    }
                    else if (Facet.isHigherObject(param)) {
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
                    else if (param.toISOString) {
                        expressionJS = { op: 'literal', value: new Date(param) };
                    }
                    else if (Array.isArray(param)) {
                        expressionJS = { op: 'literal', value: Facet.Set.fromJS(param) };
                    }
                    else if (hasOwnProperty(param, 'start') && hasOwnProperty(param, 'end')) {
                        expressionJS = { op: 'literal', value: Facet.Range.fromJS(param) };
                    }
                    else {
                        throw new Error('unknown parameter');
                    }
                    break;
                case 'number':
                    expressionJS = { op: 'literal', value: param };
                    break;
                case 'string':
                    if (/^[\w ]+$/.test(param)) {
                        expressionJS = { op: 'literal', value: param };
                    }
                    else {
                        return Expression.parse(param);
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
        Expression.prototype.expressionCount = function () {
            return 1;
        };
        Expression.prototype.isOp = function (op) {
            return this.op === op;
        };
        Expression.prototype.containsOp = function (op) {
            return this.some(function (ex) { return ex.isOp(op) || null; });
        };
        Expression.prototype.hasRemote = function () {
            return this.some(function (ex) {
                if (ex instanceof Facet.LiteralExpression || ex instanceof Facet.RefExpression)
                    return ex.isRemote();
                return null;
            });
        };
        Expression.prototype.getRemoteDatasetIds = function () {
            var remoteDatasetIds = [];
            var push = Array.prototype.push;
            this.forEach(function (ex) {
                if (ex.type !== 'DATASET')
                    return;
                if (ex instanceof Facet.LiteralExpression) {
                    push.apply(remoteDatasetIds, ex.value.getRemoteDatasetIds());
                }
                else if (ex instanceof Facet.RefExpression) {
                    push.apply(remoteDatasetIds, ex.remote);
                }
            });
            return deduplicateSort(remoteDatasetIds);
        };
        Expression.prototype.getRemoteDatasets = function () {
            var remoteDatasets = [];
            this.forEach(function (ex) {
                if (ex instanceof Facet.LiteralExpression && ex.type === 'DATASET') {
                    remoteDatasets.push(ex.value.getRemoteDatasets());
                }
            });
            return Facet.mergeRemoteDatasets(remoteDatasets);
        };
        Expression.prototype.getFreeReferences = function () {
            var freeReferences = [];
            this.forEach(function (ex, index, depth, genDiff) {
                if (ex instanceof Facet.RefExpression && genDiff <= ex.generations.length) {
                    freeReferences.push(repeat('^', ex.generations.length - genDiff) + ex.name);
                }
            });
            return deduplicateSort(freeReferences);
        };
        Expression.prototype.getFreeReferenceIndexes = function () {
            var freeReferenceIndexes = [];
            this.forEach(function (ex, index, depth, genDiff) {
                if (ex instanceof Facet.RefExpression && genDiff <= ex.generations.length) {
                    freeReferenceIndexes.push(index);
                }
            });
            return freeReferenceIndexes;
        };
        Expression.prototype.incrementNesting = function (by) {
            if (by === void 0) { by = 1; }
            var add = repeat('^', by);
            var freeReferenceIndexes = this.getFreeReferenceIndexes();
            if (freeReferenceIndexes.length === 0)
                return this;
            return this.substitute(function (ex, index) {
                if (ex instanceof Facet.RefExpression && freeReferenceIndexes.indexOf(index) !== -1) {
                    var value = ex.valueOf();
                    value.name = add + value.name;
                    return new Facet.RefExpression(value);
                }
                return null;
            });
        };
        Expression.prototype.mergeAnd = function (ex) {
            throw new Error('can not call on base');
        };
        Expression.prototype.mergeOr = function (ex) {
            throw new Error('can not call on base');
        };
        Expression.prototype.simplify = function () {
            return this;
        };
        Expression.prototype.every = function (iter, thisArg) {
            return this._everyHelper(iter, thisArg, { index: 0 }, 0, 0);
        };
        Expression.prototype._everyHelper = function (iter, thisArg, indexer, depth, genDiff) {
            return iter.call(thisArg, this, indexer.index, depth, genDiff) !== false;
        };
        Expression.prototype.some = function (iter, thisArg) {
            var _this = this;
            return !this.every(function (ex, index, depth, genDiff) {
                var v = iter.call(_this, ex, index, depth, genDiff);
                return (v == null) ? null : !v;
            }, thisArg);
        };
        Expression.prototype.forEach = function (iter, thisArg) {
            var _this = this;
            this.every(function (ex, index, depth, genDiff) {
                iter.call(_this, ex, index, depth, genDiff);
                return null;
            }, thisArg);
        };
        Expression.prototype.substitute = function (substitutionFn, thisArg) {
            return this._substituteHelper(substitutionFn, thisArg, { index: 0 }, 0, 0);
        };
        Expression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            return this;
        };
        Expression.prototype.getFn = function () {
            throw new Error('should never be called directly');
        };
        Expression.prototype.getJSExpression = function () {
            throw new Error('should never be called directly');
        };
        Expression.prototype.getJSFn = function () {
            return "function(d){return " + this.getJSExpression() + ";}";
        };
        Expression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            throw new Error('should never be called directly');
        };
        Expression.prototype.separateViaAnd = function (refName) {
            if (typeof refName !== 'string')
                throw new Error('must have refName');
            if (this.type !== 'BOOLEAN')
                return null;
            var myRef = this.getFreeReferences();
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
        Expression.prototype.breakdownByDataset = function (tempNamePrefix) {
            var nameIndex = 0;
            var singleDatasetActions = [];
            var remoteDatasets = this.getRemoteDatasetIds();
            if (remoteDatasets.length < 2) {
                throw new Error('not a multiple dataset expression');
            }
            var combine = this.substitute(function (ex) {
                var remoteDatasets = ex.getRemoteDatasetIds();
                if (remoteDatasets.length !== 1)
                    return null;
                var existingApply = Facet.find(singleDatasetActions, function (apply) { return apply.expression.equals(ex); });
                var tempName;
                if (existingApply) {
                    tempName = existingApply.name;
                }
                else {
                    tempName = tempNamePrefix + (nameIndex++);
                    singleDatasetActions.push(new Facet.ApplyAction({
                        action: 'apply',
                        name: tempName,
                        expression: ex
                    }));
                }
                return new Facet.RefExpression({
                    op: 'ref',
                    name: tempName
                });
            });
            return {
                combineExpression: combine,
                singleDatasetActions: singleDatasetActions
            };
        };
        Expression.prototype.performAction = function (action) {
            return new Facet.ActionsExpression({
                op: 'actions',
                operand: this,
                actions: [action]
            });
        };
        Expression.prototype.apply = function (name, ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this.performAction(new Facet.ApplyAction({ name: name, expression: ex }));
        };
        Expression.prototype.def = function (name, ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this.performAction(new Facet.DefAction({ name: name, expression: ex }));
        };
        Expression.prototype.filter = function (ex) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this.performAction(new Facet.FilterAction({ expression: ex }));
        };
        Expression.prototype.sort = function (ex, direction) {
            if (!Expression.isExpression(ex))
                ex = Expression.fromJSLoose(ex);
            return this.performAction(new Facet.SortAction({ expression: ex, direction: direction }));
        };
        Expression.prototype.limit = function (limit) {
            return this.performAction(new Facet.LimitAction({ limit: limit }));
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
            if (!Facet.Duration.isDuration(duration))
                duration = Facet.Duration.fromJS(duration);
            if (!Facet.Timezone.isTimezone(timezone))
                timezone = Facet.Timezone.fromJS(timezone);
            return this._performUnaryExpression({ op: 'timeBucket', duration: duration, timezone: timezone });
        };
        Expression.prototype.timePart = function (part, timezone) {
            if (!Facet.Timezone.isTimezone(timezone))
                timezone = Facet.Timezone.fromJS(timezone);
            return this._performUnaryExpression({ op: 'timePart', part: part, timezone: timezone });
        };
        Expression.prototype.substr = function (position, length) {
            return this._performUnaryExpression({ op: 'timePart', position: position, length: length });
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
        Expression.prototype.split = function (attribute, name, newDataName) {
            if (newDataName === void 0) { newDataName = null; }
            if (!Expression.isExpression(attribute))
                attribute = Expression.fromJSLoose(attribute);
            var dataName = getDataName(this);
            if (!dataName && !newDataName) {
                throw new Error("could not guess data name in `split`, please provide one explicitly");
            }
            var incrementedSelf = this.incrementNesting(1);
            return this.group(attribute).label(name).def(newDataName || dataName, incrementedSelf.filter(attribute.is($('^' + name))));
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
        Expression.prototype.isnt = function (ex) {
            return this.is(ex).not();
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
        Expression.prototype.contains = function (ex) {
            return this._performBinaryExpression({ op: 'contains' }, ex);
        };
        Expression.prototype.in = function (ex, snd) {
            if (snd === void 0) { snd = null; }
            if (arguments.length === 2) {
                if (typeof ex === 'number' && typeof snd === 'number') {
                    ex = new Facet.NumberRange({ start: ex, end: snd });
                }
                else {
                    throw new Error('uninterpretable IN parameters');
                }
            }
            return this._performBinaryExpression({ op: 'in' }, ex);
        };
        Expression.prototype.union = function (ex) {
            return this._performBinaryExpression({ op: 'union' }, ex);
        };
        Expression.prototype.join = function (ex) {
            return this._performBinaryExpression({ op: 'join' }, ex);
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
            var newExpression = exs.length === 1 ? exs[0] : new Facet.AddExpression({ op: 'add', operands: exs });
            return this._performNaryExpression({ op: 'add' }, [new Facet.NegateExpression({ op: 'negate', operand: newExpression })]);
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
            var newExpression = exs.length === 1 ? exs[0] : new Facet.MultiplyExpression({ op: 'add', operands: exs });
            return this._performNaryExpression({ op: 'multiply' }, [new Facet.ReciprocateExpression({ op: 'reciprocate', operand: newExpression })]);
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
        Expression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            return typeContext;
        };
        Expression.prototype.referenceCheck = function (context) {
            var datasetType = {};
            for (var k in context) {
                if (!hasOwnProperty(context, k))
                    continue;
                datasetType[k] = Facet.getFullType(context[k]);
            }
            var typeContext = {
                type: 'DATASET',
                datasetType: datasetType
            };
            var alterations = {};
            this._fillRefSubstitutions(typeContext, { index: 0 }, alterations);
            if (!Object.keys(alterations).length)
                return this;
            return this.substitute(function (ex, index) { return alterations[index] || null; });
        };
        Expression.prototype.resolve = function (context, leaveIfNotFound) {
            if (leaveIfNotFound === void 0) { leaveIfNotFound = false; }
            return this.substitute(function (ex, index, depth, genDiff) {
                if (ex instanceof Facet.RefExpression) {
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
                            return new Facet.LiteralExpression({ op: 'literal', value: foundValue });
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
                return (ex instanceof Facet.RefExpression) ? ex.generations.length === 0 : null;
            });
        };
        Expression.prototype._computeResolved = function () {
            throw new Error("can not call this directly");
        };
        Expression.prototype.simulateQueryPlan = function (context) {
            if (context === void 0) { context = {}; }
            Facet.simulatedQueries = [];
            this.referenceCheck(context).getFn()(context);
            return Facet.simulatedQueries;
        };
        Expression.prototype.computeNative = function (context) {
            if (context === void 0) { context = {}; }
            return this.referenceCheck(context).getFn()(context);
        };
        Expression.prototype.compute = function (context) {
            if (context === void 0) { context = {}; }
            if (!Facet.datumHasRemote(context) && !this.hasRemote()) {
                return Q(this.computeNative(context));
            }
            var ex = this;
            return Facet.introspectDatum(context).then(function (introspectedContext) {
                return ex.referenceCheck(introspectedContext).resolve(introspectedContext).simplify()._computeResolved();
            });
        };
        Expression.classMap = {};
        return Expression;
    })();
    Facet.Expression = Expression;
    check = Expression;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                value.operand = Facet.Expression.fromJSLoose(parameters.operand);
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
        UnaryExpression.prototype.expressionCount = function () {
            return 1 + this.operand.expressionCount();
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
            if (simpleOperand.isOp('literal') && !simpleOperand.hasRemote()) {
                return new Facet.LiteralExpression({
                    op: 'literal',
                    value: this._getFnHelper(simpleOperand.getFn())(null)
                });
            }
            var simpleValue = this.valueOf();
            simpleValue.operand = simpleOperand;
            simpleValue.simple = true;
            return new (Facet.Expression.classMap[this.op])(simpleValue);
        };
        UnaryExpression.prototype._everyHelper = function (iter, thisArg, indexer, depth, genDiff) {
            var pass = iter.call(thisArg, this, indexer.index, depth, genDiff);
            if (pass != null) {
                return pass;
            }
            else {
                indexer.index++;
            }
            return this.operand._everyHelper(iter, thisArg, indexer, depth + 1, genDiff) && this._specialEvery(iter, thisArg, indexer, depth, genDiff);
        };
        UnaryExpression.prototype._specialEvery = function (iter, thisArg, indexer, depth, genDiff) {
            return true;
        };
        UnaryExpression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            var subOperand = this.operand._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff);
            if (this.operand === subOperand)
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            delete value.simple;
            return new (Facet.Expression.classMap[this.op])(value);
        };
        UnaryExpression.prototype._getFnHelper = function (operandFn) {
            throw new Error("should never be called directly");
        };
        UnaryExpression.prototype.getFn = function () {
            return this._getFnHelper(this.operand.getFn());
        };
        UnaryExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("should never be called directly");
        };
        UnaryExpression.prototype.getJSExpression = function () {
            return this._getJSExpressionHelper(this.operand.getJSExpression());
        };
        UnaryExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            throw new Error('should never be called directly');
        };
        UnaryExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return this._getSQLHelper(this.operand.getSQL(dialect, minimal), dialect, minimal);
        };
        UnaryExpression.prototype._checkTypeOfOperand = function (wantedType) {
            if (!this.operand.canHaveType(wantedType)) {
                throw new TypeError(this.op + ' expression must have an operand of type ' + wantedType);
            }
        };
        UnaryExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var operandFullType = this.operand._fillRefSubstitutions(typeContext, indexer, alterations);
            return {
                type: this.type,
                remote: operandFullType.remote
            };
        };
        return UnaryExpression;
    })(Facet.Expression);
    Facet.UnaryExpression = UnaryExpression;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                value.lhs = Facet.Expression.fromJSLoose(parameters.lhs);
            }
            else {
                throw new TypeError("must have a lhs");
            }
            if (typeof parameters.rhs !== 'undefined' && parameters.rhs !== null) {
                value.rhs = Facet.Expression.fromJSLoose(parameters.rhs);
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
        BinaryExpression.prototype.expressionCount = function () {
            return 1 + this.lhs.expressionCount() + this.rhs.expressionCount();
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
            if (simpleLhs.isOp('literal') && simpleRhs.isOp('literal') && !simpleLhs.hasRemote() && !simpleRhs.hasRemote()) {
                return new Facet.LiteralExpression({
                    op: 'literal',
                    value: this._getFnHelper(simpleLhs.getFn(), simpleRhs.getFn())(null)
                });
            }
            var simpleValue = this.valueOf();
            simpleValue.lhs = simpleLhs;
            simpleValue.rhs = simpleRhs;
            simpleValue.simple = true;
            return new (Facet.Expression.classMap[this.op])(simpleValue);
        };
        BinaryExpression.prototype.checkLefthandedness = function () {
            return this.lhs.isOp('ref') && this.rhs.isOp('literal');
        };
        BinaryExpression.prototype._checkMatchingTypes = function () {
            var lhsType = this.lhs.type;
            var rhsType = this.rhs.type;
            if (lhsType && rhsType && lhsType !== rhsType) {
                throw new TypeError("" + this.op + " expression must have matching types, (are: " + lhsType + ", " + rhsType + ")");
            }
        };
        BinaryExpression.prototype._checkNumberOrTime = function () {
            var lhs = this.lhs;
            var rhs = this.rhs;
            if (!((lhs.canHaveType('NUMBER') && rhs.canHaveType('NUMBER')) || (lhs.canHaveType('TIME') && rhs.canHaveType('TIME')))) {
                throw new TypeError("" + this.op + " expression has a bad type combination " + (lhs.type || '?') + ", " + (rhs.type || '?'));
            }
        };
        BinaryExpression.prototype._everyHelper = function (iter, thisArg, indexer, depth, genDiff) {
            var pass = iter.call(thisArg, this, indexer.index, depth, genDiff);
            if (pass != null) {
                return pass;
            }
            else {
                indexer.index++;
            }
            return this.lhs._everyHelper(iter, thisArg, indexer, depth + 1, genDiff) && this.rhs._everyHelper(iter, thisArg, indexer, depth + 1, genDiff);
        };
        BinaryExpression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            var subLhs = this.lhs._substituteHelper(substitutionFn, thisArg, indexer, depth, genDiff);
            var subRhs = this.rhs._substituteHelper(substitutionFn, thisArg, indexer, depth, genDiff);
            if (this.lhs === subLhs && this.rhs === subRhs)
                return this;
            var value = this.valueOf();
            value.lhs = subLhs;
            value.rhs = subRhs;
            delete value.simple;
            return new (Facet.Expression.classMap[this.op])(value);
        };
        BinaryExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            throw new Error("should never be called directly");
        };
        BinaryExpression.prototype.getFn = function () {
            return this._getFnHelper(this.lhs.getFn(), this.rhs.getFn());
        };
        BinaryExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            throw new Error("should never be called directly");
        };
        BinaryExpression.prototype.getJSExpression = function () {
            return this._getJSExpressionHelper(this.lhs.getJSExpression(), this.rhs.getJSExpression());
        };
        BinaryExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            throw new Error('should never be called directly');
        };
        BinaryExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return this._getSQLHelper(this.lhs.getSQL(dialect, minimal), this.rhs.getSQL(dialect, minimal), dialect, minimal);
        };
        BinaryExpression.prototype._checkTypeOf = function (lhsRhs, wantedType) {
            var operand = this[lhsRhs];
            if (!operand.canHaveType(wantedType)) {
                throw new TypeError(this.op + ' ' + lhsRhs + ' must be of type ' + wantedType);
            }
        };
        BinaryExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var lhsFullType = this.lhs._fillRefSubstitutions(typeContext, indexer, alterations);
            var rhsFullType = this.rhs._fillRefSubstitutions(typeContext, indexer, alterations);
            return {
                type: this.type,
                remote: Facet.mergeRemotes([lhsFullType.remote, rhsFullType.remote])
            };
        };
        return BinaryExpression;
    })(Facet.Expression);
    Facet.BinaryExpression = BinaryExpression;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                value.operands = parameters.operands.map(function (operand) { return Facet.Expression.fromJSLoose(operand); });
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
        NaryExpression.prototype.expressionCount = function () {
            var expressionCount = 1;
            var operands = this.operands;
            for (var i = 0; i < operands.length; i++) {
                expressionCount += operands[i].expressionCount();
            }
            return expressionCount;
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
            var literalExpression = new Facet.LiteralExpression({
                op: 'literal',
                value: this._getFnHelper(literalOperands.map(function (operand) { return operand.getFn(); }))(null)
            });
            if (nonLiteralOperands.length) {
                if (literalOperands.length)
                    nonLiteralOperands.push(literalExpression);
                var simpleValue = this.valueOf();
                simpleValue.operands = nonLiteralOperands;
                simpleValue.simple = true;
                return new (Facet.Expression.classMap[this.op])(simpleValue);
            }
            else {
                return literalExpression;
            }
        };
        NaryExpression.prototype._everyHelper = function (iter, thisArg, indexer, depth, genDiff) {
            var pass = iter.call(thisArg, this, indexer.index, depth, genDiff);
            if (pass != null) {
                return pass;
            }
            else {
                indexer.index++;
            }
            return this.operands.every(function (operand) { return operand._everyHelper(iter, thisArg, indexer, depth + 1, genDiff); });
        };
        NaryExpression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            var subOperands = this.operands.map(function (operand) { return operand._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff); });
            if (this.operands.every(function (op, i) { return op === subOperands[i]; }))
                return this;
            var value = this.valueOf();
            value.operands = subOperands;
            delete value.simple;
            return new (Facet.Expression.classMap[this.op])(value);
        };
        NaryExpression.prototype._getFnHelper = function (operandFns) {
            throw new Error("should never be called directly");
        };
        NaryExpression.prototype.getFn = function () {
            return this._getFnHelper(this.operands.map(function (operand) { return operand.getFn(); }));
        };
        NaryExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            throw new Error("should never be called directly");
        };
        NaryExpression.prototype.getJSExpression = function () {
            return this._getJSExpressionHelper(this.operands.map(function (operand) { return operand.getJSExpression(); }));
        };
        NaryExpression.prototype._getSQLHelper = function (operandSQLs, dialect, minimal) {
            throw new Error('should never be called directly');
        };
        NaryExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return this._getSQLHelper(this.operands.map(function (operand) { return operand.getSQL(dialect, minimal); }), dialect, minimal);
        };
        NaryExpression.prototype._checkTypeOfOperands = function (wantedType) {
            var operands = this.operands;
            for (var i = 0; i < operands.length; i++) {
                if (!operands[i].canHaveType(wantedType)) {
                    throw new TypeError(this.op + ' must have an operand of type ' + wantedType + ' at position ' + i);
                }
            }
        };
        NaryExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var remotes = this.operands.map(function (operand) { return operand._fillRefSubstitutions(typeContext, indexer, alterations).remote; });
            return {
                type: this.type,
                remote: Facet.mergeRemotes(remotes)
            };
        };
        return NaryExpression;
    })(Facet.Expression);
    Facet.NaryExpression = NaryExpression;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.actions = parameters.actions.map(Facet.Action.fromJS);
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
        ActionsExpression.prototype.expressionCount = function () {
            var expressionCount = _super.prototype.expressionCount.call(this);
            var actions = this.actions;
            for (var i = 0; i < actions.length; i++) {
                expressionCount += actions[i].expressionCount();
            }
            return expressionCount;
        };
        ActionsExpression.prototype.getFn = function () {
            var ex = this;
            var operand = this.operand;
            var actions = this.actions;
            return function (d, def) {
                if (d) {
                    return ex.resolve(d).simplify().getFn()(null, def);
                }
                var dataset = operand.getFn()(null, def);
                for (var i = 0; i < actions.length; i++) {
                    var action = actions[i];
                    var actionExpression = action.expression;
                    if (action instanceof Facet.FilterAction) {
                        dataset = dataset.filter(action.expression.getFn());
                    }
                    else if (action instanceof Facet.ApplyAction) {
                        dataset = dataset.apply(action.name, actionExpression.getFn());
                    }
                    else if (action instanceof Facet.DefAction) {
                        dataset = dataset.def(action.name, actionExpression.getFn());
                    }
                    else if (action instanceof Facet.SortAction) {
                        dataset = dataset.sort(actionExpression.getFn(), action.direction);
                    }
                    else if (action instanceof Facet.LimitAction) {
                        dataset = dataset.limit(action.limit);
                    }
                }
                return dataset;
            };
        };
        ActionsExpression.prototype.getJSExpression = function () {
            throw new Error("can not call getJSExpression on actions");
        };
        ActionsExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            throw new Error("can not call getSQL on actions");
        };
        ActionsExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperand = this.operand.simplify();
            var simpleActions = this.actions.map(function (action) { return action.simplify(); });
            function isRemoteSimpleApply(action) {
                return action instanceof Facet.ApplyAction && action.expression.hasRemote() && action.expression.type !== 'DATASET';
            }
            var remoteDatasets = this.getRemoteDatasets();
            var remoteDataset;
            var digestedOperand = simpleOperand;
            if (remoteDatasets.length && (digestedOperand instanceof Facet.LiteralExpression || digestedOperand instanceof Facet.JoinExpression)) {
                remoteDataset = remoteDatasets[0];
                if (digestedOperand instanceof Facet.LiteralExpression && !digestedOperand.isRemote() && simpleActions.some(isRemoteSimpleApply)) {
                    if (remoteDatasets.length === 1) {
                        digestedOperand = new Facet.LiteralExpression({
                            op: 'literal',
                            value: remoteDataset.makeTotal()
                        });
                    }
                    else {
                        throw new Error('not done yet');
                    }
                }
                var absorbedDefs = [];
                var undigestedActions = [];
                for (var i = 0; i < simpleActions.length; i++) {
                    var action = simpleActions[i];
                    var digest = remoteDataset.digest(digestedOperand, action);
                    if (digest) {
                        digestedOperand = digest.expression;
                        if (digest.undigested)
                            undigestedActions.push(digest.undigested);
                        if (action instanceof Facet.DefAction)
                            absorbedDefs.push(action);
                    }
                    else {
                        undigestedActions.push(action);
                    }
                }
                if (simpleOperand !== digestedOperand) {
                    simpleOperand = digestedOperand;
                    var defsToAddBack = absorbedDefs.filter(function (def) {
                        return Facet.Action.actionsDependOn(undigestedActions, def.name);
                    });
                    simpleActions = defsToAddBack.concat(undigestedActions);
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
        ActionsExpression.prototype._specialEvery = function (iter, thisArg, indexer, depth, genDiff) {
            var actions = this.actions;
            var every = true;
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (every) {
                    every = action._everyHelper(iter, thisArg, indexer, depth + 1, genDiff + 1);
                }
                else {
                    indexer.index += action.expressionCount();
                }
            }
            return every;
        };
        ActionsExpression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            var subOperand = this.operand._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff);
            var subActions = this.actions.map(function (action) { return action._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff + 1); });
            if (this.operand === subOperand && arraysEqual(this.actions, subActions))
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            value.actions = subActions;
            delete value.simple;
            return new ActionsExpression(value);
        };
        ActionsExpression.prototype.performAction = function (action) {
            return new ActionsExpression({
                op: 'actions',
                operand: this.operand,
                actions: this.actions.concat(action)
            });
        };
        ActionsExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            typeContext = this.operand._fillRefSubstitutions(typeContext, indexer, alterations);
            var actions = this.actions;
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                if (action instanceof Facet.DefAction || action instanceof Facet.ApplyAction) {
                    typeContext.datasetType[action.name] = action.expression._fillRefSubstitutions(typeContext, indexer, alterations);
                }
                else if (action instanceof Facet.SortAction || action instanceof Facet.FilterAction) {
                    action.expression._fillRefSubstitutions(typeContext, indexer, alterations);
                }
            }
            return typeContext;
        };
        ActionsExpression.prototype._computeResolved = function () {
            var actions = this.actions;
            function execAction(i) {
                return function (dataset) {
                    var action = actions[i];
                    var actionExpression = action.expression;
                    if (action instanceof Facet.FilterAction) {
                        return dataset.filter(action.expression.getFn());
                    }
                    else if (action instanceof Facet.ApplyAction) {
                        if (actionExpression instanceof ActionsExpression) {
                            return dataset.applyPromise(action.name, function (d) {
                                return actionExpression.resolve(d).simplify()._computeResolved();
                            });
                        }
                        else {
                            return dataset.apply(action.name, actionExpression.getFn());
                        }
                    }
                    else if (action instanceof Facet.DefAction) {
                        if (actionExpression instanceof ActionsExpression) {
                            return dataset.def(action.name, function (d) {
                                var simple = actionExpression.resolve(d).simplify();
                                if (simple instanceof Facet.LiteralExpression) {
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
                    else if (action instanceof Facet.SortAction) {
                        return dataset.sort(actionExpression.getFn(), action.direction);
                    }
                    else if (action instanceof Facet.LimitAction) {
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
    })(Facet.UnaryExpression);
    Facet.ActionsExpression = ActionsExpression;
    Facet.Expression.register(ActionsExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var AddExpression = (function (_super) {
        __extends(AddExpression, _super);
        function AddExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("add");
            this._checkTypeOfOperands('NUMBER');
            this.type = 'NUMBER';
        }
        AddExpression.fromJS = function (parameters) {
            return new AddExpression(Facet.NaryExpression.jsToValue(parameters));
        };
        AddExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' + ') + ')';
        };
        AddExpression.prototype._getFnHelper = function (operandFns) {
            return function (d) {
                var res = 0;
                for (var i = 0; i < operandFns.length; i++) {
                    res += operandFns[i](d) || 0;
                }
                return res;
            };
        };
        AddExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            return '(' + operandJSExpressions.join('+') + ')';
        };
        AddExpression.prototype.getSQL = function (dialect, minimal) {
            var operands = this.operands;
            var withSign = operands.map(function (operand, i) {
                if (i === 0)
                    return operand.getSQL(dialect, minimal);
                if (operand instanceof Facet.NegateExpression) {
                    return '-' + operand.operand.getSQL(dialect, minimal);
                }
                else {
                    return '+' + operand.getSQL(dialect, minimal);
                }
            });
            return '(' + withSign.join('') + ')';
        };
        return AddExpression;
    })(Facet.NaryExpression);
    Facet.AddExpression = AddExpression;
    Facet.Expression.register(AddExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var fnToSQL = {
        count: 'COUNT(',
        sum: 'SUM(',
        average: 'AVG(',
        min: 'MIN(',
        max: 'MAX(',
        uniqueCount: 'COUNT(DISTINCT '
    };
    var AggregateExpression = (function (_super) {
        __extends(AggregateExpression, _super);
        function AggregateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.fn = parameters.fn;
            this._ensureOp("aggregate");
            this._checkTypeOfOperand('DATASET');
            if (this.fn === 'count') {
                if (parameters.attribute)
                    throw new Error("count aggregate can not have an 'attribute'");
                this.type = 'NUMBER';
            }
            else {
                if (!parameters.attribute)
                    throw new Error("" + this.fn + " aggregate must have an 'attribute'");
                this.attribute = parameters.attribute;
                var attrType = this.attribute.type;
                if (this.fn === 'group') {
                    this.type = attrType ? ('SET/' + attrType) : null;
                }
                else if (this.fn === 'min' || this.fn === 'max') {
                    this.type = attrType;
                }
                else {
                    this.type = 'NUMBER';
                }
            }
        }
        AggregateExpression.fromJS = function (parameters) {
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.fn = parameters.fn;
            if (parameters.attribute) {
                value.attribute = Facet.Expression.fromJSLoose(parameters.attribute);
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
        AggregateExpression.prototype.toString = function () {
            return this.operand.toString() + '.' + this.fn + '(' + (this.attribute ? this.attribute.toString() : '') + ')';
        };
        AggregateExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.fn === other.fn && Boolean(this.attribute) === Boolean(other.attribute) && (!this.attribute || this.attribute.equals(other.attribute));
        };
        AggregateExpression.prototype._getFnHelper = function (operandFn) {
            var fn = this.fn;
            var attribute = this.attribute;
            var attributeFn = attribute ? attribute.getFn() : null;
            return function (d) {
                var dataset = operandFn(d);
                if (!dataset)
                    return null;
                return dataset[fn](attributeFn, attribute);
            };
        };
        AggregateExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        AggregateExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            var operand = this.operand;
            if (operand instanceof Facet.RefExpression) {
                var attributeSQL = this.attribute ? this.attribute.getSQL(dialect, minimal) : '1';
                return fnToSQL[this.fn] + attributeSQL + ')';
            }
            throw new Error("can not getSQL with complex operand");
        };
        AggregateExpression.prototype._specialEvery = function (iter, thisArg, indexer, depth, genDiff) {
            return this.attribute ? this.attribute._everyHelper(iter, thisArg, indexer, depth + 1, genDiff + 1) : true;
        };
        AggregateExpression.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            var sub = substitutionFn.call(thisArg, this, indexer.index, depth, genDiff);
            if (sub) {
                indexer.index += this.expressionCount();
                return sub;
            }
            else {
                indexer.index++;
            }
            var subOperand = this.operand._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff);
            var subAttribute = null;
            if (this.attribute) {
                subAttribute = this.attribute._substituteHelper(substitutionFn, thisArg, indexer, depth + 1, genDiff + 1);
            }
            if (this.operand === subOperand && this.attribute === subAttribute)
                return this;
            var value = this.valueOf();
            value.operand = subOperand;
            value.attribute = subAttribute;
            delete value.simple;
            return new AggregateExpression(value);
        };
        AggregateExpression.prototype.expressionCount = function () {
            return 1 + this.operand.expressionCount() + (this.attribute ? this.attribute.expressionCount() : 0);
        };
        AggregateExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simpleOperand = this.operand.simplify();
            if (simpleOperand instanceof Facet.LiteralExpression && !simpleOperand.isRemote()) {
                return new Facet.LiteralExpression({
                    op: 'literal',
                    value: this._getFnHelper(simpleOperand.getFn())(null)
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
        AggregateExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var datasetContext = this.operand._fillRefSubstitutions(typeContext, indexer, alterations);
            var attributeType = 'NUMBER';
            if (this.attribute) {
                attributeType = this.attribute._fillRefSubstitutions(datasetContext, indexer, alterations).type;
            }
            return {
                type: this.fn === 'group' ? ('SET/' + attributeType) : this.type,
                remote: datasetContext.remote
            };
        };
        return AggregateExpression;
    })(Facet.UnaryExpression);
    Facet.AggregateExpression = AggregateExpression;
    Facet.Expression.register(AggregateExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var AndExpression = (function (_super) {
        __extends(AndExpression, _super);
        function AndExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("and");
            this._checkTypeOfOperands('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        AndExpression.fromJS = function (parameters) {
            return new AndExpression(Facet.NaryExpression.jsToValue(parameters));
        };
        AndExpression.mergeTimePart = function (andExpression) {
            var operands = andExpression.operands;
            if (operands.length !== 2)
                return null;
            var concreteExpression;
            var partExpression;
            var op0TimePart = operands[0].containsOp('timePart');
            var op1TimePart = operands[1].containsOp('timePart');
            if (op0TimePart === op1TimePart)
                return null;
            if (op0TimePart) {
                concreteExpression = operands[1];
                partExpression = operands[0];
            }
            else {
                concreteExpression = operands[0];
                partExpression = operands[1];
            }
            var lhs;
            var concreteRangeSet;
            if (concreteExpression instanceof Facet.InExpression && concreteExpression.checkLefthandedness()) {
                lhs = concreteExpression.lhs;
                concreteRangeSet = Facet.Set.convertToSet(concreteExpression.rhs.value);
            }
            else {
                return null;
            }
            if (partExpression instanceof Facet.InExpression || partExpression instanceof Facet.IsExpression) {
                var partLhs = partExpression.lhs;
                var partRhs = partExpression.rhs;
                if (partLhs instanceof Facet.TimePartExpression && partRhs instanceof Facet.LiteralExpression) {
                    return lhs.in({
                        op: 'literal',
                        value: concreteRangeSet.intersect(partLhs.materializeWithinRange(concreteRangeSet.extent(), Facet.Set.convertToSet(partRhs.value).getElements()))
                    });
                }
                else {
                    return null;
                }
            }
            else {
                return null;
            }
        };
        AndExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' and ') + ')';
        };
        AndExpression.prototype._getFnHelper = function (operandFns) {
            return function (d) {
                var res = true;
                for (var i = 0; i < operandFns.length; i++) {
                    res = res && operandFns[i](d);
                }
                return res;
            };
        };
        AndExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            return '(' + operandJSExpressions.join('&&') + ')';
        };
        AndExpression.prototype._getSQLHelper = function (operandSQLs, dialect, minimal) {
            return '(' + operandSQLs.join(' AND ') + ')';
        };
        AndExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            var mergedSimplifiedOperands = [];
            for (var i = 0; i < simplifiedOperands.length; i++) {
                var simplifiedOperand = simplifiedOperands[i];
                if (simplifiedOperand instanceof AndExpression) {
                    mergedSimplifiedOperands = mergedSimplifiedOperands.concat(simplifiedOperand.operands);
                }
                else {
                    mergedSimplifiedOperands.push(simplifiedOperand);
                }
            }
            var groupedOperands = {};
            for (var j = 0; j < mergedSimplifiedOperands.length; j++) {
                var thisOperand = mergedSimplifiedOperands[j];
                var referenceGroup = thisOperand.getFreeReferences().toString();
                if (hasOwnProperty(groupedOperands, referenceGroup)) {
                    groupedOperands[referenceGroup].push(thisOperand);
                }
                else {
                    groupedOperands[referenceGroup] = [thisOperand];
                }
            }
            var sortedReferenceGroups = Object.keys(groupedOperands).sort();
            var finalOperands = [];
            for (var k = 0; k < sortedReferenceGroups.length; k++) {
                var mergedExpressions = multiMerge(groupedOperands[sortedReferenceGroups[k]], function (a, b) {
                    return a ? a.mergeAnd(b) : null;
                });
                if (mergedExpressions.length === 1) {
                    finalOperands.push(mergedExpressions[0]);
                }
                else {
                    finalOperands.push(new AndExpression({
                        op: 'and',
                        operands: mergedExpressions
                    }));
                }
            }
            finalOperands = finalOperands.filter(function (operand) { return !(operand.isOp('literal') && operand.value === true); });
            if (finalOperands.some(function (operand) { return operand.isOp('literal') && operand.value === false; })) {
                return Facet.Expression.FALSE;
            }
            if (finalOperands.length === 0) {
                return Facet.Expression.TRUE;
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
        return AndExpression;
    })(Facet.NaryExpression);
    Facet.AndExpression = AndExpression;
    Facet.Expression.register(AndExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var ConcatExpression = (function (_super) {
        __extends(ConcatExpression, _super);
        function ConcatExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("concat");
            this._checkTypeOfOperands('STRING');
            this.type = 'STRING';
        }
        ConcatExpression.fromJS = function (parameters) {
            return new ConcatExpression(Facet.NaryExpression.jsToValue(parameters));
        };
        ConcatExpression.prototype.toString = function () {
            return this.operands.map(function (operand) { return operand.toString(); }).join(' ++ ');
        };
        ConcatExpression.prototype._getFnHelper = function (operandFns) {
            return function (d) {
                return operandFns.map(function (operandFn) { return operandFn(d); }).join('');
            };
        };
        ConcatExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            return '(' + operandJSExpressions.join('+') + ')';
        };
        ConcatExpression.prototype._getSQLHelper = function (operandSQLs, dialect, minimal) {
            return 'CONCAT(' + operandSQLs.join(',') + ')';
        };
        ConcatExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            var hasLiteralOperandsOnly = simplifiedOperands.every(function (operand) { return operand.isOp('literal'); });
            if (hasLiteralOperandsOnly) {
                return new Facet.LiteralExpression({
                    op: 'literal',
                    value: this._getFnHelper(simplifiedOperands.map(function (operand) { return operand.getFn(); }))(null)
                });
            }
            var i = 0;
            while (i < simplifiedOperands.length - 2) {
                if (simplifiedOperands[i].isOp('literal') && simplifiedOperands[i + 1].isOp('literal')) {
                    var mergedValue = simplifiedOperands[i].value + simplifiedOperands[i + 1].value;
                    simplifiedOperands.splice(i, 2, new Facet.LiteralExpression({
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
        return ConcatExpression;
    })(Facet.NaryExpression);
    Facet.ConcatExpression = ConcatExpression;
    Facet.Expression.register(ConcatExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var SubstrExpression = (function (_super) {
        __extends(SubstrExpression, _super);
        function SubstrExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.position = parameters.position;
            this.length = parameters.length;
            this._ensureOp("substr");
            this._checkTypeOfOperand('STRING');
            this.type = 'STRING';
        }
        SubstrExpression.fromJS = function (parameters) {
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.position = parameters.position;
            value.length = parameters.length;
            return new SubstrExpression(value);
        };
        SubstrExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.position = this.position;
            value.length = this.length;
            return value;
        };
        SubstrExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.position = this.position;
            js.length = this.length;
            return js;
        };
        SubstrExpression.prototype.toString = function () {
            return "" + this.operand.toString() + ".substr(" + this.position + "," + this.length + ")";
        };
        SubstrExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.position === other.position && this.length === other.length;
        };
        SubstrExpression.prototype._getFnHelper = function (operandFn) {
            var position = this.position;
            var length = this.length;
            return function (d) {
                var v = operandFn(d);
                if (v === null)
                    return null;
                return v.substr(position, length);
            };
        };
        SubstrExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        SubstrExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return "SUBSTR(" + operandSQL + "," + (this.position + 1) + "," + this.length + ")";
        };
        return SubstrExpression;
    })(Facet.UnaryExpression);
    Facet.SubstrExpression = SubstrExpression;
    Facet.Expression.register(SubstrExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var GreaterThanExpression = (function (_super) {
        __extends(GreaterThanExpression, _super);
        function GreaterThanExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("greaterThan");
            this._checkMatchingTypes();
            this._checkNumberOrTime();
            this.type = 'BOOLEAN';
        }
        GreaterThanExpression.fromJS = function (parameters) {
            return new GreaterThanExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        GreaterThanExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " > " + this.rhs.toString();
        };
        GreaterThanExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            return (new Facet.LessThanExpression({
                op: 'lessThan',
                lhs: simpleRhs,
                rhs: simpleLhs
            })).simplify();
        };
        GreaterThanExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) > rhsFn(d); };
        };
        GreaterThanExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "(" + lhsFnJS + ">" + rhsFnJS + ")";
        };
        GreaterThanExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            return "(" + lhsSQL + ">" + rhsSQL + ")";
        };
        return GreaterThanExpression;
    })(Facet.BinaryExpression);
    Facet.GreaterThanExpression = GreaterThanExpression;
    Facet.Expression.register(GreaterThanExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var GreaterThanOrEqualExpression = (function (_super) {
        __extends(GreaterThanOrEqualExpression, _super);
        function GreaterThanOrEqualExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("greaterThanOrEqual");
            this._checkMatchingTypes();
            this._checkNumberOrTime();
            this.type = 'BOOLEAN';
        }
        GreaterThanOrEqualExpression.fromJS = function (parameters) {
            return new GreaterThanOrEqualExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        GreaterThanOrEqualExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " = " + this.rhs.toString();
        };
        GreaterThanOrEqualExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            return (new Facet.LessThanOrEqualExpression({
                op: 'lessThanOrEqual',
                lhs: simpleRhs,
                rhs: simpleLhs
            })).simplify();
        };
        GreaterThanOrEqualExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) >= rhsFn(d); };
        };
        GreaterThanOrEqualExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "(" + lhsFnJS + ">=" + rhsFnJS + ")";
        };
        GreaterThanOrEqualExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            return "(" + lhsSQL + ">=" + rhsSQL + ")";
        };
        return GreaterThanOrEqualExpression;
    })(Facet.BinaryExpression);
    Facet.GreaterThanOrEqualExpression = GreaterThanOrEqualExpression;
    Facet.Expression.register(GreaterThanOrEqualExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function makeInOrIs(lhs, value) {
        var literal = new Facet.LiteralExpression({
            op: 'literal',
            value: value
        });
        var literalType = literal.type;
        var returnExpression = null;
        if (literalType === 'NUMBER_RANGE' || literalType === 'TIME_RANGE' || literalType.indexOf('SET/') === 0) {
            returnExpression = new InExpression({ op: 'in', lhs: lhs, rhs: literal });
        }
        else {
            returnExpression = new Facet.IsExpression({ op: 'is', lhs: lhs, rhs: literal });
        }
        return returnExpression.simplify();
    }
    var InExpression = (function (_super) {
        __extends(InExpression, _super);
        function InExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("in");
            var lhs = this.lhs;
            var rhs = this.rhs;
            if (!(rhs.canHaveType('SET') || (lhs.canHaveType('NUMBER') && rhs.canHaveType('NUMBER_RANGE')) || (lhs.canHaveType('TIME') && rhs.canHaveType('TIME_RANGE')))) {
                throw new TypeError("in expression has a bad type combination " + (lhs.type || '?') + " in " + (rhs.type || '?'));
            }
            this.type = 'BOOLEAN';
        }
        InExpression.fromJS = function (parameters) {
            return new InExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        InExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " in " + this.rhs.toString();
        };
        InExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            var lhsType = this.lhs.type;
            var rhsType = this.rhs.type;
            if ((lhsType === 'NUMBER' && rhsType === 'SET/NUMBER_RANGE') || (lhsType === 'TIME' && rhsType === 'SET/TIME_RANGE')) {
                return function (d) { return (rhsFn(d)).containsWithin(lhsFn(d)); };
            }
            else {
                return function (d) { return (rhsFn(d)).contains(lhsFn(d)); };
            }
        };
        InExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            var lhsType = this.lhs.type;
            var rhsType = this.rhs.type;
            if ((lhsType === 'NUMBER' && rhsType === 'SET/NUMBER_RANGE') || (lhsType === 'TIME' && rhsType === 'SET/TIME_RANGE')) {
                return "" + rhsFnJS + ".containsWithin(" + lhsFnJS + ")";
            }
            else {
                return "" + rhsFnJS + ".contains(" + lhsFnJS + ")";
            }
        };
        InExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            var rhs = this.rhs;
            var rhsType = rhs.type;
            switch (rhsType) {
                case 'NUMBER_RANGE':
                    if (rhs instanceof Facet.LiteralExpression) {
                        var numberRange = rhs.value;
                        return dialect.inExpression(lhsSQL, Facet.numberToSQL(numberRange.start), Facet.numberToSQL(numberRange.end), numberRange.bounds);
                    }
                    throw new Error('not implemented yet');
                case 'TIME_RANGE':
                    if (rhs instanceof Facet.LiteralExpression) {
                        var timeRange = rhs.value;
                        return dialect.inExpression(lhsSQL, Facet.timeToSQL(timeRange.start), Facet.timeToSQL(timeRange.end), timeRange.bounds);
                    }
                    throw new Error('not implemented yet');
                case 'SET/STRING':
                    return "" + lhsSQL + " IN " + rhsSQL;
                default:
                    throw new Error('not implemented yet');
            }
        };
        InExpression.prototype.mergeAnd = function (ex) {
            if (ex.isOp('literal'))
                return ex.mergeAnd(this);
            if (!this.checkLefthandedness())
                return null;
            if (!arraysEqual(this.getFreeReferences(), ex.getFreeReferences()))
                return null;
            if (ex instanceof Facet.IsExpression || ex instanceof InExpression) {
                if (!ex.checkLefthandedness())
                    return null;
                var intersect = Facet.Set.generalIntersect(this.rhs.value, ex.rhs.value);
                if (intersect === null)
                    return null;
                return makeInOrIs(this.lhs, intersect);
            }
            return null;
        };
        InExpression.prototype.mergeOr = function (ex) {
            if (ex.isOp('literal'))
                return ex.mergeOr(this);
            if (!this.checkLefthandedness())
                return null;
            if (!arraysEqual(this.getFreeReferences(), ex.getFreeReferences()))
                return null;
            if (ex instanceof Facet.IsExpression || ex instanceof InExpression) {
                if (!ex.checkLefthandedness())
                    return null;
                var intersect = Facet.Set.generalUnion(this.rhs.value, ex.rhs.value);
                if (intersect === null)
                    return null;
                return makeInOrIs(this.lhs, intersect);
            }
            return null;
        };
        InExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs instanceof Facet.RefExpression && simpleRhs instanceof Facet.LiteralExpression && simpleRhs.type.indexOf('SET/') === 0 && simpleRhs.value.empty())
                return Facet.Expression.FALSE;
            return null;
        };
        return InExpression;
    })(Facet.BinaryExpression);
    Facet.InExpression = InExpression;
    Facet.Expression.register(InExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var ContainsExpression = (function (_super) {
        __extends(ContainsExpression, _super);
        function ContainsExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("contains");
            var lhs = this.lhs;
            var rhs = this.rhs;
            if (!(lhs.canHaveType('STRING') && rhs.canHaveType('STRING'))) {
                throw new TypeError("contains expression has a bad type combination " + (lhs.type || '?') + " contains " + (rhs.type || '?'));
            }
            this.type = 'BOOLEAN';
        }
        ContainsExpression.fromJS = function (parameters) {
            return new ContainsExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        ContainsExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " contains " + this.rhs.toString();
        };
        ContainsExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return String(lhsFn(d)).indexOf(lhsFn(d)) > -1; };
        };
        ContainsExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "String(" + lhsFnJS + ").indexOf(" + rhsFnJS + ") > -1";
        };
        ContainsExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            var rhs = this.rhs;
            if (rhs instanceof Facet.LiteralExpression) {
                return "" + lhsSQL + " LIKE \"%" + rhs.value + "%\"";
            }
            else {
                throw new Error("can not express " + rhs.toString() + " in SQL");
            }
        };
        return ContainsExpression;
    })(Facet.BinaryExpression);
    Facet.ContainsExpression = ContainsExpression;
    Facet.Expression.register(ContainsExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var IsExpression = (function (_super) {
        __extends(IsExpression, _super);
        function IsExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("is");
            this._checkMatchingTypes();
            this.type = 'BOOLEAN';
        }
        IsExpression.fromJS = function (parameters) {
            return new IsExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        IsExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " = " + this.rhs.toString();
        };
        IsExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) === rhsFn(d); };
        };
        IsExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "(" + lhsFnJS + "===" + rhsFnJS + ")";
        };
        IsExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            return "(" + lhsSQL + "=" + rhsSQL + ")";
        };
        IsExpression.prototype.mergeAnd = function (ex) {
            if (ex.isOp('literal'))
                return ex.mergeAnd(this);
            var references = this.getFreeReferences();
            if (!arraysEqual(references, ex.getFreeReferences()))
                return null;
            if (this.type !== ex.type)
                return null;
            if (ex instanceof IsExpression) {
                if (references.length === 2)
                    return this;
                if (!(this.lhs instanceof Facet.RefExpression && ex.lhs instanceof Facet.RefExpression))
                    return null;
                if (this.rhs.value.valueOf && ex.rhs.value.valueOf && ex.rhs.value.valueOf() === this.rhs.value.valueOf())
                    return this;
                if (this.rhs.value === ex.rhs.value)
                    return this;
                return Facet.Expression.FALSE;
            }
            else if (ex instanceof Facet.InExpression) {
                return ex.mergeAnd(this);
            }
            else {
                return null;
            }
        };
        IsExpression.prototype.mergeOr = function (ex) {
            if (ex.isOp('literal'))
                return ex.mergeOr(this);
            var references = this.getFreeReferences();
            if (!arraysEqual(references, ex.getFreeReferences()))
                return null;
            if (this.type !== ex.type)
                return null;
            if (ex instanceof IsExpression) {
                if (references.length === 2)
                    return this;
                if (!(this.lhs instanceof Facet.RefExpression && ex.lhs instanceof Facet.RefExpression))
                    return null;
                var thisValue = this.rhs.value;
                var expValue = (ex.rhs).value;
                if (thisValue.valueOf && expValue.valueOf && expValue.valueOf() === thisValue.valueOf())
                    return this;
                if (thisValue === expValue)
                    return this;
                return new Facet.InExpression({
                    op: 'in',
                    lhs: this.lhs,
                    rhs: new Facet.LiteralExpression({
                        op: 'literal',
                        value: Facet.Set.fromJS([thisValue, expValue])
                    })
                });
            }
            else if (ex instanceof Facet.InExpression) {
                return ex.mergeOr(this);
            }
            else {
                return null;
            }
        };
        IsExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs.equals(simpleRhs))
                return Facet.Expression.TRUE;
            if (simpleLhs instanceof Facet.TimeBucketExpression && simpleRhs instanceof Facet.LiteralExpression) {
                var duration = simpleLhs.duration;
                var value = simpleRhs.value;
                var start = value.start;
                var end = value.end;
                if (duration.isSimple()) {
                    if (duration.floor(start, simpleLhs.timezone).valueOf() === start.valueOf() && duration.move(start, simpleLhs.timezone, 1).valueOf() === end.valueOf()) {
                        return new Facet.InExpression({
                            op: 'in',
                            lhs: simpleLhs.operand,
                            rhs: simpleRhs
                        });
                    }
                    else {
                        return Facet.Expression.FALSE;
                    }
                }
            }
            return null;
        };
        return IsExpression;
    })(Facet.BinaryExpression);
    Facet.IsExpression = IsExpression;
    Facet.Expression.register(IsExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            var value = Facet.UnaryExpression.jsToValue(parameters);
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
        LabelExpression.prototype._getFnHelper = function (operandFn) {
            var name = this.name;
            return function (d) {
                var mySet = operandFn(d);
                if (!mySet)
                    return null;
                return mySet.label(name);
            };
        };
        LabelExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw "" + operandFnJS + ".label(" + this.name + ")";
        };
        LabelExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return "" + operandSQL + " AS \"" + this.name + "\"";
        };
        LabelExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name;
        };
        LabelExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof Facet.AggregateExpression && simpleOperand.fn === 'group') {
                var remoteDatasetLiteral = simpleOperand.operand;
                if (remoteDatasetLiteral instanceof Facet.LiteralExpression && remoteDatasetLiteral.isRemote()) {
                    var remoteDataset = remoteDatasetLiteral.value;
                    var newRemoteDataset = remoteDataset.addSplit(simpleOperand.attribute, this.name);
                    if (!newRemoteDataset)
                        return null;
                    return new Facet.LiteralExpression({
                        op: 'literal',
                        value: newRemoteDataset
                    });
                }
            }
            if (simpleOperand instanceof Facet.UnionExpression) {
                var unionLhs = simpleOperand.lhs;
                var unionRhs = simpleOperand.rhs;
                if (unionLhs instanceof Facet.AggregateExpression && unionRhs instanceof Facet.AggregateExpression && (unionLhs.hasRemote() || unionRhs.hasRemote())) {
                    return new Facet.JoinExpression({
                        op: 'join',
                        lhs: new LabelExpression({
                            op: 'label',
                            name: this.name,
                            operand: unionLhs
                        }),
                        rhs: new LabelExpression({
                            op: 'label',
                            name: this.name,
                            operand: unionRhs
                        })
                    }).simplify();
                }
            }
            return null;
        };
        LabelExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var setFullType = this.operand._fillRefSubstitutions(typeContext, indexer, alterations);
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
    })(Facet.UnaryExpression);
    Facet.LabelExpression = LabelExpression;
    Facet.Expression.register(LabelExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var LessThanExpression = (function (_super) {
        __extends(LessThanExpression, _super);
        function LessThanExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("lessThan");
            this._checkMatchingTypes();
            this._checkNumberOrTime();
            this.type = 'BOOLEAN';
        }
        LessThanExpression.fromJS = function (parameters) {
            return new LessThanExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        LessThanExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " < " + this.rhs.toString();
        };
        LessThanExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) < rhsFn(d); };
        };
        LessThanExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "(" + lhsFnJS + "<" + rhsFnJS + ")";
        };
        LessThanExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            return "(" + lhsSQL + "<" + rhsSQL + ")";
        };
        LessThanExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs instanceof Facet.LiteralExpression) {
                return (new Facet.InExpression({
                    op: 'in',
                    lhs: simpleRhs,
                    rhs: Facet.$(Facet.Range.fromJS({ start: simpleLhs.value, end: null, bounds: '()' }))
                })).simplify();
            }
            if (simpleRhs instanceof Facet.LiteralExpression) {
                return (new Facet.InExpression({
                    op: 'in',
                    lhs: simpleLhs,
                    rhs: Facet.$(Facet.Range.fromJS({ start: null, end: simpleRhs.value, bounds: '()' }))
                })).simplify();
            }
            return null;
        };
        return LessThanExpression;
    })(Facet.BinaryExpression);
    Facet.LessThanExpression = LessThanExpression;
    Facet.Expression.register(LessThanExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var LessThanOrEqualExpression = (function (_super) {
        __extends(LessThanOrEqualExpression, _super);
        function LessThanOrEqualExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("lessThanOrEqual");
            this._checkMatchingTypes();
            this._checkNumberOrTime();
            this.type = 'BOOLEAN';
        }
        LessThanOrEqualExpression.fromJS = function (parameters) {
            return new LessThanOrEqualExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        LessThanOrEqualExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + " <= " + this.rhs.toString();
        };
        LessThanOrEqualExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d) <= rhsFn(d); };
        };
        LessThanOrEqualExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "(" + lhsFnJS + "<=" + rhsFnJS + ")";
        };
        LessThanOrEqualExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            return "(" + lhsSQL + "<=" + rhsSQL + ")";
        };
        LessThanOrEqualExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs instanceof Facet.LiteralExpression) {
                return (new Facet.InExpression({
                    op: 'in',
                    lhs: simpleRhs,
                    rhs: Facet.$(Facet.Range.fromJS({ start: simpleLhs.value, end: null, bounds: '[)' }))
                })).simplify();
            }
            if (simpleRhs instanceof Facet.LiteralExpression) {
                return (new Facet.InExpression({
                    op: 'in',
                    lhs: simpleLhs,
                    rhs: Facet.$(Facet.Range.fromJS({ start: null, end: simpleRhs.value, bounds: '(]' }))
                })).simplify();
            }
            return null;
        };
        return LessThanOrEqualExpression;
    })(Facet.BinaryExpression);
    Facet.LessThanOrEqualExpression = LessThanOrEqualExpression;
    Facet.Expression.register(LessThanOrEqualExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            this.type = Facet.getValueType(value);
            this.simple = true;
        }
        LiteralExpression.fromJS = function (parameters) {
            var value = {
                op: parameters.op,
                type: parameters.type
            };
            var v = parameters.value;
            if (Facet.isHigherObject(v)) {
                value.value = v;
            }
            else {
                value.value = Facet.valueFromJS(v, parameters.type);
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
            if (value instanceof Facet.Dataset && value.basis()) {
                return '$()';
            }
            else if (this.type === 'STRING') {
                return JSON.stringify(value);
            }
            else {
                return String(value);
            }
        };
        LiteralExpression.prototype.getFn = function () {
            var value = this.value;
            if (value instanceof Facet.RemoteDataset) {
                var hasSimulated = false;
                var simulatedValue;
                return function (d, def) {
                    if (def)
                        return value;
                    if (!hasSimulated) {
                        Facet.simulatedQueries.push(value.getQueryAndPostProcess().query);
                        simulatedValue = value.simulate();
                        hasSimulated = true;
                    }
                    return simulatedValue;
                };
            }
            else {
                return function () { return value; };
            }
        };
        LiteralExpression.prototype.getJSExpression = function () {
            return JSON.stringify(this.value);
        };
        LiteralExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            var value = this.value;
            switch (this.type) {
                case 'STRING':
                    return JSON.stringify(value);
                case 'BOOLEAN':
                    return String(value).toUpperCase();
                case 'NUMBER':
                    return String(value);
                case 'NUMBER_RANGE':
                    return String(value.start) + '/' + String(value.end);
                case 'TIME':
                    return Facet.timeToSQL(value);
                case 'TIME_RANGE':
                    return Facet.timeToSQL(value.start) + '/' + Facet.timeToSQL(value.end);
                case 'SET/STRING':
                    return '(' + value.getElements().map(function (v) { return JSON.stringify(v); }).join(',') + ')';
                default:
                    throw new Error("currently unsupported type: " + this.type);
            }
        };
        LiteralExpression.prototype.equals = function (other) {
            if (!_super.prototype.equals.call(this, other) || this.type !== other.type)
                return false;
            if (this.value) {
                if (this.value.equals) {
                    return this.value.equals(other.value);
                }
                else if (this.value.toISOString && other.value.toISOString) {
                    return this.value.valueOf() === other.value.valueOf();
                }
                else {
                    return this.value === other.value;
                }
            }
            else {
                return this.value === other.value;
            }
        };
        LiteralExpression.prototype.isRemote = function () {
            return this.value instanceof Facet.Dataset && this.value.source !== 'native';
        };
        LiteralExpression.prototype.mergeAnd = function (ex) {
            if (this.value === false) {
                return this;
            }
            else if (this.value === true) {
                return ex;
            }
            else {
                return null;
            }
        };
        LiteralExpression.prototype.mergeOr = function (ex) {
            if (this.value === true) {
                return this;
            }
            else if (this.value === false) {
                return ex;
            }
            else {
                return null;
            }
        };
        LiteralExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            if (this.type == 'DATASET') {
                var newTypeContext = this.value.getFullType();
                newTypeContext.parent = typeContext;
                return newTypeContext;
            }
            else {
                return { type: this.type };
            }
        };
        LiteralExpression.prototype._computeResolved = function () {
            var value = this.value;
            if (value instanceof Facet.RemoteDataset) {
                return value.queryValues();
            }
            else {
                return Q(this.value);
            }
        };
        return LiteralExpression;
    })(Facet.Expression);
    Facet.LiteralExpression = LiteralExpression;
    Facet.Expression.FALSE = new LiteralExpression({ op: 'literal', value: false });
    Facet.Expression.TRUE = new LiteralExpression({ op: 'literal', value: true });
    Facet.Expression.register(LiteralExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            var value = Facet.UnaryExpression.jsToValue(parameters);
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
        MatchExpression.prototype._getFnHelper = function (operandFn) {
            var re = new RegExp(this.regexp);
            return function (d) { return re.test(operandFn(d)); };
        };
        MatchExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            return "/" + this.regexp + "/.test(" + operandFnJS + ")";
        };
        MatchExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return "" + operandSQL + " REGEXP '" + this.regexp + "'";
        };
        return MatchExpression;
    })(Facet.UnaryExpression);
    Facet.MatchExpression = MatchExpression;
    Facet.Expression.register(MatchExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var MultiplyExpression = (function (_super) {
        __extends(MultiplyExpression, _super);
        function MultiplyExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("multiply");
            this._checkTypeOfOperands('NUMBER');
            this.type = 'NUMBER';
        }
        MultiplyExpression.fromJS = function (parameters) {
            return new MultiplyExpression(Facet.NaryExpression.jsToValue(parameters));
        };
        MultiplyExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' * ') + ')';
        };
        MultiplyExpression.prototype._getFnHelper = function (operandFns) {
            return function (d) {
                var res = 1;
                for (var i = 0; i < operandFns.length; i++) {
                    res *= operandFns[i](d) || 0;
                }
                return res;
            };
        };
        MultiplyExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            return '(' + operandJSExpressions.join('*') + ')';
        };
        MultiplyExpression.prototype.getSQL = function (dialect, minimal) {
            var operands = this.operands;
            var withSign = operands.map(function (operand, i) {
                if (i === 0)
                    return operand.getSQL(dialect, minimal);
                if (operand instanceof Facet.ReciprocateExpression) {
                    return '/' + operand.operand.getSQL(dialect, minimal);
                }
                else {
                    return '*' + operand.getSQL(dialect, minimal);
                }
            });
            return '(' + withSign.join('') + ')';
        };
        return MultiplyExpression;
    })(Facet.NaryExpression);
    Facet.MultiplyExpression = MultiplyExpression;
    Facet.Expression.register(MultiplyExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var NegateExpression = (function (_super) {
        __extends(NegateExpression, _super);
        function NegateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("negate");
            this.type = 'NUMBER';
        }
        NegateExpression.fromJS = function (parameters) {
            return new NegateExpression(Facet.UnaryExpression.jsToValue(parameters));
        };
        NegateExpression.prototype.toString = function () {
            return this.operand.toString() + '.negate()';
        };
        NegateExpression.prototype._getFnHelper = function (operandFn) {
            return function (d) { return -operandFn(d); };
        };
        NegateExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            return "-(" + operandFnJS + ")";
        };
        NegateExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return "-(" + operandSQL + ")";
        };
        NegateExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof NegateExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return NegateExpression;
    })(Facet.UnaryExpression);
    Facet.NegateExpression = NegateExpression;
    Facet.Expression.register(NegateExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var NotExpression = (function (_super) {
        __extends(NotExpression, _super);
        function NotExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("not");
            this._checkTypeOfOperand('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        NotExpression.fromJS = function (parameters) {
            return new NotExpression(Facet.UnaryExpression.jsToValue(parameters));
        };
        NotExpression.prototype.toString = function () {
            return this.operand.toString() + '.not()';
        };
        NotExpression.prototype._getFnHelper = function (operandFn) {
            return function (d) { return !operandFn(d); };
        };
        NotExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            return "!(" + operandFnJS + ")";
        };
        NotExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return 'NOT(' + operandSQL + ')';
        };
        NotExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof NotExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return NotExpression;
    })(Facet.UnaryExpression);
    Facet.NotExpression = NotExpression;
    Facet.Expression.register(NotExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.size = parameters.size;
            value.offset = parameters.offset;
            return new NumberBucketExpression(value);
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
        NumberBucketExpression.prototype.toString = function () {
            return this.operand.toString() + '.numberBucket(' + this.size + (this.offset ? (', ' + this.offset) : '') + ')';
        };
        NumberBucketExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.size === other.size && this.offset === other.offset;
        };
        NumberBucketExpression.prototype._getFnHelper = function (operandFn) {
            var size = this.size;
            var offset = this.offset;
            return function (d) {
                var num = operandFn(d);
                if (num === null)
                    return null;
                return Facet.NumberRange.numberBucket(num, size, offset);
            };
        };
        NumberBucketExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        NumberBucketExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return Facet.continuousFloorExpression(operandSQL, "FLOOR", this.size, this.offset);
        };
        return NumberBucketExpression;
    })(Facet.UnaryExpression);
    Facet.NumberBucketExpression = NumberBucketExpression;
    Facet.Expression.register(NumberBucketExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var OrExpression = (function (_super) {
        __extends(OrExpression, _super);
        function OrExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("or");
            this._checkTypeOfOperands('BOOLEAN');
            this.type = 'BOOLEAN';
        }
        OrExpression.fromJS = function (parameters) {
            return new OrExpression(Facet.NaryExpression.jsToValue(parameters));
        };
        OrExpression.prototype.toString = function () {
            return '(' + this.operands.map(function (operand) { return operand.toString(); }).join(' or ') + ')';
        };
        OrExpression.prototype._getFnHelper = function (operandFns) {
            return function (d) {
                var res = false;
                for (var i = 0; i < operandFns.length; i++) {
                    res = res || operandFns[i](d);
                }
                return res;
            };
        };
        OrExpression.prototype._getJSExpressionHelper = function (operandJSExpressions) {
            return '(' + operandJSExpressions.join('||') + ')';
        };
        OrExpression.prototype._getSQLHelper = function (operandSQLs, dialect, minimal) {
            return '(' + operandSQLs.join(' OR ') + ')';
        };
        OrExpression.prototype.simplify = function () {
            if (this.simple)
                return this;
            var simplifiedOperands = this.operands.map(function (operand) { return operand.simplify(); });
            var mergedSimplifiedOperands = [];
            for (var i = 0; i < simplifiedOperands.length; i++) {
                if (simplifiedOperands[i].isOp('or')) {
                    mergedSimplifiedOperands = mergedSimplifiedOperands.concat(simplifiedOperands[i].operands);
                }
                else {
                    mergedSimplifiedOperands.push(simplifiedOperands[i]);
                }
            }
            var groupedOperands = {};
            for (var j = 0; j < mergedSimplifiedOperands.length; j++) {
                var thisOperand = mergedSimplifiedOperands[j];
                var referenceGroup = thisOperand.getFreeReferences().toString();
                if (groupedOperands[referenceGroup]) {
                    groupedOperands[referenceGroup].push(thisOperand);
                }
                else {
                    groupedOperands[referenceGroup] = [thisOperand];
                }
            }
            var sortedReferenceGroups = Object.keys(groupedOperands).sort();
            var finalOperands = [];
            for (var k = 0; k < sortedReferenceGroups.length; k++) {
                var mergedExpressions = multiMerge(groupedOperands[sortedReferenceGroups[k]], function (a, b) {
                    return a ? a.mergeOr(b) : null;
                });
                if (mergedExpressions.length === 1) {
                    finalOperands.push(mergedExpressions[0]);
                }
                else {
                    finalOperands.push(new OrExpression({
                        op: 'or',
                        operands: mergedExpressions
                    }));
                }
            }
            finalOperands = finalOperands.filter(function (operand) { return !(operand.isOp('literal') && operand.value === false); });
            if (finalOperands.some(function (operand) { return operand.isOp('literal') && operand.value === true; })) {
                return Facet.Expression.TRUE;
            }
            if (finalOperands.length === 0) {
                return Facet.Expression.FALSE;
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
        return OrExpression;
    })(Facet.NaryExpression);
    Facet.OrExpression = OrExpression;
    Facet.Expression.register(OrExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var ReciprocateExpression = (function (_super) {
        __extends(ReciprocateExpression, _super);
        function ReciprocateExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("reciprocate");
            this.type = 'NUMBER';
        }
        ReciprocateExpression.fromJS = function (parameters) {
            return new ReciprocateExpression(Facet.UnaryExpression.jsToValue(parameters));
        };
        ReciprocateExpression.prototype.toString = function () {
            return this.operand.toString() + '.reciprocate()';
        };
        ReciprocateExpression.prototype._getFnHelper = function (operandFn) {
            return function (d) { return 1 / operandFn(d); };
        };
        ReciprocateExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            return "(1/" + operandFnJS + ")";
        };
        ReciprocateExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return "(1/" + operandSQL + ")";
        };
        ReciprocateExpression.prototype._specialSimplify = function (simpleOperand) {
            if (simpleOperand instanceof ReciprocateExpression) {
                return simpleOperand.operand;
            }
            return null;
        };
        return ReciprocateExpression;
    })(Facet.UnaryExpression);
    Facet.ReciprocateExpression = ReciprocateExpression;
    Facet.Expression.register(ReciprocateExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    Facet.possibleTypes = {
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
                if (!hasOwnProperty(Facet.possibleTypes, parameters.type)) {
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
        RefExpression.prototype.getJSExpression = function () {
            if (this.generations.length)
                throw new Error("can not call getJSExpression on unresolved expression");
            return 'd.' + this.name;
        };
        RefExpression.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            if (this.generations.length)
                throw new Error("can not call getSQL on unresolved expression");
            return '`' + this.name + '`';
        };
        RefExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name && this.generations === other.generations;
        };
        RefExpression.prototype.isRemote = function () {
            return Boolean(this.remote && this.remote.length);
        };
        RefExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            var myIndex = indexer.index;
            indexer.index++;
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
                alterations[myIndex] = new RefExpression({
                    op: 'ref',
                    name: newGenerations + this.name,
                    type: myType,
                    remote: myRemote
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
    })(Facet.Expression);
    Facet.RefExpression = RefExpression;
    Facet.Expression.register(RefExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var timeBucketing = {
        "PT1S": "%Y-%m-%dT%H:%i:%SZ",
        "PT1M": "%Y-%m-%dT%H:%i:00Z",
        "PT1H": "%Y-%m-%dT%H:00:00Z",
        "P1D": "%Y-%m-%dT00:00:00Z",
        "P1W": "%Y-%m-%dT00:00:00Z",
        "P1M": "%Y-%m-00T00:00:00Z",
        "P1Y": "%Y-00-00T00:00:00Z"
    };
    var TimeBucketExpression = (function (_super) {
        __extends(TimeBucketExpression, _super);
        function TimeBucketExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.duration = parameters.duration;
            this.timezone = parameters.timezone;
            this._ensureOp("timeBucket");
            if (!Facet.Duration.isDuration(this.duration)) {
                throw new Error("`duration` must be a Duration");
            }
            if (!Facet.Timezone.isTimezone(this.timezone)) {
                throw new Error("`timezone` must be a Timezone");
            }
            this.type = 'TIME_RANGE';
        }
        TimeBucketExpression.fromJS = function (parameters) {
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.duration = Facet.Duration.fromJS(parameters.duration);
            value.timezone = Facet.Timezone.fromJS(parameters.timezone);
            return new TimeBucketExpression(value);
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
        TimeBucketExpression.prototype.toString = function () {
            return "" + this.operand.toString() + ".timeBucket(" + this.duration.toString() + ", " + this.timezone.toString() + ")";
        };
        TimeBucketExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.duration.equals(other.duration) && this.timezone.equals(other.timezone);
        };
        TimeBucketExpression.prototype._getFnHelper = function (operandFn) {
            var duration = this.duration;
            var timezone = this.timezone;
            return function (d) { return Facet.TimeRange.timeBucket(operandFn(d), duration, timezone); };
        };
        TimeBucketExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        TimeBucketExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            var bucketFormat = timeBucketing[this.duration.toString()];
            if (!bucketFormat)
                throw new Error("unsupported duration '" + this.duration + "'");
            var bucketTimezone = this.timezone.toString();
            var expression = operandSQL;
            if (bucketTimezone !== "Etc/UTC") {
                expression = "CONVERT_TZ(" + expression + ", '+0:00', '" + bucketTimezone + "')";
            }
            return "DATE_FORMAT(" + expression + ", '" + bucketFormat + "')";
        };
        return TimeBucketExpression;
    })(Facet.UnaryExpression);
    Facet.TimeBucketExpression = TimeBucketExpression;
    Facet.Expression.register(TimeBucketExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var TimeOffsetExpression = (function (_super) {
        __extends(TimeOffsetExpression, _super);
        function TimeOffsetExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.duration = parameters.duration;
            this.timezone = parameters.timezone;
            this._ensureOp("timeOffset");
            this._checkTypeOfOperand('TIME');
            if (!Facet.Duration.isDuration(this.duration)) {
                throw new Error("`duration` must be a Duration");
            }
            this.type = 'TIME';
        }
        TimeOffsetExpression.fromJS = function (parameters) {
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.duration = Facet.Duration.fromJS(parameters.duration);
            value.timezone = Facet.Timezone.fromJS(parameters.timezone);
            return new TimeOffsetExpression(value);
        };
        TimeOffsetExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.duration = this.duration;
            value.timezone = this.timezone;
            return value;
        };
        TimeOffsetExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.duration = this.duration.toJS();
            js.timezone = this.timezone.toJS();
            return js;
        };
        TimeOffsetExpression.prototype.toString = function () {
            return "" + this.operand.toString() + ".timeOffset(" + this.duration.toString() + ", " + this.timezone.toString() + ")";
        };
        TimeOffsetExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.duration.equals(other.duration) && this.timezone.equals(other.timezone);
        };
        TimeOffsetExpression.prototype._getFnHelper = function (operandFn) {
            var duration = this.duration;
            var timezone = this.timezone;
            return function (d) {
                var date = operandFn(d);
                if (date === null)
                    return null;
                return duration.move(date, timezone, 1);
            };
        };
        TimeOffsetExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        TimeOffsetExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            return dialect.offsetTimeExpression(operandSQL, this.duration);
        };
        return TimeOffsetExpression;
    })(Facet.UnaryExpression);
    Facet.TimeOffsetExpression = TimeOffsetExpression;
    Facet.Expression.register(TimeOffsetExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var TimePartExpression = (function (_super) {
        __extends(TimePartExpression, _super);
        function TimePartExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this.part = parameters.part;
            this.timezone = parameters.timezone;
            this._ensureOp("timePart");
            this._checkTypeOfOperand('TIME');
            if (typeof this.part !== 'string') {
                throw new Error("`part` must be a string");
            }
            this.type = 'NUMBER';
        }
        TimePartExpression.fromJS = function (parameters) {
            var value = Facet.UnaryExpression.jsToValue(parameters);
            value.part = parameters.part;
            value.timezone = Facet.Timezone.fromJS(parameters.timezone);
            return new TimePartExpression(value);
        };
        TimePartExpression.prototype.valueOf = function () {
            var value = _super.prototype.valueOf.call(this);
            value.part = this.part;
            value.timezone = this.timezone;
            return value;
        };
        TimePartExpression.prototype.toJS = function () {
            var js = _super.prototype.toJS.call(this);
            js.part = this.part;
            js.timezone = this.timezone.toJS();
            return js;
        };
        TimePartExpression.prototype.toString = function () {
            return "" + this.operand.toString() + ".timePart(" + this.part.toString() + ", " + this.timezone.toString() + ")";
        };
        TimePartExpression.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.part === other.part && this.timezone.equals(other.timezone);
        };
        TimePartExpression.prototype._getFnHelper = function (operandFn) {
            var part = this.part;
            var timezone = this.timezone;
            return function (d) {
            };
        };
        TimePartExpression.prototype._getJSExpressionHelper = function (operandFnJS) {
            throw new Error("implement me");
        };
        TimePartExpression.prototype._getSQLHelper = function (operandSQL, dialect, minimal) {
            throw new Error("Vad, srsly make this work");
        };
        TimePartExpression.prototype.materializeWithinRange = function (extentRange, values) {
            var partUnits = this.part.toLowerCase().split('_of_');
            var unitSmall = partUnits[0];
            var unitBig = partUnits[1];
            var timezone = this.timezone;
            var smallTimeMover = Chronology[unitSmall];
            var bigTimeMover = Chronology[unitBig];
            var start = extentRange.start;
            var end = extentRange.end;
            var ranges = [];
            var iter = bigTimeMover.floor(start, timezone);
            while (iter <= end) {
                for (var i = 0; i < values.length; i++) {
                    var subIter = smallTimeMover.move(iter, timezone, values[i]);
                    ranges.push(new Facet.TimeRange({
                        start: subIter,
                        end: smallTimeMover.move(subIter, timezone, 1)
                    }));
                }
                iter = bigTimeMover.move(iter, timezone, 1);
            }
            return Facet.Set.fromJS({
                setType: 'TIME_RANGE',
                elements: ranges
            });
        };
        return TimePartExpression;
    })(Facet.UnaryExpression);
    Facet.TimePartExpression = TimePartExpression;
    Facet.Expression.register(TimePartExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    function emptyLiteralSet(ex) {
        if (ex instanceof Facet.LiteralExpression) {
            return ex.value.empty();
        }
        else {
            return false;
        }
    }
    var UnionExpression = (function (_super) {
        __extends(UnionExpression, _super);
        function UnionExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("union");
            var rhs = this.rhs;
            var lhs = this.lhs;
            if (!rhs.canHaveType('SET'))
                throw new TypeError('rhs must be a SET');
            if (!lhs.canHaveType('SET'))
                throw new TypeError('lhs must be a SET');
            var lhsType = lhs.type;
            var rhsType = rhs.type;
            if (String(lhsType).indexOf('/') > 0 && String(rhsType).indexOf('/') > 0 && lhsType !== rhsType) {
                throw new TypeError("UNION expression must have matching set types, (are: " + lhsType + ", " + rhsType + ")");
            }
            this.type = String(lhsType).indexOf('/') > 0 ? lhsType : rhsType;
        }
        UnionExpression.fromJS = function (parameters) {
            return new UnionExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        UnionExpression.prototype.toString = function () {
            return "(" + this.lhs.toString() + " U " + this.rhs.toString() + ")";
        };
        UnionExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d).union(rhsFn(d)); };
        };
        UnionExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "" + lhsFnJS + ".union(" + rhsFnJS + ")";
        };
        UnionExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            throw new Error('not possible');
        };
        UnionExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs.equals(simpleRhs))
                return simpleLhs;
            if (emptyLiteralSet(simpleLhs))
                return simpleRhs;
            if (emptyLiteralSet(simpleRhs))
                return simpleLhs;
            return null;
        };
        UnionExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var lhsFullType = this.lhs._fillRefSubstitutions(typeContext, indexer, alterations);
            var rhsFullType = this.rhs._fillRefSubstitutions(typeContext, indexer, alterations);
            return {
                type: String(lhsFullType.type).indexOf('/') > 0 ? lhsFullType.type : rhsFullType.type,
                remote: Facet.mergeRemotes([lhsFullType.remote, rhsFullType.remote])
            };
        };
        return UnionExpression;
    })(Facet.BinaryExpression);
    Facet.UnionExpression = UnionExpression;
    Facet.Expression.register(UnionExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var JoinExpression = (function (_super) {
        __extends(JoinExpression, _super);
        function JoinExpression(parameters) {
            _super.call(this, parameters, dummyObject);
            this._ensureOp("join");
            var rhs = this.rhs;
            var lhs = this.lhs;
            if (!rhs.canHaveType('DATASET'))
                throw new TypeError('rhs must be a DATASET');
            if (!lhs.canHaveType('DATASET'))
                throw new TypeError('lhs must be a DATASET');
            this.type = 'DATASET';
        }
        JoinExpression.fromJS = function (parameters) {
            return new JoinExpression(Facet.BinaryExpression.jsToValue(parameters));
        };
        JoinExpression.prototype.toString = function () {
            return "" + this.lhs.toString() + ".join(" + this.rhs.toString() + ")";
        };
        JoinExpression.prototype._getFnHelper = function (lhsFn, rhsFn) {
            return function (d) { return lhsFn(d).join(rhsFn(d)); };
        };
        JoinExpression.prototype._getJSExpressionHelper = function (lhsFnJS, rhsFnJS) {
            return "" + lhsFnJS + ".join(" + rhsFnJS + ")";
        };
        JoinExpression.prototype._getSQLHelper = function (lhsSQL, rhsSQL, dialect, minimal) {
            throw new Error('not possible');
        };
        JoinExpression.prototype._specialSimplify = function (simpleLhs, simpleRhs) {
            if (simpleLhs.equals(simpleRhs))
                return simpleLhs;
            return null;
        };
        JoinExpression.prototype._fillRefSubstitutions = function (typeContext, indexer, alterations) {
            indexer.index++;
            var lhsFullType = this.lhs._fillRefSubstitutions(typeContext, indexer, alterations);
            var rhsFullType = this.rhs._fillRefSubstitutions(typeContext, indexer, alterations);
            var lhsDatasetType = lhsFullType.datasetType;
            var rhsDatasetType = rhsFullType.datasetType;
            var myDatasetType = Object.create(null);
            for (var k in lhsDatasetType) {
                myDatasetType[k] = lhsDatasetType[k];
            }
            for (var k in rhsDatasetType) {
                var ft = rhsDatasetType[k];
                if (hasOwnProperty(myDatasetType, k)) {
                    if (myDatasetType[k].type !== ft.type) {
                        throw new Error("incompatible types of joins on " + k + " between " + myDatasetType[k].type + " and " + ft.type);
                    }
                }
                else {
                    myDatasetType[k] = ft;
                }
            }
            return {
                parent: lhsFullType.parent,
                type: 'DATASET',
                datasetType: myDatasetType,
                remote: Facet.mergeRemotes([lhsFullType.remote, rhsFullType.remote])
            };
        };
        return JoinExpression;
    })(Facet.BinaryExpression);
    Facet.JoinExpression = JoinExpression;
    Facet.Expression.register(JoinExpression);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
        Action.actionsDependOn = function (actions, name) {
            for (var i = 0; i < actions.length; i++) {
                var action = actions[i];
                var freeReferences = action.getFreeReferences();
                if (freeReferences.indexOf(name) !== -1)
                    return true;
                if (action.name === name)
                    return false;
            }
            return false;
        };
        Action.isAction = function (candidate) {
            return Facet.isInstanceOf(candidate, Action);
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
            var orders = [Facet.FilterAction, Facet.SortAction, Facet.LimitAction, Facet.DefAction, Facet.ApplyAction];
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
            var aReferences = a.expression.getFreeReferences();
            var bReferences = b.expression.getFreeReferences();
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
        Action.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            throw new Error('can not call this directly');
        };
        Action.prototype.expressionCount = function () {
            return this.expression ? this.expression.expressionCount() : 0;
        };
        Action.prototype.simplify = function () {
            if (!this.expression)
                return this;
            var value = this.valueOf();
            value.expression = this.expression.simplify();
            return new (Action.classMap[this.action])(value);
        };
        Action.prototype.getFreeReferences = function () {
            return this.expression ? this.expression.getFreeReferences() : [];
        };
        Action.prototype._everyHelper = function (iter, thisArg, indexer, depth, genDiff) {
            return this.expression ? this.expression._everyHelper(iter, thisArg, indexer, depth, genDiff) : true;
        };
        Action.prototype._substituteHelper = function (substitutionFn, thisArg, indexer, depth, genDiff) {
            if (!this.expression)
                return this;
            var subExpression = this.expression._substituteHelper(substitutionFn, thisArg, indexer, depth, genDiff);
            if (this.expression === subExpression)
                return this;
            var value = this.valueOf();
            value.expression = subExpression;
            return new (Action.classMap[this.action])(value);
        };
        Action.classMap = {};
        return Action;
    })();
    Facet.Action = Action;
    checkAction = Action;
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                expression: Facet.Expression.fromJS(parameters.expression)
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
            return ".apply(" + this.name + ", " + this.expression.toString() + ")";
        };
        ApplyAction.prototype.equals = function (other) {
            return _super.prototype.equals.call(this, other) && this.name === other.name;
        };
        ApplyAction.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return "" + this.expression.getSQL(dialect, minimal) + " AS '" + this.name + "'";
        };
        return ApplyAction;
    })(Facet.Action);
    Facet.ApplyAction = ApplyAction;
    Facet.Action.register(ApplyAction);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                expression: Facet.Expression.fromJS(parameters.expression)
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
        DefAction.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return "" + this.expression.toString() + " AS \"" + this.name + "\"";
        };
        return DefAction;
    })(Facet.Action);
    Facet.DefAction = DefAction;
    Facet.Action.register(DefAction);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                expression: Facet.Expression.fromJS(parameters.expression)
            });
        };
        FilterAction.prototype.toString = function () {
            return '.filter(' + this.expression.toString() + ')';
        };
        FilterAction.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return "WHERE " + this.expression.toString();
        };
        return FilterAction;
    })(Facet.Action);
    Facet.FilterAction = FilterAction;
    Facet.Action.register(FilterAction);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
        LimitAction.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            return "LIMIT " + this.limit;
        };
        return LimitAction;
    })(Facet.Action);
    Facet.LimitAction = LimitAction;
    Facet.Action.register(LimitAction);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
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
                expression: Facet.Expression.fromJS(parameters.expression),
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
        SortAction.prototype.getSQL = function (dialect, minimal) {
            if (minimal === void 0) { minimal = false; }
            var dir = this.direction === 'descending' ? 'DESC' : 'ASC';
            return "ORDER BY " + this.expression.getSQL(dialect, minimal) + " " + dir;
        };
        SortAction.prototype.refName = function () {
            var expression = this.expression;
            return (expression instanceof Facet.RefExpression) ? expression.name : null;
        };
        return SortAction;
    })(Facet.Action);
    Facet.SortAction = SortAction;
    Facet.Action.register(SortAction);
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var Helper;
    (function (Helper) {
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
        Helper.simpleLocator = simpleLocator;
    })(Helper = Facet.Helper || (Facet.Helper = {}));
})(Facet || (Facet = {}));
var Facet;
(function (Facet) {
    var Helper;
    (function (Helper) {
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
        Helper.retryRequester = retryRequester;
    })(Helper = Facet.Helper || (Facet.Helper = {}));
})(Facet || (Facet = {}));
expressionParser = require("../parser/expression")(Facet);
sqlParser = require("../parser/sql")(Facet);
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Facet;
    module.exports.helper = Facet.Helper;
    module.exports.Chronology = Chronology;
}

},{"../parser/expression":8,"../parser/sql":9,"chronology":3,"higher-object":6,"q":7}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
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

},{"../lib/date-math":4,"../lib/walltime":5,"higher-object":6}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
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


},{}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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
},{"_process":2}],8:[function(require,module,exports){
module.exports = function(facet) {
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
        peg$c3 = function(head, tail) { return naryExpressionFactory('or', head, tail); },
        peg$c4 = function(head, tail) { return naryExpressionFactory('and', head, tail); },
        peg$c5 = function(ex) { return ex.not(); },
        peg$c6 = null,
        peg$c7 = function(lhs, rest) {
              if (!rest) return lhs;
              return lhs[rest[1]](rest[3]);
            },
        peg$c8 = "=",
        peg$c9 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c10 = function() { return 'is'; },
        peg$c11 = "!=",
        peg$c12 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c13 = function() { return 'isnt'; },
        peg$c14 = "in",
        peg$c15 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c16 = function() { return 'in'; },
        peg$c17 = "<=",
        peg$c18 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c19 = function() { return 'lessThanOrEqual'; },
        peg$c20 = ">=",
        peg$c21 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c22 = function() { return 'greaterThanOrEqual'; },
        peg$c23 = "<",
        peg$c24 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c25 = function() { return 'lessThan'; },
        peg$c26 = ">",
        peg$c27 = { type: "literal", value: ">", description: "\">\"" },
        peg$c28 = function() { return 'greaterThan'; },
        peg$c29 = function(head, tail) { return naryExpressionWithAltFactory('add', head, tail, '-', 'negate'); },
        peg$c30 = /^[+\-]/,
        peg$c31 = { type: "class", value: "[+\\-]", description: "[+\\-]" },
        peg$c32 = function(head, tail) { return naryExpressionWithAltFactory('multiply', head, tail, '/', 'reciprocate'); },
        peg$c33 = /^[*\/]/,
        peg$c34 = { type: "class", value: "[*\\/]", description: "[*\\/]" },
        peg$c35 = ".",
        peg$c36 = { type: "literal", value: ".", description: "\".\"" },
        peg$c37 = "(",
        peg$c38 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c39 = ")",
        peg$c40 = { type: "literal", value: ")", description: "\")\"" },
        peg$c41 = function(lhs, tail) {
              if (!tail.length) return lhs;
              var operand = lhs;
              for (var i = 0, n = tail.length; i < n; i++) {
                var part = tail[i];
                var op = part[3];
                if (!possibleCalls[op]) error('no such call: ' + op);
                var params = part[6] || [];
                operand = operand[op].apply(operand, params);
              }
              return operand;
            },
        peg$c42 = ",",
        peg$c43 = { type: "literal", value: ",", description: "\",\"" },
        peg$c44 = function(head, tail) { return [head].concat(tail.map(function(t) { return t[3] })); },
        peg$c45 = "$()",
        peg$c46 = { type: "literal", value: "$()", description: "\"$()\"" },
        peg$c47 = function() { return $(); },
        peg$c48 = "$",
        peg$c49 = { type: "literal", value: "$", description: "\"$\"" },
        peg$c50 = ":",
        peg$c51 = { type: "literal", value: ":", description: "\":\"" },
        peg$c52 = function(name, type) { return $(name + ':' + type); },
        peg$c53 = function(name) { return $(name); },
        peg$c54 = function(value) { return Expression.fromJS({ op: "literal", value: value }); },
        peg$c55 = { type: "other", description: "String" },
        peg$c56 = "'",
        peg$c57 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c58 = function(chars) { return chars; },
        peg$c59 = function(chars) { error("Unmatched single quote"); },
        peg$c60 = "\"",
        peg$c61 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c62 = function(chars) { error("Unmatched double quote"); },
        peg$c63 = "null",
        peg$c64 = { type: "literal", value: "null", description: "\"null\"" },
        peg$c65 = void 0,
        peg$c66 = function() { return null; },
        peg$c67 = "true",
        peg$c68 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c69 = function() { return true; },
        peg$c70 = "false",
        peg$c71 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c72 = function() { return false; },
        peg$c73 = "not",
        peg$c74 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c75 = "and",
        peg$c76 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c77 = "or",
        peg$c78 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c79 = /^[A-Za-z_]/,
        peg$c80 = { type: "class", value: "[A-Za-z_]", description: "[A-Za-z_]" },
        peg$c81 = { type: "other", description: "Number" },
        peg$c82 = function(n) { return parseFloat(n); },
        peg$c83 = "-",
        peg$c84 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c85 = /^[1-9]/,
        peg$c86 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c87 = "e",
        peg$c88 = { type: "literal", value: "e", description: "\"e\"" },
        peg$c89 = /^[0-9]/,
        peg$c90 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c91 = { type: "other", description: "CallFn" },
        peg$c92 = /^[a-zA-Z]/,
        peg$c93 = { type: "class", value: "[a-zA-Z]", description: "[a-zA-Z]" },
        peg$c94 = { type: "other", description: "Name" },
        peg$c95 = /^[a-z0-9A-Z_]/,
        peg$c96 = { type: "class", value: "[a-z0-9A-Z_]", description: "[a-z0-9A-Z_]" },
        peg$c97 = { type: "other", description: "RefName" },
        peg$c98 = "^",
        peg$c99 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c100 = { type: "other", description: "TypeName" },
        peg$c101 = /^[A-Z_\/]/,
        peg$c102 = { type: "class", value: "[A-Z_\\/]", description: "[A-Z_\\/]" },
        peg$c103 = { type: "other", description: "NotSQuote" },
        peg$c104 = /^[^']/,
        peg$c105 = { type: "class", value: "[^']", description: "[^']" },
        peg$c106 = { type: "other", description: "NotDQuote" },
        peg$c107 = /^[^"]/,
        peg$c108 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c109 = { type: "other", description: "Whitespace" },
        peg$c110 = /^[ \t\r\n]/,
        peg$c111 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },

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
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseOrExpression();
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

    function peg$parseOrExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseAndExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseOrToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseAndExpression();
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
            s5 = peg$parseOrToken();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseAndExpression();
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
          s1 = peg$c3(s1, s2);
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

    function peg$parseAndExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseNotExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseAndToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseNotExpression();
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
            s5 = peg$parseAndToken();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseNotExpression();
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
          s1 = peg$c4(s1, s2);
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

    function peg$parseNotExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseNotToken();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseComparisonExpression();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c5(s3);
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
        s0 = peg$parseComparisonExpression();
      }

      return s0;
    }

    function peg$parseComparisonExpression() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseAdditiveExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse_();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseComparisonOp();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseAdditiveExpression();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
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
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c6;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c7(s1, s2);
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

    function peg$parseComparisonOp() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s1 = peg$c8;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c9); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c10();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c11) {
          s1 = peg$c11;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c12); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c13();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c14) {
            s1 = peg$c14;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c15); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c16();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c17) {
              s1 = peg$c17;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c18); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c19();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c20) {
                s1 = peg$c20;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c21); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c22();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 60) {
                  s1 = peg$c23;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c24); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c25();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 62) {
                    s1 = peg$c26;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c27); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c28();
                  }
                  s0 = s1;
                }
              }
            }
          }
        }
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
          s5 = peg$parseAdditiveOp();
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
            s5 = peg$parseAdditiveOp();
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
          s1 = peg$c29(s1, s2);
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

    function peg$parseAdditiveOp() {
      var s0;

      if (peg$c30.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c31); }
      }

      return s0;
    }

    function peg$parseMultiplicativeExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseCallChainExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseMultiplicativeOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseCallChainExpression();
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
            s5 = peg$parseMultiplicativeOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseCallChainExpression();
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
          s1 = peg$c32(s1, s2);
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

    function peg$parseMultiplicativeOp() {
      var s0;

      if (peg$c33.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c34); }
      }

      return s0;
    }

    function peg$parseCallChainExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      s0 = peg$currPos;
      s1 = peg$parseBasicExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 46) {
            s5 = peg$c35;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c36); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseCallFn();
              if (s7 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 40) {
                  s8 = peg$c37;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s8 !== peg$FAILED) {
                  s9 = peg$parse_();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parseParams();
                    if (s10 === peg$FAILED) {
                      s10 = peg$c6;
                    }
                    if (s10 !== peg$FAILED) {
                      s11 = peg$parse_();
                      if (s11 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 41) {
                          s12 = peg$c39;
                          peg$currPos++;
                        } else {
                          s12 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c40); }
                        }
                        if (s12 !== peg$FAILED) {
                          s4 = [s4, s5, s6, s7, s8, s9, s10, s11, s12];
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
        } else {
          peg$currPos = s3;
          s3 = peg$c0;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s5 = peg$c35;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c36); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseCallFn();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 40) {
                    s8 = peg$c37;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c38); }
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parse_();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseParams();
                      if (s10 === peg$FAILED) {
                        s10 = peg$c6;
                      }
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parse_();
                        if (s11 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 41) {
                            s12 = peg$c39;
                            peg$currPos++;
                          } else {
                            s12 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c40); }
                          }
                          if (s12 !== peg$FAILED) {
                            s4 = [s4, s5, s6, s7, s8, s9, s10, s11, s12];
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
          } else {
            peg$currPos = s3;
            s3 = peg$c0;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c41(s1, s2);
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

    function peg$parseParams() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseParam();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c42;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c43); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseParam();
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
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c42;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c43); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseParam();
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
          s1 = peg$c44(s1, s2);
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

    function peg$parseParam() {
      var s0;

      s0 = peg$parseNumber();
      if (s0 === peg$FAILED) {
        s0 = peg$parseName();
        if (s0 === peg$FAILED) {
          s0 = peg$parseString();
          if (s0 === peg$FAILED) {
            s0 = peg$parseOrExpression();
          }
        }
      }

      return s0;
    }

    function peg$parseBasicExpression() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c37;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseOrExpression();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c39;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c40); }
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
        s0 = peg$parseLiteralExpression();
        if (s0 === peg$FAILED) {
          s0 = peg$parseRefExpression();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 3) === peg$c45) {
              s1 = peg$c45;
              peg$currPos += 3;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c46); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c47();
            }
            s0 = s1;
          }
        }
      }

      return s0;
    }

    function peg$parseRefExpression() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 36) {
        s1 = peg$c48;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c49); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRefName();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c50;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c51); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseTypeName();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c52(s2, s4);
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
          s1 = peg$c48;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c49); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseRefName();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c53(s2);
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

    function peg$parseLiteralExpression() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseNumber();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c54(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseString();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c54(s1);
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseString() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c56;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c57); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNotSQuote();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c56;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c57); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c58(s2);
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
          s1 = peg$c56;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c57); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseNotSQuote();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c59(s2);
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
            s1 = peg$c60;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c61); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseNotDQuote();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 34) {
                s3 = peg$c60;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c61); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c58(s2);
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
              s1 = peg$c60;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c61); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseNotDQuote();
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c62(s2);
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
        if (peg$silentFails === 0) { peg$fail(peg$c55); }
      }

      return s0;
    }

    function peg$parseNullToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c63) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c64); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c66();
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

    function peg$parseTrueToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c67) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c68); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c69();
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

    function peg$parseFalseToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c70) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c71); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c72();
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

    function peg$parseNotToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c73) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c74); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseAndToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c75) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c76); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseOrToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c77) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c78); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c65;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseIdentifierPart() {
      var s0;

      if (peg$c79.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c80); }
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
        s4 = peg$parseFraction();
        if (s4 === peg$FAILED) {
          s4 = peg$c6;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExp();
          if (s5 === peg$FAILED) {
            s5 = peg$c6;
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
        s1 = peg$c82(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c81); }
      }

      return s0;
    }

    function peg$parseInt() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s2 = peg$c83;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c84); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$c6;
      }
      if (s2 !== peg$FAILED) {
        if (peg$c85.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c86); }
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
          s2 = peg$c83;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c84); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c6;
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

    function peg$parseFraction() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c35;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c36); }
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
      if (input.substr(peg$currPos, 1).toLowerCase() === peg$c87) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c88); }
      }
      if (s2 !== peg$FAILED) {
        if (peg$c30.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c31); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$c6;
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

      if (peg$c89.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c90); }
      }

      return s0;
    }

    function peg$parseCallFn() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c92.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c93); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c92.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c93); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c91); }
      }

      return s0;
    }

    function peg$parseName() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c95.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c96); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c95.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c96); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c94); }
      }

      return s0;
    }

    function peg$parseRefName() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = [];
      if (input.charCodeAt(peg$currPos) === 94) {
        s3 = peg$c98;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c99); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (input.charCodeAt(peg$currPos) === 94) {
          s3 = peg$c98;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c99); }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseName();
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
        if (peg$silentFails === 0) { peg$fail(peg$c97); }
      }

      return s0;
    }

    function peg$parseTypeName() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c101.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c102); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c101.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c102); }
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
        if (peg$silentFails === 0) { peg$fail(peg$c100); }
      }

      return s0;
    }

    function peg$parseNotSQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c104.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c105); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c104.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c105); }
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c103); }
      }

      return s0;
    }

    function peg$parseNotDQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c107.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c108); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c107.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c108); }
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c106); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c110.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c111); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c110.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c111); }
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }

      return s0;
    }

    // starts with function(facet)
    var $ = facet.$;
    var Expression = facet.Expression;

    var possibleCalls = {
      'is': 1,
      'in': 1,
      'lessThanOrEqual': 1,
      'greaterThanOrEqual': 1,
      'lessThan': 1,
      'greaterThan': 1,
      'add': 1,
      'multiply': 1,
      'subtract': 1,
      'divide': 1,
      'not': 1,
      'negate': 1,
      'reciprocate': 1,
      'match': 1,
      'numberBucket': 1,
      'timeBucket': 1,
      'substr': 1,
      'timePart': 1,
      'filter': 1,
      'def': 1,
      'apply': 1,
      'sort': 1,
      'limit': 1,
      'count': 1,
      'sum': 1,
      'max': 1,
      'min': 1,
      'average': 1,
      'uniqueCount': 1,
      'group': 1,
      'label': 1,
      'split': 1
    };

    function naryExpressionFactory(op, head, tail) {
      if (!tail.length) return head;
      return head[op].apply(head, tail.map(function(t) { return t[3]; }));
    }

    function naryExpressionWithAltFactory(op, head, tail, altToken, altOp) {
      if (!tail.length) return head;
      return head[op].apply(head, tail.map(function(t) { return t[1] === altToken ? t[3][altOp]() : t[3]; }))
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
};

},{}],9:[function(require,module,exports){
module.exports = function(facet) {
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
        peg$c1 = function(query) { return query; },
        peg$c2 = null,
        peg$c3 = function(columns, from, where, groupBy, having, orderBy, limit) { return handleQuery(columns, from, where, groupBy, having, orderBy, limit); },
        peg$c4 = function(columns, where, groupBy, having, orderBy, limit) { return handleQuery(columns, null, where, groupBy, having, orderBy, limit); },
        peg$c5 = [],
        peg$c6 = ",",
        peg$c7 = { type: "literal", value: ",", description: "\",\"" },
        peg$c8 = function(head, tail) { return [head].concat(tail.map(function(t) { return t[3] })); },
        peg$c9 = function(ex, as) {
              return new ApplyAction({
                action: 'apply',
                name: as || text().replace(/^\W+|\W+$/g, '').replace(/\W+/g, '_'),
                expression: ex
              });
            },
        peg$c10 = function(name) { return name; },
        peg$c11 = function(table) { return table; },
        peg$c12 = function(filter) { return filter; },
        peg$c13 = function(groupBy) { return groupBy; },
        peg$c14 = function(having) { return new FilterAction({ action: 'filter', expression: having }); },
        peg$c15 = function(orderBy, direction) { return new SortAction({ action: 'sort', expression: orderBy, direction: direction || 'ascending' }); },
        peg$c16 = function(dir) { return dir; },
        peg$c17 = function(limit) { return new LimitAction({ action: 'limit', limit: limit }); },
        peg$c18 = function(head, tail) { return naryExpressionFactory('or', head, tail); },
        peg$c19 = function(head, tail) { return naryExpressionFactory('and', head, tail); },
        peg$c20 = function(ex) { return ex.not(); },
        peg$c21 = function(lhs, start, end) {
              if (start.op !== 'literal') error('between start must be a literal');
              if (end.op !== 'literal') error('between end must be a literal');
              return lhs.in({ start: start.value, end: end.value, bounds: '[]' });
            },
        peg$c22 = function(lhs, rest) {
              if (!rest) return lhs;
              return lhs[rest[1]](rest[3]);
            },
        peg$c23 = "=",
        peg$c24 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c25 = function() { return 'is'; },
        peg$c26 = "<>",
        peg$c27 = { type: "literal", value: "<>", description: "\"<>\"" },
        peg$c28 = function() { return 'isnt'; },
        peg$c29 = "!=",
        peg$c30 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c31 = "in",
        peg$c32 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c33 = function() { return 'in'; },
        peg$c34 = "<=",
        peg$c35 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c36 = function() { return 'lessThanOrEqual'; },
        peg$c37 = ">=",
        peg$c38 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c39 = function() { return 'greaterThanOrEqual'; },
        peg$c40 = "<",
        peg$c41 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c42 = function() { return 'lessThan'; },
        peg$c43 = ">",
        peg$c44 = { type: "literal", value: ">", description: "\">\"" },
        peg$c45 = function() { return 'greaterThan'; },
        peg$c46 = function(head, tail) { return naryExpressionWithAltFactory('add', head, tail, '-', 'negate'); },
        peg$c47 = /^[+\-]/,
        peg$c48 = { type: "class", value: "[+\\-]", description: "[+\\-]" },
        peg$c49 = function(head, tail) { return naryExpressionWithAltFactory('multiply', head, tail, '/', 'reciprocate'); },
        peg$c50 = /^[*\/]/,
        peg$c51 = { type: "class", value: "[*\\/]", description: "[*\\/]" },
        peg$c52 = "(",
        peg$c53 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c54 = ")",
        peg$c55 = { type: "literal", value: ")", description: "\")\"" },
        peg$c56 = function(ex) { return ex; },
        peg$c57 = function(subQuery) { return subQuery; },
        peg$c58 = "()",
        peg$c59 = { type: "literal", value: "()", description: "\"()\"" },
        peg$c60 = function() { return dataRef.count(); },
        peg$c61 = function(fn, ex) { return dataRef[fn](ex); },
        peg$c62 = function(operand, duration, timezone) { return operand.timeBucket(duration, timezone); },
        peg$c63 = function(operand, size, offset) { return operand.numberBucket(size, offset); },
        peg$c64 = function(operand, part, timezone) { return operand.timePart(part, timezone); },
        peg$c65 = function(operand, position, length) { return operand.substr(position, length); },
        peg$c66 = function(ref) { return $(ref); },
        peg$c67 = function(name) { return reserved(name); },
        peg$c68 = void 0,
        peg$c69 = function(name) { return name },
        peg$c70 = "`",
        peg$c71 = { type: "literal", value: "`", description: "\"`\"" },
        peg$c72 = function(number) { return Expression.fromJS({ op: "literal", value: number }); },
        peg$c73 = function(string) {
              if (dateRegExp.test(string)) {
                var date = new Date(string);
                if (!isNaN(date)) {
                  return Expression.fromJS({ op: "literal", value: date });
                } else {
                  return Expression.fromJS({ op: "literal", value: string });
                }
              } else {
                return Expression.fromJS({ op: "literal", value: string });
              }
            },
        peg$c74 = function(v) { return Expression.fromJS({ op: "literal", value: v }); },
        peg$c75 = { type: "other", description: "String" },
        peg$c76 = "'",
        peg$c77 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c78 = function(chars) { return chars; },
        peg$c79 = function(chars) { error("Unmatched single quote"); },
        peg$c80 = "\"",
        peg$c81 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c82 = function(chars) { error("Unmatched double quote"); },
        peg$c83 = "null",
        peg$c84 = { type: "literal", value: "NULL", description: "\"NULL\"" },
        peg$c85 = function() { return null; },
        peg$c86 = "true",
        peg$c87 = { type: "literal", value: "TRUE", description: "\"TRUE\"" },
        peg$c88 = function() { return true; },
        peg$c89 = "false",
        peg$c90 = { type: "literal", value: "FALSE", description: "\"FALSE\"" },
        peg$c91 = function() { return false; },
        peg$c92 = "select",
        peg$c93 = { type: "literal", value: "SELECT", description: "\"SELECT\"" },
        peg$c94 = "from",
        peg$c95 = { type: "literal", value: "FROM", description: "\"FROM\"" },
        peg$c96 = "as",
        peg$c97 = { type: "literal", value: "AS", description: "\"AS\"" },
        peg$c98 = "on",
        peg$c99 = { type: "literal", value: "ON", description: "\"ON\"" },
        peg$c100 = "left",
        peg$c101 = { type: "literal", value: "LEFT", description: "\"LEFT\"" },
        peg$c102 = "inner",
        peg$c103 = { type: "literal", value: "INNER", description: "\"INNER\"" },
        peg$c104 = "join",
        peg$c105 = { type: "literal", value: "JOIN", description: "\"JOIN\"" },
        peg$c106 = "union",
        peg$c107 = { type: "literal", value: "UNION", description: "\"UNION\"" },
        peg$c108 = "where",
        peg$c109 = { type: "literal", value: "WHERE", description: "\"WHERE\"" },
        peg$c110 = "group",
        peg$c111 = { type: "literal", value: "GROUP", description: "\"GROUP\"" },
        peg$c112 = "by",
        peg$c113 = { type: "literal", value: "BY", description: "\"BY\"" },
        peg$c114 = "order",
        peg$c115 = { type: "literal", value: "ORDER", description: "\"ORDER\"" },
        peg$c116 = "having",
        peg$c117 = { type: "literal", value: "HAVING", description: "\"HAVING\"" },
        peg$c118 = "limit",
        peg$c119 = { type: "literal", value: "LIMIT", description: "\"LIMIT\"" },
        peg$c120 = "asc",
        peg$c121 = { type: "literal", value: "ASC", description: "\"ASC\"" },
        peg$c122 = function() { return 'ascending';  },
        peg$c123 = "desc",
        peg$c124 = { type: "literal", value: "DESC", description: "\"DESC\"" },
        peg$c125 = function() { return 'descending'; },
        peg$c126 = "between",
        peg$c127 = { type: "literal", value: "BETWEEN", description: "\"BETWEEN\"" },
        peg$c128 = { type: "literal", value: "IN", description: "\"IN\"" },
        peg$c129 = "is",
        peg$c130 = { type: "literal", value: "IS", description: "\"IS\"" },
        peg$c131 = "like",
        peg$c132 = { type: "literal", value: "LIKE", description: "\"LIKE\"" },
        peg$c133 = "contains",
        peg$c134 = { type: "literal", value: "CONTAINS", description: "\"CONTAINS\"" },
        peg$c135 = "not",
        peg$c136 = { type: "literal", value: "NOT", description: "\"NOT\"" },
        peg$c137 = "and",
        peg$c138 = { type: "literal", value: "AND", description: "\"AND\"" },
        peg$c139 = "or",
        peg$c140 = { type: "literal", value: "OR", description: "\"OR\"" },
        peg$c141 = "count",
        peg$c142 = { type: "literal", value: "COUNT", description: "\"COUNT\"" },
        peg$c143 = function() { return 'count'; },
        peg$c144 = "sum",
        peg$c145 = { type: "literal", value: "SUM", description: "\"SUM\"" },
        peg$c146 = function() { return 'sum'; },
        peg$c147 = "avg",
        peg$c148 = { type: "literal", value: "AVG", description: "\"AVG\"" },
        peg$c149 = function() { return 'average'; },
        peg$c150 = "min",
        peg$c151 = { type: "literal", value: "MIN", description: "\"MIN\"" },
        peg$c152 = function() { return 'min'; },
        peg$c153 = "max",
        peg$c154 = { type: "literal", value: "MAX", description: "\"MAX\"" },
        peg$c155 = function() { return 'max'; },
        peg$c156 = "time_bucket",
        peg$c157 = { type: "literal", value: "TIME_BUCKET", description: "\"TIME_BUCKET\"" },
        peg$c158 = "number_bucket",
        peg$c159 = { type: "literal", value: "NUMBER_BUCKET", description: "\"NUMBER_BUCKET\"" },
        peg$c160 = "time_part",
        peg$c161 = { type: "literal", value: "TIME_PART", description: "\"TIME_PART\"" },
        peg$c162 = "substr",
        peg$c163 = { type: "literal", value: "SUBSTR", description: "\"SUBSTR\"" },
        peg$c164 = /^[A-Za-z_]/,
        peg$c165 = { type: "class", value: "[A-Za-z_]", description: "[A-Za-z_]" },
        peg$c166 = { type: "other", description: "Number" },
        peg$c167 = function(n) { return parseFloat(n); },
        peg$c168 = "-",
        peg$c169 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c170 = /^[1-9]/,
        peg$c171 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c172 = ".",
        peg$c173 = { type: "literal", value: ".", description: "\".\"" },
        peg$c174 = "e",
        peg$c175 = { type: "literal", value: "e", description: "\"e\"" },
        peg$c176 = /^[0-9]/,
        peg$c177 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c178 = { type: "other", description: "Name" },
        peg$c179 = /^[a-zA-Z_]/,
        peg$c180 = { type: "class", value: "[a-zA-Z_]", description: "[a-zA-Z_]" },
        peg$c181 = /^[a-z0-9A-Z_]/,
        peg$c182 = { type: "class", value: "[a-z0-9A-Z_]", description: "[a-z0-9A-Z_]" },
        peg$c183 = { type: "other", description: "RefName" },
        peg$c184 = "^",
        peg$c185 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c186 = { type: "other", description: "NotSQuote" },
        peg$c187 = /^[^']/,
        peg$c188 = { type: "class", value: "[^']", description: "[^']" },
        peg$c189 = { type: "other", description: "NotDQuote" },
        peg$c190 = /^[^"]/,
        peg$c191 = { type: "class", value: "[^\"]", description: "[^\"]" },
        peg$c192 = { type: "other", description: "Whitespace" },
        peg$c193 = /^[ \t\r\n]/,
        peg$c194 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },
        peg$c195 = { type: "other", description: "Mandatory Whitespace" },
        peg$c196 = "--",
        peg$c197 = { type: "literal", value: "--", description: "\"--\"" },
        peg$c198 = { type: "any", description: "any character" },
        peg$c199 = /^[\n\r]/,
        peg$c200 = { type: "class", value: "[\\n\\r]", description: "[\\n\\r]" },

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
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseSQLQuery();
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

    function peg$parseSQLQuery() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parseSelectToken();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseColumns();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseFromClause();
          if (s3 === peg$FAILED) {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseWhereClause();
            if (s4 === peg$FAILED) {
              s4 = peg$c2;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parseGroupByClause();
              if (s5 === peg$FAILED) {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseHavingClause();
                if (s6 === peg$FAILED) {
                  s6 = peg$c2;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseOrderByClause();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c2;
                  }
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseLimitClause();
                    if (s8 === peg$FAILED) {
                      s8 = peg$c2;
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c3(s2, s3, s4, s5, s6, s7, s8);
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

    function peg$parseSQLSubQuery() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseSelectToken();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseColumns();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parseWhereClause();
          if (s3 === peg$FAILED) {
            s3 = peg$c2;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseGroupByClause();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseHavingClause();
              if (s5 === peg$FAILED) {
                s5 = peg$c2;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parseOrderByClause();
                if (s6 === peg$FAILED) {
                  s6 = peg$c2;
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseLimitClause();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c2;
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c4(s2, s3, s4, s5, s6, s7);
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

    function peg$parseColumns() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseColumn();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s6 = peg$c6;
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c7); }
            }
            if (s6 !== peg$FAILED) {
              s7 = peg$parse_();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseColumn();
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
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c6;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c7); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseColumn();
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
            peg$reportedPos = s0;
            s1 = peg$c8(s2, s3);
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

    function peg$parseColumn() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseOrExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAs();
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c9(s1, s2);
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

    function peg$parseAs() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAsToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseString();
            if (s4 === peg$FAILED) {
              s4 = peg$parseRef();
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c10(s4);
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

      return s0;
    }

    function peg$parseFromClause() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseFromToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseRefExpression();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c11(s4);
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

      return s0;
    }

    function peg$parseWhereClause() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseWhereToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseOrExpression();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c12(s4);
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

      return s0;
    }

    function peg$parseGroupByClause() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseGroupToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseByToken();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse__();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseOrExpression();
                if (s6 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c13(s6);
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

    function peg$parseHavingClause() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseHavingToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseOrExpression();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c14(s4);
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

      return s0;
    }

    function peg$parseOrderByClause() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseOrderToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseByToken();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse__();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseOrExpression();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseDirection();
                  if (s7 === peg$FAILED) {
                    s7 = peg$c2;
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c15(s6, s7);
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

    function peg$parseDirection() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseAscToken();
        if (s2 === peg$FAILED) {
          s2 = peg$parseDescToken();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c16(s2);
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

    function peg$parseLimitClause() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse__();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseLimitToken();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse__();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseNumber();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c17(s4);
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

      return s0;
    }

    function peg$parseOrExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseAndExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseOrToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseAndExpression();
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
            s5 = peg$parseOrToken();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseAndExpression();
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
          s1 = peg$c18(s1, s2);
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

    function peg$parseAndExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseNotExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseAndToken();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseNotExpression();
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
            s5 = peg$parseAndToken();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseNotExpression();
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
          s1 = peg$c19(s1, s2);
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

    function peg$parseNotExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseNotToken();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseComparisonExpression();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c20(s3);
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
        s0 = peg$parseComparisonExpression();
      }

      return s0;
    }

    function peg$parseComparisonExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9;

      s0 = peg$currPos;
      s1 = peg$parseAdditiveExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseBetweenToken();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseAdditiveExpression();
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseAndToken();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parse__();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parseAdditiveExpression();
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c21(s1, s5, s9);
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
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseAdditiveExpression();
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseComparisonOp();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseAdditiveExpression();
                if (s6 !== peg$FAILED) {
                  s3 = [s3, s4, s5, s6];
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
          } else {
            peg$currPos = s2;
            s2 = peg$c0;
          }
          if (s2 === peg$FAILED) {
            s2 = peg$c2;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c22(s1, s2);
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

    function peg$parseComparisonOp() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s1 = peg$c23;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c24); }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c25();
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c26) {
          s1 = peg$c26;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c27); }
        }
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c28();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c29) {
            s1 = peg$c29;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c28();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c31) {
              s1 = peg$c31;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c32); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c33();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c34) {
                s1 = peg$c34;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c35); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c36();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c37) {
                  s1 = peg$c37;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c39();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 60) {
                    s1 = peg$c40;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c41); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c42();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 62) {
                      s1 = peg$c43;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c44); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c45();
                    }
                    s0 = s1;
                  }
                }
              }
            }
          }
        }
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
          s5 = peg$parseAdditiveOp();
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
            s5 = peg$parseAdditiveOp();
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
          s1 = peg$c46(s1, s2);
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

    function peg$parseAdditiveOp() {
      var s0;

      if (peg$c47.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c48); }
      }

      return s0;
    }

    function peg$parseMultiplicativeExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseBasicExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          s5 = peg$parseMultiplicativeOp();
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseBasicExpression();
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
            s5 = peg$parseMultiplicativeOp();
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseBasicExpression();
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
          s1 = peg$c49(s1, s2);
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

    function peg$parseMultiplicativeOp() {
      var s0;

      if (peg$c50.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c51); }
      }

      return s0;
    }

    function peg$parseBasicExpression() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$parseLiteralExpression();
      if (s0 === peg$FAILED) {
        s0 = peg$parseAggregateExpression();
        if (s0 === peg$FAILED) {
          s0 = peg$parseFunctionCallExpression();
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 40) {
              s1 = peg$c52;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c53); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parse_();
              if (s2 !== peg$FAILED) {
                s3 = peg$parseOrExpression();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parse_();
                  if (s4 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s5 = peg$c54;
                      peg$currPos++;
                    } else {
                      s5 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c55); }
                    }
                    if (s5 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c56(s3);
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
              if (input.charCodeAt(peg$currPos) === 40) {
                s1 = peg$c52;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c53); }
              }
              if (s1 !== peg$FAILED) {
                s2 = peg$parse_();
                if (s2 !== peg$FAILED) {
                  s3 = peg$parseSQLSubQuery();
                  if (s3 !== peg$FAILED) {
                    s4 = peg$parse_();
                    if (s4 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 41) {
                        s5 = peg$c54;
                        peg$currPos++;
                      } else {
                        s5 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c55); }
                      }
                      if (s5 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c57(s3);
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
                s0 = peg$parseRefExpression();
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseAggregateExpression() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parseCountToken();
      if (s1 !== peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c58) {
          s2 = peg$c58;
          peg$currPos += 2;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c59); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c60();
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
        s1 = peg$parseAggregateFn();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s2 = peg$c52;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c53); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseOrExpression();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 41) {
                    s6 = peg$c54;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c55); }
                  }
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c61(s1, s4);
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
      }

      return s0;
    }

    function peg$parseAggregateFn() {
      var s0;

      s0 = peg$parseSumToken();
      if (s0 === peg$FAILED) {
        s0 = peg$parseAvgToken();
        if (s0 === peg$FAILED) {
          s0 = peg$parseMinToken();
          if (s0 === peg$FAILED) {
            s0 = peg$parseMaxToken();
          }
        }
      }

      return s0;
    }

    function peg$parseFunctionCallExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

      s0 = peg$currPos;
      s1 = peg$parseTimeBucketToken();
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 40) {
          s2 = peg$c52;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c53); }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseOrExpression();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 44) {
                  s6 = peg$c6;
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c7); }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseNameOrString();
                    if (s8 !== peg$FAILED) {
                      s9 = peg$parse_();
                      if (s9 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 44) {
                          s10 = peg$c6;
                          peg$currPos++;
                        } else {
                          s10 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c7); }
                        }
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parse_();
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parseNameOrString();
                            if (s12 !== peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 41) {
                                s13 = peg$c54;
                                peg$currPos++;
                              } else {
                                s13 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c55); }
                              }
                              if (s13 !== peg$FAILED) {
                                peg$reportedPos = s0;
                                s1 = peg$c62(s4, s8, s12);
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
        s1 = peg$parseNumberBucketToken();
        if (s1 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 40) {
            s2 = peg$c52;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c53); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseOrExpression();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 44) {
                    s6 = peg$c6;
                    peg$currPos++;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c7); }
                  }
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse_();
                    if (s7 !== peg$FAILED) {
                      s8 = peg$parseNumber();
                      if (s8 !== peg$FAILED) {
                        s9 = peg$parse_();
                        if (s9 !== peg$FAILED) {
                          if (input.charCodeAt(peg$currPos) === 44) {
                            s10 = peg$c6;
                            peg$currPos++;
                          } else {
                            s10 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c7); }
                          }
                          if (s10 !== peg$FAILED) {
                            s11 = peg$parse_();
                            if (s11 !== peg$FAILED) {
                              s12 = peg$parseNumber();
                              if (s12 !== peg$FAILED) {
                                if (input.charCodeAt(peg$currPos) === 41) {
                                  s13 = peg$c54;
                                  peg$currPos++;
                                } else {
                                  s13 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c55); }
                                }
                                if (s13 !== peg$FAILED) {
                                  peg$reportedPos = s0;
                                  s1 = peg$c63(s4, s8, s12);
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
          s1 = peg$parseTimePartToken();
          if (s1 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 40) {
              s2 = peg$c52;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c53); }
            }
            if (s2 !== peg$FAILED) {
              s3 = peg$parse_();
              if (s3 !== peg$FAILED) {
                s4 = peg$parseOrExpression();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 44) {
                      s6 = peg$c6;
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c7); }
                    }
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parseNameOrString();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parse_();
                          if (s9 !== peg$FAILED) {
                            if (input.charCodeAt(peg$currPos) === 44) {
                              s10 = peg$c6;
                              peg$currPos++;
                            } else {
                              s10 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c7); }
                            }
                            if (s10 !== peg$FAILED) {
                              s11 = peg$parse_();
                              if (s11 !== peg$FAILED) {
                                s12 = peg$parseNameOrString();
                                if (s12 !== peg$FAILED) {
                                  if (input.charCodeAt(peg$currPos) === 41) {
                                    s13 = peg$c54;
                                    peg$currPos++;
                                  } else {
                                    s13 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c55); }
                                  }
                                  if (s13 !== peg$FAILED) {
                                    peg$reportedPos = s0;
                                    s1 = peg$c64(s4, s8, s12);
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
            s1 = peg$parseSubstrToken();
            if (s1 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 40) {
                s2 = peg$c52;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c53); }
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$parse_();
                if (s3 !== peg$FAILED) {
                  s4 = peg$parseOrExpression();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parse_();
                    if (s5 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 44) {
                        s6 = peg$c6;
                        peg$currPos++;
                      } else {
                        s6 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c7); }
                      }
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parse_();
                        if (s7 !== peg$FAILED) {
                          s8 = peg$parseNumber();
                          if (s8 !== peg$FAILED) {
                            s9 = peg$parse_();
                            if (s9 !== peg$FAILED) {
                              if (input.charCodeAt(peg$currPos) === 44) {
                                s10 = peg$c6;
                                peg$currPos++;
                              } else {
                                s10 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c7); }
                              }
                              if (s10 !== peg$FAILED) {
                                s11 = peg$parse_();
                                if (s11 !== peg$FAILED) {
                                  s12 = peg$parseNumber();
                                  if (s12 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 41) {
                                      s13 = peg$c54;
                                      peg$currPos++;
                                    } else {
                                      s13 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c55); }
                                    }
                                    if (s13 !== peg$FAILED) {
                                      peg$reportedPos = s0;
                                      s1 = peg$c65(s4, s8, s12);
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

    function peg$parseRefExpression() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseRef();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c66(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseRef() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseRefName();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = peg$currPos;
        s2 = peg$c67(s1);
        if (s2) {
          s2 = peg$c0;
        } else {
          s2 = peg$c68;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c69(s1);
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
        if (input.charCodeAt(peg$currPos) === 96) {
          s1 = peg$c70;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c71); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseRefName();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 96) {
              s3 = peg$c70;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c71); }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c69(s2);
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
      }

      return s0;
    }

    function peg$parseNameOrString() {
      var s0;

      s0 = peg$parseName();
      if (s0 === peg$FAILED) {
        s0 = peg$parseString();
      }

      return s0;
    }

    function peg$parseLiteralExpression() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseNumber();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c72(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseString();
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c73(s1);
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseNullToken();
          if (s1 === peg$FAILED) {
            s1 = peg$parseTrueToken();
            if (s1 === peg$FAILED) {
              s1 = peg$parseFalseToken();
            }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c74(s1);
          }
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseString() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 39) {
        s1 = peg$c76;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c77); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseNotSQuote();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 39) {
            s3 = peg$c76;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c77); }
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c78(s2);
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
          s1 = peg$c76;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c77); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseNotSQuote();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c79(s2);
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
            s1 = peg$c80;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c81); }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$parseNotDQuote();
            if (s2 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 34) {
                s3 = peg$c80;
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c81); }
              }
              if (s3 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c78(s2);
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
              s1 = peg$c80;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c81); }
            }
            if (s1 !== peg$FAILED) {
              s2 = peg$parseNotDQuote();
              if (s2 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c82(s2);
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
        if (peg$silentFails === 0) { peg$fail(peg$c75); }
      }

      return s0;
    }

    function peg$parseNullToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c83) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c84); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c85();
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

    function peg$parseTrueToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c86) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c87); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c88();
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

    function peg$parseFalseToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c89) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c90); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c91();
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

    function peg$parseSelectToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6).toLowerCase() === peg$c92) {
        s1 = input.substr(peg$currPos, 6);
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c93); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseFromToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c94) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c95); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseAsToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c96) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c97); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseOnToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c98) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c99); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseLeftToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c100) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c101); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseInnerToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c102) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c103); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseJoinToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c104) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c105); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseUnionToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c106) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c107); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseWhereToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c108) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c109); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseGroupToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c110) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c111); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseByToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c112) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c113); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseOrderToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c114) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c115); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseHavingToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6).toLowerCase() === peg$c116) {
        s1 = input.substr(peg$currPos, 6);
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c117); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseLimitToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c118) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c119); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseAscToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c120) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c121); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c122();
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

    function peg$parseDescToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c123) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c124); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c125();
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

    function peg$parseBetweenToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7).toLowerCase() === peg$c126) {
        s1 = input.substr(peg$currPos, 7);
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c127); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseInToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c31) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c128); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseIsToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c129) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c130); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseLikeToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4).toLowerCase() === peg$c131) {
        s1 = input.substr(peg$currPos, 4);
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c132); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseContainsToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 8).toLowerCase() === peg$c133) {
        s1 = input.substr(peg$currPos, 8);
        peg$currPos += 8;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c134); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseNotToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c135) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c136); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseAndToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c137) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c138); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseOrToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2).toLowerCase() === peg$c139) {
        s1 = input.substr(peg$currPos, 2);
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c140); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseCountToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5).toLowerCase() === peg$c141) {
        s1 = input.substr(peg$currPos, 5);
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c142); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c143();
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

    function peg$parseSumToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c144) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c145); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c146();
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

    function peg$parseAvgToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c147) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c148); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c149();
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

    function peg$parseMinToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c150) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c151); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c152();
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

    function peg$parseMaxToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3).toLowerCase() === peg$c153) {
        s1 = input.substr(peg$currPos, 3);
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c154); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c155();
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

    function peg$parseTimeBucketToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 11).toLowerCase() === peg$c156) {
        s1 = input.substr(peg$currPos, 11);
        peg$currPos += 11;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c157); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseNumberBucketToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 13).toLowerCase() === peg$c158) {
        s1 = input.substr(peg$currPos, 13);
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c159); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseTimePartToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 9).toLowerCase() === peg$c160) {
        s1 = input.substr(peg$currPos, 9);
        peg$currPos += 9;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c161); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseSubstrToken() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6).toLowerCase() === peg$c162) {
        s1 = input.substr(peg$currPos, 6);
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c163); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c68;
        } else {
          peg$currPos = s2;
          s2 = peg$c0;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
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

    function peg$parseIdentifierPart() {
      var s0;

      if (peg$c164.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c165); }
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
        s4 = peg$parseFraction();
        if (s4 === peg$FAILED) {
          s4 = peg$c2;
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parseExp();
          if (s5 === peg$FAILED) {
            s5 = peg$c2;
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
        s1 = peg$c167(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c166); }
      }

      return s0;
    }

    function peg$parseInt() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s2 = peg$c168;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c169); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$c2;
      }
      if (s2 !== peg$FAILED) {
        if (peg$c170.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c171); }
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
          s2 = peg$c168;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c169); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c2;
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

    function peg$parseFraction() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 46) {
        s2 = peg$c172;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c173); }
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
      if (input.substr(peg$currPos, 1).toLowerCase() === peg$c174) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c175); }
      }
      if (s2 !== peg$FAILED) {
        if (peg$c47.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c48); }
        }
        if (s3 === peg$FAILED) {
          s3 = peg$c2;
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

      if (peg$c176.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c177); }
      }

      return s0;
    }

    function peg$parseName() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (peg$c179.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c180); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (peg$c181.test(input.charAt(peg$currPos))) {
          s4 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c182); }
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          if (peg$c181.test(input.charAt(peg$currPos))) {
            s4 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c182); }
          }
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
        if (peg$silentFails === 0) { peg$fail(peg$c178); }
      }

      return s0;
    }

    function peg$parseRefName() {
      var s0, s1, s2, s3;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = [];
      if (input.charCodeAt(peg$currPos) === 94) {
        s3 = peg$c184;
        peg$currPos++;
      } else {
        s3 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c185); }
      }
      while (s3 !== peg$FAILED) {
        s2.push(s3);
        if (input.charCodeAt(peg$currPos) === 94) {
          s3 = peg$c184;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c185); }
        }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseName();
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
        if (peg$silentFails === 0) { peg$fail(peg$c183); }
      }

      return s0;
    }

    function peg$parseNotSQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c187.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c188); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c187.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c188); }
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c186); }
      }

      return s0;
    }

    function peg$parseNotDQuote() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c190.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c191); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c190.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c191); }
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c189); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c193.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c194); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parseSingleLineComment();
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c193.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c194); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$parseSingleLineComment();
        }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c192); }
      }

      return s0;
    }

    function peg$parse__() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      if (peg$c193.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c194); }
      }
      if (s2 === peg$FAILED) {
        s2 = peg$parseSingleLineComment();
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c193.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c194); }
          }
          if (s2 === peg$FAILED) {
            s2 = peg$parseSingleLineComment();
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
        if (peg$silentFails === 0) { peg$fail(peg$c195); }
      }

      return s0;
    }

    function peg$parseSingleLineComment() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c196) {
        s1 = peg$c196;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c197); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$currPos;
        peg$silentFails++;
        s5 = peg$parseLineTerminator();
        peg$silentFails--;
        if (s5 === peg$FAILED) {
          s4 = peg$c68;
        } else {
          peg$currPos = s4;
          s4 = peg$c0;
        }
        if (s4 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s5 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c198); }
          }
          if (s5 !== peg$FAILED) {
            s4 = [s4, s5];
            s3 = s4;
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
          s4 = peg$currPos;
          peg$silentFails++;
          s5 = peg$parseLineTerminator();
          peg$silentFails--;
          if (s5 === peg$FAILED) {
            s4 = peg$c68;
          } else {
            peg$currPos = s4;
            s4 = peg$c0;
          }
          if (s4 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c198); }
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
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
          s1 = [s1, s2];
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

    function peg$parseLineTerminator() {
      var s0;

      if (peg$c199.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c200); }
      }

      return s0;
    }

    // starts with function(facet)
    var $ = facet.$;
    var Expression = facet.Expression;
    var FilterAction = facet.FilterAction;
    var ApplyAction = facet.ApplyAction;
    var DefAction = facet.DefAction;
    var SortAction = facet.SortAction;
    var LimitAction = facet.LimitAction;

    var dataRef = $('data');
    var dateRegExp = /^\d\d\d\d-\d\d-\d\d(?:T(?:\d\d)?(?::\d\d)?(?::\d\d)?(?:.\d\d\d)?)?Z?$/;

    // See here: https://www.drupal.org/node/141051
    var reservedWords = {
      ALL: 1, AND: 1,  AS: 1, ASC: 1, AVG: 1,
      BETWEEN: 1, BY: 1,
      CONTAINS: 1, CREATE: 1,
      DELETE: 1, DESC: 1, DISTINCT: 1, DROP: 1,
      EXISTS: 1, EXPLAIN: 1,
      FALSE: 1, FROM: 1,
      GROUP: 1,
      HAVING: 1,
      IN: 1, INNER: 1,  INSERT: 1, INTO: 1, IS: 1,
      JOIN: 1,
      LEFT: 1, LIKE: 1, LIMIT: 1,
      MAX: 1, MIN: 1,
      NOT: 1, NULL: 1, NUMBER_BUCKET: 1,
      ON: 1, OR: 1, ORDER: 1,
      REPLACE: 1,
      SELECT: 1, SET: 1, SHOW: 1, SUM: 1,
      TABLE: 1, TIME_BUCKET: 1, TRUE: 1,
      UNION: 1, UPDATE: 1,
      VALUES: 1,
      WHERE: 1
    }

    var objectHasOwnProperty = Object.prototype.hasOwnProperty;
    function reserved(str) {
      return objectHasOwnProperty.call(reservedWords, str.toUpperCase());
    }

    function extractGroupByColumn(columns, groupBy) {
      var label = null;
      var applyColumns = [];
      for (var i = 0; i < columns.length; i++) {
        var column = columns[i];
        if (groupBy.equals(column.expression)) {
          if (label) error('already have a label');
          label = column.name;
        } else {
          applyColumns.push(column);
        }
      }
      if (!label) label = 'split';
      return {
        label: label,
        applyColumns: applyColumns
      };
    }

    function handleQuery(columns, from, where, groupBy, having, orderBy, limit) {
      if (!columns) error('Can not have empty column list');
      from = from || dataRef;

      if (where) {
        from = from.filter(where);
      }

      // Support for not having a group by clause is there are aggregates in the columns
      // A redneck check for aggregate columns is the same as having "GROUP BY 1"
      if (!groupBy) {
        var hasAggregate = columns.some(function(column) {
          return column.expression.some(function(ex) { return ex.isOp('aggregate') || null });
        })
        if (hasAggregate) groupBy = $(1);
      }

      var query = null;
      var groupByDef = null;
      if (!groupBy) {
        query = from;
      } else {
        if (groupBy.isOp('literal')) {
          query = $().def('data', from);
        } else {
          var extract = extractGroupByColumn(columns, groupBy);
          columns = extract.applyColumns;
          query = from.split(groupBy, extract.label, 'data');
        }
      }

      for (var i = 0; i < columns.length; i++) {
        query = query.performAction(columns[i]);
      }
      if (having) {
        query = query.performAction(having);
      }
      if (orderBy) {
        query = query.performAction(orderBy);
      }
      if (limit) {
        query = query.performAction(limit);
      }

      return query;
    }

    function naryExpressionFactory(op, head, tail) {
      if (!tail.length) return head;
      return head[op].apply(head, tail.map(function(t) { return t[3]; }));
    }

    function naryExpressionWithAltFactory(op, head, tail, altToken, altOp) {
      if (!tail.length) return head;
      return head[op].apply(head, tail.map(function(t) { return t[1] === altToken ? t[3][altOp]() : t[3]; }))
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
};

},{}]},{},[1])(1)
});