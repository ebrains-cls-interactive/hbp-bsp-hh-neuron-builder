import Log from "./utils/logger.js";
import Workflow from "./workflow/workflow.js";
import { UploadFileDialog, OptimizationSettingsDialog, MessageDialog, ModelRegistrationDialog } from "./ui/components/dialog.js";

if (window.location.href.startsWith("https://127.0.0.1")) {
    Log.enabled = true;
}

const exc = sessionStorage.getItem("exc");
const hhf_dict = sessionStorage.getItem("hhf_dict");
const workflow = new Workflow(exc, hhf_dict);

function checkRefreshSession(response) {
    Log.debug(response);
    if (response.status === 403 && response.responseJSON.refresh_url) {
        $("#overlaywrapper").css("display", "none");
        showLoadingAnimation("Session expired.<br>Refreshing session automatically...");
        $.ajax({
            url: "/hh-neuron-builder/session-refresh",
            method: "POST",
            data: response.responseJSON,
            async: false,
            success: result => {
                document.location.href = "/hh-neuron-builder/workflow/" + exc;
            },
            error: error => {
                MessageDialog.openReloadDialog("Unable to refresh session automatically.<br>Try by reloading the page.")
            }
        })
    }
}

$(window).on("load", () => {
    if (workflow.getProps().hhf_flag) {
        $("#modalHHF").modal("show");
    }
})


// New workflow button callback
$("#wf-btn-new-wf").on("click", () => {
    showLoadingAnimation("Initializing workflow...");
    $.get("/hh-neuron-builder/initialize-workflow")
        .done((result) => {
            Log.debug(result)
            window.location.href = "/hh-neuron-builder/workflow/" + result.exc;
        }).fail((error) => {
            checkRefreshSession(error);
            Log.error("Status: " + error.status + " > " + error.responseText);
            MessageDialog.openErrorDialog(error.responseText);
        }).always(() => { hideLoadingAnimation() });
});

// Clone workflow button callback
$("#wf-btn-clone-wf").on("click", () => {
    showLoadingAnimation("Cloning current workflow...");
    $.ajax({
        url: "/hh-neuron-builder/clone-workflow/" + exc,
        method: "GET",
        async: false,
        success: (result) => {
            let win = window.open("/hh-neuron-builder/workflow/" + result.exc);
            win.focus();
        },
        error: (error) => {
            checkRefreshSession(error);
            Log.error("Status: " + error.status + " > " + error.responseText);
            if (error.status == 404) {
                MessageDialog.openReloadDialog("Something went wrong.<br>Try to reload the application.");
            } else {
                MessageDialog.openErrorDialog(error.responseText);
            }
        }
    }).always(() => { hideLoadingAnimation() });
});

// Save workflow button callback
$("#wf-btn-save").on("click", () => {
    showLoadingAnimation("Generating archive...");
    $.get("/hh-neuron-builder/download-workflow/" + exc)
        .done((result) => {
            Log.debug(result);
            window.location.href = "/hh-neuron-builder/download-workflow/" + exc + "?zip_path=" + result.zip_path;
        }).fail((error) => {
            checkRefreshSession(error);
            Log.error(error);
        }).always(() => { hideLoadingAnimation() });
})


$("#loginButton").on("click", () => {
    showLoadingAnimation("Loading...");
    $.get("/hh-neuron-builder/store-workflow-in-session/" + exc)
        .done(() => { window.location.href = "/oidc/authenticate" })
        .fail((error) => {
            hideLoadingAnimation();
            checkRefreshSession(error);
            Log.error(error);
            MessageDialog.openInfoDialog("Please, manually download first and then reupload the current workflow once you're logged in.");
        });
    return false;
})


// File upload form submission
$("#uploadForm").submit(function (e) {
    e.preventDefault();

    let formFileData = new FormData($("#uploadForm")[0]);
    UploadFileDialog.close();

    Log.debug("Uploading data: ");
    for (let v of formFileData.values()) {
        Log.debug(v);
    }

    workflow.uploadFile(formFileData);
});

// enable upload file button when any file is selected
$("#formFile").on("change", () => {
    $("#uploadFormButton").prop("disabled", false);
})

// empty file input when upload dialog is closed
$("#cancelUploadFormButton").on("click", () => {
    Log.debug("closing UploadFileDialog");
    UploadFileDialog.close();
})

