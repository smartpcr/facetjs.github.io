---
layout: doc_page
---

# Legacy query language

This is the legacy query language. facet is currently being re-architected and re-written to have a more powerful
expression language in its core. This is the description of the old query language presented here for posterity
and because it is still used internally in facet.

## Driver language

### Introduction
A facet query is represented as a JSON array of operations. Every top level operation needs to be tagged with its type.

Here is an example of a facet query that calculates the totals and does two splits to generate a 'pivot table'
```javascript
[
  {
    operation: 'filter'
    type: 'or'
    filters: [
      { type: 'is', attribute: 'color', value: 'E' }
      {
        type: 'and'
        filters: [
          { type: 'in', attribute: 'clarity', values: ['SI1', 'SI2'] }
          { type: 'not', filter: { type: 'is', attribute: 'cut', value: 'Good' } }
        ]
      }
    ]
  }
  { operation: 'apply', name: 'Count', aggregate: 'count' }

  { operation: 'split', name: 'Carat', bucket: 'continuous', size: 0.1, offset: 0.005, attribute: 'carat' }
  { operation: 'apply', name: 'Count', aggregate: 'count' }
  {
    operation: 'combine',
    combine: 'slice',
    sort: { prop: 'Count', compare: 'natural', direction: 'descending' },
    limit: 5
  }

  { operation: 'split', name: 'Cut', bucket: 'identity', attribute: 'cut' }
  { operation: 'apply', name: 'Count', aggregate: 'count' }
  {
    operation: 'combine',
    combine: 'slice',
    sort: { prop: 'Cut', compare: 'natural', direction: 'descending' }
  }
]
```

### Filter
A filter is a function that filters out parts of the dashboards

Filters need to be tagged with ```operation: 'filter'```

#### true
Facet:

```javascript
{
  type: 'true'
}
```

SQL WHERE:

```sql
1 = 1
```

#### false
Facet:

```javascript
{
  type: 'false'
}
```

SQL WHERE:

```sql
1 = 2
```


#### is
Facet:

```javascript
{
  type: 'is'
  attribute: 'country'
  value: 'Mexico'
}
```

SQL WHERE:

```sql
`country` = "Mexico"
```

#### in
Facet:

```javascript
{
  type: 'in'
  attribute: 'country'
  values: ['Mexico', 'Peru']
}
```

SQL WHERE:

```sql
`country` IN ("Mexico", "Peru")
```

#### contains
Facet:

```javascript
{
  type: 'contains'
  attribute: 'country'
  value: 'Democratic'
}
```

SQL WHERE:

```sql
country LIKE "%Democratic%"
```

#### match
Facet:

```javascript
{
  type: 'match'
  attribute
  expression
}
```

SQL WHERE:

```sql

```
-->

#### within
Facet:

```javascript
{
  type: 'within'
  attribute: 'height'
  range: [130, 150]
}
```

SQL WHERE:

```sql
130 <= `height` AND `height` < 150
```

#### not
Facet:

```javascript
{
  type: 'not'
  filter: <facetFilter>
}
```

SQL WHERE:

```sql
NOT <sqlFilter>
```

#### and
Facet:

```javascript
{
  type: 'and'
  filters: [<facetFilter1>, <facetFilter2>, ..., <facetFilterN>]
}
```

SQL WHERE:

```sql
<sqlFilter1> AND <sqlFilter2> AND ... AND <sqlFilterN>
```

#### or
Facet:

```javascript
{
  type: 'or'
  filters: [<facetFilter1>, <facetFilter2>, ..., <facetFilterN>]
}
```

SQL WHERE:

```sql
<sqlFilter1> OR <sqlFilter2> OR ... OR <sqlFilterN>
```


### Split
A split is a function that maps a row into a bucket

#### identity
Facet

```javascript
{
  bucket: 'identity'
  attribute: 'country'
}
```

SQL GROUP BY

