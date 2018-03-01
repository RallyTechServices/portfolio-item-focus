/* global Ext */
Ext.define('TsPiFocus', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'TotalStoryCount', type: 'int', defaultValue: 0 },
        { name: 'TotalPoints', type: 'int', defaultValue: 0 },
        { name: 'PisNotInProjectStoryCount', type: 'int', defaultValue: 0 },
        { name: 'PisNotInProjectStoryPoints', type: 'int', defaultValue: 0 },
    ]
})
