---
title: "ROVIO: Simulation, Control and Vision-Based Autonomy for an Underwater Vehicle"
codename: "ROVIO"
fileNo: 5
kind: project
org: "RMI, NIT Trichy"
location: "Tiruchirappalli, India"
start: 2024-12-01
status: ongoing
summary: "RMI's eight-thruster, 6-DOF underwater vehicle: I sealed its enclosure, then built a simulated autonomy stack in Stonefish: thruster allocation, cascaded control, AprilTag localization and a monocular coral-mapping pipeline trained on auto-labelled images."
tags: ["Underwater", "Control", "Perception", "Simulation"]
stack: ["ROS2", "Stonefish", "Python", "YOLO", "AprilTag", "OpenCV", "SolidWorks", "Blender", "MeshLab"]
featured: true
homeOrder: 1
classified: ["the motor-oil sealing idea that got dropped for legal reasons"]
metrics:
  - label: "depth hold in simulation"
    value: "±0.4 cm"
  - label: "every axis tracks its commanded rate"
    value: "within 10 %"
  - label: "marker fix error at 4 m"
    value: "0.05 m"
  - label: "corals mapped on unattended survey"
    value: "50 / 53"
  - label: "unit tests, no simulator needed"
    value: "156"
cover: ./sim-underwater.jpg
coverAlt: "ROVIO in the simulator, seen from below in open water with sunlight overhead: the open frame, carry handles and thrusters."
figures:
  - src: ./cad-model.jpg
    caption: "CAD model of ROVIO Version 3: an open frame around the electronics enclosure with eight thrusters."
  - src: ./reef-overview.jpg
    caption: "The vehicle above a coral reef produced by my generator: 33 procedural coral models of nine families, placed from a single layout file."
  - src: ./forward-camera.jpg
    caption: "Forward camera at 12 m depth. Coral colours are chosen so a hue survives the absorption of red light."
  - src: ./architecture.png
    caption: "Software architecture: each box is a ROS 2 package. Every failure of a higher layer ends in a pose hold."
  - src: ./rate-tracking.png
    caption: "Rate reached at full stick as a fraction of the command, before and after identifying the simulated plant and retuning."
  - src: ./marker-detection.jpg
    caption: "AprilTag localization: the near board is used; the far one falls below the size gate and is ignored."
  - src: ./auto-labels-down.jpg
    caption: "Training labels generated automatically from the simulator's segmentation camera (downward camera)."
  - src: ./auto-labels-forward.jpg
    caption: "Automatic labels from the forward camera, with a marker board in view."
  - src: ./flange-rig.jpg
    caption: "Flange-seal test rig: a flat EPDM gasket compressed by a ring of bolts, so the seal no longer depends on a round bore."
  - src: ./steel-test-box.jpg
    caption: "Steel test box of the enclosure's form, used to verify the flange seal under water before it went on the vehicle."
  - src: ./pool-test.jpg
    caption: "Version 2 hardware test in a swimming pool."
  - src: ./flange-seal.png
    caption: "CAD of the flange-seal geometry."
videos:
  - url: https://youtu.be/EiiOJhAr6c4
    caption: "ROVIO in action."
  - url: https://youtu.be/lixFT3NZu_w
    caption: "More of ROVIO in action."
    afterImages: 1
documents:
  - label: "ROVIO: Simulation, Control and Vision-Based Autonomy for a Student-Built Underwater Vehicle"
    kind: short-report
    file: /media/attachments/rovio-short-report.pdf
    permalink: rovio-short-report
  - label: "ROVIO: Enclosure Sealing, Simulation, Control and Vision-Based Autonomy for an Underwater Vehicle"
    kind: report
    file: /media/attachments/rovio-report.pdf
    permalink: rovio-report
---

## Brief

ROVIO is the underwater vehicle of RMI, the robotics club at NIT Trichy. Version 1 leaked and its frame flexed. Version 2 was a deliberately simple four-thruster vehicle. Version 3, the current one, has eight thrusters and control authority in all six degrees of freedom. My work spans two stages. First I made the enclosure watertight with what a student workshop can make. Then I built a simulated vehicle on which the team can develop, measure and test control and perception software before the hardware is ready. The sealing study and all the software described here are my own work. The vehicle itself is a team effort.

## Problem

A student team cannot develop software on a vehicle that is still being machined, and cannot afford to find sign errors and unstable loops in a pool. The enclosure needed a static seal that could be opened routinely and stayed tight at the test pool's depth of about 3 m. On top of that, the vehicle needed a simulation trustworthy enough to tune controllers, localize from markers and map a reef. The plan was to move from a remotely operated vehicle towards an autonomous one.

