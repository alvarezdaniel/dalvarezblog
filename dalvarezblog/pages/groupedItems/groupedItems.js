(function () {
    "use strict";

    var appView = Windows.UI.ViewManagement.ApplicationView;
    var appViewState = Windows.UI.ViewManagement.ApplicationViewState;
    var nav = WinJS.Navigation;
    var ui = WinJS.UI;

    function showAppBar() {
        // Get the app bar.
        var element = document.activeElement;
        var appbar = document.getElementById("appbar");

        // Keep the app bar open after it's shown.
        appbar.winControl.sticky = true;

        // Set the app bar context.
        appbar.winControl.showCommands([markItem]);

        // Show the app bar.
        appbar.winControl.show();

        // Return focus to the original item which invoked the app bar.
        if (element != null) element.focus();
    };

    function hideAppBar() {
        // Get the app bar.
        var element = document.activeElement;
        var appbar = document.getElementById("appbar");

        appbar.winControl.sticky = false;
        appbar.winControl.hideCommands([markItem]);
        if (element != null) element.focus();
    };

    function multisizeItemTemplateRenderer(itemPromise) {
        return itemPromise.then(function (currentItem) {
            var content;
            // Grab the default item template used on the groupeditems page.
            content = document.getElementsByClassName("multisizebaseitemtemplate")[0];
            var result = content.cloneNode(true);

            // For the first item, use the largest template.
            if (currentItem.data.postIndex == 0) {
                result.className = "largeitemtemplate"
            }
            else {
                result.className = "mediumitemtemplate"
            }
            // Because we used a WinJS template, we need to strip off some attributes 
            // for it to render.
            result.attributes.removeNamedItem("data-win-control");
            result.attributes.removeNamedItem("style");
            result.style.overflow = "hidden";

            // Because we're doing the rendering, we need to put the data into the item.
            // We can't use databinding.
            result.getElementsByClassName("item-image")[0].src = currentItem.data.backgroundImage;
            result.getElementsByClassName("item-title")[0].textContent = currentItem.data.title;
            result.getElementsByClassName("item-subtitle")[0].textContent = currentItem.data.pubDate;
            return result;
        });
    }

    function groupInfo() {
        return {
            enableCellSpanning: true,
            cellWidth: 150,
            cellHeight: 150
        };
    }

    ui.Pages.define("/pages/groupedItems/groupedItems.html", {
        // Navigates to the groupHeaderPage. Called from the groupHeaders,
        // keyboard shortcut and iteminvoked.
        navigateToGroup: function (key) {
            nav.navigate("/pages/groupDetail/groupDetail.html", { groupKey: key });
        },

        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {

            //Windows.UI.ApplicationSettings.SettingsPane.getForCurrentView().addEventListener("commandsrequested", function (args) {
            //    args.request.applicationCommands.clear();

            //    var privacyPref = new Windows.UI.ApplicationSettings.SettingsCommand("privacyPref", "Política de Privacidad", function (uiCommand) {
            //        Windows.System.Launcher.launchUriAsync(new Windows.Foundation.Uri("http://masaezapps.azurewebsites.net/politica-privacidad/"));
            //    });

            //    args.request.applicationCommands.append(privacyPref);
            //});

            this.setAppBarCommands();

            Data.refresh();

            var listView = element.querySelector(".groupeditemslist").winControl;
            var listViewZoomOut = element.querySelector(".groupeditemslistZoomOut").winControl;
            var semanticZoom = element.querySelector(".sezoDiv").winControl;
            var itemTemplate = element.querySelector(".itemtemplate");

            this.bindControls(listView, listViewZoomOut, element, options);

            this._initializeLayout(listView, listViewZoomOut, semanticZoom, appView.value, itemTemplate);

            listView.element.focus();
        },

        setAppBarCommands: function () {
            appbar.winControl.disabled = false;
            appbar.winControl.hideCommands([markItem]); // will always show on items selection
            appbar.winControl.hideCommands([pinGroup]);
        },

        bindControls: function (listView, listViewZoomOut, element, options) {

            listViewZoomOut.itemTemplate = element.querySelector(".itemtemplate"); //TODO: Modify to use a different template
            listViewZoomOut.oniteminvoked = this.groupInvoked.bind(this);          //TODO: Tomar decision respecto del uso de grupos

            listView.groupHeaderTemplate = element.querySelector(".headertemplate");
            listView.itemTemplate = element.querySelector(".itemtemplate");
            listView.oniteminvoked = this._itemInvoked.bind(this);
            listView.onselectionchanged = this.itemSelected.bind(this);

            // Set up a keyboard shortcut (ctrl + alt + g) to navigate to the
            // current group when not in snapped mode.
            listView.addEventListener("keydown", function (e) {
                if (appView.value !== appViewState.snapped && e.ctrlKey && e.keyCode === WinJS.Utilities.Key.g && e.altKey) {
                    var data = listView.itemDataSource.list.getAt(listView.currentItem.index);
                    this.navigateToGroup(data.group.key);
                    e.preventDefault();
                    e.stopImmediatePropagation();
                }
            }.bind(this), true);
        },

        groupInvoked: function (args) {
            var group = Data.groups.getAt(args.detail.itemIndex);
            nav.navigate("/pages/groupDetail/groupDetail.html", { groupKey: group.key });
        },


        // This function provides the Elements to be animated by PageControlNavigator on Navigation.
        getAnimationElements: function () {
            return [[this.element.querySelector("header")], [this.element.querySelector("section")]];
        },

        itemSelected: function (eventObject, that) {
            var listView = document.querySelector(".groupeditemslist").winControl;

            // Check for selection.
            if (listView.selection.count() === 0) {
                hideAppBar();
            } else {
                listView.selection.getItems().then(function (items) {
                    showAppBar();
                });
            }
        },


        // This function updates the page layout in response to viewState changes.
        updateLayout: function (element, viewState, lastViewState) {
            /// <param name="element" domElement="true" />

            var listView = element.querySelector(".groupeditemslist").winControl;
            var listViewZoomOut = element.querySelector(".groupeditemslistZoomOut").winControl;
            var semanticZoom = element.querySelector(".sezoDiv").winControl;

            var itemTemplate = element.querySelector(".itemtemplate");

            if (lastViewState !== viewState) {
                if (lastViewState === appViewState.snapped || viewState === appViewState.snapped) {
                    var handler = function (e) {
                        listView.removeEventListener("contentanimating", handler, false);
                        e.preventDefault();
                    };

                    listView.addEventListener("contentanimating", handler, false);
                    this._initializeLayout(listView, listViewZoomOut, semanticZoom, viewState, itemTemplate);

                    appbar.winControl.hideCommands([markItem]);
                    if (viewState === appViewState.snapped) {
                        listView.selectionMode = "none";
                        semanticZoom.zoomedOut = true;
                        semanticZoom.forceLayout();
                    }
                    else
                        listView.selectionMode = "multi";
                }

            }
        },

        // This function updates the ListView with new layouts
        _initializeLayout: function (listView, listViewZoomOut, semanticZoom, viewState, itemTemplate) {
            /// <param name="listView" value="WinJS.UI.ListView.prototype" />

            if (viewState === appViewState.snapped) {
                listView.itemDataSource = Data.groups.dataSource;
                listView.groupDataSource = null;
                listView.itemTemplate = itemTemplate;

                listView.layout = new ui.ListLayout();

                semanticZoom.zoomedOut = false;
                semanticZoom.forceLayout();
                semanticZoom.locked = true;
            } else {
                listView.itemDataSource = Data.items.dataSource;
                listView.groupDataSource = Data.groups.dataSource;
                listView.itemTemplate = multisizeItemTemplateRenderer;
                listView.layout = new ui.GridLayout({ groupInfo: groupInfo, groupHeaderPosition: "top" });

                listViewZoomOut.itemDataSource = Data.groups.dataSource; // TODO: Modify to use a different Data Source
                listViewZoomOut.layout = new ui.GridLayout({ maxRows: 1 });
                semanticZoom.forceLayout();
                semanticZoom.locked = false;
            }
        },

        _itemInvoked: function (args) {
            if (appView.value === appViewState.snapped) {
                // If the page is snapped, the user invoked a group.
                var group = Data.groups.getAt(args.detail.itemIndex);
                this.navigateToGroup(group.key);
            } else {
                // If the page is not snapped, the user invoked an item.
                var item = Data.items.getAt(args.detail.itemIndex);
                nav.navigate("/pages/itemDetail/itemDetail.html", { item: Data.getItemReference(item) });
            }
        }
    });
})();
