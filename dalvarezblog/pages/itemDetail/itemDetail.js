(function () {
    "use strict";

    var storage = Windows.Storage;
    var dtm = Windows.ApplicationModel.DataTransfer.DataTransferManager;
    var item;

    WinJS.UI.Pages.define("/pages/itemDetail/itemDetail.html", {


        // This function provides the Elements to be animated by PageControlNavigator on Navigation.
        getAnimationElements: function () {
            return [[this.element.querySelector("article")]];
        },

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {

            this.setAppBarCommands();

            item = options && options.item ? Data.resolveItemReference(options.item) : Data.items.getAt(0);
            element.querySelector(".titlearea .pagetitle").textContent = item.group.title;
            element.querySelector("article .item-title").textContent = item.title;
            element.querySelector("article .item-subtitle").textContent = item.pubDate;
            //element.querySelector("article .item-link").attributes.href.value = item.link;
            element.querySelector("article .item-content").innerHTML = item.content;
            element.querySelector(".content").focus();

            dtm.getForCurrentView().addEventListener("datarequested", this.onDataRequested);
        },

        onDataRequested: function (e) {
            var request = e.request;
            request.data.properties.title = item.title;
            request.data.properties.description = "Por " + item.author;

            // We are sharing the full content... keeping the original link and sharing it may be a better idea..
            var formatted = Windows.ApplicationModel.DataTransfer.HtmlFormatHelper.createHtmlFormat(item.content);
            request.data.setHtmlFormat(formatted);
        },

        unload: function () {
            WinJS.Navigation.removeEventListener("datarequested", this.onDataRequested);
        },

        setAppBarCommands: function () {
            appbar.winControl.disabled = true;
        }
    });
})();
