// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GenericAction} from 'mattermost-redux/types/actions';
import {CloudUsage} from '@mattermost/types/cloud';
import {CloudTypes} from 'mattermost-redux/action_types';

const emptyUsage = {
    files: {
        totalStorage: 0,
        totalStorageLoaded: false,
    },
    messages: {
        history: 0,
        historyLoaded: false,
    },
    boards: {
        cards: 0,
        cardsLoaded: false,
    },
    teams: {
        active: 0,
        teamsLoaded: false,
    },
    integrations: {
        enabled: 0,
        enabledLoaded: false,
    },
};

// represents the usage associated with this workspace
export default function usage(state: CloudUsage = emptyUsage, action: GenericAction) {
    switch (action.type) {
    case CloudTypes.RECEIVED_MESSAGES_USAGE: {
        return {
            ...state,
            messages: {
                history: action.data,
                historyLoaded: true,
            },
        };
    }
    case CloudTypes.RECEIVED_FILES_USAGE: {
        return {
            ...state,
            files: {
                totalStorage: action.data,
                totalStorageLoaded: true,
            },
        };
    }
    case CloudTypes.RECEIVED_INTEGRATIONS_USAGE: {
        return {
            ...state,
            integrations: {
                enabled: action.data,
                enabledLoaded: true,
            },
        };
    }
    case CloudTypes.RECEIVED_BOARDS_USAGE: {
        return {
            ...state,
            boards: {
                cards: action.data,
                cardsLoaded: true,
            },
        };
    }
    default:
        return state;
    }
}
