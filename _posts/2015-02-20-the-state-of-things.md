---
title: The State of Things
layout: post
author: Vadim Ogievetsky
image: http://metamarkets.com/wp-content/uploads/2011/04/fastcar-sized-470x288.jpg
---

Thank you for your interest in facet.js.

This is a short writeup of the current state of the project.
Please read it to understand where the project is right now and where it is heading.

## Where is this coming from?

facet.js became open source (under the Apache 2.0) license on Feb 20, 2015 after two years of closed-source development.

facet.js was originally built to solve the specific problems encountered at [Metamarkets](http://metamarkets.com) while
trying to build an interactive real-time data exploration UI on top of the [Druid](http://druid.io) big-data database.
facet.js was open sourced because we believe that the challenges we encountered are not unique to the Metamarkets
use case, and in-fact are applicable to anyone trying to build a data exploration UI over large amount of data.

## Current project status

Prior to being open sourced, facet.js was re-architected and re-written to become more general and easier to understand.
The rewrite was also necessary to facilitate some of the new features that are coming down the pipeline.

The rewrite is not fully complete, and there is more code that needs to be opened.
Currently facet.js is divided into two domains: `core` and `legacy`.

`core` represents the new language for expressing queries and the start of the general query planner.

`legacy` represents the old language that will soon be gone. You can see it documented [here](legacy.md).

The basic facet.js workflow consists of composing an expression and passing it to a driver that can evaluate it.
As of this writing the driver for Druid and MySQL exist only within the `legacy` module; for now
the only way to query Druid via facet.js is by wrapping the legacy driver in the legacy translator. Since the legacy
language is less expressive than the new language, certain new-language expressions can not be translated.

## What's next?

The project will be growing and evolving rapidly over the coming weeks as code gets migrated from `legacy` to `core`
and new code is added.

### Promises

Rewriting some of the code to use [Q](https://github.com/kriskowal/q) promises instead of callbacks.

### Finish migration to core

Get all of the existing drivers ported into `core` and extended to support all the goodness that the new query language
allows.

### Round out the query language support

Due to the fact that facet was initially developed to solve the Metamarkets use case, certain parts of the legacy drivers
are more developed than others. As part of the open-sourcing effort (and the migration to `core`) all features will be
supported equally.

### Documentation

Write clear documentation that would allow new users to jump right into using facet.

### Flights dataset

Currently the facet unit tests are based on two datasets: `diamonds` and `wiki_day_agg` (see the `/data` directory).
There are drawbacks to these data sources as far as tests go.

### Try it online sandbox

Build an online sandbox that allows people to experiment with facet queries from their web browsers.
Something like the [./jq play sandbox](jqplay.org) is the aim.

### Integrate the visualization engine

This is the component that necessitated the refactor. More on this later.

### Integrate the rest of the components into the Open Source facet.js

There are a number of components that need to be tweaked and documented to work with the new `core` framework, they include:

- Web worker manager, allowing facet.js components to be run inside of Web workers
- Zookeeper locator, facilitating service discovery via Zookeeper

## Conclusion

Over the next couple of months there will be very active development and growth in facet.js. Please stay tuned.
