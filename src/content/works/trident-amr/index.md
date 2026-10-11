---
title: "Trident AMR: Design and Simulation of a Differential-Drive Pick-and-Place Robot"
codename: "TRIDENT"
fileNo: 4
kind: project
org: "RMI, NIT Trichy"
location: "Tiruchirappalli, India"
start: 2025-09-01
end: 2025-12-31
status: completed
summary: "A 3D-printed differential-drive robot designed for a WorldSkills pick-and-place task: a caging gripper slides coins without lifting, RTAB-Map and Nav2 navigate around obstacles, and a line follower guides the final blind docking. 36 of 36 coins delivered across twelve simulated missions."
tags: ["ROS2", "SLAM", "Navigation", "Mobile Robotics"]
stack: ["ROS2", "Gazebo", "Nav2", "RTAB-Map", "SolidWorks", "Python"]
featured: true
homeOrder: 3
classified: ["how many nights were lost to the NED/ENU transform", "the state-round infrared array failure"]
metrics:
  - label: "simulated missions passed"
    value: "12 / 12"
  - label: "coins delivered to drop zones"
    value: "36 / 36"
  - label: "line tracking error"
    value: "6.0 mm RMS"
  - label: "pose accuracy in map"
    value: "9.9 mm RMS"
  - label: "docking lateral offset"
    value: "2.7 mm RMS"
cover: ./trident-cad.png
coverAlt: "CAD model of Trident Version 2: differential drive with two N20 gearmotors, caging gripper, and depth camera mount."
figures:
  - src: ./trident-cad.png
    caption: "CAD model of Trident Version 2: two driven wheels at the rear, a ball caster under the plate, an Intel RealSense D435 depth camera, and geared jaws at the front."
  - src: ./trident-v2.jpg
    caption: "Trident Version 2: the printed robot during wiring, showing the 3D-printed chassis, caging gripper servo, and power circuitry."
  - src: ./trident-sim-arena.png
    caption: "Trident simulated in Gazebo inside the competition arena with textured walls for visual SLAM, colored coins, and unmapped obstacle boxes."
videos:
  - url: https://youtu.be/h_9SjreUzvU
    caption: "Simulation: obstacle avoidance in Gazebo with Nav2 local costmap dynamic replanning."
    afterImages: 1
  - url: https://youtu.be/z217gSfaEqg
    caption: "Simulation: full autonomous mission mapping the arena, surveying drop zones, and sorting coins."
    afterImages: 2
  - url: https://youtu.be/rt1YuzRq05M
    caption: "Hardware: Trident physical robot running tests."
    afterImages: 3
documents:
  - label: "Trident: Design and Simulation (Short Report)"
    kind: short-report
    file: /media/attachments/trident-short-report.pdf
    permalink: trident-short-report
  - label: "Trident: Design and Simulation of a Differential-Drive Pick and Place Robot"
    kind: report
    file: /media/attachments/trident-report.pdf
    permalink: trident-report
---

## Brief

Trident is a compact differential-drive robot designed and built for a WorldSkills competition task: follow a line, then pick and carry coloured coins to the corresponding bins of their color. The physical robot was designed in SolidWorks, 3D-printed in PLA, and wired within fifteen days. It won the district round of the competition. Following a sensor failure at the state round, I developed a high-fidelity Gazebo simulation and complete autonomy stack to prove the full mission end-to-end, verified and scored against ground truth by an automated referee node.

## Problem

Building a competitive autonomous mobile robot under strict dimension and timeline limits poses sharp mechanical and perceptual challenges:
- **Blind zone:** The Intel RealSense D435 depth camera sits 85 mm above the floor and cannot see the floor within 0.15 m of the robot. Global navigation alone cannot position the robot accurately enough to grab small coins.
- **Payload & tipping constraints:** Lifting coins forward of the front support risks tipping the lightweight platform. Moreover, adding a vertical lift axis increases mass, wiring, and actuator complexity.
- **Traction limits:** Mass properties from the CAD model reveal that the ball caster carries 82% of the robot's weight, leaving only 18% on the driven wheels. Acceleration and braking must be strictly capped to prevent wheel slip and loss of odometry.

## Approach

- **Caging Gripper Design:** Replaced standard friction-grasp lifting with a horizontal sliding cage. Two parabolic jaw profiles ($y^2 = 4fx$) coupled via equal involute gears are driven by a single servo. Coins are corralled inward along the profile and slid along the floor without lifting. Jaw release ridges push the coin free upon opening.
- **Dynamic & Stability Analysis:** Computed exact mass properties from CAD. With static wheel loading at 1.16 N and caster loading at 5.12 N, drive acceleration is limited to 1.0 m/s² to stay well within traction limits (1.8 m/s²) and provide a 2× tipping safety margin.
- **Sensor Fusion & Two-Stage Docking:** Combined global SLAM with local tactile/reflectance guidance. Nav2 brings the robot to a station pose just short of each stem. An 8-channel infrared array (pitch 15 mm) then takes over with a PD line-following law whose damping is set by the array's forward offset ($L = 48\text{ mm}$), stopping with sub-centimeter accuracy at crossbars.
- **Simulation in Gazebo & Autonomy Stack:** Exported URDF meshes directly from CAD. Integrated RTAB-Map for visual SLAM, Nav2 with Regulated Pure Pursuit for path tracking and dynamic obstacle inflation, and a custom mission state machine.
- **Ground-Truth Referee:** Built an independent evaluator node in ROS 2 that monitors true coin placements directly from simulator state, eliminating evaluation bias.

## Results

- **100% Mission Success:** Delivered all 36 coins across 12 full missions (spanning four obstacle layouts) with an average mission completion time of 300 s.
- **Obstacle Avoidance:** Successfully navigated around unmapped obstacle boxes with less than 5 s total time penalty compared to unobstructed runs.
- **Precision Docking & Placement:** Reached pick markers within 7 mm laterally and deposited coins within 21 mm of the center of target drop squares (which provide $\pm 125\text{ mm}$ tolerance).
- **Line Following:** Maintained line tracking within 6.0 mm RMS across noise levels up to 0.2 V.

## Status / Next

The simulated mission is complete, fully tested, and repeatable. Next hardware steps include adjusting the caster and camera positions to shift center of mass rearward for greater wheel traction, eliminating breadboard wiring with a custom PCB, and validating the autonomous mission on the physical platform.
