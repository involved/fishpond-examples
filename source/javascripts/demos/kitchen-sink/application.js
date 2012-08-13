var setupFishpond = function(fishpond){ // you must define this function in your demo, if you want hooks to the fishpond

  // Setup global variables
  var fishUpdateQueue = [];
  var debugMode = false;
  var queryLimit = $("#results-limit").length > 0 ? $("#results-limit :selected").val() : 30;
  var pond;

  var pondInfo = $("#pond-info");

  var ui = {
    query: {
      list        : $("<ul></ul>"), // Do not edit
      tags        : $("form fieldset.tags"),
      filters     : $("form fieldset.filters"),
      search      : $("form .search-query")
    },
    results: {
      list        : $("#results ul")
    },
    templates: {
      query: {
        info      : $("#pondInfoTemplate"),
        tags      : $("#tagsTemplate"),
        filters   : $("#filtersTemplate")
      },
      fish: {
        result    : $("#fishTemplate"),
        details   : $("#fishDetailsTemplate"),
        modal     : $("#modalTemplate")
      },
      shortlist: {
        master    : $("#shortlistTemplate"),
        email     : $("#shortlistEmail"),
        print     : $("#shortlistPrint")
      }
    }
  }



  var animation = {
    enabled       : true,
    duration      : $("#animation-duration").length > 0 ? $("#animation-duration :selected").val() : "800",
    easingMethod  : $("#animation-easing").length > 0 ? $("#animation-easing :selected").val() : "easeInOutQuad",
    inProgress    : false // Do not edit
  };

  // Changes underscore.js tenplate settings to use moustache syntax
  _.templateSettings = {
    evaluate : /\{\[([\s\S]+?)\]\}/g,
    interpolate : /\{\{(.+?)\}\}/g
  };

  // Init Markdown converter
  var converter = new Showdown.converter();

  /////////////////////////////////////////
  // Fishpond loading
  /////////////////////////////////////////
  fishpond.loading(function(percent){
    $("#loading .progress").removeClass("progress-striped");
    $("#loading .bar").css({width: (percent * 100) + "%"});

    if (debugMode === true) { $("body").addClass("debug"); }

    // Clear LocalStorage of fish data. This is optional but is in here for Development purposes
    $.jStorage.flush();
  });


  /////////////////////////////////////////
  // Fishpond Ready
  /////////////////////////////////////////
  fishpond.ready(function(pondObject){
    pond = pondObject;
    // Loading transitions (Demo site purposes)
    $("#loading").fadeOut(0);
    $("#demo").fadeIn(400);
    $("#demo h1").append(' "' + pond.name + '"');

    // Setup Templates
    var pondInfoTemplate = _.template(ui.templates.query.info.html());
    var tagsTemplate = _.template(ui.templates.query.tags.html());
    var filtersTemplate = _.template(ui.templates.query.filters.html());

    // Generate Pond info
    var pondData = {
      pond  : pond,
      query : query
    };
    pondInfo.html( pondInfoTemplate( pondData ));

    // Generate Tags
    $.each(pond.tag_ids, function(name, token){ 
      var tagsData = { 
        name  : name,
        tag1  : splitTag(name)[0],
        tag2  : splitTag(name)[1] ? splitTag(name)[1] : "",
        token : token
      };
      ui.query.tags.append( tagsTemplate( tagsData ));
    });

    // Generate Filters
    $.each(pond.filters, function(index, token){
      var filtersData = { 
        token : token
      };
      $("fieldset.filters .control-group").append( filtersTemplate( filtersData ));
    });


    ///////////////////
    // Query UI
    ///////////////////

    // Query Search-box
    var mappedFish = {};
    var fishIds = [];

    for(var i = 0; i < pond.fish.length; i++){
      var fish = pond.fish[i];
      mappedFish[fish.id] = fish;
      fishIds.push(fish.id);
    }

    ui.query.search.typeahead({
      items: 5,
      source: fishIds,
      matcher: function(item){
        return mappedFish[item].title.score(this.query) > 0.1;
      },
      sorter: function(items){
        var query = this.query;
        items.sort(function(item1, item2){
          if(mappedFish[item1].title.score(query) >  mappedFish[item2].title.score(query)) { return -1 }
          if(mappedFish[item1].title.score(query) === mappedFish[item2].title.score(query)) { return 0  }
          if(mappedFish[item1].title.score(query) <  mappedFish[item2].title.score(query)) { return 1  }
        });
        return items;
      },
      highlighter: function(item){
        return mappedFish[item].title;
      },
      updater: function (item) {
        var fish = mappedFish[item];
        $("form input[name=*'query[tags]:checkbox").removeAttr('checked');

        for( var token in fish.tags ){
          var value = fish.tags[token];
          $("form input[name='query[tags][" + token + "]']").val(value);
          $("form .slider[data-target='query[tags][" + token + "]']").slider("value", value); // Update jQuery UI sliders positions
          if(value >= 1){
            $("form input[name='query[filters][" + token + "]']").attr('checked', 'checked');
          }
        }
        sendQuery();
        return fish.title;
      }
    });
    
    // Query Sliders (jQuery UI Sliders)
    $(".slider").slider({
      value   : 10,
      min     : 0,
      max     : 20,
      step    : 1,
      slide   : sliderChanged,
      change  : sliderChanged
    });

    // Disable Slider
    $("form input[name*='switch']:checkbox").change(function(){
      sendQuery();
    });

    // Query Filters
    $("form input[name*='filters']:checkbox").change(function(){
      sendQuery();
    });

    //////////////////
    // Query Options
    //////////////////

    // Limit results
    $("#results-limit").change(function(){
      queryLimit = $(this).find(":selected").val().toString();
      $("#pond-info .count").html(queryLimit);
      sendQuery();
    });
    
    // Disable animation
    $("#query_options_animation:checkbox").change(function(){
      animation.enabled = this.checked ? false : true;
    });

    // Zig-Zag results
    $("#query_options_zigzag:checkbox").change(function(){
      $("#results").toggleClass("grid");
      $("#results").toggleClass("zigzag");
    });

    // Debug
    $("#query_options_debug:checkbox").change(function(){
      $("body").toggleClass("debug");
    });

    // Animation Easing Method
    $("#animation-easing").change(function(){
      animation.easingMethod = $(this).find(":selected").val().toString();
    });

    // Animation Duration
    $("#animation-duration").change(function(){
      animation.duration = $(this).find(":selected").val().toString();
    });

    ////////////////////
    // Listeners
    ////////////////////

    // Init Upvotes
    upvoteListener();

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

    // If a Results has been set override iFish default max limit
    if (queryLimit === null || queryLimit >= results.length){
      queryLimit = results.length;
    }

    // Clear old results
    if (animation.enabled){
      ui.query.list.empty(); 
    } else {
      ui.results.list.empty(); 
    }

    /////////////////////////////////////////
    // Generate Results
    /////////////////////////////////////////
    for(var i = 0; i < queryLimit; i++){
      var result = results[i];
      var fish = fishManager(result.fish.id);

      if (fish.getMetadata() === null){
        // If Metadata is NOT cached
        $.when( fish.setMetadata(result) ).then( function(result){ // This will go away and Load & Cache the Metadata then pass back the 'Result' on completion. (Uses jQuery deferred).
          fish = fishManager(result.fish.id); // After Metadata has loaded then re-initalise 'Fish' as it is no longer in the queue.  
          
          if (animation.enabled && animation.inProgress){
            fishUpdateQueue.push(result.fish.id); // If results are still animating add Fish to render process queue 
          } else {
            fish.updateTemplate(); // Update the Fish Template with the newly aquired Metadata. 
          }
        });
      } 
      fish.generateTemplate(result, i); // Generate Fish - This will either create a 'partial/empty Fish' - or - a 'complete Fish' (depending if the Metadata is loaded). In the event the Metadata is not loaded then the partial Fish will be dynamically updated later after Metadata has loaded.
    }

    // Check for animation/filtering method
    if (animation.enabled) { sortResults() };
  });


  /////////////////////////////////////////
  // Fish Manager
  /////////////////////////////////////////
  var fishManager = function (fishID) {
    var fishDetailsTemplate = _.template($( "#fishDetailsTemplate" ).html());
    var shortlist = shortlistManager(fishID);
    var upvote = upvoteManager(fishID);
    
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
      generateTemplate: function (result, position) {
        var currentFish = this;
        var fishTemplate = _.template(ui.templates.fish.result.html());
        var metadata = currentFish.getMetadata();
        var resultData = {
          fish            : result.fish, 
          fishDetailsData : currentFish.fishDetails(),  // Pass 'details' template into this template
          metadata        : metadata,
          status          : metadata ? "loaded" : "loading",
          shortlist       : shortlist.template(),       // Pass in 'shortlistButton' Object
          upvote          : upvote.template(),        
          position        : position
        };

        // Update Results list
        if (animation.enabled){
          ui.query.list.append( fishTemplate( resultData ));  // Use Quicksand plugin to handle filtering + animations.         
        } else {
          ui.results.list.append( fishTemplate( resultData ));    // Fall back to non-animated filtering.
        }
      },
      updateTemplate: function () {
        var currentFish = this;
        var fishResult = ui.results.list.find("li[data-id='" + fishID + "']");
        var fishDetailsData = { 
          metadata        : currentFish.getMetadata(),
          shortlist       : shortlist.template(),
          upvote          : upvote.template()
        };
        fishResult.removeClass("loading").addClass("loaded");

        // Once Metadata is loaded then inject it into result.
        return fishResult.find(".details").html( fishDetailsTemplate( fishDetailsData ));
      },
      fishDetails: function () {
        var currentFish = this;
        var fishDetailsTemplate = _.template(ui.templates.fish.details.html());
        var fishDetailsData;

        // If Metadata has loaded then populate 'Details Template'
        if (currentFish.getMetadata()) {
          fishDetailsData = {
            metadata      : currentFish.getMetadata(),
            shortlist     : shortlist.template(),
            upvote        : upvote.template()
          };
          return fishDetailsTemplate( fishDetailsData );
        }
      } 
    };
  };

  /////////////////////////////////////////
  // Modal Manager
  /////////////////////////////////////////
  var modalManager = function () {
    // Modal Toggle Listener
    $("#query").on("click", "[data-toggle='modal']", function(event){
      event.preventDefault();
      var fishID = $(this).closest("li").data('id');
      var shortlist = shortlistManager(fishID);
      var upvote = upvoteManager(fishID);
      var fishModal = $("#"+fishID+".modal");
      var metadata = $.jStorage.get("metadata-"+fishID);

      // Convert description to Markdown
      metadata.description = converter.makeHtml(metadata.description);
      
      // if Modal for Fish doesn't already exist.  
      if (fishModal.length === 0){
        // Clone empty Modal template and display temporarily
        fishModal = $("#emptyModal").clone().attr("id",fishID);
        fishModal.modal("show");

        // Load data into empty Modal
        var modalTemplate = _.template(ui.templates.fish.modal.html());
        var modalData = {
          metadata   : metadata,
          shortlist  : shortlist.template(),
          upvote     : upvote.template(),
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
  // Upvote Manager
  /////////////////////////////////////////
  var upvoteManager = function(fishID) {
    var upvoteStatus;

    return {
      isUpvoted: function () {
        // Check if Shortlist status has been set. If not then set it to False, otherwise return the cached value.
        upvoteStatus = $.jStorage.get("upvote-"+fishID);
        if (upvoteStatus === "" || _.isNull(upvoteStatus) || _.isUndefined(upvoteStatus)){
          $.jStorage.set("upvote-"+fishID, false); // Cache Shortlist status
          return upvoteStatus = false;
        }
        return upvoteStatus;
      },
      template: function () {
        this.isUpvoted();
        var upvoteButton = {
          upvoteClass  : upvoteStatus ? "upvoted btn-success disabled" : ""
        };
        return upvoteButton;
      }
    };
  };

  /////////////////////////////////////////
  // Upvote Listener
  /////////////////////////////////////////
  function upvoteListener() {
    var fishID;

    // Upvote add/remove
    $("body").on("click", "[data-toggle='upvote']", function(event){
      event.preventDefault();

      // Determine Fish ID
      fishID = $(this).closest("[data-id]").data("id");

      // Toggle Shortlist status
      var upvoteStatus = $.jStorage.get("upvote-"+fishID);
      upvoteStatus = (upvoteStatus === "" || _.isNull(upvoteStatus) || _.isUndefined(upvoteStatus)) ? true : !upvoteStatus;  // If Upvote status is empty, null or undefined then set it to True, otherwise toggle current status.

      // Cache new Upvote status
      $.jStorage.set("upvote-"+fishID, upvoteStatus);

      // Update all instances of Upvote button
      $("[data-id='"+ fishID +"'][data-toggle='upvote'] ").each(function(index) {
        $(this).addClass("upvoted btn-success disabled");
      });

      // Upvote Fish on iFish Server
      pond.find_fish(fishID).up_vote();
    });
  }


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
        var shortlistTemplate = _.template(ui.templates.shortlist.master.html());
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

    });

    $("body").on("click", "#shortlist-print-confirm", function(event) {
      console.log("Print confirm");

      var w = window.open( '', "Shortlist", "menubar=0,location=0,height=700,width=700" );
      if(!w)alert('Please enable pop-ups');
      $('#shortlist-export-print .modal-body').clone().appendTo( w.document.body );
      w.print();
      w.close();

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
    // TODO
  }

  /////////////////////////////////////////
  // Sort Results (Quicksand)
  /////////////////////////////////////////
  function sortResults() {
    animation.inProgress = true;
    if(ui.results.list.find("li").length === 0) {
      // On first load populate Quicksand with unsorted results
      ui.results.list.append(ui.query.list.find("li"));
      animation.inProgress = false;
    } else {

      $(ui.results.list.find("li")).each(function (index) {
        var id = $(this).data('id');
        var oldPos = index;
        var newPos = ui.query.list.find("li[data-id='"+id+"']").index();

        $(this).addClass("animating");
        $(this).attr('data-pos-start', oldPos); 
        $(this).attr('data-pos-end', newPos); 
      });

      ui.results.list.quicksand(ui.query.list.find("li"), {
        easing      : animation.easingMethod,
        duration    : parseInt(animation.duration),
        useScaling  : false
      }, function() {
        animation.inProgress = false;
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
  function sliderChanged(e, ui){
    var output = $(this).parents('.control-group').find('output');
    var hiddenField = $("input[name='" + $(this).data('target') + "']");
    var value = ui['value'];
    if(value.toString() !== hiddenField.val().toString()){
      hiddenField.val(value);
      updateTagOutput(output, value);
      sendQuery();
    }
  }

  function regexToken(txt){
    // Find value in second [] i.e. WxI in 'query[switch][WxI]'
    var re1='.*?';    // Non-greedy match on filler
    var re2='(?:[a-z][a-z]+)';    // Uninteresting: word
    var re3='.*?';    // Non-greedy match on filler
    var re4='(?:[a-z][a-z]+)';    // Uninteresting: word
    var re5='.*?';    // Non-greedy match on filler
    var re6='((?:[a-z][a-z]+))';    // Word 1

    var p = new RegExp(re1+re2+re3+re4+re5+re6,["i"]);
    var m = p.exec(txt);
    if (m != null) return m[1];
  }

  function sendQuery(){
    var tags = {};
    var filters = {};
   
    // Search Box
    $("form input.search-query").val("");// Reset search value
  
    // Sliders
    $("form input[name*='tags']").each(function(){
      var token = regexToken($(this).attr("name"));
      var tagControl = $(".slider[data-target='query[tags]["+token+"]']");
      var output = $(this).parents('.control-group').find('output');

      if( $("input[name='query[switch]["+token+"]']:checked").length == 0 ){
        tags[$(this).data('slug')] = false;
        tagControl.slider('disable');
        updateTagOutput(output, "n/a");
      } else {
        tags[$(this).data('slug')] = $(this).val();
        tagControl.slider('enable');
        updateTagOutput(output, $(this).val());
      }
    });

    // Filters
    $("form input[name*='filters']").each(function(){
      var value = this.checked ? 1 : 0;
      filters[$(this).data('slug')] = value;
    });
    fishpond.query(tags, filters);
  }

  function updateTagOutput(element, val){
    if (element.length > 0){
      element.html(element.html().split("(")[0] + "(" + val.toString() + ")");
    }
  }

  function splitTag(name){
    var tags = name.split('_');
    var splitTag = [];
    if (tags.length > 1){
      tags.forEach(function(tag, i) {
        splitTag[i] = tag;
      });
    } else if (name === "popularity"){
      splitTag.push("unpopular", "popular");
    } else {
      splitTag[0] = name;
    }
    return splitTag;
  }
};