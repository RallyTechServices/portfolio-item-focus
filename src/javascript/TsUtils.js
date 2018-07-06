/* global Ext _ */
Ext.define("TsUtils", function(TsUtils) {
    return {
        statics: {
            getParentQueries: getParentQueries,
        }
    }

    function getParentQueries() {
        return _.map(_.range(1, 10), function(depth) {
            var result = [];
            while (depth-- > 0) {
                result.push("Parent")
            }
            return {
                property: result.join('.')
            }
        });
    }
});
