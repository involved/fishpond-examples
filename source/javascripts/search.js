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

        // Check to see if Fish has Metadata Cached
        function updateTemplate(fishID, metadata){
          resultItem = $("#results ul").find("[data-id='" + fishID + "']");
          resultDetails = $("" +
            "<a class='btn btn-primary' href='" + metadata.url + "'>View Demo</a>" +
            "<a class='btn' href='#fishInfo'>More Info</a>");

          console.log(resultItem.attr("data-id") + " - Update Template");

          resultItem.find(".details").html(resultDetails);
          resultItem.find(".loading").removeClass("loading");
        }

        function asyncEvent(result){
          var dfd = new jQuery.Deferred();

          if (result.fish.metadata.url){
            updateTemplate(result.fish.id, result.fish.metadata);
          } else {
            fishpond.get_fish(result.fish.id, function(data){
              console.log("fishID => " + result.fish.id);
              updateTemplate(result.fish.id, data)
              dfd.resolve("Success");
            });    
          };


          // Return the Promise so caller can't change the Deferred
          return dfd.promise();
        }


        
        //------------------------------------------------------------------------
        $.each(results, function(position, result){ 
          fishID = result.fish.id;

          // Create empty Fish
          listItem = $("" +
            "<li class='span2' id='"+fishID+"' data-id='"+fishID+"'>" +
              "<div class='thumbnail loading'>" +
                "<strong>" + result.fish.title + "</strong>" +
                "<div class='details'></div>" +
              "</div>" +
            "</li>");

          // Add empty fish to results
          list.append(listItem);


          // Check to see if Fish Metadata has already been loaded, otherwise fetch it.
          // Attach a done, fail, and progress handler for the asyncEvent
          $.when( asyncEvent(result) ).then(
            function(status){
              console.warn( status+' -> Metadata loaded ' );
            },
            function(status){
              console.warn( status+' -> Metadata not loaded ' );
            },
            function(status){
              console.warn("what is this");
              //$("body").append(status);
            }
          ); 

        });
  


        

       
        
        // Sort Results with Quicksilver
        if(source.find("li").length == 0) {
          source.append(list.find("li"));
          Application.UI.modals(fishpond);
        } else {
          source.quicksand(list.find("li"), {
            // Do nothing
          }, function() {
            Application.UI.modals(fishpond);
          });
        }

      });
    }   
  },

  //////////////////////////////////////////////////////////////////////////
  UI: {
    modals: function (fishpond) {
      var modalGroup,
          fishModal,
          fishID;

      $('#results a').on('click', function(e){
        e.preventDefault();
        console.log("[Fish] Clicked");
        fishID = $(this).closest('li').attr('data-id');
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
        });
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