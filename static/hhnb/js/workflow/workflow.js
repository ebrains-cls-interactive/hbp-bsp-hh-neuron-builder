import { MessageDialog, ModelRegistrationDialog, OptimizationSettingsDialog } from "../ui/components/dialog.js";
import Log from "../utils/logger.js";


const GET_PROPS_BASE_URL = "/hh-neuron-builder/get-workflow-properties/";
const UPLOAD_FILES_BASE_URL = "/hh-neuron-builder/upload-files/";


function checkRefreshSession(response) {
    Log.debug(response);
    if (response.status === 403 && response.responseJSON.refresh_url) {
        showLoadingAnimation("Session expired.<br>Refreshing session automatically...");
        $.ajax({
            url: "/hh-neuron-builder/session-refresh/" + exc,
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


function enable(jObj) {
    jObj.prop("disabled", false);
}

function disable(jObj) {
    jObj.prop("disabled", true);
}


export default class Workflow {

    #exc = null;
    #props = {};

    #uploadFileType = null;


    #featuresBlock = false;
    #optfilesBlock = false;
    #optsettingsBlock = false;
    #simulationBlock = false;

    constructor(exc) {
        this.#exc = exc;
        this.updateProperties();
    }

    getProps() {
        return this.#props;
    }

    getUIFlags() {
        return {
            'features': this.#featuresBlock,
            'optimization_files': this.#optfilesBlock,
            'optimization_settings': this.#optsettingsBlock,
            'simulation': this.#simulationBlock
        }
    }

    updateProperties() {
        showLoadingAnimation("Loading...");
        $.ajax({
            url: GET_PROPS_BASE_URL + this.#exc,
            method: "GET",
            async: false,
            success: (props) => {
                this.#props = props;
                $("#wf-title").html("Workflow ID: <b>" + this.#props.id + "</b>");
                Log.debug(this.#props);
            },
            error: (error) => {
                checkRefreshSession(error);
                Log.error("Status: " + error.status + " > " + error.responseText);
                if (error.status == 404) {
                    MessageDialog.openReloadDialog();
                }
                MessageDialog.openErrorDialog(error.responseText);
            }
        }).done(() => { this.updateUI() })
            .fail((error) => {
                if (error.status == 500) {
                    return MessageDialog.openReloadDialog("<b>A critical error occurred !</b><br><br>Please restart the application and try again.<br>If the problem persists try to start a new workflow, otherwise contact us through the <a href='https://ebrains.eu/support' class='alert-link' target='_blank'>EBRAINS support</a>.");
                }
            })
            .always(() => { hideLoadingAnimation() });
    }

    #updateFeaturesUIBlock() {
        let features = this.#props.model.features.features;
        let protocols = this.#props.model.features.protocols;
        let bar = $("#feat-bar");
        let nfeButton = $("#feat-efel-btn");
        let uploadButton = $("#feat-up-btn");
        let downloadLink = $("#down-feat-btn");
        let deleteLink = $("#del-feat-btn");

        if (features != "" && protocols != "") {
            bar.html(features + "<br>" + protocols);
        } else if (features != "" && protocols == "") {
            bar.text(features);
        } else {
            bar.text(protocols);
        }
        bar.removeClass("green orange").addClass("red");
        enable(nfeButton);
        enable(uploadButton);
        disable(downloadLink);
        disable(deleteLink);
        this.#featuresBlock = false;

        if (features == "" && protocols == "") {
            bar.removeClass("red orange").addClass("green");
            bar.text("");
            disable(nfeButton);
            disable(uploadButton);
            enable(downloadLink);
            enable(deleteLink);
            this.#featuresBlock = true
        } else if (this.#props.etraces) {
            bar.removeClass("red green").addClass("orange");
            bar.text("Extract features from fetched etraces");
            disable(uploadButton);
            disable(downloadLink);
            disable(uploadButton);
            enable(deleteLink);
        }
    }

    #updateModelBlock() {
        let morphology = this.#props.model.optimization_files.morphology.morphology;
        let mechanisms = this.#props.model.optimization_files.mechanisms;
        let parameters = this.#props.model.optimization_files.parameters;
        let bar = $("#opt-files-bar");
        let chooseOptModelButton = $("#opt-db-hpc-btn");
        let uploadModelButton = $("#opt-up-btn");
        let downloadLink = $("#down-opt-set-btn");
        let deleteLink = $("#del-opt-btn");

        if (morphology == "" && mechanisms == "" && parameters == "") {
            bar.removeClass("red").addClass("green");
            bar.text("");
            disable(chooseOptModelButton);
            disable(uploadModelButton);
            enable(downloadLink);
            enable(deleteLink);
            this.#optfilesBlock = true;
        } else {
            bar.removeClass("green").addClass("red");
            bar.html(morphology + "<br>" + mechanisms + "<br>" + parameters);
            enable(chooseOptModelButton);
            enable(uploadModelButton);
            disable(downloadLink);
            disable(deleteLink);
            this.#optfilesBlock = false;
        }
    }

    #updateSettingsBlock() {
        let bar = $("#opt-param-bar");
        Log.debug(this.#props.optimization_settings);
        if (this.#props.optimization_settings[0]) {
            bar.addClass("green").removeClass("red");
            this.#optsettingsBlock = true;
        } else {
            bar.addClass("red").removeClass("green");
            this.#optsettingsBlock = false;
        }
        bar.text(this.#props.optimization_settings[1]);
    }

    #updateCellOptimizationBlock() {
        let runOptimizationButton = $("#launch-opt-btn");
        disable(runOptimizationButton);
        if (!this.#props.job_submitted) {
            if (this.#featuresBlock && this.#optfilesBlock && this.#optsettingsBlock) {
                enable(runOptimizationButton);
            }
        } else {
            disable($("#del-feat-btn"));
            disable($("#del-opt-btn"));
            disable($("#show-opt-files-btn"));
            disable($("#opt-set-btn"));
        }
    }

    #updateSimulationSettingsBlock() {
        let bar = $("#opt-res-bar");
        let fetchButton = $("#opt-fetch-btn");
        let uploadButton = $("#opt-res-up-btn");
        let showResultsLink = $("#show-results-btn");
        let downloadResultLink = $("#down-opt-btn");
        let downloadAnalysisLink = $("#down-sim-btn");
        let deleteLink = $("#del-sim-btn");
        this.#simulationBlock = false;

        if (this.#props.show_results) {
            enable(showResultsLink);
        } else {
            disable(showResultsLink);
        }

        if (this.#props.analysis) {
            bar.addClass("green").removeClass("red");
            bar.text("");
            disable(fetchButton);
            disable(uploadButton);
            if (this.#props.results) {
                enable(downloadResultLink);
            } else {
                disable(downloadResultLink);
            }
            enable(downloadAnalysisLink);
            enable(deleteLink);
            this.#simulationBlock = true
        } else {
            bar.addClass("red").removeClass("green");
            if (this.#props.results) {
                bar.text("Something went wrong. Download job results to check the error");
                disable(fetchButton);
                disable(uploadButton);
                enable(downloadResultLink);
                disable(downloadAnalysisLink);
                enable(deleteLink);
            } else {
                bar.text("Fetch job results or upload a previously downloaded \"zip\" to run analysis");
                enable(fetchButton);
                enable(uploadButton);
                disable(downloadResultLink);
                disable(downloadAnalysisLink);
                disable(deleteLink);
            }
        }

        let runSimulationButton = $("#run-sim-btn");
        if (this.#simulationBlock) {
            enable(runSimulationButton);
        } else {
            disable(runSimulationButton);
        }
    }

    updateUI() {
        this.#updateFeaturesUIBlock();
        this.#updateModelBlock();
        this.#updateSettingsBlock();
        this.#updateCellOptimizationBlock();
        this.#updateSimulationSettingsBlock();
    }

    downloadFiles(jFilesList) {
        showLoadingAnimation("Generating download package...");
        $.get("/hh-neuron-builder/generate-download-file/" + this.#exc + "?" + jFilesList)
            .done((result) => {
                Log.debug("RESULT: ");
                Log.debug(result);
                Log.debug("Files downloaded correctly");
                window.location.href = "/hh-neuron-builder/download-file/" + this.#exc + "?filepath=" + result;
            }).fail((error) => {
                checkRefreshSession(error);
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
            }).always(() => { hideLoadingAnimation() });
    }

    deleteFiles(jFilesList) {
        showLoadingAnimation("Deleting files...")
        Log.debug("Deleting files: " + jFilesList);
        $.ajax({
            url: "/hh-neuron-builder/delete-files/" + this.#exc,
            method: "POST",
            dataType: "json",
            contentType: "application/json",
            data: jFilesList,
            success: (result) => {
                Log.debug(result);
                this.updateProperties();
            },
            error: (error) => {
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
                hideLoadingAnimation()
            },
        });
    }

    setUploadFileType(fileType) {
        this.#uploadFileType = fileType;
    }

    uploadFile(formFileData) {
        var loadingMessage = "Uploading file/s"; 
        if (this.#uploadFileType == "analysis") {
            var loadingMessage = "Uploading files / running analysis.<br>Please wait...";
        }
        showLoadingAnimation(loadingMessage);
        Log.debug("Uploading files ", this.#uploadFileType);
        $.ajax({
            url: "/hh-neuron-builder/upload-" + this.#uploadFileType + "/" + this.#exc,
            method: "POST",
            data: formFileData,
            contentType: false, // need to upload files correctly
            processData: false,
            success: (result) => {
                Log.debug(result);
            },
            error: (error) => {
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
                hideLoadingAnimation();
            },
        }).always(() => {
            this.updateProperties();
        });
    }

    getOptimizationSettingsAsPromise() {
        showLoadingAnimation("Loading settings...");
        return new Promise((resolve, reject) => {
            $.getJSON("/hh-neuron-builder/optimization-settings/" + this.#exc)
                .done(results => {
                    resolve(results);
                }).fail(error => {
                    reject(error);
                }).always(() => {
                    hideLoadingAnimation();
                })
        })
    }

    // will be deprecated
    getOptimizationSettings() {
        let settings = null;
        showLoadingAnimation("Loading settings...");
        $.ajax({
            url: "/hh-neuron-builder/optimization-settings/" + this.#exc,
            method: "GET",
            async: false,
            headers: { "Accept": "application/json" },
            success: (result) => {
                settings = result;
                if (settings.hpc == "NSG") {
                    $("#username_submit").removeClass("is-invalid").addClass("is-valid");
                    $("#password_submit").removeClass("is-invalid").addClass("is-valid");
                }
                return settings;
            },
            error: (error) => {
                checkRefreshSession(error);
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
            }
        }).always(() => { hideLoadingAnimation() });
        return settings;
    }

    uploadOptimizationSettings(jData) {
        showLoadingAnimation("Loading...");
        Log.debug("Uploading settings");
        $.ajax({
            url: "/hh-neuron-builder/optimization-settings/" + this.#exc,
            method: "POST",
            data: JSON.stringify(jData),
            processData: false,
            contentType: false,
            success: (result) => {
                if (jData.hpc == "NSG") {
                    $("#username_submit").removeClass("is-invalid").addClass("is-valid");
                    $("#password_submit").removeClass("is-invalid").addClass("is-valid");
                }
            },
            error: (error) => {
                hideLoadingAnimation();
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
                if (error.responseText == "Invalid credentials.") {
                    $("#username_submit").removeClass("is-valid").addClass("is-invalid");
                    $("#password_submit").removeClass("is-valid").addClass("is-invalid");
                }
            }
        }).always(() => {
            this.updateProperties();
        });
    }

    runOptimization() {
        showLoadingAnimation("Run optimization on HPC system<br>Could take a while, please wait...");
        Log.debug("Run optimization");
        $.ajax({
            url: "/hh-neuron-builder/run-optimization/" + this.#exc,
            method: "GET",
            success: (result) => {
                Log.debug(result);
                this.updateProperties(false);
                MessageDialog.openSuccessDialog(result);
            },
            error: (error) => {
                Log.error("Status: " + error.status + " > " + error.responseText);
                MessageDialog.openErrorDialog(error.responseText);
                hideLoadingAnimation();
            }
        });
    }

    registerModel(formData) {
        showLoadingAnimation("Registering model on Model Catalog...");
        $.ajax({
            url: "/hh-neuron-builder/register-model/" + this.#exc,
            method: "POST",
            data: formData,
            processData: false,
            contentType: false,
            success: (result) => {
                ModelRegistrationDialog.close();
                MessageDialog.openSuccessDialog(result);
            },
            error: (error) => {
                Log.error("Status: " + error.status + " > " + error.responseText);
                
                if (error.status == 500) {
                    // ModelRegistrationDialog.close();
                }
                MessageDialog.openErrorDialog(error.responseText);
            }
        }).always(() => hideLoadingAnimation() );
    }
}
