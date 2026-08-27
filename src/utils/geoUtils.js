/**
 * Utility functions for Geographic & Spatial Distance Calculations
 */

/**
 * Calculates the great-circle distance between two points on the Earth
 * using the Haversine formula.
 *
 * @param {number} lat1 - Latitude of origin point
 * @param {number} lon1 - Longitude of origin point
 * @param {number} lat2 - Latitude of destination point
 * @param {number} lon2 - Longitude of destination point
 * @returns {number} Distance in kilometers (rounded to 2 decimal places)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
        return 0;
    }
    const nLat1 = Number(lat1);
    const nLon1 = Number(lon1);
    const nLat2 = Number(lat2);
    const nLon2 = Number(lon2);

    if (isNaN(nLat1) || isNaN(nLon1) || isNaN(nLat2) || isNaN(nLon2)) {
        return 0;
    }

    if (nLat1 === nLat2 && nLon1 === nLon2) {
        return 0;
    }

    const R = 6371; // Earth's radius in kilometers
    const dLat = (nLat2 - nLat1) * (Math.PI / 180);
    const dLon = (nLon2 - nLon1) * (Math.PI / 180);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(nLat1 * (Math.PI / 180)) *
        Math.cos(nLat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100;
}

module.exports = {
    calculateHaversineDistance
};
