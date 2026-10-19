// Two-layer ASCII CCTV camera, split from a single hand-drawn frame (`ascii-art (1).txt`) at the
// joint so the head can rotate independently of the fixed wall mount. HEAD_ART is the housing
// (rows 4-17 of the source); MOUNT_ART is the joint plus the arm/wall plate (rows 18-28) and never
// moves. Both keep their original column alignment relative to each other; the source's 31
// leading columns of padding are stripped from every line so col 0 lines up across both arrays.
export const HEAD_ART = `                                    #######+-+###
                             #############+..-----##
                     ####################-.---...----+##
              ##########################-.......-....--+#
        ################################..........+--+###
       #################################.-.......+######
      ##################################-.-.....-######
      #############################++#####+-....-#####
      ####################++++++++++--+########+#####
      #################++--+++++++++++-----+########
       ++++#######-.------.....-++++++++++++++--###
            -+++++#######+..----+++
                  #######----++
                    ########++`;

export const MOUNT_ART = `                  ############
                 ##---.---.--+
             #####+-----.---
  #       ######+--------
 ############-.--------
 ########-..------++-
######-....--  +-----
 ######+#+++   -----
 #########++-----.--
  ##########
         -`;

// Grid constants, in `ch`/`em` on the trimmed grid above (1ch per column, 1em per row at
// line-height 1em). HEAD_ART has this many rows, so MOUNT_ART starts right below it.
export const HEAD_ROWS = 14;

// Center of the joint row (MOUNT_ART's row 0, the `############` run at cols 18-29): the pivot
// the head rotates around. Row is in the whole camera's coordinate space (HEAD_ART sits at rows
// 0-13, so row 14.5 is half a row into MOUNT_ART, the vertical center of the joint glyphs).
export const PIVOT = { col: 23.5, row: 14.5 };

// The lens' brightest `.` patch (HEAD_ART row 4, the widest contiguous run of dots, cols 41-50),
// where the glowing red "eye" overlay sits.
export const LENS = { col: 44, row: 4 };

// Rows of HEAD_ART that make up the housing itself; the rows below are the hood's underside and
// the neck, which would drag the axis down toward the joint.
const HOUSING_ROWS = 11;

/**
 * The housing's centre line, in em on the whole camera's grid (rows 1em tall, columns `charW` em
 * wide): the principal axis of its drawn glyphs, through their centroid. This is the line a viewer
 * reads as "where the camera points", so it is what gets aimed at the cursor. The pivot -> lens
 * direction is not: the joint sits well below the housing, so that line runs about 30 degrees
 * steeper than the body.
 */
export function housingAxis(charW: number): { angle: number; x: number; y: number } {
  const pts: [number, number][] = [];
  HEAD_ART.split('\n')
    .slice(0, HOUSING_ROWS)
    .forEach((line, row) => {
      [...line].forEach((ch, col) => {
        if (ch !== ' ') pts.push([(col + 0.5) * charW, row + 0.5]);
      });
    });
  const x = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const y = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [px, py] of pts) {
    sxx += (px - x) ** 2;
    syy += (py - y) ** 2;
    sxy += (px - x) * (py - y);
  }
  const angle = (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI;
  return { angle, x, y };
}

/** `point` moved perpendicularly onto `axis`, so the lens sits on the line it looks along. */
export function onAxis(axis: { angle: number; x: number; y: number }, px: number, py: number): { x: number; y: number } {
  const r = (axis.angle * Math.PI) / 180;
  const t = (px - axis.x) * Math.cos(r) + (py - axis.y) * Math.sin(r);
  return { x: axis.x + t * Math.cos(r), y: axis.y + t * Math.sin(r) };
}
