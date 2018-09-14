var STATE = new Object({            
    READY: 0,
    LOADING: 1,
    DISPLAYING: 2
});                                 // Enum helper object
var currentState = STATE.READY;     // Used to keep track of the search bar's status (i.e. is it about to load results, is it waiting to, etc)

/// <summary> Creates an article item at the specified location. <summary>
/// <param> name="title" type="String"> The title text to add to the header. <param>
/// <param> name="link" type="String"> The link to the Wikipedia article. <param>
/// <param> name="synopsis" type="String"> A snippet of information from the Wikipedia article. <param>
/// <param> name="location" type="String"> Whether to display the item within the saved items area, or the results area. <param>
function CreateArticle (title, link, synopsis, location) {
    var saved = "";                 // Used to add class text if necessary
    
    switch (location) {
        case "results":
            tag = "#search-results";
            $("#saved-items").find("h1").each(function() {
            if ($(this).text() === title) {
                    saved = " saved";
                    return false;
                }
            });
            break;
        case "save":
            if (synopsis.length > 120) {
                synopsis = synopsis.substr(0,120) + "...";
            }
            tag = "#saved-items";
            break;
    }
    
    $(tag).append(
        "<div class='item'><a href='"+link+"'>"+
        "<h1>"+title+"</h1></a>"+
        "<a class='article-btn"+saved+"'></a>"+
        "<p>"+synopsis+"</p></div>"
    );
}

/// <summary> Function used to animate the loading icon. </summary>
function AnimateLoading() {
    $(".handle").animate({"height":"0%"});
    $(".circle").animate({"height":"99%","width":"99%"}).addClass("spin");
}

/// <summary> Function used to animate the opening of the results area </summary>
function AnimateOpening() {
    $(".circle").removeClass("spin");
    $(".handle, .circle").hide();
    $("#search-container .clear").show();
    $("#search-results").slideToggle();
}

/// <summary> Function used to animate the closing of the results area </summary>
function AnimateClosing() {
    $("#search-container .clear").hide();
    $(".handle").show().animate({"height":"35%"});
    $(".circle").removeClass("spin").show().animate({"height":"65%","width":"65%"});
    $("#search-results").slideUp();
}

/// <summary> Connect to Wikipedia's API and pull results. </summary>
function FetchResults(searchTerm) {
    currentState = STATE.LOADING;
    // Start animating the loading icon before doing anything
    AnimateLoading();
    
    var numberOfResults = $("#num-of-results option:selected").val();
    
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

/// <summary> Using the results from Wikipedia's API, put together article items for the results area </summary>
/// <param name="data" type="String (JSON results)"> The search results </param>
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
            CreateArticle(data[1][i], data[3][i], synopsis,"results");
        }
        
        $("#search-results").append("<p class='marker'>End of results</p>");
        
        // Once everything is loaded, stop the loading animation and open up the results area
        AnimateOpening();
    }
}

/// <summary> Display error message if something goes wrong </summary>
/// <param name="message" type"String"> The error message to display </param>
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

$(document).ready(function() {
    // Add article to saved articles list
    $("#search-results").on("click","a.article-btn",function() {
        if (!$(this).hasClass("saved")) {
            $(this).addClass("saved");
            var title = $(this).siblings("a").text();
            var link = $(this).prev("a").attr("href");
            var synopsis = $(this).next().text();

            if ($("#saved-items").children(".item").length === 0) {
                $("#saved-items").html("");
            }
            CreateArticle(title,link,synopsis,"save");
        }
    });

    // Remove article from saved articles list
    $("#saved-items").on("click","a.article-btn",function() {
        var textToRemove = $(this).siblings("a").text();
        this.closest(".item").remove();
        if ($("#saved-items").children(".item").length === 0) {
            $("#saved-items").html("<p class='placeholder'>No saved items to display.</p>");
        }
        $("#search-results").find("h1").each(function(){
            if ($(this).text() === textToRemove) {
                $(this).parent().siblings(".article-btn").removeClass("saved");
                return false;
            }
        });
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