// display upload dialog and set file type to upload
$(".upload-btn").on("click", async event => {
    $("#formFile").val(""); // clean formFile input
    switch (event.currentTarget.id) {
        case "feat-up-btn":
            UploadFileDialog.openFeatures();
            workflow.setUploadFileType("features");
            break;

        case "opt-up-btn":
            preOperationOnOptUp();
            break;

        case "opt-res-up-btn":
            UploadFileDialog.openAnalysisResult();
            workflow.setUploadFileType("analysis");
            break;

        default:
    }
});

function onOptUp() {
    $("#confirmationDialogModalOkButton").off("click");
    UploadFileDialog.openModel();
    workflow.setUploadFileType("model");
}

function preOperationOnOptUp() {
    if (workflow.getUIFlags().features) {
        $("#confirmationDialogModalTitle").text("Warning")
        $("#confirmationDialogModalBody").html("This operation will overwrite features and protocols files.<br>Do you want to continue anyway ?");
        $("#confirmationDialogModalCancelButton").text("Cancel");
        $("#confirmationDialogModalOkButton").text("Yes").on("click", onOptUp);
        $("#confirmationDialogModal").modal("show");
    } else {
        return onOptUp();
    }
}

// delete features
$(".delete-btn").on("click", (button) => {
    Log.debug(button);
    let file_list = ""
    switch (button.target.id) {
        case "del-feat-btn":
            if (workflow.getProps().etraces && !workflow.getUIFlags().features) {
                workflow.getProps().etraces = false;
                workflow.updateUI();
                break;
            } else {
                file_list = JSON.stringify({
                    "file_list": [
                        "config/features.json",
                        "config/protocols.json"
                    ]
                });
            }
            break;

        case "del-opt-btn":
            file_list = JSON.stringify({
                "file_list": [
                    "config/parameters.json",
                    "config/morph.json",
                    "morphology/*",
                    "mechanisms/*",
                    "x86_64/",
                    "zipfolder.py",
                    "job_parameters.json",
                    "ipyparallel.sbatch",
                    "checkpoints/",
                    "mod_nsgportal/",
                    "figures/",
                    "resume_job_settings.json",
                    "makelib.err",
                    "makelib.out",
                    "tools/",
                    "figures/",
                    "r_seed*/"
                ]
            });
            break;

        case "del-sim-btn":
            file_list = JSON.stringify({
                "file_list": [
                    "../results/*",
                    "../analysis/*"
                ]
            });
            break;

        default:
    }
    if (file_list != "") {
        workflow.deleteFiles(file_list);
    }
});


$(".download-btn").on("click", (button) => {
    Log.debug(button);
    let file_list = "";
    switch (button.target.id) {
        case "down-feat-btn":
            file_list = "pack=features";
            break;

        case "down-opt-set-btn":
            file_list = "pack=model";
            break;

        case "down-opt-btn":
            file_list = "pack=results";
            break;

        case "down-sim-btn":
            file_list = "pack=analysis";
            break;

        default:
    }
    workflow.downloadFiles(file_list)
});


// display and close settings dialog
$("#opt-set-btn").on("click", openOptimizationSettings);

async function openOptimizationSettings(event) {
    let btn = event.currentTarget.id;
    $("#" + btn).blur();

    Log.debug(btn + " clicked, optimization settings opening...");

    await workflow.getOptimizationSettingsAsPromise()
        .then(settings => {
            if (!workflow.getProps().resume) {
                $("#job-action-resume").addClass("disabled");
            } else {
                $("#job-action-resume").removeClass("disabled");
            }
            OptimizationSettingsDialog.loadSettings(settings);
            OptimizationSettingsDialog.open();
        }).catch(error => {
            checkRefreshSession(error);
            Log.error("Error on getting settings");
            Log.debug(error);
        });
}

$("#cancel-param-btn").on("click", () => {
    Log.debug("Close parameters button clicked");
    OptimizationSettingsDialog.close();
})

$("#apply-param").on("click", () => {
    Log.debug("Uploading optimization settings");
    let formData = OptimizationSettingsDialog.getJsonData();
    if (formData.hpc == "DAINT-CSCS" || formData.hpc == "SA" ) {
        showLoadingAnimation("Checking login...");
        $.get("/hh-neuron-builder/get-authentication")
            .done(() => {
                OptimizationSettingsDialog.close();
                workflow.uploadOptimizationSettings(formData);
            }).fail((error) => {
                checkRefreshSession(error);
                showHpcAuthAlert();
                hideLoadingAnimation();
            })
    } else {
        OptimizationSettingsDialog.close();
        workflow.uploadOptimizationSettings(formData);
    }
})


/* NFE */

