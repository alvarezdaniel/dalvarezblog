(function () {
    "use strict";

    var feeds = [
            {
                key: "group1",
                url: 'http://blog.alvarezdaniel.com.ar/feeds/posts/default',
                logoUrl: 'http://tensaiweb.info/images/rss_orange.png'
            }
   ];

    var blogPosts = new WinJS.Binding.List();
    var groupedItems = blogPosts.createGrouped(
        function groupKeySelector(item) { return item.group.key; },
        function groupDataSelector(item) { return item.group; }
    );

    var localFolder = Windows.Storage.ApplicationData.current.localFolder;

    function getFeeds() {
        var dataPromises = [];

        // Get the content for each feed and get items from xml.
        feeds.forEach(function (feed) {
            // We bind the data promise to the feed, to update the feed later with its response
            feed.dataPromise = WinJS.xhr({ url: feed.url });
            dataPromises.push(feed.dataPromise);
        });

        return WinJS.Promise.join(dataPromises).then(function () { return feeds; }) // We return the feeds instead of the promise, for signature consistency
    };

    function isInternetAvailable() {
        var internetProfile = Windows.Networking.Connectivity.NetworkInformation.getInternetConnectionProfile();
        return internetProfile != null && internetProfile.getNetworkConnectivityLevel() == Windows.Networking.Connectivity.NetworkConnectivityLevel.internetAccess;
    }

    function getBlogPosts() {
        if (isInternetAvailable()) {
            var pr = document.createElement("progress");
            var header = document.querySelector("header h1");
            header.appendChild(pr);

            return getFeeds()
                .then(function (feeds) {
                    feeds.forEach(function (feed) {
                        feed.dataPromise.then(function (articlesResponse) {
                            var articleSyndication = articlesResponse.responseXML;

                            if (articleSyndication == null) {
                                var parser = new DOMParser();
                                articleSyndication = parser.parseFromString(articlesResponse.responseText, "application/xml");
                            }

                            getGroupInfoFromXml(articleSyndication, feed);
                            getItemsFromXml(articleSyndication, feed);
                        });
                    });
                    writeFile(JSON.stringify(blogPosts));
                })
                .then(function (feeds) {
                    header.removeChild(pr);
                    return feeds;
                });
        } else {
            readFile();
            ShowConnectionError();
        }
    };

    function ShowConnectionError() {
        var popup = Windows.UI.Popups.MessageDialog("Error accessing data.\nPlease insure network connection and retry.", "No connection");
        popup.showAsync();
    }

    function getGroupInfoFromXml(articleSyndication, feed) {
        // Get the blog title and last updated date.
        if (articleSyndication.querySelector("feed") != null) {
            feed.title = articleSyndication.querySelector(
                "feed > title").textContent;
            var ds = articleSyndication.querySelector(
                "feed > updated").textContent;
            var date = ds.substring(5, 7) + "-" + ds.substring(8, 10) + "-" + ds.substring(0, 4);
            var author = articleSyndication.querySelector(
                "author > name").textContent;
            feed.description = "By " + author + " updated " + date;
            feed.subtitle = articleSyndication.querySelector("feed > title").textContent;

            feed.itemsName = "entry";
        } else if (articleSyndication.querySelector("channel") != null) {
            feed.title = articleSyndication.querySelector(
                "channel > title").textContent;
            if (articleSyndication.querySelector("channel > pubDate") != null)
                var ds = articleSyndication.querySelector("channel > pubDate").textContent;
            else if (articleSyndication.querySelector("channel > lastBuildDate") != null)
                var ds = articleSyndication.querySelector("channel > lastBuildDate").textContent;

            if (ds != null && ds != undefined) {
                var date = ds.substring(5, 7) + "-" + ds.substring(8, 11) + "-" + ds.substring(12, 16);
                feed.description = "Updated " + date;
            } else
                feed.description = "";

            feed.subtitle = articleSyndication.querySelector("channel > description").textContent;

            feed.itemsName = "item";
        }
        feed.pubDate = date;
        feed.backgroundImage = feed.logoUrl;
    }

    function getItemsFromXml(articleSyndication, feed) {
        var posts = articleSyndication.querySelectorAll(feed.itemsName);
        // Process each blog post.
        for (var postIndex = 0; postIndex < posts.length; postIndex++) {
            var post = posts[postIndex];
            // Get the title, author, and date published.
            var postTitle = post.querySelector("title").textContent;
            var link = post.querySelector("link").textContent;
            if (link == null || link == "") {
                link = post.querySelector("link").attributes.href.value;
            }
            var contentTag = null;
            var contentTagsUsed = ["encoded", "description", "content"];
            contentTagsUsed.forEach(function (t) {
                if (post.querySelector(t) != null && contentTag == null)
                    contentTag = t;
            });
            var imgInContent = /<img [^>]*src="([^"]*)"[^>]*\/>/.exec(post.querySelector(contentTag).textContent);

            // Avoid duplication if the user refreshes the data
            if (resolveItemReference([feed.key, postTitle]) == undefined) {
                if (feed.itemsName == "entry") {
                    var postAuthor = post.querySelector("author > name").textContent;

                    if (post.querySelector("published") != null)
                        var pds = post.querySelector("published").textContent;
                    else if (post.querySelector("updated") != null)
                        var pds = post.querySelector("updated").textContent;

                    var postDate = pds.substring(5, 7) + "-" + pds.substring(8, 10)
                        + "-" + pds.substring(0, 4);

                    var imageUrl;
                    if (post.querySelector("thumbnail") != null)
                        imageUrl = post.querySelector("thumbnail").attributes.url.value;
                    else if (post.querySelector("img") != null)
                        imageUrl = post.querySelector("img").attributes.src.value;
                    else if (imgInContent != null)
                        imageUrl = imgInContent[1];
                    else
                        imageUrl = feed.logoUrl;

                    // Process the content so that it displays nicely.
                    var staticContent = toStaticHTML(post.querySelector(
                        contentTag).textContent);
                } else if (feed.itemsName == "item") {
                    var postAuthor = feed.title;

                    if (post.querySelector("pubDate") != null) {
                        var pds = post.querySelector("pubDate").textContent;
                        var postDate = pds.substring(5, 7) + "-" + pds.substring(8, 11) + "-" + pds.substring(12, 16);
                    } else
                        var postDate = "";

                    var imageUrl;
                    
                    if (post.querySelector("enclosure") != null)
                        imageUrl = post.querySelector("enclosure").attributes.url.value;
                    else if (post.querySelector("img") != null)
                        imageUrl = post.querySelector("img").attributes.src.value;
                    else if (imgInContent != null)
                        imageUrl = imgInContent[1];
                    else
                        imageUrl = feed.logoUrl;

                    // Process the content so that it displays nicely.
                    var staticContent = toStaticHTML(post.querySelector(
                        contentTag).textContent);
                }

                // Store the post info we care about in the array.
                blogPosts.push({
                    group: feed, key: postTitle, title: postTitle,
                    author: postAuthor, pubDate: postDate, backgroundImage: imageUrl,
                    content: staticContent, link: link, postIndex: postIndex
                });
            };

        }
    }


    function writeFile(content) {
        localFolder.createFileAsync("dataFile.txt", Windows.Storage.CreationCollisionOption.replaceExisting)
           .then(function (dataFile) {
               return Windows.Storage.FileIO.writeTextAsync(dataFile, content);
           });
    }

    function readFile() {
        localFolder.getFileAsync("dataFile.txt")
           .then(function (sampleFile) {
               return Windows.Storage.FileIO.readTextAsync(sampleFile);
           }).done(function (content) {
               var bp = JSON.parse(content);
               while (blogPosts.length > 0) {
                   blogPosts.pop();
               }

               for (var i = 1; i <= bp._lastNotifyLength; i++) {
                   var p = bp._keyMap[i];
                   blogPosts.push({
                       group: p.data.group, key: p.data.key, title: p.data.title,
                       author: p.data.author, pubDate: p.data.pubDate, backgroundImage: p.data.backgroundImage,
                       content: p.data.content
                   });
               }
           }, function () {
           });
    }

    WinJS.Namespace.define("Data", {
        items: groupedItems,
        groups: groupedItems.groups,
        getItemReference: getItemReference,
        getItemsFromGroup: getItemsFromGroup,
        resolveGroupReference: resolveGroupReference,
        resolveItemReference: resolveItemReference,
        refresh: getBlogPosts
    });

    // Get a reference for an item, using the group key and item title as a
    // unique reference to the item that can be easily serialized.
    function getItemReference(item) {
        return [item.group.key, item.title];
    }

    // This function returns a WinJS.Binding.List containing only the items
    // that belong to the provided group.
    function getItemsFromGroup(group) {
        return blogPosts.createFiltered(function (item) { return item.group.key === group.key; });
    }

    // Get the unique group corresponding to the provided group key.
    function resolveGroupReference(key) {
        for (var i = 0; i < groupedItems.groups.length; i++) {
            if (groupedItems.groups.getAt(i).key === key) {
                return groupedItems.groups.getAt(i);
            }
        }
    }

    // Get a unique item from the provided string array, which should contain a
    // group key and an item title.
    function resolveItemReference(reference) {
        for (var i = 0; i < groupedItems.length; i++) {
            var item = groupedItems.getAt(i);
            if (item.group.key === reference[0] && item.title === reference[1]) {
                return item;
            }
        }
    }

})();
