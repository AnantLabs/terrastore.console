/**
 * Main application to set sammy to work.
 */
(function($) {
    var app = $.sammy(function() {
        this.use(Sammy.Storage);
        this.use(Sammy.Cache);
        this.use(Sammy.NestedParams);
        var corsMsg = 'Please Check Your Network and that CORS is enabled on your Terrastore server. ' +
                'Check the <a href="http://code.google.com/p/terrastore/wiki/Operations#Setup_Cross_Origin_Resource_Sharing_support" TARGET="_blank">guide</a>.';
        var version = '0.3';

        this.bind('run', function() {
            var context = this;
            $("#navlist a").click(function() {
                $("#navlist a").removeClass();
                $(this).addClass("current");
            });

            $.ajaxSetup({
                error:function(x, e) {
                    if (x.status == 0) {
                        context.trigger('onError', {message : 'You are offline!!<br> ' + corsMsg});
                        $.sammy.log(x.responseText)

                    } else if (x.status == 404) {
                        context.trigger('onError', {message: 'Requested URL not found.'});
                        $.sammy.log(x.responseText)

                    } else if (x.status == 500) {
                        context.trigger('onError', {message: 'Internel Server Error.'});
                        $.sammy.log(x.responseText)

                    } else if (e == 'parsererror') {
                        context.trigger('onError', {message: 'Error.\nParsing JSON Request failed.'});
                        $.sammy.log(x.responseText)

                    } else if (e == 'timeout') {
                        context.trigger('onError', {message: 'Request Time out.'});
                        $.sammy.log(x.responseText)

                    } else {
                        context.trigger('onError', {message : 'Unknow Error.<br> ' + corsMsg });
                        $.sammy.log(x.responseText);

                    }
                }
            });

            $.extend(Sammy.Store.LocalStorage.prototype, {
                isAvailable: function() {
                    return ('localStorage' in window);
                }
            });

            $("#progressbar").bind("ajaxSend", function() {
                $("#progressbar").progressbar({value: 100});
            }).bind("ajaxComplete", function() {
                $("#progressbar").progressbar("destroy");
            });

            this.store('servers', {type: ['local','cookie']});
            this.store('status', {type: ['local', 'cookie']});

            if (this.status('version') != version) {
                this.clearStatus();
                this.clearServers();
            }

            if (this.store('servers').keys().length < 1) {
                $.sammy.log("consoleStore initialiazing");
                this.servers(1, 'http://localhost:8080');
                this.status('selected', 1);
                this.status('serverSequence', 1);
                this.status('version', version);

            } else {
                $.sammy.log("consoleStore already initialiazed");

            }
            this.trigger('renderServers', context);
            this.trigger('renderServersSelect', context);

            $("a[menuItem]").each(function(index, value) {
                $(value).click(function() {
                    context.trigger('event-context-before');
                    context.trigger($(this).attr("menuItem"), context);
                });
            });

        });

        this.bind('onSuccess', function() {
            $('#messageContent').show();
            $("#message").setTemplateElement("success");
            $("#message").processTemplate(null);
            $("#successWidget").effect("pulsate");
        });

        this.bind('onError', function(e, data) {
            $('#messageContent').show();
            $("#message").setTemplateElement("error", [], {filter_data : false});
            $("#message").processTemplate(data.message);
            $("#errorWidget").effect("pulsate");
        });

        /**
         * clear the message before view a new page.
         */
        this.bind('event-context-before', function(e, data) {
            $('#messageContent').hide();
            $("#message").html('');
            $("#content").html('');
        });

        /**
         * renders the select that contains the servers.
         */
        this.bind('renderServersSelect', function(e, context) {
            $("#serversSelect").html('');
            var keys = this.store('servers').keys();
            for (i = 0; i < keys.length; i++) {
                if (!context.servers(context.status('selected')) && i == 0) {
                    context.status('selected', keys[i]);
                }
                var option = document.createElement("option");
                option.value = keys[i],option.text = 'Server-' + (i + 1);
                $("#serversSelect")[0].options[i] = option;
            }
            $("#serversSelect option[value='" + this.status('selected') + "']").attr('selected', 'selected');
            $("#serversSelect").change(function() {
                $("select option:selected").each(function () {
                    context.status('selected', $(this).val());
                    $.terrastoreClient.options.baseURL = context.servers(context.status('selected'));
                });
            });

            $.terrastoreClient.options.baseURL = context.servers(context.status('selected'));
        });

        this.bind('renderServers', function(e, context) {
            var servers = [];
            var keys = this.store('servers').keys();
            for (i = 0; i < keys.length; i++) {
                servers.push({
                    key : keys[i],
                    value : this.servers(keys[i])
                });
            }
            $("#serverSidebar").setTemplateElement("servers");
            $("#serverSidebar").setParam('timestamp', new Date().getTime());
            $("#serverSidebar").processTemplate(servers);
            $('#serverSidebar p b').editable(function(value, settings) {
                var key = $(this).parent().attr('id').replace("server-", "");
                context.servers(key, value);
                $.terrastoreClient.options.baseURL = context.servers(context.status('selected'));
                return (value);
            }, {
                type      : 'text',
                cancel    : 'Cancel',
                submit    : 'Update',
                style     : 'display: inline',
                tooltip   : 'Click to edit...',
                indicator : "<img src='images/loading.gif'>"
            });
        });

        this.get('#/home', function(context) {
            context.trigger('home');
        });

        this.bind('home', function() {
            $("#content").setTemplateElement("home");
            $("#content").processTemplate(null);
        });

        this.get('#/importClusterConfiguration/:cluster', function(context) {
            $.terrastoreClient.getValue("_stats", "cluster", function(value) {
                if (value == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                } else {
                    var clusterName = context.params['cluster'];
                    var clusterIdx = -1;
                    $.each(value.clusters, function(index, value) {
                        if (value.name == clusterName) clusterIdx = index
                    });
                    if (clusterIdx > -1) {
                        for (nodeIdx = 0; nodeIdx < value.clusters[clusterIdx].nodes.length; nodeIdx++) {
                            var node = value.clusters[clusterIdx].nodes[nodeIdx];
                            var address = 'http://' + node.host + ':' + node.port;
                            if (context.store('servers').filter(function(key, value) {
                                return (value == address)
                            }).length == 0) {
                                var sequence = context.status('serverSequence') + 1;
                                context.status('serverSequence', sequence);
                                context.servers(sequence, address);
                            }
                        }
                        context.trigger('renderServers', context);
                        context.trigger('renderServersSelect', context);
                        context.trigger('onSuccess', context);
                    } else {
                        context.trigger('onError', {message : "Cluster seems to be unavailable!"});
                        return;
                    }
                }
            });
        });

        this.get('#/servers/add/:timestamp', function(context) {
            var next = this.status('serverSequence') + 1;
            this.servers(next, 'http://localhost:8080');
            this.status('serverSequence', next);
            this.trigger('renderServers', context);
            this.trigger('renderServersSelect', context);
        });

        this.get('#/servers/remove/:key', function(context) {
            if (this.store('servers').keys().length > 1) {
                this.store('servers').clear(this.params['key']);
                this.trigger('renderServers', context);
                this.trigger('renderServersSelect', context);

            } else {
                this.trigger('onError', {message : 'You must keep at least one server in the list.'});

            }

        });

        this.bind('buckets', function(e, context) {
            $.terrastoreClient.getBuckets(function(buckets) {
                if (!$.isArray(buckets)) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("buckets");
                $("#content").setParam('viewPath', "#/view/bucket/");
                $("#content").setParam('removePath', "#/remove/");
                $("#content").processTemplate(buckets);
                $('#content input:submit').button();
                $("#content a[class=removeOp]").click(function() {
                    var href = $(this).attr("href");
                    $("#remove-confirm").dialog({
                        resizable: false,
                        width:'auto',
                        modal: true,
                        buttons: {
                            'Delete this item': function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                                context.redirect(href);
                            },
                            Cancel: function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                            }
                        }
                    });
                    return false;
                });

                $("#putBuckets").validate({
                    rules: {
                        bucketName: "required",
                        key: "required",
                        value: "required"
                    },
                    messages: {
                        bucketName: "Please enter the bucket name.",
                        key: "Please enter the bucket key.",
                        value: "Please enter the bucket value."
                    }
                });
            });

        });

        this.post('#/put/value', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.putValue(bucketName, this.params['key'], this.params['value'], null, {successCallback: function() {
                context.redirect('#/view/bucket/' + bucketName);
            }});
        });

        this.get('#/view/bucket/:bucketName', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.getAllValues(bucketName, function(values) {
                if (values == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName], null, 4)});
                }
                $("#content").setTemplateElement("values");
                $("#content").setParam('path', "#/remove/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate(data);
                $('#content input:submit').button();
                $('#content td[class=value]').editable(function(value, settings) {
                    var bucketName = $("#bucketName").html();
                    var key = $("table td[class=key]").html();
                    $.terrastoreClient.putValue(bucketName, key, value);
                    return (value);
                }, {
                    type      : 'textarea',
                    cancel    : 'Cancel',
                    submit    : 'Update',
                    style     : 'display: inline',
                    tooltip   : 'Click to edit...',
                    indicator : "<img src='images/loading.gif'>"
                });
                $("#content a[class=removeOp]").click(function() {
                    var href = $(this).attr("href");
                    $("#remove-confirm").dialog({
                        resizable: false,
                        width:'auto',
                        modal: true,
                        buttons: {
                            'Delete this item': function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                                context.redirect(href);
                            },
                            Cancel: function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                            }
                        }
                    });
                    return false;
                });
                $("#putBuckets").validate({
                    rules: {
                        key: "required",
                        value: "required"
                    },
                    messages: {
                        key: "Please enter the bucket key.",
                        value: "Please enter the bucket value."
                    }
                });
            });
        });

        this.get('#/remove/:bucketName', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.removeBucket(bucketName, {successCallback: function() {
                context.trigger('buckets');
            }});
        });

        this.get('#/remove/:bucketName/:key', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.removeValue(bucketName, this.params['key'], {successCallback: function() {
                context.redirect('#/view/bucket/' + bucketName);
            }});
        });

        this.get('#/merge/:bucketName/:key', function(context) {
            var bucketName = this.params['bucketName'];
            var key = this.params['key'];
            $.terrastoreClient.getValue(bucketName, key, function(value) {
                if (value == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }

                $("#content").setTemplateElement("merge");
                $("#content").setParam('mergeValueForm', new Sammy.FormBuilder('mergeValue', {
                    value : JSON.stringify(value, null, 4)
                }));
                $("#content").setParam('textareaParams', {cols:40,rows:6, readOnly:true});
                $("#content").setParam('bucketName', bucketName);
                $("#content").setParam('key', key);
                $("#content").processTemplate(null);
                $('#content input:submit').button();
            });
        });

        this.post('#/merge/value', function(context) {
            $.terrastoreClient.mergeValue(this.params['bucketName'], this.params['key'], this.params['merge'], {successCallback: function() {
                context.trigger('onSuccess');
            }});
        });

        this.bind('search', function(e, context) {
            $("#content").setTemplateElement("searchValue");
            $("#content").setParam('searchValueForm', new Sammy.FormBuilder('searchValue', context.cache('searchValue') || {}));
            $("#content").setParam('searchRangeForm', new Sammy.FormBuilder('searchRange', context.cache('searchRange') || {}));
            $("#content").setParam('searchPredicateForm', new Sammy.FormBuilder('searchPredicate', context.cache('searchPredicate') || {}));
            $("#content").setParam('searchMapReduceForm', new Sammy.FormBuilder('searchMapReduce', context.cache('searchMapReduce') || {}));
            $("#content").setParam('textareaParams', {cols:40,rows:6});
            $("#content").processTemplate(null);

            $('#content input:submit').button();

            $("#searchKey").validate({
                rules: {
                    "searchValue[bucketName]": "required",
                    "searchValue[key]": "required"
                },
                messages: {
                    "searchValue[bucketName]": "Please enter the bucket name.",
                    "searchValue[key]": "Please enter the bucket key."
                }
            });

            $("#searchRange").validate({
                rules: {
                    "searchRange[bucketName]": "required",
                    "searchRange[startKey]": "required",
                    "searchRange[endKey]": "required"
                },
                messages: {
                    "searchRange[bucketName]": "Please enter the bucket name.",
                    "searchRange[startKey]": "Please enter the range start key.",
                    "searchRange[endKey]": "Please enter the range end key."
                }
            });

            $("#searchPredicate").validate({
                rules: {
                    "searchPredicate[bucketName]": "required",
                    "searchPredicate[predicateType]": "required",
                    "searchPredicate[predicate]":"required"
                },
                messages: {
                    "searchPredicate[bucketName]": "Please enter the bucket name.",
                    "searchPredicate[predicateType]": "Please enter the predicate type.",
                    "searchPredicate[predicate]": "Please enter the predicate."
                }
            });

            $("#rangeClick").click(function() {
                $("#rangeBox input").attr('disabled', !$("#rangeBox input").attr('disabled'));
                $("#rangeBox").toggleClass("disabled");
                $("#rangeClick span").toggleClass("ui-icon-circle-minus");
                $("#rangeClick span").toggleClass("ui-icon-circle-plus");
                return false;
            }).click();

            $("#searchMapReduce").validate({
                rules: {
                    "searchMapReduce[bucketName]": "required",
                    "searchMapReduce[mapper]": "required",
                    "searchMapReduce[reducer]": "required",
                    "searchMapReduce[timeout]": {
                        required: true,
                        min: 1
                    },
                    "searchMapReduce[startKey]": {
                        required: "#rangeBox input:enabled"
                    }
                },
                messages: {
                    "searchMapReduce[bucketName]": "Please enter the bucket name.",
                    "searchMapReduce[mapper]": "Please enter your mapper.",
                    "searchMapReduce[reducer]": "Please enter your reducer.",
                    "searchMapReduce[timeout]":  {
                        required: "Please enter the timeout.",
                        min: "Please enter a timeout greater than 0."
                    },
                    "searchMapReduce[startKey]": "Please enter the range start key."
                }
            });
            $("#searchMenu").accordion({
                autoHeight: false,
                navigation: true
            });
        });

        this.post('#/search/value', function(context) {
            context.cache('searchValue', this.params.searchValue);
            var key = this.params.searchValue.key;
            var bucketName = this.params.searchValue.bucketName;
            $.terrastoreClient.getValue(bucketName, key, function(value) {
                if (value == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("value");
                $("#content").setParam('removePath', "#/remove/");
                $("#content").setParam('mergePath', "#/merge/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate({"key":key, value:JSON.stringify(value, null, 4)});
                $('#content td[class=value]').editable(function(value, settings) {
                    var bucketName = $("#bucketName").html();
                    var key = $("table td[class=key]").html();
                    $.terrastoreClient.putValue(bucketName, key, value);
                    return (value);
                }, {
                    type      : 'textarea',
                    cancel    : 'Cancel',
                    submit    : 'Update',
                    style     : 'display: inline',
                    tooltip   : 'Click to edit...',
                    indicator : "<img src='images/loading.gif'>"
                });
                $("#content a[class=removeOp]").click(function() {
                    var href = $(this).attr("href");
                    $("#remove-confirm").dialog({
                        resizable: false,
                        width:'auto',
                        modal: true,
                        buttons: {
                            'Delete this item': function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                                context.redirect(href);
                            },
                            Cancel: function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                            }
                        }
                    });
                    return false;
                });
            });

        });

        this.post('#/search/range', function(context) {
            context.cache('searchRange', this.params.searchRange);
            var bucketName = this.params.searchRange.bucketName;
            var startKey = this.params.searchRange.startKey;
            var endKey = this.params.searchRange.endKey;
            var predicate = this.params.searchRange.predicate;
            var options = {};
            if(this.params.searchRange.comparator) {
                options.comparator = this.params.searchRange.comparator;
            }
            if(this.params.searchRange.timeToLive) {
                options.timeToLive = this.params.searchRange.timeToLive;
            }
            if(this.params.searchRange.predicateExpression) {
                options.predicateExpression = this.params.searchRange.predicateExpression;
            }
            if(this.params.searchRange.predicateType) {
                options.predicateType = this.params.searchRange.predicateType;
            }
            if(this.params.searchRange.limit) {
                options.limit = this.params.searchRange.limit;
            }
            $.terrastoreClient.queryByRange(bucketName, startKey, endKey, function(values) {
                if (values == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName], null, 4)});
                }
                $("#content").setTemplateElement("values");
                $("#content").setParam('path', "#/remove/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate(data);
                $('#content input:submit').button();
                $('#content td[class=value]').editable(function(value, settings) {
                    var bucketName = $("#bucketName").html();
                    var key = $("table td[class=key]").html();
                    $.terrastoreClient.putValue(bucketName, key, value);
                    return (value);
                }, {
                    type      : 'textarea',
                    cancel    : 'Cancel',
                    submit    : 'Update',
                    style     : 'display: inline',
                    tooltip   : 'Click to edit...',
                    indicator : "<img src='images/loading.gif'>"
                });
            }, options);

        });

        this.post('#/search/predicate', function(context) {
            context.cache('searchPredicate', this.params.searchPredicate);
            var bucketName = this.params.searchPredicate.bucketName;
            var predicateType = this.params.searchPredicate.predicateType;
            var predicate = this.params.searchPredicate.predicate;
            $.terrastoreClient.queryByPredicate(bucketName, predicate, function(values) {
                if (values == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName], null, 4)});
                }
                $("#content").setTemplateElement("values");
                $("#content").setParam('path', "#/remove/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate(data);
                $('#content input:submit').button();
                $('#content td[class=value]').editable(function(value, settings) {
                    var bucketName = $("#bucketName").html();
                    var key = $("table td[class=key]").html();
                    $.terrastoreClient.putValue(bucketName, key, value);
                    return (value);
                }, {
                    type      : 'textarea',
                    cancel    : 'Cancel',
                    submit    : 'Update',
                    style     : 'display: inline',
                    tooltip   : 'Click to edit...',
                    indicator : "<img src='images/loading.gif'>"
                });
            }, {predicateType : predicateType});

        });

        this.post('#/search/mapReduce', function(context) {
            context.cache('searchMapReduce', this.params.searchMapReduce);
            var bucketName = this.params.searchMapReduce.bucketName;
            var mapper = this.params.searchMapReduce.mapper;
            var reducer = this.params.searchMapReduce.reducer;
            var timeout = this.params.searchMapReduce.timeout;

            var combiner = this.params.searchMapReduce.combiner || null;
            var parameters = this.params.searchMapReduce.parameters || null;
            var descriptor = {
                task : {
                    mapper:  mapper,
                    reducer: reducer,
                    timeout: timeout,
                    combiner:combiner,
                    parameters:parameters
                },
                range:null
            }

            var startKey = this.params.searchMapReduce.startKey;
            if (startKey) {
                var endKey = this.params.searchMapReduce.endKey || null;
                var comparator = this.params.searchMapReduce.comparator || null;
                var timeToLive = this.params.searchMapReduce.timeToLive || 0;
                descriptor.range = {
                    startKey:startKey,
                    endKey: endKey,
                    comparator:comparator,
                    timeToLive:timeToLive
                }
            }
            $.terrastoreClient.queryByMapReduce(bucketName, descriptor, function(value) {
                if (value == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("mapReduceResult");
                $("#content").setParam('textareaParams', {cols:40,rows:6});
                $("#content").processTemplate(new Sammy.FormBuilder('result', { result :JSON.stringify(value, null, 4)}));
            });

        });

        this.bind('exportImport', function() {
            $("#content").setTemplateElement("exportImport");
            $("#content").processTemplate(null);
            $('#content input:submit').button();

            $("#export").validate({
                rules: {
                    bucketName: "required",
                    destination: "required"
                },
                messages: {
                    bucketName: "Please enter the bucket name.",
                    destination: "Please enter the export destination path."
                }
            });

            $("#import").validate({
                rules: {
                    bucketName: "required",
                    source: "required"
                },
                messages: {
                    bucketName: "Please enter the bucket name.",
                    source: "Please enter the import source path."
                }
            });
        });

        this.get('#/export', function(context) {
            var bucketName = this.params['bucketName'];
            var destination = this.params['destination'];
            $.terrastoreClient.exportBackup(bucketName, destination, {successCallback:function() {
                context.trigger("onSuccess");
            }});
        });

        this.get('#/import', function(context) {
            var bucketName = this.params['bucketName'];
            var source = this.params['source'];
            $.terrastoreClient.importBackup(bucketName, source, {successCallback:function() {
                context.trigger("onSuccess");
            }});
        });

        this.bind('stats', function(e, context) {
            $.terrastoreClient.getValue("_stats", "cluster", function(value) {
                if (value == null) {
                    context.trigger('onError', {message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("stats");
                $("#content").processTemplate(value);
                $("#clusters").tabs();
            });
        });

        this.bind('about', function() {
            $("#content").setTemplateElement("about");
            $("#content").processTemplate(version);
        });

    });

    $(function() {
        app.run('#/home');
    });
})(jQuery);
