(function() {
  'use strict';

  /** Shorthand functions for selecting elements. */
  const $ = {
    getID: el => document.getElementById(el),
    query: (parent, search) => parent.querySelector(search)
  };

  /** Object used to track displayed articles */
  let searchResults = {};

  /** Object used to track saved articles */
  let savedArticles = {};

  /**
  * Get requested data from API and unpack the received JSONP.  
  * @param {String} url - the site to get information from.
  * @param {String} loadTime - An alloted amount of time before firing timeout.
  * @return {Promise}
  */
  function execJSONP(url, loadTime) {  
    return new Promise((resolve, reject) => {
      let script = document.createElement('script');
      let cb = 'exec'+Math.floor((Math.random()*65535)+1);
      script.async = true;
      script.src = url + '&callback=' + cb;
      script.id = cb;

      document.getElementsByTagName('head')[0].appendChild(script);

      let deleteSrc = () => {
        let scr = $.getID(cb);
        scr.parentNode.removeChild(scr);
        window[cb] = null;
        delete window[cb];
      };

      let timeout = setTimeout(() => {
        reject('timed out');
        deleteSrc();
      }, loadTime);

      window[cb] = (data) => {
        resolve(data);
        clearTimeout(timeout);
        deleteSrc();
      };
    });
  }

  class Article {
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
      this.element = document.createElement('div');
      this.element.setAttribute('class', 'article');
      this.element.innerHTML = `
        <a class="article-link" href="${this.link}" target="wikifinder">
        <h1 class="article-title">${this.title}</h1></a>
        <button class="article-btn">${btnText}</button>
        <p class="article-synopsis">${this.synopsis}</p>`;
      $.getID(location).appendChild(this.element);
    }
    
    /**
    * Mark button as pressed via styling.
    */
    setButton() {
      let button = $.query(this.element, '.article-btn');
      button.classList.add('saved');
      button.innerHTML = 'Saved';
    }
  }
  
  /** Animate opening the results area, and hide the magnifying glass. **/
  function AnimateOpening() {
    $.getID('magnifier').style.display = 'none';
    $.query(document, "#search-btn .clear").style.display = 'block';
    $.getID('search-results').classList.remove("hidden");
  }

  /** Animate closing the results area, and display the magnifying glass. */
  function AnimateClosing() {
    $.getID('magnifier').classList.remove('spin');
    $.query(document, "#search-btn .clear").style.display = 'none';
    $.getID('magnifier').style.display = 'block';
    $.getID('search-results').classList.add("hidden");
  }

  /**
  * Connect to Wikipedia's API and pull results.
  * @param {String} searchTerm - the query to look for.
  */
  function FetchResults(searchTerm) {
    if (searchTerm === "") {
      return;
    }
    searchResults = {};

    // Start animating the loading icon before doing anything
    $.getID('magnifier').classList.add('spin');

    let numberOfResults = $.query(document, "#results-count option:checked").getAttribute('value');
    let url = 'https://en.wikipedia.org/w/api.php?action=opensearch&datatype=json&limit='+numberOfResults+'&search='+searchTerm;

    execJSONP(url, 10000).then(data => {
      BuildResults(data);
    }).catch(error => {
      console.log(error);
    });
  }

  /**
  * Using the results from Wikipedia's API, put together articles for the results area. 
  * @param {Object} data - The search results.
  */
  function BuildResults (data) {
    let results = $.getID('search-results');
    results.innerHTML = "";

    let numberOfResults = data[1].length;
    if (numberOfResults === 0) { return DisplayError("No results found"); }

    let topMarker = document.createElement('p');
    topMarker.classList = 'marker';
    topMarker.innerHTML = `Displaying ${numberOfResults} results`;
    let bottomMarker = topMarker.cloneNode(false);
    bottomMarker.innerHTML = `End of results`;    

    results.appendChild(topMarker);

    for (let i = 0; i < data[1].length; i++) {
      let title = data[1][i];
      let synopsis = data[2][i] === "" ? "A summary is not available for this article." : data[2][i];
      let article = new Article(title, data[3][i], synopsis);
      article.createArticle("search-results", 'Save');
      searchResults[title] = article;
      if (savedArticles.hasOwnProperty(title)) {
        article.setButton();
      }
    }

    results.appendChild(bottomMarker);

    // Once everything is loaded, stop the loading animation and open up the results area
    AnimateOpening();
  }

  /**
  * Display error message if something goes wrong.
  * @param {String} message - The error message to display.
  */
  function DisplayError(message) {
    // Close down the resuls area if necessary
    AnimateClosing();
    let error = $.getID('error-container');
    $.query(document, '#error-container .error').innerHTML = message;
    error.classList.remove('hidden');

    // Auto clear after 5 seconds
    setTimeout(() => error.classList.add('hidden'),5000);
  }
  
  /**
  * Creates a copy of an article element, and saves it to the user's list.
  * @param {HTMLElement} el - the article element calling this function. 
  */
  function saveArticle(el) {
    if (!el.classList.contains('saved')) {
      $.getID('placeholder').style.display = 'none';

      let title = $.query(el, '.article-title').innerHTML;
      let link = $.query(el, '.article-link').getAttribute('href');
      let synopsis = $.query(el, '.article-synopsis').innerHTML;

      if (synopsis.length > 120) {
        let space = synopsis.indexOf(' ', 120);
        synopsis = synopsis.substr(0, space) + '...';
      }
      
      searchResults[title].setButton();

      if (!savedArticles.hasOwnProperty(title)) {
        savedArticles[title] = new Article(title, link, synopsis).createArticle("saved-articles", "Clear");
      }
    }
  }

  /**
  * Delete the element from the user's saved article list
  * @param {HTMLElement} el - the article element calling this function. 
  */
  function deleteArticle(el) {  
    let title = $.query(el, '.article-title').innerHTML;
    if (searchResults[title]) {
      let button = $.query(searchResults[title].element, '.article-btn');
      button.innerHTML = "Save";
      button.classList.remove('saved');
    }

    el.parentNode.removeChild(el);
    delete savedArticles[title];

    // If article is in search results, reenable save button
    if ($.getID('saved-articles').childElementCount === 1) {
      $.getID('placeholder').style.display = 'block';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Add article to saved articles list
    $.query(document, '#search-results').addEventListener('click', e => {
      if (e.target && e.target.classList.contains('article-btn')) {
        saveArticle(e.target.parentNode);
      }
    });


    // Remove article from saved articles list
    $.query(document, '#saved-articles').addEventListener('click', e => {
      if (e.target && e.target.classList.contains('article-btn')) {
        deleteArticle(e.target.parentNode);
      }
    });

    // Slide saved article list in/out
    $.getID('saved-article-btn').addEventListener('click', () => {
      $.getID('saved-article-container').classList.toggle('hidden');
    });

    let errorContainer = $.getID('error-container');
    
    // Clear error screen
    $.query(errorContainer, ".clear").addEventListener('click', () => {
      errorContainer.classList.add('hidden');
    });

    // Close results area
    $.query(document, '#search-btn .clear').addEventListener('click', () => {
      AnimateClosing();
    });

    let searchBar = $.getID('search-bar');
    
    // Initiate search when magnifying glass is clicked
    $.getID('magnifier').addEventListener('click', () => {
      FetchResults(searchBar.value);
    });

    // Handle input into searchbar
    searchBar.addEventListener('keyup', e => {
      if (searchBar.value === "") {
        $.getID('search-btn').classList.remove('active');
      } else {
        $.getID('search-btn').classList.add('active');
      }
      // Close search area if user types while it's open
      if ($.getID('search-results').classList !== 'hidden') {
        AnimateClosing();
      }
      // Initiate search when pressing [Enter].
      if (e.keyCode === 13) {
        FetchResults(searchBar.value);
      }
    });
  });
})();