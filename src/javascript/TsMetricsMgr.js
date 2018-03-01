/* global Ext _ Rally TsConstants Deft TsUtils TsPiFocus */
Ext.define('TsMetricsMgr', function() {
    var storyFields = ['ObjectID', 'PlanEstimate'];

    return {
        statics: {
            updateFocus: updateFocus
        }
    }

    function updateFocus(project, piType) {
        if (project) {
            var projectOid = project.get('ObjectID');
            var piTypePath = piType.get('TypePath');
            return getDescendentProjects(projectOid)
                .then(function(projects) {
                    var projectOids = _.map(projects, function(item) {
                        return item.get('ObjectID');
                    });
                    return Deft.Promise.all(
                        [
                            getAllLeafStories(projectOids),
                            getStoriesFromPisNotInProjects(projectOids, piTypePath)
                        ]);
                }).then(function(result) {
                    var allStories = result[0];
                    var storiesFromPisNotInProjects = result[1];
                    var metrics = getMetrics(allStories, storiesFromPisNotInProjects);
                    TsUtils.updateRecord(project, metrics, TsPiFocus);
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

    function getAllLeafStories(projectOids) {
        var projectQueries = _.map(projectOids, function(oid) {
            return {
                property: 'Project.ObjectID',
                value: oid
            }
        });
        var projectFilter = Rally.data.wsapi.Filter.or(projectQueries);
        var childrenFilter = new Rally.data.wsapi.Filter({
            property: 'DirectChildrenCount',
            value: 0
        });

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'HierarchicalRequirement',
            context: {
                project: null
            },
            fetch: storyFields,
            limit: Infinity,
            autoLoad: true,
            filters: childrenFilter.and(projectFilter)
        });
        return store.load();
    }

    function getStoriesFromPisNotInProjects(projectOids, piTypePath) {
        // TODO make dynamic
        var typePathMap = {
            'PortfolioItem/Feature': 'Feature',
            'PortfolioItem/Epic': 'Feature.Parent',
            'PortfolioItem/Initiative': 'Feature.Parent.Parent',
            'PortfolioItem/Theme': 'Feature.Parent.Parent.Parent',
            'PortfolioItem/Group': 'Feature.Parent.Parent.Parent.Parent',
        };

        // Only leaf stories
        var childrenFilter = new Rally.data.wsapi.Filter({
            property: 'DirectChildrenCount',
            value: 0
        });

        // Only stories in any of these projects
        var projectQueries = _.map(projectOids, function(oid) {
            return {
                property: 'Project.ObjectID',
                value: oid
            }
        });
        var projectFilter = Rally.data.wsapi.Filter.or(projectQueries);

        // Only stories descendent from a PI that is NOT owned by any of these projects
        var piQueries = _.map(projectOids, function(oid) {
            return {
                property: typePathMap[piTypePath] + '.Project.ObjectID',
                operator: '!=',
                value: oid
            }
        });
        var piFilter = Rally.data.wsapi.Filter.and(piQueries);

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'HierarchicalRequirement',
            context: {
                project: null
            },
            fetch: storyFields,
            limit: Infinity,
            autoLoad: true,
            filters: childrenFilter.and(projectFilter).and(piFilter)
        });
        return store.load();
    }

    function getMetrics(allStories, storiesFromPisNotInProjects) {
        var totalPoints = _.reduce(allStories, function(accumulator, story) {
            accumulator += story.get('PlanEstimate');
            return accumulator;
        }, 0);

        var pisNotInProjectPoints = _.reduce(storiesFromPisNotInProjects, function(accumulator, story) {
            accumulator += story.get('PlanEstimate');
            return accumulator;
        }, 0);

        return Ext.create('TsPiFocus', {
            TotalStoryCount: allStories.length,
            TotalPoints: totalPoints,
            PisNotInProjectStoryCount: storiesFromPisNotInProjects.length,
            PisNotInProjectStoryPoints: pisNotInProjectPoints,

        });
    }

});
