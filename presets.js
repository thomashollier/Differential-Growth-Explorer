/* ============================================================================
   Presets — each one a whole picture: what grows, the forces, any constraints,
   how it is drawn, and whether the view follows it. Selecting one applies all
   of that.

   They come in two kinds.

   growth & shape — what the simulation itself can do. All of them wear the same
     black body and red edge, so the only thing differing between them is the
     form, and any constraints are left visible.

   applications — whole pictures, where the drawing is as much the point as the
     shape: the render styles, stacked histories, colour.

   Loaded by index.html with a <script> tag and by make-examples.js through
   require(), so the pictures in the README are made from these exact settings.
============================================================================ */

'use strict';

/* a closed polygon, for boundaries and obstacles */
function ring(cx, cy, r, k, wobble){
  const out = [];
  for (let i = 0; i < k; i++){
    const t = (i / k) * Math.PI * 2;
    const rr = r * (1 + (wobble || 0) * Math.cos(t * 3));
    out.push([+(cx + rr * Math.cos(t)).toFixed(2), +(cy + rr * Math.sin(t)).toFixed(2)]);
  }
  return out;
}

const seed = (key, dx, dy, rot, scale) =>
  ({ key, dx: dx || 0, dy: dy || 0, rot: rot || 0, scale: scale === undefined ? 1 : scale });

/* Shared starting point, so each preset below only states what it changes. */
/* Every setting the app carries has to appear here. A preset is the whole
   picture and replaces all of it, so a key missing from BASE is not a default —
   it is whatever the last preset left behind. */
const BASE = {
  shape: 'circle', seeds: [seed('circle')],
  initialNodes: 10, startRadius: 125, seed: 10,
  minEdge: 11, maxEdge: 16, repulsionRadius: 100,
  attractionFactor: 1, repulsionFactor: 8, alignmentFactor: 1,
  noiseFactor: 0.1, damping: 0.6, smoothing: 0.3, repulsionSkip: 2,
  wallRepulsion: 1, splitJitter: 1, pruneShort: false,
  boundary: null, obstacles: [], drawnShapes: [],
  style: 'smooth', tension: 0.33, strokeWidth: 2,
  fillOn: true, strokeOn: true, showNodes: false, showConstraints: false,
  follow: true, accumulate: false, trailFade: 0, stampEvery: 4, frame: null,
  stepsPerFrame: 1,
  maxNodes: 4000, pauseAtBudget: true, settleAt: 0.001,
  bg: '#ffffff', fill: '#000000', stroke: '#ff0000',
  skPasses: 2, skDensity: 9,
  skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5,
  skJitMin: 1.2, skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6,
  skOpMin: 0.25, skOpMax: 0.8,
  skHueMin: 0, skHueMax: 0, skSatMin: 0, skSatMax: 0, skValMin: 0, skValMax: 0,
  stSpacing: 7, stSizeMin: 0.6, stSizeMax: 2.6, stScatMin: 0, stScatMax: 2.5,
  stScatPow: 5,
  stOpMin: 0.25, stOpMax: 0.9,
  ctCount: 4, ctGap: 7, ctFade: 0.72,
};

