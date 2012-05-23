var Application = Application || {};

Application = {
  Query: {
    init: function () {
      var apiKey = "6OqHqMf609P6tSrxuj2ANuj3S6fAUphnjyOcGWdtD";
      var pondToken = "uhEHwd";// "sC8IZQ";
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
        var templateUpdateQueue = [];
 
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
            loadMetadata(fishID);
            status = "loading";
            resultDetails = ("<div class='details'></div>"); 
          }

          // Check if on shortlist
          if (isShortlisted == "true"){
            shortlistClass = "btn-warning icon-white";
          } 

          // Create Fish (Empty if not cached)
          listItem = $("" +
            "<li class='span2 "+ status +"' id='"+fishID+"' data-id='"+fishID+"'>" +
              "<div class='thumbnail "+ status +"'>" +
                "<strong>" + result.fish.title + "</strong>" +
                "<br /> " + result.fish.id + "<br /> " +
                resultDetails +
                "<a href='#' data-id='"+ fishID +"' class='btn btn-mini shortlist "+ shortlistClass +"'><i class='icon-star'></i></a>" +
              "</div>" +
            "</li>");

          // Add fish to results
          list.append(listItem);
        });

        // Update Results order
        sortResults();


        // ------------------------------------------------------------------------
        // FUNCTIONS
        // ------------------------------------------------------------------------

        // STEP 1: Load Fish's Metadata then store it
        function loadMetadata(fishID){
          var fishMetadata = new $.Deferred();
         // console.log("New fish");

          fishpond.get_fish(fishID, function(metadata){
            fishMetadata.resolve(fishID, metadata);
            locache.set("metadata-"+fishID, metadata);  // Store Fish Metadata 
               
            if ($("#results").hasClass("reordering")){
              templateUpdateQueue.push(fishID);         // Add to the queue for updating once reordering is finished
            } else {
              updateTemplate(fishID);                   // Update Template if results are finished reordering
            }
          });    

          return fishMetadata.promise();                // Return the Promise so caller can't change the Deferred
        }

        // STEP 2: Update Fish with Metadata. (Only used to add Metadata to new fish that haven't been cached yet)
        function updateTemplate(fishID){
          var templateUpdated = new $.Deferred();

          metadata = locache.get("metadata-"+fishID);
 
          if (metadata){
            resultItem = $("li[data-id='" + fishID + "']");
            resultDetails = ("" +
              "<a class='btn btn-mini btn-primary' href='" + metadata.url + "'>View Demo</a>" +
              "<a class='btn btn-mini launch-modal' href='#fishInfo'>More Info</a>");

            resultItem.find(".details").html(resultDetails);
            resultItem.find(".loading").removeClass("loading");

            resultItem.removeClass("loading");
            resultItem.addClass("loaded");

           // console.log("[Template Updated] Success -> " + fishID);
            
            //modalInit(fishID, metadata); 
           // console.log("[Shortlisted] -> New");// " + fishID);
            modalInit(fishID); 
            shortlist(fishID);
          }

          return templateUpdated.promise();               // Return the Promise so caller can't change the Deferred
        }

        // Modal handler
        function modalInit(fishID){
          var modalButton = source.find("li[data-id='" + fishID + "'] .launch-modal");
          var shortlistButton = $(".shortlist[data-id='" + fishID + "']");
          var shortlistClass = null;
          var shortlistWording = null;


          modalButton.click(function(e){
            metadata = locache.get("metadata-"+fishID);

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
            if (metadata.thumbnail_url === null){
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

              console.log(fishModal.attr("id") + " == " + metadata.id);
            if (fishModal.attr("id") === metadata.id){

              fishModal.html(modalGroup);
              shortlist(fishID); // This is to initalise the 2nd Shortlsit button found in the modal
            }
          });
        }

        // Shortlist Handler
        function shortlist(fishID){
          var shortlistButtons = $(".shortlist[data-id='" + fishID + "']");

          shortlistButtons.addClass("active");

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
              $("#results").removeClass("reordering");

              // Update templates for Fish in Queue
              $.each(templateUpdateQueue, function(index, fishID) { 
                metadata = locache.get("metadata-"+fishID);
                updateTemplate(fishID);
              });

               activateAllFish();

            });
          }
        }

        function activateAllFish() {
          console.log("Activate all fish");
          source.find('li').each(function() {
            fishID = $(this).attr("id");
            if (locache.get("metadata-"+fishID)){
              console.log("[Init Fish] -> after sort");
              modalInit(fishID); 
              shortlist(fishID);
            }  
          });
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

            $("#results").addClass("reordering");
            fishpond.query(tags, filters);
          }
        }
      });
    }
  }
};

Application.Query.init();