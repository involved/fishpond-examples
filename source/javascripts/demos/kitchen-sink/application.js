var setupFishpond = function(fishpond){ // you must define this function in your demo, if you want hooks to the fishpond

  // Setup global variables
  var resultsList = $("#results ul");
  var quicksandEnabled = true;
  var quicksandAnimating = false;
  var quicksandUpdateQueue = [];
  var quicksandList;
    
  // Change underscore.js tenplate settings to use moustache syntax
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
      quicksandEnabled = this.checked ? false : true;
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
    quicksandUpdateQueue = []; // Clear update queue

    // Clear old results
    if (quicksandEnabled){
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
          
          if (quicksandEnabled && quicksandAnimating){
            quicksandUpdateQueue.push(result.fish.id); // If results are still animating add Fish to render process queue 
          } else {
            fish.updateTemplate(); // Update the Fish Template with the newly aquired Metadata. 
          }
        });
      } 
      
      fish.generateTemplate(result); // Generate Fish - This will either create a 'partial/empty Fish' - or - a 'complete Fish' (depending if the Metadata is loaded). In the event the Metadata is not loaded then the partial Fish will be dynamically updated later after Metadata has loaded.
    }

    // Check for animation/filtering method
    if (quicksandEnabled) sortResults();
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
        if (quicksandEnabled){
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
    });
  }

  /////////////////////////////////////////
  // Sort Results (Quicksand)
  /////////////////////////////////////////
  function sortResults() {
    quicksandAnimating = true;
    if(resultsList.find("li").length === 0) {
      // On first load populate Quicksand with unsorted results
      resultsList.append(quicksandList.find("li"));
      quicksandAnimating = false;
    } else {
      resultsList.quicksand(quicksandList.find("li"), {
        // Do nothing
      }, function() {
        quicksandAnimating = false;
        // Update templates for Fish in Queue once animation has stopped
        $.each(quicksandUpdateQueue, function(index, fishID) {
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
    $("form input[name*='tags']").each(function(){
      tags[$(this).data('slug')] = $(this).val();
    });
    $("form input[name*='filters']").each(function(){
      var value = 0;
      if(this.checked){
        value = 1;
      }
      filters[$(this).data('slug')] = value;
    });
    fishpond.query(tags, filters);
  }

};

