sap.ui.define([
    "matchschedule/model/formatter"
], function (formatter) {
    "use strict";

    const GROUP_CLASS = {
        A: "msGroupA",
        B: "msGroupB",
        C: "msGroupC",
        D: "msGroupD",
        E: "msGroupE",
        F: "msGroupF"
    };
    const MAX_LANES = 3;

    // Grid geometry: row 1 = round bar, row 2 = date headers, then one row per lane.
    const HEADER_ROWS = 2;
    const FIRST_LANE_ROW = HEADER_ROWS + 1;
    const VENUE_COL_WIDTH = "180px";
    const DATE_COL_WIDTH = "100px";
    const ROUND_ROW_HEIGHT = "32px";
    const DATE_ROW_HEIGHT = "34px";
    const LANE_ROW_HEIGHT = "64px";

    function groupColorClass(sGroupId) {
        return GROUP_CLASS[String(sGroupId || "").toUpperCase()] || "msGroupDefault";
    }

    function venueDayKey(oMatch) {
        return oMatch.Venue + "||" + formatter.dayId(oMatch.Date);
    }

    /**
     * Resolve a match's 0-based lane: explicit numeric `oMatch.Lane` when present,
     * otherwise the running concurrency count for that match's venue/day, clamped
     * to MAX_LANES - 1. `mConcurrency` is mutated in place (caller owns the map).
     */
    function resolveLane(oMatch, mConcurrency) {
        let iLane;
        if (typeof oMatch.Lane === "number") {
            iLane = oMatch.Lane;
        } else {
            const sKey = venueDayKey(oMatch);
            mConcurrency[sKey] = (mConcurrency[sKey] || 0) + 1;
            iLane = mConcurrency[sKey] - 1;
        }
        return Math.min(iLane, MAX_LANES - 1);
    }

    /** { teamId: abbreviation } from the Teams list. */
    function buildTeamAbbrLookup(aTeams) {
        const mAbbr = {};
        (aTeams || []).forEach(function (oTeam) {
            mAbbr[oTeam.Id] = formatter.deriveAbbr(oTeam);
        });
        return mAbbr;
    }

    /** "DOM v NCA" from a match's Home/Away team ids (empty when either is missing). */
    function matchupText(oMatch, mTeamAbbr) {
        if (!oMatch.Home || !oMatch.Away) {
            return "";
        }
        const sHome = mTeamAbbr[oMatch.Home] || String(oMatch.Home).toUpperCase();
        const sAway = mTeamAbbr[oMatch.Away] || String(oMatch.Away).toUpperCase();
        return sHome + " v " + sAway;
    }

    /**
     * Ascending, de-duplicated calendar days spanned by the matches.
     * @returns {object[]} [{ dayId, dow, md, ts }]
     */
    function buildDateColumns(aMatches) {
        const mSeen = {};
        const aColumns = [];
        (aMatches || []).forEach(function (oMatch) {
            const sDayId = formatter.dayId(oMatch.Date);
            if (!sDayId || mSeen[sDayId]) {
                return;
            }
            mSeen[sDayId] = true;
            aColumns.push({
                dayId: sDayId,
                dow: formatter.dow(oMatch.Date),
                md: formatter.monthDay(oMatch.Date),
                ts: formatter.toMillis(oMatch.Date)
            });
        });
        aColumns.sort(function (a, b) { return a.ts - b.ts; });
        return aColumns;
    }

    function indexByDayId(aColumns) {
        const mIndex = {};
        aColumns.forEach(function (oColumn, i) { mIndex[oColumn.dayId] = i; });
        return mIndex;
    }

    /**
     * Lane for every match, keyed by Order. Uses the explicit mock `Lane` when present,
     * otherwise falls back to the running count of concurrent matches at that venue/day.
     */
    function assignLanes(aMatches) {
        const mLaneByOrder = {};
        const mConcurrency = {};
        (aMatches || []).slice()
            .sort(function (a, b) { return (a.Order || 0) - (b.Order || 0); })
            .forEach(function (oMatch) {
                mLaneByOrder[oMatch.Order] = resolveLane(oMatch, mConcurrency);
            });
        return mLaneByOrder;
    }

    /**
     * Venues in first-appearance order with resolved subtitle and lane count
     * (clamped to MAX_LANES).
     * @returns {object[]} [{ name, subtitle, laneCount }]
     */
    function buildVenueIndex(aMatches, aVenues) {
        const mMeta = {};
        const aPreferredOrder = [];
        (aVenues || []).forEach(function (oVenue) {
            mMeta[oVenue.Name] = oVenue;
            aPreferredOrder.push(oVenue.Name);
        });

        const aFirstSeen = [];
        const mByName = {};
        const mMaxLane = {};
        const mConcurrency = {};

        (aMatches || []).forEach(function (oMatch) {
            const sName = oMatch.Venue;
            if (!mByName[sName]) {
                const oEntry = {
                    name: sName,
                    subtitle: "",
                    laneCount: 1
                };
                const oMetaEntry = mMeta[sName];
                if (oMetaEntry) {
                    oEntry.subtitle = [oMetaEntry.City, oMetaEntry.Country].filter(Boolean).join(", ");
                }
                mByName[sName] = oEntry;
                mMaxLane[sName] = 0;
                aFirstSeen.push(sName);
            }

            const iLane = resolveLane(oMatch, mConcurrency);
            if (iLane > mMaxLane[sName]) {
                mMaxLane[sName] = iLane;
            }
            mByName[sName].laneCount = mMaxLane[sName] + 1;
        });

        // Venues declared in the mock keep that order; any others follow in match order.
        const aResult = [];
        const mEmitted = {};
        aPreferredOrder.concat(aFirstSeen).forEach(function (sName) {
            if (mByName[sName] && !mEmitted[sName]) {
                mEmitted[sName] = true;
                aResult.push(mByName[sName]);
            }
        });
        return aResult;
    }

    /**
     * Flat, ordered list of grid cells (round bar, corner, date headers, venue labels,
     * match tiles, empty placeholders), each carrying its CSS grid coordinates.
     */
    function buildCells(oData, aColumns, aVenues, mTeamAbbr) {
        const mColIndex = indexByDayId(aColumns);
        const mLaneByOrder = assignLanes(oData.Matches);
        const aMatches = oData.Matches || [];
        const aCells = [];

        aCells.push({
            type: "round",
            text: oData.Round || "ROUND ONE",
            gridColumn: "1 / -1",
            gridRow: "1",
            styleClass: "msRoundHeader"
        });
        aCells.push({
            type: "corner",
            text: "VENUE",
            gridColumn: "1",
            gridRow: "2",
            styleClass: "msCornerCell"
        });
        aColumns.forEach(function (oColumn, i) {
            aCells.push({
                type: "dateHeader",
                dow: oColumn.dow,
                md: oColumn.md,
                gridColumn: String(i + 2),
                gridRow: "2",
                styleClass: "msDateHeader"
            });
        });

        let iRow = FIRST_LANE_ROW;
        const mVenueBaseRow = {};
        aVenues.forEach(function (oVenue) {
            mVenueBaseRow[oVenue.name] = iRow;
            aCells.push({
                type: "venue",
                name: oVenue.name,
                subtitle: oVenue.subtitle,
                gridColumn: "1",
                gridRow: iRow + " / span " + oVenue.laneCount,
                styleClass: "msVenueCell"
            });
            iRow += oVenue.laneCount;
        });

        const mOccupied = {};
        aMatches.forEach(function (oMatch) {
            const iColIndex = mColIndex[formatter.dayId(oMatch.Date)];
            if (iColIndex === undefined || mVenueBaseRow[oMatch.Venue] === undefined) {
                return;
            }
            const iLane = mLaneByOrder[oMatch.Order];
            const iTileRow = mVenueBaseRow[oMatch.Venue] + iLane;
            const iTileCol = iColIndex + 2;
            mOccupied[iTileRow + "|" + iTileCol] = true;

            aCells.push({
                type: "tile",
                matchNo: "#" + oMatch.Order,
                matchup: matchupText(oMatch, mTeamAbbr),
                timeLine: formatter.timeLine(oMatch.Date, oMatch.Date2),
                group: oMatch.Group,
                gridColumn: String(iTileCol),
                gridRow: String(iTileRow),
                styleClass: "msTile " + groupColorClass(oMatch.Group)
            });
        });

        aVenues.forEach(function (oVenue) {
            const iBase = mVenueBaseRow[oVenue.name];
            for (let lane = 0; lane < oVenue.laneCount; lane++) {
                const iLaneRow = iBase + lane;
                for (let col = 0; col < aColumns.length; col++) {
                    const iCellCol = col + 2;
                    if (!mOccupied[iLaneRow + "|" + iCellCol]) {
                        aCells.push({
                            type: "placeholder",
                            gridColumn: String(iCellCol),
                            gridRow: String(iLaneRow),
                            styleClass: "msPlaceholder"
                        });
                    }
                }
            }
        });

        return aCells;
    }

    function buildTemplateTracks(iDateCount, iLaneTotal) {
        return {
            templateColumns: VENUE_COL_WIDTH + " repeat(" + iDateCount + ", " + DATE_COL_WIDTH + ")",
            templateRows: ROUND_ROW_HEIGHT + " " + DATE_ROW_HEIGHT + " repeat(" + iLaneTotal + ", " + LANE_ROW_HEIGHT + ")"
        };
    }

    /**
     * Groups pivoted into parallel columns for the lower table.
     * @returns {object[]} [{ id, label, colorClass, teams: [{ name, abbr, display }] }]
     */
    function pivotGroups(aGroups, aTeams) {
        const mTeam = {};
        (aTeams || []).forEach(function (oTeam) { mTeam[oTeam.Id] = oTeam; });

        return (aGroups || []).map(function (oGroup) {
            return {
                id: oGroup.Id,
                label: "GROUP " + String(oGroup.Id).toUpperCase(),
                colorClass: groupColorClass(oGroup.Id),
                teams: (oGroup.Teams || []).map(function (sTeamId) {
                    const oTeam = mTeam[sTeamId] || { Id: sTeamId, Name: sTeamId };
                    const sAbbr = formatter.deriveAbbr(oTeam);
                    return {
                        name: oTeam.Name,
                        abbr: sAbbr,
                        display: oTeam.Name + " (" + sAbbr + ")"
                    };
                })
            };
        });
    }

    /**
     * Turn the raw mock ({ Round, Matches, Venues, Groups, Teams }) into the view model
     * the Schedule view binds against.
     */
    function computeViewModel(oData) {
        oData = oData || {};
        const aMatches = oData.Matches || [];
        const aColumns = buildDateColumns(aMatches);
        const aVenues = buildVenueIndex(aMatches, oData.Venues);
        const iLaneTotal = aVenues.reduce(function (iSum, oVenue) { return iSum + oVenue.laneCount; }, 0);
        const oTracks = buildTemplateTracks(aColumns.length, iLaneTotal);
        const mTeamAbbr = buildTeamAbbrLookup(oData.Teams);

        return {
            round: oData.Round || "ROUND ONE",
            dateCount: aColumns.length,
            laneTotal: iLaneTotal,
            templateColumns: oTracks.templateColumns,
            templateRows: oTracks.templateRows,
            cells: buildCells(oData, aColumns, aVenues, mTeamAbbr),
            groups: pivotGroups(oData.Groups, oData.Teams)
        };
    }

    return {
        groupColorClass,
        buildTeamAbbrLookup,
        matchupText,
        buildDateColumns,
        buildVenueIndex,
        assignLanes,
        buildCells,
        buildTemplateTracks,
        pivotGroups,
        computeViewModel
    };
});