$("#feat-efel-btn").on("click", () => {
    // showLoadingAnimation("Loading...");
    let iframe = document.getElementById("efelgui-frame");
    if (workflow.getProps().etraces) {
        iframe.setAttribute("src", "/efelg/hhf_etraces/" + exc);
    } else {
        iframe.setAttribute("src", "/efelg/?ctx=" + exc);
    }

    $("#modalNFEContainer").css("display", "block");
    $("#modalNFE").css("z-index", "100").addClass("show");
})

$("#feat-efel-btn").on("click", () => {
    $("#modalNFEContainer").css("display", "block");
    $("#modalNFE").css("z-index", "100").addClass("show");
});

$("#closeNFEButton").on("click", () => {
    $("#modalNFEContainer").removeClass("show");
})

$("#save-feature-files").on("click", () => {
    var innerDiv = document.getElementById("efelgui-frame").contentDocument ||
        getElementById("efelgui-frame").contentWindow.document;
    var folderName = innerDiv.getElementById("hiddendiv").classList[0];

    showLoadingAnimation("Saving features...");

    $.post("/hh-neuron-builder/upload-features/" + exc, { "folder": folderName })
        .done((result) => {
            $("#modalNFEContainer").removeClass("show");
            workflow.updateProperties();
        }).fail((error) => {
            hideLoadingAnimation();
            showErrorAlert(makeAlertText("Error", "Something goes wrong. Please download the Features files and upload them manually."));
        });
});

/* **** */

/* Model Catalog */

$("#opt-db-hpc-btn").on("click", preOperationOnChooseOpt);
$("#closeModalMCButton").on("click", closeModelCatalog);

function closeModelCatalog() {
    $("#closeModalMCButton").removeClass("show");
    $("#modalMC").modal("hide");
}


function preOperationOnChooseOpt() {
    if (workflow.getUIFlags().features) {
        $("#confirmationDialogModalTitle").text("Warning")
        $("#confirmationDialogModalBody").html("This operation will overwrite features and protocols files.<br>Do you want to continue anyway ?");
        $("#confirmationDialogModalCancelButton").text("Cancel");
        $("#confirmationDialogModalOkButton").text("Yes").on("click", chooseOptModel);
        $("#confirmationDialogModal").modal("show");
    } else {
        return chooseOptModel();
    }
}


var modelsReady = false;
function chooseOptModel() {
    $("#confirmationDialogModalOkButton").off("click")
    if (modelsReady) {
        $("#modalMC").modal("show");
        $("#closeModalMCButton").css("display", "block").addClass("show");
        return false;
    }
    showLoadingAnimation("Fetching models from Model Catalog...");
    $.getJSON("/hh-neuron-builder/fetch-models/" + exc, { 'model': 'all' }, function (data) {
        var counter = 0;
        if (data.length == 0) {
            openErrorDiv("Something went wrong.<br>Please restart the application.", "error");
            return;
        }
        $.each(data, function (idx, val) {
            $.each(val, function (index, e) {
                Log.debug(e);
                var model_uuid = e.id;
                var model_name = e.name;
                Log.debug(model_uuid);
                Log.debug(model_name);
                $("#modelCatalogContainer").append("<div  id=" + model_uuid + " name=" +
                    model_name + " class='mc-model main-content model-info-div'></div>");
                $("#" + model_uuid).append(
                    "<div id=" + model_uuid + " class='row model-info-div-title'><div class='col'></div><div id=" + model_uuid + " class='col flex-grow-4 flex-center'>" + e['species'] + ' > ' + e['brain_region'] + ' > ' + e['cell_type'] + ' > ' + model_name + "</div><div class='col flex-grow-1 flex-end'><a href='https://model-catalog.brainsimulation.eu/#model_id." + model_uuid + "' target='_blank'><i id='external_link' class='fas fa-external-link-alt fa-lg' title='Open in ModelCatalog'></i></a></div></div>"
                );
                $("#" + model_uuid).append("<div style='display:flex;' id=" + model_uuid + 'a' + " ></div>");
                // var img_div = document.createElement("DIV");
                // var spk_img = document.createElement("IMG");
                // var mor_img = document.createElement("IMG");
                // var mor_id = "crr_mor";
                // var spk_id = "crr_spk";
                // var spk_url = e.images[1].url;
                // var mor_url = e.images[0].url;
                // img_div.setAttribute("style", "max-width:60%;");
                // mor_img.setAttribute("id", mor_id);
                // mor_img.setAttribute("style", "max-width:50%;");
                // spk_img.setAttribute("id", spk_id);
                // spk_img.setAttribute("style", "max-width:50%;");
                // spk_img.setAttribute("src", spk_url);
                // mor_img.setAttribute("src", mor_url);
                // img_div.append(spk_img);
                // img_div.append(mor_img);
                // $("#" + model_uuid + 'a').append(img_div);
                $('#' + model_uuid + 'a').append("<div style='max-width:40%;padding:5px;font-size:13px'>" + formatDescription(e) + "</div>");
            });
        });
        $("#modalMC").modal("show");
        $("#closeModalMCButton").css("display", "block").addClass("show");
        $(".mc-model").on("click", (button) => {
            if (button.target.getAttribute("id") != "external_link") {
                closeModelCatalog();
                let optimization_id = button.currentTarget.getAttribute("id");

                showLoadingAnimation("Fetching model from the HBP Model Catalog");

                $.get("/hh-neuron-builder/fetch-models/" + exc, { "model": optimization_id })
                    .done((result) => {
                        Log.debug(result);
                        workflow.updateProperties();
                    }).fail((error) => {
                        checkRefreshSession(error);
                        Log.error(error);
                        MessageDialog.openInfoDialog(error.responseText);
                    }).always( () => hideLoadingAnimation() );
            }
        });
    }).done(() => {
        modelsReady = true;
    }).fail((error) => {
        checkRefreshSession(error);
        Log.error(error);
        MessageDialog.openInfoDialog(error.responseText);
    }).always(() => { hideLoadingAnimation() });
}