```sql
`country`
```

#### continuous
Facet

```javascript
{
  bucket: 'continuous'
  attribute: 'height'
  size: 10
  offset: 0
}
```

SQL GROUP BY

```sql
FLOOR(`height` / 10) * 10
```

#### timeDuration
Facet

```javascript
{
  bucket: 'timeDuration'
  attribute: 'time'
  duration: 60000
  offset: 0
}
```

SQL GROUP BY

```sql
???
```

#### timePeriod
Facet

```javascript
{
  bucket: 'timePeriod'
  attribute: 'time'
  period: 'PT1H'
  timezone: 'America/Los_Angeles'
}
```

SQL GROUP BY

```sql
???
```

#### tuple
Facet

```javascript
{
  bucket: 'tuple'
  splits: [<facetSplit1>, <facetSplit2>, ..., <facetSplitN>]
}
```

SQL GROUP BY

```sql
<sqlSplit1>, <sqlSplit2>, ..., <sqlSplitN>
```


### Apply
An apply is a function that takes an array of rows and returns a number.

Applies need to be tagged with ```operation: 'apply'```

How facet applies work:

#### constant
Facet:

```javascript
{
  name: 'SomeConstant'
  aggregate: 'constant'
  value: 1337
}
```

SQL SELECT:

```sql
1337 AS "SomeConstant"
```

#### count

Facet:
```javascript
{
  name: 'Count'
  aggregate: 'count'
}
```

SQL SELECT:
```sql
COUNT(1) AS "Count"
```

#### sum, average, min, max, uniqueCount

Facet:
```javascript
{
  name: 'Revenue'
  aggregate: 'sum' // average / min / max / uniqueCount
  attribute: 'revenue'
}
```

SQL SELECT:
```sql
SUM(`revenue`) AS "Revenue"
AVG ...
MIN ...
MAX ...
COUNT(DISTICT ...
```

#### quantile

Facet:
```javascript
{
  name: 'Quantile 99'
  aggregate: 'quantile'
  attribute: 'revenue'
  quantile: 0.99
}
```

SQL SELECT:
```sql
???
```

#### filtered applies
Each apply above can also be filtered with a filter property

Facet:
```javascript
{
  name: 'Revenue from Honda'
  aggregate: 'sum' // average / min / max / uniqueCount
  attribute: 'revenue' // This is a druid 'metric' or a SQL column
  filter: { type: 'is', attribute: 'car_type', value: 'Honda' }
}
```

SQL SELECT:
```sql
SUM(IF(`car_type` = "Honda", `revenue`, NULL)) AS "Revenue"
AVG ...
MIN ...
MAX ...
COUNT(DISTICT ...
```

#### add, subtract, multiply, divide
Note that for nested applies the keys ```operation: 'apply'``` and ```name``` need only to appear on the outer-most apply

Facet:
```javascript
{
  name: 'Sum Of Things'
  arithmetic: 'add' // subtract / multiply / divide
  operands: [<facetApply1>, <facetApply2>]
}
```

SQL SELECT:
```sql
<sqlApply1> + <sqlApply2> AS "Sum Of Things"
```

Facet example:
```javascript
{
  name: 'ecpm'
  arithmetic: 'multiply'
  operands: [
    {
      arithmetic: 'divide'
      operands: [
        { aggregate: 'sum', attribute: 'revenue' }
        { aggregate: 'sum', attribute: 'volume' }
      ]
    }
    { aggregate: 'constant', value: 1000 }
  ]
}
```

SQL SELECT example:
```sql
(SUM(`revenue`) / SUM(`volume`)) * 1000 AS "ecpm"
```

### Combine

```javascript
{
  combine: 'slice'
  sort: {
    compare: 'natural'
    prop: 'Count'
    direction: 'descending'
  }
  limit: 10
}
```

SQL:

```sql
ORDER BY `Count` DESC LIMIT 10
```

