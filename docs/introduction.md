---
layout: doc_page
---

# facet.js

## Introduction

facet.js is a framework for expressing data queries optimized for visualizations.
facet.js places the end user first by facilitating a rich query language that gets translated to an underlying database.

## Philosophy

facet.js was built with these goals in mind:

### Higher-level language

A high-level *domain specific language* is employed to describe the facet API.
This language is inspired by Hadley Wickham's [split-apply-combine](http://www.jstatsoft.org/v40/i01/paper) principle,
and by [jq](https://stedolan.github.io/jq/).

### Higher-level objects

A number of core datatypes are provided to make life easy.

### Serializability

facet.js queries and visualizations can be serialized to and from JSON.

## Querying

Making a query in facet.js consists of creating an expression and then evaluating it.

There are a number of ways to create expressions:

- by using the ```facet()``` helper method
- by parsing an expression string using the built-in parser
- by composing them manually using the Expression sub-class objects
- by constructing the appropriate JSON and then deserializing it into an Expression

Expressions are joined together to create powerful queries.
These queries, which can be computed on any supported database, are executed by calling ```.compute()```.

Learn more about [expressions here](./expressions).

## Datasets

The backbone datatype in facet is the dataset.

A dataset is a potentially ordered collection of datums.

A datum is a collection of named attributes where the name is a string and the value any one of a number of things.

Most notably a dataset can be the value of a datum in another dataset.

In the SQL world, a *dataset* can be though as a **table** and an *attribute* as a **column**. SQL can use a *foreign-key relation* to express a table as a value
in another table, but it can not easily return the data in that format.

In the Druid world, a *dataset* is a **datasource** and an *attribute* is a **field**.

## Learn by example

### Example 0

Here is an example of a simple facet.js query that illustrates the different ways by which expressions can be created:

```javascript
var ex0 = facet() // Create an empty singleton dataset literal [{}]
  // 1 is converted into a literal
  .def("one", 1)

  // 2 is converted into a literal via the facet() function
  .def("two", facet(2))

  // The string "$one + $two" is parsed into an expression
  .apply("three", "$one + $two")

  // The method chaining approach is used to make an expression
  .apply("four", facet("three").add(1))

  // Simple JSON of an expression is used to define an expression
  .apply("five", {
    op: 'add'
    operands: [
      { op: 'ref', name: 'four' }
      { op: 'literal', value: 1 }
    ]
  })

  // Same as before except individual expression sub-components are parsed
  .apply("six", { op: 'add', operands: ['$five', 1] })
```

This query shows off the different ways of creating an expression.

Calling ```ex0.compute()``` will return a Q promise that will resolve to:

```javascript
[
  {
    three: 3
    four: 4
    five: 5
    six: 6
  }
]
```

This example employees three functions:

* `facet()` creates a dataset with one empty datum inside of it. This is the base of most facet operations.

* `apply(name, expression)` evaluates the given `expression` for every element of the dataset and saves the result as `name`.

* `def(name, expression)` is essentially the same as `apply` except that the result will not show up in the output.
This can be used for temporary computations.


### Example 1

Working with data in facet is achieved by declaring a native or remote dataset and then manipulating it.

```javascript
var remoteDataset = facet.dataset.druid({
  /* params */
})
```

Once a dataset is declared it can be used like so:

```javascript
var ex1 = facet(remoteDataset)
  .filter("$color = 'D'")
  .apply("priceOver2", "$price / 2")
  .compute()
```

### Example 2

ToDo: fill in ASAP (Feb 20, 2015)
