// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {isEmpty} from 'lodash';

import {FormattedMessage} from 'react-intl';

import {PreferenceType} from '@mattermost/types/preferences';
import {UserProfile} from '@mattermost/types/users';
import {AnalyticsRow} from '@mattermost/types/admin';
import {Subscription} from '@mattermost/types/cloud';

import {trackEvent} from 'actions/telemetry_actions';

import {t} from 'utils/i18n';
import PurchaseModal from 'components/purchase_modal';

import {ModalData} from 'types/actions';

import {
    Preferences,
    CloudBanners,
    AnnouncementBarTypes,
    ModalIdentifiers,
    TELEMETRY_CATEGORIES,
    TrialPeriodDays,
} from 'utils/constants';
import {getLocaleDateFromUTC} from 'utils/utils';

import AnnouncementBar from '../default_announcement_bar';

type Props = {
    userIsAdmin: boolean;
    isFreeTrial: boolean;
    currentUser: UserProfile;
    preferences: PreferenceType[];
    daysLeftOnTrial: number;
    isCloud: boolean;
    analytics?: Record<string, number | AnalyticsRow[]>;
    subscription?: Subscription;
    actions: {
        savePreferences: (userId: string, preferences: PreferenceType[]) => void;
        getStandardAnalytics: () => void;
        getCloudSubscription: () => void;
        openModal: <P>(modalData: ModalData<P>) => void;
    };
};

class CloudTrialAnnouncementBar extends React.PureComponent<Props> {
    async componentDidMount() {
        if (isEmpty(this.props.analytics)) {
            await this.props.actions.getStandardAnalytics();
        }

        if (!isEmpty(this.props.subscription) && !isEmpty(this.props.analytics) && this.shouldShowBanner()) {
            const {daysLeftOnTrial} = this.props;
            if (this.isDismissable()) {
                trackEvent(
                    TELEMETRY_CATEGORIES.CLOUD_ADMIN,
                    `bannerview_trial_${daysLeftOnTrial}_days`,
                );
            } else {
                trackEvent(
                    TELEMETRY_CATEGORIES.CLOUD_ADMIN,
                    'bannerview_trial_limit_ended',
                );
            }
        }
    }

    handleClose = async () => {
        const {daysLeftOnTrial} = this.props;
        let dismissValue = '';
        if (daysLeftOnTrial > TrialPeriodDays.TRIAL_WARNING_THRESHOLD) {
            dismissValue = '14_days_banner';
        } else if (daysLeftOnTrial <= TrialPeriodDays.TRIAL_WARNING_THRESHOLD && daysLeftOnTrial >= TrialPeriodDays.TRIAL_1_DAY) {
            dismissValue = '3_days_banner';
        }
        trackEvent(
            TELEMETRY_CATEGORIES.CLOUD_ADMIN,
            `dismissed_banner_trial_${daysLeftOnTrial}_days`,
        );
        await this.props.actions.savePreferences(this.props.currentUser.id, [{
            category: Preferences.CLOUD_TRIAL_BANNER,
            user_id: this.props.currentUser.id,
            name: CloudBanners.TRIAL,
            value: `${dismissValue}`,
        }]);
    }

    shouldShowBanner = () => {
        const {isFreeTrial, userIsAdmin, isCloud} = this.props;
        return isFreeTrial && userIsAdmin && isCloud;
    }

    isDismissable = () => {
        const {daysLeftOnTrial} = this.props;
        let dismissable = true;

        if (daysLeftOnTrial <= TrialPeriodDays.TRIAL_1_DAY) {
            dismissable = false;
        }
        return dismissable;
    }

    showModal = () => {
        const {daysLeftOnTrial} = this.props;
        if (this.isDismissable()) {
            trackEvent(
                TELEMETRY_CATEGORIES.CLOUD_ADMIN,
                `click_subscribe_from_trial_banner_${daysLeftOnTrial}_days`,
            );
        } else {
            trackEvent(
                TELEMETRY_CATEGORIES.CLOUD_ADMIN,
                'click_subscribe_from_banner_trial_ended',
            );
        }
        this.props.actions.openModal({
            modalId: ModalIdentifiers.CLOUD_PURCHASE,
            dialogType: PurchaseModal,
        });
    }

    render() {
        const {daysLeftOnTrial, preferences} = this.props;

        if (isEmpty(this.props.analytics)) {
            // If the analytics aren't yet loaded, return null to avoid a flash of the banner
            return null;
        }

        if (!this.shouldShowBanner()) {
            return null;
        }

        if ((preferences.some((pref) => pref.name === CloudBanners.TRIAL && pref.value === '14_days_banner') && daysLeftOnTrial > TrialPeriodDays.TRIAL_WARNING_THRESHOLD) ||
            ((daysLeftOnTrial <= TrialPeriodDays.TRIAL_WARNING_THRESHOLD && daysLeftOnTrial >= TrialPeriodDays.TRIAL_1_DAY) &&
            preferences.some((pref) => pref.name === CloudBanners.TRIAL && pref.value === '3_days_banner'))) {
            return null;
        }

        const trialMoreThan3DaysMsg = (
            <FormattedMessage
                id='admin.billing.subscription.cloudTrial.moreThan3Days'
                defaultMessage='Your trial has started! There are {daysLeftOnTrial} days left'
                values={{daysLeftOnTrial}}
            />
        );

        const trialLessThan3DaysMsg = (
            <FormattedMessage
                id='admin.billing.subscription.cloudTrial.daysLeftOnTrial'
                defaultMessage='There are {daysLeftOnTrial} days left on your free trial'
                values={{daysLeftOnTrial}}
            />
        );

        const userEndTrialDate = getLocaleDateFromUTC((this.props.subscription?.trial_end_at as number / 1000), 'MMMM Do YYYY');
        const userEndTrialHour = getLocaleDateFromUTC((this.props.subscription?.trial_end_at as number / 1000), 'HH:mm:ss', this.props.currentUser.timezone?.automaticTimezone as string);

        const trialLastDaysMsg = (
            <FormattedMessage
                id='admin.billing.subscription.cloudTrial.lastDay'
                defaultMessage='This is the last day of your free trial. Your access will expire on {userEndTrialDate} at {userEndTrialHour}.'
                values={{userEndTrialHour, userEndTrialDate}}
            />
        );

        let bannerMessage;
        let icon;
        switch (daysLeftOnTrial) {
        case TrialPeriodDays.TRIAL_WARNING_THRESHOLD:
        case TrialPeriodDays.TRIAL_2_DAYS:
            bannerMessage = trialLessThan3DaysMsg;
            break;
        case TrialPeriodDays.TRIAL_1_DAY:
        case TrialPeriodDays.TRIAL_0_DAYS:
            bannerMessage = trialLastDaysMsg;
            break;
        default:
            bannerMessage = trialMoreThan3DaysMsg;
            icon = <i className='icon-check-outline-circle'/>;
            break;
        }

        const dismissable = this.isDismissable();

        return (
            <AnnouncementBar
                type={dismissable ? AnnouncementBarTypes.ADVISOR : AnnouncementBarTypes.CRITICAL}
                showCloseButton={dismissable}
                handleClose={this.handleClose}
                onButtonClick={this.showModal}
                modalButtonText={t('admin.billing.subscription.cloudTrial.subscribeButton')}
                modalButtonDefaultText={'Subscribe Now'}
                message={bannerMessage}
                showLinkAsButton={true}
                icon={icon}
            />
        );
    }
}

export default CloudTrialAnnouncementBar;