function formatDescription(meta = "") {
    var description = meta['description']
    var indexes = [];
    var all_strings = [];
    var final_string = "";
    var final_string_meta_app = "";
    var final_string_author_app = "";
    var final_string_meta_title = "<span style='font-size:16px'><br>Description<br></span>";
    var final_string_author_title = "<span style='font-size:16px'><br><br><br>Credits<br></span>";
    var allowed_tag_meta = [
        "brain_structure", "cell_soma_location",
        "cell_type", "channels", "e_type", "morphology"
    ];
    var allowed_tag_author = ["contributors", "email", "affiliations"]
    var res = description.replace(/\\\_/g, "_");

    var index = 0;
    while (index > -1) {
        index = res.indexOf('<br>');
        if (index == 0) {
            if (res.length >= 4) {
                res = res.slice(4,);
            } else {
                index == -1;
            }
        } else if (index > -1) {
            all_strings.push(res.slice(0, index));
            res = res.slice(index + 4,);
        }
    }
    for (var i = 0; i < all_strings.length; i++) {
        for (var j = 0; j < allowed_tag_meta.length; j++) {
            if (all_strings[i].indexOf(allowed_tag_meta[j]) > -1) {
                final_string_meta_app = final_string_meta_app + "<br>" + all_strings[i];
                break
            }
        }
        for (var z = 0; z < allowed_tag_author.length; z++) {
            if (all_strings[i].indexOf(allowed_tag_author[z]) > -1) {
                final_string_author_app = final_string_author_app + "<br>" + all_strings[i];
                break
            }
        }
    }
    final_string_meta_app = final_string_meta_app + "<br><strong>" + "id : " + "</strong>" + meta["id"]
    if (final_string_meta_app.length > 1) {
        final_string = final_string + final_string_meta_title + final_string_meta_app;
    }
    if (final_string_author_app.length > 1) {
        final_string = final_string + final_string_author_title + final_string_author_app;
    }

    return final_string
}

/* *************** */

$("#launch-opt-btn").on("click", () => {
    workflow.runOptimization();
})

$("#closeFileManagerButton").on("click", () => {
    Log.debug("CLOSING FILE MANAGER");
    closeFileManager();
    workflow.updateProperties();
})


/* FETCH JOBS */

$("#opt-fetch-btn").on("click", async () => {
    Log.debug('Fetch job');
    $("#overlaywrapper").css("display", "block");
    $("#overlayjobs").css("display", "block");
    await sleep(10);
    $("#overlaywrapper").addClass("show");
    $("#overlayjobs").addClass("show");
    $(".list-group-item.fetch-jobs").attr("aria-disabled", "false").removeClass("disabled active");
});

$("#cancel-job-list-btn").on("click", closeJobFetchDiv);

async function closeJobFetchDiv() {
    Log.debug('Close job fetch');

    $("#overlayjobs").removeClass("show scroll-long-content");
    $("#overlaywrapper").removeClass("show");
    await sleep(500);
    $("#overlayjobs").css("display", "none");
    $("#overlaywrapper").css("display", "none");

    resetJobFetchDiv();
}

