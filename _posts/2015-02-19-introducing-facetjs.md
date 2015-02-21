---
title: Introducing facet.js
layout: post
author: Vadim Ogievetsky
image: http://metamarkets.com/wp-content/uploads/2011/04/fastcar-sized-470x288.jpg
---

While building the Metamarkets dashboard on top of druid.io, it became apparent that there needed to be an abstraction framework to handle querying the database.

## The Problem

Imagine you have a database that's updated regularly, maybe even continuously.
You can not possibly load all the data into the front-end for processing so you query that database often,
wrangling the data each time into a format that works for the visualization.
But the visualization requests keep changing and so do the queries you need to make.
You find your code full of JSON objects or SQL snippets that describe DB aggregators which you frantically try to compose,
never sure what work should be done locally and what should be sent to the DB.

Your code is now inextricably intertwined with the particulars of the query language of your database.
You find yourself duplicating basic functionality all over the place.
Writing database independent UI unit tests seems next to impossible.
You are now busy with just keeping the system running, while any API change in the database query language sends a shiver down your spine.
You have not added a new feature in months.

## The Solution

Introducing facet.js, made to solve the practical needs of writing an interactive web-based UI on top of big-data databases (e.g., [Druid](druid.io)).
In a UI that visualizes the data of a database, any interaction can potentially create a need for a new query, as a new facet of the data needs to be loaded via a query.
Recognizing the similarity in needs of a data query language and a data visualization framework, a common core was
established on top of ideas outlined in Hadley Wickham's [split-apply-combine paper](http://www.jstatsoft.org/v40/i01/paper).
The facet.js core defines objects that represent filters, arithmetic operations, aggregations, and other necessities of a standard query language. The core also serves as a declarative higher-level language, with an emphasis on nested data structures.

facet.js supports a number of pluggable drivers that allow it to interface with a growing selection of supported databases.
Currently available are Druid, MySQL, and a native JS driver.
facet.js promotes a clean separation of UI logic from the particular implementation details of a specific data source,
allowing the application the freedom to query data anywhere it’s stored. In the Metamarkets product,
the native JS driver is used with a sample data file to provide a consistent environment for the running of UI unit tests;
it also allows instant data exploration by dragging a data file into the browser to be loaded with the native JS driver.
Finally, facet.js fills in missing or incomplete functionality within the database by providing advanced queries beyond
the database's language, then breaking them down as necessary for the database to understand.

## But Wait, There’s More to See

facet.js was designed with visualizations in mind.
It will allow visualizations to be constructed in a language that closely mirrors the structure of the data query.

Another key feature of facet.js is that any query / visualization made with it is serializable to JSON allowing it to be saved in a database.
This is crucial when implementing applications as scheduled reports, embedded widgets, and configurable dashboards.

