sap.ui.define([
    "sap/ui/core/format/DateFormat",
    "sap/ui/core/Locale"
], function (DateFormat, Locale) {
    "use strict";

    // Fixed locale + UTC so schedule columns/times are deterministic for every viewer
    // and stable in tests (see risk note in the plan about timezone drift).
    const oEnLocale = new Locale("en");
    const oDowFormat = DateFormat.getDateInstance({ pattern: "EEE", UTC: true }, oEnLocale);
    const oMonthDayFormat = DateFormat.getDateInstance({ pattern: "MMM d", UTC: true }, oEnLocale);
    const oDayIdFormat = DateFormat.getDateInstance({ pattern: "yyyy-MM-dd", UTC: true }, oEnLocale);
    const oTimeFormat = DateFormat.getTimeInstance({ pattern: "HH:mm", UTC: true }, oEnLocale);

    function toMillis(vUnixSeconds) {
        const iSeconds = parseInt(vUnixSeconds, 10);
        return isNaN(iSeconds) ? NaN : iSeconds * 1000;
    }

    function toDate(vUnixSeconds) {
        const iMillis = toMillis(vUnixSeconds);
        return isNaN(iMillis) ? null : new Date(iMillis);
    }

    return {
        toMillis: toMillis,

        /** Weekday abbreviation, upper-case, e.g. "SAT". */
        dow: function (vUnixSeconds) {
            const oDate = toDate(vUnixSeconds);
            return oDate ? oDowFormat.format(oDate).toUpperCase() : "";
        },

        /** Month + day, upper-case, e.g. "JAN 24". */
        monthDay: function (vUnixSeconds) {
            const oDate = toDate(vUnixSeconds);
            return oDate ? oMonthDayFormat.format(oDate).toUpperCase() : "";
        },

        /** Stable calendar-day key for de-duplication/sorting, e.g. "2026-01-24". */
        dayId: function (vUnixSeconds) {
            const oDate = toDate(vUnixSeconds);
            return oDate ? oDayIdFormat.format(oDate) : "";
        },

        /** Kick-off plus the parenthetical secondary time, e.g. "16:00 (17:00)". */
        timeLine: function (vUnixSeconds, vUnixSeconds2) {
            const oDate = toDate(vUnixSeconds);
            const oDate2 = toDate(vUnixSeconds2);
            if (!oDate) {
                return "";
            }
            if (!oDate2) {
                return oTimeFormat.format(oDate);
            }
            return oTimeFormat.format(oDate) + " (" + oTimeFormat.format(oDate2) + ")";
        },

        /** Team abbreviation: explicit Abbr, else the Id, else initials of the Name. */
        deriveAbbr: function (oTeam) {
            if (!oTeam) {
                return "";
            }
            if (oTeam.Abbr) {
                return String(oTeam.Abbr).toUpperCase();
            }
            if (oTeam.Id) {
                return String(oTeam.Id).toUpperCase();
            }
            return String(oTeam.Name || "")
                .split(/\s+/)
                .filter(Boolean)
                .map(function (sWord) { return sWord.charAt(0); })
                .join("")
                .toUpperCase()
                .slice(0, 3);
        }
    };
});
