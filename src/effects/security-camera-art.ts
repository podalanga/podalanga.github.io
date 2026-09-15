// Two-layer ASCII CCTV camera, split from a single hand-drawn frame (`ascii-art (1).txt`) at the
// joint so the head can rotate independently of the fixed wall mount. HEAD_ART is the housing
// (rows 4-17 of the source); MOUNT_ART is the joint plus the arm/wall plate (rows 18-28) and never
// moves. Both keep their original column alignment relative to each other — the source's 31
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

// Center of the joint row (MOUNT_ART's row 0, the `############` run at cols 18-29) — the pivot
// the head rotates around. Row is in the whole camera's coordinate space (HEAD_ART sits at rows
// 0-13, so row 14.5 is half a row into MOUNT_ART, the vertical center of the joint glyphs).
export const PIVOT = { col: 23.5, row: 14.5 };

// The lens' brightest `.` patch (HEAD_ART row 4, the widest contiguous run of dots, cols 41-50),
// where the glowing red "eye" overlay sits.
export const LENS = { col: 44, row: 4 };