$("#refresh-job-list-btn").on("click", () => {
    $("#overlayjobs").removeClass("scroll-long-content");
    $("#job-list-body").empty();
    $("#tableRow").css("display", "none");
    $("#refresh-job-list-btn").prop("disabled", true);
    resetProgressBar();
    displayJobList($(".list-group-item.fetch-jobs.active"));
});


function resetJobFetchDiv() {
    $("#overlayjobs").removeClass("scroll-long-content");
    $("#nsgLoginRow").css("display", "none");
    $("#saChoiseRow").css("display", "none");
    $("#spinnerRow").css("display", "none");
    $("#progressRow").css("display", "none");
    $("#tableRow").css("display", "none");
    $("#job-list-body").empty();
    $("#cancel-job-list-btn").prop("disabled", false);
    $("#refresh-job-list-btn").prop("disabled", true);
    $(".list-group-item.fetch-jobs").removeClass("disabled active clicked").attr("aria-disabled", "false");
    $("#checkNsgSpinnerButton").css("opacity", "0");
    $("#usernameNsg").removeClass("is-invalid");
    $("#passwordNsg").removeClass("is-invalid");
    $("#sa-project-dropdown-jobs-btn").prop("disabled", true);
    $("#sa-fetch-jobs").prop("disabled", true);
    resetProgressBar();
}


// Manage job list div
$(".jobs-unicore").on("click", (button) => {
    let jButton = $("#" + button.currentTarget.id);
    if (jButton.hasClass("clicked")) {
        return false;
    }
    resetJobFetchDiv();
    $("#spinnerRow").css("display", "flex");
    jButton.addClass("clicked active");
    $.get("/hh-neuron-builder/get-authentication")
        .done(() => {
            if (button.currentTarget.id == "jobsDaint") {
                displayJobList(jButton);
            } else if (button.currentTarget.id == "jobsSA") {
                jButton.addClass("active clicked");
                loadSAContent();
            }
        })
        .fail((error) => {
            checkRefreshSession(error);
            $("#spinnerRow").css("display", "none");
            showJobsAuthAlert();
            jButton.removeClass("clicked active");
        });
});


function loadSAContent() {
    $("#spinnerRow").css("display", "flex");
    $.getJSON("/hh-neuron-builder/get-service-account-content")
        .done((data) => {
            Log.debug(data);
            if (!data["service-account"]) {
                showServiceAccountAlert()
                $("#jobsSA").removeClass("clicked active").blur();
                return;
            }
            populateServiceAccountSettings(data["service-account"], "jobs");
            $("#tableRow").css("display", "none");
            $("#saChoiseRow").css("display", "flex");
            if ($("#sa-hpc-dropdown-jobs-btn").text().toLowerCase() != "select hpc") {
                $(".dropdown-item.project." + $("#sa-hpc-dropdown-jobs-btn").text().toLowerCase()).removeClass("gone");
                $("#sa-project-dropdown-jobs-btn").prop("disabled", false);
                $("#sa-fetch-jobs").prop("disabled", false);
            }
        })
        .then(() => {
            $("#spinnerRow").css("display", "none");
        })
}


$("#sa-fetch-jobs").on("click", () => {
    // resetJobFetchDiv();
    $("#saChoiseRow").css("display", "none");
    displayJobList($("#jobsSA"));
})


$("#jobsNSG").on("click", (button) => {
    let jButton = $("#" + button.currentTarget.id);
    if (jButton.hasClass("clicked")) {
        return false;
    }
    resetJobFetchDiv();
    $("#jobsNSG").addClass("active clicked");
    $("#tableRow").css("display", "none");
    $("#nsgLoginRow").css("display", "flex");
});


