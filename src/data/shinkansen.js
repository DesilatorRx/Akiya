// Shinkansen (bullet-train) stations with approximate coordinates.
// Used to compute the nearest Shinkansen station to a geocoded listing.
// Not exhaustive, but dense enough nationwide for an accurate "nearest"
// match. [name, line, lat, lng].

export const SHINKANSEN = [
  // Tōkaidō / Sanyō
  ['Tokyo', 'Tōkaidō', 35.6812, 139.7671],
  ['Shin-Yokohama', 'Tōkaidō', 35.5076, 139.6173],
  ['Odawara', 'Tōkaidō', 35.2562, 139.1553],
  ['Atami', 'Tōkaidō', 35.1036, 139.0781],
  ['Mishima', 'Tōkaidō', 35.126, 138.911],
  ['Shizuoka', 'Tōkaidō', 34.9719, 138.3886],
  ['Hamamatsu', 'Tōkaidō', 34.7039, 137.7347],
  ['Toyohashi', 'Tōkaidō', 34.7631, 137.3823],
  ['Nagoya', 'Tōkaidō', 35.1709, 136.8815],
  ['Gifu-Hashima', 'Tōkaidō', 35.3158, 136.6862],
  ['Maibara', 'Tōkaidō', 35.3149, 136.2896],
  ['Kyoto', 'Tōkaidō', 34.9858, 135.7588],
  ['Shin-Osaka', 'Tōkaidō/Sanyō', 34.7335, 135.5003],
  ['Shin-Kobe', 'Sanyō', 34.7062, 135.1955],
  ['Himeji', 'Sanyō', 34.8276, 134.6906],
  ['Okayama', 'Sanyō', 34.6664, 133.9181],
  ['Fukuyama', 'Sanyō', 34.4894, 133.3625],
  ['Hiroshima', 'Sanyō', 34.3978, 132.4757],
  ['Tokuyama', 'Sanyō', 34.0503, 131.8061],
  ['Shin-Yamaguchi', 'Sanyō', 34.0939, 131.3958],
  ['Kokura', 'Sanyō', 33.8866, 130.8826],
  ['Hakata', 'Sanyō/Kyūshū', 33.5897, 130.4207],
  // Kyūshū
  ['Kumamoto', 'Kyūshū', 32.7894, 130.6889],
  ['Kagoshima-Chūō', 'Kyūshū', 31.5836, 130.5414],
  // Tōhoku / Hokkaidō
  ['Ueno', 'Tōhoku', 35.7141, 139.7774],
  ['Ōmiya', 'Tōhoku', 35.9061, 139.6238],
  ['Utsunomiya', 'Tōhoku', 36.5594, 139.8986],
  ['Nasu-Shiobara', 'Tōhoku', 36.9655, 140.0469],
  ['Kōriyama', 'Tōhoku', 37.3984, 140.3878],
  ['Fukushima', 'Tōhoku', 37.7548, 140.4592],
  ['Sendai', 'Tōhoku', 38.2601, 140.8821],
  ['Morioka', 'Tōhoku', 39.7019, 141.1364],
  ['Shin-Aomori', 'Tōhoku', 40.8273, 140.6928],
  ['Shin-Hakodate-Hokuto', 'Hokkaidō', 41.9047, 140.6486],
  // Akita / Yamagata
  ['Akita', 'Akita', 39.7172, 140.1226],
  ['Yamagata', 'Yamagata', 38.2486, 140.3286],
  ['Shinjō', 'Yamagata', 38.7647, 140.3019],
  // Jōetsu
  ['Takasaki', 'Jōetsu/Hokuriku', 36.3229, 139.0128],
  ['Echigo-Yuzawa', 'Jōetsu', 36.9367, 138.8089],
  ['Nagaoka', 'Jōetsu', 37.4486, 138.8519],
  ['Niigata', 'Jōetsu', 37.9123, 139.0606],
  // Hokuriku
  ['Karuizawa', 'Hokuriku', 36.3422, 138.6356],
  ['Nagano', 'Hokuriku', 36.6432, 138.1889],
  ['Iiyama', 'Hokuriku', 36.8516, 138.3667],
  ['Jōetsumyōkō', 'Hokuriku', 37.1486, 138.2278],
  ['Itoigawa', 'Hokuriku', 37.0406, 137.8628],
  ['Toyama', 'Hokuriku', 36.7016, 137.2137],
  ['Kanazawa', 'Hokuriku', 36.5779, 136.6478],
  ['Fukui', 'Hokuriku', 36.0626, 136.2233],
];
