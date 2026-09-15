---
title: "Designing a 3R Robotic Arm"
codename: "ARM-3R"
fileNo: 6
kind: project
org: "NIT Trichy"
location: "Tiruchirappalli, India"
start: 2025-08-01
end: 2025-09-30
status: completed
summary: "A minimal 3-degree-of-freedom revolute arm, designed for sequential hardware assembly rather than just simulation, with an anchored base and stainless-steel drive shaft."
tags: ["Robotic Arm", "CAD", "Kinematics"]
stack: ["SolidWorks", "onshape-to-robot", "RViz2"]
featured: false
cover: ./full-arm.png
coverAlt: "CAD render of the assembled 3R arm: turntable base, two link pairs, and end effector."
figures:
  - src: ./full-arm.png
    caption: "The assembled 3R arm: one yaw joint at the base, two planar revolute joints along the arm."
  - src: ./base-mount.png
    caption: "Exploded view of the anchored base: three-point anchoring with a wing to distribute lifting stress away from the two side anchors."
---

## Brief

A 3R (three-revolute) robotic arm (one joint for base yaw, two more articulating within a single plane) built as a foundation exercise in sequential assembly, actuation, and moving frames. The arm has three degrees of freedom, one per joint.

## Problem

A 3R arm is straightforward to model in simulation, but physical assembly has to solve real ordering and tolerance problems simulation skips over: which part gets fixed to the world first, how each joint transmits torque without slipping or breaking under repeated actuation, and how to keep the whole assembly rigid without over-constraining it.

## Approach

- Fixed the base to a stable surface using three anchor points, with an extra wing added to distribute stress rather than loading only two anchors during lifting.
- Used ST3215 servo motors with a stainless-steel flange shaft for the turntable drive: 3D-printed PLA was ruled out for this shaft because torsion breaks along the print layers.
- Assembled the turntable base, motor housings, and two link pairs in sequence: base → turntable → motor housing → first link pair → second link pair to the end effector, using Allen screws as rigid inter-link supports (again avoiding 3D-printed structural supports, which are layer-weak).
- Generated the URDF from the CAD model using the `onshape-to-robot` extension and visualized/actuated it in RViz2.

## Results

A hardware-assembled 3R arm with a stable, wing-reinforced base and a URDF that actuates correctly in RViz2.

## Status / Next

Completed as a foundations exercise. Actuation and full `ros2_control` integration are queued for the next development phase.