var jobListButtonClicked = false;
function displayJobList(button) {
    if (jobListButtonClicked) {
        return;
    }
    jobListButtonClicked = true;
    $("#overlayjobs").removeClass("scroll-long-content");
    $("#cancel-job-list-btn").prop("disabled", true);
    $("#spinnerRow").css("display", "flex");
    $(".list-group-item.fetch-jobs").addClass("disabled").attr("aria-disabled", "true");
    button.attr("aria-disabled", "false").removeClass("disabled").addClass("active");
    let hpc = button.attr("name");

    let saHPC, saProject;
    if (hpc == "SA") {
        saHPC = $("#sa-hpc-dropdown-jobs-btn").text().toLowerCase();
        saProject = $("#sa-project-dropdown-jobs-btn").text().toLowerCase();
    }

    $.getJSON("/hh-neuron-builder/fetch-jobs/" + exc, { hpc, saHPC, saProject })
        .done((results) => {
            let jobs = results.jobs;
            if ($.isEmptyObject(jobs)) {
                closeJobFetchDiv();
                let msg = "No jobs available in the <b>" + hpc + "</b> system.<br>Try using another system.";
                if (saHPC && saProject) {
                    msg = "No jobs available in the <b>" + saProject + "</b> project of the <b>Service Account</b>.<br>Try using another <i>Service Account Project</i> and/or <i>HPC System</i>.";
                }
                MessageDialog.openInfoDialog(msg);
                return false;
            }
            // jobs = $.extend({'-1': {}, '-2': {}, '-3': {}}, jobs);
            for (let job_id of Object.keys(jobs)) {
                if (job_id < 0) {
                    $("#job-list-body").append("<tr><td style='color: rgba(255, 255, 255, .5)'>1</td></tr>");
                    continue;
                }
                let job = jobs[job_id];
                let statusColor = "";
                let downloadDisabled = "disabled";
                if (job.status == "COMPLETED" || job.status == "SUCCESSFUL") {
                    statusColor = "#00802b"
                    downloadDisabled = "";
                } else if (job.status == "FAILED") {
                    statusColor = "#DF0000";
                    downloadDisabled = ""
                } else {
                    statusColor = "#DD9900";
                }
                $("#overlayjobs").removeClass("scroll-long-content");

                $("#job-list-body").append(
                    "<tr>"
                    + "<td>" + job.workflow_id + "</td>"
                    + "<td>" + job_id.toUpperCase() + "</td>"
                    + "<td style='font-weight: bold; color: " + statusColor + "'>" + job.status + "</td>"
                    + "<td>" + job.date + "</td>"
                    + "<td>"
                    + "<div id='" + job_id + "' class='row g-0'>"
                    + "<div class='col'>"
                    + "<button type='button' class='btn workflow-btn job-button download' title='Download' " + downloadDisabled + "><i class='fas fa-cloud-download-alt fa-lg'></i></button>"
                    + "</div>"
                    + "</div>"
                    + "</td>"
                    + "</tr>"
                );
            }

            $(".job-button.download").on("click", downloadJobButtonCallback);

            $("#spinnerRow").css("display", "none");
            $("#progressRow").css("display", "none");
            $("#tableRow").css("display", "flex");
            $("#refresh-job-list-btn").prop("disabled", false).blur();
            $("#cancel-job-list-btn").prop("disabled", false);
            $(".list-group-item.fetch-jobs").attr("aria-disabled", "false").removeClass("disabled clicked");

            let maxHeight = $(window).height() - $(window).height() * 30 / 100;
            if ($("#tableRow").height() > maxHeight) {
                $("#tableRow").css("max-height", maxHeight.toString() + "px");
            }
        }).fail((error) => {
            checkRefreshSession(error);
            closeJobFetchDiv();
            Log.error("Status: " + error.status + " > " + error.responseText);
            MessageDialog.openErrorDialog(error.responseText);
        });
    jobListButtonClicked = false;
}

function downloadJobButtonCallback(button) {
    let rowElement = button.currentTarget.parentElement.parentElement.parentElement.parentElement;
    let jobId = button.currentTarget.parentElement.parentElement.id;
    let jobName = rowElement.children[0].innerText;
    let jobStatus = rowElement.children[2].innerText;
    if (jobStatus == "SUCCESSFUL" || jobStatus == "COMPLETED") {
        downloadJobAndRunAnalysis(jobId, jobName);
    } else {
        downloadJobOnly(jobId);
    }
}

function setProgressBarValue(value) {
    $(".progress-bar").width(parseInt(value) + "%").attr("aria-valuenow", parseInt(value));
}

function resetProgressBar() {
    $(".progress-bar").width("0%").attr("aria-valuenow", "0");
}

function setJobProcessingTitle(message) {
    $("#jobProcessingTitle").html(message);
}

async function openJobProcessingDiv() {
    resetJobFetchDiv();
    $("#overlayjobs").removeClass("show");
    await sleep(500);
    $("#overlayjobs").css("display", "none");
    $("#overlayjobprocessing").css("display", "block");
    await sleep(10);
    $("#overlayjobprocessing").addClass("show");
}

