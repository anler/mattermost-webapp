// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import classNames from 'classnames';
import {FormatLetterCaseIcon} from '@mattermost/compass-icons/components';
import {useIntl} from 'react-intl';

import KeyboardShortcutSequence, {KEYBOARD_SHORTCUTS} from 'components/keyboard_shortcuts/keyboard_shortcuts_sequence';
import OverlayTrigger from 'components/overlay_trigger';
import Tooltip from 'components/tooltip';
import Constants from 'utils/constants';

import {IconContainer} from '../formatting_bar/formatting_icon';

interface ToggleFormattingBarProps {
    onClick: React.MouseEventHandler;
    active: boolean;
    disabled: boolean;
}

const ToggleFormattingBar = (props: ToggleFormattingBarProps): JSX.Element => {
    const {onClick, active, disabled} = props;
    const {formatMessage} = useIntl();
    const iconAriaLabel = formatMessage({id: 'generic_icons.format_letter_case', defaultMessage: 'Format letter Case Icon'});

    const tooltip = (
        <Tooltip id='toggleFormattingBarButtonTooltip'>
            <KeyboardShortcutSequence
                shortcut={KEYBOARD_SHORTCUTS.msgShowFormatting}
                hoistDescription={true}
                isInsideTooltip={true}
            />
        </Tooltip>
    );

    return (
        <OverlayTrigger
            placement='top'
            delayShow={Constants.OVERLAY_TIME_DELAY}
            trigger={Constants.OVERLAY_DEFAULT_TRIGGER}
            overlay={tooltip}
        >
            <IconContainer
                type='button'
                id='toggleFormattingBarButton'
                onClick={onClick}
                disabled={disabled}
                className={classNames({active})}
            >
                <FormatLetterCaseIcon
                    size={18}
                    color={'currentColor'}
                    aria-label={iconAriaLabel}
                />
            </IconContainer>
        </OverlayTrigger>
    );
};

export default memo(ToggleFormattingBar);
