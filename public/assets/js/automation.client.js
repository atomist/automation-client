$(window).on('load', function () {

    init();
    setInterval(init, 5000);
});

var loaded = false;

function init() {

    var kebabCase = function kebabCase(string) {
        if (string) {
            return string.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();
        } else {
            return string;
        }
    };

    var automations, metrics;

    // var host = "http://localhost:2866";
    var host = "";

    $.when($.getJSON(host + "/automations", function (data) {
        automations = data;
    }), $.getJSON(host + "/metrics", function (data) {
        metrics = data;
    })).then(function () {
        if (automations && metrics) {
            document.title = automations.name + "@" + automations.version + " - Atomist Automation Client";
            var teamIds = automations.team_ids;
            if (teamIds && teamIds.length > 0) {
                var dd = "<form action='" + window.location.href + "' method='GET' id='teamd-ids'>";
                dd += "<div class='form-row align-items-center' style='vertical-align: middle'>";
                dd += "<label class='sr- only' for='teamId'>" + automations.name + "@" + automations.version + " connected to team </label>&nbsp;";
                dd += "<select  class='custom-select mb-2 mr-sm-2 mb-sm-0' name='teamId' id='teamId' onchange='this.form.submit(); '>";
                teamIds.forEach(function (id) {
                    dd += "<option value='" + id + "' " + (window.location.href.indexOf(id) >= 0 ? "selected='selected'" : "") + ">" + id + "</option>";
                });
                dd += "</select></div></form>";
                $("#footer").html(dd);
            } else {
                $("#footer").html(automations.name + "@" + automations.version + " active for all teams");
            }

            if (!loaded) {
                $('#commands tbody').remove();
                automations.commands.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                }).forEach(function (element) {
                    var name = kebabCase(element.name);
                    var row = "<tr>";
                    row += "<td style='width: 10%' id='status-command_handler-" + element.name + "'></td>";
                    row += "<td><span style='color: #FFF'><a data-toggle='collapse' href='#collapse-" + element.name + "' aria-expanded='false' aria-controls='collapse-" + element.name + "'>" + element.name + "</a></span><br><small class='small'>" + element.description;
                    if (element.intent) {
                        row += "</br>";
                        element.intent.forEach(function (intent) {
                            row += " <span class='icon icon-chat'> " + intent + "</span> ";
                        });
                    }
                    row += "</small>";
                    row += "</td>";
                    row += "<td>";
                    if (element.tags) {
                        element.tags.forEach(function (tag) {
                            row += "<span class='badge badge-pill badge-default text-lowercase'>" + tag + "</span> ";
                        });
                    }
                    row += "</td>";
                    row += "<td style='width: 20%'><span class='icon icon-stopwatch' id='stats-stopwatch-command_handler-" + element.name + "'> n/a</span></td>";
                    row += "<td style='width: 10%'><span class='icon icon-menu' id='stats-menu-command_handler-" + element.name + "'> n/a</span></td>";
                    row += "<td style='width: 5%'><a data-toggle='collapse' href='#collapse-" + element.name + "' aria-expanded='false' aria-controls='collapse-" + element.name + "'><span class='icon icon-triangle-right'/></a><span class='icon icon-tools'/></td>";
                    row += "</tr>";
                    row += "<tr class='collapse' id='collapse-" + element.name + "'>";
                    row += "<td style='width: 10%'>&nbsp</td>";
                    row += "<td colspan='4'>";
                    row += "<div class='card-inverse'><div class='card-header'>Invoke</div><div class='card-block'><h4 class='card-title'>" + element.name + "</h4><form id='" + name + "' method='get' action='/command/" + name + "'>";
                    if (element.parameters && element.parameters.length > 0) {
                        row += "<h5 class='card-title'>Parameters</h5>";
                        element.parameters.forEach(function (param) {
                            row += "<div class='form-group'><label for='" + param.name + "'>" + param.display_name + "</label><input type='text' class='form-control form-control-sm' id='" + param.name + "' name='" + param.name + "' placeholder='" + (param.default_value ? param.default_value : "") + "' aria-describedby='" + param.name + "-help'>";
                            row += "<p id='" + param.name + "-help' class='form-text text-muted'>" + (param.description ? param.description : "") + "</p>";
                            row += "</div>";
                        });
                    }
                    if (element.mapped_parameters && element.mapped_parameters.length > 0) {
                        row += "<h5 class='card-title'>Mapped Parameters</h5>";
                        element.mapped_parameters.forEach(function (param) {
                            row += "<div class='form-group'><label for='mp_" + param.local_key + "'>" + param.local_key + "</label><input type='text' class='form-control form-control-sm' id='mp_" + param.local_key + "' name='mp_" + param.local_key + "' aria-describedby='mp_" + param.local_key + "-help'>";
                            row += "<p id='mp_" + param.local_key + "-help' class='form-text text-muted'>" + (param.foreign_key ? param.foreign_key : "") + "</p>";
                            row += "</div>";
                        });
                    }
                    if (element.secrets && element.secrets.length > 0) {
                        row += "<h5 class='card-title'>Secrets</h5>";
                        element.secrets.forEach(function (param) {
                            row += "<div class='form-group'><label for='s_" + param.path + "'>" + param.path + "</label><input type='text' class='form-control form-control-sm' id='s_" + param.path + "' name='s_" + param.path + "' aria-describedby='s_" + param.path + "-help'>";
                            row += "<p id='s_" + param.path + "-help' class='form-text text-muted'>" + (param.name ? param.name : "") + "</p>";
                            row += "</div>";
                        });
                    }
                    row += "<input type='submit' class='btn btn-primary' value='Run'>";
                    row += "</form></div>";
                    row += "</td><td>";
                    row += "</td>";
                    row += "</tr>";
                    $("#commands").append(row);
                    submitForm("#" + name, element.name);
                });

                $('#events tbody').remove();
                automations.events.sort(function (a, b) {
                    return a.name.localeCompare(b.name);
                }).forEach(function (element) {

                    var row = "<tr>";
                    row += "<td style='width: 10%' id='status-event_handler-" + element.name + "'></td>";
                    row += "<td><span style='color: #FFF'>" + element.name + "</span><br><small class='small'>" + element.description;
                    row += "</small></td>";
                    row += "<td>";
                    if (element.tags) {
                        element.tags.forEach(function (tag) {
                            row += "<span class='badge badge-pill badge-default text-lowercase'>" + tag + "</span> ";
                        });
                    }
                    row += "</td>";
                    row += "<td style='width: 20%'><span class='icon icon-stopwatch' id='stats-stopwatch-event_handler-" + element.name + "'> n/a</span></td>";
                    row += "<td style='width: 10%'><span class='icon icon-menu' id='stats-menu-event_handler-" + element.name + "'> n/a</span></td>";
                    row += "<td style='width: 5%'><span class='icon icon-tools'/></td>";
                    row += "</tr>";

                    $("#events").append(row);
                });
                loaded = true;
            }

            $.each(metrics, function (key, val) {
                if (key.indexOf("command_handler.") == 0 || key.indexOf("event_handler.") == 0) {
                    var succesCount = 0;
                    var errorCount = 0;
                    var successMean = 0;
                    var errorMean = 0;
                    if (val.success) {
                        succesCount = val.success.duration.count;
                        successMean = val.success.duration.mean;
                    }
                    if (val.failure) {
                        errorCount = val.failure.duration.count;
                        errorMean = val.failure.duration.mean;
                    }

                    $('#stats-menu-' + key.split(".").join("-")).text(" " + succesCount);
                    if (errorCount > 0) {
                        $('#stats-menu-' + key.split(".").join("-")).append(" / <span class='text-danger'>" + errorCount + "</span>");
                    }

                    $('#stats-stopwatch-' + key.split(".").join("-")).text(" " + $.number(successMean, 2) + "ms");
                    if (errorCount > 0) {
                        $('#stats-stopwatch-' + key.split(".").join("-")).append(" / <span class='text-danger'>" + $.number(errorMean, 2) + "ms</span>");
                    }

                    if (errorCount > 0) {
                        $('#status-' + key.split(".").join("-")).html("<span class='badge badge-pill badge-danger text-uppercase icon icon-cross'> Failure</span>");
                    } else {
                        $('#status-' + key.split(".").join("-")).html("<span class='badge badge-pill badge-success text-uppercase icon icon-check'> Success</span>");
                    }
                } else if (key == "command_handler") {
                    var oldMean = localStorage.getItem("command-mean");
                    var oldIndicator = localStorage.getItem("command-mean-indicator");

                    var count = val.global.duration.count;
                    var mean = val.global.duration.mean;
                    var delta;

                    if (oldMean != null) {
                        if (parseFloat(oldMean) < mean) {
                            // console.log("1");
                            delta = "delta-positive";
                        } else if (mean < parseFloat(oldMean)) {
                            // console.log("2");
                            delta = "delta-negative";
                        } else {
                            // console.log("3");
                            delta = oldIndicator;
                        }
                    }

                    // console.log(mean + " " + oldMean + " " + delta + " " + oldIndicator);

                    $('#command-count').html($.number(count, 0) + " <small class='delta-indicator " + delta + "'> " + $.number(mean, 2) + "ms</small>");
                    localStorage.setItem("command-mean", mean);
                    localStorage.setItem("command-mean-indicator", delta);
                } else if (key == "event_handler") {
                    var oldMean = localStorage.getItem("event-mean");
                    var oldIndicator = localStorage.getItem("event-mean-indicator");

                    var count = val.global.duration.count;
                    var mean = val.global.duration.mean;
                    var delta;

                    if (oldMean != null) {
                        if (parseFloat(oldMean) < mean) {
                            // console.log("1");
                            delta = "delta-positive";
                        } else if (mean < parseFloat(oldMean)) {
                            // console.log("2");
                            delta = "delta-negative";
                        } else {
                            // console.log("3");
                            delta = oldIndicator;
                        }
                    }

                    // console.log(mean + " " + oldMean + " " + delta + " " + oldIndicator);

                    $('#event-count').html($.number(count, 0) + " <small class='delta-indicator " + delta + "'> " + $.number(mean, 2) + "ms</small>");
                    localStorage.setItem("event-mean", mean);
                    localStorage.setItem("event-mean-indicator", delta);
                }
            });
        }
    });
}


