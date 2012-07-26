var setupFishpond = function(fishpond){ // you must define this function in your demo, if you want hooks to the fishpond

  // Setup global variables
  var resultsList = $("#results ul");
  var queryAnimationEnabled = true;
  var queryCurrentlyAnimating = false;
  var fishUpdateQueue = [];
  var quicksandList;
    
  // Changes underscore.js tenplate settings to use moustache syntax
  _.templateSettings = {
    evaluate : /\{\[([\s\S]+?)\]\}/g,
    interpolate : /\{\{(.+?)\}\}/g
  };

  
  /////////////////////////////////////////
  // Fishpond loading
  /////////////////////////////////////////
  fishpond.loading(function(percent){
    $("#loading .progress").removeClass("progress-striped");
    $("#loading .bar").css({width: (percent * 100) + "%"});

    // Clear LocalStorage of fish data. This is optional but is in here for Development purposes
    $.jStorage.flush();
  });


  /////////////////////////////////////////
  // Fishpond Ready
  /////////////////////////////////////////
  fishpond.ready(function(pond){
    // Loading transitions (Demo site purposes)
    $("#loading").fadeOut(0);
    $("#demo").fadeIn(400);
    $("#demo h1").append(' "' + pond.name + '"');       

    // Setup Templates
    var tagsTemplate = _.template($( "#tagsTemplate" ).html());
    var filtersTemplate = _.template($( "#filtersTemplate" ).html());

    // Generate Tags
    $.each(pond.tag_ids, function(name, token){ 
      var tagsData = { 
        name  : name, 
        token : token
      };
      $("fieldset.tags").append( tagsTemplate( tagsData ));
    });

    // Generate Filters
    $.each(pond.filters, function(index, token){
      var filtersData = { 
        token : token
      };
      $("fieldset.filters .control-group").append( filtersTemplate( filtersData ));
    });

    // Query Search-box
    var mappedFish = {};
    var fishIds = [];

    for(var i = 0; i < pond.fish.length; i++){
      var fish = pond.fish[i];
      mappedFish[fish.id] = fish;
      fishIds.push(fish.id);
    }

    $("form#search .search-query").typeahead({
      items: 5,
      source: fishIds,
      matcher: function(item){
        return mappedFish[item].title.score(this.query) > 0.1;
      },
      sorter: function(items){
        var query = this.query;
        items.sort(function(item1, item2){
          if(mappedFish[item1].title.score(query) >  mappedFish[item2].title.score(query)) { return -1 };
          if(mappedFish[item1].title.score(query) == mappedFish[item2].title.score(query)) { return 0  };
          if(mappedFish[item1].title.score(query) <  mappedFish[item2].title.score(query)) { return 1  };
        });
        return items;
      },
      highlighter: function(item){
        return mappedFish[item].title;
      },
      updater: function (item) {
        var fish = mappedFish[item];
        $("form#fishpond input:checkbox").removeAttr('checked');

        for( var token in fish.tags ){
          var value = fish.tags[token];
          $("form#fishpond input[name='query[tags][" + token + "]']").val(value);
          $("form#fishpond .slider[data-target='query[tags][" + token + "]']").slider("value", value); // Update jQuery UI sliders positions
          if(value >= 1){
            $("form#fishpond input[name='query[filters][" + token + "]']").attr('checked', 'checked');
          }
        }
        sendQuery();
        return fish.title;
      }
    });

    // Query Sliders (jQuery UI Sliders)
    $(".slider").slider({
      value: 10,
      min: 0,
      max: 20,
      step: 1,
      slide: function(e, ui){
        var output = $(this).parents('.control-group').find('output');
        var hiddenField = $("input[name='" + $(this).data('target') + "']");
        var value = ui['value'];

        if(value.toString() !== hiddenField.val().toString()){
          hiddenField.val(value);
          output.html(output.html().split("(")[0] + "(" + value.toString() + ")");
          sendQuery();
        }
      }
    });

    // Query Filters
    $("input[name*='filters']:checkbox").change(function(){
      sendQuery();
    });

    // Query Options
    $("input[name*='options']:checkbox").change(function(){
      queryAnimationEnabled = this.checked ? false : true;
    });

    // Init Shorlists
    shortlistListener();

    // Init Comments
    commentsManager(pond);

    // Run Query
    fishpond.query({}, {});
  });

  
  /////////////////////////////////////////
  // Results Updated
  /////////////////////////////////////////
  fishpond.resultsUpdated(function(results){
    fishUpdateQueue = []; // Clear update queue

    // Clear old results
    if (queryAnimationEnabled){
      quicksandList = $("<ul></ul>");  
    } else {
      resultsList.empty(); 
    }

    /////////////////////////////////////////
    // Generate Results
    /////////////////////////////////////////
    for(var i = 0; i < results.length; i++){
      var result = results[i];
      var fishID = result.fish.id;
      var fish = fishManager(fishID);

      if (fish.getMetadata() === null){
        // If Metadata is NOT cached
        $.when( fish.setMetadata(result) ).then( function(result){ // This will go away and Load & Cache the Metadata then pass back the 'Result' on completion. (Uses jQuery deferred).
          fish = fishManager(result.fish.id); // After Metadata has loaded then re-initalise 'Fish' as it is no longer in the queue.  
          
          if (queryAnimationEnabled && queryCurrentlyAnimating){
            fishUpdateQueue.push(result.fish.id); // If results are still animating add Fish to render process queue 
          } else {
            fish.updateTemplate(); // Update the Fish Template with the newly aquired Metadata. 
          }
        });
      } 
      
      fish.generateTemplate(result); // Generate Fish - This will either create a 'partial/empty Fish' - or - a 'complete Fish' (depending if the Metadata is loaded). In the event the Metadata is not loaded then the partial Fish will be dynamically updated later after Metadata has loaded.
    }

    // Check for animation/filtering method
    if (queryAnimationEnabled) sortResults();
  });


  /////////////////////////////////////////
  // Fish Manager
  /////////////////////////////////////////
  var fishManager = function (fishID) {
    var fishDetailsTemplate = _.template($( "#fishDetailsTemplate" ).html());
    var shortlist = shortlistManager(fishID);
    
    return {
      setMetadata: function (result) {
        var defered = new $.Deferred();  // Uses jQuery deferred to load Fish Metadata and then pass it back on completion.
        fishpond.get_fish(fishID, function(metadata){

          // Parse Metadata and provide fallbacks to avoid breakages
          var parsedMetadata = {
            description   : _.isNull(metadata.description) ? "No description set" : metadata.description,
            image_url     : _.isNull(metadata.image_url) ? "http://placehold.it/300x300" : metadata.image_url,
            thumbnail_url : _.isNull(metadata.thumbnail_url) ? "http://placehold.it/120x120" : metadata.thumbnail_url,
            url           : (metadata.url === "" || _.isNull(metadata.url)) ? "#" : metadata.url,
            id            : metadata.id,
            title         : metadata.title
          };
          
          $.jStorage.set("metadata-"+fishID, parsedMetadata);
          defered.resolve(result);
        });    
        return defered.promise();
      },
      getMetadata: function () {
        return $.jStorage.get("metadata-"+fishID);
      },
      generateTemplate: function (result) {
        var currentFish = this;
        var fishTemplate = _.template($( "#fishTemplate" ).html());
        var metadata = currentFish.getMetadata();
        var resultData = {
          fish            : result.fish, 
          fishDetailsData : currentFish.fishDetails(),  // Pass 'details' template into this template
          metadata        : metadata,
          status          : metadata ? "loaded" : "loading",
          shortlist       : shortlist.template()        // Pass in 'shortlistButton' Object
        };

        // Update Results list
        if (queryAnimationEnabled){
          quicksandList.append( fishTemplate( resultData ));  // Use Quicksand plugin to handle filtering + animations.         
        } else {
          resultsList.append( fishTemplate( resultData ));    // Fall back to non-animated filtering.
        }
      },
      updateTemplate: function () {
        var currentFish = this;
        var fishResult = resultsList.find("li[data-id='" + fishID + "']");
        var fishDetailsData = { 
          metadata        : currentFish.getMetadata(),
          shortlist       : shortlist.template()
        };
        fishResult.removeClass("loading").addClass("loaded");

        // Once Metadata is loaded then inject it into result.
        return fishResult.find(".details").html( fishDetailsTemplate( fishDetailsData ));
      },
      fishDetails: function () {
        var currentFish = this;
        var fishDetailsTemplate = _.template($( "#fishDetailsTemplate" ).html());
        var fishDetailsData;

        // If Metadata has loaded then populate 'Details Template'
        if (currentFish.getMetadata()) {
          fishDetailsData = { 
            metadata      : currentFish.getMetadata(),
            shortlist     : shortlist.template()
          };
          return fishDetailsTemplate( fishDetailsData );
        }
      } 
    };
  };

  /////////////////////////////////////////
  // Modal Manager
  /////////////////////////////////////////
  //var resultsList = $("#results ul");
  var modalManager = function () {
    $("#query").on("click", "[data-toggle='modal']", function(event){
      event.preventDefault();
      var fishID = $(this).closest("li").data('id');
      var shortlist = shortlistManager(fishID);
      var fishModal = $("#"+fishID+".modal");

      // if Modal for Fish doesn't already exist.  
      if (fishModal.length === 0){
        // Clone empty Modal template and display temporarily
        fishModal = $("#emptyModal").clone().attr("id",fishID);
        fishModal.modal("show");

        // Load data into empty Modal
        var modalTemplate = _.template($( "#modalTemplate" ).html());
        var modalData = {
          metadata  : $.jStorage.get("metadata-"+fishID),
          shortlist : shortlist.template()
        }; 
        fishModal.empty().append( modalTemplate( modalData ));
        
      } else {
        // If Modal already exists in DOM then just show Modal
        // Minimise the comments first 
        fishModal.find($("#comment_"+fishID)).hide(); 
        fishModal.modal("show");
      }
    });
  }();

  /////////////////////////////////////////
  // Shortlist Manager
  /////////////////////////////////////////
  var shortlistManager = function(fishID) {
    var shortlistStatus;

    return {
      isShortlisted: function () {
        // Check if Shortlist status has been set. If not then set it to False, otherwise return the cached value.
        shortlistStatus = $.jStorage.get("shortlist-"+fishID);
        if (shortlistStatus === "" || _.isNull(shortlistStatus) || _.isUndefined(shortlistStatus)){
          $.jStorage.set("shortlist-"+fishID, false); // Cache Shortlist status
          return shortlistStatus = false;
        }
        return shortlistStatus;
      },
      template: function () {
        this.isShortlisted();
        var shortlistButton = {
          status          : shortlistStatus,
          wording         : shortlistWording(shortlistStatus),
          shortlistClass  : shortlistStatus ? "shortlisted btn-warning" : ""
        };
        return shortlistButton;
      }
    };
  };

  function shortlistWording(shortlistStatus) {
    return shortlistStatus ? "Remove" : "Shortlist";
  }

  /////////////////////////////////////////
  // Shortlist Listener
  /////////////////////////////////////////
  function shortlistListener() {
    var shortlistMaster = $("#shortlist-master");
    var fishID;

    // Shortlist Options
    shortlistPrint();
    shortlistEmail();
    //shortlistReset();

    // Shortlist add/remove
    $("body").on("click", "[data-toggle='shortlist']", function(event){
      event.preventDefault();

      // Determine Fish ID
      fishID = $(this).closest("[data-id]").data("id");

      // Toggle Shortlist status
      var shortlistStatus = $.jStorage.get("shortlist-"+fishID);
      shortlistStatus = (shortlistStatus === "" || _.isNull(shortlistStatus) || _.isUndefined(shortlistStatus)) ? true : !shortlistStatus;  // If Shortlist status is empty, null or undefined then set it to True, otherwise toggle current status.

      // Cache new Shortlist status
      $.jStorage.set("shortlist-"+fishID, shortlistStatus);

      // Update all instances of Shortlist button
      $("[data-id='"+ fishID +"'][data-toggle='shortlist'] ").each(function(index) {
        $(this).toggleClass("shortlisted", shortlistStatus);
        $(this).toggleClass("btn-warning", shortlistStatus);
        $(this).find("span").html(shortlistWording(shortlistStatus));
      });

      // Update Master list
      if (shortlistStatus){
        var shortlistTemplate = _.template($( "#shortlistTemplate" ).html());
        var shortlistData = { 
          fishID        : fishID,
          title         : $(this).data("title"),
          thumbnail_url : $(this).data("thumbnail")
        };
        shortlistMaster.append( shortlistTemplate( shortlistData ));
      } else {
        shortlistMaster.find("[data-id='"+ fishID +"']").remove();
      }

      // Options button
      if (shortlistMaster.children.length >= 1) {
        $("#shortlist-options").removeClass("disabled");
      } else {
        console.log("No Shortlist children");
        $("#shortlist-options").addClass("disabled");
      }
    });
  }


  /////////////////////////////////////////
  // Shortlist Options: Print
  /////////////////////////////////////////
  function shortlistPrint() {
    $("body").on("click", "#shortlist-print", function(event) {
      event.preventDefault();

      $("#shortlist-export-print .modal-body").empty();

      // Setup Templates
      var shortlistPrintTemplate = _.template($( "#shortlistPrint" ).html());

      // Generate Export
      $("#shortlist-master li").each(function(index) {
        var fishID = $(this).data("id");
        var metadata = $.jStorage.get("metadata-"+fishID);
        var shortlist = { 
          metadata : metadata
        };
        $("#shortlist-export-print .modal-body").append( shortlistPrintTemplate( shortlist ));  
      });
      
      $('#shortlist-export-print').modal('show');

      $("body").on("click", "#shortlist-print-confirm", function(event) {
        console.log("Print confirm");

        w = window.open( '', "Shortlist", "menubar=0,location=0,height=700,width=700" );
        if(!w)alert('Please enable pop-ups');
        $('#shortlist-export-print .modal-body').clone().appendTo( w.document.body );
        w.print();
        w.close();

      });
    });
  }

  /////////////////////////////////////////
  // Shortlist Options: Email
  /////////////////////////////////////////
  function shortlistEmail() {
    $("body").on("click", "#shortlist-email", function(event) {
      event.preventDefault();

      
      shortlist.list();
      console.log(shortlist.list());
      /*$("#shortlist-export-email .modal-body").empty();

      // Setup Templates
      var shortlistEmailTemplate = _.template($( "#shortlistEmail" ).html());

      // Generate Export
      $("#shortlist-master li").each(function(index) {
        var fishID = $(this).data("id");
        var metadata = $.jStorage.get("metadata-"+fishID);
        var shortlist= { 
          metadata : metadata
        };
        $("#shortlist-export-email .modal-body").append( shortlistEmailTemplate( shortlist ));  
      });
      
      $('#shortlist-export-email').modal('show');
      var link = $("#shortlist-export");
      var emailSubject = "Your shortlist";
      //var emailAddress=prompt("Please enter the recipients email address","");
      //window.location  = "mailto:"+emailAddress+"?Subject="+emailSubject+"&body="+link  
      */
    });
  }

  /////////////////////////////////////////
  // Shortlist Options: Reset
  /////////////////////////////////////////
  function shortlistReset() {

  }




  /////////////////////////////////////////
  // Sort Results (Quicksand)
  /////////////////////////////////////////
  function sortResults() {
    queryCurrentlyAnimating = true;
    if(resultsList.find("li").length === 0) {
      // On first load populate Quicksand with unsorted results
      resultsList.append(quicksandList.find("li"));
      queryCurrentlyAnimating = false;
    } else {
      resultsList.quicksand(quicksandList.find("li"), {
        // Do nothing
      }, function() {
        queryCurrentlyAnimating = false;
        // Update templates for Fish in Queue once animation has stopped
        $.each(fishUpdateQueue, function(index, fishID) {
          fish = fishManager(fishID);
          fish.updateTemplate();
        });
      });
    }
  }

  /////////////////////////////////////////
  // Comments Manager (Disqus)
  /////////////////////////////////////////
  function commentsManager(pond) {
    $("body").on("click", "[data-toggle='comments']", function(event){
      event.preventDefault();

      var id = $(this).data("id");
      var comments = $("#comment_"+id);
    
      // Check to see if comments are already loaded for current fish
      if (comments.find("#disqus_thread").length === 0){
        $("#disqus_thread").appendTo(comments); // Move comments into current modal
        // Reload Discus for current Fish
        DISQUS.reset({
          reload: true,
          config: function () {
            this.page.identifier = pond.id+"-"+id;
            this.page.url = "http://involved.github.com/fishpond-examples/demos/kitchensink/#!"+id;
          }
        });
      }
      comments.toggle('slow');
    });
  }

  /////////////////////////////////////////
  // Other Functions
  /////////////////////////////////////////
  function sendQuery(){
    var tags = {};
    var filters = {};
   
    // Search Box
    $("form#search input").val("");// Reset search value
  
    // Sliders
    $("form input[name*='tags']").each(function(){
      tags[$(this).data('slug')] = $(this).val();
    });

    // Filters
    $("form input[name*='filters']").each(function(){
      var value = 0;
      if(this.checked){
        value = 1;
      }
      filters[$(this).data('slug')] = value;
    });
    
    console.log(tags);
    console.log(filters);
    console.log("-----------");

    fishpond.query(tags, filters);
  }

};