## Approach

**Sealing.** A radial O-ring seal was tested first, on printed plugs of graded diameters, and it never became tight: the acrylic tube is out of round, so a plug big enough to squeeze the ring at the widest part would not enter at the narrowest. A flange seal worked for the opposite reason. Bolts compress a flat gasket axially, so the contact pressure is set by the bolts rather than by the fit of two diameters. I chose EPDM over nitrile because it is softer and conforms to a printed face at a lower bolt load. The tests also showed that printed PLA walls pass water between layers and must be surface-finished. The current enclosure lid uses this seal.

**Simulation.** I ported the CAD model to Stonefish. The URDF exporter assumes east-north-up and Stonefish north-east-down, so I re-expressed every pose, centre of mass and inertia tensor (I′ = T I Tᵀ). I also decimated meshes of over 600 000 triangles. I wrote a separate reef generator that assembles scenes from a single layout file, which the perception code reads back as ground truth. It cut a 111-coral scene from 4.2 to 0.47 million triangles. In the first runs every coral looked grey-green because red light is absorbed first, as in the sea. I fixed this with brighter lamps and coral colours with an amplified red component.

**Control.** Four thrusters at 45° handle surge, sway and yaw; four vertical ones handle heave, roll and pitch. The 6×8 allocation matrix has rank 6, and the allocator uses its least-squares pseudo-inverse. Each axis runs a cascade: a proportional pose loop around a PI rate loop with drag feed-forward, in four modes from manual to position hold. The first gains, designed from estimates, overshot a 1 m dive by 0.42 m. I wrote a step-test identification tool and found the vehicle sinks with 75 N, not 5 N, and has an effective surge mass of about 180 kg, not 24 kg. After retuning, every axis reaches its commanded rate within 10 %. I also traced a limit cycle in roll at 2.8 Hz to a loop delay of about 90 ms, so roll gain is bounded by latency rather than thrust.

**State estimation.** An EKF fuses IMU, pressure and attitude. I showed which states it can and cannot recover. Depth, roll and pitch are directly observable. Heading drifts at about 3° per minute. Horizontal position is unobservable without an absolute reference, because a 0.01 rad attitude error integrates to 1.2 m in 5 s.

**Marker localization.** Fourteen AprilTag boards stand at surveyed positions around the reef. Pose comes from a Levenberg-Marquardt fit with a roll/pitch prior from the IMU, started from both solutions of the planar ambiguity. I derived a closed-form cube law for a single marker: the uncertainty across the line of sight grows as r³ and an attitude prior does nothing to reduce it. I confirmed this against the estimator's own covariance, which a unit test checks against the scatter of repeated noisy fits.

**Coral perception and mapping.** The pipeline has four stages: a YOLO instance-segmentation detector, a ByteTrack-style tracker, ranging, and a landmark map with covariances. Ranging uses seabed-ray intersection, multi-ray triangulation and a footprint method for corals cut off at the image edge. Training labels are generated automatically. Points sampled on each coral mesh vote for the segmentation-camera ID they land on, and images are perturbed with red attenuation, veil, blur and noise.

**Guidance and verification.** A guidance node flies terrain-following lawnmower surveys. The longest, 737 waypoints and 805 m of track, flew start to finish without intervention. All maths lives in ROS-free modules covered by 156 unit tests. Testing also exposed a fault in Stonefish itself: its thruster model never initialised its setpoints, which corrupted the vehicle state in 17 of 20 starts. I traced it to source and fixed it in the interface package.

## Results

- In depth hold the vehicle stays within 0.4 cm, 0.03° of roll, 0.83° of pitch and 0.31° of heading over 30 s.
- Marker fixes at about 4 m have a mean error of 0.05 m when facing the board. The reported uncertainty is consistent in every run.
- On survey flights the downward camera mapped 50 of the 53 corals in view, with a mean error of 0.20 m. The learned detector matched the ideal oracle exactly.
- On a held-out strip of corals it had never seen, it mapped 11 of 13 and named the family of 9.
- After the fix, the simulator starts cleanly in 10 of 10 runs, up from 3 of 20.

## Status / Next

Ongoing. All software results so far are from simulation with ground-truth vehicle state, and the Version 3 hardware has not been tested yet. The next step is to close the loop on estimated state instead of true state. That means fusing marker fixes through an innovation gate and adding a velocity source, first in simulation and then in the pool. The detector also needs retraining on real pool and open-water footage. The team's longer-term aim is to compete at SAUVC and RoboSub.
