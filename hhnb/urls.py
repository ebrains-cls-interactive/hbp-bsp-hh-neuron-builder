"""hh_neuron_builder URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/3.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from functools import update_wrapper
from django.urls import path, register_converter
from django.conf.urls.static import static
from hhnb.utils import converters
from hhnb import views


register_converter(converters.ExcConverter, 'exc')
# register_converter(converters.CtxConverter, 'ctx')  # replaced by uuid
register_converter(converters.AnyCharConvert, 'any')
register_converter(converters.NewOrCloneConvert, 'new_or_cloned')
register_converter(converters.FeatOrOptsetOrModsimConverter, 'feat_or_optset_or_modsim')
register_converter(converters.FeatOrOptsetOrModsimOrOptresConverter, 'feat_or_optset_or_modsim_or_optres')
register_converter(converters.SourceOptConverter, 'source_opt_id')
register_converter(converters.WorkflowIdConverter, 'workflow_id')
register_converter(converters.CurrentOrStorageCollabConverter, 'current_or_storage_collab')
register_converter(converters.HpcConverter, 'hpc')
register_converter(converters.JobIdConverter, 'jobid')
register_converter(converters.FolderConverter, 'folder')
register_converter(converters.ConfigFileConverter, 'config_file')
register_converter(converters.FileTypeConverter, 'file_type')

urlpatterns = [
    # session refresh
    path('session-refresh', views.session_refresh, name='session-refresh'),

    # server status
    path('status', views.status, name='status'),

    # pages
    path('', views.home_page, name='home'),
    path('workflow/<exc:exc>', views.workflow_page, name='workflow'),
    path('docs/', views.index_docs, name='hhnb-docs'),
    path('docs/index/', views.index_docs, name='hhnb-docs-index'),

    # workflow apis
    path('initialize-workflow', views.initialize_workflow, name='initialize-workflow'),
    path('upload-workflow', views.upload_workflow, name='upload-workflow'),
    path('store-workflow-in-session/<exc:exc>', views.store_workflow_in_session, name='store-workflow-in-session'),
    path('clone-workflow/<exc:exc>', views.clone_workflow, name='clone-workflow'),
    path('download-workflow/<exc:exc>', views.download_workflow, name='download-workflow'),
    path('get-workflow-properties/<exc:exc>', views.get_workflow_properties, name='get-workflow-properties'),
    path('get-workflow-id/<exc:exc>', views.get_workflow_id, name='get-workflow-id'),

    # files apis
    path('upload-features/<exc:exc>', views.upload_features, name='upload-features'),
    path('upload-model/<exc:exc>', views.upload_model, name='upload-model'),
    path('upload-analysis/<exc:exc>', views.upload_analysis, name='upload-analysis'),
    path('upload-files/<exc:exc>', views.upload_files, name='upload-files'),

    path('generate-download-file/<exc:exc>', views.generate_download_file, name='generate-download-file'),
    path('download-file/<exc:exc>', views.download_file, name='download-file'),
    path('delete-files/<exc:exc>', views.delete_files, name='delete-files'),

    # optimization settings api
    path('optimization-settings/<exc:exc>', views.optimization_settings, name='optimization-settings'),

    # model catalog
    path('get-model-catalog-attribute-options', views.get_model_catalog_attribute_options, name='get-model-catalog-attribute-options'),
    path('fetch-models/<exc:exc>', views.fetch_models, name='fetch-models'),
    path('register-model/<exc:exc>', views.register_model, name='register-model'),

    # user avatar
    path('get-user-avatar', views.get_user_avatar, name='get-user-avatar'),
    path('get-user-page', views.get_user_page, name='get-user-page'),
    path('get-authentication', views.get_authentication, name='get-authentication'),

    # jobs apis
    path('run-optimization/<exc:exc>', views.run_optimization, name='run-optimization'),
    path('fetch-jobs/<exc:exc>', views.fetch_jobs, name='fetch-jobs'),
    path('fetch-job-result/<exc:exc>', views.fetch_job_results, name='fetch-job-result'),

    # analysis apis
    path('run-analysis/<exc:exc>', views.run_analysis, name='run-analysis'),

    # blue-naas apis
    path('upload-to-naas/<exc:exc>', views.upload_to_naas, name='upload-to-naas'),

    # hippocampus hub api
    path('hhf-comm', views.hhf_comm, name='hhf-comm'),
    path('hhf-etraces-dir/<exc:exc>', views.hhf_etraces_dir, name='hhf-etraces-dir'),
    path('hhf-list-files/<exc:exc>', views.hhf_list_files, name='hhf-list-files'),

    # these functions below will be deprecated soon
    path('hhf-get-files-content/<folder:folder>/<exc:exc>', views.hhf_get_files_content, name='hhf-get-files-content'),
    path('hhf-get-model-key/<exc:exc>', views.hhf_get_model_key, name='hhf-get-model-key'),
    path('hhf-apply-model-key/<exc:exc>', views.hhf_apply_model_key, name='hhf-apply-model-key'),
    path('hhf-save-config-file/<folder:folder>/<config_file:config_file>/<exc:exc>', views.hhf_save_config_file, name='hhf-save-config-file'),

    path('hhf-load-parameters-template/<exc:exc>', views.hhf_load_parameters_template, name='hhf-load-parameters-template'),

    # get service-account content
    path('get-service-account-content', views.get_service_account_content, name='get-service-account-content'),

    # get pdfs
    path('show-results/<exc:exc>', views.show_results, name='show-results'),
]
