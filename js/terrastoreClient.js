(function($) {
    $.terrastoreClient = {
        setup: function(options) {
            jQuery.extend($.terrastoreClient.options, options);
        },

        options :{
            baseURL : "http://localhost:8080",
            timeoutInMillis: 10000,
            secret: "SECRET-KEY",
            predicateType:"js",
            limit:100,
            comparator:"lexical-asc",
            timeToLive:10000,
            checkJSON: false,
            successCallback: function(data, textStatus, XMLHttpReques) {
                if ($.ajaxSettings && $.ajaxSettings.success) {
                    $.ajaxSettings.success(data, textStatus, XMLHttpReques);
                }
            },
            errorCallback: function(XMLHttpRequest, textStatus, errorThrown) {
                console.log('error while executing a terrastore request:' + XMLHttpRequest + ' and status:' + textStatus + 'and errorThrown:' + errorThrown);
                if ($.ajaxSettings && $.ajaxSettings.error) {
                    $.ajaxSettings.error(XMLHttpRequest, textStatus, errorThrown);
                }
            }
        },

        /**
         * checks if the array doesn't contains a null object.
         */
        checkNotNull: function() {
            var callerFunction = arguments.callee.caller;
            $.each(arguments, function(key, value) {
                if (!value) $.error("the argument at index:" + key + " of function is not defined! see:" + callerFunction);
            });
        },

        /**
         * Put a value in the given bucket under the given key.<br>
         * Conditional put can be executed by providing a predicate expression:
         * in such a case, the new value will be put only if no value existed before, or the existent value satisfies the given predicate.
         *
         * @param bucket The name of the bucket where to put the value.
         * @param key The key of the value to put.
         * @param value The value to put.
         * @param predicate The predicate to evaluate in case of conditional put, or null for no predicate.
         */
        putValue: function(bucket, key, value, predicateExpression, options) {
            $.terrastoreClient.checkNotNull(bucket, key, value);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, options);
            if (typeof value == "object") {
                value = JSON.stringify(value);
            } else if (typeof value !== "string") {
                $.error("The type of 'value' must be a json string or object");
            } else if (currentOptions.checkJSON) {
                eval('(' + value + ')');
            }
            var currentURL = currentOptions.baseURL + "/" + bucket + "/" + key;
            if (predicateExpression) currentURL = currentURL + "?predicate=" + currentOptions.predicateType + ":" + encodeURIComponent(predicateExpression);
            $.ajax({
                data: value,
                url: currentURL,
                contentType:"application/json",
                type: 'PUT',
                processData: false,
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Get the value from the given bucket under the given key.<br>
         * If a non-empty predicate is provided, the returned value must satisfy the given predicate as well.
         *
         * @param bucket The name of the bucket containing the value to get.
         * @param key The key of the value to get.
         * @param predicate The predicate to evaluate; predicate can be null or empty.
         * @return The value.
         */
        getValue: function(bucket, key, successCallback, predicateExpression, options) {
            $.terrastoreClient.checkNotNull(bucket, key);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            var currentURL = currentOptions.baseURL + "/" + bucket + "/" + key;
            if (predicateExpression) currentURL = currentURL + "?predicate=" + currentOptions.predicateType + ":" + encodeURIComponent(predicateExpression);
            $.ajax({
                url: currentURL,
                dataType:"json",
                type: 'GET',
                success: currentOptions.successCallback
                ,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Remove a value from the given bucket under the given key.
         *
         * @param bucket The name of the bucket where to remove the value from.
         * @param key The key of the value to remove.
         */
        removeValue:function(bucket, key, options) {
            $.terrastoreClient.checkNotNull(bucket, key);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/" + key,
                type: 'DELETE',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Get the name of all buckets.
         *
         * @return A collection of all bucket names.
         */
        getBuckets:function(successCallback, options) {
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            $.ajax({
                url: currentOptions.baseURL,
                dataType:"json",
                type: 'GET',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Remove the given bucket.
         *
         * @param bucket The name of the bucket to remove.
         */
        removeBucket: function(bucket, options) {
            $.terrastoreClient.checkNotNull(bucket);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket,
                type: 'DELETE',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });

        },

        /**
         * Execute an update on a value from the given bucket under the given key.
         *
         * @param bucket The name of the bucket holding the value to update.
         * @param key The key of the value to update.
         * @param function The name of the server-side function performing the actual update.
         * @param timeoutInMillis The timeout for the update operation (update operations lasting more than the given timeout will be aborted).
         * @param parameters The update operation parameters.
         * @return The updated value
         */
        updateValue:function(bucket, key, successCallback, updateFunction, timeoutInMillis, parameters, options) {
            $.terrastoreClient.checkNotNull(bucket, key, updateFunction);
            var param = {"updateFunction" : "" + updateFunction.toString(-1).replace(/[\n\r\t]/g, "") };
            $.extend(param, parameters);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {timeoutInMillis: timeoutInMillis}, {successCallback:successCallback}, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/" + key + "/" + "update?function=js&timeout=" + currentOptions.timeoutInMillis,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(param),
                dataType:"json",
                processData: false,
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Get all key/value entries into the given bucket.
         *
         * @param bucket The name of the bucket containing the values to get.
         * @param limit Max number of elements to retrieve; if zero, all values will be returned.
         * @return A map containing all key/value entries.
         */
        getAllValues:function(bucket, successCallback, options) {
            $.terrastoreClient.checkNotNull(bucket);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "?limit=" + currentOptions.limit,
                dataType:"json",
                type: 'GET',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Execute a range query returning all key/value pairs whose key falls into the given range, and whose value satisfies the given predicate (if any).
         * <br><br>
         * The selected range goes from start key to end key, with the max number of elements equal to the provided limit.<br>
         * If the limit is zero, all the elements in the range will be selected.<br>
         * If no end key is provided, all elements starting from start key and up to the limit will be selected.
         * <br><br>
         * The range query is executed over a snapshot view of the bucket keys, so the timeToLive parameter determines,
         * in milliseconds, the snapshot max age: if the snapshot is older than the given time, it's recomputed,
         * otherwise it will be actually used for the query.
         *
         * @param bucket The bucket to query.
         * @param startKey First key in range.
         * @param endKey Last key in range (inclusive); if null, all elements starting from start key and up to the limit will be selected.
         * @param limit Max number of elements to retrieve (even if not reaching the end of the range); if zero, all elements in range will be selected.
         * @param comparator Name of the comparator to use for testing if a key is in range.
         * @param predicate The predicate to evaluate (if any).
         * @param timeToLive Number of milliseconds specifying the snapshot age; if set to 0, a new snapshot will be immediately computed
         * and the query executed on the fresh snasphot.
         * @return A map containing key/value pairs
         */
        queryByRange:function(bucket, startKey, endKey, successCallback, options) {
            $.terrastoreClient.checkNotNull(bucket, startKey, endKey);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            var currentURL = currentOptions.baseURL + "/" + bucket + "/range?comparator=" + currentOptions.comparator + "&startKey=" + startKey + "&endKey=" + endKey + "&timeToLive=" + currentOptions.timeToLive + "&limit=" + currentOptions.limit;
            if (options.predicateExpression) currentURL = currentURL + "&predicate=" + currentOptions.predicateType + ":" + encodeURIComponent(options.predicateExpression);
            $.ajax({
                url: currentURL,
                dataType:"json",
                type: 'GET',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Execute a predicate-based query returning all key/value pairs whosevalue satisfies the given predicate.
         *
         * @param bucket The bucket to query.
         * @param predicate The predicate to evaluate.
         * @return A map containing key/value pairs
         */
        queryByPredicate:function(bucket, predicate, successCallback, options) {
            $.terrastoreClient.checkNotNull(bucket, predicate);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/predicate?predicate=" + currentOptions.predicateType + ":" + encodeURIComponent(predicate),
                dataType:"json",
                type: 'GET',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },
        
        /**
         * Execute a map-reduce query over the given bucket.
         *
         * @param bucket The bucket to query.
         * @param descriptor The map-reduce query descriptor.
         */
         queryByMapReduce:function(bucket, descriptor, successCallback, options) {
            $.terrastoreClient.checkNotNull(bucket, descriptor);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, {successCallback:successCallback}, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/mapReduce",
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(descriptor),
                dataType:"json",
                processData: false,
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        },

        /**
         * Execute the import of all bucket key/value entries, without interrupting other operations and preserving
         * existent entries not contained into the given backup.
         *
         * @param bucket The bucket to import entries to.
         * @param source The name of the resource from which reading the backup.
         * @param secret The secret key: import is executed only if it matches the pre-configured secret.
         */
        importBackup:function(bucket, source, options) {
            $.terrastoreClient.checkNotNull(bucket, source);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/import?source=" + source + "&secret=" + currentOptions.secret,
                dataType:"json",
                type: 'POST',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        }
        ,
        /**
         * Execute the export of all bucket key/value entries, without interrupting other operations.
         *
         * @param bucket The bucket to export entries from.
         * @param destination The name of the resource into which writing the backup.
         * @param secret The secret key: export is executed only if it matches the pre-configured secret.
         */
        exportBackup:function(bucket, destination, options) {
            $.terrastoreClient.checkNotNull(bucket, destination);
            var currentOptions = $.extend(true, {}, $.terrastoreClient.options, options);
            $.ajax({
                url: currentOptions.baseURL + "/" + bucket + "/export?destination=" + destination + "&secret=" + currentOptions.secret,
                dataType:"json",
                type: 'POST',
                success: currentOptions.successCallback,
                error: currentOptions.errorCallback
            });
        }
    }
})(jQuery);
