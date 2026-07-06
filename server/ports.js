/**
 * Fallback lat/long lookup for major world ports, keyed by UN/LOCODE.
 *
 * Terminal49's live vessel position / route GeoJSON endpoint
 * (GET /v2/containers/{id}/map_geojson) requires a paid "Routing Data"
 * entitlement. Free developer keys don't include it. This table lets the
 * app still draw a meaningful origin -> destination map using the
 * port_of_lading_locode / port_of_discharge_locode fields that ARE part of
 * the standard (free) shipment response.
 *
 * Coordinates are public UN/LOCODE reference data (approximate port
 * centroid), not proprietary Terminal49 data.
 */

const PORT_COORDS = {
  // China
  CNSHA: { name: "Shanghai", lat: 31.2304, lon: 121.4737 },
  CNNGB: { name: "Ningbo-Zhoushan", lat: 29.8683, lon: 121.544 },
  CNSZX: { name: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  CNGZH: { name: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  CNQIN: { name: "Qingdao", lat: 36.0671, lon: 120.3826 },
  CNTAO: { name: "Qingdao", lat: 36.0671, lon: 120.3826 },
  CNXMN: { name: "Xiamen", lat: 24.4798, lon: 118.0894 },
  CNYTN: { name: "Yantian", lat: 22.5764, lon: 114.2664 },
  CNDLC: { name: "Dalian", lat: 38.914, lon: 121.6147 },
  CNTXG: { name: "Tianjin (Xingang)", lat: 38.9855, lon: 117.7228 },
  HKHKG: { name: "Hong Kong", lat: 22.3193, lon: 114.1694 },
  // Southeast / South Asia
  SGSIN: { name: "Singapore", lat: 1.2655, lon: 103.822 },
  MYPKG: { name: "Port Klang", lat: 3.0044, lon: 101.3925 },
  MYTPP: { name: "Tanjung Pelepas", lat: 1.3626, lon: 103.5502 },
  THLCH: { name: "Laem Chabang", lat: 13.0827, lon: 100.8833 },
  VNSGN: { name: "Ho Chi Minh City", lat: 10.7769, lon: 106.7009 },
  VNCLI: { name: "Cai Lai / Ho Chi Minh City", lat: 10.7591, lon: 106.7537 },
  PHMNL: { name: "Manila", lat: 14.5906, lon: 120.9799 },
  IDJKT: { name: "Jakarta (Tanjung Priok)", lat: -6.1045, lon: 106.8825 },
  LKCMB: { name: "Colombo", lat: 6.9271, lon: 79.8612 },
  INNSA: { name: "Nhava Sheva (JNPT)", lat: 18.9494, lon: 72.9525 },
  INMAA: { name: "Chennai", lat: 13.0827, lon: 80.2707 },
  INMUN: { name: "Mundra", lat: 22.8394, lon: 69.7047 },
  BDCGP: { name: "Chattogram", lat: 22.335, lon: 91.8317 },
  // Middle East
  AEJEA: { name: "Jebel Ali", lat: 25.0119, lon: 55.0617 },
  AEAUH: { name: "Abu Dhabi (Khalifa Port)", lat: 24.8, lon: 54.65 },
  SADMM: { name: "Dammam", lat: 26.4207, lon: 50.1063 },
  SAJED: { name: "Jeddah", lat: 21.4858, lon: 39.1925 },
  OMSLL: { name: "Salalah", lat: 17.0151, lon: 54.0924 },
  // Korea / Japan / Taiwan
  KRPUS: { name: "Busan", lat: 35.1796, lon: 129.0756 },
  KRINC: { name: "Incheon", lat: 37.4563, lon: 126.7052 },
  JPYOK: { name: "Yokohama", lat: 35.4437, lon: 139.638 },
  JPTYO: { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  JPKOB: { name: "Kobe", lat: 34.6901, lon: 135.1955 },
  JPNGO: { name: "Nagoya", lat: 35.1815, lon: 136.9066 },
  TWKHH: { name: "Kaohsiung", lat: 22.6273, lon: 120.3014 },
  TWTPE: { name: "Keelung", lat: 25.1276, lon: 121.7391 },
  // Europe
  NLRTM: { name: "Rotterdam", lat: 51.9244, lon: 4.4777 },
  DEHAM: { name: "Hamburg", lat: 53.5511, lon: 9.9937 },
  DEBRV: { name: "Bremerhaven", lat: 53.5396, lon: 8.5809 },
  BEANR: { name: "Antwerp", lat: 51.2194, lon: 4.4025 },
  GBFXT: { name: "Felixstowe", lat: 51.9539, lon: 1.3517 },
  GBSOU: { name: "Southampton", lat: 50.9097, lon: -1.4044 },
  GBLGP: { name: "London Gateway", lat: 51.5074, lon: 0.4139 },
  FRLEH: { name: "Le Havre", lat: 49.4944, lon: 0.1079 },
  FRMRS: { name: "Marseille (Fos)", lat: 43.2965, lon: 5.3698 },
  ESALG: { name: "Algeciras", lat: 36.1408, lon: -5.4562 },
  ESVLC: { name: "Valencia", lat: 39.4699, lon: -0.3763 },
  ESBCN: { name: "Barcelona", lat: 41.3851, lon: 2.1734 },
  ITGOA: { name: "Genoa", lat: 44.4056, lon: 8.9463 },
  ITGIT: { name: "Gioia Tauro", lat: 38.4244, lon: 15.8994 },
  GRPIR: { name: "Piraeus", lat: 37.9475, lon: 23.6367 },
  PLGDN: { name: "Gdansk", lat: 54.352, lon: 18.6466 },
  PTLIS: { name: "Lisbon", lat: 38.7223, lon: -9.1393 },
  TRIST: { name: "Istanbul (Ambarli)", lat: 40.9679, lon: 28.6837 },
  RULED: { name: "St. Petersburg", lat: 59.9311, lon: 30.3609 },
  // North America
  USLAX: { name: "Los Angeles", lat: 33.7406, lon: -118.2706 },
  USLGB: { name: "Long Beach", lat: 33.7701, lon: -118.1937 },
  USOAK: { name: "Oakland", lat: 37.7955, lon: -122.2775 },
  USSEA: { name: "Seattle", lat: 47.6062, lon: -122.3321 },
  USTAC: { name: "Tacoma", lat: 47.2529, lon: -122.4443 },
  USNYC: { name: "New York", lat: 40.6692, lon: -74.045 },
  USEWR: { name: "Newark", lat: 40.6895, lon: -74.1745 },
  USSAV: { name: "Savannah", lat: 32.0835, lon: -81.0998 },
  USCHS: { name: "Charleston", lat: 32.7765, lon: -79.9311 },
  USORF: { name: "Norfolk", lat: 36.8508, lon: -76.2859 },
  USHOU: { name: "Houston", lat: 29.7604, lon: -95.3698 },
  USMOB: { name: "Mobile", lat: 30.6954, lon: -88.0399 },
  USMIA: { name: "Miami", lat: 25.7617, lon: -80.1918 },
  USJAX: { name: "Jacksonville", lat: 30.3322, lon: -81.6557 },
  USBAL: { name: "Baltimore", lat: 39.2904, lon: -76.6122 },
  CAVAN: { name: "Vancouver", lat: 49.2827, lon: -123.1207 },
  CAPRR: { name: "Prince Rupert", lat: 54.3150, lon: -130.3208 },
  CAMTR: { name: "Montreal", lat: 45.5019, lon: -73.5674 },
  MXZLO: { name: "Manzanillo", lat: 19.0546, lon: -104.3158 },
  MXVER: { name: "Veracruz", lat: 19.1738, lon: -96.1342 },
  MXLZC: { name: "Lazaro Cardenas", lat: 17.9583, lon: -102.1958 },
  PABLB: { name: "Balboa", lat: 8.9518, lon: -79.5665 },
  PAMIT: { name: "Manzanillo (Panama)", lat: 9.3547, lon: -79.8867 },
  // South America
  BRSSZ: { name: "Santos", lat: -23.9608, lon: -46.3336 },
  BRRIG: { name: "Rio Grande", lat: -32.035, lon: -52.0986 },
  BRPNG: { name: "Paranagua", lat: -25.5163, lon: -48.5225 },
  ARBUE: { name: "Buenos Aires", lat: -34.6037, lon: -58.3816 },
  CLVAP: { name: "Valparaiso", lat: -33.0472, lon: -71.6127 },
  CLSAI: { name: "San Antonio", lat: -33.5928, lon: -71.6187 },
  PECLL: { name: "Callao", lat: -12.0432, lon: -77.1469 },
  COCTG: { name: "Cartagena", lat: 10.391, lon: -75.4794 },
  ECGYE: { name: "Guayaquil", lat: -2.1962, lon: -79.8862 },
  // Africa
  ZADUR: { name: "Durban", lat: -29.8587, lon: 31.0218 },
  EGPSD: { name: "Port Said", lat: 31.2653, lon: 32.3019 },
  EGDAM: { name: "Damietta", lat: 31.4165, lon: 31.8133 },
  MATNG: { name: "Tangier Med", lat: 35.8788, lon: -5.5 },
  NGLOS: { name: "Lagos (Apapa)", lat: 6.4531, lon: 3.3958 },
  KEMBA: { name: "Mombasa", lat: -4.0435, lon: 39.6682 },
  // Oceania
  AUMEL: { name: "Melbourne", lat: -37.8136, lon: 144.9631 },
  AUSYD: { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  AUBNE: { name: "Brisbane", lat: -27.4698, lon: 153.0251 },
  AUFRE: { name: "Fremantle", lat: -32.0569, lon: 115.7439 },
  NZAKL: { name: "Auckland", lat: -36.8485, lon: 174.7633 },
};

function getPortCoords(locode) {
  if (!locode) return null;
  const key = String(locode).toUpperCase().replace(/\s+/g, "");
  return PORT_COORDS[key] || null;
}

module.exports = { getPortCoords, PORT_COORDS };