async function closeJobProcessingDiv() {
    $("#overlayjobprocessing").removeClass("show");
    $("#overlaywrapper").removeClass("show");
    await sleep(500);
    $("#overlaywrapper").css("display", "none");
    $("#overlayjobprocessing").css("display", "none");
    resetProgressBar();
}

async function downloadJobOnly(jobId) {
    Log.debug("Downloading " + jobId);
    // disable all buttons
    const data = {
        "job_id": jobId,
        "hpc": $("button.fetch-jobs.active").attr("name"),
        "saHPC": $("#sa-hpc-dropdown-jobs-btn").text().toLowerCase(),
        "saProject": $("#sa-project-dropdown-jobs-btn").text().toLowerCase()
    }

    $("#jobProcessingTitle").html("Downloading job:<br>" + jobId.toUpperCase() + "<br>");

    openJobProcessingDiv();

    await sleep(500);
    $("#progressBarFetchJob").addClass("s20").removeClass("s40 s4 s2");
    setProgressBarValue(60);

    $.get("/hh-neuron-builder/fetch-job-result/" + exc, data)
        .done(async (downloadResult) => {
            Log.debug(downloadResult);
            $("#progressBarFetchJob").addClass("s2").removeClass("s40 s20 s4");
            setProgressBarValue(100);
            await sleep(2000);
            closeJobProcessingDiv();
            workflow.updateProperties();
        }).fail((downloadError) => {
            checkRefreshSession(downloadError);
            closeJobProcessingDiv();
            Log.error("Status: " + downloadError.status + " > " + downloadError.responseText);
            MessageDialog.openErrorDialog(downloadError.responseText);
            workflow.updateProperties();
        });
}

async function downloadJobAndRunAnalysis(jobId, jobName) {
    Log.debug("Downloading " + jobId);
    // disable all buttons
    const data = {
        "job_id": jobId,
        "job_name": jobName,
        "hpc": $("button.fetch-jobs.active").attr("name"),
        "saHPC": $("#sa-hpc-dropdown-jobs-btn").text().toLowerCase(),
        "saProject": $("#sa-project-dropdown-jobs-btn").text().toLowerCase()
    }

    $("#jobProcessingTitle").html("Downloading job:<br>" + jobId.toUpperCase() + "<br>");

    openJobProcessingDiv();

    await sleep(500);
    $("#progressBarFetchJob").addClass("s20").removeClass("s40 s4 s2");
    setProgressBarValue(40);

    $.get("/hh-neuron-builder/fetch-job-result/" + exc, data)
        .done((downloadResult) => {
            Log.debug(downloadResult);
            setJobProcessingTitle("Running Analysis...<br> ");
            $("#progressBarFetchJob").addClass("s40").removeClass("s20 s4 s2");
            setProgressBarValue(80);
            $.get("/hh-neuron-builder/run-analysis/" + exc)
                .done(async (analysisResult) => {
                    setJobProcessingTitle("Completing...<br>");
                    $("#progressBarFetchJob").addClass("s2").removeClass("s40 s20 s4");
                    setProgressBarValue(100);
                    await sleep(2000);
                    closeJobProcessingDiv();
                }).fail((analysisError) => {
                    checkRefreshSession(analysisError);
                    Log.error("Status: " + analysisError.status + " > " + analysisError.responseText);
                    closeJobProcessingDiv();
                    MessageDialog.openErrorDialog(analysisError.responseText);
                }).always(() => {
                    workflow.updateProperties();
                })
        }).fail((downloadError) => {
            checkRefreshSession(downloadError);
            closeJobProcessingDiv();
            Log.error("Status: " + downloadError.status + " > " + downloadError.responseText);
            MessageDialog.openErrorDialog(downloadError.responseText);
            workflow.updateProperties();
        })
}

$("#checkNsgLoginButton").on("click", () => {
    $("#checkNsgSpinnerButton").css("opacity", "1");

    let data = {
        "username": $("#usernameNsg").val(),
        "password": $("#passwordNsg").val()
    };
    $.post("/hh-neuron-builder/get-authentication", data)
        .done(() => {
            $("#checkNsgSpinnerButton").css("opacity", "0");
            $("#usernameNsg").removeClass("is-invalid");
            $("#passwordNsg").removeClass("is-invalid");
            $("#nsgLoginRow").css("display", "none");
            displayJobList($("#jobsNSG"));
        }).fail(() => {
            $("#checkNsgSpinnerButton").css("opacity", "0");
            $("#usernameNsg").addClass("is-invalid").attr("aria-describedbya", "User not valid");
            $("#passwordNsg").addClass("is-invalid").attr("aria-describedby", "Password not valid");
        })
});


