# dev_conf.py example configuration. 
# 
# If user don't create a new dev_conf.py this one will be used to run the Hodgkin-Huxley Neuron Builder.
# 
# These settings are required to run the app and can be customized as you see fit.
#
# To generate a new random SECRET_KEY the following lines can be used.
#
# from django.core.management import utils
# SECRET_KEY = utils.get_random_secret_key()
import os
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


DEBUG = True
SECRET_KEY = '_u+88i_t*h=#bzd1g!3xx1w*89j2a&h!2^up0-^3u9-s1_zi7&'

# generate Fernet key once with Fernet.generate_key() like below 
#
# from cryptography.fernet import Fernet
# Fernet.generate_key()

FERNET_KEY = os.environ['FERNET_KEY'].encode()


# set username and password for ModelCatalog 
MODEL_CATALOG_CREDENTIALS = (os.environ['MODEL_CATALOG_USERNAME'], os.environ['MODEL_CATALOG_PASSWORD'])

# set NSG cipres-appkey
NSG_KEY = os.environ['NSG_KEY']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
    }
}

MEDIA_ROOT = os.path.join(BASE_DIR, '../app', 'media')

LOG_ROOT_PATH = os.path.join(BASE_DIR, '../log/')
