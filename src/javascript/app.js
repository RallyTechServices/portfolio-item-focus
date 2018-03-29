/* global Ext TsConstants TsMetricsMgr _ */
Ext.define("CArABU.app.TSApp", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: 'border',
    items: [{
            xtype: 'panel',
            itemId: 'navigationPanel',
            title: TsConstants.LABEL.SELECT_PROJECT,
            padding: '0 0 10 0',
            autoScroll: true,
            bodyPadding: 5,
            split: true,
            width: "50%",
            region: 'west',
            items: [{
                items: [{
                    xtype: 'rallyprojecttree',
                    itemId: TsConstants.ID.SELECT_PROJECT_CONTROL,
                    stateful: true,
                    stateId: TsConstants.ID.ITEM_SELECTOR_STATE,
                }],
            }]
        },
        {
            xtype: 'panel',
            region: 'center',
            itemId: TsConstants.ID.RESULTS_AREA,
            autoScroll: true,
            items: [{
                xtype: 'panel',
                itemId: TsConstants.ID.SELECT_PI_TYPE_CONTROL
            }, {
                xtype: 'tabpanel',
                itemId: 'tabpanel',
                items: [{
                    xtype: 'panel',
                    itemId: TsConstants.ID.SUMMARY_PANEL,
                    title: TsConstants.LABEL.SUMMARY_PANEL,
                    autoScroll: true,
                    layout: 'vbox',
                    items: [{
                        xtype: 'panel',
                        itemId: 'selectLabel',
                        padding: '20 20 20 20',
                        width: 200,
                        border: false,
                        html: TsConstants.LABEL.SELECT_ITEM
                    }],
                }, {
                    xtype: 'panel',
                    itemId: TsConstants.ID.DETAILS_PANEL,
                    title: TsConstants.LABEL.DETAILS_PANEL,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    autoScroll: true,
                    items: [{
                        xtype: 'panel',
                        itemId: 'selectLabel',
                        padding: '20 20 20 20',
                        width: 200,
                        border: false,
                        html: TsConstants.LABEL.SELECT_ITEM
                    }]
                }],
                region: 'center',
            }, ]
        },
    ],

    config: {
        defaultSettings: {
            WARNING_THRESHOLD: 80
        }
    },

    selectedProject: undefined,
    selectedPiType: undefined,
    availablePiTypes: [],

    launch: function() {
        this.down('#' + TsConstants.ID.SELECT_PI_TYPE_CONTROL).insert(0, {
            xtype: 'rallyportfolioitemtypecombobox',
            itemId: TsConstants.ID.SELECT_PI_TYPE_CONTROL,
            fieldLabel: TsConstants.LABEL.PI_TYPE,
            labelWidth: 125,
            padding: '10 10 10 10',
            defaultSelectionPosition: 'last',
            listeners: {
                scope: this,
                change: this.onPiTypeChange,
                ready: this.onPiTypeReady,
            }
        });

        // Setup event listeners
        this.down('#' + TsConstants.ID.SELECT_PROJECT_CONTROL)
            .on('itemselected', this.onProjectChange, this);

    },

    onProjectChange: function(item) {
        var newValue = item.getRecord();
        if (newValue != this.selectedProject) {
            this.selectedProject = newValue;
            this.updateMetrics();
        }
    },

    onPiTypeReady: function(control) {
        // Build a map of pi types to the string needed to access that PI type
        // from a user story.  This allows pi types to be renamed or reordered
        // without breaking this app. For example:
        /*
            {
                'PortfolioItem/Feature': 'Feature',
                'PortfolioItem/Epic': 'Feature.Parent',
                'PortfolioItem/Initiative': 'Feature.Parent.Parent',
                'PortfolioItem/Theme': 'Feature.Parent.Parent.Parent',
                'PortfolioItem/Group': 'Feature.Parent.Parent.Parent.Parent',
            }
        */
        var availablePiTypes = control.getStore().getRange();
        var parentStr = 'Feature';
        this.typePathMap = {};
        for (var i = availablePiTypes.length; i--; i >= 0) {
            var typePath = availablePiTypes[i].get('TypePath');
            this.typePathMap[typePath] = parentStr;
            parentStr += '.Parent';
        }
    },

    onPiTypeChange: function(control) {
        this.selectedPiType = control.getSelectedType();
        this.updateMetrics();
    },

    updateMetrics: function() {
        var resultsArea = this.down('#' + TsConstants.ID.RESULTS_AREA);
        var summaryArea = this.down('#' + TsConstants.ID.SUMMARY_PANEL);
        var detailsArea = this.down('#' + TsConstants.ID.DETAILS_PANEL);

        if (this.selectedProject && this.selectedPiType) {
            summaryArea.removeAll();
            detailsArea.removeAll();
            resultsArea.setLoading(true);

            TsMetricsMgr.updateFocus(this.selectedProject, this.selectedPiType)
                .then({
                    scope: this,
                    success: function(result) {
                        this.addCharts(this.selectedProject);
                        this.addDetails(this.selectedProject);
                        resultsArea.setLoading(false);
                    }
                });
        }
    },

    addCharts: function(record) {
        var summaryArea = this.down('#' + TsConstants.ID.SUMMARY_PANEL);
        summaryArea.removeAll();

        var outsideCount = record.get('OutsideStoryCount');
        var insideCount = record.get('InsideStoryCount');
        summaryArea.add(this.getChart(outsideCount, insideCount + outsideCount, TsConstants.LABEL.BY_COUNT));

        var outsidePoints = record.get('OutsideStoryPoints');
        var insidePoints = record.get('InsideStoryPoints');
        summaryArea.add(this.getChart(outsidePoints, insidePoints + outsidePoints, TsConstants.LABEL.BY_POINTS));
    },

    addDetails: function(record) {
        var detailsArea = this.down('#' + TsConstants.ID.DETAILS_PANEL);
        detailsArea.removeAll();
        var appHeight = this.getHeight();
        var typePickerHeight = this.down('#' + TsConstants.ID.SELECT_PI_TYPE_CONTROL).getHeight();
        // Workaround because rallytreegrid has zero height without explicit height setting
        var gridHeight = (appHeight - typePickerHeight - 80) / 2;

        // Add the grid of outside stories
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            model: 'HierarchicalRequirement',
            context: {
                project: null
            },
            fetch: TsConstants.FETCH.USER_STORY,
            autoLoad: true,
            enableHierarchy: false,
            filters: record.get('OutsideStoriesFilter')
        }).then({
            scope: this,
            success: function(store) {
                detailsArea.add({
                    xtype: 'panel',
                    collapsible: true,
                    title: TsConstants.LABEL.OUTSIDE_PROJECT + ' (' + record.get('OutsideStoryCount') + ')',
                    items: [{
                        xtype: 'rallygridboard',
                        height: gridHeight,
                        stateful: true,
                        stateId: TsConstants.ID.OUTSIDE_STORY_GRID,
                        gridConfig: {
                            store: store,
                            columnCfgs: TsConstants.SETTING.DEFAULT_DETAILS_FIELDS,
                            enableRanking: false
                        },
                        plugins: [{
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'left',
                            modelNames: ['HierarchicalRequirement'],
                        }, ],
                        listeners: {
                            boxready: function(grid) {
                                grid.setLoading(true);
                            },
                            load: function(grid) {
                                grid.setLoading(false);
                            }
                        }
                    }]
                });
            }
        });

        // Add the grid of inside stories
        Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
            model: 'HierarchicalRequirement',
            context: {
                project: null
            },
            fetch: TsConstants.FETCH.USER_STORY,
            autoLoad: true,
            enableHierarchy: false,
            filters: record.get('InsideStoriesFilter')
        }).then({
            scope: this,
            success: function(store) {
                detailsArea.add({
                    xtype: 'panel',
                    collapsible: true,
                    title: TsConstants.LABEL.INSIDE_PROJECT + ' (' + record.get('InsideStoryCount') + ')',
                    items: [{
                        xtype: 'rallygridboard',
                        height: gridHeight,
                        stateful: true,
                        stateId: TsConstants.ID.INSIDE_STORY_GRID,
                        gridConfig: {
                            store: store,
                            columnCfgs: TsConstants.SETTING.DEFAULT_DETAILS_FIELDS,
                            enableRanking: false
                        },
                        plugins: [{
                            ptype: 'rallygridboardfieldpicker',
                            headerPosition: 'left',
                            modelNames: ['HierarchicalRequirement'],
                        }],
                        listeners: {
                            boxready: function(grid) {
                                grid.setLoading(true);
                            },
                            load: function(grid) {
                                grid.setLoading(false);
                            }
                        }
                    }]
                });
            }
        });
    },

    getChart: function(outside, total, title) {
        // Set a warning color if the percent inside the project is less than the warning threshold
        var setWarning = ((total - outside) / total) * 100 < this.getSetting(TsConstants.SETTING.WARNING_THRESHOLD) ? true : false;
        var pointFormatter = function() {
            return this.point.y + ' ' + this.point.name + '<br/><b>( ' + Math.round(this.point.percentage) + '% )</b>';
        };

        return {
            xtype: 'rallychart',
            loadMask: false,
            chartData: {
                series: [{
                    //name: TsConstants.LABEL.CHART_SUBTITLE + ' ' + this.selectedPiType.get('Name'),
                    //colors: TsConstants.CHART.COLORS,
                    borderColor: '#000000',
                    dataLabels: {
                        formatter: pointFormatter,
                        //distance: -30
                    },
                    data: [{
                        name: TsConstants.LABEL.INSIDE_PROJECT,
                        color: TsConstants.CHART.OK,
                        y: total - outside,
                    }, {
                        name: TsConstants.LABEL.OUTSIDE_PROJECT,
                        color: setWarning ? TsConstants.CHART.WARNING : TsConstants.CHART.NORMAL_1,
                        y: outside
                    }],
                    enableMouseTracking: false
                }]
            },
            chartConfig: {
                chart: {
                    type: 'pie',
                    height: "400",
                },
                plotOptions: {
                    pie: {
                        size: '75%',
                    }
                },
                subtitle: {
                    text: TsConstants.LABEL.getChartSubtitle(this.selectedPiType.get('Name'))
                },
                title: {
                    text: title
                }
            }
        }
    },

    percentRenderer: function(part, whole) {
        var result;
        if (part == undefined || whole == undefined) {
            // The metric hasn't been computed
            result = 'Loading...';
        }
        else {
            result = Math.round(part / whole * 100);
            if (isNaN(result) || !isFinite(result)) {
                result = '--';
            }
            else {
                var warningThreshold = this.getSetting(TsConstants.SETTING.WARNING_THRESHOLD);
                var classes = '';
                if (result < warningThreshold) {
                    classes = 'caution'
                }
                result = '<div class="' + classes + '">' + result + '%</div>';
            }
        }
        return result;
    },

    getSettingsFields: function() {
        return [{
            xtype: 'rallynumberfield',
            name: TsConstants.SETTING.WARNING_THRESHOLD,
            label: TsConstants.LABEL.WARNING_THRESHOLD,
            labelWidth: 200,
            maxValue: 100,
            minValue: 0,
            allowDecimals: false
        }];
    },

    getOptions: function() {
        var options = [{
            text: 'About...',
            handler: this._launchInfo,
            scope: this
        }];

        return options;
    },

    _launchInfo: function() {
        if (this.about_dialog) { this.about_dialog.destroy(); }

        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink', {
            showLog: this.getSetting('saveLog'),
            logger: this.logger
        });
    },

    isExternal: function() {
        return typeof(this.getAppId()) == 'undefined';
    }

});
