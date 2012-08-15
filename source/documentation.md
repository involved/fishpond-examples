# iFish Demos Documentation

v1.0  
15-08-2012  

# Getting Started


## HTML
All the demos have been scaffolded using the [Twitter Bootstrap](twitter.github.com/bootstrap/) (TBS) Framework and a lot of the HTML markup used is just for layout and can be changed without breaking the demos.


The following is a shotlist of TBS classes that you will find in the demos. Please refer to the [TBS](twitter.github.com/bootstrap/) for the full list:  
**Structure:**  
`.container`, `.row`, `.row-fluid`, `.span1`...`.span12`, `.thumbnail` 

**Forms:**  
`.well`, `.control-group`, `.control-label`, `.controls`  

**Buttons:**  
`.btn`, `.btn-mini`, `.icon-heart`, `.icon-white` etc  

**Modals:**  
`.modal`, `.modal-body` etc


## Javascript

The iFish demos currently rely on many 3rd party Javascript plugins a few of which are being hotlinked to. So apart from the `fishpond.js` it may best to make sure you grab a copy of them and store them locally in a 'javascript' folder.
 
-`http://ifish-prototype.herokuapp.com/assets/api/v1/fishpond.js`  
-`jquery-1.7.2.min.js`  
-`jquery-ui.min.js`  
-`bootstrap-typeahead.js`  
-`underscore.js`   
-`jstorage.js`  
-`application.js`  
-`jquery.quicksand.js`   
-`jquery.easing.1.3.js`  
-`jquery-animate-css-rotate-scale.js`  
-`jquery-css-transform.js`  
-`showdown.js`  

**Not awlays required**  
-`bootstrap-dropdown.js` 
  

This list can be significantly shortened depending on the features you need.


## Stylesheets

For the demos we have tried to include all demo specific css in the HTML file for the page. You can always pull this out of the `HEAD` of the document and create an external css file.

We are also hotlinking to 2 css files which would be wise to make a local copy if you are intending on using jQuery UI or Twitter Bootstrap.

-`http://twitter.github.com/bootstrap/assets/css/bootstrap.css`  
-`http://ajax.googleapis.com/ajax/libs/jqueryui/1.8.17/themes/cupertino/jquery-ui.css`  




# Advanced Demos
[Kitchen Sink](http://involved.github.com/fishpond-examples/demos/kitchen-sink/) [KS] and [Stand Alone](http://involved.github.com/fishpond-examples/demos/stand-alone/) (SA) demo both run off the same core [Javascript file](http://involved.github.com/fishpond-examples/javascripts/demos/kitchen-sink/application.js).

For demonstration purposes this js file has been packed with advanced concept features and is always under constant change so it is best to make a locally copy, and be careful when updating it with a newer version off GitHub as there is no support provided for these.

### Demo Javascript file `application.js`  
As mentioned above this javascript file is always evolving and being improved. It has been created as proof of concept for iFish features and is **NOT** a javascript plugin. It will require Javascript knowledge to be able to get working and Advanced JS to understand and customise.

However most of the embeded IDs & Classes have been abstracted into an JS Object at the top of the file so users can understand which IDs and Classes are being relied on in the HTML.

**Example**

	var ui = {
	  query: {
	    form        : $("form"),
	    tags        : $("form fieldset.tags"),
	    filters     : $("form fieldset.filters"),
	    search      : $("form .search-query"),
	    list        : $("<ul></ul>"), // Do not edit
	    info        : $("#query-info")
	  },
	  results: {
	    container   : $("#results"),
	    list        : $("#results ul")
	  },
	  fish: {
	    details     : ".details"
	  },
	  shortlist: {
	    master      : $("#shortlist-master"),
	    options     : $("#shortlist-options")
	  },
	  templates: {
	    query: {
	      info     : $("#template-query-info"),
	      tag      : $("#template-query-tag"),
	      filter   : $("#template-query-filter")
	    },
	    fish: {
	      result    : $("#template-fish-result"),
	      details   : $("#template-fish-details"),
	      modal     : $("#template-fish-modal")
	    },
	    shortlist: {
	      master    : $("#template-shortlist-master"),
	      email     : $("#template-shortlist-email"),
	      print     : $("#template-shortlist-print")
	    }
	  }
	}

**Important Note**
As you can see there are not many IDs that the core JS relies on as instead all the work is being done by data-attributes. You will notice lots of them in the Javascript Templates so these need to remain but feel free to still change the HTML Markup. E.g.
 
	<li class='{{ status }} fish' data-id='{{ fish.id }}' data-popularity='{{ fish.popularity() }}' data-pos-end='na' data-pos-start='{{ position }}'>


## Javacsript Templates

All the form elements, Fish/results, modals etc are generated using Javascript Templates. If you look at the HTML of the demo you will notice at the bottom of the file a sections titled 

    
	<!-- //////////////////////////////////////// -->
	<!-- / JAVASCRIPT TEMPLATES -->
	<!-- / Powered by Underscore.js 'Templates' -->
	<!-- //////////////////////////////////////// -->



Here is where you can change all the dynamically generated HTML. It is just like normal HTML just it uses handlebar for outputs i.e. `{{ }}`.  

**Example**

	<script id='template-query-info' type='text/html'>
	  <h2>
	    Results
	    <small>
	      (showing <span class='count'>{{ queryLimit }}</span> of {{ pond.fish_count }})
	    </small>
	  </h2>
	</script>




