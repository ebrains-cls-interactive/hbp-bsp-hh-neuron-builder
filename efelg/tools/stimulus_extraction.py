import os
import numpy
import logging
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

def stim_feats_from_meta(crr_dict, num_segments):
    """
    Extract stimulus information from metadata file
    """

    try:
        # read stimulus information
        ty = str(crr_dict['stimulus_type'])
        tu = crr_dict['stimulus_time_unit']
        st = crr_dict['stimulus_start'][0]
        en = crr_dict['stimulus_end'][0]
        u = str(crr_dict['stimulus_unit'])
        fa = float(format(crr_dict['stimulus_first_amplitude'][0], '.4f'))
        inc = float(format(crr_dict['stimulus_increment'][0], '.4f'))
        ru = crr_dict['sampling_rate_unit'][0]
        r = crr_dict['sampling_rate'][0]
        if tu == 's': 
            st = st * 1e3
            en = en * 1e3
    except:
        return 0, []

    all_stim_feats = []
    # for every segment in the axon file
    for i in range(num_segments):

        # compute current stimulus amplitude
        crr_val = float(format(fa + inc * float(format(i, '.4f')), '.4f'))
        crr_stim_feats = (ty, st, en, crr_val, u)
        # store current tuple
        all_stim_feats.append(crr_stim_feats)

    logger.info(num_segments)
    logger.info(all_stim_feats)

    return 1, all_stim_feats


def stim_feats_from_header(header):
    """
    Extract stimulus information from abf file header
    """

     # read sampling rate
    sampling_rate = 1.e6 / header['protocol']['fADCSequenceInterval'] 
    version = header['fFileVersionNumber']  # read file version

    # extract protocol for version >=.2
    if version >= 2.:
        # read info for DAC
        dictEpochInfoPerDAC = header['dictEpochInfoPerDAC']  # read info for DAC

        # if field is empty
        if not dictEpochInfoPerDAC:
            return 0, "No 'dictEpochInfoPerDAC' field"

        # if field is not empty, read all stimulus segments
        else:
            valid_epoch_dicts = [k for k, v in dictEpochInfoPerDAC.iteritems() 
                                 if bool(v)]

            # if more than one channel is activated for the stimulus 
            # or a number of epochs different than 3 is found
            if len(valid_epoch_dicts) != 1 or len(dictEpochInfoPerDAC[0]) != 3:
                return 0, 'Exiting. More than one channel used for stimulation'
            else:
                stim_epochs = dictEpochInfoPerDAC[k]  # read all stimulus epochs
                # read enabled waveforms
                stim_ch_info = [(i['DACChNames'], i['DACChUnits'], i['nDACNum']) 
                                for i in header['listDACInfo'] 
                                if bool(i['nWaveformEnable'])]  

                # if epoch initial levels and increment are not compatible 
                # with a step stimulus
                if (stim_epochs[0]['fEpochInitLevel'] != 
                    stim_epochs[2]['fEpochInitLevel'] or
                        stim_epochs[0]['fEpochLevelInc'] != 
                        stim_epochs[2]['fEpochLevelInc'] or
                        float(format(stim_epochs[0]['fEpochLevelInc'], '.4f')) 
                        != 0 or
                        (len(stim_ch_info) != 1 or stim_ch_info[0][2] != k)):

                    # return 0 with message
                    return 0, "Detected stimulus incompatible with the steps"
                else:
                    ty = "step"
                    u = stim_ch_info[0][1]
                    # number of ADC channels
                    nADC = header['sections']['ADCSection']['llNumEntries']
                    # number of DAC channels
                    nDAC = header['sections']['DACSection']['llNumEntries']
                    # number of samples per episode
                    nSam = header['protocol']['lNumSamplesPerEpisode']/nADC
                    # number of actual episodes
                    nEpi = header['lActualEpisodes']  
                    # read first stimulus epoch
                    e_zero = \
                        header['dictEpochInfoPerDAC'][stim_ch_info[0][2]][0]
                    # read second stimulus epoch
                    e_one = \
                        header['dictEpochInfoPerDAC'][stim_ch_info[0][2]][1]
                    # read third stimulus epoch
                    e_two = \
                        header['dictEpochInfoPerDAC'][stim_ch_info[0][2]][2]  
                    # index of stimulus beginning
                    i_last = int(nSam*15625/10**6)  

                    all_stim_info = []  # create array for all stimulus info

                    # step increment
                    e_one_inc = float(format(e_one['fEpochLevelInc'], '.4f'))
                    # step initial level
                    e_one_init_level = float(format(e_one['fEpochInitLevel'], 
                                                    '.4f'))  

                    # for every episode, compute stimulus start, stimulus end, 
                    # stimulus value
                    for epiNum in range(nEpi):
                        st = i_last + e_zero['lEpochInitDuration'] + \
                            e_zero['lEpochDurationInc'] * epiNum
                        en = st + e_one['lEpochInitDuration'] + \
                            e_one['lEpochDurationInc'] * epiNum
                        crr_val_full = float(format(e_one_init_level + 
                                                    e_one_inc * epiNum, '.4f'))
                        crr_val = float(format(crr_val_full, '.4f'))
                        st = 1/sampling_rate * st * 1e3
                        en = 1/sampling_rate * en * 1e3
                        all_stim_info.append((ty, st, en, crr_val, u))

                    return 1, all_stim_info