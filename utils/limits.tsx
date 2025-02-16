// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {FormatNumberOptions} from 'react-intl';

import {CloudUsage} from '@mattermost/types/cloud';

import {FileSizes} from './file_utils';

export function asGBString(bits: number, formatNumber: (b: number, options: FormatNumberOptions) => string): string {
    return `${formatNumber(bits / FileSizes.Gigabyte, {maximumFractionDigits: 0})}GB`;
}

export function inK(num: number): string {
    return `${Math.floor(num / 1000)}K`;
}

// usage percent meaning 0-100 (for use in usage bar)
export function toUsagePercent(usage: number, limit: number): number {
    return Math.floor((usage / limit) * 100);
}

// A negative usage value means they are over the limit. This function simply tells you whether ANY LIMIT has been reached/surpassed.
export function anyUsageDeltaValueIsNegative(deltas: CloudUsage) {
    let foundANegative = false;

    // JSON.parse recursively moves through the object tree, passing the key and value post transformation
    // We can use the `reviver` argument to see if any of those arguments are numbers, and negative.
    JSON.parse(JSON.stringify(deltas), (key, value) => {
        if (typeof value === 'number' && value < 0) {
            foundANegative = true;
        }
    });
    return foundANegative;
}
