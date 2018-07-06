Ext.override(Ext.tab.Panel, {
    getState: function() {
        var state = this.callParent() || {};
        if (this.activeTab) {
            state.activeTabId = this.activeTab.itemId;
        }
        return state;
    },
    applyState: function(state) {
        this.callParent(state);
        if (state.activeTabId) {
            this.setActiveTab(state.activeTabId);
        }
    }
});
