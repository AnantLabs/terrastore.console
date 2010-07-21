$(function() {

    $("#navlist a").click(function() {
        $("#navlist a").removeClass();
        $(this).addClass("current");
    });
    $.ajaxSetup({
        error:function(x, e) {
            if (x.status == 0) {
                alert('You are offline!!\n Please Check Your Network.');
                $.sammy.log(x.responseText)

            } else if (x.status == 404) {
                alert('Requested URL not found.');
                $.sammy.log(x.responseText)

            } else if (x.status == 500) {
                alert('Internel Server Error.');
                $.sammy.log(x.responseText)

            } else if (e == 'parsererror') {
                alert('Error.\nParsing JSON Request failed.');
                $.sammy.log(x.responseText)

            } else if (e == 'timeout') {
                alert('Request Time out.');
                $.sammy.log(x.responseText)

            } else {
                alert('Unknow Error.\n');
                $.sammy.log(x.responseText)

            }
        }
    });

    $("#progressbar").bind("ajaxSend", function() {
        $("#progressbar").progressbar({value: 100});
    }).bind("ajaxComplete", function() {
        $("#progressbar").progressbar("destroy");
    });

});

(function($) {
    var app = $.sammy(function() {
        this.get('#/home', function() {
            $("#content").setTemplateElement("home");
            $("#content").processTemplate(null);
        });

        this.get('#/buckets', function() {
            $.terrastoreClient.getBuckets(function(buckets) {
                $("#content").setTemplateElement("buckets");
                $("#content").setParam('path', "#/view/bucket/");
                $("#content").processTemplate(buckets);
                $('#content a').button({
                    icons: {
                        secondary: 'ui-icon-transferthick-e-w'
                    }
                });
            });

        });

        this.get('#/view/bucket/:bucketName', function() {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.getAllValues(bucketName, function(values) {
                var data = [];
                for (var propertyName in values) {
                    data.push({key:propertyName, value:JSON.stringify(values[propertyName])});
                }
                $("#content").setTemplateElement("values");
                $("#content").setParam('path', "#/remove/");
                $("#content").setParam('bucketName', bucketName);
                $("#content").processTemplate(data);
            });
        });

        this.get('#/remove/:bucketName/:key', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.removeValue(bucketName, this.params['key'], {successCallback: function() {
                context.redirect('#/view/bucket/' + bucketName);
            }});
        });

        this.get('#/about', function() {
            $("#content").setTemplateElement("about");
            $("#content").processTemplate(null);
        });

        this.post('#/put/value/at/bucket/:bucketName', function(context) {
            var bucketName = this.params['bucketName'];
            $.terrastoreClient.putValue(bucketName, this.params['key'], this.params['value'], null, {successCallback: function() {
                context.redirect('#/view/bucket/' + bucketName);
            }});
        });

        this.get('#/send/:action', function() {
            var url = 'services/send/' + this.params['action'];
            url += '?numberOfAccounts=' + $('#numberOfAccounts').val();
            if (this.params['action'] == 'MRC') {
                url += '&fromDate=' + $('#fromDate').val();
            }
            $.get(url, function(data) {
                alert('supply sent!');
            });
        });

        this.get('#/supplies/:page', function(context) {
            var maxForPage = 2;
            var pages = 1;
            var page = this.params['page'];
            $.get('services/howmanysupplypages?maxForPage=' + maxForPage, function(data) {
                pages = data;
            });
            $.get('services/supplies/' + page + '?maxForPage=' + maxForPage, function(data) {
                $("#content").setTemplateURL("template/suppliesTable.html");
                $("#content").setParam('path', "#/errorView/");
                $("#content").processTemplate(data);
                $("#pagination").paginate({
                    count                   : pages,
                    start                   : page,
                    display                 : 10,
                    border                  : false,
                    text_color              : '#003399',
                    background_color        : 'none',
                    text_hover_color        : '#2573AF',
                    background_hover_color  : 'none',
                    mouse                   : 'press',
                    onChange                : function(page) {
                        context.redirect('#/supplies/' + page);
                        return false;
                    }

                });
            });
        });

        this.get('#/errorView/:id', function() {
            $.get('services/supply/error/' + this.params['id'], function(data) {
                $("#content").setTemplateURL("template/supplyError.html");
                $("#content").processTemplate(data);
            });
        });

    });

    $(function() {
        app.run('#/home')
    });
})(jQuery);