var Application = Application || {};

Application = {
  Query: {
    init: function () {
      var apiKey = "6OqHqMf609P6tSrxuj2ANuj3S6fAUphnjyOcGWdtD";
      var pondToken = "sC8IZQ";
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
      });

      //------------------------------------------------------------------------
      fishpond.ready(function(pond){

        // Generate form controls
        var formTags = $("fieldset.tags");
        var formFilters = $("fieldset.filters .control-group");
        var tagControlGroup,
            filterControl;

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

        // ------------------------------------------------------------------------
        // GENERATE RESULTS
        // ------------------------------------------------------------------------

        $.each(results, function(position, result){ 
          
          var shortlistActiveClass = null;

          fishID = result.fish.id;
          isShortlisted = localStorage.getItem(fishID + "_shortlisted");

          if (isShortlisted == "true"){
            shortlistActiveClass = "btn-warning icon-white shortlisted";
          }

          // Create empty Fish
          listItem = $("" +
            "<li class='span2' id='"+fishID+"' data-id='"+fishID+"'>" +
              "<div class='thumbnail loading'>" +
                "<strong>" + result.fish.title + "</strong>" +
                "<br /> " + result.fish.id +
                "<div class='details'></div>" +
                "<a href='#' data-id='"+ fishID +"' class='btn btn-mini shortlist "+ shortlistActiveClass +"'><i class='icon-star'></i></a>" +
              "</div>" +
            "</li>");

          // Add empty fish to results
          list.append(listItem);

          // Check if Metadata is cached
          if (result.fish.metadata.url){
            console.warn("Already loaded");
            updateTemplate(fishID, result.fish.metadata);
          } else {
            //loadMetadata(fishID);
          };
        });

        // ------------------------------------------------------------------------
        // FUNCTIONS
        // ------------------------------------------------------------------------

        // Update Fish with Metadata
        function updateTemplate(fishID, metadata){
          resultItem = $("li[data-id='" + fishID + "']");
          resultDetails = $("" +
            "<a class='btn btn-mini btn-primary' href='" + metadata.url + "'>View Demo</a>" +
            "<a class='btn btn-mini launch-modal' href='#fishInfo'>More Info</a>");

          //console.log(resultItem.attr("data-id") + " - Template Updated");

          resultItem.find(".details").html(resultDetails);
          resultItem.find(".loading").removeClass("loading");

          modalInit(fishID, metadata);      
          shortlist(fishID);
        }

        // Shortlist Handler
        function shortlist(fishID){
          var shortlistButtons = $(".shortlist[data-id='" + fishID + "']");

          //console.log("Shortlist " + fishID + " -> " + localStorage.getItem(fishID + "_shortlisted"));

          source.find(shortlistButtons).click(function(e){
            e.preventDefault();
            isShortlisted = localStorage.getItem(fishID + "_shortlisted");

            //console.log("Shortlist RAW " + fishID + " -> " + isShortlisted);

            if (isShortlisted == "true"){
              shortlistButtons.removeClass("btn-warning icon-white");
              localStorage.setItem(fishID + "_shortlisted", "false");
              //console.log("Shortlist Update " + fishID + " -> " + localStorage.getItem(fishID + "_shortlisted"));

            } else {
              shortlistButtons.addClass("btn-warning icon-white");
              localStorage.setItem(fishID + "_shortlisted", "true");
              //console.log("Shortlist Update " + fishID + " -> " + localStorage.getItem(fishID + "_shortlisted"));
            }

            console.log("Shortlist Update " + fishID + " -> " + localStorage.getItem(fishID + "_shortlisted"));

          });
        }

        // Modal handler
        function modalInit(fishID, metadata){
          var shortlistButton = $(".shortlist[data-id='" + fishID + "']");
          var shortlisted = false;

          source.find("li[data-id='" + fishID + "'] .launch-modal").click(function(e){
            e.preventDefault();

            shortlisted = shortlistButton.hasClass("shortlisted");
            

            console.log("is shortlisted? " + shortlisted);

            fishModal = $('#modalTemplate').clone().attr("id",fishID);
            fishModal.modal('show');
            console.log(metadata);

            if (metadata.thumbnail_url === ""){
              // Backup thumbnail
              metadata.thumbnail_url = "http://placehold.it/120x120" ;
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
                    "<br /><br /><a href='#' data-id='"+ fishID +"' class='btn btn-mini shortlist'><i class='icon-star'></i> Add to shortlist</a>" +
                  "</div>" +
                "</div>" +
              "</div>" +
              "<div class='modal-footer'>" +
                "<a href='#' class='btn' data-dismiss='modal'>Close</a>" +
              "</div>");

            if (fishModal.attr("id") === metadata.id){
              fishModal.html(modalGroup);
              //shortlist(fishID);
            }
          });
        }

        // Load Fish's Metadata
        function loadMetadata(fishID){
          var fishMetadata = new $.Deferred();

          fishpond.get_fish(fishID, function(data){
            fishMetadata.resolve("Success -> " + fishID);
            updateTemplate(fishID, data);
          });    

          // Return the Promise so caller can't change the Deferred
          return fishMetadata.promise();
        }

        function metadataLoadedListener(){
          source.find("li").each(function(index) {
            $.when( loadMetadata($(this).attr("id")) ).then(
              function(status){
              //  console.log(status + ' Metadata loaded'); // Resolved
              }
            );                  
          });
        }

        function sortResults() {
          // Sorting Results with Quicksand
          if(source.find("li").length == 0) {
            source.append(list.find("li"));
            console.log("[Quicksand] Init - " + $("#results li").length + " results in list");
            metadataLoadedListener();
          } else {
            source.quicksand(list.find("li"), {
              // Do nothing
            }, function() {
              metadataLoadedListener();
              console.log( '[Results] reordered ' );
            });
          }
        }
        
        // ------------------------------------------------------------------------
        // CALLBACKS
        // ------------------------------------------------------------------------

        sortResults();
        // After Results are Sorted
        /*$.when( sortResults() ).then(
          function(status){
            console.warn( status+' -> Results reordered ' ); // Resolve

            $('#results li').each(function(index) {
              console.log((index+1) + ': ' + $(this).attr("id"));
              loadMetadata($(this).attr("id"));
            });
            //Application.UI.modals(fishpond);

          },
          function(status){
            console.warn( status+' -> Results not reordered ' ); // Reject
          },
          function(status){
            // notify
          }
        ); */

        /*
        $.when( loadMetadata(fishID) ).then(
          function(status){
            console.warn( status+' -> Metadata loaded ' ); // Resolved
          },
          function(status){
            console.warn( status+' -> Metadata Not loaded ' ); // Rejected
          },
          function(status){
            // Notify
          }
        );*/


      });
    }   
  },

  //////////////////////////////////////////////////////////////////////////
  UI: {
    modals: function (fishpond) {

      var modalGroup,
          fishModal,
          fishID;

          console.log("[Modals] Init");

      $('#results a').on('click', function(e){
        e.preventDefault();
        console.log("[Fish] Clicked");
        
        
        /*fishID = $(this).closest('li').attr('data-id');
        fishModal = $('#modalTemplate').clone().attr("id",fishID);

        fishModal.modal('show');

        fishpond.get_fish(fishID, function(data){
          console.log("[Fish] Metadata receieved:");
          console.log(data);

          if (data.thumbnail_url === ""){
            // Backup thumbnail
            data.thumbnail_url = "http://placehold.it/120x120" ;
          }
        
          modalGroup = $("" +
            "<div class='modal-header'>" +
              "<button class='close' data-dismiss='modal'>×</button>" +
              "<h3>" + data.title + "</h3>" +
            "</div>" +
            "<div class='modal-body'>" +
              "<div class='row'>" + 
                "<div class='span2'>" + 
                  "<img src='" + data.thumbnail_url + "' alt='" + data.title + "' />" +
                "</div>" + 
                "<div class='span4'>" + 
                  "<p>" + data.description + "</p>" +
                  "<a href='" + data.url + "' target='_blank'>Find out more</a>" +
                "</div>" +
              "</div>" +
            "</div>" +
            "<div class='modal-footer'>" +
              "<a href='#' class='btn' data-dismiss='modal'>Close</a>" +
            "</div>");

          if (fishModal.attr("id") == data.id){
            fishModal.html(modalGroup);
          }
        });*/
      });
    },

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