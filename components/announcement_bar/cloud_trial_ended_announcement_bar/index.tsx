// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {FormattedMessage} from 'react-intl';
import {useSelector, useDispatch} from 'react-redux';

import {t} from 'utils/i18n';

import AnnouncementBar from '../default_announcement_bar';
import {AnnouncementBarTypes, Preferences, CloudBanners, ModalIdentifiers} from 'utils/constants';
import {openModal} from 'actions/views/modals';
import PricingModal from 'components/pricing_modal';
import {anyUsageDeltaValueIsNegative} from 'utils/limits';
import {GlobalState} from 'types/store';
import useGetUsageDeltas from 'components/common/hooks/useGetUsageDeltas';
import useGetLimits from 'components/common/hooks/useGetLimits';
import useGetSubscription from 'components/common/hooks/useGetSubscription';
import {isSystemAdmin} from 'mattermost-redux/utils/user_utils';
import {makeGetCategory} from 'mattermost-redux/selectors/entities/preferences';
import {savePreferences} from 'mattermost-redux/actions/preferences';
import {
    getCurrentUser,
} from 'mattermost-redux/selectors/entities/users';

const CloudTrialEndAnnouncementBar: React.FC = () => {
    const usageDeltas = useGetUsageDeltas();
    const limits = useGetLimits();
    const subscription = useGetSubscription();
    const getCategory = makeGetCategory();
    const dispatch = useDispatch();
    const preferences = useSelector((state: GlobalState) =>
        getCategory(state, Preferences.CLOUD_TRIAL_END_BANNER),
    );
    const currentUser = useSelector((state: GlobalState) =>
        getCurrentUser(state),
    );

    const shouldShowBanner = () => {
        if (!subscription) {
            return false;
        }

        // Make sure limits are loaded before showing banner
        if (!limits || !limits[1]) {
            return false;
        }

        if (!preferences) {
            return false;
        }
        if (preferences.some((pref) => pref.name === CloudBanners.HIDE && pref.value === 'true')) {
            return false;
        }

        const isFreeTrial = subscription.is_free_trial === 'true';
        if (isFreeTrial) {
            return false;
        }

        const trialEnd = new Date(subscription.trial_end_at * 1000);
        const now = new Date();

        // trial_end_at values will be 0 for all freemium subscriptions after June 15
        // Subscriptions created prior to that will almost always have a trial_end_at value, guaranteed.
        if (subscription.trial_end_at === 0 || trialEnd > now || trialEnd < new Date('2022-06-15')) {
            return false;
        }
        if (!isSystemAdmin(currentUser.roles)) {
            return false;
        }
        return true;
    };

    if (!shouldShowBanner()) {
        return null;
    }

    const handleClose = () => {
        dispatch(
            savePreferences(currentUser.id, [
                {
                    category: Preferences.CLOUD_TRIAL_END_BANNER,
                    user_id: currentUser.id,
                    name: CloudBanners.HIDE,
                    value: 'true',
                },
            ]),
        );
    };

    let message = {
        id: t('freemium.banner.trial_ended.premium_features'),
        defaultMessage:
            'Your trial has ended. Upgrade to regain access to paid features',
    };
    if (anyUsageDeltaValueIsNegative(usageDeltas)) {
        message = {id: t('freemium.banner.trial_ended.archived_data'), defaultMessage: 'Your trial has ended. Upgrade to regain access to archived data'};
    }

    return (
        <AnnouncementBar
            type={AnnouncementBarTypes.CRITICAL}
            showCloseButton={true}
            onButtonClick={() => {
                dispatch(openModal({
                    modalId: ModalIdentifiers.PRICING_MODAL,
                    dialogType: PricingModal,
                }));
            }}
            modalButtonText={t('more.details')}
            modalButtonDefaultText={'More details'}
            message={<FormattedMessage {...message}/>}
            showLinkAsButton={true}
            isTallBanner={true}
            icon={<i className='icon icon-alert-outline'/>}
            handleClose={handleClose}
        />
    );
};

export default CloudTrialEndAnnouncementBar;
