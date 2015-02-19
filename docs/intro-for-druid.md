---
layout: doc_page
---

# facet.js <3 Druid

This section is devoted to explaining facet.js if you are coming from the Druid world.
A familiarity with the Druid query language is assumed here.

So you have a Druid cluster?! Great.

There are many Druid [libraries](http://druid.io/docs/0.6.171/Libraries.html) out there but they are 1-1 wrappers of
the Druid API. They save you the hustle of writing JSON but you are still fundamanetaly constrained to the
expressiveness of the Druid query language.


## Basic Druid queries expressed in facet.js

### TimeBoundary query

### Select query

### Timeseries query

### TopN query

### GroupBy query

facet.js does not currently make groupBy queries as most of the time TopN queries are superior.
Support is coming though, stay tuned.