/* ****************************** */

var blueNaasModel = "";
$("#run-sim-btn").on("click", () => {
    showLoadingAnimation("Uploading to BlueNaas...");
    $("#run-sim-btn").prop("disabled", true).blur();
    $.get("/hh-neuron-builder/upload-to-naas/" + exc)
        .done((data) => {
            if (blueNaasModel != data) {
                blueNaasModel = data;
                Log.debug("Filename uploaded " + blueNaasModel);
                $("#bluenaas-frame").attr("src", "https://blue-naas-bsp-epfl.apps.hbp.eu/#/model/" + blueNaasModel);
                $("#bluenaas-frame").on("load", function () {
                    hideLoadingAnimation();
                    $("#modalBlueNaasContainer").css("display", "block");
                    $("#modalBlueNaas").css("z-index", "100").addClass("show");
                })
            } else {
                hideLoadingAnimation();
                $("#modalBlueNaasContainer").css("display", "block");
                $("#modalBlueNaas").css("z-index", "100").addClass("show");
            }
        }).fail((error) => {
            checkRefreshSession(error);
            Log.error("Status: " + error.status + " > " + error.responseText);
            MessageDialog.openErrorDialog(error.responseText);
            hideLoadingAnimation();
        }).always(() => {
            $("#run-sim-btn").prop("disabled", false);
        })
})


$("#back-to-wf-btn").on("click", () => {
    $("#modalBlueNaasContainer").removeClass("show");
});


/*          Registration Model           */

$("#reg-mod-main-btn").on("click", async () => {
    $("#modalBlueNaasContainer").removeClass("show");
    // await sleep(300);
    ModelRegistrationDialog.open();
})

$("#reload-bluenaas").on("click", async () => {
    var blueNaasModelUrl = $("#bluenaas-frame").attr("src");
    $("#reload-bluenaas").blur();
    $("#reload-bluenaas").prop("disabled", true);
    $("#bluenaas-frame").attr("src", " ");
    await sleep(100);
    $("#bluenaas-frame").attr("src", blueNaasModelUrl);
    $("#bluenaas-frame").on("load", () => {
        if ( $("#bluenaas-frame").attr("src").startsWith("https://blue-naas-bsp-epfl.apps.hbp.eu")) {
            $("#reload-bluenaas").prop("disabled", false);
        }
    });
})

$("#cancel-model-register-btn").on("click", () => {
    ModelRegistrationDialog.close();
    $("#modalBlueNaasContainer").css("display", "block");
    $("#modalBlueNaas").css("z-index", "100").addClass("show");
})

$("#register-model-btn").on("click", () => {
    let formData = ModelRegistrationDialog.getFormData();
    workflow.registerModel(formData);
})

/* ************************************* */

$("#modalHHFCloseButton").on("click", async () => {
    if (workflow.getProps().model.optimization_files.parameters !== "") {
        $("#overlaywrapper").css("display", "block");
        $("#overlayparameterstemplate").css("display", "block");
        await sleep(200);
        $("#overlaywrapper").addClass("show");
        $("#overlayparameterstemplate").addClass("show");
    } else {
        openFileManager(true);
    }
})

$(".parametersTemplate").on("click", (event) => {
    showLoadingAnimation("Loading paramteres template...");
    let parametersType = $(event.currentTarget).attr("name");
    $.post("/hh-neuron-builder/hhf-load-parameters-template/" + exc, {type: parametersType})
        .fail((error) => {
            Log.error(error);
            MessageDialog.openErrorDialog("Please upload a parameters file manually.", "Something went wrong!");
        }).always(async () => {
            $("#overlaywrapper").removeClass("show");
            $("#overlayparameterstemplate").removeClass("show");
            await sleep(500);
            $("#overlaywrapper").css("display", "none");
            $("#overlayparameterstemplate").css("display", "none");
            workflow.updateProperties();
            await sleep(500);
            openFileManager(true);
            hideLoadingAnimation();
        })
})

// PDF Viewer
async function showPDF(blob) {
    let newBlob = new Blob([blob], {type: "application/pdf"});
    const data = window.URL.createObjectURL(newBlob);
    let win = window.open(data);
    win.focus();
    setTimeout(function() {
        window.URL.revokeObjectURL(data);
    }, 100);
}
$("#show-results-btn").on("click", () => {
    fetch("/hh-neuron-builder/show-results/" + exc)
        .then(r => r.blob())
        .then(showPDF);
})