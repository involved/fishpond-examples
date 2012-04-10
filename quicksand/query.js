var Application = Application || {};

Application.Query = function(){
  var container = $("section#query");
  var api_key = container.data('api_key');
  var pond_id = container.data('pond_id');

  options = { development: true, debug: false };
  fishpond = new Fishpond(api_key, options);

  fishpond.resultsUpdated(function(results){
    var source = $("#results ul", container)

    var list = $("<ul></ul>");
    list.addClass("thumbnails");

    for(var resultIndex in results){
      var result = results[resultIndex];
      var listItem = $("<li></li>");
      var thumbnail = $("<div></div>");

      listItem.addClass("span2");
      listItem.attr('data-id', result.fish.id);

      thumbnail.html("<strong>" + result.fish.title + "</strong><br />" + result.score);
      thumbnail.addClass("thumbnail");

      source.find("li[data-id='" + result.fish.id + "'] .thumbnail").html(thumbnail.html());

      listItem.append(thumbnail);
      list.append(listItem);
    }
    if(source.find("li").length == 0) {
      source.append(list.find("li"));
    } else {
      source.quicksand(list.find("li"));
    }
  });

  fishpond.loading(function(percentage){
    $(".progress .bar", container).width((percentage * 100) + "%");
  });

  fishpond.ready(function(pond){
    $(".slider").slider({
      value: 6,
      min: 1,
      max: 11,
      step: 0.1,
      slide: function(e, ui){
        var label = $(this).parents('.control-group').find('label');
        var hiddenField = $("input[name='" + $(this).data('target') + "']");
        var value = Math.round(Math.abs(12 - ui['value']));

        if(value.toString() != hiddenField.val().toString()){
          hiddenField.val(value);
          label.html(label.html().split("(")[0] + " (" + value.toString() + ")");

          var tags = {};
          var filters = {};
          $("form input").each(function(){
            tags[$(this).data('slug')] = $(this).val();
          });
          fishpond.query(tags, filters);
        }
      }
    });

    fishpond.query({}, {});
    $(".progress").removeClass("active");
    $(".loading").delay(500).fadeOut(200);
    $(".form-and-results", container).fadeOut(1);
    $(".form-and-results", container).delay(500).fadeIn(200);
  });

  fishpond.init(pond_id);
  return true;
};

Application.Query.init = function(){
  if($("section#query").length > 0){
    return new Application.Query();
  }
};

$(Application.Query.init());