function submitForm(id, name) {

    var frm = $(id);
    frm.submit(function (e) {
        $('#modal-result-title').html(name);
        $('#modal-result').modal('show');
        e.preventDefault();
        $.ajax({
            type: frm.attr('method'),
            url: frm.attr('action'),
            data: frm.serialize(),
            success: function (data) {
                $('#modal-result-body').html("<p class='alert alert-success alert-full'><i class='fa fa-check' style='padding-right: 5pt' aria-hidden='true'></i>&nbsp;Command executed successfully.</p><pre style='font-size: 80%'><code class='json'>" + JSON.stringify(data, null, 2) + "</code></pre>");
                hljs.initHighlighting();
                $(document).ready(function() {
                    $('pre code').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });
                });
            },
            error: function (data) {
                $('#modal-result-body').html("<p class='alert alert-danger alert-full'><i class='fa fa-exclamation' style='padding-right: 5pt' aria-hidden='true'></i>&nbspCommand failed execution.</p><pre style='font-size: 80%'><code class='json'>" + JSON.stringify(data.responseJSON, null, 2) + "</code></pre>");
                hljs.initHighlighting();
                $(document).ready(function() {
                    $('pre code').each(function(i, block) {
                        hljs.highlightBlock(block);
                    });
                });
            },
        });
    });

    $('#modal-result').on('hidden.bs.modal', function (e) {
        $('#modal-result-body').html("<i class='fa fa-spinner fa-spin fa-1x fa-fw'></i><span class='sr-only'>Loading...</span> loading");
    })
}

