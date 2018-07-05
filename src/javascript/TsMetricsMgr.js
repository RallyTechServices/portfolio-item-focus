/* global Ext _ Rally TsConstants Deft TsUtils TsPiFocus */
Ext.define('TsMetricsMgr', function() {

    return {
        statics: {
            updateFocus: updateFocus
        }
    }

    /**
     * Get stories assigned to PIs at the given piTypePath level
     * where the PI belongs to a project outside vs inside of the selected project tree.
     */
    function updateFocus(project, piType, piTypePathMap) {
        if (project) {
            var projectOid = project.ObjectID;
            var piTypePath = piType.get('TypePath');
            return getDescendentProjects(projectOid)
                .then(function(projects) {
                    var projectOids = _.map(projects, function(item) {
                        return item.get('ObjectID');
                    });
                    var insideStoriesFilter = getLeafStoriesFilter()
                        .and(getProjectsFilter(projectOids, true))
                        .and(getPiFilter(projectOids, piTypePath, piTypePathMap, true));
                    var outsideStoriesFilter = getLeafStoriesFilter()
                        .and(getProjectsFilter(projectOids, true))
                        .and(getPiFilter(projectOids, piTypePath, piTypePathMap, false));
                    return Deft.Promise.all(
                            [
                                loadStories(insideStoriesFilter),
                                loadStories(outsideStoriesFilter),
                            ])
                        .then(function(results) {
                            var insideStories = results[0];
                            var outsideStories = results[1];

                            var insideCount = insideStories.length;
                            var insidePoints = _.reduce(insideStories, function(accumulator, story) {
                                return accumulator += story.get('PlanEstimate');
                            }, 0);

                            var outsideCount = outsideStories.length;
                            var outsidePoints = _.reduce(outsideStories, function(accumulator, story) {
                                return accumulator += story.get('PlanEstimate');
                            }, 0);

                            var metrics = Ext.create('TsPiFocus', {
                                InsideStoriesFilter: insideStoriesFilter,
                                OutsideStoriesFilter: outsideStoriesFilter,
                                OutsideStoryCount: outsideCount,
                                OutsideStoryPoints: outsidePoints,
                                InsideStoryCount: insideCount,
                                InsideStoryPoints: insidePoints,
                            });
                            return metrics;
                        });
                });
        }
    }

    function getDescendentProjects(projectOid) {
        var queries = _.forEach(TsUtils.getParentQueries(), function(query) {
            query.property += ".ObjectID";
            query.value = projectOid;
        });
        // Include the parent project itself
        queries.push({
            property: "ObjectID",
            value: projectOid
        })
        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'Project',
            fetch: ['ObjectID'],
            context: {
                project: null
            },
            limit: Infinity,
            autoLoad: false,
            filters: Rally.data.wsapi.Filter.or(queries),
        });

        return store.load();
    }

    function getLeafStoriesFilter() {
        return new Rally.data.wsapi.Filter({
            property: 'DirectChildrenCount',
            value: 0
        });
    }

    /**
     * @param projectOids leaf stories under one of these projects
     * @param inProjects (boolean) true for stories in one of the projects, false for stories NOT in one of the projects
     */
    function getProjectsFilter(projectOids, inProjects) {
        var result;
        var queries = _.map(projectOids, function(oid) {
            return {
                property: 'Project.ObjectID',
                operator: inProjects ? '=' : '!=',
                value: oid
            }
        });
        if (inProjects) {
            result = Rally.data.wsapi.Filter.or(queries);
        }
        else {
            result = Rally.data.wsapi.Filter.and(queries);
        }
        return result;
    }

    // Only stories descendent from a PI that is owned (or now) by any of these projects
    function getPiFilter(projectOids, piTypePath, piTypePathMap, inProjects) {
        var result;
        var queries = _.map(projectOids, function(oid) {
            return {
                property: piTypePathMap[piTypePath] + '.Project.ObjectID',
                operator: inProjects ? '=' : '!=',
                value: oid
            }
        });
        if (inProjects) {
            result = Rally.data.wsapi.Filter.or(queries);
        }
        else {
            result = Rally.data.wsapi.Filter.and(queries);
        }
        return result;
    }

    function loadStories(filters) {
        return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            model: 'HierarchicalRequirement',
            context: {
                project: null
            },
            fetch: TsConstants.FETCH.USER_STORY,
            autoLoad: false,
            enableHierarchy: false,
            filters: filters,
            enableRootLevelPostGet: true,
        }).then(function(store) {
            return loadAllData(store);
        });
    }

    /**
     * Given a tree store, load ALL of the data into an array and return the array.
     * By default, the tree store will only load the current page at a time.
     * 
     * @returns A promise that resolves with all the data (instead of just a page worth)
     */
    function loadAllData(store, accumulator) {
        if (!accumulator) {
            accumulator = [];
        }

        return store.load().then(function(results) {
            accumulator = accumulator.concat(results);
            var totalCount = store.getTotalCount();
            var loadedCount = accumulator.length;
            if (loadedCount < totalCount) {
                store._setCurrentPage(store.currentPage + 1);
                return loadAllData(store, accumulator);
            }
            else {
                store._setCurrentPage(1);
                return accumulator;
            }
        });
    }
});
