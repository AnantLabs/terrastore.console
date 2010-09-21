/**
 *Main application to set sammy to work.
 */
(function($) {
    var app = $.sammy(function() {
    	var corsMsg = 'Please Check Your Network and that CORS is enabled on your Terrastore server. ' +
        			  'Check the <a href="http://code.google.com/p/terrastore/wiki/Operations#Setup_Cross_Origin_Resource_Sharing_support" TARGET="_blank">guide</a>.'
        this.bind('run', function() {
            var context = this;
            $("#navlist a").click(function() {
                $("#navlist a").removeClass();
                $(this).addClass("current");
            });

            $.ajaxSetup({
                error:function(x, e) {
                    if (x.status == 0) {
                        context.trigger('error',{message : 'You are offline!!<br> ' + corsMsg});
                        $.sammy.log(x.responseText)

                    } else if (x.status == 404) {
                        context.trigger('error', {message: 'Requested URL not found.'});
                        $.sammy.log(x.responseText)

                    } else if (x.status == 500) {
                        context.trigger('error', {message: 'Internel Server Error.'});
                        $.sammy.log(x.responseText)

                    } else if (e == 'parsererror') {
                        context.trigger('error', {message: 'Error.\nParsing JSON Request failed.'});
                        $.sammy.log(x.responseText)

                    } else if (e == 'timeout') {
                        context.trigger('error', {message: 'Request Time out.'});
                        $.sammy.log(x.responseText)

                    } else {
                        context.trigger('error',{message : 'Unknow Error.<br> ' + corsMsg });
                        $.sammy.log(x.responseText);

                    }
                }
            });

            $("#progressbar").bind("ajaxSend", function() {
                $("#progressbar").progressbar({value: 100});
            }).bind("ajaxComplete", function() {
                $("#progressbar").progressbar("destroy");
            });
            
            if ($.jStorage.index().length < 1) {
                $.sammy.log("consoleStore initialiazing");
                $.jStorage.set('1', 'http://localhost:8080');

            } else {
                $.sammy.log("consoleStore already initialiazed");

            }

            $.terrastoreClient.setup({
                baseURL : $.jStorage.get('1')
            });
            
        });

        this.get('#/home', function() {
            var servers = [];
            var keys = $.jStorage.index();
            for (i = 0; i < keys.length; i++) {
                servers.push({key : keys[i],
                			  value : $.jStorage.get(keys[i])
                			  });
            }
            $("#serverSidebar").setTemplateElement("servers");
            $("#serverSidebar").processTemplate(servers);
            $('#serverSidebar p b').editable(function(value, settings) {
                var key = $(this).parent().attr('id').replace("server-", "");
                $.jStorage.set(key, value);
                $.terrastoreClient.setup({
                    baseURL : $.jStorage.get('1')
                });
                return (value);
            }, {
                type      : 'text',
                cancel    : 'Cancel',
                submit    : 'Update',
                style     : 'display: inline',
                tooltip   : 'Click to edit...'
            });

            $("#content").setTemplateElement("home");
            $("#content").processTemplate(null);

        });

        this.get('#/buckets', function(context) {
            $.terrastoreClient.getBuckets(function(buckets) {
                if(!$.isArray(buckets)){
                    	context.trigger('error',{message : corsMsg});
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
                if(values == null){
                    	context.trigger('error',{message : corsMsg});
                    return;
                }
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName])});
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
                    tooltip   : 'Click to edit...'
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

        this.get('#/remove/:bucketName', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.removeBucket(bucketName, {successCallback: function() {
                context.redirect('#/buckets');
            }});
        });

        this.get('#/remove/:bucketName/:key', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.removeValue(bucketName, this.params['key'], {successCallback: function() {
                context.redirect('#/view/bucket/' + bucketName);
            }});
        });

        this.get('#/search/value', function() {
            $("#content").setTemplateElement("searchValue");
            $("#content").processTemplate(null);
            $('#content input:submit').button();
        });

        this.post('#/search/value', function(context) {
            var key = this.params['key'];
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.getValue(bucketName, key, function(value) {
                if(value == null) {
                    	context.trigger('error',{message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("value");
                $("#content").setParam('path', "#/remove/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate({"key":key, value:JSON.stringify(value)});
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
                    tooltip   : 'Click to edit...'
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
            var key = this.params['key'];
            var bucketName = this.params['bucketName'];
            var from = this.params['from'];
            var to = this.params['to'];
            $.terrastoreClient.queryByRange(bucketName, from, to, function(values) {
                if(values == null){
                    	context.trigger('error',{message : corsMsg});
                    return;
                }
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName])});
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
                    tooltip   : 'Click to edit...'
                });
            });

        });

        this.get('#/exportImport', function() {
            $("#content").setTemplateElement("exportImport");
            $("#content").processTemplate(null);
            $('#content input:submit').button();
        });

        this.get('#/export', function(context) {
            var bucketName = this.params['bucketName'];
            var destination = this.params['destination'];
            $.terrastoreClient.exportBackup(bucketName, destination, {successCallback:function() {
                context.redirect("#/success");
            }});
        });

        this.get('#/import', function(context) {
            var bucketName = this.params['bucketName'];
            var source = this.params['source'];
            $.terrastoreClient.importBackup(bucketName, source, {successCallback:function() {
                context.redirect("#/success");
            }});
        });

        this.get('#/success', function() {
            $("#content").setTemplateElement("success");
            $("#content").processTemplate(null);
            $(".ui-widget").effect("pulsate");
        });
        
        this.get('#/error/:msg', function() {
            context.trigger('error',this.params['msg']);    
        });
        
        this.bind('error', function(e, data) {
            $("#content").setTemplateElement("error", [], {filter_data : false});
            $("#content").processTemplate(data.message);
            $(".ui-widget").effect("pulsate");
        });

        this.get('#/stats', function(context) {
            $.terrastoreClient.getValue("_stats", "cluster", function(value) {
                if(value == null) {
                    	context.trigger('error',{message : corsMsg});
                    return;
                }
                $("#content").setTemplateElement("stats");
                $("#content").processTemplate(value);
                $("#clusters").tabs();
            });
        });

        this.get('#/about', function() {
            $("#content").setTemplateElement("about");
            $("#content").processTemplate(null);
        });

    });

    $(function() {
        app.run('#/home');
    });
})(jQuery);
