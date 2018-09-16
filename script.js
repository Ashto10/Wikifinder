(function() {
  'use strict';

  /** Enum helper object */
  const STATE = Object.freeze({            
    READY: 0,
    LOADING: 1,
    DISPLAYING: 2
  });

  let savedArticles = {};

  class article {
    constructor(title, link, synopsis) {
      this.title = title;
      this.link = link;
      this.synopsis = synopsis;
    }

    /** 
    * Creates an article item at the specified location.
    * @param {String} location - Whether to display the item within the saved items area, or the results area.
    */
    createArticle(location, btnText) {
      $(location).append(
        `<div class="item"><a href="${this.link}" target="wikifinder">`+
        `<h1>${this.title}</h1></a>`+
        `<button class="article-btn">${btnText}</button>`+
        `<p>${this.synopsis.length > 120 ? this.synopsis.substr(0,120) + "..." : this.synopsis}</p></div>`
      );
    }
  }

  /** Used to keep track of the search bar's status (i.e. is it about to load results, is it waiting to, etc) */
  var currentState = STATE.READY;     

  /** Function used to animate the loading icon. */
  function AnimateLoading() {
    $(".handle").animate({"height":"0%"});
    $(".circle").animate({"height":"99%","width":"99%"}).addClass("spin");
  }

  /** Function used to animate the opening of the results area. **/
  function AnimateOpening() {
    $(".circle").removeClass("spin");
    $(".handle, .circle").hide();
    $("#search-container .clear").show();
    $("#search-results").slideToggle();
  }

  /** Function used to animate the closing of the results area. */
  function AnimateClosing() {
    $("#search-container .clear").hide();
    $(".handle").show().animate({"height":"35%"});
    $(".circle").removeClass("spin").show().animate({"height":"65%","width":"65%"});
    $("#search-results").slideUp();
  }

  /**
  * Connect to Wikipedia's API and pull results.
  * @param {String} searchTerm - the query to look for.
  */
  function FetchResults(searchTerm) {
    currentState = STATE.LOADING;
    // Start animating the loading icon before doing anything
    AnimateLoading();

    var numberOfResults = $("#results-count option:selected").val();

    $.ajax({
      dataType:"json",
      cache: false,
      url: 'https://en.wikipedia.org/w/api.php?action=opensearch&datatype=json&limit='+numberOfResults+'&search='+searchTerm+'&callback=?',
      success: function(data) {
        BuildResults(data); 
      },
      error: function() {
        DisplayError("Unable to load");
      }, timeout: 10000
    });
  }

  /**
  * Using the results from Wikipedia's API, put together article items for the results area. 
  * @param {Object} data - The search results.
  */
  function BuildResults (data) {
    currentState = STATE.DISPLAYING;
    $("#search-results").html("");

    var numberOfResults = data[1].length;

    $("#search-results").append("<p class='marker'>Displaying "+numberOfResults+" results</p>");

    if (numberOfResults === 0) {
      DisplayError("No results found");
    } else {
      for (var i = 0; i < data[1].length; i++) {
        var synopsis = data[2][i];
        if (synopsis === "") {
          // Placeholder text if article has no synopsis
          synopsis = "A summary is not available for this article";
        }
        new article(data[1][i], data[3][i], synopsis).createArticle("#search-results", 'Save');
      }

      $("#search-results").append("<p class='marker'>End of results</p>");

      // Once everything is loaded, stop the loading animation and open up the results area
      AnimateOpening();
    }
  }

  /**
  * Display error message if something goes wrong.
  * @param {String} message - The error message to display.
  */
  function DisplayError(message) {
    currentState = STATE.READY;
    // Close down the resuls area if necessary
    AnimateClosing();
    $("#error-container .error").text(message);
    $("#error-container").slideDown();
    // Auto clear after 5 seconds
    setTimeout(function() {
      $("#error-container .clear").trigger("click");
    },5000);
  }

  function saveArticle(el) {
    document.getElementById('placeholder').style.display = 'none';
    if (!$(el).hasClass("saved")) {
      $(el).addClass("saved");
      var title = $(el).siblings("a").text();
      var link = $(el).prev("a").attr("href");
      var synopsis = $(el).next().text();

      if (!savedArticles.hasOwnProperty(title)) {
        savedArticles[title] = new article(title, link, synopsis).createArticle("#saved-items", "Clear");
      }
    }
  }

  function deleteArticle(el) {
    var textToRemove = $(el).siblings("a").text();
    el.closest(".item").remove();
    $("#search-results").find("h1").each(function() {
      if ($(this).text() === textToRemove) {
        $(this).parent().siblings(".article-btn").removeClass("saved").text('Save');
      }
    });

    delete savedArticles[textToRemove];

    if ($("#saved-items").children(".item").length === 0) {
      document.getElementById('placeholder').style.display = 'block';
    }
  }

  $(document).ready(function() {

    // Add article to saved articles list
    $("#search-results").on("click",".article-btn",function(event) {
      $(this).text('Saved');
      saveArticle(this);
    });

    // Remove article from saved articles list
    $("#saved-items").on("click",".article-btn",function() {
      deleteArticle(this);
    });

    // Slide saved items list in/out
    $("#saved-item-btn").click(function() {
      var test = $("#saved-item-container").css("left");
      if (test == "-300px") {
        $("#saved-item-container").animate({"left":"0px"},"ease-in");
      } else if (test == "0px") {
        $("#saved-item-container").animate({"left":"-300px"},"ease-out");
      }
    });

    // Clear error screen
    $("#error-container .clear").click(function() {
      $("#error-container").slideUp();
    });

    // Initiate search when magnifying glass is clicked
    $("#search-btn").click(function() {
      var searchTerm = $("#search-bar").val();
      if (currentState == STATE.READY && searchTerm !== "") {
        FetchResults(searchTerm);
      } else if (currentState == STATE.DISPLAYING) {
        AnimateClosing();
        currentState = STATE.READY;
      }
    });

    // Close results area when text is altered
    $("#search-bar").on("input", function(e) {
      var inputText = $("#search-bar").val();
      if (inputText === "" ) {
        $("#search-btn").removeClass("active");
      } else {
        $("#search-btn").addClass("active");
      }
      if (currentState != STATE.READY) {
        currentState = STATE.READY;
        AnimateClosing();
      }
    });

    // Initiate search when user hits enter key into search bar
    $('#search-bar').keyup(function(e){
      if(e.keyCode == 13)
      {
        $("#search-btn").trigger("click");
      }
    });
  });
})();