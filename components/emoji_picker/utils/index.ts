// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import isEmpty from 'lodash/isEmpty';

import {isSystemEmoji} from 'mattermost-redux/utils/emoji_utils';
import {Emoji, EmojiCategory, SystemEmoji} from '@mattermost/types/emojis';

import {
    Categories,
    Category,
    CategoryOrEmojiRow,
    CategoryHeaderRow,
    EmojiRow,
    EmojiPosition,
    EmojiCursor,
} from 'components/emoji_picker/types';

import {EmojiIndicesByCategory, Emojis as EmojisJson, EmojiIndicesByUnicode} from 'utils/emoji.jsx';
import {getSkin} from 'utils/emoticons';
import {compareEmojis} from 'utils/emoji_utils';
import EmojiMap from 'utils/emoji_map';

import {
    EMOJI_PER_ROW,
    CATEGORY_HEADER_ROW,
    EMOJIS_ROW,
    SEARCH_RESULTS,
    RECENT,
    RECENT_EMOJI_CATEGORY,
    CATEGORIES,
} from 'components/emoji_picker/constants';

export function isCategoryHeaderRow(row: CategoryOrEmojiRow): row is CategoryHeaderRow {
    return row.type === CATEGORY_HEADER_ROW;
}

export function getFilteredEmojis(allEmojis: Record<string, Emoji>, filter: string, recentEmojisString: string[]): Emoji[] {
    const filteredEmojisWithRecent = Object.values(allEmojis).filter((emoji) => {
        const aliases = isSystemEmoji(emoji) ? emoji.short_names : [emoji.name];

        for (let i = 0; i < aliases.length; i++) {
            if (aliases[i].toLowerCase().includes(filter)) {
                return true;
            }
        }

        return false;
    });

    // Form a separate array of recent emojis
    const recentEmojis = filteredEmojisWithRecent.filter((emoji) => {
        const emojiId = isSystemEmoji(emoji) ? emoji.unified : emoji.id;
        return recentEmojisString.includes(emojiId.toLowerCase());
    });

    const sortedRecentEmojis = recentEmojis.sort((firstEmoji, secondEmoji) =>
        compareEmojis(firstEmoji, secondEmoji, filter),
    );

    // Seprate out recent emojis from the rest of the emoji result
    const filtertedEmojisMinusRecent = filteredEmojisWithRecent.filter((emoji) => {
        const emojiId = isSystemEmoji(emoji) ? emoji.unified : emoji.id;
        return !recentEmojisString.includes(emojiId.toLowerCase());
    });

    const sortedFiltertedEmojisMinusRecent = filtertedEmojisMinusRecent.sort((firstEmoji, secondEmoji) =>
        compareEmojis(firstEmoji, secondEmoji, filter),
    );

    const filteredEmojis = [...sortedRecentEmojis, ...sortedFiltertedEmojisMinusRecent];

    return filteredEmojis;
}

// Note : This function is not an idea implementation, a more better and efficeint way to do this come when we make changes to emoji json.
function convertEmojiToUserSkinTone(emoji: SystemEmoji, emojiSkin: string, userSkinTone: string) {
    let newEmojiId = '';

    // If its a default (yellow) emoji, get the skin variation from its property
    if (emojiSkin === 'default') {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const variation = Object.keys(emoji?.skin_variations).find((skinVariation) => skinVariation.includes(userSkinTone));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        newEmojiId = variation ? emoji.skin_variations[variation].unified : emoji.unified;
    } else if (userSkinTone === 'default') {
        // If default (yellow) skin is selected, remove the skin code from emoji id
        newEmojiId = emoji.unified.replaceAll(/-(1F3FB|1F3FC|1F3FD|1F3FE|1F3FF)/g, '');
    } else {
        // If non default skin is selected, add the new skin selected code to emoji id
        newEmojiId = emoji.unified.replaceAll(/(1F3FB|1F3FC|1F3FD|1F3FE|1F3FF)/g, userSkinTone);
    }

    const emojiIndex = EmojiIndicesByUnicode.get(newEmojiId.toLowerCase()) as number;
    return EmojisJson[emojiIndex];
}

