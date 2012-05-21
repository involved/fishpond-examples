var Application = Application || {};

Application = {
  Query: {
    init: function () {
      var apiKey = "6OqHqMf609P6tSrxuj2ANuj3S6fAUphnjyOcGWdtD";
      var pondToken = "BJHnFG";// "sC8IZQ";
      var options = { debug: false };
      var fishpond = new Fishpond(apiKey, options);
      var container = $("section#query");

      Application.Query.setup(fishpond);
      fishpond.init(pondToken);
    },

    //------------------------------------------------------------------------
    setup: function (fishpond) {
      //------------------------------------------------------------------------
      fishpond.loading(function(percent){
        $("#loading .progress").removeClass("progress-striped");
        $("#loading .bar").css({width: (percent * 100) + "%"});

        // Clear LocalStorage of fish data
        locache.flush();
      });

      //------------------------------------------------------------------------
      fishpond.ready(function(pond){

        // Generate form controls
        var formTags = $("fieldset.tags");
        var formFilters = $("fieldset.filters .control-group");
        var tagControlGroup;
        var filterControl;

        // Generate Tag Controls
        $.each(pond.tag_ids, function(name, token){ 
          tagControlGroup = $("" +
            "<div class='control-group'>" +
              "<label class='control-label'>" +
                name + " <output>(10)</output>" +
              "</label>" +
              "<div class='controls'>" +
                "<input id='query_tag_"+token+"' data-slug='"+name+"' name='query[tags]["+token+"]' type='hidden' value='6'>" +
                "<div class='slider span2' data-target='query[tags]["+token+"]'></div>" +
              "</div>" +
            "</div>");
          formTags.append(tagControlGroup);
        });

        // Generate Filter Controls
        $.each(pond.filters, function(index, token){
          filterControl = $("" +
            "<div class='controls'>" +
              "<label class='checkbox'>" +
                "<input id='query_filter_"+token.id+"' data-slug='"+token.slug+"' name='query[filters]["+token.id+"]' type='checkbox' value='0'>" +
                token.name + 
              "</label>" +
            "</div>");
          formFilters.append(filterControl);
        });

        // Init Input Controls styling
        Application.UI.sliders(fishpond);

        // Loading transitions
        $("#loading").fadeOut(400);
        $("form").hide().removeClass("visuallyhidden").delay(400).fadeIn(400);
        $("form").queue(function() {
          fishpond.query({}, {});
        });

      });

      //------------------------------------------------------------------------
      fishpond.resultsUpdated(function(results){
        var source = $("#results ul", "#query");
        var list = $("<ul></ul>");
        var listItem;
        var fishID;
        var resultItem;
        var resultDetails;
        var modalGroup;
        var fishModal;
        var isShortlisted;
        var status;
 
        // Generate Results
        $.each(results, function(position, result){ 
          var shortlistClass = null;
          fishID = result.fish.id;
          isShortlisted = locache.get("shortlisted-"+fishID);

          // Check if Fish metadata is cached
          if (locache.get("metadata-"+fishID)){
            status = "loaded";
            resultDetails = ("" +
            "<div class='details'>" +
              "<a class='btn btn-mini btn-primary' href='" + locache.get("metadata-"+fishID).url + "'>View Demo</a>" +
              "<a class='btn btn-mini launch-modal' href='#fishInfo'>More Info</a>" +
            "</div>");
          } else {
            status = "loading";
            resultDetails = ("<div class='details'></div>"); 
          }

          // Check if on shortlist
          if (isShortlisted == "true"){
            shortlistClass = "btn-warning icon-white";
            //console.log(fishID + " -> SL: " + isShortlisted);
          } else {
            //console.log(fishID + " -> SL: false");
          }

          // Create empty Fish
          listItem = $("" +
            "<li class='span2 "+ status +"' id='"+fishID+"' data-id='"+fishID+"'>" +
              "<div class='thumbnail "+ status +"'>" +
                "<strong>" + result.fish.title + "</strong>" +
                "<br /> " + result.fish.id + "<br /> " +
                resultDetails +
                "<a href='#' data-id='"+ fishID +"' class='btn btn-mini shortlist "+ shortlistClass +"'><i class='icon-star'></i></a>" +
              "</div>" +
            "</li>");

          // Add empty fish to results
          list.append(listItem);

          // Load Metadata if not Cached
          if (!locache.get("metadata-"+fishID)){
            $.when( loadMetadata(fishID) ).then(
              function(fishID, metadata){
                //console.log(status); // Resolved
                console.log("[Metadata] Success " + fishID);
                updateTemplate(fishID, metadata)
                /*$.when( updateTemplate(fishID, metadata)).then(
                  function(fishID, status){
                    console.log("Init: " + status + " -> " + fishID) 
                  },function(fishID, status){
                    console.log("Init: " + status + " -> " + fishID) 
                  }
                );*/

              },function(status){
                console.log("[Metadata] FAILED");
              }
            );
          }
        });

        // Update Results order
        sortResults();


        // ------------------------------------------------------------------------
        // FUNCTIONS
        // ------------------------------------------------------------------------

        // Update Fish with Metadata
        function updateTemplate(fishID, metadata){
          var templateUpdated = new $.Deferred();
            
          if (metadata){
            resultItem = $("li[data-id='" + fishID + "']");
            resultDetails = ("" +
              "<a class='btn btn-mini btn-primary' href='" + metadata.url + "'>View Demo</a>" +
              "<a class='btn btn-mini launch-modal' href='#fishInfo'>More Info</a>");

            resultItem.find(".details").html(resultDetails);
            resultItem.find(".loading").removeClass("loading");

            resultItem.removeClass("loading");
            resultItem.addClass("loaded");

            modalInit(fishID, metadata);      
            shortlist(fishID);

            templateUpdated.resolve(fishID, "[Template Updated] Success ");
            
          } else {
            templateUpdated.reject(fishID, "[Template Updated] FAIL - no metadata");

            // If no Metadata loaded then go load it
            /*$.when( loadMetadata(fishID) ).then(
              function(fishID, metadata){
                console.log("Reloaded [Metadata] Success " + fishID);
                updateTemplate(fishID, metadata);
              }
            );*/
          }

          // Return the Promise so caller can't change the Deferred
          return templateUpdated.promise();
        }

        // Shortlist Handler
        function shortlist(fishID){
          var shortlistButtons = $(".shortlist[data-id='" + fishID + "']");

          shortlistButtons.on("click", function(e){
            e.preventDefault();
            isShortlisted = locache.get("shortlisted-"+fishID);

            if (isShortlisted == "true"){
              shortlistButtons.removeClass("btn-warning");
              locache.set("shortlisted-"+fishID, "false");
              console.log("[Sortlist] Removed " + fishID);
            } else {
              shortlistButtons.addClass("btn-warning");
              locache.set("shortlisted-"+fishID, "true");
              console.log("[Sortlist] Added " + fishID);
            }
          });
        }

        // Modal handler
        function modalInit(fishID, metadata){
          var shortlistButton = $(".shortlist[data-id='" + fishID + "']");
          var shortlistClass = null;
          var shortlistWording = null;
          //console.log("[Modal] - " + fishID);

          source.find("li[data-id='" + fishID + "'] .launch-modal").click(function(e){
            e.preventDefault();

            isShortlisted = locache.get("shortlisted-"+fishID);

            if (isShortlisted == "true"){
              shortlistClass = "btn-warning shortlisted";
              shortlistWording = "Remove from shortlist";
            } else {
              shortlistClass = "";
              shortlistWording = "Add to shortlist";
            }
            
            // Clone empty Modal template and display
            fishModal = $('#modalTemplate').clone().attr("id",fishID);
            fishModal.modal('show');

            // Backup thumbnail
            if (metadata.thumbnail_url === ""){
              metadata.thumbnail_url = "http://placehold.it/120x120"; 
            }
            
            // Construct modal
            modalGroup = $("" +
              "<div class='modal-header'>" +
                "<button class='close' data-dismiss='modal'>×</button>" +
                "<h3>" + metadata.title + "</h3>" +
              "</div>" +
              "<div class='modal-body'>" +
                "<div class='row'>" + 
                  "<div class='span2'>" + 
                    "<img src='" + metadata.thumbnail_url + "' alt='" + metadata.title + "' />" +
                  "</div>" + 
                  "<div class='span4'>" + 
                    "<p>" + metadata.description + "</p>" +
                    "<a href='" + metadata.url + "' target='_blank'>Find out more</a>" +
                    "<br /><br /><a href='#' data-id='"+ fishID +"' class='btn btn-mini shortlist "+ shortlistClass +"'><i class='icon-star'></i> "+ shortlistWording +"</a>" +
                  "</div>" +
                "</div>" +
              "</div>" +
              "<div class='modal-footer'>" +
                "<a href='#' class='btn' data-dismiss='modal'>Close</a>" +
              "</div>");

            if (fishModal.attr("id") === metadata.id){
              fishModal.html(modalGroup);
              shortlist(fishID);
            }
          });
        }

        // Load Fish's Metadata then store it
        function loadMetadata(fishID){
          var fishMetadata = new $.Deferred();
          console.log("loading new" );

          fishpond.get_fish(fishID, function(metadata){
            fishMetadata.resolve(fishID, metadata);
            locache.set("metadata-"+fishID, metadata); // Store Fish Metadata
            updateTemplate(fishID, metadata);     // Holding off updating resutls until sorting has finished   
          });    

          // Return the Promise so caller can't change the Deferred
          return fishMetadata.promise();
        }

        function sortResults() {
          // Sorting Results with Quicksand
          if(source.find("li").length == 0) {
            source.append(list.find("li"));
            console.log("[Quicksand] Init - " + $("#results li").length + " results in list");
          } else {
            source.quicksand(list.find("li"), {
              // Do nothing
            }, function() {
              console.log('[Results] reordered');
    
              // Activate Shortlist + Modals on all Results
              $('#results li').each(function(index) {
                fishID = $(this).attr("id");
                metadata = locache.get("metadata-"+fishID);
                modalInit(fishID, metadata);
                shortlist(fishID);
                
                // Update template fish that haven't completed loading
                if ($(this).hasClass("loading")){
                  $.when( updateTemplate(fishID, metadata)).then(
                    function(fishID, status){
                      console.log("Force: " + status + " -> " + fishID) 
                    },function(fishID, status){
                      console.log("Force: " + status + " -> " + fishID) 
                    }
                  );
                }

              });
            });
          }
        }

      });
    }   
  },

  //////////////////////////////////////////////////////////////////////////
  UI: {
    sliders: function (fishpond) {
      // jQuery UI Slider
      $(".slider").slider({
        value: 10,
        min: 0,
        max: 20,
        step: 1,
        slide: function(e, ui){
          var output = $(this).parents('.control-group').find('output');
          var hiddenField = $("input[name='" + $(this).data('target') + "']");
          var value = ui['value'];

          if(value.toString() != hiddenField.val().toString()){
            hiddenField.val(value);
            output.html(output.html().split("(")[0] + "(" + value.toString() + ")");

            var tags = {};
            var filters = {};
            $("form#fishpond input").each(function(){
              tags[$(this).data('slug')] = $(this).val();
            });
            fishpond.query(tags, filters);
          }
        }
      });
    }
  }
};

Application.Query.init();