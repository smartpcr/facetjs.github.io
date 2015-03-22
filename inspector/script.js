var facetCore = facet.core;
var Expression = facetCore.Expression;
var Dataset = facetCore.Dataset;

var defaultQuery = [
  "facet()",
  "  .def('diamonds',",
  "    facet('diamonds').filter(facet('time').in({",
  "      start: new Date('2015-03-12T00:00:00'),",
  "      end: new Date('2015-03-19T00:00:00')",
  "    }))",
  "  )",
  "  .apply('Count', '$diamonds.count()')",
  "  .apply('TotalPrice', '$diamonds.sum($price)')",
  "  .apply('PriceAndTax', '$diamonds.sum($price) + $diamonds.sum($tax)')",
  "  .apply('PriceGoodCut', facet('diamonds').filter(facet('cut').is('good')).sum('$price'))",
  "  .apply('Cuts',",
  "    facet('diamonds').split('$cut', 'Cut')",
  "      .apply('Count', facet('diamonds').count())",
  "      .sort('$Count', 'descending')",
  "      .limit(2)",
  "  )"
].join('\n');

try {
  var ev = eval(localStorage['query']);
  if (Expression.isExpression(ev)) {
    defaultQuery = localStorage['query'];
  }
} catch (e) {}

d3.select('#input').property("value", defaultQuery);

function saveToLocal() {
  localStorage['query'] = d3.select("#input").property("value");
}

context = {
  diamonds: Dataset.fromJS({
    source: 'druid',
    dataSource: 'diamonds',
    timeAttribute: 'time',
    forceInterval: true,
    approximate: true,
    context: null,
    attributes: {
      time: { type: 'TIME' },
      color: { type: 'STRING' },
      cut: { type: 'STRING' },
      tags: { type: 'SET/STRING' },
      carat: { type: 'NUMBER' },
      height_bucket: { special: 'range', separator: ';', rangeSize: 0.05, digitsAfterDecimal: 2 },
      price: { type: 'NUMBER', filterable: false, splitable: false },
      tax: { type: 'NUMBER', filterable: false, splitable: false },
      unique_views: { special: 'unique', filterable: false, splitable: false }
    }
  })
};

function transform() {
  var input = d3.select("#input").property("value");

  try {
    input = eval(input);
    if (!Expression.isExpression(input)) {
      throw new Error("not an expression");
    }
  } catch (e) {
    d3.select("#output").text("Could not parse as JS Expression");
    throw e;
  }

  saveToLocal();

  try {
    var res = input.simulateQueryPlan(context);
  } catch (e) {
    d3.select("#output").text(e.message);
    throw e;
  }


  var text = res
      .map(function(q) { return JSON.stringify(q, null, 2); })
      .join("\n\n// ---------------------\n\n") + "\n\n\n";

  d3.select("#output").text(text);
}

d3.select('#transform').on('click', transform);
