var Application = Application || {};

Application = {
  Query: {
    init: function () {
      var apiKey = "6OqHqMf609P6tSrxuj2ANuj3S6fAUphnjyOcGWdtD";
      var pondToken = "sC8IZQ";
      var options = { debug: true };
      var fishpond = new Fishpond(apiKey, options);

      Application.Query.setup(fishpond);
      fishpond.init(pondToken);
    },

    //------------------------------------------------------------------------
    setup: function (fishpond) {

      fishpond.resultsUpdated(function(results){
        var source = $("#query #results ul");
        Application.Results.format(results, source);
        Application.Results.filter(source);
      });

      fishpond.ready(function(pond){
        $("#loading").fadeOut(0);
        $("#demo").fadeIn(400);
        $("#demo h1").append(' "' + pond.name + '"');       

        Application.Search.generateForm(pond);
        Application.Search.initSliders(fishpond);
        fishpond.query({}, {});
      });

      fishpond.loading(function(percent){
        $("#loading .progress").removeClass("progress-striped");
        $("#loading .bar").css({width: (percent * 100) + "%"});
      });
    },
   
  },

  //////////////////////////////////////////////////////////////////////////
  Results: {
    format: function (results, source) {
      var list = $("<ul></ul>");
      var listItem;

      $.each(results, function(position, result){ 
        listItem = $("" +
          "<li class='span2' data-id='"+result.fish.id+"'>" +
            "<a class='thumbnail' href='#fishInfo'>" +
              "<strong>" + result.fish.title + "</strong><br />" + result.score + "<br />" +
            "</a>" +
          "</li>");

        list.append(listItem);
      });
    },

    filter: function (source) {
      // Quicksilver
      if(source.find("li").length == 0) {
        source.append(list.find("li"));
        Application.Results.modals(fishpond);
      } else {
        source.quicksand(list.find("li"), {
          // Do nothing
        }, function() {
          Application.Results.modals(fishpond);
        });
      }
    },

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
    }
  },

  //////////////////////////////////////////////////////////////////////////
  Search: {
    generateForm: function (pond) {
      // Dynamically Generate Form Controls        
      var form = $("form fieldset");
      var controlGroup;

      $.each(pond.tag_ids, function(name, token){ 
        controlGroup = $("" +
          "<div class='control-group'>" +
            "<label class='control-label'>" +
              name + " <output>(10)</output>" +
            "</label>" +
            "<div class='controls'>" +
              "<input id='query_tag_"+token+"' data-slug='"+name+"' name='query[tags]["+token+"]' type='hidden' value='6'>" +
              "<div class='slider span2' data-target='query[tags]["+token+"]'></div>" +
            "</div>" +
          "</div>");

        form.append(controlGroup);
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