export function getEmojisByCategory(
    allEmojis: Record<string, Emoji>,
    category: Category,
    categoryName: EmojiCategory,
    userSkinTone: string,
): Emoji[] {
    const emojiIds = category?.emojiIds ?? [];

    if (emojiIds.length === 0) {
        return [];
    }

    // For recent category, perform checks for skin tone uniformity
    if (categoryName === 'recent') {
        const emojiIds = category?.emojiIds ?? [];

        const recentEmojis = new Map();

        emojiIds.forEach((emojiId) => {
            const emoji = allEmojis[emojiId];

            // Its a custom emoji
            if (emoji.category === 'custom') {
                recentEmojis.set(emojiId, emoji);
            } else {
                // Its a system emoji
                const emojiSkin = getSkin(emoji);
                if (emojiSkin && emojiSkin !== userSkinTone) {
                    const emojiWithUserSkin = convertEmojiToUserSkinTone(emoji, emojiSkin, userSkinTone);
                    if (emojiWithUserSkin && emojiWithUserSkin.unified) {
                        recentEmojis.set(emojiWithUserSkin.unified, emojiWithUserSkin);
                    }
                } else {
                    // Emojis skin is same as userskin tone
                    recentEmojis.set(emojiId, emoji);
                }
            }
        });

        return Array.from(recentEmojis.values());
    }

    // For all other categories, return emojis of the categoryies from allEmojis
    return emojiIds.map((emojiId) => allEmojis[emojiId]);
}

export function getUpdatedCategoriesAndAllEmojis(
    emojiMap: EmojiMap,
    recentEmojis: string[],
    userSkinTone: string,
    allEmojis: Record<string, Emoji>,
): [Categories, Record<string, Emoji>] {
    const customEmojiMap = emojiMap.customEmojis;
    const categories: Categories = recentEmojis.length ? {...RECENT_EMOJI_CATEGORY, ...CATEGORIES} : CATEGORIES;

    Object.keys(categories).forEach((categoryName) => {
        let categoryEmojis: Emoji[] = [];

        if (categoryName === 'recent' && recentEmojis.length) {
            categoryEmojis = [...recentEmojis].
                reverse().
                filter((name) => {
                    return emojiMap.has(name);
                }).
                map((name) => {
                    return emojiMap.get(name);
                });
        } else {
            const indices = (EmojiIndicesByCategory.get(userSkinTone) as Map<string, number[]>).get(categoryName) || [];
            categoryEmojis = indices.map((index) => EmojisJson[index]);

            if (categoryName === 'custom') {
                categoryEmojis = categoryEmojis.concat([...customEmojiMap.values()]);
            }
        }

        // populate each category with emojiIds
        categories[categoryName as EmojiCategory].emojiIds = categoryEmojis.
            map((emoji: Emoji) => (isSystemEmoji(emoji) ? emoji.unified.toLowerCase() : emoji.id));

        // populate allEmojis with emoji objects
        categoryEmojis.forEach((currentEmoji: Emoji) => {
            const currentEmojiId = isSystemEmoji(currentEmoji) ? currentEmoji.unified.toLowerCase() : currentEmoji.id;
            allEmojis[currentEmojiId] = {...allEmojis[currentEmojiId], ...currentEmoji};

            if (!isSystemEmoji(currentEmoji)) {
                allEmojis[currentEmojiId] = {...allEmojis[currentEmojiId], category: 'custom'};
            }
        });
    });

    const updatedAllEmojis = Object.assign({}, allEmojis);

    return [categories, updatedAllEmojis];
}

export function calculateCategoryRowIndex(categories: Categories, categoryName: EmojiCategory) {
    const categoryIndex = Object.keys(categories).findIndex((category) => category === categoryName);

    const categoriesTillCurrentCategory = Object.values(categories).slice(0, categoryIndex);

    const rowIndex = categoriesTillCurrentCategory.reduce((previousIndexSum, currentCategory) => {
        const emojisInCurrentCategory = currentCategory?.emojiIds?.length ?? 0;

        const numberOfEmojiRowsInCurrentCategory = Math.ceil(emojisInCurrentCategory / EMOJI_PER_ROW);

        return previousIndexSum + numberOfEmojiRowsInCurrentCategory + 1;
    }, 0);

    return rowIndex;
}

export function splitEmojisToRows(emojis: Emoji[], categoryIndex: number, categoryName: EmojiCategory, rowIndexCounter: number): [EmojiRow[], number] {
    if (emojis.length === 0) {
        return [[], rowIndexCounter - 1];
    }

    const emojiRows: EmojiRow[] = [];
    let emojisIndividualRow: EmojiRow['items'] = [];
    let emojiRowIndexCounter = rowIndexCounter;

    // create `EMOJI_PER_ROW` row lenght array of emojis
    emojis.forEach((emoji, emojiIndex) => {
        emojisIndividualRow.push({
            categoryIndex,
            categoryName,
            emojiIndex,
            emojiId: isSystemEmoji(emoji) ? emoji.unified : emoji.id,
            item: emoji,
        });

        if ((emojiIndex + 1) % EMOJI_PER_ROW === 0) {
            emojiRows.push({
                index: emojiRowIndexCounter,
                type: EMOJIS_ROW,
                items: emojisIndividualRow,
            });

            emojiRowIndexCounter++;
            emojisIndividualRow = [];
        }
    });

    // if there are emojis left over that is less than `EMOJI_PER_ROW`, add them in next row
    if (emojisIndividualRow.length) {
        emojiRows.push({
            index: emojiRowIndexCounter,
            type: EMOJIS_ROW,
            items: emojisIndividualRow,
        });

        emojiRowIndexCounter++;
    }

    return [emojiRows, emojiRowIndexCounter];
}

export function createEmojisPositions(categoryOrEmojiRows: CategoryOrEmojiRow[]): EmojiPosition[] {
    const emojisPositions2DArray: EmojiPosition[][] = [];

    categoryOrEmojiRows.forEach((categoryOrEmojiRow) => {
        if (!isCategoryHeaderRow(categoryOrEmojiRow)) {
            const rowIndex = categoryOrEmojiRow.index;
            const emojisOfARow: EmojiPosition[] = categoryOrEmojiRow.items.map((emojiItem) => ({
                rowIndex,
                emojiId: emojiItem.emojiId,
                categoryName: emojiItem.categoryName,
            }));

            emojisPositions2DArray.push(emojisOfARow);
        }
    });

    const emojisPositions = emojisPositions2DArray.flat();
    return emojisPositions;
}

export function createCategoryAndEmojiRows(
    allEmojis: Record<string, Emoji>,
    categories: Categories,
    filter: string,
    userSkinTone: string,
): [CategoryOrEmojiRow[], EmojiPosition[]] {
    if (isEmpty(allEmojis) || isEmpty(categories)) {
        return [[], []];
    }

    // If search is active, return filtered emojis
    if (filter.length) {
        const searchCategoryRow: CategoryHeaderRow = {
            index: 0,
            type: CATEGORY_HEADER_ROW,
            items: [{
                categoryIndex: 0,
                categoryName: SEARCH_RESULTS,
                emojiIndex: -1,
                emojiId: '',
                item: undefined,
            }],
        };

        const recentEmojiIds = categories?.[RECENT]?.emojiIds ?? [];
        const filteredEmojis = getFilteredEmojis(allEmojis, filter, recentEmojiIds);
        const [searchEmojisRows] = splitEmojisToRows(filteredEmojis, 0, SEARCH_RESULTS, 1);

        const searchEmojiRowsWithCategoryHeader: CategoryOrEmojiRow[] = [searchCategoryRow, ...searchEmojisRows];

        const emojisPositions = createEmojisPositions(searchEmojiRowsWithCategoryHeader);

        return [searchEmojiRowsWithCategoryHeader, emojisPositions];
    }

    let sortedEmojis: Emoji[] = [];

    let rowIndexCounter = 0;
    let categoryOrEmojisRows: CategoryOrEmojiRow[] = [];
    Object.keys(categories).forEach((categoryName, categoryIndex) => {
        const emojis = getEmojisByCategory(
            allEmojis,
            categories[categoryName as EmojiCategory],
            categoryName as EmojiCategory,
            userSkinTone,
        );

        sortedEmojis = [...sortedEmojis, ...emojis];

        // Add for the category header
        const categoryRow: CategoryHeaderRow = {
            index: rowIndexCounter,
            type: CATEGORY_HEADER_ROW,
            items: [{
                categoryIndex,
                categoryName: categoryName as EmojiCategory,
                emojiIndex: -1,
                emojiId: '',
                item: undefined,
            }],
        };

        categoryOrEmojisRows = [...categoryOrEmojisRows, categoryRow];
        rowIndexCounter += 1;

        const [emojiRows, increasedRowIndexCounter] = splitEmojisToRows(emojis, categoryIndex, categoryName as EmojiCategory, rowIndexCounter);

        rowIndexCounter = increasedRowIndexCounter;

        categoryOrEmojisRows = [...categoryOrEmojisRows, ...emojiRows];
    });

    const emojisPositions = createEmojisPositions(categoryOrEmojisRows);

    return [categoryOrEmojisRows, emojisPositions];
}

export function getCursorProperties(cursorRowIndex: EmojiCursor['rowIndex'], cursorEmojiId: EmojiCursor['emojiId'], categoryOrEmojisRows: EmojiRow[]): [string, number, number] {
    if (cursorEmojiId.length === 0 || cursorRowIndex === -1) {
        return ['', -1, -1];
    }

    const emojisRowOfCursor = categoryOrEmojisRows?.[cursorRowIndex]?.items ?? [];

    // The row should atleast contain one emoji
    if (emojisRowOfCursor.length < 1) {
        return ['', -1, -1];
    }

    const cursorCategory = emojisRowOfCursor[0]?.categoryName ?? '';
    const cursorCategoryIndex = emojisRowOfCursor[0]?.categoryIndex ?? -1;

    const cursorEmojiIndex = emojisRowOfCursor.find((emojiItem) => {
        return emojiItem.emojiId === cursorEmojiId;
    })?.emojiIndex ?? -1;

    return [cursorCategory, cursorCategoryIndex, cursorEmojiIndex];
}
