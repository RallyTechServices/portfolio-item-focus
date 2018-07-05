/* global Ext _ */
Ext.define("TsUtils", function(TsUtils) {
    return {
        statics: {
            getParentQueries: getParentQueries,
            //updateRecord: updateRecord
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
    /*
        function updateRecord(record, model) {
            var fields = Ext.getClass(model).getFields();
            _.forEach(fields, function(field) {
                if (field.name != 'id') {
                    record.set(field.name, model.get(field.name));
                }
            });
            return record;
        }
        */
});
