---
title: "ROVIO — Underwater Remotely Operated Vehicle"
codename: "ROVIO"
fileNo: 5
kind: project
org: "RMI, NIT Trichy"
location: "Tiruchirappalli, India"
start: 2024-12-01
status: ongoing
summary: "An 8-thruster, 6-DOF open-frame ROV: solved hull water-sealing across three hardware iterations, then moved to the Simulations & Controls team to validate its dynamics in Stonefish."
tags: ["Underwater", "Simulation", "Mechanical Design"]
stack: ["Stonefish", "Gazebo", "ROS2", "Blender", "MeshLab", "SolidWorks"]
featured: true
classified: ["the motor-oil sealing idea that got dropped for legal reasons"]
cover: ./pool-test.jpg
coverAlt: "ROVIO submerged in a swimming pool during a hardware test, tether trailing to the surface."
figures:
  - src: ./pool-test.jpg
    caption: "Version 2 hardware test in a swimming pool — the version I sealed against water ingress."
  - src: ./flange-seal.png
    caption: "CAD of the flange-seal geometry — the sealing method that outperformed O-rings across every iteration tested."
  - src: ./stonefish-sim.png
    caption: "Version 3 in the Stonefish simulator, camera field-of-view frustum visible, ahead of hardware deployment."
---

## Brief

ROVIO (Remotely Operated Vehicle for Inspection and Operation) is RMI's underwater ROV project, now on its third hardware iteration: an open-frame, 6-DOF, 8-thruster vehicle. I worked across two roles on the team — first solving the hull's water-sealing problem on Version 2's hardware, then moving to the newly formed Simulations & Controls team for Version 3.

## Problem

Version 1 (built by seniors) used a large PVC-pipe open frame that buckled underwater and leaked badly. Version 2 reduced the size and DOF count to isolate the sealing problem, but the acrylic hull still needed a seal that could hold back roughly 10 feet of water pressure while remaining removable — ruling out permanent seals.

## Approach

- Evaluated radial, face, and flange seals against the hull's pressure and eccentricity requirements; the flange seal (as used on AUV Bombay's vehicles) offered the best real-world seal margin.
- Iterated on groove geometry, seal area, and gasket compressibility; selected EPDM over nitrile rubber for its lower shore hardness and higher compressibility.
- When even the best O-ring configuration left a minor leak at the acrylic hull's maximum allowable radius, switched to an unconventional PVC-dummy-cap seal with Teflon and paraffin wax — which outperformed the O-ring approach and fed directly into how PLA parts are now post-processed for underwater use on Version 3.
- Moved to the Simulations & Controls team for Version 3: first validated ROS2/Gazebo fundamentals on a simpler REMUS AUV model, then evaluated IsaacSim/OceanSim, Stonefish, and Angler as underwater simulation environments, settling on **Stonefish** (PyBullet-based, lighter-weight than IsaacSim, strong hydrodynamics) for the hardware-bound roadmap.
- Solved a NED/ENU coordinate mismatch between Stonefish and the SolidWorks-to-URDF export pipeline with a transformation matrix on the links, mass, and inertia matrices, and re-oriented misaligned thruster STL axes in Blender; reduced a 600k+ triangle mesh with MeshLab for real-time simulation.
- Implemented six-DOF joystick teleoperation for the overactuated 8-thruster layout, using the pseudo-inverse of the non-square thrust-allocation matrix to map 6 command axes to 8 thruster outputs, and integrated camera, IMU, and GPS sensors for future use.

## Results

Version 2 achieved a workable seal and was tested in a swimming pool with minimal water seepage. The Gazebo underwater simulation proved too unreliable for serious dynamics work (fragile hydrostatics configuration, frequent crashes), which drove the switch to Stonefish — now running with validated six-DOF joystick control ahead of Version 3's hardware deployment.

## Status / Next

Ongoing, with hardware deployment targeted by end of 2026. The team aims to eventually compare performance at SAUVC and RoboSub against international teams.
