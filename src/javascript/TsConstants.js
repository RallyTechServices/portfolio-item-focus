/* global Ext Rally */
Ext.define("TsConstants", {
    statics: {
        ID: {
            SELECT_PI_TYPE_CONTROL: 'SELECT_ITEM_TYPE_CONTROL',
            ITEM_SELECTOR_STATE: 'ITEM_SELECTOR_STATE',
            SUMMARY_PANEL: 'SUMMARY_PANEL',
            DETAILS_PANEL: 'DETAILS_PANEL',
            OUTSIDE_STORY_GRID: 'OUTSIDE_STORY_GRID',
            INSIDE_STORY_GRID: 'INSIDE_STORY_GRID'
        },
        LABEL: {
            PI_TYPE: 'Group by Owners of',
            SELECT_PROJECT: 'Projects',
            CHART_AREA_TITLE: 'Portfolio Item Owner',
            WARNING_THRESHOLD: 'Minimum Desired Owned Item Focus',
            getChartSubtitle: function(piTypeName) {
                return 'Grouped by ' + piTypeName + ' owner'
            },
            INSIDE_PROJECT: 'Inside of Project Tree',
            OUTSIDE_PROJECT: 'Outside of Project Tree',
            BY_POINTS: 'Story Points',
            BY_COUNT: 'Story Count',
            SELECT_ITEM: '',
            SUMMARY_PANEL: 'Summary',
            DETAILS_PANEL: 'Details'
        },
        SETTING: {
            WARNING_THRESHOLD: 'WARNING_THRESHOLD',
            DEFAULT_DETAILS_FIELDS: [
                'FormattedID',
                'Name',
                'ScheduleState',
                'Owner',
                'Project',
                'Feature'
            ]
        },
        FETCH: {
            PI: ['Project', 'Name', 'ObjectId'],
            USER_STORY: ['ObjectID', 'PlanEstimate'],
        },
        CHART: {
            WHITE: '#FFFFFF',
            OK: Ext.draw.Color.toHex('rgb(82,177,64)'),
            WARNING: Ext.draw.Color.toHex('rgb(245,88,64)'),
            NORMAL_1: Ext.draw.Color.toHex('rgb(226,226,226)'),
            NORMAL_2: Ext.draw.Color.toHex('rgb(184,184,184)'),
            COLORS: [
                Ext.draw.Color.toHex('rgb(82,177,64)'),
                Ext.draw.Color.toHex('rgb(245,88,64)')
            ]
        }
    }
});
