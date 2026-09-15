---
title: "Balancing Builder Bot"
codename: "BBB-2091"
fileNo: 7
kind: competition
org: "e-Yantra, IIT Bombay (RMI team)"
location: "NIT Trichy / e-Yantra, IIT Bombay"
start: 2024-09-01
end: 2024-11-30
status: completed
summary: "A two-wheeled self-balancing robot with a gripper, simulated in CoppeliaSim: LQR-balanced while traversing a path and performing pick-and-place of foam boxes."
tags: ["LQR", "Simulation", "Competition"]
stack: ["CoppeliaSim", "MATLAB", "Python"]
metrics:
  - { label: "Settling time (impulse response, sim)", value: "1.27 s" }
featured: false
cover: ./path-traversal.png
coverAlt: "CoppeliaSim top-down view of the balancing bot's path, from a green start marker curving to a red pickup/drop point."
figures:
  - src: ./inverted-pendulum-model.png
    caption: "The inverted-pendulum abstraction the balancing model was built from: pendulum length l, mass m, tilt θ."
  - src: ./path-traversal.png
    caption: "The bot's traversal path in CoppeliaSim, from start (green) to the pickup/drop point (red)."
---

## Brief

Team BB#2091's entry for the e-Yantra Robotics Competition: a two-wheeled self-balancing robot fitted with a gripper, required to traverse a predefined path crossing obstacles while picking up and dropping foam boxes, all while staying balanced.

## Problem

Balancing a two-wheeled robot is an inverted-pendulum control problem on its own; adding a gripper that picks up and releases mass mid-traversal continuously shifts the system's centre of mass, so the balance controller has to stay stable through those load changes, not just at rest.

## Approach

- Modeled the robot as an inverted pendulum on wheels using the Euler-Lagrange method, deriving the state-space representation (`x, ẋ, θ, θ̇`) in MATLAB.
- Computed the state and input matrices (A, B) via Jacobians of the equations of motion, and found the system's equilibrium points and their stability (the upright point is unstable; the hanging point is marginally stable).
- Designed an **LQR** controller (`u = -Kx`) with `Q` and `R` cost matrices tuned to prioritize which states get corrected most aggressively, computing gains with MATLAB's `lqr()`.
- Implemented the controller in CoppeliaSim via Python, reading body position/orientation/velocity through the simulator's object-handle API and actuating both wheel joints from the computed control law.
- Added a gripper (one revolute joint, one prismatic claw joint) for pick-and-place, with keyboard-driven joint control and a dynamic axis-recalibration step for rotations beyond 45°, to keep turning stable at large tilt angles.

## Results

The bot balanced, traversed the assigned path, and completed pick-and-place of the foam boxes in CoppeliaSim, delivering a 1.27-second settling time on impulse response.

## Status / Next

Completed; project closed after the competition submission.