const PRESET_LIST = [

  /* ---- growth & shape: same ink throughout, only the form changes ---- */

  {
    name: 'Coral', group: 'growth',
    note: 'One circle, left to fill the plane. The baseline every other form departs from.',
    cfg: { seeds: [seed('circle')], maxNodes: 3200 },
  },
  {
    name: 'Rosette', group: 'growth',
    note: 'The Coral again, at the same budget, with the repulsion radius cut by a third and the edges shortened to match. The radius sets the gap the folds keep from each other, so the same three thousand nodes buy many more and finer arms: they radiate from the centre, forking as they go, and fill a disc with a clean rim instead of sprawling into a few fat lobes. Stopped at the budget, which is what keeps that rim sharp.',
    cfg: { seeds: [seed('circle')], minEdge: 9, repulsionRadius: 65, maxNodes: 3200,
           // held still: the point is the shape of the whole disc, and following
           // it would rescale the picture all the way in
           follow: false, frame: { cx: 29, cy: 34, rx: 1424, ry: 851 } },
  },
  {
    name: 'Pinwheel', group: 'growth',
    note: 'The Rosette forces from a star instead of a circle, started large so the growth elaborates the outline rather than expanding away from it. The five points do not survive as a silhouette — the rim comes out roughly round — but they survive as organisation: each becomes a domain of arms combed parallel at its own angle, meeting the next along a visible seam. A seed can set the grain of a form long after it has stopped setting its shape.',
    cfg: { seeds: [seed('star')], seed: 487, initialNodes: 58, startRadius: 600,
           minEdge: 9, repulsionRadius: 65, maxNodes: 3200,
           follow: false, frame: { cx: 29, cy: 34, rx: 1424, ry: 851 } },
  },
  {
    name: 'Lobes', group: 'growth',
    note: 'A repulsion radius half again as wide, longer edges, and a budget of six hundred: fat arms with room between them instead of a filled disc. It spends the budget in a hundred steps and then takes nearly nine hundred more to settle, pushing the arms apart into an even splay.',
    cfg: { seeds: [seed('circle')], repulsionRadius: 150, repulsionFactor: 9,
           minEdge: 15, maxEdge: 24, maxNodes: 600,
           // with so few nodes the budget goes almost at once; what shapes this
           // one is the long relaxation afterwards
           pauseAtBudget: false },
  },
  {
    name: 'Meander', group: 'growth',
    note: 'Weak attraction against heavy repulsion with the damping right down. The curve settles slowly and wanders into a labyrinth instead of packing radially.',
    cfg: { seeds: [seed('circle')], seed: 341, repulsionRadius: 99,
           attractionFactor: 0.52, repulsionFactor: 11.7, alignmentFactor: 1.21,
           damping: 0.23, maxNodes: 2600, maxSteps: 12000, strokeWidth: 2.6,
           // the damping is low enough that at one step a frame it barely moves
           stepsPerFrame: 5,
           // held still and framed for the size it finishes at: it spreads far
           // wider than it is tall, and following it would keep rescaling
           follow: false, frame: { cx: -6, cy: -61, rx: 2374, ry: 886 } },
  },
  {
    name: 'Sprawl', group: 'growth',
    note: 'The Meander forces with the budget more than trebled and the pause at the budget switched off, so nothing stops when the last node is spent. The curve keeps relaxing into the room it has left and only stops when it has stopped moving, which takes another 2,700 steps and packs the plane far denser than the Meander ever gets.',
    cfg: { seeds: [seed('circle')], seed: 808, startRadius: 125, repulsionRadius: 99,
           attractionFactor: 0.52, repulsionFactor: 11.7, alignmentFactor: 1.21,
           damping: 0.23, maxNodes: 8600, strokeWidth: 1.8, stepsPerFrame: 12,
           // growth stops at the budget either way; what this turns off is the
           // pause, so the run carries on to the settle test instead
           pauseAtBudget: false, settleAt: 0.001, maxSteps: 14000,
           // it fills the budget at step 9290 and settles at 12004
           follow: false, frame: { cx: 368, cy: -1143, rx: 4543, ry: 2714 } },
  },
  {
    name: 'Strand', group: 'growth',
    note: 'An open seed has two ends, so it meanders instead of closing into a blob. With no inside to fill, only the edge is drawn.',
    cfg: { seeds: [seed('line')], initialNodes: 12, minEdge: 10, maxEdge: 15,
           repulsionRadius: 70, repulsionFactor: 6, alignmentFactor: 1.2,
           noiseFactor: 0.15, maxNodes: 2600, fillOn: false, strokeWidth: 2.4 },
  },
  {
    name: 'Twins', group: 'growth',
    note: 'A circle and a square four times its size, set well apart, both starting from sixteen corner points. They grow as separate curves that never join, but each pushes the other back where they meet, and the smaller one comes off worse.',
    cfg: { seeds: [seed('circle', -250), seed('square', 750, 0, 0, 4)], startRadius: 80,
           initialNodes: 16, repulsionRadius: 80, maxNodes: 4000 },
  },
  {
    name: 'Tracings', group: 'growth',
    note: 'Two outlines drawn by hand and set side by side. Traced seeds keep the place and size they were drawn at, so the pair grows exactly where it was put, each pressing on the other where they meet. The ten thousand nodes go in seventy-eight steps and it spends another five hundred settling, which is where the pair works out the line between them.',
    cfg: { initialNodes: 10, startRadius: 80, seed: 10, minEdge: 11, maxEdge: 16,
           repulsionRadius: 80, attractionFactor: 1, repulsionFactor: 8, alignmentFactor: 1,
           noiseFactor: 0.1, damping: 0.6, smoothing: 0.3, repulsionSkip: 2,
           wallRepulsion: 1, splitJitter: 1, pruneShort: false, maxNodes: 10000,
           // the budget goes in seventy-eight steps; the interesting part is the
           // five hundred after it, while the two settle against each other
           pauseAtBudget: false, settleAt: 0.001, stepsPerFrame: 1, follow: false,
           frame: { cx: 1747, cy: 368, rx: 4053, ry: 2421 }, style: 'smooth', tension: 0.33,
           strokeWidth: 2, fillOn: true, strokeOn: true, showNodes: false,
           showConstraints: false, accumulate: false, trailFade: 0, stampEvery: 4,
           bg: '#ffffff', fill: '#000000', stroke: '#ff0000',
           drawnShapes: [
             { id: 's1lja', name: 'shape 1', closed: true, pts: [
               [3682,-1008],[3613.1,-1008],[3549.1,-1008],[3460.6,-1008],[3385.4,-997.1],
               [3299.8,-971.4],[3212.2,-936.4],[3123.7,-895.8],[3048.4,-859.4],[2982.5,-828.3],
               [2929.5,-798.8],[2884.7,-765.3],[2844.2,-727.6],[2810,-692.2],[2743.4,-624.5],
               [2710.7,-588.5],[2653,-512.4],[2622.7,-463.3],[2593.1,-408.1],[2561.3,-349.6],
               [2529.5,-290.6],[2501.3,-234.8],[2474.1,-180.3],[2449.4,-123.8],[2429.7,-66.2],
               [2415.2,-9.6],[2406.1,41.3],[2399.7,92.3],[2396.6,147.1],[2396.3,203],
               [2396.3,266.8],[2398.4,337.5],[2409.5,411.4],[2428.7,482.9],[2448.8,547.9],
               [2469.9,607.9],[2493.2,666.4],[2520.5,727.1],[2552.1,790.3],[2585.2,850.5],
               [2621.9,908.7],[2666.3,968.3],[2718.2,1026.3],[2777.9,1084.6],[2842.4,1143.8],
               [2915.1,1203.1],[2993.9,1260.7],[3078.1,1313.5],[3182.4,1365.8],[3285.3,1407.8],
               [3412.6,1446.2],[3550.4,1478.8],[3687.9,1491.1],[3824.2,1493.6],[3935.4,1481.6],
               [4023.3,1455],[4090.6,1414.3],[4142,1367.9],[4169.1,1322],[4193.6,1263.5],
               [4222.5,1169.2],[4257.9,1033.6],[4294.4,873.2],[4323.4,724.6],[4347.8,594.8],
               [4369.2,477.5],[4382.9,381.9],[4391.9,296.2],[4395.2,212.9],[4395.2,123.2],
               [4395.2,30.7],[4395.2,-58.6],[4394,-149.7],[4387.8,-246.9],[4374.9,-346.8],
               [4357.4,-449.9],[4339.7,-549.1],[4326.9,-622.6],[4318.7,-675.6],[4305.5,-759.3],
               [4291.2,-835.3],[4267.4,-903.5],[4232.4,-960.5],[4190.5,-996.9],[4143.1,-1013.9],
               [4088.9,-1016.5],[4027.3,-1016.5],[3946.5,-1016.5],[3875,-1009.8],
               [3816.3,-993.4],[3769.6,-984.8]
             ]},
             { id: 's2tg0', name: 'shape 2', closed: true, pts: [
               [325.5,-1245.5],[228,-1245.5],[149.5,-1245.5],[56,-1245.5],[-33.9,-1245.5],
               [-135.6,-1245.5],[-245.4,-1243.7],[-353.3,-1233.5],[-453.6,-1211.6],
               [-548.4,-1184.2],[-629.9,-1158.2],[-697.1,-1132.6],[-755,-1104],[-808.6,-1070.2],
               [-863.1,-1027.8],[-923.3,-972.2],[-988,-907.5],[-1055.4,-837.7],[-1123.6,-764.4],
               [-1241.4,-622.2],[-1293.7,-548.8],[-1341.2,-475.1],[-1378.9,-408.7],
               [-1409.3,-350.1],[-1434.1,-295.4],[-1454.8,-239.1],[-1473.2,-176.1],
               [-1489.2,-108.1],[-1503.3,-41.3],[-1515.4,25],[-1524,90.6],[-1527.3,227.8],
               [-1527.3,297.2],[-1527.3,354.7],[-1522.9,409.7],[-1509.1,464],[-1486.4,509.7],
               [-1455.9,558.6],[-1420.3,611.4],[-1382.8,667.4],[-1345.6,721.2],[-1313.8,765.5],
               [-1281.9,806.8],[-1247.2,846.8],[-1212.6,881.1],[-1175,911.5],[-1129.6,941],
               [-1082.1,969.1],[-1035.6,994.1],[-986.4,1018.7],[-935.7,1043.5],[-882.2,1070.1],
               [-826.2,1097.3],[-767.1,1121.5],[-702.4,1142.2],[-635.1,1162],[-570.2,1178.7],
               [-503.4,1193.9],[-434.3,1211.1],[-365.3,1228.2],[-300.6,1243.3],[-241,1255.2],
               [-182.4,1265.5],[-128.1,1272.1],[-72.6,1275.5],[-1.7,1277.1],[76.1,1277.1],
               [150.8,1277.1],[222.5,1276.6],[289.4,1268.3],[354.7,1248.1],[418.6,1219.3],
               [472.2,1189.3],[518.1,1158.9],[554.8,1128.7],[582.1,1082],[562.3,1019.9],
               [506.1,976.8],[435.2,926.5],[392.9,898.2],[347.5,869.4],[299.9,841.4],
               [250.1,816],[199.9,793.1],[143.6,770.8],[79.6,749.9],[15.5,731.2],[-45.6,714.7],
               [-101,699.6],[-148.2,687.2],[-194,675.2],[-242.1,662.8],[-334.9,645.8],
               [-391.2,633.5],[-451.9,618.2],[-523.2,600.6],[-597.6,582],[-660.9,563.7],
               [-716.5,544.1],[-767.6,521.9],[-815,495],[-859.5,463.2],[-901.7,427.9],
               [-936.2,392.7],[-963.5,355.6],[-988,309.1],[-1005.7,259.7],[-1015.1,207.7],
               [-1018.5,141.4],[-1018.5,60],[-1018.5,-32.6],[-1010.8,-188.4],[-1004,-236.7],
               [-982.8,-312],[-950,-374],[-875.8,-482.4],[-847.6,-521.4],[-796.9,-585.2],
               [-738.9,-649],[-705,-680.1],[-667.1,-711.6],[-628.8,-739.6],[-558,-780.1],
               [-487.3,-803.7],[-409.6,-818.5],[-325.2,-827.2],[-250.4,-829.5],[-174,-835],
               [-96,-839.6],[-29.5,-843.5],[29.1,-849.1],[88.4,-855.8],[157.7,-870.8],
               [235.1,-896.2],[309.7,-931],[374.4,-970.7],[435.6,-1025.9],[464.4,-1081.9],
               [487.4,-1161.6],[498.2,-1225.7],[481.5,-1283],[439.7,-1306.4],[388.1,-1272.1]
             ]},
           ],
           seeds: [seed('drawn:s1lja'), seed('drawn:s2tg0', 1085, -30, 0, 1)],
           boundary: null, obstacles: [] },
  },
  {
    name: 'Snail', group: 'growth',
    note: 'A spiral drawn by hand in one open line, grown to twenty thousand nodes. An open strand has two ends and no inside, so instead of filling a body it folds back on itself until it has packed the area out, and the turns of the original spiral still read as bands in the finished sheet.',
    cfg: { seeds: [{ key: 'drawn:s11nd1', dx: 0, dy: 0, rot: 0, scale: 1 }],
           // an open line can always fold somewhere, so it never truly stops;
           // a loose threshold calls it done once it is only creeping
           maxNodes: 20000, pauseAtBudget: false, settleAt: 0.04,
           fillOn: false, follow: false,
           frame: { cx: 76, cy: 76, rx: 4319, ry: 2580 },
           // kept at the precision it was traced at: the run is chaotic enough
           // that rounding these shifts the finished node count
           drawnShapes: [{ id: 's11nd1', name: 'strand 1', closed: false, pts: [
             [-1930.548,-182.879],[-1930.548,-247.74],[-1930.548,-325.799],
             [-1930.548,-407.704],[-1930.548,-491.849],[-1930.548,-540.824],
             [-1930.548,-589.772],[-1930.548,-639.274],[-1930.548,-723.998],
             [-1930.548,-797.21],[-1928.783,-864.599],[-1921.696,-936.757],
             [-1902.886,-1013.315],[-1873.09,-1072.695],[-1831.123,-1137.898],
             [-1770.583,-1228.287],[-1721.819,-1289.406],[-1665.126,-1347.891],
             [-1610.013,-1397.05],[-1563.014,-1434.065],[-1523.075,-1462.991],
             [-1467.778,-1507.118],[-1390.667,-1552.589],[-1311.344,-1595.346],
             [-1225.592,-1640.29],[-1137.021,-1682.31],[-1041.996,-1723.566],
             [-959.301,-1751.254],[-825.391,-1774.542],[-769.672,-1779.785],
             [-720.091,-1783.025],[-624.592,-1787.293],[-531.174,-1784.237],
             [-478.274,-1772.277],[-409.804,-1756.207],[-304.268,-1735.394],
             [-184.69,-1714.319],[-75.86,-1695.219],[149.466,-1646.033],
             [254.976,-1614.736],[352.53,-1575.667],[446.923,-1530.749],
             [537.706,-1483.25],[631.625,-1435.645],[709.131,-1399.474],
             [773.57,-1366.543],[840.327,-1325.867],[894.307,-1280.633],
             [931.796,-1233.319],[974.289,-1205.077],[1055.404,-1158.421],
             [1172.454,-1095.905],[1338.214,-1002.065],[1514.012,-883.646],
             [1656.747,-771.708],[1783.412,-667.805],[1890.529,-578.865],
             [1972.355,-502.861],[2083.767,-371.876],[2113.22,-317.764],
             [2138.406,-233.277],[2142.041,-142.124],[2124.812,-60.034],[2101.787,2.798],
             [2080.158,64.786],[2077.312,117.607],[2077.312,178.042],[2077.312,225.778],
             [2077.312,288.847],[2075.89,360.373],[2065.563,428.816],[2049.413,487.091],
             [2022.647,552.452],[1984.895,625.426],[1944.535,687.468],[1900.514,748.482],
             [1849.958,807.652],[1794.029,863.292],[1733.331,914.163],[1669.182,958.844],
             [1616.808,991.406],[1568.413,1018.567],[1518.964,1038.589],
             [1445.753,1055.502],[1379.68,1057.847],[1304.967,1060.481],
             [1231.018,1067.858],[1153.117,1076.367],[1086.676,1081.794],
             [1011.62,1084.85],[948.92,1088.459],[880.608,1094.703],[802.496,1111.327],
             [716.692,1139.226],[641.083,1152.451],[593.478,1155.744],[539.313,1157.245],
             [481.197,1160.249],[421.527,1168.257],[374.106,1176.029],[290.567,1190.782],
             [215.459,1208.09],[137.979,1225.03],[69.958,1239.309],[10.524,1250.953],
             [-73.094,1253.877],[-154.709,1264.257],[-201.682,1270.422],
             [-250.472,1276.639],[-334.538,1281.566],[-393.998,1281.566],
             [-491.473,1281.566],[-539.947,1281.197],[-595.56,1274.11],
             [-653.519,1260.78],[-707.762,1245.631],[-761.189,1227.269],
             [-814.8,1208.749],[-869.044,1190.993],[-927.107,1174.079],
             [-985.434,1161.381],[-1037.86,1153.399],[-1107.673,1144.494],
             [-1168.134,1128.372],[-1235.603,1089.118],[-1301.912,1035.27],
             [-1358.422,962.796],[-1398.544,873.751],[-1431.37,792.03],
             [-1452.893,735.389],[-1463.036,670.001],[-1463.036,616.311],
             [-1461.008,564.886],[-1451.313,516.307],[-1437.297,456.505],
             [-1413.376,369.857],[-1389.824,289.506],[-1368.512,224.277],
             [-1352.731,174.459],[-1335.897,113.129],[-1317.403,56.83],
             [-1297.908,-5.633],[-1284.209,-61.931],[-1271.879,-111.327],
             [-1252.859,-177.663],[-1226.145,-260.069],[-1200.248,-331.832],
             [-1183.23,-389.079],[-1172.692,-439.687],[-1168.477,-487.845],
             [-1161.575,-561.583],[-1130.672,-607.634],[-1093.658,-641.434],
             [-1039.336,-682.9],[-957.641,-731.058],[-906.769,-755.19],
             [-850.207,-779.98],[-792.908,-802.083],[-737.005,-819.892],
             [-678.546,-834.672],[-620.851,-845.894],[-568.399,-853.482],
             [-520.979,-858.408],[-442.498,-863.15],[-379.192,-864.494],
             [-325.08,-865.837],[-248.733,-867.181],[-172.413,-867.181],
             [-80.76,-867.181],[14.133,-867.181],[64.926,-867.181],[113.953,-867.181],
             [161.927,-867.181],[211.428,-867.26],[260.376,-868.788],[311.274,-870.263],
             [364.174,-870.263],[415.256,-870.263],[464.626,-870.263],[553.987,-870.263],
             [626.988,-870.263],[694.694,-870.263],[759.554,-867.523],[823.098,-854.746],
             [876.419,-825.873],[924.946,-788.806],[961.46,-750.184],[999.369,-693.464],
             [1025.003,-632.082],[1036.7,-576.205],[1050.557,-521.065],
             [1065.415,-476.227],[1090.179,-419.006],[1117.051,-349.193],
             [1141.077,-257.382],[1154.329,-180.851],[1164.919,-123.946],
             [1171.769,-75.63],[1173.244,-6.318],[1173.06,43.078],[1156.41,106.253],
             [1130.987,146.534],[1090.1,194.297],[1035.936,253.651],[999.554,287.161],
             [963.225,320.514],[924.709,353.866],[882.478,383.135],[837.613,412.114],
             [793.144,440.803],[748.727,469.466],[702.624,498.63],[653.069,529.69],
             [596.428,565.835],[535.335,604.14],[473.346,642.84],[415.862,682.225],
             [360.776,720.135],[307.165,755.016],[259.902,786.945],[212.06,815.318],
             [164.587,838.396],[119.433,856.996],[72.408,871.564],[23.512,884.131],
             [-26.306,894.062],[-76.044,900.754],[-129.629,904.179],[-186.481,904.521],
             [-242.49,896.117],[-304.189,871.854],[-367.469,838.054],[-427.93,800.46],
             [-486.889,760.917],[-541.817,716.21],[-598.643,654.537],[-660.684,558.248],
             [-716.298,426.814],[-756.342,286.002],[-779.894,143.162],[-789.773,0.848],
             [-792.381,-118.757],[-792.381,-203.086],[-792.381,-282.093],
             [-792.381,-358.414],[-790.432,-411.656],[-770.752,-497.408],
             [-725.676,-550.65],[-666.059,-589.983],[-584.048,-641.091],
             [-531.806,-664.723],[-379.877,-701.473],[-296.628,-709.614],
             [-229.028,-712.591],[-174.916,-712.591],[-127.601,-712.591],
             [-68.51,-693.385],[-16.69,-657.53],[35.472,-623.941],[83.683,-591.142],
             [126.836,-554.128],[165.193,-515.77],[208.609,-456.995],[251.498,-385.917],
             [288.117,-297.478],[309.483,-203.56],[314.91,-150.423],[315.885,-95.863],
             [315.885,-38.484],[309.773,14.916],[294.572,64.549],[257.452,144.11],
             [207.766,204.993],[135.977,247.381],[79.494,266.428],[-1.937,288.426],
             [-95.381,306.867],[-180.237,319.302],[-243.702,326.046],[-295.838,328.233],
             [-344.707,324.966],[-417.076,291.218],[-463.916,247.539],[-482.384,192.242],
             [-483.174,127.987],[-459.596,37.309],[-431.512,-8.662],[-398.687,-49.47],
             [-343.811,-102.923],[-267.227,-137.83],[-202.42,-140.675],
             [-151.574,-139.78],[-92.167,-126.476],[-63.03,-85.51],[-102.6,-57.347]]}] },
  },
  {
    name: 'Warren', group: 'growth',
    note: 'Edges a third the usual length, nothing skipped in the repulsion, and heavy smoothing. Every node feels every neighbour, so the folding is as fine and as even as this tool gets: a round mass packed with passages of one width throughout, with none of the radial arms the coarser settings throw out. It fills its budget in thirty-five steps and takes twelve hundred more to work the folds even.',
    cfg: { minEdge: 4, maxEdge: 9, repulsionFactor: 11.5, alignmentFactor: 1.41,
           damping: 0.5, smoothing: 0.45, splitJitter: 0.7,
           // the usual skip of 2 ignores near neighbours for speed; at this edge
           // length that is most of the neighbourhood, and the fold coarsens
           repulsionSkip: 0, pruneShort: true,
           maxNodes: 3200, pauseAtBudget: false, settleAt: 0.01,
           follow: false, frame: { cx: -5, cy: 8, rx: 2440, ry: 1457 } },
  },
  {
    name: 'Corral', group: 'growth',
    note: 'A drawn boundary pens the growth in and two obstacles stand in its way. The walls push back like a line of nodes, so the curve keeps its distance, and the run ends when the boundary is full.',
    cfg: { seeds: [seed('circle')], startRadius: 55, repulsionRadius: 46,
           wallRepulsion: 0.6, boundary: ring(0, 0, 330, 64, 0.18),
           obstacles: [ring(150, -70, 72, 28, 0), ring(-150, 90, 60, 24, 0)],
           maxNodes: 2600, showConstraints: true },
  },

  /* ---- applications: the drawing matters as much as the form ---- */

  {
    name: 'Graphite', group: 'creative',
    note: 'The pencil style: the outline drawn as hundreds of short strokes, each taking its own length, width and opacity from a range.',
    cfg: { seeds: [seed('circle')], maxNodes: 1600,
           style: 'pencil', fillOn: false, bg: '#f2efe9', stroke: '#2b2b33',
           strokeWidth: 2.2, skOpMin: 0.3, skOpMax: 0.85 },
  },
  {
    name: 'Scribble', group: 'creative',
    note: 'Wide ranges and long strokes that mostly ignore the curve: four passes of loose hatching.',
    cfg: { seeds: [seed('star')], initialNodes: 24, minEdge: 9, maxEdge: 14,
           repulsionRadius: 120, repulsionFactor: 12, attractionFactor: 1.4,
           alignmentFactor: 0.4, noiseFactor: 0.05, damping: 0.7, maxNodes: 1400,
           style: 'pencil', fillOn: false, bg: '#f2efe9', stroke: '#22242b',
           strokeWidth: 2, skPasses: 4, skDensity: 6,
           skLenMin: 30, skLenMax: 120, skBowMin: 0, skBowMax: 0.25,
           skJitMin: 2, skJitMax: 8, skWidthMin: 0.3, skWidthMax: 1.4,
           skOpMin: 0.12, skOpMax: 0.5 },
  },
  {
    name: 'Grain', group: 'creative',
    note: 'The stipple style at close spacing with the dots held off the line rather than scattered across it: none falls within 2.3 of the outline, and a low scatter power crowds the rest against the inner edge of the band. Stacked as it grows, so every frame leaves its own wall of grain and the record reads as depth.',
    cfg: { seeds: [seed('circle')], initialNodes: 10, startRadius: 125, seed: 10,
           minEdge: 11, maxEdge: 16, repulsionRadius: 100, attractionFactor: 1,
           repulsionFactor: 8, alignmentFactor: 1, noiseFactor: 0.1, damping: 0.6,
           smoothing: 0.3, repulsionSkip: 2, wallRepulsion: 1, splitJitter: 1,
           pruneShort: false, maxNodes: 1500, settleAt: 0.001, stepsPerFrame: 1,
           follow: false, frame: { cx: -43.9, cy: -20.7, rx: 1231.7, ry: 735.8 },
           boundary: null, obstacles: [], drawnShapes: [], style: 'stipple', tension: 0.33,
           strokeWidth: 2, fillOn: false, strokeOn: true, showNodes: false,
           showConstraints: false, accumulate: true, trailFade: 0.02, stampEvery: 2,
           bg: '#f7f4ec', fill: '#000000', stroke: '#766e65', skPasses: 2, skDensity: 9,
           skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5, skJitMin: 1.2,
           skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6, skOpMin: 0.25, skOpMax: 0.8,
           skHueMin: -13, skHueMax: 16, skSatMin: 0, skSatMax: 0, skValMin: -0.27,
           skValMax: 0.35, stSpacing: 1.5, stSizeMin: 0.2, stSizeMax: 1.3,
           // a dead zone at the line and a low power together: no dot falls
           // within 2.3 of the outline, and past that they crowd the inner edge
           // of the band, so the grain reads as a wall rather than a smear
           stScatMin: 2.3, stScatMax: 13.4, stScatPow: 0.75,
           stOpMin: 0.23, stOpMax: 0.95, ctCount: 4, ctGap: 7, ctFade: 0.72,
           // a layer every dozen steps for the still picture; the app stacks
           // far more finely, but every dot of every layer ends up in the file
           stackEvery: 12, stackFade: 0.4 },
  },
  {
    name: 'Topography', group: 'creative',
    note: 'The contour style: nine echoes at close spacing, each stepped round the colour wheel, so the form reads as banded ground rather than a line. Dialled in by hand and saved out of the app.',
    cfg: { seeds: [seed('circle')], initialNodes: 10, startRadius: 125, seed: 10,
           minEdge: 11, maxEdge: 16, repulsionRadius: 110, attractionFactor: 1,
           repulsionFactor: 8, alignmentFactor: 1, noiseFactor: 0.1, damping: 0.6,
           smoothing: 0.3, repulsionSkip: 2, wallRepulsion: 1, splitJitter: 1,
           pruneShort: false, maxNodes: 1300, settleAt: 0.001, stepsPerFrame: 1,
           follow: true, frame: null, boundary: null, obstacles: [], drawnShapes: [],
           style: 'contour', tension: 0.33, strokeWidth: 5, fillOn: false, strokeOn: true,
           showNodes: false, showConstraints: false, accumulate: false, trailFade: 0,
           stampEvery: 4, bg: '#f4f2ec', fill: '#000000', stroke: '#6d712d', skPasses: 2,
           skDensity: 9, skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5,
           skJitMin: 1.2, skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6, skOpMin: 0.25,
           skOpMax: 0.8, skHueMin: -180, skHueMax: 71, skSatMin: -0.24, skSatMax: 0.74,
           skValMin: -0.23, skValMax: 0.02, stSpacing: 7, stSizeMin: 0.6, stSizeMax: 2.6,
           stScatMin: 0, stScatMax: 2.5, stOpMin: 0.25, stOpMax: 0.9, ctCount: 9,
           ctGap: 2.5, ctFade: 0.75 },
  },
  {
    name: 'Rings', group: 'creative',
    note: 'Stacking, with the oldest layers sinking back: every few steps is left in the picture rather than erased. Auto-fit is off, because the layers only line up if the view holds still.',
    cfg: { seeds: [seed('circle')], maxNodes: 2400, repulsionRadius: 110,
           stackEvery: 3, stackFade: 0.35, follow: false,
           // framed for the size it finishes at, so it grows into the picture
           // rather than off the edge of it
           frame: { cx: -46, cy: 7, rx: 887, ry: 906 },
           accumulate: true, stampEvery: 3, trailFade: 0.03,
           fillOn: false, bg: '#fbf9f4', stroke: '#b0332a', strokeWidth: 1 },
  },
  {
    name: 'Sediment', group: 'creative',
    note: 'The same, with nothing fading: every layer carries the same weight, so the record thickens evenly and the first outline reads as clearly as the last.',
    cfg: { seeds: [seed('circle')], maxNodes: 2400, repulsionRadius: 110, seed: 7,
           stackEvery: 3, stackFade: 1, follow: false,
           frame: { cx: 3, cy: 6, rx: 884, ry: 894 },
           accumulate: true, stampEvery: 3, trailFade: 0,
           fillOn: false, bg: '#ffffff', stroke: '#c0392b', strokeWidth: 1 },
  },
  {
    name: 'Neon rabbit', group: 'creative',
    note: 'A strand traced by hand, set loose among four drawn obstacles and stacked every step. It threads the gaps between them in cyan, and the record of where it has been fills the space they leave. The pause at the budget is off, so it carries on past its last node until the settle test calls it done.',
    cfg: { initialNodes: 10, startRadius: 125, seed: 10, minEdge: 11, maxEdge: 16,
           repulsionRadius: 100, attractionFactor: 1, repulsionFactor: 8,
           alignmentFactor: 1, noiseFactor: 0.1, damping: 0.6, smoothing: 0.3,
           repulsionSkip: 2, wallRepulsion: 1, splitJitter: 1, pruneShort: false,
           // the budget stops the growth but not the run: the strand keeps
           // threading the gaps for another 230 steps, and a loose threshold
           // calls it done once it is only creeping
           maxNodes: 3200, pauseAtBudget: false, settleAt: 0.07,
           stepsPerFrame: 1, follow: false,
           frame: { cx: -583, cy: -333, rx: 2622, ry: 1567 }, style: 'smooth',
           tension: 0.33, strokeWidth: 1, fillOn: false, strokeOn: true, showNodes: false,
           showConstraints: true, accumulate: true, trailFade: 0.01, stampEvery: 1,
           bg: '#000000', fill: '#000000', stroke: '#00fffb', skPasses: 2, skDensity: 9,
           skLenMin: 16, skLenMax: 54, skBowMin: 0.2, skBowMax: 0.5, skJitMin: 1.2,
           skJitMax: 3.6, skWidthMin: 0.4, skWidthMax: 1.6, skOpMin: 0.25, skOpMax: 0.8,
           skHueMin: 0, skHueMax: 0, skSatMin: 0, skSatMax: 0, skValMin: 0, skValMax: 0,
           stSpacing: 7, stSizeMin: 0.6, stSizeMax: 2.6, stScatMin: 0, stScatMax: 2.5,
           stOpMin: 0.25, stOpMax: 0.9, ctCount: 4, ctGap: 7, ctFade: 0.72,
           drawnShapes: [{ id: 's110xw', name: 'strand 1', closed: false, pts: [
             [-1502.9,-624],[-1475.5,-624],[-1440.9,-616.8],[-1400,-609.8],[-1356.8,-607.6],
             [-1310.3,-607.6],[-1265.3,-607.6],[-1222.8,-607.6],[-1178.4,-607.6],
             [-1135.1,-607.6],[-1087.7,-607.6],[-1064.2,-607.6],[-1039.7,-607.6],
             [-1013.7,-607.6],[-986.7,-607.6],[-962.1,-608.9],[-936.4,-611.3],[-911.9,-613.1],
             [-871.1,-613.8],[-833,-613.8],[-791.2,-613.8],[-755.1,-609.5],[-718.3,-600.2],
             [-683.1,-588.2],[-655.5,-578.4],[-622.2,-564.6],[-602,-546.5],[-581.9,-514.6],
             [-558.7,-456.8],[-550.8,-431.6],[-540.7,-400.6],[-532.1,-372.6],[-524.8,-343.6],
             [-518.4,-314.7],[-513.4,-289.5],[-505.8,-249.7],[-500.9,-215.4],[-492.8,-155.1],
             [-484.4,-114.9],[-470,-74.7],[-460.4,-51.6],[-449.1,-26.2],[-434.3,2.6],
             [-417.2,32.1],[-398.4,60.2],[-383.7,79.3],[-357.9,103.6],[-333.4,119.2],
             [-306.1,128.1],[-268,130.4],[-226,125.9],[-185.9,125],[-155.7,131],[-130.9,140.5],
             [-91.5,156.3],[-60,158.6],[-36.6,158.6],[0.4,158.6],[32.7,158.6],[67.4,158.6],
             [107.7,158.6],[148.2,158.6],[185.2,158.6],[217.3,158.6],[264.6,158.6],
             [298.4,158.6],[330.4,158.6],[364.7,158.6],[398.6,158.6],[442,161.3],[465.4,166.7],
             [488.9,172.8],[527.5,180],[570.1,181.6],[612.7,179.4],[649.3,175.8],[679.1,175.8],
             [704.5,176.7],[729.9,175.9]
           ]}],
           seeds: [seed('drawn:s110xw')],
           boundary: null,
           obstacles: [
             [
               [-684.6,-461.9],[-707.4,-477],[-731,-492.6],[-758.7,-516],[-778.2,-532.8],
               [-803.2,-546.2],[-830.5,-549.7],[-857.9,-549.7],[-885.2,-549.7],[-921.2,-540.6],
               [-944.3,-530.4],[-965.6,-518.4],[-986.2,-505.1],[-1007.1,-490.5],
               [-1032.9,-473.2],[-1060.4,-454.2],[-1102.3,-416.3],[-1126.7,-386.4],
               [-1150.2,-347.5],[-1168.7,-310.3],[-1178.6,-274.2],[-1183.2,-241.3],
               [-1183.2,-212.3],[-1175.5,-179.2],[-1162.2,-158.8],[-1147.1,-137.2],
               [-1127.1,-113.9],[-1099.3,-91.1],[-1063.6,-65.5],[-1021.1,-38],[-993.6,-22.9],
               [-963.5,-9],[-935.2,3.3],[-879.9,18.4],[-853.5,22.3],[-825.9,25.4],[-799.4,26.8],
               [-756.6,26.8],[-726.3,25.4],[-697.8,10.4],[-678.7,-11.3],[-658.2,-42.4],
               [-644.3,-61.7],[-618.9,-96.3],[-606.5,-117.6],[-598.7,-154.4],[-593.3,-188.1],
               [-592.1,-214.1],[-592.1,-244.5],[-596.6,-277.1],[-602.7,-300.8],[-610.2,-330.1],
               [-618.9,-358],[-628.5,-382.7],[-640.8,-408.3],[-653.1,-429.6],[-662.6,-452.8]
             ],
             [
               [-875.5,-720.6],[-841.1,-720.6],[-807.8,-720.6],[-771.8,-720.6],[-731.9,-720.6],
               [-689.3,-719.2],[-631.5,-719.2],[-592.4,-717.9],[-563.4,-713.4],[-530.3,-707.8],
               [-500,-700],[-467.2,-684.9],[-438.7,-670.8],[-414.5,-652.7],[-401.7,-632.5],
               [-399.2,-601.2],[-404.2,-569.9],[-411.6,-534.4],[-416.9,-502.1],[-418.1,-475.2],
               [-418.1,-442.9],[-418.1,-409.7],[-415.4,-384.2],[-409.1,-349.5],[-404.1,-325.9],
               [-397.3,-300.9],[-386.5,-275.8],[-371.8,-256],[-353.5,-239.4],[-330.6,-225.9],
               [-295.6,-220.2],[-265.3,-218],[-239.2,-217.4],[-214.4,-217.4],[-187.6,-217.4],
               [-154.9,-217.4],[-119.3,-217.4],[-90.6,-217.4],[-66.5,-219.4],[-65.4,-244.2],
               [-65.4,-269.2],[-65.4,-303.2],[-66.1,-340.9],[-67.8,-381.8],[-69.8,-422.4],
               [-73.5,-459.2],[-79.7,-494.3],[-86.6,-524.7],[-98.4,-575.5],[-103.5,-613.7],
               [-103.9,-646.9],[-103.9,-691.5],[-103.9,-717],[-103.9,-745],[-103.9,-787.3],
               [-103.9,-817.3],[-103.9,-844.3],[-103.9,-872.5],[-113,-903.5],[-121.5,-928],
               [-132.7,-955.8],[-145.2,-986],[-160.6,-1012.9],[-184.6,-1033.3],[-213.3,-1043.2],
               [-250.3,-1046],[-285.2,-1047.4],[-335.5,-1053],[-373.1,-1055.7],[-407.6,-1056.1],
               [-435.8,-1056.1],[-469.7,-1056.1],[-506.5,-1054.7],[-548.3,-1047.3],
               [-572,-1044.5],[-610.6,-1043.2],[-643.1,-1042.9],[-669.7,-1041.7],
               [-698.6,-1039.9],[-723.9,-1037.5],[-764.6,-1033.5],[-802.7,-1029.2],
               [-837.7,-1024.3],[-872.3,-1018.8],[-901.1,-1014.5],[-928.8,-1006.6],
               [-947.6,-988.6],[-955.4,-963.8],[-958.5,-937.2],[-959.4,-906.3],[-950.9,-880.3],
               [-938.8,-854.5],[-930.7,-828.1],[-928.3,-800.4],[-927.8,-773.7],[-927.8,-747.9],
               [-907.5,-733.4]
             ],
             [
               [1133.3,488],[1103.2,458],[1054,452.6],[1005.4,452.6],[966.2,474.6],[928,503.9],
               [905.5,540.9],[877.3,570.3],[837.6,583.8],[784.4,589],[741.4,580],[708.8,557.2],
               [675.2,528.3],[642.4,494.4],[599.8,446.4],[561.4,422.3],[520.8,410.2],
               [472.6,399.3],[430.9,394.9],[391.7,411.4],[361.2,448.4],[341.2,482.8],
               [327.6,519.6],[303.2,560],[257.1,584.2],[218.5,592.1],[177,589.6],[142.2,565.4],
               [109.5,525.4],[87.6,490.1],[61.1,439.6],[36.8,401.6],[-3.5,365.4],[-45.9,342.5],
               [-89,334.6],[-144.2,355],[-195.5,394.4],[-235.8,433],[-258.6,471.9],
               [-284.1,551.6],[-311.6,597.9],[-348.9,620.7],[-425.8,602.4],[-472.3,556.1],
               [-520.9,503.2],[-558.5,454.7],[-586.7,411.6],[-617.8,370.4],[-652.9,345.2],
               [-697.2,329.4],[-752.7,323.6],[-806.7,342.5],[-843.8,375.5],[-874.9,417.3],
               [-906.9,464.1],[-942.6,506],[-988,542.1],[-1050.8,568],[-1128.1,577.5],
               [-1178,579.2],[-1233.8,580.3],[-1295,584.5],[-1346.7,590.4],[-1386.6,598.2],
               [-1442.6,618.9],[-1478.1,645.1],[-1475.6,692.3],[-1420.8,732],[-1383.7,755],
               [-1344.6,773.6],[-1296.5,790.5],[-1238.8,805.8],[-1173.8,819.5],[-1105.8,831.8],
               [-1044.5,840.4],[-1001,846],[-920.5,851.6],[-880.7,853],[-808,853],[-762.6,853],
               [-708.2,853],[-650,853],[-589.5,851.5],[-527.2,848.5],[-469,843.6],
               [-414.9,837.1],[-365.2,831.3],[-321.2,827.2],[-221.8,825.7],[-150.7,824.4],
               [-110.2,821.2],[-66.5,816.5],[-24.2,811.3],[18.2,807.1],[63.1,804.2],
               [105.3,802.9],[150.8,802.9],[192,802.9],[231,802.9],[273.9,802.9],[349.9,802.9],
               [391.2,802.9],[434.1,802.9],[480.7,802.9],[530.3,802.9],[575.3,802.9],
               [646.7,802.9],[708.9,802.9],[775.3,802.9],[814.7,802.9],[887.5,802.9],
               [947,802.9],[990.5,802.9],[1039.1,802.9],[1095.4,805.4],[1145.6,804.4],
               [1187.3,793.9],[1235.3,769.8],[1274.5,736],[1300.1,705.6],[1301.7,662.4],
               [1284.1,620.2],[1261.9,582.2],[1231.6,553.2],[1201.4,528.2],[1170.2,495.6]
             ],
             [
               [-1750.5,-1310.5],[-1698.8,-1311.9],[-1651.2,-1306.2],[-1603.1,-1290.2],
               [-1566.3,-1266.2],[-1537,-1233.5],[-1514.2,-1197.4],[-1507.8,-1151.5],
               [-1505.2,-1109.3],[-1510.9,-1062.5],[-1525.8,-1022.5],[-1548.8,-982.3],
               [-1579.5,-943.4],[-1610.6,-916.5],[-1649.3,-889.4],[-1681.3,-867.5],
               [-1714.5,-845.6],[-1750.2,-826.7],[-1784.5,-809.1],[-1817.7,-787.4],
               [-1846.6,-761.4],[-1877,-737],[-1904.7,-703.6],[-1931,-674],[-1959.9,-635.4],
               [-1979.4,-598.4],[-1984.7,-558.8],[-1983.9,-514.8],[-1972.6,-473.4],
               [-1966.4,-427.8],[-1964.6,-381.4],[-1965.3,-333.1],[-1979.7,-281.5],
               [-2005.6,-228.2],[-2025.5,-191.4],[-2041.5,-155.4],[-2057.8,-119.8],
               [-2080.7,-70.3],[-2098,-23.5],[-2110.8,17.9],[-2126.4,56.1],[-2147.8,96.6],
               [-2164.3,132.6],[-2180.7,168.9],[-2219.1,162.8],[-2243.9,117.8],[-2263.1,82.7],
               [-2256.7,42.8],[-2246.1,5],[-2233.7,-35],[-2215.8,-69.1],[-2198.8,-111.6],
               [-2187.3,-149.5],[-2174.5,-191.6],[-2184.2,-234.8],[-2214.2,-267.7],
               [-2242.7,-298.5],[-2272.1,-328.6],[-2304.2,-366.3],[-2343.3,-412.8],
               [-2371.5,-449.4],[-2395.8,-488.8],[-2417,-533.9],[-2434.3,-581.4],
               [-2442.6,-628.6],[-2442.8,-680.4],[-2434.4,-741],[-2405.6,-810.2],
               [-2388.6,-845.7],[-2377,-887.3],[-2369.9,-931],[-2358.7,-984.7],
               [-2343.6,-1031.5],[-2317.8,-1076.3],[-2291.5,-1109.9],[-2263.1,-1142.2],
               [-2223.5,-1185.4],[-2194.9,-1217.2],[-2162.3,-1244.1],[-2123.7,-1265.2],
               [-2085.8,-1287.7],[-2047.3,-1308],[-2003.1,-1324.6],[-1964.3,-1336.8],
               [-1920.3,-1338.9],[-1880,-1341.5],[-1834.9,-1342.1],[-1793.8,-1338.2],
               [-1753,-1333.8]
             ],
           ],
           // the app lays a layer every step; every fourth is plenty for the
           // still picture, where each layer is a whole path of its own
           // the still ramps its layers linearly from stackFade up to 1, so this
           // is the oldest layer's alpha. The app's fade is geometric: at a
           // trailFade of 0.01 over 367 stamps the oldest is down to 0.025, so
           // 0.35 would show a record the app no longer keeps
           stackEvery: 4, stackFade: 0.06 },
  },
  {
    name: 'Verdigris', group: 'creative',
    note: 'The Meander forces again, but with the body filled in dark olive under mint strokes whose hue swings right round toward amber. The labyrinth reads as a corroded, speckled surface rather than a line. Dialled in by hand and saved out of the app.',
    cfg: { seeds: [seed('circle')], initialNodes: 10, startRadius: 125, seed: 341,
           minEdge: 11, maxEdge: 16, repulsionRadius: 99, attractionFactor: 0.52,
           repulsionFactor: 11.7, alignmentFactor: 1.21, noiseFactor: 0.1, damping: 0.23,
           smoothing: 0.3, repulsionSkip: 2, wallRepulsion: 1, splitJitter: 1,
           pruneShort: false, maxNodes: 8600, settleAt: 0.001, stepsPerFrame: 8,
           follow: false, frame: { cx: 30, cy: -506, rx: 4003, ry: 2391 }, boundary: null,
           obstacles: [], drawnShapes: [], style: 'pencil', tension: 0.33, strokeWidth: 1.8,
           fillOn: true, strokeOn: true, showNodes: false, showConstraints: false,
           accumulate: false, trailFade: 0, stampEvery: 4, bg: '#07070c', fill: '#3d3424',
           stroke: '#3dffd0', skPasses: 2, skDensity: 8, skLenMin: 16, skLenMax: 62,
           skBowMin: 0.35, skBowMax: 0.74, skJitMin: 1.2, skJitMax: 4.3, skWidthMin: 0.4,
           skWidthMax: 1, skOpMin: 0.25, skOpMax: 0.8, skHueMin: -154, skHueMax: 0,
           skSatMin: -0.43, skSatMax: 0, skValMin: -0.5, skValMax: 0, stSpacing: 7,
           stSizeMin: 0.6, stSizeMax: 2.6, stScatMin: 0, stScatMax: 2.5, stOpMin: 0.25,
           stOpMax: 0.9, ctCount: 4, ctGap: 7, ctFade: 0.72,
           // it needs nearly nine thousand steps to fill
           maxSteps: 12000 },
  },
  {
    name: 'Topiary', group: 'creative',
    note: 'Two obstacles with the constraints hidden, so nothing shows of them but the shape they impose. The growth packs tight where it is penned in and fans loose where it is not, and the record of every third frame in olive stipple turns the difference into a canopy over a trunk. The scatter power is down at 0.75, which is what keeps a line readable inside the haze.',
    cfg: { seeds: [seed('circle')], seed: 188, minEdge: 12.5, maxEdge: 29.5,
           repulsionRadius: 148, attractionFactor: 0.81, repulsionFactor: 12.3,
           alignmentFactor: 1.94, noiseFactor: 0, damping: 0.62, smoothing: 0.33,
           // edges this long normally starve the growth; they only work here
           // because the repulsion reaches half again as far and skips nothing
           repulsionSkip: 0, maxNodes: 6600,
           style: 'stipple', tension: 0.22, strokeWidth: 1.9, fillOn: false,
           stSpacing: 12.5, stSizeMin: 0.2, stSizeMax: 1.3, stScatMax: 7.9,
           stScatPow: 0.75, skHueMin: -12, skHueMax: 23,
           ctCount: 14, ctGap: 1.5,
           accumulate: true, trailFade: 0.01, stampEvery: 3,
           // the still cannot carry 315 stipple layers, so it samples the same
           // record more coarsely than the app draws it
           stackEvery: 15, stackFade: 0.3,
           bg: '#fffde5', stroke: '#638023',
           follow: false,
           frame: { cx: -119, cy: -656, rx: 4714, ry: 2816 },
           obstacles: [[
             [-1358.001,-602.214],[-1383.543,-541.255],[-1406.738,-481.027],
             [-1427.83,-419.489],[-1442.246,-361.029],[-1459.864,-302.752],
             [-1476.17,-237.77],[-1487.356,-177.238],[-1506.741,-111.31],
             [-1530.546,-30.052],[-1535.758,41.545],[-1535.758,108.295],
             [-1534.691,171.022],[-1514.696,255.968],[-1488.088,316.196],
             [-1456.694,378.008],[-1419.478,441.833],[-1372.204,504.742],
             [-1325.418,555.247],[-1276.682,600.509],[-1229.347,640.62],
             [-1180.366,684.511],[-1114.53,738.338],[-1046.348,794.816],
             [-978.896,847.454],[-908.001,896.862],[-831.406,943.008],
             [-755.512,984.887],[-681.416,1021.706],[-612.745,1049.016],
             [-538.406,1077.392],[-467.114,1106.226],[-388.934,1136.37],
             [-306.213,1158.285],[-213.097,1179.834],[-108.949,1199.28],
             [0.839,1215.526],[60.67,1226.437],[129.767,1235.855],[200.053,1243.445],
             [261.378,1250.638],[317.704,1254.905],[375.158,1257.496],
             [431.941,1260.452],[491.956,1262.19],[557.73,1262.617],[630.912,1262.617],
             [695.071,1262.617],[750.727,1262.617],[841.465,1262.617],
             [906.203,1262.617],[969.662,1262.617],[1034.705,1263.378],
             [1085.332,1242.835],[1136.568,1220.463],[1192.863,1192.849],
             [1242.393,1158.651],[1300.334,1103.208],[1350.869,1042.585],
             [1387.933,977.998],[1412.804,926.884],[1449.227,857.025],
             [1470.014,805.819],[1487.631,750.651],[1509.394,692.862],
             [1537.221,634.28],[1567.853,569.176],[1599.034,505.321],
             [1625.124,453.232],[1658.743,377.246],[1689.162,292.483],
             [1721.836,190.468],[1746.189,95.219],[1767.586,-10.362],
             [1782.003,-108.08],[1787.215,-201.56],[1787.55,-285.897],
             [1787.55,-360.024],[1785.996,-431.833],[1782.978,-494.53],
             [1777.766,-556.099],[1769.476,-612.547],[1747.134,-670.763],
             [1715.74,-725.382],[1674.684,-766.468],[1620.309,-802.008],
             [1572.121,-833.158],[1526.127,-867.996],[1482.846,-911.338],
             [1441.546,-949.59],[1390.828,-981.654],[1333.039,-1005.581],
             [1284.058,-1034.932],[1230.262,-1052.275],[1173.6,-1063.522],
             [1122.212,-1092.965],[1116.634,-1147.707],[1162.323,-1178.613],
             [1226.056,-1179.741],[1284.241,-1179.741],[1363.823,-1179.741],
             [1422.801,-1173.492],[1492.599,-1160.447],[1575.229,-1139.203],
             [1656.854,-1114.972],[1729.791,-1086.199],[1803.338,-1044.259],
             [1896.332,-982.538],[1954.487,-941.238],[2016.025,-893.721],
             [2082.196,-842.393],[2155.012,-785.152],[2230.814,-723.431],
             [2300.429,-658.937],[2362.486,-590.662],[2416.252,-514.098],
             [2460.173,-433.053],[2491.78,-357.463],[2514.853,-283.215],
             [2530.215,-207.992],[2542.163,-129.049],[2554.538,-44.895],
             [2566.425,49.439],[2576.452,158.799],[2585.566,271.757],
             [2590.656,387.396],[2591.479,500.689],[2591.479,605.264],
             [2579.866,728.98],[2549.326,858.519],[2509.641,974.158],
             [2462.124,1084.738],[2408.937,1186.326],[2347.734,1283.282],
             [2279.734,1374.476],[2209.783,1463.202],[2141.509,1547.174],
             [2072.93,1624.775],[2002.98,1698.535],[1934.187,1760.378],
             [1850.277,1822.465],[1739.85,1886.198],[1628.264,1935.514],
             [1524.024,1969.468],[1421.308,1998.728],[1324.87,2025.489],
             [1244.557,2047.282],[1176.313,2065.326],[1110.721,2077.945],
             [1050.341,2083.797],[995.569,2086.052],[906.081,2086.052],
             [844.543,2078.127],[772.886,2060.541],[689.616,2046.429],
             [599.945,2042.375],[485.22,2042.375],[422.096,2042.375],
             [358.821,2042.375],[289.053,2040.119],[222.73,2032.957],[162.38,2021.618],
             [103.158,2009],[49.728,1995.65],[-30.83,1972.302],[-83.956,1947.523],
             [-140.556,1919.329],[-204.655,1909.362],[-276.769,1905.948],
             [-336.326,1905.369],[-405.18,1896.134],[-468.181,1888.697],
             [-542.338,1873.823],[-648.803,1831.182],[-711.53,1800.337],
             [-785.107,1763.091],[-863.897,1722.126],[-945.338,1678.876],
             [-1032.662,1632.73],[-1125.381,1586.279],[-1210.328,1545.04],
             [-1285.307,1508.8],[-1352.728,1476.187],[-1415.546,1445.402],
             [-1484.156,1408.37],[-1550.388,1372.19],[-1605.129,1343.235],
             [-1687.241,1296.997],[-1743.994,1245.457],[-1782.977,1199.371],
             [-1827.386,1149.751],[-1866.248,1104.946],[-1912.363,1050.631],
             [-1965.641,992.933],[-2014.531,935.906],[-2049.826,875.892],
             [-2079.604,788.812],[-2103.409,693.898],[-2132.486,613.89],
             [-2168.117,529.339],[-2195.701,415.132],[-2202.254,335.093],
             [-2204.845,253.438],[-2204.845,189.066],[-2203.199,83.119],
             [-2195.701,-2.864],[-2184.728,-60.349],[-2168.666,-144.777],
             [-2123.861,-258.374],[-2098.593,-320.37],[-2061.713,-416.411],
             [-2034.068,-503.186],[-2006.88,-583.286],[-1977.041,-661.04],
             [-1937.966,-742.054],[-1883.194,-837.333],[-1831.958,-917.22],
             [-1796.785,-967.115],[-1756.308,-1004.697],[-1690.076,-1041.485],
             [-1620.278,-1076.232],[-1568.584,-1097.293],[-1509.667,-1113.356],
             [-1451.695,-1121.464],[-1389.7,-1115.764],[-1331.85,-1093.788],
             [-1282.991,-1053.372],[-1252.511,-1005.032],[-1249.616,-937.733],
             [-1247.177,-877.109],[-1251.536,-818.192],[-1275.188,-765.767],
             [-1305.485,-708.679],[-1340.231,-666.526]],
           [
             [-605.249,-1507.132],[-493.631,-1537.633],[-397.236,-1571.157],
             [-278.583,-1591.986],[-175.648,-1594.679],[-51.334,-1594.679],
             [57.866,-1594.679],[160.636,-1594.679],[264.285,-1588.908],
             [375.244,-1561.155],[486.697,-1525.433],[549.513,-1437.721],
             [566.275,-1324.124],[542.809,-1223.223],[449.546,-1189.918],
             [342.599,-1167.771],[220.649,-1167.771],[122.605,-1149.91],
             [15.658,-1106.823],[-82.22,-1073.464],[-192.3,-1065.99],
             [-304.907,-1062.033],[-417.899,-1073.574],[-514.679,-1118.694],
             [-605.249,-1183.818],[-658.667,-1267.408],[-713.625,-1364.738],
             [-659.382,-1452.834]]] },
  },
  {
    name: 'Ember', group: 'creative',
    note: 'Two concentric rings, and every stroke nudged around the colour wheel and up or down in value, so the line burns unevenly. The pause at the budget is off: the rings spend their nodes in 216 steps and take another 1,950 settling against each other, which is what works the inner one out to meet the outer.',
    cfg: { seeds: [seed('ring'), seed('ring', 0, 0, 0, 0.45)], startRadius: 150,
           repulsionRadius: 85, maxNodes: 2200,
           // the two rings are still pushing on each other when the last node
           // goes in; stopping there leaves the pair half worked out
           pauseAtBudget: false,
           style: 'pencil', fillOn: false, bg: '#140d14', stroke: '#f2542d',
           strokeWidth: 2, skPasses: 3, skDensity: 8,
           skLenMin: 12, skLenMax: 46, skJitMin: 1, skJitMax: 4,
           skWidthMin: 0.35, skWidthMax: 1.5, skOpMin: 0.2, skOpMax: 0.7,
           skHueMin: -28, skHueMax: 34, skSatMin: -0.35, skSatMax: 0.1,
           skValMin: -0.25, skValMax: 0.15 },
  },
];

/* name -> full settings */
const PRESETS = {};
const PRESET_NOTES = {};
for (const p of PRESET_LIST){
  PRESETS[p.name] = Object.assign({}, BASE, { group: p.group }, p.cfg);
  PRESET_NOTES[p.name] = p.note;
}

if (typeof module !== 'undefined' && module.exports){
  module.exports = { PRESETS, PRESET_NOTES, PRESET_LIST, BASE, ring, seed };
}
