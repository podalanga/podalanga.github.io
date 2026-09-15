---
title: "ZBot: Simulating a Zebrafish Larva's Bio-Inspired Locomotion"
codename: "ZBOT"
fileNo: 1
kind: internship
org: "BioRob, EPFL"
location: "Lausanne, Switzerland"
supervisor: "Prof. Auke Ijspeert (mentor: Louis Gevers)"
start: 2026-06-01
end: 2026-08-31
status: completed
summary: "Ported a bio-inspired zebrafish-larva swimming robot from Webots to MuJoCo/FARMS, then fixed two physics defects in the lab's underwater simulation stack: a fixed-point buoyancy model and a hard-coded fluid density."
tags: ["Control", "Simulation", "Underwater", "CPG"]
stack: ["MuJoCo", "Python", "FARMS"]
metrics:
  - { label: "Buoyancy method", value: "O(faces) tetrahedral" }
  - { label: "Metacentric check accuracy", value: "±0.2 kg/m³ of theory" }
  - { label: "Worst settling error (12 cases)", value: "0.257 mm" }
featured: true
classified: ["the mentor's actual review comments", "how many times the sim crashed before the port held"]
cover: ./sim-render.png
coverAlt: "ZBot's articulated body holding a traveling body wave in the MuJoCo viewer, next to a small green target marker."
figures:
  - src: ./sim-render.png
    caption: "ZBot in MuJoCo, holding the CPG-driven body wave the controller is expected to produce."
  - src: ./tetrahedron-fan.png
    caption: "The tetrahedron-fan construction used to find the wet region of a submerged collision mesh: 1, 2, and 3 wet vertices."
  - src: ./buoyancy-mesh.png
    caption: "Per-face tetrahedral decomposition of a collision primitive, used to compute the true centre of buoyancy."
  - src: ./righting-moment.png
    caption: "Righting moment vs. roll angle: the new tetrahedron method (blue) produces a real restoring torque; the single-point model it replaced (red) is zero at every angle by construction."
---

## Brief

ZBot is BioRob's robotic model of zebrafish-larva locomotion, built to study the energetics of bout-and-glide swimming. The lab's own findings on the physical robot (that intermittent "burst-and-coast" swimming is more energy-efficient than continuous swimming) were published in *Science Robotics* (2026); this internship did not produce that result, it built the simulation infrastructure to keep asking that class of question. My job for the summer was to move ZBot's simulation off Webots and onto the lab's standard MuJoCo/FARMS stack, then reproduce its bout-and-glide gait there.

## Problem

FARMS, the lab's neuromusculoskeletal simulation framework, had no existing ZBot integration: the fish's locomotion had only ever been simulated in Webots. Porting it exposed problems that had nothing to do with the port itself: FARMS' underwater physics applied buoyant force at a single fixed proxy point on each body, which produces no righting torque by construction, and water density was hard-coded rather than configurable.

## Approach

- Ported the model and simulation loop from Webots to MuJoCo, then integrated the result with FARMS (a Python framework) by implementing a `ZBotCPGController` against FARMS' controller interface, wired through a `before_step` hook that advances the CPG/bout-gate state machine each timestep.
- Rebuilt the bout-and-glide gait as a CPG (central pattern generator): coupled phase oscillators drive a traveling body wave, gated between swimming and gliding phases by a leaky integrator crossing an amplitude threshold, mirroring the robot's own C++ firmware term-for-term.
- Made water density a configurable parameter in FARMS (a small, clearly-bounded fix, merged upstream so every FARMS user benefits from it).
- Replaced the single-point buoyancy model with a real centre-of-buoyancy estimator: for each partially submerged collision primitive, decompose the wet region into a tetrahedron fan (1, 2, or 3 wet vertices) using the body's own collision geometry, and integrate the true centre of buoyancy in real time with `O(faces)` complexity, caching the result when a body is fully submerged, since the calculation is only needed at the waterline.
- Validated the new buoyancy model against closed-form theory: a metacentric-stability check (the density at which a floating cube flips from stable to unstable) and a settling-time comparison across twelve test cases.

## Results

The metacentric check locates the stability transition to within 0.2 kg/m³ of theory, enough resolution to catch centre-of-buoyancy offsets of a few tenths of a millimetre, which the model it replaced would have missed entirely (it produces zero righting moment at every angle by construction). Against closed-form settling theory, the worst steady-state error across twelve test cases was 0.257 mm. A researcher can now run ZBot under MuJoCo/FARMS, in either swimming mode, through the same experiment scaffolding as the lab's other animats.

Three limitations are documented rather than left implicit: the real-time buoyancy computation is decimated to one step in twenty (a tens-of-milliseconds lag), the inherited drag coefficients under-damp larger bodies so the model is more trustworthy for steady floating attitude than settling dynamics, and a missing inertial-rotation term is a further small fix with a known form.

## Status / Next

Completed and handed off. Documented next steps for whoever continues the project: switching the collision-mesh approximation from boxes-and-cylinders to minimum bounding ellipsoids (a better fit for ZBot's elongated segments and a route to more accurate surface drag), a physical system-identification pass on the robot's true inertial parameters, and a potential-field global navigation layer once the real-time buoyancy budget leaves headroom for a planner.
