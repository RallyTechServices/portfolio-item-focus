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
            itemId: 'resultPanel',
            title: TsConstants.LABEL.CHART_AREA_TITLE,
            autoScroll: true,
            layout: 'vbox',
            region: 'center',
            items: [
                // pi type selection control here,
                {
                    xtype: 'container',
                    itemId: 'chartPanel',
                    layout: 'vbox',
                    items: [{
                        xtype: 'container',
                        itemId: 'selectLabel',
                        padding: '100 20 20 20',
                        width: 200,
                        border: false,
                        html: TsConstants.LABEL.SELECT_ITEM
                    }],
                }
            ],
        }
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
        this.down('#resultPanel').insert(0, {
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
        for ( var i = availablePiTypes.length; i--; i>=0 ) {
            var typePath = availablePiTypes[i].get('TypePath');
            this.typePathMap[typePath] = parentStr;
            parentStr += '.Parent';
        }
        console.log(this.typePathMap);
    },

    onPiTypeChange: function(control) {
        this.selectedPiType = control.getSelectedType();
        this.updateMetrics();
    },

    updateMetrics: function() {
        var chartPanel = this.down('#chartPanel');

        if (this.selectedProject && this.selectedPiType) {
            chartPanel.removeAll();
            this.down('#resultPanel').setLoading(true);
            TsMetricsMgr.updateFocus(this.selectedProject, this.selectedPiType)
                .then({
                    scope: this,
                    success: function(result) {
                        this.drawCharts(this.selectedProject);
                    }
                });
        }
    },

    drawCharts: function(record) {
        var chartPanel = this.down('#chartPanel');

        var outsideProject = record.get('PisNotInProjectStoryCount');
        var total = record.get('TotalStoryCount');
        chartPanel.add(this.getChart(outsideProject, total, TsConstants.LABEL.BY_COUNT));

        outsideProject = record.get('PisNotInProjectStoryPoints');
        total = record.get('TotalPoints');
        chartPanel.add(this.getChart(outsideProject, total, TsConstants.LABEL.BY_POINTS));

        this.down('#resultPanel').setLoading(false);
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