$("#events-search").keyup(function () {
    var value = this.value.toLowerCase().trim();
    $("#events tr").each(function (index) {
        $(this).find("td").each(function () {
            var id = $(this).text().toLowerCase().trim();
            var not_found = (id.indexOf(value) == -1);
            $(this).closest('tr').toggle(!not_found);
            return not_found;
        });
    });
});
$("#commands-search").keyup(function () {
    var value = this.value.toLowerCase().trim();
    $("#commands tr").each(function (index) {
        if (index % 2 != 0) {
            return;
        }
        $(this).find("td").each(function () {
            var id = $(this).text().toLowerCase().trim();
            var not_found = (id.indexOf(value) == -1);
            $(this).closest('tr').toggle(!not_found);
            return not_found;
        });
    });
});

$(function () {

    var Charts = {

        _HYPHY_REGEX: /-([a-z])/g,

        _cleanAttr: function (obj) {
            delete obj["chart"]
            delete obj["datasets"]
            delete obj["datasetsOptions"]
            delete obj["labels"]
            delete obj["options"]
        },

        'spark-line': function (element) {
            var attrData = $.extend({}, $(element).data())

            var data = attrData.dataset ? eval(attrData.dataset) : []
            var datasetOptions = attrData.datasetOptions ? eval(attrData.datasetOptions) : []
            var labels = attrData.labels ? eval(attrData.labels) : {}
            var options = attrData.options ? eval('(' + attrData.options + ')') : {}

            var data = {
                labels: labels,
                datasets: data.map(function (set, i) {
                    return $.extend({
                        data: set,
                        fill: true,
                        backgroundColor: 'rgba(255,255,255,.3)',
                        borderWidth: 2,
                        borderColor: '#fff',
                        pointBorderColor: '#fff',
                        lineTension: 0.25,
                        pointRadius: 0,
                    }, datasetOptions[i])
                })
            }

            Charts._cleanAttr(attrData)

            var options = $.extend({
                animation: {
                    duration: 1000
                },
                legend: {
                    display: false
                },
                scales: {
                    xAxes: [{
                        display: false
                    }],
                    yAxes: [{
                        display: false,
                        ticks: {
                            beginAtZero: true
                        },
                    }]
                },
                tooltips: {
                    enabled: false
                },
            }, options)

            const chart = new Chart(element.getContext('2d'), {
                type: 'line',
                data: data,
                options: options
            });

            setInterval(function() {
                $.getJSON("/series/" + element.id.slice(3), function (data) {
                    const labels = data[1];
                    const dataset = data[0];
                    chart.data.labels = labels;
                    chart.data.datasets.forEach(function(ds) {
                        ds.data = dataset;
                    });
                    chart.update();
                });
            }, 5000);
        }
    }

    $(document)
        .on('redraw.bs.charts', function () {
            $('[data-chart]').each(function () {
                if ($(this).is(':visible') && !$(this).hasClass('js-chart-drawn')) {
                    Charts[$(this).attr('data-chart')](this)
                    $(this).addClass('js-chart-drawn')
                }
            })
        })
        .trigger('redraw.bs.charts')
});