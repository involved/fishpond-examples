# Fishpond

## Getting Started

> Note: this guide is still being developed, but should provide
sufficient information (for now) to get going.

In your HTML file, include the following script:

    <script src="http://ifish-prototype.herokuapp.com/assets/api/v1/fishpond.js" type="text/javascript"></script>

Note: This library has no external requirements.

Start by defining your fishpond object:

    var fishpond = new Fishpond(your_api_key);

You'll then need to define some callbacks, in order to respond to
changes to the pond. Note that whilst `resultsUpdated` is the only _required_ callback
method you need to define, defining `ready` will allow you to bulid your
query form dynamically, based on the structure defined in the Fishpond
backend.

````

/*
 * ready(pond) is called once the minimal pond data has been downloaded. The
 * `pond` parameter contains all the data required to build the query
 * form dynamically.
 */

fishpond.ready(function(pond){ 

}

/*
 * resultsUpdated(results) is called whenever the results updated
 * (duh!). The `results` parameter is an array of objects containing a
 * fish and their score for that query.
 */

fishpond.resultsUpdated(function(results){

}

````

After that, you can call `fishpond.init(your_pond_token);` which will
start downloading the minimal dataset and pond structure. As mentioned
earlier, this will call `ready` when the pond is available for querying.


## Querying

The query interface is pretty simple, it's just a call to the `query`
method, passing in two objects containing the tags and filters,
respectively. Tag and filter objects are just objects with the
tag/filter slugs (as displayed in the fishpond backend) as the keys, and
the query score as the value. Eg:

````
var tags = {'interactive': 7, 'cost': 15, 'qualitative-quantitative': 4};
var filters = {'staff': 0};

fishpond.query(tags, filters);
````
