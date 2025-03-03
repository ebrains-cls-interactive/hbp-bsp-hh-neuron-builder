from hh_neuron_builder.settings import TMP_DIR

from hhnb.core.security import Sign
from hhnb.utils import messages

import os
import shutil
import time
import json


class InvalidArchiveError(Exception):
    pass


def _get_tmp_dir():
    """
    Create new tmp dir based on system time.
    """
    tmp_dir = ''
    while True:
        # change tmp dir if already exists
        tmp_dir = os.path.join(TMP_DIR, str(time.time()))
        if not os.path.exists(tmp_dir):
            break
    os.mkdir(tmp_dir)
    return tmp_dir


def validate_archive(archive):
    """
    Validate a zip file previously download from the Hodgkin-Huxley
    Neuron Builder. This function ensures that the file is not
    corrupted or modified with a malicious intention by verifying
    its sign.

    The validation process is done by recalculating the hash of the
    original zip archive. If it matches with the provided one within
    the archive, then the archive will be accepted and its path
    will be returned from the function, otherwise an
    InvalidSign error will be generated.

    Parameters
    ----------
    archive : str
        the archive path to validate

    Returns
    -------
    str
        the validated archive path

    Raises
    ------
    InvalidArchiveError
        if the archive is corrupted or not contains a needed file
    """
    tmp_dir = _get_tmp_dir()

    # unpack the archive to tmp_dir
    shutil.unpack_archive(archive, tmp_dir)

    archive_name = None
    # look for the real zip name
    for f in os.listdir(tmp_dir):
        if f.endswith('.zip'):
            archive_name = f

    # check if the archive zip is malformed
    if not archive_name:
        raise InvalidArchiveError(f'{archive} not valid.')

    for f in [archive_name, 'signature']:
        if not f in os.listdir(tmp_dir):
            raise InvalidArchiveError(f'{archive} not valid')

    archive_path = os.path.join(tmp_dir, archive_name)

    # read the zip signature
    with open(os.path.join(tmp_dir, 'signature'), 'rb') as fd:
        signature = fd.read()
    # read zip data and validate the sign
    with open(archive_path, 'rb') as fd:
        Sign.verify_data_sign(signature, fd.read())
    return archive_path


def get_signed_archive(arch_file):
    """
    Returns a new archive that include the archive itself and its sign.


    Parameters
    ----------
    arch_file : str
        the path to the archive to sign

    Returns
    -------
    str
        the path to the signed archive
    """

    tmp_dir = _get_tmp_dir()

    zip_name = os.path.split(arch_file)[1]
    arch_copy = shutil.copy2(arch_file, os.path.join(tmp_dir, zip_name))

    # create sign from archive bytes
    with open(arch_copy, 'rb') as fd:
        signature = Sign.get_data_sign(fd.read())

    # write sign to signature.txt file
    with open(os.path.join(tmp_dir, 'signature'), 'wb') as fd:
        fd.write(signature)

    # add README.txt file
    with open(os.path.join(tmp_dir, 'README.txt'), 'w') as fd:
        fd.write(messages.SIGNATURE_README_DESCRIPTION)

    # create archive with original zip, the signature's zip and the readme file
    signed_archive = shutil.make_archive(
        base_name=os.path.join(TMP_DIR, zip_name.split('.zip')[0] + '_signed'),
        format='zip',
        root_dir=tmp_dir
    )

    # remove tmp dir
    shutil.rmtree(tmp_dir)
    return signed_archive


def validate_json_file(file):
    # check the uploaded file if it is a json file
    full_path = os.path.abspath(file)
    if file.endswith('.json'):
        fd = open(full_path, 'r')
        jj = json.load(fd)
        fd.close()

        if full_path.endswith('parameters.json'):
            # check for wf_id key as main key
            if len(jj.keys()) == 1:
                main_key = list(jj.keys())[0]
                jj = jj[main_key]
            # check for distribution and add an empty field if not exists
            if not 'distributions' in jj.keys():
                jj.update({'distributions': {}})

            os.remove(full_path)
            fd = open(full_path, 'w')
            json.dump({main_key: jj} if main_key else jj, fd)
            fd.close()

    # return True if everything is ok, otherwise some exception will be raised
    return True