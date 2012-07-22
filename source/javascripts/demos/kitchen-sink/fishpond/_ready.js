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

      if(value.toString() !== hiddenField.val().toString()){
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

  // Init Shorlists
  shortlistListener();

  // Init Comments
  commentsManager(pond);

  // Run Query
  fishpond.query({}, {